/* =========================================================
   mi eelo · lógica compartida del catálogo
   (precios, encabezado, tarjetas de producto y cada página)
   Los datos y precios se editan en datos.js
   ========================================================= */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const q = n => 'Q' + n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const redondear = x => Math.ceil(x / CONFIG.redondeo - 1e-9) * CONFIG.redondeo;
const cm = inch => Math.round(inch * 2.54);
const pulg = n => (Number.isInteger(n) ? n : n.toFixed(1).replace(/\.0$/, ''));
const tela = id => TELAS.find(t => t.id === id) || TELAS[0];
const producto = id => PRODUCTOS.find(p => p.id === id);
const categoria = id => CATEGORIAS.find(c => c.id === id);
const escala = cant => CONFIG.escalas.find(e => cant >= e.min && cant <= e.max) || CONFIG.escalas[0];
const factor = esc => (1 + esc.fijos + CONFIG.margen) * CONFIG.factorPublico;

function buscarCodigo(cod) {
  for (const p of PRODUCTOS) { const v = p.variantes.find(x => x.cod === cod); if (v) return { p, v }; }
  return null;
}
const medTexto = med => med.map(pulg).join(' × ') + '"';
const medCm = med => med.map(cm).join(' × ') + ' cm';

/* ---------------- Cálculo de precios ---------------- */
function areaIn2(p, v) {
  const [W, H, G = 0] = v.med;
  if (p.calculo === 'plana') return (W + 1) * (2 * H + 2);
  if (p.calculo === 'fuelle') return (W + G + 1) * (2 * H + G + 2);
  if (p.calculo === 'gabacha') return (W + 1) * (2 * H + 2) * 1.3;
  return 0;
}
function minutosDe(p, area) {
  return typeof p.minutos === 'number' ? p.minutos : p.minutos.base + p.minutos.porIn2 * area;
}
function costoBase(p, v, opc = {}) {
  if (!p.calculo) return null;
  const t = tela(opc.tela);
  const asasTela = p.cierre === 'cinta' && opc.asas === 'tela';
  let area = areaIn2(p, v);
  let minutos = minutosDe(p, area);
  if (asasTela) { area += CONFIG.asasTela.areaIn2; minutos += CONFIG.asasTela.minutos; }
  const yardas = area / (t.anchoIn * 36 * CONFIG.eficienciaCorte);
  let materiales = yardas * t.precioYd + Math.max(0.40, CONFIG.hiloAvios * Math.min(1, area / 450));
  if (p.cierre === 'cinta' && !asasTela) materiales += CONFIG.cinta.pulgadas / 36 * CONFIG.cinta.precioYd;
  if (p.cierre === 'pita') {
    const n = opc.pitas || (p.pitas || [1])[0];
    materiales += n * (2 * v.med[0] + CONFIG.pita.extraIn) / 36 * CONFIG.pita.precioYd;
    minutos += n * 2;
  }
  return materiales + minutos / 60 * CONFIG.manoObraHora;
}
function piezasPorPliego(w, h) {
  const g = CONFIG.dtf.separacion, A = CONFIG.dtf.ancho, L = CONFIG.dtf.largo;
  if (!(w > 0 && h > 0)) return { n: 0 };
  const a = Math.floor((A + g) / (w + g)) * Math.floor((L + g) / (h + g));
  const b = Math.floor((A + g) / (h + g)) * Math.floor((L + g) / (w + g));
  return a >= b ? { n: a, w, h } : { n: b, w: h, h: w };
}
function costoCara(cara, cant) {
  if (!cara || cara.tec === 'ninguna') return 0;
  if (cara.tec === 'serigrafia') return CONFIG.serigrafia[cara.colores] || 0;
  const { n } = piezasPorPliego(cara.w, cara.h);
  if (!n) return 0;
  const pliegos = Math.ceil(cant / n);                       // se compran pliegos completos
  return pliegos * CONFIG.dtf.precioMetro / cant + CONFIG.dtf.minutosAplicacion / 60 * CONFIG.manoObraHora;
}
function cotizar(sel) {
  const r = buscarCodigo(sel.cod);
  const cant = Math.max(1, Math.floor(sel.cant || 1));
  const esc = escala(cant), f = factor(esc);
  const cb = costoBase(r.p, r.v, sel);
  const base = cb === null ? (r.v.precioManual ?? r.p.precioManual ?? null) : redondear(cb * f);
  const fr = redondear(costoCara(sel.frente, cant) * f);
  const re = redondear(costoCara(sel.reverso, cant) * f);
  const unit = base === null ? null : base + fr + re;
  return { ...r, cant, esc, base, fr, re, unit, subtotal: unit === null ? null : unit * cant };
}
const precioCaraRef = cara => redondear(costoCara(cara, 50) * factor(CONFIG.escalas[0]));
function desde(p, v) {
  const r = cotizar({ cod: v.cod, tela: 'z37', asas: 'cinta', cant: 50, frente: { tec: 'ninguna' }, reverso: { tec: 'ninguna' } });
  return r.base;
}
const arteMax = v => [Math.floor(cm(v.med[0]) * 0.85), Math.floor(cm(v.med[1]) * 0.85)];
const waLink = texto => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`;

/* ---------------- Íconos de producto ----------------
   Cada ícono se dibuja con la proporción real de la medida elegida (ancho × alto en pulgadas),
   así una T-REG-005 (18 × 20") se ve distinta a una T-REG-003 (19 × 15"). */
const S = 'stroke="#1E2D3A" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"';
const ASA = 'stroke="#1E2D3A" stroke-width="5" stroke-linecap="round" fill="none"';
const BL = '#FFFDFB', CORAL = '#E89777', SALVIA = '#95ADA8', ARENA = '#E4C7BA';
const r1 = n => Math.round(n * 10) / 10;
let RELLENO = BL, CUERPO = null;               // color de la tela y caja del cuerpo del último ícono dibujado
/* Caja del cuerpo: ajusta ancho × alto dentro del espacio disponible, apoyada en la base */
function caja(W, H, maxW = 112, maxH = 116, base = 172) {
  const s = Math.min(maxW / W, maxH / H), w = r1(W * s), h = r1(H * s);
  return (CUERPO = { x: r1(80 - w / 2), y: r1(base - h), w, h, s, cx: 80 });
}
const asasDe = (b, alto = Math.min(b.h * 0.5, 50)) => {
  const x1 = r1(b.x + b.w * 0.3), x2 = r1(b.x + b.w * 0.7);
  return `<path d="M${x1} ${b.y} C${x1} ${r1(b.y - alto)},${x2} ${r1(b.y - alto)},${x2} ${b.y}" ${ASA}/>`;
};
const rect = (b, extra = '') => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="2" fill="${RELLENO}" ${S} ${extra}/>`;
const bolsillo = (b, wf = 0.36, hf = 0.26, yf = 0.52) =>
  `<rect x="${r1(b.cx - b.w * wf / 2)}" y="${r1(b.y + b.h * yf)}" width="${r1(b.w * wf)}" height="${r1(b.h * hf)}" fill="none" ${S}/>`;
