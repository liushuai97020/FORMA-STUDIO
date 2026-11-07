const WORDS = [
  { zh: '空间', en: 'Space' },
  { zh: '物件', en: 'Object' },
  { zh: '光', en: 'Light' },
  { zh: '运动', en: 'Motion' },
  { zh: '材料', en: 'Material' },
  { zh: '车辆', en: 'Vehicle' },
  { zh: '园林', en: 'Garden' },
  { zh: '房间', en: 'Room' },
];

function Sequence() {
  return (
    <>
      {WORDS.map((word) => (
        <span key={word.zh} className="marquee__word">
          {word.zh}
          <small>{word.en}</small>
          <span className="marquee__dot" aria-hidden="true" />
        </span>
      ))}
    </>
  );
}

export default function Marquee() {
  return (
    <section className="marquee" aria-label="我们可视化的事物">
      <p className="marquee__label">
        <span className="index-mark" aria-hidden="true" />
        空间视觉工作室 / 2026
      </p>
      <div className="marquee__viewport" aria-hidden="true">
        <div className="marquee__track">
          <Sequence />
          <Sequence />
          <Sequence />
        </div>
      </div>
    </section>
  );
}
