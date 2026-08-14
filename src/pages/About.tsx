import { Typography, Space, Tag } from "antd";
import PageCard from "../components/ui/PageCard";

export default function About() {
  const stack = ["React 19", "TypeScript", "Vite 7", "Ant Design 6", "TailwindCSS 4", "Zustand", "React Router 7", "Tiptap 3", "Tauri 2", "Rust"];
  return (
    <PageCard title="关于 ViSCV">
      <Space direction="vertical" size="middle">
        <Typography.Title level={4} style={{ margin: 0 }}>ViSCV — 图像增强可视化软件</Typography.Title>
        <Typography.Paragraph type="secondary">
          面向病理/影像工作流设计的桌面工具：以“可排序累积管线”对图像做连续增强，
          并支持并排对比、直方图分析、项目/预设/笔记管理与自动更新检查。
        </Typography.Paragraph>
        <div>
          <Typography.Text strong>技术栈：</Typography.Text>
          <Space wrap style={{ marginTop: 8 }}>
            {stack.map((s) => <Tag key={s} color="blue">{s}</Tag>)}
          </Space>
        </div>
        <Typography.Text type="secondary">版本 0.1.0</Typography.Text>
      </Space>
    </PageCard>
  );
}