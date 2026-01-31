# Configuración de Rol por Defecto: VIEWER

## 📋 Resumen de Cambios

Se ha implementado un sistema de permisos por defecto para que todos los nuevos usuarios sean creados con el rol **VIEWER** (Observador), con acceso de solo lectura a todos los módulos y capacidad de cargar archivos en el módulo DMS.

---

## 🎯 Objetivos Cumplidos

1. ✅ **Rol por defecto**: Todos los nuevos usuarios se crean como `VIEWER`
2. ✅ **Solo lectura**: Acceso de lectura a todos los módulos operacionales
3. ✅ **Carga de archivos**: Los VIEWER pueden cargar archivos en el módulo DMS

---

## 🔧 Archivos Modificados

### 1. `/src/hooks/useAuth.tsx`
**Cambio**: Actualización de permisos del rol VIEWER
```typescript
'VIEWER': {
    // ... otros módulos con read: true, create: false
    dms: { read: true, create: true, update: false, delete: false }, // ✨ NUEVO
    // ...
}
```

### 2. `/src/modules/dms/SemanticDMS.tsx`
**Cambios**:
- Importación del hook `useAuth`
- Verificación de permisos antes de mostrar botones
- Botón "Subir Expediente" solo visible si `canPerform('dms', 'create')`
- Botón "Configurar Baterías" solo visible si `canPerform('dms', 'update')`

### 3. `/supabase/set_default_viewer_role.sql` (NUEVO)
**Propósito**: Script SQL para configurar el rol por defecto en Supabase

**Funcionalidades**:
- Establece `VIEWER` como valor por defecto de la columna `role`
- Crea función `set_default_viewer_role()` para asignar rol automáticamente
- Crea trigger que ejecuta la función antes de insertar nuevos perfiles
- Agrega comentario explicativo a la columna `role`

---

## 🚀 Instrucciones de Despliegue

### Paso 1: Ejecutar Script SQL en Supabase
1. Ir a **Supabase Dashboard** → **SQL Editor**
2. Copiar y ejecutar el contenido de `/supabase/set_default_viewer_role.sql`
3. Verificar que el trigger se creó correctamente:
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'trigger_set_default_viewer_role';
   ```

### Paso 2: Verificar en la Aplicación
1. Construir la aplicación: `npm run build`
2. Iniciar el servidor de desarrollo: `npm run dev`
3. Probar la funcionalidad:
   - Crear un nuevo usuario en el Admin Panel
   - Verificar que se asigna automáticamente el rol `VIEWER`
   - Iniciar sesión como VIEWER
   - Verificar que puede ver el botón "Subir Expediente" en el módulo DMS
   - Verificar que NO puede ver el botón "Configurar Baterías"

---

## 📊 Matriz de Permisos por Rol

| Módulo      | VIEWER | OPERATOR | MANAGER | ADMIN | SUPER_ADMIN |
|-------------|--------|----------|---------|-------|-------------|
| Dashboard   | R      | R        | CRUD-   | CRUD  | CRUD        |
| Tenders     | R      | R        | CRUD-   | CRUD  | CRUD        |
| Staffing    | R      | R        | CRUD-   | CRUD  | CRUD        |
| Logistics   | R      | CRU-     | CRUD-   | CRUD  | CRUD        |
| Clinical    | R      | CRU-     | CRUD-   | CRUD  | CRUD        |
| Audit       | R      | R        | CRUD-   | CRUD  | CRUD        |
| Projects    | R      | CRU-     | CRUD-   | CRUD  | CRUD        |
| Messaging   | R      | CRU-     | CRUD    | CRUD  | CRUD        |
| **DMS**     | **RC** | R        | CRUD-   | CRUD  | CRUD        |
| Ideation    | R      | CRU-     | CRUD    | CRUD  | CRUD        |
| Admin Panel | ❌     | ❌       | ❌      | ✅    | ✅          |

**Leyenda**: R=Read, C=Create, U=Update, D=Delete, -=No permitido

---

## 🔐 Política de Seguridad

### Rol VIEWER (Observador)
- **Propósito**: Usuario de solo lectura con capacidad de contribuir documentos
- **Casos de uso**:
  - Personal externo que necesita consultar información
  - Auditores que solo necesitan revisar datos
  - Colaboradores que aportan documentación sin modificar registros
  
### Escalamiento de Permisos
Para cambiar el rol de un usuario:
1. Iniciar sesión como ADMIN o SUPER_ADMIN
2. Ir a **Panel de Control** → **Gestión de Usuarios**
3. Seleccionar el usuario
4. Cambiar el rol desde el selector
5. Los permisos se actualizan automáticamente

---

## 📝 Notas Técnicas

### Trigger de Base de Datos
El trigger `trigger_set_default_viewer_role` se ejecuta **BEFORE INSERT** en la tabla `profiles`, garantizando que:
- Si no se especifica un rol, se asigna `VIEWER`
- El valor por defecto de la columna también es `VIEWER` como respaldo
- Doble capa de seguridad para asegurar que nunca se cree un usuario sin rol

### Verificación de Permisos en UI
El sistema utiliza el hook `canPerform(module, action)` para:
- Mostrar/ocultar botones de acción
- Habilitar/deshabilitar funcionalidades
- Prevenir acciones no autorizadas desde el frontend

**IMPORTANTE**: La verificación de permisos también debe implementarse en el backend (Supabase RLS) para seguridad completa.

---

## ✅ Checklist de Validación

- [ ] Script SQL ejecutado en Supabase
- [ ] Trigger creado correctamente
- [ ] Valor por defecto de columna `role` es `VIEWER`
- [ ] Aplicación construida sin errores
- [ ] Nuevo usuario creado tiene rol `VIEWER`
- [ ] Usuario VIEWER puede ver botón "Subir Expediente"
- [ ] Usuario VIEWER NO puede ver botón "Configurar Baterías"
- [ ] Usuario VIEWER puede cargar archivos exitosamente
- [ ] Usuario VIEWER NO puede modificar/eliminar archivos
- [ ] Documentación actualizada

---

**Fecha de Implementación**: 31 de Enero de 2026  
**Versión**: AMIS 3.0 - Febrero 2026 Milestone  
**Estado**: ✅ Implementado - Pendiente de Despliegue
