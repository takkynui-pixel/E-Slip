import 'server-only';
// ส่งผ่าน Resend batch API (สูงสุด 100 ฉบับ/คำขอ) — เนื้อหา "ไม่มียอดเงิน" มีแต่ลิงก์เข้าระบบ
export async function sendBatch(items: { to: string; name: string; periodLabel: string }[]) {
  const link = `${process.env.APP_URL}/me`;
  const body = items.map(i => ({
    from: process.env.EMAIL_FROM, to: [i.to],
    subject: `สลิปเงินเดือนงวด ${i.periodLabel} พร้อมให้ดาวน์โหลดแล้ว`,
    html: `<p>เรียน ${escape(i.name)}</p><p>สลิปเงินเดือนงวด ${escape(i.periodLabel)} พร้อมแล้ว กรุณาเข้าสู่ระบบเพื่อดาวน์โหลด</p><p><a href="${link}">เข้าสู่ระบบ</a></p><p style="color:#666;font-size:12px">อีเมลนี้ไม่มีข้อมูลเงินเดือน หากไม่ได้ร้องขอ กรุณาแจ้งฝ่ายบุคคล</p>`,
  }));
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `Resend ${res.status}`);
  return (json.data ?? []) as { id: string }[];           // ลำดับเดียวกับ items
}
const escape = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
