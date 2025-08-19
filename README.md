import React, { useEffect, useMemo, useRef, useState } from "react";

const fmt = (n) => (n === null || n === undefined || isNaN(n) ? "" : Number(n).toLocaleString("ro-RO"));
const toNum = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).split(' ').join('').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
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

const GlassCard = ({ title, children, actions }) => (
  <div className="rounded-2xl p-4 md:p-6 mb-6 bg-white/10 border border-white/20 shadow-lg backdrop-blur-xl">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xl font-semibold text-white/90">{title}</h2>
      <div className="flex gap-2">{actions}</div>
    </div>
    {children}
  </div>
);

const Pill = ({ children }) => (
  <span className="px-2 py-1 rounded-full text-xs bg-white/15 text-white/80 border border-white/20">{children}</span>
);

const IconBtn = ({ children, onClick, title, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`px-3 py-2 rounded-lg border ${disabled ? "bg-white/5 border-white/10 text-white/30" : "bg-white/10 border-white/20 text-white/90 hover:bg-white/20 active:scale-[.98]"} transition`}
  >
    {children}
  </button>
);

const NumberInput = ({ value, onChange, className = "", step = 1 }) => (
  <input
    type="number"
    inputMode="decimal"
    step={step}
    className={`w-full rounded-lg bg-white/10 border border-white/20 text-white/90 px-3 py-2 outline-none focus:ring-2 focus:ring-white/30 ${className}`}
    value={Number.isFinite(Number(value)) ? value : 0}
    onChange={(e) => onChange(Number(e.target.value))}
  />
);

const TextInput = ({ value, onChange, className = "" }) => (
  <input
    type="text"
    className={`w-full rounded-lg bg-white/10 border border-white/20 text-white/90 px-3 py-2 outline-none focus:ring-2 focus:ring-white/30 ${className}`}
    value={value}
    onChange={(e) => onChange(e.target.value)}
  />
);

function Table({ columns, rows, setRows, totalsLabel, guard }) {
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
            {columns.map((c) => <th key={c.key} className="text-left p-2 text-white/70 border-b border-white/20">{c.label}</th>)}
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/10">
              {columns.map((c) => (
                <td key={c.key} className="p-2 align-top">
                  {c.compute ? (
                    <div className="px-3 py-2">{fmt(c.compute(row))}</div>
                  ) : c.type === "number" ? (
                    <NumberInput value={row[c.key]} onChange={(v) => setRows(rows.map((r, idx) => idx === i ? { ...r, [c.key]: v } : r))} step={(typeof c.step === 'function' ? c.step(row) : (c.step ?? 1))} />
                  ) : (
                    <TextInput value={row[c.key]} onChange={(v) => setRows(rows.map((r, idx) => idx === i ? { ...r, [c.key]: v } : r))} />
                  )}
                </td>
              ))}
              <td className="p-2"><IconBtn title="Șterge" onClick={() => delRow(i)}>🗑️</IconBtn></td>
            </tr>
          ))}
        </tbody>
        {columns.some(c => c.total) && (
          <tfoot>
            <tr>
              <td className="p-2 font-semibold text-red-300" colSpan={columns.length - columns.filter(c => c.total).length}>{totalsLabel ?? "TOTAL"}</td>
              {columns.filter(c => c.total).map(c => <td key={c.key} className="p-2 font-bold text-red-400">{fmt(totals[c.key])}</td>)}
              <td />
            </tr>
          </tfoot>
        )}
      </table>
      <div className="mt-3 flex gap-2 items-center">
        <IconBtn title="Adaugă rând" onClick={addRow}>➕ Rând</IconBtn>
        <IconBtn title="Undo ștergere" onClick={undo} disabled={!undoStack.length}>↩️ Undo</IconBtn>
        <IconBtn title="Export CSV" onClick={() => {
          const header = columns.map(c => c.label);
          const data = rows.map(r => columns.map(c => c.compute ? c.compute(r) : r[c.key]));
          downloadCSV("sheet.csv", [header, ...data], guard);
        }}>⬇️ Export CSV</IconBtn>
      </div>
    </div>
  );
}

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
      try { localStorage.setItem(storageKey, JSON.stringify(nm)); } catch {}
      return nm;
    });
  };
  const getRows = (k) => (map[k] || []);
  return { date, setDate, compare, setCompare, rows, setRows, map, getRows };
}

