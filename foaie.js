/* Foaie de parcurs digitală (Tageskontrollblatt, § 1 Abs. 6 FPersV) — modul pentru Portal Angajați.
   Se încarcă din portal.html; folosește `functionsRef` și `auth` ale portalului. UI: română + germană; PDF: germană. */
(function(){
'use strict';
const TYPES = {
  drive:{ro:'Condus',de:'Lenken',ic:'🚚',col:'#1E3A5F'},
  work:{ro:'Altă muncă',de:'Arbeit',ic:'🔧',col:'#D98E04'},
  avail:{ro:'Disponibilitate',de:'Bereitschaft',ic:'⏳',col:'#8E6BBF'},
  rest:{ro:'Odihnă',de:'Ruhe',ic:'🛏',col:'#2F855A'}
};
const S = { lang:'ro', ready:false, veh:[], sheets:{}, view:'home', edit:null, detail:null, month:null,
  tmonth:null, team:null, tdriver:null, isCoord:false, busy:false, from:'', to:'' };
try{ S.lang = localStorage.getItem('fp_lang')==='de' ? 'de' : 'ro'; }catch(e){}
const L = (ro,de)=> S.lang==='de' ? de : ro;
const $ = id=>document.getElementById(id);
const esc = s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const call = (n,d)=>functionsRef.httpsCallable(n)(d||{}).then(r=>r.data);
const pad = n=>String(n).padStart(2,'0');
const hm = m=>{ m=Math.max(0,Math.round(m)); return Math.floor(m/60)+':'+pad(m%60); };
const tm = s=> s==='24:00'?1440:Number(s.slice(0,2))*60+Number(s.slice(3));
const fmtD = d=>d.slice(8)+'.'+d.slice(5,7)+'.'+d.slice(0,4);
const WD_RO=['Dum','Lun','Mar','Mie','Joi','Vin','Sâm'], WD_DE=['So','Mo','Di','Mi','Do','Fr','Sa'];
const wd = d=> (S.lang==='de'?WD_DE:WD_RO)[new Date(d+'T12:00:00Z').getUTCDay()];
const MON_RO=['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'];
const MON_DE=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const monName = ym=> (S.lang==='de'?MON_DE:MON_RO)[Number(ym.slice(5))-1]+' '+ym.slice(0,4);
function berlin(){
  const p = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date());
  const g=t=>p.find(x=>x.type===t).value;
  return { date:g('year')+'-'+g('month')+'-'+g('day'), min:(Number(g('hour'))%24)*60+Number(g('minute')) };
}
const today = ()=>berlin().date, nowMin = ()=>berlin().min;
const nowHM = ()=>{ const m=nowMin(); return pad(Math.floor(m/60))+':'+pad(m%60); };
const addDays=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*864e5).toISOString().slice(0,10);
const ymOf = d=>d.slice(0,7);
const ymAdd=(ym,n)=>{ let y=Number(ym.slice(0,4)), m=Number(ym.slice(5))-1+n; y+=Math.floor(m/12); m=((m%12)+12)%12; return y+'-'+pad(m+1); };
const ymEnd=ym=>addDays(ymAdd(ym,1)+'-01',-1);
const firstName = n=>{ const p=(n||'').trim().split(/\s+/); return p[0]||''; };

/* ---------- calcule ---------- */
function calc(s, date){
  const isT = date===today(), now = isT?nowMin():1440;
  let d=0,w=0,a=0,first=null,last=null;
  (s.entries||[]).forEach(e=>{
    const f=tm(e.from), t=e.to===null?now:tm(e.to), dur=Math.max(0,t-f);
    if(e.t==='drive')d+=dur; else if(e.t==='work')w+=dur; else if(e.t==='avail')a+=dur;
    if(e.t!=='rest'){ if(first===null||f<first)first=f; if(last===null||t>last)last=t; }
  });
  const rest = s.rest ? 1440 : Math.max(0,(isT?now:1440)-d-w-a);
  const km = (s.kmStart!=null&&s.kmEnd!=null)? s.kmEnd-s.kmStart : null;
  return { drive:d, work:w, avail:a, rest, wa:w+a, first, last, km };
}
function curEntry(s){ return (s.entries||[]).find(e=>e.to===null)||null; }
function barHtml(s, date){
  const isT=date===today(), now=isT?nowMin():1440;
  let h='<div class="fp-bar">';
  if(s.rest) h+='<i style="left:0;width:100%;background:'+TYPES.rest.col+'"></i>';
  (s.entries||[]).forEach(e=>{
    const f=tm(e.from), t=e.to===null?now:tm(e.to);
    if(t>f) h+='<i title="'+esc(TYPES[e.t][S.lang])+'" style="left:'+(f/14.4)+'%;width:'+((t-f)/14.4)+'%;background:'+TYPES[e.t].col+'"></i>';
  });
  h+='</div><div class="fp-ticks"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>';
  return h;
}
function nextNr(){ return 0; }
const monthSheets = ym=>Object.values(S.sheets).filter(s=>s.date.startsWith(ym)).sort((a,b)=>a.date<b.date?1:-1);
function lastKm(){
  const l=Object.values(S.sheets).sort((a,b)=>a.date<b.date?1:-1).find(s=>s.kmEnd!=null||s.kmStart!=null);
  return l ? (l.kmEnd!=null?l.kmEnd:l.kmStart) : '';
}

/* ---------- stil ---------- */
const css = `
.fpw .fp-nav{display:flex;gap:6px;overflow-x:auto;padding:2px 0 10px;margin:0 -2px}
.fpw .fp-nav button{flex:0 0 auto;border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:999px;padding:7px 13px;font:600 13px inherit;cursor:pointer;white-space:nowrap}
.fpw .fp-nav button.on{background:var(--primary);color:#fff;border-color:var(--primary)}
.fpw .fp-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}
.fpw .fp-lang{display:flex;border:1px solid var(--border);border-radius:8px;overflow:hidden}
.fpw .fp-lang button{border:0;background:var(--surface);padding:5px 10px;font:700 12px inherit;cursor:pointer;color:var(--text-muted)}
.fpw .fp-lang button.on{background:var(--primary);color:#fff}
.fpw .fp-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:12px;box-shadow:var(--shadow)}
.fpw .fp-card h4{margin:0 0 8px;font-size:14px}
.fpw .fp-h1{font-size:20px;font-weight:800;margin:4px 0 2px}
.fpw .fp-mut{color:var(--text-muted);font-size:12.5px}
.fpw .fp-veh{display:flex;align-items:center;gap:10px;background:var(--primary-soft);border-radius:12px;padding:10px 12px;margin:10px 0 14px}
.fpw .fp-veh b{font-size:17px;letter-spacing:.5px}
.fpw .fp-grid4{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fpw .fp-act{border:1px solid var(--border);background:var(--surface);border-radius:14px;padding:16px 8px;text-align:center;font:700 14px inherit;cursor:pointer;color:var(--text)}
.fpw .fp-act span{display:block;font-size:26px;margin-bottom:4px}
.fpw .fp-act:active{transform:scale(.98)}
.fpw .fp-btn{border:0;background:var(--primary);color:#fff;border-radius:11px;padding:12px 16px;font:700 14px inherit;cursor:pointer}
.fpw .fp-btn.sec{background:var(--surface-alt);color:var(--text)}
.fpw .fp-btn.red{background:var(--red)}
.fpw .fp-btn.grn{background:var(--green)}
.fpw .fp-btn.sm{padding:7px 11px;font-size:12.5px;border-radius:9px}
.fpw .fp-btn:disabled{opacity:.5}
.fpw .fp-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.fpw .fp-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.fpw .fp-stat{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px 6px;text-align:center}
.fpw .fp-stat b{display:block;font-size:20px}
.fpw .fp-stat span{font-size:11px;color:var(--text-muted)}
.fpw label.fp-f{display:block;font-size:12px;font-weight:700;color:var(--text-muted);margin:10px 0 4px}
.fpw input,.fpw select,.fpw textarea{width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:10px;padding:10px;font:15px inherit;background:#fff;color:var(--text)}
.fpw .fp-bar{position:relative;height:22px;background:#E8F3EC;border-radius:6px;overflow:hidden;border:1px solid var(--border)}
.fpw .fp-bar i{position:absolute;top:0;bottom:0}
.fpw .fp-ticks{display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-top:2px}
.fpw .fp-leg{display:flex;gap:10px;flex-wrap:wrap;font-size:11.5px;margin-top:6px}
.fpw .fp-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px}
.fpw .fp-li{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:11px 0;border-bottom:1px solid var(--border);cursor:pointer}
.fpw .fp-li:last-child{border-bottom:0}
.fpw .fp-chip{font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;white-space:nowrap}
.fpw .fp-chip.ok{background:var(--green-soft);color:var(--green)}
.fpw .fp-chip.no{background:var(--amber-soft);color:var(--amber)}
.fpw .fp-chip.run{background:var(--primary-soft);color:var(--primary)}
.fpw .fp-tot{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}
.fpw .fp-tot div{background:var(--surface-alt);border-radius:10px;padding:8px 10px;font-size:12px;color:var(--text-muted)}
.fpw .fp-tot b{display:block;font-size:17px;color:var(--text)}
.fpw .fp-er{display:grid;grid-template-columns:1.8fr 1fr 1fr 34px;gap:6px;margin-bottom:6px;align-items:center}
.fpw .fp-er input.nt{grid-column:1/4}
.fpw .fp-x{border:0;background:var(--red-soft);color:var(--red);border-radius:9px;height:38px;font-size:16px;cursor:pointer}
.fpw canvas.fp-sig{width:100%;height:170px;border:2px dashed var(--border);border-radius:12px;background:#fff;touch-action:none}
.fpw .fp-warn{background:var(--amber-soft);color:#7a5200;border-radius:10px;padding:9px 11px;font-size:12.5px;margin:8px 0}
.fpw .fp-err{color:var(--red);font-size:13px;margin-top:8px;min-height:16px}
.fpw table.fp-t{width:100%;border-collapse:collapse;font-size:12.5px}
.fpw table.fp-t td,.fpw table.fp-t th{padding:6px 4px;border-bottom:1px solid var(--border);text-align:left}
#fpInsp{position:fixed;inset:0;background:#fff;z-index:9999;overflow:auto;padding:16px}
`;
const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

