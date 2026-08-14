use crate::models::HistogramBins;
use image::RgbImage;

/// 计算灰度 (luminance) 与 RGB 三通道直方图，各 256 个 bin。
pub fn compute(img: &RgbImage) -> HistogramBins {
    let (mut gray, mut r, mut g, mut b) = ([0u32; 256], [0u32; 256], [0u32; 256], [0u32; 256]);
    for p in img.pixels() {
        let arr = p.0;
        let l = (0.2126 * arr[0] as f32 + 0.7152 * arr[1] as f32 + 0.0722 * arr[2] as f32)
            .round()
            .clamp(0.0, 255.0) as u8;
        gray[l as usize] += 1;
        r[arr[0] as usize] += 1;
        g[arr[1] as usize] += 1;
        b[arr[2] as usize] += 1;
    }
    HistogramBins {
        gray: gray.to_vec(),
        red: r.to_vec(),
        green: g.to_vec(),
        blue: b.to_vec(),
    }
}
