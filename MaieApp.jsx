import React, { useState, useEffect, useRef } from 'react';

/* Funcții utilitare */
function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
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
  } catch (e) {
    console.error(`Eroare backup ${filename}:`, e);
  }
}

/* Funcție pentru verificarea expirărilor */
function checkExpiration(dataExpirare) {
  if (!dataExpirare) return { isExpiring: false, daysLeft: null };
  
  const dateMatch = dataExpirare.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!dateMatch) return { isExpiring: false, daysLeft: null };
  
  const [, day, month, year] = dateMatch;
  const expireDate = new Date(year, month - 1, day);
  const today = new Date();
  const diffTime = expireDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return {
    isExpiring: diffDays <= 30 && diffDays >= 0,
    isExpired: diffDays < 0,
    daysLeft: diffDays
  };
}

/* Componente UI */
const MaieGlassCard = ({ title, children, actions, isDarkTheme }) => (
  <div className={`rounded-2xl p-4 md:p-6 mb-6 border shadow-lg backdrop-blur-xl ${
    isDarkTheme ? "bg-white/10 border-white/20" : "bg-black/5 border-black/10"
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

const MaieIconBtn = ({ children, onClick, title, disabled, isDarkTheme }) => (
  <button type="button" onClick={onClick} title={title} disabled={disabled}
    className={`px-3 py-2 rounded-lg border transition ${
      disabled 
        ? (isDarkTheme ? "bg-white/5 border-white/10 text-white/30" : "bg-black/5 border-black/10 text-gray-400")
        : (isDarkTheme ? "bg-white/10 border-white/20 text-white/90 hover:bg-white/20 active:scale-[.98]" : "bg-black/10 border-black/20 text-gray-800 hover:bg-black/15 active:scale-[.98]")
    }`}>
    {children}
  </button>
);

const MaieTextInput = ({ value, onChange, isDarkTheme }) => (
  <input 
    type="text" 
    value={value} 
    onChange={(e) => onChange(e.target.value)}
    className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 transition ${
      isDarkTheme ? "bg-white/10 border-white/20 text-white/90 focus:ring-white/30" : "bg-black/5 border-black/20 text-gray-800 focus:ring-black/30"
    }`} 
  />
);