/* Pita: canal arriba; 1 pita sale por un costado, doble pita por los dos */
function pitaSVG(b, n) {
  const yc = r1(b.y + Math.max(7, b.h * 0.13));
  const fruncido = Array.from({ length: 6 }, (_, i) => `q${r1(b.w / 12)} -5 ${r1(b.w / 6)} 0`).join(' ');
  const cordon = lado => {
    const x = lado < 0 ? b.x : b.x + b.w, dx = lado * 14;
    return `<path d="M${x} ${yc} q${dx} 2 ${dx * 0.7} 20 M${x} ${yc} q${dx * 1.3} 6 ${dx * 1.4} 24" stroke="${CORAL}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <circle cx="${r1(x + dx * 0.7)}" cy="${yc + 21}" r="2.6" fill="${CORAL}"/><circle cx="${r1(x + dx * 1.4)}" cy="${yc + 25}" r="2.6" fill="${CORAL}"/>`;
  };
  return `<path d="M${b.x} ${b.y} ${fruncido}" ${S} fill="none"/>
    <path d="M${b.x} ${yc} H${b.x + b.w}" ${S} stroke-dasharray="3 4"/>
    ${n === 2 ? cordon(-1) + cordon(1) : cordon(1)}`;
}
const DIBUJOS = {
  sinfuelle: (W, H) => { const b = caja(W, H); return asasDe(b) + rect(b); },
  mercado: (W, H, G = 3) => {
    const b = caja(W, H), g = r1(Math.min(G * b.s * 0.5, b.w * 0.16));
    return asasDe(b) + rect(b) + `<path d="M${b.x} ${b.y} h${g} V${r1(b.y + b.h - g)} H${r1(b.x + b.w - g)} V${b.y} h${g} V${r1(b.y + b.h)} H${b.x} Z" fill="${SALVIA}" ${S}/>`;
  },
  lateral: (W, H, G = 4, v) => {
    const b = caja(W, H, 100), g = r1(Math.min(G * b.s * 0.6, 24)), xr = r1(b.x + b.w);
    const tapa = v.nota === 'Con tapa' ? `<path d="M${b.x} ${b.y} H${xr} V${r1(b.y + b.h * 0.3)} Q${b.cx} ${r1(b.y + b.h * 0.42)} ${b.x} ${r1(b.y + b.h * 0.3)} Z" fill="${ARENA}" ${S}/>` : '';
    return `<path d="M${r1(xr + g / 2)} ${b.y - 3} C${r1(xr + g / 2)} ${r1(b.y - Math.min(b.h * 0.6, 54))},${r1(b.x + 4)} ${r1(b.y - Math.min(b.h * 0.6, 54))},${r1(b.x + 4)} ${b.y}" ${ASA}/>`
      + rect(b) + `<path d="M${xr} ${b.y} L${r1(xr + g)} ${b.y - 6} V${r1(b.y + b.h - 6)} L${xr} ${r1(b.y + b.h)} Z" fill="${ARENA}" ${S}/>` + tapa;
  },
  triangular: (W, H, G = 4) => {
    const b = caja(W, H), c = r1(Math.min(G * b.s * 0.45, b.w * 0.18)), yb = r1(b.y + b.h), xr = r1(b.x + b.w);
    return asasDe(b) + `<path d="M${b.x} ${b.y} H${xr} V${r1(yb - c)} L${r1(xr - c)} ${yb} H${r1(b.x + c)} L${b.x} ${r1(yb - c)} Z" fill="${RELLENO}" ${S}/>`
      + `<path d="M${b.x} ${r1(yb - c)} H${xr}" ${S} stroke-dasharray="4 4"/>`;
  },
  circular: (W, H, G, v) => {
    const b = caja(W, H, 108, 108);
    if (v.nota === 'Corazón') {
      const { x, y, w, h } = b;
      return asasDe(b, Math.min(h * 0.45, 46)) + `<path d="M${r1(x + w / 2)} ${r1(y + h)} C${r1(x + w * 0.1)} ${r1(y + h * 0.72)} ${x} ${r1(y + h * 0.45)} ${x} ${r1(y + h * 0.25)} C${x} ${r1(y + h * 0.05)} ${r1(x + w * 0.2)} ${y} ${r1(x + w * 0.3)} ${y} C${r1(x + w * 0.42)} ${y} ${r1(x + w / 2)} ${r1(y + h * 0.12)} ${r1(x + w / 2)} ${r1(y + h * 0.18)} C${r1(x + w / 2)} ${r1(y + h * 0.12)} ${r1(x + w * 0.58)} ${y} ${r1(x + w * 0.7)} ${y} C${r1(x + w * 0.8)} ${y} ${r1(x + w)} ${r1(y + h * 0.05)} ${r1(x + w)} ${r1(y + h * 0.25)} C${r1(x + w)} ${r1(y + h * 0.45)} ${r1(x + w * 0.9)} ${r1(y + h * 0.72)} ${r1(x + w / 2)} ${r1(y + h)} Z" fill="${RELLENO}" ${S}/>`
        + `<path d="M${r1(x + w * 0.2)} ${r1(y + h * 0.62)} Q${r1(x + w / 2)} ${r1(y + h * 0.5)} ${r1(x + w * 0.8)} ${r1(y + h * 0.62)}" ${S} fill="none"/>`;
    }
    const rr = r1(Math.min(b.w, b.h) / 2), cy = r1(b.y + b.h - rr);
    return asasDe({ ...b, y: r1(cy - rr * 0.8), w: rr * 2, x: r1(b.cx - rr) }, 40)
      + `<circle cx="${b.cx}" cy="${cy}" r="${rr}" fill="${RELLENO}" ${S}/>`
      + `<path d="M${r1(b.cx - rr * 0.86)} ${r1(cy + rr * 0.5)} Q${b.cx} ${r1(cy + rr * 0.15)} ${r1(b.cx + rr * 0.86)} ${r1(cy + rr * 0.5)}" ${S} fill="none"/>`;
  },
  corazon: (W, H, G, v) => DIBUJOS.circular(W, H, G, { ...v, nota: 'Corazón' }),
  gabacha: (W, H) => {
    const b = caja(W, H, 104, 96), st = r1(Math.min(b.h * 0.6, 58)), { x, y, w, h } = b;
    return `<path d="M${x} ${r1(y + h)} H${r1(x + w)} V${y} L${r1(x + w * 0.94)} ${r1(y - st)} H${r1(x + w * 0.74)} V${r1(y - st * 0.5)} Q${r1(x + w / 2)} ${r1(y + h * 0.15)} ${r1(x + w * 0.26)} ${r1(y - st * 0.5)} V${r1(y - st)} H${r1(x + w * 0.06)} L${x} ${y} Z" fill="${RELLENO}" ${S}/>`
      + bolsillo(b, 0.4, 0.3, 0.5);
  },
  costalito: (W, H, G, v, op) => { const b = caja(W, H, 100, 120); return rect(b) + pitaSVG(b, op.pitas || 2); },
  algodon: (W, H) => {
    const b = caja(W, H, 104, 100, 166);
    return rect(b) + `<path d="M${b.x} ${r1(b.y + b.h)} Q${b.cx} ${r1(b.y + b.h + 14)} ${r1(b.x + b.w)} ${r1(b.y + b.h)}" ${S} fill="${RELLENO}"/>` + pitaSVG(b, 1);
  },
  panera: (W, H) => {
    const b = caja(W, H, 108, 96), L = r1(Math.min(Math.max(b.w, b.h) * 0.9, 110)), ang = b.w > b.h ? -10 : -62, yp = r1(b.y - 22);
    const pan = `<g transform="rotate(${ang} ${b.cx} ${b.y})"><rect x="${r1(b.cx - L / 2)}" y="${yp}" width="${L}" height="24" rx="12" fill="${ARENA}" ${S}/>
      ${[-0.28, -0.08, 0.12, 0.32].map(f => `<path d="M${r1(b.cx + L * f - 5)} ${r1(yp + 17)} l10 -10" ${S}/>`).join('')}</g>`;
    return pan + rect(b) + pitaSVG(b, 1);
  },
  delantal: (W, H) => {
    const b = caja(W, H, 96, 112), { x, y, w, h } = b, bx = r1(w * 0.24), cint = r1(y + h * 0.4);
    return `<path d="M${r1(x + bx)} ${y} C${r1(x + bx)} ${r1(y - 34)},${r1(x + w - bx)} ${r1(y - 34)},${r1(x + w - bx)} ${y}" ${S} fill="none"/>`
      + `<path d="M${x} ${cint} l-16 18 M${r1(x + w)} ${cint} l16 18" ${S}/>`
      + `<path d="M${r1(x + bx)} ${y} H${r1(x + w - bx)} V${r1(y + h * 0.18)} Q${r1(x + w - bx)} ${r1(y + h * 0.36)} ${r1(x + w)} ${cint} V${r1(y + h - 6)} Q${r1(x + w)} ${r1(y + h)} ${r1(x + w - 6)} ${r1(y + h)} H${r1(x + 6)} Q${x} ${r1(y + h)} ${x} ${r1(y + h - 6)} V${cint} Q${r1(x + bx)} ${r1(y + h * 0.36)} ${r1(x + bx)} ${r1(y + h * 0.18)} Z" fill="${RELLENO}" ${S}/>`
      + bolsillo(b, 0.4, 0.2, 0.58);
  },
  mandil: (W, H) => {
    const b = caja(W, H, 112, 90, 160), { x, y, w, h } = b, f = r1(Math.max(6, h * 0.1)), pb = r1(y + h * 0.45), ph = r1(h * 0.3);
    return `<path d="M${x} ${r1(y + f / 2)} C${x - 10} ${r1(y + f / 2)},${x - 14} ${r1(y + 10)},${x - 16} ${r1(y + 26)} M${r1(x + w)} ${r1(y + f / 2)} C${r1(x + w + 10)} ${r1(y + f / 2)},${r1(x + w + 14)} ${r1(y + 10)},${r1(x + w + 16)} ${r1(y + 26)}" ${S} fill="none"/>`
      + `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${RELLENO}" ${S}/>`
      + `<rect x="${x}" y="${y}" width="${w}" height="${f}" fill="${SALVIA}" ${S}/>`
      + `<rect x="${r1(x + w * 0.08)}" y="${pb}" width="${r1(w * 0.84)}" height="${ph}" fill="none" ${S}/>`
      + [1, 2].map(i => `<path d="M${r1(x + w * 0.08 + w * 0.28 * i)} ${pb} v${ph}" ${S}/>`).join('');
  },
  vino: (W, H, G, v) => {
    const b = caja(W, H, 96, 112), n = Math.max(1, parseInt(v.nota) || 1), cols = Math.min(n, 2);
    const cuellos = Array.from({ length: cols }, (_, i) => {
      const cx = r1(b.x + b.w * (i + 0.5) / cols);
      return `<rect x="${r1(cx - 5)}" y="${r1(b.y - 24)}" width="10" height="28" rx="3" fill="#385568" ${S}/><rect x="${r1(cx - 6)}" y="${r1(b.y - 28)}" width="12" height="7" rx="2" fill="${CORAL}" ${S}/>`;
    }).join('');
    return cuellos + rect(b) + `<path d="M${r1(b.x + b.w * 0.2)} ${r1(b.y + 12)} H${r1(b.x + b.w * 0.8)}" ${S} stroke-dasharray="3 4"/>`
      + (n > 2 ? `<text x="${b.cx}" y="${r1(b.y + b.h * 0.62)}" text-anchor="middle" font-family="Jost, sans-serif" font-size="16" font-weight="600" fill="#385568">×${n}</text>` : '');
  },
  yoga: (W, H) => {
    const b = caja(W, H, 60, 130, 176), rx = r1(b.w * 0.4);
    return `<path d="M${b.x} ${r1(b.y + b.h * 0.12)} C${b.x - 40} ${r1(b.y + b.h * 0.35)},${b.x - 40} ${r1(b.y + b.h * 0.7)},${b.x} ${r1(b.y + b.h * 0.88)}" ${ASA}/>`
      + `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${rx}" fill="${RELLENO}" ${S}/>`
      + `<path d="M${b.x + 2} ${r1(b.y + rx)} H${r1(b.x + b.w - 2)}" ${S} stroke-dasharray="3 4"/>`;
  },
  cangurera: (W, H) => {
    const b = caja(W, H, 104, 70, 140), { x, y, w, h } = b, my = r1(y + h * 0.45);
    return `<path d="M8 ${my} H${x} M${r1(x + w)} ${my} H152" ${ASA}/>`
      + `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r1(Math.min(h * 0.35, 18))}" fill="${RELLENO}" ${S}/>`
      + `<path d="M${r1(x + 10)} ${r1(y + h * 0.22)} H${r1(x + w - 10)}" ${S} stroke-dasharray="2 3"/><path d="M${r1(x + w - 12)} ${r1(y + h * 0.22)} l6 10" ${S}/>`;
  },
  monedero: (W, H, G) => {
    const b = caja(W, H, 104, 96, 160), { x, y, w, h } = b, d = G ? r1(Math.min(G * b.s * 0.4, 20)) : 0;
    const fondo = d ? `<path d="M${x} ${y} l${d} ${-d} H${r1(x + w + d)} V${r1(y + h - d)} L${r1(x + w)} ${r1(y + h)} V${y} Z" fill="${ARENA}" ${S}/>` : '';
    return fondo + `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${RELLENO}" ${S}/>`
      + `<path d="M${x + 6} ${r1(y + 10)} H${r1(x + w - 6)}" ${S} stroke-dasharray="2 3"/><path d="M${r1(x + w - 10)} ${r1(y + 10)} l6 9" stroke="${CORAL}" stroke-width="3" stroke-linecap="round"/>`;
  }
};
/* p = producto, v = medida; op.pitas para costalitos */
function iconoInterno(p, v = p.variantes[0], op = {}) {
  const [W, H, G] = v.med, dib = DIBUJOS[p.ilus] || DIBUJOS.sinfuelle;
  RELLENO = op.relleno || BL;
  const svg = dib(W, H, G, v, op);
  RELLENO = BL;
  return { svg, cuerpo: CUERPO };
}
function iconoSVG(p, v = p.variantes[0], op = {}) {
  return `<svg viewBox="0 0 160 186" fill="none" role="img" aria-label="${p.nombre} ${medTexto(v.med)}">${iconoInterno(p, v, op).svg}</svg>`;
}

