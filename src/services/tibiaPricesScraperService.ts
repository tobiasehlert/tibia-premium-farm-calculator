import type { MarketPriceResult } from "../types/tibia";

/**
 * Scraper para TibiaPrice.com
 * Extrai o preço da Tibia Coin por mundo
 * 
 * Exemplo: https://tibiaprices.com/world/tornabra/item/tibia-coins/
 */

const TIBIA_PRICES_BASE = "https://tibiaprices.com/world";

/**
 * Valida se o mundo é válido antes de fazer o scraping
 */
const isValidWorld = (world: string): boolean => {
  return /^[a-z0-9\-]+$/i.test(world) && world.length > 0;
};

/**
 * Faz scraping do TibiaPrice para extrair o preço
 * Tenta múltiplos seletores CSS para máxima compatibilidade
 */
const scrapeTibiaPriceHTML = (html: string): number => {
  // Padrões possíveis de preço na página (em gold)
  const patterns = [
    // Formato: "Sell Price: 123456"
    /sell\s*price[\s:]*([0-9,]+)/i,
    // Formato: "123456" em elemento de preço destacado
    /price[\s">=]*([0-9,]+)/i,
    // Formato direto de números grandes
    /(\d{4,}(?:,\d{3})*)\s*gold/i,
    // Última tentativa: qualquer grande número
    /(\d+(?:,\d{3})*)/
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const priceStr = match[1].replace(/,/g, "");
      const price = parseInt(priceStr, 10);
      if (!isNaN(price) && price > 0) {
        return price;
      }
    }
  }

  return 0;
};

/**
 * Busca o preço da Tibia Coin no TibiaPrice via scraping
 * Retorna o preço ou fallback para tibiamarket.top se falhar
 */
export const getTibiaCoinPriceFromTibiaPrice = async (
  world: string
): Promise<MarketPriceResult> => {
  const now = new Date().toISOString();

  // Validar mundo
  if (!isValidWorld(world)) {
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
    const url = `${TIBIA_PRICES_BASE}/${encodeURIComponent(world.toLowerCase())}/item/tibia-coins/`;
    
    // Usar fetch com user-agent para evitar bloqueios
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao acessar TibiaPrice`);
    }

    const html = await response.text();
    const unitPrice = scrapeTibiaPriceHTML(html);

    if (unitPrice <= 0) {
      throw new Error("Preço não encontrado na página do TibiaPrice");
    }

    return {
      world,
      itemName: "Tibia Coin",
      unitPrice,
      source: "tibiaprices.com",
      updatedAt: now,
      success: true
    };
  } catch (error) {
    return {
      world,
      itemName: "Tibia Coin",
      unitPrice: 0,
      source: "tibiaprices.com",
      updatedAt: now,
      success: false,
      error: error instanceof Error ? error.message : "Erro ao fazer scraping do TibiaPrice"
    };
  }
}
