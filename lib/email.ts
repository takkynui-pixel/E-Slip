import 'server-only';
// ส่งอีเมลทั้งหมดผ่าน Resend HTTPS API (ไม่พึ่ง SMTP ของ Supabase)
type Msg = { to: string; subject: string; html: string };
const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export async function sendMessages(msgs: Msg[]): Promise<{ id: string }[]> {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) throw new Error('ยังไม่ได้ตั้งค่า RESEND_API_KEY / EMAIL_FROM');
  const res = await fetch('https://api.resend.com/emails/batch', {      // รับได้สูงสุด 100 ฉบับ/คำขอ
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(msgs.map(m => ({ from: process.env.EMAIL_FROM, to: [m.to], subject: m.subject, html: m.html }))),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${json?.message || json?.name || 'error'}`);
  return (json.data ?? []) as { id: string }[];                          // ลำดับเดียวกับ msgs
}

// แจ้งสลิปพร้อมแล้ว — ไม่มียอดเงิน มีแต่ลิงก์เข้าระบบ
export const sendBatch = (items: { to: string; name: string; periodLabel: string }[]) =>
  sendMessages(items.map(i => ({
    to: i.to, subject: `สลิปเงินเดือนงวด ${i.periodLabel} พร้อมให้ดาวน์โหลดแล้ว`,
    html: `<p>เรียน ${esc(i.name)}</p><p>สลิปเงินเดือนงวด ${esc(i.periodLabel)} พร้อมแล้ว กรุณาเข้าสู่ระบบเพื่อดาวน์โหลด</p><p><a href="${process.env.APP_URL}/me">เข้าสู่ระบบ</a></p><p style="color:#666;font-size:12px">อีเมลนี้ไม่มีข้อมูลเงินเดือน หากไม่ได้ร้องขอ กรุณาแจ้งฝ่ายบุคคล</p>`,
  })));

// ลิงก์ของเราเอง: /set-password?token_hash=...&type=invite|recovery
// (ผู้ใช้ต้องกดปุ่มบนหน้าเว็บเพื่อยืนยัน — กันตัวสแกนลิงก์ของอีเมลมาใช้ลิงก์ครั้งเดียวทิ้งไปก่อน)
export const authLink = (tokenHash: string, type: 'invite' | 'recovery') =>
  `${process.env.APP_URL}/set-password?token_hash=${encodeURIComponent(tokenHash)}&type=${type}`;

export const inviteMsg = (to: string, link: string): Msg => ({
  to, subject: 'เชิญเข้าใช้ระบบสลิปเงินเดือนออนไลน์',
  html: `<p>คุณได้รับเชิญให้เข้าใช้ระบบสลิปเงินเดือนออนไลน์ของบริษัท</p><p><a href="${link}">กดที่นี่เพื่อตั้งรหัสผ่านและเข้าใช้งาน</a></p><p style="color:#666;font-size:12px">ลิงก์ใช้ได้ครั้งเดียวและมีอายุจำกัด หากหมดอายุให้กด "ลืมรหัสผ่าน" ที่หน้าเข้าสู่ระบบ</p>`,
});
export const resetMsg = (to: string, link: string): Msg => ({
  to, subject: 'ตั้งรหัสผ่านใหม่สำหรับระบบสลิปเงินเดือน',
  html: `<p>มีการขอตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ</p><p><a href="${link}">กดที่นี่เพื่อตั้งรหัสผ่านใหม่</a></p><p style="color:#666;font-size:12px">หากคุณไม่ได้เป็นผู้ขอ ให้เพิกเฉยต่ออีเมลนี้ รหัสผ่านเดิมจะไม่ถูกเปลี่ยน</p>`,
});