/* ---------------- Encabezado y pie ---------------- */
function renderEncabezado() {
  const actual = document.body.dataset.pagina;
  const links = [['index.html', 'Inicio', 'inicio'], ...CATEGORIAS.map(c => [c.pagina, c.corto, c.id]),
    ['personalizacion.html', 'Personalización', 'personalizacion'], ['proyectos.html', 'Proyectos', 'proyectos']];
  $('#encabezado').outerHTML = `<nav class="nav"><div class="wrap">
    <a href="index.html" class="logo" aria-label="mi eelo, inicio"><img src="assets/img/logo-sol.png" class="logo-sol" alt=""><img src="assets/img/logo-texto.png" class="logo-txt" alt="mi eelo"></a>
    <ul id="menu">${links.map(([h, t, id]) => `<li><a href="${h}" class="${id === actual ? 'activo' : ''}">${t}</a></li>`).join('')}</ul>
    <div class="nav-der">
      <a href="cotizador.html" class="btn btn-primary btn-sm ${actual === 'cotizador' ? 'activo' : ''}">Cotizar</a>
      <button class="hamburguesa" aria-label="Abrir menú" aria-expanded="false"><span></span><span></span><span></span></button>
    </div></div></nav>`;
  const b = $('.hamburguesa');
  b.addEventListener('click', () => { const o = $('#menu').classList.toggle('abierto'); b.setAttribute('aria-expanded', o); });
}
function renderPie() {
  $('#pie').outerHTML = `<footer><div class="wrap">
    <div><h3>¿Lista su idea?</h3>
      <p class="muted" style="max-width:380px">Escríbanos con su arte y la cantidad que necesita. Le respondemos con su cotización.</p>
      <div class="botonera" style="margin-top:20px"><a href="cotizador.html" class="btn btn-primary">Cotizar ahora</a>
      <a href="${waLink('Hola mi eelo, quisiera información sobre productos personalizados.')}" target="_blank" rel="noopener" class="btn btn-ghost">WhatsApp</a></div></div>
    <div><div class="eyebrow">Catálogo</div>${CATEGORIAS.map(c => `<a href="${c.pagina}">${c.nombre}</a>`).join('')}<a href="personalizacion.html">Telas y personalización</a><a href="proyectos.html">Proyectos</a></div>
    <div><div class="eyebrow">Contacto</div>
      <a href="https://wa.me/${CONFIG.whatsapp}" target="_blank" rel="noopener">WhatsApp ${CONFIG.whatsappTexto}</a>
      <a href="mailto:${CONFIG.correo}">${CONFIG.correo}</a>
      <a href="${CONFIG.instagram}" target="_blank" rel="noopener">Instagram @mi.eelo</a>
      <a href="${CONFIG.tienda}" target="_blank" rel="noopener">Tienda mi-eelo.com</a></div>
    <div class="creditos"><span>mi eelo · Un programa de Creamos Guatemala</span><span>Hecho con ganas</span></div>
  </div></footer>`;
}

