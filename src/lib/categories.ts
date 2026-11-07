import type { ProjectTheme } from '../types';

/**
 * 工作室的类别配置（大类）。
 *
 * 一个类别可以包含多个细分类型，例如“空间”包含建筑 / 室内 / 园林 / 商店，
 * “出行”包含汽车 / 摩托；“数码产品 / 服装 / 彩妆 / 家居 / 其它”各自独立。
 * project.json 里的 category 对应这里的 id，type 用于细分标签。
 */
export interface CategoryConfig {
  /** Must match `category` in project.json. */
  id: string;
  label: string;
  zh: string;
  order: number;
  /** 中文主标题，最后一行会用强调色。 */
  headlineZh: [string, string];
  /** 英文副标题，小号展示。 */
  headlineEn: string;
  description: string;
  descriptionZh: string;
  /** 英文注释，小号展示。 */
  note: string;
  noteZh: string;
  theme: ProjectTheme;
}

export const CATEGORY_CONFIG: CategoryConfig[] = [
  {
    id: 'Space',
    label: 'Space',
    zh: '空间',
    order: 1,
    headlineZh: ['在空间之前，', '先看见它。'],
    headlineEn: 'Space, before it exists.',
    description:
      'Architecture, interiors, landscape and retail — one continuous study of how people enter, pause and occupy space.',
    descriptionZh:
      '建筑、室内、园林与商店。我们把人如何进入、停留和使用空间，作为同一个整体来设计。',
    note: 'Architecture · Interiors · Landscape · Retail',
    noteZh: '建筑 · 室内 · 园林 · 商店',
    theme: {
      background: '#F2ECE3',
      ink: '#1D1A17',
      accent: '#B8653F',
      accentSoft: '#DCC9B4',
    },
  },
  {
    id: 'Mobility',
    label: 'Mobility',
    zh: '出行',
    order: 2,
    headlineZh: ['让速度，', '停在光里。'],
    headlineEn: 'Speed, held still.',
    description:
      'Cars and motorcycles, rendered as pure surface and silence. Proportions, reflections and the poetry of movement.',
    descriptionZh:
      '汽车与摩托。以纯粹的曲面、比例与静谧，重新组织速度的观看方式。',
    note: 'Cars · Motorcycles · Concept mobility',
    noteZh: '汽车 · 摩托 · 概念出行',
    theme: {
      background: '#E9E8E4',
      ink: '#171819',
      accent: '#3C5B45',
      accentSoft: '#C7CEC2',
    },
  },
  {
    id: 'Digital',
    label: 'Digital Products',
    zh: '数码产品',
    order: 3,
    headlineZh: ['有脉搏的', '物件。'],
    headlineEn: 'Objects with a pulse.',
    description:
      'Devices, interfaces and objects that live in the hand. Cool surfaces, precise details, light and glass.',
    descriptionZh:
      '数码产品与界面。冷冽的表面、精确的细节，以及光与玻璃的安静编排。',
    note: 'Consumer electronics · Interfaces · Product films',
    noteZh: '数码产品 · 界面 · 产品影片',
    theme: {
      background: '#EDF1F3',
      ink: '#111416',
      accent: '#2D55E8',
      accentSoft: '#C8D3E9',
    },
  },
  {
    id: 'Fashion',
    label: 'Fashion',
    zh: '服装',
    order: 4,
    headlineZh: ['为动作', '而剪裁。'],
    headlineEn: 'Cloth, cut for motion.',
    description:
      'Fashion and textiles built around the body, movement and the fall of fabric. Softness is a material property.',
    descriptionZh:
      '服装与面料。围绕身体、动作与垂坠感建立的三维研究，柔软也是一种可被精确渲染的材质。',
    note: 'Fashion · Textiles · Editorial CGI',
    noteZh: '服装 · 面料 · 时装影像',
    theme: {
      background: '#F2E7E2',
      ink: '#1C1517',
      accent: '#8C2F45',
      accentSoft: '#DFC6C7',
    },
  },
  {
    id: 'Beauty',
    label: 'Beauty',
    zh: '彩妆',
    order: 5,
    headlineZh: ['把光，', '化进妆容。'],
    headlineEn: 'Light, worn on skin.',
    description:
      'Beauty, cosmetics and fragrance worlds. Colour, sheen and skin rendered with the same care as architecture.',
    descriptionZh:
      '彩妆与香氛。颜色、光泽与皮肤之间的关系，被当作空间材料一样精确地渲染。',
    note: 'Cosmetics · Fragrance · Beauty films',
    noteZh: '彩妆 · 香氛 · 美妆影像',
    theme: {
      background: '#F5EAE6',
      ink: '#201716',
      accent: '#B64E68',
      accentSoft: '#E7C9C8',
    },
  },
  {
    id: 'Living',
    label: 'Home & Living',
    zh: '家居',
    order: 6,
    headlineZh: ['让日常，', '坐下来。'],
    headlineEn: 'Everyday forms, considered.',
    description:
      'Furniture and objects for daily life. Pieces designed around the way a body settles and a room is lived in.',
    descriptionZh:
      '家居与家具。让身体安放、让日常发生的物件与空间，从一条缝线到整间房都被完整推敲。',
    note: 'Furniture · Objects · Product CGI',
    noteZh: '家居 · 家具 · 产品视觉',
    theme: {
      background: '#F3EEE6',
      ink: '#1C1A17',
      accent: '#A45E43',
      accentSoft: '#DCCBB8',
    },
  },
  {
    id: 'Other',
    label: 'Other',
    zh: '其它',
    order: 7,
    headlineZh: ['未知的，', '也值得被看见。'],
    headlineEn: 'The work without a label.',
    description:
      'Experiments, commissions and ideas that do not fit a single discipline yet. Every unknown world still deserves a place.',
    descriptionZh:
      '尚未被归类的实验、委托与想法。每一个还没有名字的世界，也值得在档案里占据一个位置。',
    note: 'Experiments · Commissions · Uncategorised',
    noteZh: '实验 · 委托 · 未分类',
    theme: {
      background: '#EDEAE3',
      ink: '#1C1A17',
      accent: '#6B665C',
      accentSoft: '#D5CEC1',
    },
  },
];

const CATEGORY_MAP = new Map(CATEGORY_CONFIG.map((category) => [category.id, category]));

export function getCategory(id: string): CategoryConfig {
  const known = CATEGORY_MAP.get(id);
  if (known) return known;

  const fallback = CATEGORY_CONFIG[0];
  return {
    ...fallback,
    id,
    label: id,
    zh: id,
    note: `${id} projects`,
    noteZh: `${id} 项目`,
  };
}

export function sortCategoryIds(ids: string[]): CategoryConfig[] {
  return ids.map((id) => getCategory(id)).sort((a, b) => a.order - b.order);
}
