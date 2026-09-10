// Feature 13 — Company Research Agent. Never imports from components/ or
// actions/ (architecture.md's Invariants). Three data sources fused: company
// website content (this file, via Stagehand), job description + profile
// (loaded once by the caller, never re-fetched here). See architecture.md's
// Feature 13 decision.

// 1. External imports
import { z } from "zod";

// 2. Internal imports
import { companyResearchSchema, type CompanyResearchDossier } from "@/lib/company-research-schema";
import { logAgentError } from "@/lib/agent-logs";
import { gemini, withGeminiRetry } from "@/lib/gemini";
import type { ProfileRow } from "@/lib/profile-transform";
import { isUrlSafe, resolveEmployerHomepageUrl } from "@/lib/safe-fetch";
import { createResearchSession } from "@/lib/stagehand";

// 3. Type definitions
export type ResearchCompanyResult =
  | { success: true; dossier: CompanyResearchDossier }
  | { success: false; error: string };

export type ResearchJobInput = {
  title: string;
  company: string;
  sourceUrl: string | null;
  aboutRole: string | null;
  matchedSkills: string[];
  missingSkills: string[];
};

// Schema for the homepage extract() call — matches build-plan.md's Feature
// 13 entry exactly. Fields stay required (not `.optional()`): an empty
// string is a valid, meaningful "found nothing" signal this function checks
// for below, not a schema failure.
const homepageSchema = z.object({
  oneLiner: z.string(),
  productSummary: z.string(),
  signals: z.array(z.string()),
  pageLinks: z.array(
    z.object({
      url: z.string(),
      kind: z.enum(["about", "careers", "blog", "engineering", "product", "team", "other"]),
    }),
  ),
});

// Schema for each sub-page extract() call — matches build-plan.md exactly.
const subPageSchema = z.object({
  keyPoints: z.array(z.string()),
  technologies: z.array(z.string()),
  valuesOrCulture: z.array(z.string()),
  notable: z.array(z.string()),
});

type SubPageResult = z.infer<typeof subPageSchema>;

// Decision 4a — fixed priority order, "about"/"blog"/etc. preferred over
// "careers"; careers is a fallback, not an equal peer.
const SUBPAGE_KIND_PRIORITY = ["about", "blog", "engineering", "product", "team", "other", "careers"] as const;
const MAX_SUBPAGES = 3;

const SYNTHESIS_SYSTEM_PROMPT = `You are a sharp career strategist preparing a candidate to apply for a specific role. You are given (a) research collected from the company's own website, (b) the job posting, and (c) the candidate's profile. Produce a concise, concrete briefing that gives this specific candidate an edge for this specific role.

Rules:
- Ground every company claim in the provided research or job posting. Never invent funding, customers, headcount, or facts. If research was thin, infer carefully from the job posting and say what's inferred.
- Be specific to THIS candidate. Connect their actual skills and past work to this company's stack, product, and values. No generic advice that would apply to anyone.
- Turn the candidate's missing skills into a strategy: how to frame the gap honestly and what adjacent experience to lean on.
- Talking points and questions must reference real things from the research, the kind of detail that signals the candidate did their homework.
- Return the provided companyResearch.sources URLs exactly as the sources array; never infer or add URLs.
- Keep every item tight: one or two sentences. No fluff.

Return ONLY valid JSON.`;

// 4. Component (n/a — agent module)

// The installed @browserbasehq/stagehand pins its own zod dependency
// (4.4.3) separately from this project's own zod (4.5.4) — two
// structurally identical but nominally distinct packages in node_modules,
// so TypeScript can't unify their ZodType branding across the package
// boundary (a dependency-duplication artifact, not a functional
// difference — both are plain zod v4 schemas and interoperate correctly at
// runtime; verified live during this build). Cast once, at this narrow
// boundary, rather than pinning a shared zod version across two
// independently-versioned packages.
function forStagehandSchema<T extends z.ZodType>(schema: T): never {
  return schema as never;
}

// Decision 4a's algorithm: dedupe by resolved URL, rank by kind priority,
// take the first 3, only reaching into "careers" links if fewer than 3
// non-careers links exist at all.
function selectSubPageUrls(
  pageLinks: Array<{ url: string; kind: string }>,
  baseUrl: string,
): string[] {
  const seen = new Set<string>();
  const deduped: Array<{ url: string; kind: string }> = [];

  for (const link of pageLinks) {
    let resolved: string;
    try {
      resolved = new URL(link.url, baseUrl).toString().replace(/\/$/, "");
    } catch {
      continue;
    }
    const dedupeKey = resolved.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    deduped.push({ url: resolved, kind: link.kind });
  }

  const nonCareers = deduped.filter((link) => link.kind !== "careers");
  const careers = deduped.filter((link) => link.kind === "careers");

  const ranked = [...nonCareers].sort(
    (a, b) =>
      SUBPAGE_KIND_PRIORITY.indexOf(a.kind as (typeof SUBPAGE_KIND_PRIORITY)[number]) -
      SUBPAGE_KIND_PRIORITY.indexOf(b.kind as (typeof SUBPAGE_KIND_PRIORITY)[number]),
  );

  const pool = ranked.length >= MAX_SUBPAGES ? ranked : [...ranked, ...careers];
  return pool.slice(0, MAX_SUBPAGES).map((link) => link.url);
}

