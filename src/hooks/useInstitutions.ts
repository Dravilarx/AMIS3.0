import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type {
    Institution,
    InstitutionContact,
    InstitutionContract,
    ContractSLARule,
    InstitutionActivity,
} from '../types/institutions';

// ── Helpers de mapeo DB → TS ───────────────────────────────────────────

const mapInstitution = (row: any): Institution => ({
    id: row.id,
    legalName: row.legal_name,
    commercialName: row.commercial_name,
    rut: row.rut,
    address: row.address,
    city: row.city,
    region: row.region,
    sector: row.sector,
    institutionType: row.institution_type,
    criticality: row.criticality,
    isActive: row.is_active,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    activeContracts: row.active_contracts_count,
    totalContracts: row.total_contracts_count,
});

const mapContact = (row: any): InstitutionContact => ({
    id: row.id,
    institutionId: row.institution_id,
    fullName: row.full_name,
    position: row.position,
    department: row.department,
    email: row.email,
    phone: row.phone,
    mobile: row.mobile,
    isPrimary: row.is_primary,
    hierarchyLevel: row.hierarchy_level,
    createdAt: row.created_at,
});

const mapContract = (row: any): InstitutionContract => {
    const endDate = new Date(row.end_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
        id: row.id,
        institutionId: row.institution_id,
        tenderId: row.tender_id,
        contractName: row.contract_name,
        contractNumber: row.contract_number,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
        pricingStructure: row.pricing_structure || {},
        coveredProcedures: row.covered_procedures || [],
        excludedProcedures: row.excluded_procedures || [],
        paymentTerms: row.payment_terms,
        totalValue: Number(row.total_value),
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        daysUntilExpiry,
    };
};

const mapSLARule = (row: any): ContractSLARule => ({
    id: row.id,
    contractId: row.contract_id,
    category: row.category,
    maxHours: row.max_hours,
    minHours: row.min_hours,
    description: row.description,
    createdAt: row.created_at,
});

const mapActivity = (row: any): InstitutionActivity => ({
    id: row.id,
    institutionId: row.institution_id,
    eventType: row.event_type,
    title: row.title,
    description: row.description,
    eventDate: row.event_date,
    registeredBy: row.registered_by,
    attachments: row.attachments || [],
    createdAt: row.created_at,
});

// ── Hook Principal ─────────────────────────────────────────────────────

