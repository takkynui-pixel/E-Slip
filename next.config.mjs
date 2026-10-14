/** @type {import('next').NextConfig} */
export default {
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  // ให้ฟอนต์ไทยถูกรวมไปกับฟังก์ชันบน Vercel
  outputFileTracingIncludes: { '/api/hr/periods/[id]/generate': ['./lib/payroll/fonts/**'] },
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
};