const SnapshotBar = ({ date, setDate, compare, setCompare, totalToday, totalCompare, label = "Diferență" }) => {
  const diff = (totalToday ?? 0) - (totalCompare ?? 0);
  return (
    <div className="flex flex-wrap items-center gap-3 mb-3">
      <div className="flex items-center gap-2">
        <span className="text-white/70 text-sm">Data</span>
        <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="appearance-none px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white/90" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-white/70 text-sm">Compară cu</span>
        <input type="date" value={compare} onChange={(e)=>setCompare(e.target.value)} className="appearance-none px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white/90" />
      </div>
      <div className={`ml-auto px-3 py-2 rounded-lg border ${diff>=0?"bg-emerald-500/10 border-emerald-400/30 text-emerald-300":"bg-rose-500/10 border-rose-400/30 text-rose-300"}`}>
        {label}: {diff>=0?"+":""}{fmt(Math.round(diff))} lei
      </div>
    </div>
  );
};

const defaultSources = ["BT PFA","REVOLUT","CARMEN","BT PERSONAL","PORTOFEL ALEX","CARD TATA","IN CASA","RETUR EMAG","PORTOFEL TATA","BONURI","MARBELLA","ADOBE"];
const defaultPurchases = ["LOLITA","PPC","ENGIE","YOXO","DIGI","APACANAL","ECOVOL","SOLO","ROMARG","DOMENIU.RO","TUNS","BENZINA","MANCARE","RATA CASA","DATE ALEX SI CARMEN","CARMEN MANCARE SI TR","SUPLIMENTE","SALA AMANDOI","PROCURA ANAF","TATUAJ","GENE"];

