import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { ProjectRecord } from '../types';
import { getCategory } from '../lib/categories';
import { ArrowUpRight } from './Icons';

interface ProjectCardProps {
  project: ProjectRecord;
  displayIndex: number;
  wide?: boolean;
  onOpen: () => void;
  onPreview: (slug: string | null) => void;
}

export default function ProjectCard({
  project,
  displayIndex,
  wide = false,
  onOpen,
  onPreview,
}: ProjectCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showCover = Boolean(project.coverUrl) && !imageFailed;
  const category = getCategory(project.category);

  return (
    <article
      className={`work-card${wide ? ' work-card--wide' : ''}`}
      style={
        {
          '--card-accent': project.theme.accent,
          '--card-soft': project.theme.accentSoft,
          '--card-bg': project.theme.background,
        } as CSSProperties
      }
    >
      <button
        type="button"
        className="work-card__button"
        onClick={onOpen}
        onMouseEnter={() => onPreview(project.slug)}
        onMouseLeave={() => onPreview(null)}
        onFocus={() => onPreview(project.slug)}
        onBlur={() => onPreview(null)}
        aria-label={`打开 ${project.title}，${project.type ?? category.zh}实时三维项目`}
      >
        <span className="work-card__media">
          {showCover ? (
            <img
              src={project.coverUrl ?? ''}
              alt={`${project.title} — ${project.subtitle}`}
              loading="eager"
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className="work-card__fallback" aria-hidden="true">
              <span className="work-card__fallback-number">{project.index}</span>
              <span className="work-card__fallback-title">{project.title}</span>
            </span>
          )}

          <span className="work-card__wash" aria-hidden="true" />
          <span className="work-card__tag">{project.type ? `${category.zh} · ${project.type}` : category.zh}</span>
          <span className="work-card__number">{String(displayIndex + 1).padStart(2, '0')}</span>
          <span className="work-card__open">
            打开实时模型
            <ArrowUpRight />
          </span>
        </span>

        <span className="work-card__body">
          <span className="work-card__title-row">
            <span className="work-card__title">{project.title}</span>
            <span className="work-card__year">{project.year}</span>
          </span>
          <span className="work-card__meta">
            <span>{project.subtitle}</span>
            <span>
              {project.location} <span aria-hidden="true">·</span> {project.area}
            </span>
          </span>
        </span>
      </button>
    </article>
  );
}
