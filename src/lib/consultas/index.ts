// LDDIGITALCO — Consultas Formativas
import type { APIContext } from 'astro';
import { ConsultaFormativaService } from './consulta-formativa';
import { getDbFromContext, getEnvFromContext } from '../auth';
import { getNotificadorFormativo } from '../email';

export * from './consulta-formativa';

export function getConsultaFormativaServiceFromContext(context: APIContext): ConsultaFormativaService {
  const db = getDbFromContext(context);
  const env = getEnvFromContext(context);
  const notificador = getNotificadorFormativo(env);
  const tutorEmail = env.TUTOR_EMAIL || 'tutor@lddigital.co';

  return new ConsultaFormativaService(db, notificador, tutorEmail);
}
