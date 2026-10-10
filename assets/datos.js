/* =========================================================
   mi eelo · DATOS DEL CATÁLOGO Y PRECIOS
   Todo lo editable vive en este archivo.
   Marcas: [CONFIRMAR] = estimación de referencia, validar con Fer / Flory / Bea.
   ========================================================= */

const CONFIG = {
  manoObraHora: 16.50,          // Nivel A, siempre
  margen: 0.20,                 // margen constante sobre costo de producción
  factorPublico: 1.00,          // >1 publica por encima del 30/30/20/20 (ancla de negociación)
  redondeo: 0.50,               // precios redondeados hacia arriba a Q0.50
  usarFotos: false,             // false = íconos a la medida; true = fotos de Framer (imgs de cada producto)
  eficienciaCorte: 0.85,        // aprovechamiento de tela [CONFIRMAR con Fer]
  hiloAvios: 1.50,              // hilo, etiqueta, avíos por pieza [CONFIRMAR]
  cinta: { precioYd: 1.00, pulgadas: 48 },               // asas de cinta de polipropileno (2 × 24")
  asasTela: { areaIn2: 200, minutos: 8 },                // asas de la misma tela [CONFIRMAR]
  pita: { precioYd: 0.75, extraIn: 10 },                 // cordón de cierre [CONFIRMAR con Bea]
  dtf: { precioMetro: 65, ancho: 60, largo: 100, separacion: 1, minutosAplicacion: 3 },
  serigrafia: { 1: 7.00, 2: 13.00, 3: 16.50 },           // por cara, por unidad
  escalas: [                                             // los costos fijos bajan con volumen
    { min: 1,   max: 50,       label: 'Hasta 50',  fijos: 0.20 },
    { min: 51,  max: 100,      label: '51 – 100',  fijos: 0.17 },
    { min: 101, max: 250,      label: '101 – 250', fijos: 0.14 },
    { min: 251, max: Infinity, label: '251 +',     fijos: 0.11 }
  ],
  pedidoMinimo: 25,             // [CONFIRMAR]
  envio: 100,                   // por envío
  whatsapp: '50237649769',
  whatsappTexto: '+502 3764 9769',
  correo: 'hola@mi-eelo.com',
  instagram: 'https://www.instagram.com/mi.eelo',
  tienda: 'https://mi-eelo.com'
};

/* Telas. estructura = cuerpo de la tela; detalle = definición del estampado (1–5) [VALIDAR con Fer] */
const TELAS = [
  { id:'z37',      nombre:'Manta Esencial', fam:'Manta cruda · liviana', interno:'Manta cruda Z37', precioYd:9.50,  anchoIn:34, estructura:1, detalle:2, color:'#EDE4D8',
    desc:'Ligera y de textura abierta. La opción más accesible para volumen.', dtf:'DTF trazo grueso' },
  { id:'z78',      nombre:'Manta Clásica',  fam:'Manta cruda',           interno:'Manta cruda Z78', precioYd:13.50, anchoIn:70, estructura:2, detalle:3, color:'#E7DCCD',
    desc:'Más cuerpo que la Esencial; buen balance entre precio y presencia.', dtf:'DTF' },
  { id:'oxford',   nombre:'Oxford',         fam:'Tejido cerrado',        interno:'Manta Oxford',    precioYd:13.00, anchoIn:66, estructura:3, detalle:5, color:'#F0EAE1',
    desc:'Superficie pareja que reproduce líneas finas y detalle de logo.', dtf:'DTF detalle fino' },
  { id:'z80',      nombre:'Palacio',        fam:'Manta cruda · gruesa',  interno:'Manta cruda Z80', precioYd:26.00, anchoIn:70, estructura:3, detalle:4, color:'#E3D5C2',
    desc:'Manta de mayor calidad, caída suave y acabado natural.', dtf:'DTF detalle fino' },
  { id:'stephany', nombre:'Lona',           fam:'Lona cruda',            interno:'Lona Stephany',   precioYd:21.78, anchoIn:59, estructura:4, detalle:4, color:'#DACBB5',
    desc:'Firme y resistente. La bolsa se sostiene sola.', dtf:'DTF' },
  { id:'lona',     nombre:'Lona Premium',   fam:'Lona cruda · pesada',   interno:'Lona cruda',      precioYd:29.50, anchoIn:64, estructura:5, detalle:4, color:'#D3C2A9',
    desc:'Nuestra lona de mayor peso, para piezas que tienen que durar años.', dtf:'DTF' }
];

