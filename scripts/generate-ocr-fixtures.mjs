import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FIXTURES_DIR = path.resolve('test/fixtures/ocr');

if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

const fixtures = [
  { code: 'eng', font: "'Segoe UI', Arial, sans-serif", heading: 'UNIT 1: INTRODUCTION TO BIOLOGY', sub: 'General Concepts and Principles', rtl: false },
  { code: 'amh', font: "'Nyala', 'Abyssinica SIL', 'Kefa', sans-serif", heading: 'ምዕራፍ ፩ የሕዋስ ሳይንስ', sub: 'የመጀመሪያው ክፍል', rtl: false },
  { code: 'tir', font: "'Nyala', 'Abyssinica SIL', sans-serif", heading: 'ክፍሊ ፩ መእተዊ ባዮሎጂ', sub: 'ቀዳማይ ትምህርቲ', rtl: false },
  { code: 'ara', font: "'Traditional Arabic', 'Simplified Arabic', 'Segoe UI', sans-serif", heading: 'الوحدة الأولى علم الأحياء', sub: 'مقدمة عامة في الأحياء', rtl: true },
  { code: 'fra', font: "'Segoe UI', Arial, sans-serif", heading: 'CHAPITRE 1: BIOLOGIE CELLULAIRE', sub: 'Introduction et concepts fondamentaux', rtl: false },
  { code: 'spa', font: "'Segoe UI', Arial, sans-serif", heading: 'CAPITULO 1: INTRODUCCION A LA BIOLOGIA', sub: 'Conceptos fundamentales y celular', rtl: false },
  { code: 'swa', font: "'Segoe UI', Arial, sans-serif", heading: 'SURA YA 1: UTANGULIZI WA SAYANSI', sub: 'Dhana za msingi za kibaolojia', rtl: false },
  { code: 'hin', font: "'Nirmala UI', 'Mangal', sans-serif", heading: 'अध्याय 1 जीव विज्ञान का परिचय', sub: 'मूलभूत अवधारणाएं और सिद्धांत', rtl: false },
  { code: 'chi_sim', font: "'Microsoft YaHei', 'SimSun', sans-serif", heading: '第一单元 细胞生物学导论', sub: '基础概念与核心理论', rtl: false },
  { code: 'amh_eng', font: "'Nyala', 'Segoe UI', sans-serif", heading: 'ምዕራፍ ፩: Introduction to Biology', sub: 'Bilingual Course Syllabus', rtl: false },
  { code: 'ara_eng', font: "'Traditional Arabic', 'Segoe UI', sans-serif", heading: 'الوحدة الأولى: General Biology Course', sub: 'First Semester Foundation', rtl: false },
];

console.log(`Generating ${fixtures.length} multilingual OCR image fixtures using Microsoft Edge...`);

for (const f of fixtures) {
  const outPng = path.join(FIXTURES_DIR, `${f.code}.png`);
  const tempHtml = path.join(os.tmpdir(), `fixture_${f.code}_${Date.now()}.html`);
  const userDataDir = path.join(os.tmpdir(), `edge_iso_${f.code}_${Date.now()}`);

  const align = f.rtl ? 'right' : 'left';
  const dir = f.rtl ? 'rtl' : 'ltr';

  const html = `<!DOCTYPE html>
<html dir="${dir}">
<head>
<meta charset="utf-8">
<style>
  body {
    background: #ffffff;
    margin: 0;
    padding: 30px;
    font-family: ${f.font};
    text-align: ${align};
  }
  h1 {
    color: #000000;
    font-size: 36px;
    font-weight: bold;
    margin: 0 0 10px 0;
    letter-spacing: 0.5px;
  }
  p {
    color: #222222;
    font-size: 20px;
    margin: 0;
  }
</style>
</head>
<body>
  <h1>${f.heading}</h1>
  <p>${f.sub}</p>
</body>
</html>`;

  fs.writeFileSync(tempHtml, html, 'utf8');

  const args = [
    '--headless=new',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--window-size=800,220',
    `--screenshot=${outPng}`,
    `file:///${tempHtml.replace(/\\/g, '/')}`,
  ];

  const res = spawnSync(EDGE_PATH, args, { stdio: 'ignore', timeout: 15000 });

  // Cleanup temporary html and user-data-dir
  try { fs.unlinkSync(tempHtml); } catch {}
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}

  if (fs.existsSync(outPng)) {
    const size = fs.statSync(outPng).size;
    console.log(`  ✓ [${f.code}] Generated ${outPng} (${size} bytes)`);
  } else {
    console.error(`  ✗ [${f.code}] Failed to generate fixture: ${outPng}`);
    process.exit(1);
  }
}

console.log(`\nAll ${fixtures.length} fixture images successfully generated in ${FIXTURES_DIR}!`);

