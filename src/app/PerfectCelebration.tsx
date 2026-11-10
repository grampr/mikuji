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
const CONFETTI_COLORS = ["#fbbf24", "#f59e0b", "#dc2626", "#ffffff", "#16a34a", "#7c3aed"];
const FIREWORK_COLORS = ["#fde68a", "#f87171", "#f0abfc", "#93c5fd", "#86efac"];

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

  const { coins, confetti, fireworks } = useMemo(() => {
    const rnd = mulberry32(8888);
    return {
      coins: Array.from({ length: 26 }, () => ({
        left: rnd() * 100,
        delay: 1.5 + rnd() * 3.5,
        duration: 2.2 + rnd() * 1.8,
        size: 26 + rnd() * 26,
        spin: 0.5 + rnd() * 0.7,
      })),
      confetti: Array.from({ length: 70 }, () => ({
        left: rnd() * 100,
        delay: 1.4 + rnd() * 4,
        duration: 2.6 + rnd() * 2.4,
        color: CONFETTI_COLORS[Math.floor(rnd() * CONFETTI_COLORS.length)],
        w: 6 + rnd() * 8,
        h: 10 + rnd() * 12,
        sway: (rnd() - 0.5) * 160,
      })),
      fireworks: Array.from({ length: 7 }, (_, i) => ({
        left: 8 + rnd() * 84,
        top: 8 + rnd() * 50,
        delay: 1.5 + i * 0.42 + rnd() * 0.2,
        color: FIREWORK_COLORS[i % FIREWORK_COLORS.length],
        dist: 70 + rnd() * 80,
      })),
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
      {/* 後光 */}
      <div aria-hidden className="perfect-rays" />
      <div aria-hidden className="perfect-rays perfect-rays-2" />
      <div aria-hidden className="perfect-glow" />

      {/* 花火 */}
      {fireworks.map((fw, i) => (
        <div
          key={`fw${i}`}
          aria-hidden
          className="perfect-firework"
          style={
            {
              left: `${fw.left}%`,
              top: `${fw.top}%`,
              "--delay": `${fw.delay}s`,
              "--dist": `${fw.dist}px`,
              color: fw.color,
            } as CSSProperties
          }
        >
          {Array.from({ length: 16 }, (_, k) => (
            <i key={k} style={{ "--a": `${k * 22.5}deg` } as CSSProperties} />
          ))}
        </div>
      ))}

      {/* 小判と紙吹雪 */}
      {coins.map((coin, i) => (
        <span
          key={`coin${i}`}
          aria-hidden
          className="perfect-coin font-brush"
          style={
            {
              left: `${coin.left}%`,
              width: `${coin.size}px`,
              height: `${coin.size * 1.45}px`,
              fontSize: `${coin.size * 0.55}px`,
              "--delay": `${coin.delay}s`,
              "--dur": `${coin.duration}s`,
              "--spin": `${coin.spin}s`,
            } as CSSProperties
          }
        >
          吉
        </span>
      ))}
      {confetti.map((c, i) => (
        <span
          key={`cf${i}`}
          aria-hidden
          className="perfect-confetti"
          style={
            {
              left: `${c.left}%`,
              width: `${c.w}px`,
              height: `${c.h}px`,
              background: c.color,
              "--delay": `${c.delay}s`,
              "--dur": `${c.duration}s`,
              "--sway": `${c.sway}px`,
            } as CSSProperties
          }
        />
      ))}

      {/* 本体 */}
      <div className="perfect-stage absolute inset-0 flex flex-col items-center justify-center gap-5 px-4 text-center sm:gap-7">
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
          <span className="perfect-rainbow">神業</span>
          <span className="mx-2 sm:mx-3">精度 一〇〇％ ×４</span>
          <span className="perfect-rainbow">天晴</span>
        </p>

        <p className="perfect-tap font-mincho">
          画面を押して、おみくじを開く
        </p>
      </div>

      <div aria-hidden className="perfect-flash" />
      <div aria-hidden className="perfect-border" />
    </div>
  );
}
