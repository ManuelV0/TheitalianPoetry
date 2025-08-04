import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';

// --- IMPROVED SAFARI/iOS DETECTION ---
function isIOSorSafari() {
  if (typeof navigator === "undefined") return false;
  return /iP(ad|hone|od)/.test(navigator.userAgent) ||
    (/Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent));
}

// --- POETRY BOX COMPONENT ---
const PoesiaBox = ({ poesia }: { poesia: any }) => {
  const [aperta, setAperta] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(poesia.audio_url || null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Robust analysis parsing
  const parseAnalysis = (analysis: any) => {
    try {
      return typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
    } catch {
      return null;
    }
  };

  const analisiL = parseAnalysis(poesia.analisi_letteraria);
  const analisiP = parseAnalysis(poesia.analisi_psicologica);

  // --- AUDIO GENERATION HANDLER ---
  const handleGeneraAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingAudio(true);
    setAudioError(null);
    try {
      if (audioUrl) return;
      
      const res = await fetch('/.netlify/functions/genera-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: poesia.content,
          poesia_id: poesia.id
        })
      });
      
      const json = await res.json();
      const newAudioUrl = json.audio_url || json.audioUrl;
      if (newAudioUrl) {
        setAudioUrl(newAudioUrl);
        await supabase
          .from('poesie')
          .update({ audio_url: newAudioUrl, audio_generated: true })
          .eq('id', poesia.id);
      }
    } catch (err) {
      setAudioError('Errore nella generazione audio');
    } finally {
      setLoadingAudio(false);
    }
  };

  // --- BLOB FETCH FOR iOS ---
  const fetchAudioAsBlob = useCallback(async (url: string) => {
    setLoadingAudio(true);
    setAudioError(null);
    try {
      const res = await fetch(`${url}?ts=${Date.now()}`, {
        cache: 'no-store',
        mode: 'cors'
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const contentType = res.headers.get('content-type');
      if (!contentType?.includes('audio/')) {
        throw new Error(`Invalid MIME type: ${contentType}`);
      }

      const blob = await res.blob();
      setAudioBlobUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error('Audio fetch error:', err);
      setAudioError('Errore nel caricamento audio');
    } finally {
      setLoadingAudio(false);
    }
  }, []);

  // --- iOS AUDIO MANAGEMENT ---
  useEffect(() => {
    if (!aperta || !audioUrl || !isIOSorSafari() || audioBlobUrl) return;

    const controller = new AbortController();
    fetchAudioAsBlob(audioUrl);

    return () => {
      controller.abort();
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    };
  }, [aperta, audioUrl, audioBlobUrl, fetchAudioAsBlob]);

  // --- FORCED PLAY FOR iOS ---
  const handlePlayForced = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioUrl) return;

    try {
      if (isIOSorSafari() && !audioBlobUrl) {
        await fetchAudioAsBlob(audioUrl);
      }

      const audio = new Audio(audioBlobUrl || audioUrl);
      audio.preload = 'none';
      audio.playsInline = true;
      await audio.play();
    } catch (err) {
      console.error('Playback failed:', err);
      setAudioError('Riproduzione fallita. Tocca di nuovo.');
    }
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
          tabIndex={-1}
          onClick={e => { e.stopPropagation(); setAperta(a => !a); }}
          aria-label={aperta ? "Chiudi dettagli poesia" : "Espandi dettagli poesia"}
        >
          {aperta ? "Chiudi" : "Espandi"}
        </button>
      </div>
      
      {!aperta ? (
        <p className="preview">{poesia.content?.slice(0, 120)}...</p>
      ) : (
        <div className="contenuto">
          <pre>{poesia.content}</pre>

          {/* AUDIO SECTION */}
          <div className="audio-section">
            {audioUrl ? (
              <>
                <div className="audio-player-container">
                  <audio
                    controls
                    src={isIOSorSafari() && audioBlobUrl ? audioBlobUrl : audioUrl}
                    key={`${audioUrl}-${audioBlobUrl ? 'blob' : 'direct'}`}
                    preload="none"
                    playsInline
                    onPlay={(e) => {
                      if (isIOSorSafari() && e.target.paused) {
                        e.target.play().catch(console.error);
                      }
                    }}
                    onError={(e) => {
                      console.error("Audio error:", e.target.error);
                      setAudioError("Errore di riproduzione");
                    }}
                  />
                  
                  {isIOSorSafari() && (
                    <button 
                      onClick={handlePlayForced}
                      className="ios-play-button"
                      disabled={loadingAudio}
                    >
                      {loadingAudio ? 'Caricamento...' : 'Riproduci'}
                    </button>
                  )}
                </div>

                <div className="audio-links">
                  <a
                    href={audioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="audio-download-link"
                  >
                    Scarica audio
                  </a>
                  {audioError && (
                    <div className="audio-error">{audioError}</div>
                  )}
                </div>
              </>
            ) : (
              <button
                className="generate-audio-btn"
                onClick={handleGeneraAudio}
                disabled={loadingAudio}
              >
                {loadingAudio ? "Generazione..." : "🎙️ Genera audio"}
              </button>
            )}
          </div>

          {/* ANALYSIS SECTIONS */}
          <div className="analisi-container">
            <section className="analisi-section">
              <h4>Analisi Letteraria</h4>
              {analisiL ? (
                <div>
                  {analisiL.stile_letterario && <p><b>Stile:</b> {analisiL.stile_letterario}</p>}
                  {analisiL.temi && <p><b>Temi:</b> {Array.isArray(analisiL.temi) ? analisiL.temi.join(", ") : analisiL.temi}</p>}
                  {analisiL.struttura && <p><b>Struttura:</b> {analisiL.struttura}</p>}
                  {analisiL.riferimenti_culturali && <p><b>Riferimenti:</b> {analisiL.riferimenti_culturali}</p>}
                </div>
              ) : <i>Nessuna analisi disponibile</i>}
            </section>

            <section className="analisi-section">
              <h4>Analisi Psicologica</h4>
              {analisiP ? (
                <div>
                  {analisiP.emozioni && <p><b>Emozioni:</b> {Array.isArray(analisiP.emozioni) ? analisiP.emozioni.join(", ") : analisiP.emozioni}</p>}
                  {analisiP.stato_interno && <p><b>Stato interno:</b> {analisiP.stato_interno}</p>}
                  {analisiP.visione_del_mondo && <p><b>Visione:</b> {analisiP.visione_del_mondo}</p>}
                </div>
              ) : <i>Nessuna analisi disponibile</i>}
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN APP COMPONENT ---
const App = () => {
  const [state, setState] = useState({
    poesie: [] as any[],
    loading: true,
    error: null as string | null,
    search: ''
  });

  const fetchPoesie = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from('poesie')
        .select('id, title, content, author_name, analisi_letteraria, analisi_psicologica, audio_url, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setState(prev => ({ ...prev, poesie: data || [], loading: false }));
    } catch (err) {
      setState(prev => ({ ...prev, error: 'Errore nel caricamento', loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchPoesie();
    const interval = setInterval(fetchPoesie, 300000);
    return () => clearInterval(interval);
  }, [fetchPoesie]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, search: e.target.value }));
  };

  const poesieFiltrate = state.poesie.filter(p =>
    p.title?.toLowerCase().includes(state.search.toLowerCase()) ||
    p.author_name?.toLowerCase().includes(state.search.toLowerCase()) ||
    p.content?.toLowerCase().includes(state.search.toLowerCase())
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="search-bar">
          <input
            type="search"
            value={state.search}
            onChange={handleSearch}
            placeholder="Cerca poesie..."
            aria-label="Cerca poesie"
          />
          {state.search && (
            <button
              className="clear-search"
              onClick={() => setState(prev => ({ ...prev, search: "" }))}
              aria-label="Pulisci ricerca"
            >
              ×
            </button>
          )}
        </div>
      </header>

      {state.error && (
        <div className="error-message">
          {state.error}
          <button onClick={fetchPoesie}>Riprova</button>
        </div>
      )}

      <main className="poesie-list">
        {state.loading ? (
          <div className="loader">Caricamento...</div>
        ) : poesieFiltrate.length > 0 ? (
          poesieFiltrate.map(poesia => (
            <PoesiaBox key={poesia.id} poesia={poesia} />
          ))
        ) : (
          <div className="empty-state">Nessuna poesia trovata</div>
        )}
      </main>
    </div>
  );
};

export default App;
