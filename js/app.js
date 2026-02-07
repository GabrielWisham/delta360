/**
 * Δ DELTA 360 — DISPATCH CLIENT v10
 * Modernized, Robust, and Secure
 */

// --- GLOBAL STATE ---
let TK = localStorage.getItem('gm_v3_token') || '';
let G = [], D = [], known = new Map();
let cur = { type: 'all', id: null };
let myId = '', myName = '';
let pollTmr = null, isCon = false;
let myStat = localStorage.getItem('gm_v3_status') || 'avl';
let syncGid = null; // Dispatch group ID
let teamStatus = {}; 
let lastDayKey = null;

// Audio Context
let actx = null;

// --- UTILITIES ---
const el = (id) => document.getElementById(id);
const esc = (t) => {
    if (!t) return '';
    return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};
const sv = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// --- API WRAPPER ---
async function apiCall(endpoint, opts = {}) {
    if (!TK) throw new Error("No token");
    const url = endpoint.startsWith('http') ? endpoint : `https://api.groupme.com/v3${endpoint}${endpoint.includes('?') ? '&' : '?'}token=${TK}`;
    
    try {
        const r = await fetch(url, opts);
        if (r.status === 401) {
            doLogout();
            throw new Error("Unauthorized");
        }
        if (!r.ok) throw new Error(`API Error ${r.status}`);
        return await r.json();
    } catch (e) {
        console.warn("API Fail:", e.message);
        setCon(false);
        throw e;
    }
}

// --- LOGIN / AUTH ---
async function doLogin() {
    const t = el('tok').value.trim();
    if (!t) return;
    
    el('lerr').style.display = 'none';
    try {
        // Validate Token
        const r = await fetch(`https://api.groupme.com/v3/users/me?token=${t}`);
        if (!r.ok) throw new Error("Invalid Token");
        const d = await r.json();
        
        // Success
        TK = t;
        myId = d.response.id;
        myName = d.response.name;
        localStorage.setItem('gm_v3_token', t);
        
        // UI Switch
        el('login').style.display = 'none';
        el('hdr').style.display = 'flex';
        el('main').style.display = 'flex';
        
        await initData();
        startPoll();
    } catch (e) {
        el('lerr').style.display = 'block';
        el('lerr').textContent = "Connection Failed: Invalid Token";
    }
}

function doLogout() {
    localStorage.removeItem('gm_v3_token');
    location.reload();
}

// --- INITIALIZATION ---
async function initData() {
    await rfData();
    findSyncGroup();
    renderSidebar();
    switchView('all');
    setStat(myStat, false);
}

// --- POLLING ENGINE (Recursive) ---
function startPoll() {
    if (pollTmr) clearTimeout(pollTmr);
    pollLoop();
}

async function pollLoop() {
    if (!TK) return;
    try {
        await pollMessages();
        await syncPoll(); // Update team status
        setCon(true);
    } catch (e) {
        setCon(false);
    } finally {
        // Wait 4s before next poll
        pollTmr = setTimeout(pollLoop, 4000);
    }
}

async function pollMessages() {
    let buf = [];
    
    // Strategy: Context-Aware Polling
    if (cur.type === 'group' && cur.id) {
        const d = await apiCall(`/groups/${cur.id}/messages?limit=5`);
        if (d.response) buf = d.response.messages;
    } else if (cur.type === 'dm' && cur.id) {
        const d = await apiCall(`/direct_messages?other_user_id=${cur.id}&limit=5`);
        if (d.response) buf = d.response.direct_messages;
    } else if (cur.type === 'all') {
        // "Firehose" - poll top 5 groups
        const proms = G.slice(0, 5).map(g => apiCall(`/groups/${g.id}/messages?limit=2`).catch(() => null));
        const res = await Promise.all(proms);
        res.forEach(r => { if (r?.response?.messages) buf.push(...r.response.messages); });
    }

    // Process Buffer
    buf.sort((a, b) => a.created_at - b.created_at);
    let newItems = false;
    for (const m of buf) {
        if (!known.has(m.id)) {
            renderMsg(m, true); // true = isNew
            known.set(m.id, true);
            newItems = true;
        }
    }
    
    // Memory Management
    if (known.size > 2000) known.clear();
}

