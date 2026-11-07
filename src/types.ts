export interface ProjectTheme {
  background: string;
  ink: string;
  accent: string;
  accentSoft: string;
}

export interface ProjectManifest {
  index: string;
  title: string;
  subtitle: string;
  category: string;
  /** 子类型，例如“建筑”“室内”“汽车”；用于卡片和索引中的细分标签。 */
  type?: string;
  year: string;
  medium: string;
  location: string;
  area: string;
  description: string;
  descriptionZh: string;
  tags: string[];
  /** Optional cover image filename inside the project folder, e.g. `cover.webp`. */
  cover?: string;
  order: number;
  theme: ProjectTheme;
}

export interface ProjectRecord extends ProjectManifest {
  /** Folder name / URL segment, e.g. `casa-mar`. */
  slug: string;
  /** Public URL for the standalone study, e.g. `/casa-mar/`. */
  base: string;
  /** Resolved cover URL, when the project supplies one. */
  coverUrl: string | null;
}

export const FALLBACK_THEME: ProjectTheme = {
  background: '#F2ECE3',
  ink: '#1D1A17',
  accent: '#B8653F',
  accentSoft: '#DCC9B4',
};
