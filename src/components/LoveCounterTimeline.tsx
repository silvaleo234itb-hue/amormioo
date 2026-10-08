import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Heart,
  Plus,
  Home,
  Mail,
  Upload,
  X,
  Maximize2,
  MapPin,
  Sparkles,
  Share2,
  Check,
  Trash2,
  Loader2,
  Bell,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AlbumConfig, TimelineMemory } from '../types/letter';
import { romanticAudio } from '../utils/audio';
import { uploadImageToSupabaseStorage } from '../utils/supabase';
import { saveMemoryToSupabase, deleteMemoryFromSupabase } from '../utils/supabaseService';
import { triggerLoveAlert } from '../utils/notifications';
import ConfirmationModal from './ConfirmationModal';
import { coffeeImg, flowersImg, coupleSunsetImg, starlitNightImg } from '../assets/images';

interface LoveCounterTimelineProps {
  config: AlbumConfig;
  memoriesList?: TimelineMemory[];
  activeUser?: 'he' | 'she' | null;
  isAdmin?: boolean;
  onBackToMenu: () => void;
  onOpenLetters: () => void;
  onOpenInviteModal: () => void;
  onOpenNotifications: () => void;
  onUpdateConfig: (updated: AlbumConfig) => void;
  onUpdateMemories?: (updated: TimelineMemory[]) => void;
  onDeleteMemory?: (memoryId: string) => void | Promise<void>;
}

