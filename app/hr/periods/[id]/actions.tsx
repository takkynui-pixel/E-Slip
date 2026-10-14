'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
type P = { id: string; status: string; total: number; pdfDone: number; pdfFailed: number; sent: number; mailFailed: number };
export default function Actions({ p }: { p: P }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [log, setLog] = useState('');
  const post = async (path: string) => (await fetch(`/api/hr/periods/${p.id}/${path}`, { method: 'POST' })).json();
  async function loop(path: string, label: string) {
    let tot = 0;
    for (;;) {
      const j = await post(path); if (!j.ok) throw new Error(j.error);
      tot += j.done ?? j.sent ?? 0; setLog(`${label}: สำเร็จ ${tot} • เหลือ ${j.remaining}${j.failed ? ` • ล้มเหลว ${j.failed}` : ''}`);
      if (!j.remaining || (j.failed && !(j.done ?? j.sent))) return j;
    }
  }
  async function run(fn: () => Promise<void>) { setBusy(true); try { await fn(); } catch (e: any) { setLog('หยุด: ' + e.message); } setBusy(false); router.refresh(); }
  const all = () => run(async () => {
    if (!confirm(`ยืนยัน: อนุมัติ สร้าง PDF เผยแพร่ และส่งอีเมลให้พนักงาน ${p.total} คน?\nเมื่อเผยแพร่แล้วพนักงานจะเห็นสลิปทันที`)) return;
    if (p.status === 'draft') { const j = await post('approve'); if (!j.ok) throw new Error(j.error); }
    const g = await loop('generate', 'สร้าง PDF'); if (g.failed) throw new Error('มี PDF ล้มเหลว ตรวจสอบรายการด้านล่างแล้วกด "สร้างใหม่"');
    if (p.status !== 'published') { const j = await post('publish'); if (!j.ok) throw new Error(j.error); }
    await loop('send', 'ส่งอีเมล'); setLog(l => l + ' — เสร็จสิ้น');
  });
  return <div className="card"><h2>ดำเนินการ</h2>
    <div className="row"><button disabled={busy} onClick={all}>อนุมัติ สร้าง PDF และส่งอีเมล (ครั้งเดียว)</button></div>
    <div className="row" style={{ marginTop: 10 }}>
      <button className="sec" disabled={busy || p.status !== 'draft'} onClick={() => run(async () => { const j = await post('approve'); if (!j.ok) throw new Error(j.error); })}>อนุมัติอย่างเดียว</button>
      <button className="sec" disabled={busy || p.status === 'draft'} onClick={() => run(async () => { await loop('generate', 'สร้าง PDF'); })}>สร้าง PDF (เฉพาะที่ยังไม่สำเร็จ)</button>
      <button className="sec" disabled={busy || p.status !== 'published'} onClick={() => run(async () => { await loop('send?retry=1', 'ส่งซ้ำ'); })}>ส่งอีเมลซ้ำเฉพาะที่ล้มเหลว</button></div>
    <p className="mut">ปิดหน้านี้ระหว่างทำงานได้ — สถานะเก็บในฐานข้อมูล กลับมากดทำต่อได้ ระบบข้ามรายการที่สำเร็จแล้ว</p>
    <pre>{log}</pre></div>;
}
