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
function openLB(url){const lb=el('lightbox');const img=el('lbImg');if(lb&&img){img.src=url;lb.style.display='flex';}}

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


// === CLICK HANDLER ===
function handleChatClick(event,type,id){if(event.shiftKey&&type!=='all'&&type!=='dms')openSecondaryPanel(type,id);else switchView(type,id);}

// === MESSAGE ACTIONS ===
async function likeMsg(mid,gid){if(!gid)return;try{await apiCall('/messages/'+gid+'/'+mid+'/like',{method:'POST'});}catch(e){}setTimeout(()=>pollMessages(),500);}
async function delMsg(mid,gid){if(!confirm('Delete this message?'))return;try{await apiCall('/conversations/'+gid+'/messages/'+mid,{method:'DELETE'});const c=el('msg-'+mid);if(c){c.style.opacity='0';setTimeout(()=>c.remove(),300);}}catch(e){showToast('Error','Could not delete');}}
async function sendReply(mid,gid,uid){const inp=el('ri-'+mid);if(!inp)return;const txt=inp.value.trim();if(!txt)return;try{if(gid)await sendTo('group',gid,txt);else await sendTo('dm',uid,txt);inp.value='';setTimeout(()=>pollMessages(),500);}catch(e){showToast('Error','Reply failed');}}

// === PIN MESSAGES ===
function tglPinMsg(mid){if(pinnedMsgs[mid])delete pinnedMsgs[mid];else pinnedMsgs[mid]=Date.now();sv('gm_v3_pinned',pinnedMsgs);const c=el('msg-'+mid);if(c)c.classList.toggle('pinned',!!pinnedMsgs[mid]);reorderPins();}
function reorderPins(){const pz=el('pin-zone');if(!pz)return;pz.innerHTML='';const ids=Object.keys(pinnedMsgs).sort((a,b)=>pinnedMsgs[b]-pinnedMsgs[a]);let count=0;ids.forEach(mid=>{const c=el('msg-'+mid);if(c){const clone=c.cloneNode(true);clone.id='pin-'+mid;pz.appendChild(clone);count++;}});if(count){const hdr=document.createElement('div');hdr.className='pin-zone-hdr';hdr.textContent='\ud83d\udccc PINNED ('+count+')';pz.insertBefore(hdr,pz.firstChild);pz.style.display='block';}else pz.style.display='none';}

// === FORWARD ===
function startFwd(mid,name,text){fwdMsg={mid,name,text};const m=el('fwdModal');if(!m)return;m.style.display='flex';el('fwdPreview').innerHTML='<strong>'+esc(name)+':</strong> '+esc(text);const targets=el('fwdTargets');targets.innerHTML='';G.sort((a,b)=>a.name.localeCompare(b.name)).forEach(g=>{targets.innerHTML+='<button class="fwd-target-btn" onclick="doFwd(\'group\',\''+g.id+'\')">'+esc(g.name)+'</button>';});D.filter(d=>isApproved(d.other_user?.id)).forEach(d=>{targets.innerHTML+='<button class="fwd-target-btn dm" onclick="doFwd(\'dm\',\''+d.other_user.id+'\')">'+esc(d.other_user.name)+'</button>';});}
async function doFwd(type,id){if(!fwdMsg)return;const txt='[FWD from '+fwdMsg.name+']: '+fwdMsg.text;try{await sendTo(type,id,txt);showToast('Forwarded','Message sent');hideFwd();}catch(e){showToast('Error','Forward failed');}}
function hideFwd(){el('fwdModal').style.display='none';fwdMsg=null;}

// === SOUND ROUTING ===
function getSndForMsg(m){const gid=m.group_id;if(!gid){if(dmMuted)return null;return dmSound||'chime';}if(isMutedG(gid))return null;if(cur.type==='group'&&cur.id===gid){if(feedMuted)return null;return feedSound||'radar';}for(const[n,s]of Object.entries(streams)){if(streamToggles.has(n)&&s.ids?.includes(gid))return s.sound||'radar';}if(cur.type==='all'){if(feedMuted)return null;return feedSound||'radar';}if(allNotif){if(feedMuted)return null;return feedSound||'radar';}return null;}

