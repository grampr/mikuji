"use client";
import type { JSX } from "react";

export const dynamic = "force-dynamic";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import nextDynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Hand, RefreshCw, Share2, Volume2, VolumeX } from "lucide-react";
import type { FoldOmikujiData } from "./FoldOmikuji";
import {
  DETAIL_LABELS,
  FORTUNE_RANKS,
  LUCKY_COLORS,
  LUCKY_DIRECTIONS,
  LUCKY_ITEMS,
  type DetailKey,
  type FortuneTone,
} from "./fortunes";

// three.js を使う演出はPCで開いたときだけ読み込む
const FoldOmikuji = nextDynamic(() => import("./FoldOmikuji"), { ssr: false });

const DESKTOP_QUERY = "(min-width: 1024px) and (pointer: fine)";
const subscribeDesktop = (onChange: () => void) => {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};
const getIsDesktop = () => window.matchMedia(DESKTOP_QUERY).matches;
const getIsDesktopServer = () => false;

const TONE_HEX: Record<FortuneTone, string> = {
  great: "#b91c1c",
  good: "#b91c1c",
  middle: "#92400e",
  bad: "#334155",
};

type FortuneResult = {
  rank: string;
  minScore: number;
  tone: FortuneTone;
  seed: number;
  ticketNumber: number;
  waka: string;
  translation: string;
  details: Record<DetailKey, string>;
  lucky: {
    color: string;
    item: string;
    direction: string;
  };
};

const TONE_STYLES: Record<
  FortuneTone,
  { border: string; text: string; stamp: string; stampBox: string }
> = {
  great: {
    border: "border-red-700",
    text: "text-red-700",
    stamp: "border-red-600 text-red-600",
    stampBox: "border-red-700 text-red-700",
  },
  good: {
    border: "border-red-500",
    text: "text-red-600",
    stamp: "border-red-500 text-red-500",
    stampBox: "border-red-600 text-red-700",
  },
  middle: {
    border: "border-amber-700",
    text: "text-amber-800",
    stamp: "border-amber-700 text-amber-700",
    stampBox: "border-amber-700 text-amber-900",
  },
  bad: {
    border: "border-slate-700",
    text: "text-slate-700",
    stamp: "border-slate-600 text-slate-600",
    stampBox: "border-slate-700 text-slate-800",
  },
};

const KANJI_DIGITS = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

// 1〜100 を「三十七」「百」のような漢数字に変換
const toKanjiNumber = (n: number) => {
  if (n >= 100) return "百";
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const tensStr = tens === 0 ? "" : tens === 1 ? "十" : `${KANJI_DIGITS[tens]}十`;
  const onesStr = ones === 0 ? "" : KANJI_DIGITS[ones];
  return tensStr + onesStr || KANJI_DIGITS[0];
};

