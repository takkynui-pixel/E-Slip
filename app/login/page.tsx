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
    await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    setMsg('หากอีเมลนี้มีในระบบ จะได้รับลิงก์ตั้งรหัสผ่านใหม่ (ลองขอซ้ำได้หลัง 1 นาที)');
  }
  return <div className="auth"><div className="auth-box">
    <div className="auth-logo"><img src="/logo.png" alt="VTA Service" /></div>
    <div className="card"><h1>เข้าสู่ระบบสลิปเงินเดือน</h1><p className="mut" style={{ margin: 0 }}>ใช้อีเมลที่ลงทะเบียนไว้กับฝ่ายบุคคล</p>
      <label>อีเมล</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" />
      <label>รหัสผ่าน</label><input type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password" onKeyDown={e => e.key === 'Enter' && submit()} />
      <div className="row" style={{ marginTop: 20 }}><button disabled={busy} onClick={submit}>เข้าสู่ระบบ</button><button className="sec" onClick={reset}>ลืมรหัสผ่าน</button></div>
      {msg && <p className={msg.startsWith('อีเมลหรือ') ? 'err' : 'mut'} style={{ marginBottom: 0 }}>{msg}</p>}</div>
  </div></div>;
}
