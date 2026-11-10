"use client";

import { useEffect, useId, useMemo, type CSSProperties } from "react";

type Props = {
  soundOn: boolean;
  onDone: () => void;
};

const GOLD = "#b8912f";
const GOLD_LIGHT = "#d9bc6a";
const SUMI = "#1c1b1f";
const SHU = "#c5162e";

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

/* ---------- 青海波（細い金線） ---------- */

const Seigaiha = ({
  r = 34,
  fill,
  stroke,
  strokeWidth = 0.9,
  className,
}: {
  r?: number;
  fill: string;
  stroke: string;
  strokeWidth?: number;
  className?: string;
}) => {
  const id = useId();
  // 下の段ほど後に描いて、上の段の裾を隠す
  const centers: [number, number][] = [
    [r, 0],
    [0, r / 2],
    [2 * r, r / 2],
    [r, r],
    [0, (3 * r) / 2],
    [2 * r, (3 * r) / 2],
  ];
  const rings = [1, 0.82, 0.64, 0.46, 0.28, 0.1];
  return (
    <svg aria-hidden className={className} width="100%" height="100%">
      <defs>
        <pattern
          id={id}
          width={2 * r}
          height={r}
          patternUnits="userSpaceOnUse"
        >
          <rect width={2 * r} height={r} fill={fill} />
          {centers.map(([cx, cy], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill={fill} />
              {rings.map((k) => (
                <circle
                  key={k}
                  cx={cx}
                  cy={cy}
                  r={r * k}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                />
              ))}
            </g>
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
};

/* ---------- エ霞 ---------- */

type Bar = [x: number, y: number, w: number];

const KASUMI_SHAPES: Record<string, { bars: Bar[]; w: number; rows: number }> = {
  a: {
    w: 520,
    rows: 4,
    bars: [
      [150, 0, 300],
      [0, 1, 360],
      [90, 2, 430],
      [230, 3, 210],
    ],
  },
  b: {
    w: 460,
    rows: 3,
    bars: [
      [120, 0, 250],
      [0, 1, 400],
      [170, 2, 290],
    ],
  },
  c: {
    w: 600,
    rows: 5,
    bars: [
      [260, 0, 220],
      [110, 1, 360],
      [0, 2, 430],
      [180, 3, 420],
      [330, 4, 190],
    ],
  },
};

const Kasumi = ({
  shape,
  filled = true,
  ground = "#d8cda8",
  className,
  style,
}: {
  shape: keyof typeof KASUMI_SHAPES;
  filled?: boolean;
  ground?: string;
  className?: string;
  style?: CSSProperties;
}) => {
  const { bars, w, rows } = KASUMI_SHAPES[shape];
  const h = 34;
  const pad = 6;
  const rect = (bar: Bar, grow: number, key: string, props: object) => (
    <rect
      key={key}
      x={bar[0] - grow + pad}
      y={bar[1] * h - grow + pad}
      width={bar[2] + grow * 2}
      height={h + grow * 2}
      rx={h / 2 + grow}
      {...props}
    />
  );
  return (
    <svg
      aria-hidden
      className={className}
      style={style}
      viewBox={`0 0 ${w + pad * 2} ${rows * h + pad * 2}`}
    >
      {/* 太らせた金 → 地色、の順に重ねて、つながった形の輪郭線だけを残す */}
      {bars.map((bar, i) => rect(bar, 2.2, `o${i}`, { fill: GOLD }))}
      {bars.map((bar, i) =>
        rect(bar, 0, `f${i}`, { fill: filled ? "#fbf8f0" : ground })
      )}
      {!filled &&
        bars.map((bar, i) => rect(bar, -5.5, `i${i}`, { fill: GOLD }))}
      {!filled &&
        bars.map((bar, i) => rect(bar, -7.2, `j${i}`, { fill: ground }))}
    </svg>
  );
};

/* ---------- 丹頂鶴（線画） ---------- */

const feather = (len: number, width: number) =>
  `M0 0 C${len * 0.28} ${-width} ${len * 0.82} ${-width * 0.9} ${len} 0 C${len * 0.82} ${width * 0.55} ${len * 0.28} ${width * 0.7} 0 0 Z`;

const Wing = ({ far = false }: { far?: boolean }) => {
  const line = "#a88a55";
  const base = far ? "#f1ece0" : "#ffffff";
  // 風切羽：前縁（上向き）ほど長い
  const primaries = Array.from({ length: 11 }, (_, i) => {
    const t = i / 10;
    return { angle: -104 + t * 46, len: 176 - t * 34, width: 13 };
  });
  // 次列風切：丹頂の黒い羽
  const secondaries = Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    return { angle: -56 + t * 34, len: 128 - t * 40, width: 12 };
  });
  const coverts = Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    return { angle: -100 + t * 74, len: 96 - t * 22, width: 11 };
  });
  const lesser = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    return { angle: -96 + t * 66, len: 56 - t * 10, width: 9 };
  });
  return (
    <g className={far ? "pf-wing pf-wing-far" : "pf-wing"}>
      <g transform="translate(206 156)">
        {secondaries.map((f, i) => (
          <path
            key={`s${i}`}
            d={feather(f.len, f.width)}
            transform={`rotate(${f.angle})`}
            fill={SUMI}
            stroke="#000"
            strokeWidth="0.6"
          />
        ))}
        {primaries.map((f, i) => (
          <path
            key={`p${i}`}
            d={feather(f.len, f.width)}
            transform={`rotate(${f.angle})`}
            fill={base}
            stroke={line}
            strokeWidth="0.8"
          />
        ))}
        {primaries.map((f, i) => (
          <path
            key={`pl${i}`}
            d={`M8 0 L${f.len - 6} 0`}
            transform={`rotate(${f.angle})`}
            stroke={line}
            strokeWidth="0.45"
            opacity="0.7"
          />
        ))}
        {coverts.map((f, i) => (
          <path
            key={`c${i}`}
            d={feather(f.len, f.width)}
            transform={`rotate(${f.angle})`}
            fill={base}
            stroke={line}
            strokeWidth="0.7"
          />
        ))}
        {lesser.map((f, i) => (
          <path
            key={`l${i}`}
            d={feather(f.len, f.width)}
            transform={`rotate(${f.angle})`}
            fill={base}
            stroke={line}
            strokeWidth="0.6"
          />
        ))}
      </g>
    </g>
  );
};

