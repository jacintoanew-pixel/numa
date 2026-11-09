/**
 * Google Gemini Multimodal Vision — Invoice & Receipt OCR Scanner
 * 
 * Powered by `@google/genai` (v2.29.1) with Gemini Vision models (gemini-2.5-flash / gemini-3.8-flash).
 * 
 * Extracts:
 * - Total amount
 * - Merchant / store name
 * - Summary description / concept
 * - Recommended financial category
 * - Invoice date
 * - Detected payment method (Yappy, Cash/Efectivo, Card, etc.)
 * - Line items list
 */

import { GoogleGenAI, Type } from "@google/genai";

export interface ReceiptItem {
  name: string;
  price: number;
}

export interface ScannedReceipt {
  amount: number;
  merchant: string;
  description: string;
  category: string;
  date: string; // YYYY-MM-DD
  paymentMethod?: string;
  items?: ReceiptItem[];
  confidence: number;
  rawSummary: string;
  isMockFallback?: boolean;
}

const OFFICIAL_CATEGORIES = [
  "Alimentación y Super",
  "Restaurantes y Ocio",
  "Transporte y Auto",
  "Servicios y Hogar",
  "Salud y Bienestar",
  "Entretenimiento y Ocio",
  "Otros",
] as const;

import { integrationsVault } from "../security/integrations-vault";

