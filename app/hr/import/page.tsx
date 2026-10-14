'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function Import() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null); const [label, setLabel] = useState(''); const [payDate, setPayDate] = useState('');
  const [sum, setSum] = useState<any>(null); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const send = async (mode: string) => {
    const f = new FormData(); f.append('file', file!); f.append('mode', mode); f.append('periodLabel', label); f.append('payDate', payDate);
    return (await fetch('/api/hr/import', { method: 'POST', body: f })).json();
  };
  async function preview() { setBusy(true); setMsg(''); const j = await send('preview'); setBusy(false); j.ok ? setSum(j.summary) : setMsg(j.error); }
  async function commit() {
    setBusy(true); const j = await send('commit'); setBusy(false);
    if (j.ok) router.push(`/hr/periods/${j.periodId}`); else { setMsg(j.error); if (j.summary) setSum(j.summary); }
  }
  const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });
  return <main><nav><a href="/hr">← กลับ</a></nav><div className="card"><h1>นำเข้างวดเงินเดือน</h1>
    <label>ชื่องวด (แสดงในสลิป/อีเมล)</label><input value={label} onChange={e => setLabel(e.target.value)} placeholder="เช่น 09/2569 (งวด 1)" />
    <label>วันที่จ่ายเงิน</label><input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
    <label>ไฟล์ Excel เงินเดือน</label><input type="file" accept=".xlsx" onChange={e => { setFile(e.target.files?.[0] ?? null); setSum(null); }} />
    <div style={{ marginTop: 12 }}><button disabled={!file || !label || busy} onClick={preview}>ตรวจสอบไฟล์</button></div>
    {msg && <p className="err">{msg}</p>}</div>
    {sum && <div className="card"><h2>ผลตรวจสอบ</h2>
      <p>งวด (จากไฟล์): <b>{sum.periodKey}</b> • พนักงาน <b>{sum.rows}</b> คน • รวมรายได้ {money(sum.totalIncome)} • รวมสุทธิ {money(sum.totalNet)}</p>
      {sum.extraColumnsFound?.length ? <p className="mut">พบคอลัมน์เพิ่ม: {sum.extraColumnsFound.join(', ')}</p> : null}
      {sum.missingEmail > 0 && <p className="mut">พนักงาน {sum.missingEmail} คนยังไม่มีอีเมล (นำเข้าได้ แต่ส่งอีเมลไม่ได้จนกว่าจะเติม)</p>}
      {sum.mixedPeriods && <p className="err">ไฟล์มีหลายงวด</p>}
      {sum.problems.length === 0 && !sum.mixedPeriods ? <p className="ok">ผ่านการตรวจสอบทุกแถว</p> :
        <table><thead><tr><th>รหัส</th><th>ปัญหา</th></tr></thead><tbody>{sum.problems.map((p: any) => <tr key={p.code}><td>{p.code}</td><td className="err">{p.errors.join(' | ')}</td></tr>)}</tbody></table>}
      <div style={{ marginTop: 12 }}><button disabled={busy || sum.problems.length > 0 || sum.mixedPeriods} onClick={commit}>บันทึกเป็นงวด (สถานะร่าง)</button></div></div>}
  </main>;
}
