// workers/rename-relay/index.ts
// Cloudflare Worker relay — proxies rename requests from the extension to Anthropic.
// The Anthropic API key is held in Cloudflare's secret binding only; it never ships
// in the extension bundle.

const SYSTEM_PROMPT = `You are a file rename assistant. Given a filename, MIME type, and file size,
return ONLY valid JSON with this exact schema:
{
  "suggestedName": "string — the specific new filename for this file, no extension",
  "tag": "string — short category label (e.g. invoice, receipt, screenshot, report)",
  "renameFormat": "string — reusable template using only {tag}, {date}, {index} slots"
}
Do not include any text outside the JSON object.`;

export interface Env {
  ANTHROPIC_API_KEY: string;
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

    try {
      const body = await request.json<{
        filename: string;
        mimeType: string;
        fileSize: number;
      }>();

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
              content: `filename: ${body.filename}\nmimeType: ${body.mimeType}\nfileSize: ${body.fileSize}`,
            },
          ],
        }),
      });

      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'upstream_error' }), {
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
