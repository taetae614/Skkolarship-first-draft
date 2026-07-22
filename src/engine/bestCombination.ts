import type { Scholarship, StudentProfile } from "@/types/scholarship";
import { matchScholarship } from "@/engine/matchScholarship";

export type ExcludedScholarship = { scholarship: Scholarship; reason: string };
export type CombinationItem = Scholarship & { amountIsEstimated: boolean };

export type CombinationResult = {
  totalAmount: number;
  combination: CombinationItem[];
  excludedScholarships: ExcludedScholarship[];
  amountUnknownScholarships: Scholarship[];
  tuitionCeiling: number;
  tuitionCeilingIsEstimated: boolean;
};

// 2024년 대학알리미 공시자료(2차 출처) 기준 성균관대 계열별 연간 등록금을 2로 나눈
// 학기 추정치. 2026년 공식 계열별 등록금표를 찾지 못해 이 값들은 전부 "약" 추정치임 —
// "등록금 전액"으로만 적혀 있고 고정 금액이 없는 장학금의 금액을 추산하는 용도로만 쓴다.
type TuitionCategory = "인문사회" | "자연과학" | "공학" | "예술체육" | "의학";
const TUITION_ESTIMATE_PER_SEMESTER: Record<TuitionCategory, number> = {
  인문사회: 3_827_000,
  자연과학: 4_487_000,
  공학: 4_578_000,
  예술체육: 4_447_000,
  의학: 5_669_000,
};
const TUITION_ESTIMATE_FALLBACK = 4_225_000; // 전체 평균

function classifyCollege(college: string | null | undefined): TuitionCategory | null {
  if (!college) return null;
  if (/의과|약학/.test(college)) return "의학";
  if (/공과|소프트웨어|정보통신|반도체|건설환경|화학공학|신소재/.test(college)) return "공학";
  if (/자연과학/.test(college)) return "자연과학";
  if (/예술|스포츠|무용|미술|음악/.test(college)) return "예술체육";
  if (/문과|사회과학|경영|경제|법과|사범|글로벌경영|글로벌경제|유학/.test(college)) return "인문사회";
  return null;
}

function resolveTuitionCeiling(college: string | null | undefined): { amount: number; estimated: boolean } {
  const category = classifyCollege(college);
  if (category) return { amount: TUITION_ESTIMATE_PER_SEMESTER[category], estimated: true };
  return { amount: TUITION_ESTIMATE_FALLBACK, estimated: true };
}

// 일부 장학금은 공고문 자체에 계열별 확정 금액(추정이 아니라 실제 숫자)이 있거나,
// 학교 계열 추정 등록금과 무관한 자체 상한이 있거나, 반대로 여러 항목이 섞여 있어
// (등록금+생활비+체재비 등) 정규식으로 안전하게 추정할 수 없는 경우가 있다. 이런
// 경우를 하나씩 확인해서 개별 규칙으로 반영한다 — 나머지는 전부 기본 규칙(등록금
// 전액류는 계열 추정치, 그 외엔 amount_max_krw 그대로)을 따른다.
type AmountOverride =
  | { kind: "college_tiered"; byCategory: Partial<Record<TuitionCategory, number>>; fallback: number }
  | { kind: "fixed_cap"; amount: number }
  | { kind: "exclude" };

const AMOUNT_OVERRIDES: Record<string, AmountOverride> = {
  // "사립대 이공 400만원/1명, 인문 360만원/1명" — 공고문에 이미 확정 금액이 있음.
  "ext-samsong": { kind: "college_tiered", byCategory: { 공학: 4_000_000, 자연과학: 4_000_000, 인문사회: 3_600_000 }, fallback: 3_600_000 },
  // "등록금 전액(매학기 500만원 범위, 타장학금 차액 지급)" — 계열 추정치가 아니라
  // 재단이 직접 명시한 자체 상한(500만원)을 써야 정확하다.
  "ext-cheongho-buddhist": { kind: "fixed_cap", amount: 5_000_000 },
  // 학년별로 구성이 다른 복합 금액("I유형 1학년: 등록금+생활비 250만원" vs "II유형
  // 3학년: 등록금 전액")이라 단일 정규식 추정이 잘못된 숫자를 낼 위험이 있다.
  "ext-inmun-100nyeon": { kind: "exclude" },
  // "등록금 전액 + 학업보조금 월 50만원 + 교환학생 체재비(700만원)" — 등록금만
  // 추정하면 실제보다 훨씬 적게 잡혀서 제외한다.
  "ext-yoon-seyoung": { kind: "exclude" },
  // "(1) 등록금 전액 또는 (2) 생활비성 400만원 중 택1, 관리위원회 결정" — 학생이
  // 고를 수 있는 게 아니라 재단이 최종 결정하는 구조라 금액을 미리 알 수 없다.
  "skku-jobyeongdu": { kind: "exclude" },
  // "학자금 전액 및 학습지원비" — 구체적 금액이 공고문에 전혀 없다.
  "ext-wooin": { kind: "exclude" },
};

