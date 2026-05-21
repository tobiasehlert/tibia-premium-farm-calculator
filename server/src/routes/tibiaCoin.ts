import { Router } from "express";
import { z } from "zod";
import prisma from "../prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();

/**
 * Extrai preço do JSON embutido do Next.js (__NEXT_DATA__)
 */
const extractPriceFromNextData = (data: any): number => {
  const candidates: number[] = [];

  const visit = (node: any) => {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }

    for (const key of Object.keys(node)) {
      try {
        const value = node[key];
        if (typeof value === "number") {
          if (value > 0 && value < 1e9 && /(price|sell|buy|unit|offer)/i.test(key)) {
            candidates.push(value);
          }
        } else if (typeof value === "string") {
          const normalized = value.replace(/[,.\s]+/g, "");
          const n = parseInt(normalized, 10);
          if (!isNaN(n) && n > 0 && n < 1e9 && /(price|sell|buy|unit|offer)/i.test(key)) {
            candidates.push(n);
          }
        } else if (typeof value === "object") {
          visit(value);
        }
      } catch (e) {
        // ignore
      }
    }
  };

  visit(data);
  return candidates.length > 0 ? candidates[0] : 0;
};

/**
 * GET /tibia-prices/:world - Scraper público do TibiaPrice
 * Retorna o preço da Tibia Coin para um mundo específico
 */
router.get("/prices/:world", async (req, res) => {
  const { world } = req.params;
  const now = new Date().toISOString();

  if (!world || !/^[a-z0-9\-]+$/i.test(world)) {
    return res.status(400).json({
      world,
      itemName: "Tibia Coin",
      unitPrice: 0,
      source: "tibiaprices.com",
      updatedAt: now,
      success: false,
      error: "Mundo inválido."
    });
  }

  try {
    const url = `https://tibiaprices.com/world/${encodeURIComponent(world.toLowerCase())}/item/tibia-coins/`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao acessar TibiaPrice`);
    }

    const html = await response.text();

    // 1) Tentar extrair __NEXT_DATA__ (Next.js) com dados JSON embutidos
    try {
      const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      if (nextDataMatch && nextDataMatch[1]) {
        const parsed = JSON.parse(nextDataMatch[1]);

        // Prefer explicit allWorlds[].tc_price when available
        try {
          const allWorlds = parsed?.props?.pageProps?.allWorlds;
          if (Array.isArray(allWorlds) && allWorlds.length > 0) {
            // procurar entrada que corresponda ao mundo solicitado
            const worldLower = world.toLowerCase();
            const candidate = allWorlds.find((w: any) => {
              if (!w || typeof w !== "object") return false;
              const keysToCheck = ["name", "world", "server", "server_name", "world_name", "worldId"];
              for (const k of keysToCheck) {
                const v = w[k];
                if (typeof v === "string" && v.toLowerCase() === worldLower) return true;
              }
              return false;
            });

            const entry = candidate || allWorlds[0];
            const tcPrice = entry?.tc_price ?? entry?.price ?? entry?.unit_price ?? 0;

            if (typeof tcPrice === "number" && tcPrice > 0) {
              return res.json({
                world,
                itemName: "Tibia Coin",
                unitPrice: tcPrice,
                source: "tibiaprices.com",
                updatedAt: now,
                success: true
              });
            }
          }
        } catch (e) {
          // ignore and fallback to generic extraction
        }

        const ndPrice = extractPriceFromNextData(parsed);
        if (ndPrice > 0) {
          return res.json({
            world,
            itemName: "Tibia Coin",
            unitPrice: ndPrice,
            source: "tibiaprices.com",
            updatedAt: now,
            success: true
          });
        }
      }
    } catch (e) {
      // ignore parsing errors and continue
    }

    throw new Error("Preço não encontrado na página do TibiaPrice");
  } catch (error) {
    return res.status(200).json({
      world,
      itemName: "Tibia Coin",
      unitPrice: 0,
      source: "tibiaprices.com",
      updatedAt: now,
      success: false,
      error: error instanceof Error ? error.message : "Erro ao fazer scraping do TibiaPrice"
    });
  }
});

const updateSchema = z.object({
  characterId: z.string().optional(),
  world: z.string().optional(),
  unitPrice: z.number().positive(),
  price250Tc: z.number().positive(),
  source: z.string().min(1)
});

router.get("/history", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const characterId = typeof req.query.characterId === "string" ? req.query.characterId : undefined;
  const world = typeof req.query.world === "string" ? req.query.world : undefined;

  const records = await prisma.tibiaCoinPriceHistory.findMany({
    where: {
      userId,
      characterId,
      world
    },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ records });
});

router.get("/latest", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const latest = await prisma.tibiaCoinPriceHistory.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ record: latest ?? null });
});

router.post("/update-price", requireAuth, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Dados inválidos.", errors: parsed.error.flatten() });
  }

  const userId = (req as AuthRequest).userId;
  const data = parsed.data;

  const record = await prisma.tibiaCoinPriceHistory.create({
    data: {
      userId,
      characterId: data.characterId,
      world: data.world,
      unitPrice: data.unitPrice,
      price250Tc: data.price250Tc,
      source: data.source
    }
  });

  return res.status(201).json({ record });
});

export default router;
