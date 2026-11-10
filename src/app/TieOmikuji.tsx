"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { X } from "lucide-react";

export type TieOmikujiData = {
  rank: string;
  rankColor: string;
  ticket: string;
  waka: string;
  translation: string;
  details: { label: string; value: string }[];
};

type Props = {
  data: TieOmikujiData;
  onClose: () => void;
};

type Phase =
  | "intro"
  | "fold0"
  | "fold1"
  | "fold2"
  | "hold"
  | "carry"
  | "snap"
  | "tie"
  | "tighten"
  | "done";

const CAPTIONS: Record<Phase, { title: string; hint?: string }> = {
  intro: { title: "梅の木の下で" },
  fold0: { title: "おみくじを折る", hint: "右端をつかんで左へ折る（1/3）" },
  fold1: { title: "おみくじを折る", hint: "もう一度、右端を左へ（2/3）" },
  fold2: { title: "おみくじを折る", hint: "さらに細く折る（3/3）" },
  hold: { title: "枝へ運ぶ" },
  carry: { title: "枝へ運ぶ", hint: "おみくじをつかんで、光っている枝の裏へ" },
  snap: { title: "枝へ運ぶ" },
  tie: { title: "枝に結ぶ", hint: "ぐるぐるドラッグして枝に巻き付ける" },
  tighten: { title: "枝に結ぶ" },
  done: { title: "結びました" },
};

const PAPER = "#fbf7ee";
const RED = "#b91c1c";

/* ================= 乱数 ================= */

const mulberry32 = (seed: number) => {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

/* ================= 札のテクスチャ ================= */

const TEX_W = 600;
const TEX_H = 1240;
const TEX_SCALE = 2;

const ROTATED_CHARS = new Set(["（", "）", "「", "」", "ー", "〜", "…"]);
const PUNCT_CHARS = new Set(["。", "、"]);

const drawVertical = (
  ctx: CanvasRenderingContext2D,
  text: string,
  xCenter: number,
  yTop: number,
  size: number,
  step = size * 1.08
) => {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let y = yTop + size / 2;
  for (const ch of text) {
    if (ROTATED_CHARS.has(ch)) {
      ctx.save();
      ctx.translate(xCenter, y);
      ctx.rotate(Math.PI / 2);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    } else if (PUNCT_CHARS.has(ch)) {
      ctx.fillText(ch, xCenter + size * 0.6, y - size * 0.55);
    } else {
      ctx.fillText(ch, xCenter, y);
    }
    y += step;
  }
};

// 和紙の繊維っぽいムラを重ねる
const drawFibers = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  count: number,
  seed: number
) => {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const len = 6 + rnd() * 26;
    const ang = rnd() * Math.PI;
    ctx.strokeStyle =
      rnd() > 0.5
        ? `rgba(120, 96, 60, ${0.03 + rnd() * 0.05})`
        : `rgba(255, 255, 255, ${0.1 + rnd() * 0.2})`;
    ctx.lineWidth = 0.5 + rnd() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(ang) * len * 0.5 + (rnd() - 0.5) * 6,
      y + Math.sin(ang) * len * 0.5 + (rnd() - 0.5) * 6,
      x + Math.cos(ang) * len,
      y + Math.sin(ang) * len
    );
    ctx.stroke();
  }
  ctx.restore();
};

