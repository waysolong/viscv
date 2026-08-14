import { useEffect, useState } from "react";
import { Button, List, Typography, Popconfirm, message, Space, Input } from "antd";
import { PlusOutlined, DeleteOutlined, SaveOutlined } from "@ant-design/icons";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useNotes } from "../lib/stores";
import { uid } from "../lib/enhancements";
import PageCard from "../components/ui/PageCard";
import EmptyState from "../components/ui/EmptyState";
import type { Note } from "../types";

export default function Notes() {
  const store = useNotes();
  const [msg, ctx] = message.useMessage();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [html, setHtml] = useState("");

  const active = store.items.find((n) => n.id === activeId) ?? null;

  useEffect(() => { store.load(); }, []);

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && active) {
      editor.commands.setContent(active.html);
      setTitle(active.title);
      setHtml(active.html);
    }
  }, [activeId]);

  const newNote = async () => {
    const n: Note = { id: uid(), title: "新笔记", html: "", projectId: null, updatedAt: Date.now() };
    await store.upsert(n);
    setActiveId(n.id);
  };

  const save = async () => {
    if (!active) return;
    await store.upsert({ ...active, title: title.trim() || active.title, html, updatedAt: Date.now() });
    msg.success("已保存");
  };

  return (
    <div className="grid h-full gap-3" style={{ gridTemplateColumns: "320px 1fr" }}>
      {ctx}
      <PageCard title="笔记列表" extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={newNote}>新建</Button>}>
        {store.items.length === 0 ? (
          <EmptyState description="暂无笔记" />
        ) : (
          <List
            size="small"
            dataSource={store.items}
            renderItem={(n) => (
              <List.Item
                className={`cursor-pointer rounded ${n.id === activeId ? "bg-indigo-100" : ""}`}
                onClick={() => setActiveId(n.id)}
                actions={[
                  <Popconfirm key="del" title="删除？" onConfirm={() => { store.remove(n.id); if (activeId === n.id) setActiveId(null); }}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta title={<Typography.Text strong>{n.title || "无标题"}</Typography.Text>} description={new Date(n.updatedAt).toLocaleString()} />
              </List.Item>
            )}
          />
        )}
      </PageCard>

      <PageCard title="笔记" extra={active && editor ? <Space><Button size="small" icon={<SaveOutlined />} onClick={save}>保存</Button></Space> : undefined}>
        {active ? (
          <div className="flex flex-col gap-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="笔记标题" />
            <div className="rounded border p-3" style={{ minHeight: 380 }}>
              <EditorContent editor={editor} />
            </div>
          </div>
        ) : (
          <EmptyState description="新建或选择一个笔记开始编辑" />
        )}
      </PageCard>
    </div>
  );
}