/* ---------- date ---------- */
async function loadSheets(){
  const r = await call('fpMyList',{});
  S.sheets = {}; (r.lista||[]).forEach(s=>{ S.sheets[s.date]=s; });
}
async function boot(flags){
  S.isCoord = !!(flags && flags.isCoordonator);
  try{
    const v = await call('getMyVehicle',{});
    S.veh = (v.masini||[]).map(x=>x.nr).filter(Boolean);
  }catch(e){ console.warn('fp veh',e); }
  const show = S.veh.length>0 || S.isCoord;
  ['tabBtnFoaie','tabBtnFoaieSidebar'].forEach(id=>{ const b=$(id); if(b) b.style.display = show?'flex':'none'; });
  S.ready = true;
}
async function open(){
  if(!S.ready) await boot(typeof roleFlags!=='undefined'?roleFlags:{});
  S.month = S.month || ymOf(today());
  S.tmonth = S.tmonth || ymOf(today());
  render();
  try{ await loadSheets(); }catch(e){ console.warn(e); $('fpRoot').insertAdjacentHTML('afterbegin','<div class="fp-warn">'+L('Nu am putut încărca foile. Reîncearcă.','Blätter konnten nicht geladen werden. Bitte erneut versuchen.')+'</div>'); return; }
  render();
}

/* ---------- navigare ---------- */
function go(v, x){ S.view=v; if(x!==undefined) S.detail=x; render(); const c=$('phContent'); if(c) c.scrollTop=0; }
function navHtml(){
  const items=[['home','🏠',L('Acasă','Start')],['today','📍',L('Astăzi','Heute')],['archive','🗂',L('Arhivă','Archiv')],['export','📤','Export'],['check','🛂',L('Control','Kontrolle')]];
  if(S.isCoord) items.push(['team','👥',L('Șoferi','Fahrer')]);
  const cur = S.view==='detail'||S.view==='edit'||S.view==='sign' ? 'archive' : (S.view==='teamDriver'||S.view==='teamDetail'?'team':(S.view==='start'?'home':S.view));
  return '<div class="fp-nav">'+items.map(i=>'<button class="'+(cur===i[0]?'on':'')+'" onclick="fp.go(\''+i[0]+'\')">'+i[1]+' '+i[2]+'</button>').join('')+'</div>';
}
function topHtml(){
  return '<div class="fp-top"><div class="fp-mut">'+L('Foaie de parcurs digitală','Digitales Tageskontrollblatt')+'</div>'
   +'<div class="fp-lang"><button class="'+(S.lang==='ro'?'on':'')+'" onclick="fp.lang(\'ro\')">RO</button><button class="'+(S.lang==='de'?'on':'')+'" onclick="fp.lang(\'de\')">DE</button></div></div>';
}
function lang(l){ S.lang=l; try{localStorage.setItem('fp_lang',l);}catch(e){} render(); }
function render(){
  const root=$('fpRoot'); if(!root) return;
  const fn = {home:vHome,start:vStart,today:vToday,archive:vArchive,edit:vEdit,detail:vDetail,sign:vSign,export:vExport,check:vCheck,team:vTeam,teamDriver:vTeamDriver,teamDetail:vTeamDetail}[S.view]||vHome;
  root.innerHTML = topHtml()+navHtml()+fn();
  if(S.view==='sign') sigInit();
}
const legend = ()=>'<div class="fp-leg">'+Object.keys(TYPES).map(k=>'<span><i style="background:'+TYPES[k].col+'"></i>'+TYPES[k][S.lang]+'</span>').join('')+'</div>';
function vehSelect(id, cur){
  const opts = S.veh.slice(); if(cur && !opts.includes(cur)) opts.push(cur);
  return '<select id="'+id+'" onchange="fp.vehOther(this)">'+opts.map(v=>'<option '+(v===cur?'selected':'')+'>'+esc(v)+'</option>').join('')+'<option value="__other">'+L('Altă mașină…','Anderes Fahrzeug…')+'</option></select>';
}
function vehOther(sel){
  if(sel.value!=='__other') return;
  const v=(prompt(L('Număr de înmatriculare:','Amtliches Kennzeichen:'))||'').trim().toUpperCase();
  if(v){ const o=document.createElement('option'); o.textContent=v; sel.insertBefore(o,sel.lastChild); sel.value=v; } else sel.value=sel.options[0].value;
}

