//! 图像增强：以纯 Rust (image crate) 实现全部算子，接口与 Tauri command 解耦。
//! 说明：本机未安装系统 OpenCV，故按计划回退为 image crate 实现；算子保持相同参数语义，
//! 便于将来无缝替换为 opencv crate（保持同样的 Step 参数契约）。

use image::{Rgb, RgbImage};
use serde_json::Value;
use std::collections::HashMap;

use crate::models::Step;

const LUM: [f32; 3] = [0.2126, 0.7152, 0.0722];

fn cn(v: f32) -> u8 {
    v.round().clamp(0.0, 255.0) as u8
}
fn luma(p: &[u8; 3]) -> u8 {
    cn(LUM[0] * p[0] as f32 + LUM[1] * p[1] as f32 + LUM[2] * p[2] as f32)
}
fn param(m: &HashMap<String, Value>, k: &str, def: f32) -> f32 {
    m.get(k)
        .and_then(|v| v.as_f64())
        .map(|x| x as f32)
        .unwrap_or(def)
}
fn param_bool(m: &HashMap<String, Value>, k: &str, def: bool) -> bool {
    m.get(k).and_then(|v| v.as_bool()).unwrap_or(def)
}

fn put_rgb(img: &mut RgbImage, x: u32, y: u32, r: u8, g: u8, b: u8) {
    img.put_pixel(x, y, Rgb([r, g, b]));
}

// ---------- 基础 ----------

fn brightness(img: &RgbImage, m: &HashMap<String, Value>) -> RgbImage {
    let delta = (param(m, "value", 20.0) / 100.0) * 255.0;
    let mut out = img.clone();
    for p in out.pixels_mut() {
        let arr = p.0;
        p.0 = [
            cn(arr[0] as f32 + delta),
            cn(arr[1] as f32 + delta),
            cn(arr[2] as f32 + delta),
        ];
    }
    out
}

fn contrast(img: &RgbImage, m: &HashMap<String, Value>) -> RgbImage {
    let factor = param(m, "value", 100.0) / 100.0;
    let offset = 128.0 * (1.0 - factor);
    let mut out = img.clone();
    for p in out.pixels_mut() {
        let arr = p.0;
        p.0 = [
            cn(factor * arr[0] as f32 + offset),
            cn(factor * arr[1] as f32 + offset),
            cn(factor * arr[2] as f32 + offset),
        ];
    }
    out
}

fn gamma(img: &RgbImage, m: &HashMap<String, Value>) -> RgbImage {
    // value 10..500 -> gamma 0.1..5.0；out = 255*(p/255)^(1/gamma)
    let gamma = (param(m, "value", 100.0) / 100.0).clamp(0.02, 10.0);
    let inv = 1.0 / gamma;
    let lut: Vec<u8> = (0..=255u32)
        .map(|i| cn(255.0 * (i as f32 / 255.0).powf(inv)))
        .collect();
    let mut out = img.clone();
    for p in out.pixels_mut() {
        let arr = p.0;
        p.0 = [
            lut[arr[0] as usize],
            lut[arr[1] as usize],
            lut[arr[2] as usize],
        ];
    }
    out
}

fn to_gray(img: &RgbImage) -> RgbImage {
    let mut out = img.clone();
    for p in out.pixels_mut() {
        let g = luma(&p.0);
        p.0 = [g, g, g];
    }
    out
}

// ---------- 直方图 ----------

fn histogram(img: &RgbImage, channel: usize) -> [u32; 256] {
    let mut h = [0u32; 256];
    for p in img.pixels() {
        h[p.0[channel] as usize] += 1;
    }
    h
}

fn equalize_lut(h: &[u32; 256]) -> Vec<u8> {
    let n: u32 = h.iter().sum();
    let mut cdf = [0u32; 256];
    let mut acc = 0u32;
    for i in 0..256 {
        acc += h[i];
        cdf[i] = acc;
    }
    let cdf_min = cdf.iter().find(|&&c| c > 0).copied().unwrap_or(0);
    let scale = (255.0 / (n as f32 - cdf_min as f32)).max(0.0);
    (0..256u32)
        .map(|i| {
            if cdf[i as usize] <= cdf_min {
                0
            } else {
                cn((cdf[i as usize] - cdf_min) as f32 * scale)
            }
        })
        .collect()
}

