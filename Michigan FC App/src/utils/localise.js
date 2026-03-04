const templates = {
  en: {
    newEvent: (title) => ({
      title: `New Event: ${title}`,
      message: `A new event "${title}" has been scheduled. Check the app for details.`,
    }),
    manual: (title, message) => ({ title, message }),
  },
  ar: {
    newEvent: (title) => ({
      title: `حدث جديد: ${title}`,
      message: `تمت جدولة حدث جديد "${title}". تحقق من التطبيق للتفاصيل.`,
    }),
    manual: (title, message) => ({ title, message }),
  },
};

/**
 * Return a localised notification payload.
 * @param {'en'|'ar'} lang
 * @param {'newEvent'|'manual'} key
 * @param  {...any} args
 * @returns {{ title: string, message: string }}
 */
function localise(lang, key, ...args) {
  const bundle = templates[lang] || templates.en;
  const fn = bundle[key] || templates.en[key];
  return fn(...args);
}

module.exports = { localise };
