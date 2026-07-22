import { scholarshipSeed } from "@/lib/scholarships";
import { convertScholarship } from "@/lib/scholarship-adapter";
import { bestCombination, type CombinationResult } from "@/engine/bestCombination";
import type { StudentProfileFull } from "@/types/onboarding";

export function getBestScholarshipCombination(profile: StudentProfileFull): CombinationResult {
  const rawScholarships = scholarshipSeed.map(convertScholarship);
  return bestCombination(profile as never, rawScholarships);
}
