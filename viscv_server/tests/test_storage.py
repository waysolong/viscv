def test_preset_round_trip(tmp_path, monkeypatch):
    monkeypatch.setenv("VISCV_DATA_DIR", str(tmp_path))
    from viscv_server import storage

    obj = {"id": "p1", "name": "预设", "steps": [], "createdAt": 1}
    storage.upsert("presets", "p1", obj)
    assert storage.list_items("presets") == [obj]
    storage.delete("presets", "p1")
    assert storage.list_items("presets") == []


def test_settings_round_trip(tmp_path, monkeypatch):
    monkeypatch.setenv("VISCV_DATA_DIR", str(tmp_path))
    from viscv_server import storage

    storage.set_setting("app", {"theme": "dark", "updateUrl": "u", "checkOnStart": True})
    got = storage.get_setting("app", {"theme": "light"})
    assert got["theme"] == "dark" and got["checkOnStart"] is True