/* ---------------- Tarjetas de producto ---------------- */
function imgConRespaldo(src, p, clase = '') {
  return `<img src="${src}" alt="${p.nombre}" loading="lazy" class="${clase}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ilus-respaldo',innerHTML:iconoSVG(producto('${p.id}'))}))">`;
}
const conFotos = p => CONFIG.usarFotos && p.imgs && p.imgs.length;
/* Ícono a la medida, o foto si se activan las fotos en datos.js */
function vistaProducto(p, v, op) {
  return conFotos(p) ? imgConRespaldo(p.imgs[0], p) : `<div class="ilus-respaldo" data-ilus>${iconoSVG(p, v, op)}</div>`;
}
function tarjetaProducto(p) {
  const v0 = p.variantes[0];
  return `<article class="producto" data-prod="${p.id}">
    <div class="foto">${vistaProducto(p, v0)}
      ${conFotos(p) && p.imgs.length > 1 ? `<div class="miniaturas">${p.imgs.map((s, i) => `<button type="button" data-img="${s}" class="${i ? '' : 'on'}" aria-label="Foto ${i + 1}"></button>`).join('')}</div>` : ''}
      <span class="badge-cod" data-cod>${v0.cod}</span></div>
    <div class="cuerpo">
      <div class="rasgo">${p.rasgo}</div>
      <h3>${p.nombre}</h3>
      <p>${p.desc}</p>
      <div class="lbl">Medidas · ${p.variantes.length} ${p.variantes.length > 1 ? 'opciones' : 'opción'}</div>
      <div class="variantes">${p.variantes.map((v, i) => `<button type="button" data-v="${v.cod}" class="${i ? '' : 'on'}">
        <b>${v.provisional ? 'NUEVA' : v.cod.split('-').pop()}</b><span>${medTexto(v.med)}</span></button>`).join('')}</div>
      <div class="ficha" data-ficha></div>
      <div class="pie-prod">
        <div class="desde" data-desde></div>
        <div class="botonera">
          <a class="btn btn-primary btn-sm" data-cotizar>Personalizar y cotizar</a>
          <a class="btn btn-ghost btn-sm" data-wa target="_blank" rel="noopener">WhatsApp</a>
        </div>
      </div>
    </div></article>`;
}
function activarTarjeta(el) {
  const p = producto(el.dataset.prod);
  const pintar = cod => {
    const v = p.variantes.find(x => x.cod === cod);
    $('[data-cod]', el).textContent = v.cod;
    const ic = $('[data-ilus]', el); if (ic) ic.innerHTML = iconoSVG(p, v);
    $('[data-ficha]', el).innerHTML = `<span><b>${v.cod}</b></span><span>${medTexto(v.med)}</span><span>${medCm(v.med)}</span>${v.nota ? `<span>${v.nota}</span>` : ''}${v.provisional ? '<span>Código provisional</span>' : ''}`;
    const d = desde(p, v);
    $('[data-desde]', el).innerHTML = d === null ? `<b>A cotizar</b>según tela y cantidad` : `Desde<b>${q(d)}</b>c/u sin estampado`;
    $('[data-cotizar]', el).href = `cotizador.html?cod=${encodeURIComponent(v.cod)}`;
    $('[data-wa]', el).href = waLink(`Hola mi eelo, me interesa el producto ${v.cod} (${p.nombre}, ${medTexto(v.med)}). ¿Me pueden cotizar?`);
    $$('.variantes button', el).forEach(b => b.classList.toggle('on', b.dataset.v === cod));
  };
  $$('.variantes button', el).forEach(b => b.addEventListener('click', () => pintar(b.dataset.v)));
  $$('.miniaturas button', el).forEach(b => b.addEventListener('click', () => {
    const img = $('.foto img', el); if (img) img.src = b.dataset.img;
    $$('.miniaturas button', el).forEach(x => x.classList.toggle('on', x === b));
  }));
  pintar(p.variantes[0].cod);
}
function renderCatalogo(catId) {
  const prods = PRODUCTOS.filter(p => p.cat === catId);
  const cont = $('#catalogo');
  const filtros = prods.length > 1 ? `<div class="filtros" role="tablist">
      <button type="button" class="on" data-f="todos">Todos <small>${prods.reduce((n, p) => n + p.variantes.length, 0)}</small></button>
      ${prods.map(p => `<button type="button" data-f="${p.id}">${p.nombre} <small>${p.variantes.length}</small></button>`).join('')}</div>` : '';
  cont.innerHTML = filtros + `<div class="grid-productos">${prods.map(tarjetaProducto).join('')}</div>`;
  $$('.producto', cont).forEach(activarTarjeta);
  $$('.filtros button', cont).forEach(b => b.addEventListener('click', () => {
    $$('.filtros button', cont).forEach(x => x.classList.toggle('on', x === b));
    $$('.producto', cont).forEach(el => el.classList.toggle('oculto', b.dataset.f !== 'todos' && el.dataset.prod !== b.dataset.f));
  }));
  const otras = CATEGORIAS.filter(c => c.id !== catId);
  const sig = $('#otrasCategorias');
  if (sig) sig.innerHTML = otras.map(c => `<a class="cat-mini" href="${c.pagina}" style="--c:${c.color}"><b>${c.nombre}</b><span>${c.desc}</span><i>Ver →</i></a>`).join('');
}

/* ---------------- Página: inicio ---------------- */
function paginaInicio() {
  $('#gridCategorias').innerHTML = CATEGORIAS.map(c => {
    const prods = PRODUCTOS.filter(p => p.cat === c.id);
    const n = prods.reduce((s, p) => s + p.variantes.length, 0);
    const p0 = prods[0];
    return `<a class="cat" href="${c.pagina}" style="--c:${c.color}">
      <div class="cat-foto">${vistaProducto(p0, p0.variantes[0])}</div>
      <div class="cat-txt"><h3>${c.nombre}</h3><p>${c.desc}</p>
      <div class="cat-pie"><span>${prods.length} productos · ${n} medidas</span><i>Ver catálogo →</i></div></div></a>`;
  }).join('');
  $('#atajosTotes').innerHTML = PRODUCTOS.filter(p => p.cat === 'totes').map(p =>
    `<a class="atajo" href="totes.html#${p.id}">${iconoSVG(p)}<b>${p.nombre}</b><span>${p.variantes.length} medidas</span></a>`).join('');
}