const createRng = (value: number) => {
  let t = value;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

// 札番号（seed）から毎回同じ結果を再現できるように、すべて seed 由来の乱数で選ぶ
const pickFortune = (
  avgScore: number,
  rankOverride?: string | null,
  seedOverride?: number | null
): FortuneResult => {
  const ranked =
    (rankOverride
      ? FORTUNE_RANKS.find((fortune) => fortune.rank === rankOverride)
      : null) ??
    FORTUNE_RANKS.find((fortune) => avgScore >= fortune.minScore) ??
    FORTUNE_RANKS[FORTUNE_RANKS.length - 1];

  const seed =
    typeof seedOverride === "number" &&
    Number.isFinite(seedOverride) &&
    seedOverride >= 0
      ? seedOverride
      : Math.floor(Math.random() * 10000);

  const rng = createRng(seed);
  const pick = <T,>(options: T[]): T =>
    options[Math.floor(rng() * options.length)] ?? options[0];

  const base = pick(ranked.items);
  const items = ranked.items;

  return {
    rank: ranked.rank,
    minScore: ranked.minScore,
    tone: ranked.tone,
    seed,
    ticketNumber: Math.floor(rng() * 100) + 1,
    waka: base.waka,
    translation: base.translation,
    details: {
      wish: pick(items.map((item) => item.details.wish)),
      wait: pick(items.map((item) => item.details.wait)),
      love: pick(items.map((item) => item.details.love)),
      battle: pick(items.map((item) => item.details.battle)),
      lost: pick(ranked.extras.lost),
      travel: pick(ranked.extras.travel),
      business: pick(ranked.extras.business),
      study: pick(ranked.extras.study),
      health: pick(ranked.extras.health),
      money: pick(ranked.extras.money),
    },
    lucky: {
      color: pick(LUCKY_COLORS),
      item: pick(LUCKY_ITEMS),
      direction: pick(LUCKY_DIRECTIONS),
    },
  };
};

type ViewState = "title" | "game" | "shaking" | "result";

const SakuraEffect = () => {
  const [petals, setPetals] = useState<
    | {
        size: number;
        left: number;
        duration: number;
        delay: number;
        radius: string;
      }[]
    | null
  >(null);

  useEffect(() => {
    const generated = Array.from({ length: 20 }, () => ({
      size: Math.random() * 10 + 5,
      left: Math.random() * 100,
      duration: Math.random() * 5 + 5,
      delay: Math.random() * 5,
      radius: `${Math.random() * 40 + 40}% ${Math.random() * 40 + 20}% ${
        Math.random() * 40 + 20
      }% ${Math.random() * 40 + 20}% / ${Math.random() * 40 + 20}% ${
        Math.random() * 40 + 20
      }% ${Math.random() * 40 + 20}% ${Math.random() * 40 + 20}%`,
    }));
    setPetals(generated);
  }, []);

  if (!petals) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {petals.map((petal, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-pink-300 opacity-60"
          style={{
            width: `${petal.size}px`,
            height: `${petal.size}px`,
            left: `${petal.left}vw`,
            animation: `fall ${petal.duration}s linear infinite`,
            animationDelay: `-${petal.delay}s`,
            borderRadius: petal.radius,
          }}
        />
      ))}
    </div>
  );
};

