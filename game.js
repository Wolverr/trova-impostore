// Logica di gioco. Gira solo sul telefono dell'host, che è l'arbitro:
// gli altri mandano azioni e ricevono una "vista" filtrata dello stato.
(function (root) {
  const MAX_PLAYERS = 10;
  const MIN_PLAYERS = 3;
  const CATS = typeof module !== 'undefined' ? require('./words.js') : root.CATEGORIES;

  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  function createState(code, hostId, hostName, settings) {
    const s = {
      code, hostId,
      players: [],
      settings: Object.assign({
        categories: CATS.map((c) => c.id),
        impostors: 1,
        impostorHint: true,
        showCategory: true,
      }, settings || {}),
      phase: 'lobby',
      game: null,
      lastGame: null,
      used: [],
    };
    addPlayer(s, hostId, hostName);
    return s;
  }

  const findPlayer = (s, id) => s.players.find((p) => p.id === id);
  const inGame = (s) => s.players.filter((p) => p.inGame);
  const alive = (s) => s.players.filter((p) => p.inGame && p.alive);
  // Chi deve ancora rispondere: solo i vivi collegati, così un telefono spento non blocca tutti.
  const needed = (s) => alive(s).filter((p) => p.connected);

  function maxImpostors(n) {
    return Math.max(1, Math.min(3, Math.floor((n - 1) / 2)));
  }

  // Ritorna { id } col giocatore assegnato oppure { error }.
  function addPlayer(s, id, name) {
    name = String(name || '').trim().slice(0, 16) || 'Giocatore';
    let p = findPlayer(s, id);
    if (!p) {
      // Stesso nome di qualcuno disconnesso = è lui che rientra da un altro browser/tab.
      const same = s.players.find((q) => q.name.toLowerCase() === name.toLowerCase());
      if (same && same.connected) return { error: 'Nome già usato in questa stanza' };
      if (same) p = same;
    }
    if (p) {
      p.connected = true;
      return { id: p.id };
    }
    if (s.players.length >= MAX_PLAYERS) return { error: 'Stanza piena (max ' + MAX_PLAYERS + ')' };
    s.players.push({
      id, name, connected: true, ready: false, score: 0,
      inGame: false, alive: false,
    });
    return { id };
  }

  function setConnected(s, id, connected) {
    const p = findPlayer(s, id);
    if (!p) return;
    p.connected = connected;
    if (!connected && s.phase === 'lobby') p.ready = false;
    progress(s);
  }

  function removePlayer(s, id) {
    const p = findPlayer(s, id);
    if (!p || id === s.hostId) return;
    s.players = s.players.filter((q) => q !== p);
    const g = s.game;
    if (g && p.inGame) {
      const i = g.order.indexOf(id);
      if (i !== -1) {
        g.order.splice(i, 1);
        if (i < g.turn) g.turn--;
      }
      delete g.acks[id]; delete g.decide[id]; delete g.votes[id];
      if (checkWin(s)) return;
    }
    progress(s);
  }

  function pickWord(s) {
    const cats = CATS.filter((c) => s.settings.categories.includes(c.id));
    const pool = [];
    cats.forEach((c) => c.words.forEach((w) => pool.push({ cat: c, w })));
    let fresh = pool.filter((x) => !s.used.includes(x.w));
    if (!fresh.length) {
      s.used = [];
      fresh = pool;
    }
    const pick = fresh[Math.floor(Math.random() * fresh.length)];
    s.used.push(pick.w);
    const [word, hint] = pick.w.split('|');
    return { word, hint, categoryId: pick.cat.id };
  }

  function canStart(s) {
    const present = s.players.filter((p) => p.connected);
    return s.phase === 'lobby' && present.length >= MIN_PLAYERS &&
      present.every((p) => p.ready) && s.settings.categories.length > 0;
  }

  function startGame(s) {
    const players = s.players.filter((p) => p.connected);
    players.forEach((p) => { p.inGame = true; p.alive = true; p.ready = false; });
    s.players.filter((p) => !p.connected).forEach((p) => { p.inGame = false; p.alive = false; p.ready = false; });
    const nImp = Math.min(s.settings.impostors, maxImpostors(players.length));
    const impostorIds = shuffle(players.map((p) => p.id)).slice(0, nImp);
    s.game = Object.assign(pickWord(s), {
      impostorIds, round: 0, order: [], turn: 0,
      acks: {}, decide: {}, votes: {}, result: null,
    });
    s.phase = 'reveal';
  }

  function startRound(s) {
    const g = s.game;
    // Giro: si parte da un giocatore a caso e si prosegue nell'ordine della stanza.
    const ids = alive(s).map((p) => p.id);
    const start = Math.floor(Math.random() * ids.length);
    g.order = ids.slice(start).concat(ids.slice(0, start));
    g.turn = 0;
    g.round++;
    g.decide = {};
    g.votes = {};
    g.result = null;
    s.phase = 'round';
  }

  // Fine partita se gli impostori sono tutti fuori o sono in parità numerica con gli altri.
  function checkWin(s) {
    const g = s.game;
    const a = alive(s);
    const imp = a.filter((p) => g.impostorIds.includes(p.id)).length;
    const crew = a.length - imp;
    let winner = null;
    if (imp === 0) winner = 'crew';
    else if (imp >= crew) winner = 'impostors';
    if (!winner) return false;
    s.players.filter((p) => p.inGame).forEach((p) => {
      const isImp = g.impostorIds.includes(p.id);
      if (winner === 'crew' && !isImp) p.score += 1;
      if (winner === 'impostors' && isImp) p.score += 2;
    });
    s.lastGame = {
      winner, word: g.word, hint: g.hint, categoryId: g.categoryId,
      impostors: g.impostorIds.map((id) => (findPlayer(s, id) || { name: '?' }).name),
      result: g.result, rounds: g.round,
    };
    s.players.forEach((p) => { p.inGame = false; p.alive = false; p.ready = false; });
    s.game = null;
    s.phase = 'lobby';
    return true;
  }

  function resolveVote(s) {
    const g = s.game;
    const counts = {};
    Object.values(g.votes).forEach((t) => { counts[t] = (counts[t] || 0) + 1; });
    const max = Math.max(0, ...Object.values(counts));
    const top = Object.keys(counts).filter((k) => counts[k] === max);
    const res = { counts, eliminated: null, wasImpostor: false, tie: false, skipped: false };
    if (top.length > 1) res.tie = true;
    else if (top[0] === 'skip') res.skipped = true;
    else {
      const p = findPlayer(s, top[0]);
      if (p) {
        p.alive = false;
        res.eliminated = p.name;
        res.eliminatedId = p.id;
        res.wasImpostor = g.impostorIds.includes(p.id);
      }
    }
    g.result = res;
    if (!checkWin(s)) s.phase = 'result';
  }

  // Avanza da sola quando tutti quelli che servono hanno risposto.
  function progress(s) {
    if (s.phase === 'lobby') {
      if (canStart(s)) startGame(s);
      return;
    }
    const g = s.game;
    const need = needed(s);
    if (!need.length) return;
    if (s.phase === 'reveal' && need.every((p) => g.acks[p.id])) startRound(s);
    else if (s.phase === 'decide' && need.every((p) => g.decide[p.id])) {
      const v = Object.values(g.decide);
      const more = v.filter((x) => x === 'more').length;
      if (more > v.length - more) startRound(s);
      else { g.votes = {}; s.phase = 'vote'; }
    } else if (s.phase === 'vote' && need.every((p) => g.votes[p.id])) resolveVote(s);
  }

  function handle(s, pid, a) {
    const me = findPlayer(s, pid);
    if (!me || !a) return;
    const g = s.game;
    const isHost = pid === s.hostId;
    const playing = me.inGame && me.alive;
    switch (a.type) {
      case 'ready':
        if (s.phase === 'lobby') me.ready = !!a.value;
        break;
      case 'settings':
        if (!isHost || s.phase !== 'lobby') return;
        if (Array.isArray(a.categories)) s.settings.categories = a.categories.filter((id) => CATS.some((c) => c.id === id));
        if (a.impostors) s.settings.impostors = Math.max(1, Math.min(3, a.impostors | 0));
        if ('impostorHint' in a) s.settings.impostorHint = !!a.impostorHint;
        if ('showCategory' in a) s.settings.showCategory = !!a.showCategory;
        break;
      case 'ack':
        if (s.phase === 'reveal' && me.inGame) g.acks[pid] = true;
        break;
      case 'spoke':
        if (s.phase !== 'round') return;
        if (g.order[g.turn] !== pid && !isHost) return;
        g.turn++;
        if (g.turn >= g.order.length) { g.decide = {}; s.phase = 'decide'; }
        break;
      case 'decide':
        if (s.phase === 'decide' && playing && (a.choice === 'vote' || a.choice === 'more')) g.decide[pid] = a.choice;
        break;
      case 'vote':
        if (s.phase !== 'vote' || !playing) return;
        if (a.target !== 'skip') {
          const t = findPlayer(s, a.target);
          if (!t || !t.alive || !t.inGame || t.id === pid) return;
        }
        g.votes[pid] = a.target;
        break;
      case 'continue':
        if (s.phase === 'result' && isHost) startRound(s);
        break;
      case 'forceVote':
        // L'host può forzare il passaggio se qualcuno non risponde.
        if (!isHost) return;
        if (s.phase === 'decide') { g.votes = {}; s.phase = 'vote'; }
        else if (s.phase === 'vote' && Object.keys(g.votes).length) resolveVote(s);
        else if (s.phase === 'reveal') startRound(s);
        break;
      case 'endGame':
        if (!isHost || !g) return;
        s.lastGame = null;
        s.players.forEach((p) => { p.inGame = false; p.alive = false; p.ready = false; });
        s.game = null;
        s.phase = 'lobby';
        break;
      case 'kick':
        if (isHost) removePlayer(s, a.id);
        return;
      case 'leave':
        removePlayer(s, pid);
        return;
      default:
        return;
    }
    progress(s);
  }

  // Quello che un singolo giocatore può vedere.
  function viewFor(s, pid) {
    const g = s.game;
    const me = findPlayer(s, pid);
    const v = {
      code: s.code, hostId: s.hostId, me: pid, phase: s.phase,
      settings: s.settings, lastGame: s.lastGame,
      maxImpostors: maxImpostors(s.players.filter((p) => p.connected).length),
      players: s.players.map((p) => ({
        id: p.id, name: p.name, connected: p.connected, ready: p.ready,
        score: p.score, inGame: p.inGame, alive: p.alive,
        acted: !!(g && (s.phase === 'reveal' ? g.acks[p.id]
          : s.phase === 'decide' ? g.decide[p.id]
          : s.phase === 'vote' ? g.votes[p.id] : false)),
      })),
      game: null,
    };
    if (g) {
      v.game = {
        round: g.round, order: g.order, turn: g.turn,
        result: g.result, myDecide: g.decide[pid] || null, myVote: g.votes[pid] || null,
        decideTally: s.phase === 'decide' ? Object.values(g.decide).reduce((t, x) => (t[x]++, t), { vote: 0, more: 0 }) : null,
        nImpostors: g.impostorIds.length,
        role: null,
      };
      if (me && me.inGame) {
        const imp = g.impostorIds.includes(pid);
        v.game.role = imp
          ? { impostor: true, hint: s.settings.impostorHint ? g.hint : null,
              categoryId: s.settings.showCategory ? g.categoryId : null,
              partners: g.impostorIds.filter((id) => id !== pid).map((id) => (findPlayer(s, id) || {}).name) }
          : { impostor: false, word: g.word, categoryId: s.settings.showCategory ? g.categoryId : null };
      }
    }
    return v;
  }

  const api = { createState, addPlayer, setConnected, removePlayer, handle, viewFor, MAX_PLAYERS, MIN_PLAYERS };
  if (typeof module !== 'undefined') module.exports = api;
  else root.Game = api;
})(typeof window !== 'undefined' ? window : globalThis);
