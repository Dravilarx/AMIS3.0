Módulo de Instituciones: Núcleo de Gestión de Clientes Institucionales y Base Contractual de AMIS 3.0

El Módulo de Instituciones se erige como un componente esencial, transversal y estratégico dentro de la arquitectura del sistema AMIS 3.0. Su propósito fundamental es operar como el repositorio centralizado y fuente única de verdad para toda la información relativa a nuestros clientes institucionales (hospitales, clínicas, aseguradoras, empresas, etc.). Más allá de un simple registro de datos, este módulo constituye la piedra angular para la gestión integral de las relaciones contractuales, operativas y de cumplimiento de acuerdos de nivel de servicio (SLA).
-----Funcionalidades Clave y Relaciones Transversales Detalladas1. Registro Maestro y Gestión Exhaustiva de Clientes

Este módulo debe garantizar la captura y mantenimiento de la información institucional con un alto nivel de detalle y rigor legal:
Datos Legales y Comerciales Fundamentales: Almacenamiento de la información legal completa de cada institución cliente: razón social, nombre comercial (si aplica), Rol Único Tributario (RUT) o equivalente fiscal, dirección fiscal completa, datos de inscripción legal, y sector económico al que pertenece. Este registro se relaciona íntimamente con el Módulo de Documentación para el archivo digital y la trazabilidad de documentos legales clave (escrituras, poderes, certificaciones).
Gestión de Puntos de Contacto: Administración de una matriz de datos de contacto, incluyendo la identificación de contactos primarios y secundarios clave. Esto abarca sus nombres completos, cargos específicos (ejecutivo comercial, director médico, jefe de laboratorio), teléfonos directos, móviles y correos electrónicos. Debe permitir el registro de la jerarquía de contactos.
Segmentación y Clasificación: Capacidad para clasificar a las instituciones según criterios definidos (ej: tipo de cliente -público/privado-, volumen de facturación histórica, criticidad estratégica, región geográfica), facilitando la aplicación de reglas de negocio específicas.

2. Gestión Integral de Contratos y Acuerdos (Multi-Contrato)

El módulo está diseñado para manejar la complejidad de las relaciones institucionales, que a menudo implican múltiples acuerdos con una misma entidad.
Registro Detallado de Acuerdos: Permite registrar y administrar un número ilimitado de contratos, convenios o acuerdos marco por cada institución cliente. Cada registro contractual debe ser único e incluir:
Identificador y nombre del contrato.
Fechas de vigencia (comienzo y término).
Detalle de las especificaciones de servicio acordadas (listado de exámenes cubiertos o excluidos, condiciones de toma de muestra, logística).
Estructura tarifaria específica (precios, descuentos por volumen, condiciones de pago).
Vínculo Estratégico con Licitaciones: Si el contrato actual o futuro se origina en un proceso de licitación (pública o privada), el módulo establece una conexión directa y obligatoria con el Módulo de Licitaciones. Este enlace es crucial para:
Monitorear el estado del proceso (en curso, propuesta enviada, adjudicada, no adjudicada, desierta).
Garantizar la activación contractual (incluyendo la configuración de tarifas y SLAs) de forma automática y oportuna una vez formalizada la adjudicación, minimizando errores de transición.
3. Definición y Aplicación de Tiempos de Respuesta Diferenciados (SLA)

Esta es una funcionalidad crítica para la gestión de la calidad del servicio y el cumplimiento contractual.
Configuración Granular de SLAs: El módulo debe permitir configurar los Tiempos de Respuesta (Service Level Agreements - SLA) para la entrega de resultados de exámenes, con la flexibilidad de ser definidos a nivel de: Institución, Contrato específico o incluso Tipo de Examen/Prestación.
Segmentación por Criticidad de Servicio: Los tiempos de respuesta deben poder segmentarse en las siguientes categorías, garantizando la priorización operativa:
Exámenes de Urgencia (Tiempos Críticos): Definición de tiempos mínimos y máximos para la validación y emisión de resultados prioritarios.
Exámenes Ambulatorios Estándar: Tiempos típicos para pacientes externos.
Exámenes de Pacientes Hospitalizados: Tiempos específicos para la atención dentro de la infraestructura institucional.
Exámenes Prioritarios (Definición Contractual): Servicios que, sin ser urgencia, tienen un compromiso de entrega acelerado.
Estudios Oncológicos y de Alta Complejidad: Tiempos extendidos y especializados, reflejando la complejidad del procesamiento.
4. Monitoreo de Cumplimiento, Control Estadístico y Gestión de KPIs