/* ---------- HOME ---------- */
function vHome(){
  const t=today(), cur=S.sheets[t], name=firstName((document.getElementById('welcomeName')||{}).textContent);
  const ms=monthSheets(ymOf(t)); const km=ms.reduce((a,s)=>a+(calc(s,s.date).km||0),0);
  const unsigned=Object.values(S.sheets).filter(s=>!s.signedAt && (s.date<t || (s.date===t && s.closed))).length;
  let h='<div class="fp-h1">'+L('Salut','Hallo')+', '+esc(name)+'</div><div class="fp-mut">'+wd(t)+' '+fmtD(t)+'</div>';
  h+='<div class="fp-veh"><span style="font-size:22px">🚛</span><div><div class="fp-mut">'+L('Vehiculul tău','Dein Fahrzeug')+'</div><b>'+esc(S.veh.join(' · ')||'—')+'</b></div></div>';
  if(cur && !cur.closed && !cur.rest){
    h+=vNow(cur);
  } else if(cur && cur.rest){
    h+='<div class="fp-card"><h4>🛏 '+L('Zi liberă azi','Heute ruhefrei')+'</h4>'+(cur.signedAt?'<span class="fp-chip ok">'+L('Semnat','Unterschrieben')+'</span>':'<button class="fp-btn" onclick="fp.openSign(\''+t+'\')">✍ '+L('Semnează','Unterschreiben')+'</button>')+'</div>';
  } else if(cur && cur.closed){
    h+='<div class="fp-card"><h4>✅ '+L('Ziua de azi este încheiată','Der heutige Tag ist beendet')+'</h4><div class="fp-row"><button class="fp-btn sm" onclick="fp.openDetail(\''+t+'\')">'+L('Deschide foaia','Blatt öffnen')+'</button></div></div>';
  } else {
    h+='<div class="fp-card"><h4>'+L('Cu ce începi?','Womit beginnst du?')+'</h4><div class="fp-grid4">'
      +Object.keys(TYPES).map(k=>'<button class="fp-act" onclick="fp.startDay(\''+k+'\')"><span>'+TYPES[k].ic+'</span>'+TYPES[k][S.lang]+'</button>').join('')
      +'</div><div class="fp-row" style="margin-top:12px"><button class="fp-btn sec sm" onclick="fp.restDay()">🛏 '+L('Zi liberă azi','Heute ruhefrei')+'</button></div></div>';
  }
  h+='<div class="fp-row" style="margin:6px 0 12px"><button class="fp-btn sec sm" onclick="fp.pastDay()">＋ '+L('Adaugă o zi trecută','Vergangenen Tag nachtragen')+'</button></div>';
  h+='<div class="fp-stats"><div class="fp-stat"><b>'+ms.length+'</b><span>'+L('foi luna asta','Blätter diesen Monat')+'</span></div><div class="fp-stat"><b>'+km+'</b><span>'+L('km luna asta','km diesen Monat')+'</span></div><div class="fp-stat"><b style="color:'+(unsigned?'var(--amber)':'var(--green)')+'">'+unsigned+'</b><span>'+L('nesemnate','offen / unsigniert')+'</span></div></div>';
  return h;
}
function vNow(cur){
  const e=curEntry(cur), c=calc(cur,cur.date);
  let h='<div class="fp-card"><h4>'+L('În desfășurare','Läuft gerade')+' · '+esc(cur.plate)+'</h4>';
  if(e) h+='<div style="font-size:22px;font-weight:800">'+TYPES[e.t].ic+' '+TYPES[e.t][S.lang]+'</div><div class="fp-mut">'+L('din','seit')+' '+e.from+' · '+hm(nowMin()-tm(e.from))+' h</div>';
  else h+='<div class="fp-mut">'+L('Nicio activitate în desfășurare.','Keine laufende Tätigkeit.')+'</div>';
  h+=barHtml(cur,cur.date)+'<div class="fp-mut" style="margin-top:8px">'+L('Condus','Lenken')+' '+hm(c.drive)+' · '+L('Muncă','Arbeit')+' '+hm(c.work)+' · '+L('Disp.','Bereitsch.')+' '+hm(c.avail)+'</div>';
  h+='<div class="fp-grid4" style="margin-top:12px">'+Object.keys(TYPES).filter(k=>!e||e.t!==k).map(k=>'<button class="fp-act" style="padding:10px 4px" onclick="fp.switchTo(\''+k+'\')"><span style="font-size:20px">'+TYPES[k].ic+'</span>→ '+TYPES[k][S.lang]+'</button>').join('')+'</div>';
  h+='<div class="fp-row" style="margin-top:12px"><button class="fp-btn red" onclick="fp.go(\'today\')">⏹ '+L('Încheie ziua','Tag beenden')+'</button></div></div>';
  return h;
}

/* ---------- START ---------- */
function vStart(){
  const k=S.detail&&S.detail.type||'drive', t=today();
  return '<div class="fp-card"><h4>'+TYPES[k].ic+' '+L('Începe ziua','Tag beginnen')+' — '+TYPES[k][S.lang]+'</h4>'
   +'<label class="fp-f">'+L('Vehicul','Fahrzeug')+'</label>'+vehSelect('fpsVeh',S.veh[0])
   +'<label class="fp-f">'+L('Data și ora','Datum und Uhrzeit')+'</label><div class="fp-row"><input type="text" value="'+fmtD(t)+'" disabled style="flex:1"><input type="time" id="fpsTime" value="'+nowHM()+'" style="flex:1"></div>'
   +'<label class="fp-f">'+L('Locul începerii (Ort der Fahrtaufnahme)','Ort der Fahrtaufnahme')+'</label><input id="fpsLoc" placeholder="'+L('ex. Ruhstorf','z. B. Ruhstorf')+'" value="'+esc(lastLoc())+'">'
   +'<label class="fp-f">'+L('Kilometraj început','Kilometerstand Beginn')+'</label><input id="fpsKm" type="number" inputmode="numeric" value="'+lastKm()+'">'
   +'<div class="fp-err" id="fpErr"></div><div class="fp-row" style="margin-top:6px"><button class="fp-btn" id="fpsGo" onclick="fp.doStart(\''+k+'\')">▶ '+L('Pornește','Starten')+'</button><button class="fp-btn sec" onclick="fp.go(\'home\')">'+L('Anulează','Abbrechen')+'</button></div></div>';
}
function lastLoc(){ const l=Object.values(S.sheets).sort((a,b)=>a.date<b.date?1:-1).find(s=>s.endLoc||s.startLoc); return l?(l.endLoc||l.startLoc):''; }
function startDay(k){ go('start',{type:k}); }
async function doStart(k){
  const time=$('fpsTime').value, loc=$('fpsLoc').value.trim(), km=$('fpsKm').value, plate=$('fpsVeh').value;
  if(!time||!plate){ $('fpErr').textContent=L('Completează vehiculul și ora.','Fahrzeug und Uhrzeit ausfüllen.'); return; }
  const t=today();
  await save(t,{ plate, rest:false, entries:[{t:k,from:time,to:null,note:''}], startLoc:loc, endLoc:'', kmStart:km===''?null:Number(km), kmEnd:null, remark:'', closed:false }, ()=>go('home'), 'fpErr');
}
async function restDay(){
  if(!confirm(L('Marchezi ziua de azi ca zi liberă?','Heute als ruhefreien Tag erfassen?'))) return;
  await save(today(),{ plate:S.veh[0]||'', rest:true, entries:[], startLoc:'', endLoc:'', kmStart:null, kmEnd:null, remark:'', closed:true }, ()=>openSign(today()));
}
function pastDay(){
  const t=today(), min=addDays(t,-56);
  const d=prompt(L('Data zilei (AAAA-LL-ZZ), din ultimele 56 de zile:','Datum des Tages (JJJJ-MM-TT), letzte 56 Tage:'), addDays(t,-1));
  if(!d) return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||d>=t||d<min){ alert(L('Dată invalidă (maxim 56 zile în urmă, nu azi).','Ungültiges Datum (max. 56 Tage zurück, nicht heute).')); return; }
  if(S.sheets[d]){ editSheet(d); return; }
  S.edit={ date:d, isNew:true, sheet:{ plate:S.veh[0]||'', rest:false, entries:[{t:'drive',from:'06:00',to:'14:00',note:''}], startLoc:lastLoc(), endLoc:'', kmStart:null, kmEnd:null, remark:'', closed:true } };
  go('edit');
}

/* ---------- salvare ---------- */
async function save(date, sheet, ok, errId){
  if(S.busy) return; S.busy=true;
  try{
    const r = await call('fpSave',{date,sheet});
    await loadSheets();
    if(ok) ok(r);
  }catch(e){
    const m=(e&&e.message)||'Eroare'; const el=errId&&$(errId); if(el) el.textContent=m; else alert(m);
  }finally{ S.busy=false; }
}
async function switchTo(k){
  const t=today(), s=JSON.parse(JSON.stringify(S.sheets[t])), now=nowHM();
  const e=curEntry(s);
  if(e){ if(tm(now)<=tm(e.from)){ e.t=k; } else { e.to=now; s.entries.push({t:k,from:now,to:null,note:''}); } }
  else s.entries.push({t:k,from:now,to:null,note:''});
  await save(t,s,()=>render());
}

