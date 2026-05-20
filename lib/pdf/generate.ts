import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export async function generatePdfBuffer(html: string) {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      margin: {
        bottom: "20mm",
        left: "18mm",
        right: "18mm",
        top: "20mm"
      },
      printBackground: true
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
