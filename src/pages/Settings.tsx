import { useEffect, useState } from "react";
import { Button, Input, Segmented, Switch, Form, Typography, Modal, message, Space } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import { useSettings } from "../lib/stores";
import * as backend from "../lib/backend";
import PageCard from "../components/ui/PageCard";
import type { UpdateInfo } from "../types";

export default function Settings() {
  const settings = useSettings();
  const [msg, ctx] = message.useMessage();
  const [upd, setUpd] = useState<UpdateInfo | null>(null);

  useEffect(() => { settings.load(); }, []);

  const check = async () => {
    msg.loading({ content: "检查更新中…", key: "upd" });
    const r = await backend.checkUpdate();
    msg.destroy("upd");
    setUpd(r);
  };

  return (
    <PageCard title="设置">
      {ctx}
      <Form layout="vertical" style={{ maxWidth: 520 }}>
        <Form.Item label="主题">
          <Segmented
            options={[{ label: "浅色", value: "light" }, { label: "深色", value: "dark" }]}
            value={settings.theme}
            onChange={(v) => settings.update({ theme: v as "light" | "dark" })}
          />
        </Form.Item>
        <Form.Item label="更新检查地址 (reqwest)">
          <Input value={settings.updateUrl} onChange={(e) => settings.update({ updateUrl: e.target.value })} placeholder="https://…" />
        </Form.Item>
        <Form.Item label="启动时自动检查更新">
          <Switch checked={settings.checkOnStart} onChange={(v) => settings.update({ checkOnStart: v })} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button onClick={check}>立即检查更新</Button>
            <Typography.Text type="secondary">当前版本 0.1.0</Typography.Text>
          </Space>
        </Form.Item>
      </Form>

      <Modal open={!!upd} title="检查更新" onCancel={() => setUpd(null)} footer={null}>
        {upd && (
          <div>
            <p><CheckCircleOutlined style={{ color: "#22c55e" }} /> 当前 {upd.current} · 最新 {upd.latest}</p>
            <p>{upd.updateAvailable ? "发现新版本" : "已是最新版本"}</p>
            <Typography.Text type="secondary">{upd.message}</Typography.Text>
          </div>
        )}
      </Modal>
    </PageCard>
  );
}