/* ---------- ASTĂZI ---------- */
function vToday(){
  const t=today(), s=S.sheets[t];
  if(!s) return '<div class="fp-card"><h4>'+L('Astăzi','Heute')+'</h4><div class="fp-mut">'+L('Nu ai început încă ziua.','Du hast den Tag noch nicht begonnen.')+'</div><div class="fp-row" style="margin-top:10px"><button class="fp-btn" onclick="fp.go(\'home\')">'+L('Începe ziua','Tag beginnen')+'</button></div></div>';
  let h='<div class="fp-card"><h4>'+wd(t)+' '+fmtD(t)+' · '+esc(s.plate)+' · Nr. '+String(s.nr).padStart(4,'0')+'</h4>'+barHtml(s,t)+legend();
  h+=totHtml(s,t)+entriesHtml(s,t);
  h+='<div class="fp-row" style="margin-top:10px"><button class="fp-btn sec sm" onclick="fp.editSheet(\''+t+'\')">✎ '+L('Editează timpii','Zeiten bearbeiten')+'</button>';
  if(!s.closed && !s.rest) h+='<button class="fp-btn red sm" onclick="fp.endDay()">⏹ '+L('Încheie ziua','Tag beenden')+'</button>';
  if(s.closed && !s.signedAt) h+='<button class="fp-btn grn sm" onclick="fp.openSign(\''+t+'\')">✍ '+L('Semnează','Unterschreiben')+'</button>';
  if(s.signedAt) h+='<span class="fp-chip ok">✓ '+L('Semnat','Unterschrieben')+'</span>';
  h+='</div></div>';
  return h;
}
function totHtml(s,date){
  const c=calc(s,date);
  return '<div class="fp-tot"><div>'+L('Condus','Lenkzeit')+'<b>'+hm(c.drive)+'</b></div><div>'+L('Muncă + disp.','Arbeit/Bereitsch.')+'<b>'+hm(c.wa)+'</b></div><div>'+L('Odihnă / pauze','Ruhezeit/Unterbr.')+'<b>'+hm(c.rest)+'</b></div><div>km<b>'+(c.km==null?'—':c.km)+'</b></div></div>';
}
function entriesHtml(s,date){
  if(s.rest) return '<div class="fp-mut">🛏 '+L('Zi liberă','Ruhefreier Tag')+'</div>';
  if(!(s.entries||[]).length) return '';
  return '<table class="fp-t"><tr><th></th><th>'+L('De la','Von')+'</th><th>'+L('Până la','Bis')+'</th><th>'+L('Durată','Dauer')+'</th></tr>'
   +s.entries.map(e=>{ const f=tm(e.from), t=e.to===null?nowMin():tm(e.to); return '<tr><td>'+TYPES[e.t].ic+' '+TYPES[e.t][S.lang]+(e.note?'<div class="fp-mut">'+esc(e.note)+'</div>':'')+'</td><td>'+e.from+'</td><td>'+(e.to===null?'…':e.to)+'</td><td>'+hm(t-f)+'</td></tr>'; }).join('')+'</table>';
}
function endDay(){
  const t=today(), s=S.sheets[t];
  const m=document.createElement('div');
  m.id='fpEnd'; m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;display:flex;align-items:flex-end;justify-content:center';
  m.innerHTML='<div class="fpw" style="background:#fff;width:100%;max-width:520px;border-radius:18px 18px 0 0;padding:16px;display:block"><div class="fp-h1" style="font-size:17px">⏹ '+L('Încheie ziua','Tag beenden')+'</div>'
   +'<label class="fp-f">'+L('Locul terminării (Ort der Fahrtbeendigung)','Ort der Fahrtbeendigung')+'</label><input id="fpeLoc" value="'+esc(s.endLoc||'')+'">'
   +'<label class="fp-f">'+L('Kilometraj final','Kilometerstand Ende')+'</label><input id="fpeKm" type="number" inputmode="numeric" value="'+(s.kmEnd==null?'':s.kmEnd)+'">'
   +'<label class="fp-f">'+L('Observații (opțional)','Bemerkungen (optional)')+'</label><textarea id="fpeRem" rows="2">'+esc(s.remark||'')+'</textarea>'
   +'<div class="fp-err" id="fpeErr"></div><div class="fp-row"><button class="fp-btn" onclick="fp.doEnd()">'+L('Încheie și semnează','Beenden und unterschreiben')+'</button><button class="fp-btn sec" onclick="document.getElementById(\'fpEnd\').remove()">'+L('Anulează','Abbrechen')+'</button></div></div>';
  document.body.appendChild(m);
}
async function doEnd(){
  const t=today(), s=JSON.parse(JSON.stringify(S.sheets[t])), now=nowHM();
  const e=curEntry(s); if(e){ if(tm(now)<=tm(e.from)){ s.entries=s.entries.filter(x=>x!==e); } else e.to=now; }
  s.endLoc=$('fpeLoc').value.trim(); const km=$('fpeKm').value; s.kmEnd=km===''?null:Number(km); s.remark=$('fpeRem').value.trim(); s.closed=true;
  await save(t,s,()=>{ const m=$('fpEnd'); if(m) m.remove(); openSign(t); },'fpeErr');
}

