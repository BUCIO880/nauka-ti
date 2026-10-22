/* Nauka TI – fiszki, quiz ABCD, egzamin próbny. Bez frameworków, działa offline. */
(() => {
  'use strict';

  /* ================= Dane ================= */

  const QUESTIONS = (window.PYTANIA || []).slice().sort((a, b) => a.t - b.t || a.n - b.n);
  const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

  const TOPICS = {
    info: 'Informacja i jednostki',
    sprzet: 'Procesor, pamięć, płyta główna',
    grafika: 'Monitor i grafika',
    tekst: 'Edytory tekstu',
    multimedia: 'Dźwięk, wideo, formaty plików',
    dyski: 'Dyski, nośniki i kopie',
    urzadzenia: 'Drukarki i inne urządzenia',
    system: 'System, schowek, bufor',
    wirusy: 'Wirusy i bezpieczeństwo',
    siec: 'Internet i sieci',
    gps: 'Gry, GPS i mapy cyfrowe',
    t2sprzet: 'Sprzęt i oprogramowanie',
    bazy: 'Bazy danych',
    sysinf: 'Systemy informacyjne i zarządzanie',
    tworzenie: 'Tworzenie systemów (analiza, CASE)',
    decyzje: 'Informacja i decyzje',
    t2siec: 'Sieci i Internet',
    prawo: 'Kopie danych i prawo',
  };

  /* ================= Zapis postępu ================= */

  const KEY = 'nauka-ti:v1';
  const DEFAULT_SETTINGS = { scope: 'all', theme: 'auto', round: 20 };
  let storageOk = true;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        return {
          cards: s.cards || {},
          days: s.days || {},
          settings: Object.assign({}, DEFAULT_SETTINGS, s.settings || {}),
        };
      }
    } catch (e) {
      storageOk = false;
    }
    return { cards: {}, days: {}, settings: Object.assign({}, DEFAULT_SETTINGS) };
  }
  let S = load();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) {
      storageOk = false;
    }
  }

  /* ================= Powtórki rozłożone w czasie (system Leitnera) =================
   * Każde pytanie ma „pudełko” b (0 = nowe … 6). Dobra odpowiedź przesuwa wyżej
   * i odsuwa następną powtórkę, zła cofa do pudełka 1 (powtórka za minutę).
   * Od pudełka 4 pytanie liczy się jako opanowane – ostatnia dobra odpowiedź musi
   * paść co najmniej godzinę po poprzedniej, samo „wkuwanie” w jednej sesji nie wystarczy.
   * Odstępy dobrane symulacją pod naukę w 3 dni.
   */
  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;
  const INTERVALS = [0, 1 * MIN, 10 * MIN, 1 * HOUR, 5 * HOUR, 1 * DAY, 3 * DAY];
  const MASTERED = 4;
  const EARLY_CAP = 3;

  const rec = (id) => S.cards[id];

  function status(id) {
    const c = S.cards[id];
    if (!c || !c.n) return 'new';
    return c.b >= MASTERED ? 'done' : 'learn';
  }

  function isDue(id, now) {
    const c = S.cards[id];
    return !!(c && c.n && c.d <= now);
  }

  function isMistake(id) {
    const c = S.cards[id];
    return !!(c && c.w > 0 && c.b < MASTERED);
  }

  // result: 'ok' | 'mid' | 'bad'
  function grade(id, result) {
    const now = Date.now();
    const c = S.cards[id] || (S.cards[id] = { b: 0, d: 0, n: 0, ok: 0, w: 0 });
    const wasDue = c.d <= now;
    c.n += 1;
    c.l = now;
    if (result === 'ok') {
      c.ok += 1;
      if (wasDue || c.b < EARLY_CAP) c.b = Math.min(c.b + 1, INTERVALS.length - 1);
      c.d = now + INTERVALS[c.b];
    } else if (result === 'mid') {
      c.b = Math.max(1, c.b - 1);
      c.d = now + 5 * MIN;
    } else {
      c.w += 1;
      c.b = 1;
      c.d = now + MIN;
    }
    const k = dayKey(new Date(now));
    S.days[k] = (S.days[k] || 0) + 1;
    save();
  }

  function dayKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function streak() {
    const d = new Date();
    if (!S.days[dayKey(d)]) d.setDate(d.getDate() - 1);
    let n = 0;
    while (S.days[dayKey(d)]) {
      n += 1;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }

  /* ================= Pomocnicze ================= */

  const app = document.getElementById('app');

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];

  function inScope(q) {
    return S.settings.scope === 'all' || String(q.t) === S.settings.scope;
  }

  function pool(filter) {
    return QUESTIONS.filter((q) => inScope(q) && (!filter || filter(q)));
  }

  function scopeLabel() {
    return S.settings.scope === 'all' ? 'Oba testy' : 'Test ' + S.settings.scope;
  }

  function plural(n, one, few, many) {
    if (n === 1) return one;
    const d = n % 10;
    const t = n % 100;
    return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
  }

  // Polskie litery → bez ogonków, znak po znaku (długość tekstu się nie zmienia,
  // dzięki temu można podświetlać wyniki wyszukiwania w oryginale).
  const FOLD = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };
  function fold(s) {
    let out = '';
    for (const ch of String(s)) {
      const l = ch.toLowerCase();
      out += FOLD[l] || (l.length === ch.length ? l : ch);
    }
    return out;
  }

  const I = {
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    arrow: '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    cards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 2h12a2 2 0 0 1 2 2v12"/></svg>',
    exam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6a1 1 0 0 1 1 1v2H8V4a1 1 0 0 1 1-1z"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><path d="M9 13l2 2 4-4"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  };

  function chipFor(q) {
    return `<span class="chip accent">Test ${q.t} · pyt. ${q.n}</span><span class="chip">${esc(TOPICS[q.top] || '')}</span>`;
  }

  function answersHtml(q) {
    const items = q.a
      .map((t, i) => `<li>${q.l ? `<span class="letter">${esc(q.l[i])})</span> ` : ''}${esc(t)}</li>`)
      .join('');
    return `<ul class="answers${q.a.length === 1 ? ' single' : ''}">${items}</ul>`;
  }

  function noteHtml(q) {
    return q.u ? `<div class="note"><span>${esc(q.u)}</span></div>` : '';
  }

  function notesBlock(q) {
    return `<div class="notes-label">Według notatek${q.l ? ' (litera z notatek)' : ''}:</div>${answersHtml(q)}${noteHtml(q)}`;
  }

  function makeOptions(q) {
    const correct = pickOne(q.k && q.k.length ? q.k : q.a);
    const wrong = shuffle(q.z.slice()).slice(0, 3);
    return shuffle([{ text: correct, ok: true }].concat(wrong.map((t) => ({ text: t, ok: false }))));
  }

  /* ================= Dobór pytań do rundy ================= */

  // Najpierw zaległe powtórki (najdłużej czekające), potem nowe pytania – zawsze ok. połowa
  // rundy to nowe, żeby w 2 dni zobaczyć cały materiał. Jeśli brakuje – wcześniejsza powtórka.
  function buildRound(qs, size) {
    const now = Date.now();
    const due = qs
      .filter((q) => isDue(q.id, now))
      .sort((a, b) => rec(a.id).d - rec(b.id).d);
    const fresh = qs.filter((q) => status(q.id) === 'new');
    const newQ = Math.min(fresh.length, Math.max(size - due.length, Math.round(size * 0.5)));
    const dueQ = Math.min(due.length, size - newQ);
    let picked = due.slice(0, dueQ).concat(fresh.slice(0, newQ));
    if (picked.length < size) {
      const taken = new Set(picked.map((q) => q.id));
      const early = qs
        .filter((q) => !taken.has(q.id))
        .sort((a, b) => (rec(a.id) ? rec(a.id).b : 0) - (rec(b.id) ? rec(b.id).b : 0) || (rec(a.id) ? rec(a.id).d : 0) - (rec(b.id) ? rec(b.id).d : 0));
      picked = picked.concat(early.slice(0, size - picked.length));
    }
    return shuffle(picked);
  }

  function makeItem(q, forceFlash) {
    const flash = forceFlash || q.noquiz;
    return { id: q.id, mode: flash ? 'flash' : 'quiz', opts: flash ? null : makeOptions(q), picked: null, revealed: false, retry: 0, st: status(q.id) };
  }

  /* ================= Sesje ================= */

  let SESSION = null; // runda nauki / fiszek / błędów
  let EXAM = null; // egzamin próbny
  let LAST_ROUND = null; // jak powtórzyć ostatnią rundę

  function startSession(kind, qs, opts) {
    opts = opts || {};
    if (!qs.length) {
      alert('Brak pytań do tej rundy. Zmień zakres lub wybierz inny tryb.');
      return;
    }
    SESSION = {
      kind,
      title: opts.title || '',
      queue: qs.map((q) => makeItem(q, kind === 'flash')),
      pos: 0,
      first: {}, // id -> pierwsza odpowiedź poprawna?
      order: qs.map((q) => q.id),
    };
    LAST_ROUND = { kind, topic: opts.topic || null };
    go('runda', true);
  }

  function startLearn(topic) {
    const qs = buildRound(pool(topic ? (q) => q.top === topic : null), S.settings.round);
    startSession('learn', qs, { topic, title: topic ? TOPICS[topic] : 'Nauka' });
  }

  function startFlash() {
    startSession('flash', buildRound(pool(), S.settings.round), { title: 'Fiszki' });
  }

  function startMistakes() {
    const qs = pool((q) => isMistake(q.id))
      .sort((a, b) => rec(b.id).w - rec(a.id).w)
      .slice(0, 25);
    startSession('mistakes', shuffle(qs), { title: 'Moje błędy' });
  }

  function startIds(ids, title) {
    startSession('mistakes', shuffle(ids.map((id) => BY_ID.get(id)).filter(Boolean)), { title });
  }

  function repeatLast() {
    if (!LAST_ROUND) return startLearn();
    if (LAST_ROUND.kind === 'flash') return startFlash();
    if (LAST_ROUND.kind === 'mistakes') return startMistakes();
    return startLearn(LAST_ROUND.topic);
  }

  function answerItem(it, ok) {
    const q = BY_ID.get(it.id);
    if (!(it.id in SESSION.first)) SESSION.first[it.id] = ok === 'ok';
    grade(q.id, ok);
    // Źle → pytanie wraca w tej samej rundzie po 3 innych (maks. 2 razy).
    if (ok !== 'ok' && it.retry < 2) {
      const copy = makeItem(q, it.mode === 'flash');
      copy.retry = it.retry + 1;
      const at = Math.min(SESSION.pos + 4, SESSION.queue.length);
      SESSION.queue.splice(at, 0, copy);
    }
  }

  function nextItem() {
    SESSION.pos += 1;
    if (SESSION.pos >= SESSION.queue.length) go('wynik', true);
    else render(true);
  }

  /* ================= Router ================= */

  let currentKey = null; // obsługa klawiatury dla bieżącego widoku
  let usingKeyboard = false;
  document.addEventListener('pointerdown', () => (usingKeyboard = false), true);

  function go(name, force) {
    const target = '#/' + name;
    if (location.hash !== target) location.hash = target;
    else if (force) render(true);
  }

  function route() {
    return location.hash.replace(/^#\/?/, '');
  }

  function render(scrollTop) {
    currentKey = null;
    const r = route();
    const views = {
      '': viewHome,
      runda: viewRound,
      wynik: viewRoundResult,
      egzamin: viewExamSetup,
      'egzamin-test': viewExam,
      'egzamin-wynik': viewExamResult,
      sciaga: viewSciaga,
      ustawienia: viewSettings,
    };
    (views[r] || viewHome)();
    if (scrollTop !== false) window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', () => render(true));

  document.addEventListener('keydown', (e) => {
    usingKeyboard = true;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape' && route() !== '') {
      e.preventDefault();
      go('');
      return;
    }
    if (currentKey) currentKey(e);
  });

  /* ================= Widok: start ================= */

  function counts(qs) {
    const now = Date.now();
    const c = { total: qs.length, done: 0, learn: 0, new: 0, due: 0, mistakes: 0 };
    for (const q of qs) {
      c[status(q.id)] += 1;
      if (isDue(q.id, now)) c.due += 1;
      if (isMistake(q.id)) c.mistakes += 1;
    }
    return c;
  }

  function ringHtml(c) {
    const r = 42;
    const C = 2 * Math.PI * r;
    const d = c.total ? (C * c.done) / c.total : 0;
    const l = c.total ? (C * c.learn) / c.total : 0;
    const pct = c.total ? Math.round((100 * c.done) / c.total) : 0;
    return `<div class="ring" role="img" aria-label="Opanowane ${pct}%">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle class="track" cx="50" cy="50" r="${r}" fill="none" stroke-width="12"/>
        <circle class="val-learn" cx="50" cy="50" r="${r}" fill="none" stroke-width="12" stroke-dasharray="${l} ${C}" stroke-dashoffset="${-d}"/>
        <circle class="val-done" cx="50" cy="50" r="${r}" fill="none" stroke-width="12" stroke-dasharray="${d} ${C}"/>
      </svg>
      <div class="pct"><div><b>${pct}%</b><span>opanowane</span></div></div>
    </div>`;
  }

  function scopeSeg() {
    const b = (v, label) => `<button type="button" data-act="scope" data-v="${v}" aria-pressed="${S.settings.scope === v}">${label}</button>`;
    return `<div class="seg" role="group" aria-label="Zakres pytań">${b('all', 'Oba testy')}${b('1', 'Test 1')}${b('2', 'Test 2')}</div>`;
  }

  function viewHome() {
    const qs = pool();
    const c = counts(qs);
    const today = S.days[dayKey(new Date())] || 0;
    // ok. 1,5 odpowiedzi na pytanie dziennie – przy takim tempie w 3 dni opanujesz prawie wszystko
    const goal = Math.max(50, Math.round((c.total * 1.5) / 10) * 10);
    const st = streak();
    let ctaSub;
    if (c.new === 0 && c.due === 0 && c.learn === 0) ctaSub = 'Wszystko opanowane! Zrób rundę dla utrwalenia';
    else if (c.due > 0) ctaSub = `${c.due} do powtórki · ${c.new} ${plural(c.new, 'nowe', 'nowe', 'nowych')}`;
    else ctaSub = `Runda ${S.settings.round} pytań: nowe + powtórki`;

    // tematy w bieżącym zakresie, w kolejności z notatek
    const topicsHtml = [1, 2]
      .map((t) => {
        const topicIds = [];
        for (const q of qs) if (q.t === t && !topicIds.includes(q.top)) topicIds.push(q.top);
        if (!topicIds.length) return '';
        const head = S.settings.scope === 'all' ? `<div class="topics-head">Test ${t}</div>` : '';
        return head + topicIds
          .map((top) => {
            const tc = counts(qs.filter((q) => q.top === top));
            const pd = (100 * tc.done) / tc.total;
            const pl = (100 * tc.learn) / tc.total;
            return `<button type="button" class="topic" data-act="topic" data-v="${top}">
              <span class="name">${esc(TOPICS[top] || top)}</span>
              <span class="cnt">${tc.done}/${tc.total}</span>
              <span class="bar" aria-hidden="true"><i class="b-done" style="width:${pd}%"></i><i class="b-learn" style="width:${pl}%"></i></span>
            </button>`;
          })
          .join('');
      })
      .join('');

    app.innerHTML = `
      <header class="top">
        <div class="logo" aria-hidden="true">TI</div>
        <div class="grow"><h1>Nauka TI</h1><div class="sub">Technologia informacyjna · testy 1 i 2</div></div>
        <button type="button" class="icon-btn" data-act="nav" data-v="ustawienia" aria-label="Ustawienia">${I.gear}</button>
      </header>
      ${scopeSeg()}
      <section class="card">
        <div class="progress-card">
          ${ringHtml(c)}
          <div class="legend">
            <div><span class="dot done"></span>Opanowane<b>${c.done}</b></div>
            <div><span class="dot learn"></span>W trakcie<b>${c.learn}</b></div>
            <div><span class="dot new"></span>Nowe<b>${c.new}</b></div>
            <div><span class="dot due"></span>Do powtórki teraz<b>${c.due}</b></div>
          </div>
        </div>
        <div class="goal">
          <div class="goal-row"><span>Dzienny cel: <b>${today}/${goal}</b> ${plural(goal, 'odpowiedź', 'odpowiedzi', 'odpowiedzi')}${today >= goal ? ' ✓' : ''}</span><span>Seria: <b>${st}</b> ${plural(st, 'dzień', 'dni', 'dni')}</span></div>
          <div class="bar" aria-hidden="true"><i class="b-goal" style="width:${Math.min(100, (100 * today) / goal)}%"></i></div>
        </div>
      </section>
      <button type="button" class="cta" data-act="learn">
        ${I.bolt}<div><b>Ucz się</b><span>${esc(ctaSub)}</span></div>${I.arrow}
      </button>
      <div class="modes">
        <button type="button" class="mode" data-act="flash">${I.cards}<b>Fiszki</b><span>Pytanie → odpowiedź, oceniasz się sam</span></button>
        <button type="button" class="mode" data-act="nav" data-v="egzamin">${I.exam}<b>Egzamin próbny</b><span>Losowe pytania ABCD, wynik na koniec</span></button>
        <button type="button" class="mode" data-act="mistakes">${I.alert}<b>Moje błędy</b><span>Tylko pytania, w których się mylisz</span>${c.mistakes ? `<span class="badge">${c.mistakes}</span>` : ''}</button>
        <button type="button" class="mode" data-act="nav" data-v="sciaga">${I.book}<b>Ściąga</b><span>Wszystkie pytania z odpowiedziami + szukaj</span></button>
      </div>
      <h2 class="section-title">Tematy <span class="muted small">– dotknij, aby ćwiczyć tylko jeden</span></h2>
      <div class="topics">${topicsHtml}</div>
      <details class="tips card">
        <summary>Jak się uczyć, żeby zdać? (plan na 3 dni)</summary>
        <ul>
          <li><b>„Ucz się”</b> to główny tryb. Aplikacja sama dobiera nowe pytania i te do powtórki. Błędne odpowiedzi wracają jeszcze w tej samej rundzie, a potem znowu po kilku minutach.</li>
          <li><b>Rób kilka krótkich rund dziennie</b> (rano, po południu, wieczorem). Powtórki rozłożone w czasie działają dużo lepiej niż jedno długie wkuwanie.</li>
          <li><b>Plan:</b> codziennie zrób <b>dzienny cel</b> (teraz: ${goal} odpowiedzi, ok. ${Math.round(goal / 6)} minut), najlepiej w 3 sesjach po kilka rund. Dzień 1–2: aplikacja pokaże wszystkie pytania. Dzień 3: powtórki, „Moje błędy” i 2–3 egzaminy próbne.</li>
          <li><b>Nie zgaduj.</b> Jeśli nie wiesz, kliknij „Nie wiem”. Pytanie wróci szybciej i nie zafałszuje wyniku.</li>
          <li><b>Fiszki:</b> najpierw odpowiedz w głowie, dopiero potem odkryj odpowiedź i oceń się uczciwie.</li>
          <li>Pytanie jest <b>opanowane</b>, gdy odpowiesz dobrze kilka razy z rzędu z przerwami (ostatnio po co najmniej godzinie przerwy).</li>
          <li>Postęp zapisuje się <b>na tym urządzeniu</b>. Dodaj stronę do ekranu głównego telefonu, wtedy działa też bez internetu.</li>
          <li>Poprawne odpowiedzi pochodzą z notatek. Błędne opcje w quizie są dopisane do nauki, na prawdziwym teście mogą być inne, więc ucz się treści odpowiedzi, nie litery.</li>
        </ul>
      </details>
      <p class="foot">Źródło: notatki „Odpowiedzi do testu 1 i 2 z technologii informacyjnej”. ${QUESTIONS.length} pytań.</p>
    `;
  }

  /* ================= Widok: runda (quiz / fiszka) ================= */

  function topBar(pos, total) {
    const pct = Math.round((100 * pos) / total);
    return `<div class="bar-top">
      <button type="button" class="icon-btn" data-act="nav" data-v="" aria-label="Zakończ i wróć">${I.close}</button>
      <div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${pos}"><i style="width:${pct}%"></i></div>
      <div class="count">${Math.min(pos + 1, total)}/${total}</div>
    </div>`;
  }

  function stateChip(it) {
    if (it.retry) return '<span class="chip bad">Popraw błąd</span>';
    // stan sprzed odpowiedzi – żeby plakietka nie zmieniała się po kliknięciu
    if (it.st === 'new') return '<span class="chip">Nowe</span>';
    if (it.st === 'done') return '<span class="chip ok">Opanowane</span>';
    return '<span class="chip warn">Powtórka</span>';
  }

  function viewRound() {
    if (!SESSION) return go('');
    const it = SESSION.queue[SESSION.pos];
    if (!it) return go('wynik');
    if (it.mode === 'flash') return viewFlashItem(it);
    return viewQuizItem(it);
  }

  function viewQuizItem(it) {
    const q = BY_ID.get(it.id);
    const answered = it.picked !== null;
    const keys = ['A', 'B', 'C', 'D'];
    const opts = it.opts
      .map((o, i) => {
        let cls = 'opt';
        if (answered) {
          if (o.ok) cls += ' right';
          else if (i === it.picked) cls += ' wrong';
          else cls += ' dim';
        }
        return `<button type="button" class="${cls}" data-act="pick" data-v="${i}" ${answered ? 'disabled' : ''}><span class="key">${keys[i]}</span><span class="txt">${esc(o.text)}</span></button>`;
      })
      .join('');
    let fb = '';
    let actions;
    if (answered) {
      const ok = it.picked >= 0 && it.opts[it.picked].ok;
      fb = `<div class="feedback ${ok ? 'ok' : 'bad'}" role="status">
        <h3>${ok ? '✓ Dobrze!' : it.picked === -1 ? 'Zapamiętaj odpowiedź:' : '✗ Niestety, źle'}</h3>
        ${notesBlock(q)}
      </div>`;
      actions = `<div class="row"><button type="button" class="btn primary" data-act="next" id="nextBtn">Dalej →</button></div><div class="kbd-hint">Enter – dalej · Esc – wyjście</div>`;
    } else {
      actions = `<div class="row"><button type="button" class="btn" data-act="dunno">Nie wiem – pokaż odpowiedź</button></div><div class="kbd-hint">Klawisze 1–4 lub A–D · 0 – nie wiem</div>`;
    }
    app.innerHTML = `
      ${topBar(SESSION.pos, SESSION.queue.length)}
      <div class="meta">${chipFor(q)}${stateChip(it)}</div>
      <h2 class="question">${esc(q.q)}</h2>
      <div class="options">${opts}</div>
      ${fb}
      <div class="actions">${actions}</div>
    `;
    currentKey = (e) => {
      const k = e.key.toLowerCase();
      if (!answered) {
        const idx = ['1', '2', '3', '4'].indexOf(k) >= 0 ? Number(k) - 1 : ['a', 'b', 'c', 'd'].indexOf(k);
        if (idx >= 0 && idx < it.opts.length) {
          e.preventDefault();
          pick(it, idx);
        } else if (k === '0' || k === 'n') {
          e.preventDefault();
          pick(it, -1);
        }
      } else if (k === 'enter' || k === ' ' || k === 'arrowright') {
        e.preventDefault();
        nextItem();
      }
    };
    if (answered) {
      const fbEl = app.querySelector('.feedback');
      if (fbEl && fbEl.getBoundingClientRect().bottom > window.innerHeight - 90) {
        const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        fbEl.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
      }
      const nb = document.getElementById('nextBtn');
      if (nb && usingKeyboard) nb.focus({ preventScroll: true });
    }
  }

  function pick(it, idx) {
    if (it.picked !== null) return;
    it.picked = idx;
    const ok = idx >= 0 && it.opts[idx].ok;
    answerItem(it, ok ? 'ok' : 'bad');
    render(false);
  }

  function viewFlashItem(it) {
    const q = BY_ID.get(it.id);
    const back = it.revealed ? `<div class="back">${notesBlock(q)}</div>` : '<div class="tap">Pomyśl, jaka jest odpowiedź, i dotknij karty</div>';
    const actions = it.revealed
      ? `<div class="row" style="--n:3">
          <button type="button" class="btn rate-bad" data-act="rate" data-v="bad">Nie wiem</button>
          <button type="button" class="btn rate-mid" data-act="rate" data-v="mid">Prawie</button>
          <button type="button" class="btn rate-ok" data-act="rate" data-v="ok">Wiem</button>
        </div><div class="kbd-hint">1 – nie wiem · 2 – prawie · 3 – wiem</div>`
      : `<div class="row"><button type="button" class="btn primary" data-act="reveal">Pokaż odpowiedź</button></div><div class="kbd-hint">Spacja – pokaż odpowiedź</div>`;
    app.innerHTML = `
      ${topBar(SESSION.pos, SESSION.queue.length)}
      <div class="card flash" ${it.revealed ? '' : 'data-act="reveal" role="button" tabindex="0"'}>
        <div class="meta">${chipFor(q)}${stateChip(it)}</div>
        <h2 class="question">${esc(q.q)}</h2>
        ${back}
      </div>
      <div class="actions">${actions}</div>
    `;
    currentKey = (e) => {
      const k = e.key.toLowerCase();
      if (!it.revealed) {
        if (k === ' ' || k === 'enter') {
          e.preventDefault();
          reveal(it);
        }
      } else {
        const map = { 1: 'bad', 2: 'mid', 3: 'ok' };
        if (map[k]) {
          e.preventDefault();
          rate(it, map[k]);
        }
      }
    };
  }

  function reveal(it) {
    it.revealed = true;
    render(false);
  }

  function rate(it, v) {
    answerItem(it, v);
    nextItem();
  }

  /* ================= Widok: wynik rundy ================= */

  function viewRoundResult() {
    if (!SESSION) return go('');
    const ids = SESSION.order;
    const okIds = ids.filter((id) => SESSION.first[id]);
    const badIds = ids.filter((id) => id in SESSION.first && !SESSION.first[id]);
    const answeredN = ids.filter((id) => id in SESSION.first).length;
    const pct = answeredN ? Math.round((100 * okIds.length) / answeredN) : 0;
    const cls = pct >= 80 ? 'ok' : pct >= 50 ? 'mid' : 'bad';
    const msg = pct >= 80 ? 'Świetnie! Tak trzymaj.' : pct >= 50 ? 'Nieźle. Błędne pytania wrócą w kolejnych rundach.' : 'Spokojnie, to normalne na początku. Powtórz błędy.';
    const c = counts(pool());
    const review = badIds
      .map((id) => {
        const q = BY_ID.get(id);
        return `<div class="card review-item"><div class="meta">${chipFor(q)}</div><div class="q">${esc(q.q)}</div>${answersHtml(q)}${noteHtml(q)}</div>`;
      })
      .join('');
    app.innerHTML = `
      <section class="card result-hero">
        <div class="big ${cls}">${okIds.length}/${answeredN}</div>
        <p>poprawnie za pierwszym razem (${pct}%)</p>
        <p>${msg}</p>
      </section>
      <div class="stack" style="margin-top:14px">
        <button type="button" class="btn primary block" data-act="again">Kolejna runda →</button>
        ${badIds.length ? `<button type="button" class="btn block" data-act="retry-bad">Powtórz ${badIds.length} ${plural(badIds.length, 'błędne pytanie', 'błędne pytania', 'błędnych pytań')}</button>` : ''}
        <button type="button" class="btn block" data-act="nav" data-v="">Strona główna</button>
      </div>
      <p class="muted small" style="margin-top:14px;text-align:center">${scopeLabel()}: opanowane ${c.done}/${c.total} · w trakcie ${c.learn} · nowe ${c.new}</p>
      ${badIds.length ? `<h2 class="section-title">Do zapamiętania</h2><div class="stack">${review}</div>` : ''}
    `;
    SESSION.badIds = badIds;
  }

  /* ================= Egzamin próbny ================= */

  let examCount = 20;

  function viewExamSetup() {
    const qs = pool((q) => !q.noquiz);
    const n = (v, label) => `<button type="button" class="pill" data-act="exam-count" data-v="${v}" aria-pressed="${examCount === v}">${label}</button>`;
    app.innerHTML = `
      <div class="bar-top"><button type="button" class="icon-btn" data-act="nav" data-v="" aria-label="Wróć">${I.back}</button><h1 style="font-size:1.2rem">Egzamin próbny</h1></div>
      <div class="card stack">
        <p>Losowe pytania ABCD jak na teście. Wynik i poprawne odpowiedzi zobaczysz dopiero na końcu. Odpowiedzi też liczą się do Twojego postępu.</p>
        <div class="field"><span class="label">Zakres</span>${scopeSeg()}</div>
        <div class="field"><span class="label">Liczba pytań</span>
          <div class="pills">${n(20, '20')}${n(40, '40')}${n(60, '60')}${n(0, `Wszystkie (${qs.length})`)}</div>
        </div>
        <button type="button" class="btn primary block" data-act="exam-start">Rozpocznij egzamin →</button>
      </div>
    `;
  }

  function startExam() {
    const all = shuffle(pool((q) => !q.noquiz));
    const qs = examCount ? all.slice(0, examCount) : all;
    if (!qs.length) return;
    EXAM = { items: qs.map((q) => ({ id: q.id, opts: makeOptions(q), picked: null })), pos: 0, start: Date.now(), end: null };
    go('egzamin-test', true);
  }

  let timerHandle = null;
  function fmtTime(ms) {
    const s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function viewExam() {
    if (!EXAM || EXAM.end) return go('egzamin');
    const it = EXAM.items[EXAM.pos];
    const q = BY_ID.get(it.id);
    const keys = ['A', 'B', 'C', 'D'];
    const last = EXAM.pos === EXAM.items.length - 1;
    const opts = it.opts
      .map((o, i) => `<button type="button" class="opt${it.picked === i ? ' sel' : ''}" data-act="exam-pick" data-v="${i}" aria-pressed="${it.picked === i}"><span class="key">${keys[i]}</span><span class="txt">${esc(o.text)}</span></button>`)
      .join('');
    const pct = Math.round((100 * EXAM.pos) / EXAM.items.length);
    app.innerHTML = `
      <div class="bar-top">
        <button type="button" class="icon-btn" data-act="exam-quit" aria-label="Przerwij egzamin">${I.close}</button>
        <div class="prog"><i style="width:${pct}%"></i></div>
        <div class="count">${EXAM.pos + 1}/${EXAM.items.length}</div>
      </div>
      <div class="meta"><span class="chip accent">Egzamin</span><span class="chip" id="timer">⏱ ${fmtTime(Date.now() - EXAM.start)}</span></div>
      <h2 class="question">${esc(q.q)}</h2>
      <div class="options">${opts}</div>
      <div class="actions"><div class="row" style="--n:2">
        <button type="button" class="btn" data-act="exam-skip">Nie wiem</button>
        <button type="button" class="btn primary" data-act="exam-next" ${it.picked === null ? 'disabled' : ''}>${last ? 'Zakończ ✓' : 'Dalej →'}</button>
      </div><div class="kbd-hint">1–4 / A–D – wybór · Enter – dalej</div></div>
    `;
    clearInterval(timerHandle);
    timerHandle = setInterval(() => {
      const el = document.getElementById('timer');
      if (!el || !EXAM || EXAM.end) return clearInterval(timerHandle);
      el.textContent = '⏱ ' + fmtTime(Date.now() - EXAM.start);
    }, 1000);
    currentKey = (e) => {
      const k = e.key.toLowerCase();
      const idx = ['1', '2', '3', '4'].indexOf(k) >= 0 ? Number(k) - 1 : ['a', 'b', 'c', 'd'].indexOf(k);
      if (idx >= 0 && idx < it.opts.length) {
        e.preventDefault();
        it.picked = idx;
        render(false);
      } else if (k === 'enter' && it.picked !== null) {
        e.preventDefault();
        examNext();
      }
    };
  }

  function examNext() {
    if (EXAM.pos < EXAM.items.length - 1) {
      EXAM.pos += 1;
      render(true);
    } else {
      finishExam();
    }
  }

  function finishExam() {
    EXAM.end = Date.now();
    clearInterval(timerHandle);
    for (const it of EXAM.items) {
      const ok = it.picked !== null && it.picked >= 0 && it.opts[it.picked].ok;
      grade(it.id, ok ? 'ok' : 'bad');
    }
    go('egzamin-wynik', true);
  }

  function viewExamResult() {
    if (!EXAM || !EXAM.end) return go('egzamin');
    const total = EXAM.items.length;
    const wrong = EXAM.items.filter((it) => !(it.picked !== null && it.picked >= 0 && it.opts[it.picked].ok));
    const good = total - wrong.length;
    const pct = Math.round((100 * good) / total);
    const cls = pct >= 80 ? 'ok' : pct >= 50 ? 'mid' : 'bad';
    const msg = pct >= 80 ? 'Świetny wynik!' : pct >= 50 ? 'Nieźle. Popraw błędy i spróbuj jeszcze raz.' : 'Jeszcze trochę nauki. Zacznij od „Moich błędów”.';
    const review = wrong
      .map((it) => {
        const q = BY_ID.get(it.id);
        const yours = it.picked !== null && it.picked >= 0 ? it.opts[it.picked].text : '— (nie wiem)';
        const right = it.opts.find((o) => o.ok).text;
        return `<div class="card review-item">
          <div class="meta">${chipFor(q)}</div>
          <div class="q">${esc(q.q)}</div>
          <div class="yours">Twoja odpowiedź: ${esc(yours)}</div>
          <div class="yours ok">Poprawna: ${esc(right)}</div>
          ${notesBlock(q)}
        </div>`;
      })
      .join('');
    app.innerHTML = `
      <section class="card result-hero">
        <div class="big ${cls}">${pct}%</div>
        <p><b>${good}</b> z <b>${total}</b> poprawnie · czas ${fmtTime(EXAM.end - EXAM.start)}</p>
        <p>${msg}</p>
      </section>
      <div class="stack" style="margin-top:14px">
        ${wrong.length ? `<button type="button" class="btn primary block" data-act="exam-retry">Ćwicz ${wrong.length} ${plural(wrong.length, 'błędne pytanie', 'błędne pytania', 'błędnych pytań')} →</button>` : ''}
        <button type="button" class="btn block" data-act="nav" data-v="egzamin">Nowy egzamin</button>
        <button type="button" class="btn block" data-act="nav" data-v="">Strona główna</button>
      </div>
      ${wrong.length ? `<h2 class="section-title">Błędne odpowiedzi</h2><div class="stack">${review}</div>` : ''}
    `;
  }

  /* ================= Ściąga ================= */

  const SC = { q: '', st: 'all', top: 'all' };

  function viewSciaga() {
    const qs = pool();
    const topicIds = [];
    for (const q of qs) if (!topicIds.includes(q.top)) topicIds.push(q.top);
    if (SC.top !== 'all' && !topicIds.includes(SC.top)) SC.top = 'all';
    const p = (v, label) => `<button type="button" class="pill" data-act="sc-st" data-v="${v}" aria-pressed="${SC.st === v}">${label}</button>`;
    app.innerHTML = `
      <div class="search">
        <div class="search-row">
          <button type="button" class="icon-btn" data-act="nav" data-v="" aria-label="Wróć">${I.back}</button>
          <input id="scq" type="search" placeholder="Szukaj w pytaniach i odpowiedziach…" value="${esc(SC.q)}" autocomplete="off" enterkeyhint="search" aria-label="Szukaj">
        </div>
        <div class="filters">
          ${p('all', 'Wszystkie')}${p('new', 'Nowe')}${p('learn', 'W trakcie')}${p('done', 'Opanowane')}${p('bad', 'Z błędami')}
          <select id="sctop" aria-label="Temat">
            <option value="all">Wszystkie tematy</option>
            ${topicIds.map((t) => `<option value="${t}" ${SC.top === t ? 'selected' : ''}>${esc(TOPICS[t])}</option>`).join('')}
          </select>
        </div>
      </div>
      ${scopeSeg()}
      <div id="sclist" class="list"></div>
    `;
    const input = document.getElementById('scq');
    input.addEventListener('input', () => {
      SC.q = input.value;
      renderSciagaList();
    });
    document.getElementById('sctop').addEventListener('change', (e) => {
      SC.top = e.target.value;
      renderSciagaList();
    });
    renderSciagaList();
  }

  function highlight(text, needle) {
    if (!needle) return esc(text);
    const hay = fold(text);
    let out = '';
    let i = 0;
    let at;
    while ((at = hay.indexOf(needle, i)) !== -1) {
      out += esc(text.slice(i, at)) + '<mark>' + esc(text.slice(at, at + needle.length)) + '</mark>';
      i = at + needle.length;
    }
    return out + esc(text.slice(i));
  }

  function renderSciagaList() {
    const box = document.getElementById('sclist');
    if (!box) return;
    const needle = fold(SC.q.trim());
    const qs = pool((q) => {
      if (SC.top !== 'all' && q.top !== SC.top) return false;
      if (SC.st === 'bad') {
        if (!isMistake(q.id)) return false;
      } else if (SC.st !== 'all' && status(q.id) !== SC.st) return false;
      if (needle) {
        const hay = fold([q.q].concat(q.a, q.u || '', 'pyt ' + q.n).join(' \n '));
        if (hay.indexOf(needle) === -1) return false;
      }
      return true;
    });
    const dotColor = { new: 'var(--new)', learn: 'var(--warn-line)', done: 'var(--ok)' };
    box.innerHTML = qs.length
      ? `<p class="muted small">${qs.length} ${plural(qs.length, 'pytanie', 'pytania', 'pytań')}</p>` +
        qs
          .map((q) => {
            const items = q.a
              .map((t, i) => `<li>${q.l ? `<span class="letter">${esc(q.l[i])})</span> ` : ''}${highlight(t, needle)}</li>`)
              .join('');
            return `<article class="card entry">
              <div class="meta"><span class="st" style="background:${dotColor[status(q.id)]}" title="${status(q.id)}"></span>${chipFor(q)}</div>
              <div class="q">${highlight(q.q, needle)}</div>
              <ul class="answers${q.a.length === 1 ? ' single' : ''}">${items}</ul>
              ${q.u ? `<div class="note"><span>${highlight(q.u, needle)}</span></div>` : ''}
            </article>`;
          })
          .join('')
      : '<div class="empty">Nic nie znaleziono. Spróbuj innego słowa.</div>';
  }

  /* ================= Ustawienia ================= */

  function viewSettings() {
    const t = (v, label) => `<button type="button" class="pill" data-act="theme" data-v="${v}" aria-pressed="${S.settings.theme === v}">${label}</button>`;
    const r = (v) => `<button type="button" class="pill" data-act="round" data-v="${v}" aria-pressed="${S.settings.round === v}">${v}</button>`;
    const answered = Object.values(S.cards).reduce((s, c) => s + (c.n || 0), 0);
    app.innerHTML = `
      <div class="bar-top"><button type="button" class="icon-btn" data-act="nav" data-v="" aria-label="Wróć">${I.back}</button><h1 style="font-size:1.2rem">Ustawienia</h1></div>
      <div class="card stack">
        <div class="field"><span class="label">Motyw</span><div class="pills">${t('auto', 'Automatyczny')}${t('light', 'Jasny')}${t('dark', 'Ciemny')}</div></div>
        <div class="field"><span class="label">Liczba pytań w rundzie</span><div class="pills">${r(10)}${r(20)}${r(30)}</div></div>
      </div>
      <div class="card stack" style="margin-top:14px">
        <div class="field"><span class="label">Twój postęp</span>
          <p class="muted small">${storageOk ? `Zapisany w tej przeglądarce na tym urządzeniu. Udzielone odpowiedzi: ${answered}.` : 'Uwaga: ta przeglądarka nie pozwala zapisywać danych (np. tryb prywatny), więc postęp zniknie po zamknięciu strony.'}</p>
        </div>
        <button type="button" class="btn danger block" data-act="reset">Wyzeruj postęp</button>
      </div>
      <div class="card stack" style="margin-top:14px">
        <div class="field"><span class="label">O aplikacji</span>
          <p class="muted small">Pytania i poprawne odpowiedzi pochodzą 1:1 z notatek „Odpowiedzi do testu 1 i 2 z technologii informacyjnej” (poprawione zostały tylko literówki z OCR). Tam, gdzie notatki zawierają błąd albo urwany tekst, przy pytaniu jest ostrzeżenie ⚠️. Błędne opcje w quizie (dystraktory) zostały dopisane do nauki.</p>
          <p class="muted small">Test 1: ${QUESTIONS.filter((q) => q.t === 1).length} pytań · Test 2: ${QUESTIONS.filter((q) => q.t === 2).length} pytań (w notatkach brak nr 33, 51, 96, 99).</p>
        </div>
      </div>
    `;
  }

  function applyTheme() {
    const t = S.settings.theme;
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }

  /* ================= Akcje (kliknięcia) ================= */

  const ACT = {
    nav: (el) => go(el.dataset.v),
    scope: (el) => {
      S.settings.scope = el.dataset.v;
      save();
      render(false);
    },
    learn: () => startLearn(),
    topic: (el) => startLearn(el.dataset.v),
    flash: () => startFlash(),
    mistakes: () => {
      if (!pool((q) => isMistake(q.id)).length) {
        alert('Nie masz jeszcze błędów do poprawy w tym zakresie. Zacznij od „Ucz się” albo egzaminu próbnego.');
        return;
      }
      startMistakes();
    },
    pick: (el) => pick(SESSION.queue[SESSION.pos], Number(el.dataset.v)),
    dunno: () => pick(SESSION.queue[SESSION.pos], -1),
    next: () => nextItem(),
    reveal: () => reveal(SESSION.queue[SESSION.pos]),
    rate: (el) => rate(SESSION.queue[SESSION.pos], el.dataset.v),
    again: () => repeatLast(),
    'retry-bad': () => startIds(SESSION.badIds || [], 'Powtórka błędów'),
    'exam-count': (el) => {
      examCount = Number(el.dataset.v);
      render(false);
    },
    'exam-start': () => startExam(),
    'exam-pick': (el) => {
      EXAM.items[EXAM.pos].picked = Number(el.dataset.v);
      render(false);
    },
    'exam-skip': () => {
      EXAM.items[EXAM.pos].picked = -1;
      examNext();
    },
    'exam-next': () => {
      if (EXAM.items[EXAM.pos].picked !== null) examNext();
    },
    'exam-quit': () => {
      if (confirm('Przerwać egzamin? Odpowiedzi nie zostaną policzone.')) {
        clearInterval(timerHandle);
        EXAM = null;
        go('egzamin');
      }
    },
    'exam-retry': () => startIds(EXAM.items.filter((it) => !(it.picked !== null && it.picked >= 0 && it.opts[it.picked].ok)).map((it) => it.id), 'Błędy z egzaminu'),
    'sc-st': (el) => {
      SC.st = el.dataset.v;
      app.querySelectorAll('[data-act="sc-st"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === SC.st)));
      renderSciagaList();
    },
    theme: (el) => {
      S.settings.theme = el.dataset.v;
      save();
      applyTheme();
      render(false);
    },
    round: (el) => {
      S.settings.round = Number(el.dataset.v);
      save();
      render(false);
    },
    reset: () => {
      if (confirm('Na pewno wyzerować cały postęp nauki na tym urządzeniu? Tego nie da się cofnąć.')) {
        S.cards = {};
        S.days = {};
        save();
        SESSION = null;
        EXAM = null;
        go('', true);
      }
    },
  };

  app.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !app.contains(el) || el.disabled) return;
    const fn = ACT[el.dataset.act];
    if (fn) fn(el, e);
  });

  // klawiatura na karcie-fiszce (tabindex)
  app.addEventListener('keydown', (e) => {
    const el = e.target.closest && e.target.closest('.flash[data-act="reveal"]');
    if (el && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      e.stopPropagation();
      reveal(SESSION.queue[SESSION.pos]);
    }
  });

  /* ================= Start ================= */

  applyTheme();
  if (!QUESTIONS.length) {
    app.innerHTML = '<p class="empty">Nie udało się wczytać pytań. Odśwież stronę.</p>';
    return;
  }
  // Odświeżenie w trakcie rundy/egzaminu → wracamy na start (postęp jest już zapisany).
  if (route() && !['sciaga', 'ustawienia', 'egzamin'].includes(route())) history.replaceState(null, '', '#/');
  render(true);

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
