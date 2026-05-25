# BarberSync — Brand & Design System

Identidad visual y tokens de diseño. Estilo: **minimalista, negro, dorado antiguo y plateado.**

---

## 1. Esencia

**BarberSync** es una plataforma SaaS de turnos online para barberías modernas. Producto operativo de uso diario en mostrador.

**Adjetivos rectores**
1. **Minimal** — sin ornamentos, mucho aire, tipografía como protagonista.
2. **Premium** — dorado antiguo, plateado, negro puro. Lectura "joyería / cuero".
3. **Operativo** — densidad alta donde hace falta (admin), aire donde hace falta (público).

---

## 2. Identidad visual

### Isotipo
**Grilla 4×4 con una diagonal de 4 celdas alternando dorado y plateado**, los mismos colores del wordmark `BARBER`+`SYNC`.

**Lectura simbólica.** La grilla es la **agenda** (el producto es un sistema de turnos). La diagonal es la **sincronía** atravesándola — cliente y barbero confluyendo en un mismo turno. La alternancia gold/silver materializa esa dualidad y conecta literalmente con el wordmark.

**Por qué funciona.**
- Único y defensible: ningún competidor de barbería usa este símbolo.
- Declara el producto: lee como "sistema / agenda / turnos" antes que como local.
- Escala bien: la diagonal sigue siendo legible incluso a 16px (favicon).
- Conecta marca: los colores del isotipo son los colores del wordmark.

**Posición de las celdas activas** (col, row), top-right → bottom-left:
1. col 3, row 0 → **plata**
2. col 2, row 1 → **oro**
3. col 1, row 2 → **plata**
4. col 0, row 3 → **oro**

**Archivos.**
- Inline SVG (componente): `src/components/ui/Logo.tsx`
- Favicon: `public/brand/favicon.svg`
- App icon (256×256): `public/brand/icon.svg`
- OG image (1200×630): `public/brand/og-image.svg`
- (Opcional) render premium 3D: dejar en `public/brand/isotype.png`

### Wordmark
**`BARBERSYNC`** — Geist Sans Black, all caps, `tracking: 0.08em`, sin espacio entre palabras.
- `BARBER` → color `--brand-gold` (`#c9a23e`)
- `SYNC` → color `--brand-silver` (`#d8d8d8`)

### Lockup
Isotipo + wordmark separados por gap de 8–16px según escala (`sm` → 8, `md` → 10, `lg` → 12, `xl` → 16).

### Reglas
- Espacio de respeto = altura del isotipo.
- Sobre fondo dorado o claro: el isotipo invierte a negro; wordmark `BARBER` queda negro y `SYNC` queda gris medio.
- Nunca colorear el isotipo con otro tono que no sea el oficial.
- Nunca usar bevels falsos sobre la versión SVG flat.

---

## 3. Paleta

### Surfaces (fondos)
| Token              | Valor       | Uso                                          |
|--------------------|-------------|----------------------------------------------|
| `--surface-0`      | `#000000`   | Fondo base                                   |
| `--surface-1`      | `#0d0d0d`   | Cards, paneles                               |
| `--surface-2`      | `#161616`   | Inputs, items dentro de cards                |
| `--surface-3`      | `#1f1f1f`   | Hovers, popovers                             |

> Negro puro, **sin tintes cálidos**. La calidez la aporta el dorado, no el fondo.

### Texto
| Token                | Valor       | Uso                                   |
|----------------------|-------------|---------------------------------------|
| `--text-primary`     | `#ffffff`   | Titulares, valores principales        |
| `--text-secondary`   | `#c8c8c8`   | Body                                  |
| `--text-muted`       | `#8a8a8a`   | Labels, metadata                      |
| `--text-subtle`      | `#5a5a5a`   | Hints, placeholders                   |

### Acento — dorado antiguo
| Token                | Valor                     | Uso                                  |
|----------------------|---------------------------|--------------------------------------|
| `--brand-gold`       | `#c9a23e`                 | Marca, CTAs, valores destacados      |
| `--brand-gold-hi`    | `#e2c266`                 | Hover                                |
| `--brand-gold-lo`    | `#8a6e25`                 | Depth                                |
| `--brand-gold-soft`  | `rgba(201,162,62,0.08)`   | Backgrounds tipo highlight           |
| `--brand-gold-ring`  | `rgba(201,162,62,0.4)`    | Focus rings                          |

### Plateado
| Token                  | Valor       | Uso                                            |
|------------------------|-------------|------------------------------------------------|
| `--brand-silver`       | `#d8d8d8`   | "SYNC" en wordmark, separadores premium        |
| `--brand-silver-mid`   | `#9c9c9c`   | Variante intermedia                            |

### Bordes
| Token               | Valor                        | Uso                                  |
|---------------------|------------------------------|--------------------------------------|
| `--border-subtle`   | `rgba(255,255,255,0.06)`     | Divisores muy suaves                 |
| `--border-default`  | `rgba(255,255,255,0.10)`     | Cards, inputs, botones               |
| `--border-strong`   | `rgba(255,255,255,0.16)`     | Hover, foco                          |

### Semánticos
| Token              | Valor                       | Uso                          |
|--------------------|-----------------------------|------------------------------|
| `--success`        | `#6ee7b7`                   | Confirmado, WhatsApp         |
| `--danger`         | `#fca5a5`                   | Cancelar, error              |
| `--info`           | `#93c5fd`                   | Info neutra                  |

---

## 4. Tipografía

**Sans.** Geist Sans (via `next/font`).
**Mono.** Geist Mono para valores numéricos (precios, horarios, contadores, códigos).

