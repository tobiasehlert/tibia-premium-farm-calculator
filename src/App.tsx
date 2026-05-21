import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
  History,
  Home,
  LineChart as LineChartIcon,
  Puzzle,
  Target,
  TrendingDown,
  UserRound
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import "./App.css";
import type {
  CharacterInfo,
  HuntSessionSummary,
  MarketPriceResult,
  PremiumInfo,
  PriceHistoryEntry
} from "./types/tibia";
import type {
  CharacterRecord,
  FarmGoalRecord,
  HuntSessionRecord,
  PremiumTimeRecord,
  TibiaCoinPriceRecord
} from "./types/backend";
import { getCharacterInfo } from "./services/characterService";
import { getTibiaCoinPrice } from "./services/marketPriceService";
import { dashboardApi } from "./services/dashboardApi";
import { charactersApi } from "./services/charactersApi";
import { huntsApi } from "./services/huntsApi";
import { premiumTimeApi } from "./services/premiumTimeApi";
import { tibiaCoinApi } from "./services/tibiaCoinApi";
import { farmGoalApi } from "./services/farmGoalApi";
import { parsePremiumText } from "./utils/parsePremiumText";
import { calculateTimeRemaining } from "./utils/parsePremiumText";
import { calculateFarmGoal } from "./utils/calculateFarmGoal";
import { formatGold } from "./utils/formatGold";
import { calculateHuntInsights } from "./utils/huntAnalytics";
import { parseHuntSessionJson } from "./utils/parseHuntSession";
import { CharacterCard } from "./components/CharacterCard";
import { HuntImportCard } from "./components/HuntImportCard";
import { HuntHistorySection } from "./components/HuntHistorySection";
import { PremiumTimeCard } from "./components/PremiumTimeCard";
import { TibiaCoinCard } from "./components/TibiaCoinCard";
import { FarmGoalCard } from "./components/FarmGoalCard";
import { SettingsForm } from "./components/SettingsForm";
import { AccountRequiredBanner } from "./components/AccountRequiredBanner";
import { AuthPage } from "./components/AuthPage";
import { UserMenu } from "./components/UserMenu";
import { ProfilePage } from "./components/ProfilePage";
import { CharacterManager } from "./components/CharacterManager";
import { CharacterSelector } from "./components/CharacterSelector";
import { HistoryCharts } from "./components/HistoryCharts";
import { Dashboard } from "./components/Dashboard";
import { useAuth } from "./contexts/AuthContext";
import coinIcon from "./assets/placeholders/tc-coin.gif";
import ornament from "./assets/placeholders/ornament.svg";
import crownIcon from "./assets/pacrowns/premiumtime_30d.png";

const STORAGE_KEY = "tibia-premium-calculator";
const COIN_TARGET = 250;

const parseNumber = (value: string) => {
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  const numberValue = Number(normalized);
  return Number.isNaN(numberValue) ? 0 : numberValue;
};