fn histogram_eq(img: &RgbImage, _m: &HashMap<String, Value>) -> RgbImage {
    let mut out = img.clone();
    for ch in 0..3 {
        let h = histogram(&out, ch);
        let lut = equalize_lut(&h);
        for p in out.pixels_mut() {
            p.0[ch] = lut[p.0[ch] as usize];
        }
    }
    out
}

fn clahe_lut(h: &mut [u32; 256], _area: f32, clip: f32) -> Vec<u8> {
    let clip_c = clip.max(1.0) as u32;
    let mut excess = 0u32;
    for x in h.iter_mut() {
        if *x > clip_c {
            excess += *x - clip_c;
            *x = clip_c;
        }
    }
    let add = excess / 256;
    let rem = (excess % 256) as usize;
    for (i, x) in h.iter_mut().enumerate() {
        *x += add + if i <= rem { 1 } else { 0 };
    }
    let mut cdf = [0u32; 256];
    let mut acc = 0u32;
    let mut min_cdf = u32::MAX;
    let mut max_cdf = 0u32;
    for i in 0..256 {
        acc += h[i];
        cdf[i] = acc;
        if acc > 0 && acc < min_cdf {
            min_cdf = acc;
        }
        if acc > max_cdf {
            max_cdf = acc;
        }
    }
    let den = (max_cdf as f32 - min_cdf as f32).max(1.0);
    (0..256u32)
        .map(|i| {
            let c = cdf[i as usize];
            if c <= min_cdf {
                0
            } else {
                cn((c as f32 - min_cdf as f32) / den * 254.0)
            }
        })
        .collect()
}

fn clahe(img: &RgbImage, m: &HashMap<String, Value>) -> RgbImage {
    let gray = to_gray(img);
    let (w, h) = (gray.width(), gray.height());
    let t = param(m, "tiles", 8.0).clamp(2.0, 16.0) as usize;
    let clip_limit = (param(m, "clip_limit", 20.0) / 10.0).clamp(0.1, 10.0);
    let tile_w = ((w as usize + t - 1) / t).max(1);
    let tile_h = ((h as usize + t - 1) / t).max(1);
    let area = (tile_w * tile_h) as f32;
    let clip = clip_limit * area / 256.0;

    let mut luts: Vec<Vec<Vec<u8>>> = Vec::with_capacity(t);
    for ty in 0..t {
        let mut row: Vec<Vec<u8>> = Vec::with_capacity(t);
        for tx in 0..t {
            let mut hb = [0u32; 256];
            let x0 = tx * tile_w;
            let y0 = ty * tile_h;
            let x1 = (x0 + tile_w).min(w as usize);
            let y1 = (y0 + tile_h).min(h as usize);
            for y in y0..y1 {
                for x in x0..x1 {
                    hb[gray.get_pixel(x as u32, y as u32).0[0] as usize] += 1;
                }
            }
            row.push(clahe_lut(&mut hb, area, clip));
        }
        luts.push(row);
    }

    let mut out = to_gray(img);
    for y in 0..h {
        for x in 0..w {
            let tx = ((x as usize) / tile_w).min(t - 1);
            let ty = ((y as usize) / tile_h).min(t - 1);
            let v = out.get_pixel(x, y).0[0] as usize;
            let nv = luts[ty][tx][v];
            put_rgb(&mut out, x, y, nv, nv, nv);
        }
    }
    out
}

// ---------- 滤波 ----------

fn gaussian_kernel(sigma: f32) -> Vec<f32> {
    let radius = (3.0 * sigma).ceil() as usize;
    let radius = radius.max(1);
    let n = 2 * radius + 1;
    let mut k = vec![0f32; n];
    let mut sum = 0f32;
    for i in 0..n {
        let d = (i as i32 - radius as i32) as f32;
        let v = (-(d * d) / (2.0 * sigma * sigma)).exp();
        k[i] = v;
        sum += v;
    }
    for v in k.iter_mut() {
        *v /= sum;
    }
    k
}

