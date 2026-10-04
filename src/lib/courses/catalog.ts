import type { RutaAprendizaje, Microcapsula } from './types';

export const RUTAS_CATALOG: RutaAprendizaje[] = [
  {
    id: 'ruta-ciberseguridad-whatsapp',
    slug: 'ciberseguridad-whatsapp',
    titulo: 'Ciberseguridad y Prevención de Estafas en WhatsApp',
    descripcion:
      'Aprenda a configurar su dispositivo móvil de forma segura, comunicarse con su familia y blindar su cuenta de WhatsApp contra engaños, enlaces sospechosos y suplantaciones.',
    nivel: 'ruta_abierta',
    duracion_total: '10:50',
    microcapsulas: [
      {
        id: 'cap-01',
        slug: 'configurar-celular-vista',
        titulo: 'Cápsula #1: Cómo configurar tu celular para no cansar la vista',
        descripcion:
          'Aprende a aumentar el tamaño de letra, ajustar el brillo automático y activar el filtro de luz nocturna para leer sin fatiga visual.',
        duracion: '02:15',
        youtubeId: 'dQw4w9WgXcQ',
        resumen:
          'Aumentar el tamaño del texto y activar el filtro de luz cálida reduce hasta un 80% la fatiga al leer en el celular. Puede activarlo en Ajustes > Pantalla.',
        orden: 1,
      },
      {
        id: 'cap-02',
        slug: 'notas-voz-fotos-whatsapp',
        titulo: 'Cápsula #2: Cómo enviar notas de voz y fotos por WhatsApp a tu familia',
        descripcion:
          'Guía paso a paso para mandar audios manteniendo presionado el micrófono o bloqueándolo hacia arriba, y cómo compartir fotos con nitidez.',
        duracion: '02:40',
        youtubeId: 'jNQXAC9IVRw',
        resumen:
          'Al enviar un audio largo, deslice el dedo hacia arriba sobre el candado para grabar con las manos libres sin miedo a que se corte.',
        orden: 2,
      },
      {
        id: 'cap-03',
        slug: 'identificar-estafas-whatsapp',
        titulo: 'Cápsula #3: Cómo identificar un mensaje o enlace de estafa en WhatsApp',
        descripcion:
          'Aprende las 3 señales críticas de un mensaje fraudulento y qué hacer de inmediato para proteger tus cuentas.',
        duracion: '02:45',
        youtubeId: 'kJQP7kiw5Fk',
        resumen:
          'Recuerde la regla de oro: Ningún banco o entidad solicita contraseñas por WhatsApp. Si un mensaje genera urgencia extrema, no abra el enlace y consulte primero con su tutor de LDDIGITALCO.',
        orden: 3,
      },
      {
        id: 'cap-04',
        slug: 'pedir-recetas-tramites-ia-voz',
        titulo: 'Cápsula #4: Cómo pedirle recetas, trámites e información a la IA con tu voz',
        descripcion:
          'Aprende a usar los asistentes de inteligencia artificial como un acompañante diario: dile lo que necesitas y te responderá con claridad.',
        duracion: '03:10',
        youtubeId: 'L_LUpnjgPso',
        resumen:
          'Hable con la IA como si hablara con una persona paciente. Pídale que le explique paso a paso cualquier trámite, receta o duda cotidiana.',
        orden: 4,
      },
    ],
  },
  {
    id: 'ruta-ia-practica-productividad',
    slug: 'ia-practica-productividad',
    titulo: 'Inteligencia Artificial y Automatización Práctica',
    descripcion:
      'Domine el uso de agentes de IA y herramientas generativas para redactar documentos, automatizar tareas repetitivas y acelerar su trabajo diario.',
    nivel: 'inscripcion_completa',
    duracion_total: '12:30',
    microcapsulas: [
      {
        id: 'cap-ia-01',
        slug: 'primeros-pasos-prompts-efectivos',
        titulo: 'Cápsula #1: Cómo redactar instrucciones claras para la IA',
        descripcion: 'Aprenda la estructura básica para obtener respuestas precisas en su primer intento.',
        duracion: '02:50',
        youtubeId: 'k7vhV9s0cZQ',
        resumen: 'Defina rol, contexto y formato esperado para maximizar la calidad de las respuestas.',
        orden: 1,
      },
      {
        id: 'cap-ia-02',
        slug: 'resumen-documentos-extensos',
        titulo: 'Cápsula #2: Resumen rápido de documentos y contratos',
        descripcion: 'Técnicas seguras para analizar textos largos sin compartir datos confidenciales.',
        duracion: '03:15',
        youtubeId: 'fJ9rUzIMcZQ',
        resumen: 'Extraiga cláusulas clave, fechas límite y obligaciones en viñetas ordenadas.',
        orden: 2,
      },
    ],
  },
  {
    id: 'ruta-banca-movil-segura',
    slug: 'banca-movil-segura',
    titulo: 'Banca Móvil Segura y Trámites Digitales',
    descripcion:
      'Aprenda a realizar pagos, consultar saldos y gestionar su dinero desde el celular con total seguridad y sin riesgos.',
    nivel: 'inscripcion_completa',
    duracion_total: '08:30',
    microcapsulas: [
      {
        id: 'cap-banca-01',
        slug: 'ingreso-seguro-clave-dinamica',
        titulo: 'Cápsula #1: Ingreso seguro a la banca móvil y clave dinámica',
        descripcion: 'Configuración segura del ingreso biométrico y activación de clave dinámica.',
        duracion: '02:45',
        youtubeId: 'kJQP7kiw5Fk',
        resumen: 'Nunca comparta su clave dinámica por llamada ni mensaje de texto.',
        orden: 1,
      },
      {
        id: 'cap-banca-02',
        slug: 'transferencias-sin-riesgo',
        titulo: 'Cápsula #2: Cómo transferir dinero y verificar destinatarios sin riesgo',
        descripcion: 'Pasos para corroborar nombre, número de cuenta y montos antes de confirmar un envío.',
        duracion: '03:00',
        youtubeId: 'jNQXAC9IVRw',
        resumen: 'Siempre verifique los últimos 4 dígitos y el nombre del titular antes de enviar.',
        orden: 2,
      },
      {
        id: 'cap-banca-03',
        slug: 'bloqueo-preventivo-alertas',
        titulo: 'Cápsula #3: Alertas de transacciones y bloqueo preventivo de tarjetas',
        descripcion: 'Cómo activar notificaciones instantáneas de compras y apagar tarjetas temporalmente.',
        duracion: '02:45',
        youtubeId: 'dQw4w9WgXcQ',
        resumen: 'Las alertas tempranas le permiten detectar cualquier movimiento extraño en segundos.',
        orden: 3,
      },
    ],
  },
];


