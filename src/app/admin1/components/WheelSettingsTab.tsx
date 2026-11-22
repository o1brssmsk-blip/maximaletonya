"use client";

import { useState, useEffect } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

// Cark plani (9 dilim, index = rotationIndex, 0 = ustte pointer, saat yonunde):
// 0 GRIEZ, 1 iPhone, 2 2000€, 3 MOTOCIKLS, 4 AUTO, 5 1500€, 6 1000€, 7 500€, 8 2500€
// Sadece NAKIT dilimler (2,5,6,7,8) kazanilir; digerleri kalici 0% dekor.
const CASH_SLOT_POSITIONS = [2, 5, 6, 7, 8];
const SEGMENT_NAMES = [
  "GRIEZ (tekrar dene)",
  "iPhone 18 Pro Max",
  "2 000 €",
  "MOTOCIKLS",
  "AUTO UZ 1 GADU",
  "1 500 €",
  "1 000 €",
  "500 €",
  "2 500 €",
];
const DEFAULT_PRIZES = [
  { amount: 0, weight: 0 },     // 0 GRIEZ
  { amount: 0, weight: 0 },     // 1 iPhone
  { amount: 2000, weight: 19 }, // 2 nakit
  { amount: 0, weight: 0 },     // 3 MOTOCIKLS
  { amount: 0, weight: 0 },     // 4 AUTO
  { amount: 1500, weight: 27 }, // 5 nakit
  { amount: 1000, weight: 24 }, // 6 nakit
  { amount: 500, weight: 5 },   // 7 nakit
  { amount: 2500, weight: 14 }, // 8 nakit
];

function normalizePrizes(raw: unknown) {
  const list = Array.isArray(raw) ? raw : [];
  // Eski 5'li format destegi: sirayla CASH_SLOT_POSITIONS'a karsilik gelirdi
  const legacy = list.length === 5;
  const entries = DEFAULT_PRIZES.map((def, i) => {
    if (!CASH_SLOT_POSITIONS.includes(i)) return { ...def };
    const entry = (legacy ? list[CASH_SLOT_POSITIONS.indexOf(i)] : list[i]) as
      | { amount?: unknown; weight?: unknown }
      | undefined;
    const weight = Number(entry?.weight);
    return {
      // Tutar gorsele gomulu — DB'de yanlis/eski deger varsa yok sayilir
      amount: def.amount,
      weight: Number.isFinite(weight) && weight >= 0 ? Math.round(weight) : def.weight,
    };
  });
  const total = entries.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return DEFAULT_PRIZES.map((d) => ({ ...d }));
  return entries;
}

