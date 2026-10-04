// LDDIGITALCO — Plantilla Accesible para Acceso sin Contraseña (Magic Link)
// Diseñada para adultos mayores: tipografía grande, alto contraste y botón de 54px

export interface AccesoSinContrasenaTemplateInput {
  verifyUrl: string;
  studentName?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderAccesoSinContrasenaEmail(
  input: AccesoSinContrasenaTemplateInput
): RenderedEmail {
  const nombre = input.studentName?.trim() || 'Estimado estudiante';
  const subject = 'Su enlace de acceso directo al Aula Digital — LDDIGITALCO';

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #070b13; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #0d1527; border: 2px solid #1e293b; border-radius: 24px; overflow: hidden;">
    <tr>
      <td style="padding: 36px 32px 24px 32px; border-bottom: 1px solid #1e293b; background-color: #090e1a;">
        <span style="font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: 1px;">LDDIGITAL<span style="color: #00FF87;">CO</span></span>
        <span style="display: block; font-size: 13px; color: #00FF87; text-transform: uppercase; font-weight: 700; margin-top: 4px; letter-spacing: 0.5px;">Portal del Estudiante • Programa +50</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h1 style="font-size: 26px; font-weight: 800; color: #ffffff; margin-top: 0; margin-bottom: 16px;">¡Hola, ${nombre}!</h1>
        <p style="font-size: 18px; line-height: 1.6; color: #e2e8f0; margin-bottom: 24px;">
          Para ingresar a su Aula Digital sin necesidad de contraseñas, simplemente presione el botón verde de abajo:
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${input.verifyUrl}" style="display: inline-block; background-color: #00FF87; color: #030712; font-size: 18px; font-weight: 900; text-decoration: none; padding: 18px 36px; border-radius: 16px; border: 2px solid #00FF87;">
            👉 Entrar a mi Aula en 1 Clic
          </a>
        </div>

        <div style="background-color: #1e293b; border-left: 4px solid #F59E0B; padding: 16px; border-radius: 12px; margin-top: 24px;">
          <p style="font-size: 15px; color: #f8fafc; margin: 0;">
            ⏳ <strong>Información importante:</strong> Este enlace es personal y expira en <strong>15 minutos</strong> por su seguridad. Si vence, puede solicitar uno nuevo en el portal.
          </p>
        </div>

        <p style="font-size: 14px; color: #94a3b8; margin-top: 28px; line-height: 1.5;">
          Si el botón no funciona, copie y pegue este enlace en su navegador:<br>
          <a href="${input.verifyUrl}" style="color: #00F0FF; word-break: break-all;">${input.verifyUrl}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Hola ${nombre},

Para ingresar a su Aula Digital en LDDIGITALCO sin contraseña, abra el siguiente enlace:
${input.verifyUrl}

Este enlace es válido por 15 minutos. Si no solicitó este acceso, puede ignorar este mensaje.
  `.trim();

  return { subject, html, text };
}
