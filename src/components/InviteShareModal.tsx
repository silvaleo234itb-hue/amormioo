import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Share2, Copy, Check, MessageCircle, Heart } from 'lucide-react';
import { AlbumConfig } from '../types/letter';
import { romanticAudio } from '../utils/audio';

interface InviteShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AlbumConfig;
}

export default function InviteShareModal({ isOpen, onClose, config }: InviteShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = window.location.origin + window.location.pathname;
  const sheName = config.sheUser?.name || config.recipientName || 'Meu Amor';

  const defaultMessage = `Oi ${sheName}! ❤️ Preparei uma surpresa muito especial só para nós dois... Um cantinho digital onde guardo nossas cartas de amor, nossas memórias e o tempo que estamos juntos. Clica no link para abrir nosso álbum: ${currentUrl}`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(defaultMessage)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(defaultMessage);
    setCopied(true);
    romanticAudio.playSealBreakSound();
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
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

        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
            <Share2 className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-xl font-bold text-rose-950">
            Convidar {sheName} pelo WhatsApp
          </h3>
          <p className="text-xs text-neutral-600 mt-1">
            Mande este link com uma mensagem carinhosa para ela conhecer o presente!
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-rose-200/80 shadow-xs mb-5 text-xs text-neutral-800 leading-relaxed font-sans relative">
          <div className="flex items-center gap-1.5 text-rose-700 font-bold mb-1">
            <Heart className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
            <span>Mensagem Pronta para o WhatsApp:</span>
          </div>
          <p className="italic text-neutral-700 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 mt-2">
            "{defaultMessage}"
          </p>
        </div>

        <div className="space-y-2.5">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Enviar Agora no WhatsApp</span>
          </a>

          <button
            onClick={handleCopyLink}
            className="w-full py-2.5 rounded-2xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Mensagem Copiada com Sucesso!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Mensagem e Link</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-center text-neutral-400 mt-4">
          Dica: A senha dela padrão para postar cartas de volta é{' '}
          <strong className="text-rose-900 font-mono">
            {config.sheUser?.password || 'amor'}
          </strong>
          .
        </p>
      </motion.div>
    </div>
  );
}
