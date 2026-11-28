// After rebuilding dash.glb with model.py, render the matched static fallback.
// Uses the existing tool/browser Playwright installation and a loopback server.
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('../browser/node_modules/playwright-core');

const web = path.resolve(__dirname, '../../web');
const assets = new Set(['/dash/renderer.js', '/dash/behaviour.js', '/art/dash.glb']);

async function main() {
  const server = http.createServer(async (request, response) => {
    if (request.url === '/') {
      response.writeHead(200, {'content-type': 'text/html'});
      response.end('<canvas style="width:384px;height:384px"></canvas>');
      return;
    }
    if (!assets.has(request.url)) { response.writeHead(404).end(); return; }
    try {
      const file = await fs.readFile(path.join(web, request.url));
      response.setHeader('content-type', request.url.endsWith('.js') ? 'text/javascript' : 'model/gltf-binary');
      response.end(file);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: process.env.CHROME_BIN,
      args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
    });
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:' + server.address().port);
    const encoded = await page.evaluate(async () => {
      const { createRenderer } = await import('/dash/renderer.js');
      const source = document.querySelector('canvas');
      const model = await createRenderer(source);
      if (!model) throw Error('WebGL is required to render the model poster');
      model.render();
      const poster = document.createElement('canvas');
      poster.width = poster.height = 256;
      const ctx = poster.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, 0, 0, poster.width, poster.height);
      const data = poster.toDataURL('image/webp', .92);
      model.dispose();
      return data.split(',')[1];
    });
    const poster = Buffer.from(encoded, 'base64');
    if (poster.toString('ascii', 8, 12) !== 'WEBP') throw Error('WebP encoder unavailable');
    await fs.writeFile(path.join(web, 'art/dash.webp'), poster);
    console.log('Rendered Dash at 256 × 256 (' + poster.length + ' bytes)');
  } finally {
    await browser?.close();
    server.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
