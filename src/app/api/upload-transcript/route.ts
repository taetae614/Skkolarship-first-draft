import { NextResponse } from "next/server";
import { extractInformation, type JsonSchema } from "@/lib/upstage/informationExtract";
import type { ParsedTranscript } from "@/types/onboarding";

const TRANSCRIPT_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    university: { type: "string", description: "대학교 이름" },
    college: { type: "string", description: "단과대학 이름" },
    department: { type: "string", description: "학과/전공 이름" },
    grade_level: { type: "string", description: "현재 학년. 1, 2, 3, 4 중 하나의 숫자 문자열" },
    semester_progress: { type: "string", description: "몇 학년 몇 학기까지 이수했는지 (예: 3-1)" },
    gpa_cumulative: { type: "number", description: "전체 누적 평점(GPA)" },
    gpa_cumulative_scale: { type: "number", description: "평점 만점 기준. 4.5 또는 4.3" },
    percentile_cumulative: { type: "number", description: "누적 백분율(있는 경우), 0~100 사이 숫자" },
    gpa_recent: { type: "number", description: "가장 최근 학기의 평점" },
    credits_recent: { type: "number", description: "가장 최근 학기에 이수한 학점" },
    has_f_grade_recent: { type: "boolean", description: "가장 최근 학기에 F 학점이 있는지 여부" },
    credits_total: { type: "number", description: "지금까지 이수한 전체 누적 학점" },
    course_history: {
      type: "array",
      items: { type: "string" },
      description: "수강한 과목명 목록",
    },
    exchange_semester_detected: { type: "boolean", description: "교환학생으로 이수한 학기가 포함되어 있는지 여부" },
  },
  required: [
    "university",
    "department",
    "grade_level",
    "gpa_cumulative",
    "gpa_recent",
    "credits_recent",
    "credits_total",
  ],
};

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "파일이 필요합니다." }, { status: 400 });
  }

  if (!process.env.UPSTAGE_API_KEY) {
    return NextResponse.json(
      { ok: false, message: "UPSTAGE_API_KEY가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  try {
    const extracted = await extractInformation(file, TRANSCRIPT_SCHEMA, "transcript_schema");
    const transcript = normalizeTranscript(extracted);
    return NextResponse.json({ ok: true, transcript });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "성적증명서 분석에 실패했습니다." },
      { status: 502 },
    );
  }
}

function normalizeTranscript(extracted: Record<string, unknown>): ParsedTranscript {
  const gradeLevel = toStringOrNull(extracted.grade_level);
  return {
    university: toStringOrNull(extracted.university),
    college: toStringOrNull(extracted.college),
    department: toStringOrNull(extracted.department),
    grade_level: gradeLevel && ["1", "2", "3", "4"].includes(gradeLevel) ? (gradeLevel as "1" | "2" | "3" | "4") : null,
    semester_progress: toStringOrNull(extracted.semester_progress),
    gpa_cumulative: toNumberOrNull(extracted.gpa_cumulative),
    gpa_cumulative_scale: toGpaScale(extracted.gpa_cumulative_scale),
    percentile_cumulative: toNumberOrNull(extracted.percentile_cumulative),
    gpa_recent: toNumberOrNull(extracted.gpa_recent),
    credits_recent: toNumberOrNull(extracted.credits_recent),
    has_f_grade_recent: toBooleanOrNull(extracted.has_f_grade_recent),
    credits_total: toNumberOrNull(extracted.credits_total),
    course_history: Array.isArray(extracted.course_history)
      ? extracted.course_history.filter((item): item is string => typeof item === "string")
      : [],
    exchange_semester_detected: toBooleanOrNull(extracted.exchange_semester_detected),
    parsed_at: new Date().toISOString(),
    needs_confirmation: true,
  };
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function toBooleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function toGpaScale(value: unknown): 4.5 | 4.3 | null {
  const num = toNumberOrNull(value);
  if (num === 4.5 || num === 4.3) return num;
  return null;
}
