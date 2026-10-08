-- =========================================================================
-- SQL SCHEMA PARA O SUPABASE: "CARTAS DE AMOR - NOSSO ÁLBUM DIGITAL"
-- Copie e execute este script no SQL Editor do seu painel Supabase.
-- =========================================================================

-- 1. Tabela de Cartas de Amor (letters)
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

-- 2. Tabela de Configuração do Álbum (album_config)
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

-- 3. Tabela de Memórias da Linha do Tempo (memories)
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

-- =========================================================================
-- POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- =========================================================================

ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- Políticas para leitura e escrita do casal (permite acesso via anon/authenticated key do álbum)
DROP POLICY IF EXISTS "Acesso completo às cartas do casal" ON public.letters;
CREATE POLICY "Acesso completo às cartas do casal"
  ON public.letters
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso completo às configurações do álbum" ON public.album_config;
CREATE POLICY "Acesso completo às configurações do álbum"
  ON public.album_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso completo às memórias do casal" ON public.memories;
CREATE POLICY "Acesso completo às memórias do casal"
  ON public.memories
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =========================================================================
-- HABILITAR SUPABASE REALTIME NAS TABELAS
-- =========================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.letters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.album_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.memories;

-- =========================================================================
-- BUCKET DE STORAGE PARA FOTOS (album-photos)
-- =========================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('album-photos', 'album-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Fotos públicas para leitura" ON storage.objects;
CREATE POLICY "Fotos públicas para leitura"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'album-photos');

DROP POLICY IF EXISTS "Upload de fotos pelo casal" ON storage.objects;
CREATE POLICY "Upload de fotos pelo casal"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'album-photos');

DROP POLICY IF EXISTS "Exclusão de fotos pelo casal" ON storage.objects;
CREATE POLICY "Exclusão de fotos pelo casal"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'album-photos');
