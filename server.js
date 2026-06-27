/* Anansi Tiffin — zero-dependency Node server.
   Serves index.html and a tiny JSON API. All orders/menu are stored
   server-side in data.json so every device on the network shares them. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');
const ADMIN_PIN = process.env.ADMIN_PIN || '2580';   // change via:  ADMIN_PIN=1234 node server.js

/* ---------- data store ---------- */
function today(){ return new Date().toLocaleDateString('en-CA'); }   // YYYY-MM-DD, local time
function loadData(){
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return { date: today(), menu: null, orders: [] }; }
}
function saveData(d){ fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
let data = loadData();

/* New day? Wipe yesterday's menu + orders automatically. */
function ensureToday(){
  const t = today();
  if (data.date !== t){
    data = { date: t, menu: null, orders: [] };
    saveData(data);
  }
}
ensureToday();

/* ---------- helpers ---------- */
function sendJSON(res, code, obj){
  res.writeHead(code, {'Content-Type':'application/json','Cache-Control':'no-store'});
  res.end(JSON.stringify(obj));
}
function readBody(req){
  return new Promise((resolve)=>{
    let b=''; req.on('data',c=>b+=c); req.on('end',()=>{ try{resolve(JSON.parse(b||'{}'))}catch{resolve({})} });
  });
}
function checkPin(url){ return url.searchParams.get('pin') === ADMIN_PIN; }
const MIME = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.ico':'image/x-icon'};

/* ---------- server ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  // ---- API ----
  if (p.startsWith('/api/')) {
    ensureToday();   // roll over to a clean day if the date changed
    // ADMIN
    if (p === '/api/verify-pin') return sendJSON(res, 200, {ok: checkPin(url)});
    // MENU
    if (p === '/api/menu' && req.method === 'GET')  return sendJSON(res, 200, data.menu);
    if (p === '/api/menu' && req.method === 'POST') {
      const body = await readBody(req);
      data.menu = body; saveData(data); return sendJSON(res, 200, {ok:true, menu:data.menu});
    }
    // ORDERS
    if (p === '/api/orders' && req.method === 'GET')  return sendJSON(res, 200, data.orders);
    if (p === '/api/orders' && req.method === 'POST') {
      const body = await readBody(req);
      const order = { id: Date.now() + Math.floor(Math.random()*1000), text: String(body.text||''), data: body.data || null };
      data.orders.push(order); saveData(data); return sendJSON(res, 200, order);
    }
    if (p === '/api/orders' && req.method === 'DELETE') { // clear all (admin)
      if (!checkPin(url)) return sendJSON(res, 403, {error:'bad pin'});
      data.orders = []; saveData(data); return sendJSON(res, 200, {ok:true});
    }
    const m = p.match(/^\/api\/orders\/(\d+)$/);
    if (m && req.method === 'PUT') {        // edit / update an order (any user)
      const id = Number(m[1]);
      const body = await readBody(req);
      const o = data.orders.find(x => x.id === id);
      if (!o) return sendJSON(res, 404, {error:'not found'});
      o.text = String(body.text || o.text);
      if (body.data !== undefined) o.data = body.data;
      saveData(data); return sendJSON(res, 200, o);
    }
    if (m && req.method === 'DELETE') {      // delete (admin only)
      if (!checkPin(url)) return sendJSON(res, 403, {error:'bad pin'});
      const id = Number(m[1]);
      data.orders = data.orders.filter(o => o.id !== id);
      saveData(data); return sendJSON(res, 200, {ok:true});
    }
    return sendJSON(res, 404, {error:'not found'});
  }

  // ---- static files ----
  let file = p === '/' ? '/index.html' : p;
  const full = path.join(ROOT, path.normalize(file).replace(/^(\.\.[\/\\])+/, ''));
  if (!full.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(full, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, {'Content-Type': MIME[path.extname(full)] || 'application/octet-stream'});
    res.end(buf);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets))
    for (const n of nets[name])
      if (n.family === 'IPv4' && !n.internal) ips.push(n.address);

  console.log('\n  🍱  Anansi Tiffin server is running!\n');
  console.log('  On THIS computer:   http://localhost:' + PORT);
  ips.forEach(ip => console.log('  On the network:     http://' + ip + ':' + PORT));
  console.log('\n  Share a "On the network" link with office users on the same WiFi/LAN.');
  console.log('  Press Ctrl+C to stop.\n');
});
