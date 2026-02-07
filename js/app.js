let TK=localStorage.getItem('gm_v3_token')||'';
let G=[],D=[],known=new Map(),myId='',myName='';
let WF=JSON.parse(localStorage.getItem('gm_v3_royal'))||{};
let cur={type:'all',id:null};
let aToggles=new Set(),pollTmr=null,isOn=false,isMut=false,selSd='radar';
let seen=JSON.parse(localStorage.getItem('gm_v3_lastseen'))||{};
let vAt=0;
let appr=JSON.parse(localStorage.getItem('gm_v3_approved'))||{};
let pins=JSON.parse(localStorage.getItem('gm_v3_pinned'))||{};
let mutedG=JSON.parse(localStorage.getItem('gm_v3_muted'))||{};
let pinnedChats=JSON.parse(localStorage.getItem('gm_v3_pinchats'))||{}; // {id: {type,name,ts}}
let drafts=JSON.parse(sessionStorage.getItem('gm_v3_drafts')||'{}');
let cbP=JSON.parse(localStorage.getItem('gm_v3_cbpos')||'null');
let stickies=JSON.parse(localStorage.getItem('gm_v3_sticky'))||{}; // {key:{text,exp,created}}
let stickyHist=JSON.parse(localStorage.getItem('gm_v3_stkhist'))||[];
let tpls=JSON.parse(localStorage.getItem('gm_v3_tpl'))||['Copy that','10-4','En route','Need update','Standing by'];
let alertWords=JSON.parse(localStorage.getItem('gm_v3_alerts'))||['urgent','help','emergency','@dispatch'];
let pendImg=null,fwdMsg=null,iaOpen=false;
let feedSound=localStorage.getItem('gm_v3_feedsnd')||'radar';
let dmSound=localStorage.getItem('gm_v3_dmsnd')||'chime';
let feedMuted=localStorage.getItem('gm_v3_feedmut')==='1';
let dmMuted=localStorage.getItem('gm_v3_dmmut')==='1';
let allNotif=localStorage.getItem('gm_v3_allnotif')==='1';
let inputBottom=localStorage.getItem('gm_v3_inputbot')==='1';
let oldestFirst=localStorage.getItem('gm_v3_oldest')==='1';
let panels=[null,null,null]; // {type,id} for panels 1,2
let panelKnown=[null,new Map(),new Map()];
let panelVAt=[0,0,0];
let sortMode=localStorage.getItem('gm_v3_sortmode')||'recent'; // 'recent' or 'heat'
let myStat=localStorage.getItem('gm_v3_status')||'avl';
let syncGid=null; // "Dispatch" group ID for shared data
let teamStatus={}; // {name: {status, ts}}
let searchIdx=[];// local cache
let lastDayKey=null;// track last day divider inserted
let dayCueTmr=null;
let lastScrollDay=null;
const EMO=['👍','❤️','😂','😮','😢','😡','🔥','💯','👏','🎉','💪','👀','🤔','✅','❌','⭐','💀','🙏','😎','🤙','👊','💬','📌','🚀'];
const sv=(k,v)=>localStorage.setItem(k,JSON.stringify(v));

// ========== LOGIN ==========
async function doLogin(){const t=document.getElementById('tok').value.trim();if(!t){document.getElementById('lerr').style.display='block';return;}
try{const r=await fetch(`https://api.groupme.com/v3/users/me?token=${t}`);const d=await r.json();if(!d.response)throw 0;
TK=t;myId=d.response.id;myName=d.response.name;localStorage.setItem('gm_v3_token',t);
document.getElementById('login').style.display='none';document.getElementById('hdr').style.display='flex';document.getElementById('main').style.display='flex';
setCon(true);await rfData();findSyncGroup();renderGP();initEP();setStat(myStat,false);renderTplMgr();renderAlertMgr();
// Restore feed/DM sound prefs
document.getElementById('feedSndSel').value=feedSound;document.getElementById('dmSndSel').value=dmSound;
document.getElementById('feedMutChk').checked=feedMuted;document.getElementById('dmMutChk').checked=dmMuted;
document.getElementById('allNotifChk').checked=allNotif;
if(inputBottom){const ib=document.getElementById('ibBtn');if(ib)ib.style.color='var(--a)';}
if(oldestFirst){const ob=document.getElementById('ofBtn');if(ob){ob.style.color='var(--a)';ob.querySelector('.ico').textContent='↓';}}
if(sortMode==='heat'){const sb=document.getElementById('sortBtn');if(sb){sb.textContent='🔥 Heat';sb.style.color='var(--warn)';}}
switchView('all',null);if(pollTmr)clearInterval(pollTmr);pollTmr=setInterval(poll,4000);
if(Notification.permission==='default')Notification.requestPermission();
}catch(e){document.getElementById('lerr').style.display='block';}}
function doLogout(){localStorage.removeItem('gm_v3_token');TK='';location.reload();}
window.addEventListener('DOMContentLoaded',()=>{if(TK){document.getElementById('tok').value=TK;doLogin();}
document.getElementById('log').addEventListener('scroll',function(){document.getElementById('sctop').style.display=this.scrollTop>150?'block':'none';
// Day cue — show when nearest day divider is scrolled above viewport
const divs=Array.from(this.querySelectorAll('.day-div'));const rect=this.getBoundingClientRect();const cue=document.getElementById('day-cue');
if(!divs.length){cue.classList.remove('show');return;}
// Find the last divider that's above or at the top of the viewport
let above=null;let anyVisible=false;
divs.forEach(d=>{const dr=d.getBoundingClientRect();if(dr.bottom<rect.top+10)above=d;if(dr.top>=rect.top-5&&dr.top<=rect.bottom)anyVisible=true;});
if(above&&!anyVisible){const dk=above.dataset.day;const ts=new Date(dk).getTime()/1e3;if(!isNaN(ts)){const lb=dayLabel(ts);cue.querySelector('.dc-day').textContent=lb.short;cue.querySelector('.dc-date').textContent=lb.long;cue.classList.add('show');}
}else{cue.classList.remove('show');}
});
document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;if(e.key==='/')e.preventDefault(),toggleSearch();if(e.key==='c'||e.key==='C')e.preventDefault(),toggleCB();});
// Close config when clicking outside sidebar & config
document.addEventListener('click',e=>{const cfg=document.getElementById('cfg');if(cfg.style.display==='flex'&&!e.target.closest('#cfg')&&!e.target.closest('#sidebar')&&!e.target.closest('.tray')&&!e.target.closest('.tbtn')){cfg.style.display='none';}});
// Close search when clicking feed area
document.getElementById('log').addEventListener('click',()=>{
const so=document.getElementById('searchOv');if(so.classList.contains('show')){so.classList.remove('show');document.getElementById('searchBtn').classList.remove('active-panel');document.getElementById('searchIn').value='';document.getElementById('searchRes').innerHTML='';}});
// Panel scroll-to-top buttons
[1,2].forEach(s=>{const log=document.getElementById(`plog-${s}`);const btn=document.querySelector(`#panel-${s} .p-sctop`);if(log&&btn)log.addEventListener('scroll',()=>{btn.style.display=log.scrollTop>150?'block':'none';});});
// Day divider hover tooltip
document.addEventListener('mouseover',e=>{const dd=e.target.closest('.dd-label');if(!dd)return;const par=dd.closest('.day-div');if(!par||par._tip)return;const dk=par.dataset.day;if(!dk)return;const d=new Date(dk);const full=d.toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
const tip=document.createElement('div');tip.className='dd-tip';tip.textContent=full;
const r=dd.getBoundingClientRect();tip.style.left=(r.left+r.width/2)+'px';tip.style.top=(r.top-32)+'px';
document.body.appendChild(tip);par._tip=tip;
dd.addEventListener('mouseleave',()=>{tip.remove();par._tip=null;},{once:true});});});

function tglSidebar(){const sb=document.getElementById('sidebar');const isMobile=window.innerWidth<=600;if(isMobile){sb.classList.toggle('open');sb.classList.remove('collapsed');}else{sb.classList.toggle('collapsed');}}
// ========== UI HELPERS ==========
let openTray=null;
function tglTray(id,btn){const t=document.getElementById(id);const isOpen=t.classList.contains('show');closeTray();if(!isOpen){t.classList.add('show');btn.classList.add('open');openTray={id,btn};
// Close overlays that could block trays
document.querySelectorAll('.ov.show').forEach(o=>o.classList.remove('show'));}}
function closeTray(){document.querySelectorAll('.tray.show').forEach(t=>t.classList.remove('show'));document.querySelectorAll('.tbtn.open').forEach(b=>b.classList.remove('open'));openTray=null;}
document.addEventListener('click',e=>{if(openTray&&!e.target.closest('.tray-w'))closeTray();});
function showAlert(msg){const d=document.createElement('div');d.className='alert-pop';d.innerHTML=`<div>${msg}</div><button class="hb p" onclick="this.parentElement.remove()">OK</button>`;document.body.appendChild(d);setTimeout(()=>d.remove(),5000);}
function showToast(hdr,body,meta,isPri,streamName,onClick){const z=document.getElementById('toast-zone');const t=document.createElement('div');t.className=`toast${isPri?' pri-toast':''}`;t.innerHTML=`<div class="t-hdr"><span>${esc(hdr)}</span>${streamName?`<span style="opacity:.6">${esc(streamName)}</span>`:''}</div><div class="t-body">${esc(body)}</div>${meta?`<div class="t-meta">${esc(meta)}</div>`:''}`;
if(onClick)t.onclick=()=>{onClick();t.remove();};z.appendChild(t);const dur=isPri?10000:6000;setTimeout(()=>{t.style.animation='tOut .3s forwards';setTimeout(()=>t.remove(),300);},dur);}