export function WheelSettingsTab({ darkMode }: { darkMode: boolean }) {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const supabase = createBrowserSupabaseClient();

  const fetchSettings = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase.from("global_settings").select("*").limit(1).single();
    if (data) {
      setSettings(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, [supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("global_settings")
      .update({ wheel_settings: settings.wheel_settings })
      .eq("id", settings.id || "default");
    
    setSaving(false);
    if (error) alert("Hata: " + error.message);
    else alert("Çark ayarları başarıyla kaydedildi!");
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev: any) => ({
      ...prev,
      wheel_settings: {
        ...(prev.wheel_settings || {}),
        [key]: value
      }
    }));
  };

  const handlePrizeChange = (index: number, field: "amount" | "weight", value: string) => {
    // Nakit olmayan dilimler (GRIEZ/iPhone/MOTOCIKLS/AUTO) duzenlenemez — kalici 0%
    if (!CASH_SLOT_POSITIONS.includes(index)) return;
    const num = Number(value);
    setSettings((prev: any) => {
      const prizes = normalizePrizes(prev?.wheel_settings?.prizes);
      prizes[index] = { ...prizes[index], [field]: Number.isFinite(num) ? num : 0 };
      return {
        ...prev,
        wheel_settings: { ...(prev?.wheel_settings || {}), prizes },
      };
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    if (!e.target.files || e.target.files.length === 0 || !supabase) return;
    const file = e.target.files[0];
    setUploading(key);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `wheel/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, file);

    if (uploadError) {
      alert("Yükleme hatası: " + uploadError.message);
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage.from('assets').getPublicUrl(filePath);
    handleChange(key, urlData.publicUrl);
    setUploading(null);
  };

  if (loading) return <div className="opacity-50 p-8 text-center font-medium">Yükleniyor...</div>;
  if (!settings) return <div className="opacity-50 p-8 text-center font-medium">Ayarlar bulunamadı.</div>;

  const wheelSettings = settings.wheel_settings || {};

  const defaultAssets = {
    desktop_background: "/wheel-assets/desktop/background.webp",
    desktop_wheel: "/wheel-assets/desktop/wheel.webp",
    desktop_pointer: "/wheel-assets/desktop/pointer.webp",
    desktop_button: "/wheel-assets/desktop/button.webp",
    desktop_centerHub: "/wheel-assets/desktop/center-hub.webp",
    mobile_background: "/wheel-assets/mobile/background.webp",
    mobile_wheel: "/wheel-assets/mobile/wheel.webp",
    mobile_pointer: "/wheel-assets/mobile/pointer.webp",
    mobile_button: "/wheel-assets/mobile/button.webp",
    mobile_centerHub: "/wheel-assets/mobile/center-hub.webp",
  };

  const renderField = (key: string, label: string, defaultUrl: string) => {
    const value = wheelSettings[key] || defaultUrl;
    return (
      <div className="flex gap-5 items-center border-b border-black/5 dark:border-white/5 pb-5 mb-5 last:border-0 last:pb-0 last:mb-0">
        <div className={`w-24 h-24 shrink-0 rounded-2xl border flex items-center justify-center p-2 overflow-hidden shadow-inner ${darkMode ? 'bg-black/40 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
          <img src={value} alt="" className="max-w-full max-h-full object-contain drop-shadow-md" />
        </div>
        <div className="flex-1 space-y-2.5">
          <label className={`block text-[11px] font-bold opacity-80 uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{label}</label>
          <div className="flex gap-3">
            <input 
              type="text"
              value={value}
              onChange={e => handleChange(key, e.target.value)}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all ${darkMode ? 'bg-black/20 text-white border border-white/10 focus:border-[#EB5E28]' : 'bg-gray-50 border border-gray-200 focus:border-[#EB5E28]'}`}
            />
            <label className={`px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-all active:scale-95 shadow-sm border ${darkMode ? 'bg-white/10 hover:bg-white/20 border-white/5 text-white' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'}`}>
              {uploading === key ? "..." : "Gözat"}
              <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, key)} disabled={!!uploading} />
            </label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${darkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          </div>
          <div>
            <h2 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>Çark Ayarları</h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Çarkın masaüstü ve mobil görsellerini değiştirin</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">

        {/* ODUL TUTARLARI + SANS ORANLARI */}
        <div className={`p-8 rounded-3xl border shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl ${darkMode ? 'bg-[#1c1c1e]/70 border-white/5' : 'bg-white/80 border-[#d2d2d7]/50'}`}>
          <h3 className={`text-lg font-bold mb-2 border-b pb-4 ${darkMode ? 'border-white/10 text-[#EB5E28]' : 'border-gray-200 text-[#EB5E28]'}`}>Ödül Tutarları + Şans Oranları</h3>
          <p className={`text-xs mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Çarkın 9 dilimi aşağıda (tepeden saat yönünde 1-9). Şans = ağırlık;
            0 olan dilim görünür ama kazandırılmaz. iPhone / MOTOCIKLS / AUTO / GRIEZ
            dilimleri dekoratiftir — kalıcı %0, asla kazandırmaz.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(normalizePrizes(settings.wheel_settings?.prizes)).map((p: { amount: number; weight: number }, i: number) => {
              const isCash = CASH_SLOT_POSITIONS.includes(i);
              return (
              <div key={i} className={`p-4 rounded-2xl border ${isCash ? (darkMode ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200') : (darkMode ? 'bg-black/10 border-white/5 opacity-50' : 'bg-gray-100/50 border-gray-200 opacity-60')}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Dilim {i + 1} — {SEGMENT_NAMES[i]}
                </div>
                <div className="flex gap-3">
                  <label className="flex-1">
                    <span className={`block text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tutar (€)</span>
                    <input
                      type="number"
                      min={0}
                      value={p.amount}
                      readOnly
                      disabled
                      className={`mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none opacity-60 cursor-not-allowed ${darkMode ? 'bg-black/20 text-white border border-white/10' : 'bg-white border border-gray-200'}`}
                    />
                  </label>
                  <label className="w-24">
                    <span className={`block text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Şans (%)</span>
                    <input
                      type="number"
                      min={0}
                      value={p.weight}
                      onChange={(e) => handlePrizeChange(i, "weight", e.target.value)}
                      readOnly={!isCash}
                      disabled={!isCash}
                      className={`mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none ${!isCash ? 'opacity-60 cursor-not-allowed' : ''} ${darkMode ? 'bg-black/20 text-white border border-white/10 focus:border-[#EB5E28]' : 'bg-white border border-gray-200 focus:border-[#EB5E28]'}`}
                    />
                  </label>
                </div>
                {!isCash && (
                  <div className={`mt-2 text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>Dekor — kazandırmaz</div>
                )}
              </div>
              );
            })}
          </div>
          <div className={`mt-4 text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Toplam şans: {normalizePrizes(settings.wheel_settings?.prizes).reduce((s: number, p: { weight: number }) => s + p.weight, 0)}%
          </div>
        </div>

        <div className={`p-8 rounded-3xl border shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl ${darkMode ? 'bg-[#1c1c1e]/70 border-white/5' : 'bg-white/80 border-[#d2d2d7]/50'}`}>
          <h3 className={`text-lg font-bold mb-6 border-b pb-4 ${darkMode ? 'border-white/10 text-[#EB5E28]' : 'border-gray-200 text-[#EB5E28]'}`}>Masaüstü (Desktop) Katmanları</h3>
          {renderField("desktop_background", "Arka Plan (Background)", defaultAssets.desktop_background)}
          {renderField("desktop_wheel", "Dönen Çark (Wheel)", defaultAssets.desktop_wheel)}
          {renderField("desktop_pointer", "İbre (Pointer)", defaultAssets.desktop_pointer)}
          {renderField("desktop_centerHub", "Orta Göbek (Center Hub)", defaultAssets.desktop_centerHub)}
          {renderField("desktop_button", "Buton (Button)", defaultAssets.desktop_button)}
        </div>

        <div className={`p-8 rounded-3xl border shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl ${darkMode ? 'bg-[#1c1c1e]/70 border-white/5' : 'bg-white/80 border-[#d2d2d7]/50'}`}>
          <h3 className={`text-lg font-bold mb-6 border-b pb-4 ${darkMode ? 'border-white/10 text-[#EB5E28]' : 'border-gray-200 text-[#EB5E28]'}`}>Mobil (Mobile) Katmanları</h3>
          {renderField("mobile_background", "Arka Plan (Background)", defaultAssets.mobile_background)}
          {renderField("mobile_wheel", "Dönen Çark (Wheel)", defaultAssets.mobile_wheel)}
          {renderField("mobile_pointer", "İbre (Pointer)", defaultAssets.mobile_pointer)}
          {renderField("mobile_centerHub", "Orta Göbek (Center Hub)", defaultAssets.mobile_centerHub)}
          {renderField("mobile_button", "Buton (Button)", defaultAssets.mobile_button)}
        </div>
        
        <div className="flex justify-end sticky bottom-6 z-20 pb-4">
          <button 
            type="submit" 
            disabled={saving}
            className="px-8 py-3.5 bg-[#EB5E28] text-white rounded-full font-bold tracking-wide hover:bg-[#c94d1e] transition-all duration-300 shadow-[0_0_15px_rgba(235,94,40,0.3)] hover:shadow-[0_0_25px_rgba(235,94,40,0.5)] active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? "Kaydediliyor..." : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                Görselleri Kaydet
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
