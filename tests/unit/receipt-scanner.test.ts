import { describe, it, expect } from "vitest";
import { ReceiptScanner } from "@/lib/gemini/receipt-scanner";

describe("Receipt Scanner & OCR Invoice Processing", () => {
  const scanner = new ReceiptScanner();

  it("extracts concept and amount from bread receipt photo/caption 'compra de pan $20'", async () => {
    const mockImage = Buffer.from("simulated_jpeg_binary_data");
    const result = await scanner.scanReceipt(mockImage, "image/jpeg", "compra de pan $20");

    expect(result).toBeDefined();
    expect(result.amount).toBe(20.00);
    expect(result.description.toLowerCase()).toContain("pan");
    expect(result.category).toBe("Alimentación y Super");
  });

  it("extracts supermarket receipt with Yappy payment method", async () => {
    const mockImage = Buffer.from("simulated_jpeg_binary_data");
    const result = await scanner.scanReceipt(mockImage, "image/jpeg", "Supermercado Riba Smith $45.80 pagado con Yappy");

    expect(result.amount).toBe(45.80);
    expect(result.merchant).toContain("Riba Smith");
    expect(result.category).toBe("Alimentación y Super");
    expect(result.paymentMethod).toBe("Yappy");
  });

  it("extracts fuel expense receipt for transportation category", async () => {
    const mockImage = Buffer.from("simulated_jpeg_binary_data");
    const result = await scanner.scanReceipt(mockImage, "image/jpeg", "Gasolina Terpel $35");

    expect(result.amount).toBe(35.00);
    expect(result.category).toBe("Transporte y Auto");
  });
});
