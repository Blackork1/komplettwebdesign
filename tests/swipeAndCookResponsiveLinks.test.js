import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import test from 'node:test';

import puppeteer from 'puppeteer';

const mobileViewport = Object.freeze({
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
});

test('lange Rechtstextlinks bleiben im mobilen Viewport', async () => {
  const css = await readFile(
    new URL('../public/swipeandcook-privacy.css', import.meta.url),
    'utf8',
  );
  const html = `<!doctype html>
    <html lang="de">
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>${css}</style>
      </head>
      <body>
        <main class="swipe-privacy-page">
          <div class="container swipe-privacy-content">
            <article class="swipe-privacy-article swipe-legal-article">
              <section>
                <p>
                  <a href="#">
                    https://www.komplettwebdesign.de/swipeandcook‑nutzungsbedingungen
                  </a>
                </p>
              </section>
            </article>
          </div>
        </main>
      </body>
    </html>`;
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'text/html; charset=utf-8');
    response.end(html);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport(mobileViewport);
    await page.goto(`http://127.0.0.1:${server.address().port}`);

    const layout = await page.evaluate(() => {
      const anchor = document.querySelector('.swipe-privacy-article a');
      return {
        viewportWidth: window.innerWidth,
        pageWidth: document.documentElement.scrollWidth,
        anchorRight: anchor.getBoundingClientRect().right,
      };
    });

    assert.ok(
      layout.pageWidth <= layout.viewportWidth,
      `Seitenbreite ${layout.pageWidth}px überschreitet ${layout.viewportWidth}px`,
    );
    assert.ok(
      layout.anchorRight <= layout.viewportWidth,
      `Link endet erst bei ${layout.anchorRight}px`,
    );
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    )));
  }
});
