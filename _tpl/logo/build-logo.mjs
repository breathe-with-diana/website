// Generates the animated site logos from the pristine static sources in this folder.
//
//   node _tpl/logo/build-logo.mjs            (run from the _site root)
//
// The "constant drift" treatment: the dandelion seeds drift continuously from the
// figure's breath across the "Breathe with Diana" wordmark. It is baked into each SVG
// as an internal <style> using pure declarative CSS (no script), so it animates even
// when the file is loaded through <img> (which is how every page references the logo).
//
// One source per colourway, one transform, three outputs. Never hand-edit the output
// files (logo-mark.svg, logo-mark-dark.svg, img/logo-site.svg): edit the source in
// _tpl/logo/ (or the upstream trace pipeline) and re-run this. Colours are preserved
// exactly, so the same transform applies to every colourway.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "..", "..");

// which source -> which live output
const JOBS = [
  { src: "logo-mark.svg", out: "logo-mark.svg" },        // nav, light
  { src: "logo-mark-dark.svg", out: "logo-mark-dark.svg" }, // footer
  { src: "logo-site.svg", out: "img/logo-site.svg" },    // form pages
];

// deterministic PRNG so the output is byte-stable across runs
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const lerp = (a, b, t) => a + (b - a) * t;

const STYLE = `<style>
.seed{transform-box:view-box;animation:bwd-drift var(--dur) cubic-bezier(.37,.16,.30,1) infinite;animation-delay:calc(var(--dur) * var(--phase) * -1)}
@keyframes bwd-drift{
0%{opacity:0;transform:translate(0,0) rotate(0) scale(1)}
8%{opacity:1}
55%{transform:translate(calc(var(--ex)*.6px), calc(var(--my)*1px + var(--wob)*1px)) rotate(calc(var(--spin)*.5)) scale(calc((1 + var(--sc))/2))}
85%{opacity:1}
100%{opacity:0;transform:translate(calc(var(--ex)*1px), calc(var(--ey)*1px)) rotate(var(--spin)) scale(var(--sc))}
}
@media (prefers-reduced-motion:reduce){.seed{animation-play-state:paused}}
</style>`;

function animate(svg) {
  if (svg.includes('class="seed"')) throw new Error("source already animated; use the pristine static source");
  const rand = mulberry32(20260712);

  // isolate the flying-seed layer: the <g> right after the dandelion core circle (colour-agnostic)
  const cm = svg.match(/<circle cx="124" cy="34" r="1\.4" fill="#[0-9A-Fa-f]{6}"\/>/);
  if (!cm) throw new Error("core circle marker not found");
  const coreEnd = cm.index + cm[0].length;
  if (svg.slice(coreEnd, coreEnd + 3) !== "<g>") throw new Error("seed wrapper <g> not where expected");

  let i = coreEnd + 3, depth = 1, wrapperClose = -1;
  while (i < svg.length) {
    const ng = svg.indexOf("<g", i), cg = svg.indexOf("</g>", i);
    if (cg === -1) break;
    if (ng !== -1 && ng < cg) { depth++; i = ng + 2; }
    else { depth--; if (depth === 0) { wrapperClose = cg; break; } i = cg + 4; }
  }
  if (wrapperClose === -1) throw new Error("seed wrapper close not found");

  const seedsInner = svg.slice(coreEnd + 3, wrapperClose);
  const before = svg.slice(0, coreEnd);
  const after = svg.slice(wrapperClose + 4);

  const seedRe = /<g transform="translate\(([\d.]+),([\d.]+)\) rotate\(([-\d.]+)\)"([^>]*)>([\s\S]*?)<\/g>/g;
  const seeds = [];
  let m;
  while ((m = seedRe.exec(seedsInner)) !== null) seeds.push({ rot: +m[3], attrs: m[4], body: m[5] });
  if (seeds.length < 20) throw new Error(`expected the flying-seed cluster, got only ${seeds.length}`);

  const EMIT = { x: 123, y: 33 };
  const N = seeds.length;
  const wrapped = seeds.map((s, idx) => {
    const bx = (EMIT.x + (rand() - 0.5) * 4).toFixed(2);
    const by = (EMIT.y + (rand() - 0.5) * 4).toFixed(2);
    const ex = lerp(150, 372, rand()).toFixed(1);
    const ey = lerp(18, 74, rand()).toFixed(1);
    const my = lerp(-10, -26, rand()).toFixed(1);
    const wob = lerp(5, 16, rand()).toFixed(1);
    const dur = lerp(7.5, 12.5, rand()).toFixed(2);
    const spin = lerp(-55, 55, rand()).toFixed(0);
    const sc = lerp(0.55, 0.95, rand()).toFixed(2);
    const phase = (idx / N).toFixed(4);
    const inner = `<g transform="translate(${bx},${by}) rotate(${s.rot})"${s.attrs}>${s.body}</g>`;
    const style = `--dur:${dur}s;--phase:${phase};--ex:${ex};--ey:${ey};--my:${my};--wob:${wob};--spin:${spin}deg;--sc:${sc}`;
    return `<g class="seed" style="${style}">${inner}</g>`;
  }).join("");

  const svgTagEnd = before.indexOf(">") + 1;
  const withStyle = before.slice(0, svgTagEnd) + STYLE + before.slice(svgTagEnd);
  const closeIdx = after.lastIndexOf("</svg>");
  return withStyle + after.slice(0, closeIdx) + `<g class="seeds">${wrapped}</g>` + `</svg>`;
}

let seedCount = 0;
for (const job of JOBS) {
  const out = animate(readFileSync(resolve(here, job.src), "utf8"));
  writeFileSync(resolve(siteRoot, job.out), out);
  seedCount = (out.match(/class="seed"/g) || []).length;
  console.log(`  ${job.src} -> ${job.out}`);
}
console.log(`built ${JOBS.length} animated logos (${seedCount} drifting seeds each)`);