// ========== PERSIST ==========
function markSn(id){seen[id]=Math.floor(Date.now()/1e3);sv('gm_v3_lastseen',seen);}
function getUn(id,ts){if(!ts)return 0;return ts>(seen[id]||0)?1:0;}
function appDM(u){appr[u]=true;sv('gm_v3_approved',appr);renderSB();if(cur.type==='all')switchView('all',null);}
function blkDM(u){appr[u]=false;sv('gm_v3_approved',appr);renderSB();}
function isOk(u){return appr[u]===true;}function isPnd(u){return appr[u]===undefined;}
function isGM(gid){return mutedG[gid]===true;}
function tglGM(gid){if(mutedG[gid])delete mutedG[gid];else mutedG[gid]=true;sv('gm_v3_muted',mutedG);renderSB();}
function tglPinChat(id,type,name){if(pinnedChats[id])delete pinnedChats[id];else pinnedChats[id]={type,name,ts:Date.now()};sv('gm_v3_pinchats',pinnedChats);renderSB();}
function saveDraft(mid,v){if(v.trim())drafts[mid]=v;else delete drafts[mid];sessionStorage.setItem('gm_v3_drafts',JSON.stringify(drafts));}
function clrDraft(mid){delete drafts[mid];sessionStorage.setItem('gm_v3_drafts',JSON.stringify(drafts));}
function restDraft(mid){const v=drafts[mid];if(!v)return;const i=document.getElementById(`i-${mid}`);if(i){i.value=v;autoX(i);}}

// ========== PINS — move card to top ==========
function tglPin(mid){const wasP=!!pins[mid];if(wasP){delete pins[mid];sv('gm_v3_pinned',pins);const c=document.getElementById(`m-${mid}`);if(c){c.classList.remove('pinned');c.style.position='';c.style.top='';}}else{pins[mid]=Date.now();sv('gm_v3_pinned',pins);const c=document.getElementById(`m-${mid}`);if(c)c.classList.add('pinned');}
reorderPins();}
function reorderPins(){const log=document.getElementById('log');const pz=log.querySelector('#pin-zone');if(!pz)return;
// Move ALL cards currently in pin zone back to the main log first
const existing=Array.from(pz.querySelectorAll('.card'));
existing.forEach(c=>{c.classList.remove('pinned');log.appendChild(c);});
pz.innerHTML='';
// Now collect the ones that should be pinned
const ids=Object.keys(pins).sort((a,b)=>pins[b]-pins[a]);
let count=0;
ids.forEach(mid=>{const c=document.getElementById(`m-${mid}`);if(c){c.classList.add('pinned');pz.appendChild(c);count++;}});
if(count){const hdr=document.createElement('div');hdr.className='pz-hdr';hdr.textContent='📌 PINNED';pz.insertBefore(hdr,pz.firstChild);pz.classList.add('show');}else{pz.classList.remove('show');}}

// ========== STATUS + SYNC ==========
function findSyncGroup(){const g=G.find(g=>g.name.toLowerCase()==='dispatch');if(g){syncGid=g.id;console.log('Sync channel: Dispatch group',syncGid);syncPoll();}else{console.log('No "Dispatch" group found — shared features disabled');}}

function setStat(s,broadcast){myStat=s;localStorage.setItem('gm_v3_status',s);document.getElementById('statSel').value=s;
const cls=s==='avl'?'stat-avl':s==='bsy'?'stat-bsy':'stat-awy';
const txt=s==='avl'?'Available':s==='bsy'?'Busy':'Away';
document.getElementById('stat-disp').innerHTML=`<span class="stat-b ${cls}">${txt}</span>`;
// Update local team status
teamStatus[myName]={status:s,ts:Date.now()};
renderDBoard();
// Broadcast to sync channel
if(broadcast!==false&&syncGid){const emoji=s==='avl'?'🟢':s==='bsy'?'🔴':'🟡';const label=s==='avl'?'AVAILABLE':s==='bsy'?'BUSY':'AWAY';
// Post readable message to group, with hidden tag at end for parsing
const visMsg=`${emoji} ${myName} — ${label}`;
try{fetch(`https://api.groupme.com/v3/groups/${syncGid}/messages?token=${TK}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:{text:visMsg,source_guid:'d360stat'+Date.now()+Math.random()}})});}catch(e){}}}

async function syncPost(tag,data){if(!syncGid)return;
try{await fetch(`https://api.groupme.com/v3/groups/${syncGid}/messages?token=${TK}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:{text:`[D360:${tag}] ${data}`,source_guid:'d360sync'+Date.now()+Math.random()}})});}catch(e){}}

async function syncPoll(){if(!syncGid)return;
try{const r=await fetch(`https://api.groupme.com/v3/groups/${syncGid}/messages?token=${TK}&limit=50`);const d=await r.json();
if(!d.response?.messages)return;
const msgs=d.response.messages;
// Parse status messages — take the latest per person
const statusMap={};
msgs.forEach(m=>{if(!m.text)return;
const sm=m.text.match(/^\[D360:STATUS\] (.+?)\|(avl|bsy|awy)/);
// Also parse clean format: 🟢 Name — AVAILABLE
const sm2=!sm?m.text.match(/^(🟢|🔴|🟡)\s+(.+?)\s+—\s+(AVAILABLE|BUSY|AWAY)$/):null;
if(sm){const name=sm[1].trim(),stat=sm[2].trim();
if(!statusMap[name]||m.created_at>statusMap[name].ts){statusMap[name]={status:stat,ts:m.created_at};}}
if(sm2){const emoMap={'🟢':'avl','🔴':'bsy','🟡':'awy'};const statMap={'AVAILABLE':'avl','BUSY':'bsy','AWAY':'awy'};
const name=sm2[2].trim(),stat=statMap[sm2[3]]||emoMap[sm2[1]]||'avl';
if(!statusMap[name]||m.created_at>statusMap[name].ts){statusMap[name]={status:stat,ts:m.created_at};}}
// Parse shared sticky notes
const stm=m.text.match(/^\[D360:STICKY\] (.+?)\|(.*)$/);
if(stm){const key=stm[1],text=stm[2];
if(!stickies[key]||m.created_at>(stickies[key].syncTs||0)){stickies[key]={...(stickies[key]||{}),text,syncTs:m.created_at};sv('gm_v3_sticky',stickies);}}
});
// Merge status — keep fresher entries
Object.entries(statusMap).forEach(([name,s])=>{if(!teamStatus[name]||s.ts>(teamStatus[name].ts||0)/1000){teamStatus[name]={status:s.status,ts:s.ts*1000};}});
renderDBoard();
}catch(e){}}

function renderDBoard(){const db=document.getElementById('dboard');const names=Object.keys(teamStatus).sort();
if(!names.length){db.classList.remove('show');return;}db.classList.add('show');
const stLbl={avl:'Available',bsy:'Busy',awy:'Away'};
db.innerHTML='<span class="db-title">Dispatch Board</span>'+names.map(n=>{const s=teamStatus[n];const st=(s.status||'avl').trim();const isMe=n===myName;
return`<span class="db-chip${isMe?' me':''}"><span class="db-dot ${st}"></span><span class="db-name">${esc(n)}</span><span style="font-size:14px;color:var(--t3);margin-left:2px">${stLbl[st]||st}</span></span>`;}).join('');}

// Broadcast shared sticky
function syncSticky(key,text){if(syncGid)syncPost('STICKY',`${key}|${text}`);}


// ========== STICKY NOTES ==========
let stickyOpen=false;
function loadSticky(){const key=cur.type+'-'+(cur.id||'x');const bar=document.getElementById('sticky-bar');const ta=document.getElementById('sticky-text');const sel=document.getElementById('sticky-exp');const btn=document.getElementById('stickyTogBtn');
if(cur.type==='group'||cur.type==='dm'){
btn.style.display='';
const hasNote=stickies[key]?.text;
btn.style.borderColor=hasNote?'rgba(255,204,0,.5)':'';btn.style.background=hasNote?'rgba(255,204,0,.08)':'';
const s=stickies[key];
if(s&&s.exp&&Date.now()>s.exp){archiveSticky(key,s);delete stickies[key];sv('gm_v3_sticky',stickies);}
ta.value=s?.text||'';sel.value=s?.hrs||'0';
// Show bar only if user toggled it open, or if there's an active note
if(stickyOpen){bar.classList.add('show');}else{bar.classList.remove('show');}
renderStickyHist();}else{btn.style.display='none';bar.classList.remove('show');document.getElementById('sticky-hist').classList.remove('show');stickyOpen=false;}}
function toggleStickyBar(){stickyOpen=!stickyOpen;const bar=document.getElementById('sticky-bar');if(stickyOpen){bar.classList.add('show');loadSticky();}else{bar.classList.remove('show');document.getElementById('sticky-hist').classList.remove('show');}}
function saveSticky(){const key=cur.type+'-'+(cur.id||'x');const hrs=parseInt(document.getElementById('sticky-exp').value)||0;
const text=document.getElementById('sticky-text').value;
// Archive previous note if it had content
const prev=stickies[key];
if(prev&&prev.text&&prev.text!==text){stickyHist.push({key,text:prev.text,created:prev.created||Date.now(),saved:Date.now()});if(stickyHist.length>50)stickyHist=stickyHist.slice(-50);sv('gm_v3_stkhist',stickyHist);}
stickies[key]={text,created:Date.now(),hrs,exp:hrs?Date.now()+hrs*36e5:0};sv('gm_v3_sticky',stickies);
syncSticky(key,text);
showToast('📒 Note Saved',text.substring(0,60)||'(empty)','','');renderStickyHist();}
function setStickyExp(){saveSticky();}
function archiveSticky(key,s){stickyHist.push({key,text:s.text,created:s.created,saved:Date.now()});if(stickyHist.length>50)stickyHist=stickyHist.slice(-50);sv('gm_v3_stkhist',stickyHist);}
function toggleStickyHist(){document.getElementById('sticky-hist').classList.toggle('show');renderStickyHist();}
function renderStickyHist(){const el=document.getElementById('sticky-hist');const key=cur.type+'-'+(cur.id||'x');
// Show archived history AND current note
const hist=stickyHist.filter(h=>h.key===key).slice();
const current=stickies[key];
if(current&&current.text){hist.push({key,text:current.text,created:current.created,saved:Date.now(),isCurrent:true});}
if(!hist.length){el.innerHTML='<div style="padding:4px;color:var(--t4);font-size:14px">No notes yet</div>';return;}
el.innerHTML=hist.reverse().map(h=>`<div class="sh-item"><span class="sh-text">${h.isCurrent?'<span style="color:var(--warn);font-size:9px">CURRENT</span> ':''}${esc(h.text)}</span><span class="sh-exp">${new Date(h.saved||h.created).toLocaleDateString()}</span></div>`).join('');}

// ========== TEMPLATES ==========
function renderTplMgr(){document.getElementById('tplMgr').innerHTML=tpls.map((t,i)=>`<div style="display:flex;gap:4px;align-items:center;margin-bottom:3px"><span class="tc" style="flex:1;cursor:default">${esc(t)}</span><button class="dl" onclick="tpls.splice(${i},1);sv('gm_v3_tpl',tpls);renderTplMgr();renderTplBar()">×</button></div>`).join('');renderTplBar();}
function addTpl(){const v=document.getElementById('tplNew').value.trim();if(!v)return;tpls.push(v);sv('gm_v3_tpl',tpls);document.getElementById('tplNew').value='';renderTplMgr();}
function renderTplBar(){const bar=document.getElementById('tpl-bar');if(!cur.id&&cur.type!=='stream'){bar.classList.remove('show');return;}bar.classList.add('show');
bar.innerHTML=tpls.map(t=>`<span class="tc" onclick="useTpl(this)" data-t="${esc(t)}">${esc(t)}<span class="cp" onclick="event.stopPropagation();cpTpl('${esc(t)}',this)" title="Copy to clipboard">📄</span></span>`).join('')+`<span class="tc-add" onclick="toggleCfg()">+ Edit</span>`;}
function useTpl(el){document.getElementById('gIn').value=el.dataset.t;document.getElementById('gIn').focus();}
function cpTpl(t,el){navigator.clipboard?.writeText(t).then(()=>{el.textContent='✅';el.classList.add('copied');setTimeout(()=>{el.textContent='📄';el.classList.remove('copied');},1200);}).catch(()=>{});}

// ========== ALERT WORDS ==========
function renderAlertMgr(){document.getElementById('alertMgr').innerHTML=alertWords.map((w,i)=>`<div style="display:flex;gap:4px;align-items:center;margin-bottom:3px"><span class="tc" style="flex:1;cursor:default;color:var(--dg)">${esc(w)}</span><button class="dl" onclick="alertWords.splice(${i},1);sv('gm_v3_alerts',alertWords);renderAlertMgr()">×</button></div>`).join('');}
function addAlert(){const v=document.getElementById('alertNew').value.trim();if(!v)return;alertWords.push(v.toLowerCase());sv('gm_v3_alerts',alertWords);document.getElementById('alertNew').value='';renderAlertMgr();}
function checkAlerts(m){if(!m.text||!alertWords.length)return false;const t=m.text.toLowerCase();return alertWords.some(w=>t.includes(w.toLowerCase()));}

// ========== AUDIO ==========
let actx=null;function getC(){if(!actx)actx=new(window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume();return actx;}
const SN={radar(c){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(800,c.currentTime);o.frequency.linearRampToValueAtTime(1400,c.currentTime+.08);o.frequency.linearRampToValueAtTime(800,c.currentTime+.18);g.gain.setValueAtTime(.25,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.35);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+.35);},
chime(c){[523,659].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.2,c.currentTime+i*.1);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+i*.1+.5);o.connect(g).connect(c.destination);o.start(c.currentTime+i*.1);o.stop(c.currentTime+i*.1+.5);});},
click(c){const n=c.sampleRate*.03,b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,10);const s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();f.type='highpass';f.frequency.value=2e3;s.buffer=b;g.gain.setValueAtTime(.3,c.currentTime);s.connect(f).connect(g).connect(c.destination);s.start();},
alert(c){[0,.12].forEach(t=>{const o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=880;g.gain.setValueAtTime(.15,c.currentTime+t);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+t+.08);o.connect(g).connect(c.destination);o.start(c.currentTime+t);o.stop(c.currentTime+t+.08);});},
sonar(c){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(1200,c.currentTime);o.frequency.exponentialRampToValueAtTime(600,c.currentTime+.3);g.gain.setValueAtTime(.2,c.currentTime);g.gain.setValueAtTime(.2,c.currentTime+.05);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.5);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+.5);},
drop(c){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(1800,c.currentTime);o.frequency.exponentialRampToValueAtTime(200,c.currentTime+.15);g.gain.setValueAtTime(.3,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.25);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+.25);}};
function playSn(n){if(isMut||!n)return;try{const c=getC();if(SN[n])SN[n](c);}catch(e){}}
function prevSnd(n){try{const c=getC();if(SN[n])SN[n](c);}catch(e){}}
function selSnd(el){document.querySelectorAll('.sop').forEach(s=>s.classList.remove('sel'));el.classList.add('sel');selSd=el.dataset.sound;}
function toggleMute(){isMut=!isMut;document.getElementById('vb').textContent=isMut?'🔇':'🔊';}
function getSndF(m){const gid=m.group_id;
// DMs — use DM sound setting
if(!gid){if(dmMuted)return null;return dmSound||'chime';}
// Muted groups never
if(isGM(gid))return null;
// If viewing this group directly, use feed sound
if(cur.type==='group'&&cur.id===gid){if(feedMuted)return null;return feedSound||'radar';}
// If in a stream that contains this group, play stream sound
if(cur.type==='stream'){const s=WF[cur.id];if(s&&s.ids.includes(gid))return s.sound||'radar';}
// Check if any toggled-on stream has this group
for(const[n,s]of Object.entries(WF)){if(aToggles.has(n)&&s.ids.includes(gid))return s.sound||'radar';}
// Universal/all_dms views
if(cur.type==='all'){if(feedMuted)return null;return feedSound||'radar';}
if(cur.type==='all_dms'){if(dmMuted)return null;return dmSound||'chime';}
// All Notifications mode — play feed sound for any group message
if(allNotif){if(feedMuted)return null;return feedSound||'radar';}
// Otherwise no sound
return null;}

