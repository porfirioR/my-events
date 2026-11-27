import { EmailTemplateHelper } from './email-template.helper';

describe('EmailTemplateHelper', () => {
  const link = 'https://app.test/verify-email?token=abc&x=1';

  it('uses Spanish when the language is missing or unknown', () => {
    expect(EmailTemplateHelper.toLanguage(undefined)).toBe('es');
    expect(EmailTemplateHelper.toLanguage('fr')).toBe('es');
    expect(EmailTemplateHelper.toLanguage('en')).toBe('en');
  });

  it('renders the verification email in Spanish with the app layout', () => {
    const { subject, html, text } = EmailTemplateHelper.verification(link, 'es');
    expect(subject).toBe('Verificá tu email');
    expect(html).toContain('Mis Eventos');
    expect(html).toContain('Verificar email');
    expect(html).toContain('https://app.test/verify-email?token=abc&amp;x=1');
    expect(text).toContain(`Verificar email: ${link}`);
    expect(text).not.toContain('<');
  });

  it('renders the reset password email in English', () => {
    const { subject, html, text } = EmailTemplateHelper.resetPassword(link, 'en');
    expect(subject).toBe('Reset your password');
    expect(html).toContain('My Events');
    expect(html).toContain('lang="en"');
    expect(text).toContain('expires in 2 hours');
  });

  it('converts HTML to plain text keeping the links', () => {
    const html = EmailTemplateHelper.layout('es', 'Asunto', `<p>Hola &amp; chau</p>${EmailTemplateHelper.button('https://app.test', 'Abrir')}`);
    const text = EmailTemplateHelper.toText(html);
    expect(text).toContain('Hola & chau');
    expect(text).toContain('Abrir: https://app.test');
    expect(text).not.toContain('<');
    expect(text).not.toContain('Asunto');
  });
});
