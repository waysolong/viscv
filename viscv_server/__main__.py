import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from viscv_server.server import DEFAULT_PORT, serve  # noqa: E402


def main() -> None:
    serve(port=int(os.environ.get("VISCV_PORT") or DEFAULT_PORT))


if __name__ == "__main__":
    main()