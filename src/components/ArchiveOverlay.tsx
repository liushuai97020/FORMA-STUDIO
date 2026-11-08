import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ProjectRecord } from '../types';
import { CATEGORY_CONFIG, getCategory } from '../lib/categories';
import { ArrowUpRight, CloseIcon, SearchIcon } from './Icons';

interface ArchiveOverlayProps {
  projects: ProjectRecord[];
  onClose: () => void;
  onOpenProject: (slug: string) => void;
  onPreviewProject: (slug: string | null) => void;
}

export default function ArchiveOverlay({
  projects,
  onClose,
  onOpenProject,
  onPreviewProject,
}: ArchiveOverlayProps) {
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [query, setQuery] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<Element | null>(null);
  const closeTimer = useRef<number | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const project of projects) map.set(project.category, (map.get(project.category) ?? 0) + 1);
    return map;
  }, [projects]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return projects.filter((project) => {
      if (activeCategory !== 'All' && project.category !== activeCategory) return false;
      if (!normalizedQuery) return true;
      return [
        project.title,
        project.subtitle,
        project.category,
        project.location,
        project.medium,
        ...project.tags,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [projects, activeCategory, query]);

  useEffect(() => {
    previousFocus.current = document.activeElement;
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setEntered(true));
    });
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 320);
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
    const isCompact = window.matchMedia('(max-width: 900px)').matches;
    // On phones, close immediately: a delayed teardown reads as an
    // unresponsive button when users tap repeatedly. Desktop keeps the
    // full exit animation.
    if (isCompact) {
      onClose();
      return;
    }
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, 480);
  }, [closing, onClose]);

  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close]);

  const chooseCategory = (category: string) => {
    setActiveCategory(category);
    setQuery('');
  };

  return (
    <div
      className={`archive${entered ? ' is-open' : ''}${closing ? ' is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-title"
    >
      <header className="archive__top">
        <span className="archive__brand">
          FORMA<sup>®</sup>
        </span>
        <span className="archive__top-label" id="archive-title">
          项目索引
        </span>
        <div className="archive__top-right">
          <span>{String(projects.length).padStart(2, '0')} 个项目</span>
          <button
            ref={closeRef}
            type="button"
            className="archive__close"
            onClick={close}
            aria-label="关闭项目索引"
          >
            <CloseIcon />
            <span>关闭</span>
          </button>
        </div>
      </header>

      <div className="archive__body">
        <aside className="archive__side">
          <p className="eyebrow">分类 / 领域</p>
          <nav className="archive__nav" aria-label="项目分类">
            <button
              type="button"
              className={activeCategory === 'All' ? 'is-active' : ''}
              onClick={() => chooseCategory('All')}
              onMouseEnter={() => onPreviewProject(null)}
            >
              <span>
                全部项目
                <small>All projects</small>
              </span>
              <span className="archive__count">{String(projects.length).padStart(2, '0')}</span>
            </button>
            {CATEGORY_CONFIG.map((category) => (
              <button
                key={category.id}
                type="button"
                className={activeCategory === category.id ? 'is-active' : ''}
                onClick={() => chooseCategory(category.id)}
                onMouseEnter={() => onPreviewProject(null)}
              >
                <span>
                  {category.zh}
                  <small>{category.label}</small>
                </span>
                <span className="archive__count">
                  {String(counts.get(category.id) ?? 0).padStart(2, '0')}
                </span>
              </button>
            ))}
          </nav>
          <p className="archive__side-note">
            每个项目都是一个实时三维文档。打开它，才能进入它。
          </p>
        </aside>

        <main className="archive__main">
          <div className="archive__intro">
            <p className="eyebrow">不断生长的索引 / 2026</p>
            <h2>
              {activeCategory === 'All' ? '全部项目' : getCategory(activeCategory).zh}
              <span>({String(filtered.length).padStart(2, '0')})</span>
            </h2>
            <p>
              按标题、地点或材质搜索。每个分类都有自己的颜色、光线与节奏。
            </p>
          </div>

          <label className="archive__search">
            <SearchIcon />
            <span className="sr-only">搜索项目</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索项目、地点或材质"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')}>
                清除
              </button>
            )}
          </label>

          <p className="archive__result" aria-live="polite">
            {String(filtered.length).padStart(2, '0')} 个结果
            {query.trim() ? ` · “${query.trim()}”` : ''}
          </p>

          {filtered.length > 0 ? (
            <div className="archive__list">
              {filtered.map((project) => (
                <button
                  key={project.slug}
                  type="button"
                  className="archive-row"
                  onClick={() => onOpenProject(project.slug)}
                  onMouseEnter={() => onPreviewProject(project.slug)}
                  onMouseLeave={() => onPreviewProject(null)}
                  onFocus={() => onPreviewProject(project.slug)}
                  onBlur={() => onPreviewProject(null)}
                >
                  <span className="archive-row__num">{project.index}</span>
                  <span className="archive-row__thumb">
                    {project.coverUrl ? (
                      <img src={project.coverUrl} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <span style={{ background: project.theme.accentSoft }} aria-hidden="true" />
                    )}
                  </span>
                  <span className="archive-row__body">
                    <span className="archive-row__title">{project.title}</span>
                    <span className="archive-row__meta">
                      {getCategory(project.category).zh}
                      {project.type ? <span> · {project.type}</span> : null}
                      <span aria-hidden="true"> / </span>
                      {project.location}
                    </span>
                  </span>
                  <span className="archive-row__year">{project.year}</span>
                  <span className="archive-row__arrow" aria-hidden="true">
                    <ArrowUpRight />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="archive__empty">
              <p>这个分类暂时还没有项目。</p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setActiveCategory('All');
                }}
              >
                返回全部项目
              </button>
            </div>
          )}
        </main>
      </div>

      <footer className="archive__foot">
        <span>FORMA® 空间视觉工作室</span>
        <span>空间 · 出行 · 数码产品 · 服装 · 彩妆 · 家居 · 其它</span>
        <span>© 2026</span>
      </footer>
    </div>
  );
}