// 정용지 창의장학생처럼 "한도를 초과하면 초과분이 아니라 전체가 고정 금액으로
// 대체"되는 경우 — 조합에서 완전히 빠지는 게 아니라 최소 이 금액은 보장된다.
const GUARANTEED_FLOOR: Record<string, number> = {
  "skku-jeongyongji-changui": 2_500_000,
};

function resolveAmount(scholarship: Scholarship, tuitionCeiling: number): { amount: number; estimated: boolean } {
  if (scholarship.amount_max_krw != null) return { amount: scholarship.amount_max_krw, estimated: false };

  const override = AMOUNT_OVERRIDES[scholarship.id];
  if (override) {
    if (override.kind === "exclude") return { amount: 0, estimated: false };
    if (override.kind === "fixed_cap") return { amount: override.amount, estimated: false };
    if (override.kind === "college_tiered") {
      // college_tiered 대상은 함수 밖(호출부)에서 학생 계열을 이미 알고 있어야 하지만,
      // 여기서는 tuitionCeiling 계산에 쓰인 것과 같은 분류 결과를 재사용할 수 없으니
      // 폴백 금액을 쓰고, 실제 계열별 분기는 resolveAmountForStudent에서 처리한다.
      return { amount: override.fallback, estimated: false };
    }
  }

  if (scholarship.amount_text && /등록금\s*(전액|100\s*%)/.test(scholarship.amount_text)) {
    return { amount: tuitionCeiling, estimated: true };
  }
  return { amount: 0, estimated: false };
}

// resolveAmount의 college_tiered 분기는 학생의 계열 분류가 필요해서 별도 래퍼로 뺐다.
function resolveAmountForStudent(
  scholarship: Scholarship,
  tuitionCeiling: number,
  studentCategory: TuitionCategory | null,
): { amount: number; estimated: boolean } {
  const override = AMOUNT_OVERRIDES[scholarship.id];
  if (override?.kind === "college_tiered" && scholarship.amount_max_krw == null) {
    const amount = (studentCategory && override.byCategory[studentCategory]) ?? override.fallback;
    return { amount, estimated: false };
  }
  return resolveAmount(scholarship, tuitionCeiling);
}

// 정인장학금처럼 "타 장학금과 합쳐 등록금 한도를 넘기면 초과분을 생활비로 지급"하는
// 경우는 한도를 넘겨도 그 장학금 자체를 조합에서 뺄 이유가 없다 — 돈이 없어지는 게
// 아니라 명목만 바뀌는 것이기 때문.
function overflowsToLiving(scholarship: Scholarship) {
  return Boolean(scholarship.amount_text && /초과[^.]{0,10}생활비/.test(scholarship.amount_text));
}

