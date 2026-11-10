"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
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

const PAPER = "#fbf7ee";
const RED = "#b91c1c";

/* ---------- 札のテクスチャ（Canvas に縦書きで描く） ---------- */

const TEX_W = 600;
const TEX_H = 1240;

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

const drawSlip = (
  data: TieOmikujiData,
  brush: string,
  mincho: string
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // 二重罫
  ctx.strokeStyle = RED;
  ctx.lineWidth = 5;
  ctx.strokeRect(16, 16, TEX_W - 32, TEX_H - 32);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(27, 27, TEX_W - 54, TEX_H - 54);

  // 頭
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

  // 運勢
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

  // 和歌
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
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(TEX_W - 40, y);
    ctx.stroke();
    ctx.restore();
  };

  // 解説
  dashed(548);
  ctx.font = `bold 20px ${mincho}`;
  ctx.fillStyle = RED;
  drawVertical(ctx, "【解説】", 546, 566, 20, 22);
  ctx.font = `20px ${mincho}`;
  ctx.fillStyle = "#374151";
  const perCol = 10;
  const transChars = [...data.translation];
  // 見出しの下から書き始め、以降は列ごとに折り返す
  let col = 0;
  let row = 4;
  let buf = "";
  const flush = () => {
    if (!buf) return;
    const startRow = col === 0 ? 4 : 0;
    drawVertical(ctx, buf, 546 - col * 36, 566 + startRow * 22, 20, 22);
    buf = "";
  };
  for (const ch of transChars) {
    buf += ch;
    row += 1;
    if (row >= perCol + (col === 0 ? 0 : 0)) {
      flush();
      col += 1;
      row = 0;
    }
  }
  flush();
  dashed(806);

  // 各項目
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
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 26.6, 824);
      ctx.lineTo(x + 26.6, TEX_H - 44);
      ctx.stroke();
      ctx.restore();
    }
  });

  return canvas;
};

// 折りたたんだ後の細い紙：印刷がうっすら透ける程度の模様
const drawStrip = (): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, 64, 512);
  ctx.strokeStyle = "rgba(185,28,28,0.5)";
  ctx.lineWidth = 2;
  ctx.strokeRect(3, 3, 58, 506);
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let y = 20; y < 492; y += 9) {
    ctx.fillStyle =
      rnd() > 0.82 ? "rgba(185,28,28,0.35)" : "rgba(31,41,55,0.16)";
    ctx.fillRect(14 + rnd() * 6, y, 5, 5);
    if (rnd() > 0.3) ctx.fillRect(38 + rnd() * 6, y, 5, 5);
  }
  return canvas;
};

/* ---------- 枝に巻き付く帯の形 ---------- */

type RibbonParams = {
  length: number;
  width: number;
  radius: number; // 枝の半径（＋紙の浮き）
  wrap: number; // 0→1 巻き付き
  spread: number; // 0→1 端を斜めに開く
};

const RIBBON_SEGMENTS = 96;
const HELIX = 0.06; // 巻きながら枝方向へずれる量
const TAIL_ANGLE = 0.75;

const writeRibbon = (positions: Float32Array, params: RibbonParams) => {
  const { length, width, radius: r, wrap, spread } = params;
  const A = wrap * Math.PI;
  const a = r * A;
  const beta = TAIL_ANGLE * spread;
  const half = width / 2;

  for (let i = 0; i <= RIBBON_SEGMENTS; i++) {
    const s = (i / RIBBON_SEGMENTS - 0.5) * length;
    const u = s >= 0 ? 1 : -1;
    const m = Math.abs(s);

    let x: number;
    let y: number;
    let z: number;
    let wx = 1;
    let wy = 0;

    if (m <= a) {
      // 枝の裏から、上（下）を回って手前へ
      const psi = m / r;
      x = u * HELIX * (psi / Math.PI);
      y = u * r * Math.sin(psi);
      z = -r * Math.cos(psi);
    } else {
      const t = m - a;
      const d0y = u * Math.cos(A);
      const d0z = Math.sin(A);
      const dx = -d0y * Math.sin(beta);
      const dy = d0y * Math.cos(beta);
      const lift = Math.min(t / 0.05, 1) * (u > 0 ? 0.006 : 0.014) * spread;
      x = u * HELIX * (A / Math.PI) + dx * t;
      y = u * r * Math.sin(A) + dy * t;
      z = -r * Math.cos(A) + d0z * t + lift;
      const k = Math.min(t / 0.04, 1);
      wx = Math.cos(beta * k);
      wy = Math.sin(beta * k);
    }

    const o = i * 6;
    positions[o] = x - wx * half;
    positions[o + 1] = y - wy * half;
    positions[o + 2] = z;
    positions[o + 3] = x + wx * half;
    positions[o + 4] = y + wy * half;
    positions[o + 5] = z;
  }
};

