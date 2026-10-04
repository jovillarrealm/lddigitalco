// LDDIGITALCO — Endpoint de Auto-registro a la Ruta Abierta
// Adaptador HTTP delgado delegando al módulo profundo AccesoEstudiante

import type { APIRoute } from 'astro';
import { getAccesoEstudianteFromContext } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { request, url } = context;
  const accesoEstudiante = getAccesoEstudianteFromContext(context);
  const origin = `${url.protocol}//${url.host}`;
  const result = await accesoEstudiante.registrarRutaAbierta(request, origin);

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
