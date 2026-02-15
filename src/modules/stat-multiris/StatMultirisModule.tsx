import React, { useState, useEffect, useRef } from 'react';
import {
    BarChart3,
    ShieldAlert,
    Activity,
    Users,
    ArrowUpRight,
    ArrowDownRight,
    Upload,
    FileSpreadsheet,
    Loader2,
    Clock,
    Target,
    Settings,
    Plus,
    Save,
    Trash2,
    Building2,
    Link2,
    UserCheck,
    Calendar,
    Trophy,
    UsersRound,
    Crown,
    X,
    Edit3,
    Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    parseMultirisExcel,
    uploadMultirisData,
    getConsolidatedStats,
    getSlaConfigs,
    saveSlaConfig,
    deleteSlaConfig,
    getNameMappings,
    saveNameMapping,
    getGruposMedicos,
    saveGrupoMedico,
    deleteGrupoMedico
} from './multirisService';
import type { MedicoGroup } from './multirisService';
import { useInstitutions } from '../../hooks/useInstitutions';
import { useProfessionals } from '../../hooks/useProfessionals';

// --- Componente de Autocomplete para Equivalencias ---
function SuggestionInput({ defaultValue, suggestions, placeholder, onConfirm }: {
    defaultValue: string;
    suggestions: string[];
    placeholder: string;
    onConfirm: (value: string) => void;
}) {
    const [value, setValue] = useState(defaultValue);
    const [showDropdown, setShowDropdown] = useState(false);
    const [focused, setFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const filtered = value.trim()
        ? suggestions.filter(s =>
            s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
        ).slice(0, 8)
        : suggestions.slice(0, 8);

    const handleSelect = (s: string) => {
        setValue(s);
        setShowDropdown(false);
        onConfirm(s);
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
                setFocused(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={containerRef} className="relative flex-1">
            <input
                type="text"
                value={value}
                onChange={(e) => { setValue(e.target.value); setShowDropdown(true); }}
                onFocus={() => { setFocused(true); setShowDropdown(true); }}
                onBlur={() => { setTimeout(() => { if (!focused) setShowDropdown(false); }, 200); onConfirm(value); }}
                placeholder={placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold focus:border-success outline-none transition-all"
            />
            {showDropdown && filtered.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-neutral-900 border border-white/15 rounded-xl shadow-2xl overflow-hidden max-h-[200px] overflow-y-auto no-scrollbar">
                    <div className="px-3 py-1.5 text-[8px] font-black text-white/20 uppercase tracking-widest border-b border-white/5">
                        Sugerencias de AMIS
                    </div>
                    {filtered.map((s, i) => (
                        <button
                            key={i}
                            onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-white/70 hover:bg-success/10 hover:text-success transition-colors flex items-center gap-2"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-success/40" />
                            {s}
                        </button>
                    ))}
                </div>
            )}
            {value !== defaultValue && value.trim() && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="Sin guardar" />
                </div>
            )}
        </div>
    );
}

// --- Componentes de UI ---

const StatCard = ({ title, value, change, icon: Icon, trend, subtitle, color = 'primary', breakdown }: any) => {
    const colors = {
        primary: 'bg-prevenort-primary/10 border-prevenort-primary/20 text-prevenort-primary shadow-orange-500/10',
        success: 'bg-success/10 border-success/20 text-success shadow-green-500/10',
        info: 'bg-info/10 border-info/20 text-info shadow-cyan-500/10',
        danger: 'bg-danger/10 border-danger/20 text-danger shadow-red-500/10'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="card-premium h-full flex flex-col justify-between group overflow-hidden relative"
        >
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-current opacity-[0.03] rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />

            <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl border ${colors[color as keyof typeof colors]} shadow-inner backdrop-blur-md`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 ${trend === 'up' ? 'text-success' : 'text-danger'}`}>
                    {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {change}
                </div>
            </div>

            <div>
                <p className="text-prevenort-text/40 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black text-white tracking-tight drop-shadow-sm leading-none">{value}</h3>
                    {subtitle && <span className="text-[10px] text-prevenort-text/30 font-bold uppercase tracking-tighter truncate max-w-[100px]">{subtitle}</span>}
                </div>
                {breakdown && breakdown.length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-3">
                        {breakdown.map((b: any, i: number) => (
                            <span key={i} className="text-[9px] font-black uppercase tracking-wider">
                                <span className={b.color || 'text-white/25'}>{b.label}:</span>{' '}
                                <span className="text-white/50">{b.value}</span>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: trend === 'up' ? '70%' : '30%' }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className={`h-full ${trend === 'up' ? 'bg-success' : 'bg-danger'} opacity-40`}
                />
            </div>
        </motion.div>
    );
};

// --- Módulo Principal ---

export const StatMultirisModule: React.FC = () => {
    const [view, setView] = useState<'dashboard' | 'upload' | 'config' | 'mappings'>('dashboard');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'instituciones' | 'medicos' | 'grupos' | 'calidad' | 'ranking'>('general');
    // Grupos de médicos
    const [grupos, setGrupos] = useState<MedicoGroup[]>([]);
    const [editingGrupo, setEditingGrupo] = useState<MedicoGroup | null>(null);
    const [selectedGrupo, setSelectedGrupo] = useState<string | null>(null);
    const [rankMode, setRankMode] = useState<'instituciones' | 'medicos'>('instituciones');
    const [rankMetric, setRankMetric] = useState<'exams' | 'addendas' | 'sla' | 'tat'>('exams');
    const [rankTipo, setRankTipo] = useState<'ALL' | 'U' | 'A' | 'H' | 'ONC'>('ALL');

    // Datos maestros para sugerencias de equivalencias
    const { institutions } = useInstitutions();
    const { professionals } = useProfessionals();
    const institutionSuggestions = institutions.map(i => i.commercialName || i.legalName).filter(Boolean) as string[];
    const professionalSuggestions = professionals.map(p => `${p.lastName} ${p.name}`.trim()).filter(Boolean);
    const [rankOrder, setRankOrder] = useState<'auto' | 'asc' | 'desc'>('auto');
    const [filterModalidad, setFilterModalidad] = useState<string>('TODAS');
    const [filterInstitucion, setFilterInstitucion] = useState<string>('TODAS');
    const [dateRange, setDateRange] = useState<{ start: string | null, end: string | null }>({ start: null, end: null });
    const [trendGrouping, setTrendGrouping] = useState<'day' | 'week' | 'month' | 'quarter'>('day');
    const [trendChartType, setTrendChartType] = useState<'bar' | 'dot' | 'line'>('bar');

    const [consolidatedData, setConsolidatedData] = useState<any[]>([]);
    const [filteredData, setFilteredData] = useState<any[]>([]);
    const [slaConfigs, setSlaConfigs] = useState<any[]>([]);
    const [mappings, setMappings] = useState<any[]>([]);
    const [selectedInst, setSelectedInst] = useState<string>('TODAS');
    const [selectedMedico, setSelectedMedico] = useState<string>('TODAS');

    const [uploadStatus, setUploadStatus] = useState<{ status: 'idle' | 'uploading' | 'success' | 'error', message?: string }>({ status: 'idle' });
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        loadData();
        loadConfigs();
        loadMappings();
        loadGrupos();
    }, []);

    const loadData = async (startDate?: string | null, endDate?: string | null) => {
        try {
            setLoading(true);
            const data = await getConsolidatedStats(startDate, endDate);

            // Force number types to avoid JS concatenation bugs
            const normalizedData = data.map((d: any) => ({
                ...d,
                cantidad_examenes: Number(d.cantidad_examenes || 0),
                cantidad_adendas: Number(d.cantidad_adendas || 0),
                cantidad_dentro_sla: Number(d.cantidad_dentro_sla || 0),
                tat_promedio_minutos: Number(d.tat_promedio_minutos || 0)
            }));

            setConsolidatedData(normalizedData);
            setFilteredData(normalizedData);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData(dateRange.start, dateRange.end);
    }, [dateRange.start, dateRange.end]);

    useEffect(() => {
        let result = consolidatedData;
        if (filterModalidad !== 'TODAS') {
            result = result.filter(d => d.modalidad === filterModalidad);
        }
        if (filterInstitucion !== 'TODAS') {
            result = result.filter(d => d.institucion === filterInstitucion);
        }

        if (dateRange.start) {
            result = result.filter(d => d.fecha_reporte >= dateRange.start!);
        }
        if (dateRange.end) {
            result = result.filter(d => d.fecha_reporte <= dateRange.end!);
        }

        setFilteredData(result);
    }, [filterModalidad, filterInstitucion, consolidatedData, dateRange]);



    const loadConfigs = async () => {
        try {
            const configs = await getSlaConfigs();
            setSlaConfigs(configs);
        } catch (error) {
            console.error('Error loading configs:', error);
        }
    };

    const loadMappings = async () => {
        try {
            const data = await getNameMappings();
            setMappings(data);
        } catch (error) {
            console.error('Error loading mappings:', error);
        }
    };

    const loadGrupos = async () => {
        try {
            const data = await getGruposMedicos();
            setGrupos(data);
        } catch (error) {
            console.error('Error loading grupos:', error);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploadStatus({ status: 'uploading' });
            const records = await parseMultirisExcel(file);
            await uploadMultirisData(records, file.name);
            setUploadStatus({ status: 'success', message: `${records.length} registros cargados. Se han descubierto nuevas instituciones/médicos si los hubiera.` });

            setTimeout(() => {
                loadData();
                loadConfigs();
                loadMappings();
                setView('dashboard');
                setUploadStatus({ status: 'idle' });
            }, 2000);
        } catch (error: any) {
            setUploadStatus({ status: 'error', message: error.message || 'Error al procesar el archivo' });
        }
    };

    const handleFileDrop = async (file: File) => {
        try {
            setUploadStatus({ status: 'uploading' });
            const records = await parseMultirisExcel(file);
            await uploadMultirisData(records, file.name);
            setUploadStatus({ status: 'success', message: `${records.length} registros cargados. Se han descubierto nuevas instituciones/médicos si los hubiera.` });

            setTimeout(() => {
                loadData();
                loadConfigs();
                loadMappings();
                setView('dashboard');
                setUploadStatus({ status: 'idle' });
            }, 2000);
        } catch (error: any) {
            setUploadStatus({ status: 'error', message: error.message || 'Error al procesar el archivo' });
        }
    };

    const handleUpdateMapping = async (id: string, formal_name: string) => {
        try {
            await saveNameMapping({ id, formal_name });
            loadMappings();
        } catch (error: any) {
            alert('Error al actualizar mapeo: ' + error.message);
        }
    };

    // Helper para obtener nombre formal
    const getFormalName = (rawName: string, category: 'institucion' | 'medico') => {
        const mapping = mappings.find(m => m.raw_name === rawName && m.category === category);
        return mapping?.formal_name || rawName;
    };

    // --- Lógica de Reportes sobre Filtros ---
    const totalExams = filteredData.reduce((acc, curr) => acc + (curr.cantidad_examenes || 0), 0);
    const totalWithinSla = filteredData.reduce((acc, curr) => acc + (curr.cantidad_dentro_sla || 0), 0);
    const slaCompliance = totalExams > 0 ? ((totalWithinSla / totalExams) * 100).toFixed(1) : '0';
    const avgTat = filteredData.length > 0
        ? (filteredData.reduce((acc, curr) => acc + ((curr.tat_promedio_minutos || 0) * (curr.cantidad_examenes || 0)), 0) / totalExams).toFixed(1)
        : '0';
    const totalAddendas = filteredData.reduce((acc, curr) => acc + (curr.cantidad_adendas || 0), 0);
    const addendaPercentage = totalExams > 0 ? ((totalAddendas / totalExams) * 100).toFixed(1) : '0';

    // Desglose por Tipo de Paciente
    const tipoLabels: Record<string, string> = { U: 'Urgencia', A: 'Ambulat.', H: 'Hospital.', M: 'Mutual', O: 'Otros', UPC: 'Ud. Pac. Crít.', UTI: 'UTI', ONC: 'Oncológ.' };
    // Agrupación para filtrado: M se suma a U, UPC/UTI se suman a H
    const TIPO_GROUPS: Record<string, string[]> = {
        U: ['U', 'M'],
        A: ['A'],
        H: ['H', 'UPC', 'UTI'],
        ONC: ['ONC'],
    };
    const byTipo = filteredData.reduce((acc, curr) => {
        const t = curr.tipo_paciente || 'O';
        if (!acc[t]) acc[t] = { exams: 0, sla: 0, tatSum: 0, addendas: 0 };
        acc[t].exams += (curr.cantidad_examenes || 0);
        acc[t].sla += (curr.cantidad_dentro_sla || 0);
        acc[t].tatSum += ((curr.tat_promedio_minutos || 0) * (curr.cantidad_examenes || 0));
        acc[t].addendas += (curr.cantidad_adendas || 0);
        return acc;
    }, {} as Record<string, { exams: number; sla: number; tatSum: number; addendas: number }>);
    const tipoKeys = Object.keys(byTipo).sort((a, b) => byTipo[b].exams - byTipo[a].exams).slice(0, 3); // Top 3

    // Distribución por Modalidad
    const statsByMod = Object.values(filteredData.reduce((acc, curr) => {
        if (!acc[curr.modalidad]) acc[curr.modalidad] = { name: curr.modalidad, value: 0 };
        acc[curr.modalidad].value += curr.cantidad_examenes;
        return acc;
    }, {} as any)) as any[];

    // Agrupamiento por Institución (usando Equivalencia)
    const statsByInst = Object.values(filteredData.reduce((acc, curr) => {
        const formalName = getFormalName(curr.institucion, 'institucion');
        if (!acc[formalName]) acc[formalName] = { name: formalName, value: 0, withinSla: 0, adendas: 0, totalTat: 0 };
        acc[formalName].value += curr.cantidad_examenes;
        acc[formalName].withinSla += (curr.cantidad_dentro_sla || 0);
        acc[formalName].adendas += (curr.cantidad_adendas || 0);
        acc[formalName].totalTat += ((curr.tat_promedio_minutos || 0) * (curr.cantidad_examenes || 0));
        return acc;
    }, {} as any)).map((inst: any) => ({
        ...inst,
        avgTat: inst.value > 0 ? (inst.totalTat / inst.value).toFixed(1) : '0',
        slaRate: inst.value > 0 ? ((inst.withinSla / inst.value) * 100).toFixed(1) : '0',
        addendaRate: inst.value > 0 ? ((inst.adendas / inst.value) * 100).toFixed(2) : '0'
    })).sort((a: any, b: any) => b.value - a.value) as any[];

    // Agrupamiento por Médico (usando Equivalencia)
    const statsByMedico = Object.values(filteredData.reduce((acc, curr) => {
        const formalName = getFormalName(curr.medico, 'medico');
        if (!acc[formalName]) acc[formalName] = { name: formalName, volume: 0, totalTat: 0, adendas: 0, withinSla: 0 };
        acc[formalName].volume += curr.cantidad_examenes;
        acc[formalName].totalTat += (curr.tat_promedio_minutos * curr.cantidad_examenes);
        acc[formalName].adendas += curr.cantidad_adendas;
        acc[formalName].withinSla += (curr.cantidad_dentro_sla || 0);
        return acc;
    }, {} as any)).map((m: any) => ({
        ...m,
        avgTat: (m.totalTat / m.volume).toFixed(1),
        slaRate: ((m.withinSla / m.volume) * 100).toFixed(1)
    })) as any[];

    // Agrupación temporal para Análisis Progresivo
    const getGroupKey = (dateStr: string): string => {
        if (trendGrouping === 'day') return dateStr;
        const d = new Date(dateStr + 'T00:00:00');
        if (trendGrouping === 'week') {
            const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
            dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
            const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
            const weekNum = Math.ceil((((dt.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
            return `${dt.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
        }
        if (trendGrouping === 'month') return dateStr.slice(0, 7);
        // quarter
        const q = Math.floor(d.getMonth() / 3) + 1;
        return `${d.getFullYear()}-Q${q}`;
    };
    const getGroupLabel = (key: string): string => {
        if (trendGrouping === 'day') return key.split('-').slice(1).reverse().join('/');
        if (trendGrouping === 'week') return `S${key.split('-W')[1]}`;
        if (trendGrouping === 'month') {
            const [y, m] = key.split('-');
            const mNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            return `${mNames[parseInt(m) - 1]} ${y.slice(2)}`;
        }
        return key.replace('-', ' ');
    };
    const statsTemporal = Object.values(filteredData.reduce((acc, curr) => {
        const key = getGroupKey(curr.fecha_reporte);
        if (!acc[key]) acc[key] = { date: key, exams: 0, addendas: 0 };
        acc[key].exams += curr.cantidad_examenes;
        acc[key].addendas += curr.cantidad_adendas;
        return acc;
    }, {} as any)).sort((a: any, b: any) => a.date.localeCompare(b.date)) as any[];

    const hasData = consolidatedData.length > 0;

    return (
        <div className="space-y-8 pb-10">
            {/* Header Section Premium */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative overflow-hidden p-8 rounded-[40px] bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,100,0,0.05)_0%,transparent_50%)]" />
                <div className="relative z-10">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <div className="flex items-center gap-4 mb-2">
                            <h1 className="text-4xl font-black text-white tracking-tight uppercase italic decoration-prevenort-primary decoration-4">Stat Multiris <span className="text-prevenort-primary">3.0</span></h1>
                            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-white/40 uppercase tracking-widest leading-none">
                                {consolidatedData.length.toLocaleString()} Segmentos Cargados
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-prevenort-text/40">Smart Data Merging Engine</span>
                            <div className="h-1 w-1 rounded-full bg-white/20" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-prevenort-text/40">Holding Portezuelo</span>
                        </div>
                    </motion.div>
                </div>

                <div className="flex items-center gap-3 relative z-10">
                    <button
                        onClick={() => setView('mappings')}
                        className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl border transition-all font-black text-[10px] uppercase tracking-widest ${view === 'mappings'
                            ? 'bg-success text-white border-success shadow-lg shadow-green-500/30 -translate-y-1'
                            : 'border-white/5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                            }`}
                    >
                        <Link2 className="w-4 h-4" />
                        Equivalencias
                    </button>
                    <button
                        onClick={() => setView('config')}
                        className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl border transition-all font-black text-[10px] uppercase tracking-widest ${view === 'config'
                            ? 'bg-info text-white border-info shadow-lg shadow-cyan-500/30 -translate-y-1'
                            : 'border-white/5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                            }`}
                    >
                        <Settings className="w-4 h-4" />
                        SLAs
                    </button>
                    <button
                        onClick={() => setView(view === 'dashboard' ? 'upload' : 'dashboard')}
                        className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl border transition-all font-black text-[10px] uppercase tracking-widest ${view === 'upload'
                            ? 'bg-prevenort-primary text-white border-prevenort-primary shadow-lg shadow-orange-500/30 -translate-y-1'
                            : 'border-white/5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                            }`}
                    >
                        {view === 'dashboard' ? <Upload className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
                        {view === 'dashboard' ? 'Ingestar' : 'Dashboard'}
                    </button>
                </div>
            </div >

            <AnimatePresence mode="wait">
                {view === 'mappings' ? (
                    <motion.div key="mappings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-6">
                        <div className="card-premium">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tight">Sistema de Equivalencias</h3>
                                    <p className="text-xs text-prevenort-text/40 font-bold uppercase mt-1">Vincula nombres de la planilla con nombres formales de AMIS</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-success/10 text-success border border-success/20">
                                    <Link2 className="w-8 h-8" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-prevenort-primary">
                                        <Building2 className="w-4 h-4" /> Instituciones (Aetitle)
                                    </h4>
                                    <div className="space-y-3">
                                        {mappings.filter(m => m.category === 'institucion').map(m => (
                                            <div key={m.id} className="p-4 rounded-3xl bg-white/5 border border-white/10 group hover:border-prevenort-primary/30 transition-all">
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-[10px] font-black text-prevenort-text/30 uppercase">Nombre en Planilla: <span className="text-white">{m.raw_name}</span></span>
                                                    <div className="flex items-center gap-2">
                                                        <SuggestionInput
                                                            defaultValue={m.formal_name}
                                                            suggestions={institutionSuggestions}
                                                            placeholder="Nombre formal en AMIS..."
                                                            onConfirm={(v) => handleUpdateMapping(m.id, v)}
                                                        />
                                                        <div className="p-2 bg-success/20 text-success rounded-xl">
                                                            <UserCheck className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-prevenort-primary">
                                        <Users className="w-4 h-4" /> Médicos (Radiólogos)
                                    </h4>
                                    <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2 no-scrollbar">
                                        {mappings.filter(m => m.category === 'medico').map(m => (
                                            <div key={m.id} className="p-4 rounded-3xl bg-white/5 border border-white/10 group hover:border-prevenort-primary/30 transition-all">
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-[10px] font-black text-prevenort-text/30 uppercase">Nombre en Planilla: <span className="text-white">{m.raw_name}</span></span>
                                                    <div className="flex items-center gap-2">
                                                        <SuggestionInput
                                                            defaultValue={m.formal_name}
                                                            suggestions={professionalSuggestions}
                                                            placeholder="Nombre Real / Recursos Humanos..."
                                                            onConfirm={(v) => handleUpdateMapping(m.id, v)}
                                                        />
                                                        <div className="p-2 bg-success/20 text-success rounded-xl">
                                                            <UserCheck className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : view === 'config' ? (
                    <motion.div key="config" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-6">
                        {/* --- MATRIZ SLA: Vista unificada sin fricción --- */}
                        {(() => {
                            // Construir mapa de SLAs existentes: key = "inst|tipo" => config
                            const slaMap = new Map<string, any>();
                            slaConfigs.forEach((c: any) => {
                                const instKey = c.institucion || '__GLOBAL__';
                                const key = `${instKey}|${c.tipo}`;
                                slaMap.set(key, c);
                            });

                            // Obtener lista de todas las instituciones desde mappings
                            const allInstitutions = mappings
                                .filter((m: any) => m.category === 'institucion')
                                .map((m: any) => m.raw_name)
                                .sort();

                            // Tipos de paciente configurables (columnas)
                            const PATIENT_TYPES = [
                                { key: 'U', label: 'Urgencia', shortLabel: 'URG', color: 'bg-red-500', textColor: 'text-red-400', dotColor: 'bg-red-400', desc: '' },
                                { key: 'H', label: 'Hospitalizado', shortLabel: 'HOSP', color: 'bg-amber-500', textColor: 'text-amber-400', dotColor: 'bg-amber-400', desc: '' },
                                { key: 'A', label: 'Ambulatorio', shortLabel: 'AMB', color: 'bg-emerald-500', textColor: 'text-emerald-400', dotColor: 'bg-emerald-400', desc: '' },
                                { key: 'ONC', label: 'Oncológico', shortLabel: 'ONC', color: 'bg-violet-500', textColor: 'text-violet-400', dotColor: 'bg-violet-400', desc: '' },
                                { key: 'MUT', label: 'Mutual', shortLabel: 'MUT', color: 'bg-rose-500', textColor: 'text-rose-400', dotColor: 'bg-rose-400', desc: '' },
                                { key: 'UTI', label: 'UTI / UPC', shortLabel: 'UTI', color: 'bg-orange-500', textColor: 'text-orange-400', dotColor: 'bg-orange-400', desc: '' },
                            ];

                            // Obtener valor global fallback para un tipo
                            const getGlobalValue = (tipo: string) => {
                                const config = slaMap.get(`__GLOBAL__|${tipo}`);
                                return config?.target_minutes || 0;
                            };

                            // Obtener valor institucional para un tipo
                            const getInstValue = (inst: string, tipo: string) => {
                                const config = slaMap.get(`${inst}|${tipo}`);
                                return config?.target_minutes ?? null; // null = no configurado
                            };

                            // Handler para guardar celda inline
                            const handleCellSave = async (institucion: string | null, tipo: string, value: number) => {
                                try {
                                    const existing = slaMap.get(`${institucion || '__GLOBAL__'}|${tipo}`);
                                    if (value === 0 && existing) {
                                        // Borrar la regla si ponen 0
                                        await deleteSlaConfig(existing.id);
                                    } else if (value > 0) {
                                        await saveSlaConfig({
                                            id: existing?.id,
                                            institucion: institucion,
                                            modalidad: null,
                                            tipo,
                                            target_minutes: value
                                        });
                                    }
                                    loadConfigs();
                                } catch (err: any) {
                                    console.error('Error saving SLA:', err);
                                }
                            };

                            // Componente celda editable inline
                            const SlaCell = ({ institucion, tipo, globalFallback }: { institucion: string | null, tipo: string, globalFallback: number }) => {
                                const isGlobal = institucion === null;
                                const currentValue = isGlobal
                                    ? getGlobalValue(tipo)
                                    : getInstValue(institucion!, tipo);
                                const hasOwnValue = currentValue !== null && currentValue > 0;
                                const displayValue = hasOwnValue ? currentValue : (isGlobal ? 0 : globalFallback);
                                const [editing, setEditing] = useState(false);
                                const [tempValue, setTempValue] = useState(String(displayValue));

                                const handleCommit = () => {
                                    setEditing(false);
                                    const numVal = parseInt(tempValue) || 0;
                                    if (numVal !== (currentValue || 0)) {
                                        handleCellSave(institucion, tipo, numVal);
                                    }
                                };

                                const formatTime = (mins: number) => {
                                    if (mins === 0) return '—';
                                    if (mins < 60) return `${mins}m`;
                                    const h = Math.floor(mins / 60);
                                    const m = mins % 60;
                                    return m > 0 ? `${h}h ${m}m` : `${h}h`;
                                };

                                if (editing) {
                                    return (
                                        <div className="relative">
                                            <input
                                                type="number"
                                                autoFocus
                                                value={tempValue}
                                                onChange={(e) => setTempValue(e.target.value)}
                                                onBlur={handleCommit}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleCommit(); if (e.key === 'Escape') setEditing(false); }}
                                                className="w-full bg-info/10 border-2 border-info rounded-xl px-3 py-2.5 text-center text-sm font-black text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                min={0}
                                                step={5}
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-info/60">min</span>
                                        </div>
                                    );
                                }

                                return (
                                    <button
                                        onClick={() => { setTempValue(String(hasOwnValue ? currentValue : 0)); setEditing(true); }}
                                        className={`w-full rounded-xl px-3 py-2.5 text-center transition-all group/cell relative ${hasOwnValue
                                            ? 'bg-white/[0.06] border border-white/10 hover:border-info/40 hover:bg-info/5'
                                            : isGlobal
                                                ? 'bg-white/[0.03] border border-dashed border-white/10 hover:border-info/40'
                                                : 'bg-transparent border border-dashed border-white/[0.05] hover:border-white/20 hover:bg-white/[0.02]'
                                            }`}
                                    >
                                        <span className={`text-sm font-black ${hasOwnValue ? 'text-white' : isGlobal ? 'text-white/20' : 'text-white/15'
                                            }`}>
                                            {formatTime(displayValue)}
                                        </span>
                                        {!isGlobal && !hasOwnValue && globalFallback > 0 && (
                                            <span className="block text-[8px] font-bold text-white/20 mt-0.5">
                                                ← global
                                            </span>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                            <Edit3 className="w-3 h-3 text-info/60" />
                                        </div>
                                    </button>
                                );
                            };

                            return (
                                <div className="card-premium p-0 overflow-hidden">
                                    {/* Header */}
                                    <div className="p-8 pb-4 border-b border-white/5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <div className="p-2.5 rounded-2xl bg-info/10 text-info border border-info/20">
                                                        <Target className="w-6 h-6" />
                                                    </div>
                                                    <h3 className="text-2xl font-black uppercase tracking-tight">Matriz SLA</h3>
                                                </div>
                                                <p className="text-xs text-white/30 font-bold ml-14">
                                                    Haz clic en cualquier celda para editar · Los valores en <span className="text-white/50">0</span> eliminan la regla · Las celdas vacías heredan del valor <span className="text-info/60">global</span>
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 text-[9px] font-black text-white/30 uppercase tracking-widest">
                                                <Clock className="w-3.5 h-3.5" />
                                                {slaConfigs.length} reglas activas
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tabla Matriz */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            {/* Cabecera de columnas: Tipos de Paciente */}
                                            <thead>
                                                <tr className="border-b border-white/5">
                                                    <th className="text-left px-8 py-4 w-[280px]">
                                                        <span className="text-[10px] font-black text-white/25 uppercase tracking-[0.2em]">Institución</span>
                                                    </th>
                                                    {PATIENT_TYPES.map(pt => (
                                                        <th key={pt.key} className="px-3 py-4 text-center min-w-[120px]">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className={`w-2 h-2 rounded-full ${pt.dotColor}`} />
                                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${pt.textColor}`}>{pt.shortLabel}</span>
                                                                </div>
                                                                <span className="text-[8px] font-bold text-white/20">{pt.label}</span>
                                                                {pt.desc && <span className="text-[7px] font-medium text-white/10">{pt.desc}</span>}
                                                            </div>
                                                        </th>
                                                    ))}
                                                    <th className="px-3 py-4 text-center min-w-[80px]">
                                                        <span className="text-[10px] font-black text-white/15 uppercase tracking-widest">Estado</span>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* Fila GLOBAL (fallback) */}
                                                <tr className="bg-gradient-to-r from-info/[0.04] to-transparent border-b-2 border-info/10">
                                                    <td className="px-8 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-xl bg-info/10 border border-info/20 flex items-center justify-center">
                                                                <ShieldAlert className="w-4 h-4 text-info" />
                                                            </div>
                                                            <div>
                                                                <span className="text-sm font-black text-info uppercase tracking-wide">Global</span>
                                                                <span className="block text-[8px] font-bold text-info/40">Valores por defecto (fallback)</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {PATIENT_TYPES.map(pt => (
                                                        <td key={pt.key} className="px-3 py-3">
                                                            <SlaCell institucion={null} tipo={pt.key} globalFallback={0} />
                                                        </td>
                                                    ))}
                                                    <td className="px-3 py-3 text-center">
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-info/10 text-info text-[8px] font-black uppercase tracking-wider">
                                                            <ShieldAlert className="w-2.5 h-2.5" /> Base
                                                        </span>
                                                    </td>
                                                </tr>

                                                {/* Filas de Instituciones */}
                                                {allInstitutions.map((inst: string, idx: number) => {
                                                    const configuredCount = PATIENT_TYPES.filter(pt => {
                                                        const val = getInstValue(inst, pt.key);
                                                        return val !== null && val > 0;
                                                    }).length;

                                                    return (
                                                        <tr
                                                            key={inst}
                                                            className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${idx % 2 === 0 ? 'bg-white/[0.01]' : ''}`}
                                                        >
                                                            <td className="px-8 py-3.5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                                                        <Building2 className="w-4 h-4 text-prevenort-primary/60" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <span className="text-xs font-black text-white uppercase tracking-wide truncate block">{getFormalName(inst, 'institucion')}</span>
                                                                        {getFormalName(inst, 'institucion') !== inst && (
                                                                            <span className="text-[8px] font-bold text-white/20">{inst}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            {PATIENT_TYPES.map(pt => (
                                                                <td key={pt.key} className="px-3 py-2.5">
                                                                    <SlaCell institucion={inst} tipo={pt.key} globalFallback={getGlobalValue(pt.key)} />
                                                                </td>
                                                            ))}
                                                            <td className="px-3 py-3 text-center">
                                                                {configuredCount === 0 ? (
                                                                    <span className="text-[9px] font-bold text-white/15">Solo global</span>
                                                                ) : (
                                                                    <div className="flex items-center justify-center gap-0.5">
                                                                        {Array.from({ length: PATIENT_TYPES.length }).map((_, i) => (
                                                                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < configuredCount ? 'bg-info' : 'bg-white/10'}`} />
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}

                                                {/* Si no hay instituciones */}
                                                {allInstitutions.length === 0 && (
                                                    <tr>
                                                        <td colSpan={PATIENT_TYPES.length + 2} className="px-8 py-12 text-center">
                                                            <div className="flex flex-col items-center gap-3">
                                                                <Upload className="w-8 h-8 text-white/10" />
                                                                <p className="text-xs font-bold text-white/20">
                                                                    No hay instituciones descubiertas aún.
                                                                    <br />
                                                                    <span className="text-white/10">Ingesta un archivo Multiris para descubrir las instituciones automáticamente.</span>
                                                                </p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Footer con leyenda */}
                                    <div className="px-8 py-4 border-t border-white/5 bg-white/[0.01]">
                                        <div className="flex flex-wrap items-center gap-6 text-[8px] font-bold text-white/20 uppercase tracking-wider">
                                            <span className="flex items-center gap-1.5">
                                                <div className="w-4 h-3 rounded bg-white/[0.06] border border-white/10" /> Valor propio
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <div className="w-4 h-3 rounded border border-dashed border-white/[0.05]" /> Hereda global
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Edit3 className="w-2.5 h-2.5 text-info/40" /> Clic para editar
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <span className="text-white/40">0</span> = Elimina la regla
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </motion.div>
                ) : view === 'upload' ? (
                    <motion.div key="upload" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="max-w-2xl mx-auto">
                        <div
                            className={`card-premium bg-prevenort-surface border-dashed border-2 p-12 text-center flex flex-col items-center gap-6 transition-all duration-300 ${isDragging
                                ? 'border-prevenort-primary bg-prevenort-primary/5 scale-[1.02] shadow-[0_0_40px_rgba(249,115,22,0.15)]'
                                : 'border-white/10 hover:border-white/20'
                                }`}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDragging(false);
                                const file = e.dataTransfer.files?.[0];
                                if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
                                    handleFileDrop(file);
                                }
                            }}
                        >
                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all ${isDragging ? 'bg-prevenort-primary/20 scale-110' : 'bg-prevenort-primary/10'}`}>
                                {uploadStatus.status === 'uploading'
                                    ? <Loader2 className="w-10 h-10 text-prevenort-primary animate-spin" />
                                    : isDragging
                                        ? <Upload className="w-10 h-10 text-prevenort-primary animate-bounce" />
                                        : <FileSpreadsheet className="w-10 h-10 text-prevenort-primary" />
                                }
                            </div>
                            <h2 className="text-2xl font-black mb-2 uppercase">Ingesta de Producción</h2>
                            {isDragging && (
                                <p className="text-sm font-black uppercase tracking-widest text-prevenort-primary animate-pulse">Suelta el archivo aquí</p>
                            )}
                            {!isDragging && (
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Arrastra tu planilla aquí o haz clic en el botón</p>
                            )}
                            {uploadStatus.status === 'error' && <div className="bg-danger/10 text-danger px-4 py-3 rounded-xl border border-danger/20 text-xs font-bold">{uploadStatus.message}</div>}
                            {uploadStatus.status === 'success' && <div className="bg-success/10 text-success px-4 py-3 rounded-xl border border-success/20 text-xs font-bold">{uploadStatus.message}</div>}
                            <label className="relative cursor-pointer group">
                                <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} disabled={uploadStatus.status === 'uploading'} />
                                <div className="px-8 py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest group-hover:scale-105 transition-transform flex items-center gap-3">
                                    {uploadStatus.status === 'uploading' ? 'Auto-descubriendo...' : 'Subir Planilla'}
                                </div>
                            </label>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                        {loading && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-prevenort-surface/50 backdrop-blur-sm rounded-[40px]">
                                <Loader2 className="w-12 h-12 text-prevenort-primary animate-spin" />
                            </div>
                        )}

                        {/* Filtros Inteligentes */}
                        <div className="flex flex-wrap items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-3xl backdrop-blur-sm">
                            <div className="flex items-center gap-2 px-4 py-2 border-r border-white/5">
                                <Target className="w-4 h-4 text-prevenort-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-prevenort-text/40">Filtros</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Date Range Pickers */}
                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                                    <Calendar className="w-3.5 h-3.5 text-prevenort-primary" />
                                    <input
                                        type="date"
                                        value={dateRange.start || ''}
                                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                        className="bg-transparent text-[10px] font-black uppercase outline-none text-white/60"
                                    />
                                    <span className="text-white/20">—</span>
                                    <input
                                        type="date"
                                        value={dateRange.end || ''}
                                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                        className="bg-transparent text-[10px] font-black uppercase outline-none text-white/60"
                                    />
                                    {(dateRange.start || dateRange.end) && (
                                        <button
                                            onClick={() => setDateRange({ start: null, end: null })}
                                            className="ml-1 text-white/30 hover:text-white/70 transition-colors text-xs font-black"
                                            title="Limpiar fechas"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                <div className="h-4 w-px bg-white/10" />

                                <select
                                    value={filterModalidad}
                                    onChange={(e) => setFilterModalidad(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-prevenort-primary/50 text-white/60 appearance-none min-w-[140px]"
                                >
                                    <option value="TODAS">Todas las Modalidades</option>
                                    {['CT', 'MR', 'DX', 'US', 'MG', 'XA'].map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <select
                                    value={filterInstitucion}
                                    onChange={(e) => setFilterInstitucion(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-prevenort-primary/50 text-white/60 appearance-none min-w-[160px]"
                                >
                                    <option value="TODAS">Todos los Centros</option>
                                    {mappings.filter(m => m.category === 'institucion').map(m => (
                                        <option key={m.id} value={m.raw_name}>{m.formal_name || m.raw_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard title="Total Exámenes" value={totalExams.toLocaleString()} icon={Activity} trend="up" change="Volumen" color="primary"
                                breakdown={tipoKeys.map(k => ({
                                    label: tipoLabels[k] || k,
                                    value: byTipo[k].exams.toLocaleString(),
                                    color: k === 'U' ? 'text-danger/60' : k === 'A' ? 'text-success/60' : 'text-info/60'
                                }))}
                            />
                            <StatCard title="SLAs Dentro" value={`${slaCompliance}%`} icon={Target} trend={Number(slaCompliance) > 90 ? 'up' : 'down'} change="Eficacia" subtitle={`${totalWithinSla.toLocaleString()} ok`} color="success"
                                breakdown={tipoKeys.map(k => ({
                                    label: tipoLabels[k] || k,
                                    value: byTipo[k].exams > 0 ? `${((byTipo[k].sla / byTipo[k].exams) * 100).toFixed(0)}%` : '0%',
                                    color: k === 'U' ? 'text-danger/60' : k === 'A' ? 'text-success/60' : 'text-info/60'
                                }))}
                            />
                            <StatCard title="TAT Promedio" value={`${avgTat}m`} icon={Clock} trend="down" change="Velocidad" color="info"
                                breakdown={tipoKeys.map(k => ({
                                    label: tipoLabels[k] || k,
                                    value: byTipo[k].exams > 0 ? `${(byTipo[k].tatSum / byTipo[k].exams).toFixed(0)}m` : '0m',
                                    color: k === 'U' ? 'text-danger/60' : k === 'A' ? 'text-success/60' : 'text-info/60'
                                }))}
                            />
                            <StatCard title="Calidad (Adendas)" value={`${addendaPercentage}%`} icon={ShieldAlert} trend={Number(addendaPercentage) < 5 ? 'up' : 'down'} change="Tasa Adendas" subtitle={`${totalAddendas} totales`} color="danger"
                                breakdown={tipoKeys.map(k => ({
                                    label: tipoLabels[k] || k,
                                    value: byTipo[k].exams > 0 ? `${((byTipo[k].addendas / byTipo[k].exams) * 100).toFixed(1)}%` : '0%',
                                    color: k === 'U' ? 'text-danger/60' : k === 'A' ? 'text-success/60' : 'text-info/60'
                                }))}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2 border-b border-white/5 pb-px no-scrollbar">
                            {(['general', 'instituciones', 'medicos', 'grupos', 'calidad', 'ranking'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] relative transition-all ${activeTab === tab ? 'text-prevenort-primary' : 'text-prevenort-text/30 hover:text-white/60'
                                        }`}
                                >
                                    {tab === 'calidad' ? 'Radar de Calidad' : tab === 'ranking' ? '🏆 Ranking' : tab === 'grupos' ? '👥 Grupos' : tab}
                                    {activeTab === tab && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-prevenort-primary rounded-t-full shadow-[0_-4px_10px_rgba(255,100,0,0.3)]" />}
                                </button>
                            ))}
                        </div>

                        <AnimatePresence mode="wait">
                            {activeTab === 'general' && (
                                <div className="space-y-8">
                                    {/* --- ANÁLISIS DEL PERIODO (SNAPSHOT) --- */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1 card-premium flex flex-col min-h-[450px]">
                                            <div className="flex items-center gap-3 mb-8">
                                                <div className="p-2 rounded-xl bg-prevenort-primary/10 text-prevenort-primary">
                                                    <Activity className="w-5 h-5" />
                                                </div>
                                                <h3 className="text-xl font-black uppercase tracking-tight">Análisis del Periodo</h3>
                                            </div>

                                            <div className="flex-1 flex flex-col justify-center gap-10">
                                                <div className="space-y-2">
                                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Exámenes Totales</span>
                                                    <div className="text-4xl font-black text-white">{totalExams.toLocaleString()}</div>
                                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                        <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-prevenort-primary" />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Total Adendas</span>
                                                    <div className="flex items-baseline gap-3">
                                                        <div className="text-4xl font-black text-danger">{totalAddendas.toLocaleString()}</div>
                                                        <div className="text-xl font-bold text-danger/50">{addendaPercentage}%</div>
                                                    </div>
                                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                        <motion.div initial={{ width: 0 }} animate={{ width: `${addendaPercentage}%` }} className="h-full bg-danger" />
                                                    </div>
                                                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Tasa de corrección sobre volumen total</p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                                    <div>
                                                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">SLA Cumplido</span>
                                                        <div className="text-lg font-black text-success">{slaCompliance}%</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">TAT Global</span>
                                                        <div className="text-lg font-black text-info">{avgTat}m</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* --- ANÁLISIS PROGRESIVO (TRENDS) --- */}
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 card-premium min-h-[450px] flex flex-col group">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                                <div>
                                                    <h3 className="text-xl font-black uppercase tracking-tight">Análisis Progresivo</h3>
                                                    <p className="text-[10px] font-bold text-white/20 uppercase mt-1">Evolución temporal · {statsTemporal.length} períodos</p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    {/* Agrupación temporal */}
                                                    <div className="flex rounded-xl overflow-hidden border border-white/10">
                                                        {(['day', 'week', 'month', 'quarter'] as const).map(g => (
                                                            <button key={g} onClick={() => setTrendGrouping(g)} className={`px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all ${trendGrouping === g ? 'bg-prevenort-primary text-black' : 'bg-white/5 text-white/40 hover:text-white/70'}`}>
                                                                {g === 'day' ? 'Día' : g === 'week' ? 'Semana' : g === 'month' ? 'Mes' : 'Trimestre'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {/* Tipo de gráfico */}
                                                    <div className="flex rounded-xl overflow-hidden border border-white/10">
                                                        {(['bar', 'dot', 'line'] as const).map(ct => (
                                                            <button key={ct} onClick={() => setTrendChartType(ct)} className={`px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all ${trendChartType === ct ? 'bg-info text-black' : 'bg-white/5 text-white/40 hover:text-white/70'}`}>
                                                                {ct === 'bar' ? '▮ Barras' : ct === 'dot' ? '● Puntos' : '╱ Línea'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {/* Leyenda */}
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-2 h-2 rounded-full bg-prevenort-primary" />
                                                            <span className="text-[8px] font-black text-white/40 uppercase">Exámenes</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-2 h-2 rounded-full bg-danger" />
                                                            <span className="text-[8px] font-black text-white/40 uppercase">Adendas</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {!hasData ? <div className="flex-1 flex items-center justify-center opacity-10"><BarChart3 className="w-24 h-24" /></div> : (() => {
                                                const maxExams = Math.max(...statsTemporal.map((x: any) => x.exams)) || 1;
                                                const showLabels = statsTemporal.length <= 60;

                                                if (trendChartType === 'bar') {
                                                    return (
                                                        <div className="flex-1 flex flex-col">
                                                            <div className="flex-1 flex items-end gap-[2px] pt-10 px-2 pb-1 overflow-x-auto no-scrollbar">
                                                                {statsTemporal.map((d: any, i: number) => (
                                                                    <div key={i} className="flex-1 min-w-[6px] group/bar relative flex flex-col items-center justify-end h-full gap-0.5">
                                                                        <motion.div initial={{ height: 0 }} animate={{ height: `${(d.addendas / maxExams) * 100}%` }} className="w-full bg-danger rounded-t-[2px] z-10" />
                                                                        <motion.div initial={{ height: 0 }} animate={{ height: `${(d.exams / maxExams) * 100}%` }} className="w-full bg-gradient-to-t from-prevenort-primary/20 to-prevenort-primary/60 rounded-t-[4px] hover:to-white transition-all cursor-pointer" />
                                                                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 bg-neutral-900 border border-white/10 text-white text-[9px] font-black px-3 py-2 rounded-xl transition-all scale-90 group-hover/bar:scale-100 pointer-events-none z-30 shadow-2xl min-w-[100px]">
                                                                            <div className="flex justify-between gap-4 mb-1"><span className="text-white/40 uppercase">Período:</span><span>{getGroupLabel(d.date)}</span></div>
                                                                            <div className="flex justify-between gap-4 text-prevenort-primary"><span className="text-white/40 uppercase">Exámenes:</span><span>{d.exams.toLocaleString()}</span></div>
                                                                            <div className="flex justify-between gap-4 text-danger"><span className="text-white/40 uppercase">Adendas:</span><span>{d.addendas}</span></div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {showLabels && <div className="flex gap-[2px] px-2 overflow-x-auto no-scrollbar">
                                                                {statsTemporal.map((d: any, i: number) => (
                                                                    <div key={i} className="flex-1 min-w-[6px] text-center">
                                                                        <span className="text-[6px] font-bold text-white/15 truncate block">{getGroupLabel(d.date)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>}
                                                        </div>
                                                    );
                                                }

                                                // Dot or Line chart
                                                const padding = 40;
                                                return (
                                                    <div className="flex-1 relative overflow-x-auto no-scrollbar" style={{ minHeight: 300 }}>
                                                        <svg width="100%" height="100%" viewBox={`0 0 ${Math.max(statsTemporal.length * 20, 400)} 300`} preserveAspectRatio="none" className="w-full h-full">
                                                            {/* Grid lines */}
                                                            {[0, 0.25, 0.5, 0.75, 1].map(frac => (
                                                                <line key={frac} x1={padding} y1={280 - frac * 240} x2={Math.max(statsTemporal.length * 20, 400) - 10} y2={280 - frac * 240} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                                                            ))}
                                                            {/* Line paths */}
                                                            {trendChartType === 'line' && (
                                                                <>
                                                                    <polyline fill="none" stroke="var(--color-prevenort-primary, #f97316)" strokeWidth="2" points={statsTemporal.map((d: any, i: number) => {
                                                                        const x = padding + i * ((Math.max(statsTemporal.length * 20, 400) - padding - 10) / Math.max(statsTemporal.length - 1, 1));
                                                                        const y = 280 - (d.exams / maxExams) * 240;
                                                                        return `${x},${y}`;
                                                                    }).join(' ')} />
                                                                    <polyline fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" points={statsTemporal.map((d: any, i: number) => {
                                                                        const x = padding + i * ((Math.max(statsTemporal.length * 20, 400) - padding - 10) / Math.max(statsTemporal.length - 1, 1));
                                                                        const y = 280 - (d.addendas / maxExams) * 240;
                                                                        return `${x},${y}`;
                                                                    }).join(' ')} />
                                                                </>
                                                            )}
                                                            {/* Dots */}
                                                            {statsTemporal.map((d: any, i: number) => {
                                                                const x = padding + i * ((Math.max(statsTemporal.length * 20, 400) - padding - 10) / Math.max(statsTemporal.length - 1, 1));
                                                                const yExams = 280 - (d.exams / maxExams) * 240;
                                                                const yAddendas = 280 - (d.addendas / maxExams) * 240;
                                                                return (
                                                                    <g key={i}>
                                                                        <circle cx={x} cy={yExams} r={trendChartType === 'dot' ? 4 : 3} fill="var(--color-prevenort-primary, #f97316)" className="hover:r-6 transition-all cursor-pointer" opacity={0.8}>
                                                                            <title>{`${getGroupLabel(d.date)}: ${d.exams.toLocaleString()} exámenes`}</title>
                                                                        </circle>
                                                                        <circle cx={x} cy={yAddendas} r={trendChartType === 'dot' ? 3.5 : 2.5} fill="#ef4444" opacity={0.7}>
                                                                            <title>{`${getGroupLabel(d.date)}: ${d.addendas} adendas`}</title>
                                                                        </circle>
                                                                        {showLabels && i % Math.max(Math.floor(statsTemporal.length / 15), 1) === 0 && (
                                                                            <text x={x} y={296} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="7" fontWeight="bold">{getGroupLabel(d.date)}</text>
                                                                        )}
                                                                    </g>
                                                                );
                                                            })}
                                                        </svg>
                                                    </div>
                                                );
                                            })()}
                                        </motion.div>
                                    </div>

                                    {/* Mix Modalidades como fila inferior */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-1 card-premium flex flex-col">
                                            <h3 className="text-xl font-black uppercase tracking-tight mb-8">Mix Modalidades</h3>
                                            <div className="flex-1 flex flex-col justify-center gap-6">
                                                {statsByMod.length === 0 ? <p className="text-center text-[10px] font-black uppercase text-white/10 tracking-widest">Sin datos para filtrar</p> :
                                                    statsByMod.map((mod, i) => (
                                                        <div key={i} className="space-y-3">
                                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                                <span className="flex items-center gap-2">
                                                                    <span className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-prevenort-primary' : i === 1 ? 'bg-info' : i === 2 ? 'bg-success' : 'bg-white/40'}`} />
                                                                    {mod.name}
                                                                </span>
                                                                <span className="text-white">{mod.value}</span>
                                                            </div>
                                                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                                <motion.div initial={{ width: 0 }} animate={{ width: `${(mod.value / totalExams) * 100}%` }} className={`h-full ${i === 0 ? 'bg-prevenort-primary' : i === 1 ? 'bg-info' : i === 2 ? 'bg-success' : 'bg-white/40'}`} />
                                                            </div>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                        <div className="lg:col-span-2 card-premium flex items-center justify-center p-8 text-center bg-gradient-to-br from-white/[0.02] to-transparent">
                                            <div className="space-y-4">
                                                <div className="p-4 rounded-3xl bg-white/5 inline-block">
                                                    <BarChart3 className="w-12 h-12 text-prevenort-primary/20" />
                                                </div>
                                                <h4 className="text-lg font-black uppercase tracking-tighter">Insights Operativos</h4>
                                                <p className="text-[10px] font-bold text-white/20 uppercase max-w-xs leading-relaxed">
                                                    El {addendaPercentage}% de los informes requieren ajustes posteriores.
                                                    Mantener una tasa menor al 5% es crítico para la eficiencia administrativa.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'instituciones' && (() => {
                                const instFiltered = selectedInst === 'TODAS' ? filteredData : filteredData.filter(d => getFormalName(d.institucion, 'institucion') === selectedInst);
                                const instExams = instFiltered.reduce((a, c) => a + (c.cantidad_examenes || 0), 0);
                                const instAddendas = instFiltered.reduce((a, c) => a + (c.cantidad_adendas || 0), 0);
                                const instSla = instFiltered.reduce((a, c) => a + (c.cantidad_dentro_sla || 0), 0);
                                const instSlaRate = instExams > 0 ? ((instSla / instExams) * 100).toFixed(1) : '0';
                                const instAddRate = instExams > 0 ? ((instAddendas / instExams) * 100).toFixed(2) : '0';
                                const instTemporal = Object.values(instFiltered.reduce((acc, curr) => {
                                    const d = curr.fecha_reporte;
                                    if (!acc[d]) acc[d] = { date: d, exams: 0, addendas: 0, sla: 0 };
                                    acc[d].exams += curr.cantidad_examenes;
                                    acc[d].addendas += curr.cantidad_adendas;
                                    acc[d].sla += (curr.cantidad_dentro_sla || 0);
                                    return acc;
                                }, {} as any)).sort((a: any, b: any) => a.date.localeCompare(b.date)) as any[];
                                const maxInstEx = Math.max(...instTemporal.map((x: any) => x.exams), 1);
                                const instByTipo = instFiltered.reduce((acc, curr) => {
                                    const t = curr.tipo_paciente || 'O';
                                    if (!acc[t]) acc[t] = { exams: 0, sla: 0, tatSum: 0, addendas: 0 };
                                    acc[t].exams += (curr.cantidad_examenes || 0);
                                    acc[t].sla += (curr.cantidad_dentro_sla || 0);
                                    acc[t].tatSum += ((curr.tat_promedio_minutos || 0) * (curr.cantidad_examenes || 0));
                                    acc[t].addendas += (curr.cantidad_adendas || 0);
                                    return acc;
                                }, {} as Record<string, { exams: number; sla: number; tatSum: number; addendas: number }>);
                                const instTipoKeys = Object.keys(instByTipo).sort((a, b) => instByTipo[b].exams - instByTipo[a].exams).slice(0, 3);
                                const tc = (k: string) => k === 'U' || k === 'M' ? 'text-danger/60' : k === 'A' ? 'text-success/60' : k === 'H' || k === 'UPC' || k === 'UTI' ? 'text-info/60' : k === 'ONC' ? 'text-fuchsia-400/60' : 'text-white/40';
                                return (
                                    <motion.div key="inst" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                        <div className="card-premium">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-3 rounded-2xl bg-prevenort-primary/10 border border-prevenort-primary/20">
                                                        <Building2 className="w-6 h-6 text-prevenort-primary" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-black uppercase tracking-tight text-white">Consolidado Institucional</h3>
                                                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{statsByInst.length} centros activos</p>
                                                    </div>
                                                </div>
                                                <select value={selectedInst} onChange={(e) => setSelectedInst(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white outline-none focus:border-prevenort-primary transition-colors cursor-pointer">
                                                    <option value="TODAS" className="bg-neutral-900">Todas las Instituciones</option>
                                                    {statsByInst.map((inst, i) => <option key={i} value={inst.name} className="bg-neutral-900">{inst.name}</option>)}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-4 gap-4 mb-8">
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1">Total Exámenes</p>
                                                    <p className="text-2xl font-black text-white">{instExams.toLocaleString()}</p>
                                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-2">
                                                        {instTipoKeys.map(k => <span key={k} className="text-[8px] font-black uppercase"><span className={tc(k)}>{tipoLabels[k] || k}:</span> <span className="text-white/40">{instByTipo[k].exams.toLocaleString()}</span></span>)}
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1">Total Adendas</p>
                                                    <p className="text-2xl font-black text-danger">{instAddendas} <span className="text-sm text-danger/50">{instAddRate}%</span></p>
                                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-2">
                                                        {instTipoKeys.map(k => <span key={k} className="text-[8px] font-black uppercase"><span className={tc(k)}>{tipoLabels[k] || k}:</span> <span className="text-white/40">{instByTipo[k].exams > 0 ? ((instByTipo[k].addendas / instByTipo[k].exams) * 100).toFixed(1) : '0'}%</span></span>)}
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1">Dentro SLA</p>
                                                    <p className="text-2xl font-black text-success">{instSlaRate}%</p>
                                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-2">
                                                        {instTipoKeys.map(k => <span key={k} className="text-[8px] font-black uppercase"><span className={tc(k)}>{tipoLabels[k] || k}:</span> <span className="text-white/40">{instByTipo[k].exams > 0 ? ((instByTipo[k].sla / instByTipo[k].exams) * 100).toFixed(0) : '0'}%</span></span>)}
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1">Días Analizados</p>
                                                    <p className="text-2xl font-black text-info">{instTemporal.length}</p>
                                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-2">
                                                        {instTipoKeys.map(k => <span key={k} className="text-[8px] font-black uppercase"><span className={tc(k)}>{tipoLabels[k] || k}:</span> <span className="text-white/40">{instByTipo[k].exams > 0 ? (instByTipo[k].tatSum / instByTipo[k].exams).toFixed(0) : '0'}m</span></span>)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tabla Institucional */}
                                            {selectedInst === 'TODAS' && (
                                                <div className="overflow-x-auto rounded-2xl border border-white/5">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="border-b border-white/10">
                                                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40">Institución</th>
                                                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">Exámenes</th>
                                                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">Adendas</th>
                                                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">% Adendas</th>
                                                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">% SLA</th>
                                                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">TAT Prom.</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {statsByInst.map((inst, i) => (
                                                                <tr key={i} onClick={() => setSelectedInst(inst.name)} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group cursor-pointer">
                                                                    <td className="px-4 py-3"><span className="text-xs font-black uppercase tracking-tight text-white group-hover:text-prevenort-primary transition-colors">{inst.name}</span></td>
                                                                    <td className="px-4 py-3 text-right text-sm font-black text-white">{inst.value.toLocaleString()}</td>
                                                                    <td className="px-4 py-3 text-right text-sm font-black text-danger">{inst.adendas}</td>
                                                                    <td className="px-4 py-3 text-right"><span className={`text-xs font-black px-2 py-0.5 rounded-md ${Number(inst.addendaRate) < 2 ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>{inst.addendaRate}%</span></td>
                                                                    <td className="px-4 py-3 text-right"><span className={`text-xs font-black px-2 py-0.5 rounded-md ${Number(inst.slaRate) > 90 ? 'text-success bg-success/10' : 'text-warning bg-warning/10'}`}>{inst.slaRate}%</span></td>
                                                                    <td className="px-4 py-3 text-right text-sm font-black text-info">{inst.avgTat}m</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>

                                        {/* Gráfico Evolutivo */}
                                        {instTemporal.length > 0 && (
                                            <div className="card-premium min-h-[300px]">
                                                <div className="flex justify-between items-center mb-6">
                                                    <div>
                                                        <h3 className="text-lg font-black uppercase tracking-tight">Evolución Temporal {selectedInst !== 'TODAS' ? `· ${selectedInst}` : ''}</h3>
                                                        <p className="text-[10px] font-bold text-white/20 uppercase">Exámenes diarios en el periodo seleccionado</p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-prevenort-primary" /><span className="text-[8px] font-black text-white/40 uppercase">Exámenes</span></div>
                                                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-danger" /><span className="text-[8px] font-black text-white/40 uppercase">Adendas</span></div>
                                                    </div>
                                                </div>
                                                <div className="flex items-end gap-[2px] h-[220px] overflow-x-auto no-scrollbar pb-4">
                                                    {instTemporal.map((d: any, i: number) => (
                                                        <div key={i} className="flex-1 min-w-[8px] group/bar relative flex flex-col items-center justify-end h-full gap-0.5">
                                                            {d.addendas > 0 && <motion.div initial={{ height: 0 }} animate={{ height: `${(d.addendas / maxInstEx) * 100}%` }} className="w-full bg-danger rounded-t-[2px] z-10" />}
                                                            <motion.div initial={{ height: 0 }} animate={{ height: `${(d.exams / maxInstEx) * 100}%` }} className="w-full bg-gradient-to-t from-prevenort-primary/30 to-prevenort-primary/70 rounded-t-[3px] hover:to-white transition-all cursor-pointer" />
                                                            <div className="absolute -top-14 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 bg-neutral-900 border border-white/10 text-white text-[9px] font-black px-3 py-2 rounded-xl transition-all pointer-events-none z-30 shadow-2xl min-w-[90px]">
                                                                <div className="flex justify-between gap-3"><span className="text-white/40">{d.date.slice(5)}</span></div>
                                                                <div className="flex justify-between gap-3 text-prevenort-primary"><span className="text-white/40">Ex:</span><span>{d.exams}</span></div>
                                                                {d.addendas > 0 && <div className="flex justify-between gap-3 text-danger"><span className="text-white/40">Ad:</span><span>{d.addendas}</span></div>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })()}

                            {activeTab === 'medicos' && (() => {
                                const medFiltered = selectedMedico === 'TODAS' ? filteredData : filteredData.filter(d => getFormalName(d.medico, 'medico') === selectedMedico);
                                const medExams = medFiltered.reduce((a, c) => a + (c.cantidad_examenes || 0), 0);
                                const medAddendas = medFiltered.reduce((a, c) => a + (c.cantidad_adendas || 0), 0);
                                const medSla = medFiltered.reduce((a, c) => a + (c.cantidad_dentro_sla || 0), 0);
                                const medSlaRate = medExams > 0 ? ((medSla / medExams) * 100).toFixed(1) : '0';
                                const medAddRate = medExams > 0 ? ((medAddendas / medExams) * 100).toFixed(2) : '0';
                                const medTemporal = Object.values(medFiltered.reduce((acc, curr) => {
                                    const d = curr.fecha_reporte;
                                    if (!acc[d]) acc[d] = { date: d, exams: 0, addendas: 0, sla: 0 };
                                    acc[d].exams += curr.cantidad_examenes;
                                    acc[d].addendas += curr.cantidad_adendas;
                                    acc[d].sla += (curr.cantidad_dentro_sla || 0);
                                    return acc;
                                }, {} as any)).sort((a: any, b: any) => a.date.localeCompare(b.date)) as any[];
                                const maxMedEx = Math.max(...medTemporal.map((x: any) => x.exams), 1);
                                const medByTipo = medFiltered.reduce((acc, curr) => {
                                    const t = curr.tipo_paciente || 'O';
                                    if (!acc[t]) acc[t] = { exams: 0, sla: 0, tatSum: 0, addendas: 0 };
                                    acc[t].exams += (curr.cantidad_examenes || 0);
                                    acc[t].sla += (curr.cantidad_dentro_sla || 0);
                                    acc[t].tatSum += ((curr.tat_promedio_minutos || 0) * (curr.cantidad_examenes || 0));
                                    acc[t].addendas += (curr.cantidad_adendas || 0);
                                    return acc;
                                }, {} as Record<string, { exams: number; sla: number; tatSum: number; addendas: number }>);
                                const medTipoKeys = Object.keys(medByTipo).sort((a, b) => medByTipo[b].exams - medByTipo[a].exams).slice(0, 3);
                                const tc = (k: string) => k === 'U' || k === 'M' ? 'text-danger/60' : k === 'A' ? 'text-success/60' : k === 'H' || k === 'UPC' || k === 'UTI' ? 'text-info/60' : k === 'ONC' ? 'text-fuchsia-400/60' : 'text-white/40';
                                return (
                                    <motion.div key="med" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-6">
                                        <div className="card-premium">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-3 rounded-2xl bg-info/10 border border-info/20">
                                                        <UserCheck className="w-6 h-6 text-info" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-black uppercase tracking-tight text-white">Rendimiento Médico</h3>
                                                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{statsByMedico.length} profesionales</p>
                                                    </div>
                                                </div>
                                                <select value={selectedMedico} onChange={(e) => setSelectedMedico(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white outline-none focus:border-info transition-colors cursor-pointer">
                                                    <option value="TODAS" className="bg-neutral-900">Todos los Radiólogos</option>
                                                    {statsByMedico.sort((a: any, b: any) => b.volume - a.volume).map((m, i) => <option key={i} value={m.name} className="bg-neutral-900">{m.name}</option>)}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-4 gap-4 mb-8">
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1">Total Exámenes</p>
                                                    <p className="text-2xl font-black text-white">{medExams.toLocaleString()}</p>
                                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-2">
                                                        {medTipoKeys.map(k => <span key={k} className="text-[8px] font-black uppercase"><span className={tc(k)}>{tipoLabels[k] || k}:</span> <span className="text-white/40">{medByTipo[k].exams.toLocaleString()}</span></span>)}
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1">Total Adendas</p>
                                                    <p className="text-2xl font-black text-danger">{medAddendas} <span className="text-sm text-danger/50">{medAddRate}%</span></p>
                                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-2">
                                                        {medTipoKeys.map(k => <span key={k} className="text-[8px] font-black uppercase"><span className={tc(k)}>{tipoLabels[k] || k}:</span> <span className="text-white/40">{medByTipo[k].exams > 0 ? ((medByTipo[k].addendas / medByTipo[k].exams) * 100).toFixed(1) : '0'}%</span></span>)}
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1">Dentro SLA</p>
                                                    <p className="text-2xl font-black text-success">{medSlaRate}%</p>
                                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-2">
                                                        {medTipoKeys.map(k => <span key={k} className="text-[8px] font-black uppercase"><span className={tc(k)}>{tipoLabels[k] || k}:</span> <span className="text-white/40">{medByTipo[k].exams > 0 ? ((medByTipo[k].sla / medByTipo[k].exams) * 100).toFixed(0) : '0'}%</span></span>)}
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1">Días Analizados</p>
                                                    <p className="text-2xl font-black text-info">{medTemporal.length}</p>
                                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-2">
                                                        {medTipoKeys.map(k => <span key={k} className="text-[8px] font-black uppercase"><span className={tc(k)}>{tipoLabels[k] || k}:</span> <span className="text-white/40">{medByTipo[k].exams > 0 ? (medByTipo[k].tatSum / medByTipo[k].exams).toFixed(0) : '0'}m</span></span>)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tabla Médicos */}
                                            {selectedMedico === 'TODAS' && (
                                                <div className="overflow-x-auto rounded-2xl border border-white/5">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="border-b border-white/10">
                                                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40">Radiólogo</th>
                                                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">Exámenes</th>
                                                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">Adendas</th>
                                                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">% Adendas</th>
                                                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">% SLA</th>
                                                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">TAT Prom.</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {statsByMedico.sort((a: any, b: any) => b.volume - a.volume).map((med, i) => (
                                                                <tr key={i} onClick={() => setSelectedMedico(med.name)} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group cursor-pointer">
                                                                    <td className="px-4 py-3"><span className="text-xs font-black uppercase tracking-tight text-white group-hover:text-info transition-colors">{med.name}</span></td>
                                                                    <td className="px-4 py-3 text-right text-sm font-black text-white">{med.volume.toLocaleString()}</td>
                                                                    <td className="px-4 py-3 text-right text-sm font-black text-danger">{med.adendas}</td>
                                                                    <td className="px-4 py-3 text-right"><span className={`text-xs font-black px-2 py-0.5 rounded-md ${med.volume > 0 && (med.adendas / med.volume) * 100 < 2 ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>{med.volume > 0 ? ((med.adendas / med.volume) * 100).toFixed(2) : '0'}%</span></td>
                                                                    <td className="px-4 py-3 text-right"><span className={`text-xs font-black px-2 py-0.5 rounded-md ${Number(med.slaRate) > 90 ? 'text-success bg-success/10' : 'text-warning bg-warning/10'}`}>{med.slaRate}%</span></td>
                                                                    <td className="px-4 py-3 text-right text-sm font-black text-info">{med.avgTat}m</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>

                                        {/* Gráfico Evolutivo Médico */}
                                        {medTemporal.length > 0 && (
                                            <div className="card-premium min-h-[300px]">
                                                <div className="flex justify-between items-center mb-6">
                                                    <div>
                                                        <h3 className="text-lg font-black uppercase tracking-tight">Evolución Temporal {selectedMedico !== 'TODAS' ? `· ${selectedMedico}` : ''}</h3>
                                                        <p className="text-[10px] font-bold text-white/20 uppercase">Exámenes diarios en el periodo seleccionado</p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-info" /><span className="text-[8px] font-black text-white/40 uppercase">Exámenes</span></div>
                                                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-danger" /><span className="text-[8px] font-black text-white/40 uppercase">Adendas</span></div>
                                                    </div>
                                                </div>
                                                <div className="flex items-end gap-[2px] h-[220px] overflow-x-auto no-scrollbar pb-4">
                                                    {medTemporal.map((d: any, i: number) => (
                                                        <div key={i} className="flex-1 min-w-[8px] group/bar relative flex flex-col items-center justify-end h-full gap-0.5">
                                                            {d.addendas > 0 && <motion.div initial={{ height: 0 }} animate={{ height: `${(d.addendas / maxMedEx) * 100}%` }} className="w-full bg-danger rounded-t-[2px] z-10" />}
                                                            <motion.div initial={{ height: 0 }} animate={{ height: `${(d.exams / maxMedEx) * 100}%` }} className="w-full bg-gradient-to-t from-info/30 to-info/70 rounded-t-[3px] hover:to-white transition-all cursor-pointer" />
                                                            <div className="absolute -top-14 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 bg-neutral-900 border border-white/10 text-white text-[9px] font-black px-3 py-2 rounded-xl transition-all pointer-events-none z-30 shadow-2xl min-w-[90px]">
                                                                <div className="flex justify-between gap-3"><span className="text-white/40">{d.date.slice(5)}</span></div>
                                                                <div className="flex justify-between gap-3 text-info"><span className="text-white/40">Ex:</span><span>{d.exams}</span></div>
                                                                {d.addendas > 0 && <div className="flex justify-between gap-3 text-danger"><span className="text-white/40">Ad:</span><span>{d.addendas}</span></div>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })()}

                            {activeTab === 'grupos' && (() => {
                                const groupColors = ['#f97316', '#06b6d4', '#22c55e', '#a855f7', '#ec4899', '#eab308', '#ef4444', '#3b82f6'];
                                const allMedNames = statsByMedico.map((m: any) => m.name).sort();

                                const startEditing = (grupo?: MedicoGroup) => {
                                    setEditingGrupo(grupo ? { ...grupo } : {
                                        nombre: '',
                                        descripcion: '',
                                        lider: '',
                                        miembros: [],
                                        color: groupColors[grupos.length % groupColors.length]
                                    });
                                };

                                const handleSave = async () => {
                                    if (!editingGrupo || !editingGrupo.nombre.trim()) return;
                                    try {
                                        await saveGrupoMedico(editingGrupo);
                                        await loadGrupos();
                                        setEditingGrupo(null);
                                    } catch (e) { console.error('Error saving grupo:', e); }
                                };

                                const handleDelete = async (id: string) => {
                                    if (!confirm('¿Eliminar este grupo permanentemente?')) return;
                                    try {
                                        await deleteGrupoMedico(id);
                                        await loadGrupos();
                                        if (selectedGrupo === id) setSelectedGrupo(null);
                                    } catch (e) { console.error('Error deleting grupo:', e); }
                                };

                                const toggleMember = (name: string) => {
                                    if (!editingGrupo) return;
                                    const miembros = editingGrupo.miembros.includes(name)
                                        ? editingGrupo.miembros.filter(m => m !== name)
                                        : [...editingGrupo.miembros, name];
                                    // Si removieron al líder, limpiarlo
                                    const lider = editingGrupo.lider === name && !miembros.includes(name) ? '' : editingGrupo.lider;
                                    setEditingGrupo({ ...editingGrupo, miembros, lider });
                                };

                                // Stats del grupo seleccionado
                                const activeGroup = grupos.find(g => g.id === selectedGrupo);
                                const groupData = activeGroup ? filteredData.filter(d => activeGroup.miembros.includes(getFormalName(d.medico, 'medico'))) : [];
                                const grpExams = groupData.reduce((a, c) => a + (c.cantidad_examenes || 0), 0);
                                const grpAddendas = groupData.reduce((a, c) => a + (c.cantidad_adendas || 0), 0);
                                const grpSla = groupData.reduce((a, c) => a + (c.cantidad_dentro_sla || 0), 0);
                                const grpSlaRate = grpExams > 0 ? ((grpSla / grpExams) * 100).toFixed(1) : '0';
                                const grpAddRate = grpExams > 0 ? ((grpAddendas / grpExams) * 100).toFixed(2) : '0';
                                const grpTatSum = groupData.reduce((a, c) => a + ((c.tat_promedio_minutos || 0) * (c.cantidad_examenes || 0)), 0);
                                const grpAvgTat = grpExams > 0 ? (grpTatSum / grpExams).toFixed(0) : '0';

                                // Stats por miembro del grupo
                                const memberStats = activeGroup ? activeGroup.miembros.map(name => {
                                    const mData = groupData.filter(d => getFormalName(d.medico, 'medico') === name);
                                    const exams = mData.reduce((a, c) => a + (c.cantidad_examenes || 0), 0);
                                    const addendas = mData.reduce((a, c) => a + (c.cantidad_adendas || 0), 0);
                                    const sla = mData.reduce((a, c) => a + (c.cantidad_dentro_sla || 0), 0);
                                    const tatSum = mData.reduce((a, c) => a + ((c.tat_promedio_minutos || 0) * (c.cantidad_examenes || 0)), 0);
                                    return {
                                        name,
                                        exams,
                                        addendas,
                                        addRate: exams > 0 ? ((addendas / exams) * 100).toFixed(2) : '0',
                                        slaRate: exams > 0 ? ((sla / exams) * 100).toFixed(1) : '0',
                                        avgTat: exams > 0 ? (tatSum / exams).toFixed(0) : '0',
                                        isLeader: name === activeGroup.lider
                                    };
                                }).sort((a, b) => b.exams - a.exams) : [];

                                return (
                                    <motion.div key="grupos" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-6">
                                        {/* Header + Crear */}
                                        <div className="card-premium">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                                                        <UsersRound className="w-6 h-6 text-purple-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-black uppercase tracking-tight text-white">Grupos de Trabajo</h3>
                                                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{grupos.length} grupos configurados</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => startEditing()}
                                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase tracking-widest hover:bg-purple-500/30 transition-all"
                                                >
                                                    <Plus className="w-4 h-4" /> Nuevo Grupo
                                                </button>
                                            </div>

                                            {/* Lista de grupos existentes */}
                                            {grupos.length === 0 && !editingGrupo && (
                                                <div className="text-center py-16">
                                                    <UsersRound className="w-16 h-16 text-white/10 mx-auto mb-4" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20">No hay grupos creados</p>
                                                    <p className="text-[9px] text-white/10 mt-1">Crea un grupo para agrupar médicos y ver sus estadísticas consolidadas</p>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {grupos.map(g => (
                                                    <div
                                                        key={g.id}
                                                        onClick={() => setSelectedGrupo(selectedGrupo === g.id ? null : g.id!)}
                                                        className={`p-5 rounded-2xl border cursor-pointer transition-all group/card ${selectedGrupo === g.id
                                                            ? 'bg-white/10 border-white/20 shadow-lg'
                                                            : 'bg-white/[0.03] border-white/5 hover:border-white/15 hover:bg-white/[0.05]'
                                                            }`}
                                                    >
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color || '#f97316' }} />
                                                                <h4 className="text-sm font-black uppercase tracking-tight text-white">{g.nombre}</h4>
                                                            </div>
                                                            <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                                <button onClick={(e) => { e.stopPropagation(); startEditing(g); }} className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-all">
                                                                    <Edit3 className="w-3 h-3" />
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(g.id!); }} className="p-1.5 rounded-lg hover:bg-danger/20 text-white/30 hover:text-danger transition-all">
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {g.descripcion && <p className="text-[9px] text-white/30 mb-3 line-clamp-2">{g.descripcion}</p>}
                                                        <div className="flex items-center gap-2 mb-2">
                                                            {g.lider && (
                                                                <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-warning/70">
                                                                    <Crown className="w-3 h-3" /> {g.lider}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {g.miembros.slice(0, 5).map(m => (
                                                                <span key={m} className="px-2 py-0.5 rounded-md bg-white/5 text-[7px] font-black uppercase tracking-widest text-white/40">{m.split(' ').slice(0, 2).join(' ')}</span>
                                                            ))}
                                                            {g.miembros.length > 5 && (
                                                                <span className="px-2 py-0.5 rounded-md bg-white/5 text-[7px] font-black uppercase text-white/20">+{g.miembros.length - 5}</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[8px] font-bold text-white/15 uppercase tracking-widest mt-2">{g.miembros.length} miembros</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Modal/Panel de Edición */}
                                        {editingGrupo && (
                                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-premium border-purple-500/20">
                                                <div className="flex items-center justify-between mb-6">
                                                    <h3 className="text-lg font-black uppercase tracking-tight text-purple-300">
                                                        {editingGrupo.id ? 'Editar Grupo' : 'Nuevo Grupo'}
                                                    </h3>
                                                    <button onClick={() => setEditingGrupo(null)} className="p-2 rounded-xl hover:bg-white/10 text-white/30 hover:text-white transition-all">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Columna izquierda: datos del grupo */}
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1 block">Nombre del Grupo *</label>
                                                            <input
                                                                type="text"
                                                                value={editingGrupo.nombre}
                                                                onChange={(e) => setEditingGrupo({ ...editingGrupo, nombre: e.target.value })}
                                                                placeholder="Ej: Equipo Neuroradiología Chile"
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-purple-500/50 transition-colors"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1 block">Descripción</label>
                                                            <textarea
                                                                value={editingGrupo.descripcion || ''}
                                                                onChange={(e) => setEditingGrupo({ ...editingGrupo, descripcion: e.target.value })}
                                                                placeholder="Área, país, especialidad..."
                                                                rows={2}
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white/60 outline-none focus:border-purple-500/50 transition-colors resize-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1 block">Líder del Grupo</label>
                                                            <select
                                                                value={editingGrupo.lider || ''}
                                                                onChange={(e) => setEditingGrupo({ ...editingGrupo, lider: e.target.value })}
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white/60 outline-none focus:border-purple-500/50 transition-colors appearance-none cursor-pointer"
                                                            >
                                                                <option value="" className="bg-neutral-900">Sin líder asignado</option>
                                                                {editingGrupo.miembros.map(m => (
                                                                    <option key={m} value={m} className="bg-neutral-900">{m}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1 block">Color</label>
                                                            <div className="flex gap-2">
                                                                {groupColors.map(c => (
                                                                    <button
                                                                        key={c}
                                                                        onClick={() => setEditingGrupo({ ...editingGrupo, color: c })}
                                                                        className={`w-7 h-7 rounded-lg border-2 transition-all ${editingGrupo.color === c ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-80'}`}
                                                                        style={{ backgroundColor: c }}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        {/* Miembros seleccionados */}
                                                        <div>
                                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-2 block">
                                                                Miembros Seleccionados ({editingGrupo.miembros.length})
                                                            </label>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {editingGrupo.miembros.length === 0 && (
                                                                    <p className="text-[9px] text-white/15 italic">Selecciona médicos de la lista →</p>
                                                                )}
                                                                {editingGrupo.miembros.map(m => (
                                                                    <span key={m} className="flex items-center gap-1 px-2. py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-[8px] font-black uppercase tracking-widest text-purple-200">
                                                                        {m === editingGrupo.lider && <Crown className="w-2.5 h-2.5 text-warning" />}
                                                                        {m}
                                                                        <button onClick={() => toggleMember(m)} className="ml-1 text-white/30 hover:text-danger transition-colors">
                                                                            <X className="w-2.5 h-2.5" />
                                                                        </button>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Columna derecha: pool de médicos */}
                                                    <div>
                                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-2 block">
                                                            Médicos Disponibles ({allMedNames.length})
                                                        </label>
                                                        <div className="max-h-[360px] overflow-y-auto rounded-xl border border-white/5 bg-white/[0.02] no-scrollbar">
                                                            {allMedNames.map(name => {
                                                                const isSelected = editingGrupo.miembros.includes(name);
                                                                return (
                                                                    <button
                                                                        key={name}
                                                                        onClick={() => toggleMember(name)}
                                                                        className={`w-full flex items-center justify-between px-4 py-2.5 text-left border-b border-white/5 last:border-0 transition-all ${isSelected
                                                                            ? 'bg-purple-500/10 text-purple-200'
                                                                            : 'text-white/40 hover:bg-white/[0.03] hover:text-white/60'
                                                                            }`}
                                                                    >
                                                                        <span className="text-[10px] font-black uppercase tracking-widest">{name}</span>
                                                                        {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Botón Guardar */}
                                                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-white/5">
                                                    <button onClick={() => setEditingGrupo(null)} className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        onClick={handleSave}
                                                        disabled={!editingGrupo.nombre.trim() || editingGrupo.miembros.length === 0}
                                                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-purple-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <Save className="w-3.5 h-3.5" /> {editingGrupo.id ? 'Actualizar' : 'Crear Grupo'}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Estadísticas del grupo seleccionado */}
                                        {activeGroup && (
                                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                                <div className="card-premium">
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: activeGroup.color || '#f97316' }} />
                                                        <h3 className="text-xl font-black uppercase tracking-tight text-white">{activeGroup.nombre}</h3>
                                                        {activeGroup.lider && (
                                                            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-warning/60">
                                                                <Crown className="w-3 h-3" /> Líder: {activeGroup.lider}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* KPIs del grupo */}
                                                    <div className="grid grid-cols-4 gap-4 mb-8">
                                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                            <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1">Total Exámenes</p>
                                                            <p className="text-2xl font-black text-white">{grpExams.toLocaleString()}</p>
                                                        </div>
                                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                            <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1">Adendas</p>
                                                            <p className="text-2xl font-black text-danger">{grpAddendas} <span className="text-sm text-danger/50">{grpAddRate}%</span></p>
                                                        </div>
                                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                            <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1">SLA</p>
                                                            <p className="text-2xl font-black text-success">{grpSlaRate}%</p>
                                                        </div>
                                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                            <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1">TAT Promedio</p>
                                                            <p className="text-2xl font-black text-info">{grpAvgTat}m</p>
                                                        </div>
                                                    </div>

                                                    {/* Tabla de miembros */}
                                                    <div className="overflow-x-auto rounded-2xl border border-white/5">
                                                        <table className="w-full text-left">
                                                            <thead>
                                                                <tr className="border-b border-white/10">
                                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40">Miembro</th>
                                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">Exámenes</th>
                                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">Adendas</th>
                                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">% Adendas</th>
                                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">% SLA</th>
                                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">TAT Prom.</th>
                                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">% del Grupo</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {memberStats.map((mem, i) => (
                                                                    <tr key={i} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                                                                        <td className="px-4 py-3">
                                                                            <span className="text-xs font-black uppercase tracking-tight text-white flex items-center gap-2">
                                                                                {mem.isLeader && <Crown className="w-3.5 h-3.5 text-warning" />}
                                                                                {mem.name}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right text-sm font-black text-white">{mem.exams.toLocaleString()}</td>
                                                                        <td className="px-4 py-3 text-right text-sm font-black text-danger">{mem.addendas}</td>
                                                                        <td className="px-4 py-3 text-right">
                                                                            <span className={`text-xs font-black px-2 py-0.5 rounded-md ${Number(mem.addRate) < 2 ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>
                                                                                {mem.addRate}%
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right">
                                                                            <span className={`text-xs font-black px-2 py-0.5 rounded-md ${Number(mem.slaRate) > 90 ? 'text-success bg-success/10' : 'text-warning bg-warning/10'}`}>
                                                                                {mem.slaRate}%
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right text-sm font-black text-info">{mem.avgTat}m</td>
                                                                        <td className="px-4 py-3 text-right">
                                                                            <div className="flex items-center justify-end gap-2">
                                                                                <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                                                                    <div className="h-full rounded-full" style={{ width: `${grpExams > 0 ? (mem.exams / grpExams) * 100 : 0}%`, backgroundColor: activeGroup.color || '#f97316' }} />
                                                                                </div>
                                                                                <span className="text-[9px] font-black text-white/40">{grpExams > 0 ? ((mem.exams / grpExams) * 100).toFixed(0) : '0'}%</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                );
                            })()}

                            {activeTab === 'calidad' && (
                                <motion.div key="calidad" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="card-premium min-h-[450px] flex flex-col items-center justify-center p-20 text-center">
                                    <div className="w-32 h-32 rounded-full border-2 border-dashed border-prevenort-primary/30 flex items-center justify-center relative mb-8 animate-spin-slow">
                                        <ShieldAlert className="w-12 h-12 text-prevenort-primary animate-pulse" />
                                        <div className="absolute top-0 w-4 h-4 rounded-full bg-prevenort-primary shadow-lg shadow-orange-500/50" />
                                    </div>
                                    <h3 className="text-3xl font-black uppercase tracking-tight mb-4">Motor de Inteligencia Operativa</h3>
                                    <p className="max-w-md text-prevenort-text/40 font-bold uppercase text-[10px] tracking-widest leading-relaxed">
                                        Analizando patrones de producción cruzada, TAT por modalidad y tasa de recurrencia en adendas.
                                        El sistema de auto-descubrimiento ha mapeado el 100% de la red de prestadores.
                                    </p>
                                    <div className="mt-12 flex gap-4">
                                        <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-warning">
                                            Alertas Críticas: 0
                                        </div>
                                        <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-success">
                                            Estado: Saludable
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'ranking' && (() => {
                                // Normalizar: statsByInst usa 'value', statsByMedico usa 'volume'
                                const rankData = (rankMode === 'instituciones' ? statsByInst : statsByMedico).map((item: any) => ({
                                    ...item,
                                    volume: item.volume || item.value || 0
                                }));
                                // Filtrar por tipo de paciente si aplica
                                const rankByTipo = rankTipo === 'ALL' ? rankData.map((item: any) => {
                                    return { ...item };
                                }) : (() => {
                                    // Recalcular stats por entidad filtrando por tipo_paciente (con agrupación)
                                    const groupField = rankMode === 'instituciones' ? 'institucion' : 'medico';
                                    const matchTipos = TIPO_GROUPS[rankTipo] || [rankTipo];
                                    const tipoFiltered = filteredData.filter(d => matchTipos.includes(d.tipo_paciente));
                                    const grouped = tipoFiltered.reduce((acc, curr) => {
                                        const key = getFormalName(curr[groupField], groupField === 'institucion' ? 'institucion' : 'medico');
                                        if (!acc[key]) acc[key] = { name: key, volume: 0, adendas: 0, withinSla: 0, tatSum: 0 };
                                        acc[key].volume += (curr.cantidad_examenes || 0);
                                        acc[key].adendas += (curr.cantidad_adendas || 0);
                                        acc[key].withinSla += (curr.cantidad_dentro_sla || 0);
                                        acc[key].tatSum += ((curr.tat_promedio_minutos || 0) * (curr.cantidad_examenes || 0));
                                        return acc;
                                    }, {} as any);
                                    return Object.values(grouped).map((g: any) => ({
                                        ...g,
                                        slaRate: g.volume > 0 ? ((g.withinSla / g.volume) * 100).toFixed(1) : '0',
                                        avgTat: g.volume > 0 ? (g.tatSum / g.volume).toFixed(0) : '0'
                                    }));
                                })() as any[];

                                // Calcular valor para la métrica elegida
                                const getValue = (item: any): number => {
                                    if (rankMetric === 'exams') return item.volume || 0;
                                    if (rankMetric === 'addendas') return item.volume > 0 ? (item.adendas / item.volume) * 100 : 0;
                                    if (rankMetric === 'sla') return Number(item.slaRate) || 0;
                                    if (rankMetric === 'tat') return Number(item.avgTat) || 0;
                                    return 0;
                                };
                                const formatValue = (v: number): string => {
                                    if (rankMetric === 'exams') return v.toLocaleString();
                                    if (rankMetric === 'addendas') return `${v.toFixed(2)}%`;
                                    if (rankMetric === 'sla') return `${v.toFixed(1)}%`;
                                    if (rankMetric === 'tat') return `${v.toFixed(0)}m`;
                                    return String(v);
                                };
                                // Ranking: para TAT y Adendas, menor es mejor; para exams y SLA, mayor es mejor
                                const isLowerBetter = rankMetric === 'tat' || rankMetric === 'addendas';
                                const effectiveAsc = rankOrder === 'auto' ? isLowerBetter : rankOrder === 'asc';
                                const sorted = [...rankByTipo].filter((d: any) => d.volume > 0).sort((a: any, b: any) => {
                                    const va = getValue(a), vb = getValue(b);
                                    return effectiveAsc ? va - vb : vb - va;
                                });
                                const maxVal = sorted.length > 0 ? Math.max(...sorted.map((s: any) => getValue(s)), 1) : 1;
                                const metricLabels: Record<string, string> = { exams: 'Exámenes', addendas: '% Adendas', sla: '% SLA', tat: 'TAT Promedio' };
                                const tipoFilterLabels: Record<string, string> = { ALL: 'Todos', U: 'Urgencia + Mutual', A: 'Ambulatorio', H: 'Hospital. + UPC/UTI', ONC: 'Oncológicos' };

                                return (
                                    <motion.div key="ranking" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                                        {/* Controles del Ranking */}
                                        <div className="card-premium">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                                                        <Trophy className="w-6 h-6 text-yellow-500" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-black uppercase tracking-tight text-white">Ranking Comparativo</h3>
                                                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{sorted.length} entidades · {metricLabels[rankMetric]} · {tipoFilterLabels[rankTipo]}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Toggles */}
                                            <div className="flex flex-wrap gap-3 mb-6">
                                                {/* Modo: Instituciones / Médicos */}
                                                <div className="flex rounded-xl overflow-hidden border border-white/10">
                                                    {(['instituciones', 'medicos'] as const).map(m => (
                                                        <button key={m} onClick={() => setRankMode(m)} className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${rankMode === m ? 'bg-prevenort-primary text-black' : 'bg-white/5 text-white/40 hover:text-white/70'}`}>
                                                            {m === 'instituciones' ? '🏥 Instituciones' : '👨‍⚕️ Médicos'}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Métrica */}
                                                <div className="flex rounded-xl overflow-hidden border border-white/10">
                                                    {(['exams', 'addendas', 'sla', 'tat'] as const).map(met => (
                                                        <button key={met} onClick={() => setRankMetric(met)} className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${rankMetric === met ? 'bg-info text-black' : 'bg-white/5 text-white/40 hover:text-white/70'}`}>
                                                            {metricLabels[met]}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Tipo Paciente */}
                                                <div className="flex flex-wrap rounded-xl overflow-hidden border border-white/10">
                                                    {(['ALL', 'U', 'A', 'H', 'ONC'] as const).map(tp => (
                                                        <button key={tp} onClick={() => setRankTipo(tp)} className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${rankTipo === tp ? (tp === 'U' ? 'bg-danger text-white' : tp === 'A' ? 'bg-success text-black' : tp === 'H' ? 'bg-info text-black' : tp === 'ONC' ? 'bg-fuchsia-500 text-white' : 'bg-white/20 text-white') : 'bg-white/5 text-white/40 hover:text-white/70'}`}>
                                                            {tipoFilterLabels[tp]}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Orden */}
                                                <button
                                                    onClick={() => setRankOrder(prev => prev === 'auto' ? 'desc' : prev === 'desc' ? 'asc' : 'auto')}
                                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest transition-all hover:bg-white/10"
                                                    title={`Orden: ${rankOrder === 'auto' ? 'Automático' : rankOrder === 'asc' ? 'Ascendente' : 'Descendente'}`}
                                                >
                                                    <span className={rankOrder !== 'auto' ? 'text-yellow-400' : 'text-white/40'}>
                                                        {rankOrder === 'asc' ? '↑' : rankOrder === 'desc' ? '↓' : '⇅'}
                                                    </span>
                                                    <span className={rankOrder !== 'auto' ? 'text-yellow-400' : 'text-white/40'}>
                                                        {rankOrder === 'auto' ? 'Auto' : rankOrder === 'asc' ? 'Menor→Mayor' : 'Mayor→Menor'}
                                                    </span>
                                                </button>
                                            </div>

                                            {/* Barras Horizontales del Ranking */}
                                            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                                                {sorted.map((item: any, idx: number) => {
                                                    const val = getValue(item);
                                                    const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                                                    const isTop3 = idx < 3;
                                                    const isBottom3 = idx >= sorted.length - 3 && sorted.length > 6;
                                                    const barColor = isLowerBetter
                                                        ? (isTop3 ? 'from-success/60 to-success' : isBottom3 ? 'from-danger/60 to-danger' : 'from-white/10 to-white/20')
                                                        : (isTop3 ? 'from-success/60 to-success' : isBottom3 ? 'from-danger/60 to-danger' : 'from-white/10 to-white/20');
                                                    const posColor = isTop3 ? 'text-success bg-success/10 border-success/20' : isBottom3 ? 'text-danger bg-danger/10 border-danger/20' : 'text-white/40 bg-white/5 border-white/10';
                                                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;

                                                    return (
                                                        <motion.div
                                                            key={item.name}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: idx * 0.02 }}
                                                            className="flex items-center gap-3 group hover:bg-white/[0.02] rounded-xl px-3 py-2 transition-colors"
                                                        >
                                                            {/* Position badge */}
                                                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-[10px] font-black shrink-0 ${posColor}`}>
                                                                {medal || `#${idx + 1}`}
                                                            </div>

                                                            {/* Name */}
                                                            <div className="w-[160px] shrink-0 truncate">
                                                                <span className="text-[10px] font-black uppercase tracking-tight text-white group-hover:text-prevenort-primary transition-colors">{item.name}</span>
                                                            </div>

                                                            {/* Bar */}
                                                            <div className="flex-1 h-7 bg-white/5 rounded-lg overflow-hidden relative">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${Math.max(pct, 2)}%` }}
                                                                    transition={{ duration: 0.8, delay: idx * 0.02, ease: 'easeOut' }}
                                                                    className={`h-full bg-gradient-to-r ${barColor} rounded-lg`}
                                                                />
                                                            </div>

                                                            {/* Value */}
                                                            <div className="w-[80px] shrink-0 text-right">
                                                                <span className={`text-sm font-black ${isTop3 ? 'text-success' : isBottom3 ? 'text-danger' : 'text-white/60'}`}>
                                                                    {formatValue(val)}
                                                                </span>
                                                            </div>

                                                            {/* Volume context (when not ranking by exams) */}
                                                            {rankMetric !== 'exams' && (
                                                                <div className="w-[50px] shrink-0 text-right">
                                                                    <span className="text-[8px] font-bold text-white/20 uppercase">{item.volume.toLocaleString()} ex</span>
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>

                                            {sorted.length === 0 && (
                                                <div className="text-center py-20 text-white/20">
                                                    <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                                    <p className="text-sm font-black uppercase">Sin datos para este filtro</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Resumen Top/Bottom */}
                                        {sorted.length >= 6 && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="card-premium">
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-success mb-4">🏆 Top 3 — Mejor {metricLabels[rankMetric]}</h4>
                                                    <div className="space-y-3">
                                                        {sorted.slice(0, 3).map((item: any, i: number) => (
                                                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-success/5 border border-success/10">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                                                                    <span className="text-[10px] font-black uppercase text-white">{item.name}</span>
                                                                </div>
                                                                <span className="text-sm font-black text-success">{formatValue(getValue(item))}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="card-premium">
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-danger mb-4">⚠️ Bottom 3 — {isLowerBetter ? 'Mayor' : 'Menor'} {metricLabels[rankMetric]}</h4>
                                                    <div className="space-y-3">
                                                        {sorted.slice(-3).reverse().map((item: any, i: number) => (
                                                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-danger/5 border border-danger/10">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="w-6 h-6 rounded-full bg-danger/10 flex items-center justify-center text-[9px] font-black text-danger">#{sorted.length - 2 + i}</span>
                                                                    <span className="text-[10px] font-black uppercase text-white">{item.name}</span>
                                                                </div>
                                                                <span className="text-sm font-black text-danger">{formatValue(getValue(item))}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })()}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};