function App() {
  const [characterName, setCharacterName] = useState("");
  const [world, setWorld] = useState("");
  const [currentGoldInput, setCurrentGoldInput] = useState("");
  const [manualUnitPriceInput, setManualUnitPriceInput] = useState("");
  const [goldPerHourInput, setGoldPerHourInput] = useState("");
  const [premiumText, setPremiumText] = useState("");
  const [stage, setStage] = useState<"setup" | "calc">("setup");
  const [dashboardSection, setDashboardSection] = useState<
    "resumo" | "hunt" | "conta" | "analises" | "historico"
  >("resumo");

  const {
    user,
    token,
    isAuthenticated,
    isLoading: authBootstrapping,
    login,
    register,
    logout,
    updateProfile
  } = useAuth();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);
  const [premiumHistory, setPremiumHistory] = useState<PremiumTimeRecord[]>([]);
  const [coinHistory, setCoinHistory] = useState<TibiaCoinPriceRecord[]>([]);
  const [farmHistory, setFarmHistory] = useState<FarmGoalRecord[]>([]);
  const [storedPremiumRecord, setStoredPremiumRecord] = useState<PremiumTimeRecord | null>(null);

  const [character, setCharacter] = useState<CharacterInfo | null>(null);
  const [marketPrice, setMarketPrice] = useState<MarketPriceResult | null>(null);
  const [premiumInfo, setPremiumInfo] = useState<PremiumInfo>({ rawText: "" });
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [huntSession, setHuntSession] = useState<HuntSessionSummary | null>(null);
  const [huntHistory, setHuntHistory] = useState<HuntSessionRecord[]>([]);
  const [huntImportLoading, setHuntImportLoading] = useState(false);
  const [huntImportError, setHuntImportError] = useState<string | null>(null);

  const [characterLoading, setCharacterLoading] = useState(false);
  const [marketLoading, setMarketLoading] = useState(false);
  const [characterError, setCharacterError] = useState<string | null>(null);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [operationLabel, setOperationLabel] = useState<string | null>(null);

  useEffect(() => {
    if (authBootstrapping || isAuthenticated) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const data = JSON.parse(stored) as {
        characterName?: string;
        world?: string;
        currentGold?: number;
        manualUnitPrice?: number;
        currentGoldInput?: string;
        manualUnitPriceInput?: string;
        goldPerHourInput?: string;
        premiumText?: string;
        priceHistory?: PriceHistoryEntry[];
        huntSession?: HuntSessionSummary | null;
        huntHistory?: HuntSessionRecord[];
      };
      setCharacterName(data.characterName ?? "");
      setWorld(data.world ?? "");
      setCurrentGoldInput(
        data.currentGoldInput ?? (data.currentGold ? data.currentGold.toString() : "")
      );
      setManualUnitPriceInput(
        data.manualUnitPriceInput ?? (data.manualUnitPrice ? data.manualUnitPrice.toString() : "")
      );
      setGoldPerHourInput(data.goldPerHourInput ?? "");
      setPremiumText(data.premiumText ?? "");
      setPriceHistory(Array.isArray(data.priceHistory) ? data.priceHistory : []);
      setHuntSession(data.huntSession ?? null);
      setHuntHistory(Array.isArray(data.huntHistory) ? data.huntHistory : []);
    } catch {
      setCharacterName("");
    }
  }, [authBootstrapping, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated && dashboardSection === "conta") {
      setDashboardSection("resumo");
    }
  }, [isAuthenticated, dashboardSection]);

  const currentGold = useMemo(() => parseNumber(currentGoldInput), [currentGoldInput]);
  const manualUnitPrice = useMemo(
    () => parseNumber(manualUnitPriceInput),
    [manualUnitPriceInput]
  );
  const goldPerHour = useMemo(() => parseNumber(goldPerHourInput), [goldPerHourInput]);

  useEffect(() => {
    if (isAuthenticated) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        characterName,
        world,
        currentGold,
        manualUnitPrice,
        currentGoldInput,
        manualUnitPriceInput,
        goldPerHourInput,
        premiumText,
        priceHistory,
        huntSession,
        huntHistory
      })
    );
  }, [
    isAuthenticated,
    characterName,
    world,
    currentGold,
    manualUnitPrice,
    currentGoldInput,
    manualUnitPriceInput,
    goldPerHourInput,
    premiumText,
    priceHistory,
    huntSession,
    huntHistory
  ]);

  useEffect(() => {
    if (premiumText.trim().length > 0) {
      setPremiumInfo(parsePremiumText(premiumText));
      return;
    }

    if (storedPremiumRecord) {
      const createdAt = new Date(storedPremiumRecord.createdAt);
      const expiresAt = storedPremiumRecord.expiresAt
        ? new Date(storedPremiumRecord.expiresAt)
        : storedPremiumRecord.balanceDays
          ? new Date(createdAt.getTime() + storedPremiumRecord.balanceDays * 24 * 60 * 60 * 1000)
          : undefined;

      setPremiumInfo({
        rawText: storedPremiumRecord.originalText,
        expiresAt,
        balanceDays: storedPremiumRecord.balanceDays ?? undefined
      });
      return;
    }

    setPremiumInfo({ rawText: "" });
  }, [premiumText, storedPremiumRecord]);

  const hasPremiumInfo = Boolean(premiumInfo.expiresAt || premiumInfo.balanceDays);
  const canProceedSetup = Boolean(characterName.trim()) && Boolean(world.trim()) && hasPremiumInfo;

  // Refetch preço do mercado quando o mundo muda no estágio "calc"
  useEffect(() => {
    if (stage !== "calc" || !world.trim()) return;

    const refetchPrice = async () => {
      setMarketLoading(true);
      try {
        const data = await getTibiaCoinPrice(world);
        setMarketPrice(data);
        setMarketError(data.success ? null : data.error ?? "Preço indisponível.");
      } catch (error) {
        setMarketPrice(null);
        setMarketError(error instanceof Error ? error.message : "Erro ao buscar preço.");
      } finally {
        setMarketLoading(false);
      }
    };

    refetchPrice();
  }, [world, stage]);

  const effectiveUnitPrice = useMemo(() => {
    // Prefer market price when available; fall back to manual if not
    if (marketPrice?.success) return marketPrice.unitPrice;
    if (manualUnitPrice > 0) return manualUnitPrice;
    return 0;
  }, [manualUnitPrice, marketPrice]);

  // Mostrar campo de preço manual quando o usuário já inseriu um manual ou quando
  // o preço de mercado não está disponível
  const showManualPrice = Boolean(world.trim()) && (manualUnitPrice > 0 || (marketPrice ? !marketPrice.success : true));

  const targetGold = effectiveUnitPrice * COIN_TARGET;
  const farmGoal = useMemo(
    () =>
      calculateFarmGoal({
        currentGold,
        targetGold,
        expiresAt: premiumInfo.expiresAt,
        balanceDays: premiumInfo.balanceDays
      }),
    [currentGold, targetGold, premiumInfo]
  );

  const progressPercent = targetGold > 0
    ? Math.min(100, Math.round((currentGold / targetGold) * 100))
    : 0;
  const goldMissing = Math.max(0, targetGold - currentGold);
  const goldPerDay = farmGoal.goldPerDay;
  const premiumRemainingLabel = premiumInfo.expiresAt
    ? (() => {
        const remaining = calculateTimeRemaining(premiumInfo.expiresAt!);
        return `${remaining.days}d ${remaining.hours}h`;
      })()
    : premiumInfo.balanceDays
      ? `${premiumInfo.balanceDays} dias`
      : "—";
  const huntInsights = useMemo(
    () => calculateHuntInsights(huntHistory, goldMissing, farmGoal.daysRemaining),
    [huntHistory, goldMissing, farmGoal.daysRemaining]
  );
  const effectiveGoldPerHour = goldPerHour > 0 ? goldPerHour : huntInsights.averageProfitPerHour;
  const hoursPerDay = effectiveGoldPerHour > 0 ? goldPerDay / effectiveGoldPerHour : 0;
  const dashboardHighlights = [
    {
      label: "Saldo Atual",
      value: formatGold(currentGold),
      hint: progressPercent > 0 ? `${progressPercent}% da meta` : "Aguardando entrada"
    },
    {
      label: "Tibia Coins",
      value: `${COIN_TARGET} TC`,
      hint: effectiveUnitPrice > 0 ? formatGold(effectiveUnitPrice) : "Preço não definido"
    },
    {
      label: "Meta da Premium",
      value: targetGold > 0 ? formatGold(targetGold) : "—",
      hint: goldMissing > 0 ? `${formatGold(goldMissing)} faltando` : "Meta concluída"
    },
    {
      label: "Premium Time",
      value: premiumRemainingLabel,
      hint: premiumInfo.expiresAt ? "Tempo restante" : "Saldo em dias"
    },
    {
      label: "Farm Diário",
      value: formatGold(goldPerDay),
      hint: effectiveGoldPerHour > 0 ? `${formatGold(effectiveGoldPerHour)}/h` : "Sem taxa por hora"
    },
    {
      label: "Gold Necessário",
      value: formatGold(goldMissing),
      hint: hoursPerDay > 0 ? `${hoursPerDay.toFixed(1)} h/dia` : "Sem ritmo calculado"
    }
  ];

  const guestCoinHistory = useMemo(
    () =>
      priceHistory.map((entry, index) => ({
        id: `${entry.timestamp}-${index}`,
        userId: "guest",
        unitPrice: entry.unitPrice,
        price250Tc: entry.unitPrice * COIN_TARGET,
        source: entry.source,
        createdAt: entry.timestamp,
        world: entry.world
      } as TibiaCoinPriceRecord)),
    [priceHistory]
  );

  const coinHistoryForCharts = isAuthenticated ? coinHistory : guestCoinHistory;
  const farmHistoryForCharts = isAuthenticated ? farmHistory : [];
  const premiumHistoryForCharts = isAuthenticated ? premiumHistory : [];

  const formatTooltipValue = (
    value: number | string | readonly (number | string)[] | undefined
  ) => {
    if (Array.isArray(value)) {
      const first = value[0];
      return formatGold(typeof first === "number" ? first : Number(first ?? 0));
    }
    return formatGold(typeof value === "number" ? value : Number(value ?? 0));
  };

  const runWithOperation = useCallback(async (label: string, task: () => Promise<void>) => {
    setOperationLoading(true);
    setOperationLabel(label);
    try {
      await task();
    } finally {
      setOperationLoading(false);
      setOperationLabel(null);
    }
  }, []);

  const mapCharacterRecord = (record: CharacterRecord): CharacterInfo => ({
    name: record.name,
    sex: record.sex ?? undefined,
    vocation: record.vocation ?? undefined,
    level: record.level ?? undefined,
    achievementPoints: record.achievementPoints ?? undefined,
    world: record.world ?? undefined,
    residence: record.residence ?? undefined,
    guild: record.guild ?? undefined,
    lastLogin: record.lastLogin ?? undefined,
    created: record.createdAt,
    outfitUrl: undefined,
    skills: undefined
  });

  const loadDashboardSummary = useCallback(async () => {
    if (!token) return;
    try {
      const summary = await dashboardApi.summary(token);
      setCharacters(summary.characters);
      setActiveCharacterId(summary.activeCharacter?.id ?? null);
      setPremiumHistory(summary.history.premiumTime);
      setCoinHistory(summary.history.tibiaCoin);
      setFarmHistory(summary.history.farmGoal);
      setHuntHistory(summary.history.huntSession);
      setStoredPremiumRecord(summary.latest.premiumTime ?? null);

      const historyEntries = summary.history.tibiaCoin
        .slice()
        .reverse()
        .map((entry) => ({
          timestamp: entry.createdAt,
          world: entry.world ?? "Não informado",
          unitPrice: entry.unitPrice,
          source: (entry.source === "market" ? "market" : "manual") as "manual" | "market"
        }));
      setPriceHistory(historyEntries);

      if (summary.latest.premiumTime?.originalText && premiumText.trim().length === 0) {
        setPremiumText(summary.latest.premiumTime.originalText);
      }

      if (summary.latest.tibiaCoin) {
        setManualUnitPriceInput(summary.latest.tibiaCoin.unitPrice.toString());
        if (summary.latest.tibiaCoin.world) {
          setWorld(summary.latest.tibiaCoin.world);
        }
      }

      if (summary.latest.farmGoal) {
        setCurrentGoldInput(summary.latest.farmGoal.currentGold.toString());
        setGoldPerHourInput(summary.latest.farmGoal.goldPerHour.toString());
      }

      if (summary.latest.huntSession) {
        setHuntSession({
          fileName: summary.latest.huntSession.sourceFileName ?? "Hunt importada",
          balance: summary.latest.huntSession.balance,
          damage: summary.latest.huntSession.damage,
          damagePerHour: summary.latest.huntSession.damagePerHour,
          healing: summary.latest.huntSession.healing,
          healingPerHour: summary.latest.huntSession.healingPerHour,
          loot: summary.latest.huntSession.loot,
          supplies: summary.latest.huntSession.supplies,
          xpGain: summary.latest.huntSession.xpGain,
          xpPerHour: summary.latest.huntSession.xpPerHour,
          sessionLength: summary.latest.huntSession.sessionLength,
          sessionHours: 0,
          sessionStart: summary.latest.huntSession.sessionStart ?? undefined,
          sessionEnd: summary.latest.huntSession.sessionEnd ?? undefined,
          goldPerHour: summary.latest.huntSession.profitPerHour,
          totalMonstersKilled: summary.latest.huntSession.totalMonstersKilled,
          mostKilledMonster: summary.latest.huntSession.mostKilledMonster ?? undefined,
          totalLootedItems: summary.latest.huntSession.totalLootedItems,
          killedMonsters: summary.latest.huntSession.killedMonstersJson,
          lootedItems: summary.latest.huntSession.lootedItemsJson
        });
      }

      if (summary.activeCharacter) {
        setCharacterName(summary.activeCharacter.name);
        setWorld(summary.activeCharacter.world ?? "");
        setCharacter(mapCharacterRecord(summary.activeCharacter));
        setStage("calc");
        setDashboardSection("resumo");
      }
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    loadDashboardSummary();
  }, [isAuthenticated, token, loadDashboardSummary]);

  const openAuth = (mode: "login" | "register") => {
    setAuthMode(mode);
    setAuthError(null);
    setShowAuth(true);
  };

  const handleLogin = async (payload: { email: string; password: string }) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await login(payload.email, payload.password);
      setShowAuth(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Erro ao autenticar.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (payload: { name: string; email: string; password: string; confirmPassword: string }) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await register(payload);
      setShowAuth(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Erro ao criar conta.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setCharacters([]);
    setActiveCharacterId(null);
    setPremiumHistory([]);
    setCoinHistory([]);
    setFarmHistory([]);
    setHuntHistory([]);
    setHuntSession(null);
    setHuntImportError(null);
  };

  const handleHuntImport = useCallback(async (file: File | null) => {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".json")) {
      setHuntImportError("Selecione um arquivo .json válido.");
      setHuntSession(null);
      return;
    }

    setHuntImportLoading(true);
    setHuntImportError(null);

    try {
      const contents = await file.text();
      const session = parseHuntSessionJson(contents, file.name);
      setHuntSession(session);
    } catch (error) {
      setHuntSession(null);
      setHuntImportError(error instanceof Error ? error.message : "Não foi possível importar o JSON.");
    } finally {
      setHuntImportLoading(false);
    }
  }, []);

  const handleApplyHuntSession = useCallback(async () => {
    if (!huntSession) {
      return;
    }

    const createdAt = new Date().toISOString();
    const localRecord: HuntSessionRecord = {
      id: `${createdAt}-${huntSession.fileName}`,
      userId: "guest",
      characterId: activeCharacterId ?? null,
      sourceFileName: huntSession.fileName,
      sessionStart: huntSession.sessionStart ?? null,
      sessionEnd: huntSession.sessionEnd ?? null,
      sessionLength: huntSession.sessionLength,
      balance: huntSession.balance,
      loot: huntSession.loot,
      supplies: huntSession.supplies,
      xpGain: huntSession.xpGain,
      xpPerHour: huntSession.xpPerHour,
      profitPerHour: huntSession.goldPerHour,
      damage: huntSession.damage,
      damagePerHour: huntSession.damagePerHour,
      healing: huntSession.healing,
      healingPerHour: huntSession.healingPerHour,
      totalMonstersKilled: huntSession.totalMonstersKilled,
      mostKilledMonster: huntSession.mostKilledMonster ?? null,
      totalLootedItems: huntSession.totalLootedItems,
      killedMonstersJson: huntSession.killedMonsters,
      lootedItemsJson: huntSession.lootedItems,
      createdAt
    };

    await runWithOperation("Salvando hunt...", async () => {
      try {
        if (isAuthenticated && token) {
          const imported = await huntsApi.importSession(token, {
            characterId: activeCharacterId ?? null,
            sourceFileName: huntSession.fileName,
            sessionStart: huntSession.sessionStart ?? null,
            sessionEnd: huntSession.sessionEnd ?? null,
            sessionLength: huntSession.sessionLength,
            balance: huntSession.balance,
            loot: huntSession.loot,
            supplies: huntSession.supplies,
            xpGain: huntSession.xpGain,
            xpPerHour: huntSession.xpPerHour,
            damage: huntSession.damage,
            damagePerHour: huntSession.damagePerHour,
            healing: huntSession.healing,
            healingPerHour: huntSession.healingPerHour,
            totalMonstersKilled: huntSession.totalMonstersKilled,
            mostKilledMonster: huntSession.mostKilledMonster ?? null,
            totalLootedItems: huntSession.totalLootedItems,
            killedMonstersJson: huntSession.killedMonsters,
            lootedItemsJson: huntSession.lootedItems
          });

          setHuntHistory((prev) => [imported.record, ...prev].slice(0, 120));
          await loadDashboardSummary();
        } else {
          setHuntHistory((prev) => [localRecord, ...prev].slice(0, 120));
        }

        setCurrentGoldInput(Math.max(0, Math.round(huntSession.balance)).toString());
        setGoldPerHourInput(Math.max(0, Math.round(huntSession.goldPerHour)).toString());
      } catch (error) {
        setHuntImportError(error instanceof Error ? error.message : "Não foi possível salvar a hunt.");
      }
    });
  }, [huntSession, isAuthenticated, token, activeCharacterId, loadDashboardSummary, runWithOperation]);

  const handleClearHuntSession = () => {
    setHuntSession(null);
    setHuntImportError(null);
  };

  const persistUserData = useCallback(
    async ({
      unitPrice,
      source,
      resolvedWorld
    }: {
      unitPrice: number;
      source: "manual" | "market";
      resolvedWorld: string;
    }) => {
      if (!token) return;

      const activeId = activeCharacterId ?? undefined;
      const expiresAt = premiumInfo.expiresAt?.toISOString();
      const remaining = premiumInfo.expiresAt
        ? (() => {
          const time = calculateTimeRemaining(premiumInfo.expiresAt);
          return `${time.days}d ${time.hours}h ${time.minutes}m`;
        })()
        : premiumInfo.balanceDays
          ? `${premiumInfo.balanceDays} dias`
          : undefined;

      if (premiumText.trim().length > 3) {
        await premiumTimeApi.update(token, {
          characterId: activeId,
          originalText: premiumText,
          expiresAt,
          balanceDays: premiumInfo.balanceDays,
          remainingTimeText: remaining
        });
      }

      if (unitPrice > 0) {
        await tibiaCoinApi.updatePrice(token, {
          characterId: activeId,
          world: resolvedWorld || world,
          unitPrice,
          price250Tc: unitPrice * COIN_TARGET,
          source
        });
      }

      const targetGoldLatest = unitPrice * COIN_TARGET;
      const farmGoalLatest = calculateFarmGoal({
        currentGold,
        targetGold: targetGoldLatest,
        expiresAt: premiumInfo.expiresAt,
        balanceDays: premiumInfo.balanceDays
      });
      const status = farmGoalLatest.hasEnoughGold
        ? "concluida"
        : farmGoalLatest.daysRemaining <= 0
          ? "indisponivel"
          : "em_andamento";

      await farmGoalApi.update(token, {
        characterId: activeId,
        currentGold,
        targetTcAmount: COIN_TARGET,
        unitTcPrice: unitPrice,
        requiredGold: targetGoldLatest,
        missingGold: Math.max(0, targetGoldLatest - currentGold),
        remainingDays: farmGoalLatest.daysRemaining,
        goldPerDay: farmGoalLatest.goldPerDay,
        goldPerHour: effectiveGoldPerHour,
        hoursPerDay: effectiveGoldPerHour > 0 ? farmGoalLatest.goldPerDay / effectiveGoldPerHour : 0,
        status
      });

      await loadDashboardSummary();
    },
    [
      token,
      activeCharacterId,
      premiumText,
      premiumInfo,
      currentGold,
      effectiveGoldPerHour,
      world,
      loadDashboardSummary
    ]
  );

  const appendPriceHistory = (entry: PriceHistoryEntry) => {
    if (isAuthenticated) return;
    setPriceHistory((prev) => {
      const next = [...prev, entry];
      return next.length > 40 ? next.slice(next.length - 40) : next;
    });
  };

  const handleCreateCharacter = async (payload: { name: string; world?: string }) => {
    if (!token) return;
    await runWithOperation("Adicionando personagem...", async () => {
      await charactersApi.create(token, {
        name: payload.name,
        world: payload.world,
        isActive: characters.length === 0
      });
      await loadDashboardSummary();
    });
  };

  const handleUpdateCharacter = async (id: string, payload: Partial<CharacterRecord>) => {
    if (!token) return;
    await runWithOperation("Atualizando personagem...", async () => {
      await charactersApi.update(token, id, payload);
      await loadDashboardSummary();
    });
  };

  const handleRemoveCharacter = async (id: string) => {
    if (!token) return;
    await runWithOperation("Removendo personagem...", async () => {
      await charactersApi.remove(token, id);
      await loadDashboardSummary();
    });
  };

  const handleSetActiveCharacter = async (id: string) => {
    if (!token) return;
    await runWithOperation("Trocando personagem ativo...", async () => {
      await charactersApi.setActive(token, id);
      await loadDashboardSummary();
    });
  };

  const syncCharacterFromApi = useCallback(
    async (data: CharacterInfo) => {
      if (!token) return;
      const existing = characters.find(
        (character) => character.name.toLowerCase() === data.name.toLowerCase()
      );
      const parsedLastLogin = data.lastLogin ? new Date(data.lastLogin) : null;
      const lastLogin = parsedLastLogin && !Number.isNaN(parsedLastLogin.getTime())
        ? parsedLastLogin.toISOString()
        : undefined;
      const payload = {
        name: data.name,
        world: data.world,
        vocation: data.vocation,
        level: data.level,
        sex: data.sex,
        achievementPoints: data.achievementPoints,
        residence: data.residence,
        guild: data.guild,
        lastLogin,
        isActive: existing?.isActive ?? characters.length === 0
      };

      if (existing) {
        await charactersApi.update(token, existing.id, payload);
      } else {
        await charactersApi.create(token, payload);
      }

      await loadDashboardSummary();
    },
    [token, characters, loadDashboardSummary]
  );

  const handleProfileSave = async (payload: { name?: string; email?: string }) => {
    await updateProfile(payload);
  };

  const refreshData = async () => {
    await runWithOperation("Atualizando dados...", async () => {
      setCharacterError(null);
      setMarketError(null);

      let resolvedWorld = world.trim();
      let latestMarket: MarketPriceResult | null = null;

      if (characterName.trim()) {
        setCharacterLoading(true);
        try {
          const data = await getCharacterInfo(characterName);
          setCharacter(data);
          if (isAuthenticated) {
            await syncCharacterFromApi(data);
          }
          if (!world.trim() && data.world) {
            resolvedWorld = data.world;
            setWorld(data.world);
          }
        } catch (error) {
          setCharacter(null);
          setCharacterError(error instanceof Error ? error.message : "Erro ao buscar personagem.");
        } finally {
          setCharacterLoading(false);
        }
      }

      if (resolvedWorld) {
        setMarketLoading(true);
        try {
          const data = await getTibiaCoinPrice(resolvedWorld);
          setMarketPrice(data);
          latestMarket = data;
          setMarketError(data.success ? null : data.error ?? "Preço indisponível.");
        } catch (error) {
          setMarketPrice(null);
          setMarketError(error instanceof Error ? error.message : "Erro ao buscar preço.");
        } finally {
          setMarketLoading(false);
        }
      }

      const source = latestMarket?.success ? "market" : manualUnitPrice > 0 ? "manual" : null;
      const unitPrice = latestMarket?.success ? latestMarket.unitPrice ?? 0 : manualUnitPrice > 0 ? manualUnitPrice : 0;

      if (source && unitPrice > 0) {
        appendPriceHistory({
          timestamp: new Date().toISOString(),
          world: resolvedWorld || "Não informado",
          unitPrice,
          source
        });
      }

      if (isAuthenticated) {
        await persistUserData({
          unitPrice,
          source: source ?? "manual",
          resolvedWorld
        });
      }
    });
  };

  const proceedToCalculator = async () => {
    if (!canProceedSetup) return;
    setStage("calc");

    await runWithOperation("Abrindo calculadora...", async () => {
      setCharacterError(null);
      setMarketError(null);

      let resolvedWorld = world.trim();
      let latestMarket: MarketPriceResult | null = null;

      if (characterName.trim()) {
        setCharacterLoading(true);
        try {
          const data = await getCharacterInfo(characterName);
          setCharacter(data);
          if (isAuthenticated) {
            await syncCharacterFromApi(data);
          }
          if (!resolvedWorld && data.world) {
            resolvedWorld = data.world;
            setWorld(data.world);
          }
        } catch (error) {
          setCharacter(null);
          setCharacterError(error instanceof Error ? error.message : "Erro ao buscar personagem.");
        } finally {
          setCharacterLoading(false);
        }
      }

      if (resolvedWorld) {
        setMarketLoading(true);
        try {
          const data = await getTibiaCoinPrice(resolvedWorld);
          setMarketPrice(data);
          latestMarket = data;
          setMarketError(data.success ? null : data.error ?? "Preço indisponível.");
        } catch (error) {
          setMarketPrice(null);
          setMarketError(error instanceof Error ? error.message : "Erro ao buscar preço.");
        } finally {
          setMarketLoading(false);
        }
      }

      const source = latestMarket?.success ? "market" : manualUnitPrice > 0 ? "manual" : null;
      const unitPrice = latestMarket?.success ? latestMarket.unitPrice ?? 0 : manualUnitPrice > 0 ? manualUnitPrice : 0;

      if (source && unitPrice > 0) {
        appendPriceHistory({
          timestamp: new Date().toISOString(),
          world: resolvedWorld || "Não informado",
          unitPrice,
          source
        });
      }

      if (isAuthenticated) {
        await persistUserData({
          unitPrice,
          source: source ?? "manual",
          resolvedWorld
        });
      }
    });
  };

  const isProcessing = authLoading || characterLoading || marketLoading || huntImportLoading || operationLoading;
  const processingLabel =
    operationLabel ?? (huntImportLoading ? "Processando hunt..." : characterLoading || marketLoading ? "Buscando dados..." : null);

  return (
    <div className={`app-shell ${isProcessing ? "is-processing" : ""}`}>
      <header className="app-header">
        <div className="container">
          <div className="header-row">
            <div className="header-copy">
              <span className="badge header-badge">Market + Premium Planner</span>
              <div className="header-title-row">
                <img className="header-title-icon" src={crownIcon} alt="Coroa" />
                <h1 className="header-title">Tibia Premium Calculator</h1>
              </div>
              <p className="header-subtitle">
                Dashboard para planejar Premium Time, Tibia Coins e metas de farm.
              </p>
              <span className={`badge ${isAuthenticated ? "badge-success" : "badge-warning"}`}>
                {isAuthenticated ? "Conta conectada" : "Modo visitante"}
              </span>
            </div>
            <div className="header-actions">
              {!authBootstrapping && !isAuthenticated && (
                <div className="header-buttons">
                  <button type="button" className="ghost-button" onClick={() => openAuth("login")}>
                    Entrar
                  </button>
                  <button type="button" className="primary-button" onClick={() => openAuth("register")}>
                    Criar conta
                  </button>
                </div>
              )}
              {isAuthenticated && user && (
                <UserMenu
                  user={user}
                  open={userMenuOpen}
                  onToggle={() => setUserMenuOpen((prev) => !prev)}
                  onProfile={() => {
                    setShowProfile(true);
                    setUserMenuOpen(false);
                  }}
                  onLogout={handleLogout}
                />
              )}
              <div className="header-icons">
                <img src={coinIcon} alt="Placeholder coin" />
              </div>
            </div>
          </div>
          <div className="header-glow" />
          <img className="header-ornament" src={ornament} alt="Ornamento" />
        </div>
      </header>

      <main className="container dashboard" aria-busy={isProcessing}>
        {!authBootstrapping && !isAuthenticated && (
          <AccountRequiredBanner onLogin={() => openAuth("login")} onRegister={() => openAuth("register")} />
        )}

        <section className="dashboard-overview" aria-label="Resumo geral da calculadora">
          <div className="card dashboard-hero card-featured">
            <div className="dashboard-hero-copy">
              <span className="badge header-badge">Tibia Premium Farm Dashboard</span>
              <h2 className="dashboard-hero-title">Premium Account Calculator</h2>
              <p className="dashboard-hero-subtitle">
                Painel escuro e organizado para acompanhar saldo, Premium Time, Tibia Coins e a meta da próxima premium.
              </p>
            </div>

            <div className="dashboard-hero-panel">
              <div className="dashboard-hero-panel__row">
                <span className="stat-label">Progresso da Jornada</span>
                <strong className="dashboard-hero-value">{progressPercent}%</strong>
              </div>
              <div className="progress-bar dashboard-progress-bar" aria-hidden="true">
                <div className="progress-bar__fill progress-primary" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="dashboard-hero-panel__meta">
                <span>{goldMissing > 0 ? `${formatGold(goldMissing)} faltando` : "Meta concluída"}</span>
                <span>{premiumRemainingLabel}</span>
              </div>
            </div>
          </div>

          <div className="dashboard-kpi-grid">
            {dashboardHighlights.map((item) => (
              <article key={item.label} className="card dashboard-kpi-card">
                <span className="stat-label">{item.label}</span>
                <strong className="dashboard-kpi-value">{item.value}</strong>
                <span className="dashboard-kpi-hint">{item.hint}</span>
              </article>
            ))}
          </div>
        </section>

        {stage === "setup" ? (
          <div className="setup-view">
            <div className="setup-stack">
              <SettingsForm
                mode="setup"
                canProceed={canProceedSetup}
                showManualPrice={showManualPrice}
                characterName={characterName}
                world={world}
                currentGold={currentGoldInput}
                manualUnitPrice={manualUnitPriceInput}
                goldPerHour={goldPerHourInput}
                premiumText={premiumText}
                onCharacterNameChange={setCharacterName}
                onWorldChange={setWorld}
                onGoldChange={setCurrentGoldInput}
                onManualPriceChange={setManualUnitPriceInput}
                onGoldPerHourChange={setGoldPerHourInput}
                onPremiumTextChange={setPremiumText}
                onRefresh={refreshData}
                onProceed={proceedToCalculator}
                characterLoading={characterLoading}
                marketLoading={marketLoading}
              />

              <HuntImportCard
                session={huntSession}
                loading={huntImportLoading}
                error={huntImportError}
                onFileSelect={handleHuntImport}
                onApply={handleApplyHuntSession}
                onClear={handleClearHuntSession}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="dashboard-tabs">
              <button
                type="button"
                className={`tab-button ${dashboardSection === "resumo" ? "is-active" : ""}`}
                onClick={() => setDashboardSection("resumo")}
              >
                <Home className="tab-icon" aria-hidden="true" />
                Resumo
              </button>
              <button
                type="button"
                className={`tab-button ${dashboardSection === "analises" ? "is-active" : ""}`}
                onClick={() => setDashboardSection("analises")}
              >
                <BarChart3 className="tab-icon" aria-hidden="true" />
                Análises
              </button>
              <button
                type="button"
                className={`tab-button ${dashboardSection === "hunt" ? "is-active" : ""}`}
                onClick={() => setDashboardSection("hunt")}
              >
                <Target className="tab-icon" aria-hidden="true" />
                Hunt
              </button>
              <button
                type="button"
                className={`tab-button ${dashboardSection === "historico" ? "is-active" : ""}`}
                onClick={() => setDashboardSection("historico")}
              >
                <History className="tab-icon" aria-hidden="true" />
                Histórico
              </button>
              <button
                type="button"
                className={`tab-button ${dashboardSection === "conta" ? "is-active" : ""}`}
                onClick={() => setDashboardSection("conta")}
                disabled={!isAuthenticated}
              >
                <UserRound className="tab-icon" aria-hidden="true" />
                Conta
              </button>
            </div>

            {dashboardSection === "resumo" && (
              <Dashboard>
                <div className="grid-item grid-premium">
                  <PremiumTimeCard premiumInfo={premiumInfo} className="card-featured premium-card" />
                </div>
                <div className="grid-item grid-farm">
                  <FarmGoalCard
                    goal={farmGoal}
                    unitPrice={effectiveUnitPrice}
                    targetGold={targetGold}
                    formattedTarget={formatGold(targetGold)}
                    className="card-featured farm-card"
                  />
                </div>
                <div className="grid-item grid-market">
                  <TibiaCoinCard
                    world={world}
                    marketPrice={marketPrice}
                    manualPrice={manualUnitPrice}
                    effectivePrice={effectiveUnitPrice}
                    loading={marketLoading}
                    error={marketError}
                  />
                </div>
                <div className="grid-item grid-settings">
                  <SettingsForm
                    mode="calc"
                    canProceed={canProceedSetup}
                    showManualPrice={showManualPrice}
                    characterName={characterName}
                    world={world}
                    currentGold={currentGoldInput}
                    manualUnitPrice={manualUnitPriceInput}
                    goldPerHour={goldPerHourInput}
                    premiumText={premiumText}
                    onCharacterNameChange={setCharacterName}
                    onWorldChange={setWorld}
                    onGoldChange={setCurrentGoldInput}
                    onManualPriceChange={setManualUnitPriceInput}
                    onGoldPerHourChange={setGoldPerHourInput}
                    onPremiumTextChange={setPremiumText}
                    onRefresh={refreshData}
                    onProceed={proceedToCalculator}
                    characterLoading={characterLoading}
                    marketLoading={marketLoading}
                  />
                </div>
                <div className="grid-item grid-character">
                  <CharacterCard
                    character={character}
                    loading={characterLoading}
                    error={characterError}
                  />
                </div>
              </Dashboard>
            )}

            {dashboardSection === "hunt" && (
              <>
                <section className="analytics-section">
                  <div className="section-header">
                    <div>
                      <span className="badge header-badge">Hunt</span>
                      <h2 className="section-title">Importar arquivo JSON</h2>
                      <p className="section-subtitle">
                        Carregue a sessão de hunt e aplique os dados na calculadora.
                      </p>
                    </div>
                  </div>

                  <HuntImportCard
                    session={huntSession}
                    loading={huntImportLoading}
                    error={huntImportError}
                    onFileSelect={handleHuntImport}
                    onApply={handleApplyHuntSession}
                    onClear={handleClearHuntSession}
                  />
                </section>

                <HuntHistorySection
                  records={huntHistory}
                  currentGold={currentGold}
                  goldMissing={goldMissing}
                  daysRemaining={farmGoal.daysRemaining}
                />
              </>
            )}

            {dashboardSection === "conta" && isAuthenticated && (
              <section className="analytics-section">
                <div className="section-header">
                  <div>
                    <span className="badge header-badge">Conta</span>
                    <h2 className="section-title">Personagens e Perfil</h2>
                    <p className="section-subtitle">Gerencie seus personagens e escolha o ativo.</p>
                  </div>
                </div>
                {characters.length > 0 && (
                  <CharacterSelector
                    characters={characters}
                    activeId={activeCharacterId}
                    onSelect={handleSetActiveCharacter}
                  />
                )}
                <CharacterManager
                  characters={characters}
                  onCreate={handleCreateCharacter}
                  onUpdate={handleUpdateCharacter}
                  onRemove={handleRemoveCharacter}
                  onSetActive={handleSetActiveCharacter}
                />
              </section>
            )}

            {dashboardSection === "analises" && (
              <section className="analytics-section">
                <div className="section-header">
                  <div>
                    <span className="badge header-badge">Análises</span>
                    <h2 className="section-title">Gráficos da Meta</h2>
                    <p className="section-subtitle">Insights visuais para acompanhar sua evolução.</p>
                  </div>
                </div>

                <div className="analytics-grid">
                  <section className="card analytics-card analytics-progress">
                    <div className="card-header">
                      <div className="card-title-row">
                        <span className="card-icon">
                          <LineChartIcon className="card-icon__svg" aria-hidden="true" />
                        </span>
                        <h3 className="card-title">Progresso da Meta</h3>
                      </div>
                      <span className={farmGoal.hasEnoughGold ? "badge badge-success" : "badge badge-info"}>
                        {farmGoal.hasEnoughGold ? "OK" : "Em progresso"}
                      </span>
                    </div>

                    <div className="card-content">
                      {targetGold > 0 ? (
                        <div className="chart-wrapper">
                          <ResponsiveContainer width="100%" height={220}>
                            <RadialBarChart
                              cx="50%"
                              cy="50%"
                              innerRadius="70%"
                              outerRadius="100%"
                              startAngle={90}
                              endAngle={-270}
                              data={[{ name: "Progresso", value: progressPercent }]}
                            >
                              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                              <RadialBar
                                dataKey="value"
                                cornerRadius={999}
                                fill={farmGoal.hasEnoughGold ? "var(--success)" : "var(--primary)"}
                                background={{ fill: "rgba(61, 42, 77, 0.45)" }}
                              />
                            </RadialBarChart>
                          </ResponsiveContainer>
                          <div className="chart-center">
                            <div className="chart-value">{progressPercent}%</div>
                            <div className="chart-label">Gold alcançado</div>
                          </div>
                        </div>
                      ) : (
                        <div className="empty-state">
                          <span className="empty-state-icon">
                            <AlertTriangle className="empty-state-icon__svg" aria-hidden="true" />
                          </span>
                          <div>
                            <p className="empty-state-title">Sem meta definida</p>
                            <p className="empty-state-text">Informe um preço para calcular a meta total.</p>
                          </div>
                        </div>
                      )}

                      <div className="stat-grid">
                        <div className="stat-card">
                          <span className="stat-label">Gold atual</span>
                          <span className="stat-value">{formatGold(currentGold)}</span>
                        </div>
                        <div className="stat-card">
                          <span className="stat-label">Gold necessário</span>
                          <span className="stat-value">{targetGold > 0 ? formatGold(targetGold) : "—"}</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="card analytics-card analytics-donut">
                    <div className="card-header">
                      <div className="card-title-row">
                        <span className="card-icon">
                          <Coins className="card-icon__svg" aria-hidden="true" />
                        </span>
                        <h3 className="card-title">Prazo estimado</h3>
                      </div>
                    </div>

                    <div className="card-content">
                      {targetGold > 0 ? (
                        <>
                          <div className="daily-highlight">
                            <span className="stat-label">Tempo restante estimado</span>
                            <span className="big-number">
                              {farmGoal.daysRemaining > 0 ? `${farmGoal.daysRemaining} dias` : "Sem prazo"}
                            </span>
                            <span className="muted">
                              {farmGoal.hoursRemaining > 0
                                ? `${farmGoal.hoursRemaining.toFixed(1)} horas restantes`
                                : "Sem contagem ativa"}
                            </span>
                          </div>

                          <div className="stat-grid">
                            <div className="stat-card">
                              <span className="stat-label">Gold por dia</span>
                              <span className="stat-value">{formatGold(goldPerDay)}</span>
                            </div>
                            <div className="stat-card">
                              <span className="stat-label">Gold por hora</span>
                              <span className="stat-value">{formatGold(farmGoal.goldPerHour)}</span>
                            </div>
                            <div className="stat-card">
                              <span className="stat-label">Horas por dia</span>
                              <span className="stat-value">
                                {hoursPerDay > 0 ? `${hoursPerDay.toFixed(1)} h` : "—"}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="empty-state">
                          <span className="empty-state-icon">
                            <AlertTriangle className="empty-state-icon__svg" aria-hidden="true" />
                          </span>
                          <div>
                            <p className="empty-state-title">Sem meta definida</p>
                            <p className="empty-state-text">Informe um preço para estimar o prazo e o ritmo diário.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="card analytics-card analytics-daily">
                    <div className="card-header">
                      <div className="card-title-row">
                        <span className="card-icon">
                          <Clock className="card-icon__svg" aria-hidden="true" />
                        </span>
                        <h3 className="card-title">Gold por Dia</h3>
                      </div>
                    </div>

                    <div className="card-content">
                      {targetGold > 0 ? (
                        <>
                          <div className="daily-highlight">
                            <span className="stat-label">Meta diária</span>
                            <span className="big-number">
                              {goldMissing <= 0 ? "Meta concluída" : formatGold(goldPerDay)}
                            </span>
                            <span className="muted">
                              {farmGoal.daysRemaining > 0
                                ? `${farmGoal.daysRemaining} dias restantes`
                                : "Sem prazo restante"}
                            </span>
                          </div>
                          <div className="chart-wrapper chart-wrapper--bar">
                            <ResponsiveContainer width="100%" height={210}>
                              <BarChart
                                data={[
                                  { name: "Gold atual", value: currentGold },
                                  { name: "Gold faltante", value: goldMissing },
                                  { name: "Meta diária", value: goldPerDay }
                                ]}
                                layout="vertical"
                                margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                              >
                                <CartesianGrid stroke="var(--border)" opacity={0.35} horizontal={false} />
                                <XAxis type="number" tick={{ fill: "var(--text-muted)" }} />
                                <YAxis type="category" dataKey="name" tick={{ fill: "var(--text-muted)" }} width={90} />
                                <Tooltip
                                  formatter={formatTooltipValue}
                                  contentStyle={{
                                    background: "var(--bg-card)",
                                    borderRadius: "14px",
                                    border: "1px solid var(--border)",
                                    color: "var(--text-main)"
                                  }}
                                />
                                <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                                  <Cell fill="var(--success)" />
                                  <Cell fill="var(--danger)" />
                                  <Cell fill="var(--primary)" />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </>
                      ) : (
                        <div className="empty-state">
                          <span className="empty-state-icon">
                            <AlertTriangle className="empty-state-icon__svg" aria-hidden="true" />
                          </span>
                          <div>
                            <p className="empty-state-title">Meta diária indisponível</p>
                            <p className="empty-state-text">Defina o preço da Tibia Coin primeiro.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="card analytics-card analytics-history">
                    <div className="card-header">
                      <div className="card-title-row">
                        <span className="card-icon">
                          <FileText className="card-icon__svg" aria-hidden="true" />
                        </span>
                        <h3 className="card-title">Histórico Tibia Coin</h3>
                      </div>
                    </div>

                    <div className="card-content">
                      {priceHistory.length >= 2 ? (
                        <div className="chart-wrapper chart-wrapper--line">
                          <ResponsiveContainer width="100%" height={230}>
                            <LineChart data={priceHistory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                              <CartesianGrid stroke="var(--border)" opacity={0.35} />
                              <XAxis
                                dataKey="timestamp"
                                tick={{ fill: "var(--text-muted)" }}
                                tickFormatter={(value) =>
                                  new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                                }
                              />
                              <YAxis tick={{ fill: "var(--text-muted)" }} />
                              <Tooltip
                                formatter={formatTooltipValue}
                                labelFormatter={(value) =>
                                  new Date(value).toLocaleString("pt-BR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })
                                }
                                contentStyle={{
                                  background: "var(--bg-card)",
                                  borderRadius: "14px",
                                  border: "1px solid var(--border)",
                                  color: "var(--text-main)"
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="unitPrice"
                                stroke="var(--primary)"
                                strokeWidth={3}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="empty-state">
                          <span className="empty-state-icon">
                            <TrendingDown className="empty-state-icon__svg" aria-hidden="true" />
                          </span>
                          <div>
                            <p className="empty-state-title">Histórico insuficiente</p>
                            <p className="empty-state-text">
                              Atualize o preço algumas vezes para gerar o gráfico.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="stat-grid">
                        <div className="stat-card">
                          <span className="stat-label">Último preço</span>
                          <span className="stat-value">
                            {priceHistory.length > 0
                              ? formatGold(priceHistory[priceHistory.length - 1].unitPrice)
                              : "—"}
                          </span>
                        </div>
                        <div className="stat-card">
                          <span className="stat-label">Origem</span>
                          <span className="stat-value">
                            {priceHistory.length > 0
                              ? priceHistory[priceHistory.length - 1].source === "manual"
                                ? "Manual"
                                : "Market"
                              : "—"}
                          </span>
                        </div>
                        <div className="stat-card">
                          <span className="stat-label">Mundo</span>
                          <span className="stat-value">
                            {priceHistory.length > 0 ? priceHistory[priceHistory.length - 1].world : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="card analytics-card analytics-simulator">
                    <div className="card-header">
                      <div className="card-title-row">
                        <span className="card-icon">
                          <Clock className="card-icon__svg" aria-hidden="true" />
                        </span>
                        <h3 className="card-title">Simulador de Farm</h3>
                      </div>
                    </div>

                    <div className="card-content">
                      {effectiveGoldPerHour > 0 && targetGold > 0 ? (
                        <div className="simulator-content">
                          <div className="stat-grid">
                            <div className="stat-card">
                              <span className="stat-label">Gold por hora</span>
                              <span className="stat-value">{formatGold(effectiveGoldPerHour)}</span>
                            </div>
                            <div className="stat-card">
                              <span className="stat-label">Gold diário</span>
                              <span className="stat-value">{goldMissing <= 0 ? "0" : formatGold(goldPerDay)}</span>
                            </div>
                            <div className="stat-card">
                              <span className="stat-label">Horas/dia</span>
                              <span className="stat-value">
                                {goldMissing <= 0 ? "0" : hoursPerDay.toFixed(1)}
                              </span>
                            </div>
                          </div>
                          {goldMissing <= 0 && (
                            <div className="empty-state empty-state-success">
                              <span className="empty-state-icon">
                                <CheckCircle2 className="empty-state-icon__svg" aria-hidden="true" />
                              </span>
                              <div>
                                <p className="empty-state-title">Meta concluída</p>
                                <p className="empty-state-text">Você já atingiu o gold necessário.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="empty-state">
                          <span className="empty-state-icon">
                            <Puzzle className="empty-state-icon__svg" aria-hidden="true" />
                          </span>
                          <div>
                            <p className="empty-state-title">Informe o gold por hora</p>
                            <p className="empty-state-text">Preencha o campo opcional para estimar horas diárias.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </section>
            )}

            {dashboardSection === "historico" && (
              <HistoryCharts
                coinHistory={coinHistoryForCharts}
                farmHistory={farmHistoryForCharts}
                premiumHistory={premiumHistoryForCharts}
              />
            )}
          </>
        )}
      </main>

      {isProcessing && (
        <div className="processing-overlay" role="status" aria-live="polite">
          <div className="processing-overlay__panel">
            <span className="processing-spinner" aria-hidden="true" />
            <p className="processing-overlay__title">{processingLabel ?? "Processando..."}</p>
            <p className="processing-overlay__text">Aguarde só um instante.</p>
          </div>
        </div>
      )}

      {showAuth && (
        <AuthPage
          mode={authMode}
          onClose={() => setShowAuth(false)}
          onSwitch={setAuthMode}
          onLogin={handleLogin}
          onRegister={handleRegister}
          loading={authLoading}
          error={authError}
        />
      )}

      {showProfile && user && (
        <ProfilePage
          user={user}
          charactersCount={characters.length}
          onClose={() => setShowProfile(false)}
          onSave={handleProfileSave}
        />
      )}
    </div>
  );
}

export default App;
