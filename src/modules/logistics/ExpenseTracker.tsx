import React, { useState } from 'react';
import { Receipt, Camera, Loader2, CheckCircle2, AlertCircle, Trash2, Download } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import type { ExtractedExpense } from './expenseAI';

interface ExpenseItem extends ExtractedExpense {
    id: string;
    status: 'pending' | 'verified' | 'rejected';
}

const MOCK_EXPENSES: ExpenseItem[] = [
    {
        id: 'EXP-001',
        vendor: 'Hotel Diego de Almagro',
        date: '2026-01-20',
        amount: 145000,
        currency: 'CLP',
        category: 'Alojamiento',
        status: 'verified',
        taxId: '76.123.456-7'
    },
    {
        id: 'EXP-002',
        vendor: 'Restaurante El Galeón',
        date: '2026-01-21',
        amount: 28500,
        currency: 'CLP',
        category: 'Alimentación',
        status: 'pending',
        taxId: '77.987.654-K'
    }
];

export const ExpenseTracker: React.FC = () => {
    const [expenses, setExpenses] = useState<ExpenseItem[]>(MOCK_EXPENSES);
    const [isProcessing, setIsProcessing] = useState(false);

    const totalConfirmed = expenses
        .filter(e => e.status === 'verified')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const handleMockUpload = () => {
        setIsProcessing(true);
        // Simulamos el delay de Gemini Vision
        setTimeout(() => {
            const newExpense: ExpenseItem = {
                id: `EXP-${Date.now()}`,
                vendor: 'LATAM Airlines',
                date: new Date().toISOString().split('T')[0],
                amount: 320000,
                currency: 'CLP',
                category: 'Transporte',
                status: 'pending',
                taxId: '90.555.444-3'
            };
            setExpenses([newExpense, ...expenses]);
            setIsProcessing(false);
        }, 2000);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Logística & Viáticos</h2>
                    <p className="text-white/40 text-sm">Control de gastos y reembolsos con Auditoría AI</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium">
                        <Download className="w-4 h-4" />
                        <span>Exportar Reporte</span>
                    </button>
                    <button
                        onClick={handleMockUpload}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg transition-all font-medium text-sm shadow-lg shadow-blue-500/20"
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        <span>{isProcessing ? 'Procesando con Vision...' : 'Escanear Recibo'}</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card-premium">
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Total Verificado</p>
                    <p className="text-2xl font-black">{formatCurrency(totalConfirmed)}</p>
                </div>
                <div className="card-premium">
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Pendiente Revisión</p>
                    <p className="text-2xl font-black text-amber-400">
                        {formatCurrency(expenses.filter(e => e.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0))}
                    </p>
                </div>
                <div className="md:col-span-2 card-premium bg-blue-500/5 border-blue-500/20 flex items-center gap-4">
                    <div className="p-2 rounded-full bg-blue-500/20">
                        <Receipt className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest">Estado de Reembolsos</p>
                        <p className="text-xs text-blue-300/80">Ciclo Enero 2026: Tu reporte será procesado automáticamente el día 30.</p>
                    </div>
                </div>
            </div>

            <div className="card-premium overflow-hidden !p-0">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-white/5 text-white/40 border-b border-white/10">
                            <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">Proveedor</th>
                            <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">Fecha</th>
                            <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">Categoría</th>
                            <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-right">Monto</th>
                            <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-center">Estado</th>
                            <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {expenses.map((expense) => (
                            <tr key={expense.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-4">
                                    <p className="font-bold text-white/90">{expense.vendor}</p>
                                    <p className="text-[10px] text-white/30 uppercase tracking-tighter">RUT: {expense.taxId}</p>
                                </td>
                                <td className="px-6 py-4 text-white/60 font-medium">
                                    {expense.date}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-white/80">
                                        {expense.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right font-black">
                                    {formatCurrency(expense.amount)}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-center">
                                        {expense.status === 'verified' ? (
                                            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full text-[10px] font-bold border border-emerald-400/20">
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span>VERIFICADO</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full text-[10px] font-bold border border-amber-400/20 animate-pulse">
                                                <AlertCircle className="w-3 h-3" />
                                                <span>PENDIENTE</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="p-2 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