export default function LoveCounterTimeline({
  config,
  memoriesList,
  activeUser = null,
  onBackToMenu,
  onOpenLetters,
  onOpenInviteModal,
  onOpenNotifications,
  onUpdateConfig,
  onUpdateMemories,
  onDeleteMemory,
}: LoveCounterTimelineProps) {
  const startDateStr = config.relationshipStartDate || '2023-10-14';

  const [timeTogether, setTimeTogether] = useState({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalDays: 0,
  });

  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isAddMemoryOpen, setIsAddMemoryOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingMemory, setIsSavingMemory] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newCaption, setNewCaption] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newAuthor, setNewAuthor] = useState<'he' | 'she'>(activeUser === 'she' ? 'she' : 'he');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeUser === 'she') setNewAuthor('she');
    else if (activeUser === 'he') setNewAuthor('he');
  }, [activeUser]);

  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    memoryId: string;
    memoryTitle: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    memoryId: '',
    memoryTitle: '',
    isLoading: false,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const presetPhotos = [
    { name: 'Café a Dois', url: coffeeImg },
    { name: 'Flores Especiais', url: flowersImg },
    { name: 'Pôr do Sol Mágico', url: coupleSunsetImg },
    { name: 'Céu Estrelado', url: starlitNightImg },
  ];

  useEffect(() => {
    const calculateTime = () => {
      const start = new Date(startDateStr).getTime();
      const now = new Date().getTime();
      const diffMs = Math.max(0, now - start);

      const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const years = Math.floor(totalDays / 365.25);
      const remainingDaysAfterYears = totalDays - Math.floor(years * 365.25);
      const months = Math.floor(remainingDaysAfterYears / 30.4375);
      const days = Math.floor(remainingDaysAfterYears - months * 30.4375);

      const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diffMs / 1000 / 60) % 60);
      const seconds = Math.floor((diffMs / 1000) % 60);

      setTimeTogether({
        years,
        months,
        days,
        hours,
        minutes,
        seconds,
        totalDays,
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [startDateStr]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const storageUrl = await uploadImageToSupabaseStorage(file, 'memories');
      setNewPhotoUrl(storageUrl);
      showToast('Foto carregada com sucesso!');
    } catch {
      showToast('Falha ao processar imagem.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoUrl) {
      showToast('Por favor, selecione ou envie uma foto para a memória.');
      return;
    }

    setIsSavingMemory(true);

    const authorName =
      newAuthor === 'she'
        ? config.sheUser?.name || 'Meu Amor'
        : config.heUser?.name || config.senderName || 'Leo';

    const newMemoryItem: TimelineMemory = {
      id: 'mem-' + Date.now(),
      date: newDate.slice(0, 100),
      title: (newTitle.trim() || 'Momento Especial').slice(0, 300),
      caption: newCaption.trim().slice(0, 5000),
      photoUrl: newPhotoUrl,
      author: authorName.slice(0, 100),
      location: newLocation.trim() ? newLocation.trim().slice(0, 200) : undefined,
      createdAt: new Date().toISOString(),
    };

    const activeMemoriesList = Array.isArray(memoriesList) ? memoriesList : config.memories || [];
    const updated = [newMemoryItem, ...activeMemoriesList].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    onUpdateConfig({ ...config, memories: updated });
    if (onUpdateMemories) onUpdateMemories(updated);

    try {
      await saveMemoryToSupabase(newMemoryItem);
    } catch (err) {
      console.warn('Fallback: salvo localmente (Supabase offline):', err);
    }

    romanticAudio.playCelebrationSound();
    try {
      confetti({ particleCount: 35, spread: 65, origin: { y: 0.6 } });
    } catch {}

    triggerLoveAlert({
      type: 'new_memory',
      title: `📸 Novo Momento: ${newMemoryItem.title}`,
      message: `${authorName} adicionou uma nova foto ao Tempo Juntos!`,
      targetView: 'timeline',
    });

    setNewTitle('');
    setNewCaption('');
    setNewLocation('');
    setNewPhotoUrl('');
    setIsSavingMemory(false);
    setIsAddMemoryOpen(false);
    showToast('Nova memória adicionada e sincronizada!');
  };

  const requestDeleteMemory = (memoryId: string, memoryTitle?: string) => {
    setConfirmDeleteModal({
      isOpen: true,
      memoryId,
      memoryTitle: memoryTitle || 'este momento',
      isLoading: false,
    });
  };

  const handleExecuteDeleteMemory = async () => {
    const memoryId = confirmDeleteModal.memoryId;
    if (!memoryId) return;

    setConfirmDeleteModal((prev) => ({ ...prev, isLoading: true }));

    if (onDeleteMemory) {
      await onDeleteMemory(memoryId);
    } else {
      const activeMemoriesList = Array.isArray(memoriesList) ? memoriesList : config.memories || [];
      const updated = activeMemoriesList.filter((m) => m.id !== memoryId);
      onUpdateConfig({ ...config, memories: updated });
      if (onUpdateMemories) onUpdateMemories(updated);

      try {
        await deleteMemoryFromSupabase(memoryId);
      } catch (err) {
        console.warn('Erro ao excluir no Supabase (fallback local mantido):', err);
      }
    }

    romanticAudio.playPageTurnSound();
    setConfirmDeleteModal({
      isOpen: false,
      memoryId: '',
      memoryTitle: '',
      isLoading: false,
    });

    if (selectedPhoto) {
      setSelectedPhoto(null);
    }

    showToast('Foto removida da linha do tempo com sucesso!');
  };

  const activeMemoriesList = Array.isArray(memoriesList) ? memoriesList : config.memories || [];
  const memories = [...activeMemoriesList].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2D2422] selection:bg-[#F3C4C8] selection:text-[#501D24] pb-24">
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-60 px-5 py-2.5 bg-rose-900 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-rose-100 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToMenu}
            className="p-1.5 rounded-full hover:bg-rose-50 text-rose-900 transition-colors cursor-pointer"
            title="Voltar ao Menu Principal"
          >
            <Home className="w-4 h-4 text-rose-700" />
          </button>
          <span className="font-serif italic text-lg sm:text-xl font-bold text-rose-950">
            Nosso Tempo Juntos
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenNotifications}
            className="p-2 rounded-full bg-white hover:bg-rose-50 text-rose-900 border border-rose-200/60 text-xs shadow-xs cursor-pointer transition-all flex items-center justify-center relative"
            title="Notificações e Alertas do Casal"
          >
            <Bell className="w-3.5 h-3.5 text-rose-700" />
          </button>

          <button
            onClick={onOpenInviteModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold shadow-xs cursor-pointer transition-all whitespace-nowrap"
            title="Mandar convite para ela pelo WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Convidar no WhatsApp</span>
          </button>

          <button
            onClick={onOpenLetters}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-900 hover:bg-rose-800 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Ver Nossas Cartas</span>
          </button>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-3 text-rose-600">
          <Heart className="w-4 h-4 fill-rose-500 animate-pulse" />
          <span className="font-script text-2xl sm:text-3xl text-rose-800">
            {config.senderName} & {config.recipientName}
          </span>
          <Heart className="w-4 h-4 fill-rose-500 animate-pulse" />
        </div>

        <h1 className="font-serif text-2xl sm:text-4xl font-bold text-rose-950 tracking-tight mb-2 [text-wrap:balance]">
          Tempo Compartilhando o Amor
        </h1>
        <p className="font-sans text-xs sm:text-sm text-neutral-600 max-w-md mx-auto mb-8">
          Cada segundo ao seu lado é uma memória eterna guardada no coração.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 max-w-2xl mx-auto mb-6">
          <div className="p-4 rounded-2xl bg-white border border-rose-200/80 shadow-xs flex flex-col items-center">
            <span className="font-serif font-bold text-2xl sm:text-3xl text-rose-900 tabular-nums">
              {timeTogether.years}
            </span>
            <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-neutral-500 mt-1">
              {timeTogether.years === 1 ? 'Ano' : 'Anos'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-rose-200/80 shadow-xs flex flex-col items-center">
            <span className="font-serif font-bold text-2xl sm:text-3xl text-rose-900 tabular-nums">
              {timeTogether.months}
            </span>
            <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-neutral-500 mt-1">
              {timeTogether.months === 1 ? 'Mês' : 'Meses'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-rose-200/80 shadow-xs flex flex-col items-center">
            <span className="font-serif font-bold text-2xl sm:text-3xl text-rose-900 tabular-nums">
              {timeTogether.days}
            </span>
            <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-neutral-500 mt-1">
              Dias
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-rose-200/80 shadow-xs flex flex-col items-center">
            <span className="font-serif font-bold text-2xl sm:text-3xl text-rose-900 tabular-nums">
              {String(timeTogether.hours).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-neutral-500 mt-1">
              Horas
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-rose-200/80 shadow-xs flex flex-col items-center">
            <span className="font-serif font-bold text-2xl sm:text-3xl text-rose-900 tabular-nums">
              {String(timeTogether.minutes).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-neutral-500 mt-1">
              Minutos
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 shadow-xs flex flex-col items-center">
            <span className="font-serif font-bold text-2xl sm:text-3xl text-rose-600 tabular-nums animate-pulse">
              {String(timeTogether.seconds).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-rose-700 mt-1 font-semibold">
              Segundos
            </span>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 text-rose-900 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-rose-600" />
          <span>
            Já são <strong className="tabular-nums">{timeTogether.totalDays} dias</strong> de pura cumplicidade e felicidade!
          </span>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex items-center justify-between pb-6 border-b border-rose-200/60">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-rose-950">
              Nossa Linha do Tempo de Fotos
            </h2>
            <p className="text-xs text-neutral-500">
              Registros fotográficos sincronizados na nuvem em tempo real.
            </p>
          </div>

          <button
            onClick={() => setIsAddMemoryOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-900 hover:bg-rose-800 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Foto / Memória</span>
          </button>
        </div>

        {memories.length === 0 ? (
          <div className="text-center py-14 px-6 rounded-3xl bg-white border border-dashed border-rose-200 mt-8 shadow-xs">
            <Heart className="w-10 h-10 text-rose-300 mx-auto mb-3" />
            <h3 className="font-serif text-xl text-rose-950 font-bold mb-1">
              Nenhuma foto na linha do tempo ainda
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto mb-5 leading-relaxed">
              Guarde os momentos mais especiais de vocês dois com datas marcantes e legendas românticas.
            </p>
            <button
              onClick={() => setIsAddMemoryOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-900 hover:bg-rose-800 text-white text-xs font-semibold shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Primeira Foto</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-6 mt-8">
            {memories.map((mem) => {
              const dateObj = new Date(mem.date);
              const formattedDate = !isNaN(dateObj.getTime())
                ? dateObj.toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : mem.date;

              return (
                <motion.article
                  key={mem.id}
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-3xl border border-rose-200/70 shadow-xs hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div
                    className="relative aspect-4/3 w-full bg-neutral-900 overflow-hidden cursor-pointer group"
                    onClick={() => setSelectedPhoto(mem.photoUrl)}
                  >
                    <img
                      src={mem.photoUrl}
                      alt={mem.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="p-2 rounded-full bg-white/90 text-neutral-900 shadow-md">
                        <Maximize2 className="w-4 h-4" />
                      </span>
                    </div>

                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-xs text-rose-950 text-xs font-serif font-bold shadow-xs flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-rose-600" />
                      <span>{formattedDate}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        requestDeleteMemory(mem.id, mem.title);
                      }}
                      title="Remover esta foto da linha do tempo"
                      aria-label="Remover foto"
                      className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-rose-50 text-neutral-600 hover:text-rose-600 shadow-md transition-all cursor-pointer backdrop-blur-xs hover:scale-110 active:scale-95 z-10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif font-bold text-base sm:text-lg text-rose-950">
                        {mem.title}
                      </h3>
                      {mem.location && (
                        <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-500" />
                          <span>{mem.location}</span>
                        </span>
                      )}
                    </div>

                    {mem.caption && (
                      <p className="font-sans text-xs sm:text-sm text-neutral-700 leading-relaxed italic bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                        "{mem.caption}"
                      </p>
                    )}

                    <div className="pt-2 flex items-center justify-between text-[11px] text-neutral-400 border-t border-rose-100/60">
                      <span>Guardado com amor por {mem.author}</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => requestDeleteMemory(mem.id, mem.title)}
                          className="inline-flex items-center gap-1 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer text-[11px] font-medium"
                          title="Remover foto"
                        >
                          <Trash2 className="w-3 h-3 text-rose-500/70" />
                          <span>Remover</span>
                        </button>
                        <Heart className="w-3 h-3 fill-rose-400 text-rose-400" />
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>

      <AnimatePresence>
        {isAddMemoryOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FCF9F3] border border-amber-200 rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setIsAddMemoryOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <form onSubmit={handleSaveMemory} className="space-y-4">
                <div className="border-b border-amber-200 pb-3">
                  <h3 className="font-serif text-xl font-bold text-rose-950 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-rose-600" />
                    Adicionar Foto à Linha do Tempo
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Guarde uma fotografia com data exata e legenda romântica sincronizada em tempo real.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Quem está publicando este momento?
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setNewAuthor('he')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        newAuthor === 'he'
                          ? 'bg-rose-900 text-white border-rose-900 shadow-xs ring-2 ring-rose-300'
                          : 'bg-white text-neutral-700 border-neutral-300 hover:bg-rose-50'
                      }`}
                    >
                      <span>🤵🏻 {config.heUser?.name || 'Leo'}</span>
                      {newAuthor === 'he' && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAuthor('she')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        newAuthor === 'she'
                          ? 'bg-rose-900 text-white border-rose-900 shadow-xs ring-2 ring-rose-300'
                          : 'bg-white text-neutral-700 border-neutral-300 hover:bg-rose-50'
                      }`}
                    >
                      <span>👰🏻‍♀️ {config.sheUser?.name || 'Meu Amor'}</span>
                      {newAuthor === 'she' && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Título da Memória
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={300}
                      placeholder="Ex: Piquenique no Parque"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Data do Momento
                    </label>
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Localização (Opcional)
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    placeholder="Ex: Rio de Janeiro · Praia de Ipanema"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Legenda da Foto
                  </label>
                  <textarea
                    rows={3}
                    required
                    maxLength={5000}
                    placeholder="Escreva a legenda desse momento especial..."
                    value={newCaption}
                    onChange={(e) => setNewCaption(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 leading-relaxed"
                  />
                </div>

                <div className="pt-2 border-t border-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-neutral-700">Foto</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium hover:bg-rose-100 cursor-pointer disabled:opacity-50"
                      >
                        {isUploadingPhoto ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Enviando...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3 h-3" />
                            <span>Enviar do Dispositivo</span>
                          </>
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-500 mb-1.5">Ou escolha uma foto de acervo:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {presetPhotos.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewPhotoUrl(preset.url)}
                        className={`rounded-lg overflow-hidden border aspect-square relative cursor-pointer ${
                          newPhotoUrl === preset.url ? 'ring-2 ring-rose-600' : 'border-amber-200'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] p-0.5 truncate text-center">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  {newPhotoUrl && (
                    <div className="mt-3 p-2 bg-white rounded-xl border border-rose-200 flex items-center gap-3">
                      <img
                        src={newPhotoUrl}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 object-cover rounded-lg"
                      />
                      <span className="text-xs text-rose-900 font-medium">Foto selecionada com sucesso!</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-amber-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddMemoryOpen(false)}
                    className="px-4 py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 text-xs font-medium cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingMemory || isUploadingPhoto}
                    className="px-6 py-2 rounded-xl bg-rose-900 hover:bg-rose-800 text-white text-xs font-semibold shadow-xs hover:shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSavingMemory ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Salvando na Nuvem...</span>
                      </>
                    ) : (
                      <span>Salvar na Linha do Tempo</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              aria-label="Fechar foto ampliada"
              className="absolute top-6 right-6 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={selectedPhoto}
              alt="Foto ampliada"
              referrerPolicy="no-referrer"
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            {(() => {
              const matchedMem = memories.find((m) => m.photoUrl === selectedPhoto);
              if (!matchedMem) return null;
              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    requestDeleteMemory(matchedMem.id, matchedMem.title);
                  }}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full bg-rose-950/85 hover:bg-rose-900 text-white text-xs font-semibold shadow-lg backdrop-blur-md flex items-center gap-2 border border-rose-500/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                  <span>Remover esta foto da Linha do Tempo</span>
                </button>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={confirmDeleteModal.isOpen}
        title="Remover Foto da Linha do Tempo?"
        description="Esta foto e momento especial serão excluídos do álbum e sincronizados na nuvem em tempo real."
        detail={confirmDeleteModal.memoryTitle}
        confirmText="Sim, Remover Foto"
        cancelText="Cancelar"
        isDestructive={true}
        isLoading={confirmDeleteModal.isLoading}
        iconType="trash"
        requireCoupleAuth={false}
        config={config}
        onConfirm={handleExecuteDeleteMemory}
        onClose={() =>
          setConfirmDeleteModal({
            isOpen: false,
            memoryId: '',
            memoryTitle: '',
            isLoading: false,
          })
        }
      />
    </div>
  );
}
