import React, { useEffect } from 'react';
import { Plus, X, Send, Bot } from 'lucide-react';
import { formatRupiah, type StoreConfig, type UsernameItem, normalizeTelegramUrl } from '../types';

interface UsernameDetailModalProps {
  item: UsernameItem | null;
  storeConfig: StoreConfig;
  onClose: () => void;
}

export function UsernameDetailModal({
  item,
  storeConfig,
  onClose,
}: UsernameDetailModalProps) {
  useEffect(() => {
    if (!item) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [item, onClose]);

  if (!item) return null;

  const accountBase = normalizeTelegramUrl(storeConfig.telegramAccountUrl);
  const botBase = normalizeTelegramUrl(storeConfig.telegramBotUrl);

  const orderMessage = encodeURIComponent(
    `Halo kak, saya mau beli username ${item.username} (kategori: ${item.category}, harga: ${formatRupiah(item.price)})`
  );

  const accountHref = `${accountBase}${accountBase.includes('?') ? '&' : '?'}text=${orderMessage}`;
  const botHref = botBase;

  const primaryHref =
    storeConfig.primaryBuyTarget === 'bot' ? botHref : accountHref;
  const secondaryHref =
    storeConfig.primaryBuyTarget === 'bot' ? accountHref : botHref;
  const secondaryLabel =
    storeConfig.primaryBuyTarget === 'bot'
      ? 'Atau chat langsung ke owner (t.me/duckLingy)'
      : 'Atau order otomatis lewat bot (@payusnbot)';

  const isSold = item.status === 'sold';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="username-detail-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md pt-4 pb-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup detail username"
          className="absolute top-0 right-0 z-20 min-w-[44px] min-h-[44px] rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center backdrop-blur-md border border-white/40 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Pointer + @username Header (exact visual motif from mockup) */}
        <div className="relative pl-10 mb-3 flex items-center gap-3">
          {/* White Dot + Angled Pointer Line */}
          <svg
            viewBox="0 0 42 220"
            className="pointer-events-none absolute left-2 top-2 w-10 h-56 overflow-visible"
            aria-hidden="true"
          >
            <circle cx="24" cy="10" r="8" fill="#ffffff" />
            <path
              d="M24 10 L6 26 L6 205"
              stroke="#ffffff"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>

          <h2
            id="username-detail-title"
            className="pl-5 text-2xl sm:text-3xl font-extrabold italic tracking-tight text-[#7ea547] drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]"
            style={{
              WebkitTextStroke: '1.2px #ffffff',
              paintOrder: 'stroke fill',
            }}
          >
            {item.username}
          </h2>
        </div>

        {/* Olive Green Details Card */}
        <div className="ml-8 bg-[#6f923e] rounded-2xl p-5 sm:p-6 shadow-[0_18px_40px_rgba(0,0,0,0.45)] border border-white/25 text-white space-y-2.5">
          <div className="space-y-1.5 text-[15px] sm:text-base font-bold leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
            <p>
              <span className="font-semibold text-white/90">status: </span>
              <span
                className={
                  item.status === 'available to buy'
                    ? 'text-[#f3ffd8]'
                    : item.status === 'booked'
                      ? 'text-amber-200'
                      : 'text-rose-200 line-through'
                }
              >
                {item.status}
              </span>
            </p>
            <p>
              <span className="font-semibold text-white/90">keterangan: </span>
              <span>{item.description}</span>
            </p>
            <div>
              <p className="font-semibold text-white/90">
                username dikeep pada tanggal
              </p>
              <p className="font-mono-num text-base font-bold tracking-wide">
                {item.keptDate}
              </p>
            </div>
            <div className="pt-1">
              <p className="uppercase tracking-wide text-sm font-extrabold text-white/95">
                HARGA:
              </p>
              <p className="font-mono-num text-xl sm:text-2xl font-extrabold text-white">
                {formatRupiah(item.price)}
              </p>
            </div>
          </div>
        </div>

        {/* White Pill Buy Now Button */}
        <div className="ml-8 mt-3.5 space-y-2.5">
          {isSold ? (
            <div className="w-full min-h-[48px] rounded-full bg-white/80 text-slate-700 font-bold text-base flex items-center justify-center px-6 py-3 shadow-lg">
              Username Sudah Terjual
            </div>
          ) : (
            <a
              href={primaryHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[50px] rounded-full bg-white hover:bg-[#f4fbe9] text-[#172808] font-bold text-base flex items-center justify-center relative px-6 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition-transform active:scale-[0.98]"
            >
              <Plus className="w-5 h-5 stroke-[2.5] absolute left-5" />
              <span>beli sekarang</span>
            </a>
          )}

          {/* Direct quick options for both t.me/duckLingy and @payusnbot */}
          {!isSold && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-xs font-medium text-white/90">
              <a
                href={accountHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/35 hover:bg-black/50 border border-white/25 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>t.me/duckLingy</span>
              </a>
              <a
                href={botHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/35 hover:bg-black/50 border border-white/25 transition-colors"
                title={secondaryLabel}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>@payusnbot</span>
              </a>
              <a
                href={secondaryHref}
                target="_blank"
                rel="noopener noreferrer"
                className="sr-only"
              >
                {secondaryLabel}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
