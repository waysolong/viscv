import type { EnhancementType, ParamValue, ProcessingStep } from "../types";

export interface ParamSpec {
  name: string;
  label: string;
  kind: "number" | "select" | "boolean";
  min?: number;
  max?: number;
  step?: number;
  default: ParamValue;
  options?: { label: string; value: ParamValue }[];
}

export interface EnhancementSpec {
  type: EnhancementType;
  label: string;
  description: string;
  group: string;
  params: ParamSpec[];
}

const S: Record<EnhancementType, EnhancementSpec> = {
  brightness: {
    type: "brightness",
    label: "亮度",
    description: "整体提高或降低图像亮度。",
    group: "基础",
    params: [
      { name: "value", label: "亮度", kind: "number", min: -100, max: 100, step: 1, default: 20 },
    ],
  },
  contrast: {
    type: "contrast",
    label: "对比度",
    description: "围绕中间值拉伸或压缩像素分布。",
    group: "基础",
    params: [
      { name: "value", label: "对比度", kind: "number", min: 0, max: 200, step: 1, default: 120 },
    ],
  },
  gamma: {
    type: "gamma",
    label: "伽马校正",
    description: "非线性调整明暗，用于提亮暗部或压暗高光。",
    group: "基础",
    params: [
      { name: "value", label: "伽马", kind: "number", min: 10, max: 500, step: 10, default: 100 },
    ],
  },
  histogram_eq: {
    type: "histogram_eq",
    label: "直方图均衡",
    description: "对每个通道做全局直方图均衡，增强整体对比度。",
    group: "直方图",
    params: [],
  },
  clahe: {
    type: "clahe",
    label: "CLAHE 局部均衡",
    description: "分块限制对比度的局部直方图均衡，减少噪声放大。",
    group: "直方图",
    params: [
      { name: "clip_limit", label: "对比度限制", kind: "number", min: 1, max: 100, step: 1, default: 20 },
      { name: "tiles", label: "分块数量", kind: "number", min: 2, max: 16, step: 1, default: 8 },
    ],
  },
  grayscale: {
    type: "grayscale",
    label: "灰度化",
    description: "将图像转为灰度（保留三通道显示）。",
    group: "颜色",
    params: [],
  },
  gaussian_blur: {
    type: "gaussian_blur",
    label: "高斯模糊",
    description: "按高斯核平滑图像，去除细小噪声。",
    group: "滤波",
    params: [
      { name: "sigma", label: "sigma", kind: "number", min: 1, max: 100, step: 1, default: 10 },
    ],
  },
  median_blur: {
    type: "median_blur",
    label: "中值模糊",
    description: "用邻域中值替换像素，擅长去除椒盐噪声。",
    group: "滤波",
    params: [
      { name: "kernel", label: "核大小", kind: "number", min: 1, max: 7, step: 1, default: 3 },
    ],
  },
  sharpen: {
    type: "sharpen",
    label: "锐化",
    description: "强化边缘与细节，为原始减去模糊的差值加权。",
    group: "细节",
    params: [
      { name: "amount", label: "强度", kind: "number", min: 0, max: 300, step: 1, default: 100 },
      { name: "sigma", label: "sigma", kind: "number", min: 1, max: 50, step: 1, default: 5 },
    ],
  },
  threshold: {
    type: "threshold",
    label: "阈值二值化",
    description: "按阈值把图像转成黑白，可选 Otsu 自动求阈值。",
    group: "分割",
    params: [
      { name: "value", label: "阈值", kind: "number", min: 0, max: 255, step: 1, default: 128 },
      { name: "otsu", label: "Otsu 自动阈值", kind: "boolean", default: true },
      { name: "invert", label: "反相", kind: "boolean", default: false },
    ],
  },
  canny: {
    type: "canny",
    label: "Canny 边缘",
    description: "经典 Canny 边缘检测，输出边缘掩码。",
    group: "分割",
    params: [
      { name: "low", label: "低阈值", kind: "number", min: 1, max: 255, step: 1, default: 50 },
      { name: "high", label: "高阈值", kind: "number", min: 1, max: 255, step: 1, default: 150 },
    ],
  },
  denoise: {
    type: "denoise",
    label: "降噪",
    description: "轻度平滑以抑制噪声，强度越高越模糊。",
    group: "滤波",
    params: [
      { name: "strength", label: "强度", kind: "number", min: 1, max: 7, step: 1, default: 3 },
    ],
  },
  saturation: {
    type: "saturation", label: "色彩饱和度", description: "增强或降低色彩鲜艳度（HSV 饱和度）。", group: "颜色",
    params: [ { name: "value", label: "饱和度", kind: "number", min: 0, max: 300, step: 5, default: 100 } ],
  },
  white_balance: {
    type: "white_balance", label: "自动白平衡", description: "灰度世界法校准通道均值，校正色偏。", group: "颜色",
    params: [],
  },
  invert: {
    type: "invert", label: "反相", description: "取反所有像素颜色（负片效果）。", group: "颜色",
    params: [],
  },
  sepia: {
    type: "sepia", label: "复古色调", description: "叠加经典 sepia 暖色调。", group: "颜色",
    params: [ { name: "strength", label: "强度", kind: "number", min: 0, max: 100, step: 1, default: 100 } ],
  },
  posterize: {
    type: "posterize", label: "色调分离", description: "把连续色调聚合成少量层级。", group: "颜色",
    params: [ { name: "levels", label: "层级", kind: "number", min: 2, max: 16, step: 1, default: 4 } ],
  },
  box_blur: {
    type: "box_blur", label: "盒式模糊", description: "均值核平滑图像。", group: "滤波",
    params: [ { name: "kernel", label: "核大小", kind: "number", min: 1, max: 31, step: 1, default: 5 } ],
  },
  bilateral: {
    type: "bilateral", label: "双边滤波", description: "保边降噪，平滑同时保留边缘。", group: "滤波",
    params: [
      { name: "d", label: "直径", kind: "number", min: 1, max: 15, step: 1, default: 5 },
      { name: "sigma_color", label: "颜色差", kind: "number", min: 1, max: 200, step: 1, default: 75 },
      { name: "sigma_space", label: "空间差", kind: "number", min: 1, max: 200, step: 1, default: 75 },
    ],
  },
  morphology: {
    type: "morphology", label: "形态学运算", description: "腐蚀/膨胀/开/闭运算。", group: "形态",
    params: [
      { name: "op", label: "运算", kind: "select", default: "erode", options: [ { label: "腐蚀", value: "erode" }, { label: "膨胀", value: "dilate" }, { label: "开运算", value: "open" }, { label: "闭运算", value: "close" } ] },
      { name: "kernel", label: "核大小", kind: "number", min: 1, max: 15, step: 1, default: 3 },
      { name: "iterations", label: "迭代次数", kind: "number", min: 1, max: 10, step: 1, default: 1 },
    ],
  },
  adaptive_threshold: {
    type: "adaptive_threshold", label: "自适应阈值", description: "按局部邻域自适应二值化，抗光照不均。", group: "分割",
    params: [
      { name: "method", label: "方法", kind: "select", default: "mean", options: [ { label: "均值", value: "mean" }, { label: "高斯", value: "gaussian" } ] },
      { name: "block", label: "邻域大小", kind: "number", min: 3, max: 51, step: 2, default: 11 },
      { name: "c", label: "常数 C", kind: "number", min: -30, max: 30, step: 1, default: 2 },
      { name: "invert", label: "反相", kind: "boolean", default: false },
    ],
  },
  laplacian: {
    type: "laplacian", label: "拉普拉斯边缘", description: "二阶导数边缘检测（拉普拉斯算子）。", group: "边缘",
    params: [ { name: "ksize", label: "核大小", kind: "number", min: 1, max: 15, step: 2, default: 3 } ],
  },
  sobel: {
    type: "sobel", label: "Sobel 边缘", description: "一阶方向导数边缘检测。", group: "边缘",
    params: [
      { name: "axis", label: "方向", kind: "select", default: "x", options: [ { label: "水平 X", value: "x" }, { label: "垂直 Y", value: "y" } ] },
      { name: "ksize", label: "核大小", kind: "number", min: 1, max: 15, step: 2, default: 3 },
    ],
  },
  flip: {
    type: "flip", label: "翻转", description: "水平/垂直/双向翻转图像。", group: "变换",
    params: [ { name: "mode", label: "方式", kind: "select", default: "horizontal", options: [ { label: "水平", value: "horizontal" }, { label: "垂直", value: "vertical" }, { label: "双向", value: "both" } ] } ],
  },
};

export const ENHANCEMENTS: EnhancementSpec[] = Object.values(S);
export const specFor = (t: EnhancementType): EnhancementSpec => S[t];

export function defaultParams(t: EnhancementType): Record<string, ParamValue> {
  const out: Record<string, ParamValue> = {};
  for (const p of S[t].params) out[p.name] = p.default;
  return out;
}

let counter = 0;
export function uid(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createStep(type: EnhancementType): ProcessingStep {
  return { id: uid(), type, enabled: true, params: defaultParams(type) };
}
