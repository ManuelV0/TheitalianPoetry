import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';

// --- CONFIG ENDPOINTS ---
const BACKEND_BASE = 'https://poetri-backend.netlify.app/.netlify/functions';
const AUDIO_API_URL = 'https://poetry.theitalianpoetryproject.com/.netlify/functions/genera-audio';

const LSTM_SERVER_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:8888'
  : 'https://tuo-lstm-server.com';

const BACKEND_ENDPOINTS = {
  FORZA_ANALISI: `${BACKEND_BASE}/forza-analisi`,
  AGGIORNA_JOURNAL: `${BACKEND_BASE}/aggiorna-journal`,
  REBUILD_JOURNAL: `${BACKEND_BASE}/rebuild-journal`,
  MATCH_POETICO: `${LSTM_SERVER_URL}/api/match-poetico`,
};

// --- UTILS ---
function isIOSorSafari() {
  if (typeof navigator === "undefined") return false;
  return /iP(ad|hone|od)/.test(navigator.userAgent) ||
    (/Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent));
}

const isNonEmptyObject = (v: any) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0;

function SafeList({ items }: { items?: any[] }) {
  if (!Array.isArray(items) || items.length === 0) return <p className="text-gray-500 italic">N/A</p>;
  return (
    <ul className="list-disc list-inside ml-6">
      {items.map((x, i) => <li key={i}>{typeof x === 'object' ? JSON.stringify(x) : String(x)}</li>)}
    </ul>
  );
}

function CitazioniList({ items }: { items?: string[] }) {
  if (!Array.isArray(items) || items.length === 0) return <p className="text-gray-500 italic">Nessuna citazione</p>;
  return (
    <ul className="list-disc list-inside ml-6">
      {items.map((c, i) => <li key={i}><span className="block whitespace-pre-wrap">«{c}»</span></li>)}
    </ul>
  );
}

