import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractInformation, type JsonSchema } from "@/lib/upstage/informationExtract";

const SCHOLARSHIP_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    name: { type: "string", description: "장학금 이름" },
    source_type: {
      type: "string",
      description: "이 장학금이 교내(대학 자체) 장학금인지 교외(정부/지자체/민간재단) 장학금인지. '교내' 또는 '교외' 중 하나",
    },
    money_type: {
      type: "string",
      description: "등록금을 지원하는 장학금인지, 생활비를 지원하는 장학금인지. '등록금성' 또는 '생활비성' 중 하나",
    },
    amount_text: { type: "string", description: "지급 금액을 사람이 읽기 쉬운 문장으로 (예: '학기당 200만원 정액 지급')" },
    apply_start: { type: "string", description: "신청 시작일. YYYY-MM-DD 형식, 모르면 빈 문자열" },
    apply_end: { type: "string", description: "신청 마감일. YYYY-MM-DD 형식, 모르면 빈 문자열" },
    grade_level: { type: "string", description: "지원 가능한 학년. 예: '2,3' 또는 '전체'" },
    gpa_recent_min: { type: "number", description: "직전 학기 최소 평점 기준. 조건이 없으면 0" },
    gpa_cumulative_min: { type: "number", description: "누적 최소 평점 기준. 조건이 없으면 0" },
    income_bracket_max: { type: "number", description: "지원 가능한 소득분위 상한 (숫자). 조건이 없으면 0" },
    special_status: {
      type: "array",
      items: { type: "string" },
      description: "요구되는 특수 신분 조건 목록 (예: 기초생활수급자, 차상위계층, 다자녀, 국가유공자 등). 없으면 빈 배열",
    },
    other_conditions: { type: "string", description: "위 항목에 포함되지 않은 기타 자격 조건 설명" },
    required_docs: {
      type: "array",
      items: { type: "string" },
      description: "제출해야 하는 서류 목록 (예: 성적증명서, 소득분위증명서, 가족관계증명서 등)",
    },
    duplicate_conflict_note: { type: "string", description: "타 장학금과의 중복 수혜 가능 여부 및 관련 규정 설명" },
    official_url: { type: "string", description: "문서에 명시된 공식 안내/신청 링크. 없으면 빈 문자열" },
  },
  required: ["name", "amount_text", "grade_level", "required_docs"],
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "파일이 필요합니다." }, { status: 400 });
  }

  if (!process.env.UPSTAGE_API_KEY) {
    return NextResponse.json({ ok: false, message: "UPSTAGE_API_KEY가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const extracted = await extractInformation(file, SCHOLARSHIP_SCHEMA, "scholarship_schema");
    return NextResponse.json({ ok: true, extracted: normalizeScholarship(extracted) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "장학금 공고 분석에 실패했습니다." },
      { status: 502 },
    );
  }
}

function normalizeScholarship(extracted: Record<string, unknown>) {
  const sourceType = toStringOrEmpty(extracted.source_type);
  const moneyType = toStringOrEmpty(extracted.money_type);

  return {
    name: toStringOrEmpty(extracted.name) || "이름 미확인 장학금",
    source: sourceType.includes("교내") ? ("CAMPUS" as const) : ("EXTERNAL" as const),
    type: moneyType.includes("생활비") ? ("LIVING" as const) : ("TUITION" as const),
    amount_text: toStringOrEmpty(extracted.amount_text),
    apply_start: toStringOrEmpty(extracted.apply_start),
    apply_end: toStringOrEmpty(extracted.apply_end),
    grade_level: toStringOrEmpty(extracted.grade_level),
    gpa_recent_min: toNumberOrZero(extracted.gpa_recent_min),
    gpa_cumulative_min: toNumberOrZero(extracted.gpa_cumulative_min),
    income_bracket_max: toNumberOrZero(extracted.income_bracket_max),
    special_status: toStringArray(extracted.special_status),
    other_conditions: toStringOrEmpty(extracted.other_conditions),
    required_docs: toStringArray(extracted.required_docs),
    duplicate_conflict_note: toStringOrEmpty(extracted.duplicate_conflict_note),
    official_url: toStringOrEmpty(extracted.official_url),
  };
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNumberOrZero(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
