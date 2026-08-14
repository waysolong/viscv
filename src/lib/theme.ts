import { theme as antdTheme } from "antd";
import type { ThemeConfig } from "antd";
import type { AppSettings } from "../types";

export function themeConfig(theme: AppSettings["theme"]): ThemeConfig {
  return {
    algorithm: theme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: "#4f46e5",
      colorInfo: "#4f46e5",
      borderRadius: 8,
      colorBgLayout: theme === "dark" ? "#0f1115" : "#f4f5f7",
    },
  };
}