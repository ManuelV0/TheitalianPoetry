import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef
} from 'react';
import {
  FaArrowLeft,
  FaPlay,
  FaPause,
  FaStop,
  FaDownload
} from 'react-icons/fa';
import './index.css';

/* ------------------------------------------------------------------ */
/* CONFIG */
/* ------------------------------------------------------------------ */

const AUDIO_API_URL =
  'https://poetry.theitalianpoetryproject.com/.netlify/functions/genera-audio';

/* ------------------------------------------------------------------ */
/* UTILS */
/* ------------------------------------------------------------------ */

function isIOSorSafari() {
  if (typeof navigator === 'undefined') return false;
  return (
    /iP(ad|hone|od)/.test(navigator.userAgent) ||
    (/Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent))
  );
}

const isNonEmptyObject = (v: any) =>
  v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.keys(v).length > 0;

/* ------------------------------------------------------------------ */
/* TYPES */
/* ------------------------------------------------------------------ */

type RecommendedPoem = {
  id: string;
  title: string;
  author_name: string | null;
  similarity: number | null;
};

/* ------------------------------------------------------------------ */
/* STATS */
/* ------------------------------------------------------------------ */

const calculatePoetryStats = (text: string) => {
  const sanitized = (text ?? '').trim();
  if (!sanitized) {
    return {
      lineCount: 0,
      wordCount: 0,
      uniqueWordCount: 0,
      characterCount: 0,
      averageWordsPerLine: 0,
      readingTimeSeconds: 0
    };
  }

  const lines = sanitized
    .split(/\r?\n/)
    .filter(l => l.trim().length > 0);

  const words = sanitized.split(/\s+/).filter(Boolean);

  return {
    lineCount: lines.length,
    wordCount: words.length,
    uniqueWordCount: new Set(words.map(w => w.toLowerCase())).size,
    characterCount: sanitized.replace(/\s+/g, '').length,
    averageWordsPerLine:
      lines.length > 0
        ? Number((words.length / lines.length).toFixed(1))
        : 0,
    readingTimeSeconds: Math.max(30, Math.round((words.length / 180) * 60))
  };
};

const formatReadingTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (!m) return `${s}s`;
  if (!s) return `${m} min`;
  return `${m}m ${s}s`;
};

/* ------------------------------------------------------------------ */
/* AUDIO PLAYER */
/* ------------------------------------------------------------------ */

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const onTime = () => {
      setProgress(audio.currentTime / (audio.duration || 1));
    };

    const onEnd = () => setIsPlaying(false);
    const onErr = () => onError('Errore riproduzione audio');

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', onErr);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('error', onErr);
    };
  }, [audioUrl, onError]);

  const toggle = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      await audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="audio-player-modal">
      <button onClick={toggle}>
        {isPlaying ? <FaPause /> : <FaPlay />}
      </button>
      <div className="progress">
        <div style={{ width: `${progress * 100}%` }} />
      </div>
      <button onClick={onClose}>Chiudi</button>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* POETRY PAGE */
/* ------------------------------------------------------------------ */

const PoetryPage = ({
  poesia,
  onBack
}: {
  poesia: any;
  onBack: () => void;
}) => {
  const stats = useMemo(
    () => calculatePoetryStats(poesia.content || ''),
    [poesia.content]
  );

  const [audioUrl, setAudioUrl] = useState<string | null>(
    poesia.audio_url || null
  );
  const [audioStatus, setAudioStatus] =
    useState<'idle' | 'loading' | 'ready'>(
      poesia.audio_url ? 'ready' : 'idle'
    );
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    if (audioUrl || audioStatus === 'loading') return;

    setAudioStatus('loading');

    fetch(AUDIO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poesia_id: poesia.id,
        text: poesia.content
      })
    })
      .then(r => r.json())
      .then(j => {
        if (j.audio_url) {
          setAudioUrl(j.audio_url);
          setAudioStatus('ready');
        } else {
          setAudioStatus('idle');
        }
      })
      .catch(() => setAudioStatus('idle'));
  }, [audioUrl, audioStatus, poesia]);

  return (
    <div className="poetry-page">
      <button onClick={onBack}>
        <FaArrowLeft /> Indietro
      </button>

      <h1>{poesia.title}</h1>
      <p>{poesia.author_name || 'Anonimo'}</p>

      <pre>{poesia.content}</pre>

      <section>
        <h3>Statistiche</h3>
        <ul>
          <li>Parole: {stats.wordCount}</li>
          <li>Linee: {stats.lineCount}</li>
          <li>Tempo lettura: {formatReadingTime(stats.readingTimeSeconds)}</li>
        </ul>
      </section>

      {audioStatus === 'ready' && audioUrl && (
        <>
          <button onClick={() => setShowPlayer(true)}>
            <FaPlay /> Ascolta
          </button>
          <a href={audioUrl} download>
            <FaDownload /> Scarica
          </a>
        </>
      )}

      {showPlayer && audioUrl && (
        <AudioPlayerWithHighlight
          content={poesia.content}
          audioUrl={audioUrl}
          onClose={() => setShowPlayer(false)}
          onError={console.error}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* APP (LISTA) */
/* ------------------------------------------------------------------ */

const App = () => {
  const [poesie, setPoesie] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  const fetchPoesie = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/.netlify/functions/lista-poesie');
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setPoesie(data);
    } catch (e) {
      setError('Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPoesie();
  }, [fetchPoesie]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return poesie;
    return poesie.filter((p: any) =>
      [p.title, p.author_name, p.content]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(q))
    );
  }, [poesie, search]);

  if (selected) {
    return <PoetryPage poesia={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="app-container">
      <input
        type="search"
        placeholder="Cerca poesie…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading && <p>Caricamento…</p>}
      {error && <p>{error}</p>}

      <div className="poesie-list">
        {filtered.map(p => (
          <div
            key={p.id}
            className="poesia-card"
            onClick={() => setSelected(p)}
          >
            <h3>{p.title}</h3>
            <p>{p.author_name || 'Anonimo'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;