const Crane = () => {
  const line = "#a88a55";
  return (
    <svg viewBox="0 0 420 300" className="pf-crane-svg" aria-hidden>
      {/* 脚 */}
      <path
        d="M262 172 C310 176 350 186 404 204 M262 178 C312 184 352 194 400 214"
        stroke={SUMI}
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      <Wing far />
      {/* 尾羽 */}
      {[-6, 4, 14, 24].map((angle, i) => (
        <path
          key={i}
          d={feather(60 - i * 6, 8)}
          transform={`translate(250 166) rotate(${angle})`}
          fill={i < 2 ? "#fff" : SUMI}
          stroke={i < 2 ? line : "#000"}
          strokeWidth="0.7"
        />
      ))}
      {/* 首 */}
      <path
        d="M196 160 C150 158 108 140 60 116"
        stroke={line}
        strokeWidth="12.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M196 160 C150 158 108 140 60 116"
        stroke="#fff"
        strokeWidth="11"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M168 161 C136 156 104 142 66 122"
        stroke={SUMI}
        strokeWidth="5.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* 胴 */}
      <ellipse
        cx="222"
        cy="166"
        rx="60"
        ry="21"
        transform="rotate(-3 222 166)"
        fill="#fff"
        stroke={line}
        strokeWidth="0.9"
      />
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M${188 + i * 20} ${176 - i} q10 7 22 2`}
          stroke={line}
          strokeWidth="0.6"
          fill="none"
          opacity="0.8"
        />
      ))}
      {/* 頭 */}
      <path d="M50 118 L10 125 L50 122 Z" fill="#6f6a4c" stroke={SUMI} strokeWidth="0.6" />
      <ellipse cx="58" cy="116" rx="11" ry="7.6" fill="#fff" stroke={line} strokeWidth="0.9" />
      <path d="M49 111 Q58 103 68 111 Q58 108 49 111 Z" fill={SHU} />
      <circle cx="54" cy="116" r="1.4" fill={SUMI} />
      <Wing />
    </svg>
  );
};

/* ---------- 効果音 ---------- */

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

  // 落款四つ → 一太刀 → 襖が開いてドドン → 鈴の駆け上がり
  [0.15, 0.4, 0.65, 0.9].forEach((at, i) => taiko(at, 0.5 + i * 0.1));
  chime(1.3, 2637, 0.1);
  taiko(1.5, 1);
  taiko(1.66, 1);
  [587.3, 659.3, 784, 880, 987.8, 1174.7, 1318.5, 1568].forEach((f, i) =>
    chime(2.2 + i * 0.07, f)
  );
  [1174.7, 1568, 2349.3].forEach((f) => chime(2.9, f, 0.12));

  return () => {
    ctx.close().catch(() => {});
  };
};

const SEALS = ["壱", "弐", "参", "奥義"];

export default function PerfectCelebration({ soundOn, onDone }: Props) {
  useEffect(() => {
    const stop = soundOn ? playFanfare() : () => {};
    const timer = setTimeout(onDone, 11000);
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

  const { flakes, rays } = useMemo(() => {
    const rnd = mulberry32(2026);
    return {
      flakes: Array.from({ length: 60 }, () => ({
        left: rnd() * 100,
        delay: 2.2 + rnd() * 6,
        duration: 5 + rnd() * 5,
        size: 2.5 + rnd() * 5.5,
        sway: (rnd() - 0.5) * 120,
      })),
      rays: Array.from({ length: 120 }, (_, i) => ({
        angle: i * 3,
        inner: 0.2,
        outer: i % 2 ? 0.78 : 1,
      })),
    };
  }, []);

  const seal = (label: string, i: number) => (
    <div
      key={label}
      className="pf-seal font-brush"
      style={{ "--delay": `${0.15 + i * 0.25}s` } as CSSProperties}
    >
      <span className="pf-seal-main">{label}</span>
      <span className="pf-seal-sub">必中</span>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="全弾必中の特別演出"
      onClick={onDone}
      className="pf-root fixed inset-0 z-[80] cursor-pointer select-none overflow-hidden"
    >
      {/* ===== 襖の奥：初日の出 ===== */}
      <div className="pf-scene">
        <div className="pf-panel">
          <Seigaiha fill="#fbf8f0" stroke={GOLD_LIGHT} />
        </div>

        {/* 後光（細い金線） */}
        <svg aria-hidden className="pf-rays" viewBox="-1 -1 2 2">
          {rays.map((ray) => (
            <line
              key={ray.angle}
              x1={ray.inner}
              y1="0"
              x2={ray.outer}
              y2="0"
              transform={`rotate(${ray.angle})`}
              stroke={GOLD}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* 広がる金の輪 */}
        <div aria-hidden className="pf-ring" />
        <div aria-hidden className="pf-ring pf-ring-2" />
        <div aria-hidden className="pf-ring pf-ring-3" />

        {/* 日輪 */}
        <div aria-hidden className="pf-sun-wrap">
          <div className="pf-sun" />
        </div>

        <Kasumi shape="a" filled={false} className="pf-kasumi pf-kasumi-1" />
        <Kasumi shape="c" className="pf-kasumi pf-kasumi-2" />
        <Kasumi shape="b" className="pf-kasumi pf-kasumi-3" />
        <Kasumi shape="a" filled={false} className="pf-kasumi pf-kasumi-4" />

        {/* 富士 */}
        <svg aria-hidden className="pf-fuji" viewBox="0 0 1200 440">
          <defs>
            <linearGradient id="pfFuji" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2a3358" />
              <stop offset="1" stopColor="#171c33" />
            </linearGradient>
            <clipPath id="pfFujiClip">
              <path d="M0 440 C210 414 380 300 510 96 L536 62 Q600 44 664 62 L690 96 C820 300 990 414 1200 440 Z" />
            </clipPath>
          </defs>
          <path
            d="M0 440 C210 414 380 300 510 96 L536 62 Q600 44 664 62 L690 96 C820 300 990 414 1200 440 Z"
            fill="url(#pfFuji)"
            stroke={GOLD}
            strokeWidth="2"
          />
          {/* 裾の金のたなびき線 */}
          <g clipPath="url(#pfFujiClip)" stroke={GOLD_LIGHT} strokeWidth="1" opacity="0.55">
            {Array.from({ length: 16 }, (_, i) => (
              <line key={i} x1="0" x2="1200" y1={250 + i * 12} y2={250 + i * 12} />
            ))}
          </g>
          {/* 冠雪 */}
          <path
            d="M510 96 L536 62 Q600 44 664 62 L690 96 L722 146 L690 128 L668 172 L636 132 L600 186 L564 132 L532 172 L510 128 L478 146 Z"
            fill="#fbf8f0"
            stroke={GOLD}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>

        {/* 波 */}
        <div className="pf-sea">
          <Seigaiha r={30} fill="#fbf8f0" stroke={GOLD} strokeWidth={1} />
        </div>

        {/* 鶴 */}
        <div aria-hidden className="pf-crane pf-crane-1">
          <Crane />
        </div>
        <div aria-hidden className="pf-crane pf-crane-2">
          <Crane />
        </div>
        <div aria-hidden className="pf-crane pf-crane-3">
          <Crane />
        </div>

        {/* 金砂子 */}
        {flakes.map((flake, i) => (
          <span
            key={i}
            aria-hidden
            className="pf-flake"
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

        {/* 題字 */}
        <div className="pf-title-wrap">
          <h2 className="pf-title font-brush">全弾必中</h2>
          <span aria-hidden className="pf-title-ghost font-brush">
            全弾必中
          </span>
          <p className="pf-sub font-mincho">
            <i />
            精度 一〇〇％ 四連
            <i />
          </p>
        </div>

        <div aria-hidden className="pf-tanzaku font-brush">
          <span>初日の出</span>
          <b>吉</b>
        </div>

        <p className="pf-tap font-mincho">画面を押して、おみくじを開く</p>
        <div aria-hidden className="pf-frame" />
      </div>

      {/* ===== 襖 ===== */}
      <div className="pf-door pf-door-l">
        <Seigaiha r={38} fill="#14182c" stroke="rgba(201,164,74,0.42)" />
        <div className="pf-door-kasumi">
          <Kasumi shape="b" filled={false} ground="#14182c" />
        </div>
        <div className="pf-door-edge" />
        <div className="pf-door-handle" />
        <div className="pf-seals">
          {seal(SEALS[0], 0)}
          {seal(SEALS[1], 1)}
        </div>
      </div>
      <div className="pf-door pf-door-r">
        <Seigaiha r={38} fill="#14182c" stroke="rgba(201,164,74,0.42)" />
        <div className="pf-door-kasumi">
          <Kasumi shape="b" filled={false} ground="#14182c" />
        </div>
        <div className="pf-door-edge" />
        <div className="pf-door-handle" />
        <div className="pf-seals">
          {seal(SEALS[2], 2)}
          {seal(SEALS[3], 3)}
        </div>
      </div>

      {/* 一太刀 */}
      <div aria-hidden className="pf-slash" />
      <div aria-hidden className="pf-flash" />
    </div>
  );
}
