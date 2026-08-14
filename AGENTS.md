# Repository Guidelines

ViSCV 是一个基于 Tauri 2 的图像增强可视化桌面应用。架构为「前端 + Rust 壳 + Python(OpenCV) 引擎 sidecar」：

- 前端：React 19 + TypeScript(strict) + Vite 7 + Ant Design 6 + TailwindCSS 4，状态 Zustand，路由 React Router 7，笔记 Tiptap 3。
- Rust（Tauri 2）：仅作桌面壳与转发代理，把前端的 invoke 转成 JSON-RPC 请求发给 Python 引擎。
- Python 引擎（`viscv_server/`）：OpenCV 实现全部图像增强算子、sqlite3 持久化、版本更新检查，常驻本地 HTTP 服务（PyInstaller 打包为单 exe sidecar）。

## Project Structure

- `src/` — 前端源码（React/TS）。
  - `src/pages/` — 模块页：`Workspace`、`Projects`、`Presets`、`Notes`、`Settings`、`About`。
  - `src/components/ui/` — 跨模块复用组件层（PageCard、ParamSlider、ParamSelect、EmptyState、HistogramChart）。
  - `src/lib/` — stores（Zustand）、backend（Tauri 命令桥接）、enhancements（算子目录/默认参数）、theme。
- `src-tauri/src/` — Rust 壳。
  - `engine.rs` — sidecar 生命周期（拉起/复用/崩溃重启/退出回收）+ JSON-RPC 转发与解析。
  - `commands.rs` — Tauri 命令（load/process/export、项目/预设/笔记 CRUD、设置、check_update），全部转发给引擎。
  - `models.rs` — 命令参数与返回值的序列化模型。
- `viscv_server/` — Python 引擎。
  - `processing.py` — OpenCV 实现整类图像增强算子（颜色/滤波/边缘/阈值/形态/翻转等） + 累积管线 + 直方图 + PNG/base64 编码；新增算子只需在此注册并在 `src/lib/enhancements.ts` 补 UI 规格。
  - `storage.py` — sqlite3（projects/presets/notes/settings，JSON 落库）。
  - `updater.py` — 基于标准库的版本检查。
  - `server.py` — 极简 JSON-RPC 服务（`/rpc` POST + `/health`），仅用 http.server。
  - `engine_main.py` — PyInstaller 打包入口。

## Interface (兼容红线，勿破坏)

Step 契约：`{ id, type, enabled, params }`；Tauri 命令名与参数保持现状；返回值保持 `ImageInfo{dataUrl,width,height,histograms}` 等形状不变。改动任何一方必须同步更新前端类型、commands.rs、以及 `server.py` 的 handle_command。

## Build, Test, and Development

Frontend / Rust：
- `npm install`、`npm run dev`（Vite 1430）、`npm run tauri dev`（原生窗口）。
- `npm run build`、`npm test`（Vitest）。
- `cd src-tauri && cargo test`、`cargo fmt && cargo clippy`。
- Windows 需 MSVC Build Tools；`cargo build` 需要 `src-tauri/binaries/viscv-engine-x86_64-pc-windows-msvc.exe` 存在。

Python 引擎：
- `cd viscv_server && python -m venv .venv`
- `.venv\Scripts\python -m pip install -r requirements.txt`
- `.venv\Scripts\python -m pytest viscv_server/tests`  # 从仓库根目录跑
- 打包 sidecar：`.venv\Scripts\python -m PyInstaller --onefile --name viscv-engine --distpath ..\src-tauri\binaries engine_main.py`，再把 `viscv-engine.exe` 重命名为带 target-triple 的名字。

运行时选择引擎：环境变量 `VISCV_ENGINE_PY`（Python 解释器，dev 用）或 `VISCV_ENGINE_EXE`（已打包 exe）；`VISCV_PORT`（默认 18999）、`VISCV_DATA_DIR`（数据目录，Rust 自动传入）。

## Style & Naming

- 前端：严格 TS；组件 `PascalCase.tsx`；函数/变量 `camelCase`；Hook 前缀 `use`。
- Rust：`snake_case`；JSON 契约用 `#[serde(rename_all="camelCase")]` 对齐前端。
- Python：`snake_case`；对外 JSON 键用 camelCase（与前端/Rust 一致）。
- 视觉一致性是硬性要求：新模块必须复用 `src/components/ui` 与 `PageCard`；颜色/圆角取自 AntD token，Tailwind 仅做布局间距。

## Testing

- 前端：`src/**/*.test.ts(x)`，Vitest + Testing Library。
- Rust：`cargo test` 覆盖转发层（请求构建/响应解析），不依赖真实引擎。
- Python：`pytest` 覆盖算子已知输出、Otsu/CLAHE、管线顺序与禁用跳过、直方图长度、storage CRUD round-trip、server 路由与 HTTP。
- 提交前：`npm test`、`cargo test`、`pytest` 均须通过。

## Commit & Pull Request

- 采用 Conventional Commits：`feat:` / `fix:` / `refactor:` / `docs:` / `test:` / `chore:`。
- 提交保持原子；PR 说明改了什么、为什么、关联 issue；UI/视觉变更附截图。