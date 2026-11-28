const greetings = {
  en: (name, first) => first
    ? `Welcome to rifKANDO${name}! Your account is ready.`
    : `Welcome back${name}! Good to see you again.`,
  fr: (name, first) => first
    ? `Bienvenue sur rifKANDO${name} ! Votre compte est prêt.`
    : `Bon retour${name} ! Quel plaisir de vous retrouver.`,
  ar: (name, first) => first
    ? `أهلًا بك في rifKANDO${name}! حسابك جاهز.`
    : `أهلًا بعودتك${name}! يسعدنا أن نراك مجددًا.`,
};

export function welcomeMessage(language, displayName, first) {
  const locale = language?.split('-')[0];
  const clean = typeof displayName === 'string' ? displayName.trim() : '';
  const name = clean && !clean.includes('@') ? clean.split(/\s+/u)[0] : '';
  const suffix = name ? `${locale === 'ar' ? '،' : ','} \u2068${Array.from(name).slice(0, 32).join('')}\u2069` : '';
  return (Object.hasOwn(greetings, locale) ? greetings[locale] : greetings.en)(suffix, first);
}
