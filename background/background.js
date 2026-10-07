const WIKTIONARY_API = 'https://en.wiktionary.org/api/rest_v1/page/definition/';

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const word = request.word.trim(),
        lang = request.lang;

    // Wiktionary titles are case-sensitive: sentence-initial "Dog" should find "dog", but German nouns ("Haus") are capitalized.
    // Try both casings in the user's language first, then the original casing in any language.
    const lower = word.toLowerCase(),
        casings = lang === 'de' ? [word, lower] : [lower, word];

    lookup(casings[0], lang, true)
        .then((content) => content || (lower !== word ? lookup(casings[1], lang, true) : null))
        .then((content) => content || lookup(word, lang, false))
        .then((content) => {
            sendResponse({ content });

            content && saveWord(content);
        })
        .catch(() => sendResponse({ content: null }));

    return true;
});

function lookup (word, lang, userLanguageOnly) {
    return fetch(WIKTIONARY_API + encodeURIComponent(word), {
            credentials: 'omit',
            headers: { 'Api-User-Agent': 'DictionaryAnywhere-fork (https://github.com/samue1goldstein/Dictionary)' }
        })
        .then((response) => response.ok ? response.json() : null)
        .then((data) => data && extractMeaning(userLanguageOnly ? { [lang]: data[lang] || [] } : data, word, lang));
}

// Response is keyed by language code: { fr: [{ partOfSpeech, language, definitions: [{ definition: "<html>" }] }], en: [...], other: [...] }
function extractMeaning (data, word, lang) {
    // Prefer the user's language, then English, then whatever Wiktionary lists ("other" holds obscure languages).
    const entries = [].concat(data[lang] || [], data.en || [], ...Object.values(data));

    for (const entry of entries) {
        for (const def of entry.definitions || []) {
            const meaning = stripHtml(def.definition);

            if (meaning) {
                return { word, meaning: meaning[0].toUpperCase() + meaning.substring(1) };
            }
        }
    }

    return null;
}

function stripHtml (html) {
    return new DOMParser().parseFromString(html || '', 'text/html').body.textContent.trim();
}

async function saveWord ({ word, meaning }) {
    const { history = { enabled: true }, definitions = {} } = await browser.storage.local.get(['history', 'definitions']);

    if (!history.enabled) { return; }

    definitions[word] = meaning;
    browser.storage.local.set({ definitions });
}
