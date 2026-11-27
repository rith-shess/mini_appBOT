// Tiny Redis (Upstash) REST client. No npm packages needed.
// Vercel -> Storage -> Upstash Redis sets KV_REST_API_URL / KV_REST_API_TOKEN automatically.
const URL_ENV = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN_ENV = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export function storeConfigured() {
  return Boolean(URL_ENV && TOKEN_ENV);
}

export async function redis(command) {
  const res = await fetch(URL_ENV, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN_ENV}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}
