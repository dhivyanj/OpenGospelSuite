import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');

// Native HTTP Server serving static files from ./dist with SPA fallback to index.html
const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  
  // If the path doesn't contain a file extension (e.g. static assets), serve index.html
  const ext = path.extname(urlPath);
  let filePath = ext ? urlPath : '/index.html';
  
  let absolutePath = path.join(distPath, filePath);
  
  // Check if file exists, if not fall back to index.html
  fs.access(absolutePath, fs.constants.F_OK, (err) => {
    if (err) {
      absolutePath = path.join(distPath, 'index.html');
    }
    
    fs.readFile(absolutePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }
      
      let contentType = 'text/plain';
      const actualExt = path.extname(absolutePath);
      switch (actualExt) {
        case '.html': contentType = 'text/html; charset=utf-8'; break;
        case '.js': contentType = 'application/javascript; charset=utf-8'; break;
        case '.css': contentType = 'text/css; charset=utf-8'; break;
        case '.json': contentType = 'application/json'; break;
        case '.wasm': contentType = 'application/wasm'; break;
        case '.png': contentType = 'image/png'; break;
        case '.jpg': case '.jpeg': contentType = 'image/jpeg'; break;
        case '.ico': contentType = 'image/x-icon'; break;
        case '.svg': contentType = 'image/svg+xml'; break;
      }
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

const wss = new WebSocketServer({ server });

// Presentation state cache
let currentPresentationState = {
  title: 'Welcome to OpenGospelSuite',
  subtitle: 'Ready to Present',
  slides: [
    'OpenGospelSuite\nPortable Church Presentation Software',
    'Select a song or scripture from the menu,\nor import files in the Zefania XML or OpenLyrics formats.'
  ],
  activeSlide: 0,
  theme: {
    name: 'Blue Midnight',
    bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)',
    textColor: '#ffffff',
    fontFamily: "'Outfit', 'Inter', sans-serif",
    alignment: 'center',
    verticalAlignment: 'center',
    transition: 'fade',
    fontSizeMax: 8
  },
  blackout: false,
  clearText: false,
  alertText: ''
};

let operatorSocket = null;
const remoteSockets = new Set();

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        case 'register_operator':
          operatorSocket = ws;
          break;

        case 'sync_state':
          currentPresentationState = data.state;
          broadcastToRemotes({
            type: 'sync_state',
            state: currentPresentationState
          });
          break;

        case 'get_state':
          ws.send(JSON.stringify({
            type: 'sync_state',
            state: currentPresentationState
          }));
          if (operatorSocket && operatorSocket.readyState === WebSocket.OPEN) {
            operatorSocket.send(JSON.stringify({ type: 'get_state' }));
          }
          break;

        case 'action':
          if (operatorSocket && operatorSocket.readyState === WebSocket.OPEN) {
            operatorSocket.send(JSON.stringify(data));
          }
          break;
      }
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e);
    }
  });

  ws.on('close', () => {
    if (ws === operatorSocket) {
      operatorSocket = null;
    } else {
      remoteSockets.delete(ws);
    }
  });

  remoteSockets.add(ws);
});

function broadcastToRemotes(data) {
  const messageStr = JSON.stringify(data);
  for (const client of remoteSockets) {
    if (client !== operatorSocket && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  }
}

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

server.listen(PORT, () => {
  console.log('\n=============================================================');
  console.log(`OpenGospelSuite local host started on port ${PORT}`);
  console.log(`Open in Browser: http://localhost:${PORT}`);
  console.log('=============================================================');
  console.log('Mobile Remote Control Connection Details:');
  
  const ips = getLocalIPs();
  if (ips.length === 0) {
    console.log('No local Wi-Fi/Network IP addresses detected.');
  } else {
    ips.forEach(ip => {
      console.log(`Link: http://${ip}:${PORT}/#/remote`);
    });
  }
  console.log('Make sure your mobile device is on the same Wi-Fi network.');
  console.log('=============================================================\n');
});
