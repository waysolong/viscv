import { create } from "zustand";
import type {
  AppSettings, EnhancementType, ImageInfo, Note, Preset, ProcessingStep, Project,
} from "../types";
import { createStep } from "./enhancements";
import * as backend from "./backend";

interface EditorState {
  originalPath: string | null;
  original: ImageInfo | null;
  result: ImageInfo | null;
  steps: ProcessingStep[];
  selectedId: string | null;
  busy: boolean;
  error: string | null;
  past: ProcessingStep[][];
  future: ProcessingStep[][];
  setOriginal: (path: string, info: ImageInfo) => void;
  setResult: (info: ImageInfo | null) => void;
  setBusy: (b: boolean) => void;
  setError: (e: string | null) => void;
  addStep: (t: EnhancementType) => void;
  updateStep: (id: string, params: Partial<ProcessingStep>) => void;
  removeStep: (id: string) => void;
  toggleStep: (id: string) => void;
  moveStep: (id: string, dir: -1 | 1) => void;
  moveStepTo: (id: string, toIndex: number) => void;
  select: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  setSteps: (s: ProcessingStep[]) => void;
  clear: () => void;
}

const cloneStep = (s: ProcessingStep): ProcessingStep => ({ ...s, params: { ...s.params } });

const pushHistory = (
  steps: ProcessingStep[],
  past: ProcessingStep[][],
): { steps: ProcessingStep[]; past: ProcessingStep[][] } => {
  const nextPast = [...past, steps.map(cloneStep)];
  if (nextPast.length > 50) nextPast.shift();
  return { steps: steps.map(cloneStep), past: nextPast };
};

function buildEditorStore() {
  return create<EditorState>((set) => ({
  originalPath: null,
  original: null,
  result: null,
  steps: [],
  selectedId: null,
  busy: false,
  error: null,
  past: [],
  future: [],
  setOriginal: (path, info) =>
    set({ originalPath: path, original: info, result: info, steps: [], past: [], future: [], selectedId: null, error: null }),
  setResult: (info) => set({ result: info }),
  setBusy: (b) => set({ busy: b }),
  setError: (e) => set({ error: e }),
  addStep: (t) =>
    set((s) => {
      const { steps, past } = pushHistory(s.steps, s.past);
      const step = createStep(t);
      return { steps: [...steps, step], past, future: [], selectedId: step.id };
    }),
  updateStep: (id, patch) =>
    set((s) => {
      const idx = s.steps.findIndex((x) => x.id === id);
      if (idx < 0) return s;
      const { steps, past } = pushHistory(s.steps, s.past);
      steps[idx] = { ...cloneStep(steps[idx]), ...patch, params: patch.params ? { ...steps[idx].params, ...patch.params } : steps[idx].params };
      return { steps, past, future: [] };
    }),
  removeStep: (id) =>
    set((s) => {
      if (!s.steps.some((x) => x.id === id)) return s;
      const { steps, past } = pushHistory(s.steps, s.past);
      return { steps: steps.filter((x) => x.id !== id), past, future: [], selectedId: s.selectedId === id ? null : s.selectedId };
    }),
  toggleStep: (id) =>
    set((s) => {
      const idx = s.steps.findIndex((x) => x.id === id);
      if (idx < 0) return s;
      const { steps, past } = pushHistory(s.steps, s.past);
      steps[idx] = { ...steps[idx], enabled: !steps[idx].enabled };
      return { steps, past, future: [] };
    }),
  moveStep: (id, dir) =>
    set((s) => {
      const idx = s.steps.findIndex((x) => x.id === id);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= s.steps.length) return s;
      const { steps, past } = pushHistory(s.steps, s.past);
      const [step] = steps.splice(idx, 1);
      steps.splice(to, 0, step);
      return { steps, past, future: [] };
    }),
  moveStepTo: (id, toIndex) =>
    set((s) => {
      const from = s.steps.findIndex((x) => x.id === id);
      if (from < 0) return s;
      const to = Math.max(0, Math.min(s.steps.length - 1, toIndex));
      if (from === to) return s;
      const { steps, past } = pushHistory(s.steps, s.past);
      const [step] = steps.splice(from, 1);
      steps.splice(to, 0, step);
      return { steps, past, future: [] };
    }),
  select: (id) => set({ selectedId: id }),
  undo: () =>
    set((s) => {
      if (!s.past.length) return s;
      const prev = s.past[s.past.length - 1];
      return { past: s.past.slice(0, -1), future: [s.steps.map(cloneStep), ...s.future].slice(0, 50), steps: prev };
    }),
  redo: () =>
    set((s) => {
      if (!s.future.length) return s;
      const next = s.future[0];
      return { future: s.future.slice(1), past: [...s.past, s.steps.map(cloneStep)], steps: next };
    }),
  setSteps: (steps) => set({ steps: steps.map(cloneStep) }),
  clear: () => set({ originalPath: null, original: null, result: null, steps: [], past: [], future: [], selectedId: null, error: null }),
  }));
}

export const useEditor = buildEditorStore();
export const useAugment = buildEditorStore();

interface ProjectState {
  items: Project[];
  loaded: boolean;
  load: () => Promise<void>;
  upsert: (p: Project) => Promise<void>;
  remove: (id: string) => Promise<void>;
}
export const useProjects = create<ProjectState>((set, get) => ({
  items: [],
  loaded: false,
  load: async () => { const items = await backend.listProjects(); set({ items, loaded: true }); },
  upsert: async (p) => { await backend.saveProject(p); set({ items: [...get().items.filter((x) => x.id !== p.id), p] }); },
  remove: async (id) => { await backend.deleteProject(id); set({ items: get().items.filter((x) => x.id !== id) }); },
}));

interface PresetState {
  items: Preset[];
  loaded: boolean;
  load: () => Promise<void>;
  upsert: (p: Preset) => Promise<void>;
  remove: (id: string) => Promise<void>;
}
export const usePresets = create<PresetState>((set, get) => ({
  items: [],
  loaded: false,
  load: async () => { const items = await backend.listPresets(); set({ items, loaded: true }); },
  upsert: async (p) => { await backend.savePreset(p); set({ items: [...get().items.filter((x) => x.id !== p.id), p] }); },
  remove: async (id) => { await backend.deletePreset(id); set({ items: get().items.filter((x) => x.id !== id) }); },
}));

interface NoteState {
  items: Note[];
  loaded: boolean;
  load: () => Promise<void>;
  upsert: (n: Note) => Promise<void>;
  remove: (id: string) => Promise<void>;
}
export const useNotes = create<NoteState>((set, get) => ({
  items: [],
  loaded: false,
  load: async () => { const items = await backend.listNotes(); set({ items, loaded: true }); },
  upsert: async (n) => { await backend.saveNote(n); set({ items: [...get().items.filter((x) => x.id !== n.id), n] }); },
  remove: async (id) => { await backend.deleteNote(id); set({ items: get().items.filter((x) => x.id !== id) }); },
}));

interface SettingsState extends AppSettings {
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}
export const useSettings = create<SettingsState>((set, get) => ({
  theme: "light",
  updateUrl: "https://example.com/viscv/latest.json",
  checkOnStart: false,
  loaded: false,
  load: async () => { const s = await backend.getSettings(); set({ ...s, loaded: true }); },
  update: async (patch) => { const next = { ...get(), ...patch }; await backend.saveSettings(next); set(next); },
}));

interface UiState {
  collapsed: boolean;
  toggleCollapsed: () => void;
}
export const useUi = create<UiState>((set) => ({
  collapsed: false,
  toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
}));