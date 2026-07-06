#!/usr/bin/env node
/*
 * build.js · zero-dependency static-site builder for "Breathe with Diana"
 *
 * Reads one shared template (template.html) plus one content file per language
 * (content/en.json, content/es.json, content/ru.json) and emits the three static
 * pages (index.html, es.html, ru.html) into the site root, byte-for-byte.
 *
 * No framework, no SSG, no client-side i18n. Just Node core (fs, path) and a small
 * Mustache-ish template engine implemented below. Run: `node build.js` (or `--check`
 * to build to a temp buffer and print sizes without writing).
 *
 * Template syntax supported:
 *   {{key}}                 raw substitution (values may contain HTML; NOT escaped)
 *   {{{key}}}               same as {{key}} (explicit-raw form, for readability)
 *   {{#if key}}...{{/if}}   conditional; {{else}} supported
 *   {{#unless key}}...{{/unless}}
 *   {{#each key}}...{{/each}} iterate array; inside: {{field}} for object items,
 *                            {{.}}/{{this}} for scalar items, {{@index}} {{@first}} {{@last}}
 * Block tags that sit alone on their own line are stripped whole (their indentation
 * and trailing newline removed), Mustache "standalone" style, so the template stays
 * readable without injecting stray blank lines into the output.
 */
'use strict';
const fs = require('fs');
const path = require('path');

/* ------------------------------------------------------------------ engine */

