import fs from 'node:fs';
import path from 'node:path';
import { SLIP_TEMPLATE } from './template';
const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
let FONTS = '';
function fonts() {
  if (FONTS) return FONTS;
  const face = (w: number, s: string, range: string) => {
    const b = fs.readFileSync(path.join(process.cwd(), 'lib/payroll/fonts', `sarabun-${s}-normal.woff2`)).toString('base64');
    return `@font-face{font-family:'Sarabun';font-weight:${w};src:url(data:font/woff2;base64,${b}) format('woff2');unicode-range:${range}}`;
  };
  const TH = 'U+0E01-0E5B,U+200C-200D,U+25CC', LA = 'U+0000-00FF';
  return (FONTS = [face(400, 'thai-400', TH), face(700, 'thai-700', TH), face(400, 'latin-400', LA), face(700, 'latin-700', LA)].join('\n'));
}
export const renderSlip = (d: Record<string, any>) =>
  SLIP_TEMPLATE.replace('/*FONTS*/', fonts()).replace(/\{\{(\w+)\}\}/g, (_, k) => esc(d[k]));
