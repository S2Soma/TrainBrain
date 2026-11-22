"""Chạy ứng dụng dạng cửa sổ desktop: phục vụ thư mục www/ trên 127.0.0.1 rồi mở webview."""
import functools
import http.server
import os
import socketserver
import threading

import webview

PORT = 8998
WEB_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "www")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def start_server():
    handler = functools.partial(QuietHandler, directory=WEB_ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), handler) as httpd:
        httpd.serve_forever()


if __name__ == "__main__":
    threading.Thread(target=start_server, daemon=True).start()
    webview.create_window(
        title="Tính Nhanh Luyện Não",
        url=f"http://127.0.0.1:{PORT}",
        width=480,
        height=850,
        min_size=(360, 600),
    )
    webview.start()
