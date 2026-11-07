import type { SVGProps } from 'react';

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
} satisfies SVGProps<SVGSVGElement>;

export function ArrowUpRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M6.5 17.5 17.5 6.5M8.5 6.5h9v9" />
    </svg>
  );
}

export function ArrowRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" />
    </svg>
  );
}

export function ArrowLeft(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M20 12H5M10.5 6.5 5 12l5.5 5.5" />
    </svg>
  );
}

export function ArrowDown(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4v15M6.5 13.5 12 19l5.5-5.5" />
    </svg>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="m5.5 5.5 13 13M18.5 5.5l-13 13" />
    </svg>
  );
}

export function FullscreenIcon({
  exit = false,
  ...props
}: SVGProps<SVGSVGElement> & { exit?: boolean }) {
  return (
    <svg {...base} {...props}>
      {exit ? (
        <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
      ) : (
        <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
      )}
    </svg>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="6.25" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

export function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4.1" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.55 1.55M17.15 17.15l1.55 1.55M18.7 5.3l-1.55 1.55M6.85 17.15 5.3 18.7" />
    </svg>
  );
}

export function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M20.2 14.4A8.3 8.3 0 0 1 9.6 3.8 8.4 8.4 0 1 0 20.2 14.4Z" />
    </svg>
  );
}

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 8h17M3.5 16h17" />
    </svg>
  );
}
