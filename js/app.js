/**
 * Delta 360 - Dispatch Client v11 (Fixed)
 */
let TK=localStorage.getItem('gm_v3_token')||'';
let G=[],D=[],known=new Map(),cur={type:'all',id:null},myId='',myName='';
let pollTmr=null,isCon=false,isLoggingIn=false;
let myStat=localStorage.getItem('gm_v3_status')||'awy',syncGid=null,teamStatus={};
let soundEnabled=localStorage.getItem('gm_v3_sound')!=='false';
let soundPref=localStorage.getItem('gm_v3_soundpref')||'radar',actx=null;
let streams=JSON.parse(localStorage.getItem('gm_v3_streams')||'{}');
let seen=JSON.parse(localStorage.getItem('gm_v3_lastseen')||'{}');
let approved=JSON.parse(localStorage.getItem('gm_v3_approved')||'{}');
let pinnedChats=JSON.parse(localStorage.getItem('gm_v3_pinchats')||'{}');
let mutedGroups=JSON.parse(localStorage.getItem('gm_v3_muted')||'{}');
let sidebarSort=localStorage.getItem('gm_v3_sort')||'recent';
let inactiveOpen=localStorage.getItem('gm_v3_inactive_open')==='true';
let streamToggles=new Set();
let panels=[null,null,null],panelKnown=[new Map(),new Map(),new Map()];

const el=id=>document.getElementById(id);
const sv=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const esc=t=>{if(!t)return'';const d=document.createElement('div');d.textContent=t;return d.innerHTML;};
function fT(ts){const d=new Date(ts*1e3),n=new Date(),t=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});if(d.toDateString()===n.toDateString())return t;const y=new Date(n);y.setDate(y.getDate()-1);if(d.toDateString()===y.toDateString())return'Yest '+t;return d.toLocaleDateString([],{month:'short',day:'numeric'})+' '+t;}
function formatTimeAgo(ts){const diff=Math.floor(Date.now()/1000)-ts;if(diff<60)return'now';if(diff<3600)return Math.floor(diff/60)+'m';if(diff<86400)return Math.floor(diff/3600)+'h';return Math.floor(diff/86400)+'d';}
function getHeat(ts,now){return Math.max(5,Math.round(100*(1-(now-ts)/21600)));}
function getLastMsg(g){return g.messages?.last_message_created_at||g.updated_at||0;}
function markSeen(id){seen[id]=Math.floor(Date.now()/1e3);sv('gm_v3_lastseen',seen);}
function isUnread(id,ts){return ts>(seen[id]||0);}
function isApproved(uid){return approved[uid]===true;}
function isPending(uid){return approved[uid]===undefined;}
function isMutedG(gid){return mutedGroups[gid]===true;}

function showToast(title,body,isPri){const z=el('toast-zone');if(!z)return;const t=document.createElement('div');t.className='toast'+(isPri?' priority':'');t.innerHTML='<div class="toast-title">'+esc(title)+'</div><div class="toast-body">'+esc((body||'').substring(0,120))+'</div>';z.appendChild(t);setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300);},isPri?10000:5000);}
function openStreamConfig(){showToast('Streams','Stream config coming in next update');}

async function apiCall(endpoint,opts={}){if(!TK)throw new Error('No token');const url=endpoint.startsWith('http')?endpoint:'https://api.groupme.com/v3'+endpoint+(endpoint.includes('?')?'&':'?')+'token='+TK;const r=await fetch(url,opts);if(r.status===401){doLogout();throw new Error('Unauthorized');}if(!r.ok)throw new Error('API '+r.status);return await r.json();}

async function doLogin(){const tokEl=el('tok');if(!tokEl)return;const t=tokEl.value.trim();if(!t)return;const lerrEl=el('lerr');if(lerrEl){lerrEl.style.display='none';lerrEl.textContent='';}
try{const r=await fetch('https://api.groupme.com/v3/users/me?token='+t);if(!r.ok)throw 0;const d=await r.json();if(!d.response)throw 0;
TK=t;myId=d.response.id;myName=d.response.name;localStorage.setItem('gm_v3_token',t);
if(el('login'))el('login').style.display='none';if(el('app-root'))el('app-root').style.display='flex';
isLoggingIn=true;await initData();isLoggingIn=false;startPoll();
}catch(e){if(lerrEl){lerrEl.style.display='block';lerrEl.textContent='Invalid token. Please try again.';}}}
function doLogout(){localStorage.removeItem('gm_v3_token');TK='';location.reload();}

