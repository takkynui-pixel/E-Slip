import puppeteer, { type Browser } from 'puppeteer-core';
export async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    const chromium = (await import('@sparticuz/chromium')).default;
    return puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
  }
  if (!process.env.CHROMIUM_PATH) throw new Error('ตั้งค่า CHROMIUM_PATH ในไฟล์ .env.local (เส้นทาง Chrome/Chromium ในเครื่อง)');
  return puppeteer.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox'] });
}
export async function htmlToPdf(browser: Browser, html: string): Promise<Uint8Array> {
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    return await page.pdf({ format: 'A4', landscape: true, printBackground: true, preferCSSPageSize: true });
  } finally { await page.close(); }
}
