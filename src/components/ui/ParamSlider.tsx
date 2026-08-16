import { useRef } from "react";
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
  /** 滑块开始拖动（首次变化）时触发，用于只记录一次撤销快照。 */
  onEditStart?: () => void;
  /** 松手时触发。 */
  onAfterChange?: (v: number) => void;
}

/** 统一数值参数控件：拖动过程不逐个写历史，松手才结束。 */
export default function ParamSlider({
  label, hint, value, min, max, step = 1, onChange, onEditStart, onAfterChange,
}: Props) {
  const editing = useRef(false);
  const handleChange = (v: number) => {
    if (!editing.current) {
      editing.current = true;
      onEditStart?.();
    }
    onChange(v);
  };
  const handleAfter = (v: number) => {
    editing.current = false;
    onAfterChange?.(v);
  };
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
      <Slider min={min} max={max} step={step} value={value} onChange={handleChange} onAfterChange={handleAfter} />
    </div>
  );
}