import { NextRequest, NextResponse } from 'next/server';
import { callGemini, callGeminiVision } from '@/lib/gemini';

// ═══════════════════════════════════════════════════════════
//  MEW OS — Gemini AI Brain + Vision OCR
// ═══════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, context, lang, imageBase64, mode } = body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json(
        { answer: 'AI key missing. Add GEMINI_API_KEY to .env.local', error: true },
        { status: 200 }
      );
    }

    // ── Vision OCR Mode: Number Plates or Spare Part Bills ──
    if (imageBase64 && mode) {
      if (mode === 'ocr_plate') {
        const platePrompt = `You are a vehicle license plate OCR reader for Indian vehicles (Tamil Nadu TN, KA, KL, AP, etc.).
Extract ONLY the vehicle registration number from this image (e.g. TN 28 AB 1234 or TN 34 X 9988).
Return pure JSON with format:
{
  "registrationNumber": "TN 28 AB 1234",
  "confidence": "high",
  "notes": "commercial truck / bore rig"
}
If no number plate is readable, return { "registrationNumber": null, "notes": "No plate detected" }.
Return ONLY valid JSON.`;

        const visionRes = await callGeminiVision({
          imageBase64,
          prompt: platePrompt,
          apiKey,
          responseMimeType: 'application/json',
        });

        return NextResponse.json({ result: visionRes });
      }

      if (mode === 'ocr_bill') {
        const billPrompt = `You are an invoice OCR parser for automobile spare parts and engineering workshop bills.
Extract the supplier name, invoice date, invoice number, line items (part description, quantity, unit rate, total amount), and grand total.
Return pure JSON with format:
{
  "supplierName": "Sri Lakshmi Auto Spares",
  "invoiceNo": "INV-1092",
  "date": "2026-08-22",
  "items": [that 
    { "name": "Hydraulic Oil Seal 45mm", "qty": 4, "unitPrice": 350, "total": 1400 },
    { "name": "Filter Element High Pressure", "qty": 2, "unitPrice": 1200, "total": 2400 }
  ],
  "grandTotal": 3800
}
Return ONLY valid JSON.`;

        const visionRes = await callGeminiVision({
          imageBase64,
          prompt: billPrompt,
          apiKey,
          responseMimeType: 'application/json',
        });

        return NextResponse.json({ result: visionRes });
      }
    }

    // ── Standard Conversational AI Voice ──
    const isTamil = lang === 'ta-IN';

    const systemPrompt = `You are MEW OS — a brilliant, friendly, and versatile AI voice assistant (like Siri / ChatGPT Voice / JARVIS) created for Mithra Engineering Works (MEW), a bore rig workshop in Tamil Nadu, India.

Your capabilities:
1. Universal Knowledge: You can answer ANY question the user asks — general knowledge, Tamil Nadu current affairs & politics (e.g. Chief Minister M.K. Stalin, Prime Minister Narendra Modi), science, math, history, borewell rig engineering, weather, advice, casual chit-chat.
2. Workshop Business: You have full access to the live workshop data below.

Rules:
1. ${isTamil ? 'Reply naturally in Tamil (or conversational Tamil/Tanglish). Be friendly, warm, and charming.' : 'Reply in clear, warm, conversational English. Be helpful and natural.'}
2. Keep answers concise (1-2 sentences). Spoken aloud over audio. No markdown bullet points or asterisk formatting.
3. If asked general knowledge or chit-chat, answer warmly and accurately.
4. Today's date is: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.

Workshop Data:
${context || ''}`;

    const result = await callGemini({
      systemPrompt,
      userMessage: question || 'வணக்கம்',
      apiKey,
      temperature: 0.7,
      maxOutputTokens: 200,
    });

    if (result) {
      return NextResponse.json({ answer: result.text });
    }

    return NextResponse.json(
      { answer: isTamil ? 'மன்னிச்சுக்கோங்க, பதில் கிடைக்கலை. Gemini API key-ஐ சரிபார்க்கவும்.' : 'Sorry, could not get an answer. Please check your Gemini API key.', error: true },
      { status: 200 }
    );
  } catch (e: any) {
    console.error('AI route error:', e);
    return NextResponse.json(
      { answer: 'AI error: ' + (e.message || 'unknown'), error: true },
      { status: 200 }
    );
  }
}
