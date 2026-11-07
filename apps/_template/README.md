# 项目模板 / Project template

从仓库根目录复制本文件夹，放入 `apps/` 并重命名为你的项目文件夹（不能以下划线开头）：

```powershell
Copy-Item -Recurse apps\_template apps\my-project
```

然后修改：

1. `project.json` — 标题、中文副标题、分类、描述、主题色、排序；
2. `main.js` — 三维场景与交互；
3. `index.html` / `style.css` — 中文优先的覆盖层与排版；
4. 可选：放入一张 1600×1000 左右的 `cover.webp`，并在 `project.json` 写 `"cover": "cover.webp"`，作为首页项目封面。没有封面时会使用优雅的色块占位。

## 分类 / Categories

`category` 必须与网站的分类配置对应，配置在根目录：

```text
src/lib/categories.ts
```

现有类别：

- `Space` 空间：建筑、室内、园林、商店
- `Mobility` 出行：汽车、摩托
- `Living` 家居：家具、家居
- `Digital` 数码产品
- `Fashion` 服装
- `Beauty` 彩妆
- `Other` 其它（未分类项目）

如果要新增一个类别，在 `src/lib/categories.ts` 中添加一个 `CategoryConfig`，包含中文名、英文名、标题、介绍和主题色，网站导航、筛选、项目索引会自动更新。

## 技术约定

- 原生 HTML / CSS / JavaScript + Three.js，无需 React。
- 使用根目录已安装的依赖：`import * as THREE from 'three'`。
- 页面会在全屏 iframe 中以 `/apps/<项目文件夹名>/` 加载。
- 顶部右侧留空，父级会覆盖返回 / 切换 / 全屏控件。
- 中文优先，正文不小于 14–15px，小标签不小于 12px。
- 支持移动端（390×844）与 `prefers-reduced-motion`。
- `?cover=1` 时隐藏全部 UI，保持干净构图，用于生成封面截图。

完整说明见 [`docs/adding-a-study.md`](../../docs/adding-a-study.md)。