fn gaussian_blur(img: &RgbImage, m: &HashMap<String, Value>) -> RgbImage {
    let sigma = (param(m, "sigma", 10.0) / 10.0).clamp(0.1, 10.0);
    let k = gaussian_kernel(sigma);
    let r = (k.len() / 2) as i64;
    let (w, h) = (img.width() as i64, img.height() as i64);
    let mut tmp = img.clone();
    let mut out = img.clone();
    for ch in 0..3 {
        for y in 0..h {
            for x in 0..w {
                let mut acc = 0.0;
                for (i, &kv) in k.iter().enumerate() {
                    let sx = (x + (i as i64) - r).clamp(0, w - 1);
                    acc += kv * img.get_pixel(sx as u32, y as u32).0[ch] as f32;
                }
                let p = tmp.get_pixel_mut(x as u32, y as u32);
                p.0[ch] = cn(acc);
            }
        }
    }
    for ch in 0..3 {
        for x in 0..w {
            for y in 0..h {
                let mut acc = 0.0;
                for (i, &kv) in k.iter().enumerate() {
                    let sy = (y + (i as i64) - r).clamp(0, h - 1);
                    acc += kv * tmp.get_pixel(x as u32, sy as u32).0[ch] as f32;
                }
                out.get_pixel_mut(x as u32, y as u32).0[ch] = cn(acc);
            }
        }
    }
    out
}

fn median_blur(img: &RgbImage, m: &HashMap<String, Value>) -> RgbImage {
    let k = (param(m, "kernel", 3.0) as usize).clamp(1, 7);
    let k = if k % 2 == 0 { k + 1 } else { k };
    let half = (k / 2) as i64;
    let (w, h) = (img.width() as i64, img.height() as i64);
    let mut out = img.clone();
    for ch in 0..3 {
        for y in 0..h {
            for x in 0..w {
                let mut vals = Vec::with_capacity(k * k);
                for dy in -half..=half {
                    for dx in -half..=half {
                        let sx = (x + dx).clamp(0, w - 1);
                        let sy = (y + dy).clamp(0, h - 1);
                        vals.push(img.get_pixel(sx as u32, sy as u32).0[ch]);
                    }
                }
                vals.sort_unstable();
                let outv = vals[vals.len() / 2];
                out.get_pixel_mut(x as u32, y as u32).0[ch] = outv;
            }
        }
    }
    out
}

fn denoise(img: &RgbImage, m: &HashMap<String, Value>) -> RgbImage {
    let knee = (param(m, "strength", 3.0) as usize).clamp(1, 7);
    let k = if knee % 2 == 0 { knee + 1 } else { knee };
    let mut mm = HashMap::new();
    mm.insert("kernel".to_string(), Value::from(k as f64));
    median_blur(img, &mm)
}

// ---------- 细节 / 分割 ----------

fn sharpen(img: &RgbImage, m: &HashMap<String, Value>) -> RgbImage {
    let amount = (param(m, "amount", 100.0) / 100.0).clamp(0.0, 3.0);
    let sigma = (param(m, "sigma", 5.0) / 10.0).max(0.2);
    let mut mm = HashMap::new();
    mm.insert("sigma".to_string(), Value::from((sigma * 10.0) as f64));
    let blurred = gaussian_blur(img, &mm);
    let mut out = img.clone();
    for (src, bl) in out.pixels_mut().zip(blurred.pixels()) {
        for ch in 0..3 {
            let v = src.0[ch] as f32 + amount * (src.0[ch] as f32 - bl.0[ch] as f32);
            src.0[ch] = cn(v);
        }
    }
    out
}

fn otsu(gray: &[u8]) -> u8 {
    let mut hist = [0u32; 256];
    let n = gray.len() as f32;
    if n == 0.0 {
        return 128;
    }
    for &v in gray {
        hist[v as usize] += 1;
    }
    let mut sum = 0u32;
    for i in 0..256 {
        sum += (i as u32) * hist[i];
    }
    let mut sum_b = 0u32;
    let mut w_b = 0u32;
    let mut best = 0f64;
    let mut th = 128u8;
    for t in 0..256usize {
        w_b += hist[t];
        if w_b == 0 {
            continue;
        }
        let w_f = n - w_b as f32;
        if w_f == 0.0 {
            break;
        }
        sum_b += t as u32 * hist[t];
        let m_b = sum_b as f64 / w_b as f64;
        let m_f = (sum as f64 - sum_b as f64) / w_f as f64;
        let between = (w_b as f64) * (w_f as f64) * (m_b - m_f) * (m_b - m_f);
        if between > best {
            best = between;
            th = t as u8;
        }
    }
    th
}

