'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';
// รับลิงก์ /set-password?token_hash=...&type=invite|recovery จากอีเมลของระบบ (ผู้ใช้กดปุ่มยืนยันก่อน จึงใช้โทเคน)
// ยังรองรับลิงก์แบบเดิมของ Supabase (#access_token=...) ด้วย
export default function SetPassword() {
  const [step, setStep] = useState<'loading' | 'confirm' | 'form' | 'bad'>('loading');
  const [tok, setTok] = useState<{ th: string; type: 'invite' | 'recovery' } | null>(null);
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(location.search); const th = q.get('token_hash'); const type = q.get('type');
    if (th && (type === 'invite' || type === 'recovery')) { setTok({ th, type }); setStep('confirm'); return; }
    const sb = supabaseBrowser();
    sb.auth.getSession().then(({ data }) => setStep(data.session ? 'form' : 'bad'));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => { if (s) setStep('form'); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function confirm() {
    if (!tok) return; setBusy(true); setMsg('');
    const { error } = await supabaseBrowser().auth.verifyOtp({ token_hash: tok.th, type: tok.type });
    setBusy(false);
    if (error) { setStep('bad'); return; }
    history.replaceState(null, '', '/set-password');            // ลบโทเคนออกจาก URL
    setStep('form');
  }
  async function save() {
    if (pw.length < 10) return setMsg('รหัสผ่านต้องยาวอย่างน้อย 10 ตัวอักษร');
    if (pw !== pw2) return setMsg('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
    if (error) { setMsg(error.message); setBusy(false); } else window.location.href = '/';
  }
  return <div className="auth"><div className="auth-box"><div className="auth-logo"><img src="/logo.png" alt="VTA Service" /></div><div className="card"><h1>ตั้งรหัสผ่าน</h1>
    {step === 'loading' && <p className="mut">กำลังตรวจสอบ…</p>}
    {step === 'bad' && <p className="err">ลิงก์หมดอายุหรือถูกใช้ไปแล้ว กรุณากด "ลืมรหัสผ่าน" ที่<a href="/login">หน้าเข้าสู่ระบบ</a>เพื่อขอลิงก์ใหม่</p>}
    {step === 'confirm' && <><p className="mut">กดปุ่มด้านล่างเพื่อยืนยันลิงก์และตั้งรหัสผ่าน</p><button disabled={busy} onClick={confirm}>ดำเนินการต่อ</button></>}
    {step === 'form' && <>
      <label>รหัสผ่านใหม่ (อย่างน้อย 10 ตัว)</label><input type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" />
      <label>ยืนยันรหัสผ่าน</label><input type="password" value={pw2} onChange={e => setPw2(e.target.value)} autoComplete="new-password" />
      <div style={{ marginTop: 14 }}><button disabled={busy} onClick={save}>บันทึก</button></div></>}
    {msg && <p className="err">{msg}</p>}</div></div></div>;
}
