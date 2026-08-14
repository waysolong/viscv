import { useEffect } from "react";
import { Button, List, Typography, Popconfirm, message } from "antd";
import { FolderOpenOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useProjects, useEditor } from "../lib/stores";
import * as backend from "../lib/backend";
import PageCard from "../components/ui/PageCard";
import EmptyState from "../components/ui/EmptyState";

export default function Projects() {
  const store = useProjects();
  const editor = useEditor();
  const navigate = useNavigate();
  const [msg, ctx] = message.useMessage();

  useEffect(() => { store.load(); }, []);

  const open = async (id: string) => {
    const p = store.items.find((x) => x.id === id);
    if (!p || !p.imagePath) { msg.warning("该项目没有关联图像"); return; }
    try {
      const info = await backend.loadImage(p.imagePath);
      editor.setOriginal(p.imagePath, info);
      editor.setSteps(p.steps);
      navigate("/");
    } catch (e) { msg.error("打开失败：" + String(e)); }
  };

  return (
    <PageCard title="项目库" className="h-full" extra={<Typography.Text type="secondary">{store.items.length} 个项目</Typography.Text>}>
      {ctx}
      {store.items.length === 0 ? (
        <EmptyState description="还没有项目，去工作台处理后保存一个" />
      ) : (
        <List
          dataSource={[...store.items].sort((a, b) => b.updatedAt - a.updatedAt)}
          renderItem={(p) => (
            <List.Item
              actions={[
                <Button key="open" size="small" icon={<FolderOpenOutlined />} onClick={() => open(p.id)}>打开</Button>,
                <Popconfirm key="del" title="删除该项目？" onConfirm={() => store.remove(p.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={p.name}
                description={`${p.steps.length} 步 · ${new Date(p.updatedAt).toLocaleString()}`}
              />
            </List.Item>
          )}
        />
      )}
    </PageCard>
  );
}