export function getAllRoutes(): RutaAprendizaje[] {
  return RUTAS_CATALOG;
}

export function getRouteBySlug(slug: string): RutaAprendizaje | undefined {
  return RUTAS_CATALOG.find((r) => r.slug === slug);
}

export function getCapsuleBySlug(routeSlug: string, capsuleSlug: string): Microcapsula | undefined {
  const route = getRouteBySlug(routeSlug);
  if (!route) return undefined;
  return route.microcapsulas.find((c) => c.slug === capsuleSlug);
}

export function findCapsuleBySlug(capsuleSlug: string): { route: RutaAprendizaje; capsule: Microcapsula } | undefined {
  for (const route of RUTAS_CATALOG) {
    const capsule = route.microcapsulas.find((c) => c.slug === capsuleSlug);
    if (capsule) {
      return { route, capsule };
    }
  }
  return undefined;
}

export function calculateRouteProgress(
  completedCapsuleSlugs: string[],
  route: RutaAprendizaje
): { total: number; completadas: number; porcentaje: number } {
  const total = route.microcapsulas.length;
  if (total === 0) {
    return { total: 0, completadas: 0, porcentaje: 0 };
  }

  const completedSet = new Set(completedCapsuleSlugs);
  let count = 0;
  for (const c of route.microcapsulas) {
    if (completedSet.has(c.slug)) {
      count++;
    }
  }

  const porcentaje = Math.round((count / total) * 100);
  return {
    total,
    completadas: count,
    porcentaje,
  };
}
