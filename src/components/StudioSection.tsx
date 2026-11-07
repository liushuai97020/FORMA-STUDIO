import { ArrowUpRight } from './Icons';

interface StudioSectionProps {
  projectCount: number;
  categoryCount: number;
  onOpenArchive: () => void;
}

const PROCESS = [
  {
    num: '01',
    title: '观察',
    en: 'Observe',
    text: '从场地、光线和空间被使用的方式开始，而不是从一个镜头角度开始。',
  },
  {
    num: '02',
    title: '建模',
    en: 'Model',
    text: '把几何、材质与比例作为同一个系统来搭建，让每个细节都经得起镜头的转动。',
  },
  {
    num: '03',
    title: '布光',
    en: 'Light',
    text: '用实时灯光让画面诚实可信，像布置一个真实场景一样调整柔和度、反差与时间。',
  },
  {
    num: '04',
    title: '进入',
    en: 'Enter',
    text: '每个项目最终都是一个可进入的三维文档，不只是被观看的一张图。',
  },
];

export default function StudioSection({
  projectCount,
  categoryCount,
  onOpenArchive,
}: StudioSectionProps) {
  return (
    <section className="studio" id="studio" aria-labelledby="studio-title">
      <div className="studio__head" data-reveal>
        <div>
          <p className="eyebrow">
            <span className="index-mark" aria-hidden="true" />
            工作室 / Studio
          </p>
          <h2 id="studio-title">
            在空间存在之前，
            <br />
            <em>我们先把世界建出来。</em>
          </h2>
        </div>
      </div>

      <div className="studio__grid">
        <div className="studio__statement" data-reveal>
          <p>
            FORMA 是一家跨领域的创意空间工作室，工作涵盖建筑、室内、家具、汽车与园林。我们把尚未完成的想法变成可以旋转、布光、进入的实时三维世界，让它比一张静态效果图更接近真实。
          </p>
          <p className="studio__en">
            A creative spatial studio turning unfinished ideas into real-time
            worlds that can be turned, lit and entered.
          </p>
          <div className="studio__facts">
            <div>
              <strong>{String(projectCount).padStart(2, '0')}</strong>
              <span>实时项目</span>
            </div>
            <div>
              <strong>{String(categoryCount).padStart(2, '0')}</strong>
              <span>创意领域</span>
            </div>
            <div>
              <strong>01</strong>
              <span>全球合作团队</span>
            </div>
          </div>
          <button type="button" className="text-link" onClick={onOpenArchive}>
            查看全部项目
            <span className="text-link__icon">
              <ArrowUpRight />
            </span>
          </button>
        </div>

        <div className="studio__process" data-reveal>
          <p className="eyebrow">工作方式 / How we work</p>
          <div className="studio__process-list">
            {PROCESS.map((step) => (
              <article key={step.num} className="studio__step">
                <span className="studio__step-num">{step.num}</span>
                <h3>
                  {step.title}
                  <small>{step.en}</small>
                </h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="studio__contact" data-reveal>
        <p className="eyebrow">开始一次对话 / Start a conversation</p>
        <a href="mailto:hello@forma.studio">
          hello@forma.studio
          <span className="studio__contact-icon">
            <ArrowUpRight />
          </span>
        </a>
        <p>上海 / 里斯本 · 全球合作 · 2026</p>
      </div>
    </section>
  );
}