El módulo debe ir más allá de la configuración para proveer capacidades analíticas y de control.
Procesamiento de Datos Estadísticos: Generación automatizada de datos estadísticos relativos al desempeño, comparando los tiempos reales de entrega de resultados con los SLAs acordados.
Generación de Informes de Desempeño (KPIs): Producción periódica de reportes de Indicadores Clave de Desempeño (KPIs), incluyendo el porcentaje de cumplimiento de SLA, el tiempo promedio de respuesta por segmento y el detalle de incumplimientos (justificados o no). Estos informes son esenciales tanto para la gestión interna de calidad como para la rendición de cuentas al cliente institucional.
5. Gestión de Addendum y Modificaciones Contractuales

Para mantener la precisión operativa y legal, el módulo debe soportar la evolución de los acuerdos.
Registro de Modificaciones: Permite el registro formal y la trazabilidad de cualquier modificación, anexo o addendum a los contratos originales.
Impacto en Reglas de Negocio: Es fundamental que el sistema garantice que estas modificaciones impacten automáticamente en las reglas operativas, especialmente aquellas que afecten los listados de exámenes cubiertos (inclusión/exclusión de prestaciones) o los tiempos de respuesta (SLA).
6. Alertas Críticas de Vigencia y Renovación (Risk Management)

Una función vital para la continuidad del negocio y la gestión de riesgos contractuales.
Manejo Riguroso de Fechas: Administración precisa de las fechas de comienzo y término de vigencia de todos los contratos y licitaciones.
Sistema de Alarmas Preventivas: Implementación de un sistema de avisos y alarmas preventivas automatizadas. Estas deben dispararse en intervalos críticos (ej: 180, 90, 60 y 30 días antes del vencimiento) para alertar proactivamente al área comercial, legal y de operaciones sobre la necesidad inminente de iniciar los procesos de renovación, renegociación o participación en una nueva re-licitación.
-----Flujo de Información y Bitácora Operativa (CRM Básico)

Transversalidad de Datos y Herencia Contractual:

La información configurada en el Módulo de Instituciones actúa como la fuente primaria de datos que alimenta y condiciona la operación de la totalidad del sistema AMIS 3.0 (Módulo de Solicitudes, Módulo de Resultados, Facturación, etc.). Cada vez que un usuario registra una solicitud de examen o procesa un servicio asociado a una institución, es obligatorio seleccionar la entidad correspondiente. Esta selección automática implica la herencia inmediata de todas las reglas contractuales, incluyendo: la lista de exámenes cubiertos, la estructura tarifaria aplicable, y los tiempos de respuesta (SLA) definidos, asegurando consistencia en todo el flujo de trabajo.

Hoja de Control y Bitácora de Eventos (CRM Básico):

Se requiere la implementación de una herramienta de gestión de relaciones (CRM básico) integrada: la Hoja de Control o Bitácora de Contacto Dinámica. Este registro debe ser un diario detallado y cronológico de la interacción con el cliente.
Registro de Eventos de Contacto: Su uso es obligatorio para actualizar y registrar todos los eventos de contacto relevantes con la institución:
Detalles de reuniones (presenciales o virtuales).
Registro de llamadas telefónicas importantes.
Archivado de correos electrónicos críticos.
Bitácora de visitas comerciales y auditorías operativas.
Trazabilidad de la resolución de conflictos, quejas o incidentes operacionales.
Historial Detallado: Sirve como un historial detallado de la relación con el cliente, permitiendo a cualquier miembro del equipo (comercial, legal, operaciones) retomar el hilo de la relación, asegurando la continuidad de la información, el seguimiento oportuno de acuerdos operativos y la documentación de la gestión del servicio.
