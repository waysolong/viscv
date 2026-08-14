import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { AppSettings, ImageInfo, Note, Preset, ProcessingStep, Project, UpdateInfo } from "../types";

/** 是否运行在 Tauri 运行时内（动态判断，避免模块加载时序问题）。 */
export const isTauri = (): boolean =>
  typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;

export async function pickImage(): Promise<string | null> {
  const sel = await open({
    multiple: false,
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "bmp", "webp", "tif", "tiff", "gif"] }],
  });
  return typeof sel === "string" ? sel : null;
}

export async function pickSavePath(defaultName: string): Promise<string | null> {
  return save({ defaultPath: defaultName, filters: [{ name: "PNG 图片", extensions: ["png"] }] });
}

// 图像处理相关调用失败时直接抛错，由调用方捕获并展示，避免静默失败。
export const loadImage = (path: string): Promise<ImageInfo> => invoke("load_image", { path });
export const defaultImagePath = (): Promise<string> => invoke("default_image_path");
export const processPipeline = (path: string, steps: ProcessingStep[]): Promise<ImageInfo> =>
  invoke("process_pipeline", { path, steps });
export const exportImage = (path: string, steps: ProcessingStep[], outPath: string): Promise<boolean> =>
  invoke("export_image", { path, steps, outPath });

// 以下 CRUD 在非 Tauri（浏览器预览）时用本地回退，方便纯前端调试。
export const checkUpdate = (): Promise<UpdateInfo> => safe(() => invoke("check_update"), {
  current: "0.1.0", latest: "0.1.0", updateAvailable: false, message: "",
});
export async function listProjects(): Promise<Project[]> { return safe(() => invoke("list_projects"), []); }
export function saveProject(p: Project): Promise<Project> { return safe(() => invoke("save_project", { project: p }), p); }
export function deleteProject(id: string): Promise<void> { return safe(() => invoke("delete_project", { id })); }
export async function listPresets(): Promise<Preset[]> { return safe(() => invoke("list_presets"), []); }
export function savePreset(p: Preset): Promise<Preset> { return safe(() => invoke("save_preset", { preset: p }), p); }
export function deletePreset(id: string): Promise<void> { return safe(() => invoke("delete_preset", { id })); }
export async function listNotes(): Promise<Note[]> { return safe(() => invoke("list_notes"), []); }
export function saveNote(n: Note): Promise<Note> { return safe(() => invoke("save_note", { note: n }), n); }
export function deleteNote(id: string): Promise<void> { return safe(() => invoke("delete_note", { id })); }
export async function getSettings(): Promise<AppSettings> {
  return safe(() => invoke("get_settings"), { theme: "light", updateUrl: "https://example.com/viscv/latest.json", checkOnStart: false });
}
export function saveSettings(s: AppSettings): Promise<AppSettings> { return safe(() => invoke("save_settings", { settings: s }), s); }

async function safe<T>(fn: () => Promise<T>, fallback?: T): Promise<T> {
  if (!isTauri()) return fallback as T;
  try { return await fn(); } catch (e) { console.warn("[viscv] backend call failed, using fallback", e); return fallback as T; }
}