// ========== UTIL ==========
function autoX(el){el.style.height='auto';el.style.height=el.scrollHeight+'px';}
function bKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendBcast();}}
function setCon(on){isOn=on;document.getElementById('cs').innerHTML=`<span class="sd ${on?'on':'off'}"></span>${on?'Live':'Off'}`;}
function fT(ts){const d=new Date(ts*1e3),n=new Date(),t=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});if(d.toDateString()===n.toDateString())return t;const y=new Date(n);y.setDate(y.getDate()-1);if(d.toDateString()===y.toDateString())return`Yest ${t}`;return`${d.toLocaleDateString([],{month:'short',day:'numeric'})} ${t}`;}
function tAgo(ts){const d=Math.floor(Date.now()/1e3)-ts;if(d<60)return'now';if(d<3600)return Math.floor(d/60)+'m';if(d<86400)return Math.floor(d/3600)+'h';return Math.floor(d/864e2)+'d';}
function esc(t){if(!t)return'';const d=document.createElement('div');d.textContent=t;return d.innerHTML;}
function openLB(s){document.getElementById('lbImg').src=s;document.getElementById('lightbox').style.display='flex';}
// ========== DAY DIVIDERS ==========
function dayKey(ts){const d=new Date(ts*1e3);return d.toDateString();}
function dayLabel(ts){const d=new Date(ts*1e3);const now=new Date();const y=new Date();y.setDate(y.getDate()-1);
if(d.toDateString()===now.toDateString())return{short:'Today',long:d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'})};
if(d.toDateString()===y.toDateString())return{short:'Yesterday',long:d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'})};
return{short:d.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'}),long:d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric',year:'numeric'})};}
function mkDayDiv(ts){const lb=dayLabel(ts);const d=document.createElement('div');d.className='day-div';d.dataset.day=dayKey(ts);d.innerHTML=`<span class="dd-line"></span><span class="dd-label">${lb.short}</span><span class="dd-line"></span>`;return d;}
function showDayCue(ts){const lb=dayLabel(ts);const cue=document.getElementById('day-cue');cue.querySelector('.dc-day').textContent=lb.short;cue.querySelector('.dc-date').textContent=lb.long;cue.classList.add('show');clearTimeout(dayCueTmr);dayCueTmr=setTimeout(()=>{/* scroll handler will manage visibility from here */},2000);}
function insertDayDiv(log,ts,prepend){const dk=dayKey(ts);if(!log.querySelector(`.day-div[data-day="${dk}"]`)){const div=mkDayDiv(ts);if(prepend)log.insertBefore(div,log.querySelector('.card')||null);else log.appendChild(div);}}

function resN(uid){if(uid===myId)return'You';for(const g of G){const m=g.members?.find(x=>x.user_id===uid);if(m)return m.nickname;}const dm=D.find(d=>d.other_user?.id===uid);if(dm)return dm.other_user.name;return null;}
function getAv(m){const u=m.avatar_url;if(u)return`<img class="av" src="${u}.avatar" onerror="this.style.display='none';this.nextSibling.style.display='flex'"><div class="avp" style="display:none">${esc((m.name||'?')[0])}</div>`;return`<div class="avp">${esc((m.name||'?')[0])}</div>`;}
function toggleTheme(){document.body.classList.toggle('light');const l=document.body.classList.contains('light');const tb=document.getElementById('thb');if(tb){const ico=tb.querySelector('.ico');if(ico)ico.textContent=l?'☀️':'🌙';}localStorage.setItem('gm_v3_theme',l?'light':'dark');}
function toggleCompact(){document.body.classList.toggle('compact');localStorage.setItem('gm_v3_compact',document.body.classList.contains('compact')?'1':'0');}
function toggleLayout(){const isP=!document.body.classList.contains('landscape');document.body.classList.toggle('landscape',isP);document.body.classList.toggle('portrait',!isP);const lb=document.getElementById('layBtn');if(lb){const ico=lb.querySelector('.ico');if(ico)ico.textContent=isP?'⬓':'⬒';}localStorage.setItem('gm_v3_layout',isP?'landscape':'portrait');}
function toggleInputBottom(){inputBottom=!inputBottom;document.body.classList.toggle('input-bottom',inputBottom);localStorage.setItem('gm_v3_inputbot',inputBottom?'1':'0');
const ib=document.getElementById('ibBtn');if(ib)ib.style.color=inputBottom?'var(--a)':'';
if(inputBottom){const log=document.getElementById('log');log.scrollTop=log.scrollHeight;}}
function toggleOldestFirst(){oldestFirst=!oldestFirst;localStorage.setItem('gm_v3_oldest',oldestFirst?'1':'0');
const ob=document.getElementById('ofBtn');if(ob){ob.style.color=oldestFirst?'var(--a)':'';ob.querySelector('.ico').textContent=oldestFirst?'↓':'↑';}
switchView(cur.type,cur.id);}

