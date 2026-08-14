import { Slider, Typography } from "antd";

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}

/** 统一数值参数控件：滑块 + 数字显示。 */
export default function ParamSlider({ label, value, min, max, step = 1, onChange }: Props) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <Typography.Text type="secondary">{label}</Typography.Text>
        <Typography.Text strong>{value}</Typography.Text>
      </div>
      <Slider min={min} max={max} step={step} value={value} onChange={onChange} />
    </div>
  );
}