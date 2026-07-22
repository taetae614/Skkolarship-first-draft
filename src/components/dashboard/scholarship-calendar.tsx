"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Scholarship } from "@/lib/scholarships";

type CalendarEvent = {
  id: string;
  name: string;
  start: Date;
  end: Date;
};

type PlacedEvent = CalendarEvent & { startCol: number; endCol: number; lane: number };

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildMonthWeeks(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay());

  const weeks: Date[][] = [];
  let cursor = gridStart;
  for (let week = 0; week < 6; week += 1) {
    const days: Date[] = [];
    for (let day = 0; day < 7; day += 1) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(days);
  }
  return weeks;
}

// Greedy lane assignment so overlapping event bars within a week stack instead of collide,
// the same approach month-view calendars (Google/Notion Calendar) use for multi-day events.
function placeEventsForWeek(events: CalendarEvent[], weekStart: Date, weekEnd: Date): PlacedEvent[] {
  const overlapping = events
    .map((event) => {
      const clippedStart = event.start < weekStart ? weekStart : event.start;
      const clippedEnd = event.end > weekEnd ? weekEnd : event.end;
      if (clippedEnd < weekStart || clippedStart > weekEnd) return null;
      const startCol = Math.round((clippedStart.getTime() - weekStart.getTime()) / DAY_MS);
      const endCol = Math.round((clippedEnd.getTime() - weekStart.getTime()) / DAY_MS);
      return { ...event, startCol, endCol };
    })
    .filter((value): value is CalendarEvent & { startCol: number; endCol: number } => value !== null)
    .sort((a, b) => a.startCol - b.startCol || a.start.getTime() - b.start.getTime());

  const laneEndCols: number[] = [];
  return overlapping.map((item) => {
    let lane = laneEndCols.findIndex((endCol) => endCol < item.startCol);
    if (lane === -1) {
      lane = laneEndCols.length;
      laneEndCols.push(item.endCol);
    } else {
      laneEndCols[lane] = item.endCol;
    }
    return { ...item, lane };
  });
}

export default function ScholarshipCalendar({ scholarships }: { scholarships: Scholarship[] }) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [view, setView] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }));
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set(scholarships.map((s) => s.id)));

  // Keep newly-favorited scholarships visible by default, and drop ids that were un-favorited.
  useEffect(() => {
    setVisibleIds((current) => {
      const next = new Set(current);
      let changed = false;
      const validIds = new Set(scholarships.map((s) => s.id));
      for (const id of next) {
        if (!validIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      for (const scholarship of scholarships) {
        if (!next.has(scholarship.id)) {
          next.add(scholarship.id);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [scholarships]);

  function toggleVisible(id: string) {
    setVisibleIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const visibleScholarships = useMemo(
    () => scholarships.filter((scholarship) => visibleIds.has(scholarship.id)),
    [scholarships, visibleIds],
  );

  // Several scholarships only have a known deadline (apply_end) with no listed
  // application-open date, or vice versa — those used to be hidden entirely
  // just because only one side was known. Show them as a single-day marker on
  // whichever date is available instead of requiring both.
  const events: CalendarEvent[] = useMemo(
    () =>
      visibleScholarships
        .filter((scholarship) => scholarship.applyStart || scholarship.applyEnd)
        .map((scholarship) => {
          const start = scholarship.applyStart ?? scholarship.applyEnd;
          const end = scholarship.applyEnd ?? scholarship.applyStart;
          return {
            id: scholarship.id,
            name: scholarship.name,
            start: startOfDay(new Date(start as string)),
            end: startOfDay(new Date(end as string)),
          };
        }),
    [visibleScholarships],
  );

  const weeks = useMemo(() => buildMonthWeeks(view.year, view.month), [view]);

  function shiftMonth(delta: number) {
    setView((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  if (scholarships.length === 0) {
    return (
      <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        찜한 장학금이 없어요. 카드에서 하트(♡)를 눌러 캘린더에 추가해보세요.
      </div>
    );
  }

  return (
    <section className="mt-8 flex overflow-hidden rounded-[2rem] border border-navy-100 bg-white shadow-[0_20px_60px_-25px_rgba(11,28,49,0.15)]">
      <aside className="w-60 shrink-0 border-r border-slate-100 p-4">
        <p className="px-1 text-xs font-bold uppercase tracking-wide text-slate-400">표시할 장학금</p>
        <ul className="mt-3 space-y-1">
          {scholarships.map((scholarship) => (
            <li key={scholarship.id}>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-1.5 text-sm transition hover:bg-navy-50">
                <input
                  type="checkbox"
                  checked={visibleIds.has(scholarship.id)}
                  onChange={() => toggleVisible(scholarship.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-pine-500"
                />
                <span className={visibleIds.has(scholarship.id) ? "text-navy-800" : "text-slate-400 line-through"}>
                  {scholarship.name}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-navy-900">
            {view.year}년 {view.month + 1}월
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-navy-500 transition hover:scale-110 hover:bg-navy-50"
              aria-label="이전 달"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setView({ year: today.getFullYear(), month: today.getMonth() })}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-navy-600 transition hover:scale-105 hover:bg-navy-50"
            >
              오늘
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-navy-500 transition hover:scale-110 hover:bg-navy-50"
              aria-label="다음 달"
            >
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100 text-center text-xs font-semibold text-slate-400">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-2">
              {label}
            </div>
          ))}
        </div>

        <div>
          {weeks.map((week) => {
          const weekStart = week[0];
          const weekEnd = week[6];
          const placedEvents = placeEventsForWeek(events, weekStart, weekEnd);
          const laneCount = placedEvents.reduce((max, item) => Math.max(max, item.lane + 1), 0);

          return (
            <div
              key={weekStart.toISOString()}
              className="relative grid grid-cols-7 border-b border-slate-50 last:border-b-0"
              style={{ minHeight: `${52 + laneCount * 24 + 8}px` }}
            >
              {week.map((date) => {
                const inMonth = date.getMonth() === view.month;
                const isToday = date.getTime() === today.getTime();
                return (
                  <div key={date.toISOString()} className="border-r border-slate-50 p-1.5 last:border-r-0">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        isToday ? "bg-navy-900 font-bold text-white" : inMonth ? "text-slate-700" : "text-slate-300"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                );
              })}

              <div className="pointer-events-none absolute inset-x-0 top-8 px-1">
                {placedEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/scholarships/${event.id}`}
                    title={event.name}
                    className="pointer-events-auto absolute flex items-center overflow-hidden truncate rounded-md bg-pine-100 px-2 text-[11px] font-medium text-pine-800 shadow-sm transition hover:scale-[1.02] hover:bg-pine-200"
                    style={{
                      left: `calc(${(event.startCol / 7) * 100}% + 3px)`,
                      width: `calc(${((event.endCol - event.startCol + 1) / 7) * 100}% - 6px)`,
                      top: `${event.lane * 24}px`,
                      height: "20px",
                    }}
                  >
                    {event.name}
                  </Link>
                ))}
              </div>
            </div>
          );
          })}
        </div>

        <p className="border-t border-slate-100 px-6 py-3 text-xs text-slate-400">
          연녹색 바는 서류 접수 기간이에요. 결과 발표일 정보는 아직 준비 중이라 추가되는 대로 반영할게요.
        </p>
      </div>
    </section>
  );
}
