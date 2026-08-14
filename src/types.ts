export type EnhancementType =
  | "brightness"
  | "contrast"
  | "gamma"
  | "histogram_eq"
  | "clahe"
  | "grayscale"
  | "gaussian_blur"
  | "median_blur"
  | "sharpen"
  | "threshold"
  | "canny"
  | "denoise"
  | "saturation"
  | "white_balance"
  | "invert"
  | "sepia"
  | "posterize"
  | "box_blur"
  | "bilateral"
  | "morphology"
  | "adaptive_threshold"
  | "laplacian"
  | "sobel"
  | "flip";

export type ParamValue = number | string | boolean;

export interface ProcessingStep {
  id: string;
  type: EnhancementType;
  enabled: boolean;
  params: Record<string, ParamValue>;
}

export interface HistogramBins {
  gray: number[];
  red: number[];
  green: number[];
  blue: number[];
}

export interface ImageInfo {
  dataUrl: string;
  width: number;
  height: number;
  histograms: HistogramBins;
}

export interface Project {
  id: string;
  name: string;
  imagePath: string | null;
  steps: ProcessingStep[];
  note: string;
  createdAt: number;
  updatedAt: number;
}

export interface Preset {
  id: string;
  name: string;
  steps: ProcessingStep[];
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  html: string;
  projectId: string | null;
  updatedAt: number;
}

export interface AppSettings {
  theme: "light" | "dark";
  updateUrl: string;
  checkOnStart: boolean;
}

export interface UpdateInfo {
  current: string;
  latest: string;
  updateAvailable: boolean;
  message: string;
}