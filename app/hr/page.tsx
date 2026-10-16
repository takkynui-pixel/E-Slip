import Link from 'next/link';
import { admin } from '@/lib/supabase/admin';
import PageHead from '@/components/PageHead';
export const dynamic = 'force-dynamic';
const TH: Record<string, string> = { draft: 'ร่าง', approved: 'อนุมัติแล้ว', published: 'เผยแพร่แล้ว' };
export default async function Hr() {
  const { data: periods } = await admin().from('payroll_periods').select('id, label, period_key, status, pay_date').order('period_key', { ascending: false });
  return <>
    <PageHead title="งวดเงินเดือน" subtitle="นำเข้า อนุมัติ สร้างสลิป PDF และส่งอีเมลแจ้งพนักงาน" />
    <div className="card flush">{!periods?.length ? <p className="mut" style={{ padding: '18px 12px' }}>ยังไม่มีงวด — เริ่มจากนำเข้ารายชื่อพนักงาน แล้วนำเข้างวดเงินเดือน</p> :
      <table><thead><tr><th>งวด</th><th>วันที่จ่ายเงิน</th><th>สถานะ</th><th></th></tr></thead><tbody>
        {periods.map((p: any) => <tr key={p.id}><td>{p.label}</td><td>{p.pay_date ?? '-'}</td>
          <td><span className={`badge ${p.status}`}>{TH[p.status]}</span></td>
          <td style={{ textAlign: 'right' }}><Link className="btn btn-outline" href={`/hr/periods/${p.id}`}>จัดการ</Link></td></tr>)}
      </tbody></table>}</div>
  </>;
}
