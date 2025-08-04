import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';

// --- DETECT SAFARI/iOS (versione migliorata) ---
function isIOSorSafari() {
  if (typeof navigator === "undefined") return false;
  return /iP(ad|hone|od)/.test(navigator.userAgent) ||
    (/Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent));
}

// --- COMPONENTE BOX POESIA ---
function PoesiaBox({ poesia }: { poesia: any }) {
  const [aperta, setAperta] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(poesia.audio_url || null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Parsing robusto delle analisi
  let analisiL = poesia.analisi_letteraria;
  let analisiP = poesia.analisi_psicologica;
  try {
    if (typeof analisiL === 'string') analisiL = JSON.parse(analisiL);
    if (typeof analisiP === 'string') analisiP = JSON.parse(analisiP);
  } catch {}

  // --- HANDLER PER GENERARE AUDIO ---
  const handleGeneraAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingAudio(true);
    setAudioError(null);
    try {
      if (audioUrl) {
        setLoadingAudio(false);
        return;
      }
      const res = await fetch('/.netlify/functions/genera-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: poesia.content,
          poesia_id: poesia.id
        })
      });
      const json = await res.json();
      if (json.audio_url) {
        setAudioUrl(json.audio_url);
        await supabase
          .from('poesie')
          .update({ audio_url: json.audio_url, audio_generated: true })
          .eq('id', poesia.id);
      } else if (json.audioUrl) {
        setAudioUrl(json.audioUrl);
      }
    } catch (err) {
      setAudioError('Errore nella generazione audio');
    }
    setLoadingAudio(false);
  };

  // --- FETCH BLOB AUDIO (versione migliorata per iOS) ---
  const fetchAudioAsBlob = useCallback(async (url: string) => {
    setLoadingAudio(true);
    setAudioError(null);
    try {
      // Forza il download con cache-busting
      const res = await fetch(`${url}?${Date.now()}`, {
        cache: 'no-cache',
        mode: 'cors'
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.headers.get('content-type')?.includes('audio/mpeg')) {
        throw new Error('Invalid MIME type');
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setAudioBlobUrl(objectUrl);
    } catch (err) {
      console.error('iOS Audio Fetch Error:', err);
      setAudioError('Errore nel caricamento audio per iOS');
    }
    setLoadingAudio(false);
  }, []);

  // --- EFFETTO: gestione audio per iOS ---
  useEffect(() => {
    let blobUrl: string | null = null;
    let objectUrl: string | null = null;

    const setupAudio = async () => {
      if (aperta && audioUrl && isIOSorSafari() && !audioBlobUrl) {
        await fetchAudioAsBlob(audioUrl);
      }
    };

    setupAudio();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [aperta, audioUrl, audioBlobUrl, fetchAudioAsBlob]);

  // --- HANDLER PLAY FORZATO PER iOS ---
  const handlePlayForced = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioUrl) return;

    try {
      // Se iOS e non abbiamo ancora il blob
      if (isIOSorSafari() && !audioBlobUrl) {
        await fetchAudioAsBlob(audioUrl);
      }

      // Forza la riproduzione dopo un gesto utente
      const audioElement = document.createElement('audio');
      audioElement.src = audioBlobUrl || audioUrl;
      audioElement.playsInline = true;
      audioElement.preload = 'none';
      
      document.body.appendChild(audioElement);
      await audioElement.play();
      audioElement.remove();
    } catch (err) {
      console.error('Forced play failed:', err);
      setAudioError('Riproduzione fallita. Tocca di nuovo per riprovare.');
    }
  };

  // --- RENDER ---
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
      
      {!aperta && (
        <p className="preview">{poesia.content?.slice(0, 120)}...</p>
      )}

      {aperta && (
        <div className="contenuto">
          <pre>{poesia.content}</pre>

          {/* --- SEZIONE AUDIO MIGLIORATA --- */}
          <div style={{ margin: '16px 0' }}>
            {audioUrl ? (
              <>
                <div className="audio-player-wrapper">
                  <audio
                    controls
                    style={{ width: '100%' }}
                    src={isIOSorSafari() && audioBlobUrl ? audioBlobUrl : audioUrl}
                    key={`${audioUrl}-${audioBlobUrl ? 'blob' : 'direct'}`}
                    preload="none"
                    playsInline
                    onPlay={(e) => {
                      // Backup per iOS
                      if (isIOSorSafari() && e.target.paused) {
                        e.target.play().catch(err => {
                          console.error('Auto-play failed:', err);
                          setAudioError('Tocca il pulsante play per avviare');
                        });
                      }
                    }}
                    onError={(e) => {
                      const error = e.target.error;
                      console.error("Audio Error:", {
                        code: error?.code,
                        message: error?.message,
                        src: e.target.src
                      });
                      setAudioError('Errore nel player. Usa il link alternativo.');
                    }}
                  >
                    Il tuo browser non supporta l'elemento audio.
                  </audio>

                  {/* Bottone alternativo per iOS */}
                  {isIOSorSafari() && (
                    <button
                      onClick={handlePlayForced}
                      style={{
                        marginTop: '8px',
                        padding: '6px 12px',
                        fontSize: '14px',
                        backgroundColor: '#f0f0f0',
                        border: '1px solid #ddd'
                      }}
                    >
                      {loadingAudio ? 'Caricamento...' : 'Riproduci Forzato'}
                    </button>
                  )}
                </div>

                <div className="audio-meta">
                  <a
                    href={audioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#0077cc', display: 'block', marginTop: 6 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Apri audio in nuova scheda
                  </a>
                  
                  {audioError && (
                    <div style={{ color: '#d32f2f', fontSize: 12, marginTop: 4 }}>
                      {audioError}
                    </div>
                  )}

                  {process.env.NODE_ENV === 'development' && (
                    <pre style={{ wordBreak: 'break-all', fontSize: 11, color: '#999' }}>
                      {isIOSorSafari() ? 'BLOB:' : 'DIRECT:'} {audioBlobUrl || audioUrl}
                    </pre>
                  )}
                </div>
              </>
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

          {/* ... (resto del codice analisi) ... */}
        </div>
      )}
    </div>
  );
}
