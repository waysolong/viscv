interface Props {
  data: number[];
  color?: string;
  height?: number;
}

/** 自绘直方图（SVG），无需额外图表库，保证风格统一。 */
export default function HistogramChart({ data, color = "#4f46e5", height = 80 }: Props) {
  const max = Math.max(1, ...data);
  const bins = 256;
  const w = 1000;
  const h = 100;
  const points = data.map((v, i) => {
    const x = (i / Math.max(1, bins - 1)) * w;
    const y = h - (v / max) * (h - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth={6} strokeLinejoin="round" />
    </svg>
  );
}