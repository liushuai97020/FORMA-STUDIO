/// <reference types="vite/client" />

declare module 'virtual:projects' {
  import type { ProjectRecord } from './types';

  const projects: ProjectRecord[];
  export default projects;
}
