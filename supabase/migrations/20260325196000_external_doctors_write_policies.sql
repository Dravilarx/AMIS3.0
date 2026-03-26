-- Modificar la política RLS para external_doctors
-- Permitir de forma temporal escritura a 'public' en entornos locales
-- de manera que se pueda bypassear la autenticación mientras se hacen pruebas del bot.

DROP POLICY IF EXISTS "Enable Insert Access for authenticated users" ON public.external_doctors;
DROP POLICY IF EXISTS "Enable Update Access for authenticated users" ON public.external_doctors;
DROP POLICY IF EXISTS "Enable Delete Access for authenticated users" ON public.external_doctors;
DROP POLICY IF EXISTS "Enable ALL Access for authenticated users" ON public.external_doctors;

CREATE POLICY "Enable ALL Access for public users"
ON public.external_doctors
FOR ALL
TO public
USING (true)
WITH CHECK (true);
