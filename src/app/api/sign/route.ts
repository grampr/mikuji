import { createHmac, timingSafeEqual } from "node:crypto";

const secret = process.env.SIGNING_SECRET || "change-me";

const makeSig = (rank: string, score: string, seed: string) =>
  createHmac("sha256", secret)
    .update(`${rank}:${score}:${seed}`)
    .digest("hex");

export async function POST(request: Request) {
  try {
    const { rank, score, seed, sig } = await request.json();
    if (!rank || !score || seed === undefined) {
      return new Response(JSON.stringify({ error: "invalid payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const computed = makeSig(String(rank), String(score), String(seed));

    // Verify mode: if sig is provided, just check and return ok
    if (sig !== undefined) {
      const ok = timingSafeEqual(Buffer.from(computed), Buffer.from(String(sig)));
      if (!ok) {
        return new Response(JSON.stringify({ ok: false }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Sign mode
    return new Response(JSON.stringify({ sig: computed }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "bad request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Exported for server-side verification reuse
export const verifySig = (
  rank: string,
  score: string,
  seed: string,
  sig: string | null
) => {
  if (!sig) return false;
  const expected = Buffer.from(makeSig(rank, score, seed));
  const actual = Buffer.from(sig);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
