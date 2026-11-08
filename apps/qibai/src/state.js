export const VIEWS = {
  courtyard: {
    label: '庭院',
    en: 'COURTYARD',
    position: [18.0, 10.0, 23.0],
    target: [0.8, 2.8, 1.3],
    fov: 38,
    cutaway: false,
    interior: false
  },
  architecture: {
    label: '建筑',
    en: 'ARCHITECTURE',
    position: [12.5, 5.6, 15.5],
    target: [0, 4.2, -2.5],
    fov: 34,
    cutaway: false,
    interior: false
  },
  living: {
    label: '会客厅',
    en: 'LIVING ROOM',
    position: [7.4, 2.4, 9.4],
    target: [-2.2, 1.55, -5.0],
    fov: 39,
    cutaway: true,
    interior: true
  },
  bedroom: {
    label: '主卧',
    en: 'MASTER SUITE',
    position: [-1.2, 8.6, 4.6],
    target: [-2.6, 4.7, -6.3],
    fov: 42,
    cutaway: true,
    interior: true
  },
  parking: {
    label: '停车位',
    en: 'PARKING COURT',
    position: [1.6, 3.3, 13.0],
    target: [9.68, 0.95, 7.0],
    fov: 37,
    cutaway: false,
    interior: false
  },
  driveway: {
    label: '车道',
    en: 'GATEWAY',
    position: [0.2, 11.0, 0.5],
    target: [9.8, 0.9, 13.8],
    fov: 45,
    cutaway: false,
    interior: false
  },
  tea: {
    label: '茶室',
    en: 'TEA ROOM',
    position: [-3.6, 2.4, 2.7],
    target: [-8.7, 1.35, -3.7],
    fov: 40,
    cutaway: true,
    interior: true
  },
  aerial: {
    label: '鸟瞰',
    en: 'AERIAL',
    position: [19, 21, 23],
    target: [0, 0.6, 0],
    fov: 38,
    cutaway: false,
    interior: false
  }
};

export const VIEW_ORDER = ['courtyard', 'architecture', 'living', 'bedroom', 'aerial'];

export const LIGHT_MODES = {
  day: {
    label: '晨光',
    clock: '15:20',
    status: '苏州 · 晴日 15:20',
    top: '#9fc5cd',
    horizon: '#f2e6d2',
    sun: '#fff4dc',
    sunIntensity: 2.7,
    sunPosition: [24, 32, 18],
    hemiSky: '#d8e8e8',
    hemiGround: '#a39177',
    hemiIntensity: 0.75,
    ambient: 0.28,
    fog: '#d9e4df',
    fogDensity: 0.0048,
    exposure: 1.03,
    star: 0.0,
    warm: 0.38,
    windowGlow: 0.18,
    exteriorLights: 0.05
  },
  dusk: {
    label: '黄昏',
    clock: '18:42',
    status: '苏州 · 暮色 18:42',
    top: '#64708a',
    horizon: '#e8aa76',
    sun: '#ffb270',
    sunIntensity: 1.95,
    sunPosition: [-26, 14, 16],
    hemiSky: '#b9a9a6',
    hemiGround: '#6f5b4b',
    hemiIntensity: 0.6,
    ambient: 0.25,
    fog: '#c8a88f',
    fogDensity: 0.0062,
    exposure: 1.1,
    star: 0.08,
    warm: 1.18,
    windowGlow: 1.0,
    exteriorLights: 1.0
  },
  night: {
    label: '夜幕',
    clock: '21:30',
    status: '苏州 · 夜色 21:30',
    top: '#071225',
    horizon: '#1b2b3c',
    sun: '#b7c9df',
    sunIntensity: 0.28,
    sunPosition: [16, 26, -14],
    hemiSky: '#283848',
    hemiGround: '#10171a',
    hemiIntensity: 0.2,
    ambient: 0.1,
    fog: '#08121d',
    fogDensity: 0.009,
    exposure: 1.05,
    star: 1.0,
    warm: 2.15,
    windowGlow: 2.35,
    exteriorLights: 2.3
  }
};

