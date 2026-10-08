import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellOff, X, Heart, Mail, Clock, Sparkles } from 'lucide-react';
import { AppNotification } from '../types/letter';
import {
  isPushSupported,
  isPushEnabledByUser,
  getPushPermissionStatus,
  requestPushPermission,
  disablePushNotifications,
  loadSavedNotifications,
  saveNotifications,
} from '../utils/notifications';

interface NotificationCenterProps {
  latestBannerNotification: AppNotification | null;
  onDismissBanner: () => void;
  onOpenLetters: () => void;
  onOpenTimeline: () => void;
  isOpenHistoryModal: boolean;
  onCloseHistoryModal: () => void;
  onOpenHistoryModal: () => void;
}

export default function NotificationCenter({
  latestBannerNotification,
  onDismissBanner,
  onOpenLetters,
  onOpenTimeline,
  isOpenHistoryModal,
  onCloseHistoryModal,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadSavedNotifications()
  );
  const [isPushEnabled, setIsPushEnabled] = useState(isPushEnabledByUser());
  const [, setPushStatus] = useState<NotificationPermission>(getPushPermissionStatus());
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  useEffect(() => {
    if (isOpenHistoryModal) {
      setNotifications(loadSavedNotifications());
    }
  }, [isOpenHistoryModal, latestBannerNotification]);

  useEffect(() => {
    if (isPushSupported() && Notification.permission === 'default') {
      const timer = setTimeout(() => {
        setShowPushPrompt(true);
      }, 10500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleTogglePush = async () => {
    if (isPushEnabled) {
      disablePushNotifications();
      setIsPushEnabled(false);
    } else {
      const granted = await requestPushPermission();
      setIsPushEnabled(granted);
      setPushStatus(getPushPermissionStatus());
      if (granted) {
        setShowPushPrompt(false);
      }
    }
  };

  const handleActionClick = (notif: AppNotification) => {
    onDismissBanner();
    onCloseHistoryModal();
    if (notif.targetView === 'timeline' || notif.type === 'new_memory') {
      onOpenTimeline();
    } else {
      onOpenLetters();
    }
  };

  return (
    <>
      <AnimatePresence>
        {latestBannerNotification && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-60 max-w-md w-[92vw] sm:w-full bg-[#FCF9F3] border border-rose-300 rounded-3xl p-4 shadow-2xl shadow-rose-950/15 backdrop-blur-md"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                {latestBannerNotification.type === 'new_memory' ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <Mail className="w-5 h-5 fill-rose-100" />
                )}
              </div>

              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-0.5">
                  <Sparkles className="w-3 h-3 text-rose-500 animate-pulse" />
                  <span>Novo Amor Compartilhado</span>
                </div>
                <h4 className="font-serif font-bold text-sm text-rose-950 truncate">
                  {latestBannerNotification.title}
                </h4>
                <p className="font-sans text-xs text-neutral-600 line-clamp-2 mt-0.5">
                  {latestBannerNotification.message}
                </p>

                <div className="flex items-center gap-2 mt-2.5">
                  <button
                    onClick={() => handleActionClick(latestBannerNotification)}
                    className="py-1.5 px-3.5 rounded-full bg-rose-900 hover:bg-rose-800 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-95"
                  >
                    {latestBannerNotification.type === 'new_memory'
                      ? 'Ver Momento'
                      : 'Ler Carta Agora'}
                  </button>
                  <button
                    onClick={onDismissBanner}
                    className="py-1.5 px-3 rounded-full border border-neutral-300 text-neutral-600 text-xs font-medium hover:bg-neutral-100 cursor-pointer"
                  >
                    Dispensar
                  </button>
                </div>
              </div>

              <button
                onClick={onDismissBanner}
                aria-label="Fechar notificação"
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPushPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-white border border-rose-200 rounded-3xl p-4 shadow-xl text-neutral-800"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 text-xs">
                <h4 className="font-serif font-bold text-rose-950 text-sm">
                  Ativar Notificações Push?
                </h4>
                <p className="text-neutral-600 mt-0.5 leading-relaxed">
                  Receba alertas instantâneos no seu celular ou computador sempre que seu amor
                  compartilhar uma carta ou foto!
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleTogglePush}
                    className="py-1.5 px-3.5 rounded-full bg-rose-900 hover:bg-rose-800 text-white font-semibold cursor-pointer shadow-xs"
                  >
                    Ativar Alertas
                  </button>
                  <button
                    onClick={() => setShowPushPrompt(false)}
                    className="py-1.5 px-3 rounded-full border border-neutral-200 text-neutral-600 font-medium hover:bg-neutral-50 cursor-pointer"
                  >
                    Mais tarde
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowPushPrompt(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpenHistoryModal && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FCF9F3] border border-amber-200 rounded-3xl max-w-md w-full p-6 shadow-2xl relative my-auto max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-amber-200">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-rose-700" />
                  <h3 className="font-serif text-lg font-bold text-rose-950">
                    Notificações do Casal
                  </h3>
                </div>
                <button
                  onClick={onCloseHistoryModal}
                  className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isPushSupported() && (
                <div className="my-3 p-3 bg-white rounded-2xl border border-rose-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {isPushEnabled ? (
                      <Bell className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <BellOff className="w-4 h-4 text-neutral-400" />
                    )}
                    <span>
                      Notificações do Navegador:{' '}
                      <strong className={isPushEnabled ? 'text-emerald-700' : 'text-neutral-500'}>
                        {isPushEnabled ? 'Ativadas' : 'Desativadas'}
                      </strong>
                    </span>
                  </div>
                  <button
                    onClick={handleTogglePush}
                    className="text-[11px] font-semibold text-rose-800 hover:text-rose-950 underline cursor-pointer"
                  >
                    {isPushEnabled ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-2 py-2">
                {notifications.length === 0 ? (
                  <div className="text-center py-10 text-neutral-500 text-xs">
                    <Heart className="w-8 h-8 text-rose-300 mx-auto mb-2 opacity-50" />
                    <span>Nenhuma notificação recente ainda.</span>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleActionClick(n)}
                      className="p-3 bg-white hover:bg-rose-50/50 rounded-2xl border border-rose-100 shadow-2xs transition-colors cursor-pointer text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-rose-950 mb-1">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-neutral-400 font-normal">
                          {new Date(n.timestamp).toLocaleDateString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-neutral-600 leading-snug">{n.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-amber-200 text-center">
                <button
                  onClick={() => {
                    setNotifications([]);
                    saveNotifications([]);
                  }}
                  className="text-[11px] text-neutral-400 hover:text-neutral-600 underline cursor-pointer"
                >
                  Limpar histórico
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
