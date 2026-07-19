"use client";

type SortKey = "deadline" | "amount" | "fit";

export default function FilterBar({
  sortKey,
  onSortChange,
}: {
  sortKey: SortKey;
  onSortChange: (value: SortKey) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
      <span>정렬</span>
      <select
        className="rounded-xl border border-slate-300 bg-white px-3 py-2"
        value={sortKey}
        onChange={(event) => onSortChange(event.target.value as SortKey)}
      >
        <option value="deadline">마감 빠른 순</option>
        <option value="amount">장학금액 큰 순</option>
        <option value="fit">적합도 높은 순</option>
      </select>
    </label>
  );
}
