/**
 * Normalize Arabic-script text for display/shaping.
 * Some legacy Kurdish entries are stored as Arabic Presentation Forms (U+FB50–U+FEFF),
 * which render as disconnected isolated glyphs. NFKC maps them back to standard letters
 * so the browser can apply contextual cursive shaping.
 */
export function normalizeArabicScriptForDisplay(text: string): string {
  if (!text) {
    return text
  }

  return text.normalize('NFKC')
}

export function containsArabicPresentationForms(text: string): boolean {
  return /[\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
}
