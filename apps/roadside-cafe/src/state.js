export const DRINKS = [
  {
    id: 'oat-latte',
    name: '燕麦拿铁',
    en: 'OAT LATTE',
    category: 'coffee',
    price: 28,
    tag: '咖啡',
    cup: '#d7ab77',
    lid: '#efe0cd',
    liquid: '#b87b48',
    liquidTop: '#d9ad7c',
    straw: '#a9693e',
    ingredients: ['云南浓缩', '燕麦奶', '肉桂粉'],
    short: '烤坚果 · 燕麦 · 肉桂',
    description: '云南保山中深烘豆，带着烤榛子与黑糖的甜。燕麦奶打得薄，入口像一张晒过太阳的毛毯。',
    prep: [
      '咖啡师称取 18 克豆子，磨成细砂糖一样的颗粒。',
      '浓缩落入杯底，燕麦奶在钢杯里打出细密奶泡。',
      '牛奶与咖啡慢慢融合，表面撒上一层肉桂。',
      '杯套写好了你的名字，放到吧台左侧。'
    ]
  },
  {
    id: 'osmanthus-coldbrew',
    name: '桂花乌龙冷萃',
    en: 'OSMANTHUS OOLONG COLD BREW',
    category: 'coffee',
    price: 30,
    tag: '咖啡',
    cup: '#c9a071',
    lid: '#ead9c0',
    liquid: '#9b6236',
    liquidTop: '#c6935c',
    straw: '#7e5636',
    ingredients: ['冷萃乌龙', '桂花蜜', '冰块'],
    short: '桂花 · 乌龙 · 冷萃',
    description: '提前一夜冷泡的乌龙，带着花香与一点焙火气。桂花蜜沉在杯底，喝之前要轻轻晃一晃。',
    prep: [
      '从冷萃壶里量出 180 毫升乌龙茶汤。',
      '冰块在摇壶里碰撞，桂花蜜沿着杯壁落下。',
      '咖啡师摇匀茶汤，滤掉碎冰。',
      '一朵干桂花落在杯口，冷萃出杯。'
    ]
  },
  {
    id: 'americano',
    name: '美式咖啡',
    en: 'AMERICANO',
    category: 'coffee',
    price: 22,
    tag: '咖啡',
    cup: '#d8c7b2',
    lid: '#eedfca',
    liquid: '#6f4428',
    liquidTop: '#a8754e',
    straw: '#5c4230',
    ingredients: ['云南日晒', '热水'],
    short: '黑巧 · 柑橘 · 干净',
    description: '日晒豆的果酸被热水拉开，像清晨街道上第一杯醒来的水。简单，但每天都需要。',
    prep: [
      '磨豆机响起，豆子落下。',
      '热水润湿粉层，咖啡液一滴滴落下。',
      '香气先于味道抵达吧台。',
      '一杯干净的美式，放到你面前。'
    ]
  },
  {
    id: 'sea-salt-caramel',
    name: '海盐焦糖拿铁',
    en: 'SEA SALT CARAMEL LATTE',
    category: 'coffee',
    price: 32,
    tag: '咖啡',
    cup: '#d2a57d',
    lid: '#ead6bd',
    liquid: '#b77a45',
    liquidTop: '#e0b784',
    straw: '#8c5b36',
    ingredients: ['双份浓缩', '焦糖', '海盐奶盖'],
    short: '焦糖 · 海盐 · 奶盖',
    description: '焦糖熬到琥珀色，海盐在奶盖上留下一点咸。甜与咸之间，刚好够坐一个下午。',
    prep: [
      '焦糖在锅底慢慢融化，变成琥珀色。',
      '双份浓缩落入杯中，奶泡与海盐一起打发。',
      '奶盖铺满杯口，撒一小撮海盐。',
      '甜与咸刚好平衡，出杯。'
    ]
  },
  {
    id: 'peach-oolong',
    name: '蜜桃乌龙',
    en: 'PEACH OOLONG',
    category: 'tea',
    price: 26,
    tag: '果茶',
    cup: '#e0b08c',
    lid: '#f0dfca',
    liquid: '#d98a5c',
    liquidTop: '#efb387',
    straw: '#b4683f',
    ingredients: ['蜜桃', '乌龙茶', '青柠'],
    short: '白桃 · 乌龙 · 青柠',
    description: '熟透的白桃切成厚片，与冷泡乌龙一起摇匀。青柠只放一小角，让甜里透一点光。',
    prep: [
      '白桃切厚片，果肉放进摇壶。',
      '冷泡乌龙沿着冰块倒入。',
      '加一小角青柠，轻轻摇匀。',
      '果肉在杯底沉住，蜜桃乌龙出杯。'
    ]
  },
  {
    id: 'jasmine-grape',
    name: '青提茉莉',
    en: 'JASMINE GRAPE',
    category: 'tea',
    price: 26,
    tag: '果茶',
    cup: '#bfc7a5',
    lid: '#e7e6d2',
    liquid: '#a8b877',
    liquidTop: '#cfd5a2',
    straw: '#6e7459',
    ingredients: ['阳光玫瑰', '茉莉绿茶', '薄荷'],
    short: '青提 · 茉莉 · 薄荷',
    description: '阳光玫瑰对半切开，茉莉绿茶只泡到刚出香。薄荷叶在杯口轻轻拍过，像雨后的一阵风。',
    prep: [
      '青提对半切开，保留一点果皮。',
      '茉莉绿茶冲出清透的茶汤。',
      '薄荷叶在掌心拍醒，放入杯中。',
      '清绿的夏天，装杯。'
    ]
  },
  {
    id: 'blood-orange',
    name: '血橙气泡',
    en: 'BLOOD ORANGE FIZZ',
    category: 'tea',
    price: 24,
    tag: '果茶',
    cup: '#d98a7c',
    lid: '#f0d8cd',
    liquid: '#c85f4a',
    liquidTop: '#e69378',
    straw: '#8d4b2c',
    ingredients: ['血橙', '气泡水', '迷迭香'],
    short: '血橙 · 气泡 · 迷迭香',
    description: '血橙榨汁，兑入冰气泡水；迷迭香在杯里站成一小棵树。喝起来有阳光晒过果皮的味道。',
    prep: [
      '血橙切开，榨出深红的果汁。',
      '冰块与气泡水在杯中相遇。',
      '一小枝迷迭香点在杯口。',
      '气泡还没散，赶紧端走。'
    ]
  }
];

