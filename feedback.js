/* Breath with Diana — zero-backend feedback widget.
   Two modes (set on <body data-fb-mode>):
     • "logos"  (default) — Diana ♥-favorites items + notes.
     • "review"           — Diana ticks "Looks good" on items OR leaves a comment.
   State persists per-page in localStorage. No account, no server.
   AGGREGATION: a page autosaves its own state under its own key, but Copy/Email
   compiles EVERYTHING marked across ALL pages — so she can fill several pages and
   send once, in any order, and never lose a page's notes.
   Reusable: labels come from data-* attributes; drops into any review microsite. */
(function () {
  var body = document.body;
  var KEYNAME = body.dataset.fbKey || location.pathname;
  var KEY = 'dianafb:' + KEYNAME;
  var MAILTO = body.dataset.fbEmail || 'd.blaecker@gmail.com';
  var PAGE = body.dataset.fbPage || document.title;
  var MODE = body.dataset.fbMode || 'logos';          // 'logos' | 'review'
  var NOUN = body.dataset.fbNoun || (MODE === 'review' ? 'item' : 'logo');
  var REVIEW = MODE === 'review';
  var PREFIX = 'dianafb:';
  // preferred order + friendly titles for the combined summary
  var ORDER = ['accounts', 'brand', 'logos', 'reviews-tool'];

  var CSS = '' +
    '#fb-bar{position:fixed;right:20px;bottom:20px;z-index:9999;font-family:Inter,system-ui,sans-serif}' +
    '#fb-toggle{background:#C97B5A;color:#F4EFE6;border:none;border-radius:999px;padding:13px 20px;font-size:14px;cursor:pointer;box-shadow:0 6px 22px rgba(91,70,54,.28)}' +
    '#fb-toggle b{font-weight:600}#fb-count{font-weight:600}' +
    '#fb-panel{position:absolute;right:0;bottom:56px;width:336px;max-width:88vw;background:#F4EFE6;border:1px solid rgba(91,70,54,.18);border-radius:16px;box-shadow:0 14px 40px rgba(91,70,54,.3);padding:18px}' +
    '#fb-head{font-family:"Cormorant Garamond",Georgia,serif;font-size:22px;color:#5B4636;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}' +
    '#fb-close{background:none;border:none;font-size:24px;line-height:1;color:#8A8C6E;cursor:pointer}' +
    '.fb-l{display:block;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:rgba(91,70,54,.6);margin:6px 0 6px}' +
    '#fb-favs{max-height:200px;overflow:auto;margin-bottom:8px}' +
    '.fb-empty{font-size:13px;color:rgba(91,70,54,.6);font-style:italic;padding:6px 0}' +
    '.fb-fav{font-size:13px;color:#5B4636;padding:7px 0;border-bottom:1px solid rgba(91,70,54,.12)}' +
    '.fb-fav span{color:rgba(91,70,54,.6)}.fb-fnote{font-size:12px;font-style:italic;color:#8A8C6E;margin-top:2px}' +
    '.fb-other{font-size:12px;color:rgba(91,70,54,.7);background:rgba(138,140,110,.14);border-radius:8px;padding:8px 11px;margin:4px 0 2px}' +
    '#fb-general{width:100%;box-sizing:border-box;font-family:Inter,sans-serif;font-size:13px;border:1px solid rgba(91,70,54,.2);border-radius:10px;padding:10px;resize:vertical;color:#5B4636;background:#fff}' +
    '#fb-actions{display:flex;gap:8px;margin-top:10px}' +
    '#fb-actions button{font-family:Inter,sans-serif;font-size:13px;border-radius:999px;padding:9px 14px;cursor:pointer;border:1px solid #5B4636}' +
    '.fb-primary{background:#5B4636;color:#F4EFE6;border-color:#5B4636!important}' +
    '.fb-ghost{background:none;color:#5B4636}.fb-clear{margin-left:auto;border-color:rgba(91,70,54,.3)!important;color:rgba(91,70,54,.6)}' +
    '#fb-hint{font-size:11px;color:rgba(91,70,54,.55);margin-top:10px;line-height:1.5}' +
    '.fav-btn{background:none;border:none;cursor:pointer;font-size:17px;line-height:1;color:rgba(91,70,54,.32);padding:0;transition:transform .1s}' +
    '.fav-btn:hover{transform:scale(1.08)}.fav-btn.on{color:#C97B5A}' +
    '.fav-note{width:100%;box-sizing:border-box;font-family:Inter,sans-serif;font-size:12px;border:1px solid rgba(91,70,54,.16);border-radius:8px;padding:6px 9px;margin-top:8px;color:#5B4636;background:#fff}' +
    '.fb-flash{position:fixed;left:50%;bottom:84px;transform:translateX(-50%) translateY(8px);z-index:10000;background:#5B4636;color:#F4EFE6;font-family:Inter,sans-serif;font-size:13px;padding:11px 18px;border-radius:999px;opacity:0;transition:.2s}' +
    '.fb-flash.go{opacity:1;transform:translateX(-50%) translateY(0)}';
  var st = document.createElement('style'); st.textContent = CSS; (document.head || document.documentElement).appendChild(st);

  var store;
  try { store = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { store = {}; }
  store.favs = store.favs || {};      // id -> {name, group, note, accepted}
  store.general = store.general || '';
  function save() {
    store.page = PAGE; store.mode = MODE;            // stamp so other pages can label this one
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
  }

  function prune(id) {
    var f = store.favs[id];
    if (f && !f.accepted && !(f.note && f.note.trim())) delete store.favs[id];
  }

  // ---- read every page's saved feedback from localStorage ----
  function readAll() {
    var out = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k.indexOf(PREFIX) !== 0) continue;
      var name = k.slice(PREFIX.length);
      var data;
      try { data = JSON.parse(localStorage.getItem(k) || '{}'); } catch (e) { continue; }
      data.favs = data.favs || {}; data.general = data.general || '';
      out.push({ name: name, page: data.page || name, mode: data.mode || 'logos', favs: data.favs, general: data.general });
    }
    out.sort(function (a, b) {
      var ia = ORDER.indexOf(a.name), ib = ORDER.indexOf(b.name);
      if (ia === -1) ia = 99; if (ib === -1) ib = 99;
      return ia - ib;
    });
    return out;
  }
  function storeCount(s) {
    var ids = Object.keys(s.favs);
    if (s.mode === 'review') {
      var n = ids.filter(function (id) { return s.favs[id].accepted; }).length +
              ids.filter(function (id) { return s.favs[id].note && s.favs[id].note.trim(); }).length;
      return n + (s.general && s.general.trim() ? 1 : 0);
    }
    return ids.length + (s.general && s.general.trim() ? 1 : 0);
  }
  function grandTotal() { var t = 0; readAll().forEach(function (s) { t += storeCount(s); }); return t; }

  function acceptedList() { return Object.keys(store.favs).filter(function (id) { return store.favs[id].accepted; }); }
  function notedList() { return Object.keys(store.favs).filter(function (id) { return store.favs[id].note && store.favs[id].note.trim(); }); }

  var bar = document.createElement('div');
  bar.id = 'fb-bar';
  var generalLabel = REVIEW
    ? 'Anything else? (overall thoughts, or anything not covered above)'
    : 'Anything else? (overall thoughts, what you love, what feels off)';
  bar.innerHTML =
    '<button id="fb-toggle" type="button"><span id="fb-count">0</span> marked · <b>Send feedback</b></button>' +
    '<div id="fb-panel" hidden>' +
      '<div id="fb-head">Your feedback <button id="fb-close" type="button" aria-label="close">×</button></div>' +
      '<div id="fb-favs"></div>' +
      '<label class="fb-l">' + generalLabel + '</label>' +
      '<textarea id="fb-general" rows="4" placeholder="Type freely…"></textarea>' +
      '<div id="fb-actions">' +
        '<button id="fb-copy" type="button" class="fb-primary">Copy my feedback</button>' +
        '<button id="fb-email" type="button" class="fb-ghost">Email it</button>' +
        '<button id="fb-clear" type="button" class="fb-ghost fb-clear">Reset</button>' +
      '</div>' +
      '<div id="fb-hint">Sends <b>everything you’ve marked on all pages</b> at once — you don’t have to send each page separately. “Copy” → paste to Daniel; “Email” → opens a pre-filled Gmail.</div>' +
    '</div>';
  document.addEventListener('DOMContentLoaded', mount);
  if (document.readyState !== 'loading') mount();
  function mount() {
    if (document.getElementById('fb-bar')) return;
    body.appendChild(bar);
    document.getElementById('fb-general').value = store.general;
    wire();
    refresh();
  }

  function refresh() {
    document.querySelectorAll('.fav-btn').forEach(function (b) {
      b.classList.toggle('on', !!(store.favs[b.dataset.id] && store.favs[b.dataset.id].accepted));
      b.setAttribute('aria-pressed', (store.favs[b.dataset.id] && store.favs[b.dataset.id].accepted) ? 'true' : 'false');
    });
    document.querySelectorAll('.fav-note').forEach(function (n) {
      if (store.favs[n.dataset.id] && typeof store.favs[n.dataset.id].note === 'string') n.value = store.favs[n.dataset.id].note;
    });
    document.getElementById('fb-count').textContent = grandTotal();

    var favs = document.getElementById('fb-favs');
    if (!favs) return;
    var html = '';
    if (REVIEW) {
      var acc = acceptedList(), noted = notedList();
      if (acc.length) html += '<div class="fb-l">Looks good (' + acc.length + ')</div>' + acc.map(function (id) {
        return '<div class="fb-fav">✓ <b>' + esc(store.favs[id].name || id) + '</b></div>'; }).join('');
      if (noted.length) html += '<div class="fb-l">Comments (' + noted.length + ')</div>' + noted.map(function (id) {
        return '<div class="fb-fav"><b>' + esc(store.favs[id].name || id) + '</b><div class="fb-fnote">“' + esc(store.favs[id].note) + '”</div></div>'; }).join('');
      if (!acc.length && !noted.length) html += '<div class="fb-empty">Tick “Looks good” on anything you’re happy with — or add a note on anything you’d change.</div>';
    } else {
      var ids = Object.keys(store.favs);
      if (ids.length) html += '<div class="fb-l">Saved ' + esc(NOUN) + 's (' + ids.length + ')</div>' + ids.map(function (id) {
        var f = store.favs[id];
        return '<div class="fb-fav"><b>' + esc(f.name || id) + '</b>' + (f.group ? ' <span>· ' + esc(f.group) + '</span>' : '') +
          (f.note ? '<div class="fb-fnote">“' + esc(f.note) + '”</div>' : '') + '</div>'; }).join('');
      else html += '<div class="fb-empty">Tap the ♥ on any ' + esc(NOUN) + ' to save it here.</div>';
    }
    // note about other pages already marked — so she trusts it all sends together
    var others = readAll().filter(function (s) { return s.name !== KEYNAME && storeCount(s) > 0; });
    if (others.length) {
      html += '<div class="fb-other">Also sending your notes from: <b>' +
        others.map(function (s) { return esc(s.page); }).join('</b>, <b>') + '</b></div>';
    }
    favs.innerHTML = html;
  }

  function wire() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest('.fav-btn');
      if (b) {
        var id = b.dataset.id;
        if (!store.favs[id]) store.favs[id] = { name: b.dataset.name || '', group: b.dataset.group || '', note: '', accepted: false };
        store.favs[id].accepted = !store.favs[id].accepted;
        prune(id); save(); refresh(); return;
      }
    });
    document.addEventListener('input', function (e) {
      var nt = e.target.closest('.fav-note');
      if (nt) {
        var id = nt.dataset.id;
        if (!store.favs[id]) store.favs[id] = { name: nt.dataset.name || '', group: nt.dataset.group || '', note: '', accepted: false };
        store.favs[id].note = nt.value;
        prune(id); save(); refresh(); return;
      }
    });
    var gen = document.getElementById('fb-general');
    gen.addEventListener('input', function () { store.general = gen.value; save(); refresh(); });
    document.getElementById('fb-toggle').onclick = function () { var p = document.getElementById('fb-panel'); p.hidden = !p.hidden; };
    document.getElementById('fb-close').onclick = function () { document.getElementById('fb-panel').hidden = true; };
    document.getElementById('fb-copy').onclick = function () {
      var txt = compileAll();
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { flash('Copied — paste it to Daniel'); }, fallbackCopy.bind(null, txt));
      else fallbackCopy(txt);
    };
    document.getElementById('fb-email').onclick = function () {
      var subj = encodeURIComponent('Diana feedback — all review pages');
      var body2 = encodeURIComponent(compileAll());
      var gmail = 'https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=' + encodeURIComponent(MAILTO) + '&su=' + subj + '&body=' + body2;
      var w = window.open(gmail, '_blank');
      if (!w) location.href = 'mailto:' + MAILTO + '?subject=' + subj + '&body=' + body2;
      else flash('Opened Gmail — just hit send');
    };
    document.getElementById('fb-clear').onclick = function () {
      if (!confirm('Clear everything you’ve marked on THIS page? (other pages are kept)')) return;
      store = { favs: {}, general: '' }; save();
      document.getElementById('fb-general').value = ''; refresh();
    };
  }

  // ---- render ONE page's section ----
  function renderSection(s) {
    var lines = [], ids = Object.keys(s.favs);
    if (s.mode === 'review') {
      var acc = ids.filter(function (id) { return s.favs[id].accepted; });
      var noted = ids.filter(function (id) { return s.favs[id].note && s.favs[id].note.trim(); });
      if (acc.length) { lines.push('  ✓ Looks good: ' + acc.map(function (id) { return s.favs[id].name || id; }).join('; ')); }
      if (noted.length) { lines.push('  ✎ Comments:'); noted.forEach(function (id) { lines.push('     • ' + (s.favs[id].name || id) + ': ' + s.favs[id].note.trim()); }); }
    } else {
      if (ids.length) { lines.push('  ♥ Saved ' + (s.mode === 'logos' ? 'logos' : 'items') + ':'); ids.forEach(function (id) { var f = s.favs[id]; lines.push('     • ' + (f.group ? f.group + ' / ' : '') + (f.name || id) + ' [' + id + ']' + (f.note ? ' — ' + f.note : '')); }); }
    }
    if (s.general && s.general.trim()) { lines.push('  Overall: ' + s.general.trim()); }
    return lines;
  }

  // ---- compile EVERY page into one summary ----
  function compileAll() {
    save();                                   // make sure current page is persisted first
    var all = readAll().filter(function (s) { return storeCount(s) > 0; });
    if (!all.length) return 'Diana’s feedback\n\n(nothing marked yet)';
    var out = ['Diana’s feedback — across ' + all.length + ' page(s)', ''];
    all.forEach(function (s) {
      out.push('=== ' + s.page + ' ===');
      out = out.concat(renderSection(s));
      out.push('');
    });
    return out.join('\n');
  }

  function fallbackCopy(txt) {
    var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); flash('Copied — paste it to Daniel'); } catch (e) { flash('Select all in the box and copy'); }
    document.body.removeChild(ta);
  }
  function flash(msg) {
    var f = document.createElement('div'); f.className = 'fb-flash'; f.textContent = msg; document.body.appendChild(f);
    setTimeout(function () { f.classList.add('go'); }, 10);
    setTimeout(function () { f.remove(); }, 2200);
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
})();