/* ---------------- Página: personalización ---------------- */
const puntos = n => `<span class="puntos">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
function paginaPersonalizacion() {
  $('#gridTelas').innerHTML = TELAS.map(t => `<div class="tela">
    <div class="muestra" style="background-color:${t.color}"></div>
    <div class="fam">${t.fam}</div><h3>${t.nombre}</h3><p>${t.desc}</p>
    <div class="medidor"><span>Estructura</span>${puntos(t.estructura)}<span>Detalle de estampado</span>${puntos(t.detalle)}</div>
    <div class="aptitud"><span>Serigrafía</span><span>${t.dtf}</span></div>
    <a class="btn btn-ghost btn-sm" href="cotizador.html?tela=${t.id}">Cotizar con ${t.nombre}</a></div>`).join('');
  $('#tablaSerigrafia').innerHTML = '<tr><th>Colores</th><th>Por cara</th></tr>' +
    [1, 2, 3].map(c => `<tr><td>${c} color${c > 1 ? 'es' : ''}</td><td>${q(precioCaraRef({ tec: 'serigrafia', colores: c }))}</td></tr>`).join('');
  $('#tablaDTF').innerHTML = '<tr><th>Tamaño de arte</th><th>Por cara</th></tr>' +
    ARTES.map(a => `<tr><td>${a.label} · ${a.w} × ${a.h} cm</td><td>${q(precioCaraRef({ tec: 'dtf', w: a.w, h: a.h }))}</td></tr>`).join('');
  // simulador
  $('#simCtrl').innerHTML = ARTES.map(a => `<button type="button" data-w="${a.w}" data-h="${a.h}">${a.label} ${a.w}×${a.h}</button>`).join('');
  const simular = () => {
    const w = Math.min(60, Math.max(0, +$('#simW').value)), h = Math.min(100, Math.max(0, +$('#simH').value));
    const r = piezasPorPliego(w, h);
    $('#simN').textContent = r.n || '—';
    $('#simP').textContent = r.n ? q(precioCaraRef({ tec: 'dtf', w, h })) : '—';
    $$('#simCtrl button').forEach(b => b.classList.toggle('on', +b.dataset.w === w && +b.dataset.h === h));
    let rects = '';
    if (r.n) {
      const g = CONFIG.dtf.separacion, cols = Math.floor((CONFIG.dtf.ancho + g) / (r.w + g)), filas = Math.floor((CONFIG.dtf.largo + g) / (r.h + g));
      for (let i = 0; i < filas; i++) for (let j = 0; j < cols; j++)
        rects += `<rect x="${j * (r.w + g)}" y="${i * (r.h + g)}" width="${r.w}" height="${r.h}" rx=".8" fill="#E89777"/>`;
    }
    $('#metroSvg').innerHTML = `<rect width="60" height="100" fill="#F8F3F0"/>${rects}`;
  };
  $$('#simCtrl button').forEach(b => b.addEventListener('click', () => { $('#simW').value = b.dataset.w; $('#simH').value = b.dataset.h; simular(); }));
  ['#simW', '#simH'].forEach(s => $(s).addEventListener('input', simular));
  simular();
  // escalas
  const ej = { cod: 'T-REG-001', tela: 'oxford', asas: 'cinta', frente: { tec: 'dtf', w: 20, h: 20 }, reverso: { tec: 'ninguna' } };
  const refs = [50, 100, 250, 500], base = cotizar({ ...ej, cant: 50 }).unit;
  $('#gridEscalas').innerHTML = CONFIG.escalas.map((e, i) => {
    const u = cotizar({ ...ej, cant: refs[i] }).unit;
    return `<div class="escala ${i === CONFIG.escalas.length - 1 ? 'dest' : ''}"><div class="rango">${e.label}</div><div class="uds">unidades</div>
      <div class="px">${q(u)}</div><div class="ahorro">${i ? Math.round((1 - u / base) * 100) + '% menos por unidad' : ''}</div></div>`;
  }).join('');
}

/* ---------------- Página: cotizador ---------------- */
const estado = { cat: 'totes', cod: 'T-REG-001', tela: 'oxford', asas: 'cinta', pitas: 2,
  frente: { tec: 'dtf', colores: 1, arte: 'logo', w: 20, h: 20, pos: 'centro' }, reverso: { tec: 'ninguna', colores: 1, arte: 'logo', w: 20, h: 20, pos: 'centro' }, cant: 100,
  logo: { frente: null, reverso: null, nombreF: '', nombreR: '', ratioF: 1, ratioR: 1 }, logoReverso: 'no' };

/* Logo del cliente: se recortan los bordes transparentes y se guarda su proporción (alto / ancho) */
const logoDe = id => id === 'reverso' && estado.logoReverso === 'otro'
  ? { src: estado.logo.reverso, ratio: estado.logo.reverso ? estado.logo.ratioR : 1 }
  : { src: estado.logo.frente, ratio: estado.logo.frente ? estado.logo.ratioF : 1 };
const MIN_LOGO = 3;                                              // cm de ancho mínimo
function limitesLogo(id) {
  const [mw, mh] = arteMax(buscarCodigo(estado.cod).v), r = logoDe(id).ratio || 1;
  return { max: Math.max(MIN_LOGO, Math.floor(Math.min(mw, mh / r) * 2) / 2), r };
}
function ajustarLogo(id, w, elegido = true) {
  const c = estado[id], { max, r } = limitesLogo(id);
  if (elegido) c.pref = w;                                       // tamaño que eligió el cliente; se recupera si la medida lo permite
  c.w = Math.min(max, Math.max(MIN_LOGO, Math.round(w * 2) / 2));
  c.h = Math.round(c.w * r * 10) / 10;
}
function normalizarLogos() {
  ['frente', 'reverso'].forEach(id => {
    const c = estado[id];
    if (c.arte === 'logo') ajustarLogo(id, c.pref ?? c.w, false); // siempre dentro del área de la medida elegida
  });
}
function recortarLogo(dataUrl, listo) {
  const img = new Image();
  img.onload = () => {
    const w0 = img.naturalWidth || 600, h0 = img.naturalHeight || 600, k = Math.min(1, 1200 / Math.max(w0, h0));
    const w = Math.round(w0 * k), h = Math.round(h0 * k);
    const cv = Object.assign(document.createElement('canvas'), { width: w, height: h }), cx = cv.getContext('2d');
    cx.drawImage(img, 0, 0, w, h);
    let d; try { d = cx.getImageData(0, 0, w, h).data; } catch (e) { return listo(dataUrl, h / w); }
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return listo(dataUrl, h / w);
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    const c2 = Object.assign(document.createElement('canvas'), { width: cw, height: ch });
    c2.getContext('2d').drawImage(cv, x0, y0, cw, ch, 0, 0, cw, ch);
    listo(c2.toDataURL('image/png'), ch / cw);
  };
  img.onerror = () => listo(dataUrl, 1);
  img.src = dataUrl;
}

function botones(items, activo, attr) {
  return items.map(([val, html]) => `<button type="button" data-${attr}="${val}" class="${String(val) === String(activo) ? 'on' : ''}">${html}</button>`).join('');
}
function paginaCotizador() {
  const params = new URLSearchParams(location.search);
  const cod = params.get('cod');
  if (cod && buscarCodigo(cod)) { estado.cod = cod; estado.cat = buscarCodigo(cod).p.cat; }
  if (params.get('tela') && TELAS.some(t => t.id === params.get('tela'))) estado.tela = params.get('tela');
  $('#cotForm').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.cat) { estado.cat = d.cat; estado.cod = PRODUCTOS.find(p => p.cat === d.cat).variantes[0].cod; }
    if (d.prod) estado.cod = producto(d.prod).variantes[0].cod;
    if (d.var) estado.cod = d.var;
    if (d.tela) estado.tela = d.tela;
    if (d.asas) estado.asas = d.asas;
    if (d.pitas) estado.pitas = +d.pitas;
    if (d.cara) {
      const c = estado[d.cara];
      if (d.tec) {
        if (d.cara === 'reverso') {                               // mantener sincronizado "¿Y el reverso?"
          if (d.tec === 'ninguna') estado.logoReverso = 'no';
          else if (estado.logoReverso === 'no') estado.logoReverso = 'mismo';
        }
        if (c.tec === 'ninguna' && d.tec !== 'ninguna' && logoDe(d.cara).src && c.arte !== 'custom') { c.arte = 'logo'; ajustarLogo(d.cara, Math.min(c.w, 20)); }
        c.tec = d.tec;
      }
      if (d.col) c.colores = +d.col;
      if (d.arte) { c.arte = d.arte; const a = ARTES.find(x => x.id === d.arte); if (a) { c.w = a.w; c.h = a.h; } }
      if (d.pos) c.pos = d.pos;
      if (d.tampre) ajustarLogo(d.cara, limitesLogo(d.cara).max * +d.tampre);
    }
    if (d.cant) estado.cant = +d.cant;
    if (d.logorev) {                                            // ¿qué va en el reverso?
      estado.logoReverso = d.logorev;
      const c = estado.reverso;
      if (d.logorev === 'no') c.tec = 'ninguna';
      else {
        if (c.tec === 'ninguna') c.tec = estado.frente.tec !== 'ninguna' ? estado.frente.tec : 'dtf';
        if (logoDe('reverso').src && c.arte !== 'custom') { c.arte = 'logo'; ajustarLogo('reverso', Math.min(estado.frente.w, 20)); }
      }
    }
    if (d.quitar) { estado.logo[d.quitar] = null; }
    renderCotizador();
  });
  $('#cotForm').addEventListener('change', e => {
    const t = e.target;
    if (t.type !== 'file' || !t.files[0]) return;
    const f = t.files[0], cara = t.dataset.logo;
    if (!/^image\//.test(f.type)) { alert('Suba una imagen PNG, JPG o SVG.'); return; }
    const lector = new FileReader();
    lector.onload = () => recortarLogo(lector.result, (src, ratio) => {
      estado.logo[cara] = src;
      estado.logo[cara === 'frente' ? 'nombreF' : 'nombreR'] = f.name;
      estado.logo[cara === 'frente' ? 'ratioF' : 'ratioR'] = ratio;
      if (estado[cara].tec === 'ninguna') estado[cara].tec = 'dtf';
      ['frente', 'reverso'].forEach(id => {                       // las caras con estampado pasan a usar la forma del logo
        const c = estado[id];
        if (c.tec !== 'ninguna' && logoDe(id).src === src && c.arte !== 'logo') { c.arte = 'logo'; ajustarLogo(id, Math.min(c.w, 20)); }
      });
      renderCotizador();
      $('#vista').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    lector.readAsDataURL(f);
  });
  $('#cotForm').addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'fCant') estado.cant = Math.max(0, Math.floor(+t.value));
    if (t.dataset.medida) { const c = estado[t.dataset.cara]; c[t.dataset.medida] = +t.value; }
    if ('tamlogo' in t.dataset) ajustarLogo(t.dataset.cara, +t.value);
    renderResumen();
  });
  renderCotizador();
}
function caraBloque(id, titulo) {
  const c = estado[id], [mw, mh] = arteMax(buscarCodigo(estado.cod).v);
  return `<div class="cara-box"><div class="tit">${titulo}</div>
    <div class="seg">${botones([['ninguna', 'Sin estampado'], ['serigrafia', 'Serigrafía'], ['dtf', 'DTF']], c.tec, 'tec').replaceAll('data-tec', `data-cara="${id}" data-tec`)}</div>
    ${c.tec === 'serigrafia' ? `<div class="sub-lbl">Colores de tinta</div><div class="seg">${botones([[1, '1 color'], [2, '2 colores'], [3, '3 colores']], c.colores, 'col').replaceAll('data-col', `data-cara="${id}" data-col`)}</div>` : ''}
    ${c.tec !== 'ninguna' ? `<div class="sub-lbl">Tamaño del arte${c.tec === 'serigrafia' ? ' <span class="opc">(para la vista previa)</span>' : ''}</div><div class="seg">${botones([['logo', `${logoDe(id).src ? 'Mi logo' : 'Ajustable'}<small>tamaño a elegir</small>`], ...ARTES.filter(a => a.w <= mw && a.h <= mh).map(a => [a.id, `${a.label}<small>${a.w}×${a.h} cm</small>`]), ['custom', 'Otra medida']], c.arte, 'arte').replaceAll('data-arte', `data-cara="${id}" data-arte`)}</div>
      ${c.arte === 'custom' ? `<div class="fila"><label class="campo">Ancho (cm)<input type="number" min="2" max="60" value="${c.w}" data-cara="${id}" data-medida="w"></label>
        <label class="campo">Alto (cm)<input type="number" min="2" max="100" value="${c.h}" data-cara="${id}" data-medida="h"></label></div>` : ''}
      ${c.arte === 'logo' ? bloqueTamano(id) : ''}
      <div class="sub-lbl">Ubicación</div><div class="seg">${botones([['arriba', 'Arriba'], ['centro', 'Centro'], ['abajo', 'Abajo']], c.pos, 'pos').replaceAll('data-pos', `data-cara="${id}" data-pos`)}</div>` : ''}
  </div>`;
}
function bloqueTamano(id) {
  const c = estado[id], { max } = limitesLogo(id);
  return `<div class="tam-logo">
    <div class="tam-cab"><span>${logoDe(id).src ? 'Tamaño de su logo' : 'Tamaño del estampado'}</span><b data-tam="${id}"></b></div>
    <input type="range" min="${MIN_LOGO}" max="${max}" step="0.5" value="${c.w}" data-cara="${id}" data-tamlogo aria-label="Ancho del logo en centímetros">
    <div class="tam-esc"><span>${MIN_LOGO} cm</span><span>Máx. ${max} cm de ancho</span></div>
    <div class="seg seg-mini">${[['0.35', 'Pequeño'], ['0.6', 'Mediano'], ['1', 'Máximo']].map(([f, t]) => `<button type="button" data-cara="${id}" data-tampre="${f}">${t}</button>`).join('')}</div>
    <p class="tam-precio" data-ahorro="${id}"></p>
  </div>`;
}
/* Textos del tamaño y del ahorro: se actualizan en vivo al mover la barra */
function pintarTamanos(cant, f) {
  ['frente', 'reverso'].forEach(id => {
    const c = estado[id], et = $(`[data-tam="${id}"]`), ah = $(`[data-ahorro="${id}"]`);
    if (!et) return;
    et.textContent = `${c.w} × ${c.h} cm · ${pulg(+(c.w / 2.54).toFixed(1))} × ${pulg(+(c.h / 2.54).toFixed(1))}"`;
    if (!ah) return;
    if (c.tec !== 'dtf') { ah.innerHTML = 'En serigrafía el precio no cambia con el tamaño.'; return; }
    const { max, r } = limitesLogo(id);
    const ahora = redondear(costoCara(c, cant) * f);
    const caraMax = { ...c, w: max, h: Math.round(max * r * 10) / 10 };
    const tope = redondear(costoCara(caraMax, cant) * f);
    ah.innerHTML = `Estampado DTF: <b>${q(ahora)}</b> c/u` + (tope > ahora
      ? ` · al máximo (${caraMax.w} × ${caraMax.h} cm) costaría ${q(tope)}. <span class="ahorra">Ahorra ${q(tope - ahora)} c/u</span>` : '');
  });
}
function renderCotizador() {
  normalizarLogos();
  const { p, v } = buscarCodigo(estado.cod);
  const prods = PRODUCTOS.filter(x => x.cat === estado.cat);
  const opcTela = p.calculo || true;
  $('#cotForm').innerHTML = `
    <div class="grupo"><h4><span class="n">1</span>Producto</h4>
      <div class="seg seg-cat">${botones(CATEGORIAS.map(c => [c.id, c.corto]), estado.cat, 'cat')}</div>
      <div class="seg">${botones(prods.map(x => [x.id, x.nombre]), p.id, 'prod')}</div>
      <div class="sub-lbl">Medida</div>
      <div class="seg seg-var">${botones(p.variantes.map(x => [x.cod, `<b>${x.cod}</b><small>${medTexto(x.med)}${x.nota ? ' · ' + x.nota : ''}${x.provisional ? ' · nueva' : ''}</small>`]), v.cod, 'var')}</div>
    </div>
    <div class="grupo"><h4><span class="n">2</span>Tela${p.cierre === 'cinta' ? ' y asas' : p.cierre === 'pita' ? ' y cierre' : ''}</h4>
      ${opcTela ? `<div class="telas-sel">${TELAS.map(t => `<button type="button" data-tela="${t.id}" class="${t.id === estado.tela ? 'on' : ''}">
        <span class="sw" style="background:${t.color}"></span><b>${t.nombre}</b><small>${t.fam}</small>
        <span class="mini-med">Estructura ${puntos(t.estructura)}</span><span class="mini-med">Detalle ${puntos(t.detalle)}</span></button>`).join('')}</div>` : ''}
      <p class="ayuda">¿No sabe cuál elegir? <a href="personalizacion.html#telas">Vea la guía de telas</a>.</p>
      ${p.cierre === 'cinta' ? `<div class="sub-lbl">Asas</div><div class="seg">${botones([['cinta', 'Cinta'], ['tela', 'De la misma tela']], estado.asas, 'asas')}</div>` : ''}
      ${p.cierre === 'pita' && (p.pitas || []).length > 1 ? `<div class="sub-lbl">Cierre</div><div class="seg">${botones(p.pitas.map(n => [n, n === 2 ? 'Doble pita' : '1 pita']), estado.pitas, 'pitas')}</div>` : ''}
    </div>
    <div class="grupo"><h4><span class="n">3</span>Personalización</h4>
      <div class="subir">
        <div class="subir-tit"><b>Suba su logo</b><span>En PNG con fondo transparente. Lo medimos sin los bordes vacíos y puede elegir su tamaño: un logo más pequeño en DTF cuesta menos.</span></div>
        ${subirLogo('frente', estado.logo.frente, estado.logo.nombreF, 'Subir logo')}
        <div class="sub-lbl">¿Y el reverso?</div>
        <div class="seg seg-mini">${botones([['no', 'Solo al frente'], ['mismo', 'Mismo logo atrás'], ['otro', 'Otro logo atrás']], estado.logoReverso, 'logorev')}</div>
        ${estado.logoReverso === 'otro' ? subirLogo('reverso', estado.logo.reverso, estado.logo.nombreR, 'Subir logo del reverso') : ''}
      </div>
      ${caraBloque('frente', 'Frente')}${caraBloque('reverso', 'Reverso')}
      <p class="ayuda">¿Serigrafía o DTF? <a href="personalizacion.html#tecnicas">Compare las técnicas</a>.</p>
      <div class="subir">
        <div class="subir-tit"><b>Así queda su bolsa</b><span>Vista a escala real de la medida elegida.</span></div>
        <div class="vista" id="vista"></div>
        <p class="ayuda">Su imagen solo se usa para esta vista previa en su navegador; no se envía a ningún lado. Para cotizar, adjúntela en el WhatsApp o correo.</p>
      </div>
    </div>
    <div class="grupo"><h4><span class="n">4</span>Cantidad</h4>
      <div class="fila"><label class="campo">Unidades<input type="number" id="fCant" min="1" step="1" value="${estado.cant}"></label>
        <div class="seg seg-cant" style="align-self:end">${botones([[25, '25'], [50, '50'], [100, '100'], [250, '250'], [500, '500']], estado.cant, 'cant')}</div></div>
      <p class="ayuda">Pedido mínimo: ${CONFIG.pedidoMinimo} u. · El precio baja desde 51 unidades.</p>
    </div>`;
  if (p.cierre === 'pita' && !(p.pitas || []).includes(estado.pitas)) estado.pitas = (p.pitas || [1])[0];
  renderResumen();
}
function subirLogo(cara, data, nombre, texto) {
  return `<div class="subir-fila">
    <label class="btn btn-primary btn-sm subir-btn"><input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" data-logo="${cara}">${data ? 'Cambiar' : texto}</label>
    ${data ? `<span class="subir-ok"><img src="${data}" alt="">${nombre || 'logo'}</span><button type="button" class="quitar" data-quitar="${cara}" aria-label="Quitar logo">×</button>` : '<span class="ayuda">PNG, JPG o SVG</span>'}
  </div>`;
}

