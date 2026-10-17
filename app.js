// Rete (PeerJS) + interfaccia. Un telefono crea la stanza e fa da host,
// gli altri si collegano direttamente a lui.
(function () {
  const PREFIX = 'trovaimpostore-v1-';
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const SAVE_TTL = 3 * 60 * 60 * 1000;
  const PEER_OPTS = {
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
      ],
    },
  };
  const COLORS = ['#ffcf3f', '#3fe0b5', '#ff8fab', '#8ecbff', '#c7a5ff', '#ffa94d', '#a3e635', '#f472b6', '#5eead4', '#fde68a'];
  const CAT_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

  const $app = document.getElementById('app');
  const $status = document.getElementById('status');
  const $toast = document.getElementById('toast');

  // ---------- storage (può fallire in navigazione privata) ----------
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const randId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  let PID = store.get('ti_pid');
  if (!PID) { PID = randId(); store.set('ti_pid', PID); }

  // ---------- stato locale ----------
  let mode = null;          // 'host' | 'client' | null
  let peer = null;
  let state = null;         // solo host: stato completo
  const conns = new Map();  // solo host: pid -> connessione
  let conn = null;          // solo client: connessione all'host
  let view = null;          // quello che vedo io
  let joinCode = '', myName = '';
  let joined = false, attempts = 0, connectSeq = 0, retryTimer = null, lastHostMsg = 0;
  let showQR = false, holding = false;

  // ---------- utilità UI ----------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let toastTimer;
  function toast(msg) {
    $toast.textContent = msg;
    $toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $toast.hidden = true; }, 2600);
  }
  function setStatus(msg, withLeave) {
    if (!msg) { $status.hidden = true; return; }
    $status.hidden = false;
    $status.innerHTML = esc(msg) + (withLeave ? ' <button data-act="leave">Esci</button>' : '');
  }
  const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

  let wakeLock = null;
  async function keepAwake() {
    try {
      if ('wakeLock' in navigator && !wakeLock && document.visibilityState === 'visible') {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      }
    } catch (e) {}
  }

  function genCode() {
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return c;
  }
  const joinLink = (code) => location.origin + location.pathname + '?r=' + code;

  // ---------- HOST ----------
  function hostCreate(name, saved) {
    mode = 'host';
    if (saved) {
      state = saved;
      state.players.forEach((p) => { p.connected = p.id === state.hostId; });
    } else {
      state = Game.createState(genCode(), PID, name, store.get('ti_settings'));
    }
    store.set('ti_name', state.players.find((p) => p.id === PID).name);
    openHostPeer(!!saved, 0);
    update();
  }

  function openHostPeer(resuming, attempt) {
    setStatus('Creo la stanza…');
    const p = peer = new Peer(PREFIX + state.code, PEER_OPTS);
    p.on('open', () => { setStatus(null); keepAwake(); update(); });
    p.on('connection', (c) => hostAccept(c));
    p.on('disconnected', () => {
      if (p !== peer || p.destroyed) return;
      setStatus('Connessione al server persa, riprovo…');
      setTimeout(() => { if (p === peer && !p.destroyed && p.disconnected) p.reconnect(); }, 2000);
    });
    p.on('error', (err) => {
      if (p !== peer) return;
      if (err.type === 'unavailable-id') {
        p.destroy();
        if (resuming && attempt < 30) {
          // Il server ricorda ancora la vecchia sessione per qualche secondo.
          setStatus('Riapro la stanza ' + state.code + '…', true);
          setTimeout(() => { if (mode === 'host') openHostPeer(true, attempt + 1); }, 3000);
        } else if (!resuming) {
          state.code = genCode();
          openHostPeer(false, attempt + 1);
        } else {
          toast('Impossibile riaprire la stanza');
          goHome();
        }
      } else if (err.type === 'peer-unavailable') {
        // ignorato
      } else if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(err.type)) {
        setStatus('Nessuna connessione, riprovo…', true);
        setTimeout(() => { if (p === peer && !p.destroyed && p.disconnected) p.reconnect(); }, 3000);
      } else if (err.type === 'browser-incompatible') {
        toast('Browser non supportato: usa Chrome o Safari');
      }
    });
  }

  function hostAccept(c) {
    c.__seen = Date.now();
    c.on('data', (msg) => {
      c.__seen = Date.now();
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'hello') {
        const r = Game.addPlayer(state, String(msg.pid || ''), msg.name);
        if (r.error) {
          c.send({ t: 'err', msg: r.error });
          setTimeout(() => c.close(), 400);
          return;
        }
        const old = conns.get(r.id);
        if (old && old !== c) { try { old.close(); } catch (e) {} }
        c.__pid = r.id;
        conns.set(r.id, c);
        c.send({ t: 'welcome', pid: r.id });
        update();
      } else if (msg.t === 'ping') {
        c.send({ t: 'pong' });
      } else if (msg.t === 'act' && c.__pid) {
        Game.handle(state, c.__pid, msg.a);
        update();
      }
    });
    const gone = () => {
      if (c.__pid && conns.get(c.__pid) === c) {
        conns.delete(c.__pid);
        Game.setConnected(state, c.__pid, false);
        update();
      }
    };
    c.on('close', gone);
    c.on('error', gone);
  }

  // Salva, manda a ciascuno la sua vista e ridisegna la mia.
  function update() {
    if (mode !== 'host') return;
    store.set('ti_host', { state, at: Date.now() });
    store.set('ti_settings', state.settings);
    for (const [pid, c] of conns) {
      if (!state.players.some((p) => p.id === pid)) {
        try { c.send({ t: 'kicked' }); } catch (e) {}
        conns.delete(pid);
        setTimeout(() => c.close(), 400);
      } else if (c.open) {
        c.send({ t: 'state', v: Game.viewFor(state, pid) });
      }
    }
    render(Game.viewFor(state, PID));
  }

  // ---------- CLIENT ----------
  function clientJoin(code, name, resuming) {
    mode = 'client';
    joinCode = code;
    myName = name;
    joined = !!resuming;
    attempts = 0;
    store.set('ti_name', name);
    view = null;
    renderWaiting('Mi collego alla stanza ' + code + '…');
    connect();
  }

  function connect() {
    clearTimeout(retryTimer);
    const seq = ++connectSeq;
    if (peer) { try { peer.destroy(); } catch (e) {} }
    const p = peer = new Peer(PEER_OPTS);
    let failed = false;
    const fail = (why) => { if (failed || seq !== connectSeq) return; failed = true; onConnFail(why); };
    const timer = setTimeout(() => fail('timeout'), 12000);
    p.on('open', () => {
      const c = conn = p.connect(PREFIX + joinCode, { reliable: true });
      c.on('open', () => {
        clearTimeout(timer);
        lastHostMsg = Date.now();
        c.send({ t: 'hello', pid: PID, name: myName });
      });
      c.on('data', (msg) => { if (seq === connectSeq) onHostMsg(msg); });
      c.on('close', () => fail('close'));
      c.on('error', () => fail('error'));
    });
    p.on('error', (err) => fail(err.type === 'peer-unavailable' ? 'noroom' : err.type));
  }

  function onConnFail(why) {
    if (mode !== 'client') return;
    conn = null;
    attempts++;
    if (!joined && (why === 'noroom' || attempts >= 3)) {
      toast(why === 'noroom' ? 'Stanza ' + joinCode + ' non trovata' : 'Impossibile collegarsi');
      goHome();
      return;
    }
    if (joined && why === 'noroom' && attempts >= 40) {
      toast('La stanza non esiste più');
      goHome();
      return;
    }
    setStatus('Connessione persa, riprovo…', true);
    retryTimer = setTimeout(connect, Math.min(1500 + attempts * 500, 5000));
  }

  function onHostMsg(msg) {
    lastHostMsg = Date.now();
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'welcome') {
      if (msg.pid !== PID) { PID = msg.pid; store.set('ti_pid', PID); }
      joined = true;
      attempts = 0;
      setStatus(null);
      keepAwake();
      store.set('ti_client', { code: joinCode, name: myName, at: Date.now() });
    } else if (msg.t === 'state') {
      store.set('ti_client', { code: joinCode, name: myName, at: Date.now() });
      render(msg.v);
    } else if (msg.t === 'err') {
      toast(msg.msg);
      goHome();
    } else if (msg.t === 'kicked') {
      toast('Sei stato rimosso dalla stanza');
      goHome();
    } else if (msg.t === 'closed') {
      toast("L'host ha chiuso la stanza");
      goHome();
    }
  }

  // Battito: le connessioni dei telefoni a volte muoiono senza avvisare.
  setInterval(() => {
    const now = Date.now();
    if (mode === 'client' && conn && conn.open) {
      conn.send({ t: 'ping' });
      if (now - lastHostMsg > 15000) { try { conn.close(); } catch (e) {} }
    } else if (mode === 'host') {
      for (const c of conns.values()) {
        if (now - c.__seen > 15000) { try { c.close(); } catch (e) {} }
      }
    }
  }, 4000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    keepAwake();
    if (mode === 'client' && (!conn || !conn.open)) { attempts = Math.min(attempts, 1); connect(); }
    if (mode === 'host' && peer && peer.disconnected && !peer.destroyed) peer.reconnect();
  });

  // ---------- azioni ----------
  function act(a) {
    if (mode === 'host') { Game.handle(state, PID, a); update(); }
    else if (conn && conn.open) conn.send({ t: 'act', a });
    else toast('Non sei connesso');
  }

  function goHome() {
    clearTimeout(retryTimer);
    connectSeq++;
    if (mode === 'host') {
      for (const c of conns.values()) { try { c.send({ t: 'closed' }); } catch (e) {} }
      store.del('ti_host');
    }
    store.del('ti_client');
    const p = peer;
    peer = null;
    setTimeout(() => { try { p && p.destroy(); } catch (e) {} }, 300);
    conns.clear();
    mode = null; conn = null; state = null; view = null; joined = false;
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    setStatus(null);
    history.replaceState(null, '', location.pathname);
    renderHome();
  }

  // ---------- schermate ----------
  const nameOf = (v, id) => (v.players.find((p) => p.id === id) || { name: '?' }).name;
  const colorOf = (v, id) => COLORS[Math.max(0, v.players.findIndex((p) => p.id === id)) % COLORS.length];
  const avatar = (v, p) => `<span class="avatar" style="background:${colorOf(v, p.id)}">${esc(p.name[0].toUpperCase())}</span>`;
  const catName = (id) => (CAT_BY_ID[id] ? CAT_BY_ID[id].icon + ' ' + CAT_BY_ID[id].name : '');
  const dock = (inner) => `<div class="dock"><div>${inner}</div></div>`;

  function renderHome() {
    const params = new URLSearchParams(location.search);
    const code = (params.get('r') || '').toUpperCase().slice(0, 4);
    const name = store.get('ti_name') || '';
    $app.innerHTML = `
      <div class="logo fade-in">
        <span class="mark">🕵️</span>
        <h1>Trova<br><span>l'Impostore</span></h1>
        <p class="muted">Ognuno col suo telefono. Fino a ${Game.MAX_PLAYERS} giocatori.</p>
      </div>
      <div class="panel stack">
        <input id="name" maxlength="16" placeholder="Il tuo nome" value="${esc(name)}" autocomplete="off">
        ${code ? '' : '<button class="primary" data-act="create">Crea una stanza</button>'}
      </div>
      <div class="divider">${code ? 'Sei stato invitato nella stanza' : 'oppure entra in una stanza'}</div>
      <div class="panel stack">
        <input id="code" class="code-input" maxlength="4" placeholder="CODICE" value="${esc(code)}" autocomplete="off" autocapitalize="characters">
        <button class="${code ? 'primary' : 'crew-btn'}" data-act="join">Entra</button>
        ${code ? '<button class="ghost" data-act="forget-invite">Crea invece una stanza mia</button>' : ''}
      </div>`;
    const focus = document.getElementById(name ? (code ? 'name' : 'code') : 'name');
    if (!code || !name) focus.focus();
  }

  function renderWaiting(msg) {
    $app.innerHTML = `<div class="logo"><span class="mark">📡</span><h2>${esc(msg)}</h2>
      <p class="muted">Se ci mette troppo, controlla di avere internet.</p></div>
      <button class="ghost" data-act="leave">Annulla</button>`;
  }

  function render(v) {
    const prev = view;
    view = v;
    if (prev && prev.phase !== v.phase) {
      if (v.phase === 'reveal') vibrate([60, 40, 60]);
      holding = false;
      window.scrollTo(0, 0);
    }
    if (v.game && v.phase === 'round' && v.game.order[v.game.turn] === v.me &&
        !(prev && prev.game && prev.phase === 'round' && prev.game.order[prev.game.turn] === v.me)) vibrate(120);
    const screens = { lobby: renderLobby, reveal: renderReveal, round: renderRound, decide: renderDecide, vote: renderVote, result: renderResult };
    $app.innerHTML = (screens[v.phase] || renderLobby)(v);
    if (v.phase === 'lobby' && showQR && window.QRCode) {
      const el = document.getElementById('qr');
      if (el) new QRCode(el, { text: joinLink(v.code), width: 180, height: 180 });
    }
  }

  function playerRow(v, p, opts) {
    opts = opts || {};
    const isHost = v.me === v.hostId;
    const tags = [];
    if (p.id === v.hostId) tags.push('<span class="tag host">host</span>');
    if (!p.connected) tags.push('<span class="tag">offline</span>');
    if (opts.ready && p.connected) tags.push(p.ready ? '<span class="tag ok">pronto ✓</span>' : '<span class="tag">…</span>');
    if (opts.acted && p.alive && p.connected) tags.push(p.acted ? '<span class="tag ok">✓</span>' : '<span class="tag">…</span>');
    const cls = [!p.connected && 'off', opts.dead && p.inGame && !p.alive && 'dead', opts.current && 'current'].filter(Boolean).join(' ');
    return `<li class="${cls}">${avatar(v, p)}<span class="pname">${esc(p.name)}${p.id === v.me ? ' <span class="muted">(tu)</span>' : ''}</span>
      ${tags.join('')}${opts.score ? `<span class="score">${p.score} pt</span>` : ''}
      ${opts.kick && isHost && p.id !== v.me ? `<button class="kick" data-act="kick" data-id="${esc(p.id)}" aria-label="Rimuovi">✕</button>` : ''}</li>`;
  }

  function lastGameBanner(v) {
    const g = v.lastGame;
    if (!g) return '';
    const crew = g.winner === 'crew';
    const r = g.result;
    let how = '';
    if (r && r.eliminated) how = `${esc(r.eliminated)} è stato votato fuori. `;
    return `<div class="banner ${crew ? 'crew' : 'imp'} fade-in">
      <div class="big">${crew ? 'Vincono i cittadini! 🎉' : "Vince l'impostore! 😈"}</div>
      <p>${how}${g.impostors.length > 1 ? 'Gli impostori erano' : "L'impostore era"} <b>${esc(g.impostors.join(', '))}</b></p>
      <p>La parola era <b>${esc(g.word)}</b> · indizio: <b>${esc(g.hint)}</b></p>
      <p class="muted">${esc(catName(g.categoryId))}</p></div>`;
  }

  function renderLobby(v) {
    const isHost = v.me === v.hostId;
    const me = v.players.find((p) => p.id === v.me) || {};
    const s = v.settings;
    const present = v.players.filter((p) => p.connected);
    const notReady = present.filter((p) => !p.ready);
    let line;
    if (present.length < Game.MIN_PLAYERS) line = `Servono almeno ${Game.MIN_PLAYERS} giocatori`;
    else if (!s.categories.length) line = "L'host deve scegliere almeno una categoria";
    else if (notReady.length) line = 'In attesa di: ' + notReady.map((p) => esc(p.name)).join(', ');
    else line = 'Si parte!';
    const nImp = Math.min(s.impostors, v.maxImpostors);
    const totalWords = CATEGORIES.filter((c) => s.categories.includes(c.id)).reduce((n, c) => n + c.words.length, 0);

    const cats = CATEGORIES.map((c) => {
      const on = s.categories.includes(c.id);
      if (!isHost && !on) return '';
      return `<button class="cat ${on ? 'on' : ''}" ${isHost ? `data-act="cat" data-id="${c.id}"` : 'disabled style="opacity:1"'}>
        <span class="ic">${c.icon}</span><span>${esc(c.name)}</span><span class="n">${c.words.length}</span></button>`;
    }).join('');

    return `
      <div class="top">
        <div><div class="muted" style="font-size:13px">STANZA</div><div class="roomcode">${esc(v.code)}</div></div>
        <div class="row">
          <button class="small ghost" data-act="share">Invita</button>
          <button class="small ghost" data-act="qr">QR</button>
          <button class="small ghost" data-act="leave">Esci</button>
        </div>
      </div>
      ${showQR ? '<div class="qr" id="qr"></div><p class="center muted" style="font-size:14px">Inquadra per entrare</p>' : ''}
      ${lastGameBanner(v)}
      <h3>Giocatori ${v.players.length}/${Game.MAX_PLAYERS}</h3>
      <ul class="players">${v.players.map((p) => playerRow(v, p, { ready: true, score: true, kick: true })).join('')}</ul>

      <h3>Impostazioni${isHost ? '' : ' <span style="text-transform:none;letter-spacing:0">(decide l\'host)</span>'}</h3>
      <div class="panel">
        <div class="setting"><span>Impostori</span>
          ${isHost ? `<div class="stepper"><button data-act="imp" data-d="-1" ${s.impostors <= 1 ? 'disabled' : ''}>−</button><b>${nImp}</b>
          <button data-act="imp" data-d="1" ${s.impostors >= v.maxImpostors ? 'disabled' : ''}>+</button></div>` : `<b>${nImp}</b>`}
        </div>
        <div class="setting"><span>Indizio per l'impostore</span>
          ${isHost ? `<button class="switch ${s.impostorHint ? 'on' : ''}" data-act="toggle" data-k="impostorHint" aria-label="Indizio"></button>` : `<b>${s.impostorHint ? 'Sì' : 'No'}</b>`}
        </div>
        <div class="setting"><span>Mostra la categoria</span>
          ${isHost ? `<button class="switch ${s.showCategory ? 'on' : ''}" data-act="toggle" data-k="showCategory" aria-label="Categoria"></button>` : `<b>${s.showCategory ? 'Sì' : 'No'}</b>`}
        </div>
      </div>

      <h3>Categorie · ${totalWords} parole</h3>
      ${isHost ? '<div class="row" style="margin-bottom:8px"><button class="small ghost" data-act="cats-all">Tutte</button><button class="small ghost" data-act="cats-none">Nessuna</button><button class="small ghost" data-act="cats-funny">Solo funny</button></div>' : ''}
      <div class="cats">${cats || '<p class="muted">Nessuna categoria scelta</p>'}</div>

      ${dock(`<div class="hint-line">${line}</div>
        <button class="${me.ready ? 'ghost' : 'primary'}" data-act="ready">${me.ready ? 'Non sono pronto' : 'Pronto!'}</button>`)}`;
  }

  function roleFace(v) {
    const r = v.game.role;
    if (r.impostor) {
      return `<div class="imp-title">SEI L'IMPOSTORE</div>
        ${r.hint ? `<div class="label">Il tuo indizio</div><div class="hintword">${esc(r.hint)}</div>` : '<p>Niente indizio: improvvisa!</p>'}
        ${r.categoryId ? `<div class="catline">${esc(catName(r.categoryId))}</div>` : ''}
        ${r.partners && r.partners.length ? `<p class="catline">Complici: <b>${esc(r.partners.join(', '))}</b></p>` : ''}
        <p class="catline">Mimetizzati e non farti scoprire.</p>`;
    }
    return `<div class="label">La parola segreta è</div>
      <div class="word">${esc(r.word)}</div>
      ${r.categoryId ? `<div class="catline">${esc(catName(r.categoryId))}</div>` : ''}
      <p class="catline">Tra voi ${v.game.nImpostors > 1 ? 'ci sono ' + v.game.nImpostors + ' impostori' : "c'è un impostore"}.</p>`;
  }

  function spectator(v) {
    return `<div class="logo"><span class="mark">⏳</span><h2>Partita in corso</h2>
      <p class="muted">Entri dal prossimo turno.</p></div>
      <ul class="players">${v.players.filter((p) => p.inGame).map((p) => playerRow(v, p, { dead: true })).join('')}</ul>
      ${dock('<button class="ghost" data-act="leave">Esci</button>')}`;
  }

  function hostTools(v, extra) {
    if (v.me !== v.hostId) return '';
    return `<h3>Comandi host</h3><div class="row">${extra || ''}<button class="small ghost" data-act="end">Termina partita</button></div>`;
  }

  function renderReveal(v) {
    const g = v.game;
    if (!g.role) return spectator(v);
    const me = v.players.find((p) => p.id === v.me);
    const waiting = v.players.filter((p) => p.inGame && p.connected && !p.acted);
    const cls = g.role.impostor ? 'is-imp' : 'is-crew';
    return `
      <h2 class="center">Scopri il tuo ruolo</h2>
      <p class="center muted">Copri lo schermo e tieni premuta la carta.</p>
      <div class="rolecard ${cls} ${holding ? 'open' : ''}" data-hold="1">
        <div class="cover"><span class="eye">👁️</span><b>Tieni premuto</b><br><span class="muted">per vedere</span></div>
        <div class="face">${roleFace(v)}</div>
      </div>
      <p class="center muted">${waiting.length ? 'Aspettiamo: ' + waiting.map((p) => esc(p.name)).join(', ') : 'Tutti pronti!'}</p>
      ${hostTools(v, waiting.length && me.acted ? '<button class="small ghost" data-act="force">Inizia comunque</button>' : '')}
      ${dock(me.acted ? '<button class="ghost" disabled>In attesa degli altri…</button>' : '<button class="primary" data-act="ack">Ho visto, sono pronto</button>')}`;
  }

  function peekButton(v) {
    if (!v.game.role) return '';
    const r = v.game.role;
    const shown = r.impostor ? `😈 Impostore${r.hint ? ' · indizio: ' + esc(r.hint) : ''}` : '🔑 ' + esc(r.word);
    return `<button class="ghost peek ${holding ? 'open' : ''}" data-hold="1"><span class="c">Tieni premuto per rivedere la parola</span><span class="o">${shown}</span></button>`;
  }

  function deadNote(v) {
    const me = v.players.find((p) => p.id === v.me);
    return me && me.inGame && !me.alive ? '<div class="banner imp"><b>Sei stato eliminato.</b><br>Puoi guardare, ma acqua in bocca 🤐</div>' : '';
  }

  function renderRound(v) {
    const g = v.game;
    if (!g.role) return spectator(v);
    const cur = g.order[g.turn];
    const isMe = cur === v.me;
    const isHost = v.me === v.hostId;
    const curP = v.players.find((p) => p.id === cur);
    const list = g.order.map((id, i) => {
      const p = v.players.find((q) => q.id === id);
      if (!p) return '';
      return playerRow(v, p, { current: i === g.turn }).replace('<span class="pname">', `<span class="pname">${i + 1}. `);
    }).join('');
    let btn;
    if (isMe) btn = '<button class="primary" data-act="spoke">Ho detto la mia parola</button>';
    else if (isHost) btn = `<button class="ghost" data-act="spoke">Salta ${esc(curP ? curP.name : '')}${curP && !curP.connected ? ' (offline)' : ''}</button>`;
    else btn = `<button class="ghost" disabled>Parla ${esc(curP ? curP.name : '')}…</button>`;
    return `
      <div class="top"><h2>Giro ${g.round}</h2><span class="tag">${g.turn + 1}/${g.order.length}</span></div>
      ${deadNote(v)}
      <div class="speaker">${isMe ? '<div class="you">Tocca a te!</div><p class="muted">Di\' una parola legata alla tua.</p>'
        : `<p class="muted">Ora parla</p><div class="who">${esc(curP ? curP.name : '?')}</div>`}</div>
      <h3>Ordine del giro</h3>
      <ul class="players">${list}</ul>
      ${peekButton(v)}
      ${hostTools(v)}
      ${dock(btn)}`;
  }

  function renderDecide(v) {
    const g = v.game;
    if (!g.role) return spectator(v);
    const me = v.players.find((p) => p.id === v.me);
    const canAct = me.inGame && me.alive;
    const t = g.decideTally || { vote: 0, more: 0 };
    const voters = v.players.filter((p) => p.inGame && p.alive);
    return `
      <h2 class="center">Giro ${g.round} finito</h2>
      <p class="center muted">Avete già un sospettato o fate un altro giro?</p>
      ${deadNote(v)}
      <div class="tally"><div><b>${t.vote}</b>Votare</div><div><b>${t.more}</b>Altro giro</div></div>
      <ul class="players">${voters.map((p) => playerRow(v, p, { acted: true })).join('')}</ul>
      ${peekButton(v)}
      ${hostTools(v, '<button class="small ghost" data-act="force">Vai al voto</button>')}
      ${canAct ? dock(`<div class="row">
        <button class="${g.myDecide === 'vote' ? 'imp-btn' : 'ghost'}" data-act="decide" data-c="vote">🗳️ Votiamo</button>
        <button class="${g.myDecide === 'more' ? 'crew-btn' : 'ghost'}" data-act="decide" data-c="more">🔁 Altro giro</button></div>`) : ''}`;
  }

  function renderVote(v) {
    const g = v.game;
    if (!g.role) return spectator(v);
    const me = v.players.find((p) => p.id === v.me);
    const canVote = me.inGame && me.alive;
    const targets = v.players.filter((p) => p.inGame && p.alive && p.id !== v.me);
    const waiting = v.players.filter((p) => p.inGame && p.alive && p.connected && !p.acted);
    const opts = canVote ? targets.map((p) => `<button class="votebtn ${g.myVote === p.id ? 'sel' : ''}" data-act="vote" data-id="${esc(p.id)}">
        ${avatar(v, p)}<span class="pname">${esc(p.name)}</span>${g.myVote === p.id ? '<span class="tag">il tuo voto</span>' : ''}</button>`).join('') +
        `<button class="votebtn ghost ${g.myVote === 'skip' ? 'sel' : ''}" data-act="vote" data-id="skip">🤷 Non voto nessuno</button>` : '';
    return `
      <h2 class="center">Chi è l'impostore?</h2>
      <p class="center muted">${canVote ? 'Puoi cambiare voto finché non votano tutti.' : 'Gli altri stanno votando.'}</p>
      ${deadNote(v)}
      <div style="margin-top:14px">${opts}</div>
      <p class="center muted">${waiting.length ? 'Mancano: ' + waiting.map((p) => esc(p.name)).join(', ') : ''}</p>
      ${peekButton(v)}
      ${hostTools(v, '<button class="small ghost" data-act="force">Chiudi il voto</button>')}`;
  }

  function renderResult(v) {
    const g = v.game;
    const r = g.result;
    const isHost = v.me === v.hostId;
    const counts = Object.entries(r.counts).sort((a, b) => b[1] - a[1])
      .map(([id, n]) => `<li>${id === 'skip' ? '<span class="avatar" style="background:#a49cc9">–</span><span class="pname">Nessuno</span>'
        : `${avatar(v, { id, name: nameOf(v, id) })}<span class="pname">${esc(nameOf(v, id))}</span>`}<span class="tag">${n} vot${n === 1 ? 'o' : 'i'}</span></li>`).join('');
    let head;
    if (r.tie) head = '<div class="banner"><div class="big">Pareggio!</div><p>Nessuno viene eliminato.</p></div>';
    else if (r.skipped) head = '<div class="banner"><div class="big">Nessuno eliminato</div><p>La maggioranza non ha votato.</p></div>';
    else if (r.wasImpostor) head = `<div class="banner crew"><div class="big">${esc(r.eliminated)} era un impostore!</div><p>Ma ne restano ancora in gioco…</p></div>`;
    else head = `<div class="banner imp"><div class="big">${esc(r.eliminated)} era innocente 😬</div><p>L'impostore è ancora tra voi.</p></div>`;
    return `
      <h2 class="center">Risultato del voto</h2>
      ${head}
      <ul class="players">${counts}</ul>
      ${peekButton(v)}
      ${hostTools(v)}
      ${dock(isHost ? '<button class="primary" data-act="continue">Nuovo giro</button>' : '<button class="ghost" disabled>L\'host avvia il prossimo giro…</button>')}`;
  }

  // ---------- eventi ----------
  function startHold(e) {
    const el = e.target.closest('[data-hold]');
    if (!el) return;
    e.preventDefault();
    holding = true;
    el.classList.add('open');
    vibrate(20);
  }
  function endHold() {
    if (!holding) return;
    holding = false;
    document.querySelectorAll('[data-hold].open').forEach((el) => el.classList.remove('open'));
  }
  $app.addEventListener('pointerdown', startHold);
  window.addEventListener('pointerup', endHold);
  window.addEventListener('pointercancel', endHold);
  window.addEventListener('blur', endHold);
  $app.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-hold]')) e.preventDefault(); });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || mode) return;
    if (e.target.id === 'code' || (e.target.id === 'name' && document.getElementById('code').value)) handleClick('join');
    else if (e.target.id === 'name') handleClick('create');
  });

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (el) handleClick(el.dataset.act, el);
  });

  function readName() {
    const el = document.getElementById('name');
    const n = el ? el.value.trim() : '';
    if (!n) { toast('Scrivi il tuo nome'); el && el.focus(); }
    return n;
  }

  function handleClick(a, el) {
    const s = view && view.settings;
    switch (a) {
      case 'create': {
        const n = readName();
        if (n) hostCreate(n);
        break;
      }
      case 'join': {
        const n = readName();
        if (!n) return;
        const code = document.getElementById('code').value.trim().toUpperCase();
        if (!/^[A-Z]{4}$/.test(code)) { toast('Il codice ha 4 lettere'); return; }
        clientJoin(code, n);
        break;
      }
      case 'forget-invite':
        history.replaceState(null, '', location.pathname);
        renderHome();
        break;
      case 'leave':
        if (mode && view && !confirm(mode === 'host' ? 'Chiudere la stanza per tutti?' : 'Uscire dalla stanza?')) return;
        if (mode === 'client' && conn && conn.open) conn.send({ t: 'act', a: { type: 'leave' } });
        setTimeout(goHome, mode === 'client' ? 250 : 0);
        break;
      case 'share': {
        const url = joinLink(view.code);
        if (navigator.share) navigator.share({ title: "Trova l'Impostore", text: 'Entra nella stanza ' + view.code, url }).catch(() => {});
        else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('Link copiato'), () => toast(url));
        else toast(url);
        break;
      }
      case 'qr':
        showQR = !showQR;
        render(view);
        break;
      case 'ready': {
        const me = view.players.find((p) => p.id === view.me);
        act({ type: 'ready', value: !me.ready });
        break;
      }
      case 'kick':
        if (confirm('Rimuovere ' + nameOf(view, el.dataset.id) + '?')) act({ type: 'kick', id: el.dataset.id });
        break;
      case 'cat': {
        const id = el.dataset.id;
        const cats = s.categories.includes(id) ? s.categories.filter((c) => c !== id) : s.categories.concat(id);
        act({ type: 'settings', categories: cats });
        break;
      }
      case 'cats-all': act({ type: 'settings', categories: CATEGORIES.map((c) => c.id) }); break;
      case 'cats-none': act({ type: 'settings', categories: [] }); break;
      case 'cats-funny': act({ type: 'settings', categories: CATEGORIES.filter((c) => c.funny).map((c) => c.id) }); break;
      case 'imp': act({ type: 'settings', impostors: Math.min(s.impostors, view.maxImpostors) + Number(el.dataset.d) }); break;
      case 'toggle': act({ type: 'settings', [el.dataset.k]: !s[el.dataset.k] }); break;
      case 'ack': act({ type: 'ack' }); break;
      case 'spoke': act({ type: 'spoke' }); break;
      case 'decide': act({ type: 'decide', choice: el.dataset.c }); break;
      case 'vote': act({ type: 'vote', target: el.dataset.id }); break;
      case 'continue': act({ type: 'continue' }); break;
      case 'force': act({ type: 'forceVote' }); break;
      case 'end':
        if (confirm('Terminare la partita? Nessuno prende punti.')) act({ type: 'endGame' });
        break;
    }
  }

  // ---------- avvio ----------
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  if (typeof Peer === 'undefined') {
    $app.innerHTML = '<div class="logo"><span class="mark">📵</span><h2>Serve internet</h2><p class="muted">Collegati e ricarica la pagina.</p></div>';
    return;
  }
  const hostSave = store.get('ti_host');
  const clientSave = store.get('ti_client');
  const invite = new URLSearchParams(location.search).get('r');
  if (hostSave && Date.now() - hostSave.at < SAVE_TTL && !invite) hostCreate(null, hostSave.state);
  else if (clientSave && Date.now() - clientSave.at < SAVE_TTL && (!invite || invite.toUpperCase() === clientSave.code)) clientJoin(clientSave.code, clientSave.name, true);
  else renderHome();
})();
