// ──────────────────────────────────────────────────────────────
// 🧠 AMIS 3.0 — ContextManager (Cerebro Central de Contexto)
// ──────────────────────────────────────────────────────────────
// Servicio modular que construye dinámicamente el System Prompt
// para Gemini evaluando: RBAC, Seshat Data, RAG Knowledge Base.
// ──────────────────────────────────────────────────────────────

import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ── Tipos ────────────────────────────────────────────────────

export interface ProfessionalContext {
  id: string;
  name: string;
  last_name: string;
  hospital_name: string;
  specialty?: string;
  access_level: "external" | "internal";
  institution_id?: string;
  role?: string;          // staff interno: SUPER_ADMIN / ADMIN / MANAGER / ...
  clinical_role?: string; // staff interno: MED_CHIEF / MED_STAFF / ...
}

export interface IntentResult {
  intent:
    | "STATUS_INFORME"
    | "PACS_LINK"
    | "INTERCONSULTA"
    | "REVISION"
    | "PROTOCOLO"
    | "MANUAL"
    | "SLA_INSTITUCION"
    | "RESUMEN_TURNO"
    | "UNKNOWN";
  entities: {
    rut?: string;
    examen_id?: string;
    pregunta?: string;
    topic?: string;
    institucion_nombre?: string;
    fecha?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  };
  requires_patient_data: boolean;
  requires_knowledge_base: boolean;
}

export interface ContextPayload {
  systemPrompt: string;
  intent: IntentResult;
  ragChunks: string[];
  seshatData: any | null;
}

// ── Reglas Base (inmutables) ─────────────────────────────────

const BASE_RULES = `
Eres AMIS, el asistente del Contact Center de AMIS. Responde SIEMPRE en español clínico profesional.

⛔ ANTI-ALUCINACIÓN (REGLA CRÍTICA DE SEGURIDAD CLÍNICA — INVIOLABLE):
- SOLO puedes responder usando los DATOS REALES inyectados en este contexto (bloques [DATOS REALES ...]).
- Si el contexto NO trae datos para responder la pregunta, responde EXACTAMENTE y solo esto:
  "No tengo ese dato conectado todavía en AMIS."
- PROHIBIDO inventar cifras, tiempos, SLA, nombres de instituciones, plazos o porcentajes.
- PROHIBIDO mencionar "Seshat" o cualquier sistema externo. La fuente de verdad es AMIS.
- PROHIBIDO rellenar con explicaciones genéricas, suposiciones o conocimiento general.
- Ante la duda, SIEMPRE prefiere decir "no tengo ese dato" antes que adivinar.
- NO generes diagnósticos. Solo reportas lo que existe, literalmente, en los datos entregados.

Mantén un tono respetuoso y directo, adaptado a profesionales de salud.
`.trim();

// ── Servicio principal ───────────────────────────────────────

