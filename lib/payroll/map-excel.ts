// map-excel.js — อ่าน Excel ตามเทมเพลตบริษัท -> ออบเจ็กต์ข้อมูลสลิป + ตรวจยอด
// หมายเหตุ: ใช้ "ชื่อหัวคอลัมน์" เป็นหลัก ไม่ใช้ตำแหน่ง เพราะมีหัวซ้ำ (OT/ขาด/ลา/มาสาย/ออกก่อน อยู่ 2 ชุด)
// @ts-nocheck
import * as XLSX from 'xlsx';

// ชุดแรก (ตัวเงิน) = คอลัมน์ L..AZ , ชุดหลัง (เวลา/จำนวน) = คอลัมน์ BA..BM
// อ่านเป็น array แล้วอ้างด้วย index เพื่อแยกหัวซ้ำได้ถูกต้อง
const C = {
  empCode: 0, fullName: 1, dept: 3, empType: 7, position: 8,
  salary: 11, ot1: 12, ot15: 13, ot2: 14, ot3: 15,
  shift: 16, food: 17, foodOT: 18, special1: 19, leaveSpecial: 20, vacation: 21,
  sick: 22, consult: 23, temp: 24, commission: 25, phone: 26, transport: 27,
  housing: 28, diligence: 29, bonus: 30, otherIncome: 31,
  absentAmt: 32, leaveAmt: 33, lateAmt: 34, earlyAmt: 35,
  tax: 36, taxComp: 37, sso: 38, pvf: 39, advance: 40, overpaid: 41,
  otherDeduct: 42, legalExec: 43, studentLoan: 44, welfare: 45,
  net: 46, totalIncome: 50, totalDeduct: 51,
  workDays: 52, ot1H: 53, ot15H: 54, ot2H: 55, ot25H: 56, ot3H: 57, ot6H: 58,
  absentT: 59, leaveT: 60, lateT: 61, earlyT: 62, periodKey: 65,
};

