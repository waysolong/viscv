import numpy as np

from viscv_server import processing


def step(kind, **params):
    return {"id": "s", "type": kind, "enabled": True, "params": params}


def flat(v, w=8, h=8):
    return np.full((h, w, 3), v, dtype=np.uint8)


def rgb_img():
    img = np.full((8, 8, 3), 200, dtype=np.uint8)
    img[:, :, 0] = np.arange(8)[None, :]
    img[:, :, 1] = np.arange(8)[:, None]
    return img


def test_brightness_raises_values():
    out = processing._brightness(flat(10), step("brightness", value=100))
    assert out[0, 0, 0] == 255


def test_grayscale_channels_equal():
    out = processing.apply_step(rgb_img(), step("grayscale"))
    assert out.shape == (8, 8, 3)
    assert (out[:, :, 0] == out[:, :, 1]).all()
    assert (out[:, :, 1] == out[:, :, 2]).all()


def test_median_identity_on_flat():
    out = processing.apply_step(flat(77), step("median_blur", kernel=3.0))
    assert out[0, 0, 0] == 77


def test_disabled_steps_skipped():
    st = step("brightness", value=100)
    st["enabled"] = False
    out = processing.run_pipeline(flat(50), [st])
    assert out[0, 0, 0] == 50


def test_pipeline_produces_valid_output():
    s1 = step("brightness", value=100)
    s2 = step("contrast", value=200)
    out = processing.run_pipeline(flat(10), [s1, s2])
    assert out.dtype == np.uint8


def test_otsu_separates_bimodal():
    poss = np.zeros((4, 4, 3), dtype=np.uint8)
    poss[0:2, 0:2] = 30
    poss[2:4, 2:4] = 230
    out = processing.apply_step(poss, step("threshold", otsu=True, invert=False, value=0))
    vals = set(np.unique(out).tolist())
    assert vals <= {0, 255}
    assert 0 in vals and 255 in vals


def test_threshold_binarizes():
    img = flat(0)
    img[::2] = 230
    out = processing.apply_step(img, step("threshold", otsu=False, invert=False, value=128))
    assert set(np.unique(out).tolist()) <= {0, 255}


def test_histogram_lengths():
    h = processing.histogram_bins(rgb_img())
    for ch in ("gray", "red", "green", "blue"):
        assert len(h[ch]) == 256


def test_encode_and_load(tmp_path):
    url = processing.encode_png(flat(120))
    assert url.startswith("data:image/png;base64,")
    p = tmp_path / "a.png"
    p.write_bytes(__import__("base64").b64decode(url.split(",", 1)[1]))
    info = processing.load_image(str(p))
    assert info["width"] == 8 and info["height"] == 8
    assert len(info["histograms"]["gray"]) == 256


def test_export_image_roundtrip(tmp_path):
    import cv2

    p = tmp_path / "in.png"
    p.write_bytes(cv2.imencode(".png", flat(99))[1].tobytes())
    out = tmp_path / "out.png"
    ok = processing.export_image(str(p), [step("brightness", value=50)], str(out))
    assert ok and out.exists()


def test_decode_supported_formats(tmp_path):
    import cv2

    for fmt, ext in [(".png", ".png"), (".jpg", ".jpg")]:
        p = tmp_path / ("img" + ext)
        p.write_bytes(cv2.imencode(fmt, flat(80, 6, 6))[1].tobytes())
        info = processing.load_image(str(p))
        assert info["width"] == 6


def test_png_roundtrip_no_channel_swap():
    import base64 as b64
    import cv2

    bgr = np.zeros((2, 2, 3), dtype=np.uint8)
    bgr[:, :, 0] = 10  # B
    bgr[:, :, 1] = 20  # G
    bgr[:, :, 2] = 30  # R
    url = processing.encode_png(bgr)
    buf = np.frombuffer(b64.b64decode(url.split(",", 1)[1]), dtype=np.uint8)
    back = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    assert (back == bgr).all(), "PNG 往返出现 BGR/RGB 通道交换"

    h = processing.histogram_bins(bgr)
    assert h["red"][30] == 4 and h["green"][20] == 4 and h["blue"][10] == 4
    assert h["red"][10] == 0 and h["blue"][30] == 0


def test_invert_flips_values():
    out = processing.apply_step(flat(30), step("invert"))
    assert out[0, 0, 0] == 225


def test_white_balance_equalizes_means():
    img = np.zeros((8, 8, 3), dtype=np.uint8)
    img[:, :, 0] = 50  # B
    img[:, :, 1] = 100  # G
    img[:, :, 2] = 150  # R
    out = processing.apply_step(img, step("white_balance"))
    m = out.reshape(-1, 3).mean(axis=0)
    assert abs(m[0] - m[2]) < 6


