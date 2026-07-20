import { createClient } from 'jsr:@supabase/supabase-js@2';

// ═══════════════════════════════════════════════════════════════════════════
// 👥 AMIS 3.0 — Alta MASIVA de cuentas (bulk-onboard)
// ═══════════════════════════════════════════════════════════════════════════
// Desplegar CON verificación de JWT (NO --no-verify-jwt). Solo un SUPER_ADMIN
// puede ejecutarla. Crea usuarios de auth YA CONFIRMADOS (email_confirm) — sin
// correo de verificación, evitando el límite de envíos de Supabase — y perfiles
// IDÉNTICOS en forma a los del alta de a uno (mirror de useAdminProfiles):
//   profiles = { id, email, full_name, role, is_deleted:false,
//                must_change_password:true, permissions: plantilla del cargo }
//   role = ROLE_POR_TIPO[cargo.tipo]  (clinico→OPERATOR, administrativo→ADMIN_SECRETARY)
//   cargo_id best-effort (igual que el alta de a uno).
// ═══════════════════════════════════════════════════════════════════════════

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MAX_LOTE = 100; // por tanda; evita timeouts del runtime
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// role del profesional → nombre de cargo (de ahí sale la plantilla de permisos).
const ROL_A_CARGO: Record<string, string> = {
  'Radiólogo': 'Médico',
  'Médico': 'Médico',
  'Tecnólogo Médico': 'Tecnólogo',
  'Secretaria': 'Administrativo/Secretaría',
  'Administración': 'Administrativo/Secretaría',
  'MANAGER': 'Gerente',
};

// tipo del cargo → role del perfil (mirror de ROLE_POR_TIPO del alta de a uno).
const roleDeTipo = (tipo: string): string =>
  tipo === 'administrativo' ? 'ADMIN_SECRETARY' : 'OPERATOR';

