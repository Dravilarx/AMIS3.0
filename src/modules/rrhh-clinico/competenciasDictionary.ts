export type Nivel = 0 | 1 | 2 | 3;
export type RespuestasMap = Record<string, Nivel>;

export interface ProcedimientoDict {
    id: string;          // Único. Si es compartido entre áreas, mismo ID = 1 sola respuesta en BD
    nombre: string;
    modalidad: string;
}

export interface CategoriaDict {
    id: string;
    nombre: string;
    gradient: string;
    procedimientos: ProcedimientoDict[];
}

export const NIVELES_CONFIG = [
    { value: 0 as Nivel, label: 'No informa',               desc: 'No realizo este procedimiento en mi práctica.',          color: 'text-zinc-400',   border: 'border-zinc-600',   ring: 'ring-zinc-500',   bg: 'bg-zinc-900/40'   },
    { value: 1 as Nivel, label: 'Básico / Urgencia',        desc: 'Lo realizo en urgencia o como screening básico.',       color: 'text-sky-400',    border: 'border-sky-500',    ring: 'ring-sky-500',    bg: 'bg-sky-950/50'    },
    { value: 2 as Nivel, label: 'Avanzado / Estándar',      desc: 'Competencia completa para práctica habitual y electiva.',color: 'text-teal-400', border: 'border-teal-500', ring: 'ring-teal-500', bg: 'bg-orange-950/50' },
    { value: 3 as Nivel, label: 'Subespecialista/Referente',desc: 'Nivel de experto. Referente clínico o formador.',       color: 'text-amber-300',  border: 'border-amber-400',  ring: 'ring-amber-400',  bg: 'bg-amber-950/50'  },
] as const;