const createRibbonGeometry = () => {
  const geometry = new THREE.BufferGeometry();
  const count = (RIBBON_SEGMENTS + 1) * 2;
  const positions = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const indices: number[] = [];
  for (let i = 0; i <= RIBBON_SEGMENTS; i++) {
    const v = i / RIBBON_SEGMENTS;
    uvs.set([0, v, 1, v], i * 4);
    if (i < RIBBON_SEGMENTS) {
      const p = i * 2;
      indices.push(p, p + 1, p + 2, p + 1, p + 3, p + 2);
    }
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
};

/* ---------- 補間 ---------- */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, start: number, end: number) =>
  clamp01((t - start) / (end - start));
const easeInOut = (v: number) => v * v * (3 - 2 * v);
const easeOut = (v: number) => 1 - (1 - v) ** 3;

const STAGES = [
  { until: 1.0, caption: "おみくじを手に取る" },
  { until: 3.3, caption: "細く折りたたむ" },
  { until: 5.1, caption: "枝へ運ぶ" },
  { until: 8.1, caption: "枝に結ぶ" },
  { until: Infinity, caption: "結びました" },
];
const DONE_AT = 9.4;

export default function TieOmikuji({ data, onClose }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const skipRef = useRef(false);
  const [stage, setStage] = useState(0);
  const [done, setDone] = useState(false);
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
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      40,
      mount.clientWidth / mount.clientHeight,
      0.1,
      50
    );

    scene.add(new THREE.HemisphereLight(0xfff1dd, 0xa3939c, 1.2));
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const sun = new THREE.DirectionalLight(0xffe6c8, 1.7);
    sun.position.set(2.5, 3, 4);
    scene.add(sun);

    /* ----- 木 ----- */
    const BY = 0; // 結ぶ枝の高さ
    const BRANCH_R = 0.09;
    const bark = track(
      new THREE.MeshStandardMaterial({ color: 0x4d3728, roughness: 1 })
    );
    const branchCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.6, BY - 0.75, -0.3),
      new THREE.Vector3(-3.0, BY - 0.22, -0.1),
      new THREE.Vector3(-1.2, BY, 0),
      new THREE.Vector3(-0.4, BY, 0),
      new THREE.Vector3(0.4, BY, 0),
      new THREE.Vector3(1.2, BY, 0),
      new THREE.Vector3(2.8, BY + 0.2, -0.1),
      new THREE.Vector3(4.6, BY + 0.7, -0.4),
    ]);
    scene.add(
      new THREE.Mesh(
        track(new THREE.TubeGeometry(branchCurve, 80, BRANCH_R, 12, false)),
        bark
      )
    );
    const trunk = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.5, 0.62, 9, 16)),
      bark
    );
    trunk.position.set(-4.9, BY - 1.2, -0.4);
    scene.add(trunk);

    // 小枝と梅の花
    const petalMat = track(
      new THREE.MeshStandardMaterial({ color: 0xf2a1b8, roughness: 0.8 })
    );
    const coreMat = track(
      new THREE.MeshStandardMaterial({ color: 0xf6d76b, roughness: 0.8 })
    );
    const petalGeo = track(new THREE.SphereGeometry(0.045, 8, 6));
    const coreGeo = track(new THREE.SphereGeometry(0.025, 8, 6));
    const addBlossom = (pos: THREE.Vector3, scale: number) => {
      const blossom = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const petal = new THREE.Mesh(petalGeo, petalMat);
        const ang = (i / 5) * Math.PI * 2;
        petal.position.set(Math.cos(ang) * 0.05, Math.sin(ang) * 0.05, 0);
        petal.scale.set(1, 1, 0.45);
        blossom.add(petal);
      }
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.z = 0.02;
      blossom.add(core);
      blossom.position.copy(pos);
      blossom.scale.setScalar(scale);
      blossom.rotation.set(
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8,
        Math.random() * 6
      );
      scene.add(blossom);
    };
    const twigs: [number, number, number, number][] = [
      // [枝上の位置 0..1, 横方向, 高さ, 奥行き]
      [0.14, 0.5, 1.5, -0.3],
      [0.24, -0.3, 1.1, 0.15],
      [0.33, 0.35, 0.9, -0.2],
      [0.7, 0.4, 1.0, -0.15],
      [0.8, -0.2, 1.4, 0.1],
      [0.9, 0.5, 0.9, -0.3],
      [0.62, -0.25, -0.7, -0.2],
    ];
    twigs.forEach(([at, dx, dy, dz]) => {
      const base = branchCurve.getPointAt(at);
      const tip = base.clone().add(new THREE.Vector3(dx, dy, dz));
      const mid = base
        .clone()
        .lerp(tip, 0.5)
        .add(new THREE.Vector3(dx * 0.25, 0, 0));
      const curve = new THREE.CatmullRomCurve3([base, mid, tip]);
      scene.add(
        new THREE.Mesh(
          track(new THREE.TubeGeometry(curve, 12, 0.028, 6, false)),
          bark
        )
      );
      for (let i = 0; i < 4; i++) {
        const p = curve.getPointAt(0.3 + i * 0.22);
        p.add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.12,
            (Math.random() - 0.5) * 0.12,
            0.05
          )
        );
        addBlossom(p, 0.8 + Math.random() * 0.6);
      }
    });

    /* ----- 先に結ばれているおみくじ ----- */
    const stripTexture = track(new THREE.CanvasTexture(drawStrip()));
    stripTexture.colorSpace = THREE.SRGBColorSpace;
    const ribbonMat = track(
      new THREE.MeshStandardMaterial({
        map: stripTexture,
        side: THREE.DoubleSide,
        roughness: 0.9,
      })
    );
    const knotGeo = track(new THREE.BoxGeometry(0.17, 0.085, 0.035));
    const knotMat = track(
      new THREE.MeshStandardMaterial({ color: 0xf6f0e2, roughness: 0.9 })
    );
    const xAxis = new THREE.Vector3(1, 0, 0);
    [0.36, 0.41, 0.585, 0.64, 0.7, 0.3].forEach((at, i) => {
      const group = new THREE.Group();
      const geometry = track(createRibbonGeometry());
      writeRibbon(geometry.attributes.position.array as Float32Array, {
        length: 0.95 + ((i * 37) % 10) / 50,
        width: 0.1,
        radius: BRANCH_R + 0.006,
        wrap: 1,
        spread: 1,
      });
      geometry.computeVertexNormals();
      group.add(new THREE.Mesh(geometry, ribbonMat));
      const knot = new THREE.Mesh(knotGeo, knotMat);
      knot.position.set(0, 0, BRANCH_R + 0.03);
      knot.rotation.z = 0.75;
      group.add(knot);
      group.position.copy(branchCurve.getPointAt(at));
      group.quaternion.setFromUnitVectors(
        xAxis,
        branchCurve.getTangentAt(at).normalize()
      );
      group.rotateX(((i % 3) - 1) * 0.45);
      if (i % 2) group.scale.x = -1;
      scene.add(group);
    });

    /* ----- 引いた札（蛇腹に折る4枚のパネル） ----- */
    const PAPER_W = 0.84;
    const PAPER_H = (PAPER_W * TEX_H) / TEX_W;
    const PANELS = 4;
    const PW = PAPER_W / PANELS;

    const style = getComputedStyle(document.body);
    const brushFont = style.getPropertyValue("--font-brush").trim() || "serif";
    const minchoFont =
      style.getPropertyValue("--font-mincho").trim() || "serif";

    const slipTexture = track(
      new THREE.CanvasTexture(drawSlip(data, brushFont, minchoFont))
    );
    slipTexture.colorSpace = THREE.SRGBColorSpace;
    slipTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    // Webフォントの読み込みが済んだら描き直す
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
        slipTexture.image = drawSlip(data, brushFont, minchoFont);
        slipTexture.needsUpdate = true;
      })
      .catch(() => {});

    const frontMat = track(
      new THREE.MeshStandardMaterial({
        map: slipTexture,
        side: THREE.FrontSide,
        roughness: 0.9,
      })
    );
    const backMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xf3ecdc,
        side: THREE.BackSide,
        roughness: 0.95,
      })
    );

    const paper = new THREE.Group();
    scene.add(paper);
    const hinges: THREE.Group[] = [];
    let parent: THREE.Group = paper;
    for (let i = 0; i < PANELS; i++) {
      const hinge = new THREE.Group();
      hinge.position.x = i === 0 ? -PAPER_W / 2 : PW;
      const geometry = track(new THREE.PlaneGeometry(PW, PAPER_H));
      geometry.translate(PW / 2, 0, 0);
      const uv = geometry.attributes.uv;
      for (let k = 0; k < uv.count; k++) {
        uv.setX(k, (i + uv.getX(k)) / PANELS);
      }
      hinge.add(new THREE.Mesh(geometry, frontMat));
      hinge.add(new THREE.Mesh(geometry, backMat));
      parent.add(hinge);
      hinges.push(hinge);
      parent = hinge;
    }

    /* ----- 折った後の帯 ----- */
    const ribbonGroup = new THREE.Group();
    const ribbonGeometry = track(createRibbonGeometry());
    const ribbonPositions = ribbonGeometry.attributes.position
      .array as Float32Array;
    const ribbon = new THREE.Mesh(ribbonGeometry, ribbonMat);
    ribbon.frustumCulled = false;
    ribbonGroup.add(ribbon);
    const myKnot = new THREE.Mesh(knotGeo, knotMat);
    myKnot.position.set(0, 0, BRANCH_R + 0.032);
    myKnot.rotation.z = 0.75;
    ribbonGroup.add(myKnot);
    ribbonGroup.visible = false;
    scene.add(ribbonGroup);

    const R = BRANCH_R + 0.006;
    const foldPos = new THREE.Vector3(0, BY - 1.25, 2.4);
    const ribbonStart = foldPos.clone().add(new THREE.Vector3(0, 0, R));
    const ribbonMid = new THREE.Vector3(0, BY - 1.15, -0.4);
    const ribbonEnd = new THREE.Vector3(0, BY, 0);

    const camFold = new THREE.Vector3(0, BY - 1.2, 5.6);
    const camFoldLook = new THREE.Vector3(0, BY - 1.2, 0);
    const camTie = new THREE.Vector3(0.55, BY + 0.05, 2.7);
    const camTieLook = new THREE.Vector3(0, BY - 0.02, 0);
    const camWide = new THREE.Vector3(0.2, BY + 0.25, 5.8);
    const camWideLook = new THREE.Vector3(0, BY + 0.2, 0);
    const camPos = new THREE.Vector3();
    const camLook = new THREE.Vector3();
    const tmp = new THREE.Vector3();

    let stageNow = -1;
    let doneNow = false;
    let t = 0;
    let last: number | null = null;
    skipRef.current = false;

    const frame = (now: number) => {
      if (disposed) return;
      const dt = last === null ? 0 : Math.min((now - last) / 1000, 0.05);
      last = now;
      t = skipRef.current ? Math.max(t, DONE_AT) : t + dt;

      // 1) 手に取る
      const appear = easeOut(seg(t, 0, 0.9));
      // 2) 蛇腹に折る
      const fold = easeInOut(seg(t, 1.0, 3.2));
      // 3) 枝へ運ぶ
      const carry = easeInOut(seg(t, 3.3, 5.1));
      // 4) 巻く → 端を開いて結ぶ
      const wrap = easeInOut(seg(t, 5.1, 7.3));
      const spread = easeInOut(seg(t, 7.2, 8.1));
      // 5) 引きで見せる
      const wide = easeInOut(seg(t, 8.2, DONE_AT));

      const folded = t >= 3.3;
      paper.visible = !folded;
      ribbonGroup.visible = folded;

      if (!folded) {
        const theta = fold * Math.PI * 0.992;
        hinges[1].rotation.y = theta;
        hinges[2].rotation.y = -theta;
        hinges[3].rotation.y = theta;
        paper.position.copy(foldPos);
        paper.position.x += (PAPER_W / 2 - PW / 2) * fold;
        paper.position.y += (1 - appear) * -0.6 + Math.sin(t * 1.4) * 0.012;
        paper.rotation.set(
          (1 - appear) * -0.5,
          Math.sin(t * 0.9) * 0.05 * (1 - fold),
          0
        );
        paper.scale.setScalar(0.85 + 0.15 * appear);
      } else {
        if (carry < 0.55) {
          tmp.lerpVectors(ribbonStart, ribbonMid, easeInOut(carry / 0.55));
        } else {
          tmp.lerpVectors(
            ribbonMid,
            ribbonEnd,
            easeInOut((carry - 0.55) / 0.45)
          );
        }
        ribbonGroup.position.copy(tmp);
        writeRibbon(ribbonPositions, {
          length: THREE.MathUtils.lerp(PAPER_H, 1.12, carry),
          width: THREE.MathUtils.lerp(PW, 0.1, carry),
          radius: R,
          wrap,
          spread,
        });
        ribbonGeometry.attributes.position.needsUpdate = true;
        ribbonGeometry.computeVertexNormals();
        myKnot.scale.setScalar(easeOut(seg(t, 7.5, 8.1)));
        myKnot.visible = t > 7.5;
      }

      // カメラ
      camPos.lerpVectors(camFold, camTie, carry).lerp(camWide, wide);
      camLook.lerpVectors(camFoldLook, camTieLook, carry).lerp(camWideLook, wide);
      camera.position.copy(camPos);
      camera.lookAt(camLook);

      renderer.render(scene, camera);

      const nextStage = STAGES.findIndex((s) => t < s.until);
      if (nextStage !== stageNow) {
        stageNow = nextStage;
        setStage(nextStage);
      }
      if (!doneNow && t >= DONE_AT) {
        doneNow = true;
        setDone(true);
      }
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
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [data, runId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="おみくじを木に結ぶ"
      className="tie-sky fixed inset-0 z-[60]"
    >
      <div ref={mountRef} className="absolute inset-0" />

      <p className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 font-brush text-3xl tracking-[0.3em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
        {STAGES[Math.max(stage, 0)]?.caption}
      </p>

      <button
        type="button"
        onClick={onClose}
        aria-label="閉じる"
        className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-gray-800 shadow-lg transition hover:bg-white"
      >
        <X size={20} />
      </button>

      <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-4">
        {done ? (
          <>
            <p className="font-mincho text-sm tracking-widest text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
              {data.rank}のおみくじを結びました。良き一年となりますように。
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDone(false);
                  setStage(0);
                  setRunId((id) => id + 1);
                }}
                className="rounded bg-white/90 px-6 py-3 font-mincho text-gray-800 shadow transition hover:bg-white"
              >
                もう一度見る
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
          <button
            type="button"
            onClick={() => {
              skipRef.current = true;
            }}
            className="rounded-full bg-black/35 px-5 py-2 font-mincho text-xs tracking-widest text-white backdrop-blur transition hover:bg-black/50"
          >
            スキップ
          </button>
        )}
      </div>
    </div>
  );
}
