/**
 * Utilidades de dibujo portadas de legacy/charts.js. Los colores salen de los tokens CSS
 * (--chart-*) en el momento de dibujar: el gráfico no guarda colores propios.
 */
export interface Palette {
  series: string[];
  grid: string;
  text: string;
  font: string;
}

export function readPalette(element: Element): Palette {
  const style = getComputedStyle(element);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    series: [token('--chart-1'), token('--chart-2'), token('--chart-3'), token('--chart-4')],
    grid: token('--chart-grid'),
    text: token('--chart-text'),
    font: token('--font-sans') || 'sans-serif',
  };
}

export function prepareCanvas(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');
  if (!context) return null;
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.max(1, window.devicePixelRatio);
  const width = Math.max(1, Math.round(rect.width || canvas.clientWidth || 300));
  const height = Math.max(1, Math.round(rect.height || canvas.clientHeight || 150));
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  return { context, width, height };
}

export function drawEmpty(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: Palette,
) {
  context.fillStyle = palette.text;
  context.font = `13px ${palette.font}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('Sin datos disponibles', width / 2, height / 2);
}

export function color(palette: Palette, index: number): string {
  return palette.series[index % palette.series.length] ?? palette.text;
}
