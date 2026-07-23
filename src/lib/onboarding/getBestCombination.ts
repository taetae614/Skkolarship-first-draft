import { scholarshipSeed, type Scholarship } from "@/lib/scholarships";
import { convertScholarship } from "@/lib/scholarship-adapter";
import { bestCombination, type CombinationResult } from "@/engine/bestCombination";
import type { StudentProfileFull } from "@/types/onboarding";

export function getBestScholarshipCombination(
  profile: StudentProfileFull,
  extraScholarships: Scholarship[] = [],
): CombinationResult {
  const rawScholarships = [...scholarshipSeed, ...extraScholarships].map(convertScholarship);
  return bestCombination(profile as never, rawScholarships);
}
