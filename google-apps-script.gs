/*
  Anansi Tiffin — Google Sheets backend (Google Apps Script)
  ----------------------------------------------------------
  Turns a Google Sheet into the database for the static site on GitHub Pages.
  Setup in DEPLOY.md. Short version:
    1. Google Sheet -> Extensions -> Apps Script.
    2. Delete sample code, paste THIS file, Save.
    3. Set ADMIN_PIN below if you want.
    4. Deploy -> New deployment -> Web app (Execute as: Me, Who has access: Anyone).
    5. Copy the Web app URL into index.html (const API_URL = '...').

  Menu + the day's date are stored in Script Properties (reliable text),
  NOT in a sheet cell (Google auto-converts date cells and breaks the daily check).
  Orders are stored as rows in the "Orders" tab.
*/

const ADMIN_PIN = '2580';   // <-- change to your secret PIN

/* ---------- helpers ---------- */
function props(){ return PropertiesService.getScriptProperties(); }

function ordersSheet(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Orders');
  if(!sh){ sh = ss.insertSheet('Orders'); sh.appendRow(['id','tiffin','data']); }
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

function getMenuVal(){ const m = props().getProperty('menu'); return m ? JSON.parse(m) : null; }
function setMenuVal(menu){ props().setProperty('menu', menu ? JSON.stringify(menu) : ''); }

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
  const t = today();
  if(props().getProperty('date') !== t){
    props().setProperty('date', t);
    setMenuVal(null);
    clearOrders();
  }
}

/* ---------- read endpoints ---------- */
function doGet(e){
  ensureToday();
  const action = e.parameter.action;
  if(action === 'getMenu')   return jsonOut(getMenuVal());
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
