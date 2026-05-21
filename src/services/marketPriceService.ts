import type { MarketPriceResult } from "../types/tibia";
import { getTibiaCoinPriceFromTibiaPrice } from "./tibiaPricesScraperService";

interface ItemMetadata {
  id: number;
  name?: string | null;
  wiki_name?: string | null;
}

interface MarketValue {
  id: number;
  time: number;
  sell_offer?: number;
  buy_offer?: number;
  day_average_sell?: number;
  month_average_sell?: number;
}

const API_BASE = "https://api.tibiamarket.top";
let cachedTibiaCoinId: number | null = null;

const resolveTibiaCoinId = async (): Promise<number> => {
  if (cachedTibiaCoinId) return cachedTibiaCoinId;

  const response = await fetch(`${API_BASE}/item_metadata`);
  if (!response.ok) {
    throw new Error("Falha ao consultar metadata da Tibia Coin.");
  }

  const data = (await response.json()) as ItemMetadata[];
  const match = data.find(
    (item) =>
      item.name?.toLowerCase() === "tibia coin" ||
      item.wiki_name?.toLowerCase() === "tibia coin"
  );

  if (!match) {
    throw new Error("ID da Tibia Coin não encontrado.");
  }

  cachedTibiaCoinId = match.id;
  return match.id;
};

const pickBestPrice = (value: MarketValue): number => {
  const candidates = [
    value.sell_offer,
    value.day_average_sell,
    value.month_average_sell,
    value.buy_offer
  ].filter((price): price is number => typeof price === "number" && price > 0);

  return candidates.length > 0 ? candidates[0] : 0;
};

export const getTibiaCoinPrice = async (world: string): Promise<MarketPriceResult> => {
  const now = new Date().toISOString();

  try {
    // Tentar TibiaPrice primeiro (scraping)
    const tibiaPriceResult = await getTibiaCoinPriceFromTibiaPrice(world);
    if (tibiaPriceResult.success) {
      return tibiaPriceResult;
    }

    // Fallback: usar tibiamarket.top API
    const itemId = await resolveTibiaCoinId();
    const response = await fetch(
      `${API_BASE}/market_values?server=${encodeURIComponent(world)}&item_ids=${itemId}&limit=1`
    );

    if (!response.ok) {
      throw new Error("Falha ao buscar preço no market.");
    }

    const data = (await response.json()) as MarketValue[];
    const value = data?.[0];
    const unitPrice = value ? pickBestPrice(value) : 0;

    return {
      world,
      itemName: "Tibia Coin",
      unitPrice,
      source: "tibiamarket.top",
      updatedAt: value?.time ? new Date(value.time * 1000).toISOString() : now,
      success: unitPrice > 0,
      error: unitPrice > 0 ? undefined : "Preço indisponível na API."
    };
  } catch (error) {
    return {
      world,
      itemName: "Tibia Coin",
      unitPrice: 0,
      source: "tibiamarket.top",
      updatedAt: now,
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido ao buscar preço."
    };
  }
};
