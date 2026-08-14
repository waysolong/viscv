import json
import threading
from http.server import ThreadingHTTPServer
import urllib.error
import urllib.request

import numpy as np


def _post(url, payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read().decode("utf-8"))


def test_handle_command_load_image(tmp_path):
    import cv2
    from viscv_server import server

    p = tmp_path / "a.png"
    p.write_bytes(cv2.imencode(".png", np.zeros((4, 4, 3), dtype=np.uint8))[1].tobytes())
    info = server.handle_command("load_image", {"path": str(p)})
    assert info["dataUrl"].startswith("data:image/png;base64,")


def test_http_rpc_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setenv("VISCV_DATA_DIR", str(tmp_path))
    import cv2
    from viscv_server import server

    httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.make_handler())
    port = httpd.server_address[1]
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    try:
        p = tmp_path / "a.png"
        p.write_bytes(cv2.imencode(".png", np.zeros((4, 4, 3), np.uint8))[1].tobytes())
        status, body = _post(
            f"http://127.0.0.1:{port}/rpc",
            {"command": "load_image", "args": {"path": str(p)}},
        )
        assert status == 200 and body["ok"] is True
        assert body["data"]["width"] == 4
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=10) as r:
            assert r.status == 200
        status, body = _post(f"http://127.0.0.1:{port}/rpc", {"command": "nope", "args": {}})
        assert status == 500 and body["ok"] is False
    finally:
        httpd.shutdown()


def test_handle_command_settings_and_crud(tmp_path, monkeypatch):
    monkeypatch.setenv("VISCV_DATA_DIR", str(tmp_path))
    from viscv_server import server

    saved = server.handle_command(
        "save_settings", {"settings": {"theme": "dark", "updateUrl": "x", "checkOnStart": True}}
    )
    assert saved["theme"] == "dark"
    got = server.handle_command("get_settings", {})
    assert got["theme"] == "dark"
    proj = {"id": "p1", "name": "n", "imagePath": None, "steps": [], "note": "", "createdAt": 1, "updatedAt": 1}
    server.handle_command("save_project", {"project": proj})
    assert len(server.handle_command("list_projects", {})) == 1
    server.handle_command("delete_project", {"id": "p1"})
    assert server.handle_command("list_projects", {}) == []
    upd = server.handle_command("check_update", {})
    assert isinstance(upd["message"], str)