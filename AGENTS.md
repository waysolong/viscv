# Repository Guidelines

ViSCV 是一个基于 Tauri 2 的图像增强可视化桌面应用。前端为 React 19 + TypeScript + Vite 7 + Ant Design 6 + TailwindCSS 4，状态用 Zustand，路由用 React Router 7，笔记用 Tiptap 3；后端为 Rust，负责图像处理、本机持久化（rusqlite）与更新检查（reqwest）。

## Project Structure

- `src/` — 前端源码（React/TS）。
  - `src/pages/` — 各功能模块页：`Workspace`（管线编辑）、`Projects`、`Presets`、`Notes`、`Settings`、`About`。
  - `src/components/ui/` — 跨模块复用的统一组件层（`PageCard`、`ParamSlider`、`ParamSelect`、`EmptyState`、`HistogramChart`）。
  - `src/lib/` — `stores.ts`（Zustand）、`backend.ts`（Tauri 命令桥接）、`enhancements.ts`（算子目录与默认参数）、`theme.ts`。
- `src-tauri/src/` — Rust 后端。
  - `enhance.rs` — 全部图像增强算子与管线重放。
  - `commands.rs` — Tauri 命令（`load_image`、`process_pipeline`、`export_image`、CRUD、`check_update`）。
  - `db.rs` / `histogram.rs` / `models.rs` — 持久化、直方图、序列化模型。

## Build, Test, and Development

- `npm install` — 安装前端依赖。
- `npm run dev` — 启动 Vite 开发服务器（端口 1420）。
- `npm run tauri dev` — 以原生桌面窗口运行。
- `npm run build` — `tsc -b` 类型检查 + `vite build`。
- `npm test` — 前端单元测试（Vitest）。
- `cd src-tauri && cargo test` — Rust 单元测试。
- `cd src-tauri && cargo fmt && cargo clippy` — 格式化与静态检查。

Windows 构建需要 **MSVC Build Tools**（`cl.exe`/`link.exe`，可在 VS Developer 环境引入）；本机 MinGW/GNU 工具链与当前 Rust std 不兼容，不要切换。

图像处理目前用纯 Rust `image` crate 实现（系统未装 OpenCV）。`enhance.rs` 对外接口只依赖 `Step` 参数契约，可无缝替换为 `opencv` crate，无需改动命令层。新增算子时在 `src/lib/enhancements.ts` 与 `src-tauri/src/enhance.rs` 的 `apply_step` 同步注册。

## Style & Naming

- 前端：严格 TypeScript；组件文件 `PascalCase.tsx`；函数/变量 `camelCase`；Hook 前缀 `use`。
- Rust：`snake_case`；外部 JSON 契约用 `#[serde(rename_all = "camelCase")]`。
- 视觉一致性是硬性要求：新模块必须复用 `components/ui` 的组件与 `PageCard` 外壳；颜色/圆角等一律取自 AntD 主题 token，Tailwind 只用于布局间距，禁止各页面自成一套样式。

## Testing

- 前端：`src/**/*.test.ts(x)`，用 Vitest + Testing Library。
- Rust：模块内 `#[cfg(test)]`，覆盖算子已知输出、管线重放、DB round-trip。
- 提交前前端 `npm test`、Rust `cargo test` 必须全绿。

## Commit & Pull Request

- 采用 Conventional Commits：`feat:` / `fix:` / `refactor:` / `docs:` / `test:` / `chore:`。
- 提交保持原子（一次只改一件事）。
- PR 需说明改了什么、为什么、关联 issue，UI/视觉变更附截图。