import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
  Home,
  Heart,
  Maximize2,
  X,
  Lock,
  Calendar,
  Quote,
  MessageCircle,
  Send,
  Plus,
  Clock,
  Share2,
  User,
  Bell,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Letter, AlbumConfig, LetterComment, BackgroundTheme, ImageStyle } from '../types/letter';
import ParticlesBackground from './ParticlesBackground';
import { romanticAudio } from '../utils/audio';
import { toggleLetterLikeInSupabase, addLetterCommentInSupabase } from '../utils/supabaseService';
import { uploadImageToSupabaseStorage } from '../utils/supabase';

interface AllLettersVerticalStreamProps {
  letters: Letter[];
  config: AlbumConfig;
  startMode?: 'latest' | 'first';
  activeUser?: 'he' | 'she' | null;
  onBackToMenu: () => void;
  onOpenTimeline: () => void;
  onOpenInvite: () => void;
  onOpenAuth: () => void;
  onOpenAdmin: (tab?: 'letters' | 'editor' | 'settings' | 'backup') => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount?: number;
  isMusicPlaying: boolean;
  onToggleMusic: () => void;
  onUpdateLetter: (updated: Letter) => void;
}

export default function AllLettersVerticalStream({
  letters,
  config,
  startMode = 'latest',
  activeUser = null,
  onBackToMenu,
  onOpenTimeline,
  onOpenInvite,
  onOpenAuth,
  onOpenAdmin,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  isMusicPlaying,
  onToggleMusic,
  onUpdateLetter,
}: AllLettersVerticalStreamProps) {
  const publishedLetters = letters.filter((l) => l.published);

  const [orderMode, setOrderMode] = useState<'newest-first' | 'oldest-first'>(
    startMode === 'first' ? 'oldest-first' : 'newest-first'
  );

  const orderedLetters =
    orderMode === 'newest-first' ? [...publishedLetters].reverse() : [...publishedLetters];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState<'up' | 'down'>('down');
  const [showCelebration, setShowCelebration] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isScrollingRef = useRef(false);
  const directFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingDirectPhoto, setIsUploadingDirectPhoto] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
  }, [orderMode, publishedLetters.length]);

  const currentLetter = orderedLetters[currentIndex] || orderedLetters[0];

  const handleDirectPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentLetter) return;

    setIsUploadingDirectPhoto(true);
    try {
      const storageUrl = await uploadImageToSupabaseStorage(file, 'letters');
      const newImgItem = {
        id: 'img-' + Date.now(),
        url: storageUrl,
        caption: 'Foto do nosso amor',
        style: 'polaroid' as ImageStyle,
      };
      const updatedLetter: Letter = {
        ...currentLetter,
        images: [...(currentLetter.images || []), newImgItem],
      };
      onUpdateLetter(updatedLetter);
      romanticAudio.playPageTurnSound();
    } catch (err) {
      console.warn('Erro ao anexar foto à carta:', err);
    } finally {
      setIsUploadingDirectPhoto(false);
      if (directFileInputRef.current) directFileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (currentLetter?.isFinalLetter && !showCelebration) {
      setShowCelebration(true);
      romanticAudio.playCelebrationSound();
      try {
        const scalar = 1.8;
        const heart = confetti.shapeFromText({ text: '❤️', scalar });
        const rose = confetti.shapeFromText({ text: '🌹', scalar });
        confetti({
          shapes: [heart, rose],
          particleCount: 45,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#FDA4AF', '#F43F5E', '#BE123C'],
        });
      } catch {}
    }
  }, [currentLetter?.isFinalLetter, showCelebration]);

  const goToPreviousLetter = () => {
    if (currentIndex > 0) {
      setDirection('up');
      romanticAudio.playPageTurnSound();
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const goToNextLetter = () => {
    if (currentIndex < orderedLetters.length - 1) {
      setDirection('down');
      romanticAudio.playPageTurnSound();
      setCurrentIndex((prev) => prev + 1);
    }
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.no-wheel-intercept')) return;
      if (isScrollingRef.current) return;

      if (Math.abs(e.deltaY) > 35) {
        isScrollingRef.current = true;
        if (e.deltaY > 0) {
          goToNextLetter();
        } else {
          goToPreviousLetter();
        }
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 550);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [currentIndex, orderedLetters.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    if (Math.abs(diffY) > 45) {
      if (diffY > 0) {
        goToNextLetter();
      } else {
        goToPreviousLetter();
      }
    }
    touchStartY.current = null;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        goToNextLetter();
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        goToPreviousLetter();
      } else if (e.key === 'Escape' && selectedImage) {
        setSelectedImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, orderedLetters.length, selectedImage]);

  const handleToggleLike = async (letter: Letter) => {
    const userIdentifier = activeUser || 'visitor';
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

    const newCount = newLikedBy.length;

    if (newLiked) {
      romanticAudio.playSealBreakSound();
      try {
        const scalar = 1.6;
        const heart = confetti.shapeFromText({ text: '❤️', scalar });
        confetti({
          shapes: [heart],
          particleCount: 16,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#F43F5E', '#FDA4AF', '#BE123C'],
        });
      } catch {}
    }

    const updated: Letter = {
      ...letter,
      isLiked: newLiked,
      likesCount: newCount,
      likedBy: newLikedBy,
    };

    onUpdateLetter(updated);
    try {
      await toggleLetterLikeInSupabase(letter, userIdentifier);
    } catch (err) {
      console.warn('Erro ao salvar curtida no Supabase:', err);
    }
  };

  const handleAddComment = async (letterId: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = (commentInputs[letterId] || '').trim();
    if (!text) return;

    const targetLetter = publishedLetters.find((l) => l.id === letterId);
    if (!targetLetter) return;

    const authorName =
      activeUser === 'he'
        ? config.heUser?.name || 'Leo'
        : config.sheUser?.name || config.recipientName || 'Meu Amor';

    const newComment: LetterComment = {
      id: 'comment-' + Date.now(),
      author: authorName,
      text: text.slice(0, 500),
      date: 'Agora mesmo',
    };

    const updated: Letter = {
      ...targetLetter,
      comments: [...(targetLetter.comments || []), newComment],
    };

    onUpdateLetter(updated);
    setCommentInputs((prev) => ({ ...prev, [letterId]: '' }));
    romanticAudio.playPageTurnSound();

    try {
      await addLetterCommentInSupabase(letterId, targetLetter, newComment);
    } catch (err) {
      console.warn('Erro ao salvar recadinho no Supabase:', err);
    }
  };

  const getBackgroundStyles = (theme: BackgroundTheme) => {
    switch (theme) {
      case 'soft-rose':
        return 'bg-gradient-to-b from-[#FFF5F7] via-[#FFE4E8] to-[#FFD8DF] text-rose-950';
      case 'starlit-night':
        return 'bg-gradient-to-b from-[#0F172A] via-[#1E1B4B] to-[#2E1065] text-rose-50';
      case 'vintage-warm':
        return 'bg-gradient-to-b from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A]/40 text-amber-950';
      case 'pure-elegance':
        return 'bg-gradient-to-b from-[#FAF8F5] via-[#FFFFFF] to-[#F5EFE6] text-neutral-900';
      case 'cream-paper':
      default:
        return 'bg-gradient-to-b from-[#FAF6F0] via-[#F5EFE6] to-[#EFE7DC] text-[#332421]';
    }
  };

  if (!currentLetter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0] p-6 text-center">
        <div>
          <p className="font-serif text-xl text-neutral-700">Nenhuma carta disponível no momento.</p>
          <button
            onClick={() => onOpenAdmin('letters')}
            className="mt-4 px-4 py-2 bg-rose-900 text-white rounded-lg text-sm cursor-pointer"
          >
            Abrir Painel do Autor
          </button>
        </div>
      </div>
    );
  }

  const isDark = currentLetter.backgroundTheme === 'starlit-night';
  const isLatestLetter = currentLetter.id === publishedLetters[publishedLetters.length - 1]?.id;
  const isFirstItemInStream = currentIndex === 0;
  const isLastItemInStream = currentIndex === orderedLetters.length - 1;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`relative min-h-screen w-full transition-colors duration-700 overflow-x-hidden flex flex-col justify-between ${getBackgroundStyles(
        currentLetter.backgroundTheme
      )}`}
    >
      <ParticlesBackground
        type={currentLetter.particleType || 'hearts'}
        intensity={currentLetter.particleIntensity || 'gentle'}
      />

      <header
        className={`sticky top-0 z-40 flex items-center justify-between px-4 sm:px-8 py-3 backdrop-blur-md border-b transition-colors ${
          isDark
            ? 'bg-slate-950/50 border-slate-800 text-white'
            : 'bg-white/70 border-rose-200/50 text-neutral-800'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onBackToMenu}
            aria-label="Voltar ao Menu Principal"
            title="Voltar ao Menu Principal (Capa com Envelope)"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 text-rose-200 border border-white/10'
                : 'bg-white/90 hover:bg-white text-rose-900 border border-rose-200/60 shadow-xs'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">Menu Principal</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs font-serif">
            <span className="font-bold">Carta #{currentLetter.order}</span>
            <span className="opacity-60">de {publishedLetters.length}</span>
            {isLatestLetter && (
              <span className="ml-1 text-rose-600 dark:text-rose-300 text-[11px] font-sans font-semibold">
                · Última Postada
              </span>
            )}
          </div>

          <button
            onClick={() =>
              setOrderMode((prev) => (prev === 'newest-first' ? 'oldest-first' : 'newest-first'))
            }
            title={
              orderMode === 'newest-first'
                ? 'Mudar para ordem cronológica (1 a 5)'
                : 'Mudar para mais recentes primeiro (5 a 1)'
            }
            className={`hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer border whitespace-nowrap ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 text-rose-200 border-white/20'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-200'
            }`}
          >
            <span>{orderMode === 'newest-first' ? 'Recentes Primeiro ↓' : 'Cronológica ↑'}</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
          <span className="font-script text-xl text-rose-700 dark:text-rose-300">
            Nossas Cartas de Amor
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNotifications}
            aria-label="Notificações"
            title="Notificações e Alertas"
            className={`p-2 rounded-full transition-all relative cursor-pointer ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 text-rose-200'
                : 'bg-white/80 hover:bg-white text-rose-900 border border-rose-200/60 shadow-xs'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-rose-700" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenTimeline}
            title="Ver Nosso Tempo Juntos e Fotos com Legenda"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/80 hover:bg-white text-rose-950 border border-rose-200 text-xs font-semibold shadow-xs cursor-pointer transition-all whitespace-nowrap"
          >
            <Clock className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden md:inline">Nosso Tempo ⏳</span>
          </button>

          <button
            onClick={onOpenInvite}
            title="Convidar no WhatsApp"
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold shadow-xs cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden lg:inline">Convidar</span>
          </button>

          <button
            onClick={onOpenAuth}
            title="Login do Casal"
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-full bg-white/80 hover:bg-white text-rose-950 border border-rose-200 text-xs font-semibold shadow-xs cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap"
          >
            <User className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden xl:inline">
              {activeUser === 'he' ? config.heUser?.name : activeUser === 'she' ? config.sheUser?.name : 'Login'}
            </span>
          </button>

          <button
            onClick={() => onOpenAdmin('editor')}
            title="Criar nova carta ou post"
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap ${
              isDark
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200'
                : 'bg-rose-900 hover:bg-rose-800 text-white shadow-xs'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nova Carta</span>
          </button>

          <button
            onClick={onToggleMusic}
            aria-label="Controle de música"
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 text-rose-200'
                : 'bg-white/80 hover:bg-white text-rose-900 border border-rose-200/60 shadow-xs'
            }`}
          >
            {isMusicPlaying ? (
              <Volume2 className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 opacity-60" />
            )}
          </button>

          <button
            onClick={() => onOpenAdmin('letters')}
            title="Painel do Autor"
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-neutral-100 text-neutral-600'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <main className="relative z-20 flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col items-center justify-center w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentLetter.id}
            initial={{ opacity: 0, y: direction === 'down' ? 50 : -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: direction === 'down' ? -50 : 50 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className={`w-full rounded-3xl p-6 sm:p-10 md:p-12 transition-all relative ${
              isDark
                ? 'bg-slate-900/80 border border-purple-500/20 shadow-2xl backdrop-blur-md'
                : 'letter-paper border border-[#E9DDCB] shadow-2xl'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-4 mb-6 border-neutral-300/40">
              <div className="flex items-center gap-2 text-xs font-sans opacity-70">
                <Calendar className="w-3.5 h-3.5" />
                <span>{currentLetter.date || 'Para todo o sempre'}</span>
                {currentLetter.location && (
                  <>
                    <span>·</span>
                    <span>{currentLetter.location}</span>
                  </>
                )}
                {currentLetter.category && (
                  <>
                    <span>·</span>
                    <span>{currentLetter.category}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-2xl" role="img" aria-label="emoticon">
                  {currentLetter.emoji || '💌'}
                </span>
              </div>
            </div>

            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-1.5 text-xs font-serif text-rose-800 dark:text-rose-200 mb-3">
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                <span>
                  De{' '}
                  <strong>
                    {currentLetter.authorName ||
                      (currentLetter.authorId === 'she'
                        ? config.sheUser?.name || 'Ela'
                        : config.heUser?.name || 'Leo')}
                  </strong>{' '}
                  para{' '}
                  <strong>
                    {currentLetter.recipientName ||
                      (currentLetter.authorId === 'she'
                        ? config.heUser?.name || 'Leo'
                        : config.sheUser?.name || 'Meu Amor')}
                  </strong>
                </span>
              </div>

              <h2
                className={`font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2 [text-wrap:balance] ${
                  isDark ? 'text-rose-100' : 'text-rose-950'
                }`}
              >
                {currentLetter.title}
              </h2>
              {currentLetter.subtitle && (
                <p
                  className={`font-sans text-xs sm:text-sm font-normal max-w-lg mx-auto ${
                    isDark ? 'text-rose-200/80' : 'text-rose-900/70'
                  }`}
                >
                  {currentLetter.subtitle}
                </p>
              )}
            </div>

            <div
              className={`flex flex-col gap-8 ${
                currentLetter.images && currentLetter.images.length > 0
                  ? currentLetter.imagePosition === 'side-left'
                    ? 'md:flex-row-reverse items-center'
                    : currentLetter.imagePosition === 'side-right'
                    ? 'md:flex-row items-center'
                    : 'flex-col items-center'
                  : ''
              }`}
            >
              <div className="flex-1 w-full space-y-6">
                {currentLetter.highlightPhrase && (
                  <div
                    className={`relative p-4 rounded-2xl border-l-4 my-3 ${
                      isDark
                        ? 'bg-purple-950/40 border-rose-400 text-rose-100'
                        : 'bg-rose-50/80 border-rose-500 text-rose-900'
                    }`}
                  >
                    <Quote className="w-5 h-5 absolute -top-2.5 -left-2.5 opacity-60 fill-current" />
                    <p className="font-serif italic text-sm sm:text-base pl-3 leading-relaxed">
                      "{currentLetter.highlightPhrase}"
                    </p>
                  </div>
                )}

                <div
                  className={`font-sans text-sm sm:text-base leading-relaxed whitespace-pre-line space-y-4 ${
                    isDark ? 'text-slate-200' : 'text-neutral-800'
                  }`}
                >
                  {currentLetter.content}
                </div>

                {currentLetter.signature && (
                  <div className="pt-4 text-right">
                    <p className="text-xs uppercase tracking-widest opacity-60 font-sans">
                      Com todo o meu amor,
                    </p>
                    <p className="font-script text-2xl sm:text-3xl text-rose-600 dark:text-rose-300 mt-1">
                      {currentLetter.signature}
                    </p>
                  </div>
                )}
              </div>

              {currentLetter.images && currentLetter.images.length > 0 && (
                <div className="w-full md:w-80 shrink-0 flex flex-col gap-6 items-center">
                  {currentLetter.images.map((img) => (
                    <motion.div
                      key={img.id}
                      whileHover={{ scale: 1.02 }}
                      className="relative cursor-pointer group p-3 pb-5 bg-white shadow-xl rounded-sm rotate-1 hover:rotate-0 transition-transform duration-300"
                      onClick={() => setSelectedImage(img.url)}
                    >
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-5 bg-amber-100/70 border border-amber-200/50 -rotate-2 backdrop-blur-xs shadow-xs" />
                      <div className="relative overflow-hidden rounded-xs aspect-4/3 sm:aspect-square w-full bg-rose-50">
                        <img
                          src={img.url}
                          alt={img.caption || 'Foto do momento'}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="p-2 rounded-full bg-white/80 text-neutral-800 shadow-md">
                            <Maximize2 className="w-4 h-4" />
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const updatedImages = (currentLetter.images || []).filter(
                              (item) => item.id !== img.id
                            );
                            const updatedLetter: Letter = { ...currentLetter, images: updatedImages };
                            onUpdateLetter(updatedLetter);
                            romanticAudio.playPageTurnSound();
                          }}
                          title="Remover esta foto da carta"
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/95 hover:bg-rose-50 text-neutral-600 hover:text-rose-600 shadow-md transition-all cursor-pointer opacity-80 hover:opacity-100 z-10"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {img.caption && (
                        <p className="font-serif italic text-xs text-center text-neutral-700 mt-2 px-1">
                          {img.caption}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-rose-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                {(() => {
                  const currentLikedBy = Array.isArray(currentLetter.likedBy)
                    ? currentLetter.likedBy.filter(Boolean)
                    : [];
                  const isCurrentLetterLiked =
                    currentLikedBy.includes(activeUser || 'visitor') || Boolean(currentLetter.isLiked);

                  let currentLikesCount = currentLikedBy.length;
                  if (
                    currentLikesCount === 0 &&
                    typeof currentLetter.likesCount === 'number' &&
                    currentLetter.likesCount !== 999 &&
                    currentLetter.likesCount > 0
                  ) {
                    currentLikesCount = currentLetter.likesCount;
                  }

                  const hasHe = currentLikedBy.includes('he');
                  const hasShe = currentLikedBy.includes('she');
                  const heName = config.heUser?.name || 'Leo';
                  const sheName = config.sheUser?.name || 'Meu Amor';

                  let likesLabel: string;
                  if (hasHe && hasShe) {
                    likesLabel = `2 Curtidas (${heName} & ${sheName} ❤️)`;
                  } else if (hasHe) {
                    likesLabel = `1 Curtida (${heName} curtiu)`;
                  } else if (hasShe) {
                    likesLabel = `1 Curtida (${sheName} curtiu)`;
                  } else if (currentLikesCount > 0) {
                    likesLabel = `${currentLikesCount} ${currentLikesCount === 1 ? 'Curtida' : 'Curtidas'}`;
                  } else {
                    likesLabel = 'Curtir Carta ❤️';
                  }

                  return (
                    <button
                      onClick={() => handleToggleLike(currentLetter)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        isCurrentLetterLiked
                          ? 'bg-rose-100 text-rose-950 border border-rose-300 shadow-xs ring-1 ring-rose-200'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isCurrentLetterLiked ? 'fill-rose-600 text-rose-600' : 'text-rose-500'
                        }`}
                      />
                      <span>{likesLabel}</span>
                    </button>
                  );
                })()}

                <button
                  onClick={() => directFileInputRef.current?.click()}
                  disabled={isUploadingDirectPhoto}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  title="Adicionar uma foto a esta carta"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-700" />
                  <span>{isUploadingDirectPhoto ? 'Carregando foto...' : 'Adicionar Foto'}</span>
                </button>
                <input
                  ref={directFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleDirectPhotoUpload}
                  className="hidden"
                />

                <span className="text-xs text-neutral-500 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{currentLetter.comments?.length || 0} recadinhos</span>
                </span>
              </div>

              <form
                onSubmit={(e) => handleAddComment(currentLetter.id, e)}
                className="w-full sm:w-auto flex items-center gap-2 no-wheel-intercept"
              >
                <input
                  type="text"
                  maxLength={500}
                  placeholder="Deixar um recadinho nesta carta..."
                  value={commentInputs[currentLetter.id] || ''}
                  onChange={(e) =>
                    setCommentInputs({ ...commentInputs, [currentLetter.id]: e.target.value })
                  }
                  className="px-3.5 py-2 rounded-full border border-rose-200 bg-white/80 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 w-full sm:w-64"
                />
                <button
                  type="submit"
                  disabled={!(commentInputs[currentLetter.id] || '').trim()}
                  className="p-2 rounded-full bg-rose-900 hover:bg-rose-800 text-white disabled:opacity-30 cursor-pointer shadow-xs"
                  title="Enviar recadinho"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {currentLetter.comments && currentLetter.comments.length > 0 && (
              <div className="mt-4 pt-3 border-t border-rose-100/60 space-y-1.5 no-wheel-intercept">
                {currentLetter.comments.map((c) => (
                  <div key={c.id} className="text-xs flex items-baseline gap-2">
                    <strong className="font-semibold text-rose-950 dark:text-rose-200">{c.author}:</strong>
                    <span className="text-neutral-700 dark:text-slate-300">{c.text}</span>
                    <span className="text-[10px] text-neutral-400 ml-auto shrink-0">{c.date}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="sticky bottom-4 z-40 flex items-center justify-center gap-3 px-4 py-2">
        <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-rose-200/60">
          <button
            onClick={goToPreviousLetter}
            disabled={isFirstItemInStream}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-rose-950 dark:text-rose-100 hover:bg-rose-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors whitespace-nowrap"
            title="Deslizar para cima (anterior)"
          >
            <ChevronUp className="w-4 h-4 text-rose-700 dark:text-rose-300" />
            <span className="hidden sm:inline">
              {orderMode === 'newest-first' ? 'Mais Recente' : 'Anterior'}
            </span>
          </button>

          <span className="text-xs font-serif font-bold text-rose-900 dark:text-rose-200 px-2 border-x border-rose-200/60 tabular-nums">
            {currentIndex + 1} / {orderedLetters.length}
          </span>

          <button
            onClick={goToNextLetter}
            disabled={isLastItemInStream}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-rose-950 dark:text-rose-100 hover:bg-rose-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors whitespace-nowrap"
            title="Deslizar para baixo (próxima)"
          >
            <span className="hidden sm:inline">
              {orderMode === 'newest-first' ? 'Carta Anterior' : 'Próxima'}
            </span>
            <ChevronDown className="w-4 h-4 text-rose-700 dark:text-rose-300" />
          </button>
        </div>
      </footer>

      <div className="fixed right-3 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col gap-2 p-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs rounded-full border border-rose-200/50 shadow-xs">
        {orderedLetters.map((l, idx) => (
          <button
            key={l.id}
            onClick={() => {
              setDirection(idx > currentIndex ? 'down' : 'up');
              romanticAudio.playPageTurnSound();
              setCurrentIndex(idx);
            }}
            title={`Carta #${l.order}: ${l.title}`}
            className={`transition-all rounded-full cursor-pointer ${
              currentIndex === idx
                ? 'w-3 h-6 bg-rose-600'
                : 'w-3 h-3 bg-neutral-400/40 hover:bg-rose-400'
            }`}
          />
        ))}
      </div>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              onClick={() => setSelectedImage(null)}
              aria-label="Fechar foto ampliada"
              className="absolute top-6 right-6 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={selectedImage}
              alt="Foto ampliada"
              referrerPolicy="no-referrer"
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