/* Vista previa a escala: el mismo ícono del producto, en el color de la tela, con el arte medido en cm */
function renderVista() {
  const caja = $('#vista'); if (!caja) return;
  const { p, v } = buscarCodigo(estado.cod);
  const [mw, mh] = arteMax(v);
  const { svg, cuerpo: b } = iconoInterno(p, v, { pitas: estado.pitas, relleno: tela(estado.tela).color });
  const k = b.s / 2.54, conPita = p.cierre === 'pita';               // px por cm
  const recorte = p.ilus === 'circular' ? `<circle cx="${b.cx}" cy="${r1(b.y + b.h - Math.min(b.w, b.h) / 2)}" r="${r1(Math.min(b.w, b.h) / 2)}"/>`
    : `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>`;
  const cara = (id, titulo) => {
    const c = estado[id], logo = logoDe(id).src;
    const fuera = c.tec !== 'ninguna' && (c.w > mw || c.h > mh);
    let arte = '';
    if (c.tec !== 'ninguna' && c.w > 0 && c.h > 0) {
      const aw = r1(c.w * k), ah = r1(c.h * k), x = r1(b.cx - aw / 2);
      const top = b.y + b.h * (conPita ? 0.22 : 0.1);
      const y = r1(c.pos === 'arriba' ? top : c.pos === 'abajo' ? b.y + b.h * 0.92 - ah : b.y + (b.h - ah) / 2 + (conPita ? b.h * 0.05 : 0));
      const col = fuera ? '#C0392B' : '#D2837A';
      arte = (logo ? `<image href="${logo}" x="${x}" y="${y}" width="${aw}" height="${ah}" preserveAspectRatio="xMidYMid meet"/>`
        : `<text x="${b.cx}" y="${r1(y + ah / 2)}" text-anchor="middle" dominant-baseline="middle" font-size="${r1(Math.max(6, Math.min(aw / 4.2, ah * 0.45)))}" fill="${col}" font-family="DM Sans, sans-serif">su logo</text>`)
        + `<rect x="${x}" y="${y}" width="${aw}" height="${ah}" fill="none" stroke="${col}" stroke-width="1.2" stroke-dasharray="4 3"/>`;
    }
    const pie = c.tec === 'ninguna' ? 'Sin estampado' : `Arte ${c.w} × ${c.h} cm · ${c.tec === 'dtf' ? 'DTF' : 'Serigrafía'}`;
    return `<figure class="vista-cara">
      <figcaption>${titulo}</figcaption>
      <svg viewBox="0 0 160 186" fill="none" role="img" aria-label="${titulo}: ${pie}">
        <defs><clipPath id="clip-${id}">${recorte}</clipPath></defs>
        ${svg}<g clip-path="url(#clip-${id})">${arte}</g>
      </svg>
      <div class="vista-med">${medCm(v.med.slice(0, 2))}</div>
      <div class="vista-pie ${fuera ? 'mal' : ''}">${pie}${fuera ? ` · excede el área (máx. ${mw} × ${mh} cm)` : ''}</div>
    </figure>`;
  };
  caja.innerHTML = cara('frente', 'Frente') + cara('reverso', 'Reverso');
}

