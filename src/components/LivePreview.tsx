import { useEffect, useState } from 'react';
import type { ProjectRecord } from '../types';
import type { CategoryConfig } from '../lib/categories';
import { ArrowUpRight } from './Icons';

interface LivePreviewProps {
  project: ProjectRecord | null;
  category: CategoryConfig;
  position: number;
  categoryCount: number;
  onOpen: () => void;
  /** Only mount the live iframe once the opening sequence is over. */
  enabled: boolean;
  /** Hide the iframe while a full-screen overlay is open without unloading it. */
  suspended?: boolean;
}

export default function LivePreview({
  project,
  category,
  position,
  categoryCount,
  onOpen,
  enabled,
  suspended = false,
}: LivePreviewProps) {
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [frameReady, setFrameReady] = useState(false);

  useEffect(() => {
    setFrameReady(false);
    setFrameLoaded(false);
  }, [project?.slug, enabled]);

  useEffect(() => {
    if (!frameReady) return;
    // Keep the still cover visible briefly after the iframe document loads,
    // while its WebGL scene warms up. This avoids a pale flash.
    const timer = window.setTimeout(() => setFrameLoaded(true), 700);
    return () => window.clearTimeout(timer);
  }, [frameReady]);

  const liveActive = enabled && Boolean(project);

  return (
    <div className="live-preview">
      <div className="live-preview__frame">
        <div className="live-preview__media">
          {project?.coverUrl && (
            <img
              className={`live-preview__cover${liveActive && frameLoaded ? ' is-hidden' : ''}`}
              src={project.coverUrl}
              alt=""
              loading="eager"
              decoding="async"
            />
          )}

          {enabled && project && (
            <iframe
              key={project.slug}
              className={`live-preview__iframe${frameLoaded ? ' is-loaded' : ''}${suspended ? ' is-suspended' : ''}`}
              src={`${project.base}?cover=1&embed=hero`}
              title={`${project.title} 实时三维预览`}
              tabIndex={-1}
              aria-hidden="true"
              onLoad={() => setFrameReady(true)}
            />
          )}

          {!project && (
            <div className="live-preview__void">
              <span className="live-preview__void-num">第 {String(category.order).padStart(2, '0')} 章</span>
              <span className="live-preview__void-title">{category.zh}</span>
              <span className="live-preview__void-zh">{category.label}</span>
              <span className="live-preview__void-line" />
              <span className="live-preview__void-note">
                这个领域的第一件作品正在制作中。
              </span>
            </div>
          )}

          <span className="live-preview__shade" aria-hidden="true" />
          <span className="live-preview__corner live-preview__corner--tl" aria-hidden="true" />
          <span className="live-preview__corner live-preview__corner--br" aria-hidden="true" />
        </div>

        {project && (
          <button
            type="button"
            className="live-preview__surface"
            onClick={onOpen}
            aria-label={`打开 ${project.title} 实时模型`}
          />
        )}

        <div className="live-preview__hud live-preview__hud--top">
          <span className="live-preview__live">
            <span className="status-dot" aria-hidden="true" />
            {enabled ? '实时 3D 视口' : '三维视口预览'}
          </span>
          <span>
            {String(position).padStart(2, '0')} / {String(categoryCount).padStart(2, '0')} — {category.zh}
          </span>
        </div>

        {project && (
          <div className="live-preview__hud live-preview__hud--bottom">
            <div className="live-preview__project">
              <span className="live-preview__project-cat">
                {project.index} / {project.type ?? category.zh}
              </span>
              <span className="live-preview__project-title">{project.title}</span>
              <span className="live-preview__project-meta">
                {project.subtitle} · {project.year}
              </span>
            </div>

            <button type="button" className="live-preview__open" onClick={onOpen}>
              打开实时模型
              <span>
                <ArrowUpRight />
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="live-preview__caption">
        <span>
          {enabled
            ? '实时渲染的三维现场 · 打开模型即可进入'
            : '三维场景静帧 · 点击进入完整实时模型'}
        </span>
        <span className="live-preview__scale">WEBGL / 3D</span>
      </div>
    </div>
  );
}
