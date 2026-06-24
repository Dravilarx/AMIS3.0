// ============================================================
// AMIS 3.0 · Sugeridor de Equivalencias (motor Stat Multiris)
// Propone la institución formal para un nombre crudo del RISPACS.
// SIEMPRE propone — nunca aplica solo. El humano confirma.
// Pegar en src/modules/stat-multiris/multirisService.ts
// ============================================================

export interface InstitutionLite {
  id: string;
  institution_code: string;
  legal_name: string | null;
  commercial_name: string | null;
  city: string | null;
  institution_type: string | null;
}

export interface MatchSuggestion {
  institution_id: string;
  institution_code: string;
  legal_name: string;
  confidence: 'ALTA' | 'MEDIA';
  reason: string; // palabra que gatilló el match (para mostrar al usuario)
}

const norm = (s: string | null | undefined): string =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .toUpperCase()
    .trim();

// Palabras genéricas que NO distinguen una institución de otra
const STOP = new Set([
  'HOSPITAL', 'CLINICA', 'CENTRO', 'MEDICO', 'MEDICA', 'SALUD', 'ANDES',
  'DEL', 'LOS', 'LAS', 'SPA', 'SAR', 'BIOBIO', 'IMAGENES', 'IMAGEN',
  'AVANZADAS', 'CLINICO', 'GRUPO', 'RADIOLOGICO', 'AMIS', 'SAN', 'REGIONAL',
]);

// Sufijos de ruido típicos del código RISPACS
const NOISE = ['PACS', 'IM', 'MR', 'RM', 'RIS', 'RX'];

const cleanRaw = (raw: string): string => {
  let r = norm(raw).replace(/\d+$/, ''); // números al final
  for (const n of NOISE) {
    if (r.endsWith(n) && r.length > n.length + 2) r = r.slice(0, -n.length);
  }
  return r;
};

// Pista de tipo por la primera letra del código (H=Hospital, S=SAR, C/I=Centro)
const typeHint = (raw: string): string | null => {
  const r = norm(raw);
  if (r.startsWith('H')) return 'HOSPITAL';
  if (r.startsWith('S')) return 'SAR';
  if (r.startsWith('C') || r.startsWith('I')) return 'CENTRO';
  return null;
};

const instType = (i: InstitutionLite): string => {
  const t = norm(i.institution_type) + ' ' + norm(i.legal_name);
  if (t.includes('HOSPITAL')) return 'HOSPITAL';
  if (t.includes('SAR') || t.includes('BIOBIO')) return 'SAR';
  if (t.includes('CLINICA') || t.includes('CENTRO')) return 'CENTRO';
  return 'OTRO';
};

// keywords distintivas con peso: nombre/comercial fuerte, ciudad débil
const buildKeywords = (
  i: InstitutionLite,
  cityCount: Map<string, number>
): Map<string, number> => {
  const kws = new Map<string, number>();
  const add = (val: string | null, w: number) => {
    for (const tok of norm(val).split(/[^A-Z0-9]+/)) {
      if (tok.length >= 4 && !STOP.has(tok)) {
        kws.set(tok, Math.max(kws.get(tok) ?? 0, w));
      }
    }
  };
  add(i.commercial_name, 1.5);
  add(i.legal_name, 1.5);
  const city = norm(i.city);
  const cityW = (cityCount.get(city) ?? 1) <= 1 ? 0.7 : 0.3; // ciudad compartida = más débil
  add(i.city, cityW);
  return kws;
};

const COVERAGE_MIN = 0.55; // el match debe cubrir >=55% del crudo (anti-subcadena: evita LOTA⊂QUILLOTA)

const bestKeyword = (
  rawc: string,
  kws: Map<string, number>
): { score: number; why: string } => {
  let score = 0;
  let why = '';
  for (const [kw, wt] of kws) {
    for (let L = kw.length; L >= 4; L--) {
      if (rawc.includes(kw.slice(0, L))) {
        const coverage = L / Math.max(rawc.length, 1);
        if (coverage >= COVERAGE_MIN && L * wt > score) {
          score = L * wt;
          why = kw;
        }
        break;
      }
    }
  }
  return { score, why };
};

/**
 * Propone la mejor institución para un nombre crudo, o null si no hay match confiable.
 * NO guarda nada: solo sugiere. El usuario confirma y recién ahí se llama saveNameMapping.
 */
export const suggestInstitutionMatch = (
  rawName: string,
  institutions: InstitutionLite[]
): MatchSuggestion | null => {
  const cityCount = new Map<string, number>();
  for (const i of institutions) {
    const c = norm(i.city);
    if (c) cityCount.set(c, (cityCount.get(c) ?? 0) + 1);
  }

  const rawc = cleanRaw(rawName);
  const hint = typeHint(rawName);

  const candidates = institutions
    .map((i) => {
      const { score, why } = bestKeyword(rawc, buildKeywords(i, cityCount));
      if (score <= 0) return null;
      let s = score;
      const it = instType(i);
      if (hint && it === hint) s += 2;          // coincide el tipo (Hospital/SAR/Centro)
      else if (hint && it !== 'OTRO' && it !== hint) s -= 1.5; // conflicto de tipo
      return { score: s, why, inst: i };
    })
    .filter((x): x is { score: number; why: string; inst: InstitutionLite } => x !== null)
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) return null;

  const top = candidates[0];
  const margin = top.score - (candidates[1]?.score ?? 0);

  let confidence: 'ALTA' | 'MEDIA' | null = null;
  if (top.score >= 7 && margin >= 1) confidence = 'ALTA';
  else if (top.score >= 5.5) confidence = 'MEDIA';
  if (!confidence) return null;

  return {
    institution_id: top.inst.id,
    institution_code: top.inst.institution_code,
    legal_name: top.inst.legal_name ?? top.inst.institution_code,
    confidence,
    reason: top.why,
  };
};