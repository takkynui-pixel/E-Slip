import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';
import { requireHr, audit } from '@/lib/auth';
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireHr(); if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await params; const db = admin();
  const { count } = await db.from('payslips').select('id, payroll_records!inner(period_id)', { count: 'exact', head: true })
    .eq('payroll_records.period_id', id).neq('pdf_status', 'done');
  if (count) return NextResponse.json({ error: `ยังมี PDF ที่ไม่สำเร็จ ${count} รายการ` }, { status: 409 });
  const { data } = await db.from('payroll_periods').update({ status: 'published' }).eq('id', id).eq('status', 'approved').select('id');
  if (!data?.length) return NextResponse.json({ error: 'เผยแพร่ไม่ได้ (งวดต้องอนุมัติแล้ว)' }, { status: 409 });
  await audit(user.id, 'publish_period', id);
  return NextResponse.json({ ok: true });
}
