import { Empty } from "antd";
import type { ReactNode } from "react";

interface Props {
  description?: ReactNode;
  action?: ReactNode;
}
export default function EmptyState({ description, action }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-10">
      <Empty description={description ?? "暂无数据"} />
      {action}
    </div>
  );
}