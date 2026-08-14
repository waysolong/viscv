import { Select, Typography } from "antd";
import type { ParamValue } from "../../types";

interface Props {
  label: string;
  value: ParamValue;
  options: { label: string; value: ParamValue }[];
  onChange: (v: ParamValue) => void;
}

export default function ParamSelect({ label, value, options, onChange }: Props) {
  return (
    <div className="mb-3">
      <Typography.Text type="secondary" className="mb-1 block">{label}</Typography.Text>
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