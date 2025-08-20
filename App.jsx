/* ===============================================
   PARTEA 1: IMPORTS, FUNCȚII UTILITARE ȘI COMPONENTE DE BAZĂ
   Această parte conține toate importurile React, funcțiile helper pentru formatare,
   gestionarea datelor și componentele UI reutilizabile
   ACUM ADAPTABILE LA TEMĂ
   =============================================== */

import React, { useEffect, useMemo, useRef, useState } from "react";
import MaieApp from './MaieApp';

/* Funcții utilitare pentru formatare și conversii numerice */
const fmt = (n) => (n === null || n === undefined || isNaN(n) ? "" : Number(n).toLocaleString("ro-RO"));
const toNum = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).split(' ').join('').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/* Funcții pentru gestionarea datelor și snapshot-urilor zilnice */
const todayStr = new Date().toLocaleDateString("ro-RO", { year: "numeric", month: "2-digit", day: "2-digit" });
const keyForDate = (d) => new Date(d).toISOString().slice(0,10);
const todayKey = keyForDate(new Date());
const prevDayKey = (k) => { const d = new Date(k); d.setDate(d.getDate()-1); return keyForDate(d); };
const ensureSnapshot = (map, k, fallbackRows = []) => {
  if (map[k]) return map;
  const keys = Object.keys(map).filter(x=>/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(x)).sort();
  const prev = keys.filter(x => x <= k).pop();
  const base = prev ? map[prev] : fallbackRows;
  return { ...map, [k]: JSON.parse(JSON.stringify(base)) };
};

/* SISTEM DE BACKUP ÎN FIȘIERE JSON - NOUĂ FUNCȚIONALITATE */
function downloadJSON(filename, data) {
  try {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.href = url;
    a.download = filename;
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    console.log(`Backup salvat: ${filename}`);
  } catch (e) {
    console.error(`Eroare backup ${filename}:`, e);
  }
}

function createFullBackup() {
  const backup = {
    timestamp: new Date().toISOString(),
    version: "1.0",
    data: {
      appConfig: JSON.parse(localStorage.getItem("appConfig") || "{}"),
      anafByYear: JSON.parse(localStorage.getItem("anafByYear") || "{}"),
      cashflowSettings: JSON.parse(localStorage.getItem("cashflowSettings") || "{}"),
      activeTab: localStorage.getItem("activeTab"),
      appTheme: JSON.parse(localStorage.getItem("appTheme") || "true"),
      debts: JSON.parse(localStorage.getItem("debts") || "{}"),
      cash: JSON.parse(localStorage.getItem("cash") || "{}"),
      port: JSON.parse(localStorage.getItem("port") || "{}"),
      recv: JSON.parse(localStorage.getItem("recv") || "{}"),
      monthlySources: JSON.parse(localStorage.getItem("monthlySources") || "{}"),
      monthlyPurchases: JSON.parse(localStorage.getItem("monthlyPurchases") || "{}")
    }
  };
  
  const timestamp = new Date().toISOString().slice(0,19).replace(/[:-]/g, '');
  downloadJSON(`PFA_Backup_${timestamp}.json`, backup);
}

function loadBackupFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        if (backup.data) {
          Object.entries(backup.data).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
            }
          });
          resolve(backup);
        } else {
          reject(new Error("Format backup invalid"));
        }
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsText(file);
  });
}

/* Funcție pentru descărcarea fișierelor CSV */
function downloadCSV(filename, rows, guard) {
  if (typeof guard === "function" && !guard()) return;
  const csv = rows
    .map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  document.body.appendChild(a);
  a.href = url;
  a.download = filename;
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* Componenta GlassCard - container cu efect de sticlă pentru toate cardurile - ADAPTABILĂ LA TEMĂ */
const GlassCard = ({ title, children, actions, isDarkTheme = true }) => (
  <div className={`rounded-2xl p-4 md:p-6 mb-6 border shadow-lg backdrop-blur-xl ${
    isDarkTheme 
      ? "bg-white/10 border-white/20" 
      : "bg-black/5 border-black/10"
  }`}>
    <div className="flex items-center justify-between mb-3">
      <h2 className={`text-xl font-semibold ${isDarkTheme ? "text-white/90" : "text-gray-800"}`}>
        {title}
      </h2>
      <div className="flex gap-2">{actions}</div>
    </div>
    {children}
  </div>
);

/* Componenta Pill - pentru afișarea informațiilor în format pastilă - ADAPTABILĂ LA TEMĂ */
const Pill = ({ children, isDarkTheme = true }) => (
  <span className={`px-2 py-1 rounded-full text-xs border ${
    isDarkTheme 
      ? "bg-white/15 text-white/80 border-white/20" 
      : "bg-black/10 text-gray-700 border-black/20"
  }`}>
    {children}
  </span>
);

/* Componenta IconBtn - buton cu iconiță pentru acțiuni - ADAPTABILĂ LA TEMĂ */
const IconBtn = ({ children, onClick, title, disabled, isDarkTheme = true }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`px-3 py-2 rounded-lg border transition ${
      disabled 
        ? (isDarkTheme ? "bg-white/5 border-white/10 text-white/30" : "bg-black/5 border-black/10 text-gray-400")
        : (isDarkTheme 
            ? "bg-white/10 border-white/20 text-white/90 hover:bg-white/20 active:scale-[.98]" 
            : "bg-black/10 border-black/20 text-gray-800 hover:bg-black/15 active:scale-[.98]"
          )
    }`}
  >
    {children}
  </button>
);

/* Componenta NumberInput - input pentru numere cu styling personalizat - ADAPTABILĂ LA TEMĂ */
const NumberInput = ({ value, onChange, className = "", step = 1, isDarkTheme = true }) => (
  <input
    type="number"
    inputMode="decimal"
    step={step}
    className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 transition ${
      isDarkTheme 
        ? "bg-white/10 border-white/20 text-white/90 focus:ring-white/30" 
        : "bg-black/5 border-black/20 text-gray-800 focus:ring-black/30"
    } ${className}`}
    value={Number.isFinite(Number(value)) ? value : 0}
    onChange={(e) => onChange(Number(e.target.value))}
  />
);

/* Componenta TextInput - input pentru text cu styling personalizat - ADAPTABILĂ LA TEMĂ */
const TextInput = ({ value, onChange, className = "", isDarkTheme = true }) => (
  <input
    type="text"
    className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 transition ${
      isDarkTheme 
        ? "bg-white/10 border-white/20 text-white/90 focus:ring-white/30" 
        : "bg-black/5 border-black/20 text-gray-800 focus:ring-black/30"
    } ${className}`}
    value={value}
    onChange={(e) => onChange(e.target.value)}
  />
);