// ========== MULTI-PANEL ==========
let activePanel=0;
function handleNav(type,id,e){
if(e&&e.shiftKey){openPanel(type,id);return;}
switchView(type,id);}
function maxPanels(){const sb=document.getElementById('sidebar');return sb.classList.contains('collapsed')?3:2;}
function setActivePanel(slot){
activePanel=slot;
document.querySelectorAll('.panel-hdr').forEach((h,i)=>{
h.style.borderBottom=i===slot?'2px solid var(--warn)':'1px solid var(--bd)';
h.style.background=i===slot?'rgba(255,204,0,.08)':'var(--card)';});}
function openPanel(type,id){
// Fill slots sequentially: 1 first, then 2
let slot=null;
if(!panels[1])slot=1;
else if(!panels[2]&&maxPanels()>=3)slot=2;
else{// All slots full — replace the non-active secondary panel, or slot 1
slot=panels[2]&&activePanel!==2?2:1;}
panels[slot]={type,id};panelKnown[slot]=new Map();panelVAt[slot]=0;
const p=document.getElementById(`panel-${slot}`);p.style.display='flex';
const t=getPanelTitle(type,id);
document.getElementById(`ptitle-${slot}`).textContent=t;
loadPanelHist(slot);
setActivePanel(slot);
// Show close on panel-0 if multi
document.querySelector('#panel-0 .panel-close').style.display='flex';
// Update panel-0 title too
document.getElementById('ptitle-0').textContent=getPanelTitle(cur.type,cur.id);}
function getPanelTitle(type,id){
if(type==='group')return G.find(g=>g.id===id)?.name||'Group';
if(type==='dm'){const dm=D.find(d=>d.other_user?.id===id);return dm?.other_user?.name||resN(id)||'DM';}
if(type==='stream')return id;
if(type==='all')return'Universal Feed';
if(type==='all_dms')return'Direct Comms';
return'—';}
function closePanel(slot){
if(slot===0){panels[1]=null;panels[2]=null;
document.getElementById('panel-1').style.display='none';
document.getElementById('panel-2').style.display='none';
document.querySelector('#panel-0 .panel-close').style.display='none';
setActivePanel(0);return;}
panels[slot]=null;document.getElementById(`panel-${slot}`).style.display='none';
if(!panels[1]&&!panels[2]){document.querySelector('#panel-0 .panel-close').style.display='none';setActivePanel(0);}
else setActivePanel(panels[1]?1:0);}
async function loadPanelHist(slot){const p=panels[slot];if(!p)return;const log=document.getElementById(`plog-${slot}`);log.innerHTML='<div class="spin"></div>';
let pool=[];try{
if(p.type==='group'){const r=await fetch(`https://api.groupme.com/v3/groups/${p.id}/messages?token=${TK}&limit=30`);const d=await r.json();pool=d.response?.messages||[];}
else if(p.type==='dm'){const r=await fetch(`https://api.groupme.com/v3/direct_messages?token=${TK}&other_user_id=${p.id}&limit=30`);const d=await r.json();pool=d.response?.direct_messages||[];}
else if(p.type==='all'){const rs=await Promise.all(G.slice(0,6).map(g=>fetch(`https://api.groupme.com/v3/groups/${g.id}/messages?token=${TK}&limit=4`).then(r=>r.json()).catch(()=>null)));rs.forEach(d=>{if(d?.response)pool=pool.concat(d.response.messages);});}
}catch(e){}
log.innerHTML='';pool.sort((a,b)=>oldestFirst?(a.created_at-b.created_at):(b.created_at-a.created_at));
pool.forEach(m=>{if(panelKnown[slot].has(m.id))return;panelKnown[slot].set(m.id,true);
const isDm=!m.group_id,isSelf=(m.user_id||m.sender_id)===myId;
const card=document.createElement('div');card.className=`card ${isSelf?'self':''} ${isDm?'dmc':''}`;
card.innerHTML=`<div class="ch"><span class="sr ${isDm?'dms':''}">${getAv(m)} ${esc(m.name?.toUpperCase())}</span><span class="me"><span>${fT(m.created_at)}</span></span></div><div class="cb">${esc(m.text)}</div>`;
log.appendChild(card);});
panelVAt[slot]=pool.length?Math.max(...pool.map(m=>m.created_at)):Math.floor(Date.now()/1e3);
if(!pool.length)log.innerHTML='<div class="empty"><div class="ei">◇</div><div class="el">No messages</div></div>';
if(oldestFirst)log.scrollTop=log.scrollHeight;}
async function sendPanel(slot){const p=panels[slot];if(!p)return;const inp=document.getElementById(`pIn-${slot}`);const txt=inp.value.trim();if(!txt)return;
await sendTo(p.type==='dm'?'dm':'group',p.id,txt);inp.value='';setTimeout(()=>pollPanel(slot),500);}
async function pollPanel(slot){const p=panels[slot];if(!p)return;let nm=[];try{
if(p.type==='group'){const r=await fetch(`https://api.groupme.com/v3/groups/${p.id}/messages?token=${TK}&limit=5`);const d=await r.json();if(d.response)nm=d.response.messages;}
else if(p.type==='dm'){const r=await fetch(`https://api.groupme.com/v3/direct_messages?token=${TK}&other_user_id=${p.id}&limit=5`);const d=await r.json();if(d.response)nm=d.response.direct_messages;}
}catch(e){}
const log=document.getElementById(`plog-${slot}`);
nm.sort((a,b)=>a.created_at-b.created_at).forEach(m=>{if(panelKnown[slot].has(m.id)||m.created_at<panelVAt[slot])return;panelKnown[slot].set(m.id,true);
const isDm=!m.group_id,isSelf=(m.user_id||m.sender_id)===myId;
const card=document.createElement('div');card.className=`card ${isSelf?'self':''} ${isDm?'dmc':''}`;
card.innerHTML=`<div class="ch"><span class="sr ${isDm?'dms':''}">${getAv(m)} ${esc(m.name?.toUpperCase())}</span><span class="me"><span>${fT(m.created_at)}</span></span></div><div class="cb">${esc(m.text)}</div>`;
if(oldestFirst){log.appendChild(card);log.scrollTop=log.scrollHeight;}else{log.insertBefore(card,log.querySelector('.card')||null);}});}
if(localStorage.getItem('gm_v3_theme')==='light')document.body.classList.add('light');
if(localStorage.getItem('gm_v3_compact')==='1')document.body.classList.add('compact');
if(localStorage.getItem('gm_v3_layout')==='landscape')document.body.classList.add('landscape');
if(localStorage.getItem('gm_v3_inputbot')==='1')document.body.classList.add('input-bottom');
if(localStorage.getItem('gm_v3_oldest')==='1')document.body.classList.add('oldest-first');
function sendNot(ti,bo){if(Notification.permission==='granted'&&document.hidden)new Notification(ti,{body:bo});}
function initEP(){const h=EMO.map(e=>`<button onclick="insEmo(this,'${e}')">${e}</button>`).join('');document.querySelectorAll('.ep').forEach(p=>p.innerHTML=h);}
function toggleEP(id){document.querySelectorAll('.ep.show').forEach(p=>{if(p.id!==id)p.classList.remove('show')});document.getElementById(id).classList.toggle('show');}
document.addEventListener('click',e=>{if(!e.target.closest('.ep')&&!e.target.closest('.et')){document.querySelectorAll('.ep.show').forEach(p=>p.classList.remove('show'));}});
function insEmo(btn,em){btn.closest('.ep').classList.remove('show');const inp=btn.closest('#bb')?.querySelector('.rin')||btn.closest('.ca')?.querySelector('.rin')||document.getElementById('gIn');if(inp){inp.value+=em;inp.focus();}}
async function handleImg(inp){const f=inp.files?.[0];if(!f)return;try{const r=await fetch('https://image.groupme.com/pictures',{method:'POST',headers:{'X-Access-Token':TK,'Content-Type':f.type},body:f});const d=await r.json();if(d.payload?.url){pendImg=d.payload.url;document.getElementById('gIn').placeholder='📷 Image ready...';}}catch(e){}inp.value='';}

// Click on sender name → open DM
function openDM(uid){if(uid===myId)return;const existing=D.find(d=>d.other_user?.id===uid);if(existing){switchView('dm',uid);}else{switchView('dm',uid);}}

// ========== SEARCH — cached ==========
function toggleSearch(){const o=document.getElementById('searchOv');o.classList.toggle('show');document.getElementById('searchBtn').classList.toggle('active-panel',o.classList.contains('show'));if(o.classList.contains('show'))document.getElementById('searchIn').focus();else{document.getElementById('searchIn').value='';document.getElementById('searchRes').innerHTML='';}}
let searchTimer=null;
function doSearch(q){clearTimeout(searchTimer);const r=document.getElementById('searchRes');if(q.length<2){r.innerHTML='';return;}
searchTimer=setTimeout(()=>runSearch(q),250);}
async function runSearch(q){const r=document.getElementById('searchRes');const ql=q.toLowerCase();
// Local cache results
let res=searchIdx.filter(m=>m.text?.toLowerCase().includes(ql)).map(m=>({...m}));
// For number queries (esp 6-digit order numbers), also search API
const isNum=/^\d{4,}$/.test(q.trim());
if(isNum||res.length<5){r.innerHTML=res.length?renderSR(res,q)+'<div class="spin" style="margin:6px auto"></div>':'<div class="spin"></div>';
try{const fetches=G.slice(0,12).map(g=>fetch(`https://api.groupme.com/v3/groups/${g.id}/messages?token=${TK}&limit=${isNum?40:15}`).then(r=>r.json()).catch(()=>null));
const results=await Promise.all(fetches);results.forEach(d=>{if(d?.response?.messages)d.response.messages.forEach(m=>{if(m.text?.toLowerCase().includes(ql)&&!res.find(x=>x.id===m.id)){const gn=G.find(g=>g.id===m.group_id)?.name||'?';res.push({...m,_gn:gn,_type:'group',_tid:m.group_id});idxMsg(m);}});});}catch(e){}}
res.sort((a,b)=>b.created_at-a.created_at);
r.innerHTML=res.length?renderSR(res.slice(0,40),q):'<div style="color:var(--t3);text-align:center;padding:20px;font-size:15px">No results</div>';}
function renderSR(res,q){const re=new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'gi');
return res.map(m=>{const hl=(m.text||'').substring(0,100).replace(re,'<mark style="background:var(--ad);color:var(--a);border-radius:2px;padding:0 1px">$1</mark>');
return`<div style="padding:8px;border-bottom:1px solid var(--bd2);cursor:pointer;transition:.12s" onmouseover="this.style.background='rgba(128,128,128,.1)'" onmouseout="this.style.background=''" onclick="toggleSearch();switchView('${m._type||'group'}','${m._tid||m.group_id}')"><div style="font-size:14px;color:var(--a);font-family:ui-monospace,monospace">${esc(m.name)} · ${esc(m._gn||'')}</div><div style="font-size:14px;margin-top:2px">${hl}</div><div style="font-size:15px;color:var(--t3);margin-top:2px">${fT(m.created_at)}</div></div>`;}).join('');}
function idxMsg(m){if(m.text&&!searchIdx.find(x=>x.id===m.id)){const gn=G.find(g=>g.id===m.group_id)?.name||'DM';searchIdx.push({...m,_gn:gn,_type:m.group_id?'group':'dm',_tid:m.group_id||(m.user_id===myId?m.recipient_id:m.user_id)});if(searchIdx.length>2000)searchIdx=searchIdx.slice(-1500);}}

