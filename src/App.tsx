
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPlay, FaPause, FaStop, FaDownload } from 'react-icons/fa';

function isIOSorSafari() {
  if (typeof navigator === "undefined") return false;
  return /iP(ad|hone|od)/.test(navigator.userAgent) ||
    (/Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent));
}

const NETLIFY_AUDIO_FUNCTION = '/.netlify/functions/genera-audio';

const AudioPlayerWithHighlight = ({ 
  content, 
  audioUrl,
  onClose,
  onError
}: {
  content: string,
  audioUrl: string,
  onClose: () => void,
  onError: (message: string) => void
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const words = content.split(/(\s+)/).filter(word => word.trim().length > 0);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    console.log('[AudioPlayer] Initializing audio with URL:', audioUrl);
    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (!audioRef.current) return;
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration || 1;
      const newProgress = (currentTime / duration) || 0;
      setProgress(newProgress);
      const wordIndex = Math.floor(newProgress * words.length);
      setCurrentWordIndex(Math.min(wordIndex, words.length - 1));
      
      if (wordRefs.current[wordIndex]) {
        wordRefs.current[wordIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    };

    const handleError = (e: any) => {
      console.error('[AudioPlayer] Audio error:', e);
      onError(`Errore riproduzione: ${e.target.error?.message || 'sconosciuto'}`);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', () => {
      console.log('[AudioPlayer] Playback completed');
      setIsPlaying(false);
      setCurrentWordIndex(-1);
    });
    audio.addEventListener('error', handleError);

    return () => {
      console.log('[AudioPlayer] Cleanup');
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('error', handleError);
      audio.pause();
      if (audioRef.current?.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, [audioUrl, words.length, onError]);

  const togglePlayback = async () => {
    if (!audioRef.current) return;
    try {
      console.log(`[AudioPlayer] Toggling playback to ${!isPlaying}`);
      if (isPlaying) {
        await audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } catch (err) {
      console.error('[AudioPlayer] Playback error:', err);
      onError(`Impossibile avviare: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleStop = () => {
    console.log('[AudioPlayer] Stopping playback');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentWordIndex(-1);
    setProgress(0);
  };

  const handleSpeedChange = (speed: number) => {
    console.log('[AudioPlayer] Changing speed to:', speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
      setPlaybackRate(speed);
    }
  };

  return (
    <div className="audio-player-modal" ref={containerRef}>
      <div className="audio-controls">
        <button onClick={togglePlayback} className="play-button">
          {isPlaying ? <FaPause /> : <FaPlay />}
          {isPlaying ? ' Pausa' : ' Riproduci'}
        </button>
        <button onClick={handleStop} className="stop-button">
          <FaStop /> Stop
        </button>
        <div className="speed-controls">
          <span>Velocità:</span>
          {[0.5, 0.75, 1, 1.25, 1.5].map(speed => (
            <button 
              key={speed} 
              onClick={() => handleSpeedChange(speed)}
              className={`speed-button ${playbackRate === speed ? 'active' : ''}`}
            >
              {speed}x
            </button>
          ))}
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <button onClick={onClose} className="back-button">
          <FaArrowLeft /> Torna indietro
        </button>
      </div>
      <div className="content-highlight">
        {words.map((word, index) => (
          <span 
            key={index}
            ref={el => wordRefs.current[index] = el}
            className={`word ${currentWordIndex === index ? 'highlight' : ''} ${
              Math.abs(currentWordIndex - index) < 3 ? 'glow' : ''
            }`}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
};

const PoetryPage = ({ poesia, onBack }: { poesia: any, onBack: () => void }) => {
  console.log('[PoetryPage] Rendering for poem:', poesia.id, {
    hasAudio: !!poesia.audio_url,
    contentLength: poesia.content?.length
  });

  const [audioUrl, setAudioUrl] = useState(poesia.audio_url || null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);

  const parseAnalysis = (analysis: any) => {
    try {
      return typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
    } catch (e) {
      console.warn('[PoetryPage] Failed to parse analysis:', e);
      return null;
    }
  };

  const analisiL = parseAnalysis(poesia.analisi_letteraria);
  const analisiP = parseAnalysis(poesia.analisi_psicologica);

  const handleGeneraAudio = async () => {
    console.groupCollapsed('[PoetryPage] Starting audio generation for:', poesia.id);
    setLoadingAudio(true);
    setAudioError(null);
    
    try {
      if (audioUrl) {
        console.log('Audio already exists, skipping generation');
        return;
      }

      console.log('Calling Netlify Function:', NETLIFY_AUDIO_FUNCTION);
      const startTime = performance.now();
      
      const response = await fetch(NETLIFY_AUDIO_FUNCTION, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Request-ID': `poesia-${poesia.id}-${Date.now()}`
        },
        body: JSON.stringify({
          text: poesia.content,
          poesia_id: poesia.id,
          timestamp: new Date().toISOString()
        })
      });

      const responseTime = performance.now() - startTime;
      console.log(`Netlify response (${Math.round(responseTime)}ms):`, response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText.substring(0, 100)}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (!data.audio_url && !data.audioUrl) {
        throw new Error('Invalid response: missing audio URL');
      }

      const finalUrl = data.audio_url || data.audioUrl;
      console.log('Received audio URL:', finalUrl);

      setAudioUrl(finalUrl);
      console.log('Updating Supabase record...');
      
      const { error } = await supabase
        .from('poesie')
        .update({ 
          audio_url: finalUrl, 
          audio_generated: true,
          audio_generated_at: new Date().toISOString()
        })
        .eq('id', poesia.id);

      if (error) {
        console.error('Supabase update error:', error);
      } else {
        console.log('Supabase updated successfully');
      }
    } catch (err) {
      console.error('Generation failed:', err);
      setAudioError(err instanceof Error ? err.message : 'Errore generazione audio');
    } finally {
      console.groupEnd();
      setLoadingAudio(false);
    }
  };

  const fetchAudioAsBlob = useCallback(async (url: string) => {
    console.group('[PoetryPage] Fetching audio blob for iOS');
    setLoadingAudio(true);
    setAudioError(null);
    
    try {
      console.log('Fetching URL:', url);
      const timestampedUrl = `${url}?ts=${Date.now()}`;
      const response = await fetch(timestampedUrl, {
        cache: 'no-store',
        mode: 'cors',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      if (!contentType?.includes('audio/')) {
        throw new Error(`Expected audio, got ${contentType}`);
      }

      const blob = await response.blob();
      console.log('Blob size:', blob.size, 'bytes');
      
      if (blob.size === 0) {
        throw new Error('Empty audio blob');
      }

      const blobUrl = URL.createObjectURL(blob);
      console.log('Created blob URL');
      setAudioBlobUrl(blobUrl);
    } catch (err) {
      console.error('Blob fetch failed:', err);
      setAudioError('Errore caricamento audio');
    } finally {
      console.groupEnd();
      setLoadingAudio(false);
    }
  }, []);

  useEffect(() => {
    if (!audioUrl || !isIOSorSafari() || audioBlobUrl) return;
    
    console.log('iOS detected, starting blob fetch');
    fetchAudioAsBlob(audioUrl);
    
    return () => {
      if (audioBlobUrl) {
        console.log('Cleaning up blob URL');
        URL.revokeObjectURL(audioBlobUrl);
      }
    };
  }, [audioUrl, audioBlobUrl, fetchAudioAsBlob]);

  return (
    <div className="poetry-page">
      <button onClick={onBack} className="back-button">
        <FaArrowLeft /> Torna all'elenco
      </button>
      <div className="poetry-header">
        <h1>{poesia.title}</h1>
        <p className="author">{poesia.author_name || "Anonimo"}</p>
      </div>
      {showAudioPlayer && audioUrl ? (
        <AudioPlayerWithHighlight 
          content={poesia.content} 
          audioUrl={isIOSorSafari() && audioBlobUrl ? audioBlobUrl : audioUrl}
          onClose={() => setShowAudioPlayer(false)}
          onError={setAudioError}
        />
      ) : (
        <div className="poetry-content">
          <div className="poetry-text">
            <pre>{poesia.content}</pre>
          </div>
          <div className="audio-section">
            {audioUrl ? (
              <div className="audio-options">
                <button 
                  onClick={() => setShowAudioPlayer(true)}
                  className="listen-button"
                >
                  <FaPlay /> Ascolta con highlight
                </button>
                <a
                  href={audioUrl}
                  download={`${poesia.title.replace(/ /g, '_')}.mp3`}
                  className="audio-download-link"
                >
                  <FaDownload /> Scarica audio
                </a>
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
            {audioError && (
              <div className="audio-error">
                {audioError}
                <button 
                  onClick={() => setAudioError(null)}
                  aria-label="Chiudi messaggio di errore"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          <div className="analysis-sections">
            <section className="analysis-section">
              <h2>Analisi Letteraria</h2>
              {analisiL ? (
                <div>
                  {analisiL.stile_letterario && <p><b>Stile:</b> {analisiL.stile_letterario}</p>}
                  {analisiL.temi && <p><b>Temi:</b> {Array.isArray(analisiL.temi) ? analisiL.temi.join(", ") : analisiL.temi}</p>}
                  {analisiL.struttura && <p><b>Struttura:</b> {analisiL.struttura}</p>}
                  {analisiL.riferimenti_culturali && <p><b>Riferimenti:</b> {analisiL.riferimenti_culturali}</p>}
                </div>
              ) : <p className="no-analysis">Nessuna analisi disponibile</p>}
            </section>
            <section className="analysis-section">
              <h2>Analisi Psicologica</h2>
              {analisiP ? (
                <div>
                  {analisiP.emozioni && <p><b>Emozioni:</b> {Array.isArray(analisiP.emozioni) ? analisiP.emozioni.join(", ") : analisiP.emozioni}</p>}
                  {analisiP.stato_interno && <p><b>Stato interno:</b> {analisiP.stato_interno}</p>}
                  {analisiP.visione_del_mondo && <p><b>Visione:</b> {analisiP.visione_del_mondo}</p>}
                </div>
              ) : <p className="no-analysis">Nessuna analisi disponibile</p>}
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  console.log('[App] Initial render');
  const [state, setState] = useState({
    poesie: [] as any[],
    loading: true,
    error: null as string | null,
    search: '',
    selectedPoesia: null as any | null
  });

  const fetchPoesie = useCallback(async () => {
    console.group('[App] Fetching poems');
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('Querying Supabase...');
      const { data, error } = await supabase
        .from('poesie')
        .select('id, title, content, author_name, analisi_letteraria, analisi_psicologica, audio_url, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log(`Received ${data?.length || 0} poems`);
      setState(prev => ({ ...prev, poesie: data || [], loading: false }));
    } catch (err) {
      console.error('Fetch error:', err);
      setState(prev => ({
        ...prev,
        error: 'Errore nel caricamento',
        loading: false,
        poesie: prev.poesie.length > 0 ? prev.poesie : []
      }));
    } finally {
      console.groupEnd();
    }
  }, []);

  useEffect(() => {
    console.log('[App] Component mounted, initial fetch');
    fetchPoesie();
    
    const interval = setInterval(() => {
      console.log('[App] Periodic refresh');
      fetchPoesie();
    }, 300000);
    
    return () => {
      console.log('[App] Component unmounted');
      clearInterval(interval);
    };
  }, [fetchPoesie]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    console.log('[App] Search query:', query);
    setState(prev => ({ ...prev, search: query }));
  };

  const handleSelectPoesia = (poesia: any) => {
    console.log('[App] Selected poem:', poesia.id);
    setState(prev => ({ ...prev, selectedPoesia: poesia }));
  };

  const handleBackToList = () => {
    console.log('[App] Returning to list');
    setState(prev => ({ ...prev, selectedPoesia: null }));
  };

  const poesieFiltrate = state.poesie.filter(p =>
    p.title?.toLowerCase().includes(state.search.toLowerCase()) ||
    p.author_name?.toLowerCase().includes(state.search.toLowerCase()) ||
    p.content?.toLowerCase().includes(state.search.toLowerCase())
  );

  console.log('[App] Filtered poems count:', poesieFiltrate.length);

  return (
    <div className="app-container">
      {state.selectedPoesia ? (
        <PoetryPage 
          poesia={state.selectedPoesia} 
          onBack={handleBackToList}
        />
      ) : (
        <>
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
                  onClick={() => {
                    console.log('[App] Clearing search');
                    setState(prev => ({ ...prev, search: "" }));
                  }}
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
              <button onClick={() => {
                console.log('[App] Retrying fetch after error');
                fetchPoesie();
              }}>
                Riprova
              </button>
            </div>
          )}
          <main className="poesie-list">
            {state.loading ? (
              <div className="loader">Caricamento...</div>
            ) : poesieFiltrate.length > 0 ? (
              poesieFiltrate.map(poesia => (
                <div 
                  key={poesia.id} 
                  className="poesia-card"
                  onClick={() => handleSelectPoesia(poesia)}
                >
                  <h3>{poesia.title}</h3>
                  <p className="author">{poesia.author_name || "Anonimo"}</p>
                  <p className="preview">{poesia.content?.slice(0, 120)}...</p>
                  {poesia.audio_url && (
                    <span className="audio-badge">🎧 Audio disponibile</span>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-state">
                {state.search ? "Nessun risultato" : "Nessuna poesia trovata"}
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
};

export default App;
