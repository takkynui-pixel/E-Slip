import { supabaseServer } from '@/lib/supabase/server';
import PageHead from '@/components/PageHead';
export const dynamic = 'force-dynamic';
export default async function Me() {
  const sb = await supabaseServer();
  // RLS: เห็นเฉพาะสลิปของตนเองในงวดที่เผยแพร่แล้ว
  const { data } = await sb.from('payslips').select('id, pdf_status, payroll_records(payroll_periods(label, period_key, pay_date))').eq('pdf_status', 'done');
  const list = (data ?? []).map((p: any) => ({ id: p.id, ...p.payroll_records.payroll_periods }))
    .sort((a: any, b: any) => String(b.period_key).localeCompare(String(a.period_key)));
  return <>
    <PageHead title="สลิปเงินเดือนของฉัน" subtitle="ดาวน์โหลดสลิปย้อนหลังเป็นไฟล์ PDF — เห็นเฉพาะของตนเอง" />
    <div className="card flush">{list.length === 0 ? <p className="mut" style={{ padding: '18px 12px' }}>ยังไม่มีสลิปที่เผยแพร่</p> :
      <table><thead><tr><th>งวด</th><th>วันที่จ่ายเงิน</th><th></th></tr></thead><tbody>
        {list.map((p: any) => <tr key={p.id}><td>{p.label}</td><td>{p.pay_date ?? '-'}</td>
          <td style={{ textAlign: 'right' }}><a className="btn btn-outline" href={`/api/payslips/${p.id}/download`}>ดาวน์โหลด PDF</a></td></tr>)}
      </tbody></table>}</div>
  </>;
}
