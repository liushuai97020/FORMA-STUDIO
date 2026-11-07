import type { CategoryConfig } from '../lib/categories';

interface CategoryRailProps {
  categories: CategoryConfig[];
  activeId: string;
  counts: Map<string, number>;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

export default function CategoryRail({
  categories,
  activeId,
  counts,
  onSelect,
  onHover,
}: CategoryRailProps) {
  return (
    <div className="category-rail">
      <div className="category-rail__label">
        <span className="index-mark" aria-hidden="true" />
        领域
        <span className="category-rail__hint">选择一个世界<span className="category-rail__swipe"> · 左右滑动</span></span>
      </div>

      <div className="category-rail__track" role="group" aria-label="领域">
        {categories.map((category) => {
          const count = counts.get(category.id) ?? 0;
          const active = category.id === activeId;
          return (
            <button
              key={category.id}
              type="button"
              className={`category-tab${active ? ' is-active' : ''}`}
              onClick={() => onSelect(category.id)}
              onMouseEnter={() => onHover(category.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(category.id)}
              onBlur={() => onHover(null)}
              aria-pressed={active}
              aria-label={`${category.zh}，${count} 个项目`}
            >
              <span className="category-tab__num">{String(category.order).padStart(2, '0')}</span>
              <span className="category-tab__label">{category.zh}</span>
              <span className="category-tab__meta">
                <span className="category-tab__en">{category.label}</span>
                <span className="category-tab__count">
                  {count > 0 ? `${String(count).padStart(2, '0')} 项目` : '筹备中'}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