async function initData(){try{await rfData();findSyncGroup();renderSidebar();setStat(myStat,false);loadSoundPref();switchView('all',null);}catch(e){console.error('initData:',e);showToast('Error','Failed to load. Refresh to retry.');}}
async function rfData(){const[gR,dR]=await Promise.all([apiCall('/groups?per_page=100'),apiCall('/chats?per_page=50')]);G=gR.response||[];D=dR.response||[];}

function startPoll(){if(pollTmr)clearTimeout(pollTmr);pollLoop();}
async function pollLoop(){if(!TK)return;try{await pollMessages();if(syncGid)await syncPoll().catch(()=>{});setCon(true);}catch(e){setCon(false);}finally{pollTmr=setTimeout(pollLoop,4000);}}
async function pollMessages(){
if(cur.type==='group'&&cur.id){try{const d=await apiCall('/groups/'+cur.id+'/messages?limit=5');(d.response?.messages||[]).forEach(m=>{if(!panelKnown[0].has(m.id)){panelKnown[0].set(m.id,true);appendMsg(el('messages-panel-0'),m,true);}});}catch(e){}}
else if(cur.type==='dm'&&cur.id){try{const d=await apiCall('/direct_messages?other_user_id='+cur.id+'&limit=5');(d.response?.direct_messages||[]).forEach(m=>{if(!panelKnown[0].has(m.id)){panelKnown[0].set(m.id,true);appendMsg(el('messages-panel-0'),m,true);}});}catch(e){}}
for(let s=1;s<=2;s++){const p=panels[s];if(!p)continue;try{let msgs=[];if(p.type==='group'){const d=await apiCall('/groups/'+p.id+'/messages?limit=5');msgs=d.response?.messages||[];}else if(p.type==='dm'){const d=await apiCall('/direct_messages?other_user_id='+p.id+'&limit=5');msgs=d.response?.direct_messages||[];}const c=el('messages-panel-'+s);msgs.forEach(m=>{if(!panelKnown[s].has(m.id)){panelKnown[s].set(m.id,true);appendMsg(c,m,true);}});}catch(e){}}
try{await rfData();renderSidebar();}catch(e){}}

function switchView(type,id){cur={type,id};panelKnown[0]=new Map();if(id)markSeen(id);const ht=el('htitle');if(ht)ht.textContent=getPanelTitle(type,id);renderSidebar();renderMainPanel();loadMainHistory();}
function getPanelTitle(type,id){if(type==='all')return'Universal Feed';if(type==='dms')return'Direct Comms';if(type==='group')return G.find(g=>g.id===id)?.name||'Group';if(type==='dm'){const dm=D.find(d=>d.other_user?.id===id);return dm?.other_user?.name||'DM';}if(type==='stream')return id;return'\u2014';}
function renderMainPanel(){const wrap=el('panels-wrap');if(!wrap)return;const old=el('panel-0');if(old)old.remove();const title=getPanelTitle(cur.type,cur.id);const isDm=cur.type==='dm';const showInput=cur.type==='group'||cur.type==='dm';
wrap.insertAdjacentHTML('afterbegin','<div id="panel-0" class="panel"><div class="panel-header"><div class="panel-title">'+esc(title)+'</div></div><div class="messages" id="messages-panel-0"><div class="message-empty"><div class="message-empty-icon">\u0394</div><div class="message-empty-text">Loading...</div></div></div>'+(showInput?'<div class="input-area"><textarea class="msg-input" id="input-panel-0" placeholder="Type message..." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendFromPanel(0)}"></textarea><button class="send-btn'+(isDm?' dm':'')+'" onclick="sendFromPanel(0)"><span>Send</span></button></div>':'')+'</div>');}

