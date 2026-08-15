import { useEffect } from "react";
import { ConfigProvider, App as AntApp } from "antd";
import { HashRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Workspace from "./pages/Workspace";
import ImageAugmentation from "./pages/ImageAugmentation";
import MetricsGuide from "./pages/MetricsGuide";
import Projects from "./pages/Projects";
import Presets from "./pages/Presets";
import Notes from "./pages/Notes";
import Settings from "./pages/Settings";
import About from "./pages/About";
import { themeConfig } from "./lib/theme";
import { useSettings } from "./lib/stores";

export default function App() {
  const settings = useSettings();

  useEffect(() => { settings.load(); }, []);

  return (
    <ConfigProvider theme={themeConfig(settings.theme)}>
      <AntApp>
        <HashRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Workspace />} />
              <Route path="augment" element={<ImageAugmentation />} />
              <Route path="metrics" element={<MetricsGuide />} />
              <Route path="projects" element={<Projects />} />
              <Route path="presets" element={<Presets />} />
              <Route path="notes" element={<Notes />} />
              <Route path="settings" element={<Settings />} />
              <Route path="about" element={<About />} />
            </Route>
          </Routes>
        </HashRouter>
      </AntApp>
    </ConfigProvider>
  );
}