fn threshold(img: &RgbImage, m: &HashMap<String, Value>) -> RgbImage {
    let gray = to_gray(img);
    let pixels: Vec<u8> = gray.pixels().map(|p| p.0[0]).collect();
    let th = if param_bool(m, "otsu", true) {
        otsu(&pixels)
    } else {
        param(m, "value", 128.0).clamp(0.0, 255.0) as u8
    };
    let invert = param_bool(m, "invert", false);
    let mut out = gray.clone();
    for p in out.pixels_mut() {
        let on = p.0[0] > th;
        let white = if invert { !on } else { on };
        let v = if white { 255 } else { 0 };
        p.0 = [v, v, v];
    }
    out
}

fn canny(img: &RgbImage, m: &HashMap<String, Value>) -> RgbImage {
    let low = param(m, "low", 50.0).clamp(1.0, 255.0) as f32;
    let high = param(m, "high", 150.0).clamp(1.0, 255.0) as f32;
    let (w, h) = (img.width() as i64, img.height() as i64);
    let gray = to_gray(img);
    let mut gx = vec![0f32; (w * h) as usize];
    let mut gy = vec![0f32; (w * h) as usize];
    let idx = |x: i64, y: i64| (y * w + x) as usize;
    for y in 0..h {
        for x in 0..w {
            let v = |dx: i64, dy: i64| {
                let sx = (x + dx).clamp(0, w - 1);
                let sy = (y + dy).clamp(0, h - 1);
                gray.get_pixel(sx as u32, sy as u32).0[0] as f32
            };
            gx[idx(x, y)] =
                -v(-1, -1) + v(1, -1) - 2.0 * v(-1, 0) + 2.0 * v(1, 0) - v(-1, 1) + v(1, 1);
            gy[idx(x, y)] =
                -v(-1, -1) - 2.0 * v(0, -1) - v(1, -1) + v(-1, 1) + 2.0 * v(0, 1) + v(1, 1);
        }
    }
    let mag: Vec<f32> = (0..gx.len())
        .map(|i| (gx[i] * gx[i] + gy[i] * gy[i]).sqrt())
        .collect();

    // 非极大值抑制
    let mut nms = vec![0f32; mag.len()];
    for y in 1..h - 1 {
        for x in 1..w - 1 {
            let i = idx(x, y);
            let angle = gy[i].atan2(gx[i]).to_degrees();
            let (q1, q2) = if angle <= 22.5 || angle > 157.5 || (angle > -157.5 && angle <= -112.5)
            {
                (mag[idx(x - 1, y)], mag[idx(x + 1, y)])
            } else if angle > 22.5 && angle <= 67.5 || (angle > -112.5 && angle <= -67.5) {
                (mag[idx(x - 1, y - 1)], mag[idx(x + 1, y + 1)])
            } else if angle > 67.5 && angle <= 112.5 || (angle > -67.5 && angle <= -22.5) {
                (mag[idx(x, y - 1)], mag[idx(x, y + 1)])
            } else {
                (mag[idx(x + 1, y - 1)], mag[idx(x - 1, y + 1)])
            };
            let m = mag[i];
            if m >= q1 && m >= q2 {
                nms[i] = m;
            }
        }
    }

    // 双阈值 + 滞回
    let mut strong = vec![false; nms.len()];
    for y in 1..h - 1 {
        for x in 1..w - 1 {
            if nms[idx(x, y)] >= high {
                strong[idx(x, y)] = true;
            }
        }
    }
    let mut edges = strong.clone();
    loop {
        let mut changed = false;
        for y in 1..h - 1 {
            for x in 1..w - 1 {
                if edges[idx(x, y)] || nms[idx(x, y)] < low {
                    continue;
                }
                let mut neighbor = false;
                'a: for dy in -1..=1 {
                    for dx in -1..=1 {
                        if dx == 0 && dy == 0 {
                            continue;
                        }
                        if edges[idx(x + dx, y + dy)] {
                            neighbor = true;
                            break 'a;
                        }
                    }
                }
                if neighbor {
                    edges[idx(x, y)] = true;
                    changed = true;
                }
            }
        }
        if !changed {
            break;
        }
    }

    let mut out = to_gray(img);
    for y in 0..h {
        for x in 0..w {
            let v = if edges[idx(x, y)] { 255 } else { 0 };
            put_rgb(&mut out, x as u32, y as u32, v, v, v);
        }
    }
    out
}

