"""基于 OpenCV 的图像增强引擎：12 个算子 + 累积可排序管线 + 直方图 + 编码。

图像内部统一用 OpenCV 原生 BGR (H,W,3) uint8：cv2.imread 解码即为 BGR，
cv2.imencode/imwrite 也按 BGR 解释，因此编码/导出不产生通道交换。
直方图的 R/G/B 通道索引按 BGR 布局取 [2]/[1]/[0]。
"""
from __future__ import annotations

import base64
from typing import Any, Dict, List

import cv2
import numpy as np

STEP_TYPES = {
    "brightness", "contrast", "gamma", "histogram_eq", "clahe", "grayscale",
    "gaussian_blur", "median_blur", "sharpen", "threshold", "canny", "denoise",
    "saturation", "white_balance", "invert", "sepia", "posterize",
    "box_blur", "bilateral", "morphology", "adaptive_threshold", "laplacian", "sobel", "flip",
}


def _p(step: Dict[str, Any], name: str, default: float):
    params = step.get("params") or {}
    v = params.get(name, default)
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _pb(step: Dict[str, Any], name: str, default: bool) -> bool:
    params = step.get("params") or {}
    v = params.get(name, default)
    return bool(v)


def _ps(step: Dict[str, Any], name: str, default: str) -> str:
    params = step.get("params") or {}
    return str(params.get(name, default))


def _clip8(arr: np.ndarray) -> np.ndarray:
    return np.clip(np.round(arr), 0, 255).astype(np.uint8)


def _stack3(gray: np.ndarray) -> np.ndarray:
    return cv2.merge([gray, gray, gray])


# ---------- 读取 / 编码 ----------