function MonthlyExpenses({ guard }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const key = `${year}-${String(month).padStart(2,"0")}`;
  const [dataMap, setDataMap] = useState(() => ({
    [key]: {
      sources: [
        { suma:319, sursa:"BT PFA" },{ suma:813, sursa:"REVOLUT" },{ suma:0, sursa:"CARMEN" },{ suma:16, sursa:"BT PERSONAL" },
        { suma:70, sursa:"PORTOFEL ALEX" },{ suma:0, sursa:"CARD TATA" },{ suma:0, sursa:"IN CASA" },{ suma:0, sursa:"RETUR EMAG" },
        { suma:0, sursa:"PORTOFEL TATA" },{ suma:280, sursa:"BONURI" },{ suma:0, sursa:"MARBELLA" },{ suma:0, sursa:"ADOBE" }
      ],
      purchases: [
        { pret:0, cumparaturi:"LOLITA" },{ pret:0, cumparaturi:"PPC" },{ pret:0, cumparaturi:"ENGIE" },{ pret:0, cumparaturi:"YOXO" },
        { pret:0, cumparaturi:"DIGI" },{ pret:0, cumparaturi:"APACANAL" },{ pret:0, cumparaturi:"ECOVOL" },{ pret:0, cumparaturi:"SOLO" },
        { pret:0, cumparaturi:"ROMARG" },{ pret:0, cumparaturi:"DOMENIU.RO" },{ pret:0, cumparaturi:"TUNS" },{ pret:0, cumparaturi:"BENZINA" },
        { pret:500, cumparaturi:"MANCARE" },{ pret:0, cumparaturi:"RATA CASA" },{ pret:0, cumparaturi:"DATE ALEX SI CARMEN" },
        { pret:49, cumparaturi:"CARMEN MANCARE SI TR" },{ pret:700, cumparaturi:"SUPLIMENTE" },{ pret:700, cumparaturi:"SALA AMANDOI" },
        { pret:0, cumparaturi:"PROCURA ANAF" },{ pret:0, cumparaturi:"TATUAJ" },{ pret:0, cumparaturi:"GENE" }
      ]
    }
  }));
  useEffect(() => {
    const k = `${year}-${String(month).padStart(2,"0")}`;
    setDataMap(prev => prev[k] ? prev : ({
      ...prev,
      [k]: { sources: defaultSources.map(s => ({ suma:0, sursa:s })), purchases: defaultPurchases.map(p => ({ pret:0, cumparaturi:p })) }
    }));
  }, [year, month]);
  const data = dataMap[key] || { sources:[], purchases:[] };
  const setSources = (rows) => setDataMap(m => ({ ...m, [key]: { ...m[key], sources: rows }}));
  const setPurchases = (rows) => setDataMap(m => ({ ...m, [key]: { ...m[key], purchases: rows }}));
  const totalSources = useMemo(() => data.sources.reduce((s,r)=> s + toNum(r.suma), 0), [data.sources]);
  const totalPurch = useMemo(() => data.purchases.reduce((s,r)=> s + toNum(r.pret), 0), [data.purchases]);
  const diff = totalSources - totalPurch;

  return (
    <GlassCard title="Cheltuieli lunare (independent de restul)">
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-sm">Luna</span>
          <select value={month} onChange={(e)=>setMonth(Number(e.target.value))} className="appearance-none px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white/90">
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option className="bg-slate-800 text-white" key={m} value={m}>{String(m).padStart(2,"0")}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-sm">An</span>
          <select value={year} onChange={(e)=>setYear(Number(e.target.value))} className="appearance-none px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white/90">
            {Array.from({length:7},(_,i)=>2024+i).map(y => <option className="bg-slate-800 text-white" key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <IconBtn title="CSV" onClick={()=>{
          const head1 = ["TOTAL BANI LUNARI", `${String(month).padStart(2,"0")}.${year}`, "SURSE"];
          const rows1 = data.sources.map(r => [toNum(r.suma), r.sursa]);
          const tot1 = [["TOTAL", totalSources]];
          const spacer = [[""],[""]];
          const head2 = [["PRET CHELTUIELI","CUMPARATURI"]];
          const rows2 = data.purchases.map(r => [toNum(r.pret), r.cumparaturi]);
          const tot2 = [["TOTAL", totalPurch]];
          const foot = [["CAT MAI RAMAN DUPA CHELTUIELI"],["TOTAL", diff]];
          downloadCSV(`Cheltuieli_${year}_${String(month).padStart(2,"0")}.csv`, [head1, ...rows1, ...tot1, ...spacer, ...head2, ...rows2, ...tot2, ...spacer, ...foot], guard);
        }}>⬇️ CSV</IconBtn>
        <IconBtn title="Reset lună" onClick={() => setDataMap(m => ({ ...m, [key]: { sources: defaultSources.map(s=>({suma:0,sursa:s})), purchases: defaultPurchases.map(p=>({pret:0,cumparaturi:p})) } }))}>🧹 Reset lună</IconBtn>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="mb-2 font-semibold">TOTAL BANI LUNARI {String(month).padStart(2,"0")}.{year}</h3>
          <Table columns={[{ key:"suma", label:"Suma", type:"number", total:true, step:1 },{ key:"sursa", label:"Sursă" }]} rows={data.sources} setRows={setSources} totalsLabel="TOTAL" guard={guard} />
        </div>
        <div>
          <h3 className="mb-2 font-semibold">CHELTUIELI</h3>
          <Table columns={[{ key:"pret", label:"Preț cheltuieli", type:"number", total:true, step:1 },{ key:"cumparaturi", label:"Cumpărături" }]} rows={data.purchases} setRows={setPurchases} totalsLabel="TOTAL" guard={guard} />
        </div>
      </div>
      <div className="mt-4 p-4 rounded-xl bg-white/10 border border-white/20">
        <div className="text-sm text-white/70 mb-1">CÂT MAI RĂMÂN DUPĂ CHELTUIELI</div>
        <div className={`text-2xl font-bold ${diff < 0 ? "text-red-300" : "text-emerald-300"}`}>{fmt(diff)} lei</div>
      </div>
    </GlassCard>
  );
}

export default function App() {
  const PASSWORD = "Milionar00";
  const { LockOverlay, ensureUnlocked } = useIdleLock(PASSWORD);

  const [cfg, setCfg] = useState({ salMin:4050, venituri2025:74528, cheltDed2025:7954, incasariPfaLunar:4350, economiiSalariu:1000, venitSuplimDinFeb2026:700, descFeeLunar:150 });
  const venitNet = useMemo(() => cfg.venituri2025 - cfg.cheltDed2025, [cfg]);
  const plaf6 = useMemo(() => 6*cfg.salMin, [cfg.salMin]);
  const plaf12 = useMemo(() => 12*cfg.salMin, [cfg.salMin]);
  const CAS = useMemo(() => (venitNet >= plaf12 ? 0.25*plaf12 : 0), [venitNet, plaf12]);
  const CASS = useMemo(() => Math.max(0.1*venitNet, 0.1*plaf6), [venitNet, plaf6]);
  const impozit = useMemo(() => 0.1*Math.max(0, venitNet - CAS - CASS), [venitNet, CAS, CASS]);
  const taxeTotal = useMemo(() => CAS + CASS + impozit, [CAS, CASS, impozit]);

  const debtsInitial = [
    { tip:"Eșalonare ANAF 2024", valoare:24200, scadenta:"conform grafic" },
    { tip:"Descoperire cont BT", valoare:19600, scadenta:"comision 150 RON/lună" },
    { tip:"Taxe PFA 2025 (impozit+CAS+CASS)", valoare:Math.round(taxeTotal), scadenta:"25 mai 2026" },
  ];
  const { date:debDate, setDate:setDebDate, compare:debCmp, setCompare:setDebCmp, rows:debts, setRows:setDebts, map:debMap, getRows:getDebRows } = useDailySnapshot("debts", debtsInitial);
  useEffect(() => { if (debDate===todayKey) { const upd = debts.map(r => r.tip.startsWith("Taxe PFA 2025") ? { ...r, valoare: Math.round(taxeTotal) } : r); setDebts(upd); } }, [taxeTotal, debDate]);

  const [anafByYear, setAnafByYear] = useState({
    2025: [{ data:"15/09/2025", rata:2812 },{ data:"15/10/2025", rata:1884 },{ data:"17/11/2025", rata:1896 },{ data:"15/12/2025", rata:1906 }],
    2026: [{ data:"15/01/2026", rata:1917 },{ data:"16/02/2026", rata:1929 },{ data:"17/03/2026", rata:1939 },{ data:"15/04/2026", rata:1951 },{ data:"15/05/2026", rata:1961 },{ data:"15/06/2026", rata:1971 },{ data:"15/07/2026", rata:1983 },{ data:"17/08/2026", rata:2052 }],
  });
  const [anafYear, setAnafYear] = useState(2025);
  const allAnafYears = useMemo(() => Array.from({length: 2050 - 2024 + 1}, (_,i)=> 2024 + i), []);
  useEffect(() => { setAnafByYear(prev => prev[anafYear] ? prev : { ...prev, [anafYear]: [] }); }, [anafYear]);
  const anafRows = anafByYear[anafYear] || [];
  const setAnafRows = (rows) => setAnafByYear(m => ({ ...m, [anafYear]: rows }));

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

  const [cfStartYear, setCfStartYear] = useState(2025);
  const [cfStartMonth, setCfStartMonth] = useState(8);
  const [cfMonths, setCfMonths] = useState(13);

  const anafMapAllYears = useMemo(() => {
    const m = new Map();
    Object.values(anafByYear).forEach(arr => arr.forEach(r => {
      const [dd,mm,yyyy] = r.data.split("/");
      m.set(`${yyyy}-${mm}`, toNum(r.rata));
    }));
    return m;
  }, [anafByYear]);

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

  const totalsCF = useMemo(() => ({
    incasari: cashflowRows.reduce((s,r)=> s + r.venituri, 0),
    rate: cashflowRows.reduce((s,r)=> s + r.rataAnaf, 0),
    comisioane: cashflowRows.reduce((s,r)=> s + r.comisionDesc, 0),
    taxe: cashflowRows.reduce((s,r)=> s + r.taxe2025, 0),
  }), [cashflowRows]);

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

  const [tab, setTab] = useState("monthly");

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8 text-white">
      <LockOverlay />
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Plan financiar PFA – Dashboard interactiv</h1>
            <div className="mt-1 flex flex-wrap gap-2 items-center">
              <Pill>Azi: {todayStr}</Pill>
              <Pill>Reguli 2025: CASS=10% net (min 6 salarii), CAS=25%×12 salarii dacă net≥12</Pill>
            </div>
          </div>
          <div className="flex gap-2">
            <IconBtn onClick={() => {
              const startTag = `${String(cfStartMonth).padStart(2,"0")}${String(cfStartYear).slice(-2)}`;
              const endDate = new Date(`${cfStartYear}-${String(cfStartMonth).padStart(2,"0")}-01T00:00:00`); endDate.setMonth(endDate.getMonth()+cfMonths-1);
              const endTag = `${String(endDate.getMonth()+1).padStart(2,"0")}${String(endDate.getFullYear()).slice(-2)}`;
              const fn = (cfStartYear===2025 && cfStartMonth===8 && cfMonths===13) ? "Cashflow_Aug25_Aug26.csv" : `Cashflow_${startTag}_${endTag}.csv`;
              downloadCSV(fn, [["Lună","Venituri totale","Plată ANAF","Comision descoperire","Taxe PFA 2025","Sold final estimat"], ...cashflowRows.map(r=>[r.luna,r.venituri,r.rataAnaf,r.comisionDesc,r.taxe2025,r.soldFinal])], ensureUnlocked);
            }}>⬇️ Export Cashflow CSV</IconBtn>
          </div>
        </header>

        <div className="overflow-x-auto mb-6">
          <div className="flex gap-2 whitespace-nowrap">
            {[
              ["config","Assumptions"],
              ["debts","Datorii & Taxe"],
              ["anaf","Grafic ANAF"],
              ["cash","Cash accounts"],
              ["recv","Creanțe clienți"],
              ["port","Portofoliu acțiuni"],
              ["cf","Cashflow"],
              ["monthly","Cheltuieli lunare"],
              ["balance","Balanță"],
            ].map(([k,l]) => (
              <button key={k} onClick={() => setTab(k)} className={`inline-flex shrink-0 px-3 py-2 rounded-xl border ${tab===k ? "bg-white/20 border-white/40" : "bg-white/10 border-white/20 hover:bg-white/15"}`}>{l}</button>
            ))}
          </div>
        </div>
        {tab==="config" && (
          <GlassCard title="Assumptions" actions={
            <IconBtn onClick={()=>{
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
              downloadCSV("Config_Assumptions.csv", rows, ensureUnlocked);
            }}>⬇️ CSV</IconBtn>
          }>
            <div className="grid md:grid-cols-3 gap-4">
              <div><label className="text-white/70 text-sm">Salariu minim 2025</label><NumberInput value={cfg.salMin} onChange={(v)=>setCfg({...cfg, salMin:v})} /></div>
              <div><label className="text-white/70 text-sm">Venituri 2025</label><NumberInput value={cfg.venituri2025} onChange={(v)=>setCfg({...cfg, venituri2025:v})} /></div>
              <div><label className="text-white/70 text-sm">Cheltuieli deductibile 2025</label><NumberInput value={cfg.cheltDed2025} onChange={(v)=>setCfg({...cfg, cheltDed2025:v})} /></div>
              <div><label className="text-white/70 text-sm">Încasări PFA lunar</label><NumberInput value={cfg.incasariPfaLunar} onChange={(v)=>setCfg({...cfg, incasariPfaLunar:v})} /></div>
              <div><label className="text-white/70 text-sm">Economii din salariu (lunar)</label><NumberInput value={cfg.economiiSalariu} onChange={(v)=>setCfg({...cfg, economiiSalariu:v})} /></div>
              <div><label className="text-white/70 text-sm">Venit suplimentar din feb 2026</label><NumberInput value={cfg.venitSuplimDinFeb2026} onChange={(v)=>setCfg({...cfg, venitSuplimDinFeb2026:v})} /></div>
              <div><label className="text-white/70 text-sm">Comision descoperire (lunar)</label><NumberInput value={cfg.descFeeLunar} onChange={(v)=>setCfg({...cfg, descFeeLunar:v})} /></div>
            </div>
            <div className="grid md:grid-cols-5 gap-4 mt-6">
              <div className="p-3 rounded-xl bg-white/10 border border-white/20"><div className="text-white/60 text-xs">Venit net</div><div className="text-lg font-semibold">{fmt(venitNet)} lei</div></div>
              <div className="p-3 rounded-xl bg-white/10 border border-white/20"><div className="text-white/60 text-xs">CAS</div><div className="text-lg font-semibold">{fmt(Math.round(CAS))} lei</div></div>
              <div className="p-3 rounded-xl bg-white/10 border border-white/20"><div className="text-white/60 text-xs">CASS</div><div className="text-lg font-semibold">{fmt(Math.round(CASS))} lei</div></div>
              <div className="p-3 rounded-xl bg-white/10 border border-white/20"><div className="text-white/60 text-xs">Impozit</div><div className="text-lg font-semibold">{fmt(Math.round(impozit))} lei</div></div>
              <div className="p-3 rounded-xl bg-white/10 border border-white/20"><div className="text-white/60 text-xs">Total taxe 2026</div><div className="text-lg font-semibold text-red-300">{fmt(Math.round(taxeTotal))} lei</div></div>
            </div>
          </GlassCard>
        )}

        {tab==="debts" && (
          <GlassCard title="Datorii & Taxe" actions={<IconBtn onClick={() => downloadCSV("Datorii_Taxe.csv", [["Tip datorie/taxă","Valoare RON","Scadență"], ...debts.map(r=>[r.tip,r.valoare,r.scadenta])], ensureUnlocked)}>⬇️ CSV</IconBtn>}>
            {(() => { const totalToday = debts.reduce((s,r)=> s+toNum(r.valoare),0); const totalCmp = (getDebRows(debCmp)||[]).reduce((s,r)=> s+toNum(r.valoare),0); return <SnapshotBar date={debDate} setDate={setDebDate} compare={debCmp} setCompare={setDebCmp} totalToday={totalToday} totalCompare={totalCmp} label="Diferență datorii"/>; })()}
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
            />
          </GlassCard>
        )}

        {tab==="anaf" && (
          <GlassCard title="Grafic ANAF" actions={<IconBtn onClick={()=>downloadCSV("Grafic_ANAF.csv", [["Scadență","Rată (RON)"], ...anafRows.map(r=>[r.data,r.rata])], ensureUnlocked)}>⬇️ CSV</IconBtn>}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-white/70 text-sm">An</span>
              <select value={anafYear} onChange={(e)=>setAnafYear(Number(e.target.value))} className="appearance-none px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white/90">
                {allAnafYears.map(y => <option className="bg-slate-800 text-white" key={y} value={y}>{y}</option>)}
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
            />
          </GlassCard>
        )}

        {tab==="cash" && (
          <GlassCard title="Cash accounts" actions={<IconBtn onClick={()=>downloadCSV("Cash_accounts.csv", [["Cont","Sold RON"], ...cash.map(r=>[r.cont,r.sold])], ensureUnlocked)}>⬇️ CSV</IconBtn>}>
            {(() => { const totalToday = cash.reduce((s,r)=> s+toNum(r.sold),0); const totalCmp = (getCashRows(cashCmp)||[]).reduce((s,r)=> s+toNum(r.sold),0); return <SnapshotBar date={cashDate} setDate={setCashDate} compare={cashCmp} setCompare={setCashCmp} totalToday={totalToday} totalCompare={totalCmp} label="Diferență cash"/>; })()}
            <Table
              columns={[
                { key:"cont", label:"Cont" },
                { key:"sold", label:"Sold RON", type:"number", total:true, step:1 },
              ]}
              rows={cash}
              setRows={setCash}
              totalsLabel="TOTAL CASH"
              guard={ensureUnlocked}
            />
          </GlassCard>
        )}

        {tab==="recv" && (
          <GlassCard title="Creanțe clienți" actions={<IconBtn onClick={()=>downloadCSV("Creante_clienti.csv", [["Client","Sumă de încasat RON"], ...recv.map(r=>[r.client,r.suma])], ensureUnlocked)}>⬇️ CSV</IconBtn>}>
            {(() => { const totalToday = recv.reduce((s,r)=> s+toNum(r.suma),0); const totalCmp = (getRecvRows(recvCmp)||[]).reduce((s,r)=> s+toNum(r.suma),0); return <SnapshotBar date={recvDate} setDate={setRecvDate} compare={recvCmp} setCompare={setRecvCmp} totalToday={totalToday} totalCompare={totalCmp} label="Diferență creanțe"/>; })()}
            <Table
              columns={[
                { key:"client", label:"Client" },
                { key:"suma", label:"Sumă de încasat RON", type:"number", total:true, step:1 },
              ]}
              rows={recv}
              setRows={setRecv}
              totalsLabel="TOTAL CREANȚE"
              guard={ensureUnlocked}
            />
          </GlassCard>
        )}

        {tab==="port" && (
          <GlassCard title="Portofoliu acțiuni" actions={<IconBtn onClick={()=>downloadCSV("Portofoliu_actiuni.csv", [["Simbol","Nr. acțiuni","Preț curent (RON)","Valoare curentă (RON)","Țintă 12 luni (RON)","Valoare țintă (RON)"], ...portfolio.map(r=>[r.simbol,r.actiuni,r.pret, toNum(r.actiuni)*toNum(r.pret), r.tinta, toNum(r.actiuni)*toNum(r.tinta)])], ensureUnlocked)}>⬇️ CSV</IconBtn>}>
            {(() => { const totalToday = portfolio.reduce((s,r)=> s + toNum(r.actiuni)*toNum(r.pret), 0); const totalCmp = (getPortRows(portCmp)||[]).reduce((s,r)=> s + toNum(r.actiuni)*toNum(r.pret), 0); return <SnapshotBar date={portDate} setDate={setPortDate} compare={portCmp} setCompare={setPortCmp} totalToday={totalToday} totalCompare={totalCmp} label="Diferență portofoliu (valoare curentă)"/>; })()}
            <Table columns={portColumns} rows={portfolio} setRows={setPortfolio} totalsLabel="TOTALURI" guard={ensureUnlocked} />
            <div className="mt-2 text-sm">
              <span className="font-bold text-red-300">TOTAL NR. ACȚIUNI ATB: </span>
              <span className="font-bold text-red-300">{fmt(toNum(portfolio.find(p=>p.simbol==="ATB")?.actiuni || 0))}</span>
            </div>
          </GlassCard>
        )}

{tab==="cf" && (
          <GlassCard title="Cashflow" actions={
            <div className="flex items-center gap-2">
              <span className="text-white/70 text-sm">Start</span>
              <select value={cfStartMonth} onChange={(e)=>setCfStartMonth(Number(e.target.value))} className="appearance-none px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white/90">
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option className="bg-slate-800 text-white" key={m} value={m}>{String(m).padStart(2,"0")}</option>)}
              </select>
              <select value={cfStartYear} onChange={(e)=>setCfStartYear(Number(e.target.value))} className="appearance-none px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white/90">
                {Array.from({length:8},(_,i)=>2025+i).map(y => <option className="bg-slate-800 text-white" key={y} value={y}>{y}</option>)}
              </select>
              <span className="text-white/70 text-sm">Luni</span>
              <NumberInput value={cfMonths} onChange={setCfMonths} step={1} className="w-24" />
              <IconBtn onClick={()=>{
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
                    {["Lună","Venituri totale","Plată ANAF","Comision descoperire","Taxe PFA 2025","Sold final estimat"].map(h => <th key={h} className="text-left p-2 text-white/70 border-b border-white/20">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {cashflowRows.map((r,i)=>(
                    <tr key={i} className="border-b border-white/10">
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
                    <td className="p-2 font-semibold text-red-300">TOTAL ÎNCASĂRI</td>
                    <td className="p-2 font-bold text-red-400">{fmt(Math.round(totalsCF.incasari))}</td>
                    <td className="p-2 font-bold text-red-400">{fmt(Math.round(totalsCF.rate))}</td>
                    <td className="p-2 font-bold text-red-400">{fmt(Math.round(totalsCF.comisioane))}</td>
                    <td className="p-2 font-bold text-red-400">{fmt(Math.round(totalsCF.taxe))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </GlassCard>
        )}

        {tab==="balance" && (
          <div>
            <GlassCard title="Balanță (netă)">
              {(() => {
                const atDeb = (k) => (getDebRows(k)||debtsInitial).reduce((s,r)=>s+toNum(r.valoare),0);
                const atCash = (k) => (getCashRows(k)||cashInitial).reduce((s,r)=>s+toNum(r.sold),0);
                const atRecv = (k) => (getRecvRows(k)||recvInitial).reduce((s,r)=>s+toNum(r.suma),0);
                const atPort = (k) => (getPortRows(k)||portInitial).reduce((s,r)=>s+toNum(r.actiuni)*toNum(r.pret),0);
                const [balDate, setBalDate] = [debDate, setDebDate];
                const [balCmp, setBalCmp] = [debCmp, setDebCmp];
                const netToday = atCash(balDate) + atRecv(balDate) + atPort(balDate) - atDeb(balDate);
                const netCmp = atCash(balCmp) + atRecv(balCmp) + atPort(balCmp) - atDeb(balCmp);
                const series = (()=>{ const arr=[]; for(let i=29;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const k=keyForDate(d); const v=atCash(k)+atRecv(k)+atPort(k)-atDeb(k); arr.push({k,v}); } return arr; })();
                const vals = series.map(p=>p.v); const mi = Math.min(...vals), ma = Math.max(...vals); const h=80,w=320,pad=6; const range = ma-mi || 1;
                const pts = series.map((p,idx)=>{ const x=pad+(w-2*pad)*idx/(series.length-1); const y=h-pad-(h-2*pad)*(p.v-mi)/range; return `${x},${y}`; }).join(" ");
                return (
                  <div>
                    <SnapshotBar date={balDate} setDate={setBalDate} compare={balCmp} setCompare={setBalCmp} totalToday={netToday} totalCompare={netCmp} label="Diferență netă" />
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div className="p-4 rounded-xl bg-white/10 border border-white/20"><div className="text-white/60 text-xs">Total activ</div><div className="text-xl font-semibold">{fmt(Math.round(atCash(balDate)+atRecv(balDate)+atPort(balDate)))} lei</div></div>
                      <div className="p-4 rounded-xl bg-white/10 border border-white/20"><div className="text-white/60 text-xs">Datorii</div><div className="text-xl font-semibold">{fmt(Math.round(atDeb(balDate)))} lei</div></div>
                      <div className="p-4 rounded-xl bg-white/10 border border-white/20"><div className="text-white/60 text-xs">Net</div><div className="text-xl font-bold">{fmt(Math.round(netToday))} lei</div></div>
                    </div>
                    <div className="rounded-xl bg-white/10 border border-white/20 p-3">
                      <svg viewBox={`0 0 ${320} ${80}`} className="w-full h-24"><polyline fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-300" points={pts} /></svg>
                    </div>
                  </div>
                );
              })()}
            </GlassCard>

            <GlassCard title="Balanță – Cash accounts">
              {(() => {
                const tot = (k) => (getCashRows(k)||cashInitial).reduce((s,r)=>s+toNum(r.sold),0);
                const diffToday = tot(cashDate) - tot(cashCmp);
                const series = (()=>{ const arr=[]; for(let i=29;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const k=keyForDate(d); arr.push({k,v:tot(k)}); } return arr; })();
                const vals = series.map(p=>p.v); const mi=Math.min(...vals), ma=Math.max(...vals); const h=60,w=320,pad=6; const range = ma-mi || 1;
                const pts = series.map((p,idx)=>{ const x=pad+(w-2*pad)*idx/(series.length-1); const y=h-pad-(h-2*pad)*(p.v-mi)/range; return `${x},${y}`; }).join(" ");
                return (
                  <div>
                    <SnapshotBar date={cashDate} setDate={setCashDate} compare={cashCmp} setCompare={setCashCmp} totalToday={tot(cashDate)} totalCompare={tot(cashCmp)} label="Diferență cash" />
                    <div className="rounded-xl bg-white/10 border border-white/20 p-3"><svg viewBox={`0 0 ${320} ${60}`} className="w-full h-16"><polyline fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-300" points={pts} /></svg></div>
                  </div>
                );
              })()}
            </GlassCard>

            <GlassCard title="Balanță – Creanțe clienți">
              {(() => {
                const tot = (k) => (getRecvRows(k)||recvInitial).reduce((s,r)=>s+toNum(r.suma),0);
                const series = (()=>{ const arr=[]; for(let i=29;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const k=keyForDate(d); arr.push({k,v:tot(k)}); } return arr; })();
                const vals = series.map(p=>p.v); const mi=Math.min(...vals), ma=Math.max(...vals); const h=60,w=320,pad=6; const range = ma-mi || 1;
                const pts = series.map((p,idx)=>{ const x=pad+(w-2*pad)*idx/(series.length-1); const y=h-pad-(h-2*pad)*(p.v-mi)/range; return `${x},${y}`; }).join(" ");
                return (
                  <div>
                    <SnapshotBar date={recvDate} setDate={setRecvDate} compare={recvCmp} setCompare={setRecvCmp} totalToday={tot(recvDate)} totalCompare={tot(recvCmp)} label="Diferență creanțe" />
                    <div className="rounded-xl bg-white/10 border border-white/20 p-3"><svg viewBox={`0 0 ${320} ${60}`} className="w-full h-16"><polyline fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-300" points={pts} /></svg></div>
                  </div>
                );
              })()}
            </GlassCard>

            <GlassCard title="Balanță – Portofoliu acțiuni">
              {(() => {
                const tot = (k) => (getPortRows(k)||portInitial).reduce((s,r)=>s+toNum(r.actiuni)*toNum(r.pret),0);
                const series = (()=>{ const arr=[]; for(let i=29;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const k=keyForDate(d); arr.push({k,v:tot(k)}); } return arr; })();
                const vals = series.map(p=>p.v); const mi=Math.min(...vals), ma=Math.max(...vals); const h=60,w=320,pad=6; const range = ma-mi || 1;
                const pts = series.map((p,idx)=>{ const x=pad+(w-2*pad)*idx/(series.length-1); const y=h-pad-(h-2*pad)*(p.v-mi)/range; return `${x},${y}`; }).join(" ");
                return (
                  <div>
                    <SnapshotBar date={portDate} setDate={setPortDate} compare={portCmp} setCompare={setPortCmp} totalToday={tot(portDate)} totalCompare={tot(portCmp)} label="Diferență portofoliu" />
                    <div className="rounded-xl bg-white/10 border border-white/20 p-3"><svg viewBox={`0 0 ${320} ${60}`} className="w-full h-16"><polyline fill="none" stroke="currentColor" strokeWidth="2" className="text-fuchsia-300" points={pts} /></svg></div>
                  </div>
                );
              })()}
            </GlassCard>
          </div>
        )}

        {tab==="monthly" && <MonthlyExpenses guard={ensureUnlocked} />}

        <footer className="mt-10 text-white/60 text-xs">© {new Date().getFullYear()} • Build {todayStr}</footer>
      </div>
    </div>
  );
}
