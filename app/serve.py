#!/usr/bin/env python3
"""Servidor estático con URLs limpias: /login -> login.html, etc."""
from __future__ import annotations

import http.server
import os
import socketserver
from pathlib import Path

PORT = int(os.environ.get("PORT", "8080"))
ROOT = Path(__file__).resolve().parent


class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        raw = self.path
        path_only, _, query = raw.partition("?")
        path_only = path_only.split("#", 1)[0]

        if path_only not in ("/", "") and not Path(path_only.lstrip("/")).suffix:
            html_name = path_only.lstrip("/") + ".html"
            if (ROOT / html_name).is_file():
                self.path = "/" + html_name + ("?" + query if query else "")

        return super().do_GET()


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CleanURLHandler) as httpd:
        print(f"Ma Baker and Chef — http://localhost:{PORT}/")
        print(f"Login: http://localhost:{PORT}/login")
        print(f"Vacantes: http://localhost:{PORT}/cargar-puestos")
        httpd.serve_forever()