export const MENU_TABS = [
  { id: 'coffee', label: '咖啡', en: 'COFFEE' },
  { id: 'tea', label: '果茶', en: 'FRUIT TEA' }
];

export const ORDER_STEPS = {
  coffee: ['研磨咖啡豆', '萃取浓缩', '融合牛奶', '装杯出餐'],
  tea: ['鲜果切片', '冷泡茶汤', '摇匀入味', '装杯出餐']
};

export const WEATHER = {
  sunny: {
    label: '晴天',
    readout: '晴 · 微风 2 级',
    interior: '晴',
    accent: '#b4683f'
  },
  rainy: {
    label: '雨天',
    readout: '雨 · 檐口滴水',
    interior: '雨',
    accent: '#5d7079'
  }
};

export const CAMERA = {
  exterior: {
    position: [14.2, 6.3, 16.2],
    target: [0.2, 2.9, 0.1],
    fov: 38
  },
  exteriorMobile: {
    position: [13.4, 5.5, 17.2],
    target: [0.1, 2.7, -0.1],
    fov: 44
  },
  cover: {
    position: [13.2, 5.7, 15.2],
    target: [0.1, 2.9, 0.1],
    fov: 38
  },
  coverMobile: {
    position: [13.0, 5.2, 16.2],
    target: [0.1, 2.8, 0],
    fov: 42
  },
  interior: {
    position: [-0.8, 2.05, 1.25],
    target: [0.8, 1.3, -4.5],
    fov: 76
  },
  interiorMobile: {
    position: [1.35, 1.9, -0.35],
    target: [-1.1, 1.3, -4.7],
    fov: 66
  },
  cabinet: {
    position: [4.95, 1.72, -4.1],
    target: [4.95, 1.34, -6.6],
    fov: 43
  },
  cabinetMobile: {
    position: [4.95, 1.7, -4.0],
    target: [4.95, 1.32, -6.6],
    fov: 52
  }
};

export function drinkById(id) {
  return DRINKS.find((drink) => drink.id === id) || null;
}

export function drinksFor(category) {
  return DRINKS.filter((drink) => drink.category === category);
}

export function getInitialState() {
  const params = new URLSearchParams(window.location.search);
  const hero = params.has('cover') || params.get('embed') === 'hero';
  const weather = params.get('weather') === 'rainy' ? 'rainy' : 'sunny';
  const viewParam = params.get('view');
  const view = !hero && (viewParam === 'interior' || viewParam === 'cabinet') ? viewParam : 'exterior';

  return {
    hero,
    embed: !hero && params.get('embed') === '1',
    weather,
    view,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    mobile: window.matchMedia('(max-width: 760px)').matches,
    order: null,
    orderDrink: null,
    menuTab: 'coffee',
    cabinetDrink: null,
    transitioning: false
  };
}
