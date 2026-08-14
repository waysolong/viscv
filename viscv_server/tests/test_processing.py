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