/* ---------- EDIT ---------- */
function editSheet(d){
  const s=JSON.parse(JSON.stringify(S.sheets[d]));
  S.edit={ date:d, isNew:false, sheet:s }; go('edit');
}
function vEdit(){
  const {date,sheet:s}=S.edit;
  let h='<div class="fp-card"><h4>✎ '+L('Editează timpii','Zeiten bearbeiten')+' · '+wd(date)+' '+fmtD(date)+'</h4>';
  if(!S.edit.isNew && S.sheets[date] && S.sheets[date].signedAt) h+='<div class="fp-warn">'+L('Foaia este semnată. Dacă o modifici, semnătura se anulează și trebuie semnată din nou (modificarea se înregistrează).','Das Blatt ist unterschrieben. Eine Änderung hebt die Unterschrift auf; neu unterschreiben nötig (Änderung wird protokolliert).')+'</div>';
  h+='<label class="fp-f">'+L('Vehicul','Fahrzeug')+'</label>'+vehSelect('fpeVeh',s.plate)
   +'<label class="fp-f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" style="width:auto" id="fpeRest" '+(s.rest?'checked':'')+' onchange="fp.eSync();fp.eRender()"> '+L('Zi liberă (fără activități)','Ruhefreier Tag (keine Tätigkeiten)')+'</label>';
  h+='<div id="fpeEntries">'+entryRows(s)+'</div>';
  h+='<div class="fp-row" style="margin:6px 0"><button class="fp-btn sec sm" onclick="fp.eAdd()">＋ '+L('Adaugă intrare','Eintrag hinzufügen')+'</button></div>';
  h+='<div class="fp-mut">'+L('Golurile dintre intrări și intervalul 0:00 → început se contorizează ca odihnă.','Lücken zwischen den Einträgen und 0:00 → Beginn zählen als Ruhezeit.')+'</div>';
  h+='<div id="fpeTot"></div>';
  h+='<label class="fp-f">'+L('Locul începerii','Ort der Fahrtaufnahme')+'</label><input id="fpeSL" value="'+esc(s.startLoc)+'">'
   +'<label class="fp-f">'+L('Locul terminării','Ort der Fahrtbeendigung')+'</label><input id="fpeEL" value="'+esc(s.endLoc)+'">'
   +'<div class="fp-row"><div style="flex:1"><label class="fp-f">km '+L('început','Beginn')+'</label><input id="fpeK1" type="number" inputmode="numeric" value="'+(s.kmStart==null?'':s.kmStart)+'"></div><div style="flex:1"><label class="fp-f">km '+L('final','Ende')+'</label><input id="fpeK2" type="number" inputmode="numeric" value="'+(s.kmEnd==null?'':s.kmEnd)+'"></div></div>'
   +'<label class="fp-f">'+L('Observații (Bemerkung)','Bemerkung')+'</label><textarea id="fpeRem" rows="2">'+esc(s.remark)+'</textarea>'
   +'<div class="fp-err" id="fpErr"></div><div class="fp-row" style="margin-top:6px"><button class="fp-btn" onclick="fp.eSave()">💾 '+L('Salvează','Speichern')+'</button><button class="fp-btn sec" onclick="fp.go(\'archive\')">'+L('Anulează','Abbrechen')+'</button></div></div>';
  setTimeout(eTot,0);
  return h;
}
function entryRows(s){
  if(s.rest) return '';
  return (s.entries||[]).map((e,i)=>'<div class="fp-er"><select data-i="'+i+'" data-k="t" onchange="fp.eSync()">'+Object.keys(TYPES).map(k=>'<option value="'+k+'" '+(e.t===k?'selected':'')+'>'+TYPES[k].ic+' '+TYPES[k][S.lang]+'</option>').join('')+'</select>'
    +'<input type="time" data-i="'+i+'" data-k="from" value="'+e.from+'" onchange="fp.eSync()"><input type="time" data-i="'+i+'" data-k="to" value="'+(e.to===null?'':(e.to==='24:00'?'00:00':e.to))+'" onchange="fp.eSync()">'
    +'<button class="fp-x" onclick="fp.eDel('+i+')">✕</button><input class="nt" data-i="'+i+'" data-k="note" placeholder="'+L('Observație (opțional)','Bemerkung (optional)')+'" value="'+esc(e.note)+'" onchange="fp.eSync()"></div>').join('');
}
function eSync(){
  const s=S.edit.sheet;
  s.rest=$('fpeRest').checked;
  document.querySelectorAll('#fpeEntries [data-i]').forEach(el=>{
    const i=Number(el.dataset.i), k=el.dataset.k, e=s.entries[i]; if(!e) return;
    let v=el.value;
    if(k==='to'){ e.to = v===''?null:(v==='00:00'&&e.from!=='00:00'?'24:00':v); }
    else e[k]=v;
  });
  eTot();
}
function eRender(){ const el=$('fpeEntries'); if(el) el.innerHTML=entryRows(S.edit.sheet); eTot(); }
function eAdd(){ eSync(); const s=S.edit.sheet; s.rest=false; const last=s.entries[s.entries.length-1]; const f=last&&last.to&&last.to!=='24:00'?last.to:'08:00'; s.entries.push({t:'drive',from:f,to:null,note:''}); $('fpeRest').checked=false; eRender(); }
function eDel(i){ eSync(); S.edit.sheet.entries.splice(i,1); eRender(); }
function eTot(){
  const el=$('fpeTot'); if(!el||!S.edit) return;
  const s=S.edit.sheet; const c=calc(s,S.edit.date);
  el.innerHTML='<div class="fp-tot"><div>'+L('Condus','Lenkzeit')+'<b>'+hm(c.drive)+'</b></div><div>'+L('Muncă + disp.','Arbeit/Bereitsch.')+'<b>'+hm(c.wa)+'</b></div><div>'+L('Odihnă / pauze','Ruhezeit')+'<b>'+hm(c.rest)+'</b></div><div>'+L('Început / sfârșit','Beginn / Ende')+'<b>'+(c.first==null?'—':hm(c.first)+' – '+hm(c.last))+'</b></div></div>';
}
async function eSave(){
  eSync();
  const {date,sheet:s}=S.edit;
  s.plate=$('fpeVeh').value; s.startLoc=$('fpeSL').value.trim(); s.endLoc=$('fpeEL').value.trim();
  const k1=$('fpeK1').value,k2=$('fpeK2').value; s.kmStart=k1===''?null:Number(k1); s.kmEnd=k2===''?null:Number(k2); s.remark=$('fpeRem').value.trim();
  if(s.rest) s.entries=[];
  if(!s.rest && !s.entries.length){ $('fpErr').textContent=L('Adaugă cel puțin o intrare sau bifează zi liberă.','Mindestens einen Eintrag hinzufügen oder ruhefrei wählen.'); return; }
  if(date!==today() && s.entries.some(e=>e.to===null)){ $('fpErr').textContent=L('Completează ora „până la” la toate intrările.','Bei allen Einträgen „Bis“ ausfüllen.'); return; }
  s.closed = date!==today() ? true : s.closed;
  await save(date,s,()=>{ detail(date); },'fpErr');
}

/* ---------- ARHIVĂ ---------- */
function vArchive(){
  const ym=S.month, list=monthSheets(ym);
  let h='<div class="fp-card"><div class="fp-row" style="justify-content:space-between"><button class="fp-btn sec sm" onclick="fp.mon(-1)">◀</button><b>'+monthName(ym)+'</b><button class="fp-btn sec sm" onclick="fp.mon(1)">▶</button></div>';
  h+= list.length ? list.map(s=>rowSheet(s,'fp.openDetail')).join('') : '<div class="fp-mut" style="padding:14px 0">'+L('Nicio foaie în luna aceasta.','Keine Blätter in diesem Monat.')+'</div>';
  h+='<div class="fp-row" style="margin-top:10px"><button class="fp-btn sec sm" onclick="fp.pastDay()">＋ '+L('Adaugă o zi trecută','Vergangenen Tag nachtragen')+'</button></div>';
  h+='<div class="fp-mut" style="margin-top:10px">'+L('Se păstrează ziua curentă + ultimele 56 de zile. Modificările după semnare se înregistrează și cer o nouă semnătură.','Aktueller Tag + die letzten 56 Tage werden angezeigt. Änderungen nach der Unterschrift werden protokolliert und erfordern eine neue Unterschrift.')+'</div></div>';
  return h;
}
const monthName = monName;
function mon(n){ S.month=ymAdd(S.month,n); render(); }
function rowSheet(s, fnName, who){
  const c=calc(s,s.date), run=s.date===today()&&!s.closed&&!s.rest;
  const chip = s.signedAt?'<span class="fp-chip ok">✓ '+L('Semnat','Unterschr.')+'</span>':(run?'<span class="fp-chip run">'+L('în curs','läuft')+'</span>':'<span class="fp-chip no">'+L('Nesemnat','Offen')+'</span>');
  return '<div class="fp-li" onclick="'+fnName+'(\''+s.date+'\''+(who?',\''+who+'\'':'')+')"><div><b>'+wd(s.date)+' '+fmtD(s.date)+'</b> <span class="fp-mut">Nr. '+String(s.nr).padStart(4,'0')+(s.plate?' · '+esc(s.plate):'')+'</span><div class="fp-mut">'+(s.rest?'🛏 '+L('zi liberă','ruhefrei'):'🚚 '+hm(c.drive)+' · 🔧 '+hm(c.wa)+(c.km!=null?' · '+c.km+' km':''))+'</div></div>'+chip+'</div>';
}
function openDetail(d){ detail(d); }
function detail(d){ S.detail={date:d}; go('detail',{date:d}); }
function vDetail(){
  const d=S.detail.date, s=S.sheets[d]; if(!s) return '<div class="fp-card">—</div>';
  const t=today();
  let h='<div class="fp-card"><h4>'+wd(d)+' '+fmtD(d)+' · Nr. '+String(s.nr).padStart(4,'0')+'</h4>'+sheetBody(s,d);
  h+='<div class="fp-row" style="margin-top:12px">';
  if(!s.signedAt && (s.closed||d<t)) h+='<button class="fp-btn grn sm" onclick="fp.openSign(\''+d+'\')">✍ '+L('Semnează','Unterschreiben')+'</button>';
  h+='<button class="fp-btn sm" onclick="fp.pdfOne(\''+d+'\')">📄 PDF</button><button class="fp-btn sec sm" onclick="fp.editSheet(\''+d+'\')">✎ '+L('Editează','Bearbeiten')+'</button>';
  if(!s.signedAt) h+='<button class="fp-btn red sm" onclick="fp.delSheet(\''+d+'\')">🗑</button>';
  h+='</div></div>';
  return h;
}
function sheetBody(s,d){
  const c=calc(s,d);
  let h=barHtml(s,d)+legend()+totHtml(s,d)+entriesHtml(s,d);
  h+='<div class="fp-mut" style="margin-top:8px">📍 '+esc(s.startLoc||'—')+' → '+esc(s.endLoc||'—')+' · km '+(s.kmStart==null?'—':s.kmStart)+' → '+(s.kmEnd==null?'—':s.kmEnd)+'</div>';
  if(s.remark) h+='<div class="fp-mut">💬 '+esc(s.remark)+'</div>';
  if(s.signedAt) h+='<div class="fp-mut" style="margin-top:8px">✍ '+esc(s.signedName)+' · '+new Date(s.signedAt).toLocaleString(S.lang==='de'?'de-DE':'ro-RO',{timeZone:'Europe/Berlin'})+(s.signature?'<br><img src="'+s.signature+'" style="height:60px;border:1px solid var(--border);border-radius:8px;margin-top:4px;background:#fff">':'')+'</div>';
  const mods=(s.log||[]).filter(l=>/modificat/.test(l.a));
  if(mods.length) h+='<div class="fp-mut" style="margin-top:6px">📝 '+L('Modificări înregistrate','Protokollierte Änderungen')+': '+mods.length+'</div>';
  return h;
}
async function delSheet(d){
  if(!confirm(L('Ștergi foaia din '+fmtD(d)+'?','Blatt vom '+fmtD(d)+' löschen?'))) return;
  try{ await call('fpDelete',{date:d}); await loadSheets(); go('archive'); }catch(e){ alert(e.message); }
}

