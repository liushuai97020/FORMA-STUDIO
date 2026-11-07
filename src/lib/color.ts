/** Small color helpers used to derive translucent UI tokens from project themes. */

export function hexToRgb(hex: string): [number, number, number] {
  let value = hex.replace('#', '').trim();
  if (value.length === 3) {
    value = value
      .split('')
      .map((character) => character + character)
      .join('');
  }
  if (value.length !== 6) return [255, 255, 255];
  const number = Number.parseInt(value, 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

export function alpha(hex: string, opacity: number): string {
  const [red, green, blue] = hexToRgb(hex);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export function isDarkColor(hex: string): boolean {
  const [red, green, blue] = hexToRgb(hex);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance < 0.48;
}

export function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}