// Strip standalone block-control lines (a line containing only one #/each/if/
// unless/else/close tag surrounded by whitespace) down to just the tag, dropping
// the line's indentation and its trailing newline.
function stripStandalone(tpl) {
  return tpl.replace(
    /^[ \t]*(\{\{[#/][^{}]*\}\}|\{\{\s*else\s*\}\})[ \t]*\r?\n/gm,
    '$1'
  );
}

// Tokenize into text + tag nodes.
function tokenize(tpl) {
  const tokens = [];
  const re = /\{\{\{\s*([^}]+?)\s*\}\}\}|\{\{\s*([^}]+?)\s*\}\}/g;
  let last = 0, m;
  while ((m = re.exec(tpl)) !== null) {
    if (m.index > last) tokens.push({ t: 'text', v: tpl.slice(last, m.index) });
    const body = (m[1] !== undefined ? m[1] : m[2]).trim();
    tokens.push(parseTag(body));
    last = re.lastIndex;
  }
  if (last < tpl.length) tokens.push({ t: 'text', v: tpl.slice(last) });
  return tokens;
}

function parseTag(body) {
  if (body[0] === '#') {
    const [kw, ...rest] = body.slice(1).split(/\s+/);
    return { t: 'open', kw, key: rest.join(' ') };
  }
  if (body[0] === '/') return { t: 'close', kw: body.slice(1).trim() };
  if (body === 'else') return { t: 'else' };
  return { t: 'var', key: body };
}

// Parse flat tokens into a nested AST.
function parse(tokens) {
  let i = 0;
  function parseNodes(stopKw) {
    const nodes = [];
    while (i < tokens.length) {
      const tk = tokens[i];
      if (tk.t === 'close') {
        if (stopKw && tk.kw === stopKw) { i++; return nodes; }
        throw new Error('Unexpected {{/' + tk.kw + '}}');
      }
      if (tk.t === 'else') { i++; return { nodes, elseAt: true, rest: parseNodes(stopKw) }; }
      if (tk.t === 'open') {
        i++;
        const inner = parseNodes(tk.kw);
        let body, elseBody = null;
        if (inner && inner.elseAt) { body = inner.nodes; elseBody = inner.rest; }
        else body = inner;
        nodes.push({ t: 'block', kw: tk.kw, key: tk.key, body, elseBody });
        continue;
      }
      nodes.push(tk);
      i++;
    }
    if (stopKw) throw new Error('Missing {{/' + stopKw + '}}');
    return nodes;
  }
  return parseNodes(null);
}

function lookup(scopes, key) {
  for (let s = scopes.length - 1; s >= 0; s--) {
    const sc = scopes[s];
    if (sc && Object.prototype.hasOwnProperty.call(sc, key)) return sc[key];
  }
  return undefined;
}

function truthy(v) {
  if (Array.isArray(v)) return v.length > 0;
  return !!v;
}

function renderNodes(nodes, scopes, opts) {
  let out = '';
  for (const n of nodes) {
    if (n.t === 'text') { out += n.v; continue; }
    if (n.t === 'var') {
      const v = lookup(scopes, n.key);
      if (v === undefined || v === null) {
        // A reached-but-missing {{var}} is almost always a typo or a renamed key. In strict mode
        // fail loud instead of emitting a silent blank. (@index/@first/@last are engine meta.)
        if (opts.strict && !n.key.startsWith('@')) throw new Error(`[strict] missing value for {{${n.key}}}`);
      } else if (typeof v === 'object') {
        // A var pointing at an array/object always stringifies to garbage ("[object Object]").
        if (opts.strict) throw new Error(`[strict] non-scalar value for {{${n.key}}} (${Array.isArray(v) ? 'array' : 'object'})`);
        out += String(v);
      } else {
        out += String(v);
      }
      continue;
    }
    if (n.t === 'block') {
      const val = lookup(scopes, n.key);
      if (n.kw === 'if' || n.kw === 'unless') {
        const cond = n.kw === 'if' ? truthy(val) : !truthy(val);
        if (cond) out += renderNodes(n.body, scopes, opts);
        else if (n.elseBody) out += renderNodes(n.elseBody, scopes, opts);
      } else if (n.kw === 'each') {
        if (opts.strict && val !== undefined && !Array.isArray(val)) throw new Error(`[strict] {{#each ${n.key}}} value is not an array`);
        const arr = Array.isArray(val) ? val : [];
        if (arr.length === 0 && n.elseBody) { out += renderNodes(n.elseBody, scopes, opts); continue; }
        arr.forEach((item, idx) => {
          const itemScope = (item !== null && typeof item === 'object') ? item : { '.': item, 'this': item };
          const meta = { '@index': idx, '@first': idx === 0, '@last': idx === arr.length - 1 };
          out += renderNodes(n.body, scopes.concat([itemScope, meta]), opts);
        });
      } else {
        throw new Error('Unknown block: ' + n.kw);
      }
    }
  }
  return out;
}

function render(tpl, context, opts) {
  const ast = parse(tokenize(stripStandalone(tpl)));
  return renderNodes(ast, [context], opts || {});
}

/* ------------------------------------------------------------------ selftest */

function selftest() {
  const cases = [
    [render('a {{x}} b', { x: 'Z' }), 'a Z b'],
    [render('{{#if on}}Y{{/if}}', { on: true }), 'Y'],
    [render('{{#if on}}Y{{else}}N{{/if}}', { on: false }), 'N'],
    [render('{{#unless on}}N{{/unless}}', { on: false }), 'N'],
    // standalone stripping: block-only lines vanish, content lines keep indentation
    [render('start\n  {{#if on}}\n  KEEP\n  {{/if}}\nend\n', { on: true }), 'start\n  KEEP\nend\n'],
    [render('start\n  {{#if on}}\n  KEEP\n  {{/if}}\nend\n', { on: false }), 'start\nend\n'],
    // each with separators via @first
    [render('{{#each xs}}{{#unless @first}}-{{/unless}}{{.}}{{/each}}', { xs: ['a', 'b', 'c'] }), 'a-b-c'],
    // each over objects, @index
    [render('{{#each xs}}{{@index}}:{{n}} {{/each}}', { xs: [{ n: 'p' }, { n: 'q' }] }), '0:p 1:q '],
    // raw HTML passes through untouched (no escaping)
    [render('{{h}}', { h: '<em>x</em> & "q"' }), '<em>x</em> & "q"'],
    // triple-stache
    [render('{{{h}}}', { h: '<b>y</b>' }), '<b>y</b>'],
    // nested each inside if
    [render('{{#if on}}{{#each xs}}[{{.}}]{{/each}}{{/if}}', { on: true, xs: ['a', 'b'] }), '[a][b]'],
  ];
  let ok = 0;
  cases.forEach(([got, want], i) => {
    if (got === want) { ok++; }
    else { console.error(`selftest #${i} FAIL\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`); }
  });
  console.log(`selftest: ${ok}/${cases.length} passed`);
  if (ok !== cases.length) process.exit(1);
}

/* ------------------------------------------------------------------ driver */

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) { selftest(); return; }
  const check = args.includes('--check');
  const strict = args.includes('--strict'); // fail loud on missing/typo keys instead of silent blanks
  const only = args.filter(a => !a.startsWith('--')); // optional lang filter, e.g. `node build.js en`

  const DIR = __dirname;
  const outRoot = path.resolve(DIR, '..');
  const template = fs.readFileSync(path.join(DIR, 'template.html'), 'utf8');
  let langs = [
    { code: 'en', out: 'index.html' },
    { code: 'es', out: 'es.html' },
    { code: 'ru', out: 'ru.html' },
  ];
  if (only.length) langs = langs.filter(l => only.includes(l.code));
  const contentDir = path.join(DIR, 'content');
  for (const { code, out } of langs) {
    const ctx = JSON.parse(fs.readFileSync(path.join(contentDir, code + '.json'), 'utf8'));
    // Auto-load raw HTML fragments (content/<token>.<code>.html) as ctx[token]. These hold
    // the quote-heavy blocks (testimonial cards, language switcher) kept out of JSON so their
    // markup is never hand-escaped. A fragment overrides any same-named JSON key.
    const suffix = '.' + code + '.html';
    for (const fn of fs.readdirSync(contentDir)) {
      if (fn.endsWith(suffix)) {
        const token = fn.slice(0, -suffix.length);
        if (Object.prototype.hasOwnProperty.call(ctx, token)) {
          const msg = `fragment ${fn} shadows JSON key "${token}"`;
          if (strict) throw new Error(`[strict] ${msg}`);
          console.warn(`WARN ${msg}`);
        }
        ctx[token] = fs.readFileSync(path.join(contentDir, fn), 'utf8');
      }
    }
    const html = render(template, ctx, { strict });
    if (!check) fs.writeFileSync(path.join(outRoot, out), html);
    console.log(`${check ? 'built (not written)' : 'wrote'} ${out}: ${Buffer.byteLength(html, 'utf8')} bytes`);
  }
}

main();
