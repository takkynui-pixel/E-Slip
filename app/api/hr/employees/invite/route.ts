import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';
import { requireHr, audit } from '@/lib/auth';

export const maxDuration = 60;

async function findAuthUser(db: any, email: string) {
  for (let page = 1; page <= 10; page++) {                       // สูงสุด 10,000 บัญชี
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) return null;
    const u = data.users.find((x: any) => x.email?.toLowerCase() === email.toLowerCase());
    if (u) return u;
    if (data.users.length < 1000) return null;
  }
  return null;
}

// เชิญพนักงานที่มีอีเมลแต่ยังไม่ผูกบัญชี ทีละ 20 คน (ไคลเอนต์เรียกวนจนไม่มีความคืบหน้า)
// body: { skip: string[] } = รหัส employees ที่ล้มเหลวไปแล้วในรอบนี้ (กันวนซ้ำคนเดิม)
export async function POST(req: Request) {
  const user = await requireHr(); if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { skip = [] } = await req.json().catch(() => ({}));
  const db = admin();
  let q: any = db.from('employees').select('id, email').is('user_id', null).not('email', 'is', null).eq('active', true).limit(20);
  if (skip.length) q = q.not('id', 'in', `(${skip.join(',')})`);
  const { data: todo } = await q;
  const redirectTo = `${process.env.APP_URL}/set-password`;
  const failed: { id: string; msg: string }[] = []; let invited = 0, linked = 0;

  for (const e of todo ?? []) {
    const r = await db.auth.admin.inviteUserByEmail(e.email!, { redirectTo });
    if (!r.error && r.data.user) {
      const up = await db.from('employees').update({ user_id: r.data.user.id }).eq('id', e.id);
      if (up.error) failed.push({ id: e.id, msg: `${e.email}: ผูกบัญชีไม่สำเร็จ ${up.error.message}` }); else invited++;
      continue;
    }
    // บัญชีมีอยู่แล้ว (เช่น เชิญไปรอบก่อนแต่ส่งเมลไม่สำเร็จ / เคยล็อกอินแล้ว) -> ผูกเข้ากับพนักงาน
    if (r.error && /already|registered|exists/i.test(r.error.message)) {
      const au = await findAuthUser(db, e.email!);
      if (au) {
        const up = await db.from('employees').update({ user_id: au.id }).eq('id', e.id);
        if (up.error) { failed.push({ id: e.id, msg: `${e.email}: ${up.error.message}` }); continue; }
        linked++;
        if (!au.last_sign_in_at) {                               // ยังไม่เคยเข้าระบบ -> ส่งลิงก์ตั้งรหัสผ่านใหม่
          const rs = await db.auth.resetPasswordForEmail(e.email!, { redirectTo });
          if (rs.error) failed.push({ id: e.id, msg: `${e.email}: ผูกบัญชีแล้วแต่ส่งลิงก์ไม่สำเร็จ (${rs.error.message})` });
        }
        continue;
      }
    }
    failed.push({ id: e.id, msg: `${e.email}: ${r.error?.message ?? 'unknown'}` });
  }
  let rq: any = db.from('employees').select('id', { count: 'exact', head: true }).is('user_id', null).not('email', 'is', null).eq('active', true);
  if (skip.length || failed.length) rq = rq.not('id', 'in', `(${[...skip, ...failed.map(f => f.id)].join(',')})`);
  const { count } = await rq;
  await audit(user.id, 'invite_employees', undefined, { invited, linked, failed: failed.length });
  return NextResponse.json({ ok: true, invited, linked, failed, remaining: count ?? 0 });
}
