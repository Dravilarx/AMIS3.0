import { useState, useEffect } from 'react';
import type { DocumentBattery } from '../../types/communication';

// Mock de baterías iniciales solicitadas por el usuario
const DEFAULT_BATTERIES: DocumentBattery[] = [
    {
        id: 'bat-med-ingreso',
        name: 'Batería Médico de Ingreso',
        description: 'Documentación obligatoria para la contratación de facultativos médicos.',
        requirements: [
            { id: 'req-rut', label: 'Cédula de Identidad (Ambos Lados)', isRequired: true, category: 'hr' },
            { id: 'req-titulo', label: 'Título Profesional', isRequired: true, category: 'academic' },
            { id: 'req-sis', label: 'Certificado Registro SIS', isRequired: true, category: 'academic' },
            { id: 'req-prev', label: 'Certificado Antecedentes', isRequired: true, category: 'hr' },
            { id: 'req-cv', label: 'Currículum Vitae Actualizado', isRequired: false, category: 'hr' }
        ]
    },
    {
        id: 'bat-tec-ingreso',
        name: 'Batería Tecnólogo Médico',
        description: 'Set documental para personal técnico y tecnólogos.',
        requirements: [
            { id: 'req-rut', label: 'Cédula de Identidad', isRequired: true, category: 'hr' },
            { id: 'req-titulo', label: 'Título Profesional / Técnico', isRequired: true, category: 'academic' },
            { id: 'req-operar', label: 'Autorización Operar Equipos', isRequired: true, category: 'academic' },
            { id: 'req-dosim', label: 'Historial Dosimétrico', isRequired: false, category: 'clinical' }
        ]
    },
    {
        id: 'bat-licitacion-ext',
        name: 'Batería Licitación Externa',
        description: 'Documentos requeridos para postulaciones a licitaciones públicas.',
        requirements: [
            { id: 'req-legal-cons', label: 'Constitución Sociedad', isRequired: true, category: 'legal' },
            { id: 'req-fiabilidad', label: 'Balance Auditado', isRequired: true, category: 'commercial' },
            { id: 'req-garantia', label: 'Boleta de Garantía', isRequired: true, category: 'commercial' }
        ]
    }
];

export function useBatteries() {
    const [batteries, setBatteries] = useState<DocumentBattery[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // En una fase real, esto vendría de Supabase 'document_batteries'
        const timer = setTimeout(() => {
            setBatteries(DEFAULT_BATTERIES);
            setLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const addBattery = (battery: Omit<DocumentBattery, 'id'>) => {
        const newBattery = { ...battery, id: `bat-${Date.now()}` };
        setBatteries(prev => [...prev, newBattery]);
        return newBattery;
    };

    const updateBattery = (id: string, updates: Partial<DocumentBattery>) => {
        setBatteries(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const deleteBattery = (id: string) => {
        setBatteries(prev => prev.filter(b => b.id !== id));
    };

    return {
        batteries,
        loading,
        addBattery,
        updateBattery,
        deleteBattery
    };
}