/* ---------- SEMNĂTURĂ ---------- */
let sigDirty=false;
function openSign(d){ S.detail={date:d}; sigDirty=false; go('sign',{date:d}); }
function vSign(){
  const d=S.detail.date, s=S.sheets[d]; if(!s) return '';
  return '<div class="fp-card"><h4>✍ '+L('Semnează foaia','Blatt unterschreiben')+' · '+fmtD(d)+'</h4>'+sheetBody(s,d)
   +'<div class="fp-mut" style="margin:12px 0 6px">'+L('Semnează cu degetul în căsuță:','Mit dem Finger im Feld unterschreiben:')+'</div><canvas id="fpSig" class="fp-sig"></canvas>'
   +'<div class="fp-err" id="fpErr"></div><div class="fp-row"><button class="fp-btn grn" onclick="fp.doSign()">✓ '+L('Semnez','Unterschreiben')+'</button><button class="fp-btn sec" onclick="fp.sigClear()">'+L('Șterge','Löschen')+'</button><button class="fp-btn sec" onclick="fp.go(\'archive\')">'+L('Mai târziu','Später')+'</button></div></div>';
}
function sigInit(){
  const cv=$('fpSig'); if(!cv) return;
  const r=cv.getBoundingClientRect(); cv.width=Math.round(r.width*2); cv.height=Math.round(r.height*2);
  const g=cv.getContext('2d'); g.scale(2,2); g.lineWidth=2.4; g.lineCap='round'; g.lineJoin='round'; g.strokeStyle='#111';
  let down=false;
  const pos=e=>{ const b=cv.getBoundingClientRect(); return [e.clientX-b.left,e.clientY-b.top]; };
  cv.onpointerdown=e=>{ down=true; cv.setPointerCapture(e.pointerId); const [x,y]=pos(e); g.beginPath(); g.moveTo(x,y); g.lineTo(x+.1,y+.1); g.stroke(); sigDirty=true; };
  cv.onpointermove=e=>{ if(!down) return; const [x,y]=pos(e); g.lineTo(x,y); g.stroke(); };
  cv.onpointerup=cv.onpointercancel=()=>{ down=false; };
}
function sigClear(){ const cv=$('fpSig'); if(!cv) return; cv.getContext('2d').clearRect(0,0,cv.width,cv.height); sigDirty=false; }
async function doSign(){
  const d=S.detail.date, cv=$('fpSig');
  if(!sigDirty){ $('fpErr').textContent=L('Desenează semnătura.','Bitte unterschreiben.'); return; }
  try{
    // redus la 600px lățime ca să rămână mică
    const o=document.createElement('canvas'); o.width=600; o.height=Math.round(600*cv.height/cv.width); o.getContext('2d').drawImage(cv,0,0,o.width,o.height);
    await call('fpSign',{date:d,signature:o.toDataURL('image/png')});
    await loadSheets(); detail(d);
  }catch(e){ $('fpErr').textContent=e.message||'Eroare'; }
}

