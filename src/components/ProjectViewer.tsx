import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProjectRecord } from '../types';
import { getCategory } from '../lib/categories';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CloseIcon,
  FullscreenIcon,
} from './Icons';

interface ProjectViewerProps {
  project: ProjectRecord;
  position: number;
  total: number;
  onClose: () => void;
  onNavigate: (direction: -1 | 1) => void;
}

/**
 * Full-screen, on-demand runtime for a project.
 *
 * The iframe is mounted only while the viewer is open. Closing or switching
 * projects unmounts the previous document immediately, releasing its WebGL
 * context, textures and geometry back to the browser.
 */
export default function ProjectViewer({
  project,
  position,
  total,
  onClose,
  onNavigate,
}: ProjectViewerProps) {
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);
  const [released, setReleased] = useState(false);
  const [frameReady, setFrameReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [slow, setSlow] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<Element | null>(null);
  const loadStarted = useRef(performance.now());

  useEffect(() => {
    previousFocus.current = document.activeElement;
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setEntered(true));
    });
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 600);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(focusTimer);
      if (previousFocus.current instanceof HTMLElement) {
        previousFocus.current.focus({ preventScroll: true });
      }
    };
  }, []);

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    // Lose the WebGL context immediately instead of waiting for the exit
    // transition to finish.
    setReleased(true);
    window.setTimeout(onClose, 720);
  }, [closing, onClose]);

  useEffect(() => {
    setFrameReady(false);
    setLoaded(false);
    setProgress(0);
    setSlow(false);
    setAttempt(0);
    loadStarted.current = performance.now();
  }, [project.slug]);

  useEffect(() => {
    if (loaded) return;
    const interval = window.setInterval(() => {
      setProgress((current) => Math.min(92, current + Math.max(0.4, (92 - current) * 0.07)));
    }, 130);
    const slowTimer = window.setTimeout(() => setSlow(true), 9000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(slowTimer);
    };
  }, [loaded, project.slug]);

  useEffect(() => {
    if (!frameReady || loaded) return;
    const elapsed = performance.now() - loadStarted.current;
    const wait = Math.max(0, 620 - elapsed);
    const timer = window.setTimeout(() => {
      setProgress(100);
      setLoaded(true);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [frameReady, loaded]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (closing) return;
      if (event.key === 'Escape') {
        if (document.fullscreenElement) {
          void document.exitFullscreen().catch(() => undefined);
          return;
        }
        close();
      } else if (event.key === 'ArrowLeft') {
        onNavigate(-1);
      } else if (event.key === 'ArrowRight') {
        onNavigate(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closing, close, onNavigate]);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (containerRef.current) {
        await containerRef.current.requestFullscreen();
      }
    } catch {
      // Fullscreen may be blocked by the browser; the project stays usable.
    }
  }, []);

  const retry = () => {
    setFrameReady(false);
    setLoaded(false);
    setProgress(0);
    setSlow(false);
    setAttempt((current) => current + 1);
    loadStarted.current = performance.now();
  };

  const iframeSrc = `${project.base}?embed=1&v=${attempt}`;

  return (
    <div
      ref={containerRef}
      className={`viewer${entered ? ' is-open' : ''}${closing ? ' is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} — 沉浸式项目`}
      style={
        {
          '--viewer-bg': project.theme.background,
          '--viewer-ink': project.theme.ink,
          '--viewer-accent': project.theme.accent,
          '--viewer-soft': project.theme.accentSoft,
        } as React.CSSProperties
      }
    >
      <div className="viewer__stage">
        {!released && (
          <iframe
            key={`${project.slug}-${attempt}`}
            className={`viewer__frame${loaded ? ' is-loaded' : ''}`}
            src={iframeSrc}
            title={`${project.title} — 可交互三维项目`}
            onLoad={() => setFrameReady(true)}
            allow="fullscreen; autoplay"
          />
        )}

        <div className={`viewer__loader${loaded ? ' is-loaded' : ''}`} aria-hidden={loaded}>
          <div className="viewer__loader-aura" aria-hidden="true" />
          <p className="viewer__loader-eyebrow">
            <span className="status-dot" aria-hidden="true" />
            正在载入实时项目 — {project.index}
          </p>
          <h2>{project.title}</h2>
          <p className="viewer__loader-sub">
            {getCategory(project.category).zh} / {project.subtitle}
          </p>
          <div
            className="viewer__loader-meter"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <span style={{ transform: `scaleX(${progress / 100})` }} />
          </div>
          <div className="viewer__loader-meta">
            <span>{loaded ? '项目已就绪' : '正在载入三维文档'}</span>
            <span>{String(Math.round(progress)).padStart(3, '0')}%</span>
          </div>
          <p className="viewer__loader-note">
            只有当前项目会被载入。关闭或切换时，上一件作品的场景会立即释放。
          </p>
          {slow && !loaded && (
            <p className="viewer__loader-slow">
              加载时间比预期更久。{' '}
              <button type="button" onClick={retry}>
                重试 <ArrowUpRight />
              </button>
            </p>
          )}
        </div>
      </div>

      <header className="viewer__top">
        <button
          ref={closeRef}
          type="button"
          className="viewer__back"
          onClick={close}
          aria-label="关闭项目并返回索引"
        >
          <ArrowLeft />
          <span>索引</span>
        </button>

        <div className="viewer__identity">
          <p>
            {project.index} / {String(position).padStart(2, '0')} — {getCategory(project.category).zh}{project.type ? ` · ${project.type}` : ''}
          </p>
          <h2>{project.title}</h2>
          <span>{project.location} · {project.year}</span>
        </div>

        <div className="viewer__actions">
          <button
            type="button"
            className="viewer__icon"
            onClick={() => onNavigate(-1)}
            aria-label="上一个项目"
          >
            <ArrowLeft />
          </button>
          <span className="viewer__counter">
            {String(position).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
          <button
            type="button"
            className="viewer__icon"
            onClick={() => onNavigate(1)}
            aria-label="下一个项目"
          >
            <ArrowRight />
          </button>
          <button
            type="button"
            className="viewer__icon viewer__fullscreen"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? '退出全屏' : '全屏'}
          >
            <FullscreenIcon exit={fullscreen} />
          </button>
          <button
            type="button"
            className="viewer__icon viewer__close"
            onClick={close}
            aria-label="关闭项目"
          >
            <CloseIcon />
          </button>
        </div>
      </header>
    </div>
  );
}
