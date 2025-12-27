import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from './lib/supabaseClient';
import { FaPlay, FaPause, FaStop, FaArrowLeft, FaDownload } from 'react-icons/fa';
import './widget.css';

const AUDIO_API_URL =
  'https://poetry.theitalianpoetryproject.com/.netlify/functions/genera-audio';

/* =========================
   UTILS
   ========================= */
function isIOSorSafari() {
  if (typeof navigator === 'undefined') return false;
  return (
    /iP(ad|hone|od)/.test(navigator.userAgent) ||
    (/Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent))
  );
}

const calculateStats = (text: string) => {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const words = text.split(/\s+/).filter(Boolean);
  return {
    lines: lines.length,
    words: words.length,
    unique: new Set(words.map(w => w.toLowerCase())).size,
    readingTime: Math.max(30, Math.round((words.length / 180) * 60))
  };
};

/* =========================
   AUDIO PLAYER
   ========================= */
const AudioPlayer = ({
  text,
  url,
  onClose
}: {
  text: string;
  url: string;
  onClose: () => void;
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const words = useMemo(() => text.split(/\s+/), [text]);
  const [currentWord, setCurrentWord] = useState(-1);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      const p = audio.currentTime / (audio.duration || 1);
      setProgress(p);
      setCurrentWord(Math.floor(p * words.length));
    };

    audio.onended = () => {
      setPlaying(false);
      setCurrentWord(-1);
    };

    return () => audio.pause();
  }, [url, words.length]);

  const toggle = async () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      await audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const stop = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setPlaying(false);
    setCurrentWord(-1);
  };

  return (
    <div className="audio-player-modal">
      <div className="audio-controls">
        <button onClick={toggle} className="play-button">
          {playing ? <FaPause /> : <FaPlay />}
        </button>
        <button onClick={stop} className="stop-button">
          <FaStop />
        </button>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <button onClick={onClose} className="back-button">
          Chiudi
        </button>
      </div>

      <div className="content-highlight">
        {words.map((w, i) => (
          <span
            key={i}
            className={`word ${i === currentWord ? 'highlight' : ''}`}
          >
            {w}
          </span>
        ))}
      </div>
    </div>
  );
};

/* =========================
   PAGINA POESIA
   ========================= */
const PoetryView = ({
  poesia,
  onBack
}: {
  poesia: any;
  onBack: () => void;
}) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(poesia.audio_url);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  const stats = useMemo(
    () => calculateStats(poesia.content || ''),
    [poesia.content]
  );

  useEffect(() => {
    if (audioUrl) return;

    setLoadingAudio(true);
    fetch(AUDIO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poesia_id: poesia.id,
        text: poesia.content
      })
    })
      .then(r => r.json())
      .then(async j => {
        if (j.audio_url) {
          setAudioUrl(j.audio_url);
          await supabase
            .from('poesie')
            .update({ audio_url: j.audio_url })
            .eq('id', poesia.id);
        }
      })
      .finally(() => setLoadingAudio(false));
  }, [audioUrl, poesia]);

  return (
    <div className="poetry-page">
      <button onClick={onBack} className="back-button">
        <FaArrowLeft /> Indietro
      </button>

      <div className="poetry-header">
        <h1>{poesia.title}</h1>
        <p className="author">{poesia.author_name || 'Anonimo'}</p>
      </div>

      <div className="poetry-text">
        <pre>{poesia.content}</pre>
      </div>

      <div className="audio-section">
        {loadingAudio && <p>Generazione audio…</p>}
        {audioUrl && (
          <>
            <button
              className="listen-button"
              onClick={() => setShowPlayer(true)}
            >
              <FaPlay /> Ascolta
            </button>
            <a href={audioUrl} download className="audio-download-link">
              <FaDownload /> Scarica
            </a>
          </>
        )}
      </div>

      <div className="poetry-tools">
        <div className="poetry-stats-card">
          <p><strong>Linee:</strong> {stats.lines}</p>
          <p><strong>Parole:</strong> {stats.words}</p>
          <p><strong>Uniche:</strong> {stats.unique}</p>
          <p>
            <strong>Tempo lettura:</strong> {Math.round(stats.readingTime / 60)}m
          </p>
        </div>
      </div>

      {showPlayer && audioUrl && (
        <AudioPlayer
          text={poesia.content}
          url={audioUrl}
          onClose={() => setShowPlayer(false)}
        />
      )}
    </div>
  );
};

/* =========================
   APP (LISTA)
   ========================= */
export default function App() {
  const [poesie, setPoesie] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('poesie')
      .select('id, title, content, author_name, audio_url')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setPoesie(data || []);
        setLoading(false);
      });
  }, []);

  if (selected) {
    return <PoetryView poesia={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="app-container">
      {loading ? (
        <div className="loader">Caricamento…</div>
      ) : (
        poesie.map(p => (
          <div
            key={p.id}
            className="poesia-card"
            onClick={() => setSelected(p)}
          >
            <h3>{p.title}</h3>
            <p className="author">{p.author_name || 'Anonimo'}</p>
            <p className="preview">{p.content.slice(0, 100)}…</p>
          </div>
        ))
      )}
    </div>
  );
}