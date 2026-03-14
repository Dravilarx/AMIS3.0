import React from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

interface HighDensityChartProps {
    data: any[];
    height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-prevenort-surface border border-prevenort-text/10 p-4 rounded-2xl shadow-2xl backdrop-blur-md">
                <p className="text-[10px] font-black text-prevenort-text/40 uppercase mb-2 tracking-widest">{label}</p>
                <div className="space-y-1.5">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex justify-between items-center gap-8">
                            <span className="text-[10px] font-black text-prevenort-text/60 uppercase flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                {entry.name}
                            </span>
                            <span className="text-xs font-black" style={{ color: entry.color }}>
                                {entry.value.toLocaleString()}{entry.unit || ''}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export const HighDensityChart: React.FC<HighDensityChartProps> = ({ data, height = 400 }) => {
    // Determine bar size based on data density
    const barSize = data.length > 50 ? 4 : data.length > 20 ? 8 : 12;

    return (
        <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                >
                    <defs>
                        <linearGradient id="barGradientPrimary" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#f97316" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="barGradientSecondary" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid 
                        strokeDasharray="3 3" 
                        vertical={false} 
                        stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis 
                        dataKey="label" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 800 }}
                        dy={10}
                    />
                    <YAxis 
                        yAxisId="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 800 }}
                        label={{ 
                            value: 'VOLUMEN EXÁMENES', 
                            angle: -90, 
                            position: 'insideLeft', 
                            style: { fill: 'rgba(255,255,255,0.1)', fontSize: 8, fontWeight: 900, letterSpacing: '0.1em' } 
                        }}
                    />
                    <YAxis 
                        yAxisId="right"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 800 }}
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                        label={{ 
                            value: 'CUMPLIMIENTO SLA %', 
                            angle: 90, 
                            position: 'insideRight', 
                            style: { fill: 'rgba(255,255,255,0.1)', fontSize: 8, fontWeight: 900, letterSpacing: '0.1em' } 
                        }}
                    />
                    <Tooltip 
                        content={<CustomTooltip />} 
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }} 
                        wrapperStyle={{ outline: 'none' }}
                    />
                    <Legend 
                        verticalAlign="top" 
                        align="right" 
                        iconType="circle"
                        content={({ payload }) => (
                            <div className="flex justify-end gap-6 mb-8 translate-y-[-10px]">
                                {payload?.map((entry: any, index: number) => (
                                    <div key={index} className="flex items-center gap-2 group cursor-pointer">
                                        <div className="w-2 h-2 rounded-full transition-transform group-hover:scale-125" style={{ backgroundColor: entry.color }} />
                                        <span className="text-[10px] font-black text-prevenort-text/30 uppercase tracking-[0.2em] group-hover:text-prevenort-text/50">{entry.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    />
                    
                    <Bar 
                        yAxisId="left"
                        name="Informes"
                        dataKey="exams" 
                        fill="url(#barGradientPrimary)" 
                        radius={[2, 2, 0, 0]}
                        barSize={barSize * 1.5}
                        animationDuration={1500}
                    />
                    <Bar 
                        yAxisId="left"
                        name="Adendas"
                        dataKey="addendas" 
                        fill="url(#barGradientSecondary)" 
                        radius={[2, 2, 0, 0]}
                        barSize={barSize * 0.8}
                        animationDuration={2000}
                    />
                    <Line 
                        yAxisId="right"
                        name="SLA"
                        type="monotone" 
                        dataKey="sla" 
                        stroke="#22c55e" 
                        strokeWidth={3}
                        dot={data.length < 50 ? { r: 3, fill: '#22c55e', strokeWidth: 0 } : false}
                        activeDot={{ r: 5, stroke: '#22c55e', strokeWidth: 2, fill: '#000' }}
                        unit="%"
                        animationDuration={2500}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};