// ---------- 分发 ----------

pub fn apply_step(img: &RgbImage, step: &Step) -> RgbImage {
    let m = &step.params;
    match step.kind.as_str() {
        "brightness" => brightness(img, m),
        "contrast" => contrast(img, m),
        "gamma" => gamma(img, m),
        "histogram_eq" => histogram_eq(img, m),
        "clahe" => clahe(img, m),
        "grayscale" => to_gray(img),
        "gaussian_blur" => gaussian_blur(img, m),
        "median_blur" => median_blur(img, m),
        "sharpen" => sharpen(img, m),
        "threshold" => threshold(img, m),
        "canny" => canny(img, m),
        "denoise" => denoise(img, m),
        other => {
            eprintln!("[viscv] unknown enhancement type: {}", other);
            img.clone()
        }
    }
}

pub fn run_pipeline(img: &RgbImage, steps: &[Step]) -> RgbImage {
    let mut current = img.clone();
    for step in steps {
        if step.enabled {
            current = apply_step(&current, step);
        } else {
            eprintln!("[viscv] step skipped: {} (disabled)", step.kind);
        }
    }
    current
}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::Step;

    fn gray_pixels(v: u8) -> RgbImage {
        RgbImage::from_fn(4, 4, |_, _| Rgb([v, v, v]))
    }
    fn make_step(kind: &str) -> Step {
        Step {
            id: "t".into(),
            kind: kind.into(),
            enabled: true,
            params: HashMap::new(),
        }
    }

    #[test]
    fn brightness_raises_values() {
        let img = gray_pixels(10);
        let mut m = HashMap::new();
        m.insert("value".into(), Value::from(100.0));
        let r = brightness(&img, &m);
        assert_eq!(r.get_pixel(0, 0).0[0], 255);
    }

    #[test]
    fn grayscale_makes_channels_equal() {
        let img: RgbImage = RgbImage::from_fn(2, 2, |_, _| Rgb([10, 120, 200]));
        let r = to_gray(&img);
        let p = r.get_pixel(0, 0).0;
        assert_eq!(p[0], p[1]);
        assert_eq!(p[1], p[2]);
    }

    #[test]
    fn median_is_identity_on_flat() {
        let img = gray_pixels(77);
        let mut m = HashMap::new();
        m.insert("kernel".into(), Value::from(3.0));
        let r = median_blur(&img, &m);
        assert_eq!(r.get_pixel(0, 0).0[0], 77);
    }

    #[test]
    fn disabled_steps_are_skipped() {
        let img = gray_pixels(50);
        let mut s = make_step("brightness");
        s.enabled = false;
        let r = run_pipeline(&img, &[s]);
        assert_eq!(r.get_pixel(0, 0).0[0], 50);
    }

    #[test]
    fn otsu_separates_bimodal() {
        let mut pixels = Vec::new();
        for _ in 0..100 {
            pixels.push(20u8);
        }
        for _ in 0..100 {
            pixels.push(220u8);
        }
        let t = otsu(&pixels);
        // 需分离两团像素：取间隙内任一阈值（本实现返回下边界，仍正确分割）
        assert!(t > 10 && t < 230);
    }

    #[test]
    fn threshold_binarizes() {
        let img: RgbImage = RgbImage::from_fn(4, 4, |x, y| {
            let v = if (x + y) % 2 == 0 { 30 } else { 230 };
            Rgb([v, v, v])
        });
        let mut m = HashMap::new();
        m.insert("otsu".into(), Value::from(false));
        m.insert("value".into(), Value::from(128.0));
        m.insert("invert".into(), Value::from(false));
        let r = threshold(&img, &m);
        let vals: Vec<u8> = r.pixels().map(|p| p.0[0]).collect();
        assert!(vals.contains(&0) && vals.contains(&255));
    }
}