async function loadMainHistory(){const c=el('messages-panel-0');if(!c)return;c.innerHTML='<div class="message-empty"><div class="message-empty-icon">\u0394</div><div class="message-empty-text">Loading...</div></div>';let msgs=[];
try{if(cur.type==='group'){const d=await apiCall('/groups/'+cur.id+'/messages?limit=40');msgs=d.response?.messages||[];}
else if(cur.type==='dm'){const d=await apiCall('/direct_messages?other_user_id='+cur.id+'&limit=40');msgs=d.response?.direct_messages||[];}
else if(cur.type==='all'){const ps=G.slice(0,8).map(g=>apiCall('/groups/'+g.id+'/messages?limit=5').catch(()=>null));const rs=await Promise.all(ps);rs.forEach(r=>{if(r?.response?.messages)msgs.push(...r.response.messages);});}
else if(cur.type==='dms'){const ok=D.filter(d=>isApproved(d.other_user?.id));const ps=ok.slice(0,10).map(d=>apiCall('/direct_messages?other_user_id='+d.other_user.id+'&limit=5').catch(()=>null));const rs=await Promise.all(ps);rs.forEach(r=>{if(r?.response?.direct_messages)msgs.push(...r.response.direct_messages);});}}catch(e){}
c.innerHTML='';if(!msgs.length){c.innerHTML='<div class="message-empty"><div class="message-empty-icon">\u0394</div><div class="message-empty-text">No messages</div></div>';return;}
msgs.sort((a,b)=>a.created_at-b.created_at);let lastDK=null;
msgs.forEach(m=>{panelKnown[0].set(m.id,true);const dk=new Date(m.created_at*1000).toDateString();if(dk!==lastDK){const d=new Date(m.created_at*1000),now=new Date(),y=new Date();y.setDate(y.getDate()-1);let label=dk===now.toDateString()?'Today':dk===y.toDateString()?'Yesterday':d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});const div=document.createElement('div');div.className='message-date-divider';div.innerHTML='<span>'+label+'</span>';c.appendChild(div);lastDK=dk;}appendMsg(c,m,false);});
setTimeout(()=>{c.scrollTop=c.scrollHeight;},50);}

function appendMsg(container,m,isNew){if(!container)return;const empty=container.querySelector('.message-empty');if(empty)empty.remove();
const isMe=(m.sender_id||m.user_id)===myId,isDm=!m.group_id;
let groupTag='';if((cur.type==='all'||cur.type==='stream')&&m.group_id){const gn=G.find(g=>g.id===m.group_id)?.name;if(gn)groupTag=' <span class="message-group-tag" onclick="event.stopPropagation();switchView(\'group\',\''+m.group_id+'\')">'+esc(gn)+'</span>';}
const ac=(m.name||'?')[0].toUpperCase();const avImg=m.avatar_url?'<img src="'+m.avatar_url+'.avatar" alt="" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">':'';
const avFb='<div class="avatar-fallback" style="'+(m.avatar_url?'display:none':'')+'">'+ ac+'</div>';
const imgs=(m.attachments||[]).filter(a=>a.type==='image').map(a=>'<img class="message-image" src="'+a.url+'" alt="" onclick="window.open(\''+a.url+'\',\'_blank\')">').join('');
const e=document.createElement('div');e.className='message'+(isMe?' self':'')+(isDm?' dm-msg':'');e.id='msg-'+m.id;
e.innerHTML='<div class="message-avatar" title="'+esc(m.name)+'">'+avImg+avFb+'</div><div class="message-content"><div class="message-header"><span class="message-author" onclick="openDM(\''+(m.user_id||m.sender_id)+'\')">'+esc(m.name)+'</span>'+groupTag+'<span class="message-time">'+fT(m.created_at)+'</span></div><div class="message-bubble">'+esc(m.text||'')+imgs+'</div></div>';
container.appendChild(e);
if(isNew){const nb=container.scrollHeight-container.scrollTop-container.clientHeight<150;if(nb||isMe)setTimeout(()=>{container.scrollTop=container.scrollHeight;},0);
if(!isMe&&soundEnabled&&!isLoggingIn){playSnd(soundPref);showToast(m.name||'Message',m.text||'');sendNotif(m.name,m.text);}}}
function openDM(uid){if(uid===myId)return;switchView('dm',uid);}

