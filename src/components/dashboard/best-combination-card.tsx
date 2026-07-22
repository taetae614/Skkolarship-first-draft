"use client";

import { useState } from "react";
import Link from "next/link";
import type { CombinationResult } from "@/engine/bestCombination";

function formatKrw(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export default function BestCombinationCard({
  combination,
  userName,
}: {
  combination: CombinationResult;
  userName: string | null;
}) {
  const [showExcluded, setShowExcluded] = useState(false);
  const { totalAmount, combination: items, excludedScholarships, amountUnknownScholarships } = combination;

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 rounded-[2rem] border border-pine-200 bg-gradient-to-br from-pine-50 to-white p-6 shadow-sm">
      <p className="text-xs font-bold tracking-[0.2em] text-pine-600">중복 수혜 시뮬레이션</p>
      <h2 className="mt-1 text-2xl font-extrabold text-navy-900">최대 수령 가능 조합</h2>
      <p className="mt-2 text-sm text-navy-500">
        서로 중복 수혜가 가능한 지원가능(확정) 장학금들을 조합했을 때 예상되는 최대 수령액이에요. 등록금성 장학금은 등록금
        한도{combination.tuitionCeilingIsEstimated ? `(약 ${formatKrw(combination.tuitionCeiling)}, 계열별 추정치)` : ""} 내에서,
        생활비성 장학금은 조건이 맞으면 모두 함께 계산돼요. 초과분을 생활비로 전환 지급하는 장학금은 한도와 무관하게 전액
        더해져요.
      </p>

      <div className="mt-5 overflow-hidden rounded-2xl border border-pine-100 bg-white">
        <ul className="divide-y divide-dashed divide-pine-100">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/scholarships/${item.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-pine-50/60"
              >
                <span className="text-sm font-medium text-navy-800">{item.name}</span>
                <span className="shrink-0 font-mono text-sm font-semibold text-pine-700">
                  {item.amount_max_krw
                    ? `+${formatKrw(item.amount_max_krw)}${item.amountIsEstimated ? " (약)" : ""}`
                    : "금액 미확정"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-3 border-t-2 border-navy-900 bg-navy-950 px-5 py-4">
          <span className="text-sm font-semibold text-white">합계</span>
          <span className="font-mono text-lg font-bold text-cyan-300">{formatKrw(totalAmount)}</span>
        </div>
      </div>

      <p className="mt-5 rounded-2xl bg-navy-950 px-5 py-4 text-center text-base font-bold text-white">
        {userName ? `${userName}님의` : "회원님의"} 최대수령가능 장학금은{" "}
        <span className="text-cyan-300">{formatKrw(totalAmount)}</span>입니다!
      </p>

      {excludedScholarships.length + amountUnknownScholarships.length > 0 ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowExcluded((value) => !value)}
            className="text-sm font-medium text-navy-500 underline underline-offset-4 transition hover:text-navy-800"
          >
            {showExcluded
              ? "제외된 장학금 숨기기"
              : `제외된 장학금 ${excludedScholarships.length + amountUnknownScholarships.length}개 보기`}
          </button>
          {showExcluded ? (
            <ul className="mt-3 space-y-1.5 text-sm text-navy-500">
              {excludedScholarships.map(({ scholarship, reason }) => (
                <li key={scholarship.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/60 px-3 py-2">
                  <span>
                    <span className="font-medium text-navy-700">{scholarship.name}</span> — {reason}
                  </span>
                  <Link href={`/scholarships/${scholarship.id}`} className="shrink-0 text-xs font-medium text-pine-700 hover:underline">
                    자세히
                  </Link>
                </li>
              ))}
              {amountUnknownScholarships.map((scholarship) => (
                <li key={scholarship.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/60 px-3 py-2">
                  <span>
                    <span className="font-medium text-navy-700">{scholarship.name}</span> — 지원 가능하지만 정확한 금액이
                    공고문에 명시되어 있지 않아 합계에서 제외했어요
                  </span>
                  <Link href={`/scholarships/${scholarship.id}`} className="shrink-0 text-xs font-medium text-pine-700 hover:underline">
                    자세히
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
