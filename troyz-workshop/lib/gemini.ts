// ═══════════════════════════════════════════════════════════
//  MEW OS — Gemini AI Client (Unified)
//  Works with Google AI Studio free tier + latest Gemini API
//  Model: gemini-3.5-flash / gemini-3.6-flash (latest, free)
// ═══════════════════════════════════════════════════════════

// Ordered by preference: try newest stable first, fall back
// All these models have thinking enabled, so we need thinkingBudget:0
// or high maxOutputTokens to avoid empty responses
const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-3-flash-preview',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
];

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export interface GeminiRequest {
  systemPrompt: string;
  userMessage: string;
  apiKey: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
  abortSignal?: AbortSignal;
}

export interface GeminiResponse {
  text: string;
  model: string;
}

/**
 * Validates a Gemini API key by sending a minimal test request.
 * Returns { valid: boolean, message: string, model?: string }
 */
export async function validateGeminiKey(apiKey: string): Promise<{ valid: boolean; message: string; model?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { valid: false, message: 'Please enter an API key.' };
  }

  // Try models in order until one responds
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Say hi in 3 words' }] }],
          generationConfig: {
            maxOutputTokens: 256,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          return { valid: true, message: `API key is ACTIVE & working with ${model}!`, model };
        }
        // Model responded but text might be in thinking only
        return { valid: true, message: `API key works with ${model}!`, model };
      }

      const err = await res.json().catch(() => ({}));
      const errMsg = err?.error?.message || '';

      // If model not found/unavailable, try next one
      if (errMsg.includes('not found') || errMsg.includes('is not available') || errMsg.includes('no longer available') || res.status === 404) {
        continue;
      }

      // thinkingConfig not supported by this model — try without it
      if (errMsg.includes('thinkingConfig') || errMsg.includes('invalid argument')) {
        const res2 = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Say hi in 3 words' }] }],
            generationConfig: { maxOutputTokens: 1024 },
          }),
        });
        if (res2.ok) {
          const data2 = await res2.json();
          const text2 = data2?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text2) {
            return { valid: true, message: `API key is ACTIVE & working with ${model}!`, model };
          }
          return { valid: true, message: `API key works with ${model}!`, model };
        }
        continue;
      }

      // Auth error — don't retry
      if (res.status === 403 || res.status === 401) {
        return { valid: false, message: errMsg || 'Invalid API key or access denied.' };
      }

      // Other errors — try next model
      continue;
    } catch (e: any) {
      return { valid: false, message: `Connection error: ${e.message || e}` };
    }
  }

  return { valid: false, message: 'No available Gemini models. Check your API key at aistudio.google.com/apikey' };
}

/**
 * Resolves the API key from multiple sources (settings DB, env vars).
 */
export async function resolveGeminiKey(settingsGetter?: (key: string) => Promise<string | undefined>): Promise<string> {
  let key = '';
  if (settingsGetter) {
    try { key = (await settingsGetter('gemini_api_key')) || ''; } catch (_) {}
  }
  if (!key) {
    key = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  }
  return key && key !== 'YOUR_KEY_HERE' ? key.trim() : '';
}

/**
 * Send a request to Gemini API with automatic model fallback.
 * Handles thinking models by disabling thinking or allocating enough tokens.
 * Returns the text response or null on failure.
 */
