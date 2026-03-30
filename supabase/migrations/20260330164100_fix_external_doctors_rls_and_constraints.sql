-- ============================================================
-- FIX: Limpieza de políticas RLS duplicadas en external_doctors
-- + Restaurar UNIQUE en phone_number (clave IAM operacional)
-- Fecha: 2026-03-30
-- ============================================================

-- 1. Limpiar TODAS las políticas existentes (acumuladas/duplicadas)
DROP POLICY IF EXISTS "Enable Read Access for authenticated admins" ON public.external_doctors;
DROP POLICY IF EXISTS "Enable ALL Access for public users" ON public.external_doctors;
DROP POLICY IF EXISTS "Permitir INSERT a usuarios autenticados en external_doctors" ON public.external_doctors;
DROP POLICY IF EXISTS "Permitir SELECT global en external_doctors" ON public.external_doctors;
DROP POLICY IF EXISTS "Permitir UPDATE a usuarios autenticados en external_doctors" ON public.external_doctors;
DROP POLICY IF EXISTS "Permitir insercion a administradores" ON public.external_doctors;
DROP POLICY IF EXISTS "Permitir insercion temporal para pruebas" ON public.external_doctors;

-- 2. Asegurar que RLS está habilitado
ALTER TABLE public.external_doctors ENABLE ROW LEVEL SECURITY;

-- 3. Política limpia: acceso total para authenticated
CREATE POLICY "authenticated_full_access"
ON public.external_doctors
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Política para anon
CREATE POLICY "anon_full_access"
ON public.external_doctors
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- 5. Restaurar UNIQUE en phone_number (clave IAM del bot Telegram)
ALTER TABLE public.external_doctors
ADD CONSTRAINT external_doctors_phone_number_key UNIQUE (phone_number);
