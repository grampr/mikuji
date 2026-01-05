import fs from "node:fs";
import path from "node:path";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const contentType = "image/png";
export const size = { width: 1529, height: 768 };

const secret = process.env.SIGNING_SECRET || "change-me";
const makeSig = (rank: string, score: string, seed: string) =>
  createHmac("sha256", secret)
    .update(`${rank}:${score}:${seed}`)
    .digest("hex");

const verifySig = (
  rank: string,
  score: string,
  seed: string,
  sig: string | null
) => {
  if (!sig) return false;
  const expected = Buffer.from(makeSig(rank, score, seed));
  const actual = Buffer.from(sig);
  return (
    expected.length === actual.length && timingSafeEqual(expected, actual)
  );
};

const fallbackImage = async () => {
  const filePath = path.join(process.cwd(), "public", "og-result.png");
  const file = await fs.promises.readFile(filePath);
  return new Response(file, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};

const loadFont = async () => {
  const fontCandidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  ];
  for (const file of fontCandidates) {
    try {
      const data = await fs.promises.readFile(file);
      return data;
    } catch (err) {
      // try next candidate
    }
  }
  return null;
};

export default async function Image(req: NextRequest) {
  if (!req.url) {
    return fallbackImage();
  }

  const { searchParams } = new URL(req.url);
  const rank = searchParams.get("rank") ?? "大吉";
  const score = searchParams.get("score") ?? "92.3";
  const seed = searchParams.get("seed") ?? "0";
  const sig = searchParams.get("sig");

  if (!verifySig(rank, score, seed, sig)) {
    return fallbackImage();
  }

  const fontData = await loadFont();
  if (!fontData) {
    return fallbackImage();
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "linear-gradient(135deg, #f7f4ed 0%, #efe7d8 45%, #f7f4ed 100%)",
          color: "#1f2937",
          fontFamily: "WafuSerif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.08,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          }}
        />
        <div
          style={{
            width: "980px",
            height: "460px",
            borderWidth: "6px",
            borderStyle: "double",
            borderColor: "#7f1d1d",
            backgroundColor: "rgba(255,255,255,0.82)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            gap: "16px",
          }}
        >
          <div
            style={{
              fontSize: "18px",
              letterSpacing: "0.45em",
              color: "#b91c1c",
            }}
          >
            一撃必中・新春おみくじ 2026
          </div>
          <div
            style={{
              fontSize: "110px",
              lineHeight: 1,
              color: "#111827",
              fontFamily: "WafuSerif",
            }}
          >
            {rank}
          </div>
          <div style={{ fontSize: "22px", color: "#4b5563" }}>
            平均精度 {score}%
          </div>
          <div
            style={{
              position: "absolute",
              right: "28px",
              top: "28px",
              width: "140px",
              height: "140px",
              borderRadius: "999px",
              border: "5px solid rgba(185, 28, 28, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(185, 28, 28, 0.6)",
              fontSize: "26px",
              transform: "rotate(12deg)",
            }}
          >
            新春
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "WafuSerif",
          data: fontData,
          style: "normal",
        },
      ],
    }
  );
}
