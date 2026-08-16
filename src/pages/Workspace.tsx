import { useCallback, useEffect, useRef } from "react";
import { Button, Space, Tooltip, message, Spin } from "antd";
import {
  FolderOpenOutlined, UndoOutlined, RedoOutlined, ExportOutlined,
  SaveOutlined, StarOutlined, ClearOutlined,
} from "@ant-design/icons";
import { useEditor, usePresets, useProjects } from "../lib/stores";
import * as backend from "../lib/backend";
import CompareView from "../components/CompareView";
import HistogramPanel from "../components/HistogramPanel";
import StepList from "../components/StepList";
import PageCard from "../components/ui/PageCard";
import EmptyState from "../components/ui/EmptyState";
import { uid, WORKSPACE_TYPES } from "../lib/enhancements";
import type { EnhancementType, ImageInfo, Project } from "../types";

function emptyHistograms() {
  return { gray: [], red: [], green: [], blue: [] };
}

export default function Workspace() {
  const editor = useEditor();
  const presets = usePresets();
  const projects = useProjects();
  const [msg, ctx] = message.useMessage();
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recompute = useCallback(async () => {
    if (!editor.originalPath || !backend.isTauri()) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        editor.setBusy(true);
        editor.setError(null);
        const res = await backend.processPipeline(editor.originalPath!, editor.steps);
        editor.setResult(res);
      } catch (e) {
        editor.setError(String(e));
        msg.error("处理失败：" + String(e));
      } finally {
        editor.setBusy(false);
      }
    }, 250);
  }, [editor.originalPath, editor.steps, editor.setBusy, editor.setResult, editor.setError, msg]);

  useEffect(() => {
    recompute();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [recompute]);

  // 启动时默认打开内置示例图（若尚未加载图像）
  useEffect(() => {
    if (!backend.isTauri()) return;
    let cancelled = false;
    (async () => {
      try {
        if (useEditor.getState().originalPath) return;
        const path = await backend.defaultImagePath();
        if (cancelled || useEditor.getState().originalPath) return;
        const info = await backend.loadImage(path);
        if (!cancelled) useEditor.getState().setOriginal(path, info);
      } catch (e) { console.error("[viscv] 默认示例图加载失败", e); msg.error("默认示例图加载失败：" + String(e)); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLoad = async (path: string) => {
    try {
      const info = await backend.loadImage(path);
      editor.setOriginal(path, info);
    } catch (e) {
      msg.error("加载失败：" + String(e));
    }
  };

  const onPick = async () => {
    try {
      if (backend.isTauri()) {
        const path = await backend.pickImage();
        if (path) await onLoad(path);
      } else {
        fileRef.current?.click();
      }
    } catch (e) {
      msg.error("打开图像失败：" + String(e));
    }
  };

  const onFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });
    const img = new Image();
    img.onload = () => {
      const info: ImageInfo = { dataUrl, width: img.width, height: img.height, histograms: emptyHistograms() };
      editor.setOriginal(file.name, info);
    };
    img.src = dataUrl;
  };

  const onExport = async () => {
    if (!editor.originalPath) return;
    const out = await backend.pickSavePath("viscv-export.png");
    if (!out) return;
    editor.setBusy(true);
    try {
      await backend.exportImage(editor.originalPath, editor.steps, out);
      msg.success("导出成功：" + out);
    } catch (err) {
      msg.error("导出失败：" + String(err));
    } finally {
      editor.setBusy(false);
    }
  };

  const onSaveProject = async () => {
    if (!editor.originalPath) return;
    const p: Project = {
      id: uid(), name: "未命名项目", imagePath: editor.originalPath,
      steps: editor.steps, note: "", createdAt: Date.now(), updatedAt: Date.now(),
    };
    await projects.upsert(p);
    msg.success("已保存到项目库");
  };

  const onSavePreset = async () => {
    if (!editor.steps.length) { msg.info("请先添加至少一个处理步骤"); return; }
    await presets.upsert({ id: uid(), name: "新建预设", steps: editor.steps, createdAt: Date.now() });
    msg.success("已保存到预设库");
  };

  const hasImage = !!editor.original;

  return (
    <div className="flex h-full flex-col gap-3">
      {ctx}
      <div className="flex items-center justify-between">
        <Space wrap>
          <Button type="primary" icon={<FolderOpenOutlined />} onClick={onPick}>加载图像</Button>
          <Tooltip title="撤销"><Button icon={<UndoOutlined />} disabled={!editor.past.length || !hasImage} onClick={editor.undo} /></Tooltip>
          <Tooltip title="重做"><Button icon={<RedoOutlined />} disabled={!editor.future.length || !hasImage} onClick={editor.redo} /></Tooltip>
          <Tooltip title="清空"><Button icon={<ClearOutlined />} disabled={!hasImage} onClick={editor.clear} /></Tooltip>
        </Space>
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFileInput} />

      {!hasImage ? (
        <PageCard className="flex-1">
          <EmptyState
            description="加载一张图像开始图像增强"
            action={<Button type="primary" icon={<FolderOpenOutlined />} onClick={onPick}>选择图像</Button>}
          />
        </PageCard>
      ) : (
        <div className="grid flex-1 gap-3" style={{ gridTemplateColumns: "360px 1fr" }}>
          <PageCard title="处理管线" className="overflow-hidden" extra={editor.steps.length ? `共 ${editor.steps.length} 步` : undefined}>
            <StepList
              steps={editor.steps}
              selectedId={editor.selectedId}
              onSelect={editor.select}
              onUpdate={editor.updateStep}
              onUpdateLive={editor.updateStepLive}
              onBeginEdit={editor.beginEdit}
              onRemove={editor.removeStep}
              onToggle={editor.toggleStep}
              onMove={editor.moveStep}
              onMoveTo={editor.moveStepTo}
              onAdd={(t: EnhancementType) => editor.addStep(t)}
              types={WORKSPACE_TYPES}
            />
          </PageCard>

          <div className="flex flex-col gap-3">
            <PageCard className="relative flex-1" extra={editor.busy ? <Spin size="small" /> : undefined}>
              <CompareView original={editor.original} result={editor.result} />
            </PageCard>
            <PageCard title="直方图">
              <div className="grid grid-cols-2 gap-4">
                <HistogramPanel label="原图" data={editor.original?.histograms ?? null} />
                <HistogramPanel label="当前结果" data={editor.result?.histograms ?? null} />
              </div>
            </PageCard>
          </div>
        </div>
      )}

      {hasImage && (
        <div className="flex justify-end gap-2">
          <Button icon={<SaveOutlined />} onClick={onSaveProject}>保存项目</Button>
          <Button icon={<StarOutlined />} onClick={onSavePreset}>保存预设</Button>
          <Button type="primary" icon={<ExportOutlined />} onClick={onExport} disabled={!backend.isTauri()}>导出 PNG</Button>
        </div>
      )}
    </div>
  );
}