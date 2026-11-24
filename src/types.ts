export const USERNAME_CATEGORIES = [
  'uncommon',
  'related BA',
  'tamping',
  'related girl',
  'bahasa lain',
  'related boy',
  'nsfw',
  'collect only',
] as const;

export type UsernameCategory = (typeof USERNAME_CATEGORIES)[number];

export const USERNAME_STATUSES = [
  'available to buy',
  'booked',
  'sold',
] as const;

export type UsernameStatus = (typeof USERNAME_STATUSES)[number];

export const USERNAME_REGEX = /^@[a-zA-Z0-9_]{1,63}$/;
export const MAX_USERNAME_LEN = 64;
export const MAX_DESCRIPTION_LEN = 300;
export const MAX_KEPT_DATE_LEN = 32;
export const MAX_PRICE = 1_000_000_000;
export const OWNER_EMAIL = 'meicyagsaputri@gmail.com';

export interface UsernameItem {
  id: string;
  username: string;
  category: UsernameCategory;
  status: UsernameStatus;
  description: string;
  keptDate: string;
  price: number;
  ownerUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdminCardItem {
  id: string;
  name: string;
  role: string;
  photoUrl?: string;
  verticalTag: string;
  galleryHandle?: string;
  paymentChannel?: string;
  anotherHandle?: string;
  botHandle?: string;
  telegramUrl: string;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StoreConfig {
  telegramAccountUrl: string;
  telegramBotUrl: string;
  primaryBuyTarget: 'account' | 'bot';
  testimonialUrl: string;
  howToOrderSteps: string[];
  howToOrderNote?: string;
  updatedAt?: unknown;
}

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  telegramAccountUrl: 'https://t.me/duckLingy',
  telegramBotUrl: 'https://t.me/payusnbot',
  primaryBuyTarget: 'account',
  testimonialUrl: 'https://t.me/mentuuL',
  howToOrderSteps: [
    'Klik tombol start lalu pilih menu list usn untuk melihat pilihan kategori jenis username.',
    'Pilih kategori yang kamu mau (contoh: uncommon, related BA, tamping, related girl, dll).',
    'Klik salah satu @username untuk melihat status ketersediaan, keterangan, tanggal keep, dan harga.',
    'Tekan tombol beli sekarang untuk langsung diarahkan ke Telegram owner (t.me/duckLingy) atau bot pembayaran (@payusnbot).',
    'Kirim format order dan lakukan pembayaran sesuai arahan admin, lalu cek testimoni di t.me/mentuuL.',
  ],
  howToOrderNote:
    'Semua username yang tertera di list otomatis terupdate. Pastikan bertransaksi hanya melalui admin resmi dan channel payment @mourah.',
};

export const DEFAULT_OWNER_CARD: AdminCardItem = {
  id: 'owner-ducklingy',
  name: 'yew cyrene',
  role: 'OWNER',
  photoUrl: '/assets/owner-avatar.jpg',
  verticalTag: 'DUCKLINGY',
  galleryHandle: '@kerocoo',
  paymentChannel: '@mourah',
  anotherHandle: '@kerocoobot',
  botHandle: '@payusnbot',
  telegramUrl: 'https://t.me/duckLingy',
  sortOrder: 0,
};

export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return 'Rp. ' + safe.toLocaleString('id-ID');
}

export function normalizeTelegramUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return 'https://t.me/duckLingy';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const clean = trimmed.replace(/^@/, '').replace(/^t\.me\//i, '');
  return `https://t.me/${clean}`;
}