const n = v => (typeof v === 'number' ? v : 0);
const sum = (r, keys) => keys.reduce((s, k) => s + n(r[C[k]]), 0);
const r2 = x => Math.round(x * 100) / 100;
const money = v => (v ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
const clean = v => { const s = (v ?? '').toString().trim(); return s === '- -' ? '-' : s; };
const hm = v => { const s = (v ?? '').toString().trim(); return /^0*:?0*$/.test(s) || s === '0:00' || s === '0:0' ? '' : s; };
const dayPart = v => (v ?? '').toString().split('-')[0].trim();            // '30 - 0 : 0' -> '30'
const dayTime = v => { const s = (v ?? '').toString().replace(/\s+/g, ''); return /^0-0:0$/.test(s) ? '' : s; };

// ----- ค่าที่ "ต้องให้บริษัทยืนยัน" : คอลัมน์ Excel ที่ไม่มีช่องตรงในสลิป -----
// ตอนนี้รวมเข้า "รายได้อื่นๆ"/"หักอื่นๆ" เพื่อให้ยอดรวมบนสลิปตรงกับ Excel เสมอ
const EXTRA_INCOME = ['foodOT', 'special1', 'leaveSpecial', 'vacation', 'sick', 'consult', 'temp', 'bonus', 'otherIncome'];
const EXTRA_DEDUCT = ['taxComp', 'pvf', 'overpaid', 'otherDeduct', 'legalExec', 'welfare'];

function mapRow(r, ctx, extraIdx = {}) {
  const ex = k => (extraIdx[k] === undefined ? null : r[extraIdx[k]]);
  const exv = n(ex('specialBonus')), inc2 = n(ex('incentive')), skl = n(ex('skills'));
  const income = {
    wage: n(r[C.salary]), ot1: n(r[C.ot1]), ot15: n(r[C.ot15]), ot2: n(r[C.ot2]), ot3: n(r[C.ot3]),
    shift: n(r[C.shift]), food: n(r[C.food]), diligence: n(r[C.diligence]),
    commission: n(r[C.commission]), phone: n(r[C.phone]), transport: n(r[C.transport]),
    housing: n(r[C.housing]), other: sum(r, EXTRA_INCOME),
    specialBonus: exv, incentive: inc2, skills: skl,   // ค่าวิชาชีพ / ค่าตัน / ค่าทักษะ (คอลัมน์ใหม่หลัง BN)
  };
  const deduct = {
    absent: n(r[C.absentAmt]), leave: n(r[C.leaveAmt]), late: n(r[C.lateAmt]), early: n(r[C.earlyAmt]),
    tax: n(r[C.tax]), sso: n(r[C.sso]), advance: n(r[C.advance]),
    other: sum(r, EXTRA_DEDUCT), studentLoan: n(r[C.studentLoan]),
  };
  const calcIncome = r2(Object.values(income).reduce((a, b) => a + b, 0));
  const calcDeduct = r2(Object.values(deduct).reduce((a, b) => a + b, 0));
  const errors = [];
  const extraSum = r2(exv + inc2 + skl);
  if (extraSum && calcIncome - extraSum === r2(n(r[C.totalIncome]))) errors.push('"รวมรายได้" ใน Excel ไม่รวมค่าวิชาชีพ/ค่าตัน/ค่าทักษะ — ต้องให้ Payroll ยืนยันว่าจะรวมหรือไม่');
  else if (calcIncome !== r2(n(r[C.totalIncome]))) errors.push(`รวมรายได้ไม่ตรง: คำนวณ ${calcIncome} / Excel ${r[C.totalIncome]}`);
  if (calcDeduct !== r2(n(r[C.totalDeduct]))) errors.push(`รวมรายหักไม่ตรง: คำนวณ ${calcDeduct} / Excel ${r[C.totalDeduct]}`);
  if (r2(n(r[C.totalIncome]) - n(r[C.totalDeduct])) !== r2(n(r[C.net]))) errors.push('สุทธิ ≠ รายได้ − รายหัก');
  if (n(r[C.ot25H]) || (r[C.ot25H] && hm(r[C.ot25H]))) errors.push('มี OT 2.5 แต่ Excel ไม่มีคอลัมน์ยอดเงิน OT 2.5');
  if (hm(r[C.ot6H])) errors.push('มี OT 6 แต่สลิปไม่มีแถว OT 6');

  const code = clean(r[C.empCode]);
  const emp = ctx.employees?.[code] || {};            // email / ธนาคาร / เลขบัญชี มาจากตารางพนักงาน ไม่ใช่ Excel งวด
  if (!emp.email) errors.push('ยังไม่มีอีเมลพนักงาน');

  const data = {
    empCode: code, fullName: clean(r[C.fullName]), dept: clean(r[C.dept]).replace(/^P\d+\s+/, ''),
    position: clean(r[C.position]), empType: clean(r[C.empType]),
    bankName: emp.bankName || '', bankAccount: emp.bankAccountMasked || '',
    payDate: ctx.payDate || '', period: ctx.periodLabel || String(r[C.periodKey]),
    wageAttendance: dayPart(r[C.workDays]), wageAmount: money(income.wage),
    ot1Hours: hm(r[C.ot1H]), ot1Amount: money(income.ot1),
    ot15Hours: hm(r[C.ot15H]), ot15Amount: money(income.ot15),
    ot2Hours: hm(r[C.ot2H]), ot2Amount: money(income.ot2),
    ot25Hours: hm(r[C.ot25H]), ot25Amount: '',
    ot3Hours: hm(r[C.ot3H]), ot3Amount: money(income.ot3),
    shiftAllowance: money(income.shift), foodAllowance: money(income.food), attendanceBonus: money(income.diligence),
    specialBonus: money(exv), incentive: money(inc2), skills: money(skl),
    commission: money(income.commission), phoneAllowance: money(income.phone),
    transportAllowance: money(income.transport), housingAllowance: money(income.housing),
    otherIncome: money(income.other),
    absentTime: dayTime(r[C.absentT]), absentAmount: money(deduct.absent),
    leaveTime: dayTime(r[C.leaveT]), leaveAmount: money(deduct.leave),
    lateTime: hm(r[C.lateT]), lateAmount: money(deduct.late),
    earlyTime: hm(r[C.earlyT]), earlyAmount: money(deduct.early),
    tax: money(deduct.tax), socialSecurity: money(deduct.sso), advance: money(deduct.advance),
    otherDeduct: money(deduct.other), studentLoan: money(deduct.studentLoan),
    totalIncome: money(n(r[C.totalIncome])), totalDeduct: money(n(r[C.totalDeduct])),
    ytdIncome: money(ctx.ytd?.[code]?.income), ytdTax: money(ctx.ytd?.[code]?.tax),
    ytdSocialSecurity: money(ctx.ytd?.[code]?.sso), ytdProvidentFund: money(ctx.ytd?.[code]?.pvf),
    netIncome: money(n(r[C.net])),
  };
  return { code, data, errors, periodKey: String(r[C.periodKey] ?? ''), amounts: { income: n(r[C.totalIncome]), deduct: n(r[C.totalDeduct]), net: n(r[C.net]), tax: n(r[C.tax]) + n(r[C.taxComp]), sso: n(r[C.sso]), pvf: n(r[C.pvf]) } };
}

export function readPayroll(buf, ctx = {}) {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const all = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null, raw: true });
  const head = all[0].map(h => (h ?? '').toString().trim());
  const extraIdx = {};
  const WANT = { specialBonus: 'ค่าวิชาชีพ', incentive: 'ค่าตัน', skills: 'ค่าทักษะ' };
  for (const [k, name] of Object.entries(WANT)) { const i = head.indexOf(name, 66); if (i >= 0) extraIdx[k] = i; }
  const rows = all.slice(1).filter(r => r[0]);
  const seen = new Set(); const out = [];
  for (const r of rows) {
    const m = mapRow(r, ctx, extraIdx);
    if (seen.has(m.code)) m.errors.push('รหัสพนักงานซ้ำในไฟล์');
    seen.add(m.code); out.push(m);
  }
  out.extraColumnsFound = Object.keys(extraIdx);
  return out;
}

