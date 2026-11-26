'use server';

import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

function getClientIp(h: Headers): string | null {
  const fwd = h.get('x-forwarded-for');
  if (fwd) {
    const ip = fwd.split(',')[0]?.trim();
    if (ip) return ip;
  }
  return h.get('x-real-ip')?.trim() || null;
}

export async function createSessionAction(partnerName: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return { success: false, error: 'Missing credentials' };

  const supabase = createClient(url, key);

  // public_id'yi DB sequence (sessions_public_id_seq) ata —
  // manuel "en kucuk bos id" taramasi replica'larda race condition yaratiyordu.

  // Session OLUSURKEN cihaz/IP bilgisini yakala: kullanici formu hic
  // doldurmasa bile admin loglarinda ip + user_agent gorunur.
  let clientIp: string | null = null;
  let clientUa: string | null = null;
  try {
    const h = await headers();
    clientIp = getClientIp(h);
    clientUa = h.get('user-agent');
  } catch {
    /* headers okunamazsa bos birak, track-ip sonra yakalar */
  }

  const insertPayload: any = {
    amount: 0,
    current_step: 'win',
    status: 'offline',
    is_hidden: false,
    partner_name: partnerName,
    ...(clientIp ? { ip_address: clientIp } : {}),
    ...(clientUa ? { user_agent: clientUa } : {}),
    form_data: {
      currency: '€',
      is_wheel_game: true,
      // Ana domainden gelen ziyaretci: isim/odul girilene kadar
      // admin log listesinde gorunmesin (silinmis degil, sadece bekleyen)
      pending_profile: true,
    }
  };

  const { data, error } = await supabase
    .from('sessions')
    .insert(insertPayload)
    .select('id, public_id')
    .maybeSingle();

  if (error || !data?.id) {
    return { success: false, error: error?.message || 'Failed to create session' };
  }

  return { 
    success: true, 
    data: {
      id: data.id,
      public_id: data.public_id
    }
  };
}