// ========== CONTACTS ==========
function showContacts(){document.getElementById('contactOv').classList.add('show');buildCon('');}
function hideContacts(){document.getElementById('contactOv').classList.remove('show');}
function filterCon(q){buildCon(q);}
function buildCon(q){const mb={};G.forEach(g=>{(g.members||[]).forEach(m=>{if(!mb[m.user_id])mb[m.user_id]={name:m.nickname,groups:[],uid:m.user_id};mb[m.user_id].groups.push(g.name);});});
let list=Object.values(mb);if(q)list=list.filter(m=>m.name.toLowerCase().includes(q.toLowerCase()));list.sort((a,b)=>a.name.localeCompare(b.name));
document.getElementById('conList').innerHTML=list.map(m=>{const gShown=m.groups.slice(0,4).map(g=>esc(g)).join(', ');const extra=m.groups.length>4?` <span style="color:var(--a);cursor:pointer" onclick="event.stopPropagation();this.textContent=', ${m.groups.slice(4).map(g=>esc(g)).join(', ')}'" title="Show all">+${m.groups.length-4} more</span>`:'';return`<div class="cd-i" onclick="hideContacts();openDM('${m.uid}')"><div style="flex:1;min-width:0"><div class="cd-n">${esc(m.name)}</div><div class="cd-g">${gShown}${extra}</div></div><div style="display:flex;align-items:center;gap:4px"><span style="font-size:12px;color:var(--t3)">${m.groups.length}g</span><span style="font-size:14px;color:var(--dm)" title="DM">💬</span></div></div>`;}).join('')||'<div style="color:var(--t3);text-align:center;padding:16px;font-size:14px">No contacts</div>';}

// ========== MEMBERS VIEWER ==========
let currentMembers=[];
function showMembers(){
const ov=document.getElementById('membersOv');ov.classList.add('show');document.getElementById('membersBtn').classList.add('active-panel');
document.getElementById('memSearch').value='';
currentMembers=[];
// Determine context: group, stream, or all
if(cur.type==='group'){
const g=G.find(x=>x.id===cur.id);
document.getElementById('membersTitle').textContent=`Members — ${g?.name||'Group'}`;
document.getElementById('membersSub').textContent=`${g?.members?.length||0} members`;
currentMembers=(g?.members||[]).map(m=>({name:m.nickname,uid:m.user_id,avatar:m.image_url,roles:m.roles||[]}));
}else if(cur.type==='stream'){
const s=WF[cur.id];if(!s){document.getElementById('membersTitle').textContent='No stream selected';return;}
document.getElementById('membersTitle').textContent=`Stream — ${cur.id.toUpperCase()}`;
const gNames=s.ids.map(gid=>G.find(g=>g.id===gid)?.name).filter(Boolean);
document.getElementById('membersSub').textContent=`Groups: ${gNames.join(', ')}`;
const seen=new Set();
s.ids.forEach(gid=>{const g=G.find(x=>x.id===gid);(g?.members||[]).forEach(m=>{if(!seen.has(m.user_id)){seen.add(m.user_id);currentMembers.push({name:m.nickname,uid:m.user_id,avatar:m.image_url,roles:m.roles||[],group:g.name});}});});
}else if(cur.type==='dm'){
const dm=D.find(d=>d.other_user?.id===cur.id);
document.getElementById('membersTitle').textContent='Direct Message';
document.getElementById('membersSub').textContent='';
if(dm)currentMembers=[{name:dm.other_user.name,uid:dm.other_user.id,avatar:dm.other_user.avatar_url,roles:[]}];
}else{
document.getElementById('membersTitle').textContent='All Members';
const mb={};G.forEach(g=>{(g.members||[]).forEach(m=>{if(!mb[m.user_id])mb[m.user_id]={name:m.nickname,uid:m.user_id,avatar:m.image_url,roles:m.roles||[]};});});
currentMembers=Object.values(mb);
document.getElementById('membersSub').textContent=`${currentMembers.length} across all groups`;
}
currentMembers.sort((a,b)=>a.name.localeCompare(b.name));
renderMembers(currentMembers);}
function hideMembers(){document.getElementById('membersOv').classList.remove('show');document.getElementById('membersBtn').classList.remove('active-panel');}
function filterMembers(q){const ql=q.toLowerCase();const filtered=currentMembers.filter(m=>m.name.toLowerCase().includes(ql));renderMembers(filtered);}
function renderMembers(list){
document.getElementById('memList').innerHTML=list.map(m=>{
const av=m.avatar?`<img src="${m.avatar}.avatar" onerror="this.style.display='none';this.nextSibling.style.display='flex'">`:'';
const initFallback=`<div class="mem-av" style="${m.avatar?'display:none':''}">${esc((m.name||'?')[0])}</div>`;
const avHtml=m.avatar?`<div class="mem-av" style="padding:0;overflow:hidden">${av}${initFallback}</div>`:initFallback;
const isSelf=m.uid===myId;
const role=m.roles?.includes('admin')?'Admin':m.group?m.group:'Member';
return`<div class="mem-item"><div class="mem-av"${m.avatar?' style="padding:0;overflow:hidden"':''}>${m.avatar?`<img src="${m.avatar}.avatar" onerror="this.parentElement.innerHTML='${esc((m.name||'?')[0])}'">`:esc((m.name||'?')[0])}</div><div class="mem-info"><div class="mem-name">${esc(m.name)}${isSelf?' <span style="color:var(--a);font-size:10px">YOU</span>':''}</div><div class="mem-role">${role}</div></div>${!isSelf?`<button class="mem-action" onclick="hideMembers();openDM('${m.uid}')">Message</button>`:''}</div>`;
}).join('')||'<div style="color:var(--t3);text-align:center;padding:20px">No members found</div>';}

// ========== AD-HOC & SHIFT CHANGE ==========
function showAdhoc(){document.getElementById('adhocM').classList.add('show');document.getElementById('adhocG').innerHTML=G.sort((a,b)=>a.name.localeCompare(b.name)).map(g=>`<label style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:14px;color:var(--t2);cursor:pointer"><input type="checkbox" value="${g.id}" style="accent-color:var(--a)"> ${esc(g.name)}</label>`).join('');}
async function sendAdhoc(){const ids=Array.from(document.querySelectorAll('#adhocG input:checked')).map(i=>i.value);const txt=document.getElementById('adhocMsg').value.trim();if(!ids.length||!txt)return;for(const gid of ids)await sendTo('group',gid,txt);document.getElementById('adhocMsg').value='';document.getElementById('adhocM').classList.remove('show');setTimeout(poll,500);}
function showShiftChange(){document.getElementById('shiftM').classList.add('show');document.getElementById('shiftOff').value=myName;
let html='<div style="font-size:14px;color:var(--a);font-family:ui-monospace,monospace;font-weight:700;margin-bottom:4px;letter-spacing:1px">GROUPS</div>';
html+=G.sort((a,b)=>a.name.localeCompare(b.name)).map(g=>`<label style="display:flex;align-items:center;gap:4px;margin-bottom:3px;font-size:14px;color:var(--t2);cursor:pointer"><input type="checkbox" value="g:${g.id}" style="accent-color:var(--a)"> ${esc(g.name)}</label>`).join('');
const sk=Object.keys(WF).sort();if(sk.length){html+='<div style="font-size:14px;color:var(--a);font-family:ui-monospace,monospace;font-weight:700;margin:6px 0 4px;letter-spacing:1px">STREAMS</div>';
html+=sk.map(n=>`<label style="display:flex;align-items:center;gap:4px;margin-bottom:3px;font-size:14px;color:var(--t2);cursor:pointer"><input type="checkbox" value="s:${n}" style="accent-color:var(--a)"> ▸ ${esc(n.toUpperCase())}</label>`).join('');}
const dmOk=D.filter(c=>isOk(c.other_user?.id));if(dmOk.length){html+='<div style="font-size:14px;color:var(--dm);font-family:ui-monospace,monospace;font-weight:700;margin:6px 0 4px;letter-spacing:1px">DMs</div>';
html+=dmOk.map(c=>`<label style="display:flex;align-items:center;gap:4px;margin-bottom:3px;font-size:14px;color:var(--dm);cursor:pointer"><input type="checkbox" value="d:${c.other_user.id}" style="accent-color:var(--dm)"> ${esc(c.other_user.name)}</label>`).join('');}
document.getElementById('shiftGroups').innerHTML=html;}
async function sendShiftChange(){const checks=Array.from(document.querySelectorAll('#shiftGroups input:checked')).map(i=>i.value);const off=document.getElementById('shiftOff').value.trim();const on=document.getElementById('shiftOn').value.trim();const ph=document.getElementById('shiftPhone').value.trim();if(!checks.length||!on){showAlert('Please select targets and enter incoming dispatcher name.');return;}
const msg=`📋 SHIFT CHANGE\n${off} is going off shift.\n${on} is now on dispatch${ph?` — ${ph}`:''}.`;
for(const v of checks){const[type,id]=v.split(':');if(type==='g')await sendTo('group',id,msg);else if(type==='d')await sendTo('dm',id,msg);else if(type==='s'){const s=WF[id];if(s)for(const gid of s.ids)await sendTo('group',gid,msg);}}
document.getElementById('shiftM').classList.remove('show');showAlert('Shift change sent ✓');setTimeout(poll,500);}

