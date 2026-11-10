"use client";

import { useEffect, useMemo, type CSSProperties } from "react";

type Props = {
  soundOn: boolean;
  onDone: () => void;
};

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

const STAMPS = ["壱", "弐", "参", "奥義"];

// 飛ぶ鶴（左向き）。翼だけを羽ばたかせる
const Crane = () => (
  <svg viewBox="0 0 220 140" className="perfect-crane-svg" aria-hidden>
    {/* 脚 */}
    <path d="M150 78 L212 88" stroke="#3f3f46" strokeWidth="3" strokeLinecap="round" />
    {/* 尾 */}
    <path d="M138 66 L172 72 L140 82 Z" fill="#18181b" />
    {/* 奥の翼 */}
    <g className="perfect-wing perfect-wing-back">
      <path d="M100 68 Q112 22 162 14 Q146 44 132 70 Z" fill="#e5e7eb" />
      <path d="M140 22 Q152 16 162 14 Q154 30 146 42 Z" fill="#18181b" />
    </g>
    {/* 胴・首・頭 */}
    <ellipse cx="118" cy="72" rx="36" ry="12" fill="#ffffff" />
    <path d="M90 70 Q60 62 30 44" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" fill="none" />
    <path d="M62 60 Q46 53 30 44" stroke="#18181b" strokeWidth="5" strokeLinecap="round" fill="none" />
    <circle cx="27" cy="43" r="7" fill="#ffffff" />
    <circle cx="28" cy="38.5" r="4" fill="#dc2626" />
    <path d="M21 44 L2 48" stroke="#52525b" strokeWidth="3" strokeLinecap="round" />
    {/* 手前の翼 */}
    <g className="perfect-wing">
      <path d="M96 70 Q104 8 168 0 Q150 40 136 74 Z" fill="#ffffff" />
      <path d="M140 12 Q156 3 168 0 Q160 20 150 38 Z" fill="#18181b" />
    </g>
  </svg>
);

// 太鼓と鈴っぽい音を Web Audio で鳴らす（音声ファイルは増やさない）
const playFanfare = () => {
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return () => {};
  const ctx = new AudioCtx();
  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  const t0 = ctx.currentTime + 0.05;

  const taiko = (at: number, gain: number) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, t0 + at);
    osc.frequency.exponentialRampToValueAtTime(48, t0 + at + 0.28);
    g.gain.setValueAtTime(gain, t0 + at);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + at + 0.5);
    osc.connect(g).connect(master);
    osc.start(t0 + at);
    osc.stop(t0 + at + 0.55);
  };
  const chime = (at: number, freq: number, gain = 0.16) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, t0 + at);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + at + 1.1);
    osc.connect(g).connect(master);
    osc.start(t0 + at);
    osc.stop(t0 + at + 1.2);
  };

  // 四太刀の判子 → ドドン → 鈴の駆け上がり（陽音階）
  [0.15, 0.4, 0.65, 0.9].forEach((at, i) => taiko(at, 0.5 + i * 0.1));
  taiko(1.45, 1);
  taiko(1.6, 1);
  [587.3, 659.3, 784, 880, 987.8, 1174.7, 1318.5, 1568].forEach((f, i) =>
    chime(1.65 + i * 0.07, f)
  );
  [1174.7, 1568, 2349.3].forEach((f) => chime(2.35, f, 0.12));

  return () => {
    ctx.close().catch(() => {});
  };
};

