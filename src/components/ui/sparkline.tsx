import { cn } from "@/lib/cn";

const WIDTH = 96;
const HEIGHT = 32;
const PADDING = 3;

type Point = { x: number; y: number };

/** Curva morbida che passa per tutti i punti (Catmull-Rom convertita in curve di Bézier). */
function smoothPath(points: Point[]): string {
  if (points.length === 1) {
    return `M 0 ${points[0].y} L ${WIDTH} ${points[0].y}`;
  }
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[index + 2] ?? next;
    const control1 = { x: current.x + (next.x - previous.x) / 6, y: current.y + (next.y - previous.y) / 6 };
    const control2 = { x: next.x - (afterNext.x - current.x) / 6, y: next.y - (afterNext.y - current.y) / 6 };
    path += ` C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${next.x} ${next.y}`;
  }
  return path;
}

/**
 * Piccola linea di andamento in SVG, senza librerie. Il valore esatto è sempre scritto accanto:
 * la linea mostra solo la tendenza, descritta a parole per chi usa uno screen reader.
 */
export function Sparkline({ values, label, className }: { values: number[]; label: string; className?: string }) {
  if (values.length === 0) {
    return null;
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? WIDTH / (values.length - 1) : 0;
  const points = values.map((value, index) => ({
    x: Math.round(index * step * 10) / 10,
    y: Math.round((HEIGHT - PADDING - ((value - min) / range) * (HEIGHT - PADDING * 2)) * 10) / 10,
  }));

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
      className={cn("h-8 w-24 overflow-visible", className)}
    >
      <path d={smoothPath(points)} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
