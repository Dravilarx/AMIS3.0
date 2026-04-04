import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';

export interface MultirisRecord {
    modalidad: string;
    tipo: string;
    fecha_examen: string | null;
    fecha_asignacion: string | null;
    fecha_validacion: string | null;
    aetitle: string;
    radiologo_asignado: string;
    radiologo_informado: string;
    radiologo_validado: string;
    addendum_text: string | null;
    has_addendum: boolean;
    status?: 'PENDING_INFO' | 'PENDING_CENTER_ACTION' | 'VALIDATED' | 'INFORMED';
    pending_reason?: 'Examen incompleto' | 'Faltan antecedentes' | 'Faltan previos' | 'Prestación incorrecta' | 'Otra' | null;
    pending_message?: string | null;
    pending_author_name?: string | null;
    is_priority?: boolean;
    accession_number: string | null;
    paciente_id: string | null;
    paciente_nombre: string | null;
    examen_nombre: string | null;
    external_patient_id?: string | null;
    patient_id_source?: 'RUT' | 'NUM_COBRE' | 'EXTERNAL_ID';
    id_informe: string | null;
    id_risexamen: string | null;
    raw_json: any;
    id?: string;
}

const normalizeKey = (str: string) => {
    return String(str)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .toLowerCase()
        .trim();
};

export const parseMultirisExcel = async (file: File): Promise<MultirisRecord[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });

                let allJsonData: any[] = [];

                console.log('📊 Hojas encontradas en el archivo:', workbook.SheetNames);

                if (workbook.SheetNames.length === 0) {
                    reject(new Error('El archivo no contiene ninguna hoja válida.'));
                    return;
                }

                for (const sheetName of workbook.SheetNames) {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    
                    if (jsonData.length > 0) {
                        console.log(`✅ Procesando hoja "${sheetName}" => ${jsonData.length} filas capturadas`);
                        const mappedData = jsonData.map((row: any) => ({
                            ...row,
                            _source_sheet: sheetName.toUpperCase().trim()
                        }));
                        allJsonData = [...allJsonData, ...mappedData];
                    } else {
                        console.log(`⚠️ Hoja "${sheetName}" ignorada (sin datos).`);
                    }
                }

                if (allJsonData.length === 0) {
                    reject(new Error('El archivo excel se leyó correctamente pero no se encontraron filas de datos en las hojas.'));
                    return;
                }

                console.log(`📊 Total registros iniciales: ${allJsonData.length}`);

                const getVal = (row: any, aliases: string[], defaultValue: any = null) => {
                    const rowKeys = Object.keys(row);
                    for (const alias of aliases) {
                        const normAlias = normalizeKey(alias);
                        const match = rowKeys.find(k => normalizeKey(k) === normAlias);
                        if (match && row[match] !== undefined && row[match] !== null && String(row[match]).trim() !== '') {
                            return row[match];
                        }
                    }
                    return defaultValue;
                };

                const parseDateVal = (val: any): string | null => {
                    if (!val) return null;
                    if (val instanceof Date) {
                        if (isNaN(val.getTime())) return null;
                        return val.toISOString();
                    }
                    if (typeof val === 'string') {
                        const str = val.trim();
                        if (!str) return null;
                        
                        // Parsear manualmente DD-MM-YYYY o DD/MM/YYYY
                        const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
                        if (dmyMatch) {
                            const [, day, month, year, hh, mm, ss] = dmyMatch;
                            const hour = hh || '00';
                            const minute = mm || '00';
                            const second = ss || '00';
                            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
                        }
                        return str;
                    }
                    return String(val);
                };

                const records: MultirisRecord[] = allJsonData.map((row: any) => {
                    const addendaText = getVal(row, ['Text Adenddum', 'Texto Adenda', 'Adenda', 'Texto Adendum', 'Texto del Adendum', 'Text Adendum']);
                    return {
                        modalidad: getVal(row, ['Modalidad', 'Mod'], ''),
                        tipo: getVal(row, ['Tipo', 'Tipo Paciente', 'Atencion', 'Tipo atencion'], ''),
                        fecha_examen: parseDateVal(getVal(row, ['Fecha Examen', 'Fecha de Examen', 'Fecha Estudio', 'Fecha'], null)),
                        fecha_asignacion: parseDateVal(getVal(row, ['Fecha Asignación', 'Fecha de Asignacion', 'F. Asignacion'], null)),
                        fecha_validacion: parseDateVal(getVal(row, ['Fecha Validación', 'Fecha de Validacion', 'F. Validacion', 'Validacion'], null)),
                        aetitle: getVal(row, ['Aetitle', 'AE Title', 'Institucion', 'Centro', 'Sede'], ''),
                        radiologo_asignado: getVal(row, ['Radiologo Asignado', 'Medico Asignado', 'Asignado a', 'Asignado'], ''),
                        radiologo_informado: getVal(row, ['Radiologo Informado', 'Medico Informante', 'Informado por', 'Informante', 'Radiologo que Informa'], ''),
                        radiologo_validado: getVal(row, ['Radiologo Validado', 'Medico Validador', 'Validado por', 'Validador'], ''),
                        addendum_text: addendaText,
                        has_addendum: !!addendaText && String(addendaText).toUpperCase() !== 'NULL',
                        accession_number: String(getVal(row, ['#Acc', 'Accession Number', 'Nro Accession', 'Acc', 'Accession'], '')),
                        paciente_id: String(getVal(row, ['IdPaciente', 'Id Paciente', 'Rut Paciente', 'Rut'], '')),
                        paciente_nombre: getVal(row, ['Paciente', 'Nombre Paciente', 'Nombre'], ''),
                        examen_nombre: getVal(row, ['Examen', 'Nombre Examen', 'Estudio', 'Descripcion', 'Procedimiento'], ''),
                        id_informe: String(getVal(row, ['IDINFORME', 'Id Informe', 'Nro Informe'], '')),
                        id_risexamen: String(getVal(row, ['id_risexamen', 'ID Ris Examen', 'Ris Examen', 'idrisexamen'], '')),
                        status: 'PENDING_INFO',
                        pending_reason: null,
                        pending_message: null,
                        pending_author_name: null,
                        is_priority: false,
                        raw_json: row
                    };
                });
                
                // Excluir registros vacíos (sin access number ni validación)
                const validRecords = records.filter(r => r.accession_number || r.fecha_validacion || r.radiologo_informado);
                resolve(validRecords);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