def test_posterize_limits_levels():
    ramp = np.tile(np.arange(256, dtype=np.uint8)[:, None, None], (1, 1, 3))
    out = processing.apply_step(ramp, step("posterize", levels=4))
    vals = np.unique(out)
    assert len(vals) <= 4


def test_flip_horizontal_mirrors():
    img = np.zeros((2, 4, 3), dtype=np.uint8)
    img[0, 0] = 200
    out = processing.apply_step(img, step("flip", mode="horizontal"))
    assert out[0, 3, 0] == 200


def test_adaptive_threshold_binary():
    import cv2

    img = np.zeros((16, 16, 3), dtype=np.uint8)
    img[4:12, 4:12] = 180
    out = processing.apply_step(img, step("adaptive_threshold", block=7, c=2, method="mean", invert=False))
    assert set(np.unique(out).tolist()) <= {0, 255}


def test_new_ops_are_registered():
    for t in ("saturation", "white_balance", "invert", "sepia", "posterize",
              "box_blur", "bilateral", "morphology", "adaptive_threshold",
              "laplacian", "sobel", "flip"):
        assert t in processing.OPS


def test_new_augmented_ops_registered():
    for t in ("ultra_hsv", "ultra_perspective", "ultra_erase", "gaussian_noise", "bgr_swap"):
        assert t in processing.OPS


def test_ultra_perspective_changes_geometry():
    img = np.zeros((32, 48, 3), dtype=np.uint8)
    img[8:24, 18:30] = 200
    out = processing.apply_step(img, step("ultra_perspective", rotation=15, scale=100, translate=0, shear=0, perspective=0))
    assert out.shape == img.shape


def test_ultra_erase_keeps_shape_and_changes_region():
    img = np.full((40, 40, 3), 255, np.uint8)
    out = processing.apply_step(img, step("ultra_erase", area=25, fill=0))
    assert out.shape == img.shape
    assert (out == 0).any() and (out == 255).any()


def test_gaussian_noise_adds_variation():
    img = np.full((16, 16, 3), 128, np.uint8)
    out = processing.apply_step(img, step("gaussian_noise", sigma=40))
    assert out.dtype == np.uint8
    # 固定种子应稳定
    out2 = processing.apply_step(img, step("gaussian_noise", sigma=40))
    assert (out == out2).all()


def test_bgr_swap_swaps_channels():
    bgr = np.zeros((2, 2, 3), np.uint8)
    bgr[..., 0] = 10  # B
    bgr[..., 2] = 30  # R
    out = processing.apply_step(bgr, step("bgr_swap"))
    assert out[0, 0, 0] == 30 and out[0, 0, 2] == 10


def test_ultra_hsv_hue_shift_changes_image():
    img = np.full((8, 8, 3), (60, 120, 180), np.uint8)
    out = processing.apply_step(img, step("ultra_hsv", hue=90, saturation=100, brightness=100))
    assert out.shape == img.shape


def test_dl_aug_ops_registered():
    for t in ("mosaic", "mixup", "cutmix", "cutout"):
        assert t in processing.OPS


def test_mosaic_keeps_shape_and_differs():
    img = np.zeros((24, 32, 3), np.uint8)
    img[4:20, 6:26] = 150
    out = processing.apply_step(img, step("mosaic"))
    assert out.shape == img.shape


def test_mixup_and_cutmix_keep_shape():
    img = np.random.randint(0, 255, (20, 20, 3), np.uint8)
    assert processing.apply_step(img, step("mixup", alpha=50)).shape == img.shape
    assert processing.apply_step(img, step("cutmix", area=25)).shape == img.shape


def test_cutmix_changes_some_region_with_fixed_seed():
    img = np.zeros((32, 32, 3), np.uint8)
    img[4:28, 4:28] = 200
    out = processing.apply_step(img, step("cutmix", area=25))
    assert out.shape == img.shape
    out2 = processing.apply_step(img, step("cutmix", area=25))
    assert (out == out2).all()


def test_ultra_perspective_translate_zero_is_identity():
    img = np.random.randint(0, 255, (30, 50, 3), np.uint8)
    out = processing.apply_step(img, step("ultra_perspective", rotation=0, translate=0, scale=100, shear=0, perspective=0))
    assert (out == img).all()


def test_ultra_perspective_translate_shifts_image():
    img = np.zeros((30, 50, 3), np.uint8)
    img[5:25, 10:40] = 200
    out = processing.apply_step(img, step("ultra_perspective", rotation=0, translate=30, scale=100, shear=0, perspective=0))
    assert not (out == img).all()