function describirCara(c) {
  if (c.tec === 'serigrafia') return `serigrafía ${c.colores} color${c.colores > 1 ? 'es' : ''}, ${c.w} × ${c.h} cm`;
  if (c.tec === 'dtf') return `DTF ${c.w} × ${c.h} cm`;
  return 'sin estampado';
}
function renderResumen() {
  const r = cotizar(estado);
  const { p, v } = r, t = tela(estado.tela);
  const cierreTxt = p.cierre === 'cinta' ? (estado.asas === 'tela' ? 'asas de tela' : 'asas de cinta') : p.cierre === 'pita' ? (estado.pitas === 2 ? 'doble pita' : '1 pita') : '';
  $('#rCod').textContent = v.cod;
  $('#rUnit').innerHTML = r.unit === null ? 'A cotizar' : `${q(r.unit)} <small>c/u</small>`;
  $('#rConfig').textContent = [`${p.nombre} ${medTexto(v.med)} (${medCm(v.med)})`, t.nombre, cierreTxt, `${r.cant} unidades`].filter(Boolean).join(' · ');
  let d = '';
  if (r.unit !== null) {
    d += `<div><span>Pieza base</span><span>${q(r.base)}</span></div>`;
    if (r.fr) d += `<div><span>Frente · ${describirCara(estado.frente)}</span><span>${q(r.fr)}</span></div>`;
    if (r.re) d += `<div><span>Reverso · ${describirCara(estado.reverso)}</span><span>${q(r.re)}</span></div>`;
    d += `<div class="tot"><span>Subtotal (${r.cant} u.)</span><span>${q(r.subtotal)}</span></div>`;
    d += `<div><span>Envío</span><span>${q(CONFIG.envio)}</span></div>`;
    d += `<div class="tot"><span>Total estimado</span><span>${q(r.subtotal + CONFIG.envio)}</span></div>`;
  } else {
    d += `<p>Este producto se cotiza a la medida. Envíenos su configuración y le respondemos con el precio.</p>`;
    if (r.fr) d += `<div><span>Estampado frente</span><span>${q(r.fr)} c/u</span></div>`;
    if (r.re) d += `<div><span>Estampado reverso</span><span>${q(r.re)} c/u</span></div>`;
  }
  $('#rDesglose').innerHTML = d;
  pintarTamanos(r.cant, factor(r.esc));
  const idx = CONFIG.escalas.indexOf(r.esc), sig = CONFIG.escalas[idx + 1];
  if (r.unit === null) $('#rHint').classList.add('oculto');
  else {
    $('#rHint').classList.remove('oculto');
    const rs = sig ? cotizar({ ...estado, cant: sig.min }) : null;
    $('#rHint').innerHTML = rs && rs.unit < r.unit ? `Con <b>${sig.min} unidades</b> el precio baja a <b>${q(rs.unit)}</b> c/u.` : sig ? `Escala actual: ${r.esc.label} unidades.` : 'Está en nuestra mejor escala de precio.';
  }
  const av = [], [mw, mh] = arteMax(v);
  if (r.cant < CONFIG.pedidoMinimo) av.push(`El pedido mínimo es de ${CONFIG.pedidoMinimo} unidades.`);
  ['frente', 'reverso'].forEach(k => {
    const c = estado[k];
    if (c.tec !== 'ninguna' && (c.w > mw || c.h > mh)) av.push(`El arte del ${k} (${c.w} × ${c.h} cm) supera el área estampable de esta medida: máx. ${mw} × ${mh} cm.`);
    if (c.tec === 'dtf') {
      if (!piezasPorPliego(c.w, c.h).n) av.push(`Revise las medidas del arte del ${k}.`);
      if (estado.tela === 'z37') av.push('En Manta Esencial el DTF luce mejor con trazos gruesos. Para detalle fino recomendamos Oxford o Palacio.');
    }
  });
  if ([estado.frente, estado.reverso].some(c => c.tec === 'serigrafia')) av.push('Serigrafía: hasta 3 colores planos. Para degradados o más colores, use DTF.');
  $('#rAvisos').innerHTML = [...new Set(av)].map(a => `<div>${a}</div>`).join('');
  const precioTxt = r.unit === null ? 'Precio: a cotizar' : `Precio de referencia: ${q(r.unit)} c/u (${q(r.subtotal)} + envío)`;
  const texto = `Hola mi eelo, quiero cotizar:\n• ${v.cod} · ${p.nombre} ${medTexto(v.med)}\n• Tela: ${t.nombre}${cierreTxt ? ', ' + cierreTxt : ''}\n• Frente: ${describirCara(estado.frente)}\n• Reverso: ${describirCara(estado.reverso)}\n• Cantidad: ${r.cant} unidades\n${precioTxt}${estado.logo.frente ? '\n(Les comparto mi logo a continuación)' : ''}`;
  $('#btnWa').href = waLink(texto);
  $('#btnMail').href = `mailto:${CONFIG.correo}?subject=${encodeURIComponent('Cotización ' + v.cod)}&body=${encodeURIComponent(texto)}`;
  $('#rFoto').innerHTML = vistaProducto(p, v, { pitas: estado.pitas });
  renderVista();
}