// === ALERT WORDS ===
function checkAlerts(m){if(!m.text||!alertWords.length)return false;const t=m.text.toLowerCase();return alertWords.some(w=>t.includes(w.toLowerCase()));}

// === TEMPLATES ===
function renderTplBar(){const bar=el('tpl-bar');if(!bar)return;if(!cur.id&&cur.type!=='stream'){bar.style.display='none';return;}bar.style.display='flex';bar.innerHTML=tpls.map(t=>'<span class="tpl-chip" onclick="useTpl(this)" data-t="'+esc(t)+'">'+esc(t)+'<span class="tpl-copy" onclick="event.stopPropagation();cpTpl(\''+esc(t)+'\',this)">📄</span></span>').join('');}
function useTpl(e){const inp=el('input-panel-0');if(inp){inp.value=e.dataset.t;inp.focus();}}
function cpTpl(t,e){navigator.clipboard?.writeText(t).then(()=>{e.textContent='\u2705';setTimeout(()=>e.textContent='\ud83d\udcc4',1200);});}
function renderTplMgr(){const m=el('tplMgr');if(!m)return;m.innerHTML=tpls.map((t,i)=>'<div class="cfg-item"><span>'+esc(t)+'</span><button onclick="tpls.splice('+i+',1);sv(\'gm_v3_tpl\',tpls);renderTplMgr();renderTplBar()">\u00d7</button></div>').join('');}
function addTpl(){const inp=el('tplNew');const v=inp.value.trim();if(!v)return;tpls.push(v);sv('gm_v3_tpl',tpls);inp.value='';renderTplMgr();renderTplBar();}
function renderAlertMgr(){const m=el('alertMgr');if(!m)return;m.innerHTML=alertWords.map((w,i)=>'<div class="cfg-item"><span>'+esc(w)+'</span><button onclick="alertWords.splice('+i+',1);sv(\'gm_v3_alerts\',alertWords);renderAlertMgr()">\u00d7</button></div>').join('');}
function addAlert(){const inp=el('alertNew');const v=inp.value.trim();if(!v)return;alertWords.push(v.toLowerCase());sv('gm_v3_alerts',alertWords);inp.value='';renderAlertMgr();}

// === CONFIG PANEL ===
function openCfg(){const p=el('cfgPanel');p.style.display='flex';el('cfgGroupList').innerHTML=G.sort((a,b)=>a.name.localeCompare(b.name)).map(g=>'<label class="cfg-chk"><input type="checkbox" value="'+g.id+'"> '+esc(g.name)+'</label>').join('');}
function closeCfg(){el('cfgPanel').style.display='none';}
function selCfgSnd(btn){document.querySelectorAll('.snd-opt').forEach(b=>b.classList.remove('sel'));btn.classList.add('sel');cfgSnd=btn.dataset.sound;playSnd(cfgSnd);}
function saveStream(){const name=el('cfgStreamName').value.trim();if(!name)return;const ids=Array.from(document.querySelectorAll('#cfgGroupList input:checked')).map(i=>i.value);if(!ids.length){showToast('Error','Select groups');return;}streams[name]={ids,sound:cfgSnd};sv('gm_v3_streams',streams);el('cfgStreamName').value='';showToast('Saved',name);renderSidebar();closeCfg();}
function setFeedSnd(v){feedSound=v;localStorage.setItem('gm_v3_feedsnd',v);}
function setDmSnd(v){dmSound=v;localStorage.setItem('gm_v3_dmsnd',v);}
function setFeedMut(v){feedMuted=v;localStorage.setItem('gm_v3_feedmut',v?'1':'0');}
function setDmMut(v){dmMuted=v;localStorage.setItem('gm_v3_dmmut',v?'1':'0');}
function toggleAllNotif(v){allNotif=v;localStorage.setItem('gm_v3_allnotif',v?'1':'0');}

