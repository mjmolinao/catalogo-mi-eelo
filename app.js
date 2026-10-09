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

/* ---------------- Ilustraciones de respaldo ---------------- */
const S = 'stroke="#1E2D3A" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"';
const ASA = 'stroke="#1E2D3A" stroke-width="5" stroke-linecap="round" fill="none"';
const ILUS = {
  sinfuelle: `<path d="M60 62 C60 18,100 18,100 62" ${ASA}/><rect x="34" y="60" width="92" height="108" rx="2" fill="#FFFDFB" ${S}/>`,
  triangular:`<path d="M60 62 C60 18,100 18,100 62" ${ASA}/><path d="M34 60 H126 V156 L114 168 H46 L34 156 Z" fill="#FFFDFB" ${S}/><path d="M34 156 H126" ${S} stroke-dasharray="4 4"/>`,
  lateral:   `<path d="M122 58 C122 6,42 6,40 62" ${ASA}/><rect x="30" y="62" width="86" height="106" rx="2" fill="#FFFDFB" ${S}/><path d="M116 62 L134 56 V160 L116 168 Z" fill="#D8C8BE" ${S}/>`,
  mercado:   `<path d="M60 62 C60 18,100 18,100 62" ${ASA}/><rect x="30" y="62" width="100" height="106" rx="2" fill="#FFFDFB" ${S}/><path d="M30 62 H42 V154 H118 V62 H130 V168 H30 Z" fill="#95ADA8" ${S}/>`,
  gabacha:   `<path d="M36 168 H124 V78 L118 26 H100 V50 Q80 76 60 50 V26 H42 L36 78 Z" fill="#FFFDFB" ${S}/><rect x="62" y="110" width="36" height="30" fill="none" ${S}/>`,
  circular:  `<path d="M60 70 C60 22,100 22,100 70" ${ASA}/><circle cx="80" cy="118" r="54" fill="#FFFDFB" ${S}/>`,
  costalito: `<path d="M48 70 Q80 58 112 70 L118 166 H42 Z" fill="#FFFDFB" ${S}/><path d="M50 76 Q80 66 110 76" ${S} fill="none" stroke-dasharray="3 4"/><path d="M80 66 q-14 -24 -22 -8 M80 66 q14 -24 22 -8" ${S} fill="none"/>`,
  delantal:  `<path d="M56 30 Q80 46 104 30" ${S} fill="none"/><path d="M58 32 V70 L40 82 V172 H120 V82 L102 70 V32" fill="#FFFDFB" ${S}/><path d="M40 84 L18 96 M120 84 L142 96" ${S}/><rect x="62" y="116" width="36" height="26" fill="none" ${S}/>`,
  mandil:    `<path d="M18 70 H142" ${S}/><path d="M34 70 H126 V150 Q80 162 34 150 Z" fill="#FFFDFB" ${S}/><path d="M80 70 V150" ${S} stroke-dasharray="4 4"/>`,
  vino:      `<path d="M68 52 C68 20,92 20,92 52" ${ASA}/><rect x="58" y="50" width="44" height="122" rx="2" fill="#FFFDFB" ${S}/><path d="M80 88 v-22 M74 120 h12" ${S}/>`,
  panera:    `<path d="M24 74 H136 V148 H24 Z" fill="#FFFDFB" ${S}/><path d="M24 74 Q16 60 28 54 M136 74 Q144 60 132 54" ${S} fill="none"/><path d="M40 100 q40 -20 80 0" ${S} fill="none"/>`,
  yoga:      `<rect x="62" y="20" width="36" height="150" rx="14" fill="#FFFDFB" ${S}/><path d="M64 34 C20 60,20 130,64 156" ${ASA}/>`,
  cangurera: `<path d="M10 92 H150" ${ASA}/><path d="M38 78 H122 Q132 78 132 92 V118 Q132 132 118 132 H42 Q28 132 28 118 V92 Q28 78 38 78 Z" fill="#FFFDFB" ${S}/><path d="M40 96 H120" ${S} stroke-dasharray="2 3"/>`,
  monedero:  `<rect x="34" y="72" width="92" height="72" rx="8" fill="#FFFDFB" ${S}/><path d="M38 84 H122" ${S} stroke-dasharray="2 3"/><path d="M122 84 l8 -6" ${S}/>`
};
const ilusSVG = id => `<svg viewBox="0 0 160 186" fill="none" aria-hidden="true">${ILUS[id] || ILUS.sinfuelle}</svg>`;

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
  return `<img src="${src}" alt="${p.nombre}" loading="lazy" class="${clase}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ilus-respaldo',innerHTML:ilusSVG('${p.ilus}')}))">`;
}
function tarjetaProducto(p) {
  const v0 = p.variantes[0];
  return `<article class="producto" data-prod="${p.id}">
    <div class="foto">${imgConRespaldo(p.imgs[0], p)}
      ${p.imgs.length > 1 ? `<div class="miniaturas">${p.imgs.map((s, i) => `<button type="button" data-img="${s}" class="${i ? '' : 'on'}" aria-label="Foto ${i + 1}"></button>`).join('')}</div>` : ''}
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
      <div class="cat-foto">${imgConRespaldo(p0.imgs[0], p0)}</div>
      <div class="cat-txt"><h3>${c.nombre}</h3><p>${c.desc}</p>
      <div class="cat-pie"><span>${prods.length} productos · ${n} medidas</span><i>Ver catálogo →</i></div></div></a>`;
  }).join('');
  $('#atajosTotes').innerHTML = PRODUCTOS.filter(p => p.cat === 'totes').map(p =>
    `<a class="atajo" href="totes.html#${p.id}">${ilusSVG(p.ilus)}<b>${p.nombre}</b><span>${p.variantes.length} medidas</span></a>`).join('');
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
  frente: { tec: 'dtf', colores: 1, arte: 'm', w: 20, h: 20, pos: 'centro' }, reverso: { tec: 'ninguna', colores: 1, arte: 'm', w: 20, h: 20, pos: 'centro' }, cant: 100,
  logo: { frente: null, reverso: null, nombreF: '', nombreR: '' }, logoReverso: 'mismo' };

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
      if (d.tec) c.tec = d.tec;
      if (d.col) c.colores = +d.col;
      if (d.arte) { c.arte = d.arte; const a = ARTES.find(x => x.id === d.arte); if (a) { c.w = a.w; c.h = a.h; } }
      if (d.pos) c.pos = d.pos;
    }
    if (d.cant) estado.cant = +d.cant;
    if (d.logorev) estado.logoReverso = d.logorev;
    if (d.quitar) { estado.logo[d.quitar] = null; }
    renderCotizador();
  });
  $('#cotForm').addEventListener('change', e => {
    const t = e.target;
    if (t.type !== 'file' || !t.files[0]) return;
    const f = t.files[0], cara = t.dataset.logo;
    if (!/^image\//.test(f.type)) { alert('Suba una imagen PNG, JPG o SVG.'); return; }
    const lector = new FileReader();
    lector.onload = () => {
      estado.logo[cara] = lector.result;
      estado.logo[cara === 'frente' ? 'nombreF' : 'nombreR'] = f.name;
      renderCotizador();
      $('#vista').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    lector.readAsDataURL(f);
  });
  $('#cotForm').addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'fCant') estado.cant = Math.max(0, Math.floor(+t.value));
    if (t.dataset.medida) { const c = estado[t.dataset.cara]; c[t.dataset.medida] = +t.value; }
    renderResumen();
  });
  renderCotizador();
}
function caraBloque(id, titulo) {
  const c = estado[id];
  return `<div class="cara-box"><div class="tit">${titulo}</div>
    <div class="seg">${botones([['ninguna', 'Sin estampado'], ['serigrafia', 'Serigrafía'], ['dtf', 'DTF']], c.tec, 'tec').replaceAll('data-tec', `data-cara="${id}" data-tec`)}</div>
    ${c.tec === 'serigrafia' ? `<div class="sub-lbl">Colores de tinta</div><div class="seg">${botones([[1, '1 color'], [2, '2 colores'], [3, '3 colores']], c.colores, 'col').replaceAll('data-col', `data-cara="${id}" data-col`)}</div>` : ''}
    ${c.tec !== 'ninguna' ? `<div class="sub-lbl">Tamaño del arte${c.tec === 'serigrafia' ? ' <span class="opc">(para la vista previa)</span>' : ''}</div><div class="seg">${botones([...ARTES.map(a => [a.id, `${a.label}<small>${a.w}×${a.h} cm</small>`]), ['custom', 'Otra medida']], c.arte, 'arte').replaceAll('data-arte', `data-cara="${id}" data-arte`)}</div>
      ${c.arte === 'custom' ? `<div class="fila"><label class="campo">Ancho (cm)<input type="number" min="2" max="60" value="${c.w}" data-cara="${id}" data-medida="w"></label>
        <label class="campo">Alto (cm)<input type="number" min="2" max="100" value="${c.h}" data-cara="${id}" data-medida="h"></label></div>` : ''}
      <div class="sub-lbl">Ubicación</div><div class="seg">${botones([['arriba', 'Arriba'], ['centro', 'Centro'], ['abajo', 'Abajo']], c.pos, 'pos').replaceAll('data-pos', `data-cara="${id}" data-pos`)}</div>` : ''}
  </div>`;
}
function renderCotizador() {
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
      ${caraBloque('frente', 'Frente')}${caraBloque('reverso', 'Reverso')}
      <p class="ayuda">¿Serigrafía o DTF? <a href="personalizacion.html#tecnicas">Compare las técnicas</a>.</p>
      <div class="subir">
        <div class="subir-tit"><b>Vea cómo queda su logo</b><span>Suba su logo en PNG (de preferencia con fondo transparente) y véalo a escala sobre la bolsa.</span></div>
        ${subirLogo('frente', estado.logo.frente, estado.logo.nombreF, 'Subir logo')}
        <div class="seg seg-mini">${botones([['mismo', 'Mismo logo en el reverso'], ['otro', 'Otro logo en el reverso']], estado.logoReverso, 'logorev')}</div>
        ${estado.logoReverso === 'otro' ? subirLogo('reverso', estado.logo.reverso, estado.logo.nombreR, 'Subir logo del reverso') : ''}
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

/* Vista previa a escala: panel frontal de la pieza en cm, con el arte y el logo del cliente */
function renderVista() {
  const caja = $('#vista'); if (!caja) return;
  const { p, v } = buscarCodigo(estado.cod);
  const t = tela(estado.tela);
  const W = cm(v.med[0]), H = cm(v.med[1]);
  const [mw, mh] = arteMax(v);
  const forma = v.nota === 'Circular' ? 'circulo' : v.nota === 'Corazón' ? 'corazon' : p.cierre === 'pita' ? 'pita' : p.calculo === 'gabacha' ? 'gabacha' : 'rect';
  const asas = p.cierre === 'cinta' || p.calculo === 'gabacha';
  const fs = Math.max(W, H) * 0.055;                      // tamaño de texto proporcional
  const mt = asas ? H * 0.42 : H * 0.12, mb = fs * 3.2, mx = W * 0.12;
  const vb = `${-mx} ${-mt} ${W + mx * 2} ${H + mt + mb}`;
  const panel = {
    rect: `<rect x="0" y="0" width="${W}" height="${H}" rx="${W * 0.01}"/>`,
    pita: `<rect x="0" y="0" width="${W}" height="${H}" rx="${W * 0.01}"/>`,
    gabacha: `<path d="M0 ${H} H${W} V${H * 0.06} L${W * 0.96} ${-H * 0.38} H${W * 0.72} V${-H * 0.1} Q${W / 2} ${H * 0.2} ${W * 0.28} ${-H * 0.1} V${-H * 0.38} H${W * 0.04} L0 ${H * 0.06} Z"/>`,
    circulo: `<ellipse cx="${W / 2}" cy="${H / 2}" rx="${W / 2}" ry="${H / 2}"/>`,
    corazon: `<path d="M${W / 2} ${H} C${W * 0.1} ${H * 0.72} 0 ${H * 0.45} 0 ${H * 0.25} C0 ${H * 0.05} ${W * 0.2} 0 ${W * 0.3} 0 C${W * 0.42} 0 ${W / 2} ${H * 0.12} ${W / 2} ${H * 0.18} C${W / 2} ${H * 0.12} ${W * 0.58} 0 ${W * 0.7} 0 C${W * 0.8} 0 ${W} ${H * 0.05} ${W} ${H * 0.25} C${W} ${H * 0.45} ${W * 0.9} ${H * 0.72} ${W / 2} ${H} Z"/>`
  }[forma];
  const sw = Math.max(W, H) * 0.008;
  const asaSVG = asas && forma !== 'gabacha'
    ? `<path d="M${W * 0.3} 0 C${W * 0.3} ${-H * 0.5}, ${W * 0.7} ${-H * 0.5}, ${W * 0.7} 0" fill="none" stroke="#1E2D3A" stroke-width="${W * 0.025}" stroke-linecap="round"/>` : '';
  const pitaSVG = forma === 'pita'
    ? `<path d="M0 ${H * 0.1} H${W}" stroke="#1E2D3A" stroke-width="${sw}" stroke-dasharray="${sw * 3} ${sw * 3}"/><path d="M${W * 0.5} ${H * 0.1} q${-W * 0.12} ${-H * 0.2} ${-W * 0.2} ${-H * 0.06} M${W * 0.5} ${H * 0.1} q${W * 0.12} ${-H * 0.2} ${W * 0.2} ${-H * 0.06}" fill="none" stroke="#1E2D3A" stroke-width="${sw * 1.4}"/>` : '';

  const cara = (id, titulo) => {
    const c = estado[id];
    const logo = id === 'reverso' && estado.logoReverso === 'otro' ? estado.logo.reverso : estado.logo.frente;
    let arte = '';
    if (c.tec !== 'ninguna' && c.w > 0 && c.h > 0) {
      const fuera = c.w > mw || c.h > mh;
      const x = (W - c.w) / 2;
      const top = forma === 'pita' ? H * 0.2 : H * 0.12;
      const y = c.pos === 'arriba' ? top : c.pos === 'abajo' ? H - c.h - H * 0.1 : (H - c.h) / 2 + (forma === 'pita' ? H * 0.05 : 0);
      const col = fuera ? '#C0392B' : '#D2837A';
      arte = `${logo ? `<image href="${logo}" x="${x}" y="${y}" width="${c.w}" height="${c.h}" preserveAspectRatio="xMidYMid meet"/>`
                     : `<text x="${W / 2}" y="${y + c.h / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${fs * 1.1}" fill="${col}" font-family="DM Sans, sans-serif">su logo</text>`}
        <rect x="${x}" y="${y}" width="${c.w}" height="${c.h}" fill="none" stroke="${col}" stroke-width="${sw * 0.8}" stroke-dasharray="${sw * 2.5} ${sw * 2}"/>`;
    }
    const pie = c.tec === 'ninguna' ? 'Sin estampado' : `Arte ${c.w} × ${c.h} cm · ${c.tec === 'dtf' ? 'DTF' : 'Serigrafía'}`;
    const fuera = c.tec !== 'ninguna' && (c.w > mw || c.h > mh);
    return `<figure class="vista-cara">
      <figcaption>${titulo}</figcaption>
      <svg viewBox="${vb}" role="img" aria-label="${titulo}: ${pie}">
        <defs><clipPath id="clip-${id}">${panel}</clipPath></defs>
        ${asaSVG}
        <g fill="${t.color}" stroke="#1E2D3A" stroke-width="${sw}">${panel}</g>
        ${pitaSVG}
        <g clip-path="url(#clip-${id})">${arte}</g>
        <text x="${W / 2}" y="${H + fs * 1.6}" text-anchor="middle" font-size="${fs}" fill="#385568" font-family="DM Sans, sans-serif">${W} × ${H} cm</text>
      </svg>
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
  $('#rFoto').innerHTML = imgConRespaldo(p.imgs[0], p);
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