// ========== FORWARD ==========
function showFwd(mid,text,sender){fwdMsg={mid,text,sender};const fl=document.getElementById('fwdL');fl.innerHTML=G.sort((a,b)=>a.name.localeCompare(b.name)).map(g=>`<div class="fwd-i" onclick="doFwd('group','${g.id}')">${esc(g.name)}</div>`).join('')+D.filter(c=>isOk(c.other_user?.id)).map(c=>`<div class="fwd-i" onclick="doFwd('dm','${c.other_user.id}')" style="color:var(--dm)">${esc(c.other_user.name)}</div>`).join('');document.getElementById('fwdM').classList.add('show');}
async function doFwd(type,tid){if(!fwdMsg)return;await sendTo(type,tid,`[FWD from ${fwdMsg.sender}]: ${fwdMsg.text}`);document.getElementById('fwdM').classList.remove('show');fwdMsg=null;setTimeout(poll,500);}

// ========== EXPORT / SHIFT LOG ==========
function exportChat(){const cards=document.querySelectorAll('#log .card');if(!cards.length){showAlert('No messages to export');return;}
let lines=[];cards.forEach(c=>{const sr=c.querySelector('.sr')?.textContent?.trim()||'';const ts=c.querySelector('.me')?.textContent?.trim()||'';const body=c.querySelector('.cb')?.textContent?.trim()||'';lines.push(`[${ts}] ${sr}: ${body}`);});
const blob=new Blob([lines.join('\n')],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`d360_export_${new Date().toISOString().slice(0,10)}.txt`;a.click();}
function logShift(){const now=new Date();let log=`=== DELTA 360 SHIFT LOG ===\nTime: ${now.toLocaleString()}\nOperator: ${myName}\nStatus: ${myStat}\nView: ${document.getElementById('htitle').textContent}\n\n--- ACTIVE ---\n`;
G.filter(g=>{const ts=g.messages?.last_message_created_at;return ts&&(Math.floor(Date.now()/1e3)-ts)<21600;}).forEach(g=>{log+=`${g.name} (${tAgo(g.messages.last_message_created_at)})\n`;});
log+='\n--- PINNED ---\n';Object.keys(pins).forEach(mid=>{const c=document.getElementById(`m-${mid}`);if(c)log+=`${c.querySelector('.cb')?.textContent?.trim()?.substring(0,80)}\n`;});
log+='\n--- NOTES ---\n';Object.entries(stickies).filter(([,v])=>v?.text).forEach(([k,v])=>{log+=`[${k}]: ${v.text}\n`;});
const blob=new Blob([log],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`shift_${now.toISOString().slice(0,16).replace(/:/g,'')}.txt`;a.click();}

// ========== DATA ==========
async function rfData(){try{const[gr,dr]=await Promise.all([fetch(`https://api.groupme.com/v3/groups?token=${TK}&per_page=100`).then(r=>r.json()),fetch(`https://api.groupme.com/v3/chats?token=${TK}&per_page=50`).then(r=>r.json())]);G=gr.response||[];D=dr.response||[];renderSB();}catch(e){setCon(false);}}

// ========== SIDEBAR ==========
function renderSB(){document.getElementById('nAll').className=`ci ${cur.type==='all'?'ac':''}`;document.getElementById('nDms').className=`ci ${cur.type==='all_dms'?'acd':''}`;
const sl=document.getElementById('sL');sl.innerHTML='';const sk=Object.keys(WF).sort();document.getElementById('sCn').textContent=sk.length||'';
const sI={radar:'📡',chime:'🔔',click:'🔘',alert:'🚨',sonar:'🎯',drop:'💧'};
sk.forEach(n=>{const s=WF[n],ic=sI[s.sound]||'📡';const d=document.createElement('div');d.className=`ci ${cur.type==='stream'&&cur.id===n?'ac':''}`;d.innerHTML=`<div onclick="handleNav('stream','${esc(n)}',event)" style="flex:1;cursor:pointer;display:flex;align-items:center;gap:3px"><span>▸ ${esc(n.toUpperCase())}</span><span style="font-size:15px;color:var(--t3);cursor:pointer" onclick="event.stopPropagation();prevSnd('${s.sound||'radar'}')">${ic}</span></div><div style="display:flex;align-items:center;gap:3px"><label class="sw" onclick="event.stopPropagation()"><input type="checkbox" ${aToggles.has(n)?'checked':''} onchange="tglMulti('${esc(n)}')"><span class="sl"></span></label><button class="dl" onclick="event.stopPropagation();delStr('${esc(n)}')">×</button></div>`;sl.appendChild(d);});
renderPnd();renderAct();}
function renderPnd(){const pl=document.getElementById('pL'),ps=document.getElementById('pSec');pl.innerHTML='';const pnd=D.filter(c=>isPnd(c.other_user?.id));if(!pnd.length){ps.style.display='none';return;}ps.style.display='flex';document.getElementById('pCn').textContent=pnd.length;
pnd.forEach(c=>{const uid=c.other_user?.id,nm=c.other_user?.name||'?',pv=c.last_message?.text||'';const d=document.createElement('div');d.className='pi';d.style.cursor='pointer';d.innerHTML=`<div style="flex:1;min-width:0"><div style="display:flex;align-items:center"><span class="ppulse"></span><span class="pn">${esc(nm)}</span></div><div class="pp">${esc(pv.substring(0,35))}</div></div><div style="display:flex;gap:2px"><button class="ab ok" onclick="event.stopPropagation();appDM('${uid}')">✓</button><button class="ab no" onclick="event.stopPropagation();blkDM('${uid}')">✕</button></div>`;d.onclick=(e)=>handleNav('dm',uid,e);pl.appendChild(d);});}
function renderAct(){const al=document.getElementById('aL');al.innerHTML='';const il=document.getElementById('iL');il.innerHTML='';const pcL=document.getElementById('pcL');pcL.innerHTML='';const pcSec=document.getElementById('pcSec');const iSec=document.getElementById('iSec');const now=Math.floor(Date.now()/1e3);
const items=[...D.filter(c=>isOk(c.other_user?.id)).map(c=>({type:'dm',ts:c.last_message?.created_at,name:c.other_user?.name||'?',id:c.other_user?.id})),...G.map(g=>({type:'group',ts:g.messages?.last_message_created_at,name:g.name,id:g.id,mt:isGM(g.id)}))];
// Pinned chats
const pIds=Object.keys(pinnedChats);
const pinned=items.filter(i=>pIds.includes(i.id)).sort((a,b)=>(b.ts||0)-(a.ts||0));
const unpinned=items.filter(i=>!pIds.includes(i.id));
if(pinned.length){pcSec.style.display='flex';document.getElementById('pcCn').textContent=pinned.length;
pinned.forEach(i=>{const d=mkChatItem(i,now,true);pcL.appendChild(d);});}else{pcSec.style.display='none';}
const act=unpinned.filter(i=>i.ts&&(now-i.ts)<21600);
if(sortMode==='heat'){
// Sort by heat intensity (messages per hour activity)
act.sort((a,b)=>{const hA=a.ts?Math.max(5,Math.round(100*(1-(now-a.ts)/21600))):0;const hB=b.ts?Math.max(5,Math.round(100*(1-(now-b.ts)/21600))):0;return hB-hA;});
}else{act.sort((a,b)=>b.ts-a.ts);}
const inact=unpinned.filter(i=>!i.ts||(now-i.ts)>=21600).sort((a,b)=>(b.ts||0)-(a.ts||0));
let unr=0;
act.forEach(i=>{const hU=getUn(i.id,i.ts);const isA=cur.id===i.id;if(hU&&!isA)unr++;
const d=mkChatItem(i,now,false);al.appendChild(d);});
document.getElementById('aCn').textContent=unr>0?`${unr} new`:(act.length||'');
if(!act.length)al.innerHTML='<div style="padding:12px;font-size:14px;color:var(--t4);text-align:center">No recent</div>';
if(inact.length){iSec.style.display='flex';document.getElementById('iCn').textContent=inact.length;il.style.display=iaOpen?'block':'none';
inact.forEach(i=>{const d=document.createElement('div');const isA=cur.id===i.id;d.className=`ci ${isA?(i.type==='dm'?'acd':'ac'):''} ${i.type==='dm'&&!isA?'dm-item':''}`;d.style.opacity='.4';d.innerHTML=`<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${esc(i.name)}</span><span style="display:flex;align-items:center;gap:3px"><button class="dl" style="font-size:16px" onclick="event.stopPropagation();tglPinChat('${i.id}','${i.type}','${esc(i.name)}')" title="Pin chat">${pinnedChats[i.id]?'📌':'☆'}</button><span class="ta">${i.ts?tAgo(i.ts):'—'}</span></span>`;d.onclick=(e)=>{handleNav(i.type,i.id,e);document.getElementById('sidebar').classList.remove('open');};il.appendChild(d);});}else iSec.style.display='none';}
function mkChatItem(i,now,isPinned){const d=document.createElement('div');const isA=cur.id===i.id;const hU=getUn(i.id,i.ts);
const heat=i.ts?Math.max(5,Math.round(100*(1-(now-i.ts)/21600))):5;const hC=heat>66?'var(--dg)':heat>33?'var(--warn)':'var(--ok)';
d.className=`ci ${isA?(i.type==='dm'?'acd':'ac'):''} ${i.type==='dm'&&!isA?'dm-item':''}`;
if(isPinned)d.style.borderLeft='2px solid var(--warn)';
d.innerHTML=`<div style="flex:1;min-width:0;${i.mt?'opacity:.4;':''}"><div style="display:flex;align-items:center;gap:3px;overflow:hidden">${isPinned?'<span style="font-size:13px;flex-shrink:0">📌</span>':''}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(i.name)}${i.mt?' 🔇':''}</span>${(hU&&!isA)?`<span class="ud ${i.type==='dm'?'dm':''}"></span>`:''}</div><div class="heatbar" style="width:${heat}%;background:${hC}"></div></div><span style="display:flex;align-items:center;gap:3px"><button class="dl" style="font-size:16px" onclick="event.stopPropagation();tglPinChat('${i.id}','${i.type}','${esc(i.name)}')" title="${isPinned?'Unpin':'Pin'} chat">${isPinned?'📌':'☆'}</button>${i.type==='group'?`<button class="dl" style="font-size:14px" onclick="event.stopPropagation();tglGM('${i.id}')">${i.mt?'🔔':'🔇'}</button>`:''}<span class="ta">${i.ts?tAgo(i.ts):'—'}</span></span>`;
d.onclick=(e)=>{handleNav(i.type,i.id,e);document.getElementById('sidebar').classList.remove('open');};return d;}
function toggleIA(){iaOpen=!iaOpen;document.getElementById('iL').style.display=iaOpen?'block':'none';document.getElementById('iArr').classList.toggle('ia-o',iaOpen);}
function toggleSort(){sortMode=sortMode==='recent'?'heat':'recent';localStorage.setItem('gm_v3_sortmode',sortMode);
const btn=document.getElementById('sortBtn');btn.textContent=sortMode==='recent'?'⏱ Recent':'🔥 Heat';btn.style.color=sortMode==='heat'?'var(--warn)':'var(--t3)';
renderAct();}

// ========== STREAMS ==========
function tglMulti(n){if(aToggles.has(n))aToggles.delete(n);else aToggles.add(n);renderSB();}
function delStr(n){if(confirm(`Delete "${n}"?`)){delete WF[n];sv('gm_v3_royal',WF);aToggles.delete(n);if(cur.type==='stream'&&cur.id===n)switchView('all',null);renderSB();}}
function toggleCfg(){const z=document.getElementById('cfg');const isOpen=z.style.display==='flex';z.style.display=isOpen?'none':'flex';}
function renderGP(){document.getElementById('gPick').innerHTML=G.sort((a,b)=>a.name.localeCompare(b.name)).map(g=>`<label style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:14px;color:var(--t2);cursor:pointer"><input type="checkbox" value="${g.id}" style="accent-color:var(--a)"> ${esc(g.name)}</label>`).join('');}
function saveStream(){const n=document.getElementById('snIn').value.trim();if(!n){showAlert('Please add a stream name.');return;}
const ids=Array.from(document.querySelectorAll('#gPick input:checked')).map(i=>i.value);if(!ids.length){showAlert('Please select at least one group.');return;}
const snd=document.querySelector('.sop.sel')?.dataset.sound||'radar';WF[n]={ids,sound:snd};sv('gm_v3_royal',WF);document.getElementById('snIn').value='';document.querySelectorAll('#gPick input:checked').forEach(i=>i.checked=false);toggleCfg();renderSB();}

// ========== VIEW ==========
async function switchView(type,id){cur={type,id};known.clear();vAt=0;lastDayKey=null;stickyOpen=false;
// Close search if open
const so=document.getElementById('searchOv');if(so.classList.contains('show')){so.classList.remove('show');document.getElementById('searchBtn').classList.remove('active-panel');document.getElementById('searchIn').value='';document.getElementById('searchRes').innerHTML='';}
document.getElementById('log').innerHTML='<div id="pin-zone"><div class="pz-hdr">📌 PINNED</div></div><div class="spin"></div>';
if((type==='group'||type==='dm')&&id)markSn(id);
let t='Dispatch';let isDmView=false;
if(type==='all')t='Universal Feed';else if(type==='all_dms')t='Direct Comms',isDmView=true;else if(type==='stream')t=`Stream: ${id}`;else if(type==='group')t=G.find(g=>g.id===id)?.name||'Group';else if(type==='dm'){const dmC=D.find(d=>d.other_user?.id===id);t=dmC?.other_user?.name||resN(id)||'DM';isDmView=true;}
const htEl=document.getElementById('htitle');
if(isDmView){htEl.innerHTML=`<span style="color:var(--dm)">💬 ${esc(t)}</span>`;}else{htEl.textContent=t;}
document.getElementById('ptitle-0').textContent=t;
setActivePanel(0);
const bi=document.getElementById('gIn');if(type==='group'||type==='dm'){bi.placeholder=`Message ${t}...`;bi.disabled=false;}else if(type==='stream'){bi.placeholder='Broadcast to stream...';bi.disabled=false;}else{bi.placeholder='Select a chat';bi.disabled=true;}
await loadHist();loadSticky();renderTplBar();renderSB();reorderPins();document.getElementById('sidebar').classList.remove('open');}

// ========== HISTORY ==========
async function loadHist(){let pool=[];try{
if(cur.type==='group'){const r=await fetch(`https://api.groupme.com/v3/groups/${cur.id}/messages?token=${TK}&limit=40`);const d=await r.json();pool=d.response?.messages||[];}
else if(cur.type==='dm'){const r=await fetch(`https://api.groupme.com/v3/direct_messages?token=${TK}&other_user_id=${cur.id}&limit=40`);const d=await r.json();pool=d.response?.direct_messages||[];}
else if(cur.type==='stream'){const s=WF[cur.id];if(s){const rs=await Promise.all(s.ids.map(gid=>fetch(`https://api.groupme.com/v3/groups/${gid}/messages?token=${TK}&limit=10`).then(r=>r.json()).catch(()=>null)));rs.forEach(d=>{if(d?.response)pool=pool.concat(d.response.messages);});}}
else if(cur.type==='all'){const rs=await Promise.all(G.slice(0,10).map(g=>fetch(`https://api.groupme.com/v3/groups/${g.id}/messages?token=${TK}&limit=5`).then(r=>r.json()).catch(()=>null)));rs.forEach(d=>{if(d?.response)pool=pool.concat(d.response.messages);});const ad=D.filter(c=>isOk(c.other_user?.id));if(ad.length){const dr=await Promise.all(ad.slice(0,8).map(c=>fetch(`https://api.groupme.com/v3/direct_messages?token=${TK}&other_user_id=${c.other_user.id}&limit=3`).then(r=>r.json()).catch(()=>null)));dr.forEach(d=>{if(d?.response)pool=pool.concat(d.response.direct_messages);});}}
else if(cur.type==='all_dms'){const rs=await Promise.all(D.slice(0,12).map(c=>fetch(`https://api.groupme.com/v3/direct_messages?token=${TK}&other_user_id=${c.other_user.id}&limit=5`).then(r=>r.json()).catch(()=>null)));rs.forEach(d=>{if(d?.response)pool=pool.concat(d.response.direct_messages);});}
}catch(e){}
// Remove spinner, keep pin zone
document.querySelectorAll('#log .spin, #log .empty').forEach(e=>e.remove());
lastDayKey=null;
const sorted=pool.sort((a,b)=>oldestFirst?(a.created_at-b.created_at):(b.created_at-a.created_at));
sorted.forEach(m=>{const dk=dayKey(m.created_at);if(lastDayKey&&dk!==lastDayKey)insertDayDiv(document.getElementById('log'),m.created_at,false);lastDayKey=dk;handleMsg(m,false);});
vAt=pool.length?Math.max(...pool.map(m=>m.created_at)):Math.floor(Date.now()/1e3);
if(oldestFirst){const log=document.getElementById('log');setTimeout(()=>{log.scrollTop=log.scrollHeight;setTimeout(()=>log.scrollTop=log.scrollHeight,100);},50);}
if(!pool.length){const em=document.createElement('div');em.className='empty';em.innerHTML='<div class="ei">◇</div><div class="el">No messages</div>';document.getElementById('log').appendChild(em);}}

// ========== RENDER ==========
function bldLk(fb){if(!fb?.length)return'';const n=fb.map(uid=>resN(uid)).filter(Boolean);if(!n.length)return'';return`<div class="lr"><span class="ll">👍 ${n.map(x=>esc(x)).join(', ')}</span></div>`;}
function updLk(m){const c=document.getElementById(`m-${m.id}`);if(!c)return;const b=c.querySelector('.lk');if(!b)return;const cnt=m.favorited_by?.length||0;b.classList.toggle('on',!!m.favorited_by?.includes(myId));b.innerHTML=`👍${cnt>0?`<span class="lc">${cnt}</span>`:''}`;let lr=c.querySelector('.lr');const h=bldLk(m.favorited_by);if(cnt>0){if(lr)lr.outerHTML=h;else{const ca=c.querySelector('.ca');if(ca)ca.insertAdjacentHTML('beforebegin',h);}}else if(lr)lr.remove();}

function handleMsg(m,isNew=true){
if(known.has(m.id)){updLk(m);return;}known.set(m.id,true);idxMsg(m);
const isDm=!m.group_id,isSelf=(m.user_id||m.sender_id)===myId;
const c=document.createElement('div');c.id=`m-${m.id}`;c.className=`card ${isSelf?'self':''} ${isDm?'dmc':''} ${pins[m.id]?'pinned':''}`;
// Fix reply names — look up from attachments
const ra=m.attachments?.find(a=>a.type==='reply');let rb='';
if(ra){const rname=resN(ra.user_id)||ra.user_name||'someone';rb=`<div class="rb ${isDm?'dmrb':''}" onclick="jumpTo('${ra.reply_id}')">↩ <span class="rn">${esc(rname)}</span></div>`;}
let dt='';if(isDm){let rn='';if(isSelf){const ch=D.find(d=>d.other_user?.id===m.recipient_id);rn=ch?.other_user?.name||'?';}else rn='You';dt=`<span class="dt">→ ${esc(rn)}</span>`;}
const imgs=(m.attachments||[]).filter(a=>a.type==='image'&&a.url).map(a=>`<img class="att" src="${a.url}" loading="lazy" onclick="openLB('${a.url}')">`).join('');
let gt='';if(cur.type==='all'||cur.type==='stream'){const gn=G.find(g=>g.id===m.group_id)?.name;if(gn)gt=`<span class="gt" onclick="event.stopPropagation();switchView('group','${m.group_id}')" style="cursor:pointer" title="Open ${esc(gn)}">${esc(gn)}</span>`;}
const lc=m.favorited_by?.length||0;const lkrs=bldLk(m.favorited_by);const av=getAv(m);
const gid=m.group_id||'dm';const tid=m.group_id||(m.user_id===myId?m.recipient_id:m.user_id);
const readR=isSelf?'<span style="font-size:15px;color:var(--ok);margin-left:3px" title="Sent">✓✓</span>':'';
const uid=m.user_id||m.sender_id;
const fwdText=(m.text||'').replace(/`/g,"'").replace(/\\/g,'').substring(0,180);
const delBtn=isSelf?`<button class="del-btn" onclick="deleteMsg('${gid}','${m.id}')" title="Delete">DEL</button>`:'';
c.innerHTML=`${rb}<div class="ch"><span class="sr ${isDm?'dms':''}" onclick="openDM('${uid}')" title="Open DM">${av} ${esc(m.name?.toUpperCase())} ${dt}</span><span class="me">${gt}<span>${fT(m.created_at)}${readR}</span></span></div><div class="cb">${esc(m.text)}${imgs}</div>${lkrs}<div class="ca" style="position:relative"><button class="lk ${m.favorited_by?.includes(myId)?'on':''}" onclick="doLike('${gid}','${m.id}',this)">👍${lc>0?`<span class="lc">${lc}</span>`:''}</button><button class="pbtn2 ${pins[m.id]?'pinned':''}" onclick="tglPin('${m.id}')">📌</button><button class="abtn" onclick="showFwd('${m.id}',\`${esc(fwdText)}\`,'${esc(m.name||'?')}')" title="Forward">FWD</button>${delBtn}<textarea id="i-${m.id}" class="rin" placeholder="Reply..." oninput="autoX(this);saveDraft('${m.id}',this.value)" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendRep('${m.id}','${m.group_id?'group':'dm'}','${tid}')}"></textarea><div style="position:relative"><button class="et" onclick="toggleEP('ep-${m.id}')">😀</button><div class="ep" id="ep-${m.id}"></div></div><button class="sb ${isDm?'dms':''}" onclick="sendRep('${m.id}','${m.group_id?'group':'dm'}','${tid}')">↑</button></div>`;
const log=document.getElementById('log');
if(isNew){
// Day divider for new messages
const dk=dayKey(m.created_at);if(lastDayKey&&dk!==lastDayKey){insertDayDiv(log,m.created_at,!oldestFirst);showDayCue(m.created_at);}lastDayKey=dk;
if(oldestFirst){log.appendChild(c);log.scrollTop=log.scrollHeight;}else{log.insertBefore(c,log.querySelector('.card')||null);}
if(!isSelf){const sn=getSndF(m);if(sn)playSn(sn);sendNot(m.name||'Msg',m.text?.substring(0,50)||'');
// Alert word check
if(checkAlerts(m))showToast('🚨 PRIORITY ALERT',m.text?.substring(0,100)||'',`${m.name} in ${G.find(g=>g.id===m.group_id)?.name||'DM'}`,true,null,()=>switchView(m.group_id?'group':'dm',m.group_id||uid));
// Stream toasts for toggled-on streams
for(const[sn,s]of Object.entries(WF)){if(aToggles.has(sn)&&s.ids.includes(m.group_id)&&!(cur.type==='stream'&&cur.id===sn)&&!(cur.type==='group'&&cur.id===m.group_id)){
playSn(s.sound||'radar');showToast(m.name||'Message',m.text?.substring(0,80)||'',G.find(g=>g.id===m.group_id)?.name,false,sn,()=>switchView('group',m.group_id));break;}}
}}else log.appendChild(c);
const ep=c.querySelector('.ep');if(ep)ep.innerHTML=EMO.map(e=>`<button onclick="insEmo(this,'${e}')">${e}</button>`).join('');
restDraft(m.id);}

// ========== SEND ==========
async function sendBcast(){const inp=document.getElementById('gIn');const txt=inp.value.trim();if(!txt&&!pendImg)return;const att=pendImg?[{type:'image',url:pendImg}]:[];
if(cur.type==='group')await sendTo('group',cur.id,txt,att);else if(cur.type==='dm')await sendTo('dm',cur.id,txt,att);else if(cur.type==='stream'){const s=WF[cur.id];if(s)for(let gid of s.ids)await sendTo('group',gid,txt,att);}else return;
inp.value='';inp.style.height='28px';pendImg=null;inp.placeholder='Broadcast...';setTimeout(poll,500);}
async function sendTo(type,tid,text,att=[]){const url=type==='dm'?`https://api.groupme.com/v3/direct_messages?token=${TK}`:`https://api.groupme.com/v3/groups/${tid}/messages?token=${TK}`;const msg={text:text||' ',source_guid:Date.now().toString()+Math.random()};if(att.length)msg.attachments=att;const pl=type==='dm'?{direct_message:{...msg,recipient_id:tid}}:{message:msg};try{await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pl)});}catch(e){}}
async function sendRep(mid,type,tid){const inp=document.getElementById(`i-${mid}`);const txt=inp.value.trim();if(!txt)return;await sendTo(type,tid,txt,[{type:'reply',reply_id:mid,base_reply_id:mid}]);inp.value='';inp.style.height='28px';clrDraft(mid);setTimeout(poll,500);}