// === STICKY NOTES ===
function stickyKey(){if(cur.type==='group')return'g:'+cur.id;if(cur.type==='dm')return'd:'+cur.id;if(cur.type==='stream')return's:'+cur.id;return'all';}
function toggleStickyUI(){const bar=el('sticky-bar');bar.style.display=bar.style.display==='none'?'flex':'none';updateStickyUI();}
function updateStickyUI(){const bar=el('sticky-bar');if(bar.style.display==='none')return;const k=stickyKey();const s=stickies[k];el('stickyText').value=s?.text||'';}
function saveSticky(){const k=stickyKey();const txt=el('stickyText').value.trim();const exp=parseInt(el('stickyExp').value)||0;stickies[k]={text:txt,created:Date.now(),exp:exp?Date.now()+exp*3600000:0};sv('gm_v3_sticky',stickies);stickyHist.push({key:k,text:txt,ts:Date.now()});if(stickyHist.length>50)stickyHist=stickyHist.slice(-30);sv('gm_v3_stkhist',stickyHist);showToast('Saved','Sticky saved');if(syncGid)syncPost('STICKY',k+'|'+txt);}
function showStickyHistory(){el('stickyHistOv').style.display='flex';const k=stickyKey();const hist=stickyHist.filter(h=>h.key===k);el('stickyHistList').innerHTML=hist.length?hist.reverse().map(h=>'<div class="sticky-hist-item"><div>'+esc(h.text)+'</div><div class="sticky-hist-time">'+new Date(h.ts).toLocaleString()+'</div></div>').join(''):'<div style="padding:20px;text-align:center">No history</div>';}
function hideStickyHistory(){el('stickyHistOv').style.display='none';}

// === MEMBERS ===
function showMembers(){const ov=el('membersOv');ov.classList.add('show');el('membersBtn').classList.add('active');el('memSearch').value='';currentMembers=[];
if(cur.type==='group'){const g=G.find(x=>x.id===cur.id);el('membersTitle').textContent='Members \u2014 '+(g?.name||'Group');el('membersSub').textContent=(g?.members?.length||0)+' members';currentMembers=(g?.members||[]).map(m=>({name:m.nickname,uid:m.user_id,avatar:m.image_url,roles:m.roles||[]}));}
else if(cur.type==='dm'){const dm=D.find(d=>d.other_user?.id===cur.id);el('membersTitle').textContent='Direct Message';el('membersSub').textContent='';if(dm)currentMembers=[{name:dm.other_user.name,uid:dm.other_user.id,avatar:dm.other_user.avatar_url,roles:[]}];}
else{el('membersTitle').textContent='All Members';const mb={};G.forEach(g=>{(g.members||[]).forEach(m=>{if(!mb[m.user_id])mb[m.user_id]={name:m.nickname,uid:m.user_id,avatar:m.image_url,roles:m.roles||[]};});});currentMembers=Object.values(mb);el('membersSub').textContent=currentMembers.length+' across all groups';}
currentMembers.sort((a,b)=>a.name.localeCompare(b.name));renderMembers(currentMembers);}
function hideMembers(){el('membersOv').classList.remove('show');el('membersBtn').classList.remove('active');}
function filterMembers(q){renderMembers(currentMembers.filter(m=>m.name.toLowerCase().includes(q.toLowerCase())));}
function renderMembers(list){el('memList').innerHTML=list.map(m=>{const isSelf=m.uid===myId;const role=m.roles?.includes('admin')?'Admin':m.group||'Member';const av=m.avatar?'<img src="'+m.avatar+'.avatar" onerror="this.parentElement.textContent=\''+esc((m.name||'?')[0])+'\'">':esc((m.name||'?')[0]);return'<div class="mem-item"><div class="mem-av">'+av+'</div><div class="mem-info"><div class="mem-name">'+esc(m.name)+(isSelf?' <span class="you-tag">YOU</span>':'')+'</div><div class="mem-role">'+role+'</div></div>'+(isSelf?'':'<button class="mem-action" onclick="hideMembers();openDM(\''+m.uid+'\')">Message</button>')+'</div>';}).join('')||'<div style="padding:20px;text-align:center">No members</div>';}

