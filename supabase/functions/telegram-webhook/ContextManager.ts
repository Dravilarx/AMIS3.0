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
}

export interface IntentResult {
  intent:
    | "STATUS_INFORME"
    | "PACS_LINK"
    | "INTERCONSULTA"
    | "REVISION"
    | "PROTOCOLO"
    | "MANUAL"
    | "UNKNOWN";
  entities: {
    rut?: string;
    examen_id?: string;
    pregunta?: string;
    topic?: string;
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
Eres AMIS, el asistente clínico inteligente de Seshat (plataforma PACS/RIS).
Responde SIEMPRE en español clínico profesional. NUNCA inventas datos médicos.
Si no tienes información suficiente, di explícitamente que no la tienes.
NO generes diagnósticos. Solo reportas lo que existe en los sistemas.
Mantén un tono respetuoso, directo, y adaptado a profesionales de salud.
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

  async detectIntent(userMessage: string): Promise<IntentResult> {
    if (!GEMINI_API_KEY) {
      return {
        intent: "UNKNOWN",
        entities: {},
        requires_patient_data: false,
        requires_knowledge_base: false,
      };
    }

    const intentPrompt = `Eres un clasificador de intenciones clínicas. Analiza el mensaje y devuelve JSON estricto.

Intenciones disponibles:
- STATUS_INFORME: Consultar estado/resultado de un examen o informe de un paciente
- PACS_LINK: Solicitar visor de imágenes DICOM
- INTERCONSULTA: Abrir canal de consulta con radiólogo
- REVISION: Solicitar revisión/ampliación de informe existente
- PROTOCOLO: Preguntas sobre protocolos clínicos, manuales, guías o procedimientos
- MANUAL: Preguntas sobre uso de la plataforma, funcionalidades AMIS/Seshat
- UNKNOWN: No clasificable

Reglas:
- requires_patient_data = true SOLO si el intent necesita datos de un paciente específico (STATUS_INFORME, PACS_LINK, REVISION)
- requires_knowledge_base = true SOLO si la pregunta es sobre protocolos, manuales o procedimientos (PROTOCOLO, MANUAL)
- Extrae el RUT si lo menciona, normalizado sin puntos (xxxxxxxx-x)

Responde SOLO con JSON puro:
{
  "intent": "...",
  "entities": { "rut": "...", "examen_id": "...", "pregunta": "...", "topic": "..." },
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
      return JSON.parse(rawJson) as IntentResult;
    } catch (err) {
      console.error("❌ Intent detection error:", err);
      return {
        intent: "UNKNOWN",
        entities: {},
        requires_patient_data: false,
        requires_knowledge_base: false,
      };
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

    // 5. Construir System Prompt dinámico
    const systemPrompt = this.assembleSystemPrompt(
      professional,
      intent,
      seshatData,
      ragChunks,
    );

    return { systemPrompt, intent, ragChunks, seshatData };
  }

  private assembleSystemPrompt(
    professional: ProfessionalContext,
    intent: IntentResult,
    seshatData: any | null,
    ragChunks: string[],
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
