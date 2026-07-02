// workers/rename-relay/index.ts
// Cloudflare Worker relay — proxies rename requests from the extension to Anthropic.
// The Anthropic API key is held in Cloudflare's secret binding only; it never ships
// in the extension bundle.

const SYSTEM_PROMPT = `You are a personal assistant organizing someone's Downloads folder.
Your job: give this file a clean, human name — the way a tidy person would label it in a filing cabinet.
You will receive the filename, MIME type, file size, download URL, and referrer page URL.
Use the URL and referrer as strong context clues — they often reveal what the file actually is
(e.g. a URL containing "chase.com/statements" tells you it's a bank statement even if the filename is gibberish).

Rules (follow all of them):
- Output ONLY valid JSON, no prose, no markdown, no explanation.
- "suggestedName": 2–4 plain English words, Title Case, spaces not underscores, NO extension.
  Strip ALL of the following from the original name before thinking: timestamps, dates, version
  numbers (v1, v2, 1.2.47), build tags (x86_64, release, setup), duplicate counters ((1), (2)),
  noise suffixes (FINAL, revised, updated, copy, draft, new), and any raw UUIDs or hash strings.
  What remains should answer "what IS this file?" not "when was it made or where did it come from?"
  Use the URL/referrer to add specificity — prefer "Chase Statement June" over just "Bank Statement"
  when the source domain makes it clear.
- "tag": one lowercase word — the category. Examples: invoice, receipt, statement, report, photo,
  video, installer, document, spreadsheet, notes, contract, export.
- "renameFormat": a reusable template for future files of the same pattern. Use only the slots
  {tag}, {date}, {index}. Keep it short. Example: "{tag} {date}" or "{tag} {index}".

Examples of good renames:
  report_20260630_143022_v2_FINAL.pdf  →  "Q2 Report"
  data_export_june_2026_v3_FINAL_revised.xlsx  →  "Sales Export"
  IMG_20260528_134521.jpg  →  "Downloaded Photo"
  setup_x86_64_1.2.47_release.exe  →  "App Installer"
  zoom_recording_2026_06_30T09_15_00.mp4  →  "Meeting Recording"
  document.docx  →  "Document" (or infer from MIME/context if possible)
  export (3).csv  →  "Data Export"

Return schema:
{
  "suggestedName": "string",
  "tag": "string",
  "renameFormat": "string"
}`;

export interface Env {
  ANTHROPIC_API_KEY: string;
  LICENSE_KEYS: KVNamespace;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Only POST is supported
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);

    // License key validation route
    if (url.pathname === '/validate-key') {
      try {
        const body = await request.json<{ key?: string }>();
        const key = typeof body.key === 'string' ? body.key.trim() : '';
        if (!key) {
          return new Response(JSON.stringify({ valid: false }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        const value = await env.LICENSE_KEYS.get(key);
        return new Response(JSON.stringify({ valid: value !== null }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      } catch {
        return new Response(JSON.stringify({ valid: false }), {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    try {
      const body = await request.json<{
        filename: string;
        mimeType: string;
        fileSize: number;
        url?: string;
        referrer?: string;
      }>();

      const contextLines = [
        `filename: ${body.filename}`,
        `mimeType: ${body.mimeType}`,
        `fileSize: ${body.fileSize}`,
        body.url ? `downloadUrl: ${body.url}` : '',
        body.referrer ? `referrerPage: ${body.referrer}` : '',
      ].filter(Boolean).join('\n');

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': env.ANTHROPIC_API_KEY,
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: contextLines,
            },
          ],
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        return new Response(JSON.stringify({ error: 'upstream_error', status: res.status, detail: errBody }), {
          status: 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const data = await res.json<{ content: Array<{ text: string }> }>();
      const text = data.content[0]?.text ?? '{}';

      // Extract first JSON object in case Claude adds preamble prose (Pitfall 3)
      const match = text.match(/\{[\s\S]*\}/);
      const jsonStr = match ? match[0] : '{}';

      return new Response(jsonStr, {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    } catch {
      return new Response(JSON.stringify({ error: 'worker_error' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },
} satisfies ExportedHandler<Env>;
