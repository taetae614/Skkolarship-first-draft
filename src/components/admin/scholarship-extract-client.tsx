"use client";

import { useState } from "react";
import Logo from "@/components/brand/logo";

type ExtractedScholarship = {
  name: string;
  source: "CAMPUS" | "EXTERNAL";
  type: "TUITION" | "LIVING";
  amount_text: string;
  apply_start: string;
  apply_end: string;
  grade_level: string;
  gpa_recent_min: number;
  gpa_cumulative_min: number;
  income_bracket_max: number;
  special_status: string[];
  other_conditions: string;
  required_docs: string[];
  duplicate_conflict_note: string;
  official_url: string;
};

const fieldStyle =
  "w-full rounded-xl border border-navy-100 bg-white px-4 py-3 text-navy-900 outline-none transition focus:border-pine-500 focus:ring-2 focus:ring-pine-500/30";

// Upstage 추출 결과가 숫자 필드를 문자열("3.0")로 주거나 누락시키는 경우가 있어
// 저장 요청을 보내기 전에 한 번 더 안전하게 정규화한다.
function normalizeForSave(result: ExtractedScholarship): ExtractedScholarship {
  return {
    ...result,
    name: result.name?.trim() ?? "",
    amount_text: result.amount_text?.trim() ?? "",
    gpa_recent_min: coerceNumber(result.gpa_recent_min),
    gpa_cumulative_min: coerceNumber(result.gpa_cumulative_min),
    income_bracket_max: coerceNumber(result.income_bracket_max),
    special_status: Array.isArray(result.special_status) ? result.special_status.filter(Boolean) : [],
    required_docs: Array.isArray(result.required_docs) ? result.required_docs.filter(Boolean) : [],
  };
}

function coerceNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

export default function ScholarshipExtractClient() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractedScholarship | null>(null);

  async function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSavedId(null);

    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/extract-scholarship", { method: "POST", body });
      const data = (await response.json().catch(() => null)) as
        | { ok: boolean; extracted?: ExtractedScholarship; message?: string }
        | null;

      if (!response.ok || !data?.ok || !data.extracted) {
        setError(data?.message ?? "분석에 실패했습니다.");
        return;
      }
      setResult(data.extracted);
    } catch {
      setError("분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;

    const payload = normalizeForSave(result);

    // 저장 전 최소한의 필수값 검증 (백엔드에서도 동일하게 검증하지만
    // 여기서 걸러주면 왕복 없이 바로 사용자에게 안내할 수 있다)
    if (!payload.name) {
      setError("장학금 이름이 비어 있어 저장할 수 없습니다.");
      return;
    }
    if (!payload.amount_text) {
      setError("지급 금액 정보가 비어 있어 저장할 수 없습니다.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/scholarships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok: boolean; id?: string; message?: string }
        | null;

      if (response.ok && data?.ok && data.id) {
        setSavedId(data.id);
      } else {
        setError(data?.message ?? `저장에 실패했습니다. (status ${response.status})`);
      }
    } catch {
      setError("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <div className="mb-8 flex justify-center">
        <Logo size="sm" />
      </div>

      <section className="rounded-[2rem] border border-navy-100 bg-white p-6 shadow-[0_20px_60px_-25px_rgba(11,28,49,0.25)] sm:p-8">
        <p className="text-xs font-bold tracking-[0.2em] text-pine-600">ADMIN · Information Extract</p>
        <h1 className="mt-1 text-2xl font-extrabold text-navy-900">장학금 공고 자동 등록</h1>
        <p className="mt-2 text-navy-500">
          장학금 공고 PDF/이미지를 올리면 Upstage Information Extract API가 자격 요건, 신청 기한, 제출 서류를 구조화된
          데이터로 뽑아줘요.
        </p>

        <label
          className="mt-6 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-navy-200 bg-navy-50/50 px-6 text-center transition hover:border-pine-400"
        >
          <input
            className="hidden"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(event) => void handleFile(event.target.files)}
          />
          <p className="text-sm font-medium text-navy-700">공고문 파일 선택</p>
          <p className="mt-1 text-xs text-navy-400">PDF 또는 이미지</p>
        </label>

        {loading ? (
          <div className="mt-6 rounded-xl bg-navy-50 px-4 py-3 text-sm font-medium text-navy-600">
            Information Extract로 분석 중...
          </div>
        ) : null}

        {error ? <div className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        {result ? (
          <div className="mt-6 rounded-2xl border border-navy-100 bg-navy-50/40 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-navy-900">{result.name || "이름 미확인"}</h2>
              <span className="rounded-full bg-pine-100 px-3 py-1 text-xs font-semibold text-pine-700">
                {result.source === "CAMPUS" ? "교내" : "교외"} · {result.type === "TUITION" ? "등록금성" : "생활비성"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="지급 금액" value={result.amount_text || "미확인"} />
              <Field label="지원 학년" value={result.grade_level} />
              <Field label="신청 시작" value={result.apply_start || "미확인"} />
              <Field label="신청 마감" value={result.apply_end || "미확인"} />
              <Field label="직전학기 최소 평점" value={result.gpa_recent_min ? String(result.gpa_recent_min) : "조건 없음"} />
              <Field label="누적 최소 평점" value={result.gpa_cumulative_min ? String(result.gpa_cumulative_min) : "조건 없음"} />
              <Field label="소득분위 상한" value={result.income_bracket_max ? `${result.income_bracket_max}구간` : "조건 없음"} />
              <Field label="특수 신분 조건" value={result.special_status.join(", ") || "없음"} />
            </div>

            <div className="mt-3">
              <p className="text-xs font-medium text-navy-400">제출 서류</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {result.required_docs.length ? (
                  result.required_docs.map((doc) => (
                    <span key={doc} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-navy-600">
                      {doc}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-navy-400">미확인</span>
                )}
              </div>
            </div>

            {result.other_conditions ? (
              <p className="mt-3 rounded-xl bg-white px-4 py-3 text-sm text-navy-600">{result.other_conditions}</p>
            ) : null}

            <button
              type="button"
              className="mt-6 w-full rounded-xl bg-navy-900 px-4 py-3 font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
              onClick={handleSave}
              disabled={saving || Boolean(savedId)}
            >
              {savedId ? "저장 완료" : saving ? "저장 중..." : "이 정보로 장학금 등록"}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className={fieldStyle + " cursor-default"}>
      <p className="text-xs font-medium text-navy-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-navy-900">{value}</p>
    </div>
  );
}