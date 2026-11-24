import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  Settings,
  Send,
  Bot,
} from 'lucide-react';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  testConnection,
} from './firebase';
import {
  type AdminCardItem,
  DEFAULT_OWNER_CARD,
  DEFAULT_STORE_CONFIG,
  normalizeTelegramUrl,
  OWNER_EMAIL,
  type StoreConfig,
  USERNAME_CATEGORIES,
  type UsernameCategory,
  type UsernameItem,
} from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AdminCallingCard } from './components/AdminCallingCard';
import { UsernameDetailModal } from './components/UsernameDetailModal';
import { OwnerPanel } from './components/OwnerPanel';

type ScreenView =
  | 'welcome'
  | 'menu'
  | 'categories'
  | 'usernames'
  | 'admins'
  | 'how-to-order'
  | 'owner';

const ITEMS_PER_PAGE = 12;

function GalleryApp() {
  const [view, setView] = useState<ScreenView>(() => {
    if (
      typeof window !== 'undefined' &&
      (window.location.hash === '#owner' ||
        window.location.search.includes('owner'))
    ) {
      return 'owner';
    }
    return 'welcome';
  });
  const [selectedCategory, setSelectedCategory] =
    useState<UsernameCategory>('uncommon');
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsername, setSelectedUsername] = useState<UsernameItem | null>(
    null
  );
  const [secretTapCount, setSecretTapCount] = useState(0);

  // Firebase state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDelegatedAdmin, setIsDelegatedAdmin] = useState(false);

  const [usernames, setUsernames] = useState<UsernameItem[]>([]);
  const [loadingUsernames, setLoadingUsernames] = useState(true);
  const [adminCards, setAdminCards] = useState<AdminCardItem[]>([]);
  const [storeConfig, setStoreConfig] =
    useState<StoreConfig>(DEFAULT_STORE_CONFIG);
  const [hasStoreConfigDoc, setHasStoreConfigDoc] = useState(false);

  // Testimonis confirmation toast (in case iframe blocks new-tab popup)
  const [testimoniNotice, setTestimoniNotice] = useState(false);

  useEffect(() => {
    testConnection();
    const handleHashChange = () => {
      if (
        window.location.hash === '#owner' ||
        window.location.search.includes('owner')
      ) {
        setView('owner');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.emailVerified) {
        if (currentUser.email === OWNER_EMAIL) {
          setIsDelegatedAdmin(true);
        } else {
          try {
            const admDoc = await getDoc(doc(db, 'admins', currentUser.uid));
            setIsDelegatedAdmin(admDoc.exists());
          } catch {
            setIsDelegatedAdmin(false);
          }
        }
      } else {
        setIsDelegatedAdmin(false);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // Public real-time listener: Usernames catalog
  useEffect(() => {
    const q = query(collection(db, 'usernames'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: UsernameItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            username: String(data.username || ''),
            category: data.category as UsernameCategory,
            status: data.status || 'available to buy',
            description: String(data.description || 'username bersih'),
            keptDate: String(data.keptDate || '-'),
            price: Number(data.price || 0),
            ownerUid: String(data.ownerUid || ''),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });
        setUsernames(list);
        setLoadingUsernames(false);
      },
      (err) => {
        setLoadingUsernames(false);
        handleFirestoreError(err, OperationType.LIST, 'usernames');
      }
    );
    return unsub;
  }, []);

  // Public real-time listener: Admin cards
  useEffect(() => {
    const q = query(collection(db, 'adminCards'), orderBy('sortOrder', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: AdminCardItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: String(data.name || ''),
            role: String(data.role || 'ADMIN'),
            photoUrl: data.photoUrl ? String(data.photoUrl) : undefined,
            verticalTag: String(data.verticalTag || 'KEROCOO'),
            galleryHandle: data.galleryHandle
              ? String(data.galleryHandle)
              : undefined,
            paymentChannel: data.paymentChannel
              ? String(data.paymentChannel)
              : undefined,
            anotherHandle: data.anotherHandle
              ? String(data.anotherHandle)
              : undefined,
            botHandle: data.botHandle ? String(data.botHandle) : undefined,
            telegramUrl: String(data.telegramUrl || 'https://t.me/duckLingy'),
            sortOrder: Number(data.sortOrder || 0),
          };
        });
        setAdminCards(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'adminCards');
      }
    );
    return unsub;
  }, []);

  // Public real-time listener: Store config
  useEffect(() => {
    const ref = doc(db, 'storeConfig', 'main');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setHasStoreConfigDoc(true);
          setStoreConfig({
            telegramAccountUrl: String(
              data.telegramAccountUrl || DEFAULT_STORE_CONFIG.telegramAccountUrl
            ),
            telegramBotUrl: String(
              data.telegramBotUrl || DEFAULT_STORE_CONFIG.telegramBotUrl
            ),
            primaryBuyTarget:
              data.primaryBuyTarget === 'bot' ? 'bot' : 'account',
            testimonialUrl: String(
              data.testimonialUrl || DEFAULT_STORE_CONFIG.testimonialUrl
            ),
            howToOrderSteps: Array.isArray(data.howToOrderSteps)
              ? data.howToOrderSteps.map(String)
              : DEFAULT_STORE_CONFIG.howToOrderSteps,
            howToOrderNote: data.howToOrderNote
              ? String(data.howToOrderNote)
              : DEFAULT_STORE_CONFIG.howToOrderNote,
          });
        } else {
          setHasStoreConfigDoc(false);
          setStoreConfig(DEFAULT_STORE_CONFIG);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, 'storeConfig/main');
      }
    );
    return unsub;
  }, []);

  const isAdmin =
    Boolean(user && user.emailVerified) &&
    (user?.email === OWNER_EMAIL || isDelegatedAdmin);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of USERNAME_CATEGORIES) counts[c] = 0;
    for (const u of usernames) {
      counts[u.category] = (counts[u.category] || 0) + 1;
    }
    return counts;
  }, [usernames]);

  const activeCategoryItems = useMemo(() => {
    const filtered = usernames.filter((u) => {
      if (u.category !== selectedCategory) return false;
      if (!searchTerm.trim()) return true;
      return u.username
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase());
    });
    return filtered;
  }, [usernames, selectedCategory, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(activeCategoryItems.length / ITEMS_PER_PAGE)
  );
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = activeCategoryItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const displayedAdmins =
    adminCards.length > 0 ? adminCards : [DEFAULT_OWNER_CARD];

  const handleOpenCategory = (cat: UsernameCategory) => {
    setSelectedCategory(cat);
    setPage(1);
    setSearchTerm('');
    setView('usernames');
  };

  const handleBack = () => {
    if (view === 'usernames') setView('categories');
    else if (
      view === 'categories' ||
      view === 'admins' ||
      view === 'how-to-order'
    )
      setView('menu');
    else if (view === 'owner') setView('menu');
    else setView('welcome');
  };

  const testimoniHref = normalizeTelegramUrl(storeConfig.testimonialUrl);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden flex flex-col">
      {/* Full-viewport Lake & Swan Backdrop */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/lake-swan-bg.jpg')" }}
        aria-hidden="true"
      />
      {/* Subtle atmospheric contrast scrim */}
      <div
        className="fixed inset-0 z-0 bg-gradient-to-b from-black/25 via-black/15 to-black/40 pointer-events-none"
        aria-hidden="true"
      />

      {/* Compact Top Bar */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between gap-4">
        <div className="min-w-[96px]">
          {view !== 'welcome' && (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-full bg-black/25 hover:bg-black/40 backdrop-blur-md border border-white/30 text-white font-bold text-sm transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
        </div>

        {isAdmin && view !== 'owner' && (
          <button
            type="button"
            onClick={() => setView('owner')}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-full bg-black/25 hover:bg-black/45 backdrop-blur-md border border-white/25 text-white/90 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Kelola Gallery</span>
          </button>
        )}
      </header>

      {/* Main Content Stage */}
      <main className="relative z-10 flex-1 flex flex-col justify-center w-full max-w-6xl mx-auto px-4 sm:px-6 py-4">
        {/* VIEW 1: WELCOME SCREEN */}
        {view === 'welcome' && (
          <section className="flex flex-col items-center justify-center text-center py-12 sm:py-20 space-y-6">
            <div className="space-y-2 max-w-2xl mx-auto">
              <h1
                className="font-display-serif text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-none text-[#729b39]"
                style={{
                  WebkitTextStroke: '1.8px #0f1f05',
                  paintOrder: 'stroke fill',
                  textShadow: '0 6px 24px rgba(0,0,0,0.45)',
                }}
              >
                Selamat Datang
              </h1>
              <p className="font-display-serif italic text-xl sm:text-2xl md:text-3xl text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]">
                di gallery username{' '}
                <span
                  onClick={() => {
                    const next = secretTapCount + 1;
                    if (next >= 5) {
                      setSecretTapCount(0);
                      setView('owner');
                    } else {
                      setSecretTapCount(next);
                    }
                  }}
                >
                  @kerocoo
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setView('menu')}
              className="glass-pill min-w-[220px] sm:min-w-[260px] min-h-[54px] px-10 py-3.5 rounded-full text-xl font-bold text-white tracking-wide transition-transform active:scale-95 cursor-pointer"
            >
              start
            </button>
          </section>
        )}

        {/* VIEW 2: MAU MULAI DARIMANA NIH? */}
        {view === 'menu' && (
          <section className="flex flex-col items-center justify-center text-center py-8 sm:py-12 space-y-7 max-w-2xl mx-auto w-full">
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold uppercase tracking-tight leading-tight text-white"
              style={{
                WebkitTextStroke: '2px #2c4a12',
                paintOrder: 'stroke fill',
                textShadow: '0 6px 22px rgba(0,0,0,0.48)',
              }}
            >
              MAU MULAI DARIMANA NIH?
            </h2>

            <div className="w-full max-w-sm sm:max-w-md space-y-4">
              <button
                type="button"
                onClick={() => setView('categories')}
                className="glass-pill w-full min-h-[56px] rounded-full text-lg sm:text-xl font-semibold text-white transition-transform active:scale-[0.98] cursor-pointer"
              >
                list usn
              </button>

              <button
                type="button"
                onClick={() => setView('admins')}
                className="glass-pill w-full min-h-[56px] rounded-full text-lg sm:text-xl font-semibold text-white transition-transform active:scale-[0.98] cursor-pointer"
              >
                list admin
              </button>

              <a
                href={testimoniHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setTestimoniNotice(true)}
                className="glass-pill w-full min-h-[56px] rounded-full text-lg sm:text-xl font-semibold text-white flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
              >
                <span>testimoni</span>
                <ExternalLink className="w-4 h-4 opacity-80" />
              </a>

              <button
                type="button"
                onClick={() => setView('how-to-order')}
                className="glass-pill w-full min-h-[56px] rounded-full text-lg sm:text-xl font-semibold text-white transition-transform active:scale-[0.98] cursor-pointer"
              >
                how to order
              </button>
            </div>

            {testimoniNotice && (
              <div className="glass-panel rounded-2xl px-4 py-3 text-xs sm:text-sm text-white/95 max-w-sm">
                Mengarahkan ke channel testimoni{' '}
                <a
                  href={testimoniHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-bold"
                >
                  t.me/mentuuL
                </a>
                .
              </div>
            )}
          </section>
        )}

        {/* VIEW 3: PILIH JENIS USERNAME */}
        {view === 'categories' && (
          <section className="flex flex-col items-center justify-center text-center py-6 sm:py-10 space-y-8 max-w-4xl mx-auto w-full">
            <h2
              className="text-2xl sm:text-4xl font-extrabold uppercase tracking-tight text-white"
              style={{
                WebkitTextStroke: '2px #2c4a12',
                paintOrder: 'stroke fill',
                textShadow: '0 6px 22px rgba(0,0,0,0.48)',
              }}
            >
              PILIH JENIS USERNAME
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5 w-full">
              {USERNAME_CATEGORIES.map((category) => {
                const count = categoryCounts[category] || 0;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleOpenCategory(category)}
                    className="glass-pill min-h-[60px] px-4 py-3 rounded-full flex flex-col items-center justify-center transition-transform active:scale-[0.97] cursor-pointer"
                  >
                    <span className="text-base sm:text-lg font-bold italic text-[#ecffd2] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                      {category}
                    </span>
                    <span className="text-[11px] font-medium text-white/85 tabular-nums">
                      {count} username
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* VIEW 4: LIST USERNAME PER KATEGORI */}
        {view === 'usernames' && (
          <section className="flex flex-col items-center py-4 sm:py-8 space-y-6 max-w-4xl mx-auto w-full">
            {/* Category Header Pill */}
            <div className="glass-pill px-8 py-3 rounded-full text-center">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#162d09] tracking-tight drop-shadow-[0_1px_0_rgba(255,255,255,0.65)]">
                {selectedCategory}
              </h2>
            </div>

            {/* Search Filter */}
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 text-white/75 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari @username..."
                className="w-full rounded-full bg-black/30 backdrop-blur-md border border-white/35 pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/65 focus:outline-none focus:border-white"
              />
            </div>

            {/* 2-col (mobile) / 3-col (desktop) Username Grid */}
            {loadingUsernames ? (
              <div className="glass-panel rounded-3xl px-8 py-10 text-center text-white/90 text-sm">
                Memuat daftar username...
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className="glass-panel rounded-3xl p-8 max-w-md w-full text-center space-y-4">
                <p className="text-sm sm:text-base font-medium text-white/90">
                  Belum ada username di kategori <strong>{selectedCategory}</strong>.
                </p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setView('owner')}
                    className="glass-pill px-5 py-2.5 rounded-full text-xs font-bold text-white cursor-pointer"
                  >
                    + Input Username Sekarang
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 w-full">
                {paginatedItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedUsername(item)}
                    className={`glass-pill min-h-[54px] px-3 py-2.5 rounded-full flex flex-col items-center justify-center transition-transform active:scale-[0.97] cursor-pointer ${
                      item.status === 'sold' ? 'opacity-65' : ''
                    }`}
                  >
                    <span
                      className={`text-base sm:text-lg font-extrabold tracking-tight text-[#162d09] drop-shadow-[0_1px_0_rgba(255,255,255,0.65)] truncate max-w-full ${
                        item.status === 'sold' ? 'line-through' : ''
                      }`}
                    >
                      {item.username}
                    </span>
                    {item.status !== 'available to buy' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                        {item.status}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Pagination Bar (sebelumnya / selanjutnya) */}
            {activeCategoryItems.length > 0 && (
              <div className="w-full max-w-md pt-2 space-y-2">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="glass-pill min-h-[46px] px-4 rounded-full text-sm font-bold text-white flex items-center justify-center gap-1 disabled:opacity-40 transition-transform active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>sebelumnya</span>
                  </button>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="glass-pill min-h-[46px] px-4 rounded-full text-sm font-bold text-white flex items-center justify-center gap-1 disabled:opacity-40 transition-transform active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span>selanjutnya</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-center text-xs font-medium text-white/85 font-mono-num">
                  Halaman {currentPage} dari {totalPages}
                </p>
              </div>
            )}
          </section>
        )}

        {/* VIEW 5: LIST ADMIN */}
        {view === 'admins' && (
          <section className="py-4 sm:py-8 space-y-6">
            <div className="text-center">
              <h2
                className="text-2xl sm:text-4xl font-extrabold uppercase tracking-tight text-white"
                style={{
                  WebkitTextStroke: '2px #2c4a12',
                  paintOrder: 'stroke fill',
                  textShadow: '0 6px 22px rgba(0,0,0,0.48)',
                }}
              >
                LIST ADMIN
              </h2>
              <p className="text-xs sm:text-sm text-white/90 mt-1">
                Klik tombol Slide To Answer atau handle Telegram untuk menghubungi admin.
              </p>
            </div>

            <div
              className={`grid gap-8 items-start ${
                displayedAdmins.length > 1
                  ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'
                  : 'grid-cols-1'
              }`}
            >
              {displayedAdmins.map((admin) => (
                <AdminCallingCard key={admin.id} admin={admin} />
              ))}
            </div>
          </section>
        )}

        {/* VIEW 6: HOW TO ORDER */}
        {view === 'how-to-order' && (
          <section className="py-6 sm:py-10 max-w-2xl mx-auto w-full space-y-6">
            <div className="text-center">
              <h2
                className="text-2xl sm:text-4xl font-extrabold uppercase tracking-tight text-white"
                style={{
                  WebkitTextStroke: '2px #2c4a12',
                  paintOrder: 'stroke fill',
                  textShadow: '0 6px 22px rgba(0,0,0,0.48)',
                }}
              >
                HOW TO ORDER
              </h2>
            </div>

            <div className="bg-[#6f923e]/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.4)] text-white space-y-5">
              <ol className="space-y-4">
                {storeConfig.howToOrderSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3.5">
                    <span className="font-mono-num text-sm font-extrabold bg-[#36510b] text-[#ecffd2] w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <p className="text-sm sm:text-base font-medium leading-relaxed text-white/95">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>

              {storeConfig.howToOrderNote && (
                <div className="pt-4 border-t border-white/25 text-xs sm:text-sm text-white/90 leading-relaxed">
                  {storeConfig.howToOrderNote}
                </div>
              )}

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setView('categories')}
                  className="min-h-[44px] px-5 py-2.5 rounded-full bg-white text-[#172808] font-bold text-sm hover:bg-[#f4fbe9] transition-colors cursor-pointer"
                >
                  Lihat List Username
                </button>
                <a
                  href={normalizeTelegramUrl(storeConfig.telegramAccountUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-5 py-2.5 rounded-full bg-[#36510b] hover:bg-[#2a4008] text-white font-bold text-sm inline-flex items-center gap-2 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>t.me/duckLingy</span>
                </a>
                <a
                  href={normalizeTelegramUrl(storeConfig.telegramBotUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-5 py-2.5 rounded-full bg-black/25 hover:bg-black/40 border border-white/30 text-white font-bold text-sm inline-flex items-center gap-2 transition-colors"
                >
                  <Bot className="w-4 h-4" />
                  <span>@payusnbot</span>
                </a>
              </div>
            </div>
          </section>
        )}

        {/* VIEW 7: OWNER PANEL */}
        {view === 'owner' && (
          <OwnerPanel
            user={user}
            isAdmin={isAdmin}
            authLoading={authLoading}
            usernames={usernames}
            adminCards={adminCards}
            storeConfig={storeConfig}
            hasStoreConfigDoc={hasStoreConfigDoc}
            onBack={() => setView('menu')}
          />
        )}
      </main>

      {/* Username Detail Modal */}
      <UsernameDetailModal
        item={selectedUsername}
        storeConfig={storeConfig}
        onClose={() => setSelectedUsername(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GalleryApp />
    </ErrorBoundary>
  );
}
