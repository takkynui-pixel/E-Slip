'use client';
import { useState } from 'react';
export default function Employees() {
  const [file, setFile] = useState<File | null>(null); const [log, setLog] = useState(''); const [busy, setBusy] = useState(false);
  async function upload() {
    if (!file) return; setBusy(true); const f = new FormData(); f.append('file', file);
    const j = await (await fetch('/api/hr/employees', { method: 'POST', body: f })).json();
    setLog(j.ok ? `นำเข้า ${j.imported} คน` + (j.rejected.length ? `\nไม่ผ่าน:\n${j.rejected.join('\n')}` : '') : j.error); setBusy(false);
  }
  async function invite() {
    setBusy(true); let invited = 0, linked = 0; const failed: { id: string; msg: string }[] = [];
    for (;;) {
      const j = await (await fetch('/api/hr/employees/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skip: failed.map(f => f.id) }) })).json();
      if (!j.ok) { setLog(j.error); break; }
      invited += j.invited; linked += j.linked; failed.push(...j.failed);
      setLog(`เชิญใหม่ ${invited} คน • ผูกบัญชีที่มีอยู่แล้ว ${linked} คน • เหลือ ${j.remaining}` + (failed.length ? `\nล้มเหลว ${failed.length} คน:\n${failed.map(f => f.msg).join('\n')}` : ''));
      if (!j.remaining || (j.invited + j.linked === 0 && j.failed.length === 0)) break;
    }
    setBusy(false);
  }
  return <main><nav><a href="/hr">← กลับ</a></nav>
    <div className="card"><h1>รายชื่อพนักงาน</h1>
      <p className="mut">ไฟล์ .xlsx/.csv หัวคอลัมน์: รหัสพนักงาน | ชื่อ | อีเมล | ธนาคาร | เลขบัญชี (ระบบเก็บเฉพาะเลขบัญชีที่ปิดบังแล้ว)</p>
      <input type="file" accept=".xlsx,.csv" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <div className="row" style={{ marginTop: 12 }}><button disabled={!file || busy} onClick={upload}>นำเข้า</button>
        <button className="sec" disabled={busy} onClick={invite}>ส่งคำเชิญตั้งรหัสผ่านให้พนักงานที่ยังไม่มีบัญชี</button></div>
      <pre>{log}</pre></div></main>;
}
