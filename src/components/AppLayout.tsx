import { Layout, Menu, Button, theme } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppstoreOutlined, FolderOpenOutlined, StarOutlined, FileTextOutlined, ExperimentOutlined,
  SettingOutlined, InfoCircleOutlined, MenuFoldOutlined, MenuUnfoldOutlined, PictureOutlined,
} from "@ant-design/icons";
import { useUi } from "../lib/stores";

const items = [
  { key: "/", icon: <PictureOutlined />, label: "图像工作台" },
  { key: "/augment", icon: <ExperimentOutlined />, label: "图像增强" },
  { key: "/projects", icon: <FolderOpenOutlined />, label: "项目库" },
  { key: "/presets", icon: <StarOutlined />, label: "预设库" },
  { key: "/notes", icon: <FileTextOutlined />, label: "笔记" },
  { key: "/settings", icon: <SettingOutlined />, label: "设置" },
  { key: "/about", icon: <InfoCircleOutlined />, label: "关于" },
];

export default function AppLayout() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useUi((s) => s.collapsed);
  const toggleCollapsed = useUi((s) => s.toggleCollapsed);
  const selected = "/" + (location.pathname.split("/")[1] ?? "");

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Sider
        collapsible
        collapsed={collapsed}
        trigger={null}
        width={220}
        theme={token.colorBgContainer ? "light" : "light"}
        style={{ borderRight: `1px solid ${token.colorBorderSecondary}` }}
      >
        <div className="flex items-center gap-2 px-4 py-4" style={{ height: 56 }}>
          <AppstoreOutlined style={{ color: token.colorPrimary, fontSize: 20 }} />
          {!collapsed && <span className="font-semibold">ViSCV</span>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selected]}
          items={items}
          onClick={({ key }) => navigate(key)}
          style={{ borderInlineEnd: "none" }}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header
          style={{
            height: 56,
            lineHeight: "56px",
            paddingInline: 16,
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={toggleCollapsed} />
        </Layout.Header>
        <Layout.Content style={{ padding: 24, overflow: "auto" }}>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}