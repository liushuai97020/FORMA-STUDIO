import { ArrowUpRight } from './Icons';

interface SiteFooterProps {
  projectCount: number;
}

export default function SiteFooter({ projectCount }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="site-footer__cta">
        <p>有空间要发生？</p>
        <a href="mailto:hello@forma.studio">
          让它先被看见
          <span className="site-footer__arrow">
            <ArrowUpRight />
          </span>
        </a>
      </div>

      <div className="site-footer__mark" aria-hidden="true">
        FORMA
      </div>

      <div className="site-footer__base">
        <span>FORMA® — 空间视觉工作室</span>
        <span>{String(projectCount).padStart(2, '0')} 个项目 / 2026</span>
        <span>上海 / 里斯本</span>
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          回到顶部 <span aria-hidden="true">↑</span>
        </button>
      </div>
    </footer>
  );
}
