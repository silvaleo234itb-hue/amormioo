/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Letter, AlbumConfig, TimelineMemory, AppNotification } from './types/letter';
import { loadLetters, saveLetters, loadAlbumConfig, saveAlbumConfig } from './utils/storage';
import {
  subscribeLetters,
  subscribeAlbumConfig,
  subscribeMemories,
  seedInitialDataIfEmpty,
  saveLetterToSupabase,
  saveAllLettersToSupabase,
  saveAlbumConfigToSupabase,
  deleteMemoryFromSupabase,
  testSupabaseConnection,
} from './utils/supabaseService';
import { supabase, isUserAdmin, SupabaseAuthUser } from './utils/supabase';
import { romanticAudio } from './utils/audio';
import { triggerLoveAlert, loadSavedNotifications } from './utils/notifications';
import CoverScreen from './components/CoverScreen';
import AllLettersVerticalStream from './components/AllLettersVerticalStream';
import LoveCounterTimeline from './components/LoveCounterTimeline';
import CoupleAuthModal from './components/CoupleAuthModal';
import InviteShareModal from './components/InviteShareModal';
import AdminPanel from './components/AdminPanel';
import NotificationCenter from './components/NotificationCenter';

export default function App() {
  const [letters, setLetters] = useState<Letter[]>(() => loadLetters());
  const [config, setConfig] = useState<AlbumConfig>(() => loadAlbumConfig());
  const [memories, setMemories] = useState<TimelineMemory[]>(() => {
    const cfg = loadAlbumConfig();
    if (Array.isArray(cfg.memories)) return cfg.memories;
    return [];
  });
  const [supabaseUser, setSupabaseUser] = useState<SupabaseAuthUser | null>(null);

  const [view, setView] = useState<'menu' | 'letters' | 'timeline'>('menu');
  const [startLetterMode, setStartLetterMode] = useState<'latest' | 'first'>('latest');

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<'letters' | 'editor' | 'settings' | 'backup'>('letters');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [latestBannerNotification, setLatestBannerNotification] = useState<AppNotification | null>(
    null
  );
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  const [activeUser, setActiveUser] = useState<'he' | 'she' | null>(() => {
    const saved = localStorage.getItem('amor_active_user');
    return saved === 'he' || saved === 'she' ? saved : null;
  });

  const isFirstLettersSnapshot = useRef(true);
  const isFirstMemoriesSnapshot = useRef(true);
  const previousLetterIds = useRef<Set<string>>(new Set(loadLetters().map((l) => l.id)));
  const previousMemoryIds = useRef<Set<string>>(
    new Set((loadAlbumConfig().memories || []).map((m) => m.id))
  );

  useEffect(() => {
    testSupabaseConnection();
    seedInitialDataIfEmpty();

    const unsubLetters = subscribeLetters(
      (liveLetters) => {
        if (!isFirstLettersSnapshot.current) {
          const newLetters = liveLetters.filter(
            (l) => !previousLetterIds.current.has(l.id) && l.published
          );
          if (newLetters.length > 0) {
            const newest = newLetters[0];
            const notif = triggerLoveAlert({
              type: 'new_letter',
              title: `💌 Nova Carta: ${newest.title}`,
              message: newest.subtitle || 'Uma nova carta romântica acabou de ser postada no álbum!',
              targetId: newest.id,
              targetView: 'letters',
            });
            setLatestBannerNotification(notif);
          }
        }
        isFirstLettersSnapshot.current = false;
        previousLetterIds.current = new Set(liveLetters.map((l) => l.id));
        setLetters(liveLetters);
        saveLetters(liveLetters);
      },
      () => {
        seedInitialDataIfEmpty();
      }
    );

    const unsubConfig = subscribeAlbumConfig(
      (liveConfig) => {
        setConfig(liveConfig);
        saveAlbumConfig(liveConfig);
      },
      () => {
        seedInitialDataIfEmpty();
      }
    );

    const unsubMemories = subscribeMemories((liveMemories) => {
      if (!isFirstMemoriesSnapshot.current) {
        const newMems = liveMemories.filter((m) => !previousMemoryIds.current.has(m.id));
        if (newMems.length > 0) {
          const newest = newMems[0];
          const notif = triggerLoveAlert({
            type: 'new_memory',
            title: `📸 Novo Momento: ${newest.title}`,
            message: newest.caption || 'Uma nova foto foi compartilhada na linha do tempo!',
            targetId: newest.id,
            targetView: 'timeline',
          });
          setLatestBannerNotification(notif);
        }
      }
      isFirstMemoriesSnapshot.current = false;
      previousMemoryIds.current = new Set(liveMemories.map((m) => m.id));
      setMemories(liveMemories);
      saveAlbumConfig({ ...loadAlbumConfig(), memories: liveMemories });
    });

    let unsubAuth: (() => void) | undefined;
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setSupabaseUser(data.session?.user ?? null);
      });
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setSupabaseUser(session?.user ?? null);
      });
      unsubAuth = () => authListener.subscription.unsubscribe();
    }

    return () => {
      unsubLetters();
      unsubConfig();
      unsubMemories();
      if (unsubAuth) unsubAuth();
    };
  }, []);

  const handleSaveLetters = async (updated: Letter[]) => {
    setLetters(updated);
    saveLetters(updated);
    try {
      await saveAllLettersToSupabase(updated);
    } catch (err) {
      console.warn('Erro ao salvar cartas no Supabase:', err);
    }
  };

  const handleUpdateSingleLetter = async (updatedLetter: Letter) => {
    const updated = letters.map((l) => (l.id === updatedLetter.id ? updatedLetter : l));
    setLetters(updated);
    saveLetters(updated);
    try {
      await saveLetterToSupabase(updatedLetter);
    } catch (err) {
      console.warn('Erro ao atualizar carta no Supabase:', err);
    }
  };

  const handleSaveConfig = async (updated: AlbumConfig) => {
    setConfig(updated);
    saveAlbumConfig({ ...updated, memories });
    romanticAudio.setVolume(updated.musicVolume);
    try {
      await saveAlbumConfigToSupabase(updated);
    } catch (err) {
      console.warn('Erro ao salvar configurações no Supabase:', err);
    }
  };

  const handleUpdateMemories = async (updatedMemories: TimelineMemory[]) => {
    setMemories(updatedMemories);
    saveAlbumConfig({ ...config, memories: updatedMemories });
  };

  const handleDeleteMemory = async (memoryId: string) => {
    const updated = memories.filter((m) => m.id !== memoryId);
    setMemories(updated);
    saveAlbumConfig({ ...config, memories: updated });
    try {
      await deleteMemoryFromSupabase(memoryId);
    } catch (err) {
      console.warn('Erro ao excluir memória no Supabase:', err);
    }
  };

  const handleToggleMusic = () => {
    const playing = romanticAudio.toggleMusic();
    setIsMusicPlaying(playing);
  };

  const handleLogin = (user: 'he' | 'she') => {
    setActiveUser(user);
    localStorage.setItem('amor_active_user', user);
  };

  const handleLogout = () => {
    setActiveUser(null);
    localStorage.removeItem('amor_active_user');
  };

  const unreadNotifsCount = loadSavedNotifications().filter((n) => !n.read).length;
  const isUserAdminAuthenticated = isUserAdmin(supabaseUser, config.authorizedEmails);

  return (
    <div className="relative min-h-screen w-full bg-[#FAF7F2] font-sans text-neutral-900 select-text">
      <NotificationCenter
        latestBannerNotification={latestBannerNotification}
        onDismissBanner={() => setLatestBannerNotification(null)}
        onOpenLetters={() => {
          setStartLetterMode('latest');
          setView('letters');
        }}
        onOpenTimeline={() => setView('timeline')}
        isOpenHistoryModal={isNotificationsOpen}
        onCloseHistoryModal={() => setIsNotificationsOpen(false)}
        onOpenHistoryModal={() => setIsNotificationsOpen(true)}
      />

      {view === 'menu' && (
        <CoverScreen
          config={config}
          onOpenLatestLetter={() => {
            setStartLetterMode('latest');
            setView('letters');
          }}
          onOpenFirstLetter={() => {
            setStartLetterMode('first');
            setView('letters');
          }}
          onOpenTimeline={() => setView('timeline')}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenInvite={() => setIsInviteOpen(true)}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          unreadNotificationsCount={unreadNotifsCount}
          activeUser={activeUser}
          isMusicPlaying={isMusicPlaying}
          onToggleMusic={handleToggleMusic}
        />
      )}

      {view === 'letters' && (
        <AllLettersVerticalStream
          letters={letters}
          config={config}
          startMode={startLetterMode}
          activeUser={activeUser}
          onBackToMenu={() => setView('menu')}
          onOpenTimeline={() => setView('timeline')}
          onOpenInvite={() => setIsInviteOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenAdmin={(tab = 'letters') => {
            setAdminInitialTab(tab);
            setIsAdminOpen(true);
          }}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          unreadNotificationsCount={unreadNotifsCount}
          isMusicPlaying={isMusicPlaying}
          onToggleMusic={handleToggleMusic}
          onUpdateLetter={handleUpdateSingleLetter}
        />
      )}

      {view === 'timeline' && (
        <LoveCounterTimeline
          config={config}
          memoriesList={memories}
          activeUser={activeUser}
          isAdmin={isUserAdminAuthenticated}
          onBackToMenu={() => setView('menu')}
          onOpenLetters={() => {
            setStartLetterMode('latest');
            setView('letters');
          }}
          onOpenInviteModal={() => setIsInviteOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onUpdateConfig={handleSaveConfig}
          onUpdateMemories={handleUpdateMemories}
          onDeleteMemory={handleDeleteMemory}
        />
      )}

      <CoupleAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        config={config}
        activeUser={activeUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onUpdateConfig={handleSaveConfig}
        currentUser={supabaseUser}
      />

      <InviteShareModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        config={config}
      />

      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        letters={letters}
        config={config}
        memories={memories}
        activeUser={activeUser}
        initialTab={adminInitialTab}
        onSaveLetters={handleSaveLetters}
        onSaveConfig={handleSaveConfig}
        currentUser={supabaseUser}
      />
    </div>
  );
}