// === CONTACTS ===
function showContacts(){el('contactOv').classList.add('show');buildCon('');}
function hideContacts(){el('contactOv').classList.remove('show');}
function filterCon(q){buildCon(q);}
function buildCon(q){const mb={};G.forEach(g=>{(g.members||[]).forEach(m=>{if(!mb[m.user_id])mb[m.user_id]={name:m.nickname,groups:[],uid:m.user_id};mb[m.user_id].groups.push(g.name);});});let list=Object.values(mb);if(q)list=list.filter(m=>m.name.toLowerCase().includes(q.toLowerCase()));list.sort((a,b)=>a.name.localeCompare(b.name));el('conList').innerHTML=list.map(m=>'<div class="con-item" onclick="hideContacts();openDM(\''+m.uid+'\')"><div class="con-name">'+esc(m.name)+'</div><div class="con-groups">'+m.groups.slice(0,3).map(g=>esc(g)).join(', ')+(m.groups.length>3?' +'+(m.groups.length-3)+' more':'')+'</div><div class="con-count">'+m.groups.length+'g</div></div>').join('')||'<div style="padding:20px;text-align:center">No contacts</div>';}

// === AD-HOC BROADCAST ===
function showAdhoc(){el('adhocModal').style.display='flex';el('adhocGroups').innerHTML=G.sort((a,b)=>a.name.localeCompare(b.name)).map(g=>'<label class="cfg-chk"><input type="checkbox" value="'+g.id+'"> '+esc(g.name)+'</label>').join('');}
function hideAdhoc(){el('adhocModal').style.display='none';}
async function sendAdhoc(){const ids=Array.from(document.querySelectorAll('#adhocGroups input:checked')).map(i=>i.value);const txt=el('adhocMsg').value.trim();if(!ids.length||!txt)return;for(const gid of ids)await sendTo('group',gid,txt);el('adhocMsg').value='';hideAdhoc();showToast('Sent','Broadcast to '+ids.length+' groups');setTimeout(pollMessages,500);}

// === SHIFT CHANGE ===
function showShiftChange(){el('shiftModal').style.display='flex';el('shiftOff').value=myName;el('shiftTargets').innerHTML=G.sort((a,b)=>a.name.localeCompare(b.name)).map(g=>'<label class="cfg-chk"><input type="checkbox" value="'+g.id+'"> '+esc(g.name)+'</label>').join('');}
function hideShiftChange(){el('shiftModal').style.display='none';}
async function sendShiftChange(){const ids=Array.from(document.querySelectorAll('#shiftTargets input:checked')).map(i=>i.value);const off=el('shiftOff').value.trim(),on=el('shiftOn').value.trim(),ph=el('shiftPhone').value.trim();if(!ids.length||!off||!on)return;const txt='\ud83d\udccb SHIFT CHANGE\n'+off+' is going off shift.\n'+on+' is now on dispatch'+(ph?' \u2014 '+ph:'.')+'.';for(const gid of ids)await sendTo('group',gid,txt);hideShiftChange();showToast('Sent','Shift change posted');setTimeout(pollMessages,500);}

