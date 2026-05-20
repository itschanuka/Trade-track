import type { Prisma } from "@prisma/client";
import type { PdfLineItem } from "./types";

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isLineItemObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function parsePdfLineItems(value: Prisma.JsonValue): PdfLineItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isLineItemObject).map((item) => {
    const description = typeof item.description === "string" ? item.description : "";
    const quantity = readNumber(item.quantity);
    const unitPrice = readNumber(item.unitPrice);
    const storedLineTotal = readNumber(item.lineTotal);
    const lineTotal = storedLineTotal > 0 ? storedLineTotal : roundMoney(quantity * unitPrice);

    return {
      description,
      quantity,
      unitPrice,
      lineTotal
    };
  });
}