### Escala
| Token     | Tamaño / line-height | Uso                              |
|-----------|----------------------|----------------------------------|
| `xs`      | 12 / 16              | Captions                         |
| `sm`      | 14 / 20              | Labels, body compacto            |
| `base`    | 16 / 24              | Body                             |
| `lg`      | 18 / 28              | Body destacado                   |
| `xl`      | 20 / 28              | Subtítulos                       |
| `2xl`     | 24 / 32              | H3                               |
| `3xl`     | 30 / 36              | H2                               |
| `4xl`     | 36 / 40              | H1 mobile                        |
| `display` | 72–112 / 0.9–0.95    | Hero desktop (uppercase, tight)  |

### Reglas
- **Titulares hero**: `font-black uppercase leading-[0.95] tracking-tight text-balance`.
- **Eyebrows**: `text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]`. *Sin íconos, sin dots — la sola tipografía.*
- **Body**: `font-normal`, line-height 1.5+.
- **Valores numéricos**: `Geist Mono font-bold tabular-nums text-[color:var(--brand-gold)]`.
- **Botones**: `font-semibold uppercase tracking-[0.12em]`.
- **Labels de form**: `text-[10px] uppercase tracking-[0.28em] text-[color:var(--text-muted)]`.

---

## 5. Espaciado y radios

Mucho aire. Padding generoso, gaps amplios. Minimalismo = espacio.
- **Móvil**: padding 16–20px, gaps 12–20px.
- **Desktop**: padding 32–48px, gaps 32–80px (lg:gap-20).

### Radios — chicos y sobrios
| Token        | Valor   | Uso                                  |
|--------------|---------|--------------------------------------|
| `radius-xs`  | 2px     | Tags, badges                         |
| `radius-sm`  | 4px     | Inputs, botones, slots               |
| `radius-md`  | 6px     | Cards                                |
| `radius-lg`  | 8px     | Paneles grandes                      |
| `radius-xl`  | 12px    | (raro)                               |

> Radios chicos refuerzan la estética minimal/premium. Nada de bordes "fluffy".

---

## 6. Sombras

**Casi inexistentes.** El minimalismo se sostiene con bordes hairline, no con sombras.

| Token              | Valor                                                                  |
|--------------------|------------------------------------------------------------------------|
| `shadow-card`      | `0 1px 0 rgba(255,255,255,0.03) inset` (hairline top, simula bisel)    |
| `shadow-elevated`  | `inset highlight + 0 24px 64px -32px rgba(0,0,0,0.9)` (modales)        |

> Sin glow dorado, sin sombras coloridas, sin neumorphism.

---

## 7. Motion

| Token              | Valor                              | Uso                                   |
|--------------------|------------------------------------|---------------------------------------|
| `duration-fast`    | 150ms                              | Hovers, focus                         |
| `duration-base`    | 220ms                              | Button press, color shifts            |
| `duration-slow`    | 360ms                              | Page enter, sticky bars               |
| `ease-out-soft`    | `cubic-bezier(0.2, 0.8, 0.2, 1)`   | Todo                                  |

### Principios
- Animar `opacity` y `transform: translateY(6px)`. Nada de slides grandes.
- Nunca animar > 360ms en UI operativa.
- `prefers-reduced-motion: reduce` deshabilita transforms.
- Cero parallax, cero confetti.

---

## 8. Componentes (primitives)

Todos en `src/components/ui/`. Cada uno acepta `className` y se compone con el helper `cn()`.

- **Button** — `primary` (bg gold), `secondary` (border ghost), `ghost`, `success`, `danger`, `subtle`. Sin glow, sin gradientes.
- **Card** — `default`, `elevated`, `accent`, `flat`, `outline`. Solo border + bg, sin shadows pesadas.
- **Input / Select / Textarea** — fondo transparente, border hairline, focus border gold.
- **Field** — wrapper label + input + hint/error.
- **Badge** — pill sin fondo, solo border tinted (más minimal).
- **Logo** — `lockup | wordmark | mark`, `sm | md | lg | xl`.
- **PageShell / SectionHeader / Eyebrow** — layouts.

---

## 9. Recursos decorativos

**NINGUNO.** No usar:
- Patrones de fondo (barber stripes, dots, grids).
- Gradientes radiales o lineales en backgrounds.
- Iconos ornamentales.
- "Pills decorativos" con dot color.
- Sombras de glow.

Únicos detalles permitidos:
- `hairline-gold` (línea horizontal con degradado dorado, máximo 1 por pantalla).
- `border-l` en columnas laterales como separador estructural.

---

## 10. Layout & jerarquía

- **Hero**: titular gigante (5xl mobile / 7xl–8xl desktop), `uppercase`, peso black, leading apretado. Una sola CTA primaria + una secundaria.
- **Eyebrows arriba del titular**, separadas con `tracking-[0.32em]`.
- **Columna lateral con `border-l`** para resumenes / metadata.
- **Grids ortogonales** — nada de cards desencajadas.
- **Footer minimal**: wordmark + copyright en uppercase tracking ancho.

---

## 11. Accesibilidad

- Contraste AA mínimo (texto blanco sobre negro = AAA).
- Focus visible: `outline 1px solid var(--brand-gold) offset 2px`.
- Touch target ≥ 44px en mobile.
- Labels asociados a inputs.
- `aria-busy` en async.
- `prefers-reduced-motion` respetado.
- Slots de horario con `role="radiogroup"` / `role="radio"` `aria-checked`.
