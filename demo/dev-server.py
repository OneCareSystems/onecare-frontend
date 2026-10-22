"""Serves the widget demo and forwards /api/ calls, so the page and the API share one origin (no CORS setup needed while developing).

  python demo/dev-server.py --api http://localhost:8080                       # forward to Spring Boot (the normal flow)
  python demo/dev-server.py --django http://127.0.0.1:8000 --token <service>  # Spring is not running: talk to Django directly
Then open http://localhost:5173/demo/index.html

--django mode sends POST /api/chatbot/query to Django's /internal/chat/query with the service token. It skips Spring's validation
and rate limit, so use it only to SEE the widget, never to judge the API."""
import argparse
import mimetypes
import sys
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
mimetypes.add_type("text/javascript", ".js")            # Windows can map .js to text/plain, which browsers refuse for modules
mimetypes.add_type("text/javascript", ".mjs")
PASS_BACK = ("Content-Type", "Retry-After", "X-RateLimit-Limit", "X-RateLimit-Remaining")


def make_handler(api, django, token):
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ROOT), **kwargs)

        def do_GET(self):
            if self.path in ("/", ""):
                self.send_response(302)
                self.send_header("Location", "/demo/index.html")
                self.end_headers()
                return
            super().do_GET()

        def do_POST(self):
            if not self.path.startswith("/api/"):
                self.send_error(404)
                return
            body = self.rfile.read(int(self.headers.get("Content-Length") or 0))
            if django:
                url, headers = django.rstrip("/") + "/internal/chat/query", {"Authorization": f"Bearer {token}"}
            elif api:
                url, headers = api.rstrip("/") + self.path, {}
            else:
                self.send_error(503, "Start the dev server with --api or --django")
                return
            headers["Content-Type"] = self.headers.get("Content-Type", "application/json")
            headers["Accept"] = "application/json"
            request = urllib.request.Request(url, data=body, headers=headers, method="POST")
            try:
                with urllib.request.urlopen(request, timeout=75) as upstream:
                    self._relay(upstream.status, upstream.headers, upstream.read())
            except urllib.error.HTTPError as err:
                self._relay(err.code, err.headers, err.read())
            except (urllib.error.URLError, TimeoutError) as err:
                self.send_error(502, f"Upstream not reachable: {err}")

        def _relay(self, status, headers, data):
            self.send_response(status)
            for name in PASS_BACK:
                if headers.get(name):
                    self.send_header(name, headers[name])
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def log_message(self, fmt, *args):
            sys.stderr.write(f"{self.address_string()} {fmt % args}\n")
    return Handler


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=5173)
    parser.add_argument("--api", default="http://localhost:8080", help="Spring Boot base URL")
    parser.add_argument("--django", default="", help="Django base URL (use when Spring is not running)")
    parser.add_argument("--token", default="", help="Django service token (with --django)")
    args = parser.parse_args()
    target = f"Django {args.django} (direct)" if args.django else f"Spring {args.api}"
    print(f"Widget demo: http://localhost:{args.port}/demo/index.html   API -> {target}   (Ctrl+C to stop)")
    ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(None if args.django else args.api, args.django, args.token)).serve_forever()