// Contraseña fuerte, legible y aleatoria de verdad (crypto.getRandomValues del
// runtime Deno). Sin ambiguos (O/0, l/1/I). 14 chars con min/MAY/dígito.
const MINUS = 'abcdefghijkmnpqrstuvwxyz'; // sin l, o
const MAYUS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I, O
const DIGITOS = '23456789';                // sin 0, 1
const SIMBOLOS = '-_';
const rndIndex = (n: number): number => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % n;
};
const generarPassword = (): string => {
  const todos = MINUS + MAYUS + DIGITOS + SIMBOLOS;
  const chars: string[] = [
    MINUS[rndIndex(MINUS.length)],
    MAYUS[rndIndex(MAYUS.length)],
    DIGITOS[rndIndex(DIGITOS.length)],
  ];
  while (chars.length < 14) chars.push(todos[rndIndex(todos.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rndIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

interface Resultado {
  professionalId: string;
  nombre: string;
  email: string;
  estado: 'creada' | 'omitida' | 'error';
  motivo?: string;
  password?: string; // solo en las creadas
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    // ── 1. Autorización: solo SUPER_ADMIN ──────────────────────────────────
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'No autorizado' }, 403);

    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !caller) return json({ error: 'No autorizado' }, 403);

    const { data: callerProfile, error: profErr } = await admin
      .from('profiles').select('role').eq('id', caller.id).maybeSingle();
    if (profErr || !callerProfile || callerProfile.role !== 'SUPER_ADMIN') {
      return json({ error: 'Solo un administrador puede ejecutar esta acción' }, 403);
    }

    // ── 2. Entrada ─────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const ids: unknown = body?.professionalIds;
    if (!Array.isArray(ids) || ids.length === 0) {
      return json({ error: 'Falta professionalIds (arreglo no vacío)' }, 400);
    }
    if (ids.length > MAX_LOTE) {
      return json({ error: `Máximo ${MAX_LOTE} por tanda. Divide en lotes más chicos.` }, 400);
    }
    const professionalIds = ids.filter((x): x is string => typeof x === 'string');

    // Precargar cargos (nombre → { tipo, plantilla, id }).
    const { data: cargos, error: cargosErr } = await admin
      .from('cargos').select('id, nombre, tipo, plantilla_permisos');
    if (cargosErr) throw cargosErr;
    const cargoPorNombre = new Map<string, any>((cargos || []).map((c: any) => [c.nombre, c]));

    // ── 3. Procesar en serie ───────────────────────────────────────────────
    const resultados: Resultado[] = [];
    const omitir = (professionalId: string, nombre: string, email: string, motivo: string): Resultado =>
      ({ professionalId, nombre, email, estado: 'omitida', motivo });
    const fallar = (professionalId: string, nombre: string, email: string, motivo: string): Resultado =>
      ({ professionalId, nombre, email, estado: 'error', motivo });

    for (const professionalId of professionalIds) {
      let nombre = '';
      let email = '';
      try {
        const { data: prof, error: profErr2 } = await admin
          .from('professionals')
          .select('id, name, last_name, email, role, is_active, is_deleted')
          .eq('id', professionalId)
          .maybeSingle();
        if (profErr2) throw profErr2;

        if (!prof) { resultados.push(omitir(professionalId, '', '', 'profesional no encontrado')); continue; }
        nombre = `${prof.name || ''} ${prof.last_name || ''}`.trim();
        email = (prof.email || '').trim();

        if (prof.is_deleted) { resultados.push(omitir(professionalId, nombre, email, 'profesional archivado')); continue; }
        if (prof.is_active === false) { resultados.push(omitir(professionalId, nombre, email, 'profesional inactivo')); continue; }
        if (!EMAIL_RE.test(email)) { resultados.push(omitir(professionalId, nombre, email, 'email inválido')); continue; }

        // Rol → cargo → plantilla de permisos.
        const cargoNombre = ROL_A_CARGO[String(prof.role || '')];
        if (!cargoNombre) { resultados.push(fallar(professionalId, nombre, email, 'rol no mapeado')); continue; }
        const cargo = cargoPorNombre.get(cargoNombre);
        if (!cargo) { resultados.push(fallar(professionalId, nombre, email, `cargo "${cargoNombre}" no configurado`)); continue; }

        // Idempotencia: ¿ya hay un perfil con ese email? (id de perfil = id de auth).
        const { data: existingProfile } = await admin
          .from('profiles').select('id').eq('email', email).maybeSingle();
        if (existingProfile) { resultados.push(omitir(professionalId, nombre, email, 'ya tiene cuenta')); continue; }

        const password = generarPassword();
        const role = roleDeTipo(String(cargo.tipo || ''));

        // Crear usuario auth YA CONFIRMADO (sin correo de verificación).
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: nombre, role },
        });
        if (createErr || !created?.user) {
          const msg = (createErr?.message || '').toLowerCase();
          if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
            resultados.push(omitir(professionalId, nombre, email, 'ya tiene cuenta'));
          } else {
            resultados.push(fallar(professionalId, nombre, email, createErr?.message || 'no se pudo crear el usuario'));
          }
          continue;
        }

        // Perfil mirror del alta de a uno (upsert por id, cubre el caso de un
        // trigger que ya haya creado un perfil base al crear el usuario).
        const { error: upsertErr } = await admin.from('profiles').upsert({
          id: created.user.id,
          email,
          full_name: nombre,
          role,
          is_deleted: false,
          must_change_password: true,
          permissions: cargo.plantilla_permisos,
        }, { onConflict: 'id' });
        if (upsertErr) {
          resultados.push(fallar(professionalId, nombre, email, `usuario creado, pero falló el perfil: ${upsertErr.message}`));
          continue;
        }

        // cargo_id best-effort (idéntico al alta de a uno; la columna puede no existir).
        const { error: cargoIdErr } = await admin.from('profiles').update({ cargo_id: cargo.id }).eq('id', created.user.id);
        if (cargoIdErr) {
          await admin.from('profiles').update({ cargo: cargo.nombre }).eq('id', created.user.id)
            .then(({ error }) => { if (error) console.warn('No se pudo guardar el cargo en el perfil:', error.message); });
        }

        resultados.push({ professionalId, nombre, email, estado: 'creada', password });
      } catch (e) {
        console.error('[bulk-onboard] Error con profesional', professionalId, e);
        resultados.push(fallar(professionalId, nombre, email, (e as any)?.message || 'error inesperado'));
      }
    }

    // ── 4. Salida ──────────────────────────────────────────────────────────
    const resumen = {
      creadas: resultados.filter(r => r.estado === 'creada').length,
      omitidas: resultados.filter(r => r.estado === 'omitida').length,
      errores: resultados.filter(r => r.estado === 'error').length,
    };
    return json({ resumen, resultados });
  } catch (e) {
    console.error('[bulk-onboard] Error no controlado:', e);
    return json({ error: 'Error interno' }, 500);
  }
});