function openSecondaryPanel(type,id){let slot=!panels[1]?1:!panels[2]?2:1;if(panels[slot])closeSecondaryPanel(slot);panels[slot]={type,id};panelKnown[slot]=new Map();const wrap=el('panels-wrap');if(!wrap)return;const title=getPanelTitle(type,id);
wrap.insertAdjacentHTML('beforeend','<div id="panel-'+slot+'" class="panel secondary-panel"><div class="panel-header"><div class="panel-title">'+esc(title)+'</div><button class="panel-close" onclick="closeSecondaryPanel('+slot+')">✕</button></div><div class="messages" id="messages-panel-'+slot+'"><div class="message-empty"><div class="message-empty-icon">◇</div><div class="message-empty-text">Loading...</div></div></div><div class="input-area"><textarea class="msg-input" id="input-panel-'+slot+'" placeholder="Message..." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendFromPanel('+slot+')}"></textarea><button class="send-btn" onclick="sendFromPanel('+slot+')"><span>Send</span></button></div></div>');
loadSecondaryHistory(slot);}
function closeSecondaryPanel(slot){panels[slot]=null;panelKnown[slot]=new Map();const p=el('panel-'+slot);if(p)p.remove();}
async function loadSecondaryHistory(slot){const p=panels[slot];if(!p)return;const c=el('messages-panel-'+slot);if(!c)return;let msgs=[];
try{if(p.type==='group'){const d=await apiCall('/groups/'+p.id+'/messages?limit=30');msgs=d.response?.messages||[];}else if(p.type==='dm'){const d=await apiCall('/direct_messages?other_user_id='+p.id+'&limit=30');msgs=d.response?.direct_messages||[];}}catch(e){}
c.innerHTML='';if(!msgs.length){c.innerHTML='<div class="message-empty"><div class="message-empty-icon">◇</div><div class="message-empty-text">No messages</div></div>';return;}
msgs.sort((a,b)=>a.created_at-b.created_at);msgs.forEach(m=>{panelKnown[slot].set(m.id,true);appendMsg(c,m,false);});setTimeout(()=>{c.scrollTop=c.scrollHeight;},50);}

