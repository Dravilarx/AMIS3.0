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
    accession_number: string | null;
    paciente_id: string | null;
    paciente_nombre: string | null;
    examen_nombre: string | null;
    id_informe: string | null;
    id_risexamen: string | null;
    raw_json: any;
}

export const parseMultirisExcel = async (file: File): Promise<MultirisRecord[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });

                // Only process the 'MULTIRIS' sheet as requested
                const targetKey = 'MULTIRIS';
                let allJsonData: any[] = [];

                console.log('📊 Hojas encontradas en el archivo:', workbook.SheetNames);

                const multirisSheetName = workbook.SheetNames.find(name =>
                    name.toUpperCase().trim().includes(targetKey)
                );

                if (multirisSheetName) {
                    const worksheet = workbook.Sheets[multirisSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    console.log(`✅ Hoja "${multirisSheetName}" => ${jsonData.length} filas capturadas`);

                    if (jsonData.length > 0) {
                        console.log('   Columnas:', Object.keys(jsonData[0] as any).join(', '));
                    }

                    allJsonData = jsonData.map((row: any) => ({
                        ...row,
                        _source_sheet: multirisSheetName.toUpperCase().trim()
                    }));
                } else {
                    console.error('❌ No se encontró la pestaña "MULTIRIS" en el archivo.');
                }

                console.log(`📊 Total registros consolidados: ${allJsonData.length}`);

                const records: MultirisRecord[] = allJsonData.map((row: any) => {
                    // Normalize column names based on user provided list
                    return {
                        modalidad: row['Modalidad'] || row['modalidad'] || '',
                        tipo: row['Tipo'] || row['tipo'] || '',
                        fecha_examen: row['Fecha Examen'] || row['fecha_examen'] || null,
                        fecha_asignacion: row['Fecha Asignación'] || row['fecha_asignacion'] || null,
                        fecha_validacion: row['Fecha Validación'] || row['fecha_validacion'] || null,
                        aetitle: row['Aetitle'] || row['aetitle'] || '',
                        radiologo_asignado: row['Radiologo Asignado'] || row['radiologo_asignado'] || '',
                        radiologo_informado: row['Radiologo Informado'] || row['radiologo_informado'] || '',
                        radiologo_validado: row['Radiologo Validado'] || row['radiologo_validado'] || '',
                        addendum_text: row['Text Adenddum'] || row['text_adenddum'] || null,
                        has_addendum: (() => {
                            const val = row['Text Adenddum'] || row['text_adenddum'];
                            return !!val && val.toString().trim().length > 0 && val.toString().toUpperCase() !== 'NULL';
                        })(),
                        accession_number: String(row['#Acc'] || row['accession_number'] || ''),
                        paciente_id: String(row['IdPaciente'] || row['id_paciente'] || ''),
                        paciente_nombre: row['Paciente'] || row['paciente'] || '',
                        examen_nombre: row['Examen'] || row['examen'] || '',
                        id_informe: String(row['IDINFORME'] || row['id_informe'] || ''),
                        id_risexamen: String(row['id_risexamen'] || ''),
                        raw_json: row
                    };
                });
                resolve(records);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

export const getConsolidatedStats = async (startDate?: string | null, endDate?: string | null) => {
    let allData: any[] = [];
    let from = 0;
    const batchSize = 1000; // Match Supabase default limit
    let keepFetching = true;

    while (keepFetching) {
        let query = supabase
            .from('stats_consolidated')
            .select('*')
            .order('fecha_reporte', { ascending: false })
            .range(from, from + batchSize - 1);

        // Add a dummy filter as cache buster if needed, but Supabase usually handles this well
        // query = query.neq('id', '00000000-0000-0000-0000-000000000000'); 

        if (startDate) {
            query = query.gte('fecha_reporte', startDate);
        }
        if (endDate) {
            query = query.lte('fecha_reporte', endDate);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
            allData = [...allData, ...data];
            // If we got exactly the batch size, there might be more
            if (data.length === batchSize) {
                from += batchSize;
            } else {
                keepFetching = false;
            }
        } else {
            keepFetching = false;
        }

        // Safety break
        if (from >= 100000) keepFetching = false;
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
            // Ensure default SLAs for these institutions
            for (const inst of uniqueInstitutions) {
                await supabase.rpc('ensure_institutional_slas', { p_institucion: inst });
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

        // 4. Batch insert individual production data
        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize).map(r => ({
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

        // 6. Upsert in stats_consolidated
        const consolidatedData = Array.from(consolidatedMap.values()).map(item => ({
            fecha_reporte: item.fecha_reporte,
            institucion: item.institucion,
            medico: item.medico,
            modalidad: item.modalidad,
            tipo_paciente: item.tipo_paciente,
            cantidad_examenes: item.cantidad_examenes,
            tat_promedio_minutos: item.tat_total_minutos / item.cantidad_examenes,
            cantidad_adendas: item.cantidad_adendas,
            cantidad_dentro_sla: item.cantidad_dentro_sla
        }));

        const { error: upsertError } = await supabase
            .from('stats_consolidated')
            .upsert(consolidatedData, {
                onConflict: 'fecha_reporte, institucion, medico, modalidad, tipo_paciente'
            });

        if (upsertError) throw upsertError;

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

