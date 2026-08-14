import { describe, it, expect, beforeEach } from "vitest";
import { useEditor } from "./stores";

describe("editor store (累积管线)", () => {
  beforeEach(() => {
    useEditor.getState().clear();
  });

  it("adds, toggles, and removes steps", () => {
    const s = useEditor.getState();
    s.addStep("brightness");
    s.addStep("canny");
    expect(useEditor.getState().steps).toHaveLength(2);
    const id = useEditor.getState().steps[0].id;
    useEditor.getState().toggleStep(id);
    expect(useEditor.getState().steps[0].enabled).toBe(false);
    useEditor.getState().removeStep(id);
    expect(useEditor.getState().steps).toHaveLength(1);
  });

  it("moves a step up/down", () => {
    useEditor.getState().addStep("brightness");
    useEditor.getState().addStep("canny");
    const a = useEditor.getState().steps[0].id;
    useEditor.getState().moveStep(a, 1);
    expect(useEditor.getState().steps[0].type).toBe("canny");
  });

  it("supports undo and redo", () => {
    const s = useEditor.getState();
    s.addStep("brightness");
    s.addStep("gamma");
    expect(useEditor.getState().steps).toHaveLength(2);
    useEditor.getState().undo();
    expect(useEditor.getState().steps).toHaveLength(1);
    useEditor.getState().undo();
    expect(useEditor.getState().steps).toHaveLength(0);
    useEditor.getState().redo();
    expect(useEditor.getState().steps).toHaveLength(1);
  });

  it("updates params immutably", () => {
    const s = useEditor.getState();
    s.addStep("threshold");
    const id = useEditor.getState().steps[0].id;
    useEditor.getState().updateStep(id, { params: { value: 200 } });
    expect(useEditor.getState().steps[0].params.value).toBe(200);
    expect(useEditor.getState().steps[0].params.otsu).toBe(true);
  });

  it("reorders to an arbitrary index via drag (moveStepTo)", () => {
    useEditor.getState().addStep("brightness");
    useEditor.getState().addStep("gamma");
    useEditor.getState().addStep("canny");
    const [a, b] = useEditor.getState().steps.map((s) => s.id);
    // 把第一项拖到末尾
    useEditor.getState().moveStepTo(a, 2);
    const types = useEditor.getState().steps.map((s) => s.type);
    expect(types).toEqual(["gamma", "canny", "brightness"]);
    // 目标下标越界时收敛到边界
    useEditor.getState().moveStepTo(b, 99);
    expect(useEditor.getState().steps[2].type).toBe("gamma");
    // 无变化时不产生历史
    const pastBefore = useEditor.getState().past.length;
    useEditor.getState().moveStepTo(useEditor.getState().steps[0].id, 0);
    expect(useEditor.getState().past.length).toBe(pastBefore);
  });
});