# ViSCV 后端迁移到 Python(OpenCV) + PyInstaller sidecar 实施计划

> 技术路线：B1 —— 后端整体换 Python(OpenCV)，Tauri 只当桌面壳，通过 PyInstaller sidecar 打包。

## Summary
- 把当前 Tauri(Rust) 后端的图像处理、持久化、更新检查整体迁移到 Python，用 OpenCV(cv2) 实现全部算子；Python 引擎用 PyInstaller 打成单 exe，作为 Tauri sidecar 由应用拉起。
- 前端 React 与 Tauri 命令接口**保持不变**，前端代码零改动；Tauri 命令层变成转发到 Python sidecar 的薄代理。
- 解决现状：不再依赖本机缺装的系统 OpenCV，也不再需要自研 Otsu/CLAHE（直接用 cv2），之前 2 个失败的 Rust 测试由 Python 侧 pytest 替代。

## 接口约定（不变，作为兼容红线）
- Step 契约：`{ id: string, type: "brightness"|"contrast"|"gamma"|"histogram_eq"|"clahe"|"grayscale"|"gaussian_blur"|"median_blur"|"sharpen"|"threshold"|"canny"|"denoise", enabled: bool, params: object }`
- Tauri 命令名与参数保持现状：`load_image(path)`、`process_pipeline(path, steps)`、`export_image(path, steps, out_path)`、`list/save/delete_project`、`list/save/delete_preset`、`list/save/delete_note`、`get/save_settings`、`check_update`。
- 返回值保持 `ImageInfo{dataUrl,width,height,histograms}` 等形状不变。

## Python 引擎（新增 `viscv_server/`）
- `processing.py`：cv2 实现 12 个算子 + 累积可排序管线重放 + RGB/灰度直方图；输入解码支持 png/jpg/bmp/webp，结果编码 png → base64 dataUrl。
- `storage.py`：sqlite3 库（projects/presets/notes/settings，JSON 落库），CRUD 与 Rust 版等价。
- `updater.py`：用 `urllib/requests` 对 `update_url` 做版本检查，返回 `UpdateInfo`。
- `server.py`：极简本地 JSON 服务（推荐直接基于 `http.server` 自写 handler，避免引入 FastAPI 依赖），单端口、纯函数式路由。
- 依赖：`opencv-python`、`numpy`（自带于 opencv）、`pyproject.toml` + `requirements.txt` 锁版本。

## Rust 改动（src-tauri）
- 保留命令签名；`commands.rs` 内改为：确保 sidecar 进程存活 → 向本地 sidecar 端口发起请求 → 把 JSON 结果按原结构返回前端。
- 删除/停用 `enhance.rs` 自研算子与 rusqlite 路径；`db.rs`、`histogram.rs` 相关逻辑移除，由 Python 承载。
- sidecar 生命周期：`tauri.conf.json` 的 `bundle.externalBin` 声明 `viscv-engine`；启动时拉起、端口就绪探测、异常退出重启、应用退出时回收进程。

## 打包（sidecar）
- PyInstaller 命令产出 `viscv-engine(.exe)`，产物置于 `src-tauri/binaries/`，由 `externalBin` 引用。
- `tauri dev` 与 `tauri build` 均可启动 sidecar；无 Python 环境时给出明确错误提示。
- 体积预期：安装包显著增大（Python+numpy+opencv 数百 MB 级）。

## Test Plan
- Python（pytest）：每个算子对合成图断言已知输出；Otsu 双峰分离、CLAHE 输出灰度、管线顺序与禁用跳过、直方图长度=256；storage CRUD round-trip；server 路由请求/响应结构。
- Rust：`cargo test` 改为只覆盖转发层（mock sidecar），保证命令签名与序列化稳定。
- 前端：现有 7 个单测保持通过；手动验收：载图→链式操作→实时预览→导出一致。
- 端到端：`tauri dev` 下加载真实图片跑完整管线。

## Assumptions
- 打包走 PyInstaller 单 exe sidecar（已确认 B1）。
- Python 引擎常驻本地 HTTP 服务；Rust 用 reqwest 转发。
- 前端接口、Step 契约、命令名均保持向后兼容，不改动。
- sidecar 生命周期与端口就绪处理是重点风险，按"存活检测+就绪探测+崩溃重启+退出回收"实现。