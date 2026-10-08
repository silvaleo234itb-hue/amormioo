import { Letter, AlbumConfig, TimelineMemory } from '../types/letter';
import { DEFAULT_LETTERS, DEFAULT_ALBUM_CONFIG } from '../data/initialLetters';
import {
  saveAllLettersToSupabase,
  saveAlbumConfigToSupabase,
  saveMemoryToSupabase,
} from './supabaseService';

const LETTERS_STORAGE_KEY = 'amor_cartas_album_v1';
const CONFIG_STORAGE_KEY = 'amor_album_config_v1';

export function loadLetters(): Letter[] {
  try {
    const raw = localStorage.getItem(LETTERS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_LETTERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_LETTERS;
    }
    const sanitized = parsed.map((letter: Letter) => {
      const validLikedBy = Array.isArray(letter.likedBy) ? letter.likedBy.filter(Boolean) : [];
      const likesCount =
        typeof letter.likesCount === 'number' && letter.likesCount !== 999
          ? letter.likesCount
          : validLikedBy.length;
      return {
        ...letter,
        likedBy: validLikedBy,
        likesCount,
      };
    });
    return sanitized.sort((a, b) => a.order - b.order);
  } catch {
    return DEFAULT_LETTERS;
  }
}

export function saveLetters(letters: Letter[]): void {
  try {
    const sorted = [...letters].sort((a, b) => a.order - b.order);
    localStorage.setItem(LETTERS_STORAGE_KEY, JSON.stringify(sorted));
  } catch {}
}

export function loadAlbumConfig(): AlbumConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_ALBUM_CONFIG;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_ALBUM_CONFIG, ...parsed };
  } catch {
    return DEFAULT_ALBUM_CONFIG;
  }
}

export function saveAlbumConfig(config: AlbumConfig): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

export function exportBackupData(
  lettersList: Letter[] = loadLetters(),
  configData: AlbumConfig = loadAlbumConfig(),
  memoriesList: TimelineMemory[] = []
): string {
  return JSON.stringify(
    {
      letters: lettersList,
      config: configData,
      memories: memoriesList,
      exportedAt: new Date().toISOString(),
      version: '3.0-supabase',
    },
    null,
    2
  );
}

export async function importBackupData(
  jsonString: string,
  syncToSupabase: boolean = true
): Promise<{ success: boolean; message: string }> {
  try {
    const data = JSON.parse(jsonString);
    if (Array.isArray(data.letters)) {
      saveLetters(data.letters);
      if (syncToSupabase) {
        await saveAllLettersToSupabase(data.letters);
      }
    }
    if (data.config && typeof data.config === 'object') {
      saveAlbumConfig(data.config);
      if (syncToSupabase) {
        await saveAlbumConfigToSupabase(data.config);
      }
    }
    if (Array.isArray(data.memories) && syncToSupabase) {
      for (const m of data.memories) {
        await saveMemoryToSupabase(m);
      }
    }
    return { success: true, message: 'Dados e cartas restaurados e sincronizados com o Supabase!' };
  } catch (err) {
    return {
      success: false,
      message: `Arquivo JSON inválido ou corrompido: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export function resetToDefaults(): { letters: Letter[]; config: AlbumConfig } {
  saveLetters(DEFAULT_LETTERS);
  saveAlbumConfig(DEFAULT_ALBUM_CONFIG);
  return { letters: DEFAULT_LETTERS, config: DEFAULT_ALBUM_CONFIG };
}