// ========== DELETE ==========
async function deleteMsg(gid,mid){if(gid==='dm'){showAlert('GroupMe does not support deleting DMs.');return;}
if(!confirm('Delete this message? This cannot be undone.'))return;
try{const r=await fetch(`https://api.groupme.com/v3/conversations/${gid}/messages/${mid}?token=${TK}`,{method:'DELETE'});
const card=document.getElementById(`m-${mid}`);
if(r.ok||r.status===204){if(card){card.style.transition='.3s';card.style.opacity='0';card.style.transform='translateX(30px)';setTimeout(()=>card.remove(),300);}known.delete(mid);showAlert('Message deleted ✓');}
else{showAlert('Could not delete — you may only delete your own messages.');}}catch(e){showAlert('Delete failed.');}}

// ========== LIKES ==========
async function doLike(gid,mid,btn){const isL=btn.classList.contains('on');btn.classList.toggle('on');const mt=isL?'unlike':'like';const url=gid==='dm'?`https://api.groupme.com/v3/messages/${mid}/${mt}?token=${TK}`:`https://api.groupme.com/v3/messages/${gid}/${mid}/${mt}?token=${TK}`;try{const r=await fetch(url,{method:'POST'});if(!r.ok)btn.classList.toggle('on');}catch(e){btn.classList.toggle('on');}}

