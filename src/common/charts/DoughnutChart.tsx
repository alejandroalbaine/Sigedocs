import { useCallback } from 'react';
import { color, drawEmpty, prepareCanvas, readPalette } from './canvas.ts';
import styles from './charts.module.css';
import { useCanvasDrawing } from './useCanvasDrawing.ts';

export interface DoughnutChartProps {
  label: string;
  values: readonly number[];
}

/** Anillo proporcional a cada valor. Port de drawDoughnutChart. */
export function DoughnutChart({ label, values }: DoughnutChartProps) {
  const draw = useCallback(
    (canvas: HTMLCanvasElement) => {
      const prepared = prepareCanvas(canvas);
      if (!prepared) return;
      const { context, width, height } = prepared;
      const palette = readPalette(canvas);
      const normalized = values.map((value) => Math.max(0, Number.isFinite(value) ? value : 0));
      const total = normalized.reduce((sum, value) => sum + value, 0);
      if (total <= 0) {
        drawEmpty(context, width, height, palette);
        return;
      }

      const radius = Math.max(10, Math.min(width, height) * 0.38);
      let start = -Math.PI / 2;
      normalized.forEach((value, index) => {
        if (value <= 0) return;
        const end = start + (value / total) * Math.PI * 2;
        context.beginPath();
        context.arc(width / 2, height / 2, radius, start, end);
        context.strokeStyle = color(palette, index);
        context.lineWidth = Math.max(8, radius * 0.28);
        context.stroke();
        start = end;
      });
    },
    [values],
  );
  const ref = useCanvasDrawing(draw);

  return <canvas ref={ref} className={styles.doughnut} role="img" aria-label={label} />;
}
