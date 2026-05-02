// ─── Tipos ────────────────────────────────────────────────────────────────────
export type Nivel = 0 | 1 | 2 | 3;
export type RespuestasMap = Record<string, Nivel>;

export interface NivelConfig {
    value: Nivel;
    label: string;
    desc: string;
    color: string;
    activeBg: string;
    border: string;
    ring: string;
}

export const NIVELES_CONFIG: NivelConfig[] = [
    { value: 0, label: 'No informa', desc: 'No realizo este procedimiento en mi práctica actual.', color: 'text-brand-text/40', activeBg: 'bg-brand-bg', border: 'border-brand-border', ring: 'ring-brand-text/20' },
    { value: 1, label: 'Básico / Urgencia', desc: 'Puedo realizarlo en contexto de urgencia o como screening básico.', color: 'text-sky-400', activeBg: 'bg-sky-950/60', border: 'border-sky-500', ring: 'ring-sky-500' },
    { value: 2, label: 'Avanzado / Estándar', desc: 'Competencia clínica completa para la práctica habitual y electiva.', color: 'text-orange-400', activeBg: 'bg-orange-950/60', border: 'border-orange-500', ring: 'ring-orange-500' },
    { value: 3, label: 'Subespecialista / Referente', desc: 'Nivel de experto. Soy referente clínico o formador en esta área.', color: 'text-amber-300', activeBg: 'bg-amber-950/60', border: 'border-amber-400', ring: 'ring-amber-400' },
];

// ─── Interfaz del Procedimiento ───────────────────────────────────────────────
export interface ProcedimientoItem {
    id: string;
    areaId: string;
    areaLabel: string;
    areaGradient: string;
    modalidadId: string;
    modalidadLabel: string;
    label: string;
}