/* ---------- EXPORT ---------- */
function presetRange(k){
  const t=today(), ym=ymOf(t);
  if(k==='cur') return [ym+'-01',t];
  if(k==='prev'){ const p=ymAdd(ym,-1); return [p+'-01', addDays(ym+'-01',-1)]; }
  return [addDays(t,-56),t];
}
function vExport(){
  if(!S.from){ [S.from,S.to]=presetRange('cur'); }
  return '<div class="fp-card"><h4>📤 '+L('Exportă foile mele','Meine Blätter exportieren')+'</h4>'
   +'<div class="fp-row"><button class="fp-btn sec sm" onclick="fp.preset(\'cur\')">'+L('Luna aceasta','Dieser Monat')+'</button><button class="fp-btn sec sm" onclick="fp.preset(\'prev\')">'+L('Luna trecută','Letzter Monat')+'</button><button class="fp-btn sec sm" onclick="fp.preset(\'56\')">56 '+L('zile','Tage')+'</button></div>'
   +'<div class="fp-row" style="margin-top:8px"><div style="flex:1"><label class="fp-f">'+L('De la','Von')+'</label><input type="date" id="fpxF" value="'+S.from+'" onchange="fp.rng()"></div><div style="flex:1"><label class="fp-f">'+L('Până la','Bis')+'</label><input type="date" id="fpxT" value="'+S.to+'" onchange="fp.rng()"></div></div>'
   +'<div class="fp-row" style="margin-top:12px"><button class="fp-btn" onclick="fp.exp(\'pdf\')">📄 PDF</button><button class="fp-btn sec" onclick="fp.exp(\'xls\')">📊 Excel</button><button class="fp-btn sec" onclick="fp.exp(\'csv\')">CSV</button><button class="fp-btn sec" onclick="fp.exp(\'json\')">💾 Backup</button></div>'
   +'<div class="fp-err" id="fpErr"></div><div class="fp-mut" style="margin-top:8px">'+L('PDF-ul conține toate foile din perioadă (câte una pe pagină), cu semnături, în germană.','Das PDF enthält alle Blätter des Zeitraums (eine Seite je Blatt) mit Unterschriften, auf Deutsch.')+'</div></div>';
}
function preset(k){ [S.from,S.to]=presetRange(k); render(); }
function rng(){ S.from=$('fpxF').value; S.to=$('fpxT').value; }
async function exp(kind){
  rng(); if(!S.from||!S.to||S.from>S.to){ $('fpErr').textContent=L('Perioadă invalidă.','Ungültiger Zeitraum.'); return; }
  try{
    const r=await call('fpRange',{from:S.from,to:S.to});
    if(!r.lista.length){ $('fpErr').textContent=L('Nicio foaie în perioadă.','Keine Blätter im Zeitraum.'); return; }
    await outFiles(r.lista, kind, 'Tageskontrollblatt_'+S.from+'_'+S.to);
  }catch(e){ $('fpErr').textContent=e.message||'Eroare'; }
}
async function outFiles(list, kind, base){
  if(kind==='pdf') return makePdf(list, base+'.pdf');
  if(kind==='json') return dl(JSON.stringify(list,null,1), base+'.json', 'application/json');
  const csv=toCsv(list);
  return dl('﻿'+csv, base+(kind==='xls'?'_excel.csv':'.csv'), 'text/csv;charset=utf-8');
}
function toCsv(list){
  const head=['Datum','Blatt-Nr','Fahrer','Kennzeichen','Arbeitsbeginn','Arbeitsende','Lenkzeit','Arbeit','Bereitschaft','Ruhezeit','Ort Beginn','Ort Ende','km Beginn','km Ende','km gesamt','Unterschrieben','Bemerkung'];
  const q=v=>{ v=String(v==null?'':v); return /[";\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
  const rows=list.map(s=>{ const c=calc(s,s.date); return [fmtD(s.date),String(s.nr).padStart(4,'0'),s.nume,s.plate,c.first==null?'':hm(c.first),c.last==null?'':hm(c.last),hm(c.drive),hm(c.work),hm(c.avail),hm(c.rest),s.startLoc,s.endLoc,s.kmStart,s.kmEnd,c.km==null?'':c.km,s.signedAt?new Date(s.signedAt).toLocaleString('de-DE',{timeZone:'Europe/Berlin'}):'nein',s.remark]; });
  return [head].concat(rows).map(r=>r.map(q).join(';')).join('\r\n');
}
function dl(content, name, mime){
  const b=new Blob([content],{type:mime}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
}
async function pdfOne(d){ await makePdf([S.sheets[d]], 'Tageskontrollblatt_'+String(S.sheets[d].nr).padStart(4,'0')+'_'+d+'.pdf'); }

/* ---------- CONTROL ---------- */
function vCheck(){
  const t=today(), min=addDays(t,-56);
  const list=Object.values(S.sheets).filter(s=>s.date>=min).sort((a,b)=>a.date<b.date?1:-1);
  return '<div class="fp-card"><h4>🛂 '+L('Control rutier (Kontrolle)','Kontrolle')+'</h4><div class="fp-mut">'+L('Ziua curentă + ultimele 56 de zile, pentru inspector.','Aktueller Tag + die letzten 56 Tage für die Kontrolle.')+'</div>'
   +'<div class="fp-row" style="margin:10px 0"><button class="fp-btn" onclick="fp.insp()">👮 '+L('Arată inspectorului','Dem Kontrolleur zeigen')+'</button><button class="fp-btn sec" onclick="fp.ctrlPdf()">📄 '+L('PDF toate','Alle als PDF')+'</button></div>'
   +(list.length? list.map(s=>rowSheet(s,'fp.openDetail')).join(''):'<div class="fp-mut">'+L('Nicio foaie în ultimele 56 de zile.','Keine Blätter in den letzten 56 Tagen.')+'</div>')+'</div>';
}
async function ctrlPdf(){
  const t=today();
  try{ const r=await call('fpRange',{from:addDays(t,-56),to:t}); if(!r.lista.length){ alert(L('Nicio foaie.','Keine Blätter.')); return; } await makePdf(r.lista,'Kontrolle_'+t+'.pdf'); }catch(e){ alert(e.message); }
}
function insp(){
  const t=today(), min=addDays(t,-56);
  const list=Object.values(S.sheets).filter(s=>s.date>=min).sort((a,b)=>a.date<b.date?1:-1);
  const m=document.createElement('div'); m.id='fpInsp';
  m.innerHTML='<div class="fpw" style="display:block"><div class="fp-row" style="justify-content:space-between"><div class="fp-h1">Tageskontrollblatt</div><button class="fp-btn sec sm" onclick="document.getElementById(\'fpInsp\').remove()">✕</button></div>'
   +'<div class="fp-mut">'+esc((document.getElementById('welcomeName')||{}).textContent)+' · § 1 Abs. 6 FPersV</div>'
   +'<table class="fp-t" style="margin-top:10px"><tr><th>Datum</th><th>Kfz</th><th>Lenken</th><th>Arbeit/Bereit.</th><th>Ruhe</th><th>km</th><th>✍</th></tr>'
   +list.map(s=>{ const c=calc(s,s.date); return '<tr onclick="fp.pdfOne(\''+s.date+'\')"><td>'+fmtD(s.date)+'</td><td>'+esc(s.plate)+'</td><td>'+hm(c.drive)+'</td><td>'+hm(c.wa)+'</td><td>'+hm(c.rest)+'</td><td>'+(c.km==null?'':c.km)+'</td><td>'+(s.signedAt?'✓':'—')+'</td></tr>'; }).join('')+'</table></div>';
  document.body.appendChild(m);
}

/* ---------- ECHIPĂ (coordonator / admin) ---------- */
async function loadTeam(){
  S.team=null; render();
  const ym=S.tmonth;
  try{ S.team=await call('fpTeam',{from:ym+'-01',to:ymEnd(ym)}); }catch(e){ S.team={error:e.message||'Eroare'}; }
  render();
}
function vTeam(){
  if(!S.team){ setTimeout(()=>{ if(!S.team&&S.view==='team'&&!S.teamLoading){ S.teamLoading=true; loadTeam().finally(()=>S.teamLoading=false); } },0); return '<div class="fp-card fp-mut">'+L('Se încarcă…','Lädt…')+'</div>'; }
  if(S.team.error) return '<div class="fp-card"><div class="fp-err">'+esc(S.team.error)+'</div></div>';
  const ym=S.tmonth;
  let h='<div class="fp-card"><div class="fp-row" style="justify-content:space-between"><button class="fp-btn sec sm" onclick="fp.tmon(-1)">◀</button><b>'+monName(ym)+'</b><button class="fp-btn sec sm" onclick="fp.tmon(1)">▶</button></div>';
  h+= S.team.drivers.length ? S.team.drivers.map(d=>{
    const ls=S.team.lista.filter(s=>s.eid===d.id); const dr=ls.reduce((a,s)=>a+calc(s,s.date).drive,0); const km=ls.reduce((a,s)=>a+(calc(s,s.date).km||0),0); const un=ls.filter(s=>!s.signedAt).length;
    return '<div class="fp-li" onclick="fp.tdrv(\''+d.id+'\')"><div><b>'+esc(d.nume)+'</b><div class="fp-mut">'+esc(d.masini.join(', ')||'—')+' · '+ls.length+' '+L('foi','Blätter')+' · 🚚 '+hm(dr)+' · '+km+' km</div></div>'+(un?'<span class="fp-chip no">'+un+' '+L('nesemn.','offen')+'</span>':(ls.length?'<span class="fp-chip ok">✓</span>':''))+'</div>';
  }).join('') : '<div class="fp-mut" style="padding:14px 0">'+L('Niciun șofer cu mașină atribuită.','Keine Fahrer mit zugewiesenem Fahrzeug.')+'</div>';
  h+='<div class="fp-row" style="margin-top:12px"><button class="fp-btn sec sm" onclick="fp.teamCsv()">📊 Excel ('+L('toată echipa','ganzes Team')+')</button></div></div>';
  return h;
}
function tmon(n){ S.tmonth=ymAdd(S.tmonth,n); S.team=null; render(); }
function tdrv(id){ S.tdriver=id; go('teamDriver'); }
function vTeamDriver(){
  const d=S.team.drivers.find(x=>x.id===S.tdriver)||{nume:'',masini:[]};
  const ls=S.team.lista.filter(s=>s.eid===S.tdriver).sort((a,b)=>a.date<b.date?1:-1);
  return '<div class="fp-card"><div class="fp-row" style="justify-content:space-between"><button class="fp-btn sec sm" onclick="fp.go(\'team\')">← '+L('Înapoi','Zurück')+'</button><b>'+esc(d.nume)+'</b></div><div class="fp-mut">'+monName(S.tmonth)+' · '+esc(d.masini.join(', '))+'</div>'
   +(ls.length? ls.map(s=>rowSheet(s,'fp.tdetail',s.eid)).join(''):'<div class="fp-mut" style="padding:14px 0">'+L('Nicio foaie în lună.','Keine Blätter in diesem Monat.')+'</div>')
   +'<div class="fp-row" style="margin-top:12px"><button class="fp-btn sm" onclick="fp.teamPdf(\''+S.tdriver+'\')">📄 PDF '+L('luna','Monat')+'</button></div></div>';
}
async function tdetail(date,eid){
  try{ const s=await call('fpGet',{eid,date}); S.detail={date,eid,sheet:s}; go('teamDetail'); }catch(e){ alert(e.message); }
}
function vTeamDetail(){
  const {date,sheet:s}=S.detail;
  return '<div class="fp-card"><div class="fp-row" style="justify-content:space-between"><button class="fp-btn sec sm" onclick="fp.go(\'teamDriver\')">← '+L('Înapoi','Zurück')+'</button><button class="fp-btn sm" onclick="fp.teamPdfOne()">📄 PDF</button></div>'
   +'<h4 style="margin-top:10px">'+esc(s.nume)+' · '+wd(date)+' '+fmtD(date)+' · Nr. '+String(s.nr).padStart(4,'0')+'</h4>'+sheetBody(s,date)+'</div>';
}
async function teamPdfOne(){ const s=S.detail.sheet; await makePdf([s],'Tageskontrollblatt_'+String(s.nr).padStart(4,'0')+'_'+s.nume.replace(/\s+/g,'_')+'_'+s.date+'.pdf'); }
async function teamPdf(eid){
  const ym=S.tmonth;
  try{ const r=await call('fpRange',{eid,from:ym+'-01',to:ymEnd(ym)}); if(!r.lista.length){ alert(L('Nicio foaie.','Keine Blätter.')); return; } await makePdf(r.lista,'Tageskontrollblatt_'+r.lista[0].nume.replace(/\s+/g,'_')+'_'+ym+'.pdf'); }catch(e){ alert(e.message); }
}
function teamCsv(){ dl('﻿'+toCsv(S.team.lista.slice().sort((a,b)=>a.nume.localeCompare(b.nume)||(a.date<b.date?-1:1))),'Tageskontrollblaetter_Team_'+S.tmonth+'.csv','text/csv;charset=utf-8'); }

/* ---------- PDF (germană) ---------- */
function loadJsPdf(){
  if(window.jspdf) return Promise.resolve();
  return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; s.onload=res; s.onerror=()=>rej(new Error('PDF-Bibliothek nicht ladbar')); document.head.appendChild(s); });
}
const hexRgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
async function makePdf(list, filename){
  await loadJsPdf();
  const { jsPDF } = window.jspdf; const doc = new jsPDF({unit:'mm',format:'a4'});
  const DE={drive:'Lenken',work:'Arbeit',avail:'Bereitschaft',rest:'Ruhe'};
  list.forEach((s,idx)=>{
    if(idx>0) doc.addPage();
    const c=calc(s,s.date), nr=String(s.nr).padStart(4,'0'), M=15, W=180;
    doc.setFont('helvetica','bold'); doc.setFontSize(17); doc.setTextColor(30,58,95);
    doc.text('Tageskontrollblatt Nr. '+nr+' – '+fmtD(s.date),M,22);
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(110);
    doc.text('MTC Transport GmbH',M,28);
    const cell=(x,y,w,h,num,label,val,sub)=>{
      doc.setDrawColor(190); doc.setLineWidth(.2); doc.rect(x,y,w,h);
      doc.setFontSize(7); doc.setTextColor(110); doc.text(num+'  '+label,x+2,y+4);
      doc.setFontSize(11); doc.setTextColor(20); doc.setFont('helvetica','bold'); doc.text(String(val),x+2,y+h-3.5); doc.setFont('helvetica','normal');
      if(sub){ doc.setFontSize(7); doc.setTextColor(110); doc.text(sub,x+w-2,y+4,{align:'right'}); }
    };
    let y=34;
    cell(M,y,90,13,'1','Name, Vorname des Fahrers',s.nume||''); cell(M+90,y,45,13,'2','Amtl. Kennzeichen',s.plate||'–'); cell(M+135,y,45,13,'3','Blatt-Nr.',nr); y+=13;
    cell(M,y,60,13,'4','Datum',fmtD(s.date)); cell(M+60,y,60,13,'','Arbeitsbeginn',c.first==null?'–':hm(c.first)+' Uhr'); cell(M+120,y,60,13,'','Arbeitsende',c.last==null?'–':hm(c.last)+' Uhr'); y+=13;
    cell(M,y,60,15,'5','Ruhezeit / Unterbrechung',hm(c.rest)+' h'); cell(M+60,y,60,15,'6','Lenkzeit',hm(c.drive)+' h'); cell(M+120,y,60,15,'7','Arbeit / Bereitschaft',hm(c.wa)+' h','davon Bereitschaft '+hm(c.avail)); y+=15;
    cell(M,y,90,13,'8','Ort der Fahrtaufnahme',s.startLoc||'–'); cell(M+90,y,90,13,'9','Ort der Fahrtbeendigung',s.endLoc||'–'); y+=13;
    cell(M,y,60,13,'10','Kilometerstand Beginn',s.kmStart==null?'–':s.kmStart); cell(M+60,y,60,13,'','Kilometerstand Ende',s.kmEnd==null?'–':s.kmEnd); cell(M+120,y,60,13,'','Gefahrene km gesamt',c.km==null?'–':c.km+' km'); y+=19;
    // Tagesverlauf
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(30,58,95); doc.text('Tagesverlauf (0–24 Uhr)',M,y); y+=4;
    doc.setFillColor(232,243,236); doc.setDrawColor(190); doc.rect(M,y,W,10,'FD');
    const now=s.date===today()?nowMin():1440;
    if(s.rest){ doc.setFillColor(...hexRgb(TYPES.rest.col)); doc.rect(M,y,W,10,'F'); }
    (s.entries||[]).forEach(e=>{ const f=tm(e.from), t=e.to===null?now:tm(e.to); if(t>f){ doc.setFillColor(...hexRgb(TYPES[e.t].col)); doc.rect(M+W*f/1440,y,Math.max(.4,W*(t-f)/1440),10,'F'); } });
    doc.setDrawColor(255); doc.setLineWidth(.15); for(let h=1;h<24;h++){ doc.line(M+W*h/24,y+7,M+W*h/24,y+10); }
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(90);
    [0,3,6,9,12,15,18,21,24].forEach(h=>doc.text(String(h),M+W*h/24,y+14,{align:'center'}));
    let lx=M; y+=19;
    Object.keys(TYPES).forEach(k=>{ doc.setFillColor(...hexRgb(TYPES[k].col)); doc.rect(lx,y-2.6,3,3,'F'); doc.setTextColor(60); doc.setFontSize(8); doc.text(DE[k],lx+4.5,y); lx+=34; });
    y+=7;
    // Einträge
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(30,58,95); doc.text('Tätigkeit',M,y); doc.text('von',M+45,y); doc.text('bis',M+65,y); doc.text('Dauer',M+85,y); doc.text('Bemerkung',M+105,y); y+=2; doc.setDrawColor(190); doc.line(M,y,M+W,y); y+=4.5;
    doc.setFont('helvetica','normal'); doc.setTextColor(30);
    if(s.rest){ doc.text('Ruhefreier Tag',M,y); y+=5; }
    (s.entries||[]).slice(0,22).forEach(e=>{ const f=tm(e.from), t=e.to===null?now:tm(e.to); doc.text(DE[e.t],M,y); doc.text(e.from,M+45,y); doc.text(e.to===null?'…':(e.to==='24:00'?'24:00':e.to),M+65,y); doc.text(hm(t-f),M+85,y); if(e.note) doc.text(doc.splitTextToSize(e.note,70)[0],M+105,y); y+=5; });
    y+=3;
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(30,58,95); doc.text('Bemerkungen',M,y); y+=2;
    doc.setDrawColor(190); doc.rect(M,y,W,16); doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(30);
    doc.text(doc.splitTextToSize(s.remark||'',W-4).slice(0,4),M+2,y+5); y+=22;
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(30,58,95); doc.text('Unterschrift',M,y); y+=2;
    doc.setDrawColor(190); doc.rect(M,y,W,38);
    if(s.signedAt){
      if(s.signature){ try{ doc.addImage(s.signature,'PNG',M+3,y+2,60,Math.min(26,60*0.28)); }catch(e){} }
      doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(30);
      doc.text(s.signedName||s.nume||'',M+3,y+31);
      doc.setFontSize(8); doc.setTextColor(100);
      doc.text('Digital unterschrieben am '+new Date(s.signedAt).toLocaleString('de-DE',{timeZone:'Europe/Berlin'}),M+3,y+35);
    } else { doc.setFontSize(9); doc.setTextColor(170,60,40); doc.text('Nicht unterschrieben',M+3,y+8); }
    const mods=(s.log||[]).filter(l=>/modificat/.test(l.a)).length;
    if(mods){ doc.setFontSize(7.5); doc.setTextColor(100); doc.text('Nach dem Anlegen '+mods+'× geändert (protokolliert).',M+W-2,y+35,{align:'right'}); }
    doc.setFontSize(7.5); doc.setTextColor(130);
    doc.text('Erstellt mit MTC Transport Portal · Aufzeichnung nach § 1 Abs. 6 FPersV · Seite 1 von 1',105,288,{align:'center'});
  });
  doc.save(filename);
}

window.fp = { go, lang, startDay, doStart, restDay, pastDay, switchTo, endDay, doEnd, editSheet, eSync, eRender, eAdd, eDel, eSave, mon, openDetail, delSheet, openSign, sigClear, doSign,
  preset, rng, exp, pdfOne, ctrlPdf, insp, tmon, tdrv, tdetail, teamPdf, teamPdfOne, teamCsv, vehOther };
window.fpBoot = boot; window.fpOpen = open;
})();
