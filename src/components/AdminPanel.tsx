import { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Edit3,
  Eye,
  Save,
  Upload,
  Check,
  Download,
  UploadCloud,
  RefreshCw,
  Sparkles,
  Lock,
  Shield,
  Loader2,
  Mail,
  Key,
  Database,
} from 'lucide-react';
import {
  Letter,
  AlbumConfig,
  EntranceAnimation,
  BackgroundTheme,
  ImageStyle,
  TimelineMemory,
} from '../types/letter';
import { exportBackupData, importBackupData, resetToDefaults } from '../utils/storage';
import {
  supabase,
  uploadImageToSupabaseStorage,
  isUserAdmin,
  BOOTSTRAP_ADMIN_EMAIL,
  formatSupabaseAuthError,
  AuthErrorInfo,
  SupabaseAuthUser,
  SUPABASE_SQL_SETUP_SCRIPT,
  isSupabaseConfigured,
} from '../utils/supabase';
import {
  migrateLocalStorageToSupabase,
  deleteLetterFromSupabase,
  saveLetterToSupabase,
  saveAllLettersToSupabase,
  seedInitialDataIfEmpty,
} from '../utils/supabaseService';
import { triggerLoveAlert } from '../utils/notifications';
import ConfirmationModal from './ConfirmationModal';
import { coffeeImg, flowersImg, coupleSunsetImg, starlitNightImg } from '../assets/images';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  letters: Letter[];
  config: AlbumConfig;
  memories?: TimelineMemory[];
  activeUser?: 'he' | 'she' | null;
  initialTab?: 'letters' | 'editor' | 'settings' | 'backup';
  onSaveLetters: (updated: Letter[]) => void;
  onSaveConfig: (updated: AlbumConfig) => void;
  currentUser?: SupabaseAuthUser | null;
}

