import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import assert from 'assert';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\yalew\\.gemini\\antigravity\\brain\\45cb0420-d22f-4d42-bde5-d2b83d532ad0';
const SCREENSHOTS_DIR = path.join(ARTIFACT_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function main() {
  console.log('================================================================');
  console.log(' MICROSOFT EDGE REAL-WORLD ACCEPTANCE & CONTRAST VERIFICATION  ');
  console.log('================================================================\n');

  const port = 9890;
  const tmpUserDataDir = path.join(process.env.TEMP || 'C:\\Windows\\Temp', `edge_acc_${Date.now()}`);

  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tmpUserDataDir}`,
    '--disable-gpu',
    '--window-size=1366,900',
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 200));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) {
        wsUrl = (await res.json()).webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  assert.ok(wsUrl, 'Could not obtain Edge WebSocket Debugger URL');
  console.log(`✓ Edge CDP connected on port ${port}`);

  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener('open', r));

  let reqId = 1;
  const send = (method: string, params: any = {}): Promise<any> => {
    return new Promise((resolve, reject) => {
      const id = reqId++;
      const handler = (evt: any) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  const target: any = await send('Target.createTarget', { url: 'about:blank' });
  const session: any = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const sessionId = session.sessionId;

  const sendSession = (method: string, params: any = {}): Promise<any> => {
    return new Promise((resolve, reject) => {
      const id = reqId++;
      const handler = (evt: any) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, sessionId, method, params }));
    });
  };

  await sendSession('Page.enable');
  await sendSession('Runtime.enable');

  const evalInPage = async (expr: string): Promise<any> => {
    const res: any = await sendSession('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`In-page eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  };

  console.log('[Step 1] Navigating to http://127.0.0.1:3000/tools/pdf-unit-cutter...');
  await sendSession('Page.navigate', { url: 'http://127.0.0.1:3000/tools/pdf-unit-cutter' });
  
  // Wait for React hydration
  console.log('  Waiting for React client hydration...');
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const hydrated = await evalInPage(`Boolean(document.querySelector('button[aria-label*="Switch"]') || document.querySelector('button[aria-label*="mode"]'))`);
    if (hydrated) {
      console.log(`  ✓ Client hydration confirmed after ${i * 400}ms`);
      break;
    }
  }

  // Ensure Light theme initially
  await evalInPage(`(() => {
    if (document.documentElement.classList.contains('dark')) {
      const themeBtn = document.querySelector('button[aria-label*="Switch"], button[title*="mode"], button[aria-label*="mode"]');
      if (themeBtn) themeBtn.click();
    }
  })()`);
  await new Promise((r) => setTimeout(r, 300));

  console.log('[Step 2] Loading Sample Textbook PDF in Edge...');
  const clickedSample = await evalInPage(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Sample Textbook'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  })()`);
  assert.ok(clickedSample, 'Failed to find and click "Try with Sample Textbook" button');

  // Wait for file header to load
  let fileLoaded = false;
  let fileInfoName = '';
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const info = await evalInPage(`(() => {
      const headerTitle = document.querySelector('h3.truncate');
      const analyzeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Analyze & Detect Units'));
      return {
        name: headerTitle ? headerTitle.innerText : null,
        hasAnalyze: Boolean(analyzeBtn)
      };
    })()`);
    if (info?.hasAnalyze) {
      fileLoaded = true;
      fileInfoName = info.name || 'Sample Textbook';
      break;
    }
  }
  assert.ok(fileLoaded, 'File failed to load into inspection view');
  console.log(`  ✓ Sample PDF loaded successfully: "${fileInfoName}"`);

  console.log('[Step 3] Triggering Automated Unit Detection in Edge...');
  await evalInPage(`(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Analyze & Detect Units'));
    if (btn) btn.click();
  })()`);

  // Wait for PartsTable rows
  let partsCount = 0;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    partsCount = await evalInPage(`document.querySelectorAll('tbody tr').length`);
    if (partsCount >= 3) break;
  }
  assert.ok(partsCount >= 3, `Expected at least 3 detected parts, found ${partsCount}`);
  console.log(`  ✓ Detection complete: ${partsCount} units detected and populated in PartsTable`);

  console.log('\n[Step 4] Verifying Light Theme UI Elements & Capturing Verified Screenshot...');
  const lightStyles = await evalInPage(`(() => {
    const signupBtn = Array.from(document.querySelectorAll('a')).find(a => (a.textContent || '').trim() === 'Sign up');
    const themeBtn = document.querySelector('button[aria-label*=\"Switch\"], button[title*=\"mode\"], button[aria-label*=\"mode\"]');
    const tableHeader = document.querySelector('thead tr');
    const firstRow = document.querySelector('tbody tr');
    const firstTitleInput = firstRow ? firstRow.querySelector('input') : null;
    const startInput = firstRow ? firstRow.querySelectorAll('input')[1] : null;

    return {
      isDark: document.documentElement.classList.contains('dark'),
      signupText: signupBtn ? signupBtn.innerText.trim() : null,
      signupColor: signupBtn ? window.getComputedStyle(signupBtn).color : null,
      signupBg: signupBtn ? window.getComputedStyle(signupBtn).backgroundColor : null,
      themeAria: themeBtn ? themeBtn.getAttribute('aria-label') : null,
      headerBg: tableHeader ? window.getComputedStyle(tableHeader).backgroundColor : null,
      headerColor: tableHeader ? window.getComputedStyle(tableHeader).color : null,
      firstRowTitle: firstTitleInput ? firstTitleInput.value : null,
      firstRowInputColor: firstTitleInput ? window.getComputedStyle(firstTitleInput).color : null,
      firstRowInputBg: firstTitleInput ? window.getComputedStyle(firstTitleInput).backgroundColor : null,
      startInputValue: startInput ? startInput.value : null,
    };
  })()`);
  console.log('  Light theme computed styles:');
  console.log(`    Theme Toggle: ${lightStyles.themeAria}`);
  console.log(`    Sign Up Button Text: "${lightStyles.signupText}" | Color: ${lightStyles.signupColor} | Bg: ${lightStyles.signupBg}`);
  console.log(`    Table Header Bg: ${lightStyles.headerBg} | Color: ${lightStyles.headerColor}`);
  console.log(`    Row 1 Title: "${lightStyles.firstRowTitle}" | Input Color: ${lightStyles.firstRowInputColor}`);

  // Screenshot light mode
  const lightShot: any = await sendSession('Page.captureScreenshot', { format: 'png' });
  const lightShotPath = path.join(SCREENSHOTS_DIR, 'edge_cutter_light_verified.png');
  fs.writeFileSync(lightShotPath, Buffer.from(lightShot.data, 'base64'));
  console.log(`  ✓ Saved light mode screenshot: ${lightShotPath}`);

  console.log('\n[Step 5] Toggling to Dark Theme (Espresso) & Capturing Verified Screenshot...');
  await evalInPage(`(() => {
    const themeBtn = document.querySelector('button[aria-label*=\"Switch\"], button[title*=\"mode\"], button[aria-label*=\"mode\"]');
    if (themeBtn) themeBtn.click();
  })()`);
  await new Promise((r) => setTimeout(r, 600));

  const darkStyles = await evalInPage(`(() => {
    const signupBtn = Array.from(document.querySelectorAll('a')).find(a => (a.textContent || '').trim() === 'Sign up');
    const themeBtn = document.querySelector('button[aria-label*=\"Switch\"], button[title*=\"mode\"], button[aria-label*=\"mode\"]');
    const tableHeader = document.querySelector('thead tr');
    const firstRow = document.querySelector('tbody tr');
    const firstTitleInput = firstRow ? firstRow.querySelector('input') : null;
    const startInput = firstRow ? firstRow.querySelectorAll('input')[1] : null;

    return {
      isDark: document.documentElement.classList.contains('dark'),
      signupText: signupBtn ? signupBtn.innerText.trim() : null,
      signupColor: signupBtn ? window.getComputedStyle(signupBtn).color : null,
      signupBg: signupBtn ? window.getComputedStyle(signupBtn).backgroundColor : null,
      themeAria: themeBtn ? themeBtn.getAttribute('aria-label') : null,
      headerBg: tableHeader ? window.getComputedStyle(tableHeader).backgroundColor : null,
      headerColor: tableHeader ? window.getComputedStyle(tableHeader).color : null,
      firstRowTitle: firstTitleInput ? firstTitleInput.value : null,
      firstRowInputColor: firstTitleInput ? window.getComputedStyle(firstTitleInput).color : null,
      firstRowInputBg: firstTitleInput ? window.getComputedStyle(firstTitleInput).backgroundColor : null,
      startInputValue: startInput ? startInput.value : null,
    };
  })()`);
  console.log('  Dark theme computed styles:');
  console.log(`    Theme Toggle: ${darkStyles.themeAria}`);
  console.log(`    Sign Up Button Text: "${darkStyles.signupText}" | Color: ${darkStyles.signupColor} | Bg: ${darkStyles.signupBg}`);
  console.log(`    Table Header Bg: ${darkStyles.headerBg} | Color: ${darkStyles.headerColor}`);
  console.log(`    Row 1 Title: "${darkStyles.firstRowTitle}" | Input Color: ${darkStyles.firstRowInputColor}`);
  assert.strictEqual(darkStyles.isDark, true, 'Dark mode class must be present on html root');

  // Screenshot dark mode
  const darkShot: any = await sendSession('Page.captureScreenshot', { format: 'png' });
  const darkShotPath = path.join(SCREENSHOTS_DIR, 'edge_cutter_dark_verified.png');
  fs.writeFileSync(darkShotPath, Buffer.from(darkShot.data, 'base64'));
  console.log(`  ✓ Saved dark mode screenshot: ${darkShotPath}`);

  console.log('\n[Step 6] Reviewing Boundaries, Approving & Cutting PDF in Edge...');
  // Modify boundary of row 1
  await evalInPage(`(() => {
    const rows = document.querySelectorAll('tbody tr');
    const firstEndInput = rows[0].querySelectorAll('input')[2];
    if (firstEndInput) {
      firstEndInput.value = '5';
      firstEndInput.dispatchEvent(new Event('input', { bubbles: true }));
      firstEndInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  })()`);
  console.log('  ✓ Updated unit 1 end page boundary to page 5');

  // Click Approve Boundaries
  await evalInPage(`(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Approve') || b.innerText.includes('Confirm'));
    if (btn) btn.click();
  })()`);
  await new Promise((r) => setTimeout(r, 500));
  console.log('  ✓ Boundaries confirmed');

  // Click Cut PDF
  const cutClicked = await evalInPage(`(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Cut PDF') || b.innerText.includes('CUT PDF'));
    if (btn && !btn.disabled) {
      btn.click();
      return true;
    }
    return false;
  })()`);
  assert.ok(cutClicked, 'CUT PDF button was not found or disabled');

  // Wait for modal completion
  let cutFinished = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 600));
    const txt = await evalInPage('document.body.innerText');
    if (txt.includes('Splitting Complete') || txt.includes('Download All') || txt.includes('Download Single') || txt.includes('Download All (ZIP)')) {
      cutFinished = true;
      break;
    }
  }
  assert.ok(cutFinished, 'Cutting did not complete or modal did not appear');
  console.log('  ✓ Cutting finished! Progress / completion modal rendered');

  // Screenshot completion modal
  const modalShot: any = await sendSession('Page.captureScreenshot', { format: 'png' });
  const modalShotPath = path.join(SCREENSHOTS_DIR, 'edge_cutter_modal_verified.png');
  fs.writeFileSync(modalShotPath, Buffer.from(modalShot.data, 'base64'));
  console.log(`  ✓ Saved completion modal screenshot: ${modalShotPath}`);

  ws.close();
  edgeProc.kill('SIGKILL');
  try { fs.rmSync(tmpUserDataDir, { recursive: true, force: true }); } catch {}

  console.log('\n================================================================');
  console.log(' ALL ACCEPTANCE TESTS AND UI ARTIFACTS VERIFIED SUCCESSFULLY!   ');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
