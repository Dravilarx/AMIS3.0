import React from 'react';
import { TrendingUp, Users, ShieldAlert, Cpu, ArrowUpRight, MessageSquare, AlertCircle, Newspaper } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTenders } from '../../hooks/useTenders';
import { useProfessionals } from '../../hooks/useProfessionals';
import { useMessaging } from '../../hooks/useMessaging';
import { useNews } from '../../hooks/useNews';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../types/news';

interface CardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    trend?: string;
    description?: string;
}

function Card({ title, value, icon: Icon, trend, description }: CardProps) {
    return (
        <div className="card-premium group hover:border-blue-500/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10 group-hover:bg-blue-500/10 group-hover:border-blue-500/20 transition-all">
                    <Icon className="w-5 h-5 text-white/40 group-hover:text-blue-400" />
                </div>
                {trend && (
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>{trend}%</span>
                    </div>
                )}
            </div>
            <div>
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">{title}</p>
                <p className="text-3xl font-black text-white/90 tracking-tighter">{value}</p>
                {description && (
                    <p className="text-[10px] text-white/20 mt-2 italic">{description}</p>
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
    // totalAILogins eliminado

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white/90 tracking-tighter uppercase mb-1">Central de Comando</h1>
                    <p className="text-xs text-white/40 font-mono uppercase tracking-[0.3em]">Holding Portezuelo ● AMIS 3.0 Real-Time Engine</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Sistemas Operativos Operacionales</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card
                    title="Licitaciones Master"
                    value={loadingTenders ? '...' : activeTenders}
                    icon={TrendingUp}
                    trend="12.5"
                    description="Proyectos en análisis de riesgo"
                />
                <Card
                    title="Proyectos BPM"
                    value={loadingProjects ? '...' : activeProjects}
                    icon={Layers}
                    description="Ejecución activa vinculada"
                />
                <Card
                    title="Staff Certificado"
                    value={loadingProfessionals ? '...' : totalStaff}
                    icon={Users}
                    description="Profesionales en la matriz UVC"
                />
                <Card
                    title="Alertas Críticas"
                    value={highRiskTenders}
                    icon={ShieldAlert}
                    trend={highRiskTenders > 0 ? "HIGH" : ""}
                    description="SLA Risk Scale > 6 detectado"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="card-premium h-full">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.2em]">Estado de la Matriz Estratégica</h3>
                                <p className="text-[10px] text-white/20 font-mono">Top 5 Proyectos por Prioridad</p>
                            </div>
                            <button className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest">Ver todo</button>
                        </div>

                        <div className="space-y-3">
                            {tenders.slice(0, 5).map((tender, i) => {
                                const hasProject = projects.some(p => p.tenderId === tender.id);
                                return (
                                    <div key={i} className="group flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl border border-white/5 transition-all duration-300">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs border",
                                                tender.riesgoSLA.escala > 6 ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-blue-500/10 border-blue-500/20 text-blue-500"
                                            )}>
                                                {tender.id.split('-').pop()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-sm text-white/90">{tender.identificacion.tipoServicio}</p>
                                                    {hasProject && (
                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[7px] font-black text-emerald-400 uppercase tracking-tighter">
                                                            <LinkIcon className="w-2 h-2" /> VINCULADO BPM
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest px-1">ID: {tender.id}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={cn(
                                                "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest mb-1",
                                                tender.riesgoSLA.escala > 6 ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
                                            )}>
                                                Riesgo {tender.riesgoSLA.escala}/8
                                            </div>
                                            <p className="text-[10px] text-white/20 italic">Margen: {tender.economia.margenProyectado}%</p>
                                        </div>
                                    </div>
                                );
                            })}
                            {tenders.length === 0 && (
                                <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-dashed border-white/5">
                                    <AlertCircle className="w-8 h-8 text-white/10 mx-auto mb-3" />
                                    <p className="text-white/20 text-xs italic">No hay licitaciones activas actualmente.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card-premium border-blue-500/20 bg-gradient-to-br from-blue-500/[0.05] to-transparent">
                        <div className="flex items-center gap-3 mb-6">
                            <Cpu className="w-5 h-5 text-blue-400" />
                            <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Agrawall L3 Insights</h3>
                        </div>
                        <div className="relative group">
                            <div className="absolute -left-2 top-0 bottom-0 w-[2px] bg-blue-500/30 group-hover:bg-blue-500 transition-colors" />
                            <p className="text-xs text-white/60 leading-relaxed font-light pl-4 italic">
                                "El motor Gemini 3 Flash ha detectado que el 65% de las licitaciones actuales tienen un SLA menor a 4 horas. Se recomienda priorizar el Staffing de guardia para asegurar el cumplimiento operativo en la Red Providencia."
                            </p>
                        </div>
                    </div>

                    <div className="card-premium">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <MessageSquare className="w-5 h-5 text-emerald-400" />
                                <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Actividad M8</h3>
                            </div>
                            <span className="text-[10px] font-mono text-white/20">LIVE</span>
                        </div>
                        <div className="space-y-4">
                            {messages.slice(-3).reverse().map((msg, i) => (
                                <div key={i} className="flex flex-col gap-1 border-l border-white/5 pl-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">{msg.senderName}</span>
                                        <span className="text-[8px] text-white/20">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-[11px] text-white/50 line-clamp-1">{msg.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── News Widget ───────────────────────────── */}
                    <div className="card-premium">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Newspaper className="w-5 h-5 text-amber-400" />
                                <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Últimas Noticias</h3>
                            </div>
                            <button
                                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'news' }))}
                                className="text-[10px] text-blue-400 hover:text-blue-300 font-bold transition-colors"
                            >
                                Ver todas →
                            </button>
                        </div>
                        <div className="space-y-3">
                            {newsArticles.slice(0, 3).map((article) => (
                                <div
                                    key={article.id}
                                    className="flex gap-3 p-2 -mx-2 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer group"
                                    onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'news' }))}
                                >
                                    {(article.imageUrls?.[0] || article.coverImageUrl) && (
                                        <div className="flex-none w-14 h-14 rounded-lg overflow-hidden border border-white/10">
                                            <img
                                                src={article.imageUrls?.[0] || article.coverImageUrl}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className={cn(
                                                "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border",
                                                CATEGORY_COLORS[article.category]
                                            )}>
                                                {CATEGORY_ICONS[article.category]}
                                            </span>
                                            <span className="text-[8px] text-white/15">
                                                {new Date(article.publishedAt || article.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-white/60 font-bold line-clamp-2 group-hover:text-white/80 transition-colors">
                                            {article.title}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {newsArticles.length === 0 && (
                                <p className="text-[10px] text-white/15 italic text-center py-4">Sin noticias recientes</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
