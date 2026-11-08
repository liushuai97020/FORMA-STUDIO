import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import PROJECTS from 'virtual:projects';
import ArchiveOverlay from './components/ArchiveOverlay';
import CategoryRail from './components/CategoryRail';
import DisciplinesSection from './components/DisciplinesSection';
import Intro from './components/Intro';
import LivePreview from './components/LivePreview';
import Marquee from './components/Marquee';
import ProjectViewer from './components/ProjectViewer';
import SiteFooter from './components/SiteFooter';
import SiteHeader from './components/SiteHeader';
import StudioSection from './components/StudioSection';
import WorksSection from './components/WorksSection';
import { ArrowDown, ArrowUpRight } from './components/Icons';
import { CATEGORY_CONFIG, getCategory } from './lib/categories';
import { hexToRgb, isDarkColor } from './lib/color';

export default function App() {
  const [introDone, setIntroDone] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(CATEGORY_CONFIG[0].id);
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);
  const [hoveredProjectSlug, setHoveredProjectSlug] = useState<string | null>(null);
  const [viewerSlug, setViewerSlug] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const [heroReady, setHeroReady] = useState(false);
  const [livePreviewAllowed, setLivePreviewAllowed] = useState(
    () => typeof window === 'undefined' || window.matchMedia('(min-width: 901px)').matches,
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const project of PROJECTS) {
      map.set(project.category, (map.get(project.category) ?? 0) + 1);
    }
    return map;
  }, []);

  const activeCategory = getCategory(activeCategoryId);
  const hoveredCategory = hoveredCategoryId ? getCategory(hoveredCategoryId) : null;
  const hoveredProject =
    PROJECTS.find((project) => project.slug === hoveredProjectSlug) ?? null;
  const viewerProject = PROJECTS.find((project) => project.slug === viewerSlug) ?? null;

  const activeProjects = useMemo(
    () => PROJECTS.filter((project) => project.category === activeCategoryId),
    [activeCategoryId],
  );
  const leadProject = activeProjects[0] ?? null;

  const themeCategory = hoveredCategory ?? activeCategory;
  const theme = viewerProject?.theme ?? hoveredProject?.theme ?? themeCategory.theme;

  const themeStyle = useMemo(
    () =>
      ({
        '--bg': theme.background,
        '--ink': theme.ink,
        '--accent': theme.accent,
        '--accent-soft': theme.accentSoft,
        '--ink-rgb': hexToRgb(theme.ink).join(', '),
        '--bg-rgb': hexToRgb(theme.background).join(', '),
        '--accent-rgb': hexToRgb(theme.accent).join(', '),
        '--accent-soft-rgb': hexToRgb(theme.accentSoft).join(', '),
      }) as CSSProperties,
    [theme],
  );

  const tone = isDarkColor(theme.background) ? 'dark' : 'light';
  const overlaysOpen = Boolean(viewerProject) || archiveOpen;

  useEffect(() => {
    if (!introDone) return;
    const timer = window.setTimeout(() => setHeroReady(true), 650);
    return () => window.clearTimeout(timer);
  }, [introDone]);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 901px)');
    const update = () => setLivePreviewAllowed(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const hero = document.getElementById('top');
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0.05, rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.classList.toggle('is-locked', !introDone || overlaysOpen);
    return () => document.body.classList.remove('is-locked');
  }, [introDone, overlaysOpen]);

  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = theme.background;
  }, [theme.background]);

  useEffect(() => {
    if (!introDone) return;
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-visible)'),
    );
    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.01, rootMargin: '300px 0px 300px 0px' },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [introDone, activeCategoryId]);

  const scrollToSection = useCallback((target: 'work' | 'disciplines' | 'studio') => {
    const element = document.getElementById(target);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const selectCategory = useCallback((id: string, shouldScroll = false) => {
    setActiveCategoryId(id);
    setHoveredCategoryId(null);
    setHoveredProjectSlug(null);
    if (shouldScroll) {
      window.setTimeout(() => {
        document.getElementById('work')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 260);
    }
  }, []);

  const openProject = useCallback((slug: string) => {
    const project = PROJECTS.find((item) => item.slug === slug);
    if (!project) return;
    setArchiveOpen(false);
    setHoveredProjectSlug(null);
    setHoveredCategoryId(null);
    setActiveCategoryId(project.category);
    setViewerSlug(slug);
  }, []);

  const closeViewer = useCallback(() => setViewerSlug(null), []);

  const navigateViewer = useCallback(
    (direction: -1 | 1) => {
      if (PROJECTS.length === 0) return;
      const current = PROJECTS.findIndex((project) => project.slug === viewerSlug);
      const start = current < 0 ? 0 : current;
      const next = PROJECTS[(start + direction + PROJECTS.length) % PROJECTS.length];
      if (!next) return;
      setActiveCategoryId(next.category);
      setViewerSlug(next.slug);
    },
    [viewerSlug],
  );

  const viewerPosition = useMemo(() => {
    const index = PROJECTS.findIndex((project) => project.slug === viewerSlug);
    return index < 0 ? 1 : index + 1;
  }, [viewerSlug]);

  const handlePreviewProject = useCallback((slug: string | null) => {
    setHoveredProjectSlug(slug);
  }, []);

  const handlePreviewCategory = useCallback((id: string | null) => {
    setHoveredCategoryId(id);
  }, []);

  const handleJump = useCallback(
    (target: 'work' | 'disciplines' | 'studio') => {
      scrollToSection(target);
    },
    [scrollToSection],
  );

  const archiveProject = PROJECTS.find((project) => project.slug === viewerSlug) ?? null;

  return (
    <div
      className={`site${introDone ? ' is-ready' : ''}`}
      style={themeStyle}
      data-tone={tone}
      data-category={activeCategory.id}
    >
      <div className="site__atmosphere" aria-hidden="true">
        <div className="site__wash site__wash--a" />
        <div className="site__wash site__wash--b" />
        <div className="site__grid" />
        <div className="site__grain" />
      </div>

      <div
        className="page-shell"
        inert={!introDone || Boolean(archiveProject) || archiveOpen || undefined}
      >
        <SiteHeader
          projects={PROJECTS}
          onOpenArchive={() => setArchiveOpen(true)}
          onJump={handleJump}
          onMenuChange={setMenuOpen}
        />

        <main>
          <section className="hero" id="top" aria-labelledby="hero-title">
            <div className="hero__grid">
              <div className="hero__copy" key={activeCategory.id}>
                <p className="eyebrow hero__eyebrow">
                  <span className="index-mark" aria-hidden="true" />
                  FORMA® / 空间视觉工作室
                </p>

                <h1 id="hero-title" className="hero__title">
                  {activeCategory.headlineZh[0]}
                  <br />
                  <em>{activeCategory.headlineZh[1]}</em>
                </h1>
                <p className="hero__title-en">{activeCategory.headlineEn}</p>

                <div className="hero__category-line">
                  <span className="hero__category-index">
                    {String(activeCategory.order).padStart(2, '0')}
                  </span>
                  <span className="hero__category-name">
                    {activeCategory.zh}
                    <small>{activeCategory.label}</small>
                  </span>
                  <span className="hero__category-rule" aria-hidden="true" />
                  <span className="hero__category-count">
                    {String(activeProjects.length).padStart(2, '0')} 个实时项目
                  </span>
                </div>

                <p className="hero__description">
                  {activeCategory.descriptionZh}
                  <span className="hero__description-en">{activeCategory.description}</span>
                </p>

                <div className="hero__actions">
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() => scrollToSection('work')}
                  >
                    查看{activeCategory.zh}项目
                    <span className="button-primary__icon">
                      <ArrowDown />
                    </span>
                  </button>
                  <button type="button" className="text-link" onClick={() => setArchiveOpen(true)}>
                    全部项目
                    <span className="text-link__icon">
                      <ArrowUpRight />
                    </span>
                  </button>
                </div>
              </div>

              <div className="hero__stage">
                <LivePreview
                  project={leadProject}
                  category={activeCategory}
                  position={1}
                  categoryCount={activeProjects.length}
                  onOpen={() => leadProject && openProject(leadProject.slug)}
                  enabled={introDone && heroReady && heroVisible && livePreviewAllowed}
                  suspended={archiveOpen || Boolean(viewerProject) || menuOpen}
                />
              </div>
            </div>

            <CategoryRail
              categories={CATEGORY_CONFIG}
              activeId={activeCategoryId}
              counts={counts}
              onSelect={(id) => selectCategory(id)}
              onHover={handlePreviewCategory}
            />

            <div className="hero__foot">
              <span className="hero__scroll">
                <span className="hero__scroll-line" aria-hidden="true" />
                向下滚动探索
              </span>
              <span className="hero__studio-locale">上海 / 里斯本 · 全球合作</span>
              <span className="hero__edition">第一辑 / 2026</span>
            </div>
          </section>

          <Marquee />

          <DisciplinesSection
            categories={CATEGORY_CONFIG}
            counts={counts}
            activeId={activeCategoryId}
            onSelect={(id) => selectCategory(id, true)}
            onHover={handlePreviewCategory}
          />

          <WorksSection
            projects={PROJECTS}
            categories={CATEGORY_CONFIG}
            counts={counts}
            activeCategory={activeCategory}
            onCategoryChange={(id) => selectCategory(id)}
            onOpenProject={openProject}
            onPreviewProject={handlePreviewProject}
            onOpenArchive={() => setArchiveOpen(true)}
          />

          <StudioSection
            projectCount={PROJECTS.length}
            categoryCount={CATEGORY_CONFIG.length}
            onOpenArchive={() => setArchiveOpen(true)}
          />
        </main>

        <SiteFooter projectCount={PROJECTS.length} />
      </div>

      {archiveOpen && (
        <ArchiveOverlay
          projects={PROJECTS}
          onClose={() => {
            setArchiveOpen(false);
            setHoveredProjectSlug(null);
          }}
          onOpenProject={openProject}
          onPreviewProject={handlePreviewProject}
        />
      )}

      {archiveProject && (
        <ProjectViewer
          project={archiveProject}
          position={viewerPosition}
          total={PROJECTS.length}
          onClose={closeViewer}
          onNavigate={navigateViewer}
        />
      )}

      {!introDone && (
        <Intro accent={activeCategory.theme.accent} onDone={() => setIntroDone(true)} />
      )}
    </div>
  );
}
