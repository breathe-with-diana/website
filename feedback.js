/* Breath with Diana — zero-backend feedback widget.
   Diana hearts logos + types notes, then Copies/Emails a clean summary.
   State persists in her browser (localStorage). No account, no server. */
(function () {
  var body = document.body;
  var KEY = 'dianafb:' + (body.dataset.fbKey || location.pathname);
  var MAILTO = body.dataset.fbEmail || 'd.blaecker@gmail.com';
  var PAGE = body.dataset.fbPage || document.title;

  var CSS = '' +
    '#fb-bar{position:fixed;right:20px;bottom:20px;z-index:9999;font-family:Inter,system-ui,sans-serif}' +
    '#fb-toggle{background:#C97B5A;color:#F4EFE6;border:none;border-radius:999px;padding:13px 20px;font-size:14px;cursor:pointer;box-shadow:0 6px 22px rgba(91,70,54,.28)}' +
    '#fb-toggle b{font-weight:600}#fb-count{font-weight:600}' +
    '#fb-panel{position:absolute;right:0;bottom:56px;width:330px;max-width:88vw;background:#F4EFE6;border:1px solid rgba(91,70,54,.18);border-radius:16px;box-shadow:0 14px 40px rgba(91,70,54,.3);padding:18px}' +
    '#fb-head{font-family:"Cormorant Garamond",Georgia,serif;font-size:22px;color:#5B4636;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}' +
    '#fb-close{background:none;border:none;font-size:24px;line-height:1;color:#8A8C6E;cursor:pointer}' +
    '.fb-l{display:block;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:rgba(91,70,54,.6);margin:6px 0 6px}' +
    '#fb-favs{max-height:190px;overflow:auto;margin-bottom:8px}' +
    '.fb-empty{font-size:13px;color:rgba(91,70,54,.6);font-style:italic;padding:6px 0}' +
    '.fb-fav{font-size:13px;color:#5B4636;padding:7px 0;border-bottom:1px solid rgba(91,70,54,.12)}' +
    '.fb-fav span{color:rgba(91,70,54,.6)}.fb-fnote{font-size:12px;font-style:italic;color:#8A8C6E;margin-top:2px}' +
    '#fb-general{width:100%;box-sizing:border-box;font-family:Inter,sans-serif;font-size:13px;border:1px solid rgba(91,70,54,.2);border-radius:10px;padding:10px;resize:vertical;color:#5B4636;background:#fff}' +
    '#fb-actions{display:flex;gap:8px;margin-top:10px}' +
    '#fb-actions button{font-family:Inter,sans-serif;font-size:13px;border-radius:999px;padding:9px 14px;cursor:pointer;border:1px solid #5B4636}' +
    '.fb-primary{background:#5B4636;color:#F4EFE6;border-color:#5B4636!important}' +
    '.fb-ghost{background:none;color:#5B4636}.fb-clear{margin-left:auto;border-color:rgba(91,70,54,.3)!important;color:rgba(91,70,54,.6)}' +
    '#fb-hint{font-size:11px;color:rgba(91,70,54,.55);margin-top:10px;line-height:1.5}' +
    '.fav-btn{background:none;border:none;cursor:pointer;font-size:17px;line-height:1;color:rgba(91,70,54,.32);padding:0;transition:transform .1s}' +
    '.fav-btn:hover{transform:scale(1.18)}.fav-btn.on{color:#C97B5A}' +
    '.fav-note{width:100%;box-sizing:border-box;font-family:Inter,sans-serif;font-size:12px;border:1px solid rgba(91,70,54,.16);border-radius:8px;padding:6px 9px;margin-top:8px;color:#5B4636;background:#fff}' +
    '.fb-flash{position:fixed;left:50%;bottom:84px;transform:translateX(-50%) translateY(8px);z-index:10000;background:#5B4636;color:#F4EFE6;font-family:Inter,sans-serif;font-size:13px;padding:11px 18px;border-radius:999px;opacity:0;transition:.2s}' +
    '.fb-flash.go{opacity:1;transform:translateX(-50%) translateY(0)}';
  var st = document.createElement('style'); st.textContent = CSS; (document.head || document.documentElement).appendChild(st);

  var store;
  try { store = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { store = {}; }
  store.favs = store.favs || {};      // id -> {name, group, note}
  store.general = store.general || '';
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }

  // ---- floating bar + panel ----
  var bar = document.createElement('div');
  bar.id = 'fb-bar';
  bar.innerHTML =
    '<button id="fb-toggle" type="button"><span id="fb-count">0</span> saved · <b>Send feedback</b></button>' +
    '<div id="fb-panel" hidden>' +
      '<div id="fb-head">Your feedback <button id="fb-close" type="button" aria-label="close">×</button></div>' +
      '<div id="fb-favs"></div>' +
      '<label class="fb-l">Anything else? (overall thoughts, what you love, what feels off)</label>' +
      '<textarea id="fb-general" rows="4" placeholder="Type freely…"></textarea>' +
      '<div id="fb-actions">' +
        '<button id="fb-copy" type="button" class="fb-primary">Copy my feedback</button>' +
        '<button id="fb-email" type="button" class="fb-ghost">Email it</button>' +
        '<button id="fb-clear" type="button" class="fb-ghost fb-clear">Reset</button>' +
      '</div>' +
      '<div id="fb-hint">“Copy” puts it on your clipboard — paste into WhatsApp/Telegram to Daniel. “Email” opens a pre-filled Gmail to him.</div>' +
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

  function favList() { return Object.keys(store.favs); }

  function refresh() {
    document.querySelectorAll('.fav-btn').forEach(function (b) {
      b.classList.toggle('on', !!store.favs[b.dataset.id]);
      b.setAttribute('aria-pressed', store.favs[b.dataset.id] ? 'true' : 'false');
    });
    document.querySelectorAll('.fav-note').forEach(function (n) {
      if (store.favs[n.dataset.id] && typeof store.favs[n.dataset.id].note === 'string') n.value = store.favs[n.dataset.id].note;
    });
    var n = favList().length;
    var c = document.getElementById('fb-count'); if (c) c.textContent = n;
    var favs = document.getElementById('fb-favs');
    if (favs) {
      if (!n) { favs.innerHTML = '<div class="fb-empty">Tap the ♥ on any logo to save it here.</div>'; }
      else {
        favs.innerHTML = '<div class="fb-l">Saved logos (' + n + ')</div>' + favList().map(function (id) {
          var f = store.favs[id];
          return '<div class="fb-fav"><b>' + esc(f.name || id) + '</b>' + (f.group ? ' <span>· ' + esc(f.group) + '</span>' : '') +
            (f.note ? '<div class="fb-fnote">“' + esc(f.note) + '”</div>' : '') + '</div>';
        }).join('');
      }
    }
  }

  function wire() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest('.fav-btn');
      if (b) {
        var id = b.dataset.id;
        if (store.favs[id]) delete store.favs[id];
        else store.favs[id] = { name: b.dataset.name || '', group: b.dataset.group || '', note: '' };
        save(); refresh(); return;
      }
    });
    document.addEventListener('input', function (e) {
      var nt = e.target.closest('.fav-note');
      if (nt) {
        var id = nt.dataset.id;
        if (!store.favs[id]) store.favs[id] = { name: nt.dataset.name || '', group: nt.dataset.group || '', note: '' };
        store.favs[id].note = nt.value; save(); return;
      }
    });
    var gen = document.getElementById('fb-general');
    gen.addEventListener('input', function () { store.general = gen.value; save(); refresh(); });
    document.getElementById('fb-toggle').onclick = function () { var p = document.getElementById('fb-panel'); p.hidden = !p.hidden; };
    document.getElementById('fb-close').onclick = function () { document.getElementById('fb-panel').hidden = true; };
    document.getElementById('fb-copy').onclick = function () {
      var txt = compile();
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { flash('Copied — paste it to Daniel'); }, fallbackCopy.bind(null, txt));
      else fallbackCopy(txt);
    };
    document.getElementById('fb-email').onclick = function () {
      var subj = encodeURIComponent('Diana brand feedback — ' + PAGE);
      var body2 = encodeURIComponent(compile());
      // Gmail web compose works in any browser (no desktop mail client needed); opens pre-filled to MAILTO.
      var gmail = 'https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=' + encodeURIComponent(MAILTO) + '&su=' + subj + '&body=' + body2;
      var w = window.open(gmail, '_blank');
      if (!w) location.href = 'mailto:' + MAILTO + '?subject=' + subj + '&body=' + body2; // popup blocked → fall back to mail app
      else flash('Opened Gmail — just hit send');
    };
    document.getElementById('fb-clear').onclick = function () {
      if (!confirm('Clear all your saved logos and notes on this page?')) return;
      store = { favs: {}, general: '' }; save();
      document.getElementById('fb-general').value = ''; refresh();
    };
  }

  function compile() {
    var lines = ['Feedback on: ' + PAGE, ''];
    var favs = favList();
    if (favs.length) {
      lines.push('♥ Saved logos (' + favs.length + '):');
      favs.forEach(function (id) {
        var f = store.favs[id];
        lines.push('• ' + (f.group ? f.group + ' / ' : '') + (f.name || '') + '  [' + id + ']' + (f.note ? '  — ' + f.note : ''));
      });
      lines.push('');
    }
    if (store.general.trim()) { lines.push('Comments:'); lines.push(store.general.trim()); }
    if (lines.length <= 2) lines.push('(no selections yet)');
    return lines.join('\n');
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