export const getConsolidatedStats = async (startDate?: string | null, endDate?: string | null) => {
    const batchSize = 1000;
    
    // 1. Obtener el count total primero
    let countQuery = supabase
        .from('stats_consolidated')
        .select('*', { count: 'exact', head: true });

    if (startDate) countQuery = countQuery.gte('fecha_reporte', startDate);
    if (endDate) countQuery = countQuery.lte('fecha_reporte', endDate);

    const { count, error: countError } = await countQuery;
    if (countError) throw countError;
    if (!count || count === 0) return [];

    // Limitar safety break general
    const totalRecords = Math.min(count, 1000000); 
    const totalPages = Math.ceil(totalRecords / batchSize);
    const promises = [];

    // 2. Preparar todas las promesas de las páginas
    for (let i = 0; i < totalPages; i++) {
        let query = supabase
            .from('stats_consolidated')
            .select('*')
            .order('fecha_reporte', { ascending: false })
            .range(i * batchSize, (i + 1) * batchSize - 1);

        if (startDate) query = query.gte('fecha_reporte', startDate);
        if (endDate) query = query.lte('fecha_reporte', endDate);

        promises.push(query);
    }

    let allData: any[] = [];
    const concurrency = 15; // Ráfagas de 15 peticiones en paralelo

    // 3. Ejecutar las peticiones por lotes (throttle)
    for (let i = 0; i < promises.length; i += concurrency) {
        const chunk = promises.slice(i, i + concurrency);
        const responses = await Promise.all(chunk);
        
        for (const res of responses) {
            if (res.error) throw res.error;
            if (res.data) {
                allData.push(...res.data);
            }
        }
    }

    return allData;
};

