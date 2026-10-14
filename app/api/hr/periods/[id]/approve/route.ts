import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';
import { requireHr, audit } from '@/lib/auth';
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireHr(); if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await params;
  const { data, error } = await admin().from('payroll_periods')
    .update({ status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() })
    .eq('id', id).eq('status', 'draft').select('id');
  if (error || !data?.length) return NextResponse.json({ error: 'อนุมัติไม่ได้ (งวดต้องเป็นสถานะร่าง)' }, { status: 409 });
  await audit(user.id, 'approve_period', id);
  return NextResponse.json({ ok: true });
}
