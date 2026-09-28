"""GET/HEAD-only static container server; no dispatch or host integration."""
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import mimetypes
from pathlib import Path
from urllib.parse import unquote, urlsplit


def handler_for(root):
    root = Path(root).resolve()

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.serve(False)

        def do_HEAD(self):
            self.serve(True)

        def serve(self, head):
            path = unquote(urlsplit(self.path).path)
            if "\x00" in path or "\\" in path or any(p in {".", ".."} for p in path.split("/")):
                self.send_error(400)
                return
            candidate = root / (path.lstrip("/") or "index.html")
            if any(p.is_symlink() for p in (candidate, *candidate.parents)):
                self.send_error(403)
                return
            if not candidate.resolve().is_relative_to(root) or not candidate.is_file():
                self.send_error(404)
                return
            if candidate.stat().st_size > 32 * 1024 * 1024:
                self.send_error(413)
                return
            body = candidate.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", mimetypes.guess_type(str(candidate))[0] or "application/octet-stream")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
            self.end_headers()
            if not head:
                self.wfile.write(body)

        def log_message(self, *args):
            pass

    return Handler


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).parent / "site")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    ThreadingHTTPServer(("0.0.0.0", args.port), handler_for(args.root)).serve_forever()
