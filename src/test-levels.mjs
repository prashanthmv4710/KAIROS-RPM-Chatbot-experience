import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await page.goto('http://127.0.0.1:5175');
  await page.waitForTimeout(1000);

  // Click on the Received metric button to enter Level 2
  const receivedBtn = page.getByText('Received →');
  await receivedBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/level2_departments.png', fullPage: true });
  console.log('Saved Level 2');

  // Click on Bakery & Deli
  const bakeryBtn = page.getByRole('button', { name: /Bakery & Deli/ });
  await bakeryBtn.click();
  await page.waitForTimeout(500);

  // Click on Deep Manifest for Level 3
  const manifestBtn = page.getByText('Deep Manifest →').first();
  await manifestBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/level3_fixture.png', fullPage: true });
  console.log('Saved Level 3');

  await browser.close();
})();