// --- DATA FETCHING ---
async function rfData() {
    const [gRes, dRes] = await Promise.all([
        apiCall('/groups?per_page=100'),
        apiCall('/chats?per_page=50')
    ]);
    G = gRes.response || [];
    D = dRes.response || [];
    renderSidebar();
}

// --- VIEW CONTROLLER ---
function switchView(type, id) {
    cur = { type, id };
    const log = el('log');
    log.innerHTML = '<div class="spin"></div>';
    known.clear();
    lastDayKey = null;
    
    // Update Header Title
    let title = "Universal Feed";
    if (type === 'group') title = G.find(g => g.id === id)?.name || "Group";
    if (type === 'dm') title = D.find(d => d.other_user.id === id)?.other_user.name || "DM";
    el('htitle').textContent = title;
    
    // Sidebar Highlight
    document.querySelectorAll('.ci').forEach(e => e.classList.remove('ac', 'acd'));
    if (id) {
        const active = document.getElementById(`nav-${id}`);
        if (active) active.classList.add(type === 'dm' ? 'acd' : 'ac');
    }

    loadHistory();
}

async function loadHistory() {
    let msgs = [];
    try {
        if (cur.type === 'group') {
            const d = await apiCall(`/groups/${cur.id}/messages?limit=30`);
            msgs = d.response.messages || [];
        } else if (cur.type === 'dm') {
            const d = await apiCall(`/direct_messages?other_user_id=${cur.id}&limit=30`);
            msgs = d.response.direct_messages || [];
        } else if (cur.type === 'all') {
            const proms = G.slice(0, 8).map(g => apiCall(`/groups/${g.id}/messages?limit=5`).catch(() => null));
            const res = await Promise.all(proms);
            res.forEach(r => { if(r?.response?.messages) msgs.push(...r.response.messages); });
        }
    } catch (e) {}

    const log = el('log');
    log.innerHTML = '';
    
    if (msgs.length === 0) {
        log.innerHTML = '<div class="empty">No messages found</div>';
        return;
    }

    msgs.sort((a, b) => a.created_at - b.created_at);
    msgs.forEach(m => {
        known.set(m.id, true);
        renderMsg(m, false);
    });
    
    // Scroll to bottom
    setTimeout(() => { log.scrollTop = log.scrollHeight; }, 50);
}

// --- RENDERING MESSAGE CARDS ---
function renderMsg(m, isNew) {
    const log = el('log');
    const isMe = (m.sender_id || m.user_id) === myId;
    const isDm = !m.group_id;
    
    // Day Divider Logic
    const d = new Date(m.created_at * 1000);
    const dk = d.toDateString();
    if (dk !== lastDayKey) {
        const div = document.createElement('div');
        div.style.textAlign = 'center';
        div.style.margin = '20px 0';
        div.style.fontSize = '11px';
        div.style.color = 'var(--t4)';
        div.style.fontWeight = '700';
        div.textContent = d.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
        log.appendChild(div);
        lastDayKey = dk;
    }

    // Create Card
    const card = document.createElement('div');
    card.className = `card ${isMe ? 'self' : ''} ${isDm ? 'dmc' : ''}`;
    
    // Avatar
    const avUrl = m.avatar_url;
    const avHtml = avUrl 
        ? `<img src="${avUrl}" class="av" onerror="this.style.display='none'">` 
        : `<div class="av" style="display:flex;align-items:center;justify-content:center;font-size:10px">${(m.name||'?')[0]}</div>`;
    
    // Attachments
    const imgs = (m.attachments || []).filter(a => a.type === 'image').map(a => 
        `<img src="${a.url}" class="att" loading="lazy" onload="keepScroll()">`
    ).join('');

    card.innerHTML = `
        <div class="ch">
            <div class="usr" onclick="switchView('dm', '${m.user_id||m.sender_id}')">
                ${avHtml} <span>${esc(m.name)}</span>
            </div>
            <span class="ts">${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
        </div>
        <div class="cb">${esc(m.text)}${imgs}</div>
    `;

    // Auto-scroll Logic
    const isNearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 150;
    log.appendChild(card);
    
    if (isNew) {
        if (isNearBottom || isMe) log.scrollTop = log.scrollHeight;
        if (!isMe) {
            playSnd('radar');
            showToast(m.name, m.text);
        }
    }
}

function keepScroll() {
    const log = el('log');
    if (log.scrollHeight - log.scrollTop - log.clientHeight < 400) {
        log.scrollTop = log.scrollHeight;
    }
}

