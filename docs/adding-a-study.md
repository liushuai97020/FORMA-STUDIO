# 新增一个三维项目 / Adding a study

## 两条规则

1. 一个 `apps/` 下的子文件夹，一个项目。
2. 文件夹中必须有 `project.json` 和 `index.html`，否则不会被收录。

```text
building-web/
├─ apps/
│  └─ my-project/            ← 不要以 _ 或 . 开头
│     ├─ project.json         # 项目清单
│     ├─ index.html           # 独立页面入口
│     ├─ style.css
│     ├─ main.js              # 原生 JS + Three.js
│     └─ cover.webp           # 可选：首页项目封面
```

Vite 会自动扫描 `apps/` 下所有包含 `project.json` + `index.html` 的文件夹，加入多页构建，并注入首页的分类、筛选、索引和项目查看器。**不需要修改任何 React 路由代码。**

> 新增文件夹或修改 `project.json` 后，开发服务器会自动重启一次。

---

## `project.json` 字段

```json
{
  "index": "06",
  "title": "Casa Mar",
  "subtitle": "临崖海滨住宅",
  "category": "Space",
  "type": "建筑",
  "year": "2026",
  "medium": "住宅 / 海滨",
  "location": "Comporta, Portugal",
  "area": "420 m²",
  "description": "One or two sentences in English about the project.",
  "descriptionZh": "用一两句中文，具体描述材质、光线与空间。",
  "tags": ["Beach villa", "Coastal", "Concrete"],
  "cover": "cover.webp",
  "order": 1,
  "theme": {
    "background": "#F2ECE3",
    "ink": "#1D1A17",
    "accent": "#B8653F",
    "accentSoft": "#DCC9B4"
  }
}
```

| 字段 | 说明 |
|------|------|
| `index` | 展示编号，如 `"06"`，用于项目卡片和查看器 |
| `order` | 排序数字，也决定“下一个项目”的顺序 |
| `title` | 项目名。可以是拉丁名（如 Casa Mar / GT-01）或中文名 |
| `subtitle` | **中文副标题**（首页项目卡、查看器会使用） |
| `category` | 大类，必须与 `src/lib/categories.ts` 中的 `id` 一致，例如 Space / Mobility / Living / Other |
| `type` | 可选，细分类型，如“建筑”“室内”“汽车”“摩托”“商店”；用于卡片标签 |
| `year` / `medium` / `location` / `area` | 项目元信息 |
| `description` | 英文描述，用于次级展示 |
| `descriptionZh` | **中文描述，用于主要展示** |
| `tags` | 标签数组 |
| `cover` | 可选，项目文件夹内的封面文件名。缺省时卡片使用设计好的色块占位 |
| `theme.background` | 项目主背景色（建议浅色或深色但有对比） |
| `theme.ink` | 前景文字色，必须与背景有足够对比度 |
| `theme.accent` | 强调色，驱动卡片、查看器、封面氛围 |
| `theme.accentSoft` | 辅助色 |

`cover.webp` 建议 1600×1000、小于 200 KB，从项目页面的 `?cover=1` 模式截图生成：

```text
http://localhost:5173/apps/my-project/?cover=1
```

> 如果项目使用新分类，请先在 `src/lib/categories.ts` 的 `CATEGORY_CONFIG` 中添加一份中英文与主题色配置。现有分类见该文件顶部。
>
> 封面文件会在生产构建时自动复制到 `dist/apps/<文件夹名>/cover.webp`，不需要手动放到 public。

---

## 分类配置（网站主题的来源）

分类配置在：

```text
src/lib/categories.ts
```

每个分类包含：

```ts
{
  id: 'Space',              // 与 project.json 的 category 对应
  label: 'Space',           // 英文名
  zh: '空间',                // 中文名，导航主展示
  order: 1,
  headlineZh: ['在空间之前，', '先看见它。'],  // 首页大标题，两行
  headlineEn: 'Space, before it exists.',
  description: '英文介绍……',
  descriptionZh: '中文介绍……',
  note: '英文注释',
  noteZh: '中文注释',
  theme: { background, ink, accent, accentSoft }
}
```

