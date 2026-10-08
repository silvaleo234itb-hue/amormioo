import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trash2, AlertTriangle, X, Heart, Lock, Check, Loader2, Key } from 'lucide-react';
import { AlbumConfig } from '../types/letter';
import { romanticAudio } from '../utils/audio';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  detail?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  iconType?: 'trash' | 'warning' | 'heart' | 'key';
  requireCoupleAuth?: boolean;
  config?: AlbumConfig;
  onConfirm: (authPassword?: string) => void | Promise<void>;
  onClose: () => void;
}

export default function ConfirmationModal({
  isOpen,
  title,
  description,
  detail,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDestructive = true,
  isLoading = false,
  iconType = 'trash',
  requireCoupleAuth = false,
  config,
  onConfirm,
  onClose,
}: ConfirmationModalProps) {
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPasswordInput('');
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmSubmit = (e?: React.FormEvent, skipPasswordCheck = false) => {
    if (e) e.preventDefault();

    if (requireCoupleAuth && config && !skipPasswordCheck) {
      if (!passwordInput.trim()) {
        setErrorMessage('Digite a senha do casal para autorizar a remoção.');
        return;
      }

      const trimmed = passwordInput.trim().toLowerCase();
      const validPasswords = [
        (config.heUser?.password || 'leo').toLowerCase(),
        (config.sheUser?.password || 'amor').toLowerCase(),
        (config.adminPassword || 'amor').toLowerCase(),
      ];

      if (!validPasswords.includes(trimmed)) {
        setErrorMessage('Senha incorreta. Use a senha de Leo, do Amor ou a chave do casal.');
        return;
      }
    }

    romanticAudio.playPageTurnSound();
    onConfirm(passwordInput.trim());
  };

  const getIcon = () => {
    if (iconType === 'trash') {
      return (
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
          <Trash2 className="w-6 h-6" />
        </div>
      );
    }
    if (iconType === 'key') {
      return (
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3 shadow-inner">
          <Key className="w-6 h-6" />
        </div>
      );
    }
    if (iconType === 'heart') {
      return (
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-3 shadow-inner">
          <Heart className="w-6 h-6 fill-rose-500" />
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
        <AlertTriangle className="w-6 h-6" />
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-60 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 15 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="bg-[#FCF9F3] border border-amber-200/90 rounded-3xl max-w-md w-full p-6 shadow-2xl relative my-auto text-center"
      >
        <button
          onClick={onClose}
          disabled={isLoading}
          aria-label="Fechar diálogo"
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral-200/60 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer disabled:opacity-30"
        >
          <X className="w-5 h-5" />
        </button>

        {getIcon()}

        <h3 className="font-serif text-xl sm:text-2xl font-bold text-rose-950 mb-2 leading-snug">
          {title}
        </h3>

        <p className="font-sans text-xs sm:text-sm text-neutral-600 leading-relaxed mb-4">
          {description}
        </p>

        {detail && (
          <div className="mb-4 p-3 rounded-2xl bg-white border border-rose-100/90 text-xs text-neutral-700 italic font-serif shadow-xs line-clamp-2">
            "{detail}"
          </div>
        )}

        {requireCoupleAuth && (
          <form onSubmit={handleConfirmSubmit} className="mb-5 space-y-3 text-left">
            <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/70 text-xs text-amber-900 flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Para proteger os momentos de vocês dois, digite a senha do casal para autorizar a remoção.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Senha do Casal ({config?.heUser?.name || 'Leo'} ou {config?.sheUser?.name || 'Meu Amor'}):
              </label>
              <input
                type="password"
                maxLength={100}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setErrorMessage('');
                }}
                autoFocus
                placeholder="Digite a senha (ex: leo ou amor)..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-xs text-center font-mono focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-xs"
              />
              {errorMessage && (
                <p className="text-[11px] text-rose-600 font-medium text-center mt-1.5">
                  {errorMessage}
                </p>
              )}
            </div>
          </form>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-2xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-98 disabled:opacity-40"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={() => handleConfirmSubmit()}
            disabled={isLoading}
            className={`flex-1 py-3 px-4 rounded-2xl text-white text-xs font-semibold shadow-md cursor-pointer transition-all active:scale-98 disabled:opacity-60 flex items-center justify-center gap-2 ${
              isDestructive
                ? 'bg-rose-900 hover:bg-rose-800 shadow-rose-900/20'
                : 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-700/20'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                {isDestructive ? <Trash2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
