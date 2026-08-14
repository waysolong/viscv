import { useRef, useState } from "react";
import { Typography } from "antd";
import type { ImageInfo } from "../types";

const VIEW_H = 460;

function Zoomable({ info, title }: { info: ImageInfo; title: string }) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const onWheel = (e: React.WheelEvent) => {
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setScale((s) => Math.min(8, Math.max(0.2, s * factor)));
  };

  return (
    <div className="flex flex-col">
      <div className="mb-1 flex items-center justify-between">
        <Typography.Text strong>{title}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {info.width} × {info.height}　{Math.round(scale * 100)}%
        </Typography.Text>
      </div>
      <div
        className="viscv-canvas relative cursor-grab overflow-hidden rounded border select-none"
        style={{ height: VIEW_H, background: "#1f2937", touchAction: "none" }}
        onWheel={onWheel}
        onMouseDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
        }}
        onMouseMove={(e) => {
          if (!drag.current) return;
          setPan({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) });
        }}
        onMouseUp={() => (drag.current = null)}
        onMouseLeave={() => (drag.current = null)}
      >
        <img
          src={info.dataUrl}
          alt={title}
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transform: `scale(${scale}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: "center center",
            userSelect: "none",
          }}
        />
      </div>
    </div>
  );
}

interface Props {
  original: ImageInfo | null;
  result: ImageInfo | null;
}

export default function CompareView({ original, result }: Props) {
  if (!original) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        请先加载一张图像
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      <Zoomable info={original} title="原图" />
      <Zoomable info={result ?? original} title="当前结果" />
    </div>
  );
}