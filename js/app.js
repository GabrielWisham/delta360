/**
 * Δ DELTA 360 — DISPATCH CLIENT v11
 * Modern, minimal, multi-panel chat interface
 */

// --- GLOBAL STATE ---
let TK = localStorage.getItem('gm_v3_token') || '';
let G = [], D = [], known = new Map();
let cur = { type: 'all', id: null };
let myId = '', myName = '';
let pollTmr = null, isCon = false;
let myStat = localStorage.getItem('gm_v3_status') || 'awy';
let syncGid = null;
let teamStatus = {};
let soundEnabled = localStorage.getItem('gm_v3_sound') !== 'false';
let soundPref = localStorage.getItem('gm_v3_soundpref') || 'radar';
let panels = []; // Array of open panel IDs
let actx = null;

// --- UTILITIES ---
const el = (id) => document.getElementById(id);
const esc = (t) => {
    if (!t) return '';
    return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

// --- API WRAPPER ---
async function apiCall(endpoint, opts = {}) {
    if (!TK) throw new Error("No token");
    const url = endpoint.startsWith('http') ? endpoint : `https://api.groupme.com/v3${endpoint}${endpoint.includes('?') ? '&' : '?'}token=${TK}`;
    try {
        const r = await fetch(url, opts);
        if (r.status === 401) { doLogout(); throw new Error("Unauthorized"); }
        if (!r.ok) throw new Error(`API Error ${r.status}`);
        return await r.json();
    } catch (e) {
        console.warn("API Fail:", e.message);
        setCon(false);
        throw e;
    }
}

// --- LOGIN --- 
async function doLogin() {
    const t = el('tok').value.trim();
    if (!t) return;
    
    el('lerr').style.display = 'none';
    try {
        const r = await fetch(`https://api.groupme.com/v3/users/me?token=${t}`);
        if (!r.ok) throw new Error("Invalid Token");
        const d = await r.json();
        
        TK = t;
        myId = d.response.id;
        myName = d.response.name;
        localStorage.setItem('gm_v3_token', t);
        
        el('login').style.display = 'none';
        el('app-root').style.display = 'flex';
        
        await initData();
        startPoll();
    } catch (e) {
        el('lerr').style.display = 'block';
        el('lerr').textContent = "Invalid token. Please try again.";
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
    openPanel(cur.type, cur.id);
    setStat(myStat, false);
    loadSoundPref();
}

// --- POLLING ---
function startPoll() {
    if (pollTmr) clearTimeout(pollTmr);
    pollLoop();
}

async function pollLoop() {
    if (!TK) return;
    try {
        await pollMessages();
        await syncPoll();
        setCon(true);
    } catch (e) {
        setCon(false);
    } finally {
        pollTmr = setTimeout(pollLoop, 4000);
    }
}

async function pollMessages() {
    if (panels.length === 0) return;
    
    let allMsgs = [];
    
    for (const panelId of panels) {
        try {
            let msgs = [];
            const [type, id] = panelId.split(':');
            
            if (type === 'group') {
                const d = await apiCall(`/groups/${id}/messages?limit=10`);
                msgs = d.response?.messages || [];
            } else if (type === 'dm') {
                const d = await apiCall(`/direct_messages?other_user_id=${id}&limit=10`);
                msgs = d.response?.direct_messages || [];
            }
            
            msgs.forEach(m => {
                if (!known.has(m.id)) {
                    known.set(m.id, true);
                    renderMsgToPanel(panelId, m, true);
                }
            });
        } catch (e) {
            console.warn("Poll error for panel", panelId);
        }
    }
    
    // Memory cleanup
    if (known.size > 3000) known.clear();
}

// --- DATA FETCHING ---
async function rfData() {
    const [gRes, dRes] = await Promise.all([
        apiCall('/groups?per_page=100'),
        apiCall('/chats?per_page=50')
    ]);
    G = gRes.response || [];
    D = dRes.response || [];
}

// --- PANEL MANAGEMENT ---
function openPanel(type, id) {
    if (!id && type !== 'all') return;
    
    const panelId = type === 'all' ? 'all:null' : `${type}:${id}`;
    
    // Don't open duplicate panels
    if (panels.includes(panelId)) return;
    
    // Limit to 3 panels
    if (panels.length >= 3) {
        removePanel(panels[0]);
    }
    
    panels.push(panelId);
    renderPanel(panelId);
    loadHistoryForPanel(panelId);
}

function removePanel(panelId) {
    panels = panels.filter(p => p !== panelId);
    const panelEl = document.getElementById(`panel-${panelId}`);
    if (panelEl) panelEl.remove();
}

function renderPanel(panelId) {
    const wrap = el('panels-wrap');
    const [type, id] = panelId.split(':');
    
    // Get title
    let title = 'Feed';
    if (type === 'group') {
        title = G.find(g => g.id === id)?.name || 'Group';
    } else if (type === 'dm') {
        title = D.find(d => d.other_user.id === id)?.other_user.name || 'DM';
    }
    
    const panelHTML = `
        <div id="panel-${panelId}" class="panel">
            <div class="panel-header">
                <div class="panel-title">${esc(title)}</div>
                ${panels.length > 1 ? `<button class="panel-close" onclick="removePanel('${panelId}')">✕</button>` : ''}
            </div>
            <div class="messages" id="messages-${panelId}">
                <div class="message-empty">
                    <div class="message-empty-icon">Δ</div>
                    <div class="message-empty-text">No messages</div>
                </div>
            </div>
            <div class="input-area">
                <textarea class="msg-input" id="input-${panelId}" placeholder="Type message..." aria-label="Message input" onkeydown="if(event.key==='Enter'&&!event.shiftKey)sendMsg('${panelId}')"></textarea>
                <button class="send-btn" onclick="sendMsg('${panelId}')" aria-label="Send message"><span>Send</span></button>
            </div>
        </div>
    `;
    
    wrap.insertAdjacentHTML('beforeend', panelHTML);
}

async function loadHistoryForPanel(panelId) {
    const [type, id] = panelId.split(':');
    let msgs = [];
    
    try {
        if (type === 'group') {
            const d = await apiCall(`/groups/${id}/messages?limit=50`);
            msgs = d.response?.messages || [];
        } else if (type === 'dm') {
            const d = await apiCall(`/direct_messages?other_user_id=${id}&limit=50`);
            msgs = d.response?.direct_messages || [];
        } else if (type === 'all') {
            const proms = G.slice(0, 5).map(g => apiCall(`/groups/${g.id}/messages?limit=5`).catch(() => null));
            const res = await Promise.all(proms);
            res.forEach(r => { if (r?.response?.messages) msgs.push(...r.response.messages); });
        }
    } catch (e) {
        console.warn("History load failed", e);
    }
    
    const messagesEl = el(`messages-${panelId}`);
    messagesEl.innerHTML = '';
    
    if (msgs.length === 0) {
        messagesEl.innerHTML = `
            <div class="message-empty">
                <div class="message-empty-icon">Δ</div>
                <div class="message-empty-text">No messages</div>
            </div>
        `;
        return;
    }
    
    // Sort chronologically (oldest first)
    msgs.sort((a, b) => a.created_at - b.created_at);
    
    let lastDateKey = null;
    msgs.forEach(m => {
        known.set(m.id, true);
        
        // Date divider
        const d = new Date(m.created_at * 1000);
        const dateKey = d.toDateString();
        if (dateKey !== lastDateKey) {
            const divider = document.createElement('div');
            divider.className = 'message-date-divider';
            divider.innerHTML = `<span>${d.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})}</span>`;
            messagesEl.appendChild(divider);
            lastDateKey = dateKey;
        }
        
        renderMsgToPanel(panelId, m, false);
    });
    
    // Scroll to bottom
    setTimeout(() => {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 50);
}

function renderMsgToPanel(panelId, m, isNew) {
    const messagesEl = el(`messages-${panelId}`);
    if (!messagesEl) return;
    
    const isMe = (m.sender_id || m.user_id) === myId;
    const d = new Date(m.created_at * 1000);
    const timeStr = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    
    const msgHTML = `
        <div class="message ${isMe ? 'self' : ''}">
            <div class="message-avatar" title="${esc(m.name)}" onclick="shiftClick(event) ? openPanel('dm', '${m.user_id || m.sender_id}') : null">
                ${m.avatar_url ? `<img src="${m.avatar_url}" alt="">` : (m.name || 'U')[0]}
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${esc(m.name)}</span>
                    <span class="message-time">${timeStr}</span>
                </div>
                <div class="message-bubble">${esc(m.text)}${(m.attachments || []).filter(a => a.type === 'image').map(a => `<img src="${a.url}" alt="">`).join('')}</div>
            </div>
        </div>
    `;
    
    const msgEl = document.createElement('div');
    msgEl.innerHTML = msgHTML;
    messagesEl.appendChild(msgEl.firstElementChild);
    
    // Auto-scroll if near bottom
    if (isNew) {
        const isNearBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 150;
        if (isNearBottom || isMe) {
            setTimeout(() => { messagesEl.scrollTop = messagesEl.scrollHeight; }, 0);
        }
        
        if (!isMe && soundEnabled) {
            playSnd();
            showToast(m.name, m.text);
        }
    }
}

function shiftClick(e) {
    return e.shiftKey;
}

// --- MESSAGING ---
async function sendMsg(panelId) {
    const [type, id] = panelId.split(':');
    const inp = el(`input-${panelId}`);
    const txt = inp.value.trim();
    if (!txt) return;
    
    const guid = Date.now().toString();
    
    try {
        if (type === 'group') {
            await apiCall(`/groups/${id}/messages`, {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({message: {source_guid: guid, text: txt}})
            });
        } else if (type === 'dm') {
            await apiCall(`/direct_messages`, {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({direct_message: {source_guid: guid, recipient_id: id, text: txt}})
            });
        }
        inp.value = '';
        inp.style.height = 'auto';
        pollMessages();
    } catch (e) {
        showToast('Error', 'Failed to send message');
    }
}

// --- STATUS ---
async function findSyncGroup() {
    const g = G.find(x => x.name.toLowerCase() === 'dispatch');
    if (g) syncGid = g.id;
}

async function syncPoll() {
    if (!syncGid) return;
    try {
        const d = await apiCall(`/groups/${syncGid}/messages?limit=20`);
        if (d.response?.messages) {
            d.response.messages.forEach(m => {
                if (m.text && m.text.includes('[STATUS]')) {
                    const parts = m.text.match(/\[STATUS\] (.*)\|(.*)/);
                    if (parts) teamStatus[parts[1]] = parts[2];
                }
            });
            renderDB();
        }
    } catch (e) {}
}

function cycleStatus() {
    const next = myStat === 'avl' ? 'bsy' : (myStat === 'bsy' ? 'awy' : 'avl');
    setStat(next, true);
}

function setStat(s, broadcast) {
    myStat = s;
    localStorage.setItem('gm_v3_status', s);
    
    const btn = el('status-btn');
    btn.className = `status-btn ${s}`;
    el('status-text').textContent = s === 'avl' ? 'Available' : (s === 'bsy' ? 'Busy' : 'Away');
    
    if (broadcast && syncGid) {
        const txt = `[STATUS] ${myName}|${s}`;
        apiCall(`/groups/${syncGid}/messages`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({message: {source_guid: Date.now().toString(), text: txt}})
        }).catch(() => {});
    }
}

function renderDB() {
    const db = el('dboard');
    let h = `<span>Team</span>`;
    Object.keys(teamStatus).sort().forEach(n => {
        h += `<div class="db-chip ${teamStatus[n]}"><span class="dot"></span>${esc(n)}</div>`;
    });
    db.innerHTML = h;
}

// --- SIDEBAR ---
function renderSidebar() {
    const sl = el('sL');
    sl.innerHTML = `<div class="sidebar-item active" onclick="openPanel('all', null)">All Messages</div>`;
    
    G.forEach(g => {
        sl.innerHTML += `<div class="sidebar-item" id="nav-group-${g.id}" onclick="openPanel('group', '${g.id}')" title="${esc(g.name)}"># ${esc(g.name)}</div>`;
    });
    
    const al = el('aL');
    al.innerHTML = '';
    D.forEach(d => {
        al.innerHTML += `<div class="sidebar-item" id="nav-dm-${d.other_user.id}" onclick="openPanel('dm', '${d.other_user.id}')" title="@${esc(d.other_user.name)}">@ ${esc(d.other_user.name)}</div>`;
    });
}

function setCon(ok) {
    isCon = ok;
}

// --- AUDIO ---
function getCtx() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    return actx;
}

function playSnd() {
    try {
        const c = getCtx();
        const o = c.createOscillator();
        const g = c.createGain();
        o.frequency.setValueAtTime(800, c.currentTime);
        o.frequency.linearRampToValueAtTime(1200, c.currentTime + 0.1);
        g.gain.setValueAtTime(0.1, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.1);
        o.connect(g).connect(c.destination);
        o.start();
        o.stop(c.currentTime + 0.1);
    } catch (e) {}
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('gm_v3_sound', soundEnabled);
    el('sound-icon').textContent = soundEnabled ? '🔊' : '🔇';
}

function loadSoundPref() {
    if (!soundEnabled) {
        el('sound-icon').textContent = '🔇';
    }
}

function setSoundPreference(val) {
    soundPref = val;
    localStorage.setItem('gm_v3_soundpref', val);
}

// --- UI HELPERS ---
function tglSidebar() {
    el('sidebar').classList.toggle('collapsed');
}

function toggleSearch() {
    const ov = el('searchOv');
    ov.classList.toggle('show');
    if (ov.classList.contains('show')) {
        el('searchIn').focus();
    }
}

function toggleSettings() {
    el('settingsOv').classList.toggle('show');
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem('gm_v3_theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}

function tglMenu() {
    el('main-menu').classList.toggle('show');
}

function showSettings() {
    tglMenu();
    toggleSettings();
}

function doSearch(query) {
    if (!query || query.length < 2) {
        el('searchRes').innerHTML = '';
        return;
    }
    
    // Simple client-side search through known messages
    el('searchRes').innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-tertiary);">Search not yet implemented</div>';
}

function showToast(title, body) {
    const z = el('toast-zone');
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<div class="toast-title">${esc(title)}</div><div class="toast-body">${esc(body.substring(0, 100))}</div>`;
    z.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 300);
    }, 4000);
}

// --- STARTUP ---
window.addEventListener('DOMContentLoaded', () => {
    // Load theme preference
    if (localStorage.getItem('gm_v3_theme') === 'dark') {
        document.body.classList.add('dark');
    }
    
    // Load stored session
    if (TK) {
        el('login').style.display = 'none';
        el('app-root').style.display = 'flex';
        initData();
        startPoll();
    }
});