export const ROOMS = {
  courtyard: {
    id: 'courtyard',
    index: '01 / COURTYARD',
    title: '樱花庭',
    en: 'THE CHERRY COURTYARD',
    view: 'courtyard',
    hotspotLabel: '樱花庭',
    hotspotEn: 'CHERRY COURTYARD',
    position: [-6.15, 3.1, 6.8],
    desc: '院墙围合出安静的春日光阴。樱花树偏西而立，花冠越过白墙，风起时落英铺满石板与车前。',
    specs: [
      ['210', '㎡ 庭院'],
      ['1', '株主景樱'],
      ['东风', '2 级']
    ],
    materials: [
      ['青石板', '#8f918a'],
      ['白墙', '#f1ebdf'],
      ['苔藓', '#68715d'],
      ['樱粉', '#e7bfc4']
    ],
    note: '点击庭院光点可随时回到这个视角。'
  },
  parking: {
    id: 'parking',
    index: '04 / PARKING',
    title: '停车位',
    en: 'THE PARKING COURT',
    view: 'parking',
    hotspotLabel: '停车位',
    hotspotEn: 'PARKING COURT',
    position: [9.4, 1.25, 7.4],
    desc: '车位藏于院墙内侧，以木格栅与绿植作背景。白色轿车安静停驻，新能源号牌在暖光下清晰可读。',
    specs: [
      ['1', '个车位'],
      ['5.6', 'm 开间'],
      ['苏EG59122', '车牌']
    ],
    materials: [
      ['珠光白', '#f6f4ee'],
      ['格栅木', '#5a3a26'],
      ['砾石', '#aaa18f'],
      ['黄铜', '#b08a55']
    ],
    note: '点击右下角“车辆驶出”按钮，可让白色轿车驶出院子；再次点击即可泊回车位。'
  },
  living: {
    id: 'living',
    index: '02 / LIVING',
    title: '会客厅',
    en: 'THE LIVING ROOM',
    view: 'living',
    hotspotLabel: '会客厅',
    hotspotEn: 'LIVING ROOM',
    position: [-1.6, 1.85, -4.4],
    desc: '整面落地窗把庭院的樱花与光线一同借入室内。白蜡木、胡桃木与亚麻构成安静而温暖的底色。',
    specs: [
      ['42', '㎡ 面积'],
      ['3.15', 'm 层高'],
      ['南向', '朝向']
    ],
    materials: [
      ['白蜡木', '#b98a5f'],
      ['胡桃木', '#6f452d'],
      ['亚麻', '#ded2be'],
      ['洞石', '#c7b79e']
    ],
    note: '剖切模式已开启，可清楚看到室内家具与暖光。'
  },
  tea: {
    id: 'tea',
    index: '03 / TEA',
    title: '茶室',
    en: 'THE TEA ROOM',
    view: 'tea',
    hotspotLabel: '茶室',
    hotspotEn: 'TEA ROOM',
    position: [-8.75, 1.55, -3.5],
    desc: '侧翼的小茶室面向庭院，榻榻米、矮桌与一盏纸灯构成日常的留白。竹帘落下时，光变得很慢。',
    specs: [
      ['18', '㎡ 面积'],
      ['1F', '楼层'],
      ['西侧', '朝向']
    ],
    materials: [
      ['榻榻米', '#b6a06c'],
      ['竹帘', '#c6a875'],
      ['纸灯', '#f3e3c4'],
      ['胡桃木', '#6f452d']
    ],
    note: '从会客厅穿过木格栅，可以进入茶室。'
  },
  bedroom: {
    id: 'bedroom',
    index: '05 / PRIVATE',
    title: '主卧',
    en: 'THE MASTER SUITE',
    view: 'bedroom',
    hotspotLabel: '主卧',
    hotspotEn: 'MASTER SUITE',
    position: [-2.6, 4.95, -4.9],
    desc: '二层主卧以木质包裹睡眠区，床头壁灯与窗帘缝隙里的院光，共同保留一种江南式的安静。',
    specs: [
      ['36', '㎡ 面积'],
      ['2F', '楼层'],
      ['东南', '朝向']
    ],
    materials: [
      ['胡桃木', '#6f452d'],
      ['亚麻', '#ded2be'],
      ['羊毛', '#cfc1aa'],
      ['黄铜', '#b08a55']
    ],
    note: '剖切模式已开启，镜头位于二层前上方。'
  }
};

export const HOTSPOTS = ['courtyard', 'parking', 'living', 'tea', 'bedroom'];

export function getInitialState() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  const light = params.get('light');
  const cutaway = params.get('cutaway');
  const petals = params.get('petals');
  const windParam = params.get('wind');
  const wind = windParam === null ? 0.55 : Number(windParam);

  return {
    view: VIEWS[view] ? view : 'courtyard',
    light: LIGHT_MODES[light] ? light : 'dusk',
    cutaway: cutaway === '1' ? true : cutaway === '0' ? false : false,
    petals: petals === '0' ? false : true,
    wind: Number.isFinite(wind) ? Math.min(1, Math.max(0, wind)) : 0.55,
    autoOrbit: true,
    panel: null,
    snapshot: params.get('snapshot') === '1'
  };
}

export function syncURL(state) {
  const params = new URLSearchParams();
  params.set('view', state.view);
  params.set('light', state.light);
  params.set('cutaway', state.cutaway ? '1' : '0');
  params.set('petals', state.petals ? '1' : '0');
  params.set('wind', state.wind.toFixed(2));
  const next = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', next);
}

export function windLabel(value) {
  if (value < 0.08) return '无风';
  if (value < 0.32) return '1级';
  if (value < 0.6) return '2级';
  if (value < 0.82) return '3级';
  return '4级';
}


