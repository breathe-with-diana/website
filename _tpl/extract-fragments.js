'use strict';
// One-off helper: slice the exact quote/attribute-heavy raw blocks out of the pristine
// originals into fragment files named `<token>.<code>.html`, so that markup never passes
// through hand JSON-escaping. build.js auto-loads every content/<token>.<code>.html as ctx[token].
//   reviews_cards  -> the six/three/two testimonial cards inside .rev-grid
//   nav_lang       -> the three language-switch entries inside .lang
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

function reviewsCards(s) {
  const startMarker = '<div class="rev-grid">\n';
  const i = s.indexOf(startMarker);
  if (i < 0) throw new Error('no rev-grid');
  const start = i + startMarker.length;
  const j = s.indexOf('\n    </div>\n    <p class="rev-note"', start);
  if (j < 0) throw new Error('no rev-grid close');
  return s.slice(start, j);
}

function navLang(s) {
  const k = s.indexOf('<span class="lang"');
  if (k < 0) throw new Error('no .lang');
  const gt = s.indexOf('>\n', k);
  const start = gt + 2;
  const end = s.indexOf('\n    </span>', start);
  if (end < 0) throw new Error('no .lang close');
  return s.slice(start, end);
}

for (const [code, f] of [['en', '_orig/index.html'], ['es', '_orig/es.html'], ['ru', '_orig/ru.html']]) {
  const s = fs.readFileSync(path.join(DIR, f), 'utf8');
  for (const [token, fn] of [['reviews_cards', reviewsCards], ['nav_lang', navLang]]) {
    const frag = fn(s);
    fs.writeFileSync(path.join(DIR, 'content', `${token}.${code}.html`), frag);
    console.log(`${token}.${code}.html: ${frag.length} bytes, ${frag.split('\n').length} lines`);
  }
}