export default function AdminPanel({
  isOpen,
  onClose,
  letters,
  config,
  memories = [],
  activeUser = null,
  initialTab = 'letters',
  onSaveLetters,
  onSaveConfig,
  currentUser = null,
}: AdminPanelProps) {
  const [authError, setAuthError] = useState<AuthErrorInfo | null>(null);
  const [authMethod, setAuthMethod] = useState<'couple' | 'email'>('couple');
  const [emailInput, setEmailInput] = useState('zeeremlk@gmail.com');
  const [passwordInput, setPasswordInput] = useState('');
  const [couplePasswordInput, setCouplePasswordInput] = useState('');
  const [couplePasswordError, setCouplePasswordError] = useState('');
  const [unlockedWithCouplePass, setUnlockedWithCouplePass] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    detail?: string;
    confirmText: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Confirmar',
    onConfirm: () => {},
  });

  const isAuthorized =
    unlockedWithCouplePass ||
    Boolean(activeUser) ||
    isUserAdmin(currentUser, config.authorizedEmails);

  const [activeTab, setActiveTab] = useState<'letters' | 'editor' | 'settings' | 'backup'>(initialTab);
  const [editingLetter, setEditingLetter] = useState<Letter | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (initialTab === 'editor' && !editingLetter) {
        const isShe = activeUser === 'she';
        const authorId: 'he' | 'she' = isShe ? 'she' : 'he';
        const authorName = isShe
          ? config.sheUser?.name || 'Meu Amor'
          : config.heUser?.name || config.senderName || 'Leo';
        const recipientName = isShe
          ? config.heUser?.name || config.senderName || 'Leo'
          : config.sheUser?.name || config.recipientName || 'Meu Amor';

        const newLetter: Letter = {
          id: 'letter-' + Date.now(),
          order: letters.length + 1,
          title: 'Título da Carta',
          subtitle: 'Um momento especial para nós dois',
          date: 'Hoje',
          highlightPhrase: 'Você é a minha melhor escolha de todos os dias.',
          content: 'Escreva aqui as suas palavras de amor...',
          signature: `Com amor, ${authorName}`,
          emoji: '💌',
          images: [],
          animationIn: 'fade',
          backgroundTheme: 'cream-paper',
          particleType: 'hearts',
          particleIntensity: 'gentle',
          imagePosition: 'side-right',
          published: true,
          isFinalLetter: false,
          postType: 'letter',
          location: 'No meu coração',
          isPinned: false,
          likesCount: 0,
          likedBy: [],
          authorId,
          authorName,
          recipientName,
          comments: [],
        };
        setEditingLetter(newLetter);
      }
    }
  }, [isOpen, initialTab]);

  const presetPhotos = [
    { name: 'Café a Dois', url: coffeeImg },
    { name: 'Buquê de Flores', url: flowersImg },
    { name: 'Pôr do Sol Mágico', url: coupleSunsetImg },
    { name: 'Céu Estrelado', url: starlitNightImg },
  ];

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopySqlScript = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP_SCRIPT);
    setCopiedSql(true);
    showToast('Script SQL para o Supabase copiado!');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleEmailLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailInput.trim() || !passwordInput.trim()) {
      setAuthError({
        code: 'auth/missing-fields',
        message: 'Preencha o e-mail e a senha do autor.',
      });
      return;
    }

    if (!supabase || !isSupabaseConfigured()) {
      setAuthError(formatSupabaseAuthError(null));
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput.trim(),
        password: passwordInput.trim(),
      });
      if (error) throw error;
      if (data.user && isUserAdmin(data.user, config.authorizedEmails)) {
        showToast('Bem-vindo, autor!');
      } else {
        setUnlockedWithCouplePass(true);
        showToast('Conectado via Supabase Auth!');
      }
    } catch (err: any) {
      setAuthError(formatSupabaseAuthError(err));
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleEmailRegister = async () => {
    if (!emailInput.trim() || !passwordInput.trim()) {
      setAuthError({
        code: 'auth/missing-fields',
        message: 'Digite o e-mail e uma senha de no mínimo 6 caracteres para cadastrar.',
      });
      return;
    }
    if (passwordInput.length < 6) {
      setAuthError({
        code: 'auth/weak-password',
        message: 'A senha no Supabase precisa ter pelo menos 6 caracteres.',
      });
      return;
    }

    if (!supabase || !isSupabaseConfigured()) {
      setAuthError(formatSupabaseAuthError(null));
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailInput.trim(),
        password: passwordInput.trim(),
      });
      if (error) throw error;
      if (data.user) {
        setUnlockedWithCouplePass(true);
        showToast('Conta de autor criada com sucesso no Supabase!');
      }
    } catch (err: any) {
      setAuthError(formatSupabaseAuthError(err));
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSupabaseLogout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      showToast('Desconectado com sucesso.');
    } catch {}
  };

  const handleCreateNew = () => {
    const isShe = activeUser === 'she';
    const authorId: 'he' | 'she' = isShe ? 'she' : 'he';
    const authorName = isShe
      ? config.sheUser?.name || 'Meu Amor'
      : config.heUser?.name || config.senderName || 'Leo';
    const recipientName = isShe
      ? config.heUser?.name || config.senderName || 'Leo'
      : config.sheUser?.name || config.recipientName || 'Meu Amor';

    const newLetter: Letter = {
      id: 'letter-' + Date.now(),
      order: letters.length + 1,
      title: 'Título da Carta',
      subtitle: 'Um momento especial para nós dois',
      date: 'Hoje',
      highlightPhrase: 'Você é a minha melhor escolha de todos os dias.',
      content: 'Escreva aqui as suas palavras de amor...',
      signature: `Com amor, ${authorName}`,
      emoji: '💌',
      images: [],
      animationIn: 'fade',
      backgroundTheme: 'cream-paper',
      particleType: 'hearts',
      particleIntensity: 'gentle',
      imagePosition: 'side-right',
      published: true,
      isFinalLetter: false,
      postType: 'letter',
      location: 'No meu coração',
      isPinned: false,
      likesCount: 0,
      likedBy: [],
      authorId,
      authorName,
      recipientName,
      comments: [],
    };
    setEditingLetter(newLetter);
    setActiveTab('editor');
  };

  const handleEdit = (letter: Letter) => {
    setEditingLetter(JSON.parse(JSON.stringify(letter)));
    setActiveTab('editor');
  };

  const handleDuplicate = async (letter: Letter) => {
    const copy: Letter = {
      ...JSON.parse(JSON.stringify(letter)),
      id: 'letter-' + Date.now(),
      title: `${letter.title} (Cópia)`.slice(0, 200),
      order: letters.length + 1,
    };
    const updated = [...letters, copy];
    onSaveLetters(updated);
    try {
      await saveLetterToSupabase(copy);
    } catch (err) {
      console.warn('Erro ao salvar cópia no Supabase:', err);
    }
    showToast('Carta duplicada com sucesso!');
  };

  const requestDeleteLetter = (letter: Letter) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Excluir esta Carta de Amor?',
      description: 'Esta carta será removida permanentemente do álbum em todos os dispositivos.',
      detail: letter.title,
      confirmText: 'Sim, Excluir Carta',
      onConfirm: async () => {
        const updated = letters
          .filter((l) => l.id !== letter.id)
          .map((l, idx) => ({ ...l, order: idx + 1 }));
        onSaveLetters(updated);
        try {
          await deleteLetterFromSupabase(letter.id);
        } catch (err) {
          console.warn('Erro ao excluir no Supabase:', err);
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('Carta removida.');
      },
    });
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= letters.length) return;

    const list = [...letters];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    const reordered = list.map((item, idx) => ({ ...item, order: idx + 1 }));
    onSaveLetters(reordered);
    try {
      await saveAllLettersToSupabase(reordered);
    } catch (err) {
      console.warn('Erro ao reordenar no Supabase:', err);
    }
  };

  const handleTogglePublish = async (id: string) => {
    const target = letters.find((l) => l.id === id);
    if (!target) return;
    const toggled = { ...target, published: !target.published };
    const updated = letters.map((l) => (l.id === id ? toggled : l));
    onSaveLetters(updated);
    try {
      await saveLetterToSupabase(toggled);
    } catch (err) {
      console.warn('Erro ao atualizar publicação no Supabase:', err);
    }

    if (toggled.published) {
      triggerLoveAlert({
        type: 'new_letter',
        title: `💌 Nova Carta: ${toggled.title}`,
        message: 'Uma nova carta de amor foi publicada para você!',
        targetView: 'letters',
      });
    }
  };

  const handleSaveEditor = async () => {
    if (!editingLetter) return;
    const exists = letters.some((l) => l.id === editingLetter.id);
    let updated: Letter[];
    if (exists) {
      updated = letters.map((l) => (l.id === editingLetter.id ? editingLetter : l));
    } else {
      updated = [...letters, editingLetter];
    }
    updated.sort((a, b) => a.order - b.order);
    onSaveLetters(updated);

    try {
      await saveLetterToSupabase(editingLetter);
    } catch (err) {
      console.warn('Erro ao salvar no Supabase (mantendo local):', err);
    }

    if (editingLetter.published) {
      triggerLoveAlert({
        type: 'new_letter',
        title: `💌 Carta Compartilhada: ${editingLetter.title}`,
        message: 'Seu amor acabou de publicar uma nova carta no álbum!',
        targetView: 'letters',
      });
    }

    showToast('Carta salva e sincronizada com sucesso!');
    setActiveTab('letters');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingLetter) return;

    setIsUploadingPhoto(true);
    try {
      const storageUrl = await uploadImageToSupabaseStorage(file, 'letters');
      const newImageItem = {
        id: 'img-' + Date.now(),
        url: storageUrl,
        caption: 'Nossa memória especial',
        style: 'polaroid' as ImageStyle,
      };
      setEditingLetter({
        ...editingLetter,
        images: [...(editingLetter.images || []), newImageItem],
      });
      showToast('Foto carregada e pronta na carta!');
    } catch {
      showToast('Falha no upload da foto.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportBackupData(letters, config, memories);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cartas_de_amor_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup exportado com sucesso!');
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const result = evt.target?.result as string;
      const res = await importBackupData(result, true);
      showToast(res.message);
    };
    reader.readAsText(file);
    if (backupInputRef.current) backupInputRef.current.value = '';
  };

  const handleMigrateLocalStorage = async () => {
    setIsMigrating(true);
    setMigrationStatus(null);
    try {
      const res = await migrateLocalStorageToSupabase();
      setMigrationStatus(res.message);
      showToast(res.message);
    } catch (err: any) {
      setMigrationStatus(`Erro: ${err?.message || String(err)}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const requestResetDefaults = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Restaurar Cartas Iniciais?',
      description: 'Isso redefinirá o álbum para as 5 cartas e fotos românticas de exemplo originais no Supabase.',
      confirmText: 'Sim, Restaurar Padrões',
      onConfirm: async () => {
        const res = resetToDefaults();
        onSaveLetters(res.letters);
        onSaveConfig(res.config);
        try {
          await seedInitialDataIfEmpty();
        } catch {}
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('Restaurado para as cartas originais!');
      },
    });
  };

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-[#FCF9F3] border border-amber-200 shadow-2xl p-6 sm:p-8 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-rose-950 mb-1">Painel do Autor</h2>
          <p className="font-sans text-xs text-neutral-600 mb-6">
            Entre com a senha do casal ou com sua conta Supabase Auth para gerenciar o álbum.
          </p>

          {currentUser ? (
            <div className="space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-left">
                <p className="text-xs font-semibold text-red-900">Conta não autorizada</p>
                <p className="text-[11px] text-red-700 mt-0.5">
                  Conectado como <strong>{currentUser.email}</strong>, mas este e-mail não tem permissão de edição.
                </p>
                <p className="text-[11px] text-neutral-600 mt-2">
                  E-mail do autor administrador: <strong className="font-mono text-rose-900">{BOOTSTRAP_ADMIN_EMAIL}</strong>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSupabaseLogout}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-semibold hover:bg-neutral-100 cursor-pointer"
                >
                  Desconectar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 p-1 bg-amber-100/70 rounded-xl text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('couple');
                    setAuthError(null);
                  }}
                  className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    authMethod === 'couple'
                      ? 'bg-white text-rose-950 font-bold shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Senha do Casal</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('email');
                    setAuthError(null);
                  }}
                  className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    authMethod === 'email'
                      ? 'bg-white text-rose-950 font-bold shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Supabase Auth</span>
                </button>
              </div>

              {authMethod === 'couple' ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = couplePasswordInput.trim().toLowerCase();
                    const validPasswords = [
                      (config.heUser?.password || 'leo').toLowerCase(),
                      (config.sheUser?.password || 'amor').toLowerCase(),
                      (config.adminPassword || 'amor').toLowerCase(),
                    ];
                    if (validPasswords.includes(trimmed)) {
                      setUnlockedWithCouplePass(true);
                      setCouplePasswordError('');
                      showToast('Acesso ao painel liberado!');
                    } else {
                      setCouplePasswordError('Senha incorreta. Use a senha de Leo (leo) ou Meu Amor (amor).');
                    }
                  }}
                  className="space-y-3 text-left"
                >
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Senha do Casal (ou Chave de Administrador)
                    </label>
                    <input
                      type="password"
                      maxLength={100}
                      value={couplePasswordInput}
                      onChange={(e) => {
                        setCouplePasswordInput(e.target.value);
                        setCouplePasswordError('');
                      }}
                      autoFocus
                      placeholder="Ex: amor ou leo..."
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white text-xs text-center font-mono focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                    {couplePasswordError && (
                      <p className="text-xs text-rose-600 font-medium text-center mt-1">
                        {couplePasswordError}
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all"
                  >
                    Entrar no Painel do Autor
                  </button>
                </form>
              ) : (
                <form onSubmit={handleEmailLogin} className="space-y-3 text-left">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      E-mail do Autor (Supabase)
                    </label>
                    <input
                      type="email"
                      maxLength={200}
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="zeeremlk@gmail.com"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Senha no Supabase Auth
                    </label>
                    <input
                      type="password"
                      maxLength={100}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Mínimo 6 caracteres..."
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isAuthenticating}
                      className="flex-1 py-2.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      {isAuthenticating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Entrando...</span>
                        </>
                      ) : (
                        <>
                          <Key className="w-3.5 h-3.5" />
                          <span>Entrar</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleEmailRegister}
                      disabled={isAuthenticating}
                      className="py-2.5 px-3 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold cursor-pointer disabled:opacity-60"
                    >
                      Cadastrar no Supabase
                    </button>
                  </div>
                </form>
              )}

              {authError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-left">
                  <p className="text-xs text-rose-700 font-medium">{authError.message}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-amber-200/60 text-center">
            <button
              onClick={onClose}
              className="text-xs text-neutral-500 hover:text-neutral-800 cursor-pointer"
            >
              Voltar ao Álbum
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-[#FAF7F2] rounded-2xl shadow-2xl border border-amber-200/80 flex flex-col max-h-[92vh] overflow-hidden">
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-60 px-4 py-2 bg-rose-900 text-white text-xs font-medium rounded-full shadow-lg flex items-center gap-2 animate-bounce">
            <Check className="w-3.5 h-3.5" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-200/60 bg-white/70">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-600" />
            <h2 className="font-serif text-lg font-bold text-rose-950">Painel do Autor das Cartas</h2>
            <span className="hidden sm:inline-flex items-center gap-1 text-rose-900 text-[11px] font-semibold">
              · {activeUser === 'she' ? `👰🏻‍♀️ ${config.sheUser?.name || 'Ela'}` : `🤵🏻 ${config.heUser?.name || 'Leo'}`}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-amber-100/50 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setActiveTab('letters')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'letters' ? 'bg-white text-rose-900 shadow-xs' : 'text-neutral-600 hover:text-rose-900'
              }`}
            >
              Minhas Cartas ({letters.length})
            </button>
            <button
              onClick={() => {
                if (!editingLetter && letters.length > 0) {
                  setEditingLetter(JSON.parse(JSON.stringify(letters[0])));
                }
                setActiveTab('editor');
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'editor' ? 'bg-white text-rose-900 shadow-xs' : 'text-neutral-600 hover:text-rose-900'
              }`}
            >
              Editor Visual
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'settings' ? 'bg-white text-rose-900 shadow-xs' : 'text-neutral-600 hover:text-rose-900'
              }`}
            >
              Configurações
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'backup' ? 'bg-white text-rose-900 shadow-xs' : 'text-neutral-600 hover:text-rose-900'
              }`}
            >
              Supabase / Backup
            </button>
          </div>

          <button
            onClick={onClose}
            aria-label="Fechar painel"
            className="p-1.5 rounded-full hover:bg-neutral-200/60 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'letters' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-serif text-lg font-bold text-rose-950">Suas Cartas e Lembranças</h3>
                  <p className="text-xs text-neutral-500">
                    Organize a ordem em que sua namorada lerá a história.
                  </p>
                </div>
                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-900 hover:bg-rose-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Nova Carta
                </button>
              </div>

              <div className="space-y-2.5">
                {letters.map((letter, index) => (
                  <div
                    key={letter.id}
                    className="p-4 rounded-xl bg-white border border-amber-200/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-rose-300 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMoveOrder(index, 'up')}
                          disabled={index === 0}
                          className="p-1 rounded bg-neutral-100 hover:bg-neutral-200 disabled:opacity-30 cursor-pointer"
                          title="Mover para cima"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMoveOrder(index, 'down')}
                          disabled={index === letters.length - 1}
                          className="p-1 rounded bg-neutral-100 hover:bg-neutral-200 disabled:opacity-30 cursor-pointer"
                          title="Mover para baixo"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-800 flex items-center justify-center font-serif font-bold text-sm tabular-nums">
                        {letter.order}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{letter.emoji}</span>
                          <h4 className="font-serif font-bold text-rose-950 text-sm sm:text-base">
                            {letter.title}
                          </h4>
                          {letter.isFinalLetter && (
                            <span className="text-[11px] font-sans font-semibold text-amber-800">
                              · Carta Final
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-1">{letter.subtitle || letter.content}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                      <button
                        onClick={() => handleTogglePublish(letter.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium cursor-pointer ${
                          letter.published
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                        }`}
                      >
                        {letter.published ? 'Publicada' : 'Rascunho'}
                      </button>

                      <button
                        onClick={() => handleEdit(letter)}
                        className="p-2 rounded-lg bg-neutral-100 hover:bg-rose-100 text-neutral-700 hover:text-rose-900 transition-colors cursor-pointer"
                        title="Editar carta"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDuplicate(letter)}
                        className="p-2 rounded-lg bg-neutral-100 hover:bg-amber-100 text-neutral-700 hover:text-amber-900 transition-colors cursor-pointer"
                        title="Duplicar carta"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => requestDeleteLetter(letter)}
                        disabled={letters.length <= 1}
                        className="p-2 rounded-lg bg-neutral-100 hover:bg-rose-100 text-neutral-500 hover:text-rose-700 transition-colors disabled:opacity-30 cursor-pointer"
                        title="Excluir carta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'editor' && editingLetter && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-rose-950">
                    Editando: {editingLetter.title}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Acompanhe a pré-visualização ao vivo à direita conforme edita.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('letters')}
                    className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleSaveEditor}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-rose-900 hover:bg-rose-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar Carta
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-4 bg-white p-5 rounded-2xl border border-amber-200/70 shadow-xs">
                  <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-200/80">
                    <label className="block text-xs font-bold text-rose-950 mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                      Quem está criando e publicando esta carta?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const he = config.heUser?.name || config.senderName || 'Leo';
                          const she = config.sheUser?.name || config.recipientName || 'Meu Amor';
                          setEditingLetter({
                            ...editingLetter,
                            authorId: 'he',
                            authorName: he,
                            recipientName: she,
                            signature: `Com todo o meu amor, ${he}`,
                          });
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          (editingLetter.authorId || 'he') === 'he'
                            ? 'bg-rose-900 text-white border-rose-900 shadow-xs ring-2 ring-rose-300'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        <span>🤵🏻 {config.heUser?.name || 'Leo'} (Ele para Ela)</span>
                        {(editingLetter.authorId || 'he') === 'he' && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const he = config.heUser?.name || config.senderName || 'Leo';
                          const she = config.sheUser?.name || config.recipientName || 'Meu Amor';
                          setEditingLetter({
                            ...editingLetter,
                            authorId: 'she',
                            authorName: she,
                            recipientName: he,
                            signature: `Com todo o meu amor, ${she}`,
                          });
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          editingLetter.authorId === 'she'
                            ? 'bg-rose-900 text-white border-rose-900 shadow-xs ring-2 ring-rose-300'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        <span>👰🏻‍♀️ {config.sheUser?.name || 'Meu Amor'} (Ela para Ele)</span>
                        {editingLetter.authorId === 'she' && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">Título</label>
                      <input
                        type="text"
                        maxLength={200}
                        value={editingLetter.title}
                        onChange={(e) => setEditingLetter({ ...editingLetter, title: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-rose-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">Subtítulo</label>
                      <input
                        type="text"
                        maxLength={500}
                        value={editingLetter.subtitle}
                        onChange={(e) => setEditingLetter({ ...editingLetter, subtitle: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-rose-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">Data / Momento</label>
                      <input
                        type="text"
                        maxLength={100}
                        value={editingLetter.date}
                        onChange={(e) => setEditingLetter({ ...editingLetter, date: e.target.value })}
                        placeholder="Ex: 14 de Outubro"
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-rose-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">Emoji</label>
                      <input
                        type="text"
                        maxLength={20}
                        value={editingLetter.emoji}
                        onChange={(e) => setEditingLetter({ ...editingLetter, emoji: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-rose-400 focus:outline-none text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">Assinatura</label>
                      <input
                        type="text"
                        maxLength={200}
                        value={editingLetter.signature}
                        onChange={(e) => setEditingLetter({ ...editingLetter, signature: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-rose-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Localização na Carta
                    </label>
                    <input
                      type="text"
                      maxLength={200}
                      value={editingLetter.location || ''}
                      onChange={(e) => setEditingLetter({ ...editingLetter, location: e.target.value })}
                      placeholder="Ex: Café Paris · Nosso Encontro"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-rose-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Frase em Destaque
                    </label>
                    <input
                      type="text"
                      maxLength={500}
                      value={editingLetter.highlightPhrase || ''}
                      onChange={(e) => setEditingLetter({ ...editingLetter, highlightPhrase: e.target.value })}
                      placeholder="Ex: Se eu pudesse escolher novamente..."
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-rose-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Texto Principal da Carta
                    </label>
                    <textarea
                      rows={6}
                      maxLength={50000}
                      value={editingLetter.content}
                      onChange={(e) => setEditingLetter({ ...editingLetter, content: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-rose-400 focus:outline-none leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">Tema de Fundo</label>
                      <select
                        value={editingLetter.backgroundTheme}
                        onChange={(e) =>
                          setEditingLetter({ ...editingLetter, backgroundTheme: e.target.value as BackgroundTheme })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white focus:outline-none"
                      >
                        <option value="cream-paper">Creme Pergaminho Clássico</option>
                        <option value="soft-rose">Rosa Orvalho Romântico</option>
                        <option value="starlit-night">Céu Estrelado & Noite Mágica</option>
                        <option value="vintage-warm">Ouro & Pôr do Sol Vintage</option>
                        <option value="pure-elegance">Elegância Minimalista</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">Animação de Entrada</label>
                      <select
                        value={editingLetter.animationIn}
                        onChange={(e) =>
                          setEditingLetter({ ...editingLetter, animationIn: e.target.value as EntranceAnimation })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white focus:outline-none"
                      >
                        <option value="paper-unfold">Desdobrar Papel / Envelope</option>
                        <option value="fade">Fade Suave</option>
                        <option value="zoom">Zoom Suave</option>
                        <option value="slide-up">Slide para Cima</option>
                        <option value="word-by-word">Palavra por Palavra</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 border-t space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-neutral-700">Fotos da Carta</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingPhoto}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isUploadingPhoto ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Enviando...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3 h-3" />
                              <span>Enviar Imagem</span>
                            </>
                          )}
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/50">
                      <p className="text-[11px] text-amber-900 font-medium mb-1.5">
                        Fotos de acervo romântico:
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {presetPhotos.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const newImg = {
                                id: 'preset-' + Date.now(),
                                url: preset.url,
                                caption: preset.name,
                                style: 'polaroid' as ImageStyle,
                              };
                              setEditingLetter({
                                ...editingLetter,
                                images: [...editingLetter.images, newImg],
                              });
                              showToast(`Foto "${preset.name}" adicionada!`);
                            }}
                            className="group relative rounded-lg overflow-hidden border border-amber-200 aspect-square hover:scale-105 transition-transform cursor-pointer"
                          >
                            <img
                              src={preset.url}
                              alt={preset.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[9px] text-white p-0.5 text-center truncate">
                              {preset.name}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Ou cole o link direto de uma foto..."
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-neutral-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-rose-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (imageUrlInput.trim()) {
                            const newImg = {
                              id: 'img-' + Date.now(),
                              url: imageUrlInput.trim(),
                              caption: 'Nossa memória',
                              style: 'polaroid' as ImageStyle,
                            };
                            setEditingLetter({
                              ...editingLetter,
                              images: [...editingLetter.images, newImg],
                            });
                            setImageUrlInput('');
                            showToast('Foto adicionada por link!');
                          }
                        }}
                        disabled={!imageUrlInput.trim()}
                        className="px-3 py-1.5 bg-rose-900 hover:bg-rose-800 text-white rounded-xl text-xs font-semibold disabled:opacity-40 cursor-pointer transition-colors"
                      >
                        Inserir Link
                      </button>
                    </div>

                    {editingLetter.images.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {editingLetter.images.map((img, i) => (
                          <div
                            key={img.id}
                            className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between gap-3 text-xs"
                          >
                            <img
                              src={img.url}
                              alt="Thumbnail"
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 object-cover rounded-md shrink-0"
                            />
                            <input
                              type="text"
                              placeholder="Legenda da foto..."
                              value={img.caption || ''}
                              onChange={(e) => {
                                const updatedImgs = [...editingLetter.images];
                                updatedImgs[i] = { ...img, caption: e.target.value };
                                setEditingLetter({ ...editingLetter, images: updatedImgs });
                              }}
                              className="w-full px-2 py-1 rounded border border-neutral-200 text-xs bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLetter({
                                  ...editingLetter,
                                  images: editingLetter.images.filter((_, idx) => idx !== i),
                                });
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-5 sticky top-2">
                  <div className="p-3 bg-white/90 rounded-2xl border border-amber-200/80 shadow-md">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-amber-100">
                      <span className="text-xs font-serif font-bold text-rose-950 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-rose-600" />
                        Pré-visualização ao Vivo
                      </span>
                      <span className="text-[10px] text-neutral-400">Como ela verá</span>
                    </div>

                    <div
                      className={`rounded-xl p-5 border text-center transition-all ${
                        editingLetter.backgroundTheme === 'starlit-night'
                          ? 'bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white border-purple-500/20'
                          : editingLetter.backgroundTheme === 'soft-rose'
                          ? 'bg-gradient-to-b from-rose-50 via-rose-100/50 to-rose-200/40 text-rose-950 border-rose-200'
                          : 'bg-[#FCF9F3] text-neutral-800 border-amber-200/60'
                      }`}
                    >
                      <div className="text-xl mb-1">{editingLetter.emoji}</div>
                      <h4 className="font-serif text-lg font-bold mb-1">{editingLetter.title}</h4>
                      {editingLetter.subtitle && (
                        <p className="text-xs opacity-75 mb-3">{editingLetter.subtitle}</p>
                      )}
                      {editingLetter.highlightPhrase && (
                        <div className="p-2.5 rounded-lg bg-rose-500/10 border-l-2 border-rose-500 my-2 text-left">
                          <p className="font-serif italic text-xs leading-relaxed">
                            "{editingLetter.highlightPhrase}"
                          </p>
                        </div>
                      )}
                      <p className="font-sans text-xs leading-relaxed my-3 whitespace-pre-line text-left line-clamp-6 opacity-90">
                        {editingLetter.content}
                      </p>
                      {editingLetter.images.length > 0 && (
                        <div className="my-3">
                          <div className="p-2 bg-white rounded shadow-sm inline-block max-w-[200px]">
                            <img
                              src={editingLetter.images[0].url}
                              alt="Prévia"
                              referrerPolicy="no-referrer"
                              className="w-full aspect-4/3 object-cover rounded-xs"
                            />
                            {editingLetter.images[0].caption && (
                              <p className="text-[10px] font-serif italic text-neutral-600 mt-1 truncate">
                                {editingLetter.images[0].caption}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {editingLetter.signature && (
                        <p className="font-script text-lg text-rose-600 dark:text-rose-300 text-right mt-3">
                          {editingLetter.signature}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-xl mx-auto space-y-4 bg-white p-6 rounded-2xl border border-amber-200 shadow-xs">
              <h3 className="font-serif text-lg font-bold text-rose-950 mb-1">
                Configurações da Experiência
              </h3>
              <p className="text-xs text-neutral-500 mb-4">
                Personalize os nomes, data de início e perfis do casal.
              </p>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nome da Namorada (Destinatária)
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={config.recipientName}
                  onChange={(e) => onSaveConfig({ ...config, recipientName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-rose-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Seu Nome (Autor)
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={config.senderName}
                  onChange={(e) => onSaveConfig({ ...config, senderName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-rose-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Data de Início do Relacionamento (Para o Tempo Juntos)
                </label>
                <input
                  type="date"
                  value={config.relationshipStartDate || '2023-10-14'}
                  onChange={(e) => onSaveConfig({ ...config, relationshipStartDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-rose-400 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t">
                <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200/80 space-y-2 text-left">
                  <div className="flex items-center gap-2 text-rose-950 font-bold text-xs">
                    <Shield className="w-4 h-4 text-rose-700" />
                    <span>Sincronização em Tempo Real (Supabase)</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 leading-relaxed">
                    As cartas, fotos e configurações são sincronizadas automaticamente com as tabelas PostgreSQL do Supabase e salvas localmente.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  onSaveConfig(config);
                  showToast('Configurações salvas e sincronizadas!');
                }}
                className="w-full mt-4 py-2.5 bg-rose-900 text-white rounded-xl text-xs font-semibold hover:bg-rose-800 transition-colors shadow-xs cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="max-w-xl mx-auto space-y-4 bg-white p-6 rounded-2xl border border-amber-200 shadow-xs">
              <h3 className="font-serif text-lg font-bold text-rose-950 mb-1">
                Integração Supabase & Backup
              </h3>

              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-700" />
                    <h4 className="text-xs font-bold text-emerald-950">
                      1. Script SQL de Tabelas & Realtime (Supabase)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySqlScript}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-all"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'SQL Copiado!' : 'Copiar SQL'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  Copie o script SQL acima (também salvo em <code className="font-mono">supabase_schema.sql</code>) e execute no <strong>SQL Editor</strong> do seu projeto Supabase para criar as tabelas <code className="font-mono">letters</code>, <code className="font-mono">album_config</code>, <code className="font-mono">memories</code> e o bucket de fotos <code className="font-mono">album-photos</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                  <h4 className="text-xs font-bold text-neutral-900">
                    2. Sincronizar Dados Locais para o Supabase
                  </h4>
                </div>
                <p className="text-[11px] text-neutral-600">
                  Envie todas as cartas e fotos salvas neste dispositivo para o seu banco Supabase:
                </p>
                <button
                  type="button"
                  onClick={handleMigrateLocalStorage}
                  disabled={isMigrating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-900 hover:bg-amber-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-all"
                >
                  {isMigrating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sincronizando...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Sincronizar com Supabase</span>
                    </>
                  )}
                </button>
                {migrationStatus && (
                  <p className="text-[11px] text-rose-950 font-medium bg-white p-2.5 rounded-lg border border-amber-200">
                    {migrationStatus}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-rose-700" />
                  <h4 className="text-xs font-bold text-neutral-800">Exportar Arquivo de Backup</h4>
                </div>
                <button
                  onClick={handleDownloadBackup}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-900 hover:bg-rose-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar Backup Completo (.json)
                </button>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-amber-700" />
                  <h4 className="text-xs font-bold text-neutral-800">Restaurar de um Arquivo</h4>
                </div>
                <button
                  onClick={() => backupInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Importar Backup para o Supabase
                </button>
                <input
                  ref={backupInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </div>

              <div className="p-4 rounded-xl bg-red-50/60 border border-red-200/60 space-y-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-red-600" />
                  <h4 className="text-xs font-bold text-red-900">Restaurar Cartas de Exemplo</h4>
                </div>
                <button
                  onClick={requestResetDefaults}
                  className="px-3 py-1.5 border border-red-300 text-red-700 hover:bg-red-100 text-xs font-medium rounded-lg cursor-pointer transition-colors"
                >
                  Restaurar Padrões
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        detail={confirmDialog.detail}
        confirmText={confirmDialog.confirmText}
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
