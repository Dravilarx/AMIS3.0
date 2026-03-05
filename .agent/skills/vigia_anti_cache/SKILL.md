---
name: Vigía Anti Cache
description: Instrucciones preventivas y resolutivas que debe seguir el agente para evitar o solucionar problemas de "caché duro" (SPA Cache Prison) al publicar en producción o Vercel.
---

# Skill: Vigía Anti Cache

## Objetivo
Prevenir la frustración del usuario relacionada al problema de caché del navegador ("SPA Cache Prison") u otros retrasos visuales asociados a la propagación en CDNs después de haber confirmado un despliegue exitoso (`git push` y build verde en Vercel).

## Instrucciones y Reglas

1.  **Diagnóstico Inmediato**: Cuando el usuario reporte que un cambio visual o de código desplegado "no aparece", "se ve igual que antes" o "no se actualizó":
    *   Asumir como causa principal, antes de dudar del código, que el navegador del usuario atrapó la versión antigua de la Single Page Application (SPA).
2.  **Pasos de Acción para el Usuario**:
    *   Pedir siempre al usuario que haga la prueba de fuego abriendo la URL de proyecto en una **ventana de incógnito / navegación privada**.
    *   Aconsejar al usuario hacer un **Hard Refresh** (`Cmd+Shift+R` en Mac o `Ctrl+F5` en Windows) en la pestaña en la que están y volver a probar.
3.  **Remediación Forzada (Vercel Cache Purge)**:
    *   Si los pasos en local fallan, recordarle al usuario que ingrese a su dashboard en Vercel.
    *   Instruirle pulsar el botón "Redeploy" o ir al detalle del build y asegurarse de marcar la casilla oculta de **"Clear Cache"** (Purgar Caché) para obligar a las CDNs y Edge servers a botar la aplicación anterior.
4.  **Avisos Preventivos**:
    *   Al informar de un cambio enviado con éxito que requiera `build` en Vercel, añade un pequeño recordatorio (en un tono amistoso) de limpiar caché cuando el usuario vaya a verificar en producción para que se asombre inmediatamente sin falsos negativos de caché.
