import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.amount_text) {
    return NextResponse.json({ ok: false, message: "필수 항목이 누락되었습니다." }, { status: 400 });
  }

  const created = await prisma.scholarship.create({
    data: {
      name: body.name,
      source: body.source === "CAMPUS" ? "CAMPUS" : "EXTERNAL",
      type: body.type === "LIVING" ? "LIVING" : "TUITION",
      amount: body.amount_text,
      eligibilityRules: {
        gradeLevel: body.grade_level ?? "",
        gpaRecentMin: body.gpa_recent_min ?? 0,
        gpaCumulativeMin: body.gpa_cumulative_min ?? 0,
        incomeBracketMax: body.income_bracket_max ?? 0,
        specialStatus: body.special_status ?? [],
        otherConditions: body.other_conditions ?? "",
      },
      requiredDocs: body.required_docs ?? [],
      applyStart: body.apply_start ? new Date(body.apply_start) : null,
      applyEnd: body.apply_end ? new Date(body.apply_end) : null,
      officialUrl: body.official_url || null,
      duplicateConflictRules: { note: body.duplicate_conflict_note ?? "" },
      riskFlags: ["AI로 자동 추출된 정보이므로 담당자 검토가 필요합니다."],
      status: "OPEN",
    },
  });

  return NextResponse.json({ ok: true, id: created.id });
}
