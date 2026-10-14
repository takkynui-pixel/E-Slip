import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser, rolesOf } from '@/lib/auth';
import { admin } from '@/lib/supabase/admin';
export const dynamic = 'force-dynamic';
const TH: Record<string, string> = { draft: 'ร่าง', approved: 'อนุมัติแล้ว', published: 'เผยแพร่แล้ว' };
export default async function Hr() {
  const u = await currentUser(); if (!u) redirect('/login');
  const r = await rolesOf(u.id); if (!r.includes('hr') && !r.includes('admin')) redirect('/me');
  const { data: periods } = await admin().from('payroll_periods').select('id, label, period_key, status, pay_date').order('period_key', { ascending: false });
  return <main><nav><b>HR</b><Link href="/hr/employees">พนักงาน</Link><Link href="/hr/import">นำเข้างวดเงินเดือน</Link>
    <form action="/api/auth/signout" method="post" style={{ marginLeft: 'auto' }}><button className="sec">ออกจากระบบ</button></form></nav>
    <div className="card"><h1>งวดเงินเดือน</h1>{!periods?.length ? <p className="mut">ยังไม่มีงวด — เริ่มจากนำเข้ารายชื่อพนักงาน แล้วนำเข้างวดเงินเดือน</p> :
      <table><thead><tr><th>งวด</th><th>วันที่จ่าย</th><th>สถานะ</th><th></th></tr></thead><tbody>
        {periods.map((p: any) => <tr key={p.id}><td>{p.label}</td><td>{p.pay_date ?? '-'}</td><td><span className="badge">{TH[p.status]}</span></td><td><Link href={`/hr/periods/${p.id}`}>จัดการ</Link></td></tr>)}
      </tbody></table>}</div></main>;
}
