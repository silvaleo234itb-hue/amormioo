import { supabase, isSupabaseConfigured } from './supabase';
import { Letter, AlbumConfig, TimelineMemory, LetterComment } from '../types/letter';
import { DEFAULT_LETTERS, DEFAULT_ALBUM_CONFIG } from '../data/initialLetters';

const LETTERS_TABLE = 'letters';
const CONFIG_TABLE = 'album_config';
const CONFIG_DOC_ID = 'main';
const MEMORIES_TABLE = 'memories';

// ==========================================
// DATA MAPPERS (Postgres snake_case <-> App camelCase)
// ==========================================

function mapRowToLetter(row: Record<string, any>): Letter {
  const likedBy = Array.isArray(row.liked_by)
    ? row.liked_by
    : Array.isArray(row.likedBy)
    ? row.likedBy
    : [];
  const rawLikes =
    typeof row.likes_count === 'number'
      ? row.likes_count
      : typeof row.likesCount === 'number'
      ? row.likesCount
      : likedBy.length;
  const likesCount = rawLikes !== 999 && rawLikes >= 0 ? rawLikes : likedBy.length;

  return {
    id: String(row.id),
    order: Number(row.order) || 1,
    title: String(row.title || 'Carta de Amor'),
    subtitle: String(row.subtitle || ''),
    date: String(row.date || 'Hoje'),
    highlightPhrase: row.highlight_phrase ?? row.highlightPhrase ?? undefined,
    content: String(row.content || ''),
    signature: String(row.signature || ''),
    emoji: String(row.emoji || '💌'),
    images: Array.isArray(row.images) ? row.images : [],
    videoUrl: row.video_url ?? row.videoUrl ?? undefined,
    animationIn: row.animation_in || row.animationIn || 'fade',
    backgroundTheme: row.background_theme || row.backgroundTheme || 'cream-paper',
    particleType: row.particle_type || row.particleType || 'hearts',
    particleIntensity: row.particle_intensity || row.particleIntensity || 'gentle',
    imagePosition: row.image_position || row.imagePosition || 'side-right',
    published: typeof row.published === 'boolean' ? row.published : true,
    isFinalLetter: Boolean(row.is_final_letter ?? row.isFinalLetter ?? false),
    postType: row.post_type || row.postType || 'letter',
    category: row.category || undefined,
    location: row.location || undefined,
    likesCount,
    likedBy,
    isLiked: Boolean(row.is_liked ?? row.isLiked ?? false),
    comments: Array.isArray(row.comments) ? row.comments : [],
    isPinned: Boolean(row.is_pinned ?? row.isPinned ?? false),
    authorId: row.author_id || row.authorId || 'he',
    authorName: row.author_name || row.authorName || 'Leo',
    recipientName: row.recipient_name || row.recipientName || 'Meu Amor',
    authorUid: row.author_uid || row.authorUid || undefined,
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

function mapLetterToRow(letter: Letter): Record<string, any> {
  const validLikedBy = Array.isArray(letter.likedBy) ? letter.likedBy.filter(Boolean) : [];
  const likesCount =
    typeof letter.likesCount === 'number' && letter.likesCount !== 999 && letter.likesCount >= 0
      ? letter.likesCount
      : validLikedBy.length;

  return {
    id: String(letter.id),
    order: Number(letter.order) || 1,
    title: String(letter.title || 'Carta de Amor').slice(0, 200),
    subtitle: String(letter.subtitle || '').slice(0, 500),
    date: String(letter.date || 'Hoje').slice(0, 100),
    highlight_phrase: letter.highlightPhrase ? String(letter.highlightPhrase).slice(0, 500) : null,
    content: String(letter.content || '').slice(0, 50000),
    signature: String(letter.signature || '').slice(0, 200),
    emoji: String(letter.emoji || '💌').slice(0, 20),
    images: Array.isArray(letter.images) ? letter.images.slice(0, 20) : [],
    video_url: letter.videoUrl ? String(letter.videoUrl).slice(0, 1000) : null,
    animation_in: String(letter.animationIn || 'fade'),
    background_theme: String(letter.backgroundTheme || 'cream-paper'),
    particle_type: String(letter.particleType || 'hearts'),
    particle_intensity: String(letter.particleIntensity || 'gentle'),
    image_position: String(letter.imagePosition || 'side-right'),
    published: typeof letter.published === 'boolean' ? letter.published : true,
    is_final_letter: Boolean(letter.isFinalLetter),
    post_type: String(letter.postType || 'letter'),
    category: letter.category ? String(letter.category).slice(0, 100) : null,
    location: letter.location ? String(letter.location).slice(0, 200) : null,
    likes_count: likesCount,
    liked_by: validLikedBy,
    is_liked: Boolean(letter.isLiked),
    comments: Array.isArray(letter.comments) ? letter.comments.slice(0, 200) : [],
    is_pinned: Boolean(letter.isPinned),
    author_id: letter.authorId || 'he',
    author_name: String(letter.authorName || 'Leo').slice(0, 100),
    recipient_name: String(letter.recipientName || 'Meu Amor').slice(0, 100),
    author_uid: letter.authorUid || null,
    updated_at: new Date().toISOString(),
  };
}

function mapRowToConfig(row: Record<string, any>): AlbumConfig {
  return {
    ...DEFAULT_ALBUM_CONFIG,
    recipientName: String(row.recipient_name ?? row.recipientName ?? DEFAULT_ALBUM_CONFIG.recipientName),
    senderName: String(row.sender_name ?? row.senderName ?? DEFAULT_ALBUM_CONFIG.senderName),
    coverTitle: String(row.cover_title ?? row.coverTitle ?? DEFAULT_ALBUM_CONFIG.coverTitle),
    coverSubtitle: String(row.cover_subtitle ?? row.coverSubtitle ?? DEFAULT_ALBUM_CONFIG.coverSubtitle),
    coverButtonText: String(
      row.cover_button_text ?? row.coverButtonText ?? DEFAULT_ALBUM_CONFIG.coverButtonText
    ),
    adminPassword: String(row.admin_password ?? row.adminPassword ?? 'amor'),
    musicEnabled:
      typeof (row.music_enabled ?? row.musicEnabled) === 'boolean'
        ? Boolean(row.music_enabled ?? row.musicEnabled)
        : true,
    musicVolume: Number(row.music_volume ?? row.musicVolume ?? 0.4),
    relationshipStartDate: String(
      row.relationship_start_date ?? row.relationshipStartDate ?? '2023-10-14'
    ),
    heUser: row.he_user || row.heUser || DEFAULT_ALBUM_CONFIG.heUser,
    sheUser: row.she_user || row.sheUser || DEFAULT_ALBUM_CONFIG.sheUser,
    authorizedEmails: Array.isArray(row.authorized_emails || row.authorizedEmails)
      ? row.authorized_emails || row.authorizedEmails
      : DEFAULT_ALBUM_CONFIG.authorizedEmails,
    memories: undefined,
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

function mapConfigToRow(config: AlbumConfig): Record<string, any> {
  return {
    id: CONFIG_DOC_ID,
    recipient_name: String(config.recipientName || 'Meu Amor').slice(0, 100),
    sender_name: String(config.senderName || 'Leo').slice(0, 100),
    cover_title: String(config.coverTitle || 'Para o amor da minha vida ❤️').slice(0, 200),
    cover_subtitle: String(config.coverSubtitle || 'Tenho algumas coisas para te dizer...').slice(0, 300),
    cover_button_text: String(config.coverButtonText || 'Começar nossa história').slice(0, 100),
    admin_password: String(config.adminPassword || 'amor').slice(0, 100),
    music_enabled: typeof config.musicEnabled === 'boolean' ? config.musicEnabled : true,
    music_volume:
      typeof config.musicVolume === 'number' ? Math.max(0, Math.min(1, config.musicVolume)) : 0.4,
    relationship_start_date: String(config.relationshipStartDate || '2023-10-14').slice(0, 100),
    he_user: {
      name: String(config.heUser?.name || 'Leo').slice(0, 100),
      password: String(config.heUser?.password || 'leo').slice(0, 100),
      avatarEmoji: String(config.heUser?.avatarEmoji || '🤵🏻').slice(0, 20),
    },
    she_user: {
      name: String(config.sheUser?.name || 'Meu Amor').slice(0, 100),
      password: String(config.sheUser?.password || 'amor').slice(0, 100),
      avatarEmoji: String(config.sheUser?.avatarEmoji || '👰🏻‍♀️').slice(0, 20),
    },
    authorized_emails: Array.isArray(config.authorizedEmails)
      ? config.authorizedEmails
      : DEFAULT_ALBUM_CONFIG.authorizedEmails,
    updated_at: new Date().toISOString(),
  };
}

function mapRowToMemory(row: Record<string, any>): TimelineMemory {
  return {
    id: String(row.id),
    date: String(row.date || new Date().toISOString().split('T')[0]),
    title: String(row.title || 'Momento Especial'),
    caption: String(row.caption || ''),
    photoUrl: String(row.photo_url ?? row.photoUrl ?? ''),
    author: String(row.author || 'Leo'),
    location: row.location ? String(row.location) : undefined,
    authorUid: row.author_uid ?? row.authorUid ?? undefined,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.updatedAt ?? new Date().toISOString(),
  };
}

function mapMemoryToRow(mem: TimelineMemory): Record<string, any> {
  return {
    id: String(mem.id),
    date: String(mem.date || new Date().toISOString().split('T')[0]).slice(0, 100),
    title: String(mem.title || 'Momento Especial').slice(0, 300),
    caption: String(mem.caption || '').slice(0, 5000),
    photo_url: String(mem.photoUrl || ''),
    author: String(mem.author || 'Leo').slice(0, 100),
    location: mem.location ? String(mem.location).slice(0, 200) : null,
    author_uid: mem.authorUid || null,
    created_at: mem.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ==========================================
// REAL-TIME SUBSCRIBERS (SUPABASE REALTIME)
// ==========================================

export function subscribeLetters(
  onSuccess: (letters: Letter[]) => void,
  onFirstSeed?: () => void
): () => void {
  const client = supabase;
  if (!client || !isSupabaseConfigured()) {
    return () => {};
  }

  const fetchLetters = async () => {
    const { data, error } = await client
      .from(LETTERS_TABLE)
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      return;
    }
    if (!data || data.length === 0) {
      if (onFirstSeed) onFirstSeed();
      return;
    }
    const mapped = data.map(mapRowToLetter).sort((a, b) => a.order - b.order);
    onSuccess(mapped);
  };

  fetchLetters();

  const channel = client
    .channel('realtime-letters')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: LETTERS_TABLE },
      () => {
        fetchLetters();
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

export function subscribeAlbumConfig(
  onSuccess: (config: AlbumConfig) => void,
  onFirstSeed?: () => void
): () => void {
  const client = supabase;
  if (!client || !isSupabaseConfigured()) {
    return () => {};
  }

  const fetchConfig = async () => {
    const { data, error } = await client
      .from(CONFIG_TABLE)
      .select('*')
      .eq('id', CONFIG_DOC_ID)
      .maybeSingle();

    if (error) {
      return;
    }
    if (!data) {
      if (onFirstSeed) onFirstSeed();
      return;
    }
    onSuccess(mapRowToConfig(data));
  };

  fetchConfig();

  const channel = client
    .channel('realtime-album-config')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: CONFIG_TABLE },
      () => {
        fetchConfig();
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

export function subscribeMemories(
  onSuccess: (memories: TimelineMemory[]) => void,
  onFirstSeed?: () => void
): () => void {
  const client = supabase;
  if (!client || !isSupabaseConfigured()) {
    return () => {};
  }

  let hasInitialized = false;

  const fetchMemories = async () => {
    const { data, error } = await client
      .from(MEMORIES_TABLE)
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      return;
    }
    if ((!data || data.length === 0) && !hasInitialized && onFirstSeed) {
      hasInitialized = true;
      onFirstSeed();
      return;
    }
    hasInitialized = true;
    const mapped = (data || [])
      .map(mapRowToMemory)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    onSuccess(mapped);
  };

  fetchMemories();

  const channel = client
    .channel('realtime-memories')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: MEMORIES_TABLE },
      () => {
        fetchMemories();
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

// ==========================================
// SUPABASE CRUD OPERATIONS
// ==========================================

export async function testSupabaseConnection(): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from(CONFIG_TABLE).select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

export async function saveLetterToSupabase(letter: Letter): Promise<void> {
  if (!supabase || !isSupabaseConfigured()) return;
  const payload = mapLetterToRow(letter);
  const { error } = await supabase.from(LETTERS_TABLE).upsert(payload, { onConflict: 'id' });
  if (error) {
    console.warn('Aviso ao salvar carta no Supabase:', error.message);
  }
}

export async function saveAllLettersToSupabase(letters: Letter[]): Promise<void> {
  if (!supabase || !isSupabaseConfigured()) return;
  const rows = letters.map(mapLetterToRow);
  const { error } = await supabase.from(LETTERS_TABLE).upsert(rows, { onConflict: 'id' });
  if (error) {
    console.warn('Aviso ao salvar lote de cartas no Supabase:', error.message);
  }
}

export async function deleteLetterFromSupabase(letterId: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured()) return;
  const { error } = await supabase.from(LETTERS_TABLE).delete().eq('id', letterId);
  if (error) {
    console.warn('Aviso ao excluir carta no Supabase:', error.message);
  }
}

export async function saveAlbumConfigToSupabase(config: AlbumConfig): Promise<void> {
  if (!supabase || !isSupabaseConfigured()) return;
  const payload = mapConfigToRow(config);
  const { error } = await supabase.from(CONFIG_TABLE).upsert(payload, { onConflict: 'id' });
  if (error) {
    console.warn('Aviso ao salvar config no Supabase:', error.message);
  }
}

export async function saveMemoryToSupabase(memory: TimelineMemory): Promise<void> {
  if (!supabase || !isSupabaseConfigured()) return;
  const payload = mapMemoryToRow(memory);
  const { error } = await supabase.from(MEMORIES_TABLE).upsert(payload, { onConflict: 'id' });
  if (error) {
    console.warn('Aviso ao salvar memória no Supabase:', error.message);
  }
}

export async function deleteMemoryFromSupabase(memoryId: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured()) return;
  const { error } = await supabase.from(MEMORIES_TABLE).delete().eq('id', memoryId);
  if (error) {
    console.warn('Aviso ao excluir memória no Supabase:', error.message);
  }
}

export async function toggleLetterLikeInSupabase(
  letter: Letter,
  userIdentifier: string = 'visitor'
): Promise<{ newLiked: boolean; newLikesCount: number; newLikedBy: string[] }> {
  const currentLikedBy = Array.isArray(letter.likedBy) ? [...letter.likedBy] : [];
  const alreadyLiked = currentLikedBy.includes(userIdentifier);

  let newLikedBy: string[];
  let newLiked: boolean;

  if (alreadyLiked) {
    newLikedBy = currentLikedBy.filter((u) => u !== userIdentifier);
    newLiked = false;
  } else {
    newLikedBy = [...currentLikedBy, userIdentifier];
    newLiked = true;
  }

  const newLikesCount = Math.max(0, newLikedBy.length);

  if (supabase && isSupabaseConfigured()) {
    const { error } = await supabase
      .from(LETTERS_TABLE)
      .update({
        is_liked: newLiked,
        likes_count: newLikesCount,
        liked_by: newLikedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', letter.id);

    if (error) {
      console.warn('Aviso ao salvar curtida no Supabase:', error.message);
    }
  }

  return { newLiked, newLikesCount, newLikedBy };
}

export async function addLetterCommentInSupabase(
  letterId: string,
  targetLetter: Letter,
  comment: LetterComment
): Promise<void> {
  if (!supabase || !isSupabaseConfigured()) return;
  const updatedComments = [...(targetLetter.comments || []), comment].slice(0, 200);
  const { error } = await supabase
    .from(LETTERS_TABLE)
    .update({
      comments: updatedComments,
      updated_at: new Date().toISOString(),
    })
    .eq('id', letterId);

  if (error) {
    console.warn('Aviso ao salvar comentário no Supabase:', error.message);
  }
}

// ==========================================
// SEEDING & LOCALSTORAGE MIGRATION TO SUPABASE
// ==========================================

let isSeedingInProgress = false;

export async function seedInitialDataIfEmpty(): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured() || isSeedingInProgress) return false;
  isSeedingInProgress = true;
  try {
    const { data: configDoc, error: configErr } = await supabase
      .from(CONFIG_TABLE)
      .select('id')
      .eq('id', CONFIG_DOC_ID)
      .maybeSingle();

    if (configErr) {
      // Tables might not be created yet in Supabase SQL Editor
      return false;
    }

    if (configDoc) {
      return true;
    }

    const { data: existingLetters } = await supabase.from(LETTERS_TABLE).select('id').limit(1);
    if (!existingLetters || existingLetters.length === 0) {
      await saveAllLettersToSupabase(DEFAULT_LETTERS);
    }

    await saveAlbumConfigToSupabase(DEFAULT_ALBUM_CONFIG);

    const { data: existingMemories } = await supabase.from(MEMORIES_TABLE).select('id').limit(1);
    if ((!existingMemories || existingMemories.length === 0) && DEFAULT_ALBUM_CONFIG.memories) {
      for (const mem of DEFAULT_ALBUM_CONFIG.memories) {
        await saveMemoryToSupabase(mem);
      }
    }
    return true;
  } catch {
    return false;
  } finally {
    isSeedingInProgress = false;
  }
}

export async function migrateLocalStorageToSupabase(): Promise<{
  success: boolean;
  migratedLetters: number;
  migratedMemories: number;
  message: string;
}> {
  if (!supabase || !isSupabaseConfigured()) {
    return {
      success: false,
      migratedLetters: 0,
      migratedMemories: 0,
      message:
        'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no painel Secrets (ou .env.local) e execute o script SQL no Supabase antes de sincronizar.',
    };
  }

  try {
    let letterCount = 0;
    let memoryCount = 0;

    const rawLetters = localStorage.getItem('amor_cartas_album_v1');
    if (rawLetters) {
      const parsedLetters = JSON.parse(rawLetters);
      if (Array.isArray(parsedLetters) && parsedLetters.length > 0) {
        await saveAllLettersToSupabase(parsedLetters);
        letterCount = parsedLetters.length;
      }
    }

    const rawConfig = localStorage.getItem('amor_album_config_v1');
    if (rawConfig) {
      const parsedConfig = JSON.parse(rawConfig);
      if (parsedConfig && typeof parsedConfig === 'object') {
        await saveAlbumConfigToSupabase(parsedConfig);
        if (Array.isArray(parsedConfig.memories) && parsedConfig.memories.length > 0) {
          for (const m of parsedConfig.memories) {
            await saveMemoryToSupabase(m);
            memoryCount++;
          }
        }
      }
    }

    return {
      success: true,
      migratedLetters: letterCount,
      migratedMemories: memoryCount,
      message: `Sincronização concluída com sucesso! ${letterCount} cartas e ${memoryCount} fotos foram enviadas para o Supabase.`,
    };
  } catch (error) {
    return {
      success: false,
      migratedLetters: 0,
      migratedMemories: 0,
      message: `Erro na sincronização com o Supabase: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
