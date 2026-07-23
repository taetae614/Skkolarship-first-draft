"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/brand/logo";

const fieldStyle =
  "w-full rounded-xl border border-navy-100 bg-white px-4 py-3 text-navy-900 outline-none transition focus:border-pine-500 focus:ring-2 focus:ring-pine-500/30";

export default function AdminUnlockClient({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = (await response.json().catch(() => null)) as { ok: boolean; message?: string } | null;
      if (!response.ok || !data?.ok) {
        setError(data?.message ?? "관리자 키 확인에 실패했습니다.");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("관리자 키 확인 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12">
      <Logo size="sm" />

      <form
        onSubmit={handleSubmit}
        className="mt-8 w-full rounded-[2rem] border border-navy-100 bg-white p-6 shadow-[0_20px_60px_-25px_rgba(11,28,49,0.25)] sm:p-8"
      >
        <p className="text-xs font-bold tracking-[0.2em] text-pine-600">ADMIN</p>
        <h1 className="mt-1 text-2xl font-extrabold text-navy-900">관리자 키 입력</h1>
        <p className="mt-2 text-navy-500">장학금 공고 자동 등록 기능은 관리자 키를 입력해야 접근할 수 있어요.</p>

        <input
          type="password"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          placeholder="관리자 키"
          autoFocus
          className={fieldStyle + " mt-6"}
        />

        {error ? <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <button
          type="submit"
          disabled={submitting || !key}
          className="mt-6 w-full rounded-xl bg-navy-900 px-4 py-3 font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
        >
          {submitting ? "확인 중..." : "확인"}
        </button>
      </form>
    </main>
  );
}
