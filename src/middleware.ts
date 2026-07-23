import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ADMIN_COOKIE_NAME, computeAdminCookieValue } from "@/lib/admin-key";

const AUTH_PAGES = ["/login"];
const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/admin"];
const ADMIN_UNLOCK_PAGE = "/admin/unlock";

export default auth(async (request) => {
  const { pathname } = request.nextUrl;
  const isAuthed = Boolean(request.auth);

  if (AUTH_PAGES.includes(pathname) && isAuthed) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) && !isAuthed) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 공고 자동 등록 등 /admin 기능은 SKKU 로그인 위에 관리자 키까지 별도로 요구한다.
  if (pathname.startsWith("/admin") && pathname !== ADMIN_UNLOCK_PAGE && isAuthed) {
    const expected = await computeAdminCookieValue();
    const provided = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!expected || provided !== expected) {
      const unlockUrl = new URL(ADMIN_UNLOCK_PAGE, request.url);
      unlockUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(unlockUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/onboarding/:path*", "/admin/:path*"],
};
