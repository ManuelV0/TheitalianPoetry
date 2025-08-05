import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './lib/supabaseClient';

// --- IMPROVED SAFARI/iOS DETECTION ---
function isIOSorSafari() {
  if (typeof navigator === "undefined") return false;
  return /iP(ad|hone|od)/.test(navigator.userAgent) ||
    (/Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent));
}

// --- AUDIO BUTTON COMPONENT ---
const AudioButtonPlayer = ({ 
  url, 
  blobUrl,
  loading,
  onError
}: {
  url: string,
  blobUrl: string | null,
  loading: boolean,
  onError: (message: string) => void
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Inizializza l'elemento audio
  const initAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(blobUrl || url);
      audioRef.current.preload = 'none';
      audioRef.current.addEventListener('ended', () => setIsPlaying(false));
      audioRef.current.addEventListener('error', () => {
        onError('Errore durante la riproduzione');
        setIsPlaying(false);
      });
    }
    return audioRef.current;
  };

  const togglePlayback = async () => {
    if (loading) return;
    
    const audio = initAudio();
    
    try {
      if (isPlaying) {
        await audio.pause();
      } else {
        await audio.play();
      }
      setIsPlaying(!isPlaying);
    } catch (err) {
      console.error('Playback error:', err);
      onError('Impossibile riprodurre. Tocca di nuovo.');
      
      // Fallback per iOS: apri in nuova scheda
      if (isIOSorSafari()) {
        window.open(blobUrl || url, '_blank');
      }
    }
  };

  return (
    <button
      onClick={togglePlayback}
      className={`custom-audio-button ${isPlaying ? 'playing' : ''}`}
      disabled={loading}
      aria-label={isPlaying ? 'Pausa audio' : 'Riproduci audio'}
    >
      {loading ? '⌛ Caricamento...' : isPlaying ? '⏸ Pausa' : '▶️ Riproduci'}
    </button>
  );
};

// --- POETRY BOX COMPONENT ---
const PoesiaBox = ({ poesia }: { poesia: any }) => {
  const [aperta, setAperta] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(poesia.audio_url || null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Parsing delle analisi
  const parseAnalysis = (analysis: any) => {
    try {
      return typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
    } catch {
      return null;
    }
  };

  const analisiL = parseAnalysis(poesia.analisi_letteraria);
  const analisiP = parseAnalysis(poesia.analisi_psicologica);

  // Generazione audio
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

  // Fetch blob per iOS
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

  // Gestione audio per iOS
  useEffect(() => {
    if (!aperta || !audioUrl || !isIOSorSafari() || audioBlobUrl) return;

    fetchAudioAsBlob(audioUrl);
    
    return () => {
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    };
  }, [aperta, audioUrl, audioBlobUrl, fetchAudioAsBlob]);

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

          {/* SEZIONE AUDIO SEMPLIFICATA */}
          <div className="audio-section">
            {audioUrl ? (
              <div className="audio-button-container">
                <AudioButtonPlayer 
                  url={audioUrl} 
                  blobUrl={audioBlobUrl}
                  loading={loadingAudio}
                  onError={setAudioError}
                />
                
                <a
                  href={audioUrl}
                  download
                  className="audio-download-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  Scarica audio
                </a>
                
                {audioError && (
                  <div className="audio-error">{audioError}</div>
                )}
              </div>
            ) : (
              <button
                className="generate-audio-btn"
                onClick={handleGeneraAudio}
                disabled={loadingAudio}
              >
                {loadingAudio ? "Generazione in corso..." : "🎙️ Genera voce AI"}
              </button>
            )}
          </div>

          {/* SEZIONI ANALISI */}
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