async function sendFromPanel(slot){let type,id;if(slot===0){type=cur.type;id=cur.id;}else{const p=panels[slot];if(!p)return;type=p.type;id=p.id;}
const inp=el('input-panel-'+slot);if(!inp)return;const txt=inp.value.trim();if(!txt)return;const guid='d360_'+Date.now()+Math.random();
try{if(type==='group')await apiCall('/groups/'+id+'/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:{source_guid:guid,text:txt}})});
else if(type==='dm')await apiCall('/direct_messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({direct_message:{source_guid:guid,recipient_id:id,text:txt}})});
inp.value='';inp.style.height='auto';setTimeout(()=>pollMessages(),400);}catch(e){showToast('Error','Failed to send');}}

function handleChatClick(event,type,id){if(event.shiftKey&&type!=='all'&&type!=='dms')openSecondaryPanel(type,id);else switchView(type,id);}

function findSyncGroup(){const g=G.find(x=>x.name.toLowerCase()==='dispatch');if(g){syncGid=g.id;syncPoll();}}
function cycleStatus(){setStat(myStat==='avl'?'bsy':myStat==='bsy'?'awy':'avl',true);}
function setStat(s,broadcast){myStat=s;localStorage.setItem('gm_v3_status',s);const btn=el('status-btn');if(btn)btn.className='status-btn '+s;const dot=el('status-dot');if(dot)dot.className='status-dot '+s;const st=el('status-text');if(st)st.textContent=s==='avl'?'Available':s==='bsy'?'Busy':'Away';teamStatus[myName]={status:s,ts:Date.now()};renderDB();
if(broadcast&&!isLoggingIn&&syncGid){const emoji=s==='avl'?'🟢':s==='bsy'?'🔴':'🟡';const label=s==='avl'?'AVAILABLE':s==='bsy'?'BUSY':'AWAY';apiCall('/groups/'+syncGid+'/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:{source_guid:'d360stat'+Date.now(),text:emoji+' '+myName+' \u2014 '+label}})}).catch(()=>{});}}
async function syncPoll(){if(!syncGid)return;try{const d=await apiCall('/groups/'+syncGid+'/messages?limit=50');if(!d.response?.messages)return;const statusMap={};
d.response.messages.forEach(m=>{if(!m.text)return;const sm=m.text.match(/^(🟢|🔴|🟡)\s+(.+?)\s+\u2014\s+(AVAILABLE|BUSY|AWAY)$/);if(sm){const map={AVAILABLE:'avl',BUSY:'bsy',AWAY:'awy'};const name=sm[2].trim(),stat=map[sm[3]]||'avl';if(!statusMap[name]||m.created_at>statusMap[name].ts)statusMap[name]={status:stat,ts:m.created_at};}});
Object.entries(statusMap).forEach(([name,s])=>{if(!teamStatus[name]||s.ts>(teamStatus[name].ts||0)/1000)teamStatus[name]={status:s.status,ts:s.ts*1000};});renderDB();}catch(e){}}
function renderDB(){const db=el('dboard');if(!db)return;const names=Object.keys(teamStatus).sort();if(!names.length){db.innerHTML='';db.style.display='none';return;}db.style.display='flex';const lbl={avl:'Available',bsy:'Busy',awy:'Away'};db.innerHTML='<span class="db-label">Team</span>'+names.map(n=>{const s=teamStatus[n];const st=(s.status||'avl').trim();return'<div class="db-chip '+st+(n===myName?' me':'')+'"><span class="db-dot '+st+'"></span>'+esc(n)+' \u00B7 '+(lbl[st]||st)+'</div>';}).join('');}

function renderSidebar(){try{const now=Math.floor(Date.now()/1000),cutoff=now-21600;const all=[];
G.forEach(g=>all.push({type:'group',id:g.id,name:g.name,lastMessage:getLastMsg(g)}));
D.forEach(d=>{if(d.other_user)all.push({type:'dm',id:d.other_user.id,name:d.other_user.name,lastMessage:d.updated_at||0});});
const active=all.filter(c=>c.lastMessage>cutoff),inactive=all.filter(c=>c.lastMessage<=cutoff);
if(sidebarSort==='heat')active.sort((a,b)=>getHeat(b.lastMessage,now)-getHeat(a.lastMessage,now));else active.sort((a,b)=>b.lastMessage-a.lastMessage);
renderStreams();renderPendingDMs();renderPinned();renderActiveChats(active,now);renderInactiveChats(inactive,now);
document.querySelectorAll('.sidebar-item,.chat-item,.pinned-item').forEach(i=>i.classList.remove('active'));
if(cur.type==='all'){const i=document.querySelector('[data-chat-action="all"]');if(i)i.classList.add('active');}
else if(cur.type==='dms'){const i=document.querySelector('[data-chat-action="dms"]');if(i)i.classList.add('active');}
else{const i=document.querySelector('[data-chat-key="'+cur.type+':'+cur.id+'"]');if(i)i.classList.add('active');}}catch(e){console.error('renderSidebar:',e);}}

function renderStreams(){const sl=el('streams-list');if(!sl)return;sl.innerHTML='';Object.keys(streams).forEach(name=>{const s=streams[name];sl.innerHTML+='<div class="stream-item"><div class="stream-name">'+esc(name.toUpperCase())+'</div><div class="stream-controls"><button class="stream-sound-btn" onclick="event.stopPropagation();playSnd(\''+(s.sound||'radar')+'\')" title="Preview">🔊</button><button class="stream-toggle '+(streamToggles.has(name)?'active':'')+'" onclick="event.stopPropagation();tglStreamMon(\''+esc(name)+'\')" title="Monitor"></button><button class="stream-delete-btn" onclick="event.stopPropagation();delStream(\''+esc(name)+'\')" title="Delete">✕</button></div></div>';});}
function tglStreamMon(n){if(streamToggles.has(n))streamToggles.delete(n);else streamToggles.add(n);renderSidebar();}
function delStream(n){delete streams[n];sv('gm_v3_streams',streams);streamToggles.delete(n);showToast('Deleted',n);renderSidebar();}

function renderPendingDMs(){const pl=el('pending-list'),ps=el('pending-section');if(!pl||!ps)return;const pending=D.filter(d=>d.other_user&&isPending(d.other_user.id));if(!pending.length){ps.style.display='none';return;}ps.style.display='flex';pl.innerHTML='';
pending.forEach(dm=>{const uid=dm.other_user.id;pl.innerHTML+='<div class="pending-dm-item"><div class="pending-dm-sender">'+esc(dm.other_user.name)+'</div><div class="pending-dm-preview">'+esc((dm.last_message?.text||'').substring(0,40))+'</div><div class="pending-dm-actions"><button class="pending-dm-btn pending-dm-approve" onclick="approveDM(\''+uid+'\')">✓</button><button class="pending-dm-btn pending-dm-block" onclick="blockDM(\''+uid+'\')">✕</button></div></div>';});}
function approveDM(uid){approved[uid]=true;sv('gm_v3_approved',approved);showToast('Approved','DM approved');renderSidebar();}
function blockDM(uid){approved[uid]=false;sv('gm_v3_approved',approved);showToast('Blocked','DM blocked');renderSidebar();}

function renderPinned(){const pl=el('pinned-list'),ps=el('pinned-section');if(!pl||!ps)return;const ids=Object.keys(pinnedChats);if(!ids.length){ps.style.display='none';return;}ps.style.display='flex';pl.innerHTML='';ids.sort((a,b)=>(pinnedChats[b].ts||0)-(pinnedChats[a].ts||0));ids.forEach(id=>{const p=pinnedChats[id];const isAct=cur.type===p.type&&cur.id===id;pl.innerHTML+='<div class="pinned-item '+(isAct?'active':'')+'" onclick="handleChatClick(event,\''+p.type+'\',\''+id+'\')">📌 '+esc(p.name||id)+'</div>';});}

function renderActiveChats(active,now){const al=el('active-list');if(!al)return;al.innerHTML='';active.forEach(c=>{const key=c.type+':'+c.id,pin=!!pinnedChats[c.id],mut=c.type==='group'&&isMutedG(c.id),ta=formatTimeAgo(c.lastMessage),heat=getHeat(c.lastMessage,now),unr=isUnread(c.id,c.lastMessage),act=cur.type===c.type&&cur.id===c.id;
al.innerHTML+='<div class="chat-item '+(c.type==='dm'?'dm ':'')+(unr?'unread ':'')+(act?'active':'')+'" onclick="handleChatClick(event,\''+c.type+'\',\''+c.id+'\')" data-chat-key="'+key+'"><div class="chat-unread-dot"></div><div class="chat-name">'+esc(c.name)+'</div><div class="chat-heatbar" style="height:'+heat+'%" title="'+heat+'% activity"></div><div class="chat-time-ago">'+ta+'</div><div class="chat-actions"><button class="chat-pin-btn '+(pin?'pinned':'')+'" onclick="event.stopPropagation();tglPinChat(\''+c.id+'\',\''+c.type+'\',\''+esc(c.name)+'\')" title="Pin">☆</button>'+(c.type==='group'?'<button class="chat-mute-btn '+(mut?'muted':'')+'" onclick="event.stopPropagation();tglMuteG(\''+c.id+'\')" title="Mute">🔇</button>':'')+'</div></div>';});}

function renderInactiveChats(inactive,now){const il=el('inactive-list');if(!il)return;il.innerHTML='';inactive.forEach(c=>{const key=c.type+':'+c.id;il.innerHTML+='<div class="chat-item inactive '+(c.type==='dm'?'dm':'')+'" onclick="handleChatClick(event,\''+c.type+'\',\''+c.id+'\')" data-chat-key="'+key+'"><div class="chat-unread-dot"></div><div class="chat-name">'+esc(c.name)+'</div><div class="chat-heatbar"></div><div class="chat-time-ago">'+formatTimeAgo(c.lastMessage)+'</div></div>';});}

function tglPinChat(id,type,name){if(pinnedChats[id])delete pinnedChats[id];else pinnedChats[id]={type,name,ts:Date.now()};sv('gm_v3_pinchats',pinnedChats);renderSidebar();}
function tglMuteG(gid){if(mutedGroups[gid])delete mutedGroups[gid];else mutedGroups[gid]=true;sv('gm_v3_muted',mutedGroups);renderSidebar();}

function getCtx(){if(!actx)actx=new(window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume();return actx;}
const SND={
radar(c){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(800,c.currentTime);o.frequency.linearRampToValueAtTime(1400,c.currentTime+.08);o.frequency.linearRampToValueAtTime(800,c.currentTime+.18);g.gain.setValueAtTime(.25,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.35);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+.35);},
chime(c){[523,659].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.2,c.currentTime+i*.1);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+i*.1+.5);o.connect(g).connect(c.destination);o.start(c.currentTime+i*.1);o.stop(c.currentTime+i*.1+.5);});},
click(c){const n=c.sampleRate*.03,b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,10);const s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();f.type='highpass';f.frequency.value=2e3;s.buffer=b;g.gain.setValueAtTime(.3,c.currentTime);s.connect(f).connect(g).connect(c.destination);s.start();},
alert(c){[0,.12].forEach(t=>{const o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=880;g.gain.setValueAtTime(.15,c.currentTime+t);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+t+.08);o.connect(g).connect(c.destination);o.start(c.currentTime+t);o.stop(c.currentTime+t+.08);});},
sonar(c){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(1200,c.currentTime);o.frequency.exponentialRampToValueAtTime(600,c.currentTime+.3);g.gain.setValueAtTime(.2,c.currentTime);g.gain.setValueAtTime(.2,c.currentTime+.05);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.5);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+.5);},
  drop(c) { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(1800, c.currentTime); o.frequency.exponentialRampToValueAtTime(200, c.currentTime + .15); g.gain.setValueAtTime(.3, c.currentTime); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .25); o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + .25); }
};
function playSnd(name) { if (!soundEnabled) return; try { const c = getCtx(); if (SND[name]) SND[name](c); else SND.radar(c); } catch (e) {} }
function toggleSound() { soundEnabled = !soundEnabled; localStorage.setItem('gm_v3_sound', soundEnabled); const ic = el('sound-icon'); if (ic) ic.textContent = soundEnabled ? '🔊' : '🔇'; }
function loadSoundPref() { const ic = el('sound-icon'); if (ic) ic.textContent = soundEnabled ? '🔊' : '🔇'; }
function setSoundPreference(val) { soundPref = val; localStorage.setItem('gm_v3_soundpref', val); }
function sendNotif(title, body) { if (Notification.permission === 'granted' && document.hidden) new Notification(title || 'Delta 360', { body: (body || '').substring(0, 100) }); }

