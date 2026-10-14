import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';
import { requireHr, audit } from '@/lib/auth';
import { readPayroll } from '@/lib/payroll/map-excel';

export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await requireHr(); if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const form = await req.formData();
  const file = form.get('file') as File | null;
  const mode = String(form.get('mode') || 'preview');
  const periodLabel = String(form.get('periodLabel') || '').trim();
  const payDate = String(form.get('payDate') || '').trim();
  if (!file || !periodLabel) return NextResponse.json({ error: 'ต้องมีไฟล์และชื่องวด' }, { status: 400 });

  const db = admin();
  const { data: emps } = await db.from('employees').select('id, emp_code, email');
  const byCode = new Map((emps ?? []).map((e: any) => [e.emp_code, e]));
  const rows = readPayroll(Buffer.from(await file.arrayBuffer()), {
    periodLabel, payDate, employees: Object.fromEntries((emps ?? []).map((e: any) => [e.emp_code, { email: e.email }])),
  });
  if (!rows.length) return NextResponse.json({ error: 'ไม่พบข้อมูลในไฟล์' }, { status: 400 });

  // ข้อผิดพลาดที่ "บล็อกการนำเข้า" (ไม่รวมกรณีไม่มีอีเมล ซึ่งไปบล็อกตอนส่งอีเมลแทน)
  const issues = rows.map(r => {
    const blocking = r.errors.filter(e => !e.includes('อีเมล'));
    if (!byCode.has(r.code)) blocking.push('ไม่พบรหัสพนักงานนี้ในระบบ (นำเข้ารายชื่อพนักงานก่อน)');
    return { code: r.code, blocking, noEmail: r.errors.some(e => e.includes('อีเมล')) };
  });
  const keys = [...new Set(rows.map(r => r.periodKey))];
  const summary = {
    rows: rows.length, periodKey: keys[0], mixedPeriods: keys.length > 1,
    totalIncome: rows.reduce((s, r) => s + r.amounts.income, 0), totalNet: rows.reduce((s, r) => s + r.amounts.net, 0),
    missingEmail: issues.filter(i => i.noEmail).length,
    problems: issues.filter(i => i.blocking.length).map(i => ({ code: i.code, errors: i.blocking })),
    extraColumnsFound: (rows as any).extraColumnsFound,
  };
  if (mode === 'preview') return NextResponse.json({ ok: true, summary });

  if (summary.mixedPeriods) return NextResponse.json({ error: 'ไฟล์มีหลายงวด (คอลัมน์ปีเดือนงวด)' }, { status: 400 });
  if (summary.problems.length) return NextResponse.json({ error: 'ยังมีแถวที่ไม่ผ่านการตรวจสอบ', summary }, { status: 400 });

  const { data: existing } = await db.from('payroll_periods').select('id, status').eq('period_key', summary.periodKey).maybeSingle();
  if (existing && existing.status !== 'draft')
    return NextResponse.json({ error: 'งวดนี้อนุมัติ/เผยแพร่แล้ว ไม่สามารถนำเข้าซ้ำได้' }, { status: 409 });
  let periodId = existing?.id as string;
  if (existing) await db.from('payroll_records').delete().eq('period_id', periodId);   // draft: นำเข้าใหม่ทับ (payslips ลบตาม cascade)
  const pay = { label: periodLabel, pay_date: payDate || null, source_file: file.name, imported_by: user.id, imported_at: new Date().toISOString() };
  if (existing) await db.from('payroll_periods').update(pay).eq('id', periodId);
  else {
    const ins = await db.from('payroll_periods').insert({ period_key: summary.periodKey, ...pay }).select('id').single();
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
    periodId = ins.data.id;
  }
  const recs = rows.map(r => ({
    period_id: periodId, employee_id: (byCode.get(r.code) as any).id, slip_data: r.data,
    total_income: r.amounts.income, total_deduct: r.amounts.deduct, net_income: r.amounts.net,
    tax: r.amounts.tax, sso: r.amounts.sso, pvf: r.amounts.pvf,
  }));
  for (let i = 0; i < recs.length; i += 500) {
    const ins = await db.from('payroll_records').insert(recs.slice(i, i + 500)).select('id');
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
    await db.from('payslips').insert(ins.data.map((x: any) => ({ record_id: x.id })));
  }
  await audit(user.id, 'import_payroll', periodId, { file: file.name, rows: rows.length });
  return NextResponse.json({ ok: true, periodId, summary });
}