// ─── Catálogo de Procedimientos (3 niveles) ───────────────────────────────────
export const PROCEDIMIENTOS: ProcedimientoItem[] = [
    // ── Neurorradiología ──
    { id: 'neuro_rm_std',      areaId: 'neuro', areaLabel: 'Neurorradiología',  areaGradient: 'from-violet-500 to-purple-700', modalidadId: 'rm',    modalidadLabel: 'RM',       label: 'RM Cerebro Estándar' },
    { id: 'neuro_rm_perf',     areaId: 'neuro', areaLabel: 'Neurorradiología',  areaGradient: 'from-violet-500 to-purple-700', modalidadId: 'rm',    modalidadLabel: 'RM',       label: 'RM Perfusión / Difusión (DWI/PWI)' },
    { id: 'neuro_rm_columna',  areaId: 'neuro', areaLabel: 'Neurorradiología',  areaGradient: 'from-violet-500 to-purple-700', modalidadId: 'rm',    modalidadLabel: 'RM',       label: 'RM Columna Vertebral' },
    { id: 'neuro_tc_simple',   areaId: 'neuro', areaLabel: 'Neurorradiología',  areaGradient: 'from-violet-500 to-purple-700', modalidadId: 'tc',    modalidadLabel: 'TC',       label: 'TC Cerebro Simple (Urgencia)' },
    { id: 'neuro_tc_angio',    areaId: 'neuro', areaLabel: 'Neurorradiología',  areaGradient: 'from-violet-500 to-purple-700', modalidadId: 'tc',    modalidadLabel: 'AngioTC',  label: 'AngioTC Cerebral (ACV / Aneurisma)' },
    { id: 'neuro_us_dtc',      areaId: 'neuro', areaLabel: 'Neurorradiología',  areaGradient: 'from-violet-500 to-purple-700', modalidadId: 'us',    modalidadLabel: 'US',       label: 'Doppler Transcraneal (DTC)' },

    // ── Cabeza y Cuello ──
    { id: 'cc_us_tiroides',    areaId: 'cabeza', areaLabel: 'Cabeza y Cuello',  areaGradient: 'from-sky-500 to-blue-700',     modalidadId: 'us',    modalidadLabel: 'US',       label: 'US Tiroides y Paratiroides' },
    { id: 'cc_us_doppler',     areaId: 'cabeza', areaLabel: 'Cabeza y Cuello',  areaGradient: 'from-sky-500 to-blue-700',     modalidadId: 'us',    modalidadLabel: 'US',       label: 'Doppler Carotídeo y Vertebral' },
    { id: 'cc_tc_senos',       areaId: 'cabeza', areaLabel: 'Cabeza y Cuello',  areaGradient: 'from-sky-500 to-blue-700',     modalidadId: 'tc',    modalidadLabel: 'TC',       label: 'TC Senos Paranasales / Macizo Facial' },
    { id: 'cc_tc_cuello',      areaId: 'cabeza', areaLabel: 'Cabeza y Cuello',  areaGradient: 'from-sky-500 to-blue-700',     modalidadId: 'tc',    modalidadLabel: 'TC',       label: 'TC Cuello c/Contraste' },
    { id: 'cc_rm_cuello',      areaId: 'cabeza', areaLabel: 'Cabeza y Cuello',  areaGradient: 'from-sky-500 to-blue-700',     modalidadId: 'rm',    modalidadLabel: 'RM',       label: 'RM Cuello / Laringe / Órbitas' },

    // ── Tórax ──
    { id: 'torax_rx_pa',       areaId: 'torax', areaLabel: 'Tórax',             areaGradient: 'from-teal-500 to-cyan-700',    modalidadId: 'rx',    modalidadLabel: 'Rx',       label: 'Rx Tórax PA / Lateral' },
    { id: 'torax_rx_uci',      areaId: 'torax', areaLabel: 'Tórax',             areaGradient: 'from-teal-500 to-cyan-700',    modalidadId: 'rx',    modalidadLabel: 'Rx',       label: 'Rx Tórax Portátil (UCI / UTI)' },
    { id: 'torax_tc_std',      areaId: 'torax', areaLabel: 'Tórax',             areaGradient: 'from-teal-500 to-cyan-700',    modalidadId: 'tc',    modalidadLabel: 'TC',       label: 'TC Tórax c/Contraste' },
    { id: 'torax_tc_angio',    areaId: 'torax', areaLabel: 'Tórax',             areaGradient: 'from-teal-500 to-cyan-700',    modalidadId: 'tc',    modalidadLabel: 'AngioTC',  label: 'AngioTC Pulmonar (TEP)' },
    { id: 'torax_tacar',       areaId: 'torax', areaLabel: 'Tórax',             areaGradient: 'from-teal-500 to-cyan-700',    modalidadId: 'tc',    modalidadLabel: 'TC-AR',    label: 'TACAR (Alta Resolución / ILD)' },

    // ── Abdomen / Pelvis ──
    { id: 'abd_us_abdominal',  areaId: 'abdomen', areaLabel: 'Abdomen / Pelvis', areaGradient: 'from-green-500 to-emerald-700', modalidadId: 'us',   modalidadLabel: 'US',      label: 'US Abdominal Completo' },
    { id: 'abd_us_pelviano',   areaId: 'abdomen', areaLabel: 'Abdomen / Pelvis', areaGradient: 'from-green-500 to-emerald-700', modalidadId: 'us',   modalidadLabel: 'US',      label: 'US Pelviano / Transvaginal' },
    { id: 'abd_us_doppler',    areaId: 'abdomen', areaLabel: 'Abdomen / Pelvis', areaGradient: 'from-green-500 to-emerald-700', modalidadId: 'us',   modalidadLabel: 'US',      label: 'Doppler Abdominal (Portal / Renal)' },
    { id: 'abd_tc_trifasico',  areaId: 'abdomen', areaLabel: 'Abdomen / Pelvis', areaGradient: 'from-green-500 to-emerald-700', modalidadId: 'tc',   modalidadLabel: 'TC',      label: 'TC Abdomen Trifásico (Hígado / Oncológico)' },
    { id: 'abd_tc_entero',     areaId: 'abdomen', areaLabel: 'Abdomen / Pelvis', areaGradient: 'from-green-500 to-emerald-700', modalidadId: 'tc',   modalidadLabel: 'TC',      label: 'TC Enterocolonografía' },
    { id: 'abd_tc_uro',        areaId: 'abdomen', areaLabel: 'Abdomen / Pelvis', areaGradient: 'from-green-500 to-emerald-700', modalidadId: 'tc',   modalidadLabel: 'TC',      label: 'Urografía TC (URO-TC)' },
    { id: 'abd_rm_higado',     areaId: 'abdomen', areaLabel: 'Abdomen / Pelvis', areaGradient: 'from-green-500 to-emerald-700', modalidadId: 'rm',   modalidadLabel: 'RM',      label: 'RM Hígado (Hepatocarcinoma / Colangiocarcinoma)' },
    { id: 'abd_rm_pelvis',     areaId: 'abdomen', areaLabel: 'Abdomen / Pelvis', areaGradient: 'from-green-500 to-emerald-700', modalidadId: 'rm',   modalidadLabel: 'RM',      label: 'RM Pelvis / Próstata / Recto' },

    // ── MSK ──
    { id: 'msk_rx_ext',        areaId: 'msk', areaLabel: 'Músculo-Esquelético', areaGradient: 'from-amber-500 to-orange-700', modalidadId: 'rx',    modalidadLabel: 'Rx',      label: 'Rx Extremidades y Articulaciones' },
    { id: 'msk_rx_columna',    areaId: 'msk', areaLabel: 'Músculo-Esquelético', areaGradient: 'from-amber-500 to-orange-700', modalidadId: 'rx',    modalidadLabel: 'Rx',      label: 'Rx Columna (Escoliosis / Métricas)' },
    { id: 'msk_us_articular',  areaId: 'msk', areaLabel: 'Músculo-Esquelético', areaGradient: 'from-amber-500 to-orange-700', modalidadId: 'us',    modalidadLabel: 'US',      label: 'US Articular / Tendinoso' },
    { id: 'msk_us_partes',     areaId: 'msk', areaLabel: 'Músculo-Esquelético', areaGradient: 'from-amber-500 to-orange-700', modalidadId: 'us',    modalidadLabel: 'US',      label: 'US Partes Blandas / Guía Procedimientos' },
    { id: 'msk_rm_rodilla',    areaId: 'msk', areaLabel: 'Músculo-Esquelético', areaGradient: 'from-amber-500 to-orange-700', modalidadId: 'rm',    modalidadLabel: 'RM',      label: 'RM Rodilla' },
    { id: 'msk_rm_hombro',     areaId: 'msk', areaLabel: 'Músculo-Esquelético', areaGradient: 'from-amber-500 to-orange-700', modalidadId: 'rm',    modalidadLabel: 'RM',      label: 'RM Hombro' },
    { id: 'msk_rm_columna',    areaId: 'msk', areaLabel: 'Músculo-Esquelético', areaGradient: 'from-amber-500 to-orange-700', modalidadId: 'rm',    modalidadLabel: 'RM',      label: 'RM Columna MSK (Discopatía / Canal)' },

    // ── Mama ──
    { id: 'mama_rx_screening', areaId: 'mama', areaLabel: 'Mama',              areaGradient: 'from-rose-500 to-pink-700',    modalidadId: 'rx',    modalidadLabel: 'Mx',       label: 'Mamografía Bilateral Screening' },
    { id: 'mama_rx_diag',      areaId: 'mama', areaLabel: 'Mama',              areaGradient: 'from-rose-500 to-pink-700',    modalidadId: 'rx',    modalidadLabel: 'Mx',       label: 'Mamografía Diagnóstica + Magnificación' },
    { id: 'mama_tomo',         areaId: 'mama', areaLabel: 'Mama',              areaGradient: 'from-rose-500 to-pink-700',    modalidadId: 'tomo',  modalidadLabel: 'Tomosíntesis', label: 'Tomosíntesis Bilateral (3D Mammography)' },
    { id: 'mama_us',           areaId: 'mama', areaLabel: 'Mama',              areaGradient: 'from-rose-500 to-pink-700',    modalidadId: 'us',    modalidadLabel: 'US',       label: 'US Mamario + Doppler Color' },
    { id: 'mama_bx_us',        areaId: 'mama', areaLabel: 'Mama',              areaGradient: 'from-rose-500 to-pink-700',    modalidadId: 'us',    modalidadLabel: 'Intervencionismo', label: 'Biopsia Core US-guiada' },
    { id: 'mama_rm',           areaId: 'mama', areaLabel: 'Mama',              areaGradient: 'from-rose-500 to-pink-700',    modalidadId: 'rm',    modalidadLabel: 'RM',       label: 'RM Mama con Contraste (BIRADS-MRI)' },
    { id: 'mama_bx_este',      areaId: 'mama', areaLabel: 'Mama',              areaGradient: 'from-rose-500 to-pink-700',    modalidadId: 'rx',    modalidadLabel: 'Intervencionismo', label: 'Biopsia Estereotáxica (Calcificaciones)' },

    // ── Pediátrica ──
    { id: 'ped_rx_general',    areaId: 'pediatrica', areaLabel: 'Radiología Pediátrica', areaGradient: 'from-fuchsia-500 to-indigo-700', modalidadId: 'rx', modalidadLabel: 'Rx', label: 'Rx Pediátrico General (edad-dosis)' },
    { id: 'ped_us_caderas',    areaId: 'pediatrica', areaLabel: 'Radiología Pediátrica', areaGradient: 'from-fuchsia-500 to-indigo-700', modalidadId: 'us', modalidadLabel: 'US', label: 'US Caderas Neonato (Método Graf)' },
    { id: 'ped_us_craneo',     areaId: 'pediatrica', areaLabel: 'Radiología Pediátrica', areaGradient: 'from-fuchsia-500 to-indigo-700', modalidadId: 'us', modalidadLabel: 'US', label: 'US Craneal Transfontanelar' },
    { id: 'ped_us_abdominal',  areaId: 'pediatrica', areaLabel: 'Radiología Pediátrica', areaGradient: 'from-fuchsia-500 to-indigo-700', modalidadId: 'us', modalidadLabel: 'US', label: 'US Abdominal Pediátrico (Piloro / Invaginación)' },
    { id: 'ped_tc_bajadosis',  areaId: 'pediatrica', areaLabel: 'Radiología Pediátrica', areaGradient: 'from-fuchsia-500 to-indigo-700', modalidadId: 'tc', modalidadLabel: 'TC', label: 'TC Pediátrico (Protocolo Bajo Dosis)' },
    { id: 'ped_rm_cerebro',    areaId: 'pediatrica', areaLabel: 'Radiología Pediátrica', areaGradient: 'from-fuchsia-500 to-indigo-700', modalidadId: 'rm', modalidadLabel: 'RM', label: 'RM Cerebro Pediátrico (Malformaciones / Epilepsia)' },
];
