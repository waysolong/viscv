"""极简本地 JSON-RPC 服务：POST /rpc，Body = {"command": name, "args": {...}}。

返回 {"ok": true, "data": ...} 或 {"ok": false, "error": "..."}。
不引入 FastAPI，仅用标准库 http.server，便于 PyInstaller 打包为单文件 sidecar。
"""
from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict

from . import processing, storage, updater

DEFAULT_PORT = 18999
DEFAULT_SETTINGS = {
    "theme": "light",
    "updateUrl": updater.DEFAULT_UPDATE_URL,
    "checkOnStart": False,
}


def handle_command(command: str, args: Dict[str, Any]) -> Any:
    if command == "load_image":
        return processing.load_image(args["path"])
    if command == "process_pipeline":
        return processing.process_pipeline(args["path"], args["steps"])
    if command == "export_image":
        return processing.export_image(args["path"], args["steps"], args["outPath"])
    if command == "list_projects":
        return storage.list_items("projects")
    if command == "save_project":
        storage.upsert("projects", args["project"]["id"], args["project"])
        return args["project"]
    if command == "delete_project":
        storage.delete("projects", args["id"])
        return None
    if command == "list_presets":
        return storage.list_items("presets")
    if command == "save_preset":
        storage.upsert("presets", args["preset"]["id"], args["preset"])
        return args["preset"]
    if command == "delete_preset":
        storage.delete("presets", args["id"])
        return None
    if command == "list_notes":
        return storage.list_items("notes")
    if command == "save_note":
        storage.upsert("notes", args["note"]["id"], args["note"])
        return args["note"]
    if command == "delete_note":
        storage.delete("notes", args["id"])
        return None
    if command == "get_settings":
        return storage.get_setting("app", DEFAULT_SETTINGS)
    if command == "save_settings":
        storage.set_setting("app", args["settings"])
        return args["settings"]
    if command == "check_update":
        settings = storage.get_setting("app", DEFAULT_SETTINGS)
        return updater.check_update(settings.get("updateUrl", updater.DEFAULT_UPDATE_URL))
    raise ValueError(f"unknown command: {command}")


def make_handler() -> type:
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args: Any) -> None:  # 关闭默认访问日志刷屏
            pass

        def do_GET(self):  # noqa: N802
            self._send({"ok": True, "engine": "viscv", "status": "ready"})

        def do_POST(self):  # noqa: N802
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length) if length else b"{}"
                req = json.loads(body.decode("utf-8"))
                data = handle_command(req["command"], req.get("args") or {})
                self._send({"ok": True, "data": data})
            except Exception as exc:  # noqa: BLE001
                self._send({"ok": False, "error": str(exc)}, status=500)

        def _send(self, payload: Dict[str, Any], status: int = 200) -> None:
            buf = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(buf)))
            self.end_headers()
            self.wfile.write(buf)

    return Handler


class QuietHTTPServer(ThreadingHTTPServer):
    """忽略就绪探测导致的客户端提前断开（ConnectionResetError），其余错误照常打印。"""

    def handle_error(self, request, client_address) -> None:  # noqa: N805
        import traceback

        if isinstance(sys.exc_info()[1], ConnectionResetError):
            return
        traceback.print_exc()


def serve(port: int = DEFAULT_PORT, host: str = "127.0.0.1") -> None:
    httpd = QuietHTTPServer((host, port), make_handler())
    print(f"[viscv-engine] listening on {host}:{port}", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    serve(port=int(os.environ.get("VISCV_PORT") or DEFAULT_PORT))