const MaieApp = ({ isDarkTheme = true }) => {
  const [activeTab, setActiveTab] = useState("1");
  const [selectedYear, setSelectedYear] = useState(2025);

  /* Lista de domenii cu datele tale EXACTE din tabelul original - FORȚEAZĂ ACTUALIZAREA */
  const [domains, setDomains] = useState(() => {
    // Datele noi cu serviciile complete din tabelul tău
    const newData = [
      { domain: "https://agentiimarketing.com/", serviciu: "DOMENIU EXPIRA", dataExpirare: "02.03.2025" },
      { domain: "fotovideorecord.ro", serviciu: "HOSTING SI DOMENIU + SSL", dataExpirare: "18.03.2026" },
      { domain: "jewel-studio.ro", serviciu: "MENTENANTA + HOSTING SI SSL", dataExpirare: "17.07.2026" },
      { domain: "jewel-studio.ro", serviciu: "SSL EXPIRA", dataExpirare: "30.06.2025" },
      { domain: "maie.ro", serviciu: "", dataExpirare: "" },
      { domain: "marbellaoptic.ro", serviciu: "HOSTING SI DOMENIU + SSL si MENTENANTA", dataExpirare: "16.06.2026" },
      { domain: "marbellaoptic.ro", serviciu: "MENTENANTA EXPIRA", dataExpirare: "13.08.2025" },
      { domain: "nseo.ro", serviciu: "DOMENIU EXPIRA", dataExpirare: "24.04.2026" },
      { domain: "edulearn.ro", serviciu: "DOMENIU EXPIRA", dataExpirare: "26.12.2025" },
      { domain: "https://licentalucrare.ro/", serviciu: "EXPIRARE HOSTING DOMENIU + SSL + NU AM LUAT BANI PE SITE", dataExpirare: "10.12.2025" },
      { domain: "http://promovezcubrio.com/", serviciu: "EXPIRARE HOSTING DOMENIU + SSL", dataExpirare: "25.04.2026" },
      { domain: "https://licentadisertatie.com/", serviciu: "EXPIRARE HOSTING DOMENIU + SSL", dataExpirare: "24.07.2025" },
      { domain: "https://licentalacomanda.ro/", serviciu: "EXPIRARE HOSTING DOMENIU + SSL", dataExpirare: "05.08.2025" },
      { domain: "https://suport-licenta-disertatie.ro/", serviciu: "HOSTING DOMENIU + SSL", dataExpirare: "16.04.2026" },
      { domain: "https://techbro.ro", serviciu: "HOSTING SI DOMENIU + SSL", dataExpirare: "15.11.2025" },
      { domain: "https://techbro.ro", serviciu: "ARTICOLE SEO", dataExpirare: "15.11.2025" },
      { domain: "https://decohaus360.ro", serviciu: "HOSTING SI DOMENIU + SSL", dataExpirare: "12.02.2026" },
      { domain: "https://fatadeco.ro/", serviciu: "HOSTING SI DOMENIU + SSL", dataExpirare: "12.02.2026" },
      { domain: "https://decohausrenovari.ro/", serviciu: "HOSTING SI DOMENIU + SSL", dataExpirare: "12.02.2026" },
      { domain: "http://ystmedia.ro/", serviciu: "HOSTING + SSL", dataExpirare: "08.09.2025" },
      { domain: "https://hebrewbenessere.com/", serviciu: "HOSTING SI DOMENIU", dataExpirare: "24.08.2025" },
      { domain: "https://casaisabel.ro/", serviciu: "DOMENIU SI HOSTING", dataExpirare: "27.10.2025" },
      { domain: "https://piesedelift.ro/", serviciu: "", dataExpirare: "" },
    ];
    
    // Forțează actualizarea cu datele noi
    try {
      localStorage.setItem("maieDomainsSimple", JSON.stringify(newData));
    } catch (e) {
      console.error("Eroare actualizare domenii:", e);
    }
    
    return newData;
  });

  /* Lista de contracte - PERMITE MULTIPLE CONTRACTE PER CLIENT */
  const [contracts, setContracts] = useState(() => {
    try {
      const saved = localStorage.getItem("maieContractsSimple");
      return saved ? JSON.parse(saved) : [
        { client: "BELVEDERE GSM", contracts: [] },
        { client: "JEWEL STUDIO", contracts: [] },
        { client: "MARBELLA OPTIC", contracts: [] },
        { client: "TECHBRO", contracts: [] },
        { client: "DECOHAUS", contracts: [] },
      ];
    } catch {
      return [];
    }
  });

  /* Salvează listele automat */
  useEffect(() => {
    try {
      localStorage.setItem("maieDomainsSimple", JSON.stringify(domains));
    } catch (e) {
      console.error("Eroare salvare domenii MAIE:", e);
    }
  }, [domains]);

  useEffect(() => {
    try {
      localStorage.setItem("maieContractsSimple", JSON.stringify(contracts));
    } catch (e) {
      console.error("Eroare salvare contracte MAIE:", e);
    }
  }, [contracts]);

  /* Stare pentru browser Tab 2 */
  const [browserUrl, setBrowserUrl] = useState("https://maie.ro");
  const [currentUrl, setCurrentUrl] = useState("https://maie.ro");
  const [history, setHistory] = useState(["https://maie.ro"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const iframeRef = useRef(null);
  const [iframeKey, setIframeKey] = useState(0);

  /* Funcții browser - CORECTATE pentru a evita www.google.com */
  const navigateTo = (url) => {
    let finalUrl = url.trim();
    
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      if (finalUrl.includes('.') && !finalUrl.includes(' ')) {
        finalUrl = `https://${finalUrl}`;
      } else {
        finalUrl = `https://www.bing.com/search?q=${encodeURIComponent(finalUrl)}`;
      }
    }
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(finalUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentUrl(finalUrl);
    setBrowserUrl(finalUrl);
    setIframeKey(prev => prev + 1);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const url = history[newIndex];
      setCurrentUrl(url);
      setBrowserUrl(url);
      setIframeKey(prev => prev + 1);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const url = history[newIndex];
      setCurrentUrl(url);
      setBrowserUrl(url);
      setIframeKey(prev => prev + 1);
    }
  };

  const goHome = () => {
    const homeUrl = "https://maie.ro";
    setCurrentUrl(homeUrl);
    setBrowserUrl(homeUrl);
    setIframeKey(prev => prev + 1);
  };

  const refreshPage = () => {
    setIframeKey(prev => prev + 1);
  };

  /* Backup pentru MAIE */
  const fileInputRef = useRef(null);

  const createMaieBackup = () => {
    const backup = {
      timestamp: new Date().toISOString(),
      version: "1.0",
      maieDomains: domains,
      maieContracts: contracts
    };
    const timestamp = new Date().toISOString().slice(0,19).replace(/[:-]/g, '');
    downloadJSON(`MAIE_Backup_${timestamp}.json`, backup);
  };

  const handleMaieBackupImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const backup = JSON.parse(e.target.result);
          if (backup.maieDomains) {
            setDomains(backup.maieDomains);
            localStorage.setItem("maieDomainsSimple", JSON.stringify(backup.maieDomains));
          }
          if (backup.maieContracts) {
            setContracts(backup.maieContracts);
            localStorage.setItem("maieContractsSimple", JSON.stringify(backup.maieContracts));
          }
          alert("✅ Backup MAIE importat cu succes!");
        } catch (error) {
          alert(`❌ Eroare la importul backup-ului MAIE: ${error.message}`);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      alert(`❌ Eroare la importul backup-ului MAIE: ${error.message}`);
    }
    
    event.target.value = '';
  };

  return (
    <div>
      {/* Header MAIE.RO */}
      <MaieGlassCard title="🌐 MAIE.RO - Dashboard" isDarkTheme={isDarkTheme}>
        <div className={`text-sm ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>
          Aplicația MAIE.RO - Gestionarea domeniilor și serviciilor
        </div>
      </MaieGlassCard>

      {/* Navigația tab-urilor MAIE */}
      <div className="overflow-x-auto mb-6">
        <div className="flex gap-2 whitespace-nowrap">
          {[
            ["1", "Domenii & Servicii"],
            ["2", "Browser MAIE.RO"],
            ["3", "Contracte Active"],
            ["4", "Tab 4"],
            ["5", "Tab 5"],
            ["6", "Tab 6"],
          ].map(([k, l]) => (
            <button 
              key={k} 
              onClick={() => setActiveTab(k)} 
              className={`inline-flex shrink-0 px-3 py-2 rounded-xl border transition-colors ${
                activeTab === k 
                  ? (isDarkTheme ? "bg-blue-500/20 border-blue-400/40 text-blue-300" : "bg-blue-500/20 border-blue-400/40 text-blue-600") 
                  : (isDarkTheme ? "bg-white/10 border-white/20 hover:bg-white/15" : "bg-black/10 border-black/20 hover:bg-black/15")
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1 - Domenii & Servicii */}
      {activeTab === "1" && (
        <MaieGlassCard title="Domenii & Servicii" isDarkTheme={isDarkTheme} actions={
          <div className="flex gap-2 items-center">
            <span className={`text-sm ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>An:</span>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className={`appearance-none px-3 py-2 rounded-lg border ${
                isDarkTheme ? "bg-white/10 border-white/20 text-white/90" : "bg-black/5 border-black/20 text-gray-800"
              }`}
            >
              {Array.from({length: 27}, (_, i) => 2024 + i).map(year => (
                <option key={year} value={year} className={isDarkTheme ? "bg-slate-800 text-white" : "bg-white text-gray-800"}>
                  {year}
                </option>
              ))}
            </select>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleMaieBackupImport}
              className="hidden"
            />
            <MaieIconBtn 
              title="Importă backup MAIE" 
              onClick={() => fileInputRef.current?.click()}
              isDarkTheme={isDarkTheme}
            >
              📂
            </MaieIconBtn>
            <MaieIconBtn 
              title="Backup MAIE" 
              onClick={createMaieBackup}
              isDarkTheme={isDarkTheme}
            >
              💾
            </MaieIconBtn>
          </div>
        }>
          <DomainsTab1Content 
            domains={domains}
            setDomains={setDomains}
            selectedYear={selectedYear}
            isDarkTheme={isDarkTheme}
          />
        </MaieGlassCard>
      )}

			{/* TAB 2 - Browser MAIE.RO */}
			{activeTab === "2" && (
			<div className="w-full">
		<MaieGlassCard title="Browser MAIE.RO" isDarkTheme={isDarkTheme}>
            <div className={`flex items-center gap-2 p-3 rounded-lg border mb-4 ${isDarkTheme ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"}`}>
              <MaieIconBtn title="Înapoi" onClick={goBack} disabled={historyIndex <= 0} isDarkTheme={isDarkTheme}>←</MaieIconBtn>
              <MaieIconBtn title="Înainte" onClick={goForward} disabled={historyIndex >= history.length - 1} isDarkTheme={isDarkTheme}>→</MaieIconBtn>
              <MaieIconBtn title="Refresh" onClick={refreshPage} isDarkTheme={isDarkTheme}>🔄</MaieIconBtn>
              <MaieIconBtn title="Acasă (MAIE.RO)" onClick={goHome} isDarkTheme={isDarkTheme}>🏠</MaieIconBtn>
              <input
                type="text"
                value={browserUrl}
                onChange={(e) => setBrowserUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    navigateTo(browserUrl);
                  }
                }}
                placeholder="Introdu URL sau caută pe DuckDuckGo..."
                className={`flex-1 rounded-lg border px-3 py-2 outline-none focus:ring-2 transition ${
                  isDarkTheme ? "bg-white/10 border-white/20 text-white/90 focus:ring-white/30" : "bg-black/5 border-black/20 text-gray-800 focus:ring-black/30"
                }`}
              />
              <MaieIconBtn title="Navighează" onClick={() => navigateTo(browserUrl)} isDarkTheme={isDarkTheme}>➤</MaieIconBtn>
            </div>
            <div className={`rounded-xl border overflow-hidden ${isDarkTheme ? "border-white/20" : "border-black/20"}`}>
		<iframe 
  key={iframeKey}
  ref={iframeRef}
  src={currentUrl} 
  className="w-full"
  style={{ height: '70vh', minHeight: '500px' }}
  title="Browser MAIE.RO"
  sandbox="allow-same-origin allow-scripts allow-forms allow-top-navigation allow-popups"
/>
		</div>
          </MaieGlassCard>
        </div>
      )}

      {/* TAB 3 - Contracte Active */}
      {activeTab === "3" && (
        <MaieGlassCard title="Contracte Active" isDarkTheme={isDarkTheme}>
          <div className={`mb-3 p-3 rounded-lg border ${isDarkTheme ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"}`}>
            <div className={`text-sm ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>
              Total clienți: <span className="font-semibold">{contracts.length}</span>
            </div>
          </div>
          
          <ContractsTab3Content 
            contracts={contracts}
            setContracts={setContracts}
            isDarkTheme={isDarkTheme}
          />
        </MaieGlassCard>
      )}

      {/* TAB 4-6 - În dezvoltare */}
      {activeTab === "4" && (
        <MaieGlassCard title="Tab 4" isDarkTheme={isDarkTheme}>
          <div className={`p-4 text-center ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>
            🚧 Tab 4 - În dezvoltare
          </div>
        </MaieGlassCard>
      )}

      {activeTab === "5" && (
        <MaieGlassCard title="Tab 5" isDarkTheme={isDarkTheme}>
          <div className={`p-4 text-center ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>
            🚧 Tab 5 - În dezvoltare
          </div>
        </MaieGlassCard>
      )}

      {activeTab === "6" && (
        <MaieGlassCard title="Tab 6" isDarkTheme={isDarkTheme}>
          <div className={`p-4 text-center ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>
            🚧 Tab 6 - În dezvoltare
          </div>
        </MaieGlassCard>
      )}
    </div>
  );
};

/* Componenta pentru Tab 1 - Domenii cu 3 coloane și alertă expirări */
const DomainsTab1Content = ({ domains, setDomains, selectedYear, isDarkTheme }) => {
  const [undoStack, setUndoStack] = useState([]);
  
  const addRow = () => setDomains([
    ...domains,
    { domain: "", serviciu: "", dataExpirare: "" }
  ]);
  
  const delRow = (i) => { 
    setUndoStack((s)=>[...s, { row: domains[i], idx: i }]); 
    setDomains(domains.filter((_, idx) => idx !== i)); 
  };
  
  const undo = () => { 
    if (!undoStack.length) return; 
    const last = undoStack[undoStack.length-1]; 
    const copy = domains.slice(); 
    const pos = Math.min(Math.max(0, last.idx), copy.length); 
    copy.splice(pos, 0, last.row); 
    setDomains(copy); 
    setUndoStack(undoStack.slice(0, -1)); 
  };

  const filteredDomains = domains.filter(row => {
    if (!row.dataExpirare) return true;
    return row.dataExpirare.includes(selectedYear.toString());
  });

  const expiringCount = domains.filter(row => {
    const expStatus = checkExpiration(row.dataExpirare);
    return expStatus.isExpiring || expStatus.isExpired;
  }).length;

  return (
    <div>
      <div className={`mb-3 p-3 rounded-lg border ${isDarkTheme ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"}`}>
        <div className={`text-sm ${isDarkTheme ? "text-white/70" : "text-gray-600"}`}>
          Total domenii: <span className="font-semibold">{domains.length}</span> | 
          Afișate pentru {selectedYear}: <span className="font-semibold">{filteredDomains.length}</span>
        </div>
      </div>

      {expiringCount > 0 && (
        <div className={`mb-4 p-3 rounded-lg border-2 ${
          isDarkTheme ? "bg-red-500/10 border-red-400/30 text-red-300" : "bg-red-500/10 border-red-400/30 text-red-600"
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">🚨</span>
            <div>
              <div className="font-semibold">ATENȚIE! Servicii care expiră!</div>
              <div className="text-sm">{expiringCount} servicii expiră în următoarele 30 de zile sau au expirat deja!</div>
            </div>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className={`text-left p-2 border-b ${isDarkTheme ? "text-white/70 border-white/20" : "text-gray-600 border-black/20"}`}>Domain</th>
              <th className={`text-left p-2 border-b ${isDarkTheme ? "text-white/70 border-white/20" : "text-gray-600 border-black/20"}`}>Serviciu</th>
              <th className={`text-left p-2 border-b ${isDarkTheme ? "text-white/70 border-white/20" : "text-gray-600 border-black/20"}`}>Data Expirare</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {filteredDomains.map((row, i) => {
              const originalIndex = domains.findIndex(r => r === row);
              const expStatus = checkExpiration(row.dataExpirare);
              return (
                <tr key={originalIndex} className={`border-b ${isDarkTheme ? "border-white/10" : "border-black/10"} ${
                  expStatus.isExpired ? "bg-red-500/20" : expStatus.isExpiring ? "bg-yellow-500/20" : ""
                }`}>
                  <td className="p-2 align-top">
                    <MaieTextInput 
                      value={row.domain} 
                      onChange={(v) => setDomains(domains.map((r, idx) => idx === originalIndex ? { ...r, domain: v } : r))} 
                      isDarkTheme={isDarkTheme}
                    />
                  </td>
                  <td className="p-2 align-top">
                    <MaieTextInput 
                      value={row.serviciu} 
                      onChange={(v) => setDomains(domains.map((r, idx) => idx === originalIndex ? { ...r, serviciu: v } : r))} 
                      isDarkTheme={isDarkTheme}
                    />
                  </td>
                  <td className="p-2 align-top">
                    <input
                      type="date"
                      value={row.dataExpirare ? row.dataExpirare.split('.').reverse().join('-') : ''}
                      onChange={(e) => {
                        const dateValue = e.target.value;
                        const romanianDate = dateValue ? dateValue.split('-').reverse().join('.') : '';
                        setDomains(domains.map((r, idx) => idx === originalIndex ? { ...r, dataExpirare: romanianDate } : r));
                      }}
                      className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 transition ${
                        isDarkTheme ? "bg-white/10 border-white/20 text-white/90 focus:ring-white/30" : "bg-black/5 border-black/20 text-gray-800 focus:ring-black/30"
                      }`}
                    />
                  </td>
                  <td className="p-2 flex gap-1 items-center">
                    {expStatus.isExpired && (
                      <span className="text-red-400 text-xs" title="EXPIRAT!">❌</span>
                    )}
                    {expStatus.isExpiring && !expStatus.isExpired && (
                      <span className="text-yellow-400 text-xs" title={`Expiră în ${expStatus.daysLeft} zile!`}>⚠️</span>
                    )}
                    <MaieIconBtn title="Șterge" onClick={() => delRow(originalIndex)} isDarkTheme={isDarkTheme}>🗑️</MaieIconBtn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-3 flex gap-2 items-center">
          <MaieIconBtn title="Adaugă rând" onClick={addRow} isDarkTheme={isDarkTheme}>➕ Rând</MaieIconBtn>
          <MaieIconBtn title="Undo ștergere" onClick={undo} disabled={!undoStack.length} isDarkTheme={isDarkTheme}>↩️ Undo</MaieIconBtn>
          <MaieIconBtn title="Export CSV" onClick={() => {
            const header = ["Domain", "Serviciu", "Data Expirare"];
            const data = domains.map(r => [r.domain, r.serviciu, r.dataExpirare]);
            downloadCSV("MAIE_Domenii.csv", [header, ...data]);
          }} isDarkTheme={isDarkTheme}>⬇️ Export CSV</MaieIconBtn>
        </div>
      </div>
    </div>
  );
};

/* Componenta pentru Tab 3 - Contracte cu MULTIPLE contracte per client și X roșu pentru ștergere */
const ContractsTab3Content = ({ contracts, setContracts, isDarkTheme }) => {
  const [undoStack, setUndoStack] = useState([]);
  const fileInputRefs = useRef({});
  
  const addRow = () => setContracts([
    ...contracts,
    { client: "", contracts: [] }
  ]);
  
  const delRow = (i) => { 
    setUndoStack((s)=>[...s, { row: contracts[i], idx: i }]); 
    setContracts(contracts.filter((_, idx) => idx !== i)); 
  };
  
  const undo = () => { 
    if (!undoStack.length) return; 
    const last = undoStack[undoStack.length-1]; 
    const copy = contracts.slice(); 
    const pos = Math.min(Math.max(0, last.idx), copy.length); 
    copy.splice(pos, 0, last.row); 
    setContracts(copy); 
    setUndoStack(undoStack.slice(0, -1)); 
  };

  const handleFileUpload = (clientIndex, event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      setContracts(contracts.map((client, idx) => 
        idx === clientIndex 
          ? { ...client, contracts: [...(client.contracts || []), { name: file.name, data: base64, type: file.type }] }
          : client
      ));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const downloadContract = (contract) => {
    if (!contract.data) {
      alert("Nu există contract încărcat!");
      return;
    }
    
    const link = document.createElement('a');
    link.href = contract.data;
    link.download = contract.name || 'contract';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteContract = (clientIndex, contractIndex) => {
    setContracts(contracts.map((client, cIdx) => 
      cIdx === clientIndex 
        ? { ...client, contracts: client.contracts.filter((_, conIdx) => conIdx !== contractIndex) }
        : client
    ));
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className={`text-left p-2 border-b ${isDarkTheme ? "text-white/70 border-white/20" : "text-gray-600 border-black/20"}`}>Client</th>
            <th className={`text-left p-2 border-b ${isDarkTheme ? "text-white/70 border-white/20" : "text-gray-600 border-black/20"}`}>Contracte</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {contracts.map((client, clientIndex) => (
            <tr key={clientIndex} className={`border-b ${isDarkTheme ? "border-white/10" : "border-black/10"}`}>
              <td className="p-2 align-top">
                <MaieTextInput 
                  value={client.client} 
                  onChange={(v) => setContracts(contracts.map((r, idx) => idx === clientIndex ? { ...r, client: v } : r))} 
                  isDarkTheme={isDarkTheme}
                />
              </td>
              <td className="p-2 align-top">
                <div className="space-y-2">
                  {/* Afișează toate contractele pentru acest client */}
                  {(client.contracts || []).map((contract, contractIndex) => (
                    <div key={contractIndex} className={`flex gap-2 items-center p-2 rounded border ${isDarkTheme ? "border-white/10 bg-white/5" : "border-black/10 bg-black/5"}`}>
                      <span className={`text-xs flex-1 ${isDarkTheme ? "text-white/60" : "text-gray-500"}`}>
                        📄 {contract.name || "Contract nou"}
                      </span>
                      <MaieIconBtn 
                        title="Descarcă contract" 
                        onClick={() => downloadContract(contract)}
                        disabled={!contract.data}
                        isDarkTheme={isDarkTheme}
                      >
                        ⬇️
                      </MaieIconBtn>
                      <button
                        title="Șterge acest contract"
                        onClick={() => deleteContract(clientIndex, contractIndex)}
                        className={`w-6 h-6 rounded-full border text-xs flex items-center justify-center transition hover:scale-110 ${
                          isDarkTheme ? "bg-red-500/20 border-red-400/30 text-red-300 hover:bg-red-500/30" : "bg-red-500/20 border-red-400/30 text-red-600 hover:bg-red-500/30"
                        }`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  
                  {/* Buton pentru adăugarea unui nou contract */}
                  <div className="flex gap-2 items-center">
                    <input
                      ref={el => {
                        if (!fileInputRefs.current) fileInputRefs.current = {};
                        fileInputRefs.current[`${clientIndex}_new`] = el;
                      }}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => handleFileUpload(clientIndex, e)}
                      className="hidden"
                    />
                    <MaieIconBtn 
                      title="Adaugă contract nou pentru acest client" 
                      onClick={() => fileInputRefs.current[`${clientIndex}_new`]?.click()}
                      isDarkTheme={isDarkTheme}
                    >
                      📎 Nou Contract
                    </MaieIconBtn>
                  </div>
                </div>
              </td>
              <td className="p-2">
                <MaieIconBtn 
                  title="Șterge client complet" 
                  onClick={() => delRow(clientIndex)} 
                  isDarkTheme={isDarkTheme}
                >
                  🗑️
                </MaieIconBtn>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex gap-2 items-center">
        <MaieIconBtn title="Adaugă client nou" onClick={addRow} isDarkTheme={isDarkTheme}>➕ Client</MaieIconBtn>
        <MaieIconBtn title="Undo ștergere client" onClick={undo} disabled={!undoStack.length} isDarkTheme={isDarkTheme}>↩️ Undo</MaieIconBtn>
        <MaieIconBtn title="Export CSV" onClick={() => {
          const header = ["Client", "Numar Contracte", "Contracte"];
          const data = contracts.map(r => [r.client, (r.contracts || []).length, (r.contracts || []).map(c => c.name).join('; ')]);
          downloadCSV("MAIE_Contracte.csv", [header, ...data]);
        }} isDarkTheme={isDarkTheme}>⬇️ Export CSV</MaieIconBtn>
      </div>
    </div>
  );
};

export default MaieApp;
