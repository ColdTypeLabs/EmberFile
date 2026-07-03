import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ugly machine-generated filenames → realistic content
const FILES = {
  'stmt_202506_checking_9823.pdf': {
    mime: 'application/pdf',
    content: '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF',
  },
  'data_export_Q2_2026_v3_FINAL_revised.csv': {
    mime: 'text/csv',
    content: 'Date,Revenue,Category\n2026-04-01,12400,SaaS\n2026-05-01,13800,SaaS\n2026-06-01,15200,SaaS\n',
  },
  'IMG_20260528_134521_HDR.jpg': {
    mime: 'image/jpeg',
    content: '\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xFF\xD9',
  },
  'essay_draft_v4_SUBMIT_this_one_FINAL.docx': {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    content: 'PK\x03\x04fake-docx',
  },
  'setup_x86_64_1.2.47_release_build9234.exe': {
    mime: 'application/octet-stream',
    content: 'MZ fake-exe',
  },
  'zoom_GMT20260630-091500_Recording_1920x1080.mp4': {
    mime: 'video/mp4',
    content: '\x00\x00\x00\x18ftypmp42',
  },
  'invoice_INV-2026-0847_adobe_00847.pdf': {
    mime: 'application/pdf',
    content: '%PDF-1.4\n%%EOF',
  },
  'q2_marketing_perf_20260630_export.xlsx': {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    content: 'PK\x03\x04fake-xlsx',
  },
};

const MIME_TO_EXT = {
  'application/pdf': '.pdf',
  'text/csv': '.csv',
  'image/jpeg': '.jpg',
};

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost:7777');

  // Serve the test page
  if (url.pathname === '/' || url.pathname === '/test-downloads.html') {
    const html = fs.readFileSync(path.join(__dirname, 'test-downloads.html'));
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  // Serve a download file
  if (url.pathname === '/download') {
    const name = url.searchParams.get('name');
    const file = FILES[name];
    if (!file) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, {
      'Content-Type': file.mime,
      'Content-Disposition': `attachment; filename="${name}"`,
      'Access-Control-Allow-Origin': '*',
    });
    res.end(file.content);
    return;
  }

  // Serve the download list as JSON for the page to use
  if (url.pathname === '/files') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(Object.keys(FILES)));
    return;
  }

  res.writeHead(404); res.end('not found');
}).listen(7777, () => console.log('Server ready at http://localhost:7777'));
