import { redirect, notFound } from 'next/navigation';
import { currentUser, rolesOf } from '@/lib/auth';
import { admin } from '@/lib/supabase/admin';
import Actions from './actions';
export const dynamic = 'force-dynamic';
export default async function Period({ params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser(); if (!u) redirect('/login');
  const r = await rolesOf(u.id); if (!r.includes('hr') && !r.includes('admin')) redirect('/me');
  const { id } = await params; const db = admin();
  const { data: period } = await db.from('payroll_periods').select('*').eq('id', id).maybeSingle(); if (!period) notFound();
  const { data: slips } = await db.from('payslips').select('id, pdf_status, email_status, last_error, payroll_records!inner(period_id, employees(emp_code, full_name))').eq('payroll_records.period_id', id);
  const s = (slips ?? []) as any[];
  const cnt = (f: (x: any) => boolean) => s.filter(f).length;
  const bad = s.filter(x => x.pdf_status === 'failed' || x.email_status === 'failed').slice(0, 50);
  return <main><nav><a href="/hr">← งวดทั้งหมด</a></nav>
    <div className="card"><h1>{period.label}</h1><p className="mut">สถานะ: {period.status} • วันที่จ่าย {period.pay_date ?? '-'} • ไฟล์ {period.source_file}</p>
      <table><tbody>
        <tr><td>พนักงานทั้งหมด</td><td>{s.length}</td></tr>
        <tr><td>สร้าง PDF สำเร็จ / ล้มเหลว</td><td>{cnt(x => x.pdf_status === 'done')} / {cnt(x => x.pdf_status === 'failed')}</td></tr>
        <tr><td>ส่งอีเมลแล้ว / ล้มเหลว</td><td>{cnt(x => ['sent', 'delivered'].includes(x.email_status))} / {cnt(x => x.email_status === 'failed')}</td></tr></tbody></table></div>
    <Actions p={{ id, status: period.status, total: s.length, pdfDone: cnt(x => x.pdf_status === 'done'), pdfFailed: cnt(x => x.pdf_status === 'failed'), sent: cnt(x => x.email_status === 'sent'), mailFailed: cnt(x => x.email_status === 'failed') }} />
    {bad.length > 0 && <div className="card"><h2>รายการที่ต้องตรวจสอบ</h2><table><thead><tr><th>รหัส</th><th>ชื่อ</th><th>PDF</th><th>อีเมล</th><th>สาเหตุ</th></tr></thead><tbody>
      {bad.map(x => <tr key={x.id}><td>{x.payroll_records.employees.emp_code}</td><td>{x.payroll_records.employees.full_name}</td><td>{x.pdf_status}</td><td>{x.email_status}</td><td className="err">{x.last_error}</td></tr>)}</tbody></table></div>}
  </main>;
}