export const getSlaConfigs = async () => {
    const { data, error } = await supabase
        .from('multiris_sla_config')
        .select('*')
        .order('institucion', { ascending: true, nullsFirst: true });

    if (error) throw error;
    return data;
};

export const saveSlaConfig = async (config: { id?: string, institucion: string | null, modalidad: string | null, tipo: string, target_minutes: number }) => {
    const { data, error } = await supabase
        .from('multiris_sla_config')
        .upsert(config, { onConflict: 'institucion, modalidad, tipo' })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteSlaConfig = async (id: string) => {
    const { error } = await supabase
        .from('multiris_sla_config')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// --- Name Mapping / Equivalence Functions ---

export const getNameMappings = async (category?: 'institucion' | 'medico') => {
    let query = supabase.from('multiris_name_mapping').select('*');
    if (category) query = query.eq('category', category);

    const { data, error } = await query.order('raw_name', { ascending: true });
    if (error) throw error;
    return data;
};

export const saveNameMapping = async (mapping: { id: string, formal_name: string, formal_id?: string | null }) => {
    const { data, error } = await supabase
        .from('multiris_name_mapping')
        .update({
            formal_name: mapping.formal_name,
            formal_id: mapping.formal_id
        })
        .eq('id', mapping.id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const uploadMultirisData = async (records: MultirisRecord[], filename: string) => {
    // 1. Create upload record
    const { data: upload, error: uploadError } = await supabase
        .from('multiris_uploads')
        .insert([{ filename, total_rows: records.length, status: 'processing' }])
        .select()
        .single();

    if (uploadError) throw uploadError;

    try {
        // 2. Auto-Discovery & Equivalence
        const uniqueInstitutions = Array.from(new Set(records.map(r => r.aetitle).filter(Boolean)));
        const uniqueDoctors = Array.from(new Set(records.map(r => r.radiologo_informado).filter(Boolean)));

        // Ensure mappings exist (Discovery)
        if (uniqueInstitutions.length > 0) {
            await supabase.rpc('ensure_multiris_mappings', { p_category: 'institucion', p_names: uniqueInstitutions });
            // Ensure default SLAs for these institutions using parallel execution chunks
            const chunkSize = 20;
            for (let i = 0; i < uniqueInstitutions.length; i += chunkSize) {
                const chunk = uniqueInstitutions.slice(i, i + chunkSize);
                await Promise.all(chunk.map(inst => supabase.rpc('ensure_institutional_slas', { p_institucion: inst })));
            }
        }
        if (uniqueDoctors.length > 0) {
            await supabase.rpc('ensure_multiris_mappings', { p_category: 'medico', p_names: uniqueDoctors });
        }

        // 3. Fetch all SLA configurations (Institutional first, then global)
        const { data: allSlaConfigs } = await supabase.from('multiris_sla_config').select('*');
        const institutionalSlaMap = new Map<string, number>();
        const globalSlaMap = new Map<string, number>();

        allSlaConfigs?.forEach(c => {
            const modality = c.modalidad || 'TODAS';
            const key = `${modality}|${c.tipo}`;
            if (c.institucion) {
                institutionalSlaMap.set(`${c.institucion}|${key}`, c.target_minutes);
            } else {
                globalSlaMap.set(key, c.target_minutes);
            }
        });

        // 4. Batch insert individual production data - Lotes reducidos para evitar statement timeout
        const pBatchSize = 500;
        for (let i = 0; i < records.length; i += pBatchSize) {
            const batch = records.slice(i, i + pBatchSize).map(r => ({
                ...r,
                upload_id: upload.id
            }));

            const { error: insertError } = await supabase
                .from('multiris_production')
                .insert(batch);

            if (insertError) throw insertError;
        }

        // 5. Consolidate stats
        const consolidatedMap = new Map<string, any>();

        records.forEach(r => {
            if (!r.fecha_validacion) return;

            const dateKey = new Date(r.fecha_validacion).toISOString().split('T')[0];
            const key = `${dateKey}|${r.aetitle}|${r.radiologo_informado}|${r.modalidad}|${r.tipo}`;

            let tatMinutes = 0;
            if (r.fecha_asignacion && r.fecha_validacion) {
                const start = new Date(r.fecha_asignacion).getTime();
                const end = new Date(r.fecha_validacion).getTime();
                tatMinutes = Math.max(0, (end - start) / (1000 * 60));
            }

            // --- INTUITION SLA LOOKUP PERFORMANCE MATRIX ---
            // 1. Specific: Inst + Mod + Tipo
            // 2. Mid: Inst + TODAS + Tipo
            // 3. Fallback: 60 min (1h)
            //
            // Agrupación de tipos para SLA:
            //   M (Mutual) → busca SLA de U (Urgencia)
            //   UPC, UTI   → busca SLA de H (Hospitalizado)
            //   ONC        → busca SLA propio de ONC
            const TIPO_SLA_GROUP: Record<string, string> = {
                'M': 'U',
                'UPC': 'H',
                'UTI': 'H',
            };
            const slaLookupTipo = TIPO_SLA_GROUP[r.tipo] || r.tipo;

            const findSla = () => {
                const k1 = `${r.aetitle}|${r.modalidad}|${slaLookupTipo}`;
                if (institutionalSlaMap.has(k1)) return institutionalSlaMap.get(k1);

                const k2 = `${r.aetitle}|TODAS|${slaLookupTipo}`;
                if (institutionalSlaMap.has(k2)) return institutionalSlaMap.get(k2);

                return 60; // Default 1h (60 min)
            };

            const targetSla = findSla() || 60;
            const isWithinSla = tatMinutes <= targetSla;

            const existing = consolidatedMap.get(key) || {
                fecha_reporte: dateKey,
                institucion: r.aetitle,
                medico: r.radiologo_informado,
                modalidad: r.modalidad,
                tipo_paciente: r.tipo,
                cantidad_examenes: 0,
                tat_total_minutos: 0,
                cantidad_adendas: 0,
                cantidad_dentro_sla: 0
            };

            existing.cantidad_examenes += 1;
            existing.tat_total_minutos += tatMinutes;
            if (r.has_addendum) existing.cantidad_adendas += 1;
            if (isWithinSla) existing.cantidad_dentro_sla += 1;

            consolidatedMap.set(key, existing);
        });

        // 6. Upsert in stats_consolidated (Chunked to avoid payload size limit)
        const consolidatedDataList = Array.from(consolidatedMap.values()).map(item => ({
            fecha_reporte: item.fecha_reporte,
            institucion: item.institucion,
            medico: item.medico,
            modalidad: item.modalidad,
            tipo_paciente: item.tipo_paciente,
            cantidad_examenes: item.cantidad_examenes,
            tat_promedio_minutos: item.cantidad_examenes > 0 ? (item.tat_total_minutos / item.cantidad_examenes) : 0,
            cantidad_adendas: item.cantidad_adendas,
            cantidad_dentro_sla: item.cantidad_dentro_sla
        }));

        const cBatchSize = 500;
        for (let i = 0; i < consolidatedDataList.length; i += cBatchSize) {
            const batch = consolidatedDataList.slice(i, i + cBatchSize);
            const { error: upsertError } = await supabase
                .from('stats_consolidated')
                .upsert(batch, {
                    onConflict: 'fecha_reporte, institucion, medico, modalidad, tipo_paciente'
                });

            if (upsertError) throw upsertError;
        }

        // 7. Mark as completed
        await supabase.from('multiris_uploads').update({ status: 'completed' }).eq('id', upload.id);
        return upload.id;

    } catch (error) {
        console.error('Upload error details:', error);
        await supabase.from('multiris_uploads').update({ status: 'error' }).eq('id', upload.id);
        throw error;
    }
};

// --- Purge and Management ---

export const deleteProductionData = async () => {
    // Purgar datos de producción y estadísticas consolidadas
    const { error: err1 } = await supabase.from('multiris_production').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err1) throw err1;

    const { error: err2 } = await supabase.from('stats_consolidated').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err2) throw err2;

    return { success: true };
};

export const getMultirisStats = async () => {
    const { data, error } = await supabase
        .from('multiris_production')
        .select('*')
        .order('fecha_validacion', { ascending: false });

    if (error) throw error;
    return data;
};

// --- Grupos de Médicos ---

export interface MedicoGroup {
    id?: string;
    nombre: string;
    descripcion?: string;
    lider?: string;
    miembros: string[];
    color?: string;
    created_at?: string;
    updated_at?: string;
}

export const getGruposMedicos = async (): Promise<MedicoGroup[]> => {
    const { data, error } = await supabase
        .from('stat_multiris_grupos')
        .select('*')
        .order('nombre');
    if (error) throw error;
    return data || [];
};

export const saveGrupoMedico = async (grupo: MedicoGroup): Promise<MedicoGroup> => {
    if (grupo.id) {
        const { data, error } = await supabase
            .from('stat_multiris_grupos')
            .update({
                nombre: grupo.nombre,
                descripcion: grupo.descripcion || null,
                lider: grupo.lider || null,
                miembros: grupo.miembros,
                color: grupo.color || '#f97316'
            })
            .eq('id', grupo.id)
            .select()
            .single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase
            .from('stat_multiris_grupos')
            .insert({
                nombre: grupo.nombre,
                descripcion: grupo.descripcion || null,
                lider: grupo.lider || null,
                miembros: grupo.miembros,
                color: grupo.color || '#f97316'
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    }
};

export const deleteGrupoMedico = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('stat_multiris_grupos')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

// --- Flujo de Pendientes por Centro (B2B) ---

export const setPendingCenterAction = async (params: {
    reportId: string,
    reason: MultirisRecord['pending_reason'],
    message: string,
    authorName: string, // Nombre resuelto vía signatureUtils
    // Datos adicionales para el dispatch de alertas
    patientRut?: string,
    patientName?: string,
    examName?: string,
    accessionNumber?: string,
    centerAetitle?: string,
    authorClinicalRole?: string,
    authorSupervisorName?: string,
}) => {
    const { error } = await supabase
        .from('multiris_production')
        .update({
            status: 'PENDING_CENTER_ACTION',
            pending_reason: params.reason,
            pending_message: params.message,
            pending_author_name: params.authorName,
            // Al pasar a PENDING_CENTER_ACTION el SLA se congela en la lógica de UI
            updated_at: new Date().toISOString()
        })
        .eq('id', params.reportId);

    if (error) throw error;

    // Disparar alerta automática al centro B2B
    try {
        await supabase.functions.invoke('dispatch-global-alerts', {
            body: {
                alert_type: 'PENDING_CENTER_ACTION',
                report_id: params.reportId,
                patient_rut: params.patientRut,
                patient_name: params.patientName,
                exam_name: params.examName,
                accession_number: params.accessionNumber,
                center_aetitle: params.centerAetitle,
                pending_reason: params.reason,
                pending_message: params.message,
                author_name: params.authorName,
                author_clinical_role: params.authorClinicalRole,
                author_supervisor_name: params.authorSupervisorName,
            }
        });
        console.log('📡 Alerta PENDING_CENTER_ACTION despachada');
    } catch (dispatchErr) {
        console.error('⚠️ Error despachando alerta (no bloqueante):', dispatchErr);
    }

    return { success: true };
};

export const resolveCenterAction = async (reportId: string) => {
    const { error } = await supabase
        .from('multiris_production')
        .update({
            status: 'PENDING_INFO',
            pending_reason: null,
            pending_message: null,
            pending_author_name: null,
            is_priority: true, // Hereda prioridad alta
            fecha_asignacion: new Date().toISOString(), // Reinicia SLA de asignación
            updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

    if (error) throw error;
    return { success: true };
};