export async function researchCompany(
  job: ResearchJobInput,
  profile: ProfileRow,
  userId: string,
  jobId: string,
): Promise<ResearchCompanyResult> {
  let homepage: z.infer<typeof homepageSchema> = {
    oneLiner: "",
    productSummary: "",
    signals: [],
    pageLinks: [],
  };
  const subPageResults: SubPageResult[] = [];
  const visitedSourceUrls: string[] = [];
  let homepageUrl: string | null = null;

  try {
    // Browser research is never fatal — a failure here still lets synthesis
    // run from the job + profile alone (this project's standing "always
    // returns a dossier" invariant). Every Stagehand call stays inside this
    // block; the session always closes in the finally, even on failure.
    let stagehandInstance: Awaited<ReturnType<typeof createResearchSession>>["stagehand"] | undefined;
    try {
      homepageUrl = await resolveEmployerHomepageUrl(job.sourceUrl, job.company);
      if (homepageUrl) {
        const session = await createResearchSession();
        stagehandInstance = session.stagehand;

        const page = await stagehandInstance.browser.context.newPage(homepageUrl);
        const homepageResult = await stagehandInstance.extract(
          "This is a company's homepage. Capture what the company actually does, who it's for, and any concrete signals (funding, customers, scale, mission, recent launches). Then find the internal links most worth visiting to research them as an employer.",
          forStagehandSchema(homepageSchema),
          { page },
        );
        homepage = homepageResult.data as z.infer<typeof homepageSchema>;
        visitedSourceUrls.push(homepageUrl);

        // If oneLiner and productSummary are both empty — skip sub-page
        // extraction entirely, proceed to synthesis with job + profile only.
        if (homepage.oneLiner || homepage.productSummary) {
          const subPageUrls = selectSubPageUrls(homepage.pageLinks, homepageUrl);
          const homepageOrigin = new URL(homepageUrl).origin;
          for (const subPageUrl of subPageUrls) {
            try {
              const parsedSubPageUrl = new URL(subPageUrl);
              if (parsedSubPageUrl.origin !== homepageOrigin || !(await isUrlSafe(subPageUrl))) {
                continue;
              }
              const subPage = await stagehandInstance.browser.context.newPage(subPageUrl);
              const subPageResult = await stagehandInstance.extract(
                "Extract substance that helps a candidate understand this company before applying: what they do, their values and how they work, the specific technologies and tools they use, notable projects or customers, and how the team operates. Ignore nav, footers, cookie banners, and generic marketing copy.",
                forStagehandSchema(subPageSchema),
                { page: subPage },
              );
              subPageResults.push(subPageResult.data as SubPageResult);
              visitedSourceUrls.push(subPageUrl);
            } catch (subPageError) {
              // A failed sub-page never crashes the run — continue with
              // whatever was already gathered.
              console.warn("[agent/research] sub-page extraction failed", subPageError);
            }
          }
        }
      }
    } catch (browserError) {
      console.warn(
        "[agent/research] browser research failed, synthesizing from job + profile alone",
        browserError,
      );
    } finally {
      // Always close the session, even on failure — never leave a
      // Browserbase session open.
      if (stagehandInstance) {
        try {
          await stagehandInstance.close();
        } catch (closeError) {
          console.warn("[agent/research] failed to close browser research session", closeError);
        }
      }
    }

    const userPrompt = JSON.stringify({
      companyResearch: {
        oneLiner: homepage.oneLiner,
        productSummary: homepage.productSummary,
        signals: homepage.signals,
        subPages: subPageResults,
        sources: visitedSourceUrls,
      },
      jobPosting: {
        title: job.title,
        company: job.company,
        description: job.aboutRole ?? "",
        matchedSkills: job.matchedSkills,
        missingSkills: job.missingSkills,
      },
      candidateProfile: {
        currentTitle: profile.current_title,
        yearsExperience: profile.years_experience,
        experienceLevel: profile.experience_level,
        skills: profile.skills ?? [],
        workExperience: profile.work_experience ?? [],
      },
    });

    // Retries a transient 503 up to twice before treating it as a real
    // failure — same as Feature 10's matcher call, see lib/gemini.ts.
    const response = await withGeminiRetry(() =>
      gemini.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `${SYNTHESIS_SYSTEM_PROMPT}\n\n${userPrompt}`,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(companyResearchSchema),
          // Natural but grounded — matches this project's resume-generation
          // convention for genuine synthesis, not deterministic scoring.
          temperature: 0.4,
          // gemini-3.6-flash's thinking tokens count against this budget —
          // reusing Features 07/08/10's own live-verified number.
          maxOutputTokens: 8000,
        },
      }),
    );

    const finishReason = response.candidates?.[0]?.finishReason;
    if (!response.text) {
      throw new Error(`Gemini returned an empty response (finishReason: ${finishReason})`);
    }

    let rawJson: unknown;
    try {
      rawJson = JSON.parse(response.text);
    } catch (parseError) {
      if (finishReason === "MAX_TOKENS") {
        throw new Error(`Gemini response truncated by maxOutputTokens: ${String(parseError)}`);
      }
      throw parseError;
    }

    const parsed = companyResearchSchema.safeParse(rawJson);
    if (!parsed.success) {
      throw parsed.error;
    }

    return { success: true, dossier: { ...parsed.data, sources: visitedSourceUrls } };
  } catch (error) {
    // runId is null — company research has no agent_runs row to attach to
    // (architecture.md's Feature 13 decision, Decision 5).
    await logAgentError(userId, null, jobId, "Company research failed", error);
    return { success: false, error: String(error) };
  }
}
