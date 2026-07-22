import type { Scholarship, StudentProfile } from "@/types/scholarship";
import { matchScholarship } from "@/engine/matchScholarship";

const TUITION_CAP = 4_000_000;

export type ExcludedScholarship = { scholarship: Scholarship; reason: string };

export type CombinationResult = {
  totalAmount: number;
  combination: Scholarship[];
  excludedScholarships: ExcludedScholarship[];
};

export function bestCombination(profile: StudentProfile, scholarships: Scholarship[]): CombinationResult {
  // Only count confirmed-eligible scholarships — 조건부가능 (needs manual
  // verification, e.g. missing income/GPA data) isn't guaranteed money and
  // shouldn't inflate a headline "최대 수령 가능 N원" total.
  const matched = scholarships
    .map((scholarship) => ({ scholarship, match: matchScholarship(profile, scholarship) }))
    .filter(({ match }) => match.status === "지원가능");

  const livingCandidates = matched
    .filter(({ scholarship }) => scholarship.type !== "등록금성")
    .map(({ scholarship }) => scholarship);

  const tuitionCandidates = matched
    .filter(({ scholarship }) => scholarship.type === "등록금성")
    .map(({ scholarship }) => scholarship);

  const { combination: tuitionCombination, totalAmount: tuitionTotal, excluded: tuitionExcluded } =
    chooseBestTuition(tuitionCandidates);

  // 생활비성 장학금끼리도(또는 이미 선택된 등록금성 장학금과도) "중복 불가" 충돌이
  // 있을 수 있는데, 지금까지는 전혀 체크하지 않고 전부 그대로 합산하고 있었다.
  // 이미 선택된 항목들과 순서대로 대조해 충돌하면 제외한다.
  const selectedSoFar = [...tuitionCombination];
  const livingCombination: Scholarship[] = [];
  const livingExcluded: ExcludedScholarship[] = [];
  for (const candidate of livingCandidates) {
    const conflictingItem = selectedSoFar.find((item) => conflictsWith(item, candidate));
    if (conflictingItem) {
      livingExcluded.push({ scholarship: candidate, reason: `${conflictingItem.name}과(와) 동시 수혜 불가` });
    } else {
      livingCombination.push(candidate);
      selectedSoFar.push(candidate);
    }
  }

  const combination = [...tuitionCombination, ...livingCombination];
  const totalAmount = tuitionTotal + livingCombination.reduce((sum, scholarship) => sum + (scholarship.amount_max_krw ?? 0), 0);

  return {
    totalAmount,
    combination,
    excludedScholarships: [...tuitionExcluded, ...livingExcluded],
  };
}

function chooseBestTuition(candidates: Scholarship[]) {
  let best: Scholarship[] = [];
  let bestAmount = 0;

  function backtrack(index: number, selected: Scholarship[], currentAmount: number) {
    if (currentAmount > TUITION_CAP) return;
    if (currentAmount > bestAmount) {
      best = [...selected];
      bestAmount = currentAmount;
    }
    if (index >= candidates.length) return;

    for (let i = index; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      if (selected.some((item) => conflictsWith(item, candidate))) continue;
      selected.push(candidate);
      backtrack(i + 1, selected, currentAmount + (candidate.amount_max_krw ?? 0));
      selected.pop();
    }
  }

  backtrack(0, [], 0);

  // best는 "총액을 최대화하는 조합"이라 여기 빠진 후보는 (a) 선택된 항목과 충돌하거나
  // (b) 충돌은 없지만 넣으면 등록금 한도를 넘기는 경우 둘 중 하나뿐이다 — 금액이
  // 음수일 수 없으니 충돌도 없고 한도도 안 넘는데 최적해에서 빠지는 경우는 없다.
  const bestIds = new Set(best.map((item) => item.id));
  const excluded: ExcludedScholarship[] = [];
  for (const candidate of candidates) {
    if (bestIds.has(candidate.id)) continue;
    const conflictingItem = best.find((item) => conflictsWith(item, candidate));
    excluded.push({
      scholarship: candidate,
      reason: conflictingItem ? `${conflictingItem.name}과(와) 동시 수혜 불가` : "등록금 한도(400만원) 초과로 제외",
    });
  }

  return { combination: best, totalAmount: bestAmount, excluded };
}

function conflictsWith(a: Scholarship, b: Scholarship) {
  if (a.duplicate_conflict.allows_other_scholarships === "불가" || b.duplicate_conflict.allows_other_scholarships === "불가") {
    return a.source_detail !== "국가" && b.source_detail !== "국가" && a.source_detail !== b.source_detail;
  }
  return false;
}
