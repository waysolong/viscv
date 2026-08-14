import os
from viscv_server.server import DEFAULT_PORT, serve


def main() -> None:
    serve(port=int(os.environ.get("VISCV_PORT") or DEFAULT_PORT))


if __name__ == "__main__":
    main()