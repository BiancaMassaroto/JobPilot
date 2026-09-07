// @react-pdf/renderer document tree for Feature 08 (Resume PDF Generation).
// Lives in lib/, not components/ — it never renders to the DOM, only ever
// runs inside app/api/resume/generate/route.ts via renderToBuffer(). See
// architecture.md's Feature 08 decision, Decision 6.

// 1. External imports
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// 2. Internal imports
import type { ProfileRow, WorkExperienceRecord } from "@/lib/profile-transform";
import type { ResumeContent } from "@/lib/resume-generation-schema";

// 3. Type definitions

// Matches ProfileForm.tsx's HIGHEST_DEGREE_OPTIONS labels exactly — small,
// intentional duplication rather than a new shared module for one lookup
// table used in two unrelated render targets (a form select vs. a PDF).
const DEGREE_LABELS: Record<string, string> = {
  high_school: "High School",
  associate: "Associate Degree",
  bachelor: "Bachelor's Degree",
  master: "Master's Degree",
  doctorate: "Doctorate",
  other: "Other",
};

// Only the CSS properties library-docs.md's react-pdf section documents as
// supported are used here. Literal hex values are fine — this renders a
// PDF, not a web page, so the "no raw hex" rule (ui-tokens.md) doesn't
// apply (see Decision 6).
const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
  },
  name: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  contactLine: {
    fontSize: 9,
    color: "#4a4a4a",
    marginBottom: 16,
  },
  section: {
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  roleBlock: {
    marginBottom: 8,
  },
  roleTitleLine: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  roleDateLine: {
    fontSize: 9,
    color: "#4a4a4a",
    marginBottom: 3,
  },
  bullet: {
    fontSize: 9,
    lineHeight: 1.4,
    marginBottom: 2,
    paddingLeft: 10,
  },
  educationLine: {
    fontSize: 10,
  },
});

// ProfileRow deliberately has no email column read into it — the rest of
// this app always sources email from the session, never the row (see
// lib/profile-transform.ts's fromProfileRow). The route handler already has
// the session user, so it passes the email in alongside the row.
function contactLine(profile: ProfileRow, email: string): string {
  return [email, profile.phone, profile.location, profile.linkedin_url, profile.portfolio_url]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .join("  |  ");
}

function dateRangeLine(role: WorkExperienceRecord): string {
  const end = role.currently_working_here ? "Present" : role.end_date || "";
  return [role.start_date, end].filter(Boolean).join(" – ");
}

// 4. Component
type Props = {
  profile: ProfileRow;
  email: string;
  content: ResumeContent;
};

export function ResumePdfDocument({ profile, email, content }: Props) {
  const workExperience = profile.work_experience ?? [];
  const skills = profile.skills ?? [];
  const education = profile.education;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.name}>{profile.full_name || "Resume"}</Text>
        <Text style={styles.contactLine}>{contactLine(profile, email)}</Text>

        {content.professionalSummary && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Professional Summary</Text>
            <Text style={styles.paragraph}>{content.professionalSummary}</Text>
          </View>
        )}

        {skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Skills</Text>
            <Text style={styles.paragraph}>{skills.join("  •  ")}</Text>
          </View>
        )}

        {workExperience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Work Experience</Text>
            {workExperience.map((role, index) => (
              <View key={`${role.company_name}-${index}`} style={styles.roleBlock}>
                <Text style={styles.roleTitleLine}>
                  {role.job_title} — {role.company_name}
                </Text>
                <Text style={styles.roleDateLine}>{dateRangeLine(role)}</Text>
                {(content.workExperience[index]?.bullets ?? []).map((bullet, bulletIndex) => (
                  <Text key={bulletIndex} style={styles.bullet}>
                    • {bullet}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {education && (education.field_of_study || education.institution_name) && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Education</Text>
            <Text style={styles.educationLine}>
              {[
                DEGREE_LABELS[education.highest_degree] ?? education.highest_degree,
                education.field_of_study,
              ]
                .filter(Boolean)
                .join(", ")}
              {education.institution_name ? ` — ${education.institution_name}` : ""}
              {education.graduation_year ? ` (${education.graduation_year})` : ""}
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