function HomeContent() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<ViewState>("title");
  const [round, setRound] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [gaugeValue, setGaugeValue] = useState(50);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [slashPos, setSlashPos] = useState<{ x: string; y: string } | null>(
    null
  );
  const [finalResult, setFinalResult] = useState<
    (FortuneResult & { avgScore: number }) | null
  >(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [showTie, setShowTie] = useState(false);
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    getIsDesktop,
    getIsDesktopServer
  );
  const tieData = useMemo<FoldOmikujiData | null>(() => {
    if (!finalResult) return null;
    return {
      rank: finalResult.rank,
      rankColor: TONE_HEX[finalResult.tone],
      ticket: toKanjiNumber(finalResult.ticketNumber),
      waka: finalResult.waka,
      translation: finalResult.translation,
      details: (Object.keys(DETAIL_LABELS) as DetailKey[]).map((key) => ({
        label: DETAIL_LABELS[key],
        value: finalResult.details[key],
      })),
    };
  }, [finalResult]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const speedRef = useRef(1);
  const directionRef = useRef<1 | -1>(1);

  const clearSharedParams = () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState({}, "", url.toString());
  };

  useEffect(() => {
    if (!searchParams) return;
    // 共有URLは rank / score / seed（旧形式の 運勢 / 精度 / 札 も受け付ける）
    const rank = searchParams.get("rank") ?? searchParams.get("運勢");
    const scoreStr = searchParams.get("score") ?? searchParams.get("精度");
    const sig = searchParams.get("sig");
    const seedParam = searchParams.get("seed") ?? searchParams.get("札");
    if (!rank || !scoreStr || !sig) return;
    const scoreNum = Number.parseFloat(scoreStr);
    if (Number.isNaN(scoreNum)) return;
    const variantNum =
      seedParam !== null ? Number.parseInt(seedParam, 10) : null;

    const verify = async () => {
      try {
        const res = await fetch("/api/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rank,
            score: scoreNum.toFixed(1),
            seed: variantNum ?? 0,
            sig,
          }),
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!json.ok) return;
        const matched = pickFortune(scoreNum, rank, variantNum);
        setFinalResult({ ...matched, avgScore: scoreNum });
        setView("result");
      } catch (err) {
        return;
      }
    };

    verify();
  }, [searchParams]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!isAudioOn) return;
    audio.play().catch(() => setIsAudioOn(false));
  }, [isAudioOn]);

  const animateGauge = (timestamp: number) => {
    if (lastTimeRef.current === null) {
      lastTimeRef.current = timestamp;
    }
    const delta = (timestamp - lastTimeRef.current) / 1000; // seconds
    const clampedDelta = Math.min(delta, 0.1); // avoid huge jumps when tab was inactive
    lastTimeRef.current = timestamp;

    // Convert to percent-per-second so different refresh rates feel the same.
    const percentPerSecond = speedRef.current * 120;
    const step = percentPerSecond * clampedDelta * directionRef.current;

    setGaugeValue((prev) => {
      let next = prev + step;
      if (next >= 100 || next <= 0) {
        directionRef.current = (directionRef.current * -1) as 1 | -1;
        next = next >= 100 ? 100 : 0;
      }
      return next;
    });
    requestRef.current = requestAnimationFrame(animateGauge);
  };

  useEffect(() => {
    if (isAnimating) {
      const baseSpeed = 2.0;
      speedRef.current = baseSpeed + round * 1.2;
      lastTimeRef.current = null;
      requestRef.current = requestAnimationFrame(animateGauge);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isAnimating, round]);

  const startRound = () => {
    setGaugeValue(Math.random() * 100);
    setSlashPos(null);
    setIsAnimating(true);
    directionRef.current = 1;
  };

  const startGame = () => {
    setScores([]);
    setRound(0);
    setView("game");
    clearSharedParams();
    startRound();
  };

  const finishGame = (finalScores: number[]) => {
    const avgScore =
      finalScores.reduce((acc, value) => acc + value, 0) / finalScores.length;
    const result = pickFortune(avgScore);
    setFinalResult({ ...result, avgScore });
    setView("shaking");
    setTimeout(() => {
      setView("result");
    }, 2500);
  };

  const handleStop = () => {
    if (!isAnimating) return;
    setIsAnimating(false);

    const error = Math.abs(50 - gaugeValue);
    let score = Math.max(0, 100 - error * 2);
    if (error < 2) score = 100;

    const newScores = [...scores, score];
    setScores(newScores);
    setSlashPos({ x: "50%", y: "50%" });

    setTimeout(() => {
      if (round < 3) {
        setRound((current) => current + 1);
        startRound();
      } else {
        finishGame(newScores);
      }
    }, 1000);
  };

  const roundNames = ["壱の太刀", "弐の太刀", "参の太刀", "奥義"];

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio
        .play()
        .then(() => setIsAudioOn(true))
        .catch(() => setIsAudioOn(false));
    } else {
      audio.pause();
      setIsAudioOn(false);
    }
  };

  let content: JSX.Element | null = null;

  if (view === "title") {
    content = (
      <div className="washi-texture relative flex min-h-screen flex-col items-center justify-center overflow-hidden text-[#1f2937]">
        <SakuraEffect />
        <div className="waframe z-10 mx-4 max-w-md px-8 py-10 text-center">
          <span className="absolute left-6 top-6 h-3 w-3 rounded-full bg-red-700/30" />
          <span className="absolute right-6 top-6 h-3 w-3 rounded-full bg-red-700/30" />
          <span className="absolute bottom-6 left-6 h-3 w-3 rounded-full bg-red-700/30" />
          <span className="absolute bottom-6 right-6 h-3 w-3 rounded-full bg-red-700/30" />
          <p className="font-mincho mb-2 text-red-700 tracking-widest">
            集中力と反射神経で運を掴め
          </p>
          <h1 className="font-brush text-5xl leading-tight text-black drop-shadow-sm md:text-6xl">
            一撃必中
            <br />
            <span className="text-3xl md:text-4xl">新春おみくじ</span>
            <br />
            <span className="font-mincho text-2xl text-red-800">二〇二六</span>
          </h1>
          <div className="font-mincho mt-6 space-y-4">
            <p className="text-sm text-gray-600">
              全四回勝負。
              <br />
              流れる気を、中心（真）で断ち切れ。
            </p>
            <button
              onClick={startGame}
              className="rounded bg-red-700 px-10 py-3 text-xl font-bold tracking-widest text-white shadow-lg transition hover:scale-105 hover:bg-red-600"
            >
              いざ、尋常に
            </button>
          </div>
        </div>
        <div className="absolute bottom-4 text-xs text-gray-400 font-mincho">
          © 2026 Ultimate Omikuji
        </div>
      </div>
    );
  }

  if (view === "game") {
    content = (
      <div
        className="washi-texture relative flex min-h-screen select-none flex-col items-center justify-center overflow-hidden cursor-pointer"
        onPointerDown={handleStop}
      >
        <SakuraEffect />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
          <span className="font-brush text-[20vw] text-black">
            {roundNames[round].charAt(0)}
          </span>
        </div>

        <div className="z-10 w-full max-w-2xl px-6">
          <div className="mb-12 text-center">
            <h2 className="font-brush text-4xl">{roundNames[round]}</h2>
            <p className="font-mincho text-gray-600">
              画面をタップして中心で止めよ
            </p>
          </div>

          <div className="relative h-16 w-full overflow-hidden rounded border-2 border-gray-800 bg-gray-300 shadow-inner">
            <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
            <div className="absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 bg-red-100/30" />
            <div
              className="absolute inset-y-0 w-4 bg-black shadow-lg"
              style={{
                left: `${gaugeValue}%`,
                transform: "translateX(-50%)",
                transition: isAnimating ? "none" : "transform 0.1s ease-out",
              }}
            >
              <div className="h-full w-full bg-gradient-to-r from-gray-800 via-black to-gray-800" />
            </div>
          </div>

          {!isAnimating && scores[round] !== undefined && (
            <div className="mt-8 text-center animate-bounce">
              <span className="font-brush text-5xl text-red-700 drop-shadow-md">
                {scores[round] === 100
                  ? "皆伝"
                  : scores[round] > 80
                    ? "見事"
                    : scores[round] > 50
                      ? "凡庸"
                      : "無念"}
              </span>
              <p className="font-mincho mt-2 text-gray-500">
                精度: {Math.floor(scores[round])}%
              </p>
            </div>
          )}
        </div>

        {slashPos && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
            <div className="slash-effect absolute h-2 w-[150vw] bg-white shadow-[0_0_20px_white]" />
            <div className="slash-effect absolute h-1 w-[150vw] bg-red-500 delay-75 mix-blend-multiply" />
          </div>
        )}
      </div>
    );
  }

  if (view === "shaking") {
    content = (
      <div className="washi-texture flex min-h-screen flex-col items-center justify-center overflow-hidden">
        <SakuraEffect />
        <div className="flex flex-col items-center gap-4">
          <h2 className="font-brush text-3xl text-gray-800">
            結果をお導き中
          </h2>
          <div className="flex items-center gap-3 text-xl text-red-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-red-600"
              style={{ animationDelay: "0.2s" }}
            />
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-red-600"
              style={{ animationDelay: "0.4s" }}
            />
          </div>
          <p className="font-mincho text-sm text-gray-600">
            しばしお待ちください
          </p>
        </div>
      </div>
    );
  }

  if (view === "result" && finalResult) {
    const tone = TONE_STYLES[finalResult.tone];
    const phrases = finalResult.waka.split(/\s+/).filter(Boolean);

    const showShareMessage = (message: string) => {
      setShareMessage(message);
      setTimeout(() => setShareMessage(null), 3000);
    };

    const shareResult = async () => {
      if (typeof window === "undefined") return;
      const payload = {
        rank: finalResult.rank,
        score: finalResult.avgScore.toFixed(1),
        seed: finalResult.seed,
      };

      let sig: string | null = null;
      try {
        const res = await fetch("/api/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const json = await res.json();
          sig = json.sig ?? null;
        }
      } catch {
        sig = null;
      }

      const shareUrl = new URL(window.location.origin);
      shareUrl.searchParams.set("rank", payload.rank);
      shareUrl.searchParams.set("score", payload.score);
      shareUrl.searchParams.set("seed", String(payload.seed));
      if (sig) {
        shareUrl.searchParams.set("sig", sig);
      }

      const text = `【一撃必中・新春おみくじ2026】\n私の運勢は「${payload.rank}」（精度: ${payload.score}%）でした。\n集中力で運命を切り拓け！ #一撃必中おみくじ`;
      const shareText = `${text}\n${shareUrl.toString()}`;

      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ text, url: shareUrl.toString() });
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(shareText);
        showShareMessage("結果をコピーしました。SNSでシェアしてください。");
      } catch {
        window.prompt("以下をコピーして共有してください", shareText);
      }
    };

    const detailKeys = Object.keys(DETAIL_LABELS) as DetailKey[];

    content = (
      <div className="washi-texture flex min-h-screen flex-col items-center px-4 pb-10 pt-20">
        <SakuraEffect />
        <div className="omikuji-slip relative z-10 w-full max-w-md animate-fade-in-up">
          <div className="omikuji-frame px-3 pb-4 pt-3 sm:px-5 sm:pb-6 sm:pt-4">
            {/* 札の頭：社名・御神籤・札番号 */}
            <header className="flex items-center justify-between border-b-2 border-double border-[#b91c1c] pb-2">
              <span className="font-mincho text-[11px] tracking-widest text-[#7f1d1d]">
                令和八年
                <br />
                新春
              </span>
              <h2 className="font-brush text-3xl tracking-[0.4em] text-[#b91c1c] sm:text-4xl">
                御神籤
              </h2>
              <span className="font-mincho text-right text-[11px] tracking-widest text-[#7f1d1d]">
                一撃必中
                <br />
                第{toKanjiNumber(finalResult.ticketNumber)}番
              </span>
            </header>

            {/* 上段：運勢・和歌・解説（右から左へ読む） */}
            <section className="flex flex-row-reverse items-stretch justify-center gap-4 py-5 sm:gap-10">
              <div className="flex shrink-0 flex-col items-center gap-2">
                <div
                  className={`vertical-rl flex items-center justify-center border-[3px] border-double px-1 py-3 sm:px-2 ${tone.stampBox}`}
                >
                  <span className="font-brush text-4xl leading-none tracking-[0.15em] sm:text-5xl">
                    {finalResult.rank}
                  </span>
                </div>
                <span className="mt-auto whitespace-nowrap font-mincho text-[10px] text-gray-500">
                  精度 {finalResult.avgScore.toFixed(1)}%
                </span>
              </div>

              <div className="vertical-rl shrink-0 font-brush text-lg leading-[1.7] text-gray-900 sm:text-2xl">
                {phrases.map((phrase, i) => (
                  <span
                    key={i}
                    className="block whitespace-nowrap"
                    style={{
                      paddingInlineStart: i >= 3 ? "1.5em" : "0.25em",
                      marginBlockStart: i === 3 ? "0.4em" : 0,
                    }}
                  >
                    {phrase}
                  </span>
                ))}
              </div>

            </section>

            {/* 解説：幅を固定した縦書きブロック（右から左へ折り返す） */}
            <section className="border-y border-dashed border-[#b91c1c]/50 py-3">
              <p className="vertical-rl mx-auto h-[120px] w-full font-mincho text-[13px] leading-[1.9] text-gray-700">
                <span className="font-bold text-[#b91c1c]">【解説】</span>
                {finalResult.translation}
              </p>
            </section>

            {/* 下段：各項目を縦の欄で並べる */}
            <section className="flex flex-row-reverse flex-wrap justify-center border-b border-[#b91c1c]/60 py-3">
              {detailKeys.map((key) => (
                <div
                  key={key}
                  className="flex w-[28px] flex-col items-center border-l border-[#b91c1c]/25 py-1 first:border-l-0 sm:w-[36px]"
                >
                  <span className="vertical-rl bg-[#b91c1c] px-0.5 py-1 font-mincho text-[12px] font-bold tracking-widest text-white">
                    {DETAIL_LABELS[key]}
                  </span>
                  <span className="vertical-rl mt-2 whitespace-nowrap font-mincho text-[13px] leading-[1.5] sm:text-[15px] text-gray-800">
                    {finalResult.details[key]}
                  </span>
                </div>
              ))}
            </section>

            {/* 吉方位・幸運の色・幸運の品 */}
            <section className="flex items-center gap-3 pt-3">
              <dl className="grid min-w-0 flex-1 grid-cols-3 gap-1.5 font-mincho">
                {[
                  { label: "吉方位", value: finalResult.lucky.direction },
                  { label: "幸運の色", value: finalResult.lucky.color },
                  { label: "幸運の品", value: finalResult.lucky.item },
                ].map((lucky) => (
                  <div
                    key={lucky.label}
                    className="border border-[#b91c1c]/40 px-1 py-1.5 text-center"
                  >
                    <dt className="text-[10px] tracking-widest text-[#b91c1c]">
                      {lucky.label}
                    </dt>
                    <dd className="mt-0.5 text-[13px] font-bold text-gray-800">
                      {lucky.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div
                aria-hidden
                className="omikuji-seal flex h-14 w-14 shrink-0 -rotate-6 items-center justify-center"
              >
                <span className="font-brush text-center text-[13px] leading-tight text-white">
                  一撃
                  <br />
                  必中
                </span>
              </div>
            </section>
          </div>
        </div>


        <div className="z-10 mt-8 flex w-full max-w-md flex-col justify-center gap-4 sm:max-w-2xl sm:flex-row">
          <button
            onClick={() => {
              clearSharedParams();
              setView("title");
            }}
            className="flex items-center justify-center gap-2 rounded bg-gray-800 px-6 py-3 font-mincho text-white shadow transition hover:bg-gray-700"
          >
            <RefreshCw size={18} /> もう一度挑む
          </button>
          {isDesktop && (
            <button
              onClick={() => setShowTie(true)}
              className="flex items-center justify-center gap-2 rounded bg-amber-800 px-6 py-3 font-mincho text-white shadow transition hover:bg-amber-700"
            >
              <Hand size={18} /> 手に取って折る
            </button>
          )}
          <button
            onClick={shareResult}
            className="flex items-center justify-center gap-2 rounded bg-red-700 px-6 py-3 font-mincho text-white shadow transition hover:bg-red-600"
          >
            <Share2 size={18} /> 結果を共有
          </button>
        </div>
        {isDesktop && showTie && tieData && (
          <FoldOmikuji data={tieData} onClose={() => setShowTie(false)} />
        )}
        {shareMessage && (
          <div
            role="status"
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900/90 px-5 py-2 font-mincho text-sm text-white shadow-lg"
          >
            {shareMessage}
          </div>
        )}
      </div>
    );
  }
  return (
    <>
      <audio ref={audioRef} src="/syougatu.wav" loop preload="auto" />
      <button
        type="button"
        onClick={toggleAudio}
        aria-pressed={isAudioOn}
        className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-red-800 shadow-lg backdrop-blur transition hover:-translate-y-0.5"
      >
        {isAudioOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
        {isAudioOn ? "BGM ON" : "BGM OFF"}
      </button>
      <Suspense fallback={null}>{content}</Suspense>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
