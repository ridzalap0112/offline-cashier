import React from "react";
import { useLang } from "./hooks/useStore.js";
import { usePage } from "./hooks/useStore.js";
import { LANGS } from "./i18n/index.js";
import POS from "./pages/POS.jsx";
import Report from "./pages/Report.jsx";
import Products from "./pages/Products.jsx";

const s = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
  },
  topbar: {
    background: "#fff",
    borderBottom: "0.5px solid rgba(0,0,0,0.12)",
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    gap: 12,
    height: 48,
    flexShrink: 0,
  },
  title: { fontSize: 15, fontWeight: 600, letterSpacing: "-0.3px", flex: 1 },
  nav: {
    display: "flex",
    background: "#F0EDE6",
    borderRadius: 9,
    padding: 3,
    gap: 2,
  },
  navBtn: {
    padding: "4px 12px",
    border: "none",
    background: "transparent",
    borderRadius: 6,
    fontSize: 12,
    cursor: "pointer",
    color: "#6B6860",
    fontWeight: 500,
    transition: "all .13s",
  },
  navA: {
    background: "#fff",
    color: "#1A1916",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  lsWrap: {
    display: "flex",
    background: "#F0EDE6",
    borderRadius: 8,
    padding: 3,
    gap: 2,
  },
  lsBtn: {
    padding: "3px 9px",
    border: "none",
    background: "transparent",
    borderRadius: 6,
    fontSize: 12,
    cursor: "pointer",
    color: "#6B6860",
    fontWeight: 500,
    transition: "all .13s",
  },
  lsA: {
    background: "#fff",
    color: "#1A1916",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  main: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
};

export default function App() {
  const { lang, setLang } = useLang();
  const { page, setPage } = usePage();
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

  return (
    <div style={s.root}>
      <div style={s.topbar}>
        <span style={s.title}>{t.appTitle}</span>

        <div style={s.nav}>
          {navItems.map(({ key, label }) => (
            <button
              key={key}
              style={{ ...s.navBtn, ...(page === key ? s.navA : {}) }}
              onClick={() => setPage(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={s.lsWrap}>
          {langItems.map(({ key, label }) => (
            <button
              key={key}
              style={{ ...s.lsBtn, ...(lang === key ? s.lsA : {}) }}
              onClick={() => setLang(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={s.main}>
        {page === "pos" && <POS />}
        {page === "report" && <Report />}
        {page === "products" && <Products />}
      </div>
    </div>
  );
}
