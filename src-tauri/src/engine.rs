//! Python(OpenCV) sidecar 生命周期与 JSON-RPC 转发层。
//! 策略：优先复用已在端口上就绪的引擎；否则拉起 Python 引擎（`python -m viscv_server`，
//! 可用变量 VISCV_ENGINE_PY / VISCV_ENGINE_EXE 指定解释器或已打包的 exe）；进程异常退出时
//! 在下一次请求时自动重启；应用退出（Drop）时回收子进程。

use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

use reqwest::blocking::Client;
use serde_json::{json, Value};

pub const DEFAULT_PORT: u16 = 18999;

pub struct Engine {
    child: Option<Child>,
    data_dir: PathBuf,
    port: u16,
    client: Client,
}

pub fn build_request(command: &str, args: Value) -> Value {
    json!({"command": command, "args": args})
}

pub fn parse_response(body: Value) -> Result<Value, String> {
    if body.get("ok").and_then(Value::as_bool) == Some(true) {
        Ok(body.get("data").cloned().unwrap_or(Value::Null))
    } else {
        Err(body
            .get("error")
            .and_then(Value::as_str)
            .unwrap_or("引擎返回未知错误")
            .to_string())
    }
}

impl Engine {
    pub fn new(data_dir: PathBuf, port: u16) -> Self {
        Engine {
            child: None,
            data_dir,
            port,
            client: Client::new(),
        }
    }

    pub fn base_url(&self) -> String {
        format!("http://127.0.0.1:{}", self.port)
    }

    fn command(&self) -> Command {
        let mut cmd = if let Ok(exe) = std::env::var("VISCV_ENGINE_EXE") {
            let c = Command::new(exe);
            c
        } else {
            let py = std::env::var("VISCV_ENGINE_PY").unwrap_or_else(|_| "python".to_string());
            let mut c = Command::new(py);
            c.args(["-m", "viscv_server"]);
            if let Ok(pypath) = std::env::var("VISCV_PYTHONPATH") {
                c.env("PYTHONPATH", pypath);
            }
            c
        };
        cmd.env("VISCV_PORT", self.port.to_string())
            .env(
                "VISCV_DATA_DIR",
                self.data_dir.to_string_lossy().to_string(),
            )
            .stdout(Stdio::null())
            .stderr(Stdio::inherit());
        cmd
    }

    fn healthy(&self) -> bool {
        self.client
            .get(format!("{}/health", self.base_url()))
            .timeout(Duration::from_millis(500))
            .send()
            .map(|r| r.status().is_success())
            .unwrap_or(false)
    }

    /// 拉起（或复用）引擎并等待就绪。
    pub fn start(&mut self) -> Result<(), String> {
        if self.healthy() {
            self.child = None; // 已有引擎在跑，直接复用
            return Ok(());
        }
        if let Some(mut old) = self.child.take() {
            let _ = old.kill();
            let _ = old.wait();
        }
        let mut child = self
            .command()
            .spawn()
            .map_err(|e| format!("无法启动 Python 引擎: {e}（请安装 Python，或用 VISCV_ENGINE_EXE / VISCV_ENGINE_PY 指定）"))?;
        let deadline = Instant::now() + Duration::from_secs(20);
        loop {
            if self.healthy() {
                self.child = Some(child);
                return Ok(());
            }
            if let Ok(Some(_)) = child.try_wait() {
                return Err("Python 引擎启动后立即退出，请检查日志".to_string());
            }
            if Instant::now() > deadline {
                let _ = child.kill();
                let _ = child.wait();
                return Err("等待 Python 引擎就绪超时（20s）".to_string());
            }
            std::thread::sleep(Duration::from_millis(100));
        }
    }

    /// 崩溃自动重启：进程没了且端口没活引擎时重新拉起。
    pub fn ensure_alive(&mut self) -> Result<(), String> {
        let alive = self
            .child
            .as_mut()
            .map(|c| c.try_wait().unwrap_or(None).is_none())
            .unwrap_or(false);
        if alive {
            return Ok(());
        }
        self.start()
    }

    /// 向后端引擎发起一次 JSON-RPC 请求。
    pub fn rpc(&mut self, command: &str, args: Value) -> Result<Value, String> {
        self.ensure_alive()?;
        let resp = self
            .client
            .post(format!("{}/rpc", self.base_url()))
            .json(&build_request(command, args))
            .timeout(Duration::from_secs(30))
            .send()
            .map_err(|e| format!("引擎请求失败: {e}"))?;
        let body: Value = resp.json().map_err(|e| format!("引擎响应解析失败: {e}"))?;
        parse_response(body)
    }
}

impl Drop for Engine {
    fn drop(&mut self) {
        if let Some(mut c) = self.child.take() {
            let _ = c.kill();
            let _ = c.wait();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_request_shape() {
        let r = build_request("load_image", json!({"path": "x"}));
        assert_eq!(r["command"], "load_image");
        assert_eq!(r["args"]["path"], "x");
    }

    #[test]
    fn parse_response_ok_and_error() {
        let ok = parse_response(json!({"ok": true, "data": {"width": 4}})).unwrap();
        assert_eq!(ok["width"], 4);
        assert_eq!(
            parse_response(json!({"ok": false, "error": "boom"})).unwrap_err(),
            "boom"
        );
        // 没有 data 字段时回退到 null
        assert_eq!(parse_response(json!({"ok": true})).unwrap(), Value::Null);
    }
}
