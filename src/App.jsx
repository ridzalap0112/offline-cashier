import React, { useEffect, useState } from "react";
import { useLang } from "./hooks/useStore.js";
import { usePage } from "./hooks/useStore.js";
import { LANGS } from "./i18n/index.js";
import POS from "./pages/POS.jsx";
import Report from "./pages/Report.jsx";
import Products from "./pages/Products.jsx";
import { getSyncStatus, setupOnlineSync, syncPendingChanges } from "./services/cloudSync.js";

const segmentBase = "rounded-lg border-0 bg-transparent px-4 py-2.5 text-sm font-bold text-[var(--text-2)] transition hover:bg-white/50 hover:text-[var(--text)]";
const segmentActive = "bg-white text-[var(--accent-txt)] shadow-sm ring-1 ring-[var(--border)]";
const controlLabel = "mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-3)]";

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
    { key: "zh", label: "中文" },
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
      : syncStatus.online ? "Synced" : "Offline"
    : "Local";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <div className="flex min-h-[96px] shrink-0 items-center gap-6 border-b border-[var(--border)] bg-[rgba(255,253,248,0.94)] px-8 shadow-[var(--shadow-sm)] backdrop-blur">
        <div className="min-w-[190px] flex-1">
          <div className="font-display text-2xl font-extrabold text-[var(--text)]">{t.appTitle}</div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-3)]">Retail dashboard</div>
        </div>

        <div className="flex items-end gap-4 rounded-2xl border border-[var(--border)] bg-white/70 p-3.5 shadow-[var(--shadow-sm)]">
          <div>
            <span className={controlLabel}>Page</span>
            <div className="flex gap-1 rounded-lg bg-[var(--accent-l)] p-1">
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

          <div>
            <span className={controlLabel}>Language</span>
            <div className="flex gap-1 rounded-lg bg-[var(--accent-l)] p-1">
              {langItems.map(({ key, label }) => (
                <button
                  key={key}
                  className={`${segmentBase} px-4 ${lang === key ? segmentActive : ""}`}
                  onClick={() => setLang(key)}
                >
                  {key === "zh" ? "中文" : label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={controlLabel}>Sync</span>
            <button
              type="button"
              className={`flex h-[38px] min-w-[88px] items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--text-2)] shadow-sm transition hover:border-[var(--border-md)] ${!syncStatus?.configured ? "text-[var(--text-3)]" : ""}`}
              onClick={handleSync}
              title={syncStatus?.configured ? (syncStatus.lastError || "Sinkronisasi cloud") : "Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY untuk mengaktifkan Supabase sync"}
            >
              <span className={`h-2 w-2 rounded-full ${syncStatus?.configured ? "bg-[var(--accent)]" : "bg-[var(--text-3)]"}`} />
              {syncLabel}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {page === "pos" && <POS />}
        {page === "report" && <Report />}
        {page === "products" && <Products />}
      </div>
    </div>
  );
}
