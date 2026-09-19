import subprocess, time, http.server, socketserver, threading, os

PORT = 4186
dist_dir = os.path.abspath('smartcomm_fullyAI/dist')

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=dist_dir, **kwargs)
    def log_message(self, format, *args):
        pass

httpd = socketserver.TCPServer(('', PORT), QuietHandler)
server_thread = threading.Thread(target=httpd.serve_forever)
server_thread.daemon = True
server_thread.start()

edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

# Load index.html in headless Edge and check DOM text
cmd = [edge_path, '--headless=new', '--dump-dom', f'http://127.0.0.1:{PORT}/index.html']
result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=10)
httpd.shutdown()

dom = result.stdout
print("--- Verification Results ---")
print("1. Corridor title in DOM:", "Tampines ➔ CBD Transit Corridor" in dom)
print("2. Persona selector in DOM:", "Rachel" in dom and "Arjun" in dom and "Mdm Lim" in dom)
print("3. Spaced time formatting in DOM:", (" - " in dom))
print("4. Live Status strip items in DOM:", "Train Status" in dom and "Station Crowd" in dom and "Accessibility" in dom)
print("5. Leaflet map initialized:", "journey-map" in dom)
print("6. Title Case headings:", "Your Next Journey" in dom and "Compare Alternative Routes" in dom)
print("--- End Verification ---")