function KeyValueBlock({ data }: { data?: any }) {
  if (!isNonEmptyObject(data)) return null;
  return (
    <div className="grid gap-2">
      {Object.entries<any>(data).map(([k, v]) => (
        <div key={k}>
          <p className="font-semibold capitalize">{k.replaceAll('_', ' ')}</p>
          {typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? (
            <p className="text-slate-800 whitespace-pre-wrap">{String(v)}</p>
          ) : Array.isArray(v) ? (
            <SafeList items={v} />
          ) : isNonEmptyObject(v) ? (
            <pre className="bg-slate-50 p-2 rounded border text-sm whitespace-pre-wrap break-words">
              {JSON.stringify(v, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-500 italic">N/A</p>
          )}
        </div>
      ))}
    </div>
  );
}

// --- COMPONENTE MATCH POETICO LSTM ---
const MatchPoeticoLSTM = ({ poesia, onPoesiaSelect }: { 
  poesia: any, 
  onPoesiaSelect: (poesia: any) => void 
}) => {
  const [matchResult, setMatchResult] = useState<any>(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const cercaMatchPoetico = async () => {
    setCaricamento(true);
    setErrore(null);
    try {
      const response = await fetch(BACKEND_ENDPOINTS.MATCH_POETICO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          testo: poesia.content,
          poesia_id: poesia.id,
          limite: 5
        })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const risultato = await response.json();
      setMatchResult(risultato);
    } catch (error) {
      setErrore('Impossibile connettersi al servizio di match poetico');
    } finally {
      setCaricamento(false);
    }
  };

  return (
    <div className="match-lstm-section">
      <h3>🔍 Match Poetico con LSTM</h3>
      <button onClick={cercaMatchPoetico} disabled={caricamento} className="match-button">
        {caricamento ? 'Analizzando con LSTM...' : 'Trova poesie simili'}
      </button>
      {errore && <div className="error-message">{errore}</div>}
      {matchResult && (
        <div className="match-results">
          <h4>Poesie correlate:</h4>
          {matchResult.poesie_correlate?.map((poesiaMatch: any, index: number) => (
            <div 
              key={index} 
              className="match-item"
              onClick={() => onPoesiaSelect(poesiaMatch)}
            >
              <div className="match-score">Similarità: {(poesiaMatch.score * 100).toFixed(1)}%</div>
              <div className="match-title">{poesiaMatch.title}</div>
              <div className="match-author">{poesiaMatch.author_name}</div>
              <div className="match-preview">{poesiaMatch.content?.slice(0, 100)}...</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- AUDIO PLAYER CON HIGHLIGHT (SENZA ICONE) ---
const AudioPlayerWithHighlight = ({
  content,
  audioUrl,
  onClose,
  onError
}: {
  content: string;
  audioUrl: string;
  onClose: () => void;
  onError: (msg: string) => void;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const words = content.split(/(\s+)/).filter(word => word.trim().length > 0);
  const wordRefs = useRef<HTMLSpanElement[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastScrolledIndex = useRef(-1);
  const scrollCooldown = useRef(false);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (!audioRef.current) return;
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration || 1;
      const newProgress = currentTime / duration;
      setProgress(newProgress);

      const wordIndex = Math.floor(newProgress * words.length);
      setCurrentWordIndex(Math.min(wordIndex, words.length - 1));

      if (wordRefs.current[wordIndex] && wordIndex !== lastScrolledIndex.current && !scrollCooldown.current) {
        scrollCooldown.current = true;
        lastScrolledIndex.current = wordIndex;
        wordRefs.current[wordIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => { scrollCooldown.current = false; }, 300);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentWordIndex(-1);
    };

    const handleError = () => {
      onError('Errore durante la riproduzione');
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
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

  const handleSpeedChange = (speed: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
      setPlaybackRate(speed);
    }
  };

  return (
    <div className="audio-player-modal" ref={containerRef}>
      <div className="audio-controls">
        <button onClick={togglePlayback} className="play-button">
          {isPlaying ? '⏸ Pausa' : '▶ Riproduci'}
        </button>
        <button onClick={handleStop} className="stop-button">⏹ Stop</button>
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
          <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <button onClick={onClose} className="back-button">← Torna indietro</button>
      </div>
      <div className="content-highlight">
        {words.map((word, index) => (
          <span
            key={index}
            ref={el => { if (el) wordRefs.current[index] = el; }}
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

// --- PAGINA SINGOLA POESIA ---
const PoetryPage = ({ poesia, onBack }: { poesia: any; onBack: () => void }) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(poesia.audio_url || null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioStatus, setAudioStatus] = useState<'non_generato'|'in_corso'|'generato'>(poesia.audio_url ? 'generato' : 'non_generato');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [generandoAnalisi, setGenerandoAnalisi] = useState(false);
  const [analisiStatus, setAnalisiStatus] = useState<'non_generata'|'in_corso'|'generata'>(
    poesia.analisi_psicologica ? 'generata' : 'non_generata'
  );

  const parseJSON = (x: any) => {
    try { return typeof x === 'string' ? JSON.parse(x) : x; } catch { return null; }
  };
  const analisiPsico = parseJSON(poesia.analisi_psicologica);
  const analisiLett = parseJSON(poesia.analisi_letteraria);

  const generaAnalisiPsicologica = async () => {
    setGenerandoAnalisi(true);
    setAnalisiStatus('in_corso');
    try {
      const response = await fetch(BACKEND_ENDPOINTS.FORZA_ANALISI, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poem_id: poesia.id,
          author_id: poesia.user_id || poesia.author_id,
          title: poesia.title,
          content: poesia.content
        })
      });
      
      const risultato = await response.json();
      if (risultato.ok) {
        setAnalisiStatus('generata');
        setTimeout(() => { window.location.reload(); }, 1500);
      } else {
        setAudioError(risultato.error || 'Errore nella generazione analisi');
        setAnalisiStatus('non_generata');
      }
    } catch (error) {
      setAudioError('Errore di connessione con il backend');
      setAnalisiStatus('non_generata');
    } finally {
      setGenerandoAnalisi(false);
    }
  };

  useEffect(() => {
    if (audioStatus === 'in_corso' && generationStartTime === null) {
      const start = Date.now();
      setGenerationStartTime(start);
      const timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - start) / 1000);
        const remaining = Math.max(0, 120 - elapsed);
        setTimeRemaining(remaining);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [audioStatus, generationStartTime]);

  useEffect(() => {
    if (!audioUrl && audioStatus !== 'in_corso') {
      setAudioStatus('in_corso');
      fetch(AUDIO_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: poesia.content, poesia_id: poesia.id })
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

  const fetchAudioAsBlob = useCallback(async (url: string) => {
    setAudioError(null);
    try {
      const res = await fetch(`${url}?ts=${Date.now()}`, { cache: 'no-store', mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

  let statoTesto = 'Non generato';
  if (audioStatus === 'in_corso') {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    statoTesto = `Generazione in corso... (circa ${minutes}m ${seconds}s rimanenti)`;
  }
  if (audioStatus === 'generato') statoTesto = 'Audio generato';

  const renderAnalisiPsicoDettagliata = () => {
    const a = analisiPsico || {};
    const hasDetailed = Array.isArray(a?.fallacie_logiche) || Array.isArray(a?.bias_cognitivi) || 
                      Array.isArray(a?.meccanismi_di_difesa) || Array.isArray(a?.schemi_autosabotanti);
    if (!hasDetailed) return null;

    const renderNamedList = (arr?: any[]) => {
      if (!Array.isArray(arr) || arr.length === 0) return <p className="text-gray-500 italic">N/A</p>;
      return (
        <ul className="list-disc list-inside ml-6">
          {arr.map((it, i) => {
            if (isNonEmptyObject(it) && (it.nome || it.evidenze)) {
              return (
                <li key={i}>
                  <span className="font-medium">{it.nome || 'Voce'}</span>
                  {Array.isArray(it.evidenze) && it.evidenze.length > 0 && (
                    <ul className="list-disc list-inside ml-6 mt-1">
                      {it.evidenze.map((ev: any, j: number) => (
                        <li key={j} className="whitespace-pre-wrap">{String(ev)}</li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }
            return <li key={i}><code className="whitespace-pre-wrap break-words">{JSON.stringify(it)}</code></li>;
          })}
        </ul>
      );
    };

    return (
      <>
        <section className="analysis-section"><h2>Analisi Psicologica – Fallacie Logiche</h2><SafeList items={a?.fallacie_logiche} /></section>
        <section className="analysis-section"><h2>Analisi Psicologica – Bias Cognitivi</h2><SafeList items={a?.bias_cognitivi} /></section>
        <section className="analysis-section"><h2>Analisi Psicologica – Meccanismi di Difesa</h2>{renderNamedList(a?.meccanismi_di_difesa)}</section>
        <section className="analysis-section"><h2>Analisi Psicologica – Schemi Autosabotanti</h2><SafeList items={a?.schemi_autosabotanti} /></section>
      </>
    );
  };

  const renderAnalisiFuturista = () => {
    const a = analisiPsico || {};
    const hasFuturista = Array.isArray(a?.vettori_di_cambiamento_attuali) || a?.scenario_ottimistico || 
                        a?.scenario_pessimistico || a?.fattori_inattesi || a?.dossier_strategico_oggi;
    if (!hasFuturista) return null;

    return (
      <>
        <section className="analysis-section"><h2>Vettori di Cambiamento Attuali</h2><SafeList items={a?.vettori_di_cambiamento_attuali} /></section>
        <section className="analysis-section"><h2>Scenario Ottimistico</h2><p className="whitespace-pre-wrap">{a?.scenario_ottimistico || 'N/A'}</p></section>
        <section className="analysis-section"><h2>Scenario Pessimistico</h2><p className="whitespace-pre-wrap">{a?.scenario_pessimistico || 'N/A'}</p></section>
        <section className="analysis-section"><h2>Fattori Inattesi</h2>
          <p><strong>Positivo (Jolly):</strong> {a?.fattori_inattesi?.positivo_jolly || 'N/A'}</p>
          <p><strong>Negativo (Cigno Nero):</strong> {a?.fattori_inattesi?.negativo_cigno_nero || 'N/A'}</p>
        </section>
        <section className="analysis-section"><h2>Dossier Strategico per Oggi</h2>
          <p className="font-semibold">Azioni Preparatorie Immediate:</p><SafeList items={a?.dossier_strategico_oggi?.azioni_preparatorie_immediate} />
          <p className="font-semibold mt-2">Opportunità Emergenti:</p><SafeList items={a?.dossier_strategico_oggi?.opportunita_emergenti} />
          <p className="mt-2"><strong>Rischio Esistenziale da Mitigare:</strong> {a?.dossier_strategico_oggi?.rischio_esistenziale_da_mitigare || 'N/A'}</p>
        </section>
      </>
    );
  };

  const renderAnalisiLetteraria = () => {
    const a = analisiLett || {};
    const temi = a?.analisi_tematica_filosofica;
    const stile = a?.analisi_stilistica_narratologica;
    const contesto = a?.contesto_storico_biografico;
    const sintesi = a?.sintesi_critica_conclusione;

    const hasAnything = isNonEmptyObject(temi) || isNonEmptyObject(stile) || isNonEmptyObject(contesto) || (!!sintesi || isNonEmptyObject(sintesi));
    if (!hasAnything) return null;

    return (
      <>
        {isNonEmptyObject(temi) && (
          <section className="analysis-section">
            <h2>Analisi Tematica e Filosofica</h2>
            {Array.isArray(temi?.temi_principali) && temi.temi_principali.length > 0 && (
              <div className="mb-3">
                <h4 className="font-semibold">Temi principali</h4>
                {temi.temi_principali.map((t: any, i: number) => (
                  <div key={i} className="mb-2">
                    <p className="font-medium">{t?.tema || 'Tema'}</p>
                    {t?.spiegazione && <p className="whitespace-pre-wrap">{t.spiegazione}</p>}
                    {Array.isArray(t?.citazioni) && (
                      <div className="mt-1"><p className="text-sm font-semibold">Citazioni:</p><CitazioniList items={t.citazioni} /></div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {Array.isArray(temi?.temi_secondari) && temi.temi_secondari.length > 0 && (
              <div className="mb-2"><h4 className="font-semibold">Temi secondari</h4><SafeList items={temi.temi_secondari} /></div>
            )}
            {temi?.tesi_filosofica && (
              <div className="mt-2"><h4 className="font-semibold">Tesi filosofica</h4><p className="whitespace-pre-wrap">{temi.tesi_filosofica}</p></div>
            )}
          </section>
        )}

        {isNonEmptyObject(stile) && (
          <section className="analysis-section">
            <h2>Analisi Stilistica e Narratologica</h2>
            {stile?.stile && typeof stile.stile === 'string' ? (
              <><h4 className="font-semibold">Stile di scrittura</h4><p className="whitespace-pre-wrap">{stile.stile}</p></>
            ) : isNonEmptyObject(stile?.stile) ? (
              <><h4 className="font-semibold">Stile di scrittura</h4><KeyValueBlock data={stile.stile} /></>
            ) : null}
            {(stile?.narratore || stile?.tempo_narrativo) && (
              <div className="grid gap-2 sm:grid-cols-2 mt-3">
                {stile?.narratore && <div><h5 className="font-semibold">Narratore</h5><p className="whitespace-pre-wrap">{String(stile.narratore)}</p></div>}
                {stile?.tempo_narrativo && <div><h5 className="font-semibold">Tempo narrativo</h5><p className="whitespace-pre-wrap">{String(stile.tempo_narrativo)}</p></div>}
              </div>
            )}
            {Array.isArray(stile?.dispositivi_retorici) && stile.dispositivi_retorici.length > 0 && (
              <div className="mt-3">
                <h4 className="font-semibold">Figure/Dispositivi retorici</h4>
                <ul className="list-disc list-inside ml-6">
                  {stile.dispositivi_retorici.map((d: any, i: number) => (
                    <li key={i}><span className="font-medium">{d?.nome || 'Dispositivo'}</span>{d?.effetto && <span>: {d.effetto}</span>}</li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(stile?.personaggi) && stile.personaggi.length > 0 && (
              <div className="mt-3">
                <h4 className="font-semibold">Personaggi e Analisi Psicologica</h4>
                {stile.personaggi.map((p: any, i: number) => (
                  <div key={i} className="mb-2">
                    <p className="font-medium">{p?.nome || 'Personaggio'}</p>
                    {p?.arco && <p>Arco: {p.arco}</p>}
                    {p?.motivazioni && <p>Motivazioni: {p.motivazioni}</p>}
                    {Array.isArray(p?.meccanismi_di_difesa) && p.meccanismi_di_difesa.length > 0 && (
                      <><p className="text-sm font-semibold mt-1">Meccanismi di difesa:</p><SafeList items={p.meccanismi_di_difesa} /></>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {isNonEmptyObject(contesto) && (
          <section className="analysis-section">
            <h2>Contesto Storico e Biografico</h2>
            {contesto?.storico && <><h4 className="font-semibold">Contesto storico-culturale</h4><p className="whitespace-pre-wrap">{contesto.storico}</p></>}
            {contesto?.biografico && <><h4 className="font-semibold mt-2">Note biografiche rilevanti</h4><p className="whitespace-pre-wrap">{contesto.biografico}</p></>}
          </section>
        )}

        {sintesi && (
          <section className="analysis-section">
            <h2>Sintesi Critica e Conclusione</h2>
            {typeof sintesi === 'string' ? <p className="whitespace-pre-wrap">{sintesi}</p> : isNonEmptyObject(sintesi) ? <KeyValueBlock data={sintesi} /> : <p className="text-gray-500 italic">N/A</p>}
          </section>
        )}
      </>
    );
  };

  return (
    <div className="poetry-page">
      <button onClick={onBack} className="back-button">← Torna all'elenco</button>

      <div className="poetry-header">
        <h1>{poesia.title}</h1>
        <p className="author">{poesia.author_name || 'Anonimo'}</p>
      </div>

      <div className="poetry-content">
        <div className="poetry-text"><pre>{poesia.content}</pre></div>

        <MatchPoeticoLSTM poesia={poesia} onPoesiaSelect={(poesiaMatch) => console.log('Poesia selezionata:', poesiaMatch)} />

        <div className="analysis-generation-section">
          {analisiStatus === 'non_generata' && (
            <div className="generate-analysis">
              <button onClick={generaAnalisiPsicologica} disabled={generandoAnalisi} className="generate-analysis-btn">
                {generandoAnalisi ? 'Generazione in corso...' : '🔮 Genera Analisi con OpenAI'}
              </button>
              <p className="help-text">Analisi psicologica dettagliata, analisi letteraria e profilo poetico</p>
            </div>
          )}
          {analisiStatus === 'in_corso' && (
            <div className="analysis-loading">
              <div className="loader">🎭 Generando analisi con GPT-4...</div>
              <p>Questa operazione richiede circa 10-20 secondi</p>
            </div>
          )}
          {analisiStatus === 'generata' && !poesia.analisi_psicologica && (
            <div className="analysis-success"><p>✅ Analisi generate con successo! Ricarica la pagina per visualizzarle.</p></div>
          )}
        </div>

        <div className="audio-section">
          <div className="audio-status">
            {statoTesto}
            {audioStatus === 'in_corso' && (
              <div className="progress-indicator">
                <div className="progress-bar" style={{ width: `${Math.max(0, 100 - (timeRemaining / 120) * 100)}%` }} />
              </div>
            )}
          </div>

          {audioStatus === 'generato' && audioUrl && (
            <div className="audio-options">
              <button onClick={() => setShowAudioPlayer(true)} className="listen-button">▶ Ascolta con highlight</button>
              <a href={audioUrl} download className="audio-download-link">📥 Scarica audio</a>
            </div>
          )}

          {audioError && <div className="audio-error">{audioError}</div>}
        </div>

        <div className="analysis-sections">
          {renderAnalisiPsicoDettagliata()}
          {renderAnalisiLetteraria()}
          {renderAnalisiFuturista()}
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

// --- LISTA / APP ---
const App = () => {
  const [state, setState] = useState<{
    poesie: any[];
    loading: boolean;
    error: string | null;
    search: string;
    selectedPoesia: any | null;
  }>({
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

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, search: e.target.value }));
  };

  const handleSelectPoesia = (poesia: any) => {
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
        <PoetryPage poesia={state.selectedPoesia} onBack={handleBackToList} />
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
                  onClick={() => setState(prev => ({ ...prev, search: '' }))}
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
                  <p className="author">{poesia.author_name || 'Anonimo'}</p>
                  <p className="preview">{(poesia.content || '').slice(0, 120)}...</p>
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