export const useInstitutions = () => {
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── Fetch All ──
    const fetchInstitutions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: err } = await supabase
                .from('institutions')
                .select('*')
                .order('legal_name');

            if (err) throw err;

            // Fetch contract counts per institution
            const { data: contractsData } = await supabase
                .from('institution_contracts')
                .select('institution_id, status');

            const contractCounts: Record<string, { active: number; total: number }> = {};
            (contractsData || []).forEach((c: any) => {
                if (!contractCounts[c.institution_id]) {
                    contractCounts[c.institution_id] = { active: 0, total: 0 };
                }
                contractCounts[c.institution_id].total++;
                if (c.status === 'active') contractCounts[c.institution_id].active++;
            });

            const mapped = (data || []).map((row: any) => ({
                ...mapInstitution(row),
                activeContracts: contractCounts[row.id]?.active || 0,
                totalContracts: contractCounts[row.id]?.total || 0,
            }));

            setInstitutions(mapped);
        } catch (err: any) {
            console.error('Error fetching institutions:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Fetch Detail ──
    const fetchInstitutionDetail = useCallback(async (id: string) => {
        const [instRes, contactsRes, contractsRes, activityRes] = await Promise.all([
            supabase.from('institutions').select('*').eq('id', id).single(),
            supabase.from('institution_contacts').select('*').eq('institution_id', id).order('hierarchy_level'),
            supabase.from('institution_contracts').select('*').eq('institution_id', id).order('end_date', { ascending: false }),
            supabase.from('institution_activity_log').select('*').eq('institution_id', id).order('event_date', { ascending: false }),
        ]);

        if (instRes.error) throw instRes.error;

        // Fetch SLA rules for all contracts
        const contractIds = (contractsRes.data || []).map((c: any) => c.id);
        let slaRules: ContractSLARule[] = [];
        if (contractIds.length > 0) {
            const { data: slaData } = await supabase
                .from('contract_sla_rules')
                .select('*')
                .in('contract_id', contractIds);
            slaRules = (slaData || []).map(mapSLARule);
        }

        const contracts = (contractsRes.data || []).map((c: any) => ({
            ...mapContract(c),
            slaRules: slaRules.filter(s => s.contractId === c.id),
        }));

        return {
            ...mapInstitution(instRes.data),
            contacts: (contactsRes.data || []).map(mapContact),
            contracts,
            activeContracts: contracts.filter(c => c.status === 'active').length,
            totalContracts: contracts.length,
            activityLog: (activityRes.data || []).map(mapActivity),
        };
    }, []);

    // ── CRUD Institución ──
    const addInstitution = useCallback(async (inst: Partial<Institution>) => {
        const { error } = await supabase.from('institutions').insert([{
            legal_name: inst.legalName,
            commercial_name: inst.commercialName,
            rut: inst.rut,
            address: inst.address,
            city: inst.city,
            region: inst.region,
            sector: inst.sector || 'salud',
            institution_type: inst.institutionType || 'privado',
            criticality: inst.criticality || 'media',
            is_active: inst.isActive ?? true,
            notes: inst.notes,
        }]);
        if (!error) fetchInstitutions();
        return { success: !error, error };
    }, [fetchInstitutions]);

    const updateInstitution = useCallback(async (id: string, inst: Partial<Institution>) => {
        const updates: Record<string, any> = { updated_at: new Date().toISOString() };
        if (inst.legalName !== undefined) updates.legal_name = inst.legalName;
        if (inst.commercialName !== undefined) updates.commercial_name = inst.commercialName;
        if (inst.rut !== undefined) updates.rut = inst.rut;
        if (inst.address !== undefined) updates.address = inst.address;
        if (inst.city !== undefined) updates.city = inst.city;
        if (inst.region !== undefined) updates.region = inst.region;
        if (inst.sector !== undefined) updates.sector = inst.sector;
        if (inst.institutionType !== undefined) updates.institution_type = inst.institutionType;
        if (inst.criticality !== undefined) updates.criticality = inst.criticality;
        if (inst.isActive !== undefined) updates.is_active = inst.isActive;
        if (inst.notes !== undefined) updates.notes = inst.notes;

        const { error } = await supabase.from('institutions').update(updates).eq('id', id);
        if (!error) fetchInstitutions();
        return { success: !error, error };
    }, [fetchInstitutions]);

    const deleteInstitution = useCallback(async (id: string) => {
        const { error } = await supabase.from('institutions').delete().eq('id', id);
        if (!error) fetchInstitutions();
        return { success: !error, error };
    }, [fetchInstitutions]);

    // ── CRUD Contactos ──
    const addContact = useCallback(async (contact: Partial<InstitutionContact>) => {
        const { error } = await supabase.from('institution_contacts').insert([{
            institution_id: contact.institutionId,
            full_name: contact.fullName,
            position: contact.position,
            department: contact.department,
            email: contact.email,
            phone: contact.phone,
            mobile: contact.mobile,
            is_primary: contact.isPrimary ?? false,
            hierarchy_level: contact.hierarchyLevel ?? 1,
        }]);
        return { success: !error, error };
    }, []);

    const removeContact = useCallback(async (contactId: string) => {
        const { error } = await supabase.from('institution_contacts').delete().eq('id', contactId);
        return { success: !error, error };
    }, []);

    // ── CRUD Contratos ──
    const addContract = useCallback(async (contract: Partial<InstitutionContract>) => {
        const { error } = await supabase.from('institution_contracts').insert([{
            institution_id: contract.institutionId,
            tender_id: contract.tenderId || null,
            contract_name: contract.contractName,
            contract_number: contract.contractNumber,
            start_date: contract.startDate,
            end_date: contract.endDate,
            status: contract.status || 'active',
            pricing_structure: contract.pricingStructure || {},
            covered_procedures: contract.coveredProcedures || [],
            excluded_procedures: contract.excludedProcedures || [],
            payment_terms: contract.paymentTerms,
            total_value: contract.totalValue || 0,
            notes: contract.notes,
        }]);
        return { success: !error, error };
    }, []);

    const updateContract = useCallback(async (id: string, contract: Partial<InstitutionContract>) => {
        const updates: Record<string, any> = { updated_at: new Date().toISOString() };
        if (contract.contractName !== undefined) updates.contract_name = contract.contractName;
        if (contract.contractNumber !== undefined) updates.contract_number = contract.contractNumber;
        if (contract.startDate !== undefined) updates.start_date = contract.startDate;
        if (contract.endDate !== undefined) updates.end_date = contract.endDate;
        if (contract.status !== undefined) updates.status = contract.status;
        if (contract.totalValue !== undefined) updates.total_value = contract.totalValue;
        if (contract.paymentTerms !== undefined) updates.payment_terms = contract.paymentTerms;
        if (contract.notes !== undefined) updates.notes = contract.notes;

        const { error } = await supabase.from('institution_contracts').update(updates).eq('id', id);
        return { success: !error, error };
    }, []);

    // ── SLA Rules ──
    const addSLARule = useCallback(async (rule: Partial<ContractSLARule>) => {
        const { error } = await supabase.from('contract_sla_rules').insert([{
            contract_id: rule.contractId,
            category: rule.category,
            max_hours: rule.maxHours,
            min_hours: rule.minHours || 0,
            description: rule.description,
        }]);
        return { success: !error, error };
    }, []);

    const removeSLARule = useCallback(async (ruleId: string) => {
        const { error } = await supabase.from('contract_sla_rules').delete().eq('id', ruleId);
        return { success: !error, error };
    }, []);

    // ── Bitácora CRM ──
    const addActivityLog = useCallback(async (activity: Partial<InstitutionActivity>) => {
        const { error } = await supabase.from('institution_activity_log').insert([{
            institution_id: activity.institutionId,
            event_type: activity.eventType,
            title: activity.title,
            description: activity.description,
            event_date: activity.eventDate || new Date().toISOString(),
            registered_by: activity.registeredBy,
            attachments: activity.attachments || [],
        }]);
        return { success: !error, error };
    }, []);

    // ── Alertas de Vencimiento ──
    const getExpiringContracts = useCallback((days: number = 90) => {
        const allContracts: (InstitutionContract & { institutionName?: string })[] = [];
        institutions.forEach(inst => {
            (inst.contracts || []).forEach(c => {
                if (c.status === 'active' && c.daysUntilExpiry !== undefined && c.daysUntilExpiry <= days && c.daysUntilExpiry > 0) {
                    allContracts.push({ ...c, institutionName: inst.legalName });
                }
            });
        });
        return allContracts.sort((a, b) => (a.daysUntilExpiry || 0) - (b.daysUntilExpiry || 0));
    }, [institutions]);

    // ── Init ──
    useEffect(() => {
        fetchInstitutions();
    }, [fetchInstitutions]);

    return {
        institutions,
        loading,
        error,
        fetchInstitutions,
        fetchInstitutionDetail,
        addInstitution,
        updateInstitution,
        deleteInstitution,
        addContact,
        removeContact,
        addContract,
        updateContract,
        addSLARule,
        removeSLARule,
        addActivityLog,
        getExpiringContracts,
    };
};
