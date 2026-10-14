import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';
import { requireHr, audit } from '@/lib/auth';
import { sendBatch } from '@/lib/email';

export const maxDuration = 60;
const CHUNK = 50;
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireHr(); if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await params; const retry = new URL(req.url).searchParams.get('retry') === '1';
  const db = admin(); const statuses = retry ? ['pending', 'failed'] : ['pending'];
  const { data: period } = await db.from('payroll_periods').select('status, label').eq('id', id).single();
  if (period?.status !== 'published') return NextResponse.json({ error: 'ต้องเผยแพร่งวดก่อนส่งอีเมล' }, { status: 409 });

  const { data: jobs } = await db.from('payslips')
    .select('id, payroll_records!inner(period_id, employees(full_name, email))')
    .eq('payroll_records.period_id', id).eq('pdf_status', 'done').in('email_status', statuses).limit(CHUNK);
  let sent = 0, failed = 0;
  const ok: any[] = [];
  for (const j of (jobs ?? []) as any[]) {
    const e = j.payroll_records.employees;
    if (!e?.email) { await db.from('payslips').update({ email_status: 'failed', last_error: 'ไม่มีอีเมล' }).eq('id', j.id); failed++; } else ok.push({ j, e });
  }
  if (ok.length) {
    try {
      const res = await sendBatch(ok.map(({ e }) => ({ to: e.email, name: e.full_name, periodLabel: period.label })));
      for (let i = 0; i < ok.length; i++) {
        await db.from('payslips').update({ email_status: 'sent', email_provider_id: res[i]?.id ?? null, last_error: null }).eq('id', ok[i].j.id); sent++;
      }
    } catch (err: any) {
      for (const { j } of ok) await db.from('payslips').update({ email_status: 'failed', last_error: String(err.message).slice(0, 500) }).eq('id', j.id);
      failed += ok.length;
    }
    await new Promise(r => setTimeout(r, 600));      // เผื่อเพดานอัตราคำขอของผู้ให้บริการอีเมล
  }
  const { count } = await db.from('payslips').select('id, payroll_records!inner(period_id)', { count: 'exact', head: true })
    .eq('payroll_records.period_id', id).eq('pdf_status', 'done').in('email_status', statuses);
  await audit(user.id, 'send_email_batch', id, { sent, failed });
  return NextResponse.json({ ok: true, sent, failed, remaining: failed && !sent ? 0 : count ?? 0 });
}
