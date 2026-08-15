// 手绘 SVG 指标图解（无第三方图表依赖，风格与直方图组件一致）
export interface BarItem { label: string; value: number }

export function Bars({ items, color = "#4f46e5", height = 180 }: { items: BarItem[]; color?: string; height?: number }) {
  const w = 600, h = 100, pad = 10, padB = 24;
  const max = Math.max(...items.map((i) => i.value), 1e-6);
  const bw = (w - pad * (items.length + 1)) / items.length;
  return (
    <svg viewBox={`0 0 ${w} ${h + padB}`} style={{ width: "100%", height }}>
      {items.map((it, i) => {
        const x = pad + i * (bw + pad);
        const bh = (it.value / max) * (h - 8);
        return (
          <g key={i}>
            <rect x={x} y={h - bh} width={bw} height={bh} fill={color} rx={2} />
            <text x={x + bw / 2} y={h - bh - 4} textAnchor="middle" fontSize="11" fill="#333">{it.value.toFixed(2)}</text>
            <text x={x + bw / 2} y={h + 16} textAnchor="middle" fontSize="11" fill="#888">{it.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// 归一化 0~1 折线（如 PR 曲线 / 多阈值 AP）
export function Line({ points, color = "#4f46e5", height = 200, xLabel = "x", yLabel = "y" }:
  { points: [number, number][]; color?: string; height?: number; xLabel?: string; yLabel?: string }) {
  const w = 620, h = 120, padL = 38, padB = 24, padT = 10, padR = 12;
  const X = (v: number) => padL + v * (w - padL - padR);
  const Y = (v: number) => h - padB - v * (h - padT - padB);
  const poly = points.map((p) => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h + padB}`} style={{ width: "100%", height }}>
      <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="#ccc" />
      <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke="#ccc" />
      <text x={w - padR} y={h + 14} textAnchor="end" fontSize="10" fill="#888">{xLabel}</text>
      <text x={8} y={padT + 8} fontSize="10" fill="#888">{yLabel}</text>
      <polyline points={poly} fill="none" stroke={color} strokeWidth={2} />
      {points.map((p, i) => <circle key={i} cx={X(p[0])} cy={Y(p[1])} r={3} fill={color} />)}
    </svg>
  );
}

// IoU：GT 框 / 预测框 / 交集
export function IoUViz() {
  return (
    <svg viewBox="0 0 220 150" style={{ width: "100%", height: 170 }}>
      <rect x="25" y="35" width="120" height="95" fill="rgba(22,163,74,0.22)" stroke="#16a34a" strokeWidth="2" />
      <rect x="75" y="15" width="100" height="80" fill="rgba(59,130,246,0.25)" stroke="#3b82f6" strokeWidth="2" />
      <rect x="75" y="35" width="70" height="60" fill="rgba(239,68,68,0.4)" stroke="#ef4444" strokeWidth="2" />
      <text x="35" y="125" fontSize="12" fill="#16a34a">GT 真实框</text>
      <text x="135" y="30" fontSize="12" fill="#3b82f6">预测框</text>
      <text x="88" y="80" fontSize="11" fill="#b91c1c">交集</text>
    </svg>
  );
}

// TP / FP / FN / TN 示意网格
export function TPFPFNViz() {
  const cells = [
    { t: 1, p: 1 }, { t: 1, p: 1 }, { t: 0, p: 1 }, { t: 1, p: 1 },
    { t: 0, p: 0 }, { t: 1, p: 0 }, { t: 1, p: 1 }, { t: 0, p: 0 },
    { t: 1, p: 0 }, { t: 0, p: 0 }, { t: 0, p: 0 }, { t: 1, p: 1 },
  ];
  const colors: Record<string, string> = { TP: "#16a34a", FP: "#ef4444", FN: "#f59e0b", TN: "#9ca3af" };
  return (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: 170 }}>
      <g>{cells.map((c, i) => {
        const x = (i % 4) * 60 + 10, y = Math.floor(i / 4) * 45 + 10;
        const kind = c.t === 1 ? (c.p === 1 ? "TP" : "FN") : (c.p === 1 ? "FP" : "TN");
        return (
          <g key={i}>
            <rect x={x} y={y} width={50} height={35} rx={5} fill={colors[kind]} fillOpacity="0.8" />
            <text x={x + 25} y={y + 22} textAnchor="middle" fontSize="13" fill="#fff" fontWeight="bold">{kind}</text>
            <text x={x + 25} y={y + 12} textAnchor="middle" fontSize="9" fill="#fff">T:{c.t} P:{c.p}</text>
          </g>
        );
      })}
      </g>
    </svg>
  );
}

// 3×3 混淆矩阵热力图
export function ConfusionViz({ matrix, labels }:
  { matrix: number[][]; labels: string[] }) {
  const n = labels.length, cells = 160;
  return (
    <svg viewBox={`0 0 ${cells + 60} ${cells + 40}`} style={{ width: "100%", height: 220 }}>
      {labels.map((r, i) => <text key={`r${i}`} x={cells + 8} y={18 + i * (cells / n) + 6} fontSize="10" fill="#888">({labels[i]}){r}</text>)}
      {labels.map((c, j) => <text key={`c${j}`} x={6 + j * (cells / n) + (cells / n) / 2} y={14} fontSize="10" fill="#888">{c}</text>)}
      {labels.map((_, i) => labels.map((__, j) => {
        const v = matrix[i][j];
        const max = Math.max(...matrix.flat(), 1);
        const a = 0.15 + 0.75 * (v / max);
        const x = 10 + j * (cells / n), y = 16 + i * (cells / n), s = cells / n - 2;
        return (
          <g key={`${i}${j}`}>
            <rect x={x} y={y} width={s} height={s} rx={3} fill={i === j ? `rgba(22,163,74,${a})` : `rgba(99,102,241,${a * 0.8})`} stroke="#fff" />
            <text x={x + s / 2} y={y + s / 2 + 4} textAnchor="middle" fontSize="12" fill="#111">{v}</text>
          </g>
        );
      }))}
    </svg>
  );
}

export function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-4">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: it.color }} />
          <span style={{ fontSize: 12 }}>{it.label}</span>
        </span>
      ))}
    </div>
  );
}