现有大类：

- `Space` 空间：建筑、室内、园林、商店
- `Mobility` 出行：汽车、摩托
- `Living` 家居：家具、家居
- `Digital` 数码产品
- `Fashion` 服装
- `Beauty` 彩妆
- `Other` 其它（未分类项目）

项目可在 `project.json` 中用可选字段 `type` 标记细分类型，例如“建筑”“室内”“汽车”。选择大类时，整个网站的底色、文字强调色、首页标题、类别说明、作品筛选都会切换；这是“先选大类，再选具体项目”的核心体验。**新增类别只需要改这个文件**，导航和索引会自动生长。

---

## 子项目页面约定

- 原生 HTML / CSS / JavaScript，无需 React；可以使用根目录安装的 Three.js。
- 通过 `import * as THREE from 'three'` 使用依赖，**不要用 CDN**。
- 页面在全屏 iframe 中打开：
  - 必须有响应式布局，至少覆盖 1440×900、390×844、844×390；
  - 顶部右侧保持干净（父级会叠加返回 / 切换 / 全屏控件）；
  - 页面本身不要出现滚动条或横向溢出；
  - 可以自由在底部、左侧放中文标题和说明。
- **中文优先**：主要标题、说明、交互提示使用中文；英文只作为小号次级信息。正文建议 ≥14-15px，小标签 ≥12px。
- 性能：
  - `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`；
  - 页面不可见时暂停 rAF；
  - `pagehide` 时 dispose 几何体 / 材质 / 纹理 / renderer；
  - 尽量程序化生成，避免大型未压缩纹理。
- `prefers-reduced-motion`：减少或关闭自动动画。
- 推荐支持 `?cover=1`：隐藏覆盖层，固定一个干净的 3/4 构图，方便生成项目卡封面。

---

## 父级如何加载项目（懒加载）

- 首页只加载**当前分类的第一件项目**作为实时预览（iframe）。
- 滚动离开首屏后，该 iframe 会卸载。
- 打开项目查看器时才加载对应项目的完整页面；关闭或切换时会立刻卸载旧 iframe，释放 WebGL context / 纹理 / 几何体。
- 因此即使以后有几十个项目，也不会在首页一次性加载所有资源。

---

## 本地检查清单

- [ ] `http://localhost:5173/apps/<文件夹名>/` 可以独立访问。
- [ ] `http://localhost:5173/apps/<文件夹名>/?cover=1` 显示干净封面构图，无 UI。
- [ ] 首页分类切换后，背景、标题、实时预览、项目筛选同步变化。
- [ ] 项目卡封面正常显示，构建后 `dist/apps/<文件夹名>/cover.webp` 存在。
- [ ] 打开查看器、关闭、切换下一个项目都正常，关闭后 iframe 被卸载。
- [ ] 390×844 移动端没有横向滚动，字体可读。
- [ ] `npm run build` 通过，`dist/apps/<文件夹名>/index.html` 存在。

---

## 常见问题

**新文件夹没有出现？**  
重启 `npm run dev`；确认文件夹不以 `_` / `.` 开头，包含 `project.json` 和 `index.html`，JSON 合法。

**分类显示成英文/没有主题？**  
`project.json` 的 `category` 与 `src/lib/categories.ts` 中的 `id` 不一致。添加分类配置或改成已有 id。

**项目卡没有封面？**  
在项目文件夹放 `cover.webp` 并在 `project.json` 添加 `"cover": "cover.webp"`。或直接使用色块占位。

**iframe 里空白？**  
在浏览器直接打开 `/<slug>/` 查看控制台。通常是 WebGL 初始化失败或模块路径错误。

**构建报 `Failed to resolve ./main.js`？**  
`index.html` 的脚本路径写错，或入口文件缺失。
