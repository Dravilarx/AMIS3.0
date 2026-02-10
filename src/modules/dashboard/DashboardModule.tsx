import React from 'react';
import { TrendingUp, Users, ShieldAlert, Cpu, ArrowUpRight, MessageSquare, AlertCircle, Newspaper } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTenders } from '../../hooks/useTenders';
import { useProfessionals } from '../../hooks/useProfessionals';
import { useMessaging } from '../../hooks/useMessaging';
import { useNews } from '../../hooks/useNews';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../types/news';

interface CardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    trend?: string;
    description?: string;
}

function Card({ title, value, icon: Icon, trend, description }: CardProps) {
    return (
        <div className="card-premium group">
            <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-prevenort-bg border border-prevenort-border group-hover:bg-prevenort-primary/10 group-hover:border-prevenort-primary/20 transition-all">
                    <Icon className="w-5 h-5 text-prevenort-text/40 group-hover:text-prevenort-primary" />
                </div>
                {trend && (
                    <div className="flex items-center gap-1 text-[10px] font-black text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>{trend}%</span>
                    </div>
                )}
            </div>
            <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-prevenort-text/40 mb-1.5">{title}</p>
                <p className="text-3xl font-black text-prevenort-text tracking-tight">{value}</p>
                {description && (
                    <p className="text-[10px] text-prevenort-text/60 mt-2 font-medium italic">{description}</p>
                )}
            </div>
        </div>
    );
}

import { useProjects } from '../../hooks/useProjects';
import { Layers, Link as LinkIcon } from 'lucide-react';