/* Tamaños de arte DTF predefinidos (cm) */
const ARTES = [
  { id:'xs', label:'Mini',         w:5,  h:5 },
  { id:'s',  label:'Logo pequeño', w:10, h:10 },
  { id:'m',  label:'Mediano',      w:20, h:20 },
  { id:'l',  label:'Grande',       w:28, h:30 }
];

const CATEGORIAS = [
  { id:'totes',       nombre:'Tote bags',         corto:'Totes',       pagina:'totes.html',
    desc:'Siete construcciones, de la tote plana a la de mercado. Nuestro producto más pedido.', color:'#E89777' },
  { id:'empaque',     nombre:'Bolsas de empaque', corto:'Empaque',     pagina:'empaque.html',
    desc:'Costalitos de tela con pita, de 2.5" a 20". Para joyería, regalos y sets.', color:'#95ADA8' },
  { id:'restaurante', nombre:'Restaurante',       corto:'Restaurante', pagina:'restaurante.html',
    desc:'Gabachas, mandiles, bolsas de vino y paneras para su cocina y su mesa.', color:'#D5CAD8' },
  { id:'otros',       nombre:'Otros productos',   corto:'Otros',       pagina:'otros.html',
    desc:'Bolsas de yoga, cangureras, monederos, bolsas de algodón y cosmetiqueras.', color:'#E4C7BA' }
];

/* =========================================================
   PRODUCTOS (códigos y medidas del catálogo en Framer)
   med: [ancho, alto] o [ancho, alto, fuelle] en pulgadas.
   calculo: 'plana' | 'fuelle' | 'gabacha' | null (precio a cotizar)
   cierre: 'cinta' (asas) | 'pita' (cordón) | null
   minutos: corte + confección [CONFIRMAR con Fer]; número fijo o {base, porIn2}
   precioManual: precio base sin estampado para productos sin cálculo (opcional)
   ========================================================= */