// === EXPORT ===
function exportChat(){const msgs=el('messages-panel-0');if(!msgs)return;const lines=[];msgs.querySelectorAll('.message').forEach(m=>{const auth=m.querySelector('.message-author')?.textContent||'';const time=m.querySelector('.message-time')?.textContent||'';const text=m.querySelector('.message-bubble')?.textContent||'';lines.push('['+time+'] '+auth+': '+text);});const blob=new Blob([lines.join('\n')],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='delta360-export-'+new Date().toISOString().slice(0,10)+'.txt';a.click();}
function exportShiftLog(){const lines=['=== DELTA 360 SHIFT LOG ===','Time: '+new Date().toLocaleString(),'Operator: '+myName,'Status: '+myStat,'View: '+cur.type+(cur.id?' / '+getPanelTitle(cur.type,cur.id):''),'Active groups: '+G.filter(g=>getLastMsg(g)>Date.now()/1000-21600).map(g=>g.name).join(', '),''];const blob=new Blob([lines.join('\n')],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='delta360-shiftlog-'+new Date().toISOString().slice(0,10)+'.txt';a.click();}

// === IMAGE UPLOAD ===
async function handleImg(inp){const f=inp.files?.[0];if(!f)return;try{const r=await fetch('https://image.groupme.com/pictures',{method:'POST',headers:{'X-Access-Token':TK,'Content-Type':f.type},body:f});const d=await r.json();if(d.payload?.url){pendImg=d.payload.url;const mi=el('input-panel-0');if(mi)mi.placeholder='\ud83d\udcf7 Image ready';showToast('Image','Uploaded');}}catch(e){showToast('Error','Upload failed');}inp.value='';}

// === CLIPBOARD ===
function toggleCB(){const cb=el('clipboard');cb.style.display=cb.style.display==='none'?'flex':'none';if(cb.style.display==='flex'){el('cbText').value=localStorage.getItem('gm_v3_cb')||'';updateCBCount();}}
function saveCBContent(){localStorage.setItem('gm_v3_cb',el('cbText').value);updateCBCount();}
function updateCBCount(){el('cbCount').textContent=(el('cbText').value||'').length;}
function clearCB(){if(!confirm('Clear clipboard?'))return;el('cbText').value='';localStorage.removeItem('gm_v3_cb');updateCBCount();}
(function(){let drag=false,ox=0,oy=0;document.addEventListener('mousedown',e=>{if(e.target.closest('#cbDrag')){drag=true;const cb=el('clipboard');ox=e.clientX-cb.offsetLeft;oy=e.clientY-cb.offsetTop;e.preventDefault();}});document.addEventListener('mousemove',e=>{if(!drag)return;const cb=el('clipboard');cb.style.left=(e.clientX-ox)+'px';cb.style.top=(e.clientY-oy)+'px';cb.style.right='auto';cb.style.bottom='auto';});document.addEventListener('mouseup',()=>{drag=false;});})();

// === EMOJI ===
function initEP(){const h=EMO.map(e=>'<button onclick="insEmo(this,\''+e+'\')">'+e+'</button>').join('');document.querySelectorAll('.emoji-picker').forEach(p=>p.innerHTML=h);}
function toggleEP(id){document.querySelectorAll('.emoji-picker.show').forEach(p=>{if(p.id!==id)p.classList.remove('show');});el(id)?.classList.toggle('show');}
function insEmo(btn,em){btn.closest('.emoji-picker').classList.remove('show');const inp=btn.closest('.input-area')?.querySelector('.msg-input')||el('input-panel-0');if(inp){inp.value+=em;inp.focus();}}
document.addEventListener('click',e=>{if(!e.target.closest('.emoji-picker')&&!e.target.closest('.emoji-toggle'))document.querySelectorAll('.emoji-picker.show').forEach(p=>p.classList.remove('show'));});

// === DRAFTS ===
function saveDraft(mid,v){if(v?.trim())drafts[mid]=v;else delete drafts[mid];sessionStorage.setItem('gm_v3_drafts',JSON.stringify(drafts));}
function restDraft(mid){const v=drafts[mid];if(!v)return;const i=el('input-panel-0');if(i)i.value=v;}

// === SEARCH ===
function toggleSearch(){const ov=el('searchOv');if(!ov)return;ov.classList.toggle('show');if(ov.classList.contains('show'))el('searchIn')?.focus();}
let searchTimer=null;
function doSearch(q){clearTimeout(searchTimer);const r=el('searchRes');if(!q||q.length<2){r.innerHTML='';return;}searchTimer=setTimeout(()=>runSearch(q),250);}
async function runSearch(q){const r=el('searchRes');const ql=q.toLowerCase();let res=searchIdx.filter(m=>m.text?.toLowerCase().includes(ql));const isNum=/^\d{4,}$/.test(q.trim());
if(isNum||res.length<5){r.innerHTML=(res.length?renderSR(res,q):'')+'<div style="padding:8px;text-align:center;opacity:.5">Searching API...</div>';try{const fetches=G.slice(0,12).map(g=>apiCall('/groups/'+g.id+'/messages?limit='+(isNum?40:15)).catch(()=>null));const results=await Promise.all(fetches);results.forEach(d=>{if(d?.response?.messages)d.response.messages.forEach(m=>{if(m.text?.toLowerCase().includes(ql)&&!res.find(x=>x.id===m.id)){const gn=G.find(g=>g.id===m.group_id)?.name||'?';res.push({...m,_gn:gn,_type:'group',_tid:m.group_id});idxMsg(m);}});});}catch(e){}}
res.sort((a,b)=>b.created_at-a.created_at);r.innerHTML=res.length?renderSR(res.slice(0,40),q):'<div style="padding:20px;text-align:center">No results</div>';}
function renderSR(res,q){const re=new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');return res.map(m=>{const hl=(m.text||'').substring(0,100).replace(re,'<mark>$1</mark>');return'<div class="search-result" onclick="toggleSearch();switchView(\''+(m._type||'group')+'\',\''+(m._tid||m.group_id)+'\')"><div class="sr-author">'+esc(m.name)+' \u00B7 '+esc(m._gn||'')+'</div><div class="sr-text">'+hl+'</div><div class="sr-time">'+fT(m.created_at)+'</div></div>';}).join('');}
function idxMsg(m){if(m.text&&!searchIdx.find(x=>x.id===m.id)){const gn=G.find(g=>g.id===m.group_id)?.name||'DM';searchIdx.push({...m,_gn:gn,_type:m.group_id?'group':'dm',_tid:m.group_id||(m.user_id===myId?m.recipient_id:m.user_id)});if(searchIdx.length>2000)searchIdx=searchIdx.slice(-1500);}}
async function syncPost(tag,data){if(!syncGid)return;try{await apiCall('/groups/'+syncGid+'/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:{text:'[D360:'+tag+'] '+data,source_guid:'d360sync'+Date.now()+Math.random()}})});}catch(e){}}

// === UI TOGGLES ===
function tglSidebar(){const sb=el('sidebar');if(!sb)return;if(window.innerWidth<=600){sb.classList.toggle('open');sb.classList.remove('collapsed');}else sb.classList.toggle('collapsed');}
function tglMenu(){const m=el('main-menu');if(m)m.classList.toggle('show');}
function tglTray(id){document.querySelectorAll('.tray.show').forEach(t=>{if(t.id!==id)t.classList.remove('show');});el(id)?.classList.toggle('show');}
function closeTray(){document.querySelectorAll('.tray.show').forEach(t=>t.classList.remove('show'));}
function toggleTheme(){document.body.classList.toggle('dark');localStorage.setItem('gm_v3_theme',document.body.classList.contains('dark')?'dark':'light');}
function toggleCompact(){compactMode=!compactMode;document.body.classList.toggle('compact');localStorage.setItem('gm_v3_compact',compactMode?'1':'0');}
function toggleInputBottom(){inputBottom=!inputBottom;document.body.classList.toggle('input-bottom');localStorage.setItem('gm_v3_inputbot',inputBottom?'1':'0');}
function toggleOldestFirst(){oldestFirst=!oldestFirst;document.body.classList.toggle('oldest-first');localStorage.setItem('gm_v3_oldest',oldestFirst?'1':'0');switchView(cur.type,cur.id);}
function setCon(ok){isCon=ok;}

// === STARTUP ===
window.addEventListener('DOMContentLoaded',()=>{
if(localStorage.getItem('gm_v3_theme')==='dark')document.body.classList.add('dark');
if(localStorage.getItem('gm_v3_compact')==='1')document.body.classList.add('compact');
if(localStorage.getItem('gm_v3_inputbot')==='1')document.body.classList.add('input-bottom');
document.addEventListener('click',event=>{
const ci=event.target.closest('[data-chat-action]');if(ci){handleChatClick(event,ci.getAttribute('data-chat-action'),ci.getAttribute('data-chat-id')==='null'?null:ci.getAttribute('data-chat-id'));return;}
const sb=event.target.closest('[data-action="toggle-sort"]');if(sb){sidebarSort=sidebarSort==='recent'?'heat':'recent';localStorage.setItem('gm_v3_sort',sidebarSort);renderSidebar();return;}
const ib=event.target.closest('[data-action="toggle-inactive"]');if(ib){inactiveOpen=!inactiveOpen;localStorage.setItem('gm_v3_inactive_open',inactiveOpen);const t=el('inactive-toggle'),l=el('inactive-list');if(t)t.classList.toggle('open',inactiveOpen);if(l)l.style.display=inactiveOpen?'flex':'none';return;}
const menu=el('main-menu');if(menu&&menu.classList.contains('show')&&!event.target.closest('.menu-wrapper'))menu.classList.remove('show');
if(!event.target.closest('.menu-wrapper'))closeTray();
});
document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;if(e.key==='/')e.preventDefault(),toggleSearch();if(e.key==='c'||e.key==='C')e.preventDefault(),toggleCB();});
if(Notification.permission==='default')Notification.requestPermission();
if(TK){const t=el('tok');if(t)t.value=TK;doLogin();}
});
