---
name: Skill Global - Menús de Selección y Auto-completado
description: Instrucciones maestras para la implementación de selectores sobre colecciones grandes (profesionales, pacientes, instituciones). Prohíbe el uso de listas desplegables nativas con scroll y manda el uso de inputs tipo search/autocomplete.
---

# Skill Global: Menús de Selección y Auto-completado

Al implementar una selección de usuario o una lista partiendo de un conjunto grande de datos (como asignar "Equipos", "Profesionales" o "Pacientes"), SIEMPRE debes obedecer la siguiente regla estricta de la aplicación.

## Regla de Oro
**NUNCA utilices listas desplegables estáticas (`select` nativos HTML) o ventanas con scroll eternas (divisiones con `overflow-y-auto` que renderizan todo el listado de golpe siempre visible) para colecciones grandes.**

## Método Obligatorio de Implementación (Type-to-Search)
El usuario solicita implementaciones donde el panel de sugerencias aparezca **únicamente a medida que el usuario escribe el nombre**, en vez de forzarlo a scrollear o buscar de forma manual un nombre dentro de un largo listado.

Sigue este patrón universal de la aplicación al implementar formularios React:

1. **Estado de Búsqueda Dedicado**: Declara un estado para enlazar el texto (ej: `const [teamSearchTerm, setTeamSearchTerm] = useState('');`).
2. **Input Visual (Filtro)**: Usa siempre un componente `<input type="text" />` estilizado y si es posible acompañado con el icono `<Search />` de `lucide-react`. Este debe actualizar activamente el `searchTerm`.
3. **Panel/Dropdown Contextual Animado**: Sólo debes mostrar el bloque de resultados cuando el input posea contenido de búsqueda válido (ej. `{teamSearchTerm.trim() && ( <div>...</div> )}`). Este bloque debe ser siempre un layout **absolute** flotante sobre el formulario para evitar resizes (saltos forzosos del layout nativo).
4. **Filtro Óptimo Mantenido en Memoria**: Filtra temporalmente la colección principal ignorando cases (`items.filter(i => i.name.toLowerCase().includes(teamSearchTerm.toLowerCase()))`).
5. **Limitar Sobrecarga Visual**: Si el set es muy denso, limítalo a `.slice(0, 10)` o a la capacidad de una altura máxima con scroll local.
6. **Cierre Automático Post-Selección**: Al hacer clic en el nombre deseado del dropdown flotante, debes registrar el `id` en el estado principal del formulario y luego setear tu search term a un String vacío `setSearchTerm('')` lo cual ocultará tu bloque Type-to-Search automáticamente brindando una experiencia "Seamless/Instantánea". 

## Alternativas de Componentes Comunes
Antes de implementar de forma manual el patrón superior, revisa si el formulario tolera un simple select. En ese escenario revisa si el componente global `<SmartCombobox />` situado generalmente en `src/components/ui/` o equivalente, pudiese ser un buen _drop-in_ para reemplazarlos, en especial cuando se trata de selección **única**. (Para la selección **múltiple** de array de ids el acercamiento visual manual descrito arriba suele ser necesario a menos que el combobox escale).