const F = 'https://framerusercontent.com/images/';
const PRODUCTOS = [
  /* ---------- TOTES ---------- */
  { id:'sinfuelle', cat:'totes', nombre:'Sin fuelle', rasgo:'Plana, sin dimensión', ilus:'sinfuelle',
    desc:'La tote plana clásica. La más versátil para estampar en ambas caras.',
    calculo:'plana', cierre:'cinta', minutos:25, imgs:[F+'0r0PQXn5TN8Bv4qXKM2b1svMew.png', F+'Yj1EQdi7qDRWM36ovUHgh6l2co.png'],
    variantes:[ {cod:'T-REG-001', med:[15,15]}, {cod:'T-REG-002', med:[15,17]}, {cod:'T-REG-003', med:[19,15]},
                {cod:'T-REG-004', med:[16,18]}, {cod:'T-REG-005', med:[18,20]},
                {cod:'T-REG-13x15', med:[13,15], provisional:true} ] },
  { id:'mercado', cat:'totes', nombre:'Tipo mercado', rasgo:'Fuelle de 3 piezas', ilus:'mercado',
    desc:'Frente, reverso y una franja que forma base y costados. Hecha para cargar.',
    calculo:'fuelle', cierre:'cinta', minutos:38, imgs:[F+'MIzaddZr2i3dqlB2z8rtDNOGSs.png', F+'tE2vIL08i8PWSb7y1RLW32a4fY.png'],
    variantes:[ {cod:'T-FUE-001', med:[18,20,3]}, {cod:'T-FUE-002', med:[14,12,3]}, {cod:'T-FUE-003', med:[15,15,5]},
                {cod:'T-FUE-004', med:[15,18,5]}, {cod:'T-FUE-MARK', med:[15,15,5]}, {cod:'T-FUE-OVER', med:[15,16,10]} ] },
  { id:'lateral', cat:'totes', nombre:'Fuelle lateral', rasgo:'Tirantes adjuntos al fuelle', ilus:'lateral',
    desc:'Fuelle a los costados con los tirantes cosidos al fuelle. Más capacidad y caída estructurada.',
    calculo:'fuelle', cierre:'cinta', minutos:38, imgs:[F+'DoC0NwfAm8mDtxMEFboM7G0qgMs.png', F+'FJBmnO6HDHP3uGoEjk561yS6WEA.png', F+'L2K7b8comFjq85zYKeHhJwgUN0A.png'],
    variantes:[ {cod:'T-FUE-005', med:[18,18,4]}, {cod:'T-FUE-TAPA', med:[15,15,3], nota:'Con tapa'},
                {cod:'T-LAT-13x15x4', med:[13,15,4], provisional:true}, {cod:'T-LAT-15x15x4', med:[15,15,4], provisional:true} ] },
  { id:'triangular', cat:'totes', nombre:'Fuelle triangular', rasgo:'Fondo con fuelle triangular', ilus:'triangular',
    desc:'Fondo con fuelle triangular: gana volumen sin perder la silueta.',
    calculo:'fuelle', cierre:'cinta', minutos:30, imgs:[F+'cW23EIt1eDUXA9rZwu1bXPibAD8.png', F+'S0c1nJWzOu5M8toOCv84DoQkU0.png'],
    variantes:[ {cod:'T-FUE-006', med:[17,16,5]},
                {cod:'T-TRI-13x15x4', med:[13,15,4], provisional:true}, {cod:'T-TRI-15x15x4', med:[15,15,4], provisional:true} ] },
  { id:'circular', cat:'totes', nombre:'Circular', rasgo:'Bolsillos externos', ilus:'circular',
    desc:'Silueta redonda con bolsillos externos. Una pieza que no pasa desapercibida.',
    calculo:'fuelle', cierre:'cinta', minutos:42, imgs:[F+'jKFS5aZY9nZtA8gEZmfIi8unuIs.png'],
    variantes:[ {cod:'T-CIR-001', med:[15,15,1], nota:'Circular'} ] },
  { id:'corazon', cat:'totes', nombre:'Corazón', rasgo:'Bolsillos externos', ilus:'corazon',
    desc:'Silueta de corazón con bolsillos externos. Ideal para regalos y fechas especiales.',
    calculo:'fuelle', cierre:'cinta', minutos:42, imgs:[F+'HOchC3u6wi65nBpv6jXJ8AE0wQ.png'],
    variantes:[ {cod:'T-COR-001', med:[14,13,3], nota:'Corazón'}, {cod:'T-COR-002', med:[20,15,4], nota:'Corazón'} ] },
  { id:'gabachatote', cat:'totes', nombre:'Tipo gabacha', rasgo:'Tirantes sin costura · bolsillo exterior', ilus:'gabacha',
    desc:'Los tirantes nacen del mismo corte de la bolsa, sin costura de unión. Con bolsillo exterior.',
    calculo:'gabacha', cierre:null, minutos:32, imgs:[F+'1UpMcDwUE3g84d6P1qBkW01ZCdo.png', F+'4xglbae3YPGKxpkDv3iEYfCS60.png'],
    variantes:[ {cod:'T-UNI-001', med:[15,16]}, {cod:'T-UNI-002', med:[13,14]}, {cod:'T-UNI-003', med:[19,15]} ] },

  /* ---------- EMPAQUE ---------- */
  { id:'costalito', cat:'empaque', nombre:'Costalito', rasgo:'Bolsa de empaque con pita', ilus:'costalito',
    desc:'Bolsa de tela con cierre de pita. Doble pita o una pita, en 15 tamaños.',
    calculo:'plana', cierre:'pita', pitas:[2,1], minutos:{ base:6, porIn2:1/60 },
    imgs:[F+'1O8iAKrpT7GgQZcMqCQyWmUxxm4.png', F+'N4pCXOdiSLN9dfvVPH3DIjx7A.png'],
    variantes:[ {cod:'B-PACK-026', med:[2.5,3]}, {cod:'B-PACK-027', med:[3,4]}, {cod:'B-PACK-028', med:[3.5,4.5]},
                {cod:'B-PACK-029', med:[4,4]}, {cod:'B-PACK-030', med:[4,5.5]}, {cod:'B-PACK-031', med:[4,6]},
                {cod:'B-PACK-032', med:[5,7]}, {cod:'B-PACK-033', med:[6,6]}, {cod:'B-PACK-034', med:[6,8]},
                {cod:'B-PACK-035', med:[8,10]}, {cod:'B-PACK-036', med:[10,12]}, {cod:'B-PACK-037', med:[12,14]},
                {cod:'B-PACK-038', med:[14,16]}, {cod:'B-PACK-039', med:[16,18]}, {cod:'B-PACK-040', med:[20,20]} ] },

  /* ---------- RESTAURANTE ---------- */
  { id:'gabachas', cat:'restaurante', nombre:'Gabacha de cocina', rasgo:'Para su equipo de cocina y sala', ilus:'delantal',
    desc:'Gabachas personalizables con el logo de su restaurante.',
    calculo:null, imgs:[F+'wbBsz0kZSetVaF9CnrteI5p6c.png', F+'RNJlHLUt1KslBUJGDYMljQNYG9c.png', F+'npMLQ3L9w9b5ppclUsmsKLaL7E.png'],
    variantes:[ {cod:'GAB-001', med:[24.5,28.5]}, {cod:'GAB-002', med:[42,29.5]} ] },
  { id:'mandil', cat:'restaurante', nombre:'Mandil de cocina', rasgo:'Corto, a la cintura', ilus:'mandil',
    desc:'Mandil a la cintura para servicio y barra.',
    calculo:null, imgs:[F+'mlZiP8YVcohxgzscFa0l53bwLBk.png', F+'HzFIC2YxeAtp2gcK2RFg3gKbnI.png'],
    variantes:[ {cod:'MAN-001', med:[37.5,23.5]} ] },
  { id:'vino', cat:'restaurante', nombre:'Bolsa de vino', rasgo:'De 1 a 4 botellas', ilus:'vino',
    desc:'Para regalo o para llevar: una, dos, tres o cuatro botellas.',
    calculo:'fuelle', cierre:'cinta', minutos:30,
    imgs:[F+'W4HRVoGzNizyqUD3DSrG7OWCbTM.png', F+'E4zXfo0QRSm8nJBEl3NAKfmxVNs.png', F+'Y2JAlR2QHkOqHZzcb4f27W749Go.png'],
    variantes:[ {cod:'VINO-001', med:[5.5,13,3], nota:'1 botella'}, {cod:'VINO-004', med:[5.5,11.5], nota:'1 botella'},
                {cod:'VINO-002', med:[12,13,3], nota:'2 botellas'}, {cod:'VINO-005', med:[12,13.5,4], nota:'3 botellas'},
                {cod:'VINO-003', med:[7,10.5,7], nota:'4 botellas'} ] },
  { id:'panera', cat:'restaurante', nombre:'Panera', rasgo:'Bolsa para pan', ilus:'panera',
    desc:'Bolsa de tela para pan, para mesa o para llevar.',
    calculo:'plana', cierre:'pita', pitas:[1], minutos:18,
    imgs:[F+'uJ7ECNPAQoSd0L0QiFwysRehrpg.png', F+'bbwiLIpnuZXQxUEsphJD1j8oc8.png'],
    variantes:[ {cod:'T-PAN-001', med:[26.5,9.5]}, {cod:'T-PAN-002', med:[9,20]} ] },

  /* ---------- OTROS ---------- */
  { id:'algodon', cat:'otros', nombre:'Bolsa de algodón', rasgo:'Circular, con pita', ilus:'algodon',
    desc:'Bolsa de algodón de fondo circular con cierre de pita.',
    calculo:'plana', cierre:'pita', pitas:[1], minutos:{ base:10, porIn2:1/60 },
    imgs:[F+'lnOrxOshtwEj52Gja6eHuUC7Icw.png', F+'oU7YSXnvhlaFYPEfbRUrumu4.png'],
    variantes:[ {cod:'BOL-ALG-001', med:[8.5,4]}, {cod:'BOL-ALG-002', med:[15,8]}, {cod:'BOL-ALG-003', med:[25,9]} ] },
  { id:'yoga', cat:'otros', nombre:'Bolsa de yoga', rasgo:'Para mat', ilus:'yoga',
    desc:'Bolsa alargada para llevar el mat de yoga.',
    calculo:null, imgs:[F+'9YrVjgLHKvZluKKqiJQvIrB18E.png', F+'i0cFYVpLwCPkzrVsslNo5aM6rg.png'],
    variantes:[ {cod:'T-YOGA-001', med:[8,25,4.5]} ] },
  { id:'cangurera', cat:'otros', nombre:'Cangurera', rasgo:'Con zipper', ilus:'cangurera',
    desc:'Cangurera de tela con zipper.',
    calculo:null, imgs:[F+'SO6Xh9YbNxc5IJfNakyvSkheeTE.png', F+'RFdNEedHfY5BLRTfEXIPwW8Oec.png'],
    variantes:[ {cod:'F-PACK-001', med:[13,6]}, {cod:'F-PACK-002', med:[13.5,8.5]} ] },
  { id:'monedero', cat:'otros', nombre:'Monedero', rasgo:'Con zipper', ilus:'monedero',
    desc:'Monedero o neceser plano con zipper, en cuatro tamaños.',
    calculo:null, imgs:[F+'RPyGdFvSM1KnSMLyzFBYnuTuM.png', F+'wINRLpRtMonfXUzCXfx0BzOL1o.png'],
    variantes:[ {cod:'MON-ZIP-001', med:[8,6]}, {cod:'MON-ZIP-002', med:[4,6]}, {cod:'MON-ZIP-003', med:[10,12]}, {cod:'MON-ZIP-004', med:[4,4]} ] },
  { id:'cosmetiquera', cat:'otros', nombre:'Cosmetiquera', rasgo:'Con volumen', ilus:'monedero',
    desc:'Cosmetiquera con fuelle para viaje o kit de regalo.',
    calculo:null, imgs:[F+'DEE6jb5gGf7YN4S2mfvQizWQH8I.png', F+'n9euXRznJwvODEqL0HTDuKWhh4k.png'],
    variantes:[ {cod:'COS-001', med:[6.5,4.5,4]}, {cod:'COS-002', med:[7.5,3,1.5]} ] }
];

const PROYECTOS = ['4n7IvpULIsDktZJgkWeHhenf3M','GSLIg3imV1tX59mPdGQK6BPTu4','P6xNEYxWg1bwUgNtpFTPdogHUV8','uaXivsrBPccHDy0c85SjfdwB23w',
  '43iVE2RmRTwF1jStJQQVNfYONI','epj1OmsgD3qZ2oVLI647t3AtRbk','cBKZ3HMeepHFNEfIKcG7JmBr7k','rd9eU2LuEiKCBTWDfcX5P8Soc',
  'SpuDFQ1fdUAg2ax3HlF8TP94LoM','D1YPiiM1BTZ1fR1H53Ol4Rx4','9dhm0CQEqxqcACIQmDDu7NXpfk','kNY3qVCurT6mRLOVwAhNrDHG9Q'].map(id => F + id + '.png');
