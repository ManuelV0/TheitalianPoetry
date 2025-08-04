import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';

// --- COMPONENTE BOX POESIA ---
function PoesiaBox({ poesia }: { poesia: any }) {
  const [aperta, setAperta] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(poesia.audio_url || null);
  const [loadingAudio, setLoadingAudio] = useState(false);

  // Gestione robusta: parsing se serve (caso arrivasse come stringa)
  let analisiL = poesia.analisi_letteraria;
  let analisiP = poesia.analisi_psicologica;
  try {
    if (typeof analisiL === 'string') analisiL = JSON.parse(analisiL);
    if (typeof analisiP === 'string') analisiP = JSON.parse(analisiP);
  } catch {}

  // === AGGIUNTA: Generazione audio ===
  const handleGeneraAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingAudio(true);
    try {
      if (audioUrl) {
        setLoadingAudio(false);
        return;
      }
      const res = await fetch('/.netlify/functions/genera-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: poesia.content, poesia_id: poesia.id })
      });
      const json = await res.json();
      if (json.audio_url) {
        setAudioUrl(json.audio_url);
        // (UX istantanea, aggiorna anche la tabella se vuoi)
        await supabase
          .from('poesie')
          .update({ audio_url: json.audio_url, audio_generated: true })
          .eq('id', poesia.id);
      } else if (json.audioUrl) {
        setAudioUrl(json.audioUrl);
      }
    } catch (err) {
      alert('Errore nella generazione audio.');
    }
    setLoadingAudio(false);
  };

  return (
    <div
      className={`poesia-box${aperta ? ' aperta' : ''}`}
      tabIndex={0}
      onClick={() => setAperta(v => !v)}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setAperta(v => !v)}
      aria-expanded={aperta}
      role="button"
    >
      <div className="poesia-box-header">
        <div className="poesia-info">
          <h3>{poesia.title}</h3>
          <p className="autore">{poesia.author_name || "Anonimo"}</p>
        </div>
        <button
          className="expand-btn"
          style={{ userSelect: 'none' }}
          tabIndex={-1}
          onClick={e => { e.stopPropagation(); setAperta(a => !a); }}
          aria-label={aperta ? "Chiudi dettagli poesia" : "Espandi dettagli poesia"}
        >
          {aperta ? "Chiudi" : "Espandi"}
        </button>
      </div>
      {/* Preview testo */}
      {!aperta && (
        <p className="preview">{poesia.content?.slice(0, 120)}...</p>
      )}
      {/* Dettagli */}
      {aperta && (
        <div className="contenuto">
          <pre>{poesia.content}</pre>

          {/* --- PLAYER AUDIO o BOTTONE --- */}
          <div style={{ margin: '16px 0' }}>
            {audioUrl ? (
              <audio controls style={{ width: '100%' }}>
                <source src={audioUrl} type="audio/mpeg" />
                Il tuo browser non supporta l'audio.
              </audio>
            ) : (
              <button
                className="audio-btn"
                onClick={handleGeneraAudio}
                disabled={loadingAudio}
              >
                {loadingAudio ? "Generazione in corso..." : "🎙️ Genera voce AI"}
              </button>
            )}
          </div>

          <div className="analisi-wrapper">
            <section className="analisi letteraria">
              <h4>Analisi Letteraria</h4>
              {analisiL ? (
                <div>
                  {analisiL.stile_letterario && (
                    <p><b>Stile:</b> {analisiL.stile_letterario}</p>
                  )}
                  {analisiL.temi && (
                    <p><b>Temi:</b> {Array.isArray(analisiL.temi)
                      ? analisiL.temi.join(", ")
                      : analisiL.temi}
                    </p>
                  )}
                  {analisiL.struttura && (
                    <p><b>Struttura:</b> {analisiL.struttura}</p>
                  )}
                  {analisiL.riferimenti_culturali && (
                    <p><b>Riferimenti:</b> {analisiL.riferimenti_culturali}</p>
                  )}
                </div>
              ) : <i>Nessuna analisi disponibile</i>}
            </section>
            <section className="analisi psicologica">
              <h4>Analisi Psicologica</h4>
              {analisiP ? (
                <div>
                  {analisiP.emozioni && (
                    <p><b>Emozioni:</b> {Array.isArray(analisiP.emozioni)
                      ? analisiP.emozioni.join(", ")
                      : analisiP.emozioni}
                    </p>
                  )}
                  {analisiP.stato_interno && (
                    <p><b>Stato interno:</b> {analisiP.stato_interno}</p>
                  )}
                  {analisiP.visione_del_mondo && (
                    <p><b>Visione:</b> {analisiP.visione_del_mondo}</p>
                  )}
                </div>
              ) : <i>Nessuna analisi disponibile</i>}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

// --- COMPONENTE PRINCIPALE ---
export default function App() {
  const [state, setState] = useState({
    poesie: [] as any[],
    loading: true,
    error: null as string | null,
    search: ''
  });

  // Fetch poesie
  const fetchPoesie = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from('poesie')
        .select('id, title, content, author_name, analisi_letteraria, analisi_psicologica, audio_url, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setState(prev => ({ ...prev, poesie: data, loading: false, error: null }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: 'Errore nel caricamento',
        loading: false
      }));
    }
  }, []);

  useEffect(() => {
    fetchPoesie();
    const interval = setInterval(fetchPoesie, 300000); // 5 minuti
    return () => clearInterval(interval);
  }, [fetchPoesie]);

  // Ricerca
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, search: e.target.value }));
  };
  const poesieFiltrate = state.poesie.filter(p =>
    (p.title?.toLowerCase().includes(state.search.toLowerCase()) ||
      p.author_name?.toLowerCase().includes(state.search.toLowerCase()) ||
      p.content?.toLowerCase().includes(state.search.toLowerCase()))
  );

  // RENDER
  return (
    <div className="poetry-widget-app">
      <header>
        <div className="poetry-search-bar">
          <input
            type="search"
            value={state.search}
            onChange={handleSearch}
            placeholder="Cerca tra le poesie, autori o testo…"
            aria-label="Cerca poesie"
            autoFocus
            autoComplete="off"
          />
          {state.search && (
            <button
              className="search-clear-btn"
              aria-label="Pulisci ricerca"
              onClick={() => setState(prev => ({ ...prev, search: "" }))}
              tabIndex={0}
              type="button"
            >
              &times;
            </button>
          )}
        </div>
      </header>

      {/* Banner errore */}
      {state.error && (
        <div className="error-banner" role="alert">
          <span>{state.error}</span>
          <button
            onClick={fetchPoesie}
          >
            Riprova
          </button>
        </div>
      )}

      <div className="poesie-list">
        {state.loading ? (
          <div className="loader">Caricamento poesie...</div>
        ) : poesieFiltrate.length > 0 ? (
          poesieFiltrate.map(poesia => (
            <PoesiaBox key={poesia.id} poesia={poesia} />
          ))
        ) : (
          <div className="empty-state">Nessuna poesia trovata.</div>
        )}
      </div>
    </div>
  );
}
