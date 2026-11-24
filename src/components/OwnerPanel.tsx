import React, { useEffect, useState } from 'react';
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { type User } from 'firebase/auth';
import {
  Check,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UserPlus,
} from 'lucide-react';
import {
  db,
  handleFirestoreError,
  OperationType,
  signInWithGoogle,
  signOutAccount,
} from '../firebase';
import {
  type AdminCardItem,
  DEFAULT_OWNER_CARD,
  DESCRIPTION_PRESETS,
  formatUsernamePrice,
  MAX_DESCRIPTION_LEN,
  MAX_KEPT_DATE_LEN,
  MAX_PRICE,
  MAX_USERNAME_LEN,
  OWNER_EMAIL,
  type StoreConfig,
  USERNAME_CATEGORIES,
  USERNAME_REGEX,
  USERNAME_STATUSES,
  type UsernameCategory,
  type UsernameItem,
  type UsernameStatus,
} from '../types';

interface OwnerPanelProps {
  user: User | null;
  isAdmin: boolean;
  authLoading: boolean;
  usernames: UsernameItem[];
  adminCards: AdminCardItem[];
  storeConfig: StoreConfig;
  hasStoreConfigDoc: boolean;
  onBack: () => void;
}

function getTodayFormatted(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd} - ${mm} - ${yyyy}`;
}

export function OwnerPanel({
  user,
  isAdmin,
  authLoading,
  usernames,
  adminCards,
  storeConfig,
  hasStoreConfigDoc,
  onBack,
}: OwnerPanelProps) {
  const [activeTab, setActiveTab] = useState<'usernames' | 'settings' | 'admins'>('usernames');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Username form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [categoryInput, setCategoryInput] = useState<UsernameCategory>('uncommon');
  const [statusInput, setStatusInput] = useState<UsernameStatus>('available to buy');
  const [descriptionInput, setDescriptionInput] = useState('username bersih');
  const [keptDateInput, setKeptDateInput] = useState(getTodayFormatted());
  const [priceInput, setPriceInput] = useState('150000');
  const [askOwnerPriceInput, setAskOwnerPriceInput] = useState(false);
  const [availableForTradeInput, setAvailableForTradeInput] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'trade' | UsernameCategory>('all');

  // Store config form state
  const [tgAccount, setTgAccount] = useState(storeConfig.telegramAccountUrl);
  const [tgBot, setTgBot] = useState(storeConfig.telegramBotUrl);
  const [primaryTarget, setPrimaryTarget] = useState<'account' | 'bot'>(
    storeConfig.primaryBuyTarget
  );
  const [testimonialUrl, setTestimonialUrl] = useState(storeConfig.testimonialUrl);
  const [stepsText, setStepsText] = useState(storeConfig.howToOrderSteps.join('\n'));
  const [orderNote, setOrderNote] = useState(storeConfig.howToOrderNote || '');

  useEffect(() => {
    setTgAccount(storeConfig.telegramAccountUrl);
    setTgBot(storeConfig.telegramBotUrl);
    setPrimaryTarget(storeConfig.primaryBuyTarget);
    setTestimonialUrl(storeConfig.testimonialUrl);
    setStepsText(storeConfig.howToOrderSteps.join('\n'));
    setOrderNote(storeConfig.howToOrderNote || '');
  }, [storeConfig]);

  // Admin card form state
  const [adminName, setAdminName] = useState('');
  const [adminRole, setAdminRole] = useState('ADMIN');
  const [adminTgUrl, setAdminTgUrl] = useState('https://t.me/');
  const [adminVerticalTag, setAdminVerticalTag] = useState('KEROCOO');
  const [adminGallery, setAdminGallery] = useState('@kerocoo');
  const [adminPayment, setAdminPayment] = useState('@mourah');
  const [adminBot, setAdminBot] = useState('@payusnbot');
  const [adminPhoto, setAdminPhoto] = useState('');

  const flashSuccess = (msg: string) => {
    setErrorMsg(null);
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const resetUsernameForm = () => {
    setEditingId(null);
    setUsernameInput('');
    setStatusInput('available to buy');
    setDescriptionInput('username bersih');
    setKeptDateInput(getTodayFormatted());
    setPriceInput('150000');
    setAskOwnerPriceInput(false);
    setAvailableForTradeInput(false);
  };

  const handleLogin = async () => {
    setErrorMsg(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal masuk dengan akun Google.'
      );
    }
  };

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;
    setErrorMsg(null);

    let normalized = usernameInput.trim();
    if (normalized && !normalized.startsWith('@')) {
      normalized = '@' + normalized;
    }

    if (!USERNAME_REGEX.test(normalized) || normalized.length > MAX_USERNAME_LEN) {
      setErrorMsg(
        'Format username harus diawali @ dan hanya berisi huruf, angka, atau underscore (contoh: @kerocoo).'
      );
      return;
    }

    const cleanDesc = descriptionInput.trim().slice(0, MAX_DESCRIPTION_LEN);
    if (!cleanDesc) {
      setErrorMsg('Keterangan username tidak boleh kosong.');
      return;
    }

    const cleanDate = keptDateInput.trim().slice(0, MAX_KEPT_DATE_LEN);
    if (!cleanDate) {
      setErrorMsg('Tanggal keep tidak boleh kosong.');
      return;
    }

    const numericPrice = askOwnerPriceInput
      ? 0
      : Number(priceInput.replace(/[^0-9]/g, ''));
    if (
      !askOwnerPriceInput &&
      (!Number.isFinite(numericPrice) || numericPrice < 0 || numericPrice > MAX_PRICE)
    ) {
      setErrorMsg('Harga harus berupa angka valid (0 - 1.000.000.000).');
      return;
    }

    setBusy(true);
    try {
      if (editingId) {
        const ref = doc(db, 'usernames', editingId);
        await updateDoc(ref, {
          username: normalized,
          category: categoryInput,
          status: statusInput,
          description: cleanDesc,
          keptDate: cleanDate,
          price: numericPrice,
          askOwnerPrice: askOwnerPriceInput,
          availableForTrade: availableForTradeInput,
          updatedAt: serverTimestamp(),
        });
        flashSuccess(`Username ${normalized} berhasil diperbarui.`);
      } else {
        const docId = `usn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const ref = doc(db, 'usernames', docId);
        await setDoc(ref, {
          username: normalized,
          category: categoryInput,
          status: statusInput,
          description: cleanDesc,
          keptDate: cleanDate,
          price: numericPrice,
          askOwnerPrice: askOwnerPriceInput,
          availableForTrade: availableForTradeInput,
          ownerUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        flashSuccess(
          `Username ${normalized} otomatis masuk ke kategori "${categoryInput}".`
        );
      }
      resetUsernameForm();
    } catch (err) {
      handleFirestoreError(
        err,
        editingId ? OperationType.UPDATE : OperationType.CREATE,
        editingId ? `usernames/${editingId}` : 'usernames'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleEditClick = (item: UsernameItem) => {
    setEditingId(item.id);
    setUsernameInput(item.username);
    setCategoryInput(item.category);
    setStatusInput(item.status);
    setDescriptionInput(item.description);
    setKeptDateInput(item.keptDate);
    setPriceInput(String(item.price));
    setAskOwnerPriceInput(Boolean(item.askOwnerPrice));
    setAvailableForTradeInput(Boolean(item.availableForTrade));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickStatus = async (item: UsernameItem, nextStatus: UsernameStatus) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'usernames', item.id), {
        username: item.username,
        category: item.category,
        status: nextStatus,
        description: item.description,
        keptDate: item.keptDate,
        price: item.price,
        askOwnerPrice: Boolean(item.askOwnerPrice),
        availableForTrade: Boolean(item.availableForTrade),
        updatedAt: serverTimestamp(),
      });
      flashSuccess(`Status ${item.username} diubah ke "${nextStatus}".`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `usernames/${item.id}`);
    }
  };

  const handleQuickTrade = async (item: UsernameItem) => {
    if (!isAdmin) return;
    const nextTrade = !item.availableForTrade;
    try {
      await updateDoc(doc(db, 'usernames', item.id), {
        username: item.username,
        category: item.category,
        status: item.status,
        description: item.description,
        keptDate: item.keptDate,
        price: item.price,
        askOwnerPrice: Boolean(item.askOwnerPrice),
        availableForTrade: nextTrade,
        updatedAt: serverTimestamp(),
      });
      flashSuccess(
        nextTrade
          ? `${item.username} ditandai available untuk trade.`
          : `${item.username} dihapus dari daftar trade.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `usernames/${item.id}`);
    }
  };

  const handleDeleteUsername = async (item: UsernameItem) => {
    if (!isAdmin) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, 'usernames', item.id));
      flashSuccess(`Username ${item.username} dihapus dari gallery.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `usernames/${item.id}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSeedSamples = async () => {
    if (!user || !isAdmin) return;
    setBusy(true);
    try {
      const batch = writeBatch(db);
      const samples: Array<{
        username: string;
        category: UsernameCategory;
        price: number;
        description: string;
      }> = [
        { username: '@velour', category: 'uncommon', price: 250000, description: 'username bersih, ready pindah' },
        { username: '@lullaby', category: 'uncommon', price: 300000, description: 'username bersih, rare word' },
        { username: '@kyrra', category: 'related girl', price: 150000, description: 'username bersih, cute name' },
        { username: '@kaelix', category: 'related boy', price: 150000, description: 'username bersih, clean boy' },
        { username: '@mourah', category: 'related BA', price: 200000, description: 'username bersih, cocok untuk BA' },
        { username: '@lumiere', category: 'bahasa lain', price: 220000, description: 'bahasa prancis, username bersih' },
      ];
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const id = `sample_${Date.now()}_${i}`;
        batch.set(doc(db, 'usernames', id), {
          username: s.username,
          category: s.category,
          status: 'available to buy',
          description: s.description,
          keptDate: getTodayFormatted(),
          price: s.price,
          ownerUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      flashSuccess('6 contoh username berhasil ditambahkan ke kategori!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'usernames');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const steps = stepsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10)
      .map((s) => s.slice(0, 300));

    if (steps.length === 0) {
      setErrorMsg('Isi minimal 1 langkah cara order.');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        telegramAccountUrl: tgAccount.trim().slice(0, 200),
        telegramBotUrl: tgBot.trim().slice(0, 200),
        primaryBuyTarget: primaryTarget,
        testimonialUrl: testimonialUrl.trim().slice(0, 200),
        howToOrderSteps: steps,
        howToOrderNote: orderNote.trim().slice(0, 500),
        updatedAt: serverTimestamp(),
      };
      const ref = doc(db, 'storeConfig', 'main');
      if (hasStoreConfigDoc) {
        await updateDoc(ref, payload);
      } else {
        await setDoc(ref, payload);
      }
      flashSuccess('Pengaturan link Telegram & How To Order tersimpan.');
    } catch (err) {
      handleFirestoreError(
        err,
        hasStoreConfigDoc ? OperationType.UPDATE : OperationType.CREATE,
        'storeConfig/main'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAddAdminCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!adminName.trim() || !adminTgUrl.trim()) {
      setErrorMsg('Nama admin dan link Telegram wajib diisi.');
      return;
    }

    setBusy(true);
    try {
      const id = `adm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await setDoc(doc(db, 'adminCards', id), {
        name: adminName.trim().slice(0, 80),
        role: (adminRole.trim() || 'ADMIN').slice(0, 40),
        photoUrl: adminPhoto.trim().slice(0, 500),
        verticalTag: (adminVerticalTag.trim() || 'KEROCOO').slice(0, 24),
        galleryHandle: adminGallery.trim().slice(0, 64),
        paymentChannel: adminPayment.trim().slice(0, 64),
        anotherHandle: '',
        botHandle: adminBot.trim().slice(0, 64),
        telegramUrl: adminTgUrl.trim().slice(0, 200),
        sortOrder: adminCards.length + 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setAdminName('');
      setAdminPhoto('');
      flashSuccess('Kartu admin baru berhasil ditambahkan.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'adminCards');
    } finally {
      setBusy(false);
    }
  };

  const handleSeedDefaultOwnerCard = async () => {
    if (!isAdmin) return;
    setBusy(true);
    try {
      await setDoc(doc(db, 'adminCards', DEFAULT_OWNER_CARD.id), {
        name: DEFAULT_OWNER_CARD.name,
        role: DEFAULT_OWNER_CARD.role,
        photoUrl: DEFAULT_OWNER_CARD.photoUrl || '',
        verticalTag: DEFAULT_OWNER_CARD.verticalTag,
        galleryHandle: DEFAULT_OWNER_CARD.galleryHandle || '',
        paymentChannel: DEFAULT_OWNER_CARD.paymentChannel || '',
        anotherHandle: DEFAULT_OWNER_CARD.anotherHandle || '',
        botHandle: DEFAULT_OWNER_CARD.botHandle || '',
        telegramUrl: DEFAULT_OWNER_CARD.telegramUrl,
        sortOrder: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      flashSuccess('Kartu Owner utama berhasil disimpan ke database.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `adminCards/${DEFAULT_OWNER_CARD.id}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAdminCard = async (id: string) => {
    if (!isAdmin) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, 'adminCards', id));
      flashSuccess('Kartu admin dihapus.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `adminCards/${id}`);
    } finally {
      setBusy(false);
    }
  };

  const filteredUsernames =
    filterCategory === 'all'
      ? usernames
      : filterCategory === 'trade'
        ? usernames.filter((u) => u.availableForTrade)
        : usernames.filter((u) => u.category === filterCategory);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pb-12 pt-2 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-outline-green tracking-tight">
            PANEL KELOLA GALLERY
          </h2>
          <p className="text-sm text-white mt-0.5">
            Input username baru dan otomatis tampil di kolom katalog semua pengunjung.
          </p>
        </div>

        {user && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/95 hidden sm:inline">
              {user.email}
            </span>
            <button
              type="button"
              onClick={signOutAccount}
              className="glass-pill px-4 py-2 rounded-full text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar
            </button>
          </div>
        )}
      </div>

      {authLoading ? (
        <div className="glass-panel rounded-3xl p-8 text-center text-white">
          Memeriksa sesi login...
        </div>
      ) : !user ? (
        <div className="glass-panel rounded-3xl p-8 max-w-lg mx-auto text-center space-y-4">
          <h3 className="font-display-serif text-2xl font-bold text-white">
            Masuk Sebagai Owner
          </h3>
          <p className="text-sm text-white/95 leading-relaxed">
            Untuk menjaga agar pengunjung lain tidak bisa mengubah daftar username Anda, silakan login dengan akun Google owner ({OWNER_EMAIL}).
          </p>
          {errorMsg && (
            <p className="text-xs text-rose-100 bg-rose-950/60 border border-rose-400/40 rounded-xl px-3 py-2">
              {errorMsg}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleLogin}
              className="glass-pill px-6 py-3 rounded-full text-sm font-bold text-white inline-flex items-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Login dengan Google
            </button>
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-3 rounded-full text-sm font-semibold text-white/95 hover:text-white cursor-pointer"
            >
              Kembali ke Gallery
            </button>
          </div>
        </div>
      ) : !isAdmin ? (
        <div className="glass-panel rounded-3xl p-8 max-w-lg mx-auto text-center space-y-4">
          <h3 className="font-display-serif text-xl font-bold text-white">
            Akses Terbatas
          </h3>
          <p className="text-sm text-white/95">
            Akun <strong>{user.email}</strong> belum terdaftar sebagai admin gallery. Silakan masuk dengan akun owner <strong>{OWNER_EMAIL}</strong>.
          </p>
          <button
            type="button"
            onClick={signOutAccount}
            className="glass-pill px-6 py-2.5 rounded-full text-sm font-semibold text-white cursor-pointer"
          >
            Ganti Akun Google
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('usernames')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                activeTab === 'usernames'
                  ? 'bg-[#729642] text-white shadow-md border border-white/40'
                  : 'glass-pill text-white'
              }`}
            >
              Kelola Username ({usernames.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#729642] text-white shadow-md border border-white/40'
                  : 'glass-pill text-white'
              }`}
            >
              Link Telegram & How To Order
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('admins')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                activeTab === 'admins'
                  ? 'bg-[#729642] text-white shadow-md border border-white/40'
                  : 'glass-pill text-white'
              }`}
            >
              List Admin ({adminCards.length})
            </button>
          </div>

          {statusMsg && (
            <div className="rounded-2xl bg-[#36510b]/90 border border-[#a3d466]/50 px-4 py-3 text-sm font-medium text-[#f1ffe0] flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-2xl bg-rose-950/80 border border-rose-400/50 px-4 py-3 text-sm font-medium text-rose-100">
              {errorMsg}
            </div>
          )}

          {activeTab === 'usernames' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Form Input Username */}
              <form
                onSubmit={handleSaveUsername}
                className="lg:col-span-5 glass-panel rounded-3xl p-5 sm:p-6 space-y-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-white">
                    {editingId ? 'Edit Username' : 'Input Username Baru'}
                  </h3>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetUsernameForm}
                      className="text-xs text-white/95 hover:text-white underline cursor-pointer"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-white">
                    Username Telegram
                  </label>
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="@contohusn"
                    className="w-full rounded-xl bg-white/10 border border-white/25 px-3.5 py-2.5 text-sm text-white placeholder-white/75 focus:outline-none focus:border-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-white">
                      Kategori Jenis
                    </label>
                    <select
                      value={categoryInput}
                      onChange={(e) => {
                        const nextCat = e.target.value as UsernameCategory;
                        setCategoryInput(nextCat);
                        if (!editingId && nextCat === 'sermabu') {
                          setAskOwnerPriceInput(false);
                          setPriceInput('5000');
                        }
                      }}
                      className="w-full rounded-xl bg-[#253b16] border border-white/25 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white"
                    >
                      {USERNAME_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat === 'sermabu' ? 'sermabu (serba 5rb)' : cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-white">
                      Status
                    </label>
                    <select
                      value={statusInput}
                      onChange={(e) =>
                        setStatusInput(e.target.value as UsernameStatus)
                      }
                      className="w-full rounded-xl bg-[#253b16] border border-white/25 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white"
                    >
                      {USERNAME_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="block text-xs font-semibold text-white">
                        Harga
                      </label>
                      <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-black/30 border border-white/15">
                        <button
                          type="button"
                          onClick={() => setAskOwnerPriceInput(false)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                            !askOwnerPriceInput
                              ? 'bg-[#729642] text-white'
                              : 'text-white/90 hover:text-white'
                          }`}
                        >
                          Nominal (Rp)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAskOwnerPriceInput(true)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                            askOwnerPriceInput
                              ? 'bg-[#729642] text-white'
                              : 'text-white/90 hover:text-white'
                          }`}
                        >
                          Ask Owner
                        </button>
                      </div>
                    </div>

                    {askOwnerPriceInput ? (
                      <div className="w-full rounded-xl bg-white/10 border border-[#a3d466]/50 px-3.5 py-2.5 text-sm font-semibold text-[#f7ffe8]">
                        Ask Owner — harga disembunyikan (buyer diarahkan ke bot / personal chat)
                      </div>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        max={MAX_PRICE}
                        required
                        value={priceInput}
                        onChange={(e) => setPriceInput(e.target.value)}
                        placeholder="150000"
                        className="w-full rounded-xl bg-white/10 border border-white/25 px-3.5 py-2.5 text-sm text-white placeholder-white/75 font-mono-num focus:outline-none focus:border-white"
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-white">
                      Tanggal Keep
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={MAX_KEPT_DATE_LEN}
                      value={keptDateInput}
                      onChange={(e) => setKeptDateInput(e.target.value)}
                      placeholder="24 - 11 - 2026"
                      className="w-full rounded-xl bg-white/10 border border-white/25 px-3.5 py-2.5 text-sm text-white placeholder-white/75 font-mono-num focus:outline-none focus:border-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-xs font-semibold text-white">
                      Keterangan
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {DESCRIPTION_PRESETS.map((preset) => {
                        const isActive =
                          descriptionInput.trim().toLowerCase() === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setDescriptionInput(preset)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-[#729642] border-white/50 text-white'
                                : 'bg-white/10 hover:bg-white/20 border-white/25 text-white'
                            }`}
                          >
                            {preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    required
                    maxLength={MAX_DESCRIPTION_LEN}
                    value={descriptionInput}
                    onChange={(e) => setDescriptionInput(e.target.value)}
                    placeholder="username bersih / available nego / nett / not for sale"
                    className="w-full rounded-xl bg-white/10 border border-white/25 px-3.5 py-2.5 text-sm text-white placeholder-white/75 focus:outline-none focus:border-white resize-none"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl bg-white/10 border border-white/20 px-3.5 py-2.5">
                  <div>
                    <p className="text-xs font-semibold text-white">
                      Available untuk Trade
                    </p>
                    <p className="text-[11px] text-white/90">
                      Tampilkan di menu filter tombol trade
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-black/30 border border-white/15 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAvailableForTradeInput(false)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                        !availableForTradeInput
                          ? 'bg-white/20 text-white'
                          : 'text-white/90 hover:text-white'
                      }`}
                    >
                      Tidak
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvailableForTradeInput(true)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                        availableForTradeInput
                          ? 'bg-[#729642] text-white'
                          : 'text-white/90 hover:text-white'
                      }`}
                    >
                      Ya, Trade
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full min-h-[46px] rounded-full bg-[#729642] hover:bg-[#82aa4c] disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
                >
                  {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>
                    {busy
                      ? 'Menyimpan...'
                      : editingId
                        ? 'Simpan Perubahan'
                        : 'Simpan ke Gallery'}
                  </span>
                </button>

                {usernames.length === 0 && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleSeedSamples}
                    className="w-full min-h-[40px] rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center justify-center gap-1.5 border border-white/25 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Isi 6 Contoh Username Awal</span>
                  </button>
                )}
              </form>

              {/* List Existing Usernames */}
              <div className="lg:col-span-7 glass-panel rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-bold text-white">
                    Daftar Username di Katalog
                  </h3>
                  <select
                    value={filterCategory}
                    onChange={(e) =>
                      setFilterCategory(
                        e.target.value as 'all' | 'trade' | UsernameCategory
                      )
                    }
                    className="rounded-xl bg-[#253b16] border border-white/25 px-3 py-1.5 text-xs font-semibold text-white focus:outline-none"
                  >
                    <option value="all">Semua Kategori ({usernames.length})</option>
                    <option value="trade">
                      Available Trade ({usernames.filter((u) => u.availableForTrade).length})
                    </option>
                    {USERNAME_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c} ({usernames.filter((u) => u.category === c).length})
                      </option>
                    ))}
                  </select>
                </div>

                {filteredUsernames.length === 0 ? (
                  <p className="text-sm text-white/95 py-8 text-center">
                    Belum ada username di kategori ini. Tambahkan lewat form di samping.
                  </p>
                ) : (
                  <div className="divide-y divide-white/15 max-h-[540px] overflow-y-auto pr-1">
                    {filteredUsernames.map((item) => (
                      <div
                        key={item.id}
                        className="py-3 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-white text-sm sm:text-base">
                              {item.username}
                            </span>
                            <span className="text-xs text-white/90">
                              {item.category} · {item.status}
                              {item.availableForTrade ? ' · open trade' : ''}
                            </span>
                          </div>
                          <p className="text-xs text-white/95 mt-0.5 font-mono-num">
                            {formatUsernamePrice(item)} · Keep: {item.keptDate}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleQuickTrade(item)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                              item.availableForTrade
                                ? 'bg-[#729642] text-white'
                                : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                          >
                            {item.availableForTrade ? 'Trade On' : '+ Trade'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickStatus(
                                item,
                                item.status === 'available to buy'
                                  ? 'sold'
                                  : 'available to buy'
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white cursor-pointer"
                          >
                            {item.status === 'available to buy'
                              ? 'Tandai Sold'
                              : 'Set Available'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditClick(item)}
                            aria-label={`Edit ${item.username}`}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUsername(item)}
                            aria-label={`Hapus ${item.username}`}
                            className="p-2 rounded-lg bg-rose-500/25 hover:bg-rose-500/45 text-rose-100 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <form
              onSubmit={handleSaveSettings}
              className="glass-panel rounded-3xl p-6 max-w-2xl space-y-4"
            >
              <h3 className="text-lg font-bold text-white">
                Pengaturan Telegram & How To Order
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-white">
                    Link Akun Telegram Owner
                  </label>
                  <input
                    type="text"
                    required
                    value={tgAccount}
                    onChange={(e) => setTgAccount(e.target.value)}
                    className="w-full rounded-xl bg-white/10 border border-white/25 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-white">
                    Link Bot Order Telegram
                  </label>
                  <input
                    type="text"
                    required
                    value={tgBot}
                    onChange={(e) => setTgBot(e.target.value)}
                    className="w-full rounded-xl bg-white/10 border border-white/25 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-white">
                    Tujuan Utama Tombol "Beli Sekarang"
                  </label>
                  <select
                    value={primaryTarget}
                    onChange={(e) =>
                      setPrimaryTarget(e.target.value as 'account' | 'bot')
                    }
                    className="w-full rounded-xl bg-[#253b16] border border-white/25 px-3 py-2.5 text-sm text-white"
                  >
                    <option value="account">Akun Telegram (t.me/duckLingy)</option>
                    <option value="bot">Bot Telegram (@payusnbot)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-white">
                    Link Channel Testimoni
                  </label>
                  <input
                    type="text"
                    required
                    value={testimonialUrl}
                    onChange={(e) => setTestimonialUrl(e.target.value)}
                    className="w-full rounded-xl bg-white/10 border border-white/25 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white">
                  Langkah How To Order (1 baris = 1 langkah, maks 10 baris)
                </label>
                <textarea
                  rows={5}
                  value={stepsText}
                  onChange={(e) => setStepsText(e.target.value)}
                  className="w-full rounded-xl bg-white/10 border border-white/25 px-3.5 py-2.5 text-sm text-white leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white">
                  Catatan Tambahan Order
                </label>
                <textarea
                  rows={2}
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="w-full rounded-xl bg-white/10 border border-white/25 px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="min-h-[44px] px-6 rounded-full bg-[#729642] hover:bg-[#82aa4c] text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{busy ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
              </button>
            </form>
          )}

          {activeTab === 'admins' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleAddAdminCard}
                className="lg:col-span-5 glass-panel rounded-3xl p-5 sm:p-6 space-y-3.5"
              >
                <h3 className="text-lg font-bold text-white">
                  Tambah Kartu Admin
                </h3>
                <input
                  type="text"
                  required
                  placeholder="Nama Admin (misal: yew cyrene)"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full rounded-xl bg-white/10 border border-white/25 px-3.5 py-2.5 text-sm text-white placeholder-white/75"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Role (OWNER / ADMIN)"
                    value={adminRole}
                    onChange={(e) => setAdminRole(e.target.value)}
                    className="w-full rounded-xl bg-white/10 border border-white/25 px-3.5 py-2.5 text-sm text-white placeholder-white/75"
                  />
                  <input
                    type="text"
                    placeholder="Teks Vertikal (DUCKLINGY)"
                    value={adminVerticalTag}
                    onChange={(e) => setAdminVerticalTag(e.target.value)}
                    className="w-full rounded-xl bg-white/10 border border-white/25 px-3.5 py-2.5 text-sm text-white placeholder-white/75"
                  />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Link Telegram (https://t.me/duckLingy)"
                  value={adminTgUrl}
                  onChange={(e) => setAdminTgUrl(e.target.value)}
                  className="w-full rounded-xl bg-white/10 border border-white/25 px-3.5 py-2.5 text-sm text-white placeholder-white/75"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Gallery (@kerocoo)"
                    value={adminGallery}
                    onChange={(e) => setAdminGallery(e.target.value)}
                    className="w-full rounded-xl bg-white/10 border border-white/25 px-3.5 py-2.5 text-sm text-white placeholder-white/75"
                  />
                  <input
                    type="text"
                    placeholder="Ch Payment (@mourah)"
                    value={adminPayment}
                    onChange={(e) => setAdminPayment(e.target.value)}
                    className="w-full rounded-xl bg-white/10 border border-white/25 px-3.5 py-2.5 text-sm text-white placeholder-white/75"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Bot Handle (@payusnbot)"
                  value={adminBot}
                  onChange={(e) => setAdminBot(e.target.value)}
                  className="w-full rounded-xl bg-white/10 border border-white/25 px-3.5 py-2.5 text-sm text-white placeholder-white/75"
                />
                <input
                  type="text"
                  placeholder="URL Foto Profil (opsional)"
                  value={adminPhoto}
                  onChange={(e) => setAdminPhoto(e.target.value)}
                  className="w-full rounded-xl bg-white/10 border border-white/25 px-3.5 py-2.5 text-sm text-white placeholder-white/75"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full min-h-[44px] rounded-full bg-[#729642] hover:bg-[#82aa4c] text-white font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Tambah Admin</span>
                </button>
                {adminCards.length === 0 && (
                  <button
                    type="button"
                    onClick={handleSeedDefaultOwnerCard}
                    className="w-full min-h-[40px] rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/20 cursor-pointer"
                  >
                    Simpan Kartu Owner Default ke Database
                  </button>
                )}
              </form>

              <div className="lg:col-span-7 glass-panel rounded-3xl p-5 sm:p-6 space-y-3">
                <h3 className="text-lg font-bold text-white">
                  Daftar Admin Aktif
                </h3>
                {adminCards.length === 0 ? (
                  <p className="text-sm text-white/95">
                    Saat ini menampilkan kartu owner bawaan (@duckLingy / yew cyrene). Tambahkan admin lain jika ada.
                  </p>
                ) : (
                  <div className="divide-y divide-white/15">
                    {adminCards.map((adm) => (
                      <div
                        key={adm.id}
                        className="py-3 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-bold text-white text-sm">
                            {adm.name} · {adm.role}
                          </p>
                          <p className="text-xs text-white/95">{adm.telegramUrl}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteAdminCard(adm.id)}
                          className="p-2 rounded-lg bg-rose-500/25 hover:bg-rose-500/45 text-rose-100 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
