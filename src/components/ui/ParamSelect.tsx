import { Select, Typography, Tooltip } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import type { ParamValue } from "../../types";

interface Props {
  label: string;
  hint?: string;
  value: ParamValue;
  options: { label: string; value: ParamValue }[];
  onChange: (v: ParamValue) => void;
}

export default function ParamSelect({ label, hint, value, options, onChange }: Props) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center gap-1">
        <Typography.Text type="secondary">{label}</Typography.Text>
        {hint && (
          <Tooltip title={hint}>
            <QuestionCircleOutlined style={{ color: "rgba(0,0,0,0.45)", fontSize: 12 }} />
          </Tooltip>
        )}
      </div>
      <Select
        value={value as string}
        options={options.map((o) => ({ label: o.label, value: String(o.value) }))}
        onChange={(v) => onChange(v)}
        style={{ width: "100%" }}
        size="small"
      />
    </div>
  );
}