/* Componenta Table - tabel reutilizabil cu funcționalitate de editare - ADAPTABILĂ LA TEMĂ */
function Table({ columns, rows, setRows, totalsLabel, guard, isDarkTheme = true }) {
  const [undoStack, setUndoStack] = useState([]);
  const addRow = () => setRows([
  ...rows,
  Object.fromEntries(columns.map(c => [c.key, c.default !== undefined ? c.default : (c.type === "number" ? 0 : "")]))
]);
  const delRow = (i) => { setUndoStack((s)=>[...s, { row: rows[i], idx: i }]); setRows(rows.filter((_, idx) => idx !== i)); };
  const undo = () => { if (!undoStack.length) return; const last = undoStack[undoStack.length-1]; const copy = rows.slice(); const pos = Math.min(Math.max(0,last.idx), copy.length); copy.splice(pos, 0, last.row); setRows(copy); setUndoStack(undoStack.slice(0,-1)); };
  const totals = useMemo(() => {
    const t = {};
    columns.filter(c => c.total).forEach(c => t[c.key] = rows.reduce((s, r) => s + (c.compute ? toNum(c.compute(r)) : toNum(r[c.key])), 0));
    return t;
  }, [rows, columns]);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`text-left p-2 border-b ${
                isDarkTheme ? "text-white/70 border-white/20" : "text-gray-600 border-black/20"
              }`}>
                {c.label}
              </th>
            ))}
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b ${isDarkTheme ? "border-white/10" : "border-black/10"}`}>
              {columns.map((c) => (
                <td key={c.key} className="p-2 align-top">
                  {c.compute ? (
                    <div className="px-3 py-2">{fmt(c.compute(row))}</div>
                  ) : c.type === "number" ? (
                    <NumberInput 
                      value={row[c.key]} 
                      onChange={(v) => setRows(rows.map((r, idx) => idx === i ? { ...r, [c.key]: v } : r))} 
                      step={(typeof c.step === 'function' ? c.step(row) : (c.step ?? 1))}
                      isDarkTheme={isDarkTheme}
                    />
                  ) : (
                    <TextInput 
                      value={row[c.key]} 
                      onChange={(v) => setRows(rows.map((r, idx) => idx === i ? { ...r, [c.key]: v } : r))}
                      isDarkTheme={isDarkTheme}
                    />
                  )}
                </td>
              ))}
              <td className="p-2">
                <IconBtn title="Șterge" onClick={() => delRow(i)} isDarkTheme={isDarkTheme}>
                  🗑️
                </IconBtn>
              </td>
            </tr>
          ))}
        </tbody>
        {columns.some(c => c.total) && (
          <tfoot>
            <tr>
              <td className={`p-2 font-semibold ${
                isDarkTheme ? "text-red-300" : "text-red-600"
              }`} colSpan={columns.length - columns.filter(c => c.total).length}>
                {totalsLabel ?? "TOTAL"}
              </td>
              {columns.filter(c => c.total).map(c => (
                <td key={c.key} className={`p-2 font-bold ${
                  isDarkTheme ? "text-red-400" : "text-red-600"
                }`}>
                  {fmt(totals[c.key])}
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        )}
      </table>
      <div className="mt-3 flex gap-2 items-center">
        <IconBtn title="Adaugă rând" onClick={addRow} isDarkTheme={isDarkTheme}>➕ Rând</IconBtn>
        <IconBtn title="Undo ștergere" onClick={undo} disabled={!undoStack.length} isDarkTheme={isDarkTheme}>↩️ Undo</IconBtn>
        <IconBtn title="Export CSV" onClick={() => {
          const header = columns.map(c => c.label);
          const data = rows.map(r => columns.map(c => c.compute ? c.compute(r) : r[c.key]));
          downloadCSV("sheet.csv", [header, ...data], guard);
        }} isDarkTheme={isDarkTheme}>⬇️ Export CSV</IconBtn>
      </div>
    </div>
  );
}

/* Hook pentru sistem de blocare cu parolă și timeout de inactivitate */
function useIdleLock(password) {
  const [locked, setLocked] = useState(true);
  const [pwd, setPwd] = useState("");
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setPwd(""); setLocked(true); }, 60 * 1000);
  };

  useEffect(() => {
    const bump = () => resetTimer();
    ["mousemove","keydown","click","touchstart","scroll"].forEach(ev => window.addEventListener(ev, bump));
    return () => ["mousemove","keydown","click","touchstart","scroll"].forEach(ev => window.removeEventListener(ev, bump));
  }, []);

  useEffect(() => { if (locked && inputRef.current) inputRef.current.focus(); }, [locked]);

  const tryUnlock = () => {
    if (pwd === password) { setLocked(false); setPwd(""); resetTimer(); }
  };

  const ensureUnlocked = () => {
    if (locked) { alert("🔒 Blocat. Introdu parola pentru a continua."); return false; }
    resetTimer();
    return true;
  };

  const LockOverlay = () => locked ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xl">
      <div className="w-full max-w-sm rounded-2xl bg-white/10 border border-white/20 p-6 text-white">
        <h2 className="text-xl font-semibold mb-2">Acces restricționat</h2>
        <p className="text-white/70 text-sm mb-4">Introdu parola. Se reactivează după 1 minut de inactivitate.</p>
        <input
          ref={inputRef}
          autoFocus
          autoComplete="new-password"
          type="password"
          className="w-full rounded-lg bg-white/10 border border-white/20 text-white/90 px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
          placeholder="Parola"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") tryUnlock(); }}
        />
        <div className="mt-4 flex gap-2">
          <IconBtn onClick={tryUnlock}>🔓 Deschide</IconBtn>
        </div>
      </div>
    </div>
  ) : null;

  return { LockOverlay, ensureUnlocked };
}

/* Hook pentru gestionarea snapshot-urilor zilnice cu localStorage - CORECTAT CU BACKUP */
function useDailySnapshot(storageKey, initialRows) {
  const [date, setDate] = useState(keyForDate(new Date()));
  const [compare, setCompare] = useState(prevDayKey(keyForDate(new Date())));
  const [map, setMap] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const obj = raw ? JSON.parse(raw) : {};
      return ensureSnapshot(obj, date, initialRows);
    } catch {
      return ensureSnapshot({}, date, initialRows);
    }
  });
  
  useEffect(() => { setMap(m => ensureSnapshot(m, date, initialRows)); }, [date]);
  useEffect(() => { setMap(m => ensureSnapshot(m, compare, initialRows)); }, [compare]);
  
  const rows = map[date] || initialRows;
  const setRows = (newRows) => {
    setMap(m => {
      const nm = { ...ensureSnapshot(m, date, initialRows), [date]: newRows };
      try { 
        localStorage.setItem(storageKey, JSON.stringify(nm));
        
        /* AUTO-BACKUP la modificări importante - o dată pe zi */
        const lastBackup = localStorage.getItem("lastBackupDate");
        if (lastBackup !== todayKey) {
          setTimeout(() => {
            createFullBackup();
            localStorage.setItem("lastBackupDate", todayKey);
          }, 1000);
        }
      } catch (e) {
        console.error(`Eroare salvare ${storageKey}:`, e);
      }
      return nm;
    });
  };
  const getRows = (k) => (map[k] || initialRows);
  return { date, setDate, compare, setCompare, rows, setRows, map, getRows };
}

/* Componenta SnapshotBar - pentru compararea datelor între două date - ADAPTABILĂ LA TEMĂ */
const SnapshotBar = ({ date, setDate, compare, setCompare, totalToday, totalCompare, label = "Diferență", isDarkTheme = true }) => {
  const diff = (totalToday ?? 0) - (totalCompare ?? 0);
  
  /* CORECTAT: Verifică dacă data de comparație este aceeași cu data curentă */
  const isSameDate = date === compare;
  
  return (
    <div className="flex flex-wrap items-center gap-3 mb-3">
      <div className="flex items-center gap-2">
        <span className={`text-sm ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>Data</span>
        <input 
          type="date" 
          value={date} 
          onChange={(e)=>setDate(e.target.value)} 
          className={`appearance-none px-3 py-2 rounded-lg border ${
            isDarkTheme 
              ? "bg-white/10 border-white/20 text-white/90" 
              : "bg-black/5 border-black/20 text-gray-800"
          }`} 
        />
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>Compară cu</span>
        <input 
          type="date" 
          value={compare} 
          onChange={(e)=>{
            const newCompare = e.target.value;
            if (newCompare === date) {
              // Dacă se încearcă să se selecteze aceeași dată, setează ziua anterioară
              const prevDay = prevDayKey(date);
              setCompare(prevDay);
            } else {
              setCompare(newCompare);
            }
          }} 
          className={`appearance-none px-3 py-2 rounded-lg border ${
            isDarkTheme 
              ? "bg-white/10 border-white/20 text-white/90" 
              : "bg-black/5 border-black/20 text-gray-800"
          }`} 
        />
      </div>
      <div className={`ml-auto px-3 py-2 rounded-lg border ${
        isSameDate 
          ? "bg-gray-500/10 border-gray-400/30 text-gray-300"
          : diff>=0
            ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-300"
            : "bg-rose-500/10 border-rose-400/30 text-rose-300"
      }`}>
        {isSameDate 
          ? `${label}: N/A (aceeași dată)`
          : `${label}: ${diff>=0?"+":""}${fmt(Math.round(diff))} lei`
        }
      </div>
    </div>
  );
};

/* Date default pentru sursele de venit și categoriile de cheltuieli */
const defaultSources = ["BT PFA","REVOLUT","CARMEN","BT PERSONAL","PORTOFEL ALEX","CARD TATA","IN CASA","RETUR EMAG","PORTOFEL TATA","BONURI","MARBELLA","ADOBE"];
const defaultPurchases = ["LOLITA","PPC","ENGIE","YOXO","DIGI","APACANAL","ECOVOL","SOLO","ROMARG","DOMENIU.RO","TUNS","BENZINA","MANCARE","RATA CASA","DATE ALEX SI CARMEN","CARMEN MANCARE SI TR","SUPLIMENTE","SALA AMANDOI","PROCURA ANAF","TATUAJ","GENE"];

/* ===============================================
   SFÂRȘITUL PĂRȚII 1 - MODIFICATĂ PENTRU TEMĂ
   =============================================== */
   /* ===============================================
   PARTEA 2: COMPONENTA MONTHLYEXPENSES - TABUL "CHELTUIELI LUNARE" - CORECTAT
   Această parte conține componenta pentru gestionarea cheltuielilor lunare,
   ACUM CU SALVARE PE ZILE folosind useDailySnapshot ȘI ADAPTATĂ LA TEMĂ
   =============================================== */


function MonthlyExpenses({ guard, isDarkTheme = true, globalDate, setGlobalDate }) {
  /* Datele inițiale pentru surse și cheltuieli */
  const sourcesInitial = [
    { suma:319, sursa:"BT PFA" },{ suma:813, sursa:"REVOLUT" },{ suma:0, sursa:"CARMEN" },{ suma:16, sursa:"BT PERSONAL" },
    { suma:70, sursa:"PORTOFEL ALEX" },{ suma:0, sursa:"CARD TATA" },{ suma:0, sursa:"IN CASA" },{ suma:0, sursa:"RETUR EMAG" },
    { suma:0, sursa:"PORTOFEL TATA" },{ suma:280, sursa:"BONURI" },{ suma:0, sursa:"MARBELLA" },{ suma:0, sursa:"ADOBE" }
  ];
  
  const purchasesInitial = [
    { pret:0, cumparaturi:"LOLITA" },{ pret:0, cumparaturi:"PPC" },{ pret:0, cumparaturi:"ENGIE" },{ pret:0, cumparaturi:"YOXO" },
    { pret:0, cumparaturi:"DIGI" },{ pret:0, cumparaturi:"APACANAL" },{ pret:0, cumparaturi:"ECOVOL" },{ pret:0, cumparaturi:"SOLO" },
    { pret:0, cumparaturi:"ROMARG" },{ pret:0, cumparaturi:"DOMENIU.RO" },{ pret:0, cumparaturi:"TUNS" },{ pret:0, cumparaturi:"BENZINA" },
    { pret:500, cumparaturi:"MANCARE" },{ pret:0, cumparaturi:"RATA CASA" },{ pret:0, cumparaturi:"DATE ALEX SI CARMEN" },
    { pret:49, cumparaturi:"CARMEN MANCARE SI TR" },{ pret:700, cumparaturi:"SUPLIMENTE" },{ pret:700, cumparaturi:"SALA AMANDOI" },
    { pret:0, cumparaturi:"PROCURA ANAF" },{ pret:0, cumparaturi:"TATUAJ" },{ pret:0, cumparaturi:"GENE" }
  ];

  /* CORECTAT: Folosește data globală în loc de date locale */
  const { compare: sourcesCmp, setCompare: setSourcesCmp, rows: sources, setRows: setSources, getRows: getSourcesRows } = useDailySnapshot("monthlySources", sourcesInitial);
  const { compare: purchCmp, setCompare: setPurchCmp, rows: purchases, setRows: setPurchases, getRows: getPurchRows } = useDailySnapshot("monthlyPurchases", purchasesInitial);

  /* CORECTAT: Obține datele pentru data globală curentă */
  const sourcesForGlobalDate = getSourcesRows(globalDate) || sourcesInitial;
  const purchasesForGlobalDate = getPurchRows(globalDate) || purchasesInitial;

  /* CORECTAT: Calculele pentru totaluri folosind datele pentru data globală */
  const totalSources = useMemo(() => sourcesForGlobalDate.reduce((s,r)=> s + toNum(r.suma), 0), [sourcesForGlobalDate]);
  const totalPurch = useMemo(() => purchasesForGlobalDate.reduce((s,r)=> s + toNum(r.pret), 0), [purchasesForGlobalDate]);
  const diff = totalSources - totalPurch;

  /* CORECTAT: Sincronizează și data de comparație pentru cheltuieli */
  useEffect(() => {
    setPurchCmp(sourcesCmp);
  }, [sourcesCmp, setPurchCmp]);

  /* CORECTAT: Sincronizează data de comparație cu data globală */
  useEffect(() => {
    if (globalDate && sourcesCmp === globalDate) {
      // Dacă data de comparație este aceeași cu data curentă, setează-o pe ziua anterioară
      const prevDay = prevDayKey(globalDate);
      setSourcesCmp(prevDay);
    }
  }, [globalDate, sourcesCmp, setSourcesCmp]);

  return (
    <GlassCard title="Cheltuieli lunare (salvare pe zile)" isDarkTheme={isDarkTheme}>
      {/* Bara pentru selecția și compararea datelor */}
      <SnapshotBar 
        date={globalDate} 
        setDate={setGlobalDate} 
        compare={sourcesCmp} 
        setCompare={setSourcesCmp} 
        totalToday={totalSources - totalPurch} 
        totalCompare={(() => {
          const sourcesCompare = (getSourcesRows(sourcesCmp)||sourcesInitial).reduce((s,r)=> s + toNum(r.suma), 0);
          const purchasesCompare = (getPurchRows(purchCmp)||purchasesInitial).reduce((s,r)=> s + toNum(r.pret), 0);
          return sourcesCompare - purchasesCompare;
        })()} 
        label="Diferență economii"
        isDarkTheme={isDarkTheme}
      />
      
      <div className="flex flex-wrap gap-3 mb-4">
        <IconBtn title="Export CSV" isDarkTheme={isDarkTheme} onClick={()=>{
          const head1 = ["TOTAL BANI LUNARI", globalDate, "SURSE"];
          const rows1 = sourcesForGlobalDate.map(r => [toNum(r.suma), r.sursa]);
          const tot1 = [["TOTAL", totalSources]];
          const spacer = [[""],[""]];
          const head2 = [["PRET CHELTUIELI","CUMPARATURI"]];
          const rows2 = purchasesForGlobalDate.map(r => [toNum(r.pret), r.cumparaturi]);
          const tot2 = [["TOTAL", totalPurch]];
          const foot = [["CAT MAI RAMAN DUPA CHELTUIELI"],["TOTAL", diff]];
          downloadCSV(`Cheltuieli_${globalDate}.csv`, [head1, ...rows1, ...tot1, ...spacer, ...head2, ...rows2, ...tot2, ...spacer, ...foot], guard);
        }}>⬇️ CSV</IconBtn>
        <IconBtn title="Reset zi" isDarkTheme={isDarkTheme} onClick={() => {
          const resetSources = sourcesInitial.map(s=>({...s, suma: 0}));
          const resetPurchases = purchasesInitial.map(p=>({...p, pret: 0}));
          setSources(resetSources);
          setPurchases(resetPurchases);
          // Actualizează și localStorage pentru data globală
          const sourcesMap = { ...JSON.parse(localStorage.getItem("monthlySources") || "{}"), [globalDate]: resetSources };
          const purchasesMap = { ...JSON.parse(localStorage.getItem("monthlyPurchases") || "{}"), [globalDate]: resetPurchases };
          localStorage.setItem("monthlySources", JSON.stringify(sourcesMap));
          localStorage.setItem("monthlyPurchases", JSON.stringify(purchasesMap));
        }}>🧹 Reset zi</IconBtn>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className={`mb-2 font-semibold ${isDarkTheme ? "text-white" : "text-gray-800"}`}>
            TOTAL BANI LUNARI {globalDate}
          </h3>
          <Table 
            columns={[
              { key:"suma", label:"Suma", type:"number", total:true, step:1 },
              { key:"sursa", label:"Sursă" }
            ]} 
            rows={sourcesForGlobalDate} 
            setRows={(newRows) => {
              setSources(newRows);
              // Actualizează și datele pentru data globală
              const updatedMap = { ...JSON.parse(localStorage.getItem("monthlySources") || "{}"), [globalDate]: newRows };
              localStorage.setItem("monthlySources", JSON.stringify(updatedMap));
            }} 
            totalsLabel="TOTAL" 
            guard={guard}
            isDarkTheme={isDarkTheme}
          />
        </div>
        <div>
          <h3 className={`mb-2 font-semibold ${isDarkTheme ? "text-white" : "text-gray-800"}`}>
            CHELTUIELI
          </h3>
          <Table 
            columns={[
              { key:"pret", label:"Preț cheltuieli", type:"number", total:true, step:1 },
              { key:"cumparaturi", label:"Cumpărături" }
            ]} 
            rows={purchasesForGlobalDate} 
            setRows={(newRows) => {
              setPurchases(newRows);
              // Actualizează și datele pentru data globală
              const updatedMap = { ...JSON.parse(localStorage.getItem("monthlyPurchases") || "{}"), [globalDate]: newRows };
              localStorage.setItem("monthlyPurchases", JSON.stringify(updatedMap));
            }} 
            totalsLabel="TOTAL" 
            guard={guard}
            isDarkTheme={isDarkTheme}
          />
        </div>
      </div>
      <div className={`mt-4 p-4 rounded-xl border ${isDarkTheme ? "bg-white/10 border-white/20" : "bg-black/5 border-black/10"}`}>
        <div className={`text-sm mb-1 ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>
          CÂT MAI RĂMÂN DUPĂ CHELTUIELI
        </div>
        <div className={`text-2xl font-bold ${diff < 0 ? "text-red-500" : "text-emerald-500"}`}>
          {fmt(diff)} lei
        </div>
      </div>
    </GlassCard>
  );
}

/* ===============================================
   SFÂRȘITUL PĂRȚII 2 - CORECTAT CU TEMĂ
   =============================================== */
   /* ===============================================
   PARTEA 3: COMPONENTA APP PRINCIPALĂ - SETUP ȘI TABUL "ASSUMPTIONS" - CORECTAT
   Această parte conține începutul componentei App principale, configurația de bază,
   calculele pentru taxe (CAS, CASS, impozit) și tabul "Ipoteze" pentru setări
   ACUM CU SALVARE AUTOMATĂ ÎN LOCALSTORAGE PENTRU CONFIGURAȚIE + TEMĂ + DATA CLICKABILĂ
   =============================================== */

export default function App() {
  const PASSWORD = "Milionar00";
  const { LockOverlay, ensureUnlocked } = useIdleLock(PASSWORD);

  /* STARE GLOBALĂ PENTRU DATA - NOUĂ FUNCȚIONALITATE - PORNEȘTE MEREU CU DATA DE AZI */
  const [globalDate, setGlobalDate] = useState(keyForDate(new Date()));

  /* STARE PENTRU TEMA - NOUĂ FUNCȚIONALITATE */
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("appTheme");
      return saved ? JSON.parse(saved) : true; // true = dark, false = light
    } catch {
      return true;
    }
  });

  /* Salvează tema în localStorage */
  useEffect(() => {
    try {
      localStorage.setItem("appTheme", JSON.stringify(isDarkTheme));
    } catch (e) {
      console.error("Eroare salvare temă:", e);
    }
  }, [isDarkTheme]);

  /* STARE PENTRU BACKUP - NOUĂ FUNCȚIONALITATE */
  const fileInputRef = useRef(null);

  const handleBackupImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      await loadBackupFromFile(file);
      alert("✅ Backup importat cu succes! Reîncarcă pagina pentru a vedea modificările.");
      window.location.reload();
    } catch (error) {
      alert(`❌ Eroare la importul backup-ului: ${error.message}`);
    }
    
    event.target.value = '';
  };

  /* FUNCȚIE PENTRU RESET LA VALORILE INIȚIALE - NOUĂ FUNCȚIONALITATE */
  const resetToInitialValues = () => {
    if (window.confirm("⚠️ Sigur vrei să resetezi TOATE datele la valorile inițiale? Această acțiune nu poate fi anulată!")) {
      // Reset toate datele în localStorage
      const resetData = {
        debts: { [todayKey]: [
          { tip:"Eșalonare ANAF 2024", valoare:24200, scadenta:"conform grafic" },
          { tip:"Descoperire cont BT", valoare:19600, scadenta:"comision 150 RON/lună" },
          { tip:"Taxe PFA 2025 (impozit+CAS+CASS)", valoare:Math.round(taxeTotal), scadenta:"25 mai 2026" },
        ]},
        cash: { [todayKey]: [
          { cont:"CONT PERSONAL PRIVAT RON BT", sold:2358 },
          { cont:"REVOLUT PERSONAL", sold:9604 },
          { cont:"BANCA ROMANEASCA", sold:4495 },
          { cont:"CONT PFA RON BT", sold:27000 },
          { cont:"SALT BANK", sold:1170 },
          { cont:"DECOHAUS TORPEDO SRL MAPA", sold:5538 },
          { cont:"CONT EURO BT", sold:2080 },
        ]},
        port: { [todayKey]: [
          { simbol:"ATB", actiuni:69737, pret:2.635, tinta:3.45 },
          { simbol:"XTB", actiuni:0, pret:9739, tinta:9739 },
          { simbol:"Binance", actiuni:0, pret:375, tinta:375 },
        ]},
        recv: { [todayKey]: [
          { client:"SEO OFF PAGE TECHBRO/BELVEDEREGSM", suma:6000 },
          { client:"BELVEDEREGSM.RO Site + SEO", suma:5500 },
          { client:"JEWEL STUDIO", suma:650 },
          { client:"MARBELLA OPTIC", suma:700 },
          { client:"SERVICE GSM articole lunare", suma:6000 },
          { client:"RAZVAN SEO CASAISABEL.RO", suma:5148 },
          { client:"PI 05.08.2025", suma:602 },
        ]},
        monthlySources: { [todayKey]: [
          { suma:319, sursa:"BT PFA" },{ suma:813, sursa:"REVOLUT" },{ suma:0, sursa:"CARMEN" },{ suma:16, sursa:"BT PERSONAL" },
          { suma:70, sursa:"PORTOFEL ALEX" },{ suma:0, sursa:"CARD TATA" },{ suma:0, sursa:"IN CASA" },{ suma:0, sursa:"RETUR EMAG" },
          { suma:0, sursa:"PORTOFEL TATA" },{ suma:280, sursa:"BONURI" },{ suma:0, sursa:"MARBELLA" },{ suma:0, sursa:"ADOBE" }
        ]},
        monthlyPurchases: { [todayKey]: [
          { pret:0, cumparaturi:"LOLITA" },{ pret:0, cumparaturi:"PPC" },{ pret:0, cumparaturi:"ENGIE" },{ pret:0, cumparaturi:"YOXO" },
          { pret:0, cumparaturi:"DIGI" },{ pret:0, cumparaturi:"APACANAL" },{ pret:0, cumparaturi:"ECOVOL" },{ pret:0, cumparaturi:"SOLO" },
          { pret:0, cumparaturi:"ROMARG" },{ pret:0, cumparaturi:"DOMENIU.RO" },{ pret:0, cumparaturi:"TUNS" },{ pret:0, cumparaturi:"BENZINA" },
          { pret:500, cumparaturi:"MANCARE" },{ pret:0, cumparaturi:"RATA CASA" },{ pret:0, cumparaturi:"DATE ALEX SI CARMEN" },
          { pret:49, cumparaturi:"CARMEN MANCARE SI TR" },{ pret:700, cumparaturi:"SUPLIMENTE" },{ pret:700, cumparaturi:"SALA AMANDOI" },
          { pret:0, cumparaturi:"PROCURA ANAF" },{ pret:0, cumparaturi:"TATUAJ" },{ pret:0, cumparaturi:"GENE" }
        ]}
      };

      // Reset configurația
      setCfg({ 
        salMin:4050, 
        venituri2025:74528, 
        cheltDed2025:7954, 
        incasariPfaLunar:4350, 
        economiiSalariu:1000, 
        venitSuplimDinFeb2026:700, 
        descFeeLunar:150 
      });

      // Reset graficul ANAF
      setAnafByYear({
        2025: [{ data:"15/09/2025", rata:2812 },{ data:"15/10/2025", rata:1884 },{ data:"17/11/2025", rata:1896 },{ data:"15/12/2025", rata:1906 }],
        2026: [{ data:"15/01/2026", rata:1917 },{ data:"16/02/2026", rata:1929 },{ data:"17/03/2026", rata:1939 },{ data:"15/04/2026", rata:1951 },{ data:"15/05/2026", rata:1961 },{ data:"15/06/2026", rata:1971 },{ data:"15/07/2026", rata:1983 },{ data:"17/08/2026", rata:2052 }],
      });

      // Reset cashflow settings
      setCfSettings({ startYear: 2025, startMonth: 8, months: 13 });

      // Salvează în localStorage
      Object.entries(resetData).forEach(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
      });
      localStorage.setItem("appConfig", JSON.stringify({ 
        salMin:4050, 
        venituri2025:74528, 
        cheltDed2025:7954, 
        incasariPfaLunar:4350, 
        economiiSalariu:1000, 
        venitSuplimDinFeb2026:700, 
        descFeeLunar:150 
      }));
      localStorage.setItem("anafByYear", JSON.stringify({
        2025: [{ data:"15/09/2025", rata:2812 },{ data:"15/10/2025", rata:1884 },{ data:"17/11/2025", rata:1896 },{ data:"15/12/2025", rata:1906 }],
        2026: [{ data:"15/01/2026", rata:1917 },{ data:"16/02/2026", rata:1929 },{ data:"17/03/2026", rata:1939 },{ data:"15/04/2026", rata:1951 },{ data:"15/05/2026", rata:1961 },{ data:"15/06/2026", rata:1971 },{ data:"15/07/2026", rata:1983 },{ data:"17/08/2026", rata:2052 }],
      }));
      localStorage.setItem("cashflowSettings", JSON.stringify({ startYear: 2025, startMonth: 8, months: 13 }));

      // Revine la data de azi
      setGlobalDate(keyForDate(new Date()));

      // Reîncarcă pagina pentru a aplica resetul
      alert("✅ Reset complet efectuat! Reîncarcă pagina...");
      window.location.reload();
    }
  };

  /* CORECTAT: Configurația principală cu salvare în localStorage */
  const [cfg, setCfg] = useState(() => {
    try {
      const saved = localStorage.getItem("appConfig");
      return saved ? JSON.parse(saved) : { 
        salMin:4050, 
        venituri2025:74528, 
        cheltDed2025:7954, 
        incasariPfaLunar:4350, 
        economiiSalariu:1000, 
        venitSuplimDinFeb2026:700, 
        descFeeLunar:150 
      };
    } catch {
      return { 
        salMin:4050, 
        venituri2025:74528, 
        cheltDed2025:7954, 
        incasariPfaLunar:4350, 
        economiiSalariu:1000, 
        venitSuplimDinFeb2026:700, 
        descFeeLunar:150 
      };
    }
  });

  /* CORECTAT: Salvează configurația automat când se schimbă */
  useEffect(() => {
    try {
      localStorage.setItem("appConfig", JSON.stringify(cfg));
    } catch (e) {
      console.error("Eroare salvare configurație:", e);
    }
  }, [cfg]);
  
  /* Calculele pentru taxele PFA 2025 */
  const venitNet = useMemo(() => cfg.venituri2025 - cfg.cheltDed2025, [cfg]);
  const plaf6 = useMemo(() => 6*cfg.salMin, [cfg.salMin]);
  const plaf12 = useMemo(() => 12*cfg.salMin, [cfg.salMin]);
  const CAS = useMemo(() => (venitNet >= plaf12 ? 0.25*plaf12 : 0), [venitNet, plaf12]);
  const CASS = useMemo(() => Math.max(0.1*venitNet, 0.1*plaf6), [venitNet, plaf6]);
  const impozit = useMemo(() => 0.1*Math.max(0, venitNet - CAS - CASS), [venitNet, CAS, CASS]);
  const taxeTotal = useMemo(() => CAS + CASS + impozit, [CAS, CASS, impozit]);

  /* Inițializarea datoriilor cu taxele calculate automat */
  const debtsInitial = [
    { tip:"Eșalonare ANAF 2024", valoare:24200, scadenta:"conform grafic" },
    { tip:"Descoperire cont BT", valoare:19600, scadenta:"comision 150 RON/lună" },
    { tip:"Taxe PFA 2025 (impozit+CAS+CASS)", valoare:Math.round(taxeTotal), scadenta:"25 mai 2026" },
  ];
  
  /* Hook pentru gestionarea datoriilor cu snapshot zilnic - SINCRONIZAT CU DATA GLOBALĂ */
  const { date:debDate, setDate:setDebDate, compare:debCmp, setCompare:setDebCmp, rows:debts, setRows:setDebts, map:debMap, getRows:getDebRows } = useDailySnapshot("debts", debtsInitial);
  
  /* Effect pentru actualizarea automată a taxelor PFA când se schimbă calculele */
  useEffect(() => { 
    if (debDate===todayKey) { 
      const upd = debts.map(r => r.tip.startsWith("Taxe PFA 2025") ? { ...r, valoare: Math.round(taxeTotal) } : r); 
      setDebts(upd); 
    } 
  }, [taxeTotal, debDate]);

  /* CORECTAT: Gestionarea graficului ANAF cu salvare în localStorage */
  const [anafByYear, setAnafByYear] = useState(() => {
    try {
      const saved = localStorage.getItem("anafByYear");
      return saved ? JSON.parse(saved) : {
        2025: [{ data:"15/09/2025", rata:2812 },{ data:"15/10/2025", rata:1884 },{ data:"17/11/2025", rata:1896 },{ data:"15/12/2025", rata:1906 }],
        2026: [{ data:"15/01/2026", rata:1917 },{ data:"16/02/2026", rata:1929 },{ data:"17/03/2026", rata:1939 },{ data:"15/04/2026", rata:1951 },{ data:"15/05/2026", rata:1961 },{ data:"15/06/2026", rata:1971 },{ data:"15/07/2026", rata:1983 },{ data:"17/08/2026", rata:2052 }],
      };
    } catch {
      return {
        2025: [{ data:"15/09/2025", rata:2812 },{ data:"15/10/2025", rata:1884 },{ data:"17/11/2025", rata:1896 },{ data:"15/12/2025", rata:1906 }],
        2026: [{ data:"15/01/2026", rata:1917 },{ data:"16/02/2026", rata:1929 },{ data:"17/03/2026", rata:1939 },{ data:"15/04/2026", rata:1951 },{ data:"15/05/2026", rata:1961 },{ data:"15/06/2026", rata:1971 },{ data:"15/07/2026", rata:1983 },{ data:"17/08/2026", rata:2052 }],
      };
    }
  });

  const [anafYear, setAnafYear] = useState(2025);
  const allAnafYears = useMemo(() => Array.from({length: 2050 - 2024 + 1}, (_,i)=> 2024 + i), []);
  
  useEffect(() => { 
    setAnafByYear(prev => prev[anafYear] ? prev : { ...prev, [anafYear]: [] }); 
  }, [anafYear]);

  /* CORECTAT: Salvează graficul ANAF automat */
  useEffect(() => {
    try {
      localStorage.setItem("anafByYear", JSON.stringify(anafByYear));
    } catch (e) {
      console.error("Eroare salvare grafic ANAF:", e);
    }
  }, [anafByYear]);

  const anafRows = anafByYear[anafYear] || [];
  const setAnafRows = (rows) => setAnafByYear(m => ({ ...m, [anafYear]: rows }));

  /* Inițializarea conturilor cash - SINCRONIZAT CU DATA GLOBALĂ */
  const cashInitial = [
    { cont:"CONT PERSONAL PRIVAT RON BT", sold:2358 },
    { cont:"REVOLUT PERSONAL", sold:9604 },
    { cont:"BANCA ROMANEASCA", sold:4495 },
    { cont:"CONT PFA RON BT", sold:27000 },
    { cont:"SALT BANK", sold:1170 },
    { cont:"DECOHAUS TORPEDO SRL MAPA", sold:5538 },
    { cont:"CONT EURO BT", sold:2080 },
  ];
  const { date:cashDate, setDate:setCashDate, compare:cashCmp, setCompare:setCashCmp, rows:cash, setRows:setCash, map:cashMap, getRows:getCashRows } = useDailySnapshot("cash", cashInitial);
  const totalCash = useMemo(() => cash.reduce((s,r) => s + toNum(r.sold), 0), [cash]);

  /* Inițializarea portofoliului de acțiuni - SINCRONIZAT CU DATA GLOBALĂ */
  const portInitial = [
    { simbol:"ATB", actiuni:69737, pret:2.635, tinta:3.45 },
    { simbol:"XTB", actiuni:0, pret:9739, tinta:9739 },
    { simbol:"Binance", actiuni:0, pret:375, tinta:375 },
  ];
  const { date:portDate, setDate:setPortDate, compare:portCmp, setCompare:setPortCmp, rows:portfolio, setRows:setPortfolio, map:portMap, getRows:getPortRows } = useDailySnapshot("port", portInitial);
  const portColumns = [
    { key:"simbol", label:"Simbol" },
    { key:"actiuni", label:"Nr. acțiuni", type:"number", step:1 },
    { key:"pret", label:"Preț curent (RON)", type:"number", step:(r)=> (r.simbol === "ATB" ? 0.01 : 1) },
    { key:"valCurenta", label:"Valoare curentă (RON)", total:true, compute:(r)=> toNum(r.actiuni)*toNum(r.pret) },
    { key:"tinta", label:"Țintă 12 luni (RON)", type:"number", step:(r)=> (r.simbol === "ATB" ? 0.1 : 1) },
    { key:"valTinta", label:"Valoare țintă (RON)", total:true, compute:(r)=> toNum(r.actiuni)*toNum(r.tinta) },
  ];

  /* CORECTAT: Setările pentru cashflow cu salvare în localStorage */
  const [cfSettings, setCfSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("cashflowSettings");
      return saved ? JSON.parse(saved) : { startYear: 2025, startMonth: 8, months: 13 };
    } catch {
      return { startYear: 2025, startMonth: 8, months: 13 };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("cashflowSettings", JSON.stringify(cfSettings));
    } catch (e) {
      console.error("Eroare salvare setări cashflow:", e);
    }
  }, [cfSettings]);

  const { startYear: cfStartYear, startMonth: cfStartMonth, months: cfMonths } = cfSettings;
  const setCfStartYear = (year) => setCfSettings(prev => ({ ...prev, startYear: year }));
  const setCfStartMonth = (month) => setCfSettings(prev => ({ ...prev, startMonth: month }));
  const setCfMonths = (months) => setCfSettings(prev => ({ ...prev, months }));

  /* Maparea ratelor ANAF pe luni pentru cashflow */
  const anafMapAllYears = useMemo(() => {
    const m = new Map();
    Object.values(anafByYear).forEach(arr => arr.forEach(r => {
      const [dd,mm,yyyy] = r.data.split("/");
      m.set(`${yyyy}-${mm}`, toNum(r.rata));
    }));
    return m;
  }, [anafByYear]);

  /* Calculul cashflow-ului pe luni */
  const cashflowRows = useMemo(() => {
    const out = [];
    let cashBal = totalCash;
    const start = new Date(`${cfStartYear}-${String(cfStartMonth).padStart(2,"0")}-01T00:00:00`);
    for (let i=0;i<cfMonths;i++){
      const d = new Date(start); d.setMonth(start.getMonth()+i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const venituri = cfg.economiiSalariu + (d >= new Date("2025-09-01") ? cfg.incasariPfaLunar : 0) + (d >= new Date("2026-02-01") ? cfg.venitSuplimDinFeb2026 : 0);
      const rataAnaf = anafMapAllYears.get(key) ?? 0;
      const taxe2025 = d.getFullYear() === 2026 && d.getMonth()+1 === 5 ? Math.round(CAS + CASS + impozit) : 0;
      cashBal += venituri - rataAnaf - cfg.descFeeLunar - taxe2025;
      out.push({ luna: d.toLocaleDateString("ro-RO",{month:"short",year:"2-digit"}), venituri, rataAnaf, comisionDesc: cfg.descFeeLunar, taxe2025, soldFinal: cashBal });
    }
    return out;
  }, [totalCash, cfStartYear, cfStartMonth, cfMonths, cfg, anafMapAllYears, CAS, CASS, impozit]);

  /* Totalurile pentru cashflow */
  const totalsCF = useMemo(() => ({
    incasari: cashflowRows.reduce((s,r)=> s + r.venituri, 0),
    rate: cashflowRows.reduce((s,r)=> s + r.rataAnaf, 0),
    comisioane: cashflowRows.reduce((s,r)=> s + r.comisionDesc, 0),
    taxe: cashflowRows.reduce((s,r)=> s + r.taxe2025, 0),
  }), [cashflowRows]);

  /* Inițializarea creanțelor de la clienți - SINCRONIZAT CU DATA GLOBALĂ */
  const recvInitial = [
    { client:"SEO OFF PAGE TECHBRO/BELVEDEREGSM", suma:6000 },
    { client:"BELVEDEREGSM.RO Site + SEO", suma:5500 },
    { client:"JEWEL STUDIO", suma:650 },
    { client:"MARBELLA OPTIC", suma:700 },
    { client:"SERVICE GSM articole lunare", suma:6000 },
    { client:"RAZVAN SEO CASAISABEL.RO", suma:5148 },
    { client:"PI 05.08.2025", suma:602 },
  ];
  const { date:recvDate, setDate:setRecvDate, compare:recvCmp, setCompare:setRecvCmp, rows:recv, setRows:setRecv, map:recvMap, getRows:getRecvRows } = useDailySnapshot("recv", recvInitial);

  /* CORECTAT: Starea pentru tabul activ cu salvare în localStorage */
  const [tab, setTab] = useState(() => {
    try {
      return localStorage.getItem("activeTab") || "monthly";
    } catch {
      return "monthly";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("activeTab", tab);
    } catch (e) {
      console.error("Eroare salvare tab activ:", e);
    }
  }, [tab]);

  /* CORECTAT: Sincronizează data globală cu window pentru toate componentele */
  useEffect(() => {
    window.globalAppDate = globalDate;
  }, [globalDate]);

  /* CORECTAT: Sincronizează TOATE datele din toate tab-urile cu data globală */
  useEffect(() => {
    setDebDate(globalDate);
    setCashDate(globalDate);
    setPortDate(globalDate);
    setRecvDate(globalDate);
  }, [globalDate, setDebDate, setCashDate, setPortDate, setRecvDate]);

  return (
    <div className={`min-h-screen w-full transition-colors duration-300 ${
      isDarkTheme 
        ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white" 
        : "bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900"
    }`}>
      <LockOverlay />
      
      {/* Spațiu de sus - 50px */}
      <div className="h-12"></div>
      
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header principal cu titlul și informațiile generale - MODIFICAT CU TOATE FUNCȚIONALITĂȚILE */}
        <header className="mb-6 flex items-center justify-between">
          <div>
{/* Spațiu de 50px deasupra titlului */}
<div className="h-12 mb-4"></div>

<h1 className={`text-2xl md:text-3xl font-bold ${isDarkTheme ? "text-white" : "text-gray-900"}`}>
  Plan financiar PFA – Dashboard interactiv
</h1>

{/* Spațiu de 100px sub titlu */}
<div className="h-25 mt-4"></div>
            <div className="mt-1 flex flex-wrap gap-2 items-center">
              {/* SELECTOR DE DATĂ GLOBAL - NOUĂ FUNCȚIONALITATE */}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-colors ${
                isDarkTheme 
                  ? "bg-white/15 border-white/20" 
                  : "bg-black/10 border-black/20"
              }`}>
                <span className={`text-xs ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>
                  Vizualizare pentru:
                </span>
                <input 
                  type="date" 
                  value={globalDate} 
                  onChange={(e) => setGlobalDate(e.target.value)}
                  className={`appearance-none bg-transparent text-xs border-none outline-none cursor-pointer ${
                    isDarkTheme ? "text-white/90" : "text-gray-800"
                  }`}
                  title="Selectează data pentru care vrei să vezi datele din toate tab-urile"
                />
              </div>
              
              {/* DATA DE AZI CLICKABILĂ - NOUĂ FUNCȚIONALITATE */}
              <button
                onClick={() => setGlobalDate(keyForDate(new Date()))}
                className={`px-2 py-1 rounded-full text-xs border transition-all hover:scale-105 cursor-pointer ${
                  isDarkTheme 
                    ? "bg-white/15 text-white/80 border-white/20 hover:bg-white/25" 
                    : "bg-black/10 text-gray-700 border-black/20 hover:bg-black/15"
                }`}
                title="Click pentru a reveni la ziua curentă"
              >
                Azi: {todayStr}
              </button>
              
              <Pill isDarkTheme={isDarkTheme}>
                Reguli 2025: CASS=10% net (min 6 salarii), CAS=25%×12 salarii dacă net≥12
              </Pill>
              
              <Pill isDarkTheme={isDarkTheme}>
                Salvare automată: ✅ Activă
              </Pill>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {/* SISTEM DE BACKUP - NOUĂ FUNCȚIONALITATE */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleBackupImport}
              className="hidden"
            />

            {/* 1. BUTON RESET LA VALORILE INIȚIALE - PRIMUL */}
            <button
              onClick={resetToInitialValues}
              className={`w-12 h-12 rounded-2xl border shadow-lg backdrop-blur-xl transition-all hover:scale-105 flex items-center justify-center text-xl ${
                isDarkTheme 
                  ? "bg-white/10 border-white/20 text-red-300 hover:bg-white/20" 
                  : "bg-black/10 border-black/20 text-red-600 hover:bg-black/15"
              }`}
              title="Reset toate datele la valorile inițiale"
            >
              🔄
            </button>

            {/* 2. BUTON PENTRU SCHIMBAREA TEMEI - AL DOILEA */}
            <button
              onClick={() => setIsDarkTheme(!isDarkTheme)}
              className={`w-12 h-12 rounded-2xl border shadow-lg backdrop-blur-xl transition-all hover:scale-105 flex items-center justify-center text-xl ${
                isDarkTheme 
                  ? "bg-white/10 border-white/20 text-yellow-300 hover:bg-white/20" 
                  : "bg-black/10 border-black/20 text-gray-700 hover:bg-black/15"
              }`}
              title={isDarkTheme ? "Schimbă la tema de zi" : "Schimbă la tema de noapte"}
            >
              {isDarkTheme ? "☀️" : "🌙"}
            </button>

            {/* 3. EXPORT CSV - AL TREILEA */}
            <IconBtn isDarkTheme={isDarkTheme} onClick={() => {
              const startTag = `${String(cfStartMonth).padStart(2,"0")}${String(cfStartYear).slice(-2)}`;
              const endDate = new Date(`${cfStartYear}-${String(cfStartMonth).padStart(2,"0")}-01T00:00:00`); endDate.setMonth(endDate.getMonth()+cfMonths-1);
              const endTag = `${String(endDate.getMonth()+1).padStart(2,"0")}${String(endDate.getFullYear()).slice(-2)}`;
              const fn = (cfStartYear===2025 && cfStartMonth===8 && cfMonths===13) ? "Cashflow_Aug25_Aug26.csv" : `Cashflow_${startTag}_${endTag}.csv`;
              downloadCSV(fn, [["Lună","Venituri totale","Plată ANAF","Comision descoperire","Taxe PFA 2025","Sold final estimat"], ...cashflowRows.map(r=>[r.luna,r.venituri,r.rataAnaf,r.comisionDesc,r.taxe2025,r.soldFinal])], ensureUnlocked);
            }}>
              <div className="text-sm font-medium whitespace-nowrap">Export CSV</div>
            </IconBtn>
            
            {/* 4. IMPORT - AL PATRULEA */}
            <IconBtn
              title="Importă backup din fișier JSON"
              onClick={() => fileInputRef.current?.click()}
              isDarkTheme={isDarkTheme}
            >
              📂 Import
            </IconBtn>
            
            {/* 5. BACKUP - AL CINCILEA */}
            <IconBtn
              title="Descarcă backup complet (toate datele)"
              onClick={() => createFullBackup()}
              isDarkTheme={isDarkTheme}
            >
              💾 Backup
            </IconBtn>
          </div>
        </header>

{/* Navigația cu tab-urile */}
<div className="overflow-x-auto mb-6">
  <div className="flex gap-2 whitespace-nowrap">
    {[
      ["config","Ipoteze"],
      ["debts","Datorii & Taxe"],
      ["anaf","Grafic ANAF"],
      ["cash","Cash accounts"],
      ["recv","Creanțe clienți"],
      ["port","Portofoliu acțiuni"],
      ["cf","Cashflow"],
      ["monthly","Cheltuieli lunare"],
      ["balance","Balanță"],
    ].map(([k,l]) => (
      <button 
        key={k} 
        onClick={() => setTab(k)} 
        className={`inline-flex shrink-0 px-3 py-2 rounded-xl border transition-colors ${
          tab===k 
            ? (isDarkTheme ? "bg-white/20 border-white/40" : "bg-black/20 border-black/40") 
            : (isDarkTheme ? "bg-white/10 border-white/20 hover:bg-white/15" : "bg-black/10 border-black/20 hover:bg-black/15")
        }`}
      >
        {l}
      </button>
    ))}
    
    {/* BUTON MAIE.RO - NOUĂ FUNCȚIONALITATE */}
    <button 
      onClick={() => setTab("maie")} 
      className={`inline-flex shrink-0 px-3 py-2 rounded-xl border transition-colors font-semibold ${
        tab==="maie" 
          ? (isDarkTheme ? "bg-blue-500/20 border-blue-400/40 text-blue-300" : "bg-blue-500/20 border-blue-400/40 text-blue-600") 
          : (isDarkTheme ? "bg-blue-500/10 border-blue-400/20 text-blue-300 hover:bg-blue-500/15" : "bg-blue-500/10 border-blue-400/20 text-blue-600 hover:bg-blue-500/15")
      }`}
    >
      🌐 MAIE.RO
    </button>
  </div>
</div>

        {/* TABUL "ASSUMPTIONS" - Configurația și calculele de bază */}
        {tab==="config" && (
          <GlassCard title="Ipoteze" isDarkTheme={isDarkTheme} actions={
            <IconBtn isDarkTheme={isDarkTheme} onClick={()=>{
              const rows = [
                ["Cheie","Valoare"],
                ["Salariu minim 2025", cfg.salMin],
                ["Venituri 2025", cfg.venituri2025],
                ["Cheltuieli deductibile 2025", cfg.cheltDed2025],
                ["Încasări PFA lunar", cfg.incasariPfaLunar],
                ["Economii din salariu (lunar)", cfg.economiiSalariu],
                ["Venit suplimentar din feb 2026", cfg.venitSuplimDinFeb2026],
                ["Comision descoperire (lunar)", cfg.descFeeLunar],
                ["Venit net", venitNet],
                ["CAS", Math.round(CAS)],
                ["CASS", Math.round(CASS)],
                ["Impozit", Math.round(impozit)],
                ["Total taxe 2026", Math.round(taxeTotal)],
              ];
              downloadCSV("Config_Ipoteze.csv", rows, ensureUnlocked);
            }}>⬇️ CSV</IconBtn>
          }>
            {/* Formularul pentru editarea configurației */}
            <div className="grid md:grid-cols-3 gap-4">
              <div><label className={`text-sm ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>Salariu minim 2025</label><NumberInput value={cfg.salMin} onChange={(v)=>setCfg({...cfg, salMin:v})} isDarkTheme={isDarkTheme} /></div>
              <div><label className={`text-sm ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>Venituri 2025</label><NumberInput value={cfg.venituri2025} onChange={(v)=>setCfg({...cfg, venituri2025:v})} isDarkTheme={isDarkTheme} /></div>
              <div><label className={`text-sm ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>Cheltuieli deductibile 2025</label><NumberInput value={cfg.cheltDed2025} onChange={(v)=>setCfg({...cfg, cheltDed2025:v})} isDarkTheme={isDarkTheme} /></div>
              <div><label className={`text-sm ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>Încasări PFA lunar</label><NumberInput value={cfg.incasariPfaLunar} onChange={(v)=>setCfg({...cfg, incasariPfaLunar:v})} isDarkTheme={isDarkTheme} /></div>
              <div><label className={`text-sm ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>Economii din salariu (lunar)</label><NumberInput value={cfg.economiiSalariu} onChange={(v)=>setCfg({...cfg, economiiSalariu:v})} isDarkTheme={isDarkTheme} /></div>
              <div><label className={`text-sm ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>Venit suplimentar din feb 2026</label><NumberInput value={cfg.venitSuplimDinFeb2026} onChange={(v)=>setCfg({...cfg, venitSuplimDinFeb2026:v})} isDarkTheme={isDarkTheme} /></div>
              <div><label className={`text-sm ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>Comision descoperire (lunar)</label><NumberInput value={cfg.descFeeLunar} onChange={(v)=>setCfg({...cfg, descFeeLunar:v})} isDarkTheme={isDarkTheme} /></div>
            </div>
            
            {/* Afișarea calculelor automate pentru taxe */}
            <div className="grid md:grid-cols-5 gap-4 mt-6">
              <div className={`p-3 rounded-xl border ${isDarkTheme ? "bg-white/10 border-white/20" : "bg-black/5 border-black/10"}`}><div className={`text-xs ${isDarkTheme ? "text-white/60" : "text-gray-500"}`}>Venit net</div><div className="text-lg font-semibold">{fmt(venitNet)} lei</div></div>
              <div className={`p-3 rounded-xl border ${isDarkTheme ? "bg-white/10 border-white/20" : "bg-black/5 border-black/10"}`}><div className={`text-xs ${isDarkTheme ? "text-white/60" : "text-gray-500"}`}>CAS</div><div className="text-lg font-semibold">{fmt(Math.round(CAS))} lei</div></div>
              <div className={`p-3 rounded-xl border ${isDarkTheme ? "bg-white/10 border-white/20" : "bg-black/5 border-black/10"}`}><div className={`text-xs ${isDarkTheme ? "text-white/60" : "text-gray-500"}`}>CASS</div><div className="text-lg font-semibold">{fmt(Math.round(CASS))} lei</div></div>
              <div className={`p-3 rounded-xl border ${isDarkTheme ? "bg-white/10 border-white/20" : "bg-black/5 border-black/10"}`}><div className={`text-xs ${isDarkTheme ? "text-white/60" : "text-gray-500"}`}>Impozit</div><div className="text-lg font-semibold">{fmt(Math.round(impozit))} lei</div></div>
              <div className={`p-3 rounded-xl border ${isDarkTheme ? "bg-white/10 border-white/20" : "bg-black/5 border-black/10"}`}><div className={`text-xs ${isDarkTheme ? "text-white/60" : "text-gray-500"}`}>Total taxe 2026</div><div className="text-lg font-semibold text-red-500">{fmt(Math.round(taxeTotal))} lei</div></div>
            </div>
          </GlassCard>
        )}
		
  {/* ===============================================
            SFÂRȘITUL PĂRȚII 3 SFÂRȘITUL PĂRȚII 3 - CORECTAT CU TEMĂ ȘI DATA CLICKABILĂ - ÎNCEPUTUL PĂRȚII 4
            PARTEA 4: TAB-URILE PENTRU DATORII, ANAF, CASH, CREANȚE ȘI PORTOFOLIU - CORECTAT
			Această parte conține tab-urile pentru gestionarea datoriilor și taxelor,
			graficul de plăți ANAF, conturile de cash, creanțele clienților și portofoliul de acțiuni
			TOATE CU SALVARE AUTOMATĂ PE ZILE ÎN LOCALSTORAGE ȘI ADAPTATE LA TEMĂ
            =============================================== */}

   {/* TABUL "DATORII & TAXE" - Gestionarea datoriilor și taxelor */}
        {tab==="debts" && (
          <GlassCard title="Datorii & Taxe" isDarkTheme={isDarkTheme} actions={
            <IconBtn isDarkTheme={isDarkTheme} onClick={() => downloadCSV("Datorii_Taxe.csv", [["Tip datorie/taxă","Valoare RON","Scadență"], ...debts.map(r=>[r.tip,r.valoare,r.scadenta])], ensureUnlocked)}>
              ⬇️ CSV
            </IconBtn>
          }>
            {(() => { 
              const totalToday = debts.reduce((s,r)=> s+toNum(r.valoare),0); 
              const totalCmp = (getDebRows(debCmp)||[]).reduce((s,r)=> s+toNum(r.valoare),0); 
              return <SnapshotBar date={globalDate} setDate={setGlobalDate} compare={debCmp} setCompare={setDebCmp} totalToday={totalToday} totalCompare={totalCmp} label="Diferență datorii" isDarkTheme={isDarkTheme}/>; 
            })()}
            <Table
              columns={[
                { key:"tip", label:"Tip datorie/taxă" },
                { key:"valoare", label:"Valoare RON", type:"number", total:true, step:1 },
                { key:"scadenta", label:"Scadență" },
              ]}
              rows={debts}
              setRows={setDebts}
              totalsLabel="TOTAL"
              guard={ensureUnlocked}
              isDarkTheme={isDarkTheme}
            />
          </GlassCard>
        )}

        {/* TABUL "GRAFIC ANAF" - Planificarea plăților către ANAF */}
        {tab==="anaf" && (
          <GlassCard title="Grafic ANAF" isDarkTheme={isDarkTheme} actions={
            <IconBtn isDarkTheme={isDarkTheme} onClick={()=>downloadCSV("Grafic_ANAF.csv", [["Scadență","Rată (RON)"], ...anafRows.map(r=>[r.data,r.rata])], ensureUnlocked)}>
              ⬇️ CSV
            </IconBtn>
          }>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-sm ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>An</span>
              <select 
                value={anafYear} 
                onChange={(e)=>setAnafYear(Number(e.target.value))} 
                className={`appearance-none px-3 py-2 rounded-lg border ${
                  isDarkTheme 
                    ? "bg-white/10 border-white/20 text-white/90" 
                    : "bg-black/5 border-black/20 text-gray-800"
                }`}
              >
                {allAnafYears.map(y => (
                  <option className={isDarkTheme ? "bg-slate-800 text-white" : "bg-white text-gray-800"} key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <Table
              columns={[
                { key:"data", label:"Scadență" },
                { key:"rata", label:"Rată (RON)", type:"number", total:true, step:1 },
              ]}
              rows={anafRows}
              setRows={setAnafRows}
              totalsLabel="TOTAL RATE"
              guard={ensureUnlocked}
              isDarkTheme={isDarkTheme}
            />
          </GlassCard>
        )}

        {/* TABUL "CASH ACCOUNTS" - Gestionarea conturilor bancare */}
        {tab==="cash" && (
          <GlassCard title="Cash accounts" isDarkTheme={isDarkTheme} actions={
            <IconBtn isDarkTheme={isDarkTheme} onClick={()=>downloadCSV("Cash_accounts.csv", [["Cont","Sold RON"], ...cash.map(r=>[r.cont,r.sold])], ensureUnlocked)}>
              ⬇️ CSV
            </IconBtn>
          }>
            {(() => { 
              const totalToday = cash.reduce((s,r)=> s+toNum(r.sold),0); 
              const totalCmp = (getCashRows(cashCmp)||[]).reduce((s,r)=> s+toNum(r.sold),0); 
              return <SnapshotBar date={globalDate} setDate={setGlobalDate} compare={cashCmp} setCompare={setCashCmp} totalToday={totalToday} totalCompare={totalCmp} label="Diferență cash" isDarkTheme={isDarkTheme}/>; 
            })()}
            <Table
              columns={[
                { key:"cont", label:"Cont" },
                { key:"sold", label:"Sold RON", type:"number", total:true, step:1 },
              ]}
              rows={cash}
              setRows={setCash}
              totalsLabel="TOTAL CASH"
              guard={ensureUnlocked}
              isDarkTheme={isDarkTheme}
            />
          </GlassCard>
        )}

        {/* TABUL "CREANȚE CLIENȚI" - Gestionarea sumelor de încasat de la clienți */}
        {tab==="recv" && (
          <GlassCard title="Creanțe clienți" isDarkTheme={isDarkTheme} actions={
            <IconBtn isDarkTheme={isDarkTheme} onClick={()=>downloadCSV("Creante_clienti.csv", [["Client","Sumă de încasat RON"], ...recv.map(r=>[r.client,r.suma])], ensureUnlocked)}>
              ⬇️ CSV
            </IconBtn>
          }>
            {(() => { 
              const totalToday = recv.reduce((s,r)=> s+toNum(r.suma),0); 
              const totalCmp = (getRecvRows(recvCmp)||[]).reduce((s,r)=> s+toNum(r.suma),0); 
              return <SnapshotBar date={globalDate} setDate={setGlobalDate} compare={recvCmp} setCompare={setRecvCmp} totalToday={totalToday} totalCompare={totalCmp} label="Diferență creanțe" isDarkTheme={isDarkTheme}/>; 
            })()}
            <Table
              columns={[
                { key:"client", label:"Client" },
                { key:"suma", label:"Sumă de încasat RON", type:"number", total:true, step:1 },
              ]}
              rows={recv}
              setRows={setRecv}
              totalsLabel="TOTAL CREANȚE"
              guard={ensureUnlocked}
              isDarkTheme={isDarkTheme}
            />
          </GlassCard>
        )}

        {/* TABUL "PORTOFOLIU ACȚIUNI" - Gestionarea investițiilor în acțiuni */}
        {tab==="port" && (
          <GlassCard title="Portofoliu acțiuni" isDarkTheme={isDarkTheme} actions={
            <IconBtn isDarkTheme={isDarkTheme} onClick={()=>downloadCSV("Portofoliu_actiuni.csv", [["Simbol","Nr. acțiuni","Preț curent (RON)","Valoare curentă (RON)","Țintă 12 luni (RON)","Valoare țintă (RON)"], ...portfolio.map(r=>[r.simbol,r.actiuni,r.pret, toNum(r.actiuni)*toNum(r.pret), r.tinta, toNum(r.actiuni)*toNum(r.tinta)])], ensureUnlocked)}>
              ⬇️ CSV
            </IconBtn>
          }>
            {(() => { 
              const totalToday = portfolio.reduce((s,r)=> s + toNum(r.actiuni)*toNum(r.pret), 0); 
              const totalCmp = (getPortRows(portCmp)||[]).reduce((s,r)=> s + toNum(r.actiuni)*toNum(r.pret), 0); 
              return <SnapshotBar date={globalDate} setDate={setGlobalDate} compare={portCmp} setCompare={setPortCmp} totalToday={totalToday} totalCompare={totalCmp} label="Diferență portofoliu (valoare curentă)" isDarkTheme={isDarkTheme}/>; 
            })()}
            <Table columns={portColumns} rows={portfolio} setRows={setPortfolio} totalsLabel="TOTALURI" guard={ensureUnlocked} isDarkTheme={isDarkTheme} />
            <div className="mt-2 text-sm">
              <span className="font-bold text-red-500">TOTAL NR. ACȚIUNI ATB: </span>
              <span className="font-bold text-red-500">{fmt(toNum(portfolio.find(p=>p.simbol==="ATB")?.actiuni || 0))}</span>
            </div>
          </GlassCard>
        )}

{/* ===============================================
            SFÂRȘITUL PĂRȚII 4 - CORECTAT CU TEMĂ - ÎNCEPUTUL PĂRȚII 5
            PARTEA 5: TAB-URILE PENTRU CASHFLOW, BALANCE ȘI FOOTER - CORECTAT ȘI FINAL
   Această parte conține tabul pentru analiza cashflow-ului pe luni,
   tabul pentru balanța netă cu grafice și footer-ul aplicației
   CU SALVARE AUTOMATĂ PENTRU TOATE SETĂRILE ȘI ADAPTATE LA TEMĂ
            =============================================== */}

        {/* TABUL "CASHFLOW" - Analiza fluxului de numerar pe luni */}
        {tab==="cf" && (
          <GlassCard title="Cashflow" isDarkTheme={isDarkTheme} actions={
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>Start</span>
              <select 
                value={cfStartMonth} 
                onChange={(e)=>setCfStartMonth(Number(e.target.value))} 
                className={`appearance-none px-3 py-2 rounded-lg border ${
                  isDarkTheme 
                    ? "bg-white/10 border-white/20 text-white/90" 
                    : "bg-black/5 border-black/20 text-gray-800"
                }`}
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                  <option className={isDarkTheme ? "bg-slate-800 text-white" : "bg-white text-gray-800"} key={m} value={m}>
                    {String(m).padStart(2,"0")}
                  </option>
                ))}
              </select>
              <select 
                value={cfStartYear} 
                onChange={(e)=>setCfStartYear(Number(e.target.value))} 
                className={`appearance-none px-3 py-2 rounded-lg border ${
                  isDarkTheme 
                    ? "bg-white/10 border-white/20 text-white/90" 
                    : "bg-black/5 border-black/20 text-gray-800"
                }`}
              >
                {Array.from({length:8},(_,i)=>2025+i).map(y => (
                  <option className={isDarkTheme ? "bg-slate-800 text-white" : "bg-white text-gray-800"} key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <span className={`text-sm ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>Luni</span>
              <NumberInput value={cfMonths} onChange={setCfMonths} step={1} className="w-24" isDarkTheme={isDarkTheme} />
              <IconBtn isDarkTheme={isDarkTheme} onClick={()=>{
                const startTag = `${String(cfStartMonth).padStart(2,"0")}${String(cfStartYear).slice(-2)}`;
                const endDate = new Date(`${cfStartYear}-${String(cfStartMonth).padStart(2,"0")}-01T00:00:00`); endDate.setMonth(endDate.getMonth()+cfMonths-1);
                const endTag = `${String(endDate.getMonth()+1).padStart(2,"0")}${String(endDate.getFullYear()).slice(-2)}`;
                const fn = (cfStartYear===2025 && cfStartMonth===8 && cfMonths===13) ? "Cashflow_Aug25_Aug26.csv" : `Cashflow_${startTag}_${endTag}.csv`;
                downloadCSV(fn, [["Lună","Venituri totale","Plată ANAF","Comision descoperire","Taxe PFA 2025","Sold final estimat"], ...cashflowRows.map(r=>[r.luna,r.venituri,r.rataAnaf,r.comisionDesc,r.taxe2025,r.soldFinal])], ensureUnlocked);
              }}>⬇️ CSV</IconBtn>
            </div>
          }>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    {["Lună","Venituri totale","Plată ANAF","Comision descoperire","Taxe PFA 2025","Sold final estimat"].map(h => (
                      <th key={h} className={`text-left p-2 border-b ${
                        isDarkTheme ? "text-white/70 border-white/20" : "text-gray-600 border-black/20"
                      }`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cashflowRows.map((r,i)=>(
                    <tr key={i} className={`border-b ${isDarkTheme ? "border-white/10" : "border-black/10"}`}>
                      <td className="p-2">{r.luna}</td>
                      <td className="p-2">{fmt(r.venituri)}</td>
                      <td className="p-2">{fmt(r.rataAnaf)}</td>
                      <td className="p-2">{fmt(r.comisionDesc)}</td>
                      <td className="p-2">{fmt(r.taxe2025)}</td>
                      <td className="p-2 font-medium">{fmt(Math.round(r.soldFinal))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className={`p-2 font-semibold ${isDarkTheme ? "text-red-300" : "text-red-600"}`}>TOTAL ÎNCASĂRI</td>
                    <td className={`p-2 font-bold ${isDarkTheme ? "text-red-400" : "text-red-600"}`}>{fmt(Math.round(totalsCF.incasari))}</td>
                    <td className={`p-2 font-bold ${isDarkTheme ? "text-red-400" : "text-red-600"}`}>{fmt(Math.round(totalsCF.rate))}</td>
                    <td className={`p-2 font-bold ${isDarkTheme ? "text-red-400" : "text-red-600"}`}>{fmt(Math.round(totalsCF.comisioane))}</td>
                    <td className={`p-2 font-bold ${isDarkTheme ? "text-red-400" : "text-red-600"}`}>{fmt(Math.round(totalsCF.taxe))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </GlassCard>
        )}

        {/* TABUL "BALANȚĂ" - Analiza balanței nete cu grafice */}
        {tab==="balance" && (
          <div>
            {/* Balanța netă generală */}
            <GlassCard title="Balanță (netă)" isDarkTheme={isDarkTheme}>
              {(() => {
                const atDeb = (k) => (getDebRows(k)||debtsInitial).reduce((s,r)=>s+toNum(r.valoare),0);
                const atCash = (k) => (getCashRows(k)||cashInitial).reduce((s,r)=>s+toNum(r.sold),0);
                const atRecv = (k) => (getRecvRows(k)||recvInitial).reduce((s,r)=>s+toNum(r.suma),0);
                const atPort = (k) => (getPortRows(k)||portInitial).reduce((s,r)=>s+toNum(r.actiuni)*toNum(r.pret),0);
                const [balDate, setBalDate] = [globalDate, setGlobalDate];
                const [balCmp, setBalCmp] = [debCmp, setDebCmp];
                const netToday = atCash(balDate) + atRecv(balDate) + atPort(balDate) - atDeb(balDate);
                const netCmp = atCash(balCmp) + atRecv(balCmp) + atPort(balCmp) - atDeb(balCmp);
                const series = (()=>{ const arr=[]; for(let i=29;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const k=keyForDate(d); const v=atCash(k)+atRecv(k)+atPort(k)-atDeb(k); arr.push({k,v}); } return arr; })();
                const vals = series.map(p=>p.v); const mi = Math.min(...vals), ma = Math.max(...vals); const h=80,w=320,pad=6; const range = ma-mi || 1;
                const pts = series.map((p,idx)=>{ const x=pad+(w-2*pad)*idx/(series.length-1); const y=h-pad-(h-2*pad)*(p.v-mi)/range; return `${x},${y}`; }).join(" ");
                return (
                  <div>
                    <SnapshotBar date={balDate} setDate={setBalDate} compare={balCmp} setCompare={setBalCmp} totalToday={netToday} totalCompare={netCmp} label="Diferență netă" isDarkTheme={isDarkTheme} />
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div className={`p-4 rounded-xl border ${isDarkTheme ? "bg-white/10 border-white/20" : "bg-black/5 border-black/10"}`}><div className={`text-xs ${isDarkTheme ? "text-white/60" : "text-gray-500"}`}>Total activ</div><div className="text-xl font-semibold">{fmt(Math.round(atCash(balDate)+atRecv(balDate)+atPort(balDate)))} lei</div></div>
                      <div className={`p-4 rounded-xl border ${isDarkTheme ? "bg-white/10 border-white/20" : "bg-black/5 border-black/10"}`}><div className={`text-xs ${isDarkTheme ? "text-white/60" : "text-gray-500"}`}>Datorii</div><div className="text-xl font-semibold">{fmt(Math.round(atDeb(balDate)))} lei</div></div>
                      <div className={`p-4 rounded-xl border ${isDarkTheme ? "bg-white/10 border-white/20" : "bg-black/5 border-black/10"}`}><div className={`text-xs ${isDarkTheme ? "text-white/60" : "text-gray-500"}`}>Net</div><div className="text-xl font-bold">{fmt(Math.round(netToday))} lei</div></div>
                    </div>
                    <div className={`rounded-xl border p-3 ${isDarkTheme ? "bg-white/10 border-white/20" : "bg-black/5 border-black/10"}`}>
                      <svg viewBox={`0 0 ${320} ${80}`} className="w-full h-24"><polyline fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-300" points={pts} /></svg>
                    </div>
                  </div>
                );
              })()}
            </GlassCard>

            {/* Balanța pentru Cash accounts cu grafic */}
            <GlassCard title="Balanță – Cash accounts" isDarkTheme={isDarkTheme}>
              {(() => {
                const tot = (k) => (getCashRows(k)||cashInitial).reduce((s,r)=>s+toNum(r.sold),0);
                const diffToday = tot(globalDate) - tot(cashCmp);
                const series = (()=>{ const arr=[]; for(let i=29;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const k=keyForDate(d); arr.push({k,v:tot(k)}); } return arr; })();
                const vals = series.map(p=>p.v); const mi=Math.min(...vals), ma=Math.max(...vals); const h=60,w=320,pad=6; const range = ma-mi || 1;
                const pts = series.map((p,idx)=>{ const x=pad+(w-2*pad)*idx/(series.length-1); const y=h-pad-(h-2*pad)*(p.v-mi)/range; return `${x},${y}`; }).join(" ");
                return (
                  <div>
                    <SnapshotBar date={globalDate} setDate={setGlobalDate} compare={cashCmp} setCompare={setCashCmp} totalToday={tot(globalDate)} totalCompare={tot(cashCmp)} label="Diferență cash" isDarkTheme={isDarkTheme} />
                    <div className={`rounded-xl border p-3 ${isDarkTheme ? "bg-white/10 border-white/20" : "bg-black/5 border-black/10"}`}><svg viewBox={`0 0 ${320} ${60}`} className="w-full h-16"><polyline fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-300" points={pts} /></svg></div>
                  </div>
                );
              })()}
            </GlassCard>

            {/* Balanța pentru Creanțe clienți cu grafic */}
            <GlassCard title="Balanță – Creanțe clienți" isDarkTheme={isDarkTheme}>
              {(() => {
                const tot = (k) => (getRecvRows(k)||recvInitial).reduce((s,r)=>s+toNum(r.suma),0);
                const series = (()=>{ const arr=[]; for(let i=29;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const k=keyForDate(d); arr.push({k,v:tot(k)}); } return arr; })();
                const vals = series.map(p=>p.v); const mi=Math.min(...vals), ma=Math.max(...vals); const h=60,w=320,pad=6; const range = ma-mi || 1;
                const pts = series.map((p,idx)=>{ const x=pad+(w-2*pad)*idx/(series.length-1); const y=h-pad-(h-2*pad)*(p.v-mi)/range; return `${x},${y}`; }).join(" ");
                return (
                  <div>
                    <SnapshotBar date={globalDate} setDate={setGlobalDate} compare={recvCmp} setCompare={setRecvCmp} totalToday={tot(globalDate)} totalCompare={tot(recvCmp)} label="Diferență creanțe" isDarkTheme={isDarkTheme} />
                    <div className={`rounded-xl border p-3 ${isDarkTheme ? "bg-white/10 border-white/20" : "bg-black/5 border-black/10"}`}><svg viewBox={`0 0 ${320} ${60}`} className="w-full h-16"><polyline fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-300" points={pts} /></svg></div>
                  </div>
                );
              })()}
            </GlassCard>

            {/* Balanța pentru Portofoliu acțiuni cu grafic */}
            <GlassCard title="Balanță – Portofoliu acțiuni" isDarkTheme={isDarkTheme}>
              {(() => {
                const tot = (k) => (getPortRows(k)||portInitial).reduce((s,r)=>s+toNum(r.actiuni)*toNum(r.pret),0);
                const series = (()=>{ const arr=[]; for(let i=29;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const k=keyForDate(d); arr.push({k,v:tot(k)}); } return arr; })();
                const vals = series.map(p=>p.v); const mi=Math.min(...vals), ma=Math.max(...vals); const h=60,w=320,pad=6; const range = ma-mi || 1;
                const pts = series.map((p,idx)=>{ const x=pad+(w-2*pad)*idx/(series.length-1); const y=h-pad-(h-2*pad)*(p.v-mi)/range; return `${x},${y}`; }).join(" ");
                return (
                  <div>
                    <SnapshotBar date={globalDate} setDate={setGlobalDate} compare={portCmp} setCompare={setPortCmp} totalToday={tot(globalDate)} totalCompare={tot(portCmp)} label="Diferență portofoliu" isDarkTheme={isDarkTheme} />
                    <div className={`rounded-xl border p-3 ${isDarkTheme ? "bg-white/10 border-white/20" : "bg-black/5 border-black/10"}`}><svg viewBox={`0 0 ${320} ${60}`} className="w-full h-16"><polyline fill="none" stroke="currentColor" strokeWidth="2" className="text-fuchsia-300" points={pts} /></svg></div>
                  </div>
                );
              })()}
            </GlassCard>
          </div>
        )}

        {/* TABUL "CHELTUIELI LUNARE" - Apelarea componentei MonthlyExpenses CORECTAT */}
        {tab==="monthly" && <MonthlyExpenses guard={ensureUnlocked} isDarkTheme={isDarkTheme} globalDate={globalDate} setGlobalDate={setGlobalDate} />}

		{/* TABUL "MAIE.RO" - Aplicația separată MAIE.RO */}
        {tab==="maie" && <MaieApp isDarkTheme={isDarkTheme} />}
		
        {/* Footer-ul aplicației */}
        <footer className={`mt-10 text-xs ${isDarkTheme ? "text-white/60" : "text-gray-500"}`}>
          © {new Date().getFullYear()} • Build {todayStr} • 💾 Salvare automată activă
        </footer>
      </div>
      
      {/* Spațiu de jos - 100px */}
      <div className="h-25"></div>
    </div>
  );
}

/* ===============================================
   SFÂRȘITUL PĂRȚII 5 - CORECTAT CU TEMĂ ȘI COMPLETAT
   SFÂRȘITUL COMPLETULUI COD - TOATE PROBLEMELE REZOLVATE
   ACUM CU TEMĂ COMPLETĂ PENTRU TOATE COMPONENTELE
   =============================================== */
