import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
// ใช้ตรวจปัญหาสิทธิ์ชั่วคราว — ลบไฟล์นี้ทิ้งหลังแก้เสร็จ
export async function GET() {
  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  if (!user) return NextResponse.json({ loggedIn: false });
  let roles: any = null, error: string | null = null;
  try {
    const r = await admin().from('user_roles').select('role').eq('user_id', user.id);
    roles = r.data?.map((x: any) => x.role); error = r.error?.message ?? null;
  } catch (e: any) { error = String(e.message ?? e); }
  return NextResponse.json({
    loggedIn: true, email: user.email, id: user.id, roles, roleQueryError: error,
    env: { url: !!process.env.NEXT_PUBLIC_SUPABASE_URL, anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, serviceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
  });
}
