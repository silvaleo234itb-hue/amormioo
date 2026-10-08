import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Heart,
  Lock,
  Clock,
  Share2,
  User,
  Bell,
} from 'lucide-react';
import { AlbumConfig } from '../types/letter';
import { romanticAudio } from '../utils/audio';

interface CoverScreenProps {
  config: AlbumConfig;
  onOpenLatestLetter: () => void;
  onOpenFirstLetter: () => void;
  onOpenTimeline: () => void;
  onOpenAuth: () => void;
  onOpenInvite: () => void;
  onOpenAdmin: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount?: number;
  activeUser: 'he' | 'she' | null;
  isMusicPlaying: boolean;
  onToggleMusic: () => void;
}

export default function CoverScreen({
  config,
  onOpenLatestLetter,
  onOpenFirstLetter,
  onOpenTimeline,
  onOpenAuth,
  onOpenInvite,
  onOpenAdmin,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  activeUser,
  isMusicPlaying,
  onToggleMusic,
}: CoverScreenProps) {
  const [isOpening, setIsOpening] = useState(false);

  const handleStartLatest = () => {
    if (isOpening) return;
    setIsOpening(true);
    romanticAudio.playSealBreakSound();
    if (!isMusicPlaying && config.musicEnabled) {
      onToggleMusic();
    }
    setTimeout(() => {
      onOpenLatestLetter();
    }, 1100);
  };

  const handleStartFirst = () => {
    if (isOpening) return;
    setIsOpening(true);
    romanticAudio.playSealBreakSound();
    if (!isMusicPlaying && config.musicEnabled) {
      onToggleMusic();
    }
    setTimeout(() => {
      onOpenFirstLetter();
    }, 1100);
  };

  const heName = config.heUser?.name || config.senderName || 'Leo';
  const sheName = config.sheUser?.name || config.recipientName || 'Meu Amor';

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-[#FFFBF7] via-[#FFF5F5] to-[#FAECEE] px-4 py-8 select-none">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-rose-200/25 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-amber-100/40 blur-2xl pointer-events-none" />

      <header className="z-30 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="font-serif italic text-lg text-rose-900/80 tracking-wide">
            Nosso Álbum de Amor
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenNotifications}
            aria-label="Abrir Notificações"
            title="Notificações e Alertas do Casal"
            className="p-2 rounded-full bg-white/80 hover:bg-white text-rose-900 border border-rose-200/60 shadow-xs backdrop-blur-xs transition-all relative cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 text-rose-700" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenAuth}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 hover:bg-white text-rose-950 border border-rose-200 text-xs font-semibold shadow-xs cursor-pointer transition-all whitespace-nowrap"
            title="Login do Casal"
          >
            <User className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">
              {activeUser === 'he'
                ? `🤵🏻 ${heName}`
                : activeUser === 'she'
                ? `👰🏻‍♀️ ${sheName}`
                : 'Login do Casal'}
            </span>
          </button>

          <button
            onClick={onOpenInvite}
            aria-label="Convidar no WhatsApp"
            title="Convidar ela no WhatsApp"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">Convidar</span>
          </button>

          <button
            onClick={onToggleMusic}
            aria-label={isMusicPlaying ? 'Pausar música' : 'Tocar música romântica'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 hover:bg-white text-rose-900 border border-rose-200/60 shadow-xs backdrop-blur-xs transition-all hover:scale-105 active:scale-95 text-xs font-medium cursor-pointer whitespace-nowrap"
          >
            {isMusicPlaying ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                <span className="hidden sm:inline">Música</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-neutral-400" />
                <span className="hidden sm:inline text-neutral-600">Mudo</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenAdmin}
            aria-label="Abrir painel do autor"
            title="Painel do Autor"
            className="p-2 rounded-full bg-white/60 hover:bg-white text-neutral-500 hover:text-rose-800 border border-neutral-200/60 shadow-xs backdrop-blur-xs transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <main className="relative z-20 flex flex-col items-center text-center max-w-xl mx-auto my-auto py-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-3 mb-4 text-rose-700/70"
        >
          <span className="h-px w-8 bg-rose-300" />
          <Heart className="w-4 h-4 fill-rose-300 stroke-rose-400" />
          <span className="font-script text-2xl text-rose-800">Uma história para sempre</span>
          <Heart className="w-4 h-4 fill-rose-300 stroke-rose-400" />
          <span className="h-px w-8 bg-rose-300" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-rose-950 tracking-tight leading-tight max-w-lg mb-3 [text-wrap:balance]"
        >
          {config.coverTitle || 'Para o amor da minha vida ❤️'}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35 }}
          className="font-sans text-rose-800/80 text-sm sm:text-base font-normal mb-8 max-w-md"
        >
          {config.coverSubtitle || 'Tenho algumas coisas para te dizer...'}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          onClick={handleStartLatest}
          className="relative cursor-pointer group mb-8"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleStartLatest();
          }}
          aria-label="Abrir carta de amor"
        >
          <div className="relative w-72 sm:w-84 h-48 sm:h-52 rounded-xl bg-gradient-to-b from-[#FDF9F3] to-[#F5ECE0] border border-[#E8DACB] shadow-xl p-4 flex flex-col justify-between items-center transition-transform duration-500 group-hover:-translate-y-1 group-hover:shadow-2xl">
            <div className="absolute inset-2 border border-dashed border-[#DECEBE] rounded-lg pointer-events-none" />

            <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-80 pointer-events-none">
              <div className="w-9 h-11 border border-rose-300 bg-rose-50/80 rounded-xs flex flex-col items-center justify-center p-0.5 shadow-xs">
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-600" />
                <span className="text-[7px] text-rose-800 font-serif tracking-widest mt-0.5">AMOR</span>
              </div>
            </div>

            <motion.div
              animate={isOpening ? { rotateX: -160, opacity: 0.6 } : { rotateX: 0 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className="absolute top-0 left-0 right-0 h-24 origin-top bg-gradient-to-b from-[#FBF4E8] to-[#EFE2D2] border-b border-[#DAC5AF] rounded-t-xl [clip-path:polygon(0_0,100%_0,50%_100%)] shadow-inner z-10"
            />

            <AnimatePresence>
              {isOpening && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: -70, opacity: 1 }}
                  transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
                  className="absolute inset-x-4 top-2 h-44 bg-[#FFFEFC] rounded-t-lg shadow-lg border border-amber-200/80 p-3 flex flex-col items-center z-15"
                >
                  <span className="font-script text-xl text-rose-900 mt-2">Para você, com amor...</span>
                  <div className="w-16 h-0.5 bg-rose-200 my-2" />
                  <p className="text-[11px] text-neutral-600 font-serif italic max-w-xs text-center line-clamp-3">
                    "O destino me trouxe o presente mais bonito: você."
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative z-20 flex flex-col items-center justify-center my-auto pt-6">
              <motion.div
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                animate={isOpening ? { scale: [1, 1.3, 0], opacity: [1, 0.8, 0] } : {}}
                className="w-14 h-14 rounded-full wax-seal flex items-center justify-center text-white cursor-pointer transition-shadow shadow-md"
              >
                <Heart className="w-6 h-6 fill-white stroke-rose-200" />
              </motion.div>
              <span className="text-[11px] text-amber-900/70 font-serif tracking-widest mt-2 uppercase font-medium">
                Toque no lacre para abrir
              </span>
            </div>

            <div className="relative z-10 w-full text-left pl-3 pb-1">
              <p className="text-[10px] text-amber-900/60 uppercase tracking-widest font-sans font-semibold">
                Destinatária:
              </p>
              <p className="font-script text-xl text-rose-950 leading-none">{sheName}</p>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            onClick={handleStartLatest}
            disabled={isOpening}
            className="group relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-rose-900 text-white font-medium text-sm sm:text-base shadow-lg shadow-rose-900/20 hover:bg-rose-800 hover:shadow-xl hover:shadow-rose-900/25 active:scale-98 transition-all cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 text-rose-300 group-hover:rotate-12 transition-transform" />
            <span>Abrir Nossas Cartas (Última Postada) 💌</span>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.65 }}
            onClick={onOpenTimeline}
            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-white/90 hover:bg-white text-rose-950 font-medium text-xs sm:text-sm border border-rose-200/80 shadow-xs hover:shadow-md active:scale-98 transition-all cursor-pointer whitespace-nowrap"
          >
            <Clock className="w-4 h-4 text-rose-600" />
            <span>Nosso Tempo Juntos & Fotos ⏳</span>
          </motion.button>
        </div>

        <div className="flex items-center gap-4 mt-4 text-xs">
          <button
            onClick={handleStartFirst}
            className="text-rose-800/80 hover:text-rose-950 underline cursor-pointer"
          >
            Ler desde a Carta 1 (Início)
          </button>
          <span className="text-rose-300">·</span>
          <button
            onClick={onOpenAuth}
            className="text-rose-800/80 hover:text-rose-950 underline cursor-pointer"
          >
            {activeUser ? `Perfil Ativo (${activeUser === 'he' ? heName : sheName})` : 'Entrar no Perfil'}
          </button>
        </div>
      </main>

      <footer className="z-10 text-center text-xs text-rose-900/50 font-serif">
        <span>Criado com carinho e dedicação eterna</span>
      </footer>
    </div>
  );
}
