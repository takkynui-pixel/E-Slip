import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: list => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { const url = req.nextUrl.clone(); url.pathname = '/login'; return NextResponse.redirect(url); }
  return res;
}
// การตรวจ "บทบาท" ทำซ้ำในหน้า/API เสมอ — middleware เป็นแค่ด่านแรก
export const config = { matcher: ['/me/:path*', '/hr/:path*', '/api/hr/:path*', '/api/payslips/:path*'] };
