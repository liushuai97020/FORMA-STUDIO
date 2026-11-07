import fs from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * FORMA auto-discovers its exhibits.
 *
 * Every direct child folder of `apps/` that contains a `project.json` + `index.html`
 * is treated as a self-contained project.
 * It is added to the Vite multi-page build and exposed to the React shell
 * through the `virtual:projects` module.
 */
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const appsDir = path.join(rootDir, 'apps');

interface ProjectTheme {
  background: string;
  ink: string;
  accent: string;
  accentSoft: string;
}

interface ProjectManifest {
  index: string;
  title: string;
  subtitle: string;
  category: string;
  type?: string;
  year: string;
  medium: string;
  location: string;
  area: string;
  description: string;
  descriptionZh: string;
  tags: string[];
  cover?: string;
  order: number;
  theme: ProjectTheme;
}

interface ProjectRecord extends ProjectManifest {
  slug: string;
  base: string;
  coverUrl: string | null;
}

function fail(message: string): never {
  throw new Error(`[FORMA projects] ${message}`);
}

function readProject(slug: string): ProjectRecord | null {
  const folder = path.join(appsDir, slug);
  const manifestPath = path.join(folder, 'project.json');
  if (!fs.existsSync(manifestPath)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    fail(`${slug}/project.json is not valid JSON. ${String(error)}`);
  }

  const manifest = parsed as Partial<ProjectManifest>;
  const requiredStrings: (keyof ProjectManifest)[] = [
    'index',
    'title',
    'subtitle',
    'category',
    'year',
    'medium',
    'location',
    'area',
    'description',
    'descriptionZh',
  ];

  for (const key of requiredStrings) {
    if (typeof manifest[key] !== 'string' || !manifest[key]) {
      fail(`${slug}/project.json is missing the string field "${key}".`);
    }
  }
  if (!Array.isArray(manifest.tags) || manifest.tags.length === 0) {
    fail(`${slug}/project.json needs a non-empty "tags" array.`);
  }
  if (typeof manifest.order !== 'number' || Number.isNaN(manifest.order)) {
    fail(`${slug}/project.json needs a numeric "order".`);
  }
  const theme = manifest.theme;
  if (
    !theme ||
    typeof theme.background !== 'string' ||
    typeof theme.ink !== 'string' ||
    typeof theme.accent !== 'string' ||
    typeof theme.accentSoft !== 'string'
  ) {
    fail(`${slug}/project.json needs a "theme" object with background, ink, accent and accentSoft.`);
  }
  if (manifest.type !== undefined && typeof manifest.type !== 'string') {
    fail(`${slug}/project.json "type" must be a string when provided.`);
  }
  if (manifest.cover !== undefined && typeof manifest.cover !== 'string') {
    fail(`${slug}/project.json "cover" must be a filename string when provided.`);
  }
  if (!fs.existsSync(path.join(folder, 'index.html'))) {
    fail(`${slug}/ must contain an index.html entry point.`);
  }
  if (manifest.cover && !fs.existsSync(path.join(folder, manifest.cover))) {
    console.warn(
      `[FORMA projects] ${slug}/${manifest.cover} does not exist yet — the card will use a fallback cover.`,
    );
  }

  return {
    ...(manifest as ProjectManifest),
    slug,
    base: `/apps/${slug}/`,
    coverUrl: manifest.cover ? `/apps/${slug}/${manifest.cover}` : null,
  };
}

function discoverProjects(): ProjectRecord[] {
  if (!fs.existsSync(appsDir)) return [];
  const projects = fs
    .readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('.') && !name.startsWith('_'))
    .map(readProject)
    .filter((project): project is ProjectRecord => project !== null)
    .sort((a, b) => a.order - b.order);

  if (projects.length === 0) {
    console.warn(
      '[FORMA projects] No project folders found. Add apps/<slug>/project.json + apps/<slug>/index.html.',
    );
  }

  return projects;
}

const projects = discoverProjects();

function projectsModule(): Plugin {
  const virtualId = '\0virtual:projects';
  return {
    name: 'forma-projects',
    resolveId(id) {
      if (id === 'virtual:projects') return virtualId;
      return null;
    },
    load(id) {
      if (id !== virtualId) return null;
      return `export default ${JSON.stringify(discoverProjects())};`;
    },
    configureServer(server) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const restart = (file: string) => {
        if (path.basename(file) !== 'project.json') return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          server.config.logger.info(
            '[FORMA projects] project.json changed — restarting to refresh the archive.',
          );
          void server.restart();
        }, 180);
      };
      server.watcher.add(appsDir);
      server.watcher.on('add', restart);
      server.watcher.on('change', restart);
      server.watcher.on('unlink', restart);
    },
  };
}

function projectAssetsPlugin(projectList: ProjectRecord[]): Plugin {
  let outDir = path.resolve(rootDir, 'dist');
  return {
    name: 'forma-project-assets',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(rootDir, config.build.outDir);
    },
    async closeBundle() {
      // Covers are manifest-level assets, outside the child page's import graph,
      // so Vite does not copy them automatically. Copy them next to each built
      // project page so /apps/<slug>/cover.webp exists in production and on Vercel.
      for (const project of projectList) {
        if (!project.cover) continue;
        const source = path.join(appsDir, project.slug, project.cover);
        if (!fs.existsSync(source)) continue;
        const destination = path.join(outDir, 'apps', project.slug, project.cover);
        await mkdir(path.dirname(destination), { recursive: true });
        await copyFile(source, destination);
      }
    },
  };
}

const input: Record<string, string> = {
  main: path.resolve(rootDir, 'index.html'),
};
for (const project of projects) {
  input[project.slug] = path.resolve(appsDir, project.slug, 'index.html');
}

export default defineConfig({
  plugins: [react(), projectsModule(), projectAssetsPlugin(projects)],
  server: {
    port: 5173,
    host: true,
    watch: {
      // Teammates and future contributors sometimes create browser profiles or
      // screenshot harnesses inside project folders; never let those trigger
      // reload storms or be served as part of the site.
      ignored: [
        '**/.preview/**',
        '**/.tmp-browser/**',
        '**/.tmp/**',
        '**/node_modules/**',
        '**/.git/**',
        '**/_preview*',
        '**/_webgltest*',
      ],
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: { input },
    assetsInlineLimit: 4096,
    // Three.js is shared by the portfolio and every project; it is lazy-loaded,
    // so its size is expected and cached once.
    chunkSizeWarningLimit: 600,
  },
});
