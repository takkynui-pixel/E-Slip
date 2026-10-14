'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';
export default function Login() {
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true); setMsg('');
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password: pw });
    if (error) { setMsg('อีเมลหรือรหัสผ่านไม่ถูกต้อง'); setBusy(false); } else window.location.href = '/';
  }
  async function reset() {
    if (!email) return setMsg('กรอกอีเมลก่อน');
    await supabaseBrowser().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/set-password` });
    setMsg('หากอีเมลนี้มีในระบบ จะได้รับลิงก์ตั้งรหัสผ่านใหม่');
  }
  return <main style={{ maxWidth: 380 }}><div className="card"><h1>เข้าสู่ระบบสลิปเงินเดือน</h1>
    <label>อีเมล</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" />
    <label>รหัสผ่าน</label><input type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password" onKeyDown={e => e.key === 'Enter' && submit()} />
    <div className="row" style={{ marginTop: 14 }}><button disabled={busy} onClick={submit}>เข้าสู่ระบบ</button><button className="sec" onClick={reset}>ลืมรหัสผ่าน</button></div>
    {msg && <p className="mut">{msg}</p>}</div></main>;
}
