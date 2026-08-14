import { Switch, Typography, Divider } from "antd";
import type { ParamValue, ProcessingStep } from "../types";
import { specFor } from "../lib/enhancements";
import ParamSlider from "./ui/ParamSlider";
import ParamSelect from "./ui/ParamSelect";

interface Props {
  step: ProcessingStep;
  onUpdate: (patch: Partial<ProcessingStep>) => void;
}

export default function StepParamCard({ step, onUpdate }: Props) {
  const spec = specFor(step.type);
  if (spec.params.length === 0) {
    return (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {spec.description}
      </Typography.Text>
    );
  }
  return (
    <div>
      {spec.params.map((p) => {
        const value = step.params[p.name] ?? p.default;
        const set = (v: ParamValue) => onUpdate({ params: { [p.name]: v } });
        if (p.kind === "number") {
          return (
            <ParamSlider
              key={p.name}
              label={p.label}
              value={Number(value)}
              min={p.min ?? 0}
              max={p.max ?? 100}
              step={p.step ?? 1}
              onChange={(v) => set(v)}
            />
          );
        }
        if (p.kind === "select" && p.options) {
          return (
            <ParamSelect
              key={p.name}
              label={p.label}
              value={value}
              options={p.options}
              onChange={set}
            />
          );
        }
        return (
          <div key={p.name} className="mb-3 flex items-center justify-between">
            <Typography.Text type="secondary">{p.label}</Typography.Text>
            <Switch size="small" checked={Boolean(value)} onChange={(v) => set(v)} />
          </div>
        );
      })}
      <Divider style={{ margin: "8px 0" }} />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{spec.description}</Typography.Text>
    </div>
  );
}