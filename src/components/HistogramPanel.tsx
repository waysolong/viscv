import { Typography } from "antd";
import type { HistogramBins } from "../types";
import HistogramChart from "./ui/HistogramChart";

interface Props {
  label?: string;
  data: HistogramBins | null;
  height?: number;
}

export default function HistogramPanel({ label, data, height = 64 }: Props) {
  if (!data) return null;
  return (
    <div>
      {label && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{label}</Typography.Text>}
      <HistogramChart data={data.gray} color="#6b7280" height={height} />
      <div className="mt-1 grid grid-cols-3 gap-1">
        <HistogramChart data={data.red} color="#ef4444" height={height} />
        <HistogramChart data={data.green} color="#22c55e" height={height} />
        <HistogramChart data={data.blue} color="#3b82f6" height={height} />
      </div>
    </div>
  );
}