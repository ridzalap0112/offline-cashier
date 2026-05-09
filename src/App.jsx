import React, { useEffect, useState } from "react";
import { useLang, usePage } from "./hooks/useStore.js";
import { LANGS } from "./i18n/index.js";
import POS from "./pages/POS.jsx";
import Report from "./pages/Report.jsx";
import Products from "./pages/Products.jsx";
import { getSyncStatus, setupOnlineSync, syncPendingChanges } from "./services/cloudSync.js";

const segmentBase =
  "border-b-2 border-transparent px-1 py-2 text-sm font-bold text-[var(--text-2)] transition hover:text-[var(--text)]";
const segmentActive = "border-[var(--accent)] text-[var(--accent-txt)]";
const controlLabel = "text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--text-3)]";

export default function App() {
  const { lang, setLang } = useLang();
  const { page, setPage } = usePage();
  const [syncStatus, setSyncStatus] = useState(null);
  const t = LANGS[lang];

  const navItems = [
    { key: "pos", label: t.pos },
    { key: "report", label: t.report },
    { key: "products", label: t.products },
  ];

  const langItems = [
    { key: "id", label: "ID" },
    { key: "en", label: "EN" },
    { key: "zh", label: "ZH" },
  ];

  useEffect(() => {
    const refreshStatus = () => getSyncStatus().then(setSyncStatus);
    const cleanup = setupOnlineSync();
    refreshStatus();

    window.addEventListener("online", refreshStatus);
    window.addEventListener("offline", refreshStatus);
    const timer = window.setInterval(refreshStatus, 15000);

    return () => {
      cleanup();
      window.removeEventListener("online", refreshStatus);
      window.removeEventListener("offline", refreshStatus);
      window.clearInterval(timer);
    };
  }, []);

  const handleSync = async () => {
    await syncPendingChanges();
    setSyncStatus(await getSyncStatus());
  };

  const syncLabel = syncStatus?.configured
    ? syncStatus.pending > 0
      ? `Sync ${syncStatus.pending}`
      : syncStatus.online
        ? "Synced"
        : "Offline"
    : "Local";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <header className="flex min-h-[82px] shrink-0 items-center gap-8 border-b border-[var(--border)] bg-[rgba(255,253,248,0.96)] px-8 backdrop-blur">
        <div className="min-w-[220px] flex-1">
          <div className="font-display text-2xl font-extrabold text-[var(--text)]">{t.appTitle}</div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-3)]">
            Retail dashboard
          </div>
        </div>

        <nav className="flex items-center gap-7">
          <div className="flex items-center gap-4">
            <span className={controlLabel}>Page</span>
            <div className="flex items-center gap-4">
              {navItems.map(({ key, label }) => (
                <button
                  key={key}
                  className={`${segmentBase} ${page === key ? segmentActive : ""}`}
                  onClick={() => setPage(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-8 w-px bg-[var(--border)]" />

          <div className="flex items-center gap-4">
            <span className={controlLabel}>Language</span>
            <div className="flex items-center gap-3">
              {langItems.map(({ key, label }) => (
                <button
                  key={key}
                  className={`${segmentBase} min-w-8 ${lang === key ? segmentActive : ""}`}
                  onClick={() => setLang(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-8 w-px bg-[var(--border)]" />

          <div className="flex items-center gap-4">
            <span className={controlLabel}>Sync</span>
            <button
              type="button"
              className={`flex min-w-[78px] items-center justify-center gap-2 border-b-2 border-transparent py-2 text-sm font-bold text-[var(--text-2)] transition hover:text-[var(--text)] ${
                !syncStatus?.configured ? "text-[var(--text-3)]" : ""
              }`}
              onClick={handleSync}
              title={
                syncStatus?.configured
                  ? syncStatus.lastError || "Sinkronisasi cloud"
                  : "Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY untuk mengaktifkan Supabase sync"
              }
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  syncStatus?.configured ? "bg-[var(--accent)]" : "bg-[var(--text-3)]"
                }`}
              />
              {syncLabel}
            </button>
          </div>
        </nav>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        {page === "pos" && <POS />}
        {page === "report" && <Report />}
        {page === "products" && <Products />}
      </div>
    </div>
  );
}
