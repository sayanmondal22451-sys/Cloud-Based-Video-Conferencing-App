const express = require('express'), http = require('http'), crypto = require('crypto');
const { WebSocketServer } = require('ws');
const app = express();
app.use(express.static('public'));
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const rooms = new Map();
const MAX = 8;
const out = (ws, o) => ws.readyState === 1 && ws.send(JSON.stringify(o));

wss.on('connection', ws => {
  ws.id = crypto.randomUUID().slice(0, 8);
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.type === 'join' && !ws.room) {
      const room = String(m.room || '').slice(0, 40);
      const r = rooms.get(room) || new Map();
      if (r.size >= MAX) return out(ws, { type: 'full' });
      ws.room = room; ws.name = String(m.name || 'Guest').slice(0, 30);
      rooms.set(room, r);
      out(ws, { type: 'peers', id: ws.id, peers: [...r.values()].map(p => ({ id: p.id, name: p.name })) });
      r.set(ws.id, ws);
    } else if (ws.room) {
      const r = rooms.get(ws.room);
      if (m.type === 'chat') r.forEach(p => p !== ws && out(p, { type: 'chat', name: ws.name, text: String(m.text).slice(0, 500) }));
      if (m.type === 'signal') { const t = r.get(m.to); t && out(t, { type: 'signal', from: ws.id, name: ws.name, data: m.data }); }
    }
  });
  ws.on('close', () => {
    const r = rooms.get(ws.room); if (!r) return;
    r.delete(ws.id);
    r.forEach(p => out(p, { type: 'left', id: ws.id }));
    if (!r.size) rooms.delete(ws.room);
  });
});
server.listen(process.env.PORT || 3000, () => console.log('Meet server running'));
