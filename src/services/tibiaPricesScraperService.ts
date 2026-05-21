import type { MarketPriceResult } from "../types/tibia";

/**
 * Busca o preço da Tibia Coin via endpoint do backend
 * O backend faz o scraping do TibiaPrice contornando CORS
 */
export const getTibiaCoinPriceFromTibiaPrice = async (
  world: string
): Promise<MarketPriceResult> => {
  const now = new Date().toISOString();

  // Validar mundo
  if (!world || !/^[a-z0-9\-]+$/i.test(world)) {
    return {
      world,
      itemName: "Tibia Coin",
      unitPrice: 0,
      source: "tibiaprices.com",
      updatedAt: now,
      success: false,
      error: "Mundo inválido."
    };
  }

  try {
    // Chamar endpoint do backend que faz o scraping
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const response = await fetch(
      `${apiUrl}/tibia-coin/prices/${encodeURIComponent(world)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao buscar preço`);
    }

    const data = (await response.json()) as MarketPriceResult;
    return data;
  } catch (error) {
    return {
      world,
      itemName: "Tibia Coin",
      unitPrice: 0,
      source: "tibiaprices.com",
      updatedAt: now,
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar preço do TibiaPrice"
    };
  }
};

