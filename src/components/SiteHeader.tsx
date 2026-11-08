import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProjectRecord } from '../types';
import { ArrowUpRight, CloseIcon, MenuIcon } from './Icons';

interface SiteHeaderProps {
  projects: ProjectRecord[];
  onOpenArchive: () => void;
  onJump: (target: 'work' | 'disciplines' | 'studio') => void;
  onMenuChange?: (open: boolean) => void;
}

export default function SiteHeader({ projects, onOpenArchive, onJump, onMenuChange }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    onMenuChange?.(menuOpen);
  }, [menuOpen, onMenuChange]);

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen);
    const focusTimer = menuOpen
      ? window.setTimeout(() => closeRef.current?.focus(), 120)
      : null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menuOpen) setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      if (focusTimer !== null) window.clearTimeout(focusTimer);
      document.body.classList.remove('menu-open');
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) setMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const jump = useCallback(
    (target: 'work' | 'disciplines' | 'studio') => {
      setMenuOpen(false);
      onJump(target);
    },
    [onJump],
  );

  const openArchive = useCallback(() => {
    setMenuOpen(false);
    onOpenArchive();
  }, [onOpenArchive]);

  return (
    <>
      <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
        <button
          type="button"
          className="logo"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="FORMA — 回到顶部"
        >
          FORMA<sup>®</sup>
        </button>

        <nav className="main-nav" aria-label="主导航">
          <button type="button" className="nav-link" onClick={() => jump('work')}>
            作品
          </button>
          <button type="button" className="nav-link" onClick={() => jump('disciplines')}>
            领域
          </button>
          <button type="button" className="nav-link" onClick={() => jump('studio')}>
            工作室
          </button>
        </nav>

        <div className="header-end">
          <button type="button" className="header-index" onClick={openArchive}>
            索引 <span>{String(projects.length).padStart(2, '0')}</span>
          </button>
          <a className="header-contact" href="mailto:hello@forma.studio">
            联系 <ArrowUpRight />
          </a>
          <button
            type="button"
            className="menu-toggle"
            aria-label="打开菜单"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon />
            <span>菜单</span>
          </button>
        </div>
      </header>

      <div className={`mobile-menu${menuOpen ? ' is-open' : ''}`} aria-hidden={!menuOpen}>
        <div className="mobile-menu__top">
          <span className="logo">
            FORMA<sup>®</sup>
          </span>
          <button
            ref={closeRef}
            type="button"
            className="mobile-menu__close"
            onClick={() => setMenuOpen(false)}
            aria-label="关闭菜单"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="mobile-menu__nav" aria-label="移动端导航">
          <button type="button" onClick={() => jump('work')}>
            <span className="mobile-menu__num">01</span> 作品
            <small>Work</small>
          </button>
          <button type="button" onClick={() => jump('disciplines')}>
            <span className="mobile-menu__num">02</span> 领域
            <small>Disciplines</small>
          </button>
          <button type="button" onClick={openArchive}>
            <span className="mobile-menu__num">03</span> 索引
            <span className="mobile-menu__count">{String(projects.length).padStart(2, '0')}</span>
          </button>
          <button type="button" onClick={() => jump('studio')}>
            <span className="mobile-menu__num">04</span> 工作室
            <small>Studio</small>
          </button>
          <a href="mailto:hello@forma.studio" onClick={() => setMenuOpen(false)}>
            <span className="mobile-menu__num">05</span> 联系
            <ArrowUpRight />
          </a>
        </nav>

        <div className="mobile-menu__foot">
          <p>空间 · 出行 · 数码产品 · 服装 · 彩妆 · 家居 · 其它</p>
          <p>上海 / 里斯本 · 全球合作 · 2026</p>
        </div>
      </div>
    </>
  );
}