export const DashboardModule: React.FC = () => {
    const { tenders, loading: loadingTenders } = useTenders();
    const { professionals, loading: loadingProfessionals } = useProfessionals();
    const { messages } = useMessaging();
    const { projects, loading: loadingProjects } = useProjects();
    const { articles: newsArticles } = useNews();

    const activeTenders = tenders.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const totalStaff = professionals.length;
    const highRiskTenders = tenders.filter(t => t.riesgoSLA.escala > 6).length;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-prevenort-text tracking-tight uppercase mb-1">Centro de Gestión Médica</h1>
                    <p className="text-[10px] text-prevenort-text/40 font-bold uppercase tracking-[0.3em]">Red AMIS ● Sincronización Clínica en Tiempo Real</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-prevenort-surface border border-prevenort-border rounded-2xl shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-[10px] font-black text-prevenort-text/60 uppercase tracking-widest">Sistemas Operativos Activos</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card
                    title="Propuestas Red"
                    value={loadingTenders ? '...' : activeTenders}
                    icon={TrendingUp}
                    trend="12.5"
                    description="Casos en análisis de viabilidad"
                />
                <Card
                    title="Planes de Salud"
                    value={loadingProjects ? '...' : activeProjects}
                    icon={Layers}
                    description="Ejecución activa de protocolos"
                />
                <Card
                    title="Equipo Clínico"
                    value={loadingProfessionals ? '...' : totalStaff}
                    icon={Users}
                    description="Especialistas activos en red"
                />
                <Card
                    title="Riesgos Detectados"
                    value={highRiskTenders}
                    icon={ShieldAlert}
                    trend={highRiskTenders > 0 ? "HIGH" : ""}
                    description="Casos con prioridad crítica (SLA > 6)"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="card-premium h-full">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-sm font-black text-prevenort-text/40 uppercase tracking-[0.2em]">Monitor de Actividad Clínica</h3>
                                <p className="text-[10px] text-prevenort-text/40 font-bold">Top 5 Instituciones por Prioridad</p>
                            </div>
                            <button className="text-[10px] font-black text-prevenort-primary hover:text-prevenort-text transition-colors uppercase tracking-widest px-4 py-2 bg-prevenort-primary/5 rounded-xl border border-prevenort-primary/10">Ver historial completo</button>
                        </div>

                        <div className="space-y-4">
                            {tenders.slice(0, 5).map((tender, i) => {
                                const hasProject = projects.some(p => p.tenderId === tender.id);
                                return (
                                    <div key={i} className="group flex items-center justify-between p-5 bg-prevenort-surface hover:border-prevenort-primary/30 rounded-2xl border border-prevenort-border transition-all duration-300">
                                        <div className="flex items-center gap-5">
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center font-black text-xs border shadow-sm",
                                                tender.riesgoSLA.escala > 6
                                                    ? "bg-danger/10 border-danger/20 text-danger"
                                                    : "bg-prevenort-primary/10 border-prevenort-primary/20 text-prevenort-primary"
                                            )}>
                                                {tender.id.split('-').pop()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <p className="font-extrabold text-sm text-prevenort-text">{tender.identificacion.tipoServicio}</p>
                                                    {hasProject && (
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-success/10 border border-success/20 rounded-lg text-[8px] font-black text-success uppercase tracking-tighter">
                                                            <LinkIcon className="w-2.5 h-2.5" /> PROTOCOLO ACTIVO
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-prevenort-text/40 font-bold uppercase tracking-widest mt-1">Ref: {tender.id.slice(0, 8)}...</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={cn(
                                                "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5 border shadow-sm",
                                                tender.riesgoSLA.escala > 6
                                                    ? "bg-danger/10 text-danger border-danger/20"
                                                    : "bg-success/10 text-success border-success/20"
                                            )}>
                                                Estado: {tender.riesgoSLA.escala > 6 ? 'Prioritario' : 'Normal'}
                                            </div>
                                            <p className="text-[10px] text-prevenort-text/40 font-medium italic">Efectividad: {tender.economia.margenProyectado}%</p>
                                        </div>
                                    </div>
                                );
                            })}
                            {tenders.length === 0 && (
                                <div className="text-center py-20 bg-prevenort-surface rounded-3xl border-2 border-dashed border-prevenort-border">
                                    <AlertCircle className="w-10 h-10 text-prevenort-text/20 mx-auto mb-4" />
                                    <p className="text-prevenort-text/40 text-sm font-semibold italic">No hay casos clínicos activos.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card-premium border-prevenort-primary/10 bg-gradient-to-br from-prevenort-primary/10 to-transparent">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-prevenort-surface rounded-lg shadow-sm border border-prevenort-border">
                                <Cpu className="w-5 h-5 text-prevenort-primary" />
                            </div>
                            <h3 className="text-xs font-black text-prevenort-text/40 uppercase tracking-[0.2em]">Analítica IA AMIS</h3>
                        </div>
                        <div className="relative group p-4 bg-prevenort-surface/50 rounded-2xl border border-prevenort-border">
                            <div className="absolute -left-0 top-0 bottom-0 w-1 bg-prevenort-primary rounded-full shadow-[0_0_15px_rgba(249,115,22,0.4)]" />
                            <p className="text-xs text-prevenort-text/80 leading-relaxed font-semibold pl-4 italic">
                                "El sistema ha detectado una alta demanda en la red norte. Se recomienda optimizar la asignación de turnos médicos para asegurar el cumplimiento de los protocolos de atención inmediata."
                            </p>
                        </div>
                    </div>

                    <div className="card-premium">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-success/10 rounded-lg">
                                    <MessageSquare className="w-5 h-5 text-success" />
                                </div>
                                <h3 className="text-xs font-black text-prevenort-text/40 uppercase tracking-[0.2em]">Comunicación Global</h3>
                            </div>
                            <span className="flex items-center gap-1.5 text-[10px] font-black text-success">
                                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                EN VIVO
                            </span>
                        </div>
                        <div className="space-y-5">
                            {messages.slice(-3).reverse().map((msg, i) => (
                                <div key={i} className="flex flex-col gap-1.5 border-l-2 border-prevenort-border pl-4 transition-all hover:border-prevenort-primary/30">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black text-prevenort-primary uppercase tracking-tight">{msg.senderName}</span>
                                        <span className="text-[10px] font-bold text-prevenort-text/40">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-xs text-prevenort-text/60 font-medium line-clamp-1">{msg.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card-premium">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-warning/10 rounded-lg">
                                    <Newspaper className="w-5 h-5 text-warning" />
                                </div>
                                <h3 className="text-xs font-black text-prevenort-text/40 uppercase tracking-[0.2em]">Actualidad AMIS</h3>
                            </div>
                            <button
                                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'news' }))}
                                className="text-[10px] text-prevenort-primary hover:text-prevenort-text font-black transition-colors uppercase tracking-widest"
                            >
                                Todas →
                            </button>
                        </div>
                        <div className="space-y-4">
                            {newsArticles.slice(0, 3).map((article) => (
                                <div
                                    key={article.id}
                                    className="flex gap-4 p-3 -mx-2 rounded-2xl hover:bg-prevenort-bg transition-all cursor-pointer group border border-transparent hover:border-prevenort-border"
                                    onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'news' }))}
                                >
                                    {(article.imageUrls?.[0] || article.coverImageUrl) && (
                                        <div className="flex-none w-16 h-16 rounded-xl overflow-hidden border border-prevenort-border shadow-sm">
                                            <img
                                                src={article.imageUrls?.[0] || article.coverImageUrl}
                                                alt=""
                                                className="w-full h-full object-cover transition-transform group-hover:scale-110 opacity-80 group-hover:opacity-100"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border shadow-sm",
                                                article.category === 'urgente' ? "bg-danger/10 text-danger border-danger/20" :
                                                    article.category === 'evento' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                                        "bg-prevenort-primary/10 text-prevenort-primary border-prevenort-primary/20"
                                            )}>
                                                {CATEGORY_ICONS[article.category]} {CATEGORY_LABELS[article.category]}
                                            </span>
                                            <span className="text-[9px] font-bold text-prevenort-text/40">
                                                {new Date(article.publishedAt || article.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-prevenort-text/90 font-black line-clamp-2 leading-snug group-hover:text-prevenort-primary transition-colors">
                                            {article.title}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {newsArticles.length === 0 && (
                                <p className="text-[11px] text-prevenort-text/40 font-medium italic text-center py-6">Sin novedades corporativas</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
