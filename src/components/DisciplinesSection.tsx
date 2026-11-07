import type { CategoryConfig } from '../lib/categories';
import { ArrowUpRight } from './Icons';

interface DisciplinesSectionProps {
  categories: CategoryConfig[];
  counts: Map<string, number>;
  activeId: string;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

export default function DisciplinesSection({
  categories,
  counts,
  activeId,
  onSelect,
  onHover,
}: DisciplinesSectionProps) {
  return (
    <section className="disciplines" id="disciplines" aria-labelledby="disciplines-title">
      <div className="disciplines__head" data-reveal>
        <div>
          <p className="eyebrow">
            <span className="index-mark" aria-hidden="true" />
            领域 / Disciplines
          </p>
          <h2 id="disciplines-title">
            一个工作室，
            <br />
            <em>很多个世界。</em>
          </h2>
        </div>
        <p className="disciplines__intro">
          每个领域都有自己的光、颜色与节奏。选择一个世界，整个网站会随它改变；再走进这个领域的实时模型。
          <span>Every discipline has its own light, palette and tempo.</span>
        </p>
      </div>

      <div className="disciplines__list">
        {categories.map((category) => {
          const count = counts.get(category.id) ?? 0;
          const active = category.id === activeId;
          return (
            <button
              key={category.id}
              type="button"
              className={`discipline-row${active ? ' is-active' : ''}`}
              style={
                {
                  '--discipline-accent': category.theme.accent,
                  '--discipline-soft': category.theme.accentSoft,
                } as React.CSSProperties
              }
              onClick={() => onSelect(category.id)}
              onMouseEnter={() => onHover(category.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(category.id)}
              onBlur={() => onHover(null)}
              data-reveal
            >
              <span className="discipline-row__num">{String(category.order).padStart(2, '0')}</span>
              <span className="discipline-row__main">
                <span className="discipline-row__title">
                  {category.zh}
                  <small>{category.label}</small>
                </span>
                <span className="discipline-row__note">{category.noteZh}</span>
              </span>
              <span className="discipline-row__swatch" aria-hidden="true" />
              <span className="discipline-row__count">
                {count > 0 ? `${String(count).padStart(2, '0')} 个项目` : '新作筹备中'}
              </span>
              <span className="discipline-row__arrow" aria-hidden="true">
                <ArrowUpRight />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
