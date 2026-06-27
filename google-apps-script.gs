/*
  Anansi Tiffin — Google Sheets backend (Google Apps Script)
  ----------------------------------------------------------
  This turns a Google Sheet into the database for the static site on GitHub Pages.
  Setup steps are in DEPLOY.md. In short:
    1. Create a Google Sheet.
    2. Extensions -> Apps Script. Delete the default code, paste THIS file.
    3. Set ADMIN_PIN below if you want.
    4. Deploy -> New deployment -> Web app
         Execute as: Me
         Who has access: Anyone
    5. Copy the Web app URL and paste it into index.html (const API_URL = '...').
*/

const ADMIN_PIN = '2580';   // <-- change to your secret PIN

/* ---------- helpers ---------- */
function getSS(){ return SpreadsheetApp.getActiveSpreadsheet(); }

function sheetOf(name, headers){
  const ss = getSS();
  let sh = ss.getSheetByName(name);
  if(!sh){ sh = ss.insertSheet(name); if(headers) sh.appendRow(headers); }
  return sh;
}

function today(){
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function jsonOut(obj){
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getConfig(){
  const sh = sheetOf('Config');
  const date = String(sh.getRange('A1').getValue() || '');
  const menuStr = String(sh.getRange('A2').getValue() || '');
  return { date, menu: menuStr ? JSON.parse(menuStr) : null };
}
function setMenuVal(menu){ sheetOf('Config').getRange('A2').setValue(menu ? JSON.stringify(menu) : ''); }
function setDateVal(d){ sheetOf('Config').getRange('A1').setValue(d); }

function ordersSheet(){ return sheetOf('Orders', ['id','tiffin','data']); }

function getOrders(){
  const sh = ordersSheet();
  const last = sh.getLastRow();
  if(last < 2) return [];
  return sh.getRange(2,1,last-1,3).getValues().map(function(r){
    return { id: Number(r[0]), text: String(r[1]), data: r[2] ? JSON.parse(r[2]) : null };
  });
}

function clearOrders(){
  const sh = ordersSheet();
  const last = sh.getLastRow();
  if(last > 1) sh.deleteRows(2, last - 1);
}

/* New day? wipe yesterday's menu + orders automatically. */
function ensureToday(){
  const cfg = getConfig();
  const t = today();
  if(cfg.date !== t){
    setDateVal(t);
    setMenuVal(null);
    clearOrders();
  }
}

/* ---------- read endpoints ---------- */
function doGet(e){
  ensureToday();
  const action = e.parameter.action;
  if(action === 'getMenu')   return jsonOut(getConfig().menu);
  if(action === 'getOrders') return jsonOut(getOrders());
  if(action === 'verifyPin') return jsonOut({ ok: e.parameter.pin === ADMIN_PIN });
  return jsonOut({ error: 'unknown action' });
}

/* ---------- write endpoints ---------- */
function doPost(e){
  ensureToday();
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch(err){}
  const action = body.action;

  if(action === 'setMenu'){
    setMenuVal(body.menu || null);
    return jsonOut({ ok: true, menu: body.menu || null });
  }

  if(action === 'addOrder'){
    const id = Date.now() + Math.floor(Math.random() * 1000);
    ordersSheet().appendRow([id, String(body.text || ''), body.data ? JSON.stringify(body.data) : '']);
    return jsonOut({ id: id, text: String(body.text || ''), data: body.data || null });
  }

  if(action === 'updateOrder'){
    const sh = ordersSheet();
    const last = sh.getLastRow();
    const ids = last > 1 ? sh.getRange(2,1,last-1,1).getValues() : [];
    for(let i = 0; i < ids.length; i++){
      if(Number(ids[i][0]) === Number(body.id)){
        const row = i + 2;
        sh.getRange(row, 2).setValue(String(body.text || ''));
        sh.getRange(row, 3).setValue(body.data ? JSON.stringify(body.data) : '');
        return jsonOut({ id: Number(body.id), text: String(body.text || ''), data: body.data || null });
      }
    }
    return jsonOut({ error: 'not found' });
  }

  if(action === 'deleteOrder'){
    if(body.pin !== ADMIN_PIN) return jsonOut({ error: 'bad pin' });
    const sh = ordersSheet();
    const last = sh.getLastRow();
    const ids = last > 1 ? sh.getRange(2,1,last-1,1).getValues() : [];
    for(let i = 0; i < ids.length; i++){
      if(Number(ids[i][0]) === Number(body.id)){ sh.deleteRow(i + 2); break; }
    }
    return jsonOut({ ok: true });
  }

  if(action === 'clearOrders'){
    if(body.pin !== ADMIN_PIN) return jsonOut({ error: 'bad pin' });
    clearOrders();
    return jsonOut({ ok: true });
  }

  return jsonOut({ error: 'unknown action' });
}
