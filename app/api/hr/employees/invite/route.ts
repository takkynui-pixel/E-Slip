import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';
import { requireHr, audit } from '@/lib/auth';

export const maxDuration = 60;
// เชิญพนักงานที่มีอีเมลแต่ยังไม่มีบัญชี ทีละ 20 คน (ฝั่งไคลเอนต์เรียกวนจน remaining = 0)
export async function POST() {
  const user = await requireHr(); if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const db = admin();
  const { data: todo } = await db.from('employees').select('id, email').is('user_id', null).not('email', 'is', null).eq('active', true).limit(20);
  const failed: string[] = []; let invited = 0;
  for (const e of todo ?? []) {
    const r = await db.auth.admin.inviteUserByEmail(e.email!, { redirectTo: `${process.env.APP_URL}/set-password` });
    if (r.error || !r.data.user) { failed.push(`${e.email}: ${r.error?.message}`); continue; }
    await db.from('employees').update({ user_id: r.data.user.id }).eq('id', e.id); invited++;
  }
  const { count } = await db.from('employees').select('id', { count: 'exact', head: true }).is('user_id', null).not('email', 'is', null).eq('active', true);
  await audit(user.id, 'invite_employees', undefined, { invited, failed: failed.length });
  return NextResponse.json({ ok: true, invited, failed, remaining: count ?? 0 });
}
