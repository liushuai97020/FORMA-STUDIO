import { useEffect, useRef, useState } from 'react';

interface IntroProps {
  accent: string;
  onDone: () => void;
}

const STATUS = ['正在绘制第一根线条', '正在搭建体块与材质', '正在校准日光', '工作室已就绪'];

export default function Intro({ accent, onDone }: IntroProps) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const finishing = useRef(false);
  const done = useRef(false);
  const reduced = useRef(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  ).current;

  useEffect(() => {
    let cancelled = false;
    const fallback = window.setTimeout(() => {
      if (!cancelled) setFontsReady(true);
    }, 1200);

    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (!cancelled) setFontsReady(true);
      });
    } else {
      setFontsReady(true);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (leaving) return;
    let frame = 0;
    const started = performance.now();
    const duration = reduced ? 600 : 1900;
    const finishAt = reduced ? 500 : 1700;

    const tick = (now: number) => {
      if (finishing.current) return;
      const elapsed = now - started;
      const canFinish = fontsReady || elapsed > 1900;
      const target = canFinish
        ? Math.min(100, (elapsed / duration) * 100)
        : Math.min(86, (elapsed / duration) * 100);

      setProgress((current) => {
        const next = current + (target - current) * 0.22 + 0.1;
        return Math.min(100, Math.min(target, next));
      });

      if (elapsed > finishAt && canFinish) {
        finishing.current = true;
        setProgress(100);
        window.setTimeout(() => setLeaving(true), reduced ? 0 : 260);
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [fontsReady, leaving, reduced]);

  useEffect(() => {
    if (!leaving || done.current) return;
    const timer = window.setTimeout(
      () => {
        if (done.current) return;
        done.current = true;
        onDone();
      },
      reduced ? 240 : 840,
    );
    return () => window.clearTimeout(timer);
  }, [leaving, onDone, reduced]);

  const skip = () => {
    if (finishing.current) return;
    finishing.current = true;
    setProgress(100);
    setLeaving(true);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') skip();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const rounded = Math.round(progress);
  const status = STATUS[Math.min(STATUS.length - 1, Math.floor(rounded / 26))];

  return (
    <div
      className={`intro${leaving ? ' is-leaving' : ''}`}
      style={{ '--intro-accent': accent } as React.CSSProperties}
      role="status"
      aria-live="polite"
      aria-label="FORMA 工作室正在载入"
    >
      <div className="intro__grid" aria-hidden="true" />

      <header className="intro__top">
        <span className="intro__brand">
          FORMA<sup>®</sup>
        </span>
        <span className="intro__kicker">
          空间视觉工作室
          <small>Spatial Visualisation Studio</small>
        </span>
        <span className="intro__vol">第一辑 — 2026</span>
      </header>

      <div className="intro__body">
        <div className="intro__copy">
          <p className="intro__eyebrow">
            <span className="index-mark" aria-hidden="true" />
            空间 · 出行 · 数码产品 · 服装 · 彩妆 · 家居 · 其它
          </p>
          <h1 className="intro__wordmark" aria-label="FORMA">
            {'FORMA'.split('').map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                style={{ '--d': `${100 + index * 70}ms` } as React.CSSProperties}
                aria-hidden="true"
              >
                {letter}
              </span>
            ))}
          </h1>
          <p className="intro__tagline">
            为空间、物件与速度，
            <br />
            <em>建立可触摸的想象。</em>
          </p>
          <p className="intro__zh">SPATIAL STORIES, RENDERED REAL.</p>
        </div>

        <div className="intro__drawing" aria-hidden="true">
          <svg viewBox="0 0 820 460" role="presentation">
            <g className="intro__drawing-lines">
              <path className="draw draw--slow" pathLength={1} d="M34 372H786" />
              <path className="draw" pathLength={1} d="M178 372V220H482V372" />
              <path className="draw" pathLength={1} d="M178 220H482V196H178Z" />
              <path className="draw" pathLength={1} d="M300 196V112H566V196" />
              <path className="draw" pathLength={1} d="M282 112H590V88H282Z" />
              <path className="draw" pathLength={1} d="M300 220V112" />
              <path className="draw" pathLength={1} d="M352 196V112M404 196V112M456 196V112M508 196V112" />
              <path className="draw" pathLength={1} d="M566 196H650V372" />
              <path className="draw" pathLength={1} d="M612 196V372" />
              <path className="draw" pathLength={1} d="M178 300H482M178 258H482" />
              <path className="draw draw--thin" pathLength={1} d="M482 250H584L624 290V372" />
              <path className="draw draw--thin" pathLength={1} d="M42 410H260M42 402V418M260 402V418" />
              <path className="draw draw--thin" pathLength={1} d="M700 88V372M692 88H708M692 372H708" />
              <path className="draw draw--accent" pathLength={1} d="M566 112H650V196H566Z" />
              <circle className="draw draw--accent intro__sun" pathLength={1} cx="700" cy="78" r="25" />
            </g>
            <g className="intro__dimensions">
              <text x="42" y="432">12 400</text>
              <text x="704" y="382">标高 01</text>
              <text x="120" y="250">CASA MAR</text>
              <text x="120" y="268">立面研究 / 01</text>
            </g>
          </svg>
          <div className="intro__drawing-caption">
            <span>海滨住宅研究 — 001</span>
            <span>比例 1:100</span>
          </div>
        </div>
      </div>

      <footer className="intro__bottom">
        <div className="intro__status">
          <span className="status-dot" aria-hidden="true" />
          {status}
        </div>

        <div
          className="intro__meter"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={rounded}
        >
          <span style={{ transform: `scaleX(${progress / 100})` }} />
        </div>

        <div className="intro__count">
          {String(rounded).padStart(3, '0')}
          <small>%</small>
        </div>

        <button type="button" className="intro__skip" onClick={skip}>
          跳过开场 <span aria-hidden="true">↗</span>
        </button>
      </footer>
    </div>
  );
}
