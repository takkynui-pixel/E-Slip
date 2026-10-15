import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';
import { requireHr, audit } from '@/lib/auth';
import { sendMessages, inviteMsg, resetMsg, authLink } from '@/lib/email';

export const maxDuration = 60;

// เชิญพนักงานที่มีอีเมลแต่ยังไม่ผูกบัญชี ทีละ 20 คน — สร้างลิงก์เองด้วย generateLink (ไม่ส่งเมลผ่าน Supabase)
// แล้วส่งผ่าน Resend API; ผูก employees.user_id หลังส่งสำเร็จเท่านั้น (ส่งไม่ผ่านก็ลองใหม่ได้)
// body: { skip: string[] } = รหัสที่ล้มเหลวไปแล้วในรอบนี้ (กันวนซ้ำคนเดิม)
export async function POST(req: Request) {
  const user = await requireHr(); if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { skip = [] } = await req.json().catch(() => ({}));
  const db = admin();
  let q: any = db.from('employees').select('id, email').is('user_id', null).not('email', 'is', null).eq('active', true).limit(20);
  if (skip.length) q = q.not('id', 'in', `(${skip.join(',')})`);
  const { data: todo } = await q;

  const failed: { id: string; msg: string }[] = [];
  const toSend: { id: string; userId: string; msg: any; isNew: boolean }[] = [];
  let linkedOnly = 0;

  for (const e of todo ?? []) {
    let isNew = true;
    let g: any = await db.auth.admin.generateLink({ type: 'invite', email: e.email! });     // สร้างบัญชีใหม่ (ยังไม่ยืนยัน)
    if (g.error && /already|registered|exists/i.test(g.error.message)) {                    // บัญชีมีอยู่แล้ว
      isNew = false;
      g = await db.auth.admin.generateLink({ type: 'recovery', email: e.email! });
    }
    if (g.error || !g.data?.user || !g.data?.properties?.hashed_token) { failed.push({ id: e.id, msg: `${e.email}: ${g.error?.message ?? 'สร้างลิงก์ไม่สำเร็จ'}` }); continue; }
    const au = g.data.user;
    if (!isNew && au.last_sign_in_at) {                                                     // เคยเข้าระบบแล้ว: ผูกอย่างเดียว ไม่ส่งเมล
      const up = await db.from('employees').update({ user_id: au.id }).eq('id', e.id);
      if (up.error) failed.push({ id: e.id, msg: `${e.email}: ${up.error.message}` }); else linkedOnly++;
      continue;
    }
    const link = authLink(g.data.properties.hashed_token, isNew ? 'invite' : 'recovery');
    toSend.push({ id: e.id, userId: au.id, isNew, msg: isNew ? inviteMsg(e.email!, link) : resetMsg(e.email!, link) });
  }

  let invited = 0, linked = linkedOnly;
  if (toSend.length) {
    try {
      await sendMessages(toSend.map(t => t.msg));
      for (const t of toSend) {
        const up = await db.from('employees').update({ user_id: t.userId }).eq('id', t.id);
        if (up.error) failed.push({ id: t.id, msg: `ส่งเมลแล้วแต่ผูกบัญชีไม่สำเร็จ: ${up.error.message}` });
        else if (t.isNew) invited++; else linked++;
      }
      await new Promise(r => setTimeout(r, 600));                                           // เผื่อเพดานอัตราคำขอของ Resend
    } catch (err: any) {
      for (const t of toSend) failed.push({ id: t.id, msg: String(err.message).slice(0, 300) });
    }
  }

  let rq: any = db.from('employees').select('id', { count: 'exact', head: true }).is('user_id', null).not('email', 'is', null).eq('active', true);
  const ex = [...skip, ...failed.map(f => f.id)]; if (ex.length) rq = rq.not('id', 'in', `(${ex.join(',')})`);
  const { count } = await rq;
  await audit(user.id, 'invite_employees', undefined, { invited, linked, failed: failed.length });
  return NextResponse.json({ ok: true, invited, linked, failed, remaining: count ?? 0 });
}
