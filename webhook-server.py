#!/usr/bin/env python3

import http.server
import socketserver
import json
import subprocess
import os
from datetime import datetime

PORT = 9000
LOG_FILE = "/var/log/datingapp-webhook.log"

def log_message(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {msg}"
    print(log_entry)
    with open(LOG_FILE, "a") as f:
        f.write(log_entry + "\n")

def deploy():
    log_message("Deployment triggered!")
    
    try:
        os.chdir("/var/www/datingapp")
        
        # Pull latest code
        subprocess.run(["git", "pull", "origin", "main"], check=True, capture_output=True)
        log_message("✓ Git pull complete")
        
        # Install dependencies
        subprocess.run(["npm", "install"], check=True, capture_output=True)
        log_message("✓ Dependencies installed")
        
        # Build
        subprocess.run(["npm", "run", "build"], check=True, capture_output=True)
        log_message("✓ Build complete")
        
        # Restart PM2
        subprocess.run(["pm2", "restart", "datingapp"], check=True, capture_output=True)
        log_message("✓ App restarted")
        
        log_message("✓ Deployment successful!")
        return True
        
    except subprocess.CalledProcessError as e:
        log_message(f"✗ Deployment failed: {e}")
        return False

class DeployHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/deploy':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            try:
                # Trigger deployment
                if deploy():
                    self.send_response(200)
                    self.send_header('Content-type', 'text/plain')
                    self.end_headers()
                    self.wfile.write(b'Deployment successful\n')
                else:
                    self.send_response(500)
                    self.send_header('Content-type', 'text/plain')
                    self.end_headers()
                    self.wfile.write(b'Deployment failed\n')
            except Exception as e:
                log_message(f"Handler error: {e}")
                self.send_response(500)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'Server error\n')
        else:
            self.send_response(404)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'Not found\n')
    
    def log_message(self, format, *args):
        log_message(f"{self.client_address[0]} - {format % args}")

if __name__ == '__main__':
    handler = DeployHandler
    log_message(f"Starting webhook server on port {PORT}")
    
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            log_message("Webhook server stopped")