// ========== POLL ==========
async function poll(){try{let nm=[];
if(cur.type==='group'){const r=await fetch(`https://api.groupme.com/v3/groups/${cur.id}/messages?token=${TK}&limit=5`);const d=await r.json();if(d.response)nm=d.response.messages;}
else if(cur.type==='dm'){const r=await fetch(`https://api.groupme.com/v3/direct_messages?token=${TK}&other_user_id=${cur.id}&limit=5`);const d=await r.json();if(d.response)nm=d.response.direct_messages;}
else if(cur.type==='stream'){const s=WF[cur.id];if(s)for(let gid of s.ids){const r=await fetch(`https://api.groupme.com/v3/groups/${gid}/messages?token=${TK}&limit=3`);const d=await r.json();if(d.response)nm=nm.concat(d.response.messages);}}
else if(cur.type==='all'){const rs=await Promise.all(G.slice(0,6).map(g=>fetch(`https://api.groupme.com/v3/groups/${g.id}/messages?token=${TK}&limit=2`).then(r=>r.json()).catch(()=>null)));rs.forEach(d=>{if(d?.response)nm=nm.concat(d.response.messages);});for(let c of D.filter(c=>isOk(c.other_user?.id)).slice(0,4)){const r=await fetch(`https://api.groupme.com/v3/direct_messages?token=${TK}&other_user_id=${c.other_user.id}&limit=2`);const d=await r.json();if(d.response)nm=nm.concat(d.response.direct_messages);}}
else if(cur.type==='all_dms'){for(let c of D.slice(0,6)){const r=await fetch(`https://api.groupme.com/v3/direct_messages?token=${TK}&other_user_id=${c.other_user.id}&limit=2`);const d=await r.json();if(d.response)nm=nm.concat(d.response.direct_messages);}}
// Also poll toggled streams for toast notifications
for(const[sn,s]of Object.entries(WF)){if(aToggles.has(sn)){for(let gid of s.ids){if(cur.type==='group'&&cur.id===gid)continue;const r=await fetch(`https://api.groupme.com/v3/groups/${gid}/messages?token=${TK}&limit=2`);const d=await r.json();if(d.response)nm=nm.concat(d.response.messages);}}}
// All Notifications mode — poll all groups for sound
if(allNotif){const polled=new Set(nm.map(m=>m.group_id).filter(Boolean));
const unpolled=G.filter(g=>!polled.has(g.id)).slice(0,10);
const ars=await Promise.all(unpolled.map(g=>fetch(`https://api.groupme.com/v3/groups/${g.id}/messages?token=${TK}&limit=2`).then(r=>r.json()).catch(()=>null)));
ars.forEach(d=>{if(d?.response)nm=nm.concat(d.response.messages);});}
nm.sort((a,b)=>a.created_at-b.created_at).forEach(m=>{if(known.has(m.id))updLk(m);else if(m.created_at>=vAt)handleMsg(m,true);});
if((cur.type==='group'||cur.type==='dm')&&cur.id)markSn(cur.id);
await rfData();syncPoll();setCon(true);
// Poll extra panels
if(panels[1])await pollPanel(1);if(panels[2])await pollPanel(2);
}catch(e){setCon(false);}}

// ========== CLIPBOARD ==========
function toggleCB(){const cb=document.getElementById('cb');cb.classList.toggle('show');if(cb.classList.contains('show')){document.getElementById('cbb').value=localStorage.getItem('gm_v3_cb')||'';updCBC();const p=cbP||{x:Math.max(40,window.innerWidth-340),y:60};cb.style.left=Math.min(p.x,window.innerWidth-80)+'px';cb.style.top=Math.min(p.y,window.innerHeight-80)+'px';}}
function saveCBD(){localStorage.setItem('gm_v3_cb',document.getElementById('cbb').value);updCBC();}
function clearCB(){if(!confirm('Clear?'))return;document.getElementById('cbb').value='';localStorage.setItem('gm_v3_cb','');updCBC();}
function updCBC(){document.getElementById('cbc').textContent=document.getElementById('cbb').value.length+' chars';}
let dOff={x:0,y:0},isDrg=false;
function startDrag(e){isDrg=true;const r=document.getElementById('cb').getBoundingClientRect();dOff.x=e.clientX-r.left;dOff.y=e.clientY-r.top;document.addEventListener('mousemove',onDrg);document.addEventListener('mouseup',stopDrg);e.preventDefault();}
function onDrg(e){if(!isDrg)return;const cb=document.getElementById('cb');const x=Math.max(0,Math.min(e.clientX-dOff.x,window.innerWidth-40)),y=Math.max(0,Math.min(e.clientY-dOff.y,window.innerHeight-40));cb.style.left=x+'px';cb.style.top=y+'px';cbP={x,y};localStorage.setItem('gm_v3_cbpos',JSON.stringify(cbP));}
function stopDrg(){isDrg=false;document.removeEventListener('mousemove',onDrg);document.removeEventListener('mouseup',stopDrg);}
function jumpTo(id){const el=document.getElementById(`m-${id}`);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.remove('search-highlight','pulse');void el.offsetWidth;el.classList.add('search-highlight');setTimeout(()=>el.classList.remove('search-highlight'),2500);}}