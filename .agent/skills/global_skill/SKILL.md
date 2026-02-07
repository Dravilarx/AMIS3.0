---
name: Skill Global - Editor de Objetos
description: Instrucciones maestras para la manipulación CRUD de cualquier objeto en el ecosistema AMIS 3.0 (Crear, Duplicar, Editar, Borrar, Almacenar).
---

# Skill Global: Editor de Objetos Maestro

Esta skill define el protocolo estandarizado para la manipulación de entidades de datos en AMIS 3.0. Debe aplicarse cada vez que el usuario solicite gestionar un "objeto" (Procedimiento, Requisito, Batería, Usuario, etc.).

## 1. Crear (Create)
- **Protocolo**: Antes de crear, verificar si existe un objeto con el mismo nombre o código único.
- **Acción**: Generar un nuevo registro con UUID automático, `tenant_id` del usuario actual y timestamps de creación.
- **Validación AI**: Asegurarse de que los campos obligatorios cumplan con el esquema de la base de datos (e.g., nombres no vacíos, precios numéricos).

## 2. Duplicar (Duplicate)
- **Protocolo**: Crear una copia exacta del objeto seleccionado pero con las siguientes modificaciones obligatorias:
    - Nuevo `id` (UUID).
    - Sufijo en el nombre: "(Copia)" o autoincremental si ya existe una copia.
    - Resetear estados de aprobación o auditoría si aplica.
- **Acción**: Insertar como nuevo registro tras confirmación del usuario.

## 3. Editar (Update)
- **Protocolo**: Identificar solo los campos que han cambiado (Diferencial).
- **Acción**: Realizar un `patch` en la base de datos.
- **Integridad**: No permitir el cambio de IDs primarios o `tenant_id`. Actualizar siempre el campo `updated_at`.

## 4. Borrar (Delete)
- **Protocolo**: 
    - **Soft Delete**: Si el objeto tiene relaciones (e.g., un procedimiento usado en un turno), marcar como `is_active: false` en lugar de eliminar.
    - **Hard Delete**: Solo si el objeto es huérfano y el usuario confirma expresamente la pérdida de datos.
- **Seguridad**: Verificar permisos de `delete` en `useAuth` antes de proceder.

## 5. Almacenar (Sync/Store)
- **Protocolo**: Sincronización con Supabase (PostgreSQL).
- **Acción**: 
    - Usar la sesión activa del usuario (Marcelo Avila o el usuario logueado).
    - Capturar errores de red o permisos (401/403) y ofrecer re-intento.
    - Notificar éxito con el componente de UI correspondiente (Green Toast/Alert).

## 6. Estética de Interfaz (UI/UX)
- Todas las acciones deben reflejarse en la UI con micro-animaciones (escala al pulsar, fades) y feedback inmediato.
- Usar los colores de marca:
    - **Crear/Guardar**: Esmeralda/Verde.
    - **Duplicar/Editar**: Azul/Ámbar.
    - **Borrar**: Carmesí/Rojo.


## 7. Formateo de Datos Personales (Formatting)
- **RUT**: Mostrar siempre en formato `XX.XXX.XXX-X`. Si el cuerpo tiene menos de 8 dígitos, rellenar con un cero inicial (ej: `01.111.111-1`).
- **Teléfono**: Mostrar siempre con prefijo y espacios para legibilidad: `+569 9918 8701`. Limpiar caracteres no numéricos antes de formatear.
- **Nombres/Apellidos**: Aplicar siempre "Proper Case" (primera letra de cada palabra en mayúscula, resto en minúscula).

---
*Instrucción para el Agente*: Aplica estas reglas en cada interacción que involucre la gestión de datos maestros o visualización de información de pacientes en AMIS 3.0.
