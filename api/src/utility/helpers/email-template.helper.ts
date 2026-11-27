// Plantilla común de los emails: mismo encabezado, botón y pie que la app (login/signup).
// Todo con estilos inline y tablas porque Gmail/Outlook ignoran <style> y flex.

export type EmailLanguage = 'es' | 'en';

export interface EmailContent {
  subject: string;
  html: string;
  // Versión en texto plano: mejora la entrega (menos spam) y la leen clientes sin HTML
  text: string;
}

// Colores de la app (Tailwind indigo): botón = indigo-700, borde de la tarjeta = indigo-500
export const EMAIL_COLORS = {
  primary: '#432dd7',
  cardBorder: '#615fff',
  title: '#111827',
  text: '#374151',
  muted: '#6b7280',
  background: '#f3f4f6',
};

const FONT = `Arial, 'Helvetica Neue', Helvetica, sans-serif`;

const APP_NAME: Record<EmailLanguage, string> = { es: 'Mis Eventos', en: 'My Events' };

const TEXTS: Record<EmailLanguage, Record<string, string>> = {
  es: {
    verifySubject: 'Verificá tu email',
    verifyTitle: '¡Bienvenido! Verificá tu email',
    verifyIntro: 'Gracias por registrarte. Para activar tu cuenta, confirmá tu dirección de email con el botón de abajo:',
    verifyButton: 'Verificar email',
    verifyExpiry: 'El enlace vence en 7 días. Si no creaste una cuenta, ignorá este email.',
    resetSubject: 'Restablecé tu contraseña',
    resetTitle: 'Restablecé tu contraseña',
    resetIntro: 'Recibimos un pedido para restablecer tu contraseña. Creá una nueva con el botón de abajo:',
    resetButton: 'Restablecer contraseña',
    resetExpiry: 'El enlace vence en 2 horas. Si no lo pediste, ignorá este email: tu contraseña no cambia.',
    copyLink: 'Si el botón no funciona, copiá y pegá este enlace en tu navegador:',
    footer: 'Este es un email automático, no lo respondas.',
  },
  en: {
    verifySubject: 'Verify your email address',
    verifyTitle: 'Welcome! Verify your email',
    verifyIntro: 'Thank you for signing up. To activate your account, confirm your email address with the button below:',
    verifyButton: 'Verify email',
    verifyExpiry: "This link expires in 7 days. If you didn't create an account, please ignore this email.",
    resetSubject: 'Reset your password',
    resetTitle: 'Reset your password',
    resetIntro: 'We received a request to reset your password. Create a new one with the button below:',
    resetButton: 'Reset password',
    resetExpiry: "This link expires in 2 hours. If you didn't request it, ignore this email: your password won't change.",
    copyLink: "If the button doesn't work, copy and paste this link in your browser:",
    footer: 'This is an automated email, please do not reply.',
  },
};

export class EmailTemplateHelper {
  // Lo que manda el SPA (idioma del selector); sin idioma o desconocido → español
  static toLanguage(value: unknown): EmailLanguage {
    return value === 'en' ? 'en' : 'es';
  }

  static appName(language: EmailLanguage): string {
    return APP_NAME[language];
  }

  static verification(link: string, language: EmailLanguage): EmailContent {
    const t = TEXTS[language];
    return EmailTemplateHelper.actionEmail(language, t.verifySubject, t.verifyTitle, t.verifyIntro, t.verifyButton, t.verifyExpiry, link);
  }

  static resetPassword(link: string, language: EmailLanguage): EmailContent {
    const t = TEXTS[language];
    return EmailTemplateHelper.actionEmail(language, t.resetSubject, t.resetTitle, t.resetIntro, t.resetButton, t.resetExpiry, link);
  }

  // Envuelve el contenido en la tarjeta con el encabezado de la app y el pie
  static layout(language: EmailLanguage, subject: string, body: string, footer?: string): string {
    const footerText = footer ?? TEXTS[language].footer;
    return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${EMAIL_COLORS.background};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${EMAIL_COLORS.background};">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid ${EMAIL_COLORS.cardBorder}; border-radius: 8px;">
          <tr>
            <td style="padding: 28px 32px 0; font-family: ${FONT};">
              <div style="font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: ${EMAIL_COLORS.title};">${APP_NAME[language]}</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px 32px; font-family: ${FONT}; font-size: 15px; line-height: 1.5; color: ${EMAIL_COLORS.text};">
              ${body}
            </td>
          </tr>
        </table>
        <p style="max-width: 600px; margin: 16px auto 0; font-family: ${FONT}; font-size: 12px; line-height: 1.5; color: ${EMAIL_COLORS.muted};">${footerText}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  static button(url: string, label: string): string {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 28px auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: ${EMAIL_COLORS.primary};">
                    <a href="${escapeHtml(url)}" style="display: inline-block; padding: 12px 28px; font-family: ${FONT}; font-size: 15px; font-weight: bold; color: #ffffff; text-decoration: none; border-radius: 8px;">${label}</a>
                  </td>
                </tr>
              </table>`;
  }

  // Texto plano a partir del HTML: saca estilos/etiquetas y conserva los enlaces
  static toText(html: string): string {
    return html
      .replace(/<head[\s\S]*?<\/head>/gi, '')
      .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
        const text = label.replace(/<[^>]+>/g, '').trim();
        return text && text !== href ? `${text}: ${href}` : href;
      })
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|tr|table)>/gi, '\n')
      .replace(/<\/td>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .split('\n')
      .map(line => line.replace(/[ \t]+/g, ' ').trim())
      .filter((line, index, lines) => line !== '' || (index > 0 && lines[index - 1] !== ''))
      .join('\n')
      .trim();
  }

  private static actionEmail(
    language: EmailLanguage,
    subject: string,
    title: string,
    intro: string,
    buttonLabel: string,
    expiry: string,
    link: string,
  ): EmailContent {
    const t = TEXTS[language];
    const safeLink = escapeHtml(link);
    const body = `
              <h2 style="margin: 0 0 12px; font-size: 22px; color: ${EMAIL_COLORS.title};">${title}</h2>
              <p style="margin: 0;">${intro}</p>
              ${EmailTemplateHelper.button(link, buttonLabel)}
              <p style="margin: 0 0 16px; font-size: 14px; color: ${EMAIL_COLORS.muted};">${expiry}</p>
              <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted};">${t.copyLink}<br><a href="${safeLink}" style="color: ${EMAIL_COLORS.primary}; word-break: break-all;">${safeLink}</a></p>`;
    const html = EmailTemplateHelper.layout(language, subject, body);
    const text = [title, '', intro, '', `${buttonLabel}: ${link}`, '', expiry, '', '—', APP_NAME[language], t.footer].join('\n');
    return { subject, html, text };
  }
}

const escapeHtml = (text: string): string => text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
