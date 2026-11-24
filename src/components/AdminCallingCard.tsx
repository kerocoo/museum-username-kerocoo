import React from 'react';
import { Phone, ExternalLink } from 'lucide-react';
import { type AdminCardItem, normalizeTelegramUrl } from '../types';
import { GinghamBow, PinkLilyCluster } from './BotanicalDecor';

interface AdminCallingCardProps {
  admin: AdminCardItem;
}

export function AdminCallingCard({ admin }: AdminCallingCardProps) {
  const letters = (admin.verticalTag || 'DUCKLINGY').toUpperCase().split('');
  const tgUrl = normalizeTelegramUrl(admin.telegramUrl);

  return (
    <div className="relative mx-auto w-full max-w-[360px] pt-6 pb-8 px-4 select-none">
      {/* Decorative top-right pink lily behind card */}
      <PinkLilyCluster className="pointer-events-none absolute -top-3 -right-4 w-36 h-36 z-0 opacity-95" />

      {/* Decorative bottom-left pink lily overlapping card */}
      <PinkLilyCluster className="pointer-events-none absolute bottom-1 -left-5 w-40 h-40 z-30 opacity-95 -rotate-12" />

      {/* Upper Dark Olive Frame */}
      <div className="relative z-10 w-[86%] bg-[#36510b] rounded-sm px-4 pt-3 pb-4 shadow-[0_14px_34px_rgba(0,0,0,0.4)]">
        <div className="text-center">
          <h3 className="text-[22px] font-extrabold tracking-[0.14em] text-[#0c1602] leading-none">
            {admin.role || 'OWNER'}
          </h3>
          <p className="text-xs font-medium text-white/90 mt-1">
            is calling...
          </p>
        </div>

        {/* Square Photo + Slide To Answer Pill */}
        <div className="relative mt-3 aspect-[1.06/1] w-full overflow-hidden bg-[#243707]">
          {admin.photoUrl ? (
            <img
              src={admin.photoUrl}
              alt={admin.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#476813] to-[#263908] text-white/80 font-display-serif text-3xl font-bold">
              {admin.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          {/* Slide To Answer Interactive Telegram Link */}
          <a
            href={tgUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[80%] min-h-[40px] bg-white/95 hover:bg-white rounded-full flex items-center gap-2.5 px-2 py-1 shadow-lg transition-transform active:scale-95 group"
          >
            <span className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-[#0f172a] shrink-0 group-hover:bg-[#36510b] group-hover:text-white transition-colors">
              <Phone className="w-4 h-4 fill-current" />
            </span>
            <span className="text-xs font-bold text-[#0f172a] tracking-tight whitespace-nowrap truncate">
              Slide To Answer.
            </span>
          </a>
        </div>
      </div>

      {/* Lower Light Olive Card + Vertical Letter Rail */}
      <div className="relative z-0 -mt-12 ml-auto w-[92%] bg-[#729642] rounded-2xl pt-14 pb-5 pl-6 pr-3 shadow-[0_18px_40px_rgba(0,0,0,0.35)] flex items-end justify-between gap-2">
        {/* Decorative Gingham Ribbon Bow at Top-Right of Lower Card */}
        <GinghamBow className="pointer-events-none absolute -top-9 -right-5 w-32 h-24 z-30 drop-shadow-md" />

        {/* Left Info Details */}
        <div className="space-y-1.5 text-[14px] font-bold text-white leading-snug z-20 min-w-0">
          <p className="truncate">
            <span className="font-semibold text-white/90">nama: </span>
            <span>{admin.name}</span>
          </p>
          {admin.galleryHandle && (
            <p className="truncate">
              <span className="font-semibold text-white/90">gallery: </span>
              <a
                href={normalizeTelegramUrl(admin.galleryHandle)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-white/40 hover:decoration-white inline-flex items-center gap-1"
              >
                {admin.galleryHandle}
                <ExternalLink className="w-3 h-3 opacity-75" />
              </a>
            </p>
          )}
          {admin.paymentChannel && (
            <p className="truncate">
              <span className="font-semibold text-white/90">ch payment: </span>
              <a
                href={normalizeTelegramUrl(admin.paymentChannel)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-white/40 hover:decoration-white inline-flex items-center gap-1"
              >
                {admin.paymentChannel}
                <ExternalLink className="w-3 h-3 opacity-75" />
              </a>
            </p>
          )}
          {admin.anotherHandle && (
            <p className="truncate">
              <span className="font-semibold text-white/90">another: </span>
              <a
                href={normalizeTelegramUrl(admin.anotherHandle)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-white/40 hover:decoration-white inline-flex items-center gap-1"
              >
                {admin.anotherHandle}
                <ExternalLink className="w-3 h-3 opacity-75" />
              </a>
            </p>
          )}
          {admin.botHandle && (
            <p className="truncate">
              <a
                href={normalizeTelegramUrl(admin.botHandle)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-white/40 hover:decoration-white inline-flex items-center gap-1"
              >
                {admin.botHandle}
                <ExternalLink className="w-3 h-3 opacity-75" />
              </a>
            </p>
          )}
        </div>

        {/* Right Vertical Stacked Letters */}
        <div
          className="flex flex-col items-center justify-center font-display-serif text-sm font-bold text-white tracking-widest leading-[1.35] pr-1 select-none shrink-0"
          aria-hidden="true"
        >
          {letters.map((ch, idx) => (
            <span key={idx}>{ch}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
