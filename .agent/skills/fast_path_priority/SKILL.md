---
name: Prioridad Vía Rápida
description: Reglas obligatorias para elegir siempre la alternativa más rápida y eficiente. Prohíbe el uso del navegador automatizado cuando existe una alternativa directa.
---

# Prioridad Vía Rápida — Regla de Oro

## Principio Fundamental

> **Siempre elegir la vía más corta y directa para completar una tarea.**
> Si una acción puede resolverse en 5 segundos dándole al usuario un comando/SQL/snippet para pegar, **NUNCA** usar el navegador automatizado que tarda 10-40 minutos.

## Reglas Obligatorias

### 1. SQL y Base de Datos
- **PROHIBIDO** usar `browser_subagent` para ejecutar SQL en Supabase Dashboard.
- **OBLIGATORIO** entregar el SQL listo para copiar/pegar al usuario.
- Si el usuario tiene el SQL Editor de Supabase abierto, darle el query directamente.

### 2. Navegador Automatizado — Cuándo SÍ y cuándo NO
- **SÍ usar** para: verificaciones visuales rápidas, capturas de pantalla diagnósticas, tareas que el usuario NO puede hacer manualmente.
- **NO usar** para: ejecutar SQL, llenar formularios repetitivos, hacer pruebas de login en serie, cualquier cosa que el usuario haga más rápido manualmente.
- **REGLA DE 30 SEGUNDOS**: Si el browser subagent no completa su tarea en ~30 segundos, es señal de que la estrategia es incorrecta. Abortar y buscar alternativa.

### 3. Pruebas de Login / Acceso
- **NUNCA** hacer pruebas de login con el navegador automatizado para múltiples usuarios.
- Entregar las credenciales en una tabla clara y dejar que el usuario pruebe.
- Si se necesita verificar programáticamente, usar un script Node.js con `supabase.auth.signInWithPassword()`.

### 4. Cambios en Base de Datos
- Reseteo de contraseñas → Entregar SQL directo.
- Cambios de roles → Entregar SQL directo.
- Migraciones → Entregar SQL directo.
- El usuario siempre tiene Supabase Dashboard abierto, aprovecharlo.

### 5. Desarrollo y Debugging
- Priorizar `console.log` y scripts de terminal sobre automatización de navegador.
- Si algo se puede verificar con un `grep`, un `curl`, o un script de 3 líneas, eso va primero.
- Las pruebas visuales las hace el usuario. El agente resuelve el código.

## Jerarquía de Velocidad (de más rápido a más lento)

1. 🟢 **Dar snippet/SQL/comando** al usuario → 5 segundos
2. 🟢 **Ejecutar script en terminal** → 10-30 segundos
3. 🟡 **Editar código directamente** → 1-5 minutos
4. 🔴 **Browser subagent** → 5-40 minutos (ÚLTIMO RECURSO)

## Antipatrón a Evitar

```
❌ "Voy a abrir el navegador para ejecutar este SQL en Supabase..."
❌ "Voy a probar el login de 5 usuarios con el navegador..."
❌ "Voy a llenar este formulario automáticamente..."

✅ "Pega este SQL en tu editor de Supabase y dale Run:"
✅ "Prueba estas credenciales:" [tabla con emails y claves]
✅ "Ejecuté este script y el resultado es..."
```
