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

                // Keywords to match sheet names flexibly (case-insensitive, partial match)
                const targetKeywords = ['MULTIRIS', 'MUTIRIS', 'HDC', 'SORAN'];
                let allJsonData: any[] = [];

                console.log('📊 Hojas encontradas en el archivo:', workbook.SheetNames);

                // Extract data from target sheets using flexible matching
                workbook.SheetNames.forEach(name => {
                    const normalizedName = name.toUpperCase().trim();
                    const isTarget = targetKeywords.some(keyword => normalizedName.includes(keyword));

                    if (isTarget) {
                        const worksheet = workbook.Sheets[name];
                        const jsonData = XLSX.utils.sheet_to_json(worksheet);
                        console.log(`✅ Hoja "${name}" => ${jsonData.length} filas capturadas`);
                        if (jsonData.length > 0) {
                            console.log('   Columnas:', Object.keys(jsonData[0] as any).join(', '));
                        }
                        const rowsWithSource = jsonData.map((row: any) => ({ ...row, _source_sheet: normalizedName }));
                        allJsonData = [...allJsonData, ...rowsWithSource];
                    } else {
                        console.log(`⏭️ Hoja "${name}" ignorada (no coincide con keywords)`);
                    }
                });

                // Fallback: if no specific sheets found, use ALL sheets
                if (allJsonData.length === 0 && workbook.SheetNames.length > 0) {
                    console.warn('⚠️ Ninguna hoja reconocida. Importando TODAS las hojas como fallback.');
                    workbook.SheetNames.forEach(name => {
                        const worksheet = workbook.Sheets[name];
                        const jsonData = XLSX.utils.sheet_to_json(worksheet);
                        console.log(`📄 Fallback: Hoja "${name}" => ${jsonData.length} filas`);
                        const rowsWithSource = jsonData.map((row: any) => ({ ...row, _source_sheet: name.toUpperCase().trim() }));
                        allJsonData = [...allJsonData, ...rowsWithSource];
                    });
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
                        has_addendum: !!(row['Text Adenddum'] || row['text_adenddum']),
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

export const getConsolidatedStats = async () => {
    const { data, error } = await supabase
        .from('stats_consolidated')
        .select('*')
        .order('fecha_reporte', { ascending: false });

    if (error) throw error;
    return data;
};

export const getSlaConfigs = async () => {
    const { data, error } = await supabase
        .from('multiris_sla_config')
        .select('*')
        .order('institucion', { ascending: true, nullsFirst: true });

    if (error) throw error;
    return data;
};

export const saveSlaConfig = async (config: { id?: string, institucion: string | null, modalidad: string, tipo: string, target_minutes: number }) => {
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
        const uniqueDoctors = Array.from(new Set(records.map(r => r.radiologo_validado).filter(Boolean)));

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
            const key = `${c.modalidad}|${c.tipo}`;
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
            const key = `${dateKey}|${r.aetitle}|${r.radiologo_validado}|${r.modalidad}|${r.tipo}`;

            let tatMinutes = 0;
            if (r.fecha_asignacion && r.fecha_validacion) {
                const start = new Date(r.fecha_asignacion).getTime();
                const end = new Date(r.fecha_validacion).getTime();
                tatMinutes = Math.max(0, (end - start) / (1000 * 60));
            }

            // SLA Lookup: Specific Institutional -> Global -> Default 24h
            const modTipoKey = `${r.modalidad}|${r.tipo}`;
            const instKey = `${r.aetitle}|${modTipoKey}`;
            const targetSla = institutionalSlaMap.get(instKey) || globalSlaMap.get(modTipoKey) || 1440;

            const isWithinSla = tatMinutes <= targetSla;

            const existing = consolidatedMap.get(key) || {
                fecha_reporte: dateKey,
                institucion: r.aetitle,
                medico: r.radiologo_validado,
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

export const getMultirisStats = async () => {
    const { data, error } = await supabase
        .from('multiris_production')
        .select('*')
        .order('fecha_validacion', { ascending: false });

    if (error) throw error;
    return data;
};
