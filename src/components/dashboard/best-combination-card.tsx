"use client";

import { useState } from "react";
import Link from "next/link";
import type { CombinationResult } from "@/engine/bestCombination";

function formatKrw(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export default function BestCombinationCard({ combination }: { combination: CombinationResult }) {
  const [showConflicts, setShowConflicts] = useState(false);
  const { totalAmount, combination: items, excludedDueToConflict } = combination;

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 rounded-[2rem] border border-pine-200 bg-gradient-to-br from-pine-50 to-white p-6 shadow-sm">
      <p className="text-xs font-bold tracking-[0.2em] text-pine-600">중복 수혜 시뮬레이션</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-extrabold text-navy-900">
          최대 수령 가능 조합 <span className="text-pine-600">{formatKrw(totalAmount)}</span>
        </h2>
      </div>
      <p className="mt-2 text-sm text-navy-500">
        서로 중복 수혜가 가능한 장학금들을 조합했을 때 예상되는 최대 수령액이에요. 등록금성 장학금은 등록금 한도 내에서,
        생활비성 장학금은 조건이 맞으면 모두 함께 계산돼요.
      </p>

      <ul className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/scholarships/${item.id}`}
              className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-navy-800 shadow-sm ring-1 ring-pine-200 transition hover:scale-105 hover:ring-pine-400 active:scale-95"
            >
              {item.name}
              {item.amount_max_krw ? (
                <span className="ml-1.5 text-pine-600">+{formatKrw(item.amount_max_krw)}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>

      {excludedDueToConflict.length > 0 ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowConflicts((value) => !value)}
            className="text-sm font-medium text-navy-500 underline underline-offset-4 transition hover:text-navy-800"
          >
            {showConflicts ? "중복불가로 제외된 장학금 숨기기" : `중복불가로 제외된 장학금 ${excludedDueToConflict.length}개 보기`}
          </button>
          {showConflicts ? (
            <ul className="mt-3 space-y-1.5 text-sm text-navy-500">
              {excludedDueToConflict.map(({ scholarship, conflictWith }) => (
                <li key={scholarship.id} className="rounded-xl bg-white/60 px-3 py-2">
                  <span className="font-medium text-navy-700">{scholarship.name}</span> — {conflictWith}과(와) 동시 수혜 불가
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
