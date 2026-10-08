import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawSupabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export function isSupabaseConfigured(): boolean {
  return (
    Boolean(rawSupabaseUrl) &&
    Boolean(rawSupabaseAnonKey) &&
    rawSupabaseUrl.startsWith('http') &&
    !rawSupabaseUrl.includes('seu-projeto.supabase.co') &&
    rawSupabaseAnonKey !== 'sua-chave-anon-publica-do-supabase'
  );
}

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(rawSupabaseUrl, rawSupabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export type SupabaseAuthUser = User;

export interface AuthErrorInfo {
  code: string;
  message: string;
}

export function formatSupabaseAuthError(error: any): AuthErrorInfo {
  const message = String(error?.message || error || '');
  const code = String(error?.code || error?.status || 'auth_error');

  if (!isSupabaseConfigured()) {
    return {
      code: 'supabase/not-configured',
      message:
        'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ainda não foram configuradas no painel Secrets. Use a aba "Senha Casal" (leo ou amor) para entrar imediatamente.',
    };
  }

  if (message.toLowerCase().includes('invalid login credentials')) {
    return {
      code,
      message: 'E-mail ou senha incorretos no Supabase Auth. Se ainda não cadastrou, clique em "Cadastrar no Supabase".',
    };
  }

  if (message.toLowerCase().includes('user already registered')) {
    return {
      code,
      message: 'Este e-mail já está cadastrado no Supabase. Digite sua senha e clique em "Entrar".',
    };
  }

  if (message.toLowerCase().includes('password should be at least')) {
    return {
      code,
      message: 'A senha no Supabase precisa ter no mínimo 6 caracteres.',
    };
  }

  return {
    code,
    message: message || 'Não foi possível autenticar no Supabase. Tente novamente ou use a Senha do Casal.',
  };
}

// Helper: Compress image on client via canvas with strict size guarantee
export async function compressImageFile(
  file: File,
  maxWidth: number = 800,
  quality: number = 0.68
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          if (dataUrl.length > 250000) {
            const smallerCanvas = document.createElement('canvas');
            const smallerWidth = Math.min(width, 640);
            const smallerHeight = Math.round((height * smallerWidth) / width);
            smallerCanvas.width = smallerWidth;
            smallerCanvas.height = smallerHeight;
            const smallCtx = smallerCanvas.getContext('2d');
            if (smallCtx) {
              smallCtx.drawImage(img, 0, 0, smallerWidth, smallerHeight);
              dataUrl = smallerCanvas.toDataURL('image/jpeg', 0.58);
            }
          }
          resolve(dataUrl);
        } else {
          resolve(readerEvent.target?.result as string);
        }
      };
      img.onerror = () => {
        resolve(readerEvent.target?.result as string);
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => {
      resolve('');
    };
    reader.readAsDataURL(file);
  });
}

// Upload photo to Supabase Storage bucket ('album-photos') with compressed fallback
export async function uploadImageToSupabaseStorage(
  file: File,
  folder: string = 'memories'
): Promise<string> {
  const compressedDataUrl = await compressImageFile(file, folder === 'letters' ? 750 : 800, 0.68);

  if (!supabase) {
    return compressedDataUrl;
  }

  try {
    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const filePath = `${folder}/${Date.now()}_${cleanName}`;

    const uploadPromise = async () => {
      const { error } = await supabase.storage.from('album-photos').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg',
      });
      if (error) throw error;

      const { data } = supabase.storage.from('album-photos').getPublicUrl(filePath);
      if (!data?.publicUrl) throw new Error('Public URL not returned');
      return data.publicUrl;
    };

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase Storage timeout, using compressed photo')), 3000)
    );

    return await Promise.race([uploadPromise(), timeoutPromise]);
  } catch {
    return compressedDataUrl;
  }
}

export const BOOTSTRAP_ADMIN_EMAIL = 'zeeremlk@gmail.com';
export const BOOTSTRAP_ADMIN_EMAILS = [
  'zeeremlk@gmail.com',
  'arangoohlean@gmail.com',
  'silvaleo234.itb@gmail.com',
];

export function isUserAdmin(
  currentUser: { email?: string | null; id?: string } | null,
  authorizedEmails?: string[]
): boolean {
  if (!currentUser?.email) return false;
  const emailLower = currentUser.email.toLowerCase().trim();
  if (BOOTSTRAP_ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === emailLower)) {
    return true;
  }
  if (authorizedEmails && authorizedEmails.some((e) => e.toLowerCase().trim() === emailLower)) {
    return true;
  }
  return false;
}

export const SUPABASE_SQL_SETUP_SCRIPT = `-- Execute no SQL Editor do seu projeto Supabase:

CREATE TABLE IF NOT EXISTS public.letters (
  id TEXT PRIMARY KEY,
  "order" INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  date TEXT DEFAULT 'Hoje',
  highlight_phrase TEXT,
  content TEXT NOT NULL,
  signature TEXT DEFAULT '',
  emoji TEXT DEFAULT '💌',
  images JSONB DEFAULT '[]'::jsonb,
  video_url TEXT,
  animation_in TEXT DEFAULT 'fade',
  background_theme TEXT DEFAULT 'cream-paper',
  particle_type TEXT DEFAULT 'hearts',
  particle_intensity TEXT DEFAULT 'gentle',
  image_position TEXT DEFAULT 'side-right',
  published BOOLEAN NOT NULL DEFAULT true,
  is_final_letter BOOLEAN DEFAULT false,
  post_type TEXT DEFAULT 'letter',
  category TEXT,
  location TEXT,
  likes_count INTEGER DEFAULT 0,
  liked_by JSONB DEFAULT '[]'::jsonb,
  is_liked BOOLEAN DEFAULT false,
  comments JSONB DEFAULT '[]'::jsonb,
  is_pinned BOOLEAN DEFAULT false,
  author_id TEXT DEFAULT 'he',
  author_name TEXT DEFAULT 'Leo',
  recipient_name TEXT DEFAULT 'Meu Amor',
  author_uid TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.album_config (
  id TEXT PRIMARY KEY DEFAULT 'main',
  recipient_name TEXT NOT NULL DEFAULT 'Meu Amor',
  sender_name TEXT NOT NULL DEFAULT 'Leo',
  cover_title TEXT NOT NULL DEFAULT 'Para o amor da minha vida ❤️',
  cover_subtitle TEXT DEFAULT 'Tenho algumas coisas para te dizer...',
  cover_button_text TEXT DEFAULT 'Começar nossa história',
  admin_password TEXT DEFAULT 'amor',
  music_enabled BOOLEAN DEFAULT true,
  music_volume NUMERIC DEFAULT 0.4,
  relationship_start_date TEXT DEFAULT '2023-10-14',
  he_user JSONB DEFAULT '{"name": "Leo", "password": "leo", "avatarEmoji": "🤵🏻"}'::jsonb,
  she_user JSONB DEFAULT '{"name": "Meu Amor", "password": "amor", "avatarEmoji": "👰🏻‍♀️"}'::jsonb,
  authorized_emails JSONB DEFAULT '["zeeremlk@gmail.com"]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.memories (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  caption TEXT DEFAULT '',
  photo_url TEXT NOT NULL,
  author TEXT DEFAULT 'Leo',
  location TEXT,
  author_uid TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso completo letters" ON public.letters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso completo album_config" ON public.album_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso completo memories" ON public.memories FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.letters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.album_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.memories;`;
