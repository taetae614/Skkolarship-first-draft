import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ADMIN_COOKIE_NAME, computeAdminCookieValue, isAdminAccessKeyConfigured, isCorrectAdminKey } from "@/lib/admin-key";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminAccessKeyConfigured()) {
    return NextResponse.json({ ok: false, message: "관리자 키가 서버에 설정되어 있지 않습니다." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const key = typeof body?.key === "string" ? body.key : "";

  if (!isCorrectAdminKey(key)) {
    return NextResponse.json({ ok: false, message: "관리자 키가 올바르지 않습니다." }, { status: 401 });
  }

  const cookieValue = await computeAdminCookieValue();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, cookieValue as string, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
