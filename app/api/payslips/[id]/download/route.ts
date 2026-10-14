import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { currentUser, audit } from '@/lib/auth';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(); if (!user) return new NextResponse('unauthorized', { status: 401 });
  const { id } = await params;
  // ใช้ client ของผู้ใช้ => RLS ตัดสินว่าเห็นแถวนี้ได้หรือไม่ (พนักงานเห็นเฉพาะของตน/งวดที่เผยแพร่แล้ว)
  const sb = await supabaseServer();
  const { data } = await sb.from('payslips').select('pdf_path').eq('id', id).eq('pdf_status', 'done').maybeSingle();
  if (!data?.pdf_path) return new NextResponse('not found', { status: 404 });
  const signed = await admin().storage.from('payslips').createSignedUrl(data.pdf_path, 60);
  if (signed.error) return new NextResponse('error', { status: 500 });
  await audit(user.id, 'download', id);
  return NextResponse.redirect(signed.data.signedUrl, 302);
}
