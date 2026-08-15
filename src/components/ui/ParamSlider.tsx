import { Slider, Typography, Tooltip } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";

interface Props {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}

/** 统一数值参数控件：滑块 + 数值 + 可选悬停提示。 */
export default function ParamSlider({ label, hint, value, min, max, step = 1, onChange }: Props) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Typography.Text type="secondary">{label}</Typography.Text>
          {hint && (
            <Tooltip title={hint}>
              <QuestionCircleOutlined style={{ color: "rgba(0,0,0,0.45)", fontSize: 12 }} />
            </Tooltip>
          )}
        </span>
        <Typography.Text strong>{value}</Typography.Text>
      </div>
      <Slider min={min} max={max} step={step} value={value} onChange={onChange} />
    </div>
  );
}