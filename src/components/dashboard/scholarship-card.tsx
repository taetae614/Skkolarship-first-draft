"use client";

import Link from "next/link";
import type { Scholarship } from "@/lib/scholarships";
import { useFavoritesStore } from "@/store/useFavoritesStore";

export default function ScholarshipCard({
  scholarship,
}: {
  scholarship: Scholarship;
}) {
  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const isFavorite = favorites.includes(scholarship.id);

  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">
              {scholarship.status}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {scholarship.type === "TUITION" ? "등록금성" : "생활비성"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {scholarship.source === "CAMPUS" ? "교내" : "교외"}
            </span>
          </div>
          <h2 className="mt-4 text-xl font-semibold">{scholarship.name}</h2>
          <p className="mt-2 text-sm text-slate-600">{scholarship.amount}</p>
        </div>

        <button
          type="button"
          onClick={() => toggleFavorite(scholarship.id)}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            isFavorite ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-700"
          }`}
          aria-label="찜 토글"
        >
          {isFavorite ? "♥" : "♡"}
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {scholarship.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-800"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <p className="text-slate-400">마감</p>
          <p className="font-medium text-slate-900">{scholarship.applyEnd ?? "미정"}</p>
        </div>
        <div>
          <p className="text-slate-400">적합도</p>
          <p className="font-medium text-slate-900">{scholarship.fitScore}/100</p>
        </div>
      </div>

      {scholarship.matchCriteria && scholarship.matchCriteria.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-800">판단 근거</p>
          <ul className="mt-3 space-y-2">
            {scholarship.matchCriteria.map((criterion) => (
              <li
                key={criterion.key}
                className={`rounded-xl px-3 py-2 text-sm ${criterion.met ? "bg-emerald-50" : "bg-rose-50"}`}
              >
                <div className="flex items-start gap-2">
                  <span className={criterion.met ? "text-emerald-600" : "text-rose-600"}>
                    {criterion.met ? "✓" : "✕"}
                  </span>
                  <div>
                    <p className={`font-medium ${criterion.met ? "text-emerald-900" : "text-rose-900"}`}>
                      {criterion.label}
                    </p>
                    <p className={criterion.met ? "text-emerald-700" : "text-rose-700"}>{criterion.detail}</p>
                    {criterion.actionHint ? (
                      <p className="mt-1 font-medium text-amber-700">💡 {criterion.actionHint}</p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">주의 사항</p>
        <ul className="mt-2 space-y-1">
          {scholarship.riskFlags.map((flag) => (
            <li key={flag}>• {flag}</li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/scholarships/${scholarship.id}`}
          className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white"
        >
          상세 보기
        </Link>
        {scholarship.officialUrl ? (
          <a
            href={scholarship.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
          >
            공고 링크
          </a>
        ) : null}
      </div>
    </article>
  );
}
