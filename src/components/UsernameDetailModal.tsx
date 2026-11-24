import React, { useEffect } from 'react';
import { Plus, X, Send, Bot } from 'lucide-react';
import {
  formatRupiah,
  formatUsernamePrice,
  isNotForSaleDescription,
  type StoreConfig,
  type UsernameItem,
  normalizeTelegramUrl,
} from '../types';

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

  const isSold = item.status === 'sold';
  const isTradeOpen = Boolean(item.availableForTrade) && !isSold;
  const isNotForSaleOnly =
    !isSold && isNotForSaleDescription(item.description) && !isTradeOpen;
  const isNotForSale = !isSold && isNotForSaleDescription(item.description);
  const isAskOwner = Boolean(item.askOwnerPrice);

  const orderMessage = encodeURIComponent(
    isNotForSale && isTradeOpen
      ? `Halo kak, saya mau tawarkan trade untuk username ${item.username} (kategori: ${item.category})`
      : isAskOwner
        ? `Halo kak, saya mau tanya harga (ask owner) untuk username ${item.username} (kategori: ${item.category})${isTradeOpen ? ' [open trade]' : ''}`
        : `Halo kak, saya mau beli username ${item.username} (kategori: ${item.category}, harga: ${formatRupiah(item.price)})${isTradeOpen ? ' [atau trade]' : ''}`
  );

  const accountHref = `${accountBase}${accountBase.includes('?') ? '&' : '?'}text=${orderMessage}`;
  const botHref = botBase;

  const primaryHref =
    storeConfig.primaryBuyTarget === 'bot' ? botHref : accountHref;

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
          data-cute-sound="back"
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
            className="pl-5 text-2xl sm:text-3xl font-extrabold italic tracking-tight text-[#b2eb6b] drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]"
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
              <span className="font-semibold text-[#f5ffde]">status: </span>
              <span
                className={
                  item.status === 'available to buy'
                    ? 'text-[#f7ffe6]'
                    : item.status === 'booked'
                      ? 'text-amber-100'
                      : 'text-rose-100 line-through'
                }
              >
                {item.status}
              </span>
            </p>
            <p>
              <span className="font-semibold text-[#f5ffde]">keterangan: </span>
              <span className={isNotForSale ? 'text-amber-100' : undefined}>
                {item.description}
              </span>
            </p>
            {isTradeOpen && (
              <p>
                <span className="font-semibold text-[#f5ffde]">trade: </span>
                <span className="text-[#f7ffe6]">available untuk trade</span>
              </p>
            )}
            <div>
              <p className="font-semibold text-[#f5ffde]">
                username dikeep pada tanggal
              </p>
              <p className="font-mono-num text-base font-bold tracking-wide text-white">
                {item.keptDate}
              </p>
            </div>
            <div className="pt-1">
              <p className="uppercase tracking-wide text-sm font-extrabold text-white">
                HARGA:
              </p>
              <p
                className={`text-xl sm:text-2xl font-extrabold text-white ${
                  isAskOwner ? 'italic tracking-wide text-[#f7ffe6]' : 'font-mono-num'
                }`}
              >
                {formatUsernamePrice(item)}
              </p>
              {isAskOwner && !isSold && !isNotForSaleOnly && (
                <p className="text-xs font-medium text-white mt-0.5">
                  Hubungi owner lewat bot atau personal chat untuk menanyakan harga.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* White Pill Buy Now / Ask Owner / Not For Sale Area */}
        <div className="ml-8 mt-3.5 space-y-2.5">
          {isSold ? (
            <div className="w-full min-h-[48px] rounded-full bg-white/80 text-slate-700 font-bold text-base flex items-center justify-center px-6 py-3 shadow-lg">
              Username Sudah Terjual
            </div>
          ) : isNotForSaleOnly ? (
            <div className="w-full min-h-[48px] rounded-full bg-amber-100/95 text-[#3b2904] font-bold text-base flex items-center justify-center px-6 py-3 shadow-lg">
              Not For Sale
            </div>
          ) : (
            <a
              href={primaryHref}
              target="_blank"
              rel="noopener noreferrer"
              data-cute-sound="chime"
              className="w-full min-h-[50px] rounded-full bg-white hover:bg-[#f4fbe9] text-[#172808] font-bold text-base flex items-center justify-center relative px-6 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition-transform active:scale-[0.98]"
            >
              <Plus className="w-5 h-5 stroke-[2.5] absolute left-5" />
              <span>
                {isNotForSale && isTradeOpen
                  ? 'tawarkan trade'
                  : isAskOwner
                    ? 'tanya harga (ask owner)'
                    : 'beli sekarang'}
              </span>
            </a>
          )}

          {/* Direct quick options for Personal Chat (t.me/duckLingy) and Bot (@payusnbot) */}
          {!isSold && !isNotForSaleOnly && (
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1 text-xs font-medium text-white">
              <a
                href={accountHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-full bg-black/35 hover:bg-black/50 border border-white/25 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Personal Chat</span>
              </a>
              <a
                href={botHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-full bg-black/35 hover:bg-black/50 border border-white/25 transition-colors"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Bot (@payusnbot)</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