export const CATEGORIAS: CategoriaDict[] = [
    {
        id: 'neuro', nombre: 'Neurorradiología', gradient: 'from-violet-600 to-purple-800',
        procedimientos: [
            { id: 'rm_cerebro_std',      nombre: 'RM Cerebro Estándar',                     modalidad: 'RM'       },
            { id: 'rm_cerebro_dce',      nombre: 'RM Cerebro c/Contraste (DCE)',             modalidad: 'RM'       },
            { id: 'rm_cerebro_dwi',      nombre: 'RM Difusión / Perfusión (DWI/PWI)',        modalidad: 'RM'       },
            { id: 'rm_espectroscopia',   nombre: 'RM Espectroscopía Cerebral',               modalidad: 'RM'       },
            { id: 'angiorm_cerebral',    nombre: 'AngioRM Cerebral (TOF/CE)',                modalidad: 'AngioRM'  },
            { id: 'rm_columna_cervical', nombre: 'RM Columna Cervical',                      modalidad: 'RM'       }, // shared MSK
            { id: 'rm_columna_dorsal',   nombre: 'RM Columna Dorsal',                        modalidad: 'RM'       }, // shared MSK
            { id: 'rm_columna_lumbar',   nombre: 'RM Columna Lumbar',                        modalidad: 'RM'       }, // shared MSK
            { id: 'tc_cerebro_simple',   nombre: 'TC Cerebro Simple (Urgencia)',             modalidad: 'TC'       },
            { id: 'tc_cerebro_cte',      nombre: 'TC Cerebro c/Contraste',                   modalidad: 'TC'       },
            { id: 'angiotc_cerebral',    nombre: 'AngioTC Cerebral (ACV/Aneurisma)',         modalidad: 'AngioTC'  },
            { id: 'doppler_transcraneal',nombre: 'Doppler Transcraneal (DTC)',               modalidad: 'US'       }, // shared Vascular
        ],
    },
    {
        id: 'cabeza', nombre: 'Cabeza, Cuello y Maxilofacial', gradient: 'from-sky-500 to-blue-700',
        procedimientos: [
            { id: 'us_tiroides',         nombre: 'US Tiroides y Paratiroides',               modalidad: 'US'       },
            { id: 'us_glandulas_sal',    nombre: 'US Parótidas / Glándulas Salivales',        modalidad: 'US'       },
            { id: 'doppler_carotideo',   nombre: 'Doppler Carotídeo y Vertebral',            modalidad: 'US'       }, // shared Vascular
            { id: 'tc_senos',            nombre: 'TC Senos Paranasales',                     modalidad: 'TC'       },
            { id: 'tc_macizo_facial',    nombre: 'TC Macizo Facial',                         modalidad: 'TC'       },
            { id: 'tc_cuello',           nombre: 'TC Cuello c/Contraste',                    modalidad: 'TC'       },
            { id: 'tc_orbitas',          nombre: 'TC Órbitas',                               modalidad: 'TC'       },
            { id: 'tc_penascos',         nombre: 'TC Oídos / Peñascos (Temporal)',           modalidad: 'TC'       },
            { id: 'tc_atm',              nombre: 'TC ATM (Articulación Temporomandibular)',  modalidad: 'TC'       },
            { id: 'rm_cuello',           nombre: 'RM Cuello / Laringe',                      modalidad: 'RM'       },
            { id: 'rm_orbitas',          nombre: 'RM Órbitas / Nervio Óptico',              modalidad: 'RM'       },
            { id: 'rm_penascos',         nombre: 'RM Oídos / Peñascos',                     modalidad: 'RM'       },
            { id: 'rm_atm',              nombre: 'RM ATM Bilateral',                         modalidad: 'RM'       },
        ],
    },
    {
        id: 'torax', nombre: 'Tórax y Cardiovascular', gradient: 'from-teal-500 to-cyan-700',
        procedimientos: [
            { id: 'rx_torax_std',        nombre: 'Rx Tórax PA / Lateral',                   modalidad: 'Rx'       },
            { id: 'rx_torax_portatil',   nombre: 'Rx Tórax Portátil (UCI/UTI)',             modalidad: 'Rx'       },
            { id: 'tc_torax_std',        nombre: 'TC Tórax c/Contraste',                    modalidad: 'TC'       },
            { id: 'tc_torax_ld',         nombre: 'TC Tórax Baja Dosis (Screening Pulmón)',  modalidad: 'TC'       },
            { id: 'tacar',               nombre: 'TACAR / Alta Resolución (ILD)',            modalidad: 'TC-AR'    },
            { id: 'angiotc_pulmonar',    nombre: 'AngioTC Pulmonar (TEP)',                  modalidad: 'AngioTC'  },
            { id: 'angiotc_aorta',       nombre: 'AngioTC Aorta Torácica/Abdominal',        modalidad: 'AngioTC'  }, // shared Vascular
            { id: 'rm_cardiaca',         nombre: 'RM Cardíaca (Función/Viabilidad)',        modalidad: 'RM'       },
            { id: 'rm_mediastino',       nombre: 'RM Mediastino / Timo',                    modalidad: 'RM'       },
            { id: 'us_pleural',          nombre: 'US Pleural / Guía Toracocentesis',         modalidad: 'US'       },
        ],
    },
    {
        id: 'abdomen', nombre: 'Abdomen y Pelvis', gradient: 'from-green-500 to-emerald-700',
        procedimientos: [
            { id: 'us_abdominal',        nombre: 'US Abdominal Completo',                   modalidad: 'US'       },
            { id: 'us_pelviano',         nombre: 'US Pelviano Suprapúbico',                 modalidad: 'US'       },
            { id: 'us_transvaginal',     nombre: 'US Transvaginal',                          modalidad: 'US'       },
            { id: 'us_renal',            nombre: 'US Renal y Vías Urinarias',               modalidad: 'US'       },
            { id: 'us_testicular',       nombre: 'US Testicular + Doppler',                  modalidad: 'US'       },
            { id: 'doppler_abdominal',   nombre: 'Doppler Abdominal (Portal / Hepático)',   modalidad: 'US'       }, // shared Vascular
            { id: 'tc_abdomen_std',      nombre: 'TC Abdomen c/Contraste (Diagnóstico)',    modalidad: 'TC'       },
            { id: 'tc_abdomen_tri',      nombre: 'TC Abdomen Trifásico (Oncológico)',       modalidad: 'TC'       },
            { id: 'tc_enterocolono',     nombre: 'TC Enterocolonografía',                   modalidad: 'TC'       },
            { id: 'tc_urografia',        nombre: 'Urografía TC (URO-TC)',                   modalidad: 'TC'       },
            { id: 'rm_higado',           nombre: 'RM Hígado / CPRM Biliar',                modalidad: 'RM'       },
            { id: 'rm_pancreas',         nombre: 'RM Páncreas',                             modalidad: 'RM'       },
            { id: 'rm_pelvis',           nombre: 'RM Pelvis Femenina',                      modalidad: 'RM'       },
            { id: 'rm_prostata',         nombre: 'RM Próstata Multiparamétrica',            modalidad: 'RM'       },
            { id: 'rm_enterografia',     nombre: 'RM Enterografía (Enfermedad Inflamatoria)',modalidad: 'RM'       },
        ],
    },
    {
        id: 'msk', nombre: 'MSK (Músculo-Esquelético)', gradient: 'from-amber-500 to-teal-700',
        procedimientos: [
            { id: 'rx_ext_general',      nombre: 'Rx Extremidades y Articulaciones',        modalidad: 'Rx'       },
            { id: 'rx_columna_msk',      nombre: 'Rx Columna (Escoliosis / Métricas)',      modalidad: 'Rx'       },
            { id: 'us_hombro',           nombre: 'US Hombro (Manguito Rotador)',            modalidad: 'US'       },
            { id: 'us_codo',             nombre: 'US Codo (Epicóndilo / Tendones)',         modalidad: 'US'       },
            { id: 'us_muneca',           nombre: 'US Muñeca / Mano',                        modalidad: 'US'       },
            { id: 'us_cadera_msk',       nombre: 'US Cadera (Adulto)',                      modalidad: 'US'       },
            { id: 'us_rodilla',          nombre: 'US Rodilla (Meniscos / Ligamentos)',      modalidad: 'US'       },
            { id: 'us_tobillo',          nombre: 'US Tobillo / Pie (Tendón Aquiles)',       modalidad: 'US'       },
            { id: 'us_partes_blandas',   nombre: 'US Partes Blandas / Guía Procedimientos',modalidad: 'US'       },
            { id: 'tc_articulaciones',   nombre: 'TC Articulaciones (Trauma Complejo)',     modalidad: 'TC'       },
            { id: 'rm_hombro',           nombre: 'RM Hombro',                               modalidad: 'RM'       },
            { id: 'rm_codo',             nombre: 'RM Codo',                                 modalidad: 'RM'       },
            { id: 'rm_muneca',           nombre: 'RM Muñeca / Mano',                        modalidad: 'RM'       },
            { id: 'rm_cadera',           nombre: 'RM Cadera',                               modalidad: 'RM'       },
            { id: 'rm_rodilla',          nombre: 'RM Rodilla',                              modalidad: 'RM'       },
            { id: 'rm_tobillo',          nombre: 'RM Tobillo / Pie',                        modalidad: 'RM'       },
            { id: 'rm_columna_cervical', nombre: 'RM Columna Cervical',                     modalidad: 'RM'       }, // shared Neuro
            { id: 'rm_columna_dorsal',   nombre: 'RM Columna Dorsal',                       modalidad: 'RM'       }, // shared Neuro
            { id: 'rm_columna_lumbar',   nombre: 'RM Columna Lumbar',                       modalidad: 'RM'       }, // shared Neuro
        ],
    },
    {
        id: 'vascular', nombre: 'Vascular y Doppler', gradient: 'from-red-500 to-rose-700',
        procedimientos: [
            { id: 'doppler_carotideo',   nombre: 'Doppler Carotídeo y Vertebral',           modalidad: 'US'       }, // shared Cabeza
            { id: 'doppler_transcraneal',nombre: 'Doppler Transcraneal (DTC)',               modalidad: 'US'       }, // shared Neuro
            { id: 'doppler_mmss_art',    nombre: 'Doppler MMSS Arterial',                   modalidad: 'US'       },
            { id: 'doppler_mmss_ven',    nombre: 'Doppler MMSS Venoso (TVS/TVP)',           modalidad: 'US'       },
            { id: 'doppler_mmii_art',    nombre: 'Doppler MMII Arterial (isquemia)',        modalidad: 'US'       },
            { id: 'doppler_mmii_ven',    nombre: 'Doppler MMII Venoso (TVP)',               modalidad: 'US'       },
            { id: 'doppler_renal',       nombre: 'Doppler Renal (Estenosis A. Renal)',      modalidad: 'US'       },
            { id: 'doppler_abdominal',   nombre: 'Doppler Portal / Abdominal',              modalidad: 'US'       }, // shared Abdomen
            { id: 'doppler_testicular',  nombre: 'Doppler Testicular (Torsión)',            modalidad: 'US'       },
            { id: 'angiotc_aorta',       nombre: 'AngioTC Aorta / Endovascular',            modalidad: 'AngioTC'  }, // shared Tórax
            { id: 'angiotc_miembros',    nombre: 'AngioTC Miembros (EEMM)',                 modalidad: 'AngioTC'  },
            { id: 'angiorm_periferica',  nombre: 'AngioRM Periférica',                      modalidad: 'AngioRM'  },
        ],
    },
    {
        id: 'mama', nombre: 'Mama', gradient: 'from-rose-500 to-pink-700',
        procedimientos: [
            { id: 'mx_screening',        nombre: 'Mamografía Bilateral Screening',          modalidad: 'Mx'            },
            { id: 'mx_diagnostica',      nombre: 'Mamografía Diagnóstica + Magnificación',  modalidad: 'Mx'            },
            { id: 'tomosintesis',        nombre: 'Tomosíntesis Bilateral (3D Mammography)', modalidad: 'Tomosíntesis'  },
            { id: 'us_mamario',          nombre: 'US Mamario + Doppler Color',              modalidad: 'US'            },
            { id: 'rm_mama',             nombre: 'RM Mama c/Contraste (BI-RADS MRI)',      modalidad: 'RM'            },
            { id: 'bx_us_mama',          nombre: 'Biopsia Core US-guiada (Mama)',          modalidad: 'Intervencionismo'},
            { id: 'bx_estereo',          nombre: 'Biopsia Estereotáxica (Calcificaciones)',modalidad: 'Intervencionismo'},
            { id: 'galactografia',       nombre: 'Galactografía',                           modalidad: 'Mx'            },
            { id: 'marcaje_arpon',       nombre: 'Marcaje / Arpón Preoperatorio',           modalidad: 'Intervencionismo'},
        ],
    },
    {
        id: 'pediatrica', nombre: 'Radiología Pediátrica', gradient: 'from-fuchsia-500 to-indigo-700',
        procedimientos: [
            { id: 'rx_pediatrico',       nombre: 'Rx Pediátrico General (protocolos dosis)',modalidad: 'Rx'       },
            { id: 'rx_esqueleto',        nombre: 'Rx Esqueleto Completo / Edad Ósea',      modalidad: 'Rx'       },
            { id: 'us_caderas_graf',     nombre: 'US Caderas Neonato (Método Graf)',        modalidad: 'US'       },
            { id: 'us_transfontanelar',  nombre: 'US Craneal Transfontanelar',              modalidad: 'US'       },
            { id: 'us_abdominal_ped',    nombre: 'US Abdominal Pediátrico (Piloro/Invag)', modalidad: 'US'       },
            { id: 'tc_pediatrico',       nombre: 'TC Pediátrico Protocolo Bajo Dosis',     modalidad: 'TC'       },
            { id: 'rm_cerebro_ped',      nombre: 'RM Cerebro Pediátrico (Malformac./Epil)',modalidad: 'RM'       },
            { id: 'rm_pediatrico_gral',  nombre: 'RM Pediátrico General (Body/MSK)',       modalidad: 'RM'       },
        ],
    },
];

// ─── Lista plana deduplicada (para el Wizard: 1 pregunta por ID único) ─────────
export const PROCEDIMIENTOS_FLAT = (() => {
    const seen = new Set<string>();
    const flat: Array<ProcedimientoDict & { categoriaId: string; categoriaNombre: string; categoriaGradient: string }> = [];
    for (const cat of CATEGORIAS) {
        for (const proc of cat.procedimientos) {
            if (!seen.has(proc.id)) {
                seen.add(proc.id);
                flat.push({ ...proc, categoriaId: cat.id, categoriaNombre: cat.nombre, categoriaGradient: cat.gradient });
            }
        }
    }
    return flat;
})();