// --- SENDING ---
async function sendBcast() {
    const inp = el('gIn');
    const txt = inp.value.trim();
    if (!txt) return;
    
    const body = { message: { source_guid: Date.now().toString(), text: txt } };
    
    try {
        if (cur.type === 'group') {
            await apiCall(`/groups/${cur.id}/messages`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
        } else if (cur.type === 'dm') {
            body.direct_message = { ...body.message, recipient_id: cur.id };
            delete body.message;
            await apiCall(`/direct_messages`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
        }
        inp.value = '';
        pollMessages(); // Trigger instant update
    } catch (e) {
        alert("Failed to send message.");
    }
}

function bKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBcast(); }
}

function autoX(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

// --- DISPATCH BOARD & SYNC ---
async function findSyncGroup() {
    const g = G.find(x => x.name.toLowerCase() === 'dispatch');
    if (g) syncGid = g.id;
}
async function syncPoll() {
    if (!syncGid) return;
    const d = await apiCall(`/groups/${syncGid}/messages?limit=20`);
    if (d.response?.messages) {
        d.response.messages.forEach(m => {
            if (m.text && m.text.includes('[STATUS]')) {
                // Parse: [STATUS] Name|avl
                const parts = m.text.match(/\[STATUS\] (.*)\|(.*)/);
                if (parts) teamStatus[parts[1]] = parts[2];
            }
        });
        renderDB();
    }
}
function setStat(s, broadcast) {
    myStat = s;
    localStorage.setItem('gm_v3_status', s);
    
    // Update UI
    const pill = el('stat-pill');
    pill.className = `status-pill ${s}`;
    el('stat-text').textContent = s === 'avl' ? 'AVAILABLE' : (s === 'bsy' ? 'BUSY' : 'AWAY');
    
    if (broadcast && syncGid) {
        const txt = `[STATUS] ${myName}|${s}`;
        apiCall(`/groups/${syncGid}/messages`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ message: { source_guid: Date.now().toString(), text: txt } })
        });
    }
}
function renderDB() {
    const db = el('dboard');
    let h = `<span style="font-size:10px;font-weight:700;color:var(--t4)">TEAM</span>`;
    Object.keys(teamStatus).sort().forEach(n => {
        h += `<div class="db-chip ${teamStatus[n]}"><span class="dot"></span> ${esc(n)}</div>`;
    });
    db.innerHTML = h;
}

// --- SIDEBAR ---
function renderSidebar() {
    const sl = el('sL');
    sl.innerHTML = `<div class="ci ${cur.type==='all'?'ac':''}" onclick="switchView('all')">Universal Feed</div>`;
    
    G.forEach(g => {
        sl.innerHTML += `<div id="nav-${g.id}" class="ci" onclick="switchView('group', '${g.id}')"># ${esc(g.name)}</div>`;
    });
    
    const al = el('aL');
    al.innerHTML = '';
    D.forEach(d => {
        al.innerHTML += `<div id="nav-${d.other_user.id}" class="ci" onclick="switchView('dm', '${d.other_user.id}')" style="color:var(--dm)">@ ${esc(d.other_user.name)}</div>`;
    });
}

function setCon(ok) {
    isCon = ok;
    // You can add a connection indicator in UI if needed
}

// --- AUDIO SYSTEM ---
function getCtx() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    return actx;
}
function osc(c, f1, f2, type, dur, vol=0.1) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, c.currentTime);
    o.frequency.linearRampToValueAtTime(f2, c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
}
function playSnd(name) {
    try { 
        const c = getCtx();
        if (name === 'radar') osc(c, 800, 1400, 'sine', 0.15);
    } catch(e){}
}

// --- UI HELPERS ---
function tglSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}
function tglTray(id, btn) {
    document.querySelectorAll('.tray').forEach(t => { if(t.id!==id) t.classList.remove('show'); });
    document.getElementById(id).classList.toggle('show');
}
function showToast(title, body) {
    const z = el('toast-zone');
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<div class="t-hdr">${esc(title)}</div><div class="t-body">${esc(body.substring(0,60))}...</div>`;
    z.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; setTimeout(()=>t.remove(), 300); }, 4000);
}

// Start
window.addEventListener('DOMContentLoaded', () => {
    if (TK) doLogin();
});