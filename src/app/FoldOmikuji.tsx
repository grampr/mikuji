"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type FoldOmikujiData = {
  rank: string;
  rankColor: string;
  ticket: string;
  waka: string;
  translation: string;
  details: { label: string; value: string }[];
  score: string;
  lucky: { label: string; value: string }[];
};

type Props = {
  data: FoldOmikujiData;
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
const TEX_H = 1340;
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
  data: FoldOmikujiData,
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

  ctx.fillStyle = faint ? "#f6f0e2" : PAPER;
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
      ctx.lineTo(x + 26.6, 1206);
      ctx.stroke();
      ctx.restore();
    }
  });

  // 精度
  ctx.fillStyle = "#6b7280";
  ctx.font = `15px ${mincho}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`精度 ${data.score}%`, rankX, rankTop + boxH + 12);

  // 吉方位・幸運の色・幸運の品と朱印
  ctx.strokeStyle = RED;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(40, 1218);
  ctx.lineTo(TEX_W - 40, 1218);
  ctx.stroke();
  data.lucky.forEach((lucky, i) => {
    const x = 42 + i * 140;
    ctx.save();
    ctx.globalAlpha *= 0.5;
    ctx.strokeRect(x, 1234, 130, 64);
    ctx.restore();
    ctx.fillStyle = RED;
    ctx.font = `13px ${mincho}`;
    ctx.fillText(lucky.label, x + 65, 1253);
    ctx.fillStyle = "#1f2937";
    ctx.font = `bold 19px ${mincho}`;
    ctx.fillText(lucky.value, x + 65, 1279);
  });
  ctx.save();
  ctx.translate(516, 1266);
  ctx.rotate(-0.1);
  ctx.globalAlpha *= 0.85;
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.roundRect(-36, -36, 72, 72, 8);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `19px ${brush}`;
  ctx.fillText("一撃", 0, -12);
  ctx.fillText("必中", 0, 13);
  ctx.restore();

  ctx.globalAlpha = 1;
  drawFibers(ctx, TEX_W, TEX_H, 1400, faint ? 11 : 5);
  return canvas;
};

// 和紙の高さマップ：長い繊維・簀の目（細い平行線）・紙肌のざらつき
const drawPaperHeight = (): HTMLCanvasElement => {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  const rnd = mulberry32(21);
  // 紙肌（細かいざらつき）
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (rnd() - 0.5) * 46;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  // 簀の目
  ctx.strokeStyle = "rgba(96,96,96,0.28)";
  ctx.lineWidth = 1;
  for (let y = 0; y < size; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(size, y + 0.5);
    ctx.stroke();
  }
  // 長い繊維（端をまたいでもつながるように描く）
  ctx.lineCap = "round";
  for (let i = 0; i < 900; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const len = 20 + rnd() * 110;
    const ang = (rnd() - 0.5) * 1.5 + (rnd() > 0.8 ? Math.PI / 2 : 0);
    const v = rnd() > 0.35 ? 170 + rnd() * 70 : 70 + rnd() * 40;
    ctx.strokeStyle = `rgba(${v},${v},${v},${0.35 + rnd() * 0.35})`;
    ctx.lineWidth = 0.7 + rnd() * 1.5;
    const bend = (rnd() - 0.5) * 18;
    for (const ox of [0, size, -size]) {
      for (const oy of [0, size, -size]) {
        ctx.beginPath();
        ctx.moveTo(x + ox, y + oy);
        ctx.quadraticCurveTo(
          x + ox + Math.cos(ang) * len * 0.5 - Math.sin(ang) * bend,
          y + oy + Math.sin(ang) * len * 0.5 + Math.cos(ang) * bend,
          x + ox + Math.cos(ang) * len,
          y + oy + Math.sin(ang) * len
        );
        ctx.stroke();
      }
    }
  }
  return canvas;
};

/* ================= 紙の折り ================= */

const PAPER_W = 0.84;
const PAPER_H = (PAPER_W * TEX_H) / TEX_W;
const NX = 200;
const NY = 412;
const VERTS = (NX + 1) * (NY + 1);
const MAX_FOLDS = 6;
// 重なった紙どうしのすき間（紙の厚み）
const LAYER_GAP = 0.0006;
const PAPER_LIFT = 0.02;
// 折り目の跡のわずかな盛り上がり
const CREASE_RIDGE = 0.0028;
const CREASE_BAND = 0.011;

type Fold = {
  // つかんだ点と離した点の中点（＝折り目が通る点）と、動かす側を向く法線
  mx: number;
  my: number;
  nx: number;
  ny: number;
  rho: number; // 折り目の丸み。めくっている間は大きく、押さえると小さくなる
  rhoFinal: number;
  theta: number;
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
const damp = (dt: number, rate: number) => 1 - Math.exp(-dt * rate);

// 折り1回分の変形。折り目より先（d > 0）を、半径 rho の円筒に沿わせて折り返す。
// 円筒に沿って反る分だけ折り目を手前へずらし、つかんだ点が指の位置に来るようにする。
const bend = (
  f: Fold,
  x: number,
  y: number,
  z: number,
  out: Float32Array,
  o: number
) => {
  const shift = (f.rho * f.theta) / 2;
  const d = (x - f.mx) * f.nx + (y - f.my) * f.ny + shift;
  if (d <= 0) {
    out[o] = x;
    out[o + 1] = y;
    out[o + 2] = z;
    return false;
  }
  const arc = f.rho * f.theta;
  let along: number;
  let nz: number;
  if (d <= arc) {
    const phi = d / f.rho;
    along = (f.rho - z) * Math.sin(phi);
    nz = f.rho - (f.rho - z) * Math.cos(phi);
  } else {
    const rem = d - arc;
    along = (f.rho - z) * Math.sin(f.theta) + rem * Math.cos(f.theta);
    nz = f.rho - (f.rho - z) * Math.cos(f.theta) + rem * Math.sin(f.theta);
  }
  const move = along - d;
  out[o] = x + f.nx * move;
  out[o + 1] = y + f.ny * move;
  out[o + 2] = nz;
  return true;
};

export default function FoldOmikuji({ data }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

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
    const canvasEl = renderer.domElement;
    canvasEl.style.touchAction = "none";
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    // 画角を狭くして、置いた札をほぼ真上から見る（紙の高さが表示の約9割になる距離）
    const FOV = 28;
    const camera = new THREE.PerspectiveCamera(
      FOV,
      mount.clientWidth / mount.clientHeight,
      0.5,
      40
    );
    const camDist =
      PAPER_H / 0.9 / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    camera.position.set(0, -0.28, camDist);
    camera.lookAt(0, 0, 0);

    /* ----- 光：斜めから当てて、紙の凹凸と折り目の影を出す ----- */
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfc4, 1.05));
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const key = new THREE.DirectionalLight(0xfff6ea, 1.25);
    key.position.set(-3.4, 2.6, 3.0);
    key.target.position.set(0, 0, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -2;
    key.shadow.camera.right = 2;
    key.shadow.camera.top = 2;
    key.shadow.camera.bottom = -2;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 12;
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0.0015;
    key.shadow.radius = 7;
    scene.add(key, key.target);
    const fill = new THREE.DirectionalLight(0xdfe8ff, 0.35);
    fill.position.set(3, -2, 3);
    scene.add(fill);

    /* ----- 影だけを受ける透明な面（背景はページの和紙がそのまま見える） ----- */
    const floor = new THREE.Mesh(
      track(new THREE.PlaneGeometry(14, 14)),
      track(new THREE.ShadowMaterial({ opacity: 0.38 }))
    );
    floor.receiveShadow = true;
    scene.add(floor);

    /* ----- 紙の質感 ----- */
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
    const heightTex = track(new THREE.CanvasTexture(drawPaperHeight()));
    heightTex.wrapS = heightTex.wrapT = THREE.RepeatWrapping;
    heightTex.repeat.set(2.4, 5);
    heightTex.anisotropy = maxAniso;

    const allText =
      data.rank +
      data.waka +
      data.translation +
      data.ticket +
      data.details.map((d) => d.label + d.value).join("") +
      "御神籤令和八年新春一撃必中第番【解説】";
    let needsRender = true;
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
        needsRender = true;
      })
      .catch(() => {});

    // 粗さ高め＋sheen（紙の毛羽の光り方）＋繊維の凹凸
    const paperProps = {
      roughness: 0.93,
      metalness: 0,
      sheen: 0.15,
      sheenRoughness: 0.85,
      sheenColor: new THREE.Color(0xfff6e6),
      bumpMap: heightTex,
      bumpScale: 0.9,
      vertexColors: true,
    };
    const frontMat = track(
      new THREE.MeshPhysicalMaterial({
        ...paperProps,
        map: slipTex,
        side: THREE.FrontSide,
      })
    );
    const backMat = track(
      new THREE.MeshPhysicalMaterial({
        ...paperProps,
        map: backTex,
        side: THREE.BackSide,
      })
    );

    /* ----- 紙のメッシュ ----- */
    const geo = track(new THREE.BufferGeometry());
    const base = new Float32Array(VERTS * 2); // 広げた状態の座標
    const cache = new Float32Array(VERTS * 3); // 確定した折りまで適用した座標
    const positions = new Float32Array(VERTS * 3);
    const uvs = new Float32Array(VERTS * 2);
    const colors = new Float32Array(VERTS * 3).fill(1);
    const crease = new Float32Array(VERTS);
    {
      let k = 0;
      for (let iy = 0; iy <= NY; iy++) {
        for (let ix = 0; ix <= NX; ix++) {
          const u = ix / NX;
          const v = iy / NY;
          base[k * 2] = (u - 0.5) * PAPER_W;
          base[k * 2 + 1] = (v - 0.5) * PAPER_H;
          uvs[k * 2] = u;
          uvs[k * 2 + 1] = v;
          k++;
        }
      }
      const idx = new Uint32Array(NX * NY * 6);
      let t = 0;
      for (let iy = 0; iy < NY; iy++) {
        for (let ix = 0; ix < NX; ix++) {
          const a = iy * (NX + 1) + ix;
          const b = a + 1;
          const c = a + NX + 1;
          const d = c + 1;
          idx.set([a, b, c, b, d, c], t);
          t += 6;
        }
      }
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
    }
    const posAttr = new THREE.BufferAttribute(positions, 3);
    const colAttr = new THREE.BufferAttribute(colors, 3);
    geo.setAttribute("position", posAttr);
    geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute("color", colAttr);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);

    const front = new THREE.Mesh(geo, frontMat);
    const back = new THREE.Mesh(geo, backMat);
    front.castShadow = true;
    front.receiveShadow = true;
    back.receiveShadow = true;
    front.frustumCulled = false;
    back.frustumCulled = false;
    scene.add(front, back);

    /* ----- 折りの状態 ----- */
    const folds: Fold[] = [];
    let baked = 0; // cache に焼き込み済みの折りの数
    let live: Fold | null = null; // いま動いている折り（プレビュー・確定中・戻し中）
    let mode: "idle" | "drag" | "settle" = "idle";
    const tmp = new Float32Array(3);

    const rebuildCache = (count: number) => {
      for (let k = 0; k < VERTS; k++) {
        let x = base[k * 2];
        let y = base[k * 2 + 1];
        let z = 0;
        for (let i = 0; i < count; i++) {
          bend(folds[i], x, y, z, tmp, 0);
          x = tmp[0];
          y = tmp[1];
          z = tmp[2];
        }
        cache[k * 3] = x;
        cache[k * 3 + 1] = y;
        cache[k * 3 + 2] = z;
      }
      baked = count;
    };

    // 置いた紙のわずかな波打ち（折るほど落ち着く）
    const wave = (x: number, y: number) =>
      Math.sin(x * 7.3 + 1.1) * Math.cos(y * 4.1 - 0.4) * 0.5 +
      Math.sin(x * 3.1 - y * 5.7) * 0.5;

    const writePositions = () => {
      const f = live;
      const amp = 0.0035 / (1 + baked * 1.5);
      for (let k = 0; k < VERTS; k++) {
        const o = k * 3;
        if (f) {
          bend(f, cache[o], cache[o + 1], cache[o + 2], positions, o);
        } else {
          positions[o] = cache[o];
          positions[o + 1] = cache[o + 1];
          positions[o + 2] = cache[o + 2];
        }
        positions[o + 2] +=
          PAPER_LIFT +
          (wave(positions[o], positions[o + 1]) + 1) * amp +
          crease[k] * CREASE_RIDGE;
      }
      posAttr.needsUpdate = true;
      geo.computeVertexNormals();
      needsRender = true;
    };

    // 折り目の跡を頂点色に残す（広げても消えない）
    const markCrease = (f: Fold) => {
      const shift = (f.rho * f.theta) / 2;
      for (let k = 0; k < VERTS; k++) {
        const o = k * 3;
        const d = Math.abs(
          (cache[o] - f.mx) * f.nx + (cache[o + 1] - f.my) * f.ny + shift
        );
        if (d < CREASE_BAND) {
          const c = 1 - d / CREASE_BAND;
          if (c > crease[k]) {
            crease[k] = c;
            const shade = 1 - 0.17 * c;
            colors[o] = shade;
            colors[o + 1] = shade * 0.985;
            colors[o + 2] = shade * 0.96;
          }
        }
      }
      colAttr.needsUpdate = true;
    };

    rebuildCache(0);
    writePositions();

    /* ----- ポインタ操作 ----- */
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const hit = new THREE.Vector3();
    const grab = new THREE.Vector2();
    let overPaper = false;

    const setNdc = (ev: PointerEvent) => {
      const rect = canvasEl.getBoundingClientRect();
      ndc.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
    };
    const pickPaper = () => {
      const hits = raycaster.intersectObjects([front, back], false);
      return hits.length ? hits[0] : null;
    };
    const tri = new THREE.Triangle();
    const bary = new THREE.Vector3();
    let peeled: Fold | null = null; // つかんで持ち上げた、直前の折り

    const updatePreview = () => {
      if (!raycaster.ray.intersectPlane(plane, hit)) return;
      const dx = grab.x - hit.x;
      const dy = grab.y - hit.y;
      const len = Math.hypot(dx, dy);
      if (len < 0.035) {
        if (live) {
          live = null;
          writePositions();
        }
        return;
      }
      const nx = dx / len;
      const ny = dy / len;
      const mx = (grab.x + hit.x) / 2;
      const my = (grab.y + hit.y) / 2;
      // 動く側・残る側それぞれの重なりの高さから、折り目の丸みを決める
      let moving = 0;
      let staying = 0;
      let zM = 0;
      let zS = 0;
      for (let k = 0; k < VERTS; k++) {
        const o = k * 3;
        const d = (cache[o] - mx) * nx + (cache[o + 1] - my) * ny;
        const z = cache[o + 2];
        if (d > 0) {
          moving++;
          if (z > zM) zM = z;
        } else {
          staying++;
          if (z > zS) zS = z;
        }
      }
      // 折り目が紙にかかっていない、または紙の大半が裏返ってしまう折りは無効
      if (moving < 220 || staying < 220 || moving > VERTS * 0.62) {
        if (live) {
          live = null;
          writePositions();
        }
        return;
      }
      const rhoFinal = Math.max(zM, (zM + zS) / 2) + LAYER_GAP;
      // めくっている間は円筒状に大きく反らせる
      const lift = clamp(len * 0.22, 0.012, 0.075);
      live = {
        mx,
        my,
        nx,
        ny,
        rho: rhoFinal + lift,
        rhoFinal,
        theta: Math.PI,
      };
      writePositions();
    };

    const onDown = (ev: PointerEvent) => {
      if (mode !== "idle") return;
      setNdc(ev);
      const picked = pickPaper();
      if (!picked || !picked.face) return;
      const p = picked.point;
      peeled = null;
      live = null;

      // 直前に折った部分をつかんだら、その折りを持ち上げて戻せる／折り直せる
      if (folds.length) {
        const lastFold = folds[folds.length - 1];
        const { a, b, c } = picked.face;
        tri.a.fromArray(positions, a * 3);
        tri.b.fromArray(positions, b * 3);
        tri.c.fromArray(positions, c * 3);
        tri.getBarycoord(p, bary);
        rebuildCache(folds.length - 1);
        // つかんだ点の、折る前の位置
        const gx =
          cache[a * 3] * bary.x + cache[b * 3] * bary.y + cache[c * 3] * bary.z;
        const gy =
          cache[a * 3 + 1] * bary.x +
          cache[b * 3 + 1] * bary.y +
          cache[c * 3 + 1] * bary.z;
        const shift = (lastFold.rho * lastFold.theta) / 2;
        const d =
          (gx - lastFold.mx) * lastFold.nx +
          (gy - lastFold.my) * lastFold.ny +
          shift;
        if (d > 0.004) {
          peeled = folds.pop() ?? null;
          live = peeled;
          grab.set(gx, gy);
        } else {
          rebuildCache(folds.length);
        }
      }
      if (!peeled) {
        // これ以上は厚くて折れない
        if (folds.length >= MAX_FOLDS) return;
        grab.set(p.x, p.y);
      }
      mode = "drag";
      canvasEl.setPointerCapture(ev.pointerId);
      canvasEl.style.cursor = "grabbing";
    };
    const onMove = (ev: PointerEvent) => {
      setNdc(ev);
      if (mode === "drag") {
        updatePreview();
      } else if (mode === "idle") {
        // 机の上か紙の上かでカーソルを変える（負荷を抑えるため平面で近似）
        if (raycaster.ray.intersectPlane(plane, hit)) {
          const inside =
            Math.abs(hit.x) < PAPER_W / 2 + 0.02 &&
            Math.abs(hit.y) < PAPER_H / 2 + 0.02;
          if (inside !== overPaper) {
            overPaper = inside;
            canvasEl.style.cursor = inside ? "grab" : "default";
          }
        }
      }
    };
    const onUp = () => {
      if (mode !== "drag") return;
      canvasEl.style.cursor = "grab";
      if (live) {
        // 折り目を押さえて確定する
        folds.push(live);
        mode = "settle";
      } else {
        // 元の位置まで戻して離した＝広げた（折り目の跡は残る）
        mode = "idle";
      }
      peeled = null;
    };
    canvasEl.addEventListener("pointerdown", onDown);
    canvasEl.addEventListener("pointermove", onMove);
    canvasEl.addEventListener("pointerup", onUp);
    canvasEl.addEventListener("pointercancel", onUp);

    /* ----- ループ ----- */
    let last: number | null = null;
    const frame = (now: number) => {
      if (disposed) return;
      const dt = last === null ? 0 : Math.min((now - last) / 1000, 0.05);
      last = now;

      if (mode === "settle" && live) {
        live.rho += (live.rhoFinal - live.rho) * damp(dt, 16);
        if (live.rho - live.rhoFinal < 0.0004) {
          live.rho = live.rhoFinal;
          markCrease(live);
          // この折りを焼き込む
          for (let k = 0; k < VERTS; k++) {
            const o = k * 3;
            bend(live, cache[o], cache[o + 1], cache[o + 2], cache, o);
          }
          baked = folds.length;
          live = null;
          mode = "idle";
        }
        writePositions();
      }

      if (needsRender) {
        renderer.render(scene, camera);
        needsRender = false;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onResize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      needsRender = true;
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
  }, [data]);

  return (
    <div className="relative z-10 flex w-full max-w-5xl select-none flex-col items-center animate-fade-in-up">
      <div ref={mountRef} className="h-[1000px] w-full" />

    </div>
  );
}
