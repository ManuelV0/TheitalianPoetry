import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPlay, FaPause, FaStop, FaDownload } from 'react-icons/fa';

const AUDIO_API_URL = 'https://poetry.theitalianpoetryproject.com/.netlify/functions/genera-audio';

function isIOSorSafari() {
  if (typeof navigator === "undefined") return false;
  return /iP(ad|hone|od)/.test(navigator.userAgent) ||
    (/Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent));
}

const AudioPlayerWithHighlight = ({ 
  content, 
  audioUrl,
  onClose,
  onError
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef(null);
  const words = content.split(/(\s+)/).filter(word => word.trim().length > 0);
  const wordRefs = useRef([]);
  const containerRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (!audioRef.current) return;
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      const newProgress = currentTime / duration;
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

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentWordIndex(-1);
    });
    audio.addEventListener('error', () => {
      onError('Errore durante la riproduzione');
      setIsPlaying(false);
    });

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.pause();
    };
  }, [audioUrl, words.length, onError]);

  const togglePlayback = async () => {
    if (!audioRef.current) return;
    try {
      if (isPlaying) {
        await audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } catch (err) {
      console.error('Playback error:', err);
      onError('Impossibile avviare la riproduzione');
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentWordIndex(-1);
    setProgress(0);
  };

  const handleSpeedChange = (speed) => {
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

// --- POETRY PAGE COMPONENT ---
const PoetryPage = ({ poesia, onBack }) => {
  const [audioUrl, setAudioUrl] = useState(poesia.audio_url || null);
  const [audioBlobUrl, setAudioBlobUrl] = useState(null);
  const [audioStatus, setAudioStatus] = useState(poesia.audio_url ? 'generato' : 'non_generato');
  const [audioError, setAudioError] = useState(null);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);

  // Parsing delle analisi
  const parseAnalysis = (analysis) => {
    try {
      return typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
    } catch {
      return null;
    }
  };

  const analisiL = parseAnalysis(poesia.analisi_letteraria);
  const analisiP = parseAnalysis(poesia.analisi_psicologica);

  // Generazione automatica audio SE NECESSARIO
  useEffect(() => {
    if (!audioUrl && audioStatus !== 'in_corso') {
      setAudioStatus('in_corso');
      fetch(AUDIO_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: poesia.content,
          poesia_id: poesia.id
        })
      })
      .then(res => res.json())
      .then(async json => {
        const newAudioUrl = json.audio_url || json.audioUrl;
        if (newAudioUrl) {
          setAudioUrl(newAudioUrl);
          setAudioStatus('generato');
          await supabase
            .from('poesie')
            .update({ audio_url: newAudioUrl, audio_generated: true })
            .eq('id', poesia.id);
        } else {
          setAudioStatus('non_generato');
          setAudioError('Errore nella generazione audio');
        }
      })
      .catch(() => {
        setAudioStatus('non_generato');
        setAudioError('Errore nella generazione audio');
      });
    }
  }, [audioUrl, audioStatus, poesia]);

  // Fetch blob per iOS
  const fetchAudioAsBlob = useCallback(async (url) => {
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
      setAudioError('Errore nel caricamento audio');
    }
  }, []);

  useEffect(() => {
    if (!audioUrl || !isIOSorSafari() || audioBlobUrl) return;
    fetchAudioAsBlob(audioUrl);
    return () => {
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    };
  }, [audioUrl, audioBlobUrl, fetchAudioAsBlob]);

  // Stato audio testuale
  let statoTesto = "Non generato";
  if (audioStatus === "in_corso") statoTesto = "Generazione in corso...";
  if (audioStatus === "generato") statoTesto = "Audio generato";

  return (
    <div className="poetry-page">
      <button onClick={onBack} className="back-button">
        <FaArrowLeft /> Torna all'elenco
      </button>
      <div className="poetry-header">
        <h1>{poesia.title}</h1>
        <p className="author">{poesia.author_name || "Anonimo"}</p>
      </div>
      <div className="poetry-content">
        <div className="poetry-text">
          <pre>{poesia.content}</pre>
        </div>
        <div className="audio-section">
          <div className="audio-status">{statoTesto}</div>
          {audioStatus === "generato" && audioUrl && (
            <div className="audio-options">
              <button 
                onClick={() => setShowAudioPlayer(true)}
                className="listen-button"
              >
                <FaPlay /> Ascolta con highlight
              </button>
              <a
                href={audioUrl}
                download
                className="audio-download-link"
              >
                <FaDownload /> Scarica audio
              </a>
            </div>
          )}
          {audioError && (
            <div className="audio-error">{audioError}</div>
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
      {showAudioPlayer && audioUrl && (
        <AudioPlayerWithHighlight 
          content={poesia.content} 
          audioUrl={isIOSorSafari() && audioBlobUrl ? audioBlobUrl : audioUrl}
          onClose={() => setShowAudioPlayer(false)}
          onError={setAudioError}
        />
      )}
    </div>
  );
};

const App = () => {
  const [state, setState] = useState({
    poesie: [],
    loading: true,
    error: null,
    search: '',
    selectedPoesia: null
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

  const handleSearch = (e) => {
    setState(prev => ({ ...prev, search: e.target.value }));
  };

  const handleSelectPoesia = (poesia) => {
    setState(prev => ({ ...prev, selectedPoesia: poesia }));
  };

  const handleBackToList = () => {
    setState(prev => ({ ...prev, selectedPoesia: null }));
  };

  const poesieFiltrate = state.poesie.filter(p =>
    p.title?.toLowerCase().includes(state.search.toLowerCase()) ||
    p.author_name?.toLowerCase().includes(state.search.toLowerCase()) ||
    p.content?.toLowerCase().includes(state.search.toLowerCase())
  );

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
                <div 
                  key={poesia.id} 
                  className="poesia-card"
                  onClick={() => handleSelectPoesia(poesia)}
                >
                  <h3>{poesia.title}</h3>
                  <p className="author">{poesia.author_name || "Anonimo"}</p>
                  <p className="preview">{poesia.content?.slice(0, 120)}...</p>
                </div>
              ))
            ) : (
              <div className="empty-state">Nessuna poesia trovata</div>
            )}
          </main>
        </>
      )}
    </div>
  );
};

export default App;
