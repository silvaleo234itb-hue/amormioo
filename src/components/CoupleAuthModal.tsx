import { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Heart,
  Eye,
  EyeOff,
  Check,
  Shield,
  LogOut,
} from 'lucide-react';
import { AlbumConfig, CoupleUser } from '../types/letter';
import { romanticAudio } from '../utils/audio';
import { isUserAdmin, SupabaseAuthUser } from '../utils/supabase';

interface CoupleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AlbumConfig;
  activeUser: 'he' | 'she' | null;
  onLogin: (user: 'he' | 'she') => void;
  onLogout: () => void;
  onUpdateConfig: (updated: AlbumConfig) => void;
  currentUser?: SupabaseAuthUser | null;
}

export default function CoupleAuthModal({
  isOpen,
  onClose,
  config,
  activeUser,
  onLogin,
  onLogout,
  onUpdateConfig,
  currentUser = null,
}: CoupleAuthModalProps) {
  const [selectedRole, setSelectedRole] = useState<'he' | 'she'>('he');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isMasterViewOpen, setIsMasterViewOpen] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [isMasterUnlocked, setIsMasterUnlocked] = useState(false);
  const [masterError, setMasterError] = useState('');

  const [editHeName, setEditHeName] = useState(config.heUser?.name || 'Leo');
  const [editHePass, setEditHePass] = useState(config.heUser?.password || 'leo');
  const [editSheName, setEditSheName] = useState(config.sheUser?.name || 'Meu Amor');
  const [editShePass, setEditShePass] = useState(config.sheUser?.password || 'amor');
  const [showPasswords, setShowPasswords] = useState(false);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = selectedRole === 'he' ? config.heUser : config.sheUser;
    const correctPassword =
      selectedRole === 'he'
        ? targetUser?.password || 'leo'
        : targetUser?.password || 'amor';

    if (passwordInput.trim() === correctPassword) {
      onLogin(selectedRole);
      romanticAudio.playSealBreakSound();
      setErrorMessage('');
      setPasswordInput('');
      onClose();
    } else {
      setErrorMessage('Senha incorreta para este perfil.');
    }
  };

  const handleUnlockMaster = (e: React.FormEvent) => {
    e.preventDefault();
    const isSupabaseAdmin = isUserAdmin(currentUser, config.authorizedEmails);
    if (isSupabaseAdmin || masterPasswordInput.trim() === (config.adminPassword || 'amor')) {
      setIsMasterUnlocked(true);
      setMasterError('');
      setEditHeName(config.heUser?.name || 'Leo');
      setEditHePass(config.heUser?.password || 'leo');
      setEditSheName(config.sheUser?.name || 'Meu Amor');
      setEditShePass(config.sheUser?.password || 'amor');
    } else {
      setMasterError('Senha mestre incorreta (padrão: amor).');
    }
  };

  const handleSaveCredentials = () => {
    const updatedHe: CoupleUser = {
      name: (editHeName.trim() || 'Leo').slice(0, 100),
      password: (editHePass.trim() || 'leo').slice(0, 100),
      avatarEmoji: '🤵🏻',
    };
    const updatedShe: CoupleUser = {
      name: (editSheName.trim() || 'Meu Amor').slice(0, 100),
      password: (editShePass.trim() || 'amor').slice(0, 100),
      avatarEmoji: '👰🏻‍♀️',
    };

    onUpdateConfig({
      ...config,
      heUser: updatedHe,
      sheUser: updatedShe,
      senderName: updatedHe.name,
      recipientName: updatedShe.name,
    });
    showToast('Senhas e perfis sincronizados com sucesso!');
    setIsMasterViewOpen(false);
    setIsMasterUnlocked(false);
    setMasterPasswordInput('');
  };

  const heName = config.heUser?.name || 'Leo';
  const sheName = config.sheUser?.name || 'Meu Amor';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-60 px-5 py-2 bg-rose-900 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#FCF9F3] border border-amber-200 rounded-3xl max-w-md w-full p-6 shadow-2xl relative my-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {!isMasterViewOpen ? (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-2">
                <Heart className="w-6 h-6 fill-rose-500 text-rose-500" />
              </div>
              <h3 className="font-serif text-xl font-bold text-rose-950">Login do Casal</h3>
              <p className="text-xs text-neutral-600 mt-1">
                Entre com seu perfil para postar cartas de amor um para o outro e gerenciar momentos.
              </p>
            </div>

            {activeUser && (
              <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">{activeUser === 'he' ? '🤵🏻' : '👰🏻‍♀️'}</span>
                  <span>
                    Conectado como <strong>{activeUser === 'he' ? heName : sheName}</strong>
                  </span>
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    showToast('Desconectado com sucesso.');
                  }}
                  className="inline-flex items-center gap-1 text-rose-700 hover:text-rose-900 font-semibold cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 p-1 bg-amber-100/60 rounded-2xl mb-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('he');
                  setErrorMessage('');
                }}
                className={`py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedRole === 'he'
                    ? 'bg-white text-rose-950 shadow-xs'
                    : 'text-neutral-600 hover:text-rose-900'
                }`}
              >
                <span>🤵🏻 {heName} (Ele)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('she');
                  setErrorMessage('');
                }}
                className={`py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedRole === 'she'
                    ? 'bg-white text-rose-950 shadow-xs'
                    : 'text-neutral-600 hover:text-rose-900'
                }`}
              >
                <span>👰🏻‍♀️ {sheName} (Ela)</span>
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Senha de {selectedRole === 'he' ? heName : sheName}
                </label>
                <input
                  type="password"
                  maxLength={100}
                  placeholder="Digite sua senha..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-400 text-center"
                />
                {errorMessage && (
                  <p className="text-xs text-rose-600 font-medium mt-1 text-center">
                    {errorMessage}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all"
              >
                Entrar no Meu Perfil
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-amber-200/80 text-center">
              <button
                type="button"
                onClick={() => setIsMasterViewOpen(true)}
                className="inline-flex items-center gap-1.5 text-[11px] text-amber-900/70 hover:text-amber-900 font-medium cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Gerenciar Senhas dos Dois (Só Eu Vejo)</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-amber-200 pb-3">
              <Shield className="w-5 h-5 text-rose-700" />
              <div>
                <h3 className="font-serif text-lg font-bold text-rose-950">
                  Gerenciamento de Senhas (Só Eu Vejo)
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Área protegida onde apenas o autor principal pode ver e alterar os logins.
                </p>
              </div>
            </div>

            {!isMasterUnlocked ? (
              <div className="space-y-3 py-2">
                <form onSubmit={handleUnlockMaster} className="space-y-3">
                  <input
                    type="password"
                    maxLength={100}
                    placeholder="Senha mestre (padrão: amor)..."
                    value={masterPasswordInput}
                    onChange={(e) => setMasterPasswordInput(e.target.value)}
                    autoFocus
                    className="w-full px-4 py-2 rounded-xl border border-neutral-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-400 text-center"
                  />
                  {masterError && (
                    <p className="text-xs text-rose-600 font-medium text-center">{masterError}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsMasterViewOpen(false)}
                      className="flex-1 py-2 rounded-xl border border-neutral-300 text-neutral-600 text-xs font-medium hover:bg-neutral-100"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-xl bg-rose-900 text-white text-xs font-semibold hover:bg-rose-800"
                    >
                      Desbloquear
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs pb-1">
                  <span className="font-semibold text-neutral-700">Credenciais Salvas:</span>
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="inline-flex items-center gap-1 text-rose-800 font-medium cursor-pointer"
                  >
                    {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPasswords ? 'Ocultar senhas' : 'Ver senhas'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-white border border-rose-200/80 space-y-2">
                  <span className="text-xs font-bold text-rose-950">🤵🏻 Perfil Dele:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-neutral-500">Nome:</label>
                      <input
                        type="text"
                        maxLength={100}
                        value={editHeName}
                        onChange={(e) => setEditHeName(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-500">Senha dele:</label>
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        maxLength={100}
                        value={editHePass}
                        onChange={(e) => setEditHePass(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white border border-rose-200/80 space-y-2">
                  <span className="text-xs font-bold text-rose-950">👰🏻‍♀️ Perfil Dela:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-neutral-500">Nome:</label>
                      <input
                        type="text"
                        maxLength={100}
                        value={editSheName}
                        onChange={(e) => setEditSheName(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-500">Senha dela:</label>
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        maxLength={100}
                        value={editShePass}
                        onChange={(e) => setEditShePass(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMasterViewOpen(false);
                      setIsMasterUnlocked(false);
                    }}
                    className="flex-1 py-2 rounded-xl border border-neutral-300 text-neutral-600 text-xs font-medium hover:bg-neutral-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCredentials}
                    className="flex-1 py-2 rounded-xl bg-rose-900 text-white text-xs font-semibold hover:bg-rose-800"
                  >
                    Salvar Senhas
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
