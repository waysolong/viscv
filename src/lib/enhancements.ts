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
  hint?: string;
}


/** 参数悬停提示：以 "算子:参数名" 为键，保证同名参数在不同算子里可给不同说明。 */
export const PARAM_HINTS: Record<string, string> = {
  "brightness:value": "以百分比调整整体明暗：正值变亮、负值变暗（0=不变）。",
  "contrast:value": "对比度百分比：100=不变，<100 偏灰、>100 更分明。",
  "gamma:value": "伽马值（×100）：100=不变，越大越亮、越小越暗。",
  "saturation:value": "色彩饱和度百分比：100=不变，<100 变灰、>100 更鲜艳。",
  "clahe:clip_limit": "局部对比度限制：越大对比度增强越弱（越能抑制噪点放大）。",
  "clahe:tiles": "分块数量：越大局部自适应越细。",
  "gaussian_blur:sigma": "高斯核 sigma：越大越模糊；核大小=0 时据此自动生成。",
  "gaussian_blur:ksize": "高斯核大小（奇数）：0=按 sigma 自动，>0 用固定核。",
  "median_blur:kernel": "中值滤波核大小（奇数）：越大去噪越强、越模糊。",
  "box_blur:kernel": "盒式（均值）模糊核大小：越大越模糊。",
  "sharpen:amount": "边缘增强幅度：0=原样，100=常规，越大越锐利（过大会出白边）。",
  "sharpen:sigma": "求细节所用高斯核的 sigma：影响被增强的边缘尺度。",
  "threshold:value": "二值化阈值：仅当关闭 Otsu 时生效（0~255）。",
  "threshold:otsu": "勾选后自动求最优阈值（Otsu），并忽略上方手动阈值。",
  "threshold:invert": "反相：把黑/白对调。",
  "canny:low": "滞后阈值下限：低于此的弱边缘被丢弃。",
  "canny:high": "滞后阈值上限：高于此的强边缘保留。",
  "canny:aperture": "Canny 内部 Sobel 的孔径核大小（3/5/7）。",
  "denoise:strength": "映射为中值滤波核大小：越大去噪越强、越模糊。",
  "sepia:strength": "sepia 与原图的混合比例：0=原图，100=完全复古色。",
  "posterize:levels": "色调层级数：越小色调越少、越扁平。",
  "bilateral:d": "双边滤波邻域直径（核大小）。",
  "bilateral:sigma_color": "颜色差阈值：越大越忽略细小色差。",
  "bilateral:sigma_space": "空间距离阈值：越大影响范围越广。",
  "morphology:op": "形态学运算类型：腐蚀/膨胀/开运算/闭运算。",
  "morphology:kernel": "结构元素核大小。",
  "morphology:iterations": "迭代次数：越大效果越明显。",
  "adaptive_threshold:method": "局部邻域统计方式：均值或高斯加权。",
  "adaptive_threshold:block": "局部邻域大小（奇数）：决定自适应范围。",
  "adaptive_threshold:c": "从均值/加权均值里减去的常数：调阈值灵敏度。",
  "adaptive_threshold:invert": "反相：把黑/白对调。",
  "laplacian:ksize": "拉普拉斯核大小。",
  "sobel:axis": "求导方向：X 出水平边缘、Y 出垂直边缘。",
  "sobel:ksize": "Sobel 核大小。",
  "flip:mode": "翻转方向：水平/垂直/双向。",
  "ultra_hsv:hue": "色相偏移量（0~180，可负），使整图色调偏转。",
  "ultra_hsv:saturation": "饱和度百分比：100=不变，>100 更鲜艳、<100 变灰。",
  "ultra_hsv:brightness": "明度百分比：100=不变。",
  "ultra_perspective:rotation": "顺时针旋转角度（度）。",
  "ultra_perspective:translate": "水平/垂直平移量（占图像尺寸的百分比）。",
  "ultra_perspective:scale": "缩放百分比：100=原尺寸。",
  "ultra_perspective:shear": "错切角度（度）。",
  "ultra_perspective:perspective": "透视畸变强度（越大越像 3D 侧视）。",
  "ultra_erase:area": "被擦除区域的面积占比（%）。",
  "ultra_erase:fill": "被擦除区域填充的灰度值（0=黑，255=白）。",
  "gaussian_noise:sigma": "高斯噪声标准差，越大噪声越明显。",};

/** 返回某算子的某参数的提示（缺省时可用 spec 上的 hint）。 */
export const hintFor = (type: string, name: string): string | undefined =>
  PARAM_HINTS[`${type}:${name}`];
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
      { name: "ksize", label: "核大小(0=自动)", kind: "number", min: 0, max: 31, step: 2, default: 0 },
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
      { name: "amount", label: "边缘增强", kind: "number", min: 0, max: 300, step: 1, default: 100 },
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
      { name: "aperture", label: "核大小(孔径)", kind: "number", min: 3, max: 7, step: 2, default: 3 },
    ],
  },
  denoise: {
    type: "denoise",
    label: "降噪",
    description: "轻度平滑以抑制噪声，强度越高越模糊。",
    group: "滤波",
    params: [
      { name: "strength", label: "平滑核大小", kind: "number", min: 1, max: 7, step: 1, default: 3 },
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
    params: [ { name: "strength", label: "复古比例(%)", kind: "number", min: 0, max: 100, step: 1, default: 100 } ],
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
  ultra_hsv: {
    type: "ultra_hsv", label: "HSV 调整", description: "对色调/饱和度/明度整体调整（Ultralytics RandomHSV 的单图确定性版）。", group: "图像增强",
    params: [
      { name: "hue", label: "色调", kind: "number", min: -180, max: 180, step: 5, default: 0 },
      { name: "saturation", label: "饱和度", kind: "number", min: 0, max: 200, step: 5, default: 100 },
      { name: "brightness", label: "明度", kind: "number", min: 0, max: 200, step: 5, default: 100 },
    ],
  },
  ultra_perspective: {
    type: "ultra_perspective", label: "几何变换", description: "旋转/平移/缩放/错切/透视（Ultralytics RandomPerspective 确定性版）。", group: "图像增强",
    params: [
      { name: "rotation", label: "旋转°", kind: "number", min: 0, max: 180, step: 1, default: 0 },
      { name: "translate", label: "平移%", kind: "number", min: 0, max: 100, step: 5, default: 0 },
      { name: "scale", label: "缩放%", kind: "number", min: 50, max: 200, step: 5, default: 100 },
      { name: "shear", label: "错切°", kind: "number", min: 0, max: 45, step: 1, default: 0 },
      { name: "perspective", label: "透视", kind: "number", min: 0, max: 1000, step: 50, default: 0 },
    ],
  },
  ultra_erase: {
    type: "ultra_erase", label: "随机擦除", description: "随机擦除一块区域（Ultralytics RandomErasing 确定性版）。", group: "图像增强",
    params: [
      { name: "area", label: "擦除面积%", kind: "number", min: 0, max: 90, step: 5, default: 20 },
      { name: "fill", label: "填充值", kind: "number", min: 0, max: 255, step: 1, default: 128 },
    ],
  },
  gaussian_noise: {
    type: "gaussian_noise", label: "高斯噪声", description: "叠加高斯随机噪声（固定种子，预览稳定）。", group: "图像增强",
    params: [ { name: "sigma", label: "噪声强度", kind: "number", min: 0, max: 200, step: 5, default: 25 } ],
  },
  bgr_swap: {
    type: "bgr_swap", label: "通道交换(BGR)", description: "交换 R/B 通道，模拟通道顺序错误（Ultralytics bgr 增广）。", group: "图像增强",
    params: [],
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
