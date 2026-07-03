// ─────────────────────────────────────────────────────────────────────────────
// FUENTE DE VERDAD ÚNICA de los módulos para las matrices de permisos.
// Debe estar sincronizado 1:1 con navItems en Layout.tsx. Al agregar un módulo
// al sidebar, agrégalo aquí para que aparezca en la matriz de permisos del
// AdminModule y en la plantilla de permisos del Gestor de Cargos.
// ─────────────────────────────────────────────────────────────────────────────
export const MODULES = [
    { id: 'dashboard',            name: 'Panel Principal' },
    { id: 'tenders',              name: 'Licitaciones' },
    { id: 'staffing',             name: 'Gestión RR.HH.' },
    { id: 'shifts',               name: 'Turnos Médicos' },
    { id: 'cuarto_turno',         name: '4° Turno' },
    { id: 'dashboard_cuarto_turno', name: 'Dashboard 4° Turno' },
    { id: 'solicitudes',          name: 'Solicitudes' },
    { id: 'protocolos',           name: 'Protocolos' },
    { id: 'logistics',            name: 'Logística Salud' },
    { id: 'institutions',         name: 'Red de Centros' },
    { id: 'clinical',             name: 'Procedimientos' },
    { id: 'audit',                name: 'Calidad' },
    { id: 'projects',             name: 'Proyectos BPM' },
    { id: 'messaging',            name: 'Mensajería' },
    { id: 'dispatch',             name: 'Centro de Despacho' },
    { id: 'asistente',            name: 'Asistente' },
    { id: 'dms',                  name: 'Archivo Digital' },
    { id: 'ideation',             name: 'Innovación' },
    { id: 'news',                 name: 'Noticias Corporativas' },
    { id: 'stat_multiris',        name: 'Stat Multiris' },
    { id: 'stat_multiris_html',   name: 'Stat Multiris (HTML)' },
    { id: 'wizard_competencias',  name: 'Mi Auto-evaluación' },
    { id: 'b2b_portal',           name: 'Portal B2B' },
    { id: 'secretary_command',    name: 'Torre de Control' },
    { id: 'radiology_worklist',   name: 'Worklist Radiológica' },
] as const;

// Las cuatro acciones por módulo (mismas claves que profiles.permissions).
export const PERM_ACTIONS: { key: 'read' | 'create' | 'update' | 'delete'; letter: string; label: string }[] = [
    { key: 'read',   letter: 'V', label: 'Ver'    },
    { key: 'create', letter: 'C', label: 'Crear'  },
    { key: 'update', letter: 'E', label: 'Editar' },
    { key: 'delete', letter: 'B', label: 'Borrar' },
];