def read_img(path: str) -> np.ndarray:
    """读取图像并转为 BGR (H,W,3)（OpenCV 原生布局）。"""
    data = np.fromfile(path, dtype=np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise RuntimeError(f"无法打开图像：{path}")
    if img.ndim == 2:
        return cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    if img.shape[2] == 4:
        return cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
    if img.shape[2] == 3:
        return img  # 已为 BGR
    raise RuntimeError(f"不支持的通道数：{path}")


def encode_png(img: np.ndarray) -> str:
    """按 BGR 编码 PNG，保证浏览器（RGB 解释）显示的颜色正确。"""
    ok, buf = cv2.imencode(".png", img)
    if not ok:
        raise RuntimeError("PNG 编码失败")
    return "data:image/png;base64," + base64.b64encode(buf.tobytes()).decode("ascii")


# ---------- 算子（在 BGR 上计算） ----------

def _brightness(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    delta = (_p(step, "value", 20.0) / 100.0) * 255.0
    return _clip8(img.astype(np.float32) + delta)


def _contrast(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    factor = _p(step, "value", 100.0) / 100.0
    offset = 128.0 * (1.0 - factor)
    return _clip8(img.astype(np.float32) * factor + offset)


def _gamma(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    gamma = (_p(step, "value", 100.0) / 100.0) ** (-1)
    gamma = float(np.clip(gamma, 0.02, 12.0))
    lut = ((np.arange(256, dtype=np.float32) / 255.0) ** gamma * 255.0)
    lut = _clip8(lut).astype(np.uint8)
    return lut[img]


def _grayscale(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return _stack3(gray)


def _histogram_eq(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    out = img.copy()
    for ch in range(3):
        out[:, :, ch] = cv2.equalizeHist(img[:, :, ch])
    return out


def _clahe(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    clip = float(_p(step, "clip_limit", 20.0)) / 10.0
    tiles = int(np.clip(_p(step, "tiles", 8.0), 2, 16))
    clahe = cv2.createCLAHE(clipLimit=clip, tileGridSize=(tiles, tiles))
    return _stack3(clahe.apply(gray))


def _gaussian_blur(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    sigma = float(_p(step, "sigma", 10.0)) / 10.0
    k = int(_p(step, "ksize", 0.0))
    if k >= 3:
        if k % 2 == 0:
            k += 1
        k = min(k, 31)
        return cv2.GaussianBlur(img, (k, k), sigma)
    if sigma <= 0:
        return img
    return cv2.GaussianBlur(img, (0, 0), sigma)


def _median_blur(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    k = int(np.clip(_p(step, "kernel", 3.0), 3, 15))
    if k % 2 == 0:
        k += 1
    if k < 3:
        return img
    return cv2.medianBlur(img, k)


def _sharpen(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    amount = float(_p(step, "amount", 100.0)) / 100.0
    sigma = float(_p(step, "sigma", 5.0)) / 10.0
    if sigma <= 0:
        return img
    blurred = cv2.GaussianBlur(img, (0, 0), sigma)
    detail = img.astype(np.float32) - blurred.astype(np.float32)
    return _clip8(img.astype(np.float32) + amount * detail)


def _threshold(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    value = float(_p(step, "value", 128.0))
    otsu = _pb(step, "otsu", True)
    invert = _pb(step, "invert", False)
    if otsu:
        flags = cv2.THRESH_BINARY | cv2.THRESH_OTSU
    elif invert:
        flags = cv2.THRESH_BINARY_INV
    else:
        flags = cv2.THRESH_BINARY
    bin_img = cv2.threshold(gray, value, 255, flags)[1]
    return _stack3(bin_img)


def _canny(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    low = float(_p(step, "low", 50.0))
    high = float(_p(step, "high", 150.0))
    aperture = int(np.clip(_p(step, "aperture", 3.0), 3, 7))
    if aperture % 2 == 0:
        aperture += 1
    edges = cv2.Canny(gray, low, high, apertureSize=aperture)
    return _stack3(edges)


def _denoise(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    strength = int(np.clip(_p(step, "strength", 3.0), 1, 7))
    k = strength if strength % 2 == 1 else strength + 1
    if k < 3:
        return img
    return cv2.medianBlur(img, k)




# ---------- 新增算子 ----------


def _saturation(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    factor = _p(step, "value", 100.0) / 100.0
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * factor, 0, 255)
    return cv2.cvtColor(_clip8(hsv).astype(np.uint8), cv2.COLOR_HSV2BGR)


def _white_balance(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    means = img.reshape(-1, 3).mean(axis=0)  # [B, G, R]
    target = means.mean()
    if target <= 1e-3:
        return img
    gain = np.clip(target / np.maximum(means, 1e-6), 0.3, 3.0)
    return _clip8(img.astype(np.float32) * gain[None, None, :])


def _invert(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    return cv2.bitwise_not(img)


def _sepia(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    alpha = float(np.clip(_p(step, "strength", 100.0), 0, 100)) / 100.0
    # 标准 sepia 矩阵，映射 [B,G,R] -> [B',G',R']
    k = np.array([[0.131, 0.534, 0.272],
                  [0.168, 0.686, 0.349],
                  [0.189, 0.769, 0.393]], dtype=np.float32)
    sepia = _clip8(img.astype(np.float32) @ k.T)
    return _clip8(alpha * sepia.astype(np.float32) + (1 - alpha) * img.astype(np.float32))


def _posterize(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    levels = int(np.clip(_p(step, "levels", 4.0), 2, 16))
    step_v = 256.0 / levels
    return (np.floor(img.astype(np.float32) / step_v) * step_v).astype(np.uint8)


def _box_blur(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    k = int(np.clip(_p(step, "kernel", 5.0), 1, 31))
    if k % 2 == 0:
        k += 1
    return cv2.blur(img, (k, k))


def _bilateral(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    d = int(max(_p(step, "d", 5.0), 1))
    sc = float(_p(step, "sigma_color", 75.0))
    ss = float(_p(step, "sigma_space", 75.0))
    return cv2.bilateralFilter(img, d, sc, ss)


def _morphology(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    op_map = {"erode": cv2.MORPH_ERODE, "dilate": cv2.MORPH_DILATE,
              "open": cv2.MORPH_OPEN, "close": cv2.MORPH_CLOSE}
    op = op_map.get(_ps(step, "op", "erode"), cv2.MORPH_ERODE)
    k = int(np.clip(_p(step, "kernel", 3.0), 1, 15))
    if k % 2 == 0:
        k += 1
    iters = int(np.clip(_p(step, "iterations", 1.0), 1, 10))
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (k, k))
    return cv2.morphologyEx(img, op, kernel, iterations=iters)


def _adaptive_threshold(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    block = int(np.clip(_p(step, "block", 11.0), 3, 51))
    if block % 2 == 0:
        block += 1
    c = float(_p(step, "c", 2.0))
    method = cv2.ADAPTIVE_THRESH_GAUSSIAN_C if _ps(step, "method", "mean") == "gaussian" else cv2.ADAPTIVE_THRESH_MEAN_C
    th_type = cv2.THRESH_BINARY_INV if _pb(step, "invert", False) else cv2.THRESH_BINARY
    bin_img = cv2.adaptiveThreshold(gray, 255, method, th_type, block, c)
    return _stack3(bin_img)


def _laplacian(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    ksize = int(np.clip(_p(step, "ksize", 3.0), 1, 15))
    if ksize % 2 == 0:
        ksize += 1
    lap = cv2.Laplacian(gray, cv2.CV_32F, ksize=ksize)
    return _stack3(cv2.convertScaleAbs(lap))


def _sobel(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    ksize = int(np.clip(_p(step, "ksize", 3.0), 1, 15))
    if ksize % 2 == 0:
        ksize += 1
    axis = _ps(step, "axis", "x")
    dx, dy = (1, 0) if axis == "x" else (0, 1)
    s = cv2.Sobel(gray, cv2.CV_32F, dx, dy, ksize=ksize)
    return _stack3(cv2.convertScaleAbs(s))


def _flip(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    mode_map = {"horizontal": 1, "vertical": 0, "both": -1}
    mode = mode_map.get(_ps(step, "mode", "horizontal"), 1)
    return cv2.flip(img, mode)


OPS = {
    "brightness": _brightness,
    "contrast": _contrast,
    "gamma": _gamma,
    "histogram_eq": _histogram_eq,
    "clahe": _clahe,
    "grayscale": _grayscale,
    "gaussian_blur": _gaussian_blur,
    "median_blur": _median_blur,
    "sharpen": _sharpen,
    "threshold": _threshold,
    "canny": _canny,
    "denoise": _denoise,
    "saturation": _saturation,
    "white_balance": _white_balance,
    "invert": _invert,
    "sepia": _sepia,
    "posterize": _posterize,
    "box_blur": _box_blur,
    "bilateral": _bilateral,
    "morphology": _morphology,
    "adaptive_threshold": _adaptive_threshold,
    "laplacian": _laplacian,
    "sobel": _sobel,
    "flip": _flip,
}


# ---------- 管线 / 直方图 ----------

def apply_step(img: np.ndarray, step: Dict[str, Any]) -> np.ndarray:
    fn = OPS.get(step.get("type", ""))
    if fn is None:
        raise RuntimeError(f"unknown enhancement type: {step.get('type')}")
    return fn(img, step)


def run_pipeline(img: np.ndarray, steps: List[Dict[str, Any]]) -> np.ndarray:
    current = img
    for step in steps:
        if step.get("enabled", True):
            current = apply_step(current, step)
    return current


def histogram_bins(img: np.ndarray) -> Dict[str, List[int]]:
    """按 BGR 布局取通道：索引0=B,1=G,2=R。"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return {
        "gray": np.bincount(gray.ravel(), minlength=256).tolist(),
        "red": np.bincount(img[:, :, 2].ravel(), minlength=256).tolist(),
        "green": np.bincount(img[:, :, 1].ravel(), minlength=256).tolist(),
        "blue": np.bincount(img[:, :, 0].ravel(), minlength=256).tolist(),
    }


def image_info(img: np.ndarray) -> Dict[str, Any]:
    h, w = img.shape[:2]
    return {
        "dataUrl": encode_png(img),
        "width": int(w),
        "height": int(h),
        "histograms": histogram_bins(img),
    }


def load_image(path: str) -> Dict[str, Any]:
    return image_info(read_img(path))


def process_pipeline(path: str, steps: List[Dict[str, Any]]) -> Dict[str, Any]:
    img = read_img(path)
    result = run_pipeline(img, steps or [])
    return image_info(result)


def export_image(path: str, steps: List[Dict[str, Any]], out_path: str) -> bool:
    img = read_img(path)
    result = run_pipeline(img, steps or [])
    ok, buf = cv2.imencode(".png", result)
    if not ok:
        raise RuntimeError("PNG 编码失败")
    buf.tofile(out_path)
    return True