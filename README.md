# Catálogo mi eelo

Sitio estático (HTML + CSS + JS, sin instalar nada) con el catálogo B2B de mi eelo y un cotizador en línea.

## Páginas
| Archivo | Contenido |
|---|---|
| `index.html` | Inicio: categorías, totes más pedidas, historia |
| `totes.html` | 7 modelos de tote con códigos T-REG, T-FUE, T-CIR, T-COR, T-UNI |
| `empaque.html` | Costalitos B-PACK-026 a 040 (doble pita / 1 pita) |
| `restaurante.html` | Gabachas, mandil, bolsas de vino, paneras |
| `otros.html` | Yoga, cangureras, monederos, bolsas de algodón, cosmetiqueras |
| `personalizacion.html` | Guía de telas, serigrafía vs DTF, simulador de pliego, escalas de volumen |
| `cotizador.html` | Cotizador. Acepta `?cod=T-REG-001` o `?tela=oxford` en el enlace |
| `proyectos.html` | Galería de producciones |

## Publicar en GitHub Pages
1. Crear un repositorio y subir **todo el contenido de esta carpeta** (incluida `assets/`).
2. En el repositorio: Settings → Pages → Source: rama `main`, carpeta `/ (root)`.
3. El sitio queda en `https://<usuario>.github.io/<repositorio>/`.

## Editar precios, productos y textos
Todo está en **`assets/datos.js`**:
- `CONFIG`: mano de obra, margen, DTF, serigrafía, escalas de volumen, pedido mínimo, envío, contacto.
- `factorPublico`: súbalo (ej. 1.10) para publicar precios por encima del piso 30/30/20/20.
- `TELAS`: precio por yarda, ancho y calificaciones.
- `PRODUCTOS`: códigos, medidas (pulgadas), fotos y minutos de confección.
  - `calculo: null` = "A cotizar". Para fijar un precio a mano agregue `precioManual: 45` al producto o a una medida.
- Los valores marcados `[CONFIRMAR]` son estimaciones: validar con Fer (consumo y tiempos), Flory (serigrafía) y Bea (insumos).

## Fotos
Las fotos se cargan desde Framer (`framerusercontent.com`). Si una falla, se muestra un dibujo del modelo.
Para no depender de Framer: descargue las fotos a una carpeta `img/` y cambie las rutas en `datos.js`.

## Tipografía
La marca usa Mission Gothic. Si tienen el archivo de la fuente, agréguenlo con `@font-face` al inicio de `assets/estilos.css`; mientras tanto se usa Jost.
