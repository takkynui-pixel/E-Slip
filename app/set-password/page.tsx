'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';
// หน้านี้รับลิงก์จากอีเมลเชิญ/ลืมรหัสผ่านของ Supabase (ต้องเพิ่ม URL นี้ใน Auth > URL Configuration > Redirect URLs)
export default function SetPassword() {
  const [ready, setReady] = useState(false); const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [msg, setMsg] = useState('');
  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setReady(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);
  async function save() {
    if (pw.length < 10) return setMsg('รหัสผ่านต้องยาวอย่างน้อย 10 ตัวอักษร');
    if (pw !== pw2) return setMsg('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
    if (error) setMsg(error.message); else window.location.href = '/';
  }
  return <main style={{ maxWidth: 380 }}><div className="card"><h1>ตั้งรหัสผ่าน</h1>
    {!ready ? <p className="mut">กำลังตรวจสอบลิงก์… ถ้าค้างอยู่ ลิงก์อาจหมดอายุ กรุณาขอลิงก์ใหม่จากหน้าเข้าสู่ระบบ</p> : <>
      <label>รหัสผ่านใหม่ (อย่างน้อย 10 ตัว)</label><input type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" />
      <label>ยืนยันรหัสผ่าน</label><input type="password" value={pw2} onChange={e => setPw2(e.target.value)} autoComplete="new-password" />
      <div style={{ marginTop: 14 }}><button onClick={save}>บันทึก</button></div></>}
    {msg && <p className="err">{msg}</p>}</div></main>;
}
