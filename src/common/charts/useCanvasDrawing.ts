import { useEffect, useRef } from 'react';

/** Dibuja al montar, cuando cambian los datos y cuando cambia el tamaño del lienzo. */
export function useCanvasDrawing(draw: (canvas: HTMLCanvasElement) => void) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    draw(canvas);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      draw(canvas);
    });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
    };
  }, [draw]);

  return ref;
}
