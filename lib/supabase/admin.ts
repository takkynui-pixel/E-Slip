import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
// service role: ใช้ฝั่งเซิร์ฟเวอร์เท่านั้น (ข้าม RLS) — ต้องเช็กสิทธิ์ผู้เรียกด้วย requireHr() ก่อนทุกครั้ง
let _c: SupabaseClient<any, 'public', any> | null = null;
export const admin = () =>
  (_c ??= createClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
