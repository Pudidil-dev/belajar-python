'use strict';
// Opens index.html in headless Chromium: checks for errors, plays briefly,
// seeks, and screenshots the player.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 860 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForFunction(() => window.PHAGE && window.PHAGE.ready, null, { timeout: 30000 });
  await page.click('#play');
  await page.waitForTimeout(1500);
  const t1 = await page.textContent('#time');
  await page.click('#play');
  await page.evaluate(() => { const s = document.getElementById('scrub'); s.value = String(62.9 * 60); s.dispatchEvent(new Event('input')); s.dispatchEvent(new Event('change')); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: process.argv[2] || 'shot.png' });
  const t2 = await page.textContent('#time');
  console.log('time after play:', t1, '| after seek:', t2);
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await browser.close();
})();
