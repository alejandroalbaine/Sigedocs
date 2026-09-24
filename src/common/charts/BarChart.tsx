import { useCallback } from 'react';
import { color, drawEmpty, prepareCanvas, readPalette } from './canvas.ts';
import styles from './charts.module.css';
import { useCanvasDrawing } from './useCanvasDrawing.ts';

export interface BarSeries {
  label: string;
  values: readonly number[];
}

export interface BarChartProps {
  /** Descripción para lectores de pantalla. */
  label: string;
  categories: readonly string[];
  series: readonly BarSeries[];
}

/** Barras agrupadas por categoría, una barra por serie. Port de drawBarChart. */
export function BarChart({ label, categories, series }: BarChartProps) {
  const draw = useCallback(
    (canvas: HTMLCanvasElement) => {
      const prepared = prepareCanvas(canvas);
      if (!prepared) return;
      const { context, width, height } = prepared;
      const palette = readPalette(canvas);
      const values = series.flatMap((serie) => serie.values).filter(Number.isFinite);
      const maximum = Math.max(0, ...values);
      if (categories.length === 0 || maximum <= 0) {
        drawEmpty(context, width, height, palette);
        return;
      }

      const padding = { top: 12, right: 12, bottom: 28, left: 36 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;
      const groupWidth = chartWidth / categories.length;
      const barWidth = Math.max(3, Math.min(18, (groupWidth * 0.56) / series.length));

      context.strokeStyle = palette.grid;
      context.fillStyle = palette.text;
      context.font = `12px ${palette.font}`;
      context.textAlign = 'right';
      context.textBaseline = 'middle';
      for (let step = 0; step <= 4; step++) {
        const y = padding.top + chartHeight * (step / 4);
        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.stroke();
        context.fillText(String(Math.round(maximum * (1 - step / 4))), padding.left - 6, y);
      }

      categories.forEach((category, index) => {
        const center = padding.left + groupWidth * index + groupWidth / 2;
        const start = center - (barWidth * series.length) / 2;
        series.forEach((serie, serieIndex) => {
          const barHeight = chartHeight * ((serie.values[index] ?? 0) / maximum);
          context.fillStyle = color(palette, serieIndex);
          context.fillRect(
            start + barWidth * serieIndex,
            padding.top + chartHeight - barHeight,
            barWidth - 1,
            barHeight,
          );
        });
        context.fillStyle = palette.text;
        context.textAlign = 'center';
        context.textBaseline = 'top';
        context.fillText(category, center, padding.top + chartHeight + 7);
      });
    },
    [categories, series],
  );
  const ref = useCanvasDrawing(draw);

  return <canvas ref={ref} className={styles.bar} role="img" aria-label={label} />;
}