export default function PerfectCelebration({ soundOn, onDone }: Props) {
  useEffect(() => {
    const stop = soundOn ? playFanfare() : () => {};
    const timer = setTimeout(onDone, 9000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      stop();
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [soundOn, onDone]);

  const { cranes, flakes, clouds } = useMemo(() => {
    const rnd = mulberry32(2026);
    return {
      cranes: [
        { top: 16, size: 150, delay: 2.0, dur: 9 },
        { top: 27, size: 104, delay: 2.9, dur: 10.5 },
        { top: 9, size: 84, delay: 3.6, dur: 12 },
        { top: 36, size: 120, delay: 4.6, dur: 9.8 },
        { top: 21, size: 70, delay: 5.4, dur: 13 },
      ],
      flakes: Array.from({ length: 46 }, () => ({
        left: rnd() * 100,
        delay: 1.5 + rnd() * 5,
        duration: 4 + rnd() * 4,
        size: 5 + rnd() * 9,
        sway: (rnd() - 0.5) * 140,
      })),
      clouds: [
        { top: 12, left: -6, width: 42, delay: 0 },
        { top: 22, left: 62, width: 46, delay: -6 },
        { top: 44, left: -12, width: 38, delay: -3 },
        { top: 52, left: 70, width: 40, delay: -9 },
        { top: 66, left: 18, width: 30, delay: -12 },
      ],
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="全弾必中の特別演出"
      onClick={onDone}
      className="perfect-root fixed inset-0 z-[80] cursor-pointer select-none overflow-hidden"
    >
      {/* 夜明けの空 */}
      <div aria-hidden className="perfect-sky" />
      <div aria-hidden className="perfect-night" />

      {/* 初日の出 */}
      <div aria-hidden className="perfect-sun-wrap">
        <div className="perfect-sun-rays" />
        <div className="perfect-sun-glow" />
        <div className="perfect-sun" />
      </div>

      {/* 霞 */}
      {clouds.map((cloud, i) => (
        <div
          key={`cloud${i}`}
          aria-hidden
          className="perfect-kasumi"
          style={
            {
              top: `${cloud.top}%`,
              left: `${cloud.left}%`,
              width: `${cloud.width}%`,
              "--delay": `${cloud.delay}s`,
            } as CSSProperties
          }
        >
          <span />
          <span />
          <span />
        </div>
      ))}

      {/* 富士山 */}
      <svg
        aria-hidden
        className="perfect-fuji"
        viewBox="0 0 1200 520"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <linearGradient id="fujiBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b4a8c" />
            <stop offset="0.55" stopColor="#232f66" />
            <stop offset="1" stopColor="#141b40" />
          </linearGradient>
          <linearGradient id="fujiGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fb7185" stopOpacity="0.75" />
            <stop offset="0.6" stopColor="#f97316" stopOpacity="0.25" />
            <stop offset="1" stopColor="#f97316" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          id="fujiShape"
          d="M0 520 L0 452 C190 426 372 318 512 150 L540 118 Q600 100 660 118 L688 150 C828 318 1010 426 1200 452 L1200 520 Z"
          fill="url(#fujiBody)"
        />
        {/* 朝日に染まる赤富士 */}
        <path
          className="perfect-fuji-red"
          d="M0 520 L0 452 C190 426 372 318 512 150 L540 118 Q600 100 660 118 L688 150 C828 318 1010 426 1200 452 L1200 520 Z"
          fill="url(#fujiGlow)"
        />
        {/* 冠雪 */}
        <path
          d="M512 150 L540 118 Q600 100 660 118 L688 150 L716 190 L684 176 L664 214 L634 180 L600 226 L566 180 L536 214 L516 176 L484 190 Z"
          fill="#ffffff"
        />
      </svg>

      {/* 青海波 */}
      <div aria-hidden className="perfect-seigaiha" />

      {/* 鶴 */}
      {cranes.map((crane, i) => (
        <div
          key={`crane${i}`}
          aria-hidden
          className="perfect-crane"
          style={
            {
              top: `${crane.top}%`,
              width: `${crane.size}px`,
              "--delay": `${crane.delay}s`,
              "--dur": `${crane.dur}s`,
              "--flap": `${0.55 + (i % 3) * 0.08}s`,
            } as CSSProperties
          }
        >
          <Crane />
        </div>
      ))}

      {/* 金箔 */}
      {flakes.map((flake, i) => (
        <span
          key={`flake${i}`}
          aria-hidden
          className="perfect-flake"
          style={
            {
              left: `${flake.left}%`,
              width: `${flake.size}px`,
              height: `${flake.size}px`,
              "--delay": `${flake.delay}s`,
              "--dur": `${flake.duration}s`,
              "--sway": `${flake.sway}px`,
            } as CSSProperties
          }
        />
      ))}

      {/* 文字 */}
      <div className="perfect-stage absolute inset-x-0 top-[7%] flex flex-col items-center gap-4 px-4 text-center sm:top-[6%] sm:gap-6">
        <div className="flex gap-2 sm:gap-4">
          {STAMPS.map((label, i) => (
            <div
              key={label}
              className="perfect-stamp font-brush"
              style={{ "--delay": `${0.15 + i * 0.25}s` } as CSSProperties}
            >
              <span className="text-2xl leading-none sm:text-4xl">{label}</span>
              <span className="mt-1 text-[10px] tracking-widest sm:text-xs">
                必中
              </span>
            </div>
          ))}
        </div>

        <div className="perfect-title-wrap">
          <h2 className="perfect-title font-brush">全弾必中</h2>
          <span aria-hidden className="perfect-title-ghost font-brush">
            全弾必中
          </span>
        </div>

        <p className="perfect-sub font-brush">
          <span className="perfect-pill">神業</span>
          <span className="mx-2 sm:mx-3">精度 一〇〇％ ×４</span>
          <span className="perfect-pill">天晴</span>
        </p>
      </div>

      {/* 短冊 */}
      <div aria-hidden className="perfect-tanzaku font-brush">
        初日の出
      </div>

      <p className="perfect-tap font-mincho">画面を押して、おみくじを開く</p>

      <div aria-hidden className="perfect-flash" />
      <div aria-hidden className="perfect-frame" />
    </div>
  );
}
