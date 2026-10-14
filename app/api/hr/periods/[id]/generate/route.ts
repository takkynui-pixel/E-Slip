import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';
import { requireHr, audit } from '@/lib/auth';
import { renderSlip } from '@/lib/payroll/render';
import { launchBrowser, htmlToPdf } from '@/lib/payroll/pdf';

export const maxDuration = 300;          // ตรวจเพดานเวลาของแผน Vercel ที่ใช้อยู่ — ถ้าน้อยกว่านี้ให้ลด CHUNK
const CHUNK = 25;
const fmt = (v: any) => (v ? Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireHr(); if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await params; const db = admin();
  const { data: period } = await db.from('payroll_periods').select('status').eq('id', id).single();
  if (!period || !['approved', 'published'].includes(period.status)) return NextResponse.json({ error: 'ต้องอนุมัติงวดก่อน' }, { status: 409 });

  const { data: jobs } = await db.from('payslips')
    .select('id, payroll_records!inner(employee_id, slip_data, period_id, employees(emp_code, bank_name, bank_account_masked))')
    .eq('payroll_records.period_id', id).in('pdf_status', ['pending', 'failed']).limit(CHUNK);
  let done = 0, failed = 0;
  if (jobs?.length) {
    const { data: y } = await db.rpc('ytd_for_period', { p_period: id });
    const ytd = new Map((y ?? []).map((r: any) => [r.employee_id, r]));
    const browser = await launchBrowser();
    try {
      for (const j of jobs as any[]) {
        const rec = j.payroll_records, emp = rec.employees, s: any = ytd.get(rec.employee_id) ?? {};
        try {
          const html = renderSlip({ ...rec.slip_data, bankName: emp.bank_name ?? '', bankAccount: emp.bank_account_masked ?? '',
            ytdIncome: fmt(s.income), ytdTax: fmt(s.tax), ytdSocialSecurity: fmt(s.sso), ytdProvidentFund: fmt(s.pvf) });
          const pdf = await htmlToPdf(browser, html);
          const path = `${id}/${emp.emp_code}.pdf`;
          const up = await db.storage.from('payslips').upload(path, pdf, { contentType: 'application/pdf', upsert: true });
          if (up.error) throw up.error;
          await db.from('payslips').update({ pdf_path: path, pdf_status: 'done', last_error: null, updated_at: new Date().toISOString() }).eq('id', j.id); done++;
        } catch (e: any) {
          await db.from('payslips').update({ pdf_status: 'failed', last_error: String(e?.message ?? e).slice(0, 500) }).eq('id', j.id); failed++;
        }
      }
    } finally { await browser.close(); }
  }
  const { count } = await db.from('payslips').select('id, payroll_records!inner(period_id)', { count: 'exact', head: true })
    .eq('payroll_records.period_id', id).eq('pdf_status', 'pending');
  await audit(user.id, 'generate_pdf', id, { done, failed });
  return NextResponse.json({ ok: true, done, failed, remaining: count ?? 0 });   // failed ไม่นับใน remaining เพื่อกันวนไม่รู้จบ
}