// --- UI ---
function tglSidebar() { const sb = el('sidebar'); if (!sb) return; if (window.innerWidth <= 600) { sb.classList.toggle('open'); sb.classList.remove('collapsed'); } else sb.classList.toggle('collapsed'); }
function toggleSearch() { const ov = el('searchOv'); if (!ov) return; ov.classList.toggle('show'); if (ov.classList.contains('show')) { const si = el('searchIn'); if (si) si.focus(); } }
function toggleSettings() { const ov = el('settingsOv'); if (ov) ov.classList.toggle('show'); }
function toggleTheme() { document.body.classList.toggle('dark'); localStorage.setItem('gm_v3_theme', document.body.classList.contains('dark') ? 'dark' : 'light'); tglMenu(); }
function tglMenu() { const m = el('main-menu'); if (m) m.classList.toggle('show'); }
function showSettings() { tglMenu(); toggleSettings(); }
function doSearch(q) { const r = el('searchRes'); if (!r) return; if (!q || q.length < 2) { r.innerHTML = ''; return; } r.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-tertiary)">Searching...</div>'; }
function setCon(ok) { isCon = ok; }
function toggleSort() { sidebarSort = sidebarSort === 'recent' ? 'heat' : 'recent'; localStorage.setItem('gm_v3_sort', sidebarSort); renderSidebar(); }
function toggleInactive() { inactiveOpen = !inactiveOpen; localStorage.setItem('gm_v3_inactive_open', inactiveOpen); const t = el('inactive-toggle'), l = el('inactive-list'); if (t) t.classList.toggle('open', inactiveOpen); if (l) l.style.display = inactiveOpen ? 'flex' : 'none'; }

// --- STARTUP ---
window.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('gm_v3_theme') === 'dark') document.body.classList.add('dark');
  document.addEventListener('click', (event) => {
    const ci = event.target.closest('[data-chat-action]');
    if (ci) { handleChatClick(event, ci.getAttribute('data-chat-action'), ci.getAttribute('data-chat-id') === 'null' ? null : ci.getAttribute('data-chat-id')); return; }
    const sb = event.target.closest('[data-action="toggle-sort"]');
    if (sb) { toggleSort(); return; }
    const ib = event.target.closest('[data-action="toggle-inactive"]');
    if (ib) { toggleInactive(); return; }
    const menu = el('main-menu');
    if (menu && menu.classList.contains('show') && !event.target.closest('.menu-wrapper')) menu.classList.remove('show');
  });
  document.addEventListener('keydown', e => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; if (e.key === '/') { e.preventDefault(); toggleSearch(); } });
  if (Notification.permission === 'default') Notification.requestPermission();
  if (TK) { const t = el('tok'); if (t) t.value = TK; doLogin(); }
});
