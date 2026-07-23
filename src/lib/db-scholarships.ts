import { prisma } from "@/lib/prisma";
import type { Scholarship as AppScholarship } from "@/lib/scholarships";
import type { Scholarship as PrismaScholarship } from "@prisma/client";

// Shape written by POST /api/scholarships (see scholarship-extract-client.tsx),
// distinct from the seed dataset's snake_case shape in @/data/scholarships.json.
type DbEligibilityRules = {
  gradeLevel?: string;
  gpaRecentMin?: number;
  gpaCumulativeMin?: number;
  incomeBracketMax?: number;
  specialStatus?: string[];
  otherConditions?: string;
};

type DbDuplicateConflictRules = { note?: string };

function inferAmountMaxKrw(amountText: string): number | null {
  const matches = Array.from(
    amountText.replace(/,/g, "").matchAll(/(\d+(?:\.\d+)?)\s*만원/g),
    (m) => Number(m[1]),
  );
  if (matches.length === 0) return null;
  return Math.round(Math.max(...matches) * 10000);
}

function toDateString(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function convertDbScholarship(row: PrismaScholarship): AppScholarship {
  const rules = (row.eligibilityRules ?? {}) as DbEligibilityRules;
  const conflict = (row.duplicateConflictRules ?? {}) as DbDuplicateConflictRules;
  const sourceLabel = row.source === "CAMPUS" ? "교내" : "교외";
  const typeLabel = row.type === "TUITION" ? "등록금성" : "생활비성";

  return {
    id: row.id,
    name: row.name,
    source: row.source,
    sourceDetail: row.source === "CAMPUS" ? "교내" : "민간재단",
    type: row.type,
    amount: row.amount,
    amountMaxKrw: inferAmountMaxKrw(row.amount),
    status: "ELIGIBLE",
    applyStart: toDateString(row.applyStart),
    applyEnd: toDateString(row.applyEnd),
    applyPeriodNote: null,
    officialUrl: row.officialUrl,
    pdfFormUrl: row.pdfFormUrl ?? "/docs/placeholder-announcement.pdf",
    requiredDocs: row.requiredDocs,
    riskFlags: row.riskFlags,
    tags: Array.from(new Set([sourceLabel, typeLabel, "AI 자동등록"])),
    fitScore: 50,
    eligibilityRules: {
      minGpaRecent: rules.gpaRecentMin || null,
      minGpaCumulative: rules.gpaCumulativeMin || null,
      gpaScale: 4.5,
      maxIncomeBracket: rules.incomeBracketMax || null,
      gradeLevels: rules.gradeLevel ? [rules.gradeLevel] : null,
      specialStatusRequired: rules.specialStatus ?? [],
      notes: rules.otherConditions || null,
    },
    duplicateConflictRules: {
      allowsOtherScholarships: "미확인",
      amountCapNote: conflict.note || null,
    },
  };
}

/** Admin-uploaded scholarships (POST /api/scholarships) that live in Postgres,
 * as opposed to the static seed dataset in @/data/scholarships.json. */
export async function getDbScholarships(): Promise<AppScholarship[]> {
  const rows = await prisma.scholarship.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(convertDbScholarship);
}

export async function getDbScholarshipById(id: string): Promise<AppScholarship | null> {
  const row = await prisma.scholarship.findUnique({ where: { id } });
  return row ? convertDbScholarship(row) : null;
}
