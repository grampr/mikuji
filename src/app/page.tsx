"use client";
import type { JSX } from "react";

export const dynamic = "force-dynamic";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw, Share2, Volume2, VolumeX } from "lucide-react";

type FortuneItem = {
  waka: string;
  translation: string;
  details: {
    wish: string;
    wait: string;
    love: string;
    battle: string;
  };
};

type FortuneRank = {
  rank: string;
  minScore: number;
  items: FortuneItem[];
};

type FortuneResult = {
  waka: string;
  translation: string;
  details: {
    wish: string;
    wait: string;
    love: string;
    battle: string;
  };
  rank: string;
  minScore: number;
  seed: number;
};

type ViewState = "title" | "game" | "shaking" | "result";

const FORTUNE_RANKS: FortuneRank[] = [
  {
    rank: "大吉",
    minScore: 90,
    items: [
      {
        waka: "ひさかたの 光のどけき 春の日に 静心なく 花の散るらむ",
        translation:
          "日の光がのどかな春の日に、なぜ桜の花は落ち着きなく散ってしまうのだろうか。（勢いが頂点）",
        details: {
          wish: "思うがままに叶う。好機を逃すな。",
          wait: "音もなく来る。笑顔で迎えよ。",
          love: "情熱的に進めば結ばれる。",
          battle: "一撃必勝。迷わず進め。",
        },
      },
      {
        waka: "天つ風 雲の通ひ路 吹きとぢよ 乙女の姿 しばしとどめむ",
        translation:
          "天の風よ、雲の道を閉じて乙女の姿をしばし留めてほしい。（好機を留める力あり）",
        details: {
          wish: "願いは成就。動けば叶う。",
          wait: "良き知らせが届く。",
          love: "縁が強く結ばれる。",
          battle: "攻めが吉。主導権を握れ。",
        },
      },
      {
        waka: "君がため 春の野に出でて 若菜摘む わが衣手に 雪は降りつつ",
        translation:
          "あなたのために春野で若菜を摘む。袖に雪が降り積もる。（努力が報われる）",
        details: {
          wish: "努力が実る。諦めるな。",
          wait: "会える。連絡が来る。",
          love: "誠実さが実を結ぶ。",
          battle: "勝利が近い。押し切れ。",
        },
      },
      {
        waka: "あさぼらけ 有明の月と 見るまでに 吉野の里に 降れる白雪",
        translation:
          "夜明けの有明の月かと思うほど、吉野に白雪が降り積もる。（清らかな吉兆）",
        details: {
          wish: "願いは速やかに成る。",
          wait: "吉報あり。",
          love: "進展は早い。",
          battle: "追い風あり。勝つ。",
        },
      },
      {
        waka: "桜花 ちりぬる風の なごりには 水なき空に 波ぞ立ちける",
        translation:
          "桜が散った後の風に、水のない空に波が立つようだ。（余韻までも幸運）",
        details: {
          wish: "願いは叶う。勢いが続く。",
          wait: "良き人が来る。",
          love: "心が通じ合う。",
          battle: "最後まで気を抜くな。",
        },
      },
    ],
  },
  {
    rank: "中吉",
    minScore: 75,
    items: [
      {
        waka: "人はいさ 心も知らず ふるさとは 花ぞ昔の 香ににほひける",
        translation:
          "人の心はわからないが、故郷の花は昔の香りのまま。（積み重ねが力）",
        details: {
          wish: "焦らずとも叶う。日々の積重ねよし。",
          wait: "便りあり。気長に待て。",
          love: "誠実さが鍵。",
          battle: "油断大敵。足元を固めよ。",
        },
      },
      {
        waka: "心あてに 折らばや折らむ 初霜の 置きまどはせる 白菊の花",
        translation:
          "当てずっぽうで折るなら、初霜に惑う白菊を折ろう。（迷いは慎重さへ）",
        details: {
          wish: "迷いは慎重に解ける。",
          wait: "ゆっくり来る。",
          love: "様子見が吉。",
          battle: "慎重に攻めること。",
        },
      },
      {
        waka: "秋の田の かりほの庵の 苫をあらみ わが衣手は 露にぬれつつ",
        translation:
          "秋の田の庵の苫が粗いので、衣の袖は露で濡れる。（小さな苦労はある）",
        details: {
          wish: "一手間かかるが叶う。",
          wait: "知らせは遅れて来る。",
          love: "小さな試練あり。",
          battle: "備えを整えよ。",
        },
      },
      {
        waka: "有明の つれなく見えし 別れより 暁ばかり 憂きものはなし",
        translation:
          "冷たく見えた別れ以来、夜明けほど憂いはない。（時が解決する）",
        details: {
          wish: "時が整えば成る。",
          wait: "薄いが来る。",
          love: "時間が育てる。",
          battle: "焦るな。",
        },
      },
      {
        waka: "山川に 風のかけたる しがらみは 流れもあへぬ もみぢなりけり",
        translation:
          "山川に風がかけた柵に、紅葉が流れ着く。（道は残る）",
        details: {
          wish: "道筋は見える。",
          wait: "便りあり。",
          love: "縁は続く。",
          battle: "道を選べば勝つ。",
        },
      },
    ],
  },
  {
    rank: "小吉",
    minScore: 60,
    items: [
      {
        waka: "ちはやぶる 神代もきかず 竜田川 からくれなゐに 水くくるとは",
        translation:
          "竜田川が紅葉で真っ赤に染まるとは。（変化の兆し）",
        details: {
          wish: "少し遅れるが叶う。",
          wait: "来るが遅い。",
          love: "今は耐える時。",
          battle: "冷静さを欠けば敗れる。",
        },
      },
      {
        waka: "奥山に 紅葉踏み分け 鳴く鹿の 声聞く時ぞ 秋は悲しき",
        translation:
          "奥山で鹿の声を聞くと、秋は哀しくなる。（静かな気配に耳を）",
        details: {
          wish: "小さな兆しを拾え。",
          wait: "知らせは小さく来る。",
          love: "心の距離に注意。",
          battle: "隙を見せるな。",
        },
      },
      {
        waka: "夏の夜は まだ宵ながら 明けぬるを 雲のいづこに 月宿るらむ",
        translation:
          "夏の夜はまだ宵なのに明けてしまう。月は雲のどこに宿るのか。（早合点注意）",
        details: {
          wish: "急がず進め。",
          wait: "時を置けば来る。",
          love: "焦りは禁物。",
          battle: "読み違いに注意。",
        },
      },
      {
        waka: "白露を 風の吹きしく 秋の野は つらぬきとめぬ 玉ぞ散りける",
        translation:
          "白露が風に散る秋の野は、玉が散るようだ。（儚さの中の希望）",
        details: {
          wish: "叶うが波がある。",
          wait: "来るが不安定。",
          love: "言葉が大事。",
          battle: "守りを意識。",
        },
      },
      {
        waka: "花さそふ 嵐の庭の 雪ならで ふりゆくものは わが身なりけり",
        translation:
          "嵐の庭に散るのは雪ではなく我が身。（身の整理が先）",
        details: {
          wish: "整えることで叶う。",
          wait: "遅いが来る。",
          love: "焦らず整えよ。",
          battle: "慎重さが勝利。",
        },
      },
    ],
  },
  {
    rank: "吉",
    minScore: 50,
    items: [
      {
        waka: "春過ぎて 夏来にけらし 白妙の 衣ほすてふ 天の香具山",
        translation:
          "春が過ぎて夏が来たようだ。（運気は移り変わる）",
        details: {
          wish: "今は叶い難し。時を待て。",
          wait: "来ない可能性あり。",
          love: "高望みは禁物。",
          battle: "守りに徹するのが吉。",
        },
      },
      {
        waka: "風吹けば 花の香ぞする 山里は まだ雪残る 夕暮れの空",
        translation:
          "風に花の香が混じる。山里には雪が残る。（少しずつ好転）",
        details: {
          wish: "小さな兆しあり。",
          wait: "連絡が来る。",
          love: "ゆっくり進め。",
          battle: "機を待て。",
        },
      },
      {
        waka: "月見れば ちぢにものこそ 悲しけれ 我が身ひとつの 秋にはあらねど",
        translation:
          "月を見ると物悲しい。（心が揺れる時）",
        details: {
          wish: "迷いを断て。",
          wait: "遅れて来る。",
          love: "素直さが鍵。",
          battle: "気持ちを整えよ。",
        },
      },
      {
        waka: "紅葉ばの ちりぬるを見て もろともに かへる人こそ あはれなりけれ",
        translation:
          "紅葉が散るのを見て共に帰る人は情が深い。（縁が残る）",
        details: {
          wish: "縁に助けられる。",
          wait: "知人から便り。",
          love: "穏やかに深まる。",
          battle: "協力が勝機。",
        },
      },
      {
        waka: "山風に こぼるる花の いとどしく 名残の色は 目に残りけり",
        translation:
          "山風に花がこぼれる。名残の色が目に残る。（余韻が力になる）",
        details: {
          wish: "小さく叶う。",
          wait: "ゆっくり来る。",
          love: "気配りが吉。",
          battle: "落ち着いて進め。",
        },
      },
    ],
  },
  {
    rank: "末吉",
    minScore: 40,
    items: [
      {
        waka: "風吹けば 沖つ白波 たつた山 夜半にや君が ひとり越ゆらむ",
        translation:
          "風が吹き沖に白波が立つ。（慎重な歩みが吉）",
        details: {
          wish: "遅れて叶う。",
          wait: "一報あり。",
          love: "静かな進展。",
          battle: "足場を固めること。",
        },
      },
      {
        waka: "霧立ちて 見えぬ山路を たどる夜は 迷ひし心 なおぞ苦しき",
        translation:
          "霧で見えない山路をたどる夜、迷いは増す。（足元確認）",
        details: {
          wish: "準備不足を補え。",
          wait: "連絡は薄い。",
          love: "様子見が吉。",
          battle: "慎重に進め。",
        },
      },
      {
        waka: "夕されば 門田の稲の 露深く 秋の心は そらに知られぬ",
        translation:
          "夕方には稲の露が深い。秋の心は空には知られない。（内側を整える）",
        details: {
          wish: "今は整えよ。",
          wait: "遅く来る。",
          love: "内面重視。",
          battle: "耐えが勝ち。",
        },
      },
      {
        waka: "世の中を 何にたとへん 朝ぼらけ 漕ぎゆく舟の 跡の白波",
        translation:
          "世の中は朝ぼらけに漕ぎゆく舟の白波のよう。（先は読みにくい）",
        details: {
          wish: "焦るな。",
          wait: "遅い。",
          love: "少し距離を。",
          battle: "守勢で。",
        },
      },
      {
        waka: "山陰に 寄するしぐれの 音きけば 今日も昨日も さびしかりけり",
        translation:
          "山陰に寄る時雨の音を聞けば、今日も昨日も寂しい。（耐える時期）",
        details: {
          wish: "時を待て。",
          wait: "未だ。",
          love: "静観が吉。",
          battle: "守りを固めよ。",
        },
      },
    ],
  },
  {
    rank: "凶",
    minScore: 30,
    items: [
      {
        waka: "花の色は 移りにけりな いたづらに わが身世にふる ながめせしまに",
        translation:
          "花は色あせ、時は過ぎた。（集中力を欠いた結果）",
        details: {
          wish: "叶わず。出直すべし。",
          wait: "来ない。",
          love: "波乱の予感。",
          battle: "修行が足りぬ。",
        },
      },
      {
        waka: "うたた寝に 恋しき人を 見てしより 夢のただ路 うちの空なる",
        translation:
          "夢で会った人を恋う。（気持ちが揺れる）",
        details: {
          wish: "今は遠い。",
          wait: "便り薄い。",
          love: "誤解に注意。",
          battle: "慎重に退く。",
        },
      },
      {
        waka: "風吹けば まろき草葉の 露は消え 影さへうすき 秋の夕ぐれ",
        translation:
          "風で露が消え、影さえ薄い秋の夕暮れ。（足元注意）",
        details: {
          wish: "時期を改めよ。",
          wait: "望み薄し。",
          love: "距離を保て。",
          battle: "無理は禁物。",
        },
      },
      {
        waka: "あらし吹く 三室の山の もみぢ葉は 竜田の川の 錦なりけり",
        translation:
          "嵐が吹き、紅葉は川へ流れる。（流れに抗うな）",
        details: {
          wish: "流れに任せよ。",
          wait: "来ない可能性。",
          love: "争いは避けよ。",
          battle: "退いて守れ。",
        },
      },
      {
        waka: "世をうぢと 思ふ山路の けはしきに なお迷ひゆく 道ぞ悲しき",
        translation:
          "厳しい山路を迷い進む。（立て直しが必要）",
        details: {
          wish: "一度止まれ。",
          wait: "未だ来ず。",
          love: "距離を置け。",
          battle: "勝ち目薄し。",
        },
      },
    ],
  },
  {
    rank: "大凶",
    minScore: 20,
    items: [
      {
        waka: "世の中よ 道こそなけれ 思ひ入る 山の奥にも 鹿ぞ鳴くなる",
        translation:
          "道が見えない山奥に鹿の声が響く。（立て直しが必要）",
        details: {
          wish: "今は動くな。",
          wait: "来ない。",
          love: "距離を置け。",
          battle: "退くが吉。",
        },
      },
      {
        waka: "夕されば 人も草木も うちしほれ 心のほども 知られぬものを",
        translation:
          "夕暮れには人も草木も萎れる。（心が折れやすい）",
        details: {
          wish: "休むべし。",
          wait: "望み薄し。",
          love: "迷いが増す。",
          battle: "戦略を練り直せ。",
        },
      },
      {
        waka: "風吹けば 末の松山 波こさじ とはんだために 我ぞ待ちける",
        translation:
          "波が越えないと言われても待ち続ける。（固執は損）",
        details: {
          wish: "執着は凶。",
          wait: "来ない。",
          love: "想い過ぎに注意。",
          battle: "撤退が賢明。",
        },
      },
      {
        waka: "世の中は つねにもがもな と思へども 夜の寝覚めに 風の音かな",
        translation:
          "世が変わらずであってほしいが、夜の風が告げる。（無理は禁物）",
        details: {
          wish: "今は耐えよ。",
          wait: "時期をずらせ。",
          love: "距離を取れ。",
          battle: "無理は危険。",
        },
      },
      {
        waka: "霜の上に 白き道さへ 消えにけり 行方定めぬ 旅ぞさびしき",
        translation:
          "霜の上の白い道が消えた。（道を作り直す時）",
        details: {
          wish: "いったん引け。",
          wait: "望み薄い。",
          love: "冷静さを。",
          battle: "立て直しが先。",
        },
      },
    ],
  },
];

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
  const rankParam = "運勢";
  const scoreParam = "精度";
  const variantParam = "札";
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const speedRef = useRef(1);
  const directionRef = useRef<1 | -1>(1);
  const [ticketNumber, setTicketNumber] = useState(1);

  const clearSharedParams = () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState({}, "", url.toString());
  };

  const pickFortune = (
    avgScore: number,
    rankOverride?: string | null,
    seedOverride?: number | null
  ) => {
    const ranked =
      (rankOverride
        ? FORTUNE_RANKS.find((fortune) => fortune.rank === rankOverride)
        : null) ??
      FORTUNE_RANKS.find((fortune) => avgScore >= fortune.minScore) ??
      FORTUNE_RANKS[FORTUNE_RANKS.length - 1];

    const seed =
      typeof seedOverride === "number" && seedOverride >= 0
        ? seedOverride
        : Math.floor(Math.random() * 10000);

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

    const rng = createRng(seed);
    const wishOptions = ranked.items.map((item) => item.details.wish);
    const waitOptions = ranked.items.map((item) => item.details.wait);
    const loveOptions = ranked.items.map((item) => item.details.love);
    const battleOptions = ranked.items.map((item) => item.details.battle);

    const pick = (options: string[]) =>
      options[Math.floor(rng() * options.length)] ?? options[0];

    const base = ranked.items[0];
    return {
      rank: ranked.rank,
      minScore: ranked.minScore,
      seed,
      waka: base.waka,
      translation: base.translation,
      details: {
        wish: pick(wishOptions),
        wait: pick(waitOptions),
        love: pick(loveOptions),
        battle: pick(battleOptions),
      },
    };
  };

  useEffect(() => {
    if (!searchParams) return;
    const rank = searchParams.get(rankParam);
    const scoreStr = searchParams.get(scoreParam);
    const sig = searchParams.get("sig");
    const seedParam = searchParams.get(variantParam);
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
    if (!finalResult) return;
    setTicketNumber(Math.floor(Math.random() * 100) + 1);
  }, [finalResult]);

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
        onMouseDown={handleStop}
        onTouchStart={handleStop}
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
      } catch (err) {
        sig = null;
      }

      const shareUrl = new URL(window.location.origin);
      shareUrl.searchParams.set("rank", payload.rank);
      shareUrl.searchParams.set("score", payload.score);
      shareUrl.searchParams.set("seed", String(payload.seed));
      if (sig) {
        shareUrl.searchParams.set("sig", sig);
      }

      const shareText = `【一撃必中・新春おみくじ2026】\n私の運勢は「${payload.rank}」（精度: ${payload.score}%）でした。\n集中力で運命を切り拓け！ #一撃必中おみくじ\n${shareUrl.toString()}`;
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard
          .writeText(shareText)
          .then(() => alert("結果をコピーしました！SNSでシェアしてください。"))
          .catch(() => alert(shareText));
      } else {
        alert(shareText);
      }
    };

    content = (
      <div className="washi-texture flex min-h-screen flex-col items-center px-4 py-8">
        <SakuraEffect />
        <div className="relative w-full max-w-lg overflow-hidden border-t-8 border-red-700 bg-white shadow-2xl animate-fade-in-up">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/white-paper.png')] opacity-10" />
          <div className="relative p-8 md:p-12">
            <div className="mb-6 flex items-start justify-between border-b border-gray-300 pb-6">
              <div className="vertical-rl h-32 font-mincho text-sm text-gray-500">
                令和八年 新春
              </div>
              <div className="flex-1 text-center">
                <div className="mb-2 inline-block border-2 border-red-700 p-1">
                  <div className="border border-red-700 px-3 py-1">
                    <span className="block text-xs font-mincho tracking-widest text-red-700">
                      一撃必中
                    </span>
                  </div>
                </div>
                <h2 className="font-brush mt-2 text-6xl text-black md:text-7xl">
                  {finalResult.rank}
                </h2>
                <div className="mt-2 font-mincho text-xs text-gray-400">
                  平均精度: {finalResult.avgScore.toFixed(1)}%
                </div>
              </div>
              <div className="vertical-rl h-32 font-mincho text-sm text-gray-500">
                第{ticketNumber}番
              </div>
            </div>

            <div className="mb-8 flex min-h-[160px] justify-center gap-6">
              <div className="vertical-rl ml-auto h-64 border-l border-gray-200 pl-6 font-brush text-xl leading-loose text-gray-800 md:text-2xl">
                {finalResult.waka}
              </div>
            </div>

            <div className="mb-8 rounded border border-gray-100 bg-gray-50 p-4 font-mincho text-sm leading-relaxed text-gray-600">
              <span className="mb-1 block font-bold text-red-800">
                【現代語訳】
              </span>
              {finalResult.translation}
            </div>

            <div className="grid grid-cols-1 gap-4 font-mincho text-left md:grid-cols-2">
              {Object.entries(finalResult.details).map(([key, value]) => (
                <div key={key} className="border-b border-gray-200 pb-2">
                  <span className="mr-2 block text-sm font-bold text-red-800 md:inline">
                    {key === "wish"
                      ? "【願望】"
                      : key === "wait"
                        ? "【待人】"
                        : key === "love"
                          ? "【恋愛】"
                          : "【勝負】"}
                  </span>
                  <span className="text-sm text-gray-700">{value}</span>
                </div>
              ))}
            </div>

            <div className="pointer-events-none absolute right-4 top-4 flex h-24 w-24 rotate-12 items-center justify-center rounded-full border-4 border-red-600 opacity-30">
              <span className="font-brush text-xl text-red-600">
                新春
                <br />
                大吉
              </span>
            </div>
          </div>
        </div>

        <div className="z-10 mt-8 flex w-full max-w-md flex-col justify-center gap-4 md:flex-row">
          <button
            onClick={() => {
              clearSharedParams();
              setView("title");
            }}
            className="flex items-center justify-center gap-2 rounded bg-gray-800 px-6 py-3 font-mincho text-white shadow transition hover:bg-gray-700"
          >
            <RefreshCw size={18} /> もう一度挑む
          </button>
          <button
            onClick={shareResult}
            className="flex items-center justify-center gap-2 rounded bg-red-700 px-6 py-3 font-mincho text-white shadow transition hover:bg-red-600"
          >
            <Share2 size={18} /> 結果を共有
          </button>
        </div>
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