const drawSlip = (
  data: TieOmikujiData,
  brush: string,
  mincho: string,
  faint = false
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = TEX_W * TEX_SCALE;
  canvas.height = TEX_H * TEX_SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(TEX_SCALE, TEX_SCALE);

  ctx.fillStyle = faint ? "#f6f0e1" : PAPER;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  // 裏面は印刷がうっすら透ける程度
  ctx.globalAlpha = faint ? 0.11 : 1;

  ctx.strokeStyle = RED;
  ctx.lineWidth = 5;
  ctx.strokeRect(16, 16, TEX_W - 32, TEX_H - 32);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(27, 27, TEX_W - 54, TEX_H - 54);

  ctx.fillStyle = RED;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `60px ${brush}`;
  ctx.fillText("御 神 籤", TEX_W / 2, 88);
  ctx.font = `17px ${mincho}`;
  ctx.textAlign = "left";
  ctx.fillText("令和八年", 44, 76);
  ctx.fillText("新春", 44, 100);
  ctx.textAlign = "right";
  ctx.fillText("一撃必中", TEX_W - 44, 76);
  ctx.fillText(`第${data.ticket}番`, TEX_W - 44, 100);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(40, 130);
  ctx.lineTo(TEX_W - 40, 130);
  ctx.stroke();

  const rankSize = 92;
  const rankChars = [...data.rank];
  const rankX = 478;
  const rankTop = 172;
  const boxH = rankChars.length * rankSize * 1.08 + 28;
  ctx.strokeStyle = data.rankColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(rankX - 64, rankTop - 16, 128, boxH);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(rankX - 56, rankTop - 8, 112, boxH - 16);
  ctx.fillStyle = data.rankColor;
  ctx.font = `${rankSize}px ${brush}`;
  drawVertical(ctx, data.rank, rankX, rankTop, rankSize);

  ctx.fillStyle = "#1f2937";
  ctx.font = `36px ${brush}`;
  const phrases = data.waka.split(/\s+/).filter(Boolean);
  phrases.forEach((phrase, i) => {
    const x = 356 - i * 58 - (i >= 3 ? 14 : 0);
    drawVertical(ctx, phrase, x, i >= 3 ? 228 : 176, 36, 40);
  });

  const dashed = (y: number) => {
    ctx.save();
    ctx.strokeStyle = RED;
    ctx.globalAlpha *= 0.55;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(TEX_W - 40, y);
    ctx.stroke();
    ctx.restore();
  };

  dashed(548);
  ctx.font = `bold 20px ${mincho}`;
  ctx.fillStyle = RED;
  drawVertical(ctx, "【解説】", 546, 566, 20, 22);
  ctx.font = `20px ${mincho}`;
  ctx.fillStyle = "#374151";
  const perCol = 10;
  let col = 0;
  let row = 4;
  let buf = "";
  const flush = () => {
    if (!buf) return;
    drawVertical(ctx, buf, 546 - col * 36, 566 + (col === 0 ? 4 : 0) * 22, 20, 22);
    buf = "";
  };
  for (const ch of data.translation) {
    buf += ch;
    row += 1;
    if (row >= perCol) {
      flush();
      col += 1;
      row = 0;
    }
  }
  flush();
  dashed(806);

  data.details.forEach((detail, i) => {
    const x = 540 - i * 53.3;
    ctx.fillStyle = RED;
    ctx.fillRect(x - 16, 824, 32, 56);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 20px ${mincho}`;
    drawVertical(ctx, detail.label, x, 830, 20, 24);
    ctx.fillStyle = "#1f2937";
    ctx.font = `18px ${mincho}`;
    drawVertical(ctx, detail.value, x, 894, 18, 19.5);
    if (i > 0) {
      ctx.save();
      ctx.strokeStyle = RED;
      ctx.globalAlpha *= 0.25;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 26.6, 824);
      ctx.lineTo(x + 26.6, TEX_H - 44);
      ctx.stroke();
      ctx.restore();
    }
  });

  ctx.globalAlpha = 1;
  drawFibers(ctx, TEX_W, TEX_H, 1400, faint ? 11 : 5);
  return canvas;
};

// 紙の凹凸（バンプ）用
const drawPaperBump = (): HTMLCanvasElement => {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  const rnd = mulberry32(21);
  ctx.lineCap = "round";
  for (let i = 0; i < 1800; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const len = 4 + rnd() * 22;
    const ang = rnd() * Math.PI;
    const v = Math.floor(96 + rnd() * 90);
    ctx.strokeStyle = `rgba(${v},${v},${v},0.45)`;
    ctx.lineWidth = 0.6 + rnd() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
  return canvas;
};

// 樹皮
const drawBark = (): HTMLCanvasElement => {
  const w = 256;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = "#4a372b";
  ctx.fillRect(0, 0, w, h);
  const rnd = mulberry32(99);
  // 縦に走る割れ目と筋
  for (let i = 0; i < 520; i++) {
    const x = rnd() * w;
    let y = rnd() * h;
    const len = 30 + rnd() * 160;
    const dark = rnd() > 0.42;
    ctx.strokeStyle = dark
      ? `rgba(22, 14, 10, ${0.25 + rnd() * 0.45})`
      : `rgba(150, 122, 96, ${0.08 + rnd() * 0.2})`;
    ctx.lineWidth = dark ? 1 + rnd() * 3.5 : 1 + rnd() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    let cx = x;
    const end = y + len;
    while (y < end) {
      y += 8 + rnd() * 10;
      cx += (rnd() - 0.5) * 5;
      ctx.lineTo(cx, y);
    }
    ctx.stroke();
  }
  // 横の節・ひび
  for (let i = 0; i < 90; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    ctx.strokeStyle = `rgba(18, 12, 8, ${0.2 + rnd() * 0.35})`;
    ctx.lineWidth = 1 + rnd() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 8 + rnd() * 26, y + (rnd() - 0.5) * 6);
    ctx.stroke();
  }
  // 苔
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(110, 128, 84, ${0.04 + rnd() * 0.07})`;
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, 2 + rnd() * 9, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
};

// 地面：土と苔の細かい模様（タイル状に繰り返す）
const drawGround = (): HTMLCanvasElement => {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = "#7c7355";
  ctx.fillRect(0, 0, size, size);
  const rnd = mulberry32(3);
  for (let i = 0; i < 26000; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const kind = rnd();
    ctx.fillStyle =
      kind > 0.6
        ? `rgba(84, 108, 62, ${0.12 + rnd() * 0.25})`
        : kind > 0.25
          ? `rgba(58, 46, 34, ${0.1 + rnd() * 0.2})`
          : `rgba(176, 158, 120, ${0.08 + rnd() * 0.16})`;
    const r = 0.6 + rnd() * 2.2;
    // 端をまたいでも模様がつながるように描く
    for (const ox of [0, size, -size]) {
      for (const oy of [0, size, -size]) {
        if (x + ox < -4 || x + ox > size + 4 || y + oy < -4 || y + oy > size + 4)
          continue;
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  return canvas;
};

// 地面の外側を空へなじませるための丸いぼかし
const drawGroundFade = (): HTMLCanvasElement => {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.3, "#ffffff");
  g.addColorStop(0.75, "#555555");
  g.addColorStop(1, "#000000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
};

/* ================= 紙：折りの変形 ================= */

const PAPER_W = 0.84;
const PAPER_H = (PAPER_W * TEX_H) / TEX_W;
const PAPER_XSEG = 168;
const PAPER_YSEG = 14;
// 折り目の位置と、折り目の丸み（重なる枚数が増えるほど大きくなる）
const FOLDS = [
  { c: PAPER_W / 2, rho: 0.0016 },
  { c: PAPER_W / 4, rho: 0.0042 },
  { c: PAPER_W / 8, rho: 0.0094 },
];
const STRIP_W = PAPER_W / 8;
const STRIP_TH = FOLDS[2].rho * 2;

const writePaper = (
  positions: Float32Array,
  thetas: number[],
  curl: number,
  time: number
) => {
  let o = 0;
  for (let iy = 0; iy <= PAPER_YSEG; iy++) {
    const vy = iy / PAPER_YSEG;
    const y = (vy - 0.5) * PAPER_H;
    const yn = vy * 2 - 1;
    for (let ix = 0; ix <= PAPER_XSEG; ix++) {
      const u = (ix / PAPER_XSEG) * PAPER_W;
      let x = u;
      let z = 0;
      for (let k = 0; k < FOLDS.length; k++) {
        const th = thetas[k];
        if (th <= 0) break;
        const { c, rho } = FOLDS[k];
        if (x > c) {
          const d = x - c;
          const arc = rho * th;
          if (d <= arc) {
            const phi = d / rho;
            x = c + (rho - z) * Math.sin(phi);
            z = rho - (rho - z) * Math.cos(phi);
          } else {
            const rem = d - arc;
            const nx = c + (rho - z) * Math.sin(th) + rem * Math.cos(th);
            z = rho - (rho - z) * Math.cos(th) + rem * Math.sin(th);
            x = nx;
          }
        }
      }
      // 持った紙の自然な反りと、かすかな揺れ
      z +=
        curl *
        (0.03 * yn * yn +
          0.006 * Math.sin(u * 7 + time * 1.3) * (0.4 + 0.6 * vy) +
          0.012 * ((u / PAPER_W - 0.5) * 2) ** 2);
      positions[o++] = x;
      positions[o++] = y;
      positions[o++] = z;
    }
  }
};

/* ================= 帯：枝に巻き付く形 ================= */

type RibbonParams = {
  length: number;
  width: number;
  thick: number;
  radius: number; // 枝の半径
  wrap: number; // 0→1（枝の裏から両側へ半周ずつ回して手前へ）
  spread: number; // 0→1 端を斜めに倒して結ぶ
};

const RIBBON_SEGMENTS = 180;
const TAIL_ANGLE = 0.85;

const createRibbonGeometry = () => {
  const geometry = new THREE.BufferGeometry();
  // 断面は長方形。面ごとに頂点を分けて、折った紙の角を立たせる
  const count = (RIBBON_SEGMENTS + 1) * 8;
  const positions = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const indices: number[] = [];
  for (let i = 0; i <= RIBBON_SEGMENTS; i++) {
    const v = i / RIBBON_SEGMENTS;
    // 表・裏（印刷が透ける面）、側面（紙の地）
    uvs.set(
      [0.25, v, 0.125, v, 0.25, v, 0.125, v, 0.01, v, 0.01, v, 0.01, v, 0.01, v],
      i * 16
    );
    if (i < RIBBON_SEGMENTS) {
      for (let f = 0; f < 4; f++) {
        const a = i * 8 + f * 2;
        const b = a + 8;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
};

const writeRibbon = (positions: Float32Array, params: RibbonParams) => {
  const { length, width, thick, radius, wrap, spread } = params;
  const r = radius + thick / 2;
  const A = wrap * Math.PI;
  const a = r * A;
  const pitch = width * 1.06;
  const beta = TAIL_ANGLE * spread;
  const hw = width / 2;
  const ht = thick / 2;

  for (let i = 0; i <= RIBBON_SEGMENTS; i++) {
    const s = (i / RIBBON_SEGMENTS - 0.5) * length;
    const u = s >= 0 ? 1 : -1;
    const m = Math.abs(s);

    let cx: number;
    let cy: number;
    let cz: number;
    let wx = 1;
    let wy = 0;
    let wz = 0;
    const nx = 0;
    let ny: number;
    let nz: number;

    if (m <= a) {
      // 枝の裏から、上と下をそれぞれ回って手前へ
      const psi = s / r;
      cx = (pitch * psi) / (Math.PI * 2);
      cy = r * Math.sin(psi);
      cz = -r * Math.cos(psi);
      ny = Math.sin(psi);
      nz = -Math.cos(psi);
    } else {
      const t = m - a;
      const psi = u * A;
      ny = Math.sin(psi);
      nz = -Math.cos(psi);
      // 巻き終わりから先へ伸びる向き
      const ty = u * Math.cos(psi);
      const tz = u * Math.sin(psi);
      const k = Math.min(t / 0.05, 1);
      const b = beta * k;
      const dx = -u * Math.sin(b);
      const dy = ty * Math.cos(b);
      const dz = tz * Math.cos(b);
      const lift = thick * (u > 0 ? 1.1 : 2.2) * spread * k;
      cx = (pitch * psi) / (Math.PI * 2) + dx * t + nx * lift;
      cy = r * Math.sin(psi) + dy * t + ny * lift;
      cz = -r * Math.cos(psi) + dz * t + nz * lift;
      wx = Math.cos(b);
      wy = u * Math.sin(b) * ty;
      wz = u * Math.sin(b) * tz;
    }

    const o = i * 24;
    const set = (idx: number, sw: number, sn: number) => {
      positions[o + idx * 3] = cx + wx * hw * sw + nx * ht * sn;
      positions[o + idx * 3 + 1] = cy + wy * hw * sw + ny * ht * sn;
      positions[o + idx * 3 + 2] = cz + wz * hw * sw + nz * ht * sn;
    };
    set(0, -1, 1); // 表
    set(1, 1, 1);
    set(2, 1, -1); // 裏
    set(3, -1, -1);
    set(4, 1, 1); // 右側面
    set(5, 1, -1);
    set(6, -1, -1); // 左側面
    set(7, -1, 1);
  }
};

/* ================= 補間 ================= */

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
const smooth = (v: number) => {
  const c = clamp(v, 0, 1);
  return c * c * (3 - 2 * c);
};
const damp = (dt: number, rate: number) => 1 - Math.exp(-dt * rate);

export default function TieOmikuji({ data, onClose }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);
  const autoRef = useRef(false);
  const skipRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let raf = 0;
    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(item: T): T => {
      disposables.push(item);
      return item;
    };

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      40,
      mount.clientWidth / mount.clientHeight,
      0.1,
      260
    );

    /* ----- 基準位置 ----- */
    const BY = 0; // 結ぶ枝の高さ
    const BRANCH_R = 0.09;
    const GY = BY - 8.6; // 地面
    const TRUNK_X = -5.6;
    const TRUNK_Z = -2.8;

    /* ----- 光 ----- */
    scene.add(new THREE.HemisphereLight(0xfff0dc, 0x9a8a90, 1.05));
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const sun = new THREE.DirectionalLight(0xffe6c8, 1.7);
    sun.position.set(4.5, BY + 6, 7);
    sun.target.position.set(0, BY - 0.6, 1);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -3.2;
    sun.shadow.camera.right = 3.2;
    sun.shadow.camera.top = 3;
    sun.shadow.camera.bottom = -3;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 24;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.006;
    scene.add(sun, sun.target);

    /* ================= 木 ================= */
    const rnd = mulberry32(20260101);
    const barkTex = track(new THREE.CanvasTexture(drawBark()));
    barkTex.colorSpace = THREE.SRGBColorSpace;
    barkTex.wrapS = barkTex.wrapT = THREE.RepeatWrapping;
    barkTex.anisotropy = maxAniso;
    const barkMat = track(
      new THREE.MeshStandardMaterial({
        map: barkTex,
        bumpMap: barkTex,
        bumpScale: 0.9,
        roughness: 1,
        color: 0xffffff,
      })
    );

    const tPos: number[] = [];
    const tNrm: number[] = [];
    const tUv: number[] = [];
    const tIdx: number[] = [];
    const RADIAL = 14;
    const blossoms: { p: THREE.Vector3; n: THREE.Vector3; s: number }[] = [];
    const buds: { p: THREE.Vector3; s: number }[] = [];

    // 太さの変わる枝を1本追加する
    const addLimb = (
      points: THREE.Vector3[],
      radiusAt: (t: number, p: THREE.Vector3) => number,
      flower = 0
    ) => {
      const curve = new THREE.CatmullRomCurve3(points);
      const len = curve.getLength();
      const segs = Math.max(6, Math.ceil(len / 0.16));
      const frames = curve.computeFrenetFrames(segs, false);
      const base = tPos.length / 3;
      const phase = rnd() * 10;
      const p = new THREE.Vector3();
      const dir = new THREE.Vector3();
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        curve.getPointAt(t, p);
        const r = radiusAt(t, p);
        const N = frames.normals[i];
        const B = frames.binormals[i];
        for (let j = 0; j <= RADIAL; j++) {
          const ang = (j / RADIAL) * Math.PI * 2;
          dir
            .copy(N)
            .multiplyScalar(Math.cos(ang))
            .addScaledVector(B, Math.sin(ang));
          // こぶ・うねり
          const wob =
            1 +
            0.06 * Math.sin(ang * 3 + t * len * 1.3 + phase) +
            0.03 * Math.sin(ang * 5 - t * len * 2.1 + phase * 2);
          const rr = r > 0.12 ? r * wob : r;
          tPos.push(p.x + dir.x * rr, p.y + dir.y * rr, p.z + dir.z * rr);
          tNrm.push(dir.x, dir.y, dir.z);
          tUv.push((j / RADIAL) * Math.max(1, Math.round(r * 5)), t * len * 0.35);
        }
      }
      const ring = RADIAL + 1;
      for (let i = 0; i < segs; i++) {
        for (let j = 0; j < RADIAL; j++) {
          const a0 = base + i * ring + j;
          const b0 = a0 + ring;
          tIdx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1);
        }
      }
      // 細い枝には花とつぼみ
      if (flower > 0) {
        const step = 0.17 / flower;
        const tangent = new THREE.Vector3();
        for (let d = 0.12; d < len; d += step * (0.6 + rnd() * 0.9)) {
          const t = d / len;
          curve.getPointAt(t, p);
          // 結ぶ場所のまわりは空けておく
          if (Math.abs(p.x) < 1.25 && Math.abs(p.y - BY) < 0.5 && Math.abs(p.z) < 0.6)
            continue;
          curve.getTangentAt(t, tangent);
          const side = new THREE.Vector3(rnd() - 0.5, rnd() - 0.2, rnd() - 0.5);
          side.addScaledVector(tangent, -side.dot(tangent)).normalize();
          const r = radiusAt(t, p);
          const pos = p.clone().addScaledVector(side, r + 0.01);
          if (blossoms.length < 2400 && rnd() > 0.24) {
            const n = side
              .clone()
              .add(new THREE.Vector3(0, 0.25, 0.45))
              .normalize();
            blossoms.push({ p: pos, n, s: 0.75 + rnd() * 0.6 });
          } else {
            buds.push({ p: pos, s: 0.7 + rnd() * 0.6 });
          }
        }
      }
      return curve;
    };

    // 枝を分岐させながら伸ばす
    const grow = (
      start: THREE.Vector3,
      dir: THREE.Vector3,
      len: number,
      r: number,
      depth: number
    ) => {
      const end = start.clone().addScaledVector(dir, len);
      const perp = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5);
      perp.addScaledVector(dir, -perp.dot(dir)).normalize();
      const bend = len * (0.08 + rnd() * 0.12);
      const m1 = start
        .clone()
        .lerp(end, 0.35)
        .addScaledVector(perp, bend);
      const m2 = start
        .clone()
        .lerp(end, 0.7)
        .addScaledVector(perp, -bend * 0.6);
      const r1 = r * 0.7;
      const flower = r < 0.13 ? (r < 0.06 ? 1.25 : 0.8) : 0;
      const curve = addLimb(
        [start, m1, m2, end],
        (t) => THREE.MathUtils.lerp(r, r1, t),
        flower
      );
      if (depth <= 0 || r1 < 0.02) return;

      const childCount = depth >= 5 ? 3 : rnd() > 0.35 ? 2 : 3;
      for (let i = 0; i < childCount; i++) {
        const axis = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5);
        axis.addScaledVector(dir, -axis.dot(dir)).normalize();
        const angle = 0.38 + rnd() * 0.55;
        const nd = dir.clone().applyAxisAngle(axis, angle);
        // 梅らしく、横に張りつつ上へ。手前（カメラ側）には伸びすぎない
        nd.y += depth >= 4 ? 0.12 : 0.3;
        nd.z -= 0.1;
        if (nd.z > 0.3) nd.z = 0.3;
        nd.normalize();
        grow(
          end.clone(),
          nd,
          len * (0.68 + rnd() * 0.2),
          r1 * (i === 0 ? 0.98 : 0.74 + rnd() * 0.16),
          depth - 1
        );
      }
      // 途中から出る徒長枝（まっすぐ上へ伸びる若枝）
      if (depth <= 3 && rnd() > 0.35) {
        const t = 0.3 + rnd() * 0.5;
        const p = curve.getPointAt(t);
        const nd = new THREE.Vector3(
          (rnd() - 0.5) * 0.5,
          1,
          (rnd() - 0.6) * 0.4
        ).normalize();
        grow(p, nd, len * (0.5 + rnd() * 0.3), Math.min(0.05, r * 0.4), 0);
      }
    };

    // 幹（根元は広がる）
    const trunkPts = [
      new THREE.Vector3(TRUNK_X, GY - 0.3, TRUNK_Z),
      new THREE.Vector3(TRUNK_X + 0.15, GY + 1.8, TRUNK_Z + 0.05),
      new THREE.Vector3(TRUNK_X - 0.25, GY + 3.6, TRUNK_Z - 0.15),
      new THREE.Vector3(TRUNK_X + 0.2, GY + 5.4, TRUNK_Z - 0.1),
    ];
    const trunkCurve = addLimb(trunkPts, (t) => {
      const flare = 1 + 1.1 * Math.exp(-t * 9);
      return THREE.MathUtils.lerp(0.95, 0.72, t) * flare;
    });
    const trunkTop = trunkPts[trunkPts.length - 1];
    // 主枝3本
    [
      { d: new THREE.Vector3(0.55, 0.8, -0.1), l: 4.6, r: 0.5 },
      { d: new THREE.Vector3(-0.6, 0.75, -0.25), l: 4.2, r: 0.46 },
      { d: new THREE.Vector3(0.05, 1, -0.45), l: 4.8, r: 0.52 },
    ].forEach(({ d, l, r }) => grow(trunkTop.clone(), d.normalize(), l, r, 5));

    // おみくじを結ぶ下枝：幹から手前へ張り出し、結ぶあたりはまっすぐ
    const boughStart = trunkCurve.getPointAt(0.72);
    const boughPts = [
      boughStart,
      new THREE.Vector3(-4.3, BY - 1.75, -1.75),
      new THREE.Vector3(-2.9, BY - 0.55, -0.6),
      new THREE.Vector3(-1.3, BY, 0),
      new THREE.Vector3(-0.45, BY, 0),
      new THREE.Vector3(0.45, BY, 0),
      new THREE.Vector3(1.3, BY, 0),
      new THREE.Vector3(2.7, BY + 0.28, -0.15),
      new THREE.Vector3(3.9, BY + 0.75, -0.45),
    ];
    const boughRadius = (p: THREE.Vector3) => {
      if (p.x < -1.3)
        return THREE.MathUtils.lerp(BRANCH_R, 0.4, smooth((-1.3 - p.x) / 3.6));
      if (p.x > 1.3)
        return THREE.MathUtils.lerp(BRANCH_R, 0.045, smooth((p.x - 1.3) / 2.6));
      return BRANCH_R;
    };
    const boughCurve = addLimb(boughPts, (_t, p) => boughRadius(p));
    // 枝の上で、指定した x に最も近い位置を探す
    const boughAtX = (x: number) => {
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i <= 400; i++) {
        const d = Math.abs(boughCurve.getPointAt(i / 400).x - x);
        if (d < bestD) {
          bestD = d;
          best = i / 400;
        }
      }
      return best;
    };
    // 下枝から出る小枝
    [
      { at: 0.4, d: new THREE.Vector3(-0.2, 1, -0.3), l: 1.5, r: 0.07, k: 2 },
      { at: 0.52, d: new THREE.Vector3(0.25, 1, -0.5), l: 1.2, r: 0.05, k: 1 },
      { at: 0.86, d: new THREE.Vector3(0.3, 1, -0.25), l: 1.3, r: 0.045, k: 1 },
      { at: 0.93, d: new THREE.Vector3(0.6, 0.7, 0.1), l: 1.0, r: 0.04, k: 1 },
      { at: 0.98, d: new THREE.Vector3(0.9, 0.5, -0.2), l: 1.1, r: 0.04, k: 1 },
      { at: 0.82, d: new THREE.Vector3(0.2, -0.9, -0.3), l: 0.8, r: 0.035, k: 0 },
      { at: 0.3, d: new THREE.Vector3(-0.3, 0.6, 0.6), l: 1.6, r: 0.09, k: 2 },
    ].forEach(({ at, d, l, r, k }) =>
      grow(boughCurve.getPointAt(at), d.normalize(), l, r, k)
    );
    // 反対側の下枝
    grow(
      trunkCurve.getPointAt(0.6),
      new THREE.Vector3(-0.8, 0.45, 0.15).normalize(),
      3.4,
      0.3,
      4
    );

    const treeGeo = track(new THREE.BufferGeometry());
    treeGeo.setAttribute("position", new THREE.Float32BufferAttribute(tPos, 3));
    treeGeo.setAttribute("normal", new THREE.Float32BufferAttribute(tNrm, 3));
    treeGeo.setAttribute("uv", new THREE.Float32BufferAttribute(tUv, 2));
    treeGeo.setIndex(tIdx);
    const tree = new THREE.Mesh(treeGeo, barkMat);
    tree.castShadow = true;
    tree.receiveShadow = true;
    scene.add(tree);

    /* ----- 梅の花（インスタンス） ----- */
    const petalParts: THREE.BufferGeometry[] = [];
    const paint = (source: THREE.BufferGeometry, c: THREE.Color) => {
      // 結合できるよう、すべてインデックスなしに揃える
      const g = source.index ? source.toNonIndexed() : source;
      if (g !== source) source.dispose();
      const n = g.attributes.position.count;
      const colors = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3);
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      return g;
    };
    for (let i = 0; i < 5; i++) {
      const petal = new THREE.SphereGeometry(0.05, 6, 3);
      petal.scale(1, 1, 0.28);
      petal.translate(0.052, 0, 0.012);
      petal.rotateY(-0.28);
      petal.rotateZ((i / 5) * Math.PI * 2);
      petalParts.push(paint(petal, new THREE.Color(1, 1, 1)));
    }
    const core = new THREE.SphereGeometry(0.02, 5, 3);
    core.translate(0, 0, 0.018);
    petalParts.push(paint(core, new THREE.Color(0xf3c94a).multiplyScalar(1.1)));
    for (let i = 0; i < 5; i++) {
      // しべ
      const stamen = new THREE.TetrahedronGeometry(0.008);
      const a = (i / 5) * Math.PI * 2 + 0.6;
      stamen.translate(Math.cos(a) * 0.03, Math.sin(a) * 0.03, 0.035);
      petalParts.push(paint(stamen, new THREE.Color(0xfff0b0)));
    }
    const blossomGeo = track(mergeGeometries(petalParts));
    petalParts.forEach((g) => g.dispose());
    const blossomMat = track(
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 })
    );
    const blossomMesh = new THREE.InstancedMesh(
      blossomGeo,
      blossomMat,
      blossoms.length
    );
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const zAxis = new THREE.Vector3(0, 0, 1);
    const sv = new THREE.Vector3();
    const pinks = [0xf7b7c8, 0xf19ab3, 0xfbd3dc, 0xe9799a, 0xfde8ec];
    const col = new THREE.Color();
    blossoms.forEach((b, i) => {
      q.setFromUnitVectors(zAxis, b.n);
      q.multiply(
        new THREE.Quaternion().setFromAxisAngle(zAxis, rnd() * Math.PI * 2)
      );
      m4.compose(b.p, q, sv.setScalar(b.s));
      blossomMesh.setMatrixAt(i, m4);
      blossomMesh.setColorAt(i, col.setHex(pinks[Math.floor(rnd() * pinks.length)]));
    });
    blossomMesh.instanceMatrix.needsUpdate = true;
    if (blossomMesh.instanceColor) blossomMesh.instanceColor.needsUpdate = true;
    blossomMesh.frustumCulled = false;
    scene.add(blossomMesh);

    const budGeo = track(new THREE.SphereGeometry(0.026, 6, 5));
    const budMat = track(
      new THREE.MeshStandardMaterial({ color: 0xd9577c, roughness: 0.7 })
    );
    const budMesh = new THREE.InstancedMesh(budGeo, budMat, buds.length);
    buds.forEach((b, i) => {
      m4.compose(b.p, q.identity(), sv.set(b.s, b.s * 1.25, b.s));
      budMesh.setMatrixAt(i, m4);
    });
    budMesh.instanceMatrix.needsUpdate = true;
    budMesh.frustumCulled = false;
    scene.add(budMesh);

    /* ----- 地面と散った花びら ----- */
    const groundTex = track(new THREE.CanvasTexture(drawGround()));
    groundTex.colorSpace = THREE.SRGBColorSpace;
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(26, 26);
    groundTex.anisotropy = maxAniso;
    const groundFade = track(new THREE.CanvasTexture(drawGroundFade()));
    const groundMat = track(
      new THREE.MeshStandardMaterial({
        map: groundTex,
        alphaMap: groundFade,
        transparent: true,
        roughness: 1,
        depthWrite: false,
      })
    );
    const ground = new THREE.Mesh(
      track(new THREE.CircleGeometry(60, 48)),
      groundMat
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(TRUNK_X + 3, GY, TRUNK_Z);
    ground.renderOrder = -2;
    scene.add(ground);

    // 木の根元の落ち影
    const shadeCanvas = document.createElement("canvas");
    shadeCanvas.width = shadeCanvas.height = 128;
    const sctx = shadeCanvas.getContext("2d");
    if (sctx) {
      const sg = sctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      sg.addColorStop(0, "rgba(30,22,26,0.55)");
      sg.addColorStop(1, "rgba(30,22,26,0)");
      sctx.fillStyle = sg;
      sctx.fillRect(0, 0, 128, 128);
    }
    const shadeTex = track(new THREE.CanvasTexture(shadeCanvas));
    const shade = new THREE.Mesh(
      track(new THREE.CircleGeometry(11, 32)),
      track(
        new THREE.MeshBasicMaterial({
          map: shadeTex,
          transparent: true,
          depthWrite: false,
        })
      )
    );
    shade.rotation.x = -Math.PI / 2;
    shade.position.set(TRUNK_X + 1.2, GY + 0.02, TRUNK_Z + 0.4);
    shade.renderOrder = -1;
    scene.add(shade);

    const petalGeo = track(new THREE.CircleGeometry(0.05, 6));
    const petalMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xf6bccb,
        side: THREE.DoubleSide,
        roughness: 0.8,
      })
    );
    const FALLEN = 420;
    const fallen = new THREE.InstancedMesh(petalGeo, petalMat, FALLEN);
    const e = new THREE.Euler();
    for (let i = 0; i < FALLEN; i++) {
      const a = rnd() * Math.PI * 2;
      const rr = Math.sqrt(rnd()) * 12;
      e.set(-Math.PI / 2 + (rnd() - 0.5) * 0.3, 0, rnd() * 6);
      m4.compose(
        sv.set(
          TRUNK_X + 1.5 + Math.cos(a) * rr,
          GY + 0.03,
          TRUNK_Z + 0.5 + Math.sin(a) * rr
        ),
        q.setFromEuler(e),
        new THREE.Vector3(1, 0.75, 1)
      );
      fallen.setMatrixAt(i, m4);
    }
    fallen.instanceMatrix.needsUpdate = true;
    fallen.frustumCulled = false;
    scene.add(fallen);

    // 舞う花びら
    const DRIFT = 46;
    const drift = new THREE.InstancedMesh(petalGeo, petalMat, DRIFT);
    drift.frustumCulled = false;
    const driftSeeds = Array.from({ length: DRIFT }, () => ({
      x: -7 + rnd() * 14,
      z: -5 + rnd() * 9,
      y: rnd(),
      sp: 0.25 + rnd() * 0.3,
      ph: rnd() * 10,
    }));
    scene.add(drift);

    /* ================= 紙の質感 ================= */
    const style = getComputedStyle(document.body);
    const brushFont = style.getPropertyValue("--font-brush").trim() || "serif";
    const minchoFont =
      style.getPropertyValue("--font-mincho").trim() || "serif";

    const slipTex = track(
      new THREE.CanvasTexture(drawSlip(data, brushFont, minchoFont))
    );
    const backTex = track(
      new THREE.CanvasTexture(drawSlip(data, brushFont, minchoFont, true))
    );
    [slipTex, backTex].forEach((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
    });
    const bumpTex = track(new THREE.CanvasTexture(drawPaperBump()));
    bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;
    bumpTex.repeat.set(3, 6);

    const allText =
      data.rank +
      data.waka +
      data.translation +
      data.ticket +
      data.details.map((d) => d.label + d.value).join("") +
      "御神籤令和八年新春一撃必中第番【解説】";
    Promise.all([
      document.fonts.load(`40px ${brushFont}`, allText),
      document.fonts.load(`20px ${minchoFont}`, allText),
    ])
      .then(() => {
        if (disposed) return;
        slipTex.image = drawSlip(data, brushFont, minchoFont);
        slipTex.needsUpdate = true;
        backTex.image = drawSlip(data, brushFont, minchoFont, true);
        backTex.needsUpdate = true;
      })
      .catch(() => {});

    const paperProps = {
      roughness: 0.93,
      metalness: 0,
      bumpMap: bumpTex,
      bumpScale: 0.6,
    };
    const frontMat = track(
      new THREE.MeshStandardMaterial({
        ...paperProps,
        map: slipTex,
        side: THREE.FrontSide,
      })
    );
    const backMat = track(
      new THREE.MeshStandardMaterial({
        ...paperProps,
        map: backTex,
        side: THREE.BackSide,
      })
    );
    const stripMat = track(
      new THREE.MeshStandardMaterial({
        ...paperProps,
        map: backTex,
        side: THREE.DoubleSide,
      })
    );

    /* ----- 引いた札（1枚の細かいメッシュ） ----- */
    const paperGeo = track(
      new THREE.PlaneGeometry(PAPER_W, PAPER_H, PAPER_XSEG, PAPER_YSEG)
    );
    // PlaneGeometry は上の行から並ぶので、下からの並びに合わせて UV を付け直す
    {
      const uv = paperGeo.attributes.uv;
      let k = 0;
      for (let iy = 0; iy <= PAPER_YSEG; iy++) {
        for (let ix = 0; ix <= PAPER_XSEG; ix++) {
          uv.setXY(k++, ix / PAPER_XSEG, iy / PAPER_YSEG);
        }
      }
      // 行の順が逆になるので面の向きを反転
      const index = paperGeo.index;
      if (index) {
        const arr = index.array as Uint16Array | Uint32Array;
        for (let i = 0; i < arr.length; i += 3) {
          const tmpI = arr[i + 1];
          arr[i + 1] = arr[i + 2];
          arr[i + 2] = tmpI;
        }
      }
    }
    const paperPositions = paperGeo.attributes.position.array as Float32Array;
    const paperGroup = new THREE.Group();
    const paperFront = new THREE.Mesh(paperGeo, frontMat);
    const paperBack = new THREE.Mesh(paperGeo, backMat);
    paperFront.castShadow = true;
    paperFront.receiveShadow = true;
    paperBack.receiveShadow = true;
    paperFront.frustumCulled = false;
    paperBack.frustumCulled = false;
    paperGroup.add(paperFront, paperBack);
    paperGroup.visible = false;
    scene.add(paperGroup);

    /* ----- 折った後の帯 ----- */
    const ribbonGroup = new THREE.Group();
    const ribbonGeo = track(createRibbonGeometry());
    const ribbonPositions = ribbonGeo.attributes.position.array as Float32Array;
    const ribbon = new THREE.Mesh(ribbonGeo, stripMat);
    ribbon.castShadow = true;
    ribbon.receiveShadow = true;
    ribbon.frustumCulled = false;
    ribbonGroup.add(ribbon);
    const knotGeo = track(new THREE.BoxGeometry(0.17, 0.105, 0.02));
    const knotMat = track(
      new THREE.MeshStandardMaterial({
        ...paperProps,
        color: 0xf7f1e3,
      })
    );
    const myKnot = new THREE.Mesh(knotGeo, knotMat);
    myKnot.castShadow = true;
    myKnot.position.set(0, 0, BRANCH_R + STRIP_TH * 3.4);
    myKnot.rotation.z = -0.72;
    myKnot.visible = false;
    ribbonGroup.add(myKnot);
    ribbonGroup.visible = false;
    scene.add(ribbonGroup);

    /* ----- 先に結ばれているおみくじ ----- */
    const xAxis = new THREE.Vector3(1, 0, 0);
    const otherMat = track(
      new THREE.MeshStandardMaterial({
        ...paperProps,
        color: 0xf8f3e8,
        side: THREE.DoubleSide,
      })
    );
    [-1.15, -0.85, 0.8, 1.08, 1.55, 1.95, -1.7].forEach((x, i) => {
      const at = boughAtX(x);
      const group = new THREE.Group();
      const geometry = track(createRibbonGeometry());
      const p = boughCurve.getPointAt(at);
      const localR = boughRadius(p) + 0.004;
      writeRibbon(geometry.attributes.position.array as Float32Array, {
        length: 1.05 + ((i * 37) % 10) / 40 + (localR - BRANCH_R) * 6,
        width: STRIP_W,
        thick: STRIP_TH,
        radius: localR,
        wrap: 1,
        spread: 1,
      });
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, otherMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      const knot = new THREE.Mesh(knotGeo, knotMat);
      knot.position.set(0, 0, localR + STRIP_TH * 3.4);
      knot.rotation.z = -0.72;
      group.add(knot);
      group.position.copy(p);
      group.quaternion.setFromUnitVectors(
        xAxis,
        boughCurve.getTangentAt(at).normalize()
      );
      group.rotateX(((i % 3) - 1) * 0.5 + 0.15);
      if (i % 2) group.scale.x = -1;
      scene.add(group);
    });

    // 結ぶ場所の目印
    const markerMat = track(
      new THREE.MeshBasicMaterial({
        color: 0xffe08a,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );
    const marker = new THREE.Mesh(
      track(new THREE.TorusGeometry(BRANCH_R + 0.05, 0.012, 8, 40)),
      markerMat
    );
    marker.rotation.y = Math.PI / 2;
    marker.position.set(0, BY, 0);
    scene.add(marker);

    /* ================= 進行 ================= */
    const R_EFF = BRANCH_R + STRIP_TH / 2;
    const foldPos = new THREE.Vector3(0, BY - 1.2, 2.4);
    const holdPos = new THREE.Vector3(0.85, BY - 0.95, 0);
    const tiePos = new THREE.Vector3(0, BY, 0);

    const cams: Record<string, { p: THREE.Vector3; l: THREE.Vector3 }> = {
      wide: {
        p: new THREE.Vector3(3.5, BY - 2.2, 27),
        l: new THREE.Vector3(-3.2, BY + 2.2, -2),
      },
      fold: {
        p: new THREE.Vector3(0, BY - 1.2, 5.7),
        l: new THREE.Vector3(0, BY - 1.2, 0),
      },
      carry: {
        p: new THREE.Vector3(0.35, BY - 0.35, 3.5),
        l: new THREE.Vector3(0.1, BY - 0.4, 0),
      },
      tie: {
        p: new THREE.Vector3(0.5, BY + 0.08, 2.5),
        l: new THREE.Vector3(0, BY, 0),
      },
      close: {
        p: new THREE.Vector3(0.9, BY + 0.25, 3.1),
        l: new THREE.Vector3(0, BY + 0.02, 0),
      },
    };
    const camPos = cams.wide.p.clone();
    const camLook = cams.wide.l.clone();

    let phaseNow: Phase = "intro";
    let phaseTime = 0;
    let time = 0;
    const thetas = [0, 0, 0];
    let dragging = false;
    let foldTarget = 0;
    let wrap = 0;
    let spread = 0;
    let tilt = 0;
    const grabOffset = new THREE.Vector3();
    const stripPos = holdPos.clone();
    const holdFrom = new THREE.Vector3();
    let lastX = 0;
    let lastY = 0;
    const pointerNdc = new THREE.Vector2(0, 0);
    autoRef.current = false;
    skipRef.current = false;

    const goto = (next: Phase) => {
      phaseNow = next;
      phaseTime = 0;
      dragging = false;
      autoRef.current = false;
      setPhase(next);
    };

    /* ----- ポインタ操作 ----- */
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane();
    const hit = new THREE.Vector3();
    const zNormal = new THREE.Vector3(0, 0, 1);
    const rayAtZ = (ev: PointerEvent, z: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(pointerNdc, camera);
      plane.set(zNormal, -z);
      return raycaster.ray.intersectPlane(plane, hit);
    };
    const foldIndex = () =>
      phaseNow === "fold0" ? 0 : phaseNow === "fold1" ? 1 : phaseNow === "fold2" ? 2 : -1;
    const foldAngleFromPointer = (ev: PointerEvent, k: number) => {
      if (!rayAtZ(ev, paperGroup.position.z)) return null;
      const px = hit.x - paperGroup.position.x;
      const { c } = FOLDS[k];
      return { px, theta: Math.acos(clamp((px - c) / c, -1, 1)) };
    };

    const onDown = (ev: PointerEvent) => {
      const k = foldIndex();
      if (k >= 0) {
        const res = foldAngleFromPointer(ev, k);
        if (!res) return;
        const inY = Math.abs(hit.y - paperGroup.position.y) < PAPER_H / 2 + 0.15;
        // 折り返す側（右半分）をつかんだときだけ
        if (inY && res.px > FOLDS[k].c * 0.75 && res.px < FOLDS[k].c * 2 + 0.25) {
          dragging = true;
          autoRef.current = false;
          foldTarget = res.theta;
          renderer.domElement.setPointerCapture(ev.pointerId);
        }
      } else if (phaseNow === "carry") {
        if (!rayAtZ(ev, -R_EFF)) return;
        if (
          Math.abs(hit.x - stripPos.x) < 0.3 &&
          Math.abs(hit.y - stripPos.y) < PAPER_H / 2 + 0.1
        ) {
          dragging = true;
          autoRef.current = false;
          grabOffset.set(stripPos.x - hit.x, stripPos.y - hit.y, 0);
          renderer.domElement.setPointerCapture(ev.pointerId);
        }
      } else if (phaseNow === "tie") {
        dragging = true;
        lastX = ev.clientX;
        lastY = ev.clientY;
        renderer.domElement.setPointerCapture(ev.pointerId);
      }
    };
    const onMove = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1
      );
      if (!dragging) return;
      const k = foldIndex();
      if (k >= 0) {
        const res = foldAngleFromPointer(ev, k);
        if (res) foldTarget = res.theta;
      } else if (phaseNow === "carry") {
        if (rayAtZ(ev, -R_EFF)) {
          stripPos.set(
            clamp(hit.x + grabOffset.x, -1.6, 1.6),
            clamp(hit.y + grabOffset.y, BY - 1.5, BY + 0.5),
            0
          );
        }
      } else if (phaseNow === "tie") {
        const d = Math.hypot(ev.clientX - lastX, ev.clientY - lastY);
        lastX = ev.clientX;
        lastY = ev.clientY;
        wrap = Math.min(1, wrap + d / 900);
      }
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      const k = foldIndex();
      if (k >= 0) {
        foldTarget = thetas[k] > Math.PI * 0.45 ? Math.PI : 0;
      } else if (phaseNow === "carry") {
        if (stripPos.distanceTo(tiePos) < 0.45) goto("snap");
      }
    };
    const canvasEl = renderer.domElement;
    canvasEl.style.touchAction = "none";
    canvasEl.addEventListener("pointerdown", onDown);
    canvasEl.addEventListener("pointermove", onMove);
    canvasEl.addEventListener("pointerup", onUp);
    canvasEl.addEventListener("pointercancel", onUp);

    /* ----- ループ ----- */
    const proj = new THREE.Vector3();
    const anchor = new THREE.Vector3();
    const tmpV = new THREE.Vector3();
    let last: number | null = null;
    let paperDirty = true;

    const frame = (now: number) => {
      if (disposed) return;
      const dt = last === null ? 0 : Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;
      phaseTime += dt;

      if (skipRef.current && phaseNow !== "done") {
        thetas[0] = thetas[1] = thetas[2] = Math.PI;
        stripPos.copy(tiePos);
        wrap = 1;
        spread = 1;
        camPos.copy(cams.close.p);
        camLook.copy(cams.close.l);
        goto("done");
      }
      skipRef.current = false;

      const k = foldIndex();
      const cur = thetas.slice();

      if (phaseNow === "intro") {
        if (phaseTime > 2.6) goto("fold0");
      } else if (k >= 0) {
        if (autoRef.current) foldTarget = Math.PI;
        const rate = dragging ? 22 : autoRef.current ? 3.2 : 9;
        thetas[k] += (foldTarget - thetas[k]) * damp(dt, rate);
        if (!dragging && foldTarget === Math.PI && Math.PI - thetas[k] < 0.02) {
          thetas[k] = Math.PI;
          foldTarget = 0;
          if (k < 2) {
            goto(k === 0 ? "fold1" : "fold2");
          } else {
            holdFrom.set(
              paperGroup.position.x + STRIP_W / 2,
              paperGroup.position.y,
              paperGroup.position.z + STRIP_TH / 2 + R_EFF
            );
            goto("hold");
          }
        }
      } else if (phaseNow === "hold") {
        const t = smooth(phaseTime / 1.3);
        tmpV.lerpVectors(holdFrom, holdPos, t);
        stripPos.copy(tmpV);
        if (phaseTime > 1.35) {
          stripPos.copy(holdPos);
          goto("carry");
        }
      } else if (phaseNow === "carry") {
        if (autoRef.current) {
          stripPos.lerp(tiePos, damp(dt, 3));
          if (stripPos.distanceTo(tiePos) < 0.3) goto("snap");
        }
      } else if (phaseNow === "snap") {
        stripPos.lerp(tiePos, damp(dt, 10));
        if (phaseTime > 0.55) {
          stripPos.copy(tiePos);
          goto("tie");
        }
      } else if (phaseNow === "tie") {
        if (autoRef.current) wrap = Math.min(1, wrap + dt / 2.2);
        if (wrap >= 1) goto("tighten");
      } else if (phaseNow === "tighten") {
        spread = smooth(phaseTime / 0.9);
        if (phaseTime > 1.3) goto("done");
      }

      /* 紙 */
      const folded =
        phaseNow !== "intro" && k < 0; // 3回折り終えたら帯に切り替える
      paperGroup.visible = !folded && (phaseNow !== "intro" || phaseTime > 1.3);
      ribbonGroup.visible = folded;

      if (!folded) {
        const p0 = smooth(thetas[0] / Math.PI);
        const p1 = smooth(thetas[1] / Math.PI);
        const p2 = smooth(thetas[2] / Math.PI);
        const centerX =
          PAPER_W / 2 -
          (PAPER_W / 4) * p0 -
          (PAPER_W / 8) * p1 -
          (PAPER_W / 16) * p2;
        const rise = phaseNow === "intro" ? smooth((phaseTime - 1.3) / 1.2) : 1;
        const curl = (1 - 0.85 * p0) * (1 - 0.6 * p2);
        if (
          paperDirty ||
          cur[0] !== thetas[0] ||
          cur[1] !== thetas[1] ||
          cur[2] !== thetas[2] ||
          curl > 0.05
        ) {
          writePaper(paperPositions, thetas, curl, time);
          paperGeo.attributes.position.needsUpdate = true;
          paperGeo.computeVertexNormals();
          paperDirty = false;
        }
        // 指の方へ少し傾く
        const tiltGoal = dragging ? 0 : 1 - p2;
        tilt += (tiltGoal - tilt) * damp(dt, 5);
        paperGroup.position.set(
          foldPos.x - centerX,
          foldPos.y - (1 - rise) * 1.4 + Math.sin(time * 1.2) * 0.008,
          foldPos.z
        );
        // 紙の中心まわりで傾ける
        paperGroup.rotation.set(
          (-pointerNdc.y * 0.1 - (1 - rise) * 0.5) * tilt,
          pointerNdc.x * 0.14 * tilt,
          0
        );
      } else {
        ribbonGroup.position.copy(stripPos);
        writeRibbon(ribbonPositions, {
          length: PAPER_H,
          width: STRIP_W,
          thick: STRIP_TH,
          radius: BRANCH_R,
          wrap,
          spread,
        });
        ribbonGeo.attributes.position.needsUpdate = true;
        ribbonGeo.computeVertexNormals();
        const knotScale = smooth((spread - 0.35) / 0.65);
        myKnot.visible = knotScale > 0.01;
        myKnot.scale.setScalar(Math.max(knotScale, 0.001));
        // 持っている間はわずかに揺れる
        ribbonGroup.rotation.z =
          phaseNow === "carry" || phaseNow === "hold"
            ? Math.sin(time * 1.6) * 0.025
            : 0;
      }

      /* 目印 */
      const nearTarget = stripPos.distanceTo(tiePos) < 0.45;
      const markerGoal =
        phaseNow === "carry" ? (nearTarget ? 1 : 0.45 + Math.sin(time * 4) * 0.25) : 0;
      markerMat.opacity += (markerGoal - markerMat.opacity) * damp(dt, 8);
      marker.scale.setScalar(1 + Math.sin(time * 4) * 0.06);

      /* 舞う花びら */
      for (let i = 0; i < DRIFT; i++) {
        const s = driftSeeds[i];
        const fall = (s.y + time * s.sp * 0.07) % 1;
        e.set(time * (0.6 + s.sp) + s.ph, time * 0.8 + s.ph, s.ph);
        m4.compose(
          sv.set(
            s.x + Math.sin(time * 0.5 + s.ph) * 0.6,
            BY + 5 - fall * 12,
            s.z + Math.cos(time * 0.4 + s.ph) * 0.4
          ),
          q.setFromEuler(e),
          tmpV.set(0.9, 0.7, 0.9)
        );
        drift.setMatrixAt(i, m4);
      }
      drift.instanceMatrix.needsUpdate = true;

      /* カメラ */
      let shot = cams.fold;
      if (phaseNow === "intro") shot = phaseTime < 1.1 ? cams.wide : cams.fold;
      else if (phaseNow === "hold" || phaseNow === "carry" || phaseNow === "snap")
        shot = cams.carry;
      else if (phaseNow === "tie" || phaseNow === "tighten") shot = cams.tie;
      else if (phaseNow === "done") shot = cams.close;
      if (phaseNow === "done") {
        // 結び目を見せたあと、ゆっくり引いて木全体へ
        const pull = smooth((phaseTime - 1.6) / 7);
        tmpV.lerpVectors(cams.close.p, cams.wide.p, pull);
        camPos.lerp(tmpV, damp(dt, 2.2));
        tmpV.lerpVectors(cams.close.l, cams.wide.l, pull);
        camLook.lerp(tmpV, damp(dt, 2.2));
      } else {
        const rate = phaseNow === "intro" ? 1.5 : 2.4;
        camPos.lerp(shot.p, damp(dt, rate));
        camLook.lerp(shot.l, damp(dt, rate));
      }
      camera.position.copy(camPos);
      camera.lookAt(camLook);

      renderer.render(scene, camera);

      /* 操作ヒントの位置 */
      const hintEl = hintRef.current;
      if (hintEl) {
        let show = !dragging && !autoRef.current;
        if (k >= 0) {
          const width = FOLDS[k].c * 2;
          anchor.set(paperGroup.position.x + width - 0.02, foldPos.y, foldPos.z);
        } else if (phaseNow === "carry") {
          anchor.set(stripPos.x, stripPos.y - 0.25, -R_EFF);
        } else if (phaseNow === "tie") {
          anchor.set(0.02, BY - 0.45, -R_EFF);
        } else {
          show = false;
        }
        if (show) {
          proj.copy(anchor).project(camera);
          const x = (proj.x * 0.5 + 0.5) * mount.clientWidth;
          const y = (-proj.y * 0.5 + 0.5) * mount.clientHeight;
          hintEl.style.transform = `translate(${x}px, ${y}px)`;
          hintEl.style.opacity = "1";
          hintEl.dataset.kind =
            k >= 0 ? "fold" : phaseNow === "carry" ? "carry" : "tie";
        } else {
          hintEl.style.opacity = "0";
        }
      }
      canvasEl.style.cursor = dragging
        ? "grabbing"
        : k >= 0 || phaseNow === "carry" || phaseNow === "tie"
          ? "grab"
          : "default";

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onResize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      canvasEl.removeEventListener("pointerdown", onDown);
      canvasEl.removeEventListener("pointermove", onMove);
      canvasEl.removeEventListener("pointerup", onUp);
      canvasEl.removeEventListener("pointercancel", onUp);
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
      canvasEl.remove();
    };
  }, [data, runId]);

  const caption = CAPTIONS[phase];
  const interactive =
    phase === "fold0" ||
    phase === "fold1" ||
    phase === "fold2" ||
    phase === "carry" ||
    phase === "tie";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="おみくじを木に結ぶ"
      className="tie-sky fixed inset-0 z-[60] select-none"
    >
      <div ref={mountRef} className="absolute inset-0" />

      {/* 操作する場所を示す目印 */}
      <div
        ref={hintRef}
        className="tie-hint pointer-events-none absolute left-0 top-0 opacity-0"
      >
        <span className="tie-hint-ring" />
        <span className="tie-hint-arrow" />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-8 flex -translate-x-1/2 flex-col items-center gap-2 text-center">
        <p className="font-brush text-3xl tracking-[0.3em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
          {caption.title}
        </p>
        {caption.hint && (
          <p className="rounded-full bg-black/35 px-4 py-1.5 font-mincho text-sm tracking-widest text-white backdrop-blur">
            {caption.hint}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="閉じる"
        className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-gray-800 shadow-lg transition hover:bg-white"
      >
        <X size={20} />
      </button>

      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-4">
        {phase === "done" ? (
          <>
            <p className="font-mincho text-sm tracking-widest text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
              {data.rank}のおみくじを結びました。良き一年となりますように。
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setPhase("intro");
                  setRunId((id) => id + 1);
                }}
                className="rounded bg-white/90 px-6 py-3 font-mincho text-gray-800 shadow transition hover:bg-white"
              >
                もう一度結ぶ
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded bg-red-700 px-6 py-3 font-mincho text-white shadow transition hover:bg-red-600"
              >
                結果に戻る
              </button>
            </div>
          </>
        ) : (
          <div className="flex gap-3">
            {interactive && (
              <button
                type="button"
                onClick={() => {
                  autoRef.current = true;
                }}
                className="rounded-full bg-white/85 px-5 py-2 font-mincho text-xs tracking-widest text-gray-800 shadow backdrop-blur transition hover:bg-white"
              >
                おまかせで進める
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                skipRef.current = true;
              }}
              className="rounded-full bg-black/35 px-5 py-2 font-mincho text-xs tracking-widest text-white backdrop-blur transition hover:bg-black/50"
            >
              スキップ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
