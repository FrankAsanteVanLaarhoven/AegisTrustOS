/**
 * Upstash Redis REST rate limiter (edge-safe fetch).
 * Env: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 */
export async function upstashRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Upstash env not configured");
  }

  const windowSec = Math.max(1, Math.ceil(input.windowMs / 1000));
  const redisKey = `aegis:rl:${input.key}`;

  // INCR + EXPIRE via pipeline
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["EXPIRE", redisKey, String(windowSec)],
      ["TTL", redisKey],
    ]),
  });

  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const data = (await res.json()) as { result: number }[];
  const count = Number(data?.[0]?.result ?? 0);
  const ttl = Number(data?.[2]?.result ?? windowSec);
  const resetAt = Date.now() + Math.max(ttl, 1) * 1000;
  return {
    ok: count <= input.limit,
    remaining: Math.max(0, input.limit - count),
    resetAt,
  };
}