/* ---------------- Página: proyectos ---------------- */
function paginaProyectos() {
  $('#galeria').innerHTML = PROYECTOS.map((src, i) => `<figure><img src="${src}" alt="Producción mi eelo ${i + 1}" loading="lazy" onerror="this.closest('figure').remove()"></figure>`).join('');
}

/* ---------------- Cargador ---------------- */
(function cargador() {
  const el = document.getElementById('cargador'); if (!el) return;
  const inicio = performance.now();
  const minimo = el.classList.contains('rapido') ? 250 : 1700;   // primera visita: animación completa
  let listo = false;
  const ocultar = () => {
    if (listo) return; listo = true;
    setTimeout(() => { el.classList.add('fuera'); setTimeout(() => el.remove(), 600); },
      Math.max(0, minimo - (performance.now() - inicio)));
  };
  window.addEventListener('load', ocultar);
  setTimeout(ocultar, 3500);                                      // por si alguna foto tarda
})();

/* ---------------- Arranque ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  renderEncabezado(); renderPie();
  const pag = document.body.dataset.pagina;
  if (pag === 'inicio') paginaInicio();
  if (CATEGORIAS.some(c => c.id === pag)) {
    renderCatalogo(pag);
    if (location.hash) { const el = $(`.filtros [data-f="${location.hash.slice(1)}"]`); if (el) el.click(); }
  }
  if (pag === 'personalizacion') paginaPersonalizacion();
  if (pag === 'cotizador') paginaCotizador();
  if (pag === 'proyectos') paginaProyectos();
});
