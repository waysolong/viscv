import { useEffect, useRef, useState } from "react";
import { Button, List, Switch, Tag, Typography, Tooltip } from "antd";
import {
  ArrowUpOutlined, ArrowDownOutlined, DeleteOutlined, PlusOutlined, HolderOutlined,
} from "@ant-design/icons";
import type { ProcessingStep } from "../types";
import { ENHANCEMENTS, specFor } from "../lib/enhancements";
import StepParamCard from "./StepParamCard";

interface Props {
  steps: ProcessingStep[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<ProcessingStep>) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onMoveTo: (id: string, toIndex: number) => void;
  onAdd: (type: ProcessingStep["type"]) => void;
  /** 可选：只显示这些类型的操作按钮；缺省显示全部。 */
  types?: ProcessingStep["type"][];
}

interface DragState {
  id: string;
  startY: number;
  curX: number;
  curY: number;
}

export default function StepList({
  steps, selectedId, onSelect, onUpdate, onRemove, onToggle, onMove, onMoveTo, onAdd, types,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const lastUpRef = useRef<number>(0);
  const suppressClickRef = useRef<boolean>(false);
  const [dragView, setDragView] = useState<DragState | null>(null);

  const overIndexFromY = (clientY: number): number => {
    const el = listRef.current;
    if (!el) return 0;
    const rows = Array.from(el.querySelectorAll<HTMLElement>("[data-step-id]"));
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return i;
    }
    return Math.max(0, rows.length - 1);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      d.curX = e.clientX;
      d.curY = e.clientY;
      setDragView({ id: d.id, startY: d.startY, curX: d.curX, curY: d.curY });
    };
    const onUp = (e: MouseEvent) => {
      lastUpRef.current = Date.now();
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      setDragView(null);
      if (Math.abs(e.clientY - d.startY) > 6) {
        onMoveTo(d.id, overIndexFromY(e.clientY));
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const targetIdx = dragView ? overIndexFromY(dragView.curY) : null;
  const dragSpec = dragView ? specFor(steps.find((s) => s.id === dragView.id)?.type ?? "brightness") : null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-2 flex flex-wrap gap-1">
        {(types ? ENHANCEMENTS.filter((e) => types.includes(e.type)) : ENHANCEMENTS).map((e) => (
          <Tooltip key={e.type} title={e.label}>
            <Button size="small" icon={<PlusOutlined />} onClick={() => onAdd(e.type)} style={{ paddingInline: 8 }}>
              {e.label}
            </Button>
          </Tooltip>
        ))}
      </div>

      <div ref={listRef} className="flex-1 overflow-auto pr-1">
        <List
          size="small"
          dataSource={steps}
          locale={{ emptyText: <Typography.Text type="secondary">点击上方按钮添加处理步骤</Typography.Text> }}
          renderItem={(step, idx) => {
            const spec = specFor(step.type);
            const selected = step.id === selectedId;
            const isDragging = dragView?.id === step.id;
            const isLanding = !isDragging && dragView !== null && idx === targetIdx;
            return (
              <div
                data-step-id={step.id}
                className={`mb-2 rounded border p-2 ${selected ? "border-indigo-500" : ""} ${
                  step.enabled ? "" : "opacity-60"
                }`}
                style={{
                  cursor: isDragging ? "grabbing" : "grab",
                  userSelect: dragView ? "none" : undefined,
                  opacity: isDragging ? 0.25 : undefined,
                  borderTop: isLanding ? "3px solid #6366f1" : undefined,
                  background: isLanding ? "rgba(99,102,241,0.10)" : selected ? "rgba(79,70,229,0.06)" : undefined,
                }}
                onMouseDown={(e) => {
                  if (e.button !== 0) return;
                  const t = e.target as HTMLElement;
                  if (t.closest("button") || t.closest(".ant-switch") || t.closest("input")) return;
                  const now = Date.now();
                  // 只有快速双击（距上次松开 < 200ms）的第二次按下才启动拖拽
                  if (now - lastUpRef.current < 200) {
                    e.preventDefault();
                    suppressClickRef.current = true;
                    dragRef.current = { id: step.id, startY: e.clientY, curX: e.clientX, curY: e.clientY };
                    setDragView({ id: step.id, startY: e.clientY, curX: e.clientX, curY: e.clientY });
                  } else {
                    dragRef.current = null;
                  }
                }}
                onClick={() => {
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    return;
                  }
                  onSelect(selected ? null : step.id);
                }}
              >
                <div className="flex items-center justify-between">
                  <Typography.Text strong style={{ fontSize: 13 }}>
                    <HolderOutlined className="mr-1 text-gray-400" />
                    <span className="mr-2 text-gray-400">{idx + 1}.</span>
                    {spec.label}
                  </Typography.Text>
                  <div className="flex items-center gap-1">
                    <Tag style={{ marginInlineEnd: 0 }} color={step.enabled ? "blue" : "default"}>
                      {step.enabled ? "启用" : "停用"}
                    </Tag>
                    <Switch size="small" checked={step.enabled} onChange={() => onToggle(step.id)} />
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={idx === 0} onClick={(e) => { e.stopPropagation(); onMove(step.id, -1); }} />
                  <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={idx === steps.length - 1} onClick={(e) => { e.stopPropagation(); onMove(step.id, 1); }} />
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); onRemove(step.id); }} />
                </div>
                {selected && (
                  <div className="mt-2 border-t pt-2" onClick={(e) => e.stopPropagation()}>
                    <StepParamCard step={step} onUpdate={(patch) => onUpdate(step.id, patch)} />
                  </div>
                )}
              </div>
            );
          }}
        />
      </div>

      {/* 拖动时跟随鼠标的浮动块 */}
      {dragView && dragSpec && (
        <div
          className="pointer-events-none fixed z-50 flex items-center gap-2 rounded-md border-2 border-indigo-400 bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-xl"
          style={{
            left: dragView.curX + 14,
            top: dragView.curY - 18,
            transform: "translateY(-50%)",
          }}
        >
          <HolderOutlined />
          {dragSpec.label}
        </div>
      )}
    </div>
  );
}