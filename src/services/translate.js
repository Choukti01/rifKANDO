// frontend/src/services/translate.js
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function translateText(text, targetLang) {
  if (!text || text.trim() === '') return text;
  // Add a small delay to avoid hitting rate limits (adjust as needed)
  await delay(100);
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    let translated = data.responseData.translatedText;
    // If the API returns the error message, keep original
    if (translated && translated.includes('PLEASE SELECT TWO DISTINCT LANGUAGES')) {
      console.warn(`Translation failed for: "${text}" – keeping original.`);
      return text;
    }
    return translated || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}