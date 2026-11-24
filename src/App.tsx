import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Minus,
  Music,
  Plus,
  Search,
  Settings,
  Send,
  Bot,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  isSoundEnabled,
  playCuteSound,
  setSoundEnabled,
  unlockAudioContext,
  type CuteSoundKind,
} from './utils/sound';
import {
  getMusicTrack,
  getMusicVolume,
  isMusicEnabled,
  MUSIC_TRACKS,
  type MusicTrackId,
  setMusicEnabled,
  setMusicTrack,
  setMusicVolume,
  startAmbientMusic,
} from './utils/ambientMusic';
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
  isNotForSaleDescription,
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
  const [selectedCategory, setSelectedCategory] = useState<
    UsernameCategory | 'trade'
  >('uncommon');
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
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());
  const [musicOn, setMusicOn] = useState<boolean>(() => isMusicEnabled());
  const [musicVolume, setMusicVolumeState] = useState<number>(() =>
    getMusicVolume()
  );
  const [musicTrack, setMusicTrackState] = useState<MusicTrackId>(() =>
    getMusicTrack()
  );
  const [soundMenuOpen, setSoundMenuOpen] = useState(false);
  const soundMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleUnlock = () => {
      unlockAudioContext();
      if (isMusicEnabled()) {
        startAmbientMusic();
      }
    };

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest(
        'button, a, [role="button"], [data-cute-sound]'
      ) as HTMLElement | null;

      if (!interactive) return;
      if (interactive.hasAttribute('data-sound-toggle')) return;
      if (
        (interactive as HTMLButtonElement).disabled ||
        interactive.getAttribute('aria-disabled') === 'true'
      ) {
        return;
      }

      const customKind = interactive.getAttribute(
        'data-cute-sound'
      ) as CuteSoundKind | null;

      playCuteSound(customKind || 'pop');
    };

    document.addEventListener('pointerdown', handleUnlock, {
      capture: true,
      passive: true,
    });
    document.addEventListener('click', handleGlobalClick, { capture: true });

    return () => {
      document.removeEventListener('pointerdown', handleUnlock, {
        capture: true,
      });
      document.removeEventListener('click', handleGlobalClick, {
        capture: true,
      });
    };
  }, []);

  useEffect(() => {
    if (!soundMenuOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (
        soundMenuRef.current &&
        !soundMenuRef.current.contains(e.target as Node)
      ) {
        setSoundMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSoundMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [soundMenuOpen]);

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
            askOwnerPrice: Boolean(data.askOwnerPrice),
            availableForTrade: Boolean(data.availableForTrade),
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

  const tradeCount = useMemo(
    () => usernames.filter((u) => u.availableForTrade && u.status !== 'sold').length,
    [usernames]
  );

  const activeCategoryItems = useMemo(() => {
    const filtered = usernames.filter((u) => {
      if (selectedCategory === 'trade') {
        if (!u.availableForTrade || u.status === 'sold') return false;
      } else if (u.category !== selectedCategory) {
        return false;
      }
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

  const handleOpenCategory = (cat: UsernameCategory | 'trade') => {
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
      {/* Full-viewport Lakeside & Trees Backdrop */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('./assets/aistudio/629aae7a46a991da0e8eabddfd8749c2__1__51a048e1.jpg')",
        }}
        aria-hidden="true"
      />
      {/* Subtle atmospheric contrast scrim */}
      <div
        className="fixed inset-0 z-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40 pointer-events-none"
        aria-hidden="true"
      />

      {/* Compact Top Bar */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between gap-4">
        <div className="min-w-[96px]">
          {view !== 'welcome' && (
            <button
              type="button"
              data-cute-sound="back"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-full bg-black/25 hover:bg-black/40 backdrop-blur-md border border-white/30 text-white font-bold text-sm transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div ref={soundMenuRef}>
            <button
              type="button"
              data-sound-toggle="true"
              onClick={() => {
                unlockAudioContext();
                if (musicOn) {
                  startAmbientMusic();
                }
                setSoundMenuOpen((open) => !open);
                if (soundOn) {
                  playCuteSound('pop');
                }
              }}
              aria-label="Pengaturan musik & suara"
              aria-expanded={soundMenuOpen}
              title="Pengaturan musik & suara"
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/30 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              {!musicOn && !soundOn ? (
                <VolumeX className="w-4 h-4" />
              ) : musicOn && musicVolume > 0 && musicVolume < 0.45 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Suara</span>
            </button>

            {soundMenuOpen && (
              <div className="absolute right-4 sm:right-6 top-full mt-1 w-[calc(100vw-2rem)] max-w-[320px] rounded-2xl bg-[#203410]/95 backdrop-blur-xl border border-white/30 shadow-[0_20px_45px_rgba(0,0,0,0.55)] p-4 space-y-3.5 text-white z-50">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-[#b4ec6b]" />
                    <span className="text-xs font-bold tracking-wide uppercase text-[#f5ffde]">
                      Musik & Suara
                    </span>
                  </div>
                  <button
                    type="button"
                    data-sound-toggle="true"
                    onClick={() => {
                      const next = !musicOn;
                      setMusicOn(next);
                      setMusicEnabled(next);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                      musicOn
                        ? 'bg-[#7aa442] text-white border border-white/35'
                        : 'bg-white/15 text-white/90 hover:bg-white/25'
                    }`}
                  >
                    {musicOn ? 'Musik Aktif' : 'Musik Mati'}
                  </button>
                </div>

                {/* Track Switcher */}
                <div className="space-y-2 rounded-xl bg-black/25 border border-white/15 p-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#f5ffde]">
                      Pilih Musik Alam
                    </span>
                    <span className="text-[11px] text-white/85 truncate max-w-[145px]">
                      {MUSIC_TRACKS.find((t) => t.id === musicTrack)?.title}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {MUSIC_TRACKS.map((track) => {
                      const isCurrent = track.id === musicTrack;
                      return (
                        <button
                          key={track.id}
                          type="button"
                          data-sound-toggle="true"
                          onClick={() => {
                            unlockAudioContext();
                            setMusicTrackState(track.id);
                            if (!musicOn) {
                              setMusicOn(true);
                              setMusicEnabled(true);
                            }
                            setMusicTrack(track.id);
                            if (soundOn) {
                              playCuteSound('pop');
                            }
                          }}
                          className={`px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer border ${
                            isCurrent
                              ? 'bg-[#7aa442] border-white/45 text-white shadow-sm'
                              : 'bg-white/10 hover:bg-white/20 border-white/15 text-white/95'
                          }`}
                        >
                          <p className="text-[11px] font-bold leading-tight truncate">
                            {track.title}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-white/90 leading-snug">
                    {MUSIC_TRACKS.find((t) => t.id === musicTrack)?.subtitle}
                  </p>
                </div>

                {/* Volume Slider */}
                <div className="space-y-2 rounded-xl bg-black/25 border border-white/15 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#f5ffde]">
                      Volume Musik
                    </span>
                    <span className="font-mono-num font-bold text-white">
                      {musicOn ? `${Math.round(musicVolume * 100)}%` : 'Mati'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-sound-toggle="true"
                      aria-label="Kecilkan volume musik"
                      onClick={() => {
                        const nextVol = Math.max(0, Math.round((musicVolume - 0.15) * 100) / 100);
                        setMusicVolumeState(nextVol);
                        setMusicVolume(nextVol);
                        if (nextVol === 0) {
                          setMusicOn(false);
                          setMusicEnabled(false);
                        }
                      }}
                      className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white shrink-0 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={musicOn ? Math.round(musicVolume * 100) : 0}
                      onChange={(e) => {
                        const pct = Number(e.target.value);
                        const vol = pct / 100;
                        setMusicVolumeState(vol);
                        if (pct === 0) {
                          setMusicOn(false);
                          setMusicEnabled(false);
                          setMusicVolume(0);
                        } else {
                          if (!musicOn) {
                            setMusicOn(true);
                            setMusicEnabled(true);
                          }
                          setMusicVolume(vol);
                        }
                      }}
                      aria-label="Atur volume musik latar"
                      className="w-full accent-[#9ae04f] cursor-pointer h-2"
                    />

                    <button
                      type="button"
                      data-sound-toggle="true"
                      aria-label="Besarkan volume musik"
                      onClick={() => {
                        const base = musicOn ? musicVolume : 0;
                        const nextVol = Math.min(1, Math.round((base + 0.15) * 100) / 100);
                        setMusicVolumeState(nextVol);
                        if (!musicOn) {
                          setMusicOn(true);
                          setMusicEnabled(true);
                        }
                        setMusicVolume(nextVol);
                      }}
                      className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Click SFX Toggle */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/15">
                  <span className="text-xs font-semibold text-white">
                    Suara Klik Tombol
                  </span>
                  <button
                    type="button"
                    data-sound-toggle="true"
                    onClick={() => {
                      const next = !soundOn;
                      setSoundOn(next);
                      setSoundEnabled(next);
                      if (next) {
                        unlockAudioContext();
                        playCuteSound('chime');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                      soundOn
                        ? 'bg-[#7aa442] text-white border border-white/35'
                        : 'bg-white/15 text-white/90 hover:bg-white/25'
                    }`}
                  >
                    {soundOn ? 'Aktif' : 'Mati'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {isAdmin && view !== 'owner' && (
            <button
              type="button"
              onClick={() => setView('owner')}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-full bg-black/25 hover:bg-black/45 backdrop-blur-md border border-white/25 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Kelola Gallery</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="relative z-10 flex-1 flex flex-col justify-center w-full max-w-6xl mx-auto px-4 sm:px-6 py-4">
        {/* VIEW 1: WELCOME SCREEN */}
        {view === 'welcome' && (
          <section className="flex flex-col items-center justify-center text-center py-12 sm:py-20 space-y-6">
            <div className="space-y-2 max-w-2xl mx-auto">
              <h1
                className="font-display-serif text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-none text-[#88b548]"
                style={{
                  WebkitTextStroke: '1.8px #132607',
                  paintOrder: 'stroke fill',
                  textShadow: '0 6px 22px rgba(0,0,0,0.45)',
                }}
              >
                Selamat Datang
              </h1>
              <p className="font-display-serif italic text-xl sm:text-2xl md:text-3xl text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]">
                di gallery username{' '}
                <span
                  data-cute-sound="pop"
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
              data-cute-sound="chime"
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
                <ExternalLink className="w-4 h-4 opacity-95" />
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
              <div className="glass-panel rounded-2xl px-4 py-3 text-xs sm:text-sm text-white max-w-sm">
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
                    <span className="text-base sm:text-lg font-bold italic text-[#f7ffe8] drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
                      {category}
                    </span>
                    <span className="text-[11px] font-medium text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)] tabular-nums">
                      {category === 'sermabu'
                        ? `serba 5rb · ${count} usn`
                        : `${count} username`}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => handleOpenCategory('trade')}
                className="glass-pill min-h-[60px] px-4 py-3 rounded-full flex flex-col items-center justify-center transition-transform active:scale-[0.97] cursor-pointer"
              >
                <span className="text-base sm:text-lg font-bold italic text-[#f7ffe8] drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
                  trade
                </span>
                <span className="text-[11px] font-medium text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)] tabular-nums">
                  {tradeCount} available
                </span>
              </button>
            </div>
          </section>
        )}

        {/* VIEW 4: LIST USERNAME PER KATEGORI */}
        {view === 'usernames' && (
          <section className="flex flex-col items-center py-4 sm:py-8 space-y-6 max-w-4xl mx-auto w-full">
            {/* Category Header Pill */}
            <div className="glass-pill px-8 py-3 rounded-full text-center">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)]">
                {selectedCategory}
              </h2>
              {(selectedCategory === 'sermabu' || selectedCategory === 'trade') && (
                <p className="text-xs font-bold text-[#f3ffd8] tracking-wide drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
                  {selectedCategory === 'sermabu'
                    ? 'serba lima ribu'
                    : 'available untuk trade'}
                </p>
              )}
            </div>

            {/* Search Filter */}
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 text-white/95 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari @username..."
                className="w-full rounded-full bg-black/30 backdrop-blur-md border border-white/35 pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/85 focus:outline-none focus:border-white"
              />
            </div>

            {/* 2-col (mobile) / 3-col (desktop) Username Grid */}
            {loadingUsernames ? (
              <div className="glass-panel rounded-3xl px-8 py-10 text-center text-white text-sm">
                Memuat daftar username...
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className="glass-panel rounded-3xl p-8 max-w-md w-full text-center space-y-4">
                <p className="text-sm sm:text-base font-medium text-white">
                  {selectedCategory === 'trade' ? (
                    <>Belum ada username yang available untuk <strong>trade</strong>.</>
                  ) : (
                    <>
                      Belum ada username di kategori <strong>{selectedCategory}</strong>.
                    </>
                  )}
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
                      item.status === 'sold' ? 'opacity-80' : ''
                    }`}
                  >
                    <span
                      className={`text-base sm:text-lg font-extrabold tracking-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] truncate max-w-full ${
                        item.status === 'sold' ? 'line-through' : ''
                      }`}
                    >
                      {item.username}
                    </span>
                    {item.status !== 'available to buy' ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
                        {item.status}
                      </span>
                    ) : item.availableForTrade && selectedCategory === 'trade' ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#f5ffde] drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
                        available trade
                      </span>
                    ) : isNotForSaleDescription(item.description) ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
                        {item.availableForTrade ? 'not for sale · trade' : 'not for sale'}
                      </span>
                    ) : item.availableForTrade ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#f5ffde] drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
                        open trade
                      </span>
                    ) : null}
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
                <p className="text-center text-xs font-medium text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)] font-mono-num">
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
              <p className="text-xs sm:text-sm text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)] mt-1">
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
                    <span className="font-mono-num text-sm font-extrabold bg-[#36510b] text-[#f5ffde] w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <p className="text-sm sm:text-base font-medium leading-relaxed text-white">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>

              {storeConfig.howToOrderNote && (
                <div className="pt-4 border-t border-white/30 text-xs sm:text-sm text-white leading-relaxed">
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
