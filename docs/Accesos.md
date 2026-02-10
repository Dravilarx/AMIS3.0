# Propuesta de Sistema de Gestión de Acceso y Login Centralizado (SSO)

Este documento detalla el diseño de un sistema de gestión de acceso robusto y centralizado, diseñado para manejar permisos complejos en una estructura **multi-tenant**.

---

## 1. Alcance del Sistema de Login y Perfiles

El sistema actúa como la puerta de entrada de la aplicación, asegurando que la asignación de funcionalidades no sea estática, sino controlada dinámicamente por la consola administrativa.

### 1.1. Determinación de Accesos a Nivel de Consola

Un administrador tendrá la facultad de definir granularmente los siguientes niveles de acceso:

* 
**Acceso a Empresas (Multi-Tenant):** Habilitación de una o varias empresas del grupo; el usuario solo visualizará información pertinente a las asignadas.


* 
**Acceso a Módulos:** Control de módulos funcionales disponibles (e.g., Contabilidad, Recursos Humanos, Operaciones).


* 
**Acceso a Perfiles de Usuario:** Asignación de un perfil específico (e.g., Gerente, Coordinador) que determina los permisos base.


* 
**Acceso a Funcionalidades Específicas:** Permisos concretos dentro de un módulo, como crear, editar, eliminar registros o aprobar transacciones.



### 1.2. Estructura Empresarial del Grupo

El sistema soporta las siguientes entidades bajo un esquema de datos segregados o consolidados:

| Entidades del Grupo |  |
| --- | --- |
| Vitalmédica 

 | SORAN 

 |
| Resomag 

 | IRad 

 |
| Prevenort 

 | Portezuelo 

 |
| AMIS 

 | Ceimavan 

 |

---

## 2. Tipología de Usuarios y Roles

Debido a la heterogeneidad de las facultades de los usuarios, se establece la siguiente matriz de roles:

| Categoría de Usuario | Descripción del Rol | Nivel de Acceso Típico |
| --- | --- | --- |
| **Gerentes y Directores** | Usuarios con facultades de decisión y gestión estratégica.

 | Acceso a múltiples empresas, todos los módulos y reportes estratégicos.

 |
| **Personal Administrativo / Coordinadores** | Usuarios con tareas operacionales y coordinación diaria.

 | Acceso a pocas empresas, módulos específicos y edición operativa.

 |
| **Prestadores de Servicio Ocasional** | Usuarios con requerimientos de acceso muy limitados.

 | Acceso a una sola empresa, módulos de consulta y solo lectura.

 |

---

## 3. Funcionalidades Transversales y Limitaciones

Ciertas herramientas son transversales a la organización, pero su alcance está estrictamente condicionado por el esquema de seguridad.

* 
**Módulo de Noticias:** Aunque es el canal principal de difusión corporativa, la visibilidad de las noticias puede restringirse a departamentos o equipos específicos.


* 
**Proyectos BPM (Business Process Management):** Permite la automatización de procesos; sin embargo, la interacción (iniciar o aprobar procesos) depende del rol del usuario en el flujo modelado.


* 
**Sistema de Mensajería Interna:** Facilita la colaboración en tiempo real, pero el acceso a grupos o historiales puede limitarse según la estructura organizacional o proyectos activos.



> 
> **Resumen de Seguridad:** La arquitectura garantiza que la información llegue únicamente a las personas correctas, manteniendo la confidencialidad y la integridad de los datos en todo momento.
> 
> 

---

¿Deseas que profundice en la descripción técnica de alguno de los perfiles de usuario mencionados? 