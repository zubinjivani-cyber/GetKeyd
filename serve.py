#!/usr/bin/env python3
"""Dev server for getkeyd: disables caching (edits always show) and supports
HTTP Range requests so audio/video can seek — GitHub Pages does this in prod."""
import http.server
import os
import re

PORT = 8000


class DevHandler(http.server.SimpleHTTPRequestHandler):
    # Serve media with correct MIME types (Python's default mislabels .m4a).
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".m4a": "audio/mp4",
        ".mp4": "video/mp4",
        ".m4v": "video/mp4",
    }

    def send_error(self, code, message=None, explain=None):
        # GitHub Pages serves /404.html for any unknown path; match that here so
        # the not-found page (and its redirects) can be tested locally.
        if code == 404 and self.command in ("GET", "HEAD"):
            page = os.path.join(os.getcwd(), "404.html")
            if os.path.isfile(page):
                with open(page, "rb") as fh:
                    body = fh.read()
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                if self.command == "GET":
                    self.wfile.write(body)
                return
        super().send_error(code, message, explain)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def send_head(self):
        rng = self.headers.get("Range")
        if not rng:
            return super().send_head()

        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()
        try:
            f = open(path, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None

        try:
            size = os.fstat(f.fileno()).st_size
            m = re.match(r"bytes=(\d*)-(\d*)", rng.strip())
            if not m or (m.group(1) == "" and m.group(2) == ""):
                f.close()
                return super().send_head()
            if m.group(1) == "":  # suffix range: last N bytes
                start = max(0, size - int(m.group(2)))
                end = size - 1
            else:
                start = int(m.group(1))
                end = int(m.group(2)) if m.group(2) else size - 1
            end = min(end, size - 1)
            if start > end or start >= size:
                self.send_error(416, "Requested Range Not Satisfiable")
                f.close()
                return None

            length = end - start + 1
            self.send_response(206)
            self.send_header("Content-Type", self.guess_type(path))
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.send_header("Content-Length", str(length))
            self.send_header("Last-Modified", self.date_time_string(os.fstat(f.fileno()).st_mtime))
            self.end_headers()

            if self.command == "HEAD":
                f.close()
                return None
            f.seek(start)
            remaining = length
            while remaining > 0:
                chunk = f.read(min(64 * 1024, remaining))
                if not chunk:
                    break
                try:
                    self.wfile.write(chunk)
                except (BrokenPipeError, ConnectionResetError):
                    break
                remaining -= len(chunk)
            f.close()
            return None
        except Exception:
            f.close()
            raise


if __name__ == "__main__":
    # Threaded so streaming a video doesn't block other requests.
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    # Bind to localhost only — this dev server is not meant to be reachable from the LAN.
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), DevHandler) as httpd:
        print(f"getkeyd dev server (no-cache, threaded, range) on http://localhost:{PORT}")
        httpd.serve_forever()