export async function callGemini(request: GeminiRequest): Promise<GeminiResponse | null> {
  const {
    systemPrompt,
    userMessage,
    apiKey,
    model: preferredModel,
    temperature = 0.7,
    maxOutputTokens = 1024,
    responseMimeType,
    history = [],
    abortSignal,
  } = request;

  // Build model list: preferred first, then fallbacks
  const models = preferredModel
    ? [preferredModel, ...GEMINI_MODELS.filter(m => m !== preferredModel)]
    : GEMINI_MODELS;

  for (const model of models) {
    try {
      const contents = history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }],
      }));
      contents.push({ role: 'user', parts: [{ text: userMessage }] });

      // Thinking models need either thinkingBudget:0 or large maxOutputTokens
      // We try with thinking disabled first for fast, predictable responses
      const generationConfig: Record<string, any> = {
        temperature,
        maxOutputTokens: Math.max(maxOutputTokens, 1024),
      };
      if (responseMimeType) {
        generationConfig.responseMimeType = responseMimeType;
      }
      generationConfig.thinkingConfig = { thinkingBudget: 0 };

      const body: Record<string, any> = {
        contents,
        generationConfig,
      };

      // Only add system_instruction if we have a prompt
      if (systemPrompt) {
        body.system_instruction = { parts: [{ text: systemPrompt }] };
      }

      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      };
      if (abortSignal) {
        fetchOptions.signal = abortSignal;
      }

      const res = await fetch(
        `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`,
        fetchOptions
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errMsg = err?.error?.message || '';

        // If model not available, try next
        if (errMsg.includes('not found') || errMsg.includes('is not available') || errMsg.includes('no longer available') || res.status === 404) {
          continue;
        }

        // thinkingConfig not supported — retry without it (uses high token count)
        if (errMsg.includes('thinkingConfig') || errMsg.includes('invalid argument')) {
          const retryBody = { ...body };
          delete retryBody.generationConfig.thinkingConfig;
          retryBody.generationConfig.maxOutputTokens = Math.max(maxOutputTokens, 2048);

          const retryRes = await fetch(
            `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`,
            { ...fetchOptions, body: JSON.stringify(retryBody) }
          );

          if (retryRes.ok) {
            const retryData = await retryRes.json();
            const text = extractGeminiText(retryData);
            if (text) return { text, model };
          }
          continue;
        }

        // Auth error — don't retry
        if (res.status === 403 || res.status === 401) {
          console.error(`Gemini auth error (${model}):`, errMsg);
          return null;
        }

        // Other errors — try next model
        console.warn(`Gemini error on ${model}:`, errMsg);
        continue;
      }

      const data = await res.json();
      const text = extractGeminiText(data);
      if (text) {
        return { text, model };
      }

      // Empty response — try next model
      console.warn(`Gemini empty response from ${model}`);
      continue;
    } catch (e: any) {
      // Abort signal means caller cancelled — don't retry
      if (e.name === 'AbortError') return null;
      console.warn(`Gemini call failed on ${model}:`, e.message);
      continue;
    }
  }

  return null;
}

/**
 * Extracts text from various Gemini response formats.
 * Handles standard responses and thinking model outputs.
 */
function extractGeminiText(data: any): string | null {
  try {
    const candidate = data?.candidates?.[0];
    if (!candidate) return null;

    // Standard response path
    const parts = candidate?.content?.parts;
    if (parts && Array.isArray(parts)) {
      // Concatenate all text parts (thinking models may have multiple)
      const textParts = parts
        .filter((p: any) => p.text)
        .map((p: any) => p.text as string);
      if (textParts.length > 0) {
        return textParts.join('').trim();
      }
    }

    // Fallback: direct text field
    if (candidate?.content?.text) {
      return candidate.content.text.trim();
    }

    return null;
  } catch {
    return null;
  }
}

export interface GeminiVisionRequest {
  imageBase64: string;
  mimeType?: string;
  prompt: string;
  apiKey: string;
  responseMimeType?: string;
}

/**
 * Sends a multimodal image + prompt request to Gemini Vision.
 */
export async function callGeminiVision(request: GeminiVisionRequest): Promise<string | null> {
  const { imageBase64, mimeType = 'image/jpeg', prompt, apiKey, responseMimeType } = request;
  if (!apiKey || !imageBase64) return null;

  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

  const visionModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-flash-latest',
    'gemini-3.5-flash',
  ];

  for (const model of visionModels) {
    try {
      const contents = [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: cleanBase64,
              },
            },
          ],
        },
      ];

      const generationConfig: Record<string, any> = {
        temperature: 0.2,
        maxOutputTokens: 2048,
      };
      if (responseMimeType) {
        generationConfig.responseMimeType = responseMimeType;
      }

      const res = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig }),
      });

      if (!res.ok) {
        continue;
      }

      const data = await res.json();
      const text = extractGeminiText(data);
      if (text) {
        return text;
      }
    } catch (e) {
      console.warn(`Vision call on ${model} error:`, e);
      continue;
    }
  }

  return null;
}

