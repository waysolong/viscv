import { useEffect, useState } from "react";
import { Button, List, Typography, Popconfirm, Modal, Input, message } from "antd";
import { ThunderboltOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { usePresets, useEditor } from "../lib/stores";
import PageCard from "../components/ui/PageCard";
import EmptyState from "../components/ui/EmptyState";

export default function Presets() {
  const store = usePresets();
  const editor = useEditor();
  const navigate = useNavigate();
  const [msg, ctx] = message.useMessage();
  const [renameId, setRenameId] = useState<string | null>(null);
  const [name, setName] = useState("");

  useEffect(() => { store.load(); }, []);

  const apply = (id: string) => {
    const p = store.items.find((x) => x.id === id);
    if (!p) return;
    editor.setSteps(p.steps);
    msg.success("已应用到工作台管线");
    navigate("/");
  };

  const doRename = async () => {
    if (!renameId || !name.trim()) return;
    const p = store.items.find((x) => x.id === renameId);
    if (p) await store.upsert({ ...p, name: name.trim() });
    setRenameId(null);
  };

  return (
    <PageCard title="预设库" className="h-full" extra={<Typography.Text type="secondary">{store.items.length} 个预设</Typography.Text>}>
      {ctx}
      {store.items.length === 0 ? (
        <EmptyState description="还没有预设，可在工作台把管线保存为预设" />
      ) : (
        <List
          dataSource={store.items}
          renderItem={(p) => (
            <List.Item
              actions={[
                <Button key="apply" size="small" type="primary" icon={<ThunderboltOutlined />} onClick={() => apply(p.id)}>应用</Button>,
                <Button key="rn" size="small" icon={<EditOutlined />} onClick={() => { setRenameId(p.id); setName(p.name); }}>重命名</Button>,
                <Popconfirm key="del" title="删除该预设？" onConfirm={() => store.remove(p.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={p.name}
                description={`${p.steps.map((s) => s.type).join(" → ")}`}
              />
            </List.Item>
          )}
        />
      )}
      <Modal open={renameId !== null} title="重命名预设" onOk={doRename} onCancel={() => setRenameId(null)} okText="保存" cancelText="取消">
        <Input value={name} onChange={(e) => setName(e.target.value)} onPressEnter={doRename} placeholder="预设名称" />
      </Modal>
    </PageCard>
  );
}