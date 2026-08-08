const TRANSLATE_TIMEOUT_MS = 15000

export class AzureTranslatorError extends Error {
  constructor(message = 'Failed to translate Arabic text. Please try again.') {
    super(message)
    this.name = 'AzureTranslatorError'
  }
}

function getAzureConfig(): { endpoint: string; key: string; region: string } {
  const key = process.env.AZURE_TRANSLATOR_KEY?.trim()
  const endpoint = process.env.AZURE_TRANSLATOR_ENDPOINT?.trim().replace(/\/$/, '')
  const region = process.env.AZURE_TRANSLATOR_REGION?.trim()

  if (!key || !endpoint || !region) {
    throw new AzureTranslatorError('Translation service is not configured.')
  }

  return { endpoint, key, region }
}

/**
 * Translate one or more English strings to Arabic in a single Azure request.
 * Empty strings are returned as empty without calling Azure.
 */
export async function translateEnglishTextsToArabic(texts: string[]): Promise<string[]> {
  if (texts.length === 0) {
    return []
  }

  const results = texts.map((text) => text.trim())
  const indexesToTranslate: number[] = []

  results.forEach((text, index) => {
    if (text) {
      indexesToTranslate.push(index)
    }
  })

  if (indexesToTranslate.length === 0) {
    return results
  }

  const { endpoint, key, region } = getAzureConfig()
  const url = `${endpoint}/translate?api-version=3.0&from=en&to=ar`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': key,
        'Ocp-Apim-Subscription-Region': region,
      },
      body: JSON.stringify(indexesToTranslate.map((index) => ({ text: results[index] }))),
      signal: controller.signal,
    })

    if (!response.ok) {
      console.error('[Azure Translator] Request failed with status', response.status)
      throw new AzureTranslatorError()
    }

    const payload = (await response.json()) as Array<{
      translations?: Array<{ text?: string }>
    }>

    if (!Array.isArray(payload) || payload.length !== indexesToTranslate.length) {
      console.error('[Azure Translator] Unexpected response shape')
      throw new AzureTranslatorError()
    }

    indexesToTranslate.forEach((resultIndex, responseIndex) => {
      const translated = payload[responseIndex]?.translations?.[0]?.text?.trim()
      if (!translated) {
        throw new AzureTranslatorError()
      }
      results[resultIndex] = translated
    })

    return results
  } catch (error) {
    if (error instanceof AzureTranslatorError) {
      throw error
    }

    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Azure Translator] Request timed out')
      throw new AzureTranslatorError()
    }

    console.error('[Azure Translator] Request error')
    throw new AzureTranslatorError()
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function translateEnglishToArabic(text: string): Promise<string> {
  const [translated] = await translateEnglishTextsToArabic([text])
  return translated ?? ''
}
