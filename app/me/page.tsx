import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export default async function Me() {
  const u = await currentUser(); if (!u) redirect('/login');
  const sb = await supabaseServer();
  // RLS: เห็นเฉพาะสลิปของตนเองในงวดที่เผยแพร่แล้ว
  const { data } = await sb.from('payslips').select('id, pdf_status, payroll_records(payroll_periods(label, period_key, pay_date))').eq('pdf_status', 'done');
  const list = (data ?? []).map((p: any) => ({ id: p.id, ...p.payroll_records.payroll_periods }))
    .sort((a: any, b: any) => String(b.period_key).localeCompare(String(a.period_key)));
  return <main><nav><b>สลิปเงินเดือนของฉัน</b><form action="/api/auth/signout" method="post" style={{ marginLeft: 'auto' }}><button className="sec">ออกจากระบบ</button></form></nav>
    <div className="card">{list.length === 0 ? <p className="mut">ยังไม่มีสลิปที่เผยแพร่</p> :
      <table><thead><tr><th>งวด</th><th>วันที่จ่าย</th><th></th></tr></thead><tbody>
        {list.map((p: any) => <tr key={p.id}><td>{p.label}</td><td>{p.pay_date ?? '-'}</td><td><a className="btn" href={`/api/payslips/${p.id}/download`}>ดาวน์โหลด PDF</a></td></tr>)}
      </tbody></table>}</div></main>;
}
