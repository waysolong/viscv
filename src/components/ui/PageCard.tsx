import type { ReactNode } from "react";
import { Card, Typography } from "antd";

interface Props {
  title?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** 统一页面卡片外壳：所有模块共用，保证跨页面视觉一致。 */
export default function PageCard({ title, extra, children, className }: Props) {
  return (
    <Card className={className ?? ""} styles={{ body: { padding: 24 } }}>
      {(title || extra) && (
        <div className="mb-4 flex items-center justify-between">
          <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>
          {extra}
        </div>
      )}
      {children}
    </Card>
  );
}