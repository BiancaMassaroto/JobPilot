// Dossier shape for company research synthesis — architecture.md's Feature
// 13 decision, Decision 8. One schema, not two hand copies (lib/gemini.ts's
// own rule): this same schema derives Gemini's responseJsonSchema in
// agent/research.ts AND validates the parsed response.

// 1. External imports
import { z } from "zod";

// 2. Internal imports
// (none)

// 3. Type definitions
export const companyResearchSchema = z.object({
  companyOverview: z.string(),
  techStack: z.array(z.string()),
  culture: z.array(z.string()),
  whyThisRole: z.string(),
  yourEdge: z.array(z.string()),
  gapsToAddress: z.array(z.string()),
  smartQuestions: z.array(z.string()),
  interviewPrep: z.array(z.string()),
  sources: z.array(z.string()),
});

export type CompanyResearchDossier = z.infer<typeof companyResearchSchema>;

// 4. Component (n/a — pure schema module)
