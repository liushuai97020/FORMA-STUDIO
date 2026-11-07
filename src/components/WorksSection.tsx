import { useEffect, useMemo, useState } from 'react';
import type { ProjectRecord } from '../types';
import type { CategoryConfig } from '../lib/categories';
import { ArrowUpRight } from './Icons';
import ProjectCard from './ProjectCard';

interface WorksSectionProps {
  projects: ProjectRecord[];
  categories: CategoryConfig[];
  counts: Map<string, number>;
  activeCategory: CategoryConfig;
  onCategoryChange: (id: string) => void;
  onOpenProject: (slug: string) => void;
  onPreviewProject: (slug: string | null) => void;
  onOpenArchive: () => void;
}

const PAGE_SIZE = 6;

export default function WorksSection({
  projects,
  categories,
  counts,
  activeCategory,
  onCategoryChange,
  onOpenProject,
  onPreviewProject,
  onOpenArchive,
}: WorksSectionProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(
    () => projects.filter((project) => project.category === activeCategory.id),
    [projects, activeCategory.id],
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory.id]);

  const visibleProjects = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  return (
    <section className="work" id="work" aria-labelledby="work-title">
      <div className="section-head" data-reveal>
        <p className="eyebrow">
          <span className="index-mark" aria-hidden="true" />
          精选作品 / 2026
        </p>

        <div className="section-head__row">
          <div>
            <p className="section-head__en">{activeCategory.label} / Selected work</p>
            <h2 id="work-title">
              {activeCategory.zh}
              <span className="section-head__count">
                ({String(filtered.length).padStart(2, '0')})
              </span>
            </h2>
          </div>

          <div className="section-head__aside">
            <p>
              {activeCategory.descriptionZh}
              <span className="section-head__en-text">{activeCategory.description}</span>
            </p>
            <button type="button" className="text-link" onClick={onOpenArchive}>
              搜索全部项目
              <span className="text-link__icon">
                <ArrowUpRight />
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="work__toolbar" data-reveal>
        <div className="filter-chips" role="group" aria-label="切换领域">
          {categories.map((category) => {
            const active = category.id === activeCategory.id;
            const count = counts.get(category.id) ?? 0;
            return (
              <button
                key={category.id}
                type="button"
                className={`filter-chip${active ? ' is-active' : ''}`}
                onClick={() => onCategoryChange(category.id)}
                aria-pressed={active}
              >
                {category.zh}
                <span>{count > 0 ? String(count).padStart(2, '0') : '—'}</span>
              </button>
            );
          })}
        </div>
        <p className="work__results" aria-live="polite">
          {String(filtered.length).padStart(2, '0')} 个项目 / {activeCategory.zh}
        </p>
      </div>

      {visibleProjects.length > 0 ? (
        <div className="work__grid" data-reveal>
          {visibleProjects.map((project, index) => (
            <ProjectCard
              key={project.slug}
              project={project}
              displayIndex={index}
              wide={index === visibleProjects.length - 1 && visibleProjects.length % 2 === 1}
              onOpen={() => onOpenProject(project.slug)}
              onPreview={onPreviewProject}
            />
          ))}
        </div>
      ) : (
        <div className="work__empty" data-reveal>
          <p className="work__empty-eyebrow">{activeCategory.zh} / 新章节</p>
          <h3>{activeCategory.zh}领域的第一件作品正在制作中。</h3>
          <p>{activeCategory.descriptionZh}</p>
          <button type="button" className="button-outline" onClick={onOpenArchive}>
            浏览其他领域
            <ArrowUpRight />
          </button>
        </div>
      )}

      {hasMore && (
        <div className="work__more">
          <button
            type="button"
            className="button-outline"
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
          >
            加载更多项目
            <span>还有 {String(filtered.length - visibleCount).padStart(2, '0')} 个</span>
          </button>
        </div>
      )}
    </section>
  );
}