function getPanamaTodayIso(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Panama",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export class ReceiptScanner {
  private client: GoogleGenAI | null = null;
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey =
      integrationsVault.getGeminiApiKey() ??
      process.env.GEMINI_API_KEY ??
      process.env.GOOGLE_API_KEY ??
      "";
    this.model = process.env.GEMINI_VISION_MODEL ?? "gemini-2.5-flash";

    if (this.apiKey) {
      try {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (err) {
        console.warn("Could not initialize GoogleGenAI for ReceiptScanner:", err);
      }
    }
  }

  private ensureClient(): GoogleGenAI | null {
    const activeKey =
      integrationsVault.getGeminiApiKey() ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      this.apiKey ||
      "";
    if (!activeKey) return null;
    if (!this.client || this.apiKey !== activeKey) {
      try {
        this.apiKey = activeKey;
        this.client = new GoogleGenAI({ apiKey: activeKey });
      } catch (err) {
        console.warn("Could not initialize GoogleGenAI for ReceiptScanner:", err);
        return null;
      }
    }
    return this.client;
  }

  /**
   * Scans a receipt/invoice image buffer and extracts structured financial data.
   */
  public async scanReceipt(
    imageBuffer: Buffer,
    mimeType: string = "image/jpeg",
    userCaption?: string
  ): Promise<ScannedReceipt> {
    const base64Data = imageBuffer.toString("base64");
    const todayIso = getPanamaTodayIso();
    const client = this.ensureClient();

    // If client is available with API key, use Gemini Vision
    if (client && this.apiKey) {
      try {
        const prompt = `Analiza esta factura, recibo o comprobante de pago con máxima precisión para el sistema de finanzas personales de Admin User (Panamá / USD $).
${userCaption ? `Nota o instrucción del usuario: "${userCaption}"\n` : ""}
Debes extraer:
1. "merchant": Nombre del comercio, tienda, supermercado o restaurante (ej. "Panadería La Espiga", "Super 99", "Riba Smith", "Farmacias Arrocha"). Si la imagen no es una factura legible, devuelve "No legible".
2. "amount": Monto total final pagado como número positivo con decimales (ej. 20.00). Si la imagen no es legible, devuelve 0.
3. "description": Concepto claro y breve del gasto (ej. "Compra de pan", "Supermercado semanal", "Almuerzo ejecutivo").
4. "category": Selecciona exactamente una de las siguientes categorías oficiales:
   - "Alimentación y Super" (panaderías, supermercados, abarrotes, carnicerías)
   - "Restaurantes y Ocio" (cafeterías, restaurantes, bares, delivery)
   - "Transporte y Auto" (gasolina, Uber, taxi, peaje corredores, taller)
   - "Servicios y Hogar" (electricidad, agua, internet, ferretería, limpieza)
   - "Salud y Bienestar" (farmacias, consultas médicas, gimnasio)
   - "Entretenimiento y Ocio" (cine, eventos, streaming)
   - "Otros"
5. "date": Fecha que aparece impresa en la factura en formato YYYY-MM-DD. Si no es legible o no aparece claramente, usa exactamente la fecha de hoy: "${todayIso}".
6. "paymentMethod": Método de pago si está indicado en el ticket o en la nota ("Yappy", "Efectivo", "Clave", "Visa", "Mastercard", "Punto Pago", etc.).
7. "items": Lista de los productos o servicios principales con nombre y precio unitario si son legibles.
8. "confidence": Nivel de confianza real entre 0.0 y 1.0 (si la imagen no es un recibo legible o está en blanco, devuelve un valor <= 0.1).`;

        const response = await client.models.generateContent({
          model: this.model,
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
            prompt,
          ],
          config: {
            responseMimeType: "application/json",
            responseJsonSchema: {
              type: Type.OBJECT,
              properties: {
                merchant: { type: Type.STRING, description: "Nombre del comercio o establecimiento" },
                amount: { type: Type.NUMBER, description: "Importe total del recibo" },
                description: { type: Type.STRING, description: "Descripción o concepto del gasto" },
                category: {
                  type: Type.STRING,
                  enum: OFFICIAL_CATEGORIES as any,
                  description: "Categoría de gasto oficial",
                },
                date: { type: Type.STRING, description: "Fecha de la factura en formato YYYY-MM-DD" },
                paymentMethod: { type: Type.STRING, description: "Método de pago detectado" },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      price: { type: Type.NUMBER },
                    },
                    required: ["name", "price"],
                  },
                },
                confidence: { type: Type.NUMBER },
              },
              required: ["merchant", "amount", "description", "category"],
            },
          },
        });

        const rawText = response.text || "";
        const parsed = JSON.parse(rawText);

        const parsedAmount = Math.abs(Number(parsed.amount) || 0);
        const isUnreadable =
          parsedAmount === 0 ||
          (typeof parsed.merchant === "string" &&
            /no legible|unreadable|desconocido|n\/a/i.test(parsed.merchant));

        const currentYear = Number(todayIso.slice(0, 4));
        const dateYear =
          typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
            ? Number(parsed.date.slice(0, 4))
            : 0;
        const validatedDate =
          !isUnreadable &&
          typeof parsed.date === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) &&
          dateYear >= currentYear - 1 &&
          dateYear <= currentYear + 1
            ? parsed.date
            : todayIso;

        const rawConf =
          typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
            ? Math.max(0, Math.min(1, parsed.confidence))
            : isUnreadable
            ? 0.05
            : 0.9;
        const finalConfidence = isUnreadable ? Math.min(rawConf, 0.1) : rawConf;

        return {
          amount: parsedAmount,
          merchant: parsed.merchant || "Comercio",
          description: parsed.description || `Compra en ${parsed.merchant || "comercio"}`,
          category: parsed.category || "Alimentación y Super",
          date: validatedDate,
          paymentMethod: parsed.paymentMethod || undefined,
          items: Array.isArray(parsed.items) ? parsed.items : [],
          confidence: finalConfidence,
          rawSummary: `${parsed.merchant}: ${parsed.description} - $${parsedAmount.toFixed(2)}`,
        };
      } catch (err: any) {
        console.warn("Receipt scanning with Gemini failed, falling back to heuristic parser:", err?.message);
      }
    }

    // Heuristic Fallback (Offline / Development without API key)
    return this.fallbackReceiptExtraction(userCaption);
  }

  /**
   * Deterministic local fallback when Gemini API key is missing or offline.
   * Can extract amounts from captions like "compra de pan $20" or default to realistic values.
   */
  private fallbackReceiptExtraction(userCaption?: string): ScannedReceipt {
    const today = getPanamaTodayIso();
    const caption = userCaption?.trim() || "";

    // Check if caption contains an amount like "$20" or "20$"
    const amountMatch = caption.match(/\$?\s*(\d+(?:[.,]\d{1,2})?)\s*\$?/) || caption.match(/(\d+(?:[.,]\d{1,2})?)\s*\$/);
    const amountNum = amountMatch ? parseFloat(amountMatch[1].replace(",", ".")) : 20.00;

    // Detect concept
    let description = "Compra de pan y víveres";
    let merchant = "Panadería y Abarrotes";
    let category = "Alimentación y Super";
    let paymentMethod = "Efectivo";

    const lower = caption.toLowerCase();
    if (lower.includes("pan") || lower.includes("panaderia")) {
      description = "Compra de pan";
      merchant = "Panadería La Espiga";
      category = "Alimentación y Super";
    } else if (lower.includes("super") || lower.includes("mercado")) {
      description = "Supermercado y despensa";
      merchant = "Supermercado Riba Smith";
      category = "Alimentación y Super";
    } else if (lower.includes("gasolina") || lower.includes("combustible")) {
      description = "Carga de combustible";
      merchant = "Estación Terpel";
      category = "Transporte y Auto";
    } else if (lower.includes("almuerzo") || lower.includes("cafe") || lower.includes("restaurante")) {
      description = "Almuerzo y café";
      merchant = "Café & Bistró";
      category = "Restaurantes y Ocio";
    } else if (lower.includes("farmacia") || lower.includes("medicina")) {
      description = "Medicamentos y farmacia";
      merchant = "Farmacias Arrocha";
      category = "Salud y Bienestar";
    }

    if (lower.includes("yappy")) paymentMethod = "Yappy";
    else if (lower.includes("banistmo")) paymentMethod = "Banistmo";
    else if (lower.includes("caja")) paymentMethod = "Caja de Ahorros";
    else if (lower.includes("punto")) paymentMethod = "Punto Pago";
    else if (lower.includes("paypal")) paymentMethod = "PayPal";

    return {
      amount: amountNum,
      merchant,
      description,
      category,
      date: today,
      paymentMethod,
      confidence: caption ? 0.75 : 0.25,
      rawSummary: `${merchant} - ${description} ($${amountNum.toFixed(2)})`,
      isMockFallback: true,
    };
  }
}

export const receiptScanner = new ReceiptScanner();