export function bestCombination(profile: StudentProfile, scholarships: Scholarship[]): CombinationResult {
  const college = (profile as unknown as { college?: string | null }).college ?? null;
  const studentCategory = classifyCollege(college);
  const { amount: tuitionCeiling, estimated: tuitionCeilingIsEstimated } = resolveTuitionCeiling(college);

  // Only count confirmed-eligible scholarships — 조건부가능 (needs manual
  // verification, e.g. missing income/GPA data) isn't guaranteed money and
  // shouldn't inflate a headline "최대 수령 가능 N원" total.
  const matched = scholarships
    .map((scholarship) => ({ scholarship, match: matchScholarship(profile, scholarship) }))
    .filter(({ match }) => match.status === "지원가능")
    .map(({ scholarship }) => scholarship);

  const livingCandidates = matched.filter((scholarship) => scholarship.type !== "등록금성");
  const allTuitionCandidates = matched.filter((scholarship) => scholarship.type === "등록금성");

  // 금액을 안전하게 추정할 수 없는 장학금(exclude 오버라이드)은 애초에 최적화 대상에서
  // 빼고, "금액 미확정"으로 따로 안내한다 — 0원으로 계산에 섞이면 "한도 초과로 제외"라는
  // 엉뚱한 사유가 붙어버린다.
  const amountUnknownScholarships = allTuitionCandidates.filter(
    (scholarship) => AMOUNT_OVERRIDES[scholarship.id]?.kind === "exclude",
  );
  const knownTuitionCandidates = allTuitionCandidates.filter(
    (scholarship) => AMOUNT_OVERRIDES[scholarship.id]?.kind !== "exclude",
  );

  const normalTuitionCandidates = knownTuitionCandidates.filter((scholarship) => !overflowsToLiving(scholarship));
  const overflowCandidates = knownTuitionCandidates.filter((scholarship) => overflowsToLiving(scholarship));

  const {
    combination: tuitionCombination,
    totalAmount: tuitionTotal,
    excluded: tuitionExcluded,
  } = chooseBestTuition(normalTuitionCandidates, tuitionCeiling, studentCategory);

  // 정용지 창의장학생처럼 "한도 초과 시 전체가 고정 금액으로 대체"되는 장학금은
  // 백트래킹에서 자연스럽게 표현하기 어려워 따로 처리한다: 남은 여유가 충분하면
  // 원래 추정 금액(등록금 전액) 그대로, 아니면 보장된 최소 금액으로 포함한다.
  const remainingAfterTuition = Math.max(0, tuitionCeiling - tuitionTotal);
  const selectedForOverflowCheck = [...tuitionCombination];
  const overflowIncluded: CombinationItem[] = [];
  const overflowExcluded: ExcludedScholarship[] = [];
  for (const candidate of overflowCandidates) {
    const conflictingItem = selectedForOverflowCheck.find((item) => conflictsWith(item, candidate));
    if (conflictingItem) {
      overflowExcluded.push({ scholarship: candidate, reason: `${conflictingItem.name}과(와) 동시 수혜 불가` });
      continue;
    }
    const resolvedFull = resolveAmountForStudent(candidate, tuitionCeiling, studentCategory);
    const floor = GUARANTEED_FLOOR[candidate.id];
    const amount = floor != null && resolvedFull.amount > remainingAfterTuition ? floor : resolvedFull.amount;
    const resolvedItem: CombinationItem = { ...candidate, amount_max_krw: amount, amountIsEstimated: resolvedFull.estimated };
    overflowIncluded.push(resolvedItem);
    selectedForOverflowCheck.push(resolvedItem);
  }
  const overflowTotal = overflowIncluded.reduce((sum, item) => sum + (item.amount_max_krw ?? 0), 0);

  // 생활비성 장학금끼리도(또는 이미 선택된 등록금성 장학금과도) "중복 불가" 충돌이
  // 있을 수 있는데, 지금까지는 전혀 체크하지 않고 전부 그대로 합산하고 있었다.
  // 이미 선택된 항목들과 순서대로 대조해 충돌하면 제외한다.
  const selectedSoFar = [...tuitionCombination, ...overflowIncluded];
  const livingCombination: CombinationItem[] = [];
  const livingExcluded: ExcludedScholarship[] = [];
  for (const candidate of livingCandidates) {
    const conflictingItem = selectedSoFar.find((item) => conflictsWith(item, candidate));
    if (conflictingItem) {
      livingExcluded.push({ scholarship: candidate, reason: `${conflictingItem.name}과(와) 동시 수혜 불가` });
    } else {
      const resolvedItem: CombinationItem = { ...candidate, amountIsEstimated: false };
      livingCombination.push(resolvedItem);
      selectedSoFar.push(resolvedItem);
    }
  }

  const combination = [...tuitionCombination, ...overflowIncluded, ...livingCombination];
  const totalAmount =
    tuitionTotal + overflowTotal + livingCombination.reduce((sum, scholarship) => sum + (scholarship.amount_max_krw ?? 0), 0);

  return {
    totalAmount,
    combination,
    excludedScholarships: [...tuitionExcluded, ...overflowExcluded, ...livingExcluded],
    amountUnknownScholarships,
    tuitionCeiling,
    tuitionCeilingIsEstimated,
  };
}

function chooseBestTuition(candidates: Scholarship[], tuitionCeiling: number, studentCategory: TuitionCategory | null) {
  let best: CombinationItem[] = [];
  let bestAmount = 0;

  // Each candidate's effective amount is resolved once up front (등록금 전액 같은
  // null-amount entries fall back to the estimated ceiling, or a per-scholarship
  // override) so the backtracking below can just sum plain numbers.
  const resolved = candidates.map((scholarship) => {
    const { amount, estimated } = resolveAmountForStudent(scholarship, tuitionCeiling, studentCategory);
    return { ...scholarship, amount_max_krw: amount, amountIsEstimated: estimated } as CombinationItem;
  });

  function backtrack(index: number, selected: CombinationItem[], currentAmount: number) {
    if (currentAmount > tuitionCeiling) return;
    if (currentAmount > bestAmount) {
      best = [...selected];
      bestAmount = currentAmount;
    }
    if (index >= resolved.length) return;

    for (let i = index; i < resolved.length; i += 1) {
      const candidate = resolved[i];
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
  for (const candidate of resolved) {
    if (bestIds.has(candidate.id)) continue;
    const conflictingItem = best.find((item) => conflictsWith(item, candidate));
    excluded.push({
      scholarship: candidate,
      reason: conflictingItem
        ? `${conflictingItem.name}과(와) 동시 수혜 불가`
        : `등록금 한도(약 ${tuitionCeiling.toLocaleString("ko-KR")}원) 초과로 제외`,
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