export class ContextManager {
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }

  // ─────────────────────────────────────────────────────────
  // FASE 2: RBAC — Resolver identidad y contexto del profesional
  // ─────────────────────────────────────────────────────────

  async resolveIdentity(chatId: number): Promise<ProfessionalContext | null> {
    // 1. STAFF INTERNO: primero buscamos en professionals (con role para el RBAC).
    const { data: staff } = await this.supabase
      .from("professionals")
      .select("id, name, last_name, specialty, role, clinical_role")
      .eq("telegram_chat_id", chatId)
      .maybeSingle();

    if (staff) {
      return {
        id: staff.id,
        name: staff.name,
        last_name: staff.last_name,
        hospital_name: "AMIS (interno)",
        specialty: staff.specialty || undefined,
        access_level: "internal",
        role: staff.role || undefined,
        clinical_role: staff.clinical_role || undefined,
      };
    }

    // 2. MÉDICO EXTERNO: flujo actual sin cambios.
    const { data: doctor, error } = await this.supabase
      .from("external_doctors")
      .select("id, name, last_name, hospital_name, specialty")
      .eq("telegram_chat_id", chatId)
      .single();

    if (error || !doctor) return null;

    return {
      id: doctor.id,
      name: doctor.name,
      last_name: doctor.last_name,
      hospital_name: doctor.hospital_name,
      specialty: doctor.specialty || undefined,
      access_level: "external",
      institution_id: this.resolveInstitutionId(doctor.hospital_name),
    };
  }

  /**
   * Mapea el nombre de la clínica al Institution_ID para Seshat.
   * En producción esto debería ser un lookup a una tabla institutions.
   */
  private resolveInstitutionId(hospitalName: string): string | undefined {
    const institutionMap: Record<string, string> = {
      "Clínica Portada": "INST-PORTADA-001",
      "Clínica AMIS": "INST-AMIS-001",
      "Hospital Regional Antofagasta": "INST-HRA-001",
      // Agregar más mapeos según crezca la red
    };

    // Búsqueda flexible (case-insensitive, parcial)
    const normalized = hospitalName.toLowerCase().trim();
    for (const [key, value] of Object.entries(institutionMap)) {
      if (normalized.includes(key.toLowerCase())) return value;
    }
    return undefined;
  }

  // ─────────────────────────────────────────────────────────
  // Intent Detection con Gemini (mejorado con nuevos intents)
  // ─────────────────────────────────────────────────────────

  /**
   * Fallback por palabras clave (sin IA). Cubre SLA_INSTITUCION cuando Gemini
   * no está disponible, falla, o devuelve UNKNOWN. Retorna null si no aplica.
   */
  private keywordFallback(userMessage: string): IntentResult | null {
    // Normaliza: minúsculas y sin tildes
    const norm = (userMessage ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    // Resumen del 4° Turno (precede a SLA por especificidad)
    const turnoKeywords = ["cuarto turno", "4 turno", "4° turno", "resumen turno", "turno de noche"];
    if (turnoKeywords.some((k) => norm.includes(k))) {
      return {
        intent: "RESUMEN_TURNO",
        entities: {}, // las fechas las extrae Gemini; el fallback solo fija el intent
        requires_patient_data: false,
        requires_knowledge_base: false,
      };
    }

    const keywords = ["sla", "cumplimiento", "tiempo de entrega", "tiempos"];
    if (!keywords.some((k) => norm.includes(k))) return null;

    // El nombre de institución suele ser lo que queda al quitar las palabras clave.
    let nombre = norm;
    for (const k of keywords) nombre = nombre.replace(new RegExp(k, "g"), " ");
    nombre = nombre.replace(/\s+/g, " ").trim();

    return {
      intent: "SLA_INSTITUCION",
      entities: { institucion_nombre: nombre || undefined },
      requires_patient_data: false,
      requires_knowledge_base: false,
    };
  }

  async detectIntent(userMessage: string): Promise<IntentResult> {
    // Sin IA disponible: intentamos el fallback por palabras clave.
    if (!GEMINI_API_KEY) {
      return (
        this.keywordFallback(userMessage) ?? {
          intent: "UNKNOWN",
          entities: {},
          requires_patient_data: false,
          requires_knowledge_base: false,
        }
      );
    }

    const intentPrompt = `Eres un clasificador de intenciones clínicas. Analiza el mensaje y devuelve JSON estricto.

Intenciones disponibles:
- STATUS_INFORME: Consultar estado/resultado de un examen o informe de un paciente
- PACS_LINK: Solicitar visor de imágenes DICOM
- INTERCONSULTA: Abrir canal de consulta con radiólogo
- REVISION: Solicitar revisión/ampliación de informe existente
- PROTOCOLO: Preguntas sobre protocolos clínicos, manuales, guías o procedimientos
- MANUAL: Preguntas sobre uso de la plataforma, funcionalidades AMIS/Seshat
- SLA_INSTITUCION: El usuario pregunta por SLA, tiempos de entrega, plazos o cumplimiento de una INSTITUCIÓN específica (ej. "¿cuál es el SLA de Andes Salud?", "tiempos de entrega del Hospital Antofagasta")
- RESUMEN_TURNO: El usuario pide el resumen/reporte del 4° turno (o "cuarto turno", "turno de noche") (ej. "dame el resumen del cuarto turno", "reporte del 4° turno de ayer")
- UNKNOWN: No clasificable

Reglas:
- requires_patient_data = true SOLO si el intent necesita datos de un paciente específico (STATUS_INFORME, PACS_LINK, REVISION)
- requires_knowledge_base = true SOLO si la pregunta es sobre protocolos, manuales o procedimientos (PROTOCOLO, MANUAL)
- Para SLA_INSTITUCION: extrae el nombre de la institución mencionada (texto libre) en entities.institucion_nombre. requires_patient_data=false y requires_knowledge_base=false.
- Para RESUMEN_TURNO: extrae fechas en formato YYYY-MM-DD. Si menciona una fecha puntual ponla en entities.fecha. Si menciona un rango, usa entities.fecha_desde y entities.fecha_hasta. Si no menciona fechas, déjalas vacías. requires_patient_data=false y requires_knowledge_base=false.
- Extrae el RUT si lo menciona, normalizado sin puntos (xxxxxxxx-x)

Responde SOLO con JSON puro:
{
  "intent": "...",
  "entities": { "rut": "...", "examen_id": "...", "pregunta": "...", "topic": "...", "institucion_nombre": "...", "fecha": "...", "fecha_desde": "...", "fecha_hasta": "..." },
  "requires_patient_data": boolean,
  "requires_knowledge_base": boolean
}

Mensaje: "${userMessage}"`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: intentPrompt }] }],
            generationConfig: { response_mime_type: "application/json" },
          }),
        },
      );

      const data = await response.json();
      let rawJson =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      rawJson = rawJson.replace(/```json/g, "").replace(/```/g, "").trim();
      const result = JSON.parse(rawJson) as IntentResult;

      // Si Gemini no clasificó, intentamos el fallback por palabras clave.
      if (result.intent === "UNKNOWN") {
        return this.keywordFallback(userMessage) ?? result;
      }
      return result;
    } catch (err) {
      console.error("❌ Intent detection error:", err);
      // Gemini falló: el fallback mantiene vivo al menos el SLA real.
      return (
        this.keywordFallback(userMessage) ?? {
          intent: "UNKNOWN",
          entities: {},
          requires_patient_data: false,
          requires_knowledge_base: false,
        }
      );
    }
  }

  // ─────────────────────────────────────────────────────────
  // FASE 1 (Runtime): RAG — Búsqueda en Knowledge Base
  // ─────────────────────────────────────────────────────────

  async queryKnowledgeBase(
    query: string,
    accessLevel: string,
  ): Promise<string[]> {
    try {
      // 1. Generar embedding de la pregunta usando Gemini Embedding API
      const embedding = await this.generateEmbedding(query);
      if (!embedding) return [];

      // 2. Buscar fragmentos relevantes via match_documents
      const { data, error } = await this.supabase.rpc("match_documents", {
        query_embedding: embedding,
        match_threshold: 0.65,
        match_count: 4,
        filter_access_level: accessLevel === "external" ? "external" : null,
      });

      if (error || !data || data.length === 0) {
        console.log("📚 RAG: No se encontraron documentos relevantes.");
        return [];
      }

      console.log(`📚 RAG: ${data.length} fragmentos encontrados (threshold 0.65)`);
      return data.map(
        (doc: any) =>
          `[${doc.document_title}] (similitud: ${(doc.similarity * 100).toFixed(1)}%)\n${doc.content_chunk}`,
      );
    } catch (err) {
      console.error("❌ RAG query error:", err);
      return [];
    }
  }

  private async generateEmbedding(text: string): Promise<number[] | null> {
    if (!GEMINI_API_KEY) return null;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: { parts: [{ text }] },
          }),
        },
      );

      const data = await response.json();
      return data.embedding?.values || null;
    } catch (err) {
      console.error("❌ Embedding generation error:", err);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────
  // FASE 2 (Enforcement): Regla Estricta Seshat — Institution Guard
  // ─────────────────────────────────────────────────────────

  async querySeshatWithGuard(
    intent: IntentResult,
    professional: ProfessionalContext,
  ): Promise<{ data: any | null; error: string | null }> {
    // ⛔ REGLA ESTRICTA: Si requiere datos de paciente, DEBE tener institution_id
    if (intent.requires_patient_data) {
      if (!professional.institution_id) {
        console.warn(
          `⛔ RBAC BLOCK: Dr. ${professional.name} ${professional.last_name} ` +
          `(${professional.hospital_name}) no tiene Institution_ID mapeado. Consulta abortada.`
        );
        return {
          data: null,
          error:
            `⛔ Su clínica (${professional.hospital_name}) aún no tiene un ID institucional ` +
            `configurado en Seshat. Contacte al administrador regional de AMIS para habilitar ` +
            `la integración PACS/RIS de su institución.`,
        };
      }

      // Ejecutar consulta Seshat con aislamiento institucional
      return await this.fetchSeshatData(intent, professional);
    }

    return { data: null, error: null };
  }

  private async fetchSeshatData(
    intent: IntentResult,
    professional: ProfessionalContext,
  ): Promise<{ data: any; error: string | null }> {
    // En producción, aquí se haría la llamada real a la API de Seshat
    // con el parámetro institution_id FORZOSO
    const institutionId = professional.institution_id!;
    const patientRut = intent.entities.rut;

    console.log(
      `🏥 Seshat Query: intent=${intent.intent}, institution=${institutionId}, rut=${patientRut || "N/A"}`
    );

    // MOCK: Simular respuesta de Seshat
    if (intent.intent === "STATUS_INFORME") {
      return {
        data: {
          patient_rut: patientRut || "No especificado",
          institution_id: institutionId,
          study_date: new Date().toLocaleDateString("es-CL"),
          modality: "Resonancia Magnética",
          status: "FINALIZADO",
          report_signed: true,
          radiologist: "Dr. AMIS Especialista",
          quick_view_token: crypto.randomUUID(),
        },
        error: null,
      };
    }

    if (intent.intent === "PACS_LINK") {
      return {
        data: {
          patient_rut: patientRut || "No especificado",
          institution_id: institutionId,
          viewer_url: `https://seshat.amis.global/viewer?inst=${institutionId}&token=${crypto.randomUUID()}`,
          compression: "lossless",
        },
        error: null,
      };
    }

    if (intent.intent === "REVISION") {
      return {
        data: {
          ticket_id: `REV-${Math.floor(Math.random() * 89999) + 10000}`,
          patient_rut: patientRut || "No especificado",
          institution_id: institutionId,
          priority: "Alta",
          question: intent.entities.pregunta || "Revisión general",
        },
        error: null,
      };
    }

    return { data: null, error: null };
  }

  // ─────────────────────────────────────────────────────────
  // DATOS REALES: SLA por institución (tablas reales, NO mock)
  // ─────────────────────────────────────────────────────────

  /**
   * Consulta el SLA REAL de una institución a partir de su nombre (texto libre).
   * Encadena: institutions → multiris_name_mapping → multiris_sla_config.
   * Retorna:
   *   - null                                  → institución no existe en AMIS
   *   - { institucion, no_vinculada: true }   → existe pero no está vinculada en el traductor
   *   - { institucion, reglas: [...] }        → reglas (propias + globales como fallback)
   */
  async querySlaReal(institucionNombre: string): Promise<
    | null
    | { institucion: string; no_vinculada: true }
    | { institucion: string; reglas: { tipo: string; target_minutes: number; es_global: boolean }[] }
  > {
    const termino = (institucionNombre ?? "").trim();
    if (!termino) return null;

    // 1. Resolver la institución por nombre legal o comercial.
    const { data: inst, error: instError } = await this.supabase
      .from("institutions")
      .select("id, legal_name")
      .or(`legal_name.ilike.%${termino}%,commercial_name.ilike.%${termino}%`)
      .limit(1)
      .maybeSingle();

    if (instError) {
      console.error("❌ querySlaReal institutions error:", instError);
      return null;
    }
    if (!inst) {
      console.log(`🏥 SLA: institución "${termino}" no encontrada en AMIS.`);
      return null;
    }

    const legalName = (inst.legal_name as string) ?? termino;

    // 2. Traducir la institución a su(s) código(s) RISPACS vía el traductor.
    const { data: mappings, error: mapError } = await this.supabase
      .from("multiris_name_mapping")
      .select("raw_name")
      .eq("category", "institucion")
      .eq("formal_id", inst.id);

    if (mapError) {
      console.error("❌ querySlaReal mapping error:", mapError);
      return { institucion: legalName, no_vinculada: true };
    }

    const rawNames = (mappings ?? []).map((m: any) => m.raw_name).filter(Boolean);
    if (rawNames.length === 0) {
      console.log(`🏥 SLA: "${legalName}" no está vinculada en el traductor.`);
      return { institucion: legalName, no_vinculada: true };
    }

    // 3. Reglas propias (por código RISPACS) + globales (institucion null).
    const [ownRes, globalRes] = await Promise.all([
      this.supabase
        .from("multiris_sla_config")
        .select("tipo, target_minutes")
        .in("institucion", rawNames),
      this.supabase
        .from("multiris_sla_config")
        .select("tipo, target_minutes")
        .is("institucion", null),
    ]);

    if (ownRes.error || globalRes.error) {
      console.error("❌ querySlaReal sla_config error:", ownRes.error || globalRes.error);
    }

    // 4. Merge por tipo: propia gana; global marcada con es_global=true.
    const reglas = new Map<string, { tipo: string; target_minutes: number; es_global: boolean }>();
    for (const g of (globalRes.data ?? []) as any[]) {
      reglas.set(g.tipo, { tipo: g.tipo, target_minutes: g.target_minutes, es_global: true });
    }
    for (const o of (ownRes.data ?? []) as any[]) {
      reglas.set(o.tipo, { tipo: o.tipo, target_minutes: o.target_minutes, es_global: false });
    }

    return { institucion: legalName, reglas: Array.from(reglas.values()) };
  }

  // ─────────────────────────────────────────────────────────
  // DATOS REALES: Resumen del 4° Turno (tabla real ct_turnos)
  // ─────────────────────────────────────────────────────────

  /**
   * RBAC del resumen de turno: SOLO jefatura/dirección.
   * Usa el mismo criterio de roles del sistema: la persona debe estar en
   * la tabla `professionals` (staff interno) con role admin/dirección
   * (SUPER_ADMIN/ADMIN) o clinical_role de jefatura (MED_CHIEF).
   */
  async isJefaturaTurno(chatId: number): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("professionals")
      .select("role, clinical_role")
      .eq("telegram_chat_id", chatId)
      .maybeSingle();

    if (error || !data) return false;

    const role = String((data as any).role ?? "").toUpperCase();
    const clinicalRole = String((data as any).clinical_role ?? "").toUpperCase();
    const rolesJefatura = ["SUPER_ADMIN", "ADMIN", "MANAGER", "MED_CHIEF"];

    return rolesJefatura.includes(role) || rolesJefatura.includes(clinicalRole);
  }

  /**
   * Consulta el resumen REAL del 4° Turno desde ct_turnos (NO mock).
   *  - fecha puntual          → where fecha = fecha
   *  - rango                  → where fecha >= desde and fecha <= hasta, order fecha
   *  - sin fechas             → último turno (order fecha desc, created_at desc, limit 1)
   * Retorna { turnos: [...] } o { vacio: true }.
   */
  async queryTurnoReal(params: {
    fecha?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  }): Promise<{ vacio: true } | { turnos: any[] }> {
    const cols =
      "fecha, tipo_turno, hora_inicio, hora_fin, recibidos, entregados, estabilizado, apoyo_medico_extra, observaciones";

    let query = this.supabase.from("ct_turnos").select(cols);

    if (params.fecha) {
      query = query.eq("fecha", params.fecha);
    } else if (params.fecha_desde && params.fecha_hasta) {
      query = query
        .gte("fecha", params.fecha_desde)
        .lte("fecha", params.fecha_hasta)
        .order("fecha", { ascending: true });
    } else {
      query = query
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);
    }

    const { data, error } = await query;

    console.log("📋 4° Turno:", data, "error:", error);

    if (error) {
      console.error("❌ queryTurnoReal error:", error);
      return { vacio: true };
    }
    if (!data || data.length === 0) return { vacio: true };

    return { turnos: data as any[] };
  }

  // ─────────────────────────────────────────────────────────
  // FASE 3: El Orquestador — System Prompt Builder
  // ─────────────────────────────────────────────────────────

  async buildContextPayload(
    userMessage: string,
    chatId: number,
  ): Promise<ContextPayload | { error: string }> {
    // 1. RBAC: Resolver identidad
    const professional = await this.resolveIdentity(chatId);
    if (!professional) {
      return {
        error:
          "🔒 No se ha podido verificar tu identidad. " +
          "Envía /start y comparte tu contacto para validarte.",
      };
    }

    // 2. Intent Detection
    const intent = await this.detectIntent(userMessage);
    console.log(`🎯 Intent: ${intent.intent} | Patient: ${intent.requires_patient_data} | KB: ${intent.requires_knowledge_base}`);

    // 3. Seshat Guard (RBAC estricto)
    let seshatData: any = null;
    if (intent.requires_patient_data) {
      const seshatResult = await this.querySeshatWithGuard(intent, professional);
      if (seshatResult.error) {
        return { error: seshatResult.error };
      }
      seshatData = seshatResult.data;
    }

    // 4. RAG: Knowledge Base (si aplica)
    let ragChunks: string[] = [];
    if (intent.requires_knowledge_base) {
      ragChunks = await this.queryKnowledgeBase(
        intent.entities.topic || userMessage,
        professional.access_level,
      );
    }

    // 4.b DATOS REALES: SLA de una institución (NO mock, tablas reales)
    let slaReal: Awaited<ReturnType<ContextManager["querySlaReal"]>> = null;
    let slaConsultada = false;
    if (intent.intent === "SLA_INSTITUCION") {
      slaConsultada = true;
      slaReal = await this.querySlaReal(intent.entities.institucion_nombre || userMessage);
    }

    // 4.c DATOS REALES: Resumen del 4° Turno (NO mock) — SOLO jefatura/dirección
    let turnoReal: Awaited<ReturnType<ContextManager["queryTurnoReal"]>> | null = null;
    let turnoConsultado = false;
    if (intent.intent === "RESUMEN_TURNO") {
      const autorizado = await this.isJefaturaTurno(chatId);
      if (!autorizado) {
        return {
          error:
            "📋 El resumen del 4° Turno está disponible solo para jefaturas habilitadas. " +
            "Si necesitas acceso, contacta a la dirección médica de AMIS.",
        };
      }
      turnoConsultado = true;
      turnoReal = await this.queryTurnoReal({
        fecha: intent.entities.fecha,
        fecha_desde: intent.entities.fecha_desde,
        fecha_hasta: intent.entities.fecha_hasta,
      });
    }

    // 5. Construir System Prompt dinámico
    const systemPrompt = this.assembleSystemPrompt(
      professional,
      intent,
      seshatData,
      ragChunks,
      slaReal,
      slaConsultada,
      turnoReal,
      turnoConsultado,
    );

    return { systemPrompt, intent, ragChunks, seshatData };
  }

  /** Convierte minutos a horas legibles: 60→"1h", 90→"1.5h", 1440→"24h". */
  private fmtTarget(min: number): string {
    if (min == null) return "—";
    if (min % 60 === 0) return `${min / 60}h`;
    const h = min / 60;
    return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
  }

  /** Formatea un turno de ct_turnos como línea legible para el prompt. */
  private fmtTurno(t: any): string {
    const siNo = (v: any) => (v ? "Sí" : "No");
    const horario =
      t.hora_inicio || t.hora_fin
        ? `${t.hora_inicio ?? "?"}–${t.hora_fin ?? "?"}`
        : "—";
    const recibidos = t.recibidos ?? null;
    const entregados = t.entregados ?? null;
    const pendientes =
      recibidos != null && entregados != null ? recibidos - entregados : null;

    const partes = [
      `• Fecha: ${t.fecha ?? "—"}`,
      `Tipo: ${t.tipo_turno ?? "—"}`,
      `Horario: ${horario}`,
      `Recibidos: ${recibidos ?? "—"}`,
      `Entregados: ${entregados ?? "—"}`,
      `Pendientes: ${pendientes ?? "—"}`,
      `Estabilizado: ${siNo(t.estabilizado)}`,
      `Apoyo médico extra: ${siNo(t.apoyo_medico_extra)}`,
    ];
    let linea = partes.join(" | ");
    if (t.observaciones) linea += `\n  Observaciones: ${t.observaciones}`;
    return linea;
  }

  private assembleSystemPrompt(
    professional: ProfessionalContext,
    intent: IntentResult,
    seshatData: any | null,
    ragChunks: string[],
    slaReal: Awaited<ReturnType<ContextManager["querySlaReal"]>> = null,
    slaConsultada = false,
    turnoReal: Awaited<ReturnType<ContextManager["queryTurnoReal"]>> | null = null,
    turnoConsultado = false,
  ): string {
    const sections: string[] = [];

    // ── Bloque 1: Reglas Base
    sections.push(`[REGLAS BASE]\n${BASE_RULES}`);

    // ── Bloque 2: Contexto del Usuario (RBAC)
    sections.push(
      `[CONTEXTO DEL USUARIO]\n` +
      `Estás respondiendo al Dr/Dra. ${professional.name} ${professional.last_name}.\n` +
      `Institución: ${professional.hospital_name}.\n` +
      `Nivel de acceso: ${professional.access_level}.\n` +
      `${professional.specialty ? `Especialidad: ${professional.specialty}.` : ""}` +
      `${professional.institution_id ? `\nInstitution ID Seshat: ${professional.institution_id}.` : "\n⚠️ Sin integración Seshat activa."}`,
    );

    // ── Bloque 3: Datos Seshat (si aplica)
    if (seshatData) {
      sections.push(
        `[DATOS SESHAT - INFORMACIÓN VERIFICADA]\n` +
        `Los siguientes datos provienen directamente del sistema PACS/RIS Seshat.\n` +
        `Usa esta información como fuente de verdad. NO la modifiques ni inventes datos adicionales.\n` +
        JSON.stringify(seshatData, null, 2),
      );
    }

    // ── Bloque 4: RAG Knowledge Base (si aplica)
    if (ragChunks.length > 0) {
      sections.push(
        `[INFORMACIÓN DE REFERENCIA - BASE DE CONOCIMIENTO]\n` +
        `Los siguientes fragmentos fueron recuperados de la base de conocimiento AMIS.\n` +
        `Úsalos para complementar tu respuesta, citando el documento de origen.\n\n` +
        ragChunks.join("\n\n---\n\n"),
      );
    }

    // ── Bloque 4.b: DATOS REALES de SLA (solo en intent SLA_INSTITUCION)
    if (slaConsultada) {
      if (!slaReal) {
        sections.push(
          `[DATOS REALES - SLA]\n` +
          `No se encontró ninguna institución con ese nombre en AMIS. ` +
          `Debes informar exactamente: "No tengo ese dato conectado todavía en AMIS." ` +
          `NO inventes tiempos ni nombres de instituciones.`,
        );
      } else if ("no_vinculada" in slaReal) {
        sections.push(
          `[DATOS REALES - SLA]\n` +
          `La institución "${slaReal.institucion}" existe en AMIS pero todavía NO está vinculada ` +
          `en el traductor de Stat Multiris, por lo que no hay reglas de SLA conectadas. ` +
          `Informa esto con claridad. NO inventes tiempos de entrega.`,
        );
      } else if (slaReal.reglas.length === 0) {
        sections.push(
          `[DATOS REALES - SLA]\n` +
          `La institución "${slaReal.institucion}" está vinculada pero no tiene reglas de SLA ` +
          `pactadas (ni propias ni globales). Informa esto. NO inventes tiempos de entrega.`,
        );
      } else {
        const lineas = slaReal.reglas
          .map((r) => `- ${r.tipo}: ${this.fmtTarget(r.target_minutes)}${r.es_global ? " (global)" : ""}`)
          .join("\n");
        sections.push(
          `[DATOS REALES - SLA DE ${slaReal.institucion.toUpperCase()}]\n` +
          `Estos son los SLA REALES pactados, extraídos de las tablas de AMIS. ` +
          `Son tu ÚNICA fuente de verdad para esta respuesta. NO agregues ni modifiques tipos ni tiempos.\n` +
          `Los marcados "(global)" son reglas globales por defecto (la institución no tiene una propia para ese tipo).\n\n` +
          lineas,
        );
      }
    }

    // ── Bloque 4.c: DATOS REALES del 4° Turno (solo en intent RESUMEN_TURNO)
    if (turnoConsultado) {
      if (!turnoReal || "vacio" in turnoReal) {
        sections.push(
          `[DATOS REALES - 4° TURNO]\n` +
          `No hay turnos cargados en AMIS para ese período. ` +
          `Informa esto con claridad. NO inventes datos de turnos.`,
        );
      } else {
        const turnos = turnoReal.turnos;
        const lineas = turnos.map((t) => this.fmtTurno(t)).join("\n");

        let bloque =
          `[DATOS REALES - 4° TURNO]\n` +
          `Estos son los datos REALES del 4° Turno extraídos de AMIS (ct_turnos). ` +
          `Son tu ÚNICA fuente de verdad. NO agregues ni modifiques cifras.\n\n` +
          lineas;

        // Totales cuando hay varios turnos (rango)
        if (turnos.length > 1) {
          const totalRecibidos = turnos.reduce((s, t) => s + (t.recibidos ?? 0), 0);
          const totalEntregados = turnos.reduce((s, t) => s + (t.entregados ?? 0), 0);
          bloque +=
            `\n\nTotales del período (${turnos.length} turnos): ` +
            `Recibidos: ${totalRecibidos} | Entregados: ${totalEntregados} | ` +
            `Pendientes: ${totalRecibidos - totalEntregados}`;
        }

        sections.push(bloque);
      }
    }

    // ── Bloque 5: Instrucciones de formato de respuesta
    sections.push(
      `[FORMATO DE RESPUESTA]\n` +
      `- Responde en formato Markdown compatible con Telegram.\n` +
      `- Usa *negritas* para títulos y datos clave.\n` +
      `- Usa _cursivas_ para citas y notas clínicas.\n` +
      `- Sé conciso pero completo. Máximo 500 palabras.\n` +
      `- Si incluyes links, usa formato Markdown: [texto](url).`,
    );

    return sections.join("\n\n");
  }

  // ─────────────────────────────────────────────────────────
  // Ejecutor final: Llamada a Gemini con contexto completo
  // ─────────────────────────────────────────────────────────

  async executeWithContext(
    userMessage: string,
    chatId: number,
  ): Promise<string> {
    // Construir payload de contexto
    const payload = await this.buildContextPayload(userMessage, chatId);

    // Si hubo error de RBAC o identidad
    if ("error" in payload) {
      return payload.error;
    }

    const { systemPrompt, intent } = payload;

    if (!GEMINI_API_KEY) {
      return "❌ API de Inteligencia Artificial (Gemini) no configurada.";
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userMessage }] }],
            generationConfig: {
              temperature: 0.3,
              max_output_tokens: 1500,
            },
          }),
        },
      );

      const data = await response.json();
      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "❌ No se pudo generar una respuesta.";

      console.log(
        `✅ Gemini respondió (intent: ${intent.intent}, tokens enviados: system+user)`
      );
      return text;
    } catch (err) {
      console.error("❌ Gemini execution error:", err);
      return "❌ Hubo un error al procesar tu solicitud con IA.";
    }
  }
}
