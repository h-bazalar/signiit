# Signiit — Instrucciones para Claude Code

## Stack
- React 18 + Vite
- Tailwind CSS (con tokens de marca Signiit)
- Clerk (auth)
- Supabase (PostgreSQL)
- API routes en /api/ (Vercel serverless)
- n8n en VPS 02 para pipelines de IA

## Estructura de carpetas
- `src/pages/` — pantallas principales
- `src/components/` — componentes reutilizables
- `src/hooks/` — custom hooks
- `src/context/` — contextos React
- `src/theme/` — colores y tokens de marca
- `src/utils/` — constantes y utilidades
- `api/` — serverless functions (Vercel)

## Identidad visual
Usar siempre los tokens de marca definidos en:
- `src/index.css` — CSS variables
- `src/theme/colors.js` — constantes JS
- `tailwind.config.js` — clases Tailwind

Colores principales:
- Fondo dark: `var(--sig-forest)` / `#0F4A38`
- Acento mint: `var(--sig-mint)` / `#5EC9AD`
- Fondo claro: `var(--sig-paper)` / `#F7F5F0`
- Sin negro en la paleta

Fuentes:
- Display: DM Serif Display
- Body: DM Sans
- Mono: Space Mono

## Reglas de código
- Siempre archivos completos, nunca diffs parciales
- Cambios en n8n: solo el nodo específico, nunca el flujo completo
- Variables de entorno: nunca hardcodear keys
- Errores: síntoma + archivo + línea exacta
- Idioma del código: inglés. Idioma de UI y comentarios: español

## Patrones heredados de Orbiit (validados en producción)
Ver `src/utils/constants.js` para referencias de:
- Estructura de créditos
- Output por generación (6 imágenes, 3 videos)
- Polling (3s interval, 8min timeout)
- Fetch timeout (120s)

## Producción
- VPS 01: Orbiit — NUNCA tocar desde este proyecto
- VPS 02: Signiit — infraestructura propia
- Deploy: Vercel (rama main → producción)
