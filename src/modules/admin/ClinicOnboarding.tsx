import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, Download, CheckCircle, AlertTriangle, FileSpreadsheet, Loader2, Users, X, Save, DatabaseBackup, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DoctorRow {
    rut: string;
    name: string;
    last_name: string;
    specialty: string;
    phone_number: string;
    email: string;
    hospital_name: string;
    status?: 'valid' | 'invalid' | 'update' | 'synced';
    errorMsg?: string;
    created_at?: string;
}

interface ClinicOnboardingProps {
    isAddModalOpen?: boolean;
    onCloseModal?: () => void;
}

export const ClinicOnboarding: React.FC<ClinicOnboardingProps> = ({ isAddModalOpen, onCloseModal }) => {
    const [doctors, setDoctors] = useState<DoctorRow[]>([]);
    const [existingDoctors, setExistingDoctors] = useState<DoctorRow[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Estado del Formulario Manual
    const [formData, setFormData] = useState({
        rut: '', name: '', last_name: '', specialty: '', phone_number: '+569', email: '', hospital_name: ''
    });

    const fetchExistingDoctors = async () => {
        setIsLoadingData(true);
        try {
            const { data, error } = await supabase
                .from('external_doctors')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setExistingDoctors(data || []);
        } catch (error) {
            console.error('Error fetching external doctors:', error);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        fetchExistingDoctors();
    }, []);

    const handleDownloadTemplate = () => {
        const headers = "RUT_Medico,Nombres,Apellidos,Especialidad,Telefono_Celular,Email_Corporativo,Centro_Clinico\n";
        const dummyRow = "11.222.333-4,Juan Carlos,Pérez González,Traumatología,+56912345678,juan.perez@clinicaportada.cl,Clínica Portada\n";
        const blob = new Blob([headers + dummyRow], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'Plantilla_Onboarding_Medicos_AMIS.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const validatePhoneNumber = (phone: string) => {
        const cleanStatus = phone.replace(/[^0-9+]/g, '');
        return cleanStatus.startsWith('+569') && cleanStatus.length === 12;
    };

    const processCSV = (text: string) => {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length <= 1) {
            setErrorMessage('El archivo está vacío o no tiene datos válidos.');
            return;
        }

        const results: DoctorRow[] = [];
        const rutsSet = new Set<string>();

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length >= 7) {
                const row: DoctorRow = {
                    rut: values[0],
                    name: values[1],
                    last_name: values[2],
                    specialty: values[3],
                    phone_number: values[4],
                    email: values[5],
                    hospital_name: values[6],
                    status: 'valid'
                };

                // Verificar si ya existe en la Base de Datos
                const existsInDB = existingDoctors.some(d => d.rut === row.rut);

                // Validaciones
                if (!validatePhoneNumber(row.phone_number)) {
                    row.status = 'invalid';
                    row.errorMsg = 'Formato de teléfono inválido. Debe ser +569...';
                }

                if (rutsSet.has(row.rut)) {
                    row.status = 'invalid';
                    row.errorMsg = 'RUT duplicado en la misma planilla';
                } else {
                    rutsSet.add(row.rut);
                }

                if (!row.rut || !row.name || !row.hospital_name) {
                    row.status = 'invalid';
                    row.errorMsg = 'Faltan campos obligatorios';
                }

                if (row.status === 'valid' && existsInDB) {
                    row.status = 'update';
                    row.errorMsg = 'Actualización de perfil existente';
                }

                results.push(row);
            }
        }
        
        setDoctors(results);
        setUploadStatus('idle');
    };

    // Funciones Drag & Drop
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
    };

    const handleFileUpload = (file: File) => {
        if (!file.name.endsWith('.csv')) {
            setErrorMessage('Por favor, sube un archivo con formato .CSV');
            return;
        }
        setErrorMessage('');
        setUploadStatus('idle');
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            processCSV(text);
        };
        reader.readAsText(file);
    };

    const handleBulkInsert = async () => {
        const validDoctors = doctors.filter(d => d.status === 'valid' || d.status === 'update');
        if (validDoctors.length === 0) return;

        setIsProcessing(true);
        setUploadStatus('idle');

        const payload = validDoctors.map(doc => ({
            rut: doc.rut,
            name: doc.name,
            last_name: doc.last_name,
            specialty: doc.specialty,
            phone_number: doc.phone_number.replace(/[^0-9+]/g, ''),
            email: doc.email,
            hospital_name: doc.hospital_name
        }));

        try {
            const { error } = await supabase
                .from('external_doctors')
                .upsert(payload, { onConflict: 'rut' });

            if (error) throw error;
            
            setUploadStatus('success');
            setDoctors([]); 
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchExistingDoctors(); // Refrescar lista!
        } catch (error: any) {
            console.error('Error insertando doctores:', error);
            setUploadStatus('error');
            setErrorMessage(error.message || 'Error en la sincronización de base de datos.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSingleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            if (!validatePhoneNumber(formData.phone_number)) {
                throw new Error("El teléfono debe seguir el formato +569...");
            }
            const payload = { ...formData, phone_number: formData.phone_number.replace(/[^0-9+]/g, '') };
            const { error } = await supabase.from('external_doctors').upsert(payload, { onConflict: 'rut' });
            if (error) throw error;
            
            fetchExistingDoctors();
            if (onCloseModal) onCloseModal();
            setFormData({ rut: '', name: '', last_name: '', specialty: '', phone_number: '+569', email: '', hospital_name: '' });
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const validCount = doctors.filter(d => d.status === 'valid' || d.status === 'update').length;
    const invalidCount = doctors.length - validCount;

    const renderTableControl = () => {
        if (doctors.length > 0) {
            // VISTA IMPORTACIÓN CSV
            return (
                <div className="card-premium space-y-6 animate-in slide-in-from-right-4 duration-500 bg-prevenort-surface border-prevenort-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-prevenort-text/5 rounded-xl">
                                <FileSpreadsheet className="w-5 h-5 text-prevenort-text/60" />
                            </div>
                            <h2 className="text-lg font-black tracking-tight text-prevenort-text">Borrador de Importación</h2>
                        </div>
                        <div className="flex gap-4 items-center">
                            <button onClick={() => setDoctors([])} className="text-[10px] font-black uppercase text-prevenort-text/40 hover:text-danger tracking-widest transition-colors">Cancelar</button>
                            {validCount > 0 && (
                                <button 
                                    onClick={handleBulkInsert}
                                    disabled={isProcessing}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-prevenort-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-prevenort-primary/90 transition-all shadow-md shadow-prevenort-primary/20 disabled:opacity-50"
                                >
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {isProcessing ? 'Sincronizando...' : `Guardar ${validCount} Registros`}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1 p-4 rounded-2xl bg-success/5 border border-success/10">
                            <p className="text-[10px] font-black text-success/60 uppercase tracking-widest mb-1">Apropiados / Up-to-date</p>
                            <p className="text-2xl font-black text-success">{validCount}</p>
                        </div>
                        <div className="flex-1 p-4 rounded-2xl bg-danger/5 border border-danger/10">
                            <p className="text-[10px] font-black text-danger/60 uppercase tracking-widest mb-1">Con Problemas</p>
                            <p className="text-2xl font-black text-danger">{invalidCount}</p>
                        </div>
                    </div>

                    <div className="bg-prevenort-bg border border-prevenort-border rounded-xl overflow-hidden max-h-[400px] overflow-y-auto shadow-inner">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-prevenort-surface sticky top-0 z-10 shadow-sm border-b border-prevenort-border">
                                <tr>
                                    <th className="px-4 py-3 text-[10px] uppercase font-black tracking-widest text-prevenort-text/40">RUT</th>
                                    <th className="px-4 py-3 text-[10px] uppercase font-black tracking-widest text-prevenort-text/40">Profesional</th>
                                    <th className="px-4 py-3 text-[10px] uppercase font-black tracking-widest text-prevenort-text/40">Especialidad</th>
                                    <th className="px-4 py-3 text-[10px] uppercase font-black tracking-widest text-prevenort-text/40">Validación</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-prevenort-border">
                                {doctors.map((doc, idx) => (
                                    <tr key={idx} className={cn(doc.status === 'invalid' ? 'bg-danger/5' : '', doc.status === 'update' ? 'bg-info/5' : '')}>
                                        <td className="px-4 py-4 font-semibold font-mono text-xs">{doc.rut}</td>
                                        <td className="px-4 py-4">
                                            <p className="font-bold text-prevenort-text">{doc.name} {doc.last_name}</p>
                                            <p className="text-[10px] text-prevenort-text/40 truncate">{doc.hospital_name}</p>
                                            <p className="font-mono text-[9px] text-prevenort-text/60 mt-0.5">{doc.phone_number}</p>
                                        </td>
                                        <td className="px-4 py-4 text-xs font-bold text-prevenort-text/70">{doc.specialty}</td>
                                        <td className="px-4 py-4">
                                            {doc.status === 'valid' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-success/10 text-success text-[10px] font-black tracking-widest uppercase rounded-lg">
                                                    <CheckCircle className="w-3 h-3" /> Nuevo
                                                </span>
                                            ) : doc.status === 'update' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-info/10 text-info text-[10px] font-black tracking-widest uppercase rounded-lg" title={doc.errorMsg}>
                                                    <Info className="w-3 h-3" /> Actualiza
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-danger/10 text-danger text-[10px] font-black tracking-widest uppercase rounded-lg" title={doc.errorMsg}>
                                                    <AlertTriangle className="w-3 h-3" /> Error
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        // VISTA IAM DIRECTORIO (SIN IMPORTACIÓN ACTIVA)
        return (
            <div className="card-premium space-y-6 animate-in slide-in-from-bottom-4 duration-500 bg-prevenort-surface border-prevenort-border min-h-[500px]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-prevenort-primary/10 rounded-xl">
                            <DatabaseBackup className="w-5 h-5 text-prevenort-primary" />
                        </div>
                        <h2 className="text-lg font-black tracking-tight text-prevenort-text">Directorio IAM (Whitelist)</h2>
                    </div>
                    <div className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest border border-prevenort-border px-3 py-1.5 rounded-lg bg-prevenort-bg">
                        {existingDoctors.length} Médicos Registrados
                    </div>
                </div>

                {isLoadingData ? (
                    <div className="flex flex-col items-center justify-center p-20 text-prevenort-text/40">
                        <Loader2 className="w-8 h-8 animate-spin mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Base de Datos</p>
                    </div>
                ) : existingDoctors.length > 0 ? (
                    <div className="bg-prevenort-bg border border-prevenort-border rounded-xl overflow-hidden h-[450px] overflow-y-auto shadow-inner">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-prevenort-surface sticky top-0 z-10 shadow-sm border-b border-prevenort-border">
                                <tr>
                                    <th className="px-4 py-3 text-[10px] uppercase font-black tracking-widest text-prevenort-text/40">Profesional</th>
                                    <th className="px-4 py-3 text-[10px] uppercase font-black tracking-widest text-prevenort-text/40">Institución</th>
                                    <th className="px-4 py-3 text-[10px] uppercase font-black tracking-widest text-prevenort-text/40">Contacto Validado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-prevenort-border">
                                {existingDoctors.map((doc, idx) => (
                                    <tr key={idx} className="hover:bg-prevenort-surface transition-colors">
                                        <td className="px-4 py-4">
                                            <p className="font-bold text-prevenort-text">{doc.name} {doc.last_name}</p>
                                            <p className="font-mono text-[9px] text-prevenort-text/40">{doc.rut}</p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="text-xs font-bold text-prevenort-text/80">{doc.hospital_name}</p>
                                            <p className="text-[10px] text-prevenort-text/40">{doc.specialty}</p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-prevenort-text/5 border border-prevenort-border rounded-lg font-mono text-xs text-prevenort-text/80">
                                                <CheckCircle className="w-3 h-3 text-success" />
                                                {doc.phone_number}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[350px] text-prevenort-text/20 border-2 border-dashed border-prevenort-border rounded-3xl m-4 bg-prevenort-bg/50">
                        <Users className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] max-w-sm text-center leading-loose">
                            La lista blanca está vacía. Importa una plantilla CSV o agrega un médico manualmente.
                        </p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 md:p-2">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div>
                    <h1 className="text-3xl font-black text-prevenort-text tracking-tight uppercase mb-1">Onboarding Institucional B2B</h1>
                    <p className="text-[10px] text-prevenort-text/40 font-bold uppercase tracking-[0.3em]">
                        IAM Whitelist de Médicos (Telegram Bot Seshat)
                    </p>
                </div>
                <button 
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2.5 px-6 py-3 bg-prevenort-surface border border-prevenort-border hover:bg-prevenort-primary hover:text-white hover:border-prevenort-primary text-prevenort-text rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
                >
                    <Download className="w-4 h-4" />
                    Descargar Plantilla Excel
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Zona de Carga Masiva */}
                <div className="lg:col-span-1 space-y-6">
                    <div 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={cn(
                            "flex flex-col items-center justify-center p-12 text-center rounded-3xl border-2 border-dashed transition-all cursor-pointer relative overflow-hidden",
                            isDragging 
                                ? "bg-prevenort-primary/10 border-prevenort-primary scale-[1.02] shadow-xl shadow-prevenort-primary/20" 
                                : "bg-prevenort-surface/50 border-prevenort-border hover:bg-prevenort-surface hover:border-prevenort-text/20 shadow-sm",
                        )}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input 
                            type="file" 
                            accept=".csv" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        <div className="p-4 bg-prevenort-primary/10 rounded-2xl mb-4 transition-transform group-hover:scale-110">
                            <Upload className="w-8 h-8 text-prevenort-primary" />
                        </div>
                        <h3 className="text-sm font-black text-prevenort-text tracking-tight">Carga de CSV Masivo</h3>
                        <p className="text-[10px] text-prevenort-text/40 font-bold uppercase tracking-[0.1em] mt-2 leading-relaxed px-4">
                            Arrastra y suelta el archivo o haz clic aquí
                        </p>
                    </div>

                    {errorMessage && (
                        <div className="flex items-center gap-3 p-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-xs font-bold animate-in zoom-in-95">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <p>{errorMessage}</p>
                        </div>
                    )}

                    {uploadStatus === 'success' && (
                        <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-2xl text-success text-xs font-bold animate-in zoom-in-95">
                            <CheckCircle className="w-4 h-4 shrink-0" />
                            <p>¡Directorio sincronizado con la Base de Datos con éxito!</p>
                        </div>
                    )}
                </div>

                {/* Resumen e Importación / IAM Viewer */}
                <div className="lg:col-span-2">
                    {renderTableControl()}
                </div>
            </div>

            {/* MODAL: Registro Individual B2B */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-prevenort-bg border border-prevenort-border rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between p-6 border-b border-prevenort-border bg-prevenort-surface">
                            <div>
                                <h3 className="text-xl font-black tracking-tight text-prevenort-text">Alta Individual de Médico</h3>
                                <p className="text-[10px] text-prevenort-text/40 font-bold uppercase tracking-[0.2em] mt-1">Agregar a la Whitelist B2B</p>
                            </div>
                            <button onClick={onCloseModal} className="p-2 hover:bg-prevenort-bg rounded-xl transition-colors">
                                <X className="w-5 h-5 text-prevenort-text/40" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSingleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black tracking-widest uppercase text-prevenort-text/60">RUT</label>
                                    <input required placeholder="12.345.678-9" value={formData.rut} onChange={e => setFormData({...formData, rut: e.target.value})} className="w-full bg-prevenort-surface border border-prevenort-border rounded-xl px-4 py-3 text-sm font-semibold focus:border-prevenort-primary focus:ring-1 focus:ring-prevenort-primary transition-all text-prevenort-text" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black tracking-widest uppercase text-prevenort-text/60">Centro Clínico</label>
                                    <input required placeholder="Clínica AMIS" value={formData.hospital_name} onChange={e => setFormData({...formData, hospital_name: e.target.value})} className="w-full bg-prevenort-surface border border-prevenort-border rounded-xl px-4 py-3 text-sm font-semibold focus:border-prevenort-primary focus:ring-1 focus:ring-prevenort-primary transition-all text-prevenort-text" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black tracking-widest uppercase text-prevenort-text/60">Nombres</label>
                                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-prevenort-surface border border-prevenort-border rounded-xl px-4 py-3 text-sm font-semibold focus:border-prevenort-primary focus:ring-1 focus:ring-prevenort-primary transition-all text-prevenort-text" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black tracking-widest uppercase text-prevenort-text/60">Apellidos</label>
                                    <input required value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full bg-prevenort-surface border border-prevenort-border rounded-xl px-4 py-3 text-sm font-semibold focus:border-prevenort-primary focus:ring-1 focus:ring-prevenort-primary transition-all text-prevenort-text" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black tracking-widest uppercase text-prevenort-text/60">Teléfono (Validación Bot)</label>
                                    <input required placeholder="+569..." value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} className="w-full bg-prevenort-surface border border-prevenort-border rounded-xl px-4 py-3 text-sm font-mono text-success focus:border-prevenort-primary focus:ring-1 focus:ring-prevenort-primary transition-all font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black tracking-widest uppercase text-prevenort-text/60">Correo Clínico (Opcional)</label>
                                    <input placeholder="dr@clinica.cl" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-prevenort-surface border border-prevenort-border rounded-xl px-4 py-3 text-sm font-semibold focus:border-prevenort-primary focus:ring-1 focus:ring-prevenort-primary transition-all text-prevenort-text" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black tracking-widest uppercase text-prevenort-text/60">Especialidad</label>
                                <input value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} className="w-full bg-prevenort-surface border border-prevenort-border rounded-xl px-4 py-3 text-sm font-semibold focus:border-prevenort-primary focus:ring-1 focus:ring-prevenort-primary transition-all text-prevenort-text" />
                            </div>

                            <div className="pt-6">
                                <button disabled={isProcessing} type="submit" className="w-full flex items-center justify-center gap-2 bg-prevenort-primary text-white p-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-prevenort-primary/90 transition-all shadow-lg shadow-prevenort-primary/20 disabled:opacity-50">
                                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <DatabaseBackup className="w-5 h-5" />}
                                    Almacenar en Supabase
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
