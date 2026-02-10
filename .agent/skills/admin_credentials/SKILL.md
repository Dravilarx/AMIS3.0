---
name: Credenciales de Administrador
description: Credenciales por defecto del superusuario de AMIS 3.0. Usar siempre que se necesite login, reseteo de contraseña, o configuración de acceso admin.
---

# Credenciales de Superusuario — AMIS 3.0

## Cuenta Principal

| Campo       | Valor                            |
|-------------|----------------------------------|
| **Email**   | `marcelo.avila@amis.global`      |
| **Password**| `Maj2030!`                       |
| **Rol**     | `SUPER_ADMIN`                    |
| **Nombre**  | Marcelo Avila                    |

## Proyecto Supabase

| Campo          | Valor                                        |
|----------------|----------------------------------------------|
| **Project ID** | `tmwishtywgciqbqdkjhh`                       |
| **URL**        | `https://tmwishtywgciqbqdkjhh.supabase.co`   |

## Instrucciones

1. **Login**: Usar las credenciales anteriores para iniciar sesión en cualquier entorno (local o producción).
2. **Reseteo de contraseña**: Si se necesita resetear, ejecutar el siguiente SQL en Supabase:
   ```sql
   UPDATE auth.users 
   SET encrypted_password = crypt('Maj2030!', gen_salt('bf'))
   WHERE email = 'marcelo.avila@amis.global';
   ```
3. **Protección**: El email `marcelo.avila@amis.global` está protegido en el código contra cambios de rol vía la UI de admin (ver `useAdminProfiles.ts`).
4. **Verificación `isSuperAdmin`**: En `useAuth.tsx` línea 193, se verifica directamente por email.

## Otras Cuentas Conocidas

| Email                                | Rol       |
|--------------------------------------|-----------|
| `alejandra.versalovic@amis.global`   | MANAGER   |
| `alex.chicaguala@amis.global`        | ADMIN     |
| `patricio.abella@amis.global`        | Sin perfil|
