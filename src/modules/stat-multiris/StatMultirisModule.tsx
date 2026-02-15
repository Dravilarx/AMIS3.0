import React, { useState, useEffect } from 'react';
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
    UserCheck
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
    saveNameMapping
} from './multirisService';

// --- Componentes de UI ---

const StatCard = ({ title, value, change, icon: Icon, trend, subtitle, color = 'primary' }: any) => {
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
    const [activeTab, setActiveTab] = useState<'general' | 'instituciones' | 'medicos' | 'calidad'>('general');
    const [filterModalidad, setFilterModalidad] = useState<string>('TODAS');
    const [filterInstitucion, setFilterInstitucion] = useState<string>('TODAS');

    const [consolidatedData, setConsolidatedData] = useState<any[]>([]);
    const [filteredData, setFilteredData] = useState<any[]>([]);
    const [slaConfigs, setSlaConfigs] = useState<any[]>([]);
    const [mappings, setMappings] = useState<any[]>([]);

    const [uploadStatus, setUploadStatus] = useState<{ status: 'idle' | 'uploading' | 'success' | 'error', message?: string }>({ status: 'idle' });

    const [newSla, setNewSla] = useState({
        institucion: '',
        modalidad: 'CT',
        tipo: 'U',
        target_minutes: 120
    });

    useEffect(() => {
        loadData();
        loadConfigs();
        loadMappings();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await getConsolidatedStats();
            setConsolidatedData(data);
            setFilteredData(data);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let result = consolidatedData;
        if (filterModalidad !== 'TODAS') {
            result = result.filter(d => d.modalidad === filterModalidad);
        }
        if (filterInstitucion !== 'TODAS') {
            result = result.filter(d => d.institucion === filterInstitucion);
        }
        setFilteredData(result);
    }, [filterModalidad, filterInstitucion, consolidatedData]);

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

    const handleSaveSla = async () => {
        try {
            const configToSave = {
                ...newSla,
                institucion: newSla.institucion.trim() === '' ? null : newSla.institucion.trim()
            };
            await saveSlaConfig(configToSave);
            loadConfigs();
            setNewSla({ ...newSla, institucion: '' });
        } catch (error: any) {
            alert('Error al guardar configuración: ' + error.message);
        }
    };

    const handleDeleteSla = async (id: string) => {
        if (!confirm('¿Seguro que deseas eliminar esta regla de SLA?')) return;
        try {
            await deleteSlaConfig(id);
            loadConfigs();
        } catch (error: any) {
            alert('Error al eliminar: ' + error.message);
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
    const totalExams = filteredData.reduce((acc, curr) => acc + curr.cantidad_examenes, 0);
    const totalWithinSla = filteredData.reduce((acc, curr) => acc + (curr.cantidad_dentro_sla || 0), 0);
    const slaCompliance = totalExams > 0 ? ((totalWithinSla / totalExams) * 100).toFixed(1) : '0';
    const avgTat = filteredData.length > 0
        ? (filteredData.reduce((acc, curr) => acc + (curr.tat_promedio_minutos * curr.cantidad_examenes), 0) / totalExams).toFixed(1)
        : '0';
    const totalAddendas = filteredData.reduce((acc, curr) => acc + curr.cantidad_adendas, 0);

    // Distribución por Modalidad
    const statsByMod = Object.values(filteredData.reduce((acc, curr) => {
        if (!acc[curr.modalidad]) acc[curr.modalidad] = { name: curr.modalidad, value: 0 };
        acc[curr.modalidad].value += curr.cantidad_examenes;
        return acc;
    }, {} as any)) as any[];

    // Agrupamiento por Institución (usando Equivalencia)
    const statsByInst = Object.values(filteredData.reduce((acc, curr) => {
        const formalName = getFormalName(curr.institucion, 'institucion');
        if (!acc[formalName]) acc[formalName] = { name: formalName, value: 0, withinSla: 0 };
        acc[formalName].value += curr.cantidad_examenes;
        acc[formalName].withinSla += (curr.cantidad_dentro_sla || 0);
        return acc;
    }, {} as any)).sort((a: any, b: any) => b.value - a.value) as any[];

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

    const statsTemporal = Object.values(filteredData.reduce((acc, curr) => {
        const date = curr.fecha_reporte;
        if (!acc[date]) acc[date] = { date, value: 0 };
        acc[date].value += curr.cantidad_examenes;
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
                        <h1 className="text-5xl font-black tracking-tighter text-white mb-3 uppercase flex items-center gap-4">
                            AMIS <span className="text-prevenort-primary px-4 py-1.5 rounded-2xl bg-prevenort-primary/10 border border-prevenort-primary/20 shadow-lg shadow-orange-500/10">MULTIRIS</span>
                        </h1>
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-prevenort-text/40">
                                <ShieldAlert className="w-3.5 h-3.5 text-success" /> BI Analytics Engine 3.0
                            </span>
                            <div className="h-1 w-1 rounded-full bg-white/20" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-prevenort-text/40">Smart Data Merging</span>
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
            </div>

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
                                                        <input
                                                            type="text"
                                                            defaultValue={m.formal_name}
                                                            onBlur={(e) => handleUpdateMapping(m.id, e.target.value)}
                                                            placeholder="Nombre formal en AMIS..."
                                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold focus:border-success outline-none"
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
                                                        <input
                                                            type="text"
                                                            defaultValue={m.formal_name}
                                                            onBlur={(e) => handleUpdateMapping(m.id, e.target.value)}
                                                            placeholder="Nombre Real / Recursos Humanos..."
                                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold focus:border-success outline-none"
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
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1">
                                <div className="card-premium space-y-6 sticky top-24">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 rounded-xl bg-info/10 text-info">
                                            <Plus className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-lg font-black uppercase tracking-tight">Nueva Regla de SLA</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest ml-1">Institución (Planilla)</label>
                                            <select
                                                value={newSla.institucion}
                                                onChange={(e) => setNewSla({ ...newSla, institucion: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-info outline-none transition-all font-bold appearance-none bg-neutral-900"
                                            >
                                                <option value="">Global (Todas)</option>
                                                {mappings.filter(m => m.category === 'institucion').map(m => (
                                                    <option key={m.id} value={m.raw_name}>{m.raw_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest ml-1">Modalidad</label>
                                                <select
                                                    value={newSla.modalidad}
                                                    onChange={(e) => setNewSla({ ...newSla, modalidad: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-info outline-none transition-all font-bold appearance-none bg-neutral-900"
                                                >
                                                    {['CT', 'MR', 'DX', 'US', 'MG', 'XA'].map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest ml-1">Tipo</label>
                                                <select
                                                    value={newSla.tipo}
                                                    onChange={(e) => setNewSla({ ...newSla, tipo: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-info outline-none transition-all font-bold appearance-none bg-neutral-900"
                                                >
                                                    <option value="U">Urgencia (U)</option>
                                                    <option value="A">Ambulatorio (A)</option>
                                                    <option value="H">Hospitalizado (H)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest ml-1">Meta TAT (Minutos)</label>
                                            <input
                                                type="number"
                                                value={newSla.target_minutes}
                                                onChange={(e) => setNewSla({ ...newSla, target_minutes: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-info outline-none transition-all font-bold"
                                            />
                                        </div>
                                        <button onClick={handleSaveSla} className="w-full py-4 bg-info text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg shadow-cyan-500/20">
                                            <Save className="w-4 h-4" /> Guardar Regla
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="lg:col-span-2 space-y-4">
                                <div className="card-premium h-[600px] overflow-hidden flex flex-col p-0">
                                    <div className="p-8 border-b border-white/5">
                                        <h3 className="text-xl font-black uppercase tracking-tight">SLAs Activos</h3>
                                    </div>
                                    <div className="overflow-y-auto flex-1 no-scrollbar">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-prevenort-text/30 sticky top-0 bg-prevenort-surface z-10">
                                                    <th className="px-8 py-4 text-left">Institución</th>
                                                    <th className="px-8 py-4 text-left">Mod./Tipo</th>
                                                    <th className="px-8 py-4 text-left">Meta</th>
                                                    <th className="px-8 py-4 text-right"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {slaConfigs.map((config) => (
                                                    <tr key={config.id} className="hover:bg-white/[0.02] transition-colors group">
                                                        <td className="px-8 py-4 uppercase font-bold text-sm">
                                                            {config.institucion || <span className="text-[10px] font-black bg-white/10 px-2 py-1 rounded text-white/40">Global</span>}
                                                        </td>
                                                        <td className="px-8 py-4">
                                                            <span className="text-xs font-black text-prevenort-primary mr-2">{config.modalidad}</span>
                                                            <span className="text-[10px] font-black text-white/30 uppercase">{config.tipo === 'U' ? 'Urgencia' : config.tipo === 'H' ? 'Hosp.' : 'Amb.'}</span>
                                                        </td>
                                                        <td className="px-8 py-4 font-black text-sm">{config.target_minutes} min</td>
                                                        <td className="px-8 py-4 text-right">
                                                            <button onClick={() => handleDeleteSla(config.id)} className="p-2 text-danger opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : view === 'upload' ? (
                    <motion.div key="upload" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="max-w-2xl mx-auto">
                        <div className="card-premium bg-prevenort-surface border-dashed border-2 p-12 text-center flex flex-col items-center gap-6">
                            <div className="w-20 h-20 rounded-3xl bg-prevenort-primary/10 flex items-center justify-center">
                                {uploadStatus.status === 'uploading' ? <Loader2 className="w-10 h-10 text-prevenort-primary animate-spin" /> : <FileSpreadsheet className="w-10 h-10 text-prevenort-primary" />}
                            </div>
                            <h2 className="text-2xl font-black mb-2 uppercase">Ingesta de Producción</h2>
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
                            <div className="flex items-center gap-3">
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
                            <StatCard title="Volumen Total" value={totalExams.toLocaleString()} icon={Activity} trend="up" change="Carga" color="primary" />
                            <StatCard title="SLAs Dentro" value={`${slaCompliance}%`} icon={Target} trend={Number(slaCompliance) > 90 ? 'up' : 'down'} change="Eficacia" subtitle={`${totalWithinSla} al día`} color="success" />
                            <StatCard title="TAT Promedio" value={`${avgTat}m`} icon={Clock} trend="down" change="Velocidad" color="info" />
                            <StatCard title="Seguridad (Adendas)" value={totalAddendas} icon={ShieldAlert} trend="up" change="Calidad" color="danger" />
                        </div>

                        <div className="flex flex-wrap gap-2 border-b border-white/5 pb-px no-scrollbar">
                            {(['general', 'instituciones', 'medicos', 'calidad'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] relative transition-all ${activeTab === tab ? 'text-prevenort-primary' : 'text-prevenort-text/30 hover:text-white/60'
                                        }`}
                                >
                                    {tab === 'calidad' ? 'Radar de Calidad' : tab}
                                    {activeTab === tab && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-prevenort-primary rounded-t-full shadow-[0_-4px_10px_rgba(255,100,0,0.3)]" />}
                                </button>
                            ))}
                        </div>

                        <AnimatePresence mode="wait">
                            {activeTab === 'general' && (
                                <motion.div key="gen" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 card-premium min-h-[450px] flex flex-col group">
                                        <div className="flex justify-between items-center mb-8">
                                            <div>
                                                <h3 className="text-xl font-black uppercase tracking-tight">Evolución Operativa</h3>
                                                <p className="text-[10px] font-bold text-white/20 uppercase mt-1">Volumen diario de exámenes reportados</p>
                                            </div>
                                            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                                                <BarChart3 className="w-5 h-5 text-prevenort-primary" />
                                            </div>
                                        </div>
                                        {!hasData ? <div className="flex-1 flex items-center justify-center opacity-10"><BarChart3 className="w-24 h-24" /></div> : (
                                            <div className="flex-1 flex items-end gap-1.5 pt-10 px-2 pb-6">
                                                {statsTemporal.slice(-45).map((d, i) => (
                                                    <div key={i} className="flex-1 group/bar relative">
                                                        <motion.div
                                                            initial={{ height: 0 }}
                                                            animate={{ height: `${(d.value / (Math.max(...statsTemporal.map(x => x.value)) || 1)) * 100}%` }}
                                                            className="w-full bg-gradient-to-t from-prevenort-primary/40 to-prevenort-primary rounded-t-md hover:from-white/20 hover:to-white transition-all cursor-pointer"
                                                        />
                                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 bg-white text-black text-[10px] font-black px-2 py-1 rounded-lg transition-all scale-90 group-hover/bar:scale-100 pointer-events-none z-20 shadow-2xl">
                                                            {d.value} <span className="text-[8px] opacity-40 ml-1">{d.date.split('-').slice(1).reverse().join('/')}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="card-premium flex flex-col min-h-[450px]">
                                        <h3 className="text-xl font-black uppercase tracking-tight mb-8">Mix Modalidades</h3>
                                        <div className="flex-1 flex flex-col justify-center gap-6">
                                            {statsByMod.length === 0 ? <p className="text-center text-[10px] font-black uppercase text-white/10 uppercase tracking-widest">Sin datos para filtrar</p> :
                                                statsByMod.map((mod, i) => (
                                                    <div key={i} className="space-y-3">
                                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                            <span className="flex items-center gap-2">
                                                                <span className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-prevenort-primary' : i === 1 ? 'bg-info' : i === 2 ? 'bg-success' : 'bg-white/40'}`} />
                                                                {mod.name}
                                                            </span>
                                                            <span className="text-white/40">{((mod.value / totalExams) * 100).toFixed(0)}%</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${(mod.value / totalExams) * 100}%` }}
                                                                className={`h-full ${i === 0 ? 'bg-prevenort-primary' : i === 1 ? 'bg-info' : i === 2 ? 'bg-success' : 'bg-white/40'}`}
                                                            />
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'instituciones' && (
                                <motion.div key="inst" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card-premium min-h-[500px]">
                                    <div className="flex items-center gap-3 mb-10">
                                        <div className="p-3 rounded-2xl bg-prevenort-primary/10 border border-prevenort-primary/20">
                                            <Building2 className="w-6 h-6 text-prevenort-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tight text-white">Consolidado Institucional</h3>
                                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Nombres formales vinculados vía Equivalencias</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                        {statsByInst.map((inst, i) => (
                                            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="group">
                                                <div className="flex justify-between items-end mb-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black uppercase tracking-tight text-white group-hover:text-prevenort-primary transition-colors">{inst.name}</span>
                                                        <span className="text-[10px] font-bold text-white/20 uppercase">{inst.value} exámenes</span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${inst.withinSla / inst.value > 0.9 ? 'text-success bg-success/10' : 'text-warning bg-warning/10'}`}>
                                                            {(inst.withinSla / inst.value * 100).toFixed(1)}% SLA
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="h-4 w-full bg-white/5 rounded-2xl p-1 overflow-hidden border border-white/5 shadow-inner">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(inst.value / (statsByInst[0].value || 1)) * 100}%` }}
                                                        className="h-full bg-gradient-to-r from-prevenort-primary to-orange-400 rounded-xl relative group-hover:from-white group-hover:to-white transition-all duration-500"
                                                    >
                                                        <div className="absolute top-0 right-0 h-full w-12 bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </motion.div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'medicos' && (
                                <motion.div key="med" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {statsByMedico.map((med, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                className="p-8 rounded-[36px] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 group hover:border-prevenort-primary/40 transition-all relative overflow-hidden"
                                            >
                                                <div className="absolute top-0 right-0 m-6 opacity-10 group-hover:scale-125 transition-transform duration-700">
                                                    <UserCheck className="w-12 h-12" />
                                                </div>
                                                <div className="flex justify-between items-start mb-10 relative z-10">
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-prevenort-primary/50">Staff Profesional</span>
                                                        <h4 className="text-lg font-black uppercase text-white truncate max-w-[180px]">{med.name}</h4>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-3xl font-black text-white">{med.volume}</span>
                                                        <span className="text-[10px] font-black uppercase text-white/20 tracking-tighter">Exámenes</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mb-10 relative z-10">
                                                    <div className="p-4 rounded-3xl bg-white/5 border border-white/5">
                                                        <p className="text-[9px] font-black uppercase text-white/30 mb-1">TAT Prom.</p>
                                                        <p className="text-xl font-black text-info">{med.avgTat}<span className="text-[10px] ml-1">min</span></p>
                                                    </div>
                                                    <div className="p-4 rounded-3xl bg-white/5 border border-white/5">
                                                        <p className="text-[9px] font-black uppercase text-white/30 mb-1">Calidad</p>
                                                        <p className="text-xl font-black text-danger">{med.adendas}<span className="text-[10px] ml-1">ad.</span></p>
                                                    </div>
                                                </div>

                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em]">SLA Compliance</p>
                                                        <p className="text-[10px] font-black text-success">{med.slaRate}%</p>
                                                    </div>
                                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${med.slaRate}%` }}
                                                            className={`h-full ${Number(med.slaRate) > 90 ? 'bg-success' : Number(med.slaRate) > 70 ? 'bg-warning' : 'bg-danger'}`}
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

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
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
