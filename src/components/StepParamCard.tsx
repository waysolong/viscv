import { Button, Switch, Typography, Divider, Tooltip } from "antd";
import { QuestionCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import type { ParamValue, ProcessingStep } from "../types";
import { defaultParams, hintFor, specFor } from "../lib/enhancements";
import ParamSlider from "./ui/ParamSlider";
import ParamSelect from "./ui/ParamSelect";

interface Props {
  step: ProcessingStep;
  onUpdate: (patch: Partial<ProcessingStep>) => void;
  /** 滑块拖动中的实时更新（不写撤销历史）。 */
  onUpdateLive: (patch: Partial<ProcessingStep>) => void;
  /** 滑块拖动开始，记录一次撤销快照。 */
  onBeginEdit: () => void;
}

export default function StepParamCard({ step, onUpdate, onUpdateLive, onBeginEdit }: Props) {
  const spec = specFor(step.type);
  if (spec.params.length === 0) {
    return (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {spec.description}
      </Typography.Text>
    );
  }
  const hint = (name: string) => spec.params.find((x) => x.name === name)?.hint ?? hintFor(step.type, name);

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Button size="small" type="link" icon={<ReloadOutlined />} onClick={() => onUpdate({ params: defaultParams(step.type) })}>
          恢复默认参数
        </Button>
      </div>
      {spec.params.map((p) => {
        const value = step.params[p.name] ?? p.default;
        const set = (v: ParamValue) => onUpdate({ params: { [p.name]: v } });
        if (p.kind === "number") {
          return (
            <ParamSlider
              key={p.name}
              label={p.label}
              hint={hint(p.name)}
              value={Number(value)}
              min={p.min ?? 0}
              max={p.max ?? 100}
              step={p.step ?? 1}
              onChange={(v) => onUpdateLive({ params: { [p.name]: v } })}
              onEditStart={onBeginEdit}
            />
          );
        }
        if (p.kind === "select" && p.options) {
          return (
            <ParamSelect
              key={p.name}
              label={p.label}
              hint={hint(p.name)}
              value={value}
              options={p.options}
              onChange={set}
            />
          );
        }
        return (
          <div key={p.name} className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Typography.Text type="secondary">{p.label}</Typography.Text>
              {hint(p.name) && (
                <Tooltip title={hint(p.name)}>
                  <QuestionCircleOutlined style={{ color: "rgba(0,0,0,0.45)", fontSize: 12 }} />
                </Tooltip>
              )}
            </span>
            <Switch size="small" checked={Boolean(value)} onChange={(v) => set(v)} />
          </div>
        );
      })}
      <Divider style={{ margin: "8px 0" }} />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{spec.description}</Typography.Text>
    </div>
  );
}