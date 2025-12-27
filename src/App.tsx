// src/App.tsx

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo
} from 'react';
import { supabase } from './lib/supabaseClient';
import {
  FaArrowLeft,
  FaPlay,
  FaPause,
  FaStop,
  FaDownload
} from 'react-icons/fa';
import './index.css';

// --- CONFIG ENDPOINTS ---
const AUDIO_API_URL =
  'https://poetry.theitalianpoetryproject.com/.netlify/functions/genera-audio';

// --- UTILS ---
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

// --- TYPES ---
type RecommendedPoem = {
  id: string;
  title: string;
  author_name: string | null;
  similarity: number | null;
};

// --- STATS ---
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

  const lineCount = sanitized
    .split(/\r?\n/)
    .filter(l => l.trim().length > 0).length;

  const words = sanitized.split(/\s+/).filter(Boolean);
  const uniqueWordCount = new Set(words.map(w => w.toLowerCase())).size;
  const characterCount = sanitized.replace(/\s+/g, '').length;
  const averageWordsPerLine =
    lineCount > 0 ? Number((words.length / lineCount).toFixed(1)) : 0;

  const estimatedSeconds = Math.round((words.length / 180) * 60);

  return {
    lineCount,
    wordCount: words.length,
    uniqueWordCount,
    characterCount,
    averageWordsPerLine,
    readingTimeSeconds: Math.max(30, estimatedSeconds)
  };
};

const formatReadingTime = (seconds: number) => {
  if (!seconds || seconds <= 0) return 'Non stimabile';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} sec`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s} sec`;
};

// --- COMPONENTS UTILI ---
function SafeList({ items }: { items?: any[] }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="text-gray-500 italic">N/A</p>;
  }
  return (
    <ul className="list-disc list-inside ml-6">
      {items.map((x, i) => (
        <li key={i}>{typeof x === 'string' ? x : JSON.stringify(x)}</li>
      ))}
    </ul>
  );
}

function CitazioniList({ items }: { items?: string[] }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="text-gray-500 italic">Nessuna citazione</p>;
  }
  return (
    <ul className="list-disc list-inside ml-6">
      {items.map((c, i) => (
        <li key={i}>«{c}»</li>
      ))}
    </ul>
  );
}

function KeyValueBlock({ data }: { data?: any }) {
  if (!isNonEmptyObject(data)) return null;
  return (
    <div className="grid gap-2">
      {Object.entries(data).map(([k, v]) => (
        <div key={k}>
          <strong>{k.replaceAll('_', ' ')}</strong>
          <div>{typeof v === 'string' ? v : JSON.stringify(v)}</div>
        </div>
      ))}
    </div>
  );
}

// ===============================
// PAGINA POESIA
// ===============================
const PoetryPage = ({
  poesia,
  onBack
}: {
  poesia: any;
  onBack: () => void;
}) => {
  const poesiaStats = useMemo(
    () => calculatePoetryStats(poesia.content),
    [poesia.content]
  );

  return (
    <div className="poetry-page">
      <button onClick={onBack} className="back-button">
        <FaArrowLeft /> Torna all'elenco
      </button>

      <h1>{poesia.title}</h1>
      <p className="author">{poesia.author_name || 'Anonimo'}</p>

      <pre>{poesia.content}</pre>

      <section>
        <h2>Statistiche</h2>
        <ul>
          <li>Parole: {poesiaStats.wordCount}</li>
          <li>Linee: {poesiaStats.lineCount}</li>
          <li>Tempo lettura: {formatReadingTime(poesiaStats.readingTimeSeconds)}</li>
        </ul>
      </section>
    </div>
  );
};

// ===============================
// APP ROOT
// ===============================
const App = () => {
  const [state, setState] = useState({
    poesie: [] as any[],
    loading: true,
    error: null as string | null,
    search: '',
    selectedPoesia: null as any | null
  });

  const fetchPoesie = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from('poesie')
        .select('id,title,content,author_name,created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setState(s => ({ ...s, poesie: data ?? [], loading: false }));
    } catch {
      setState(s => ({
        ...s,
        loading: false,
        error: 'Errore nel caricamento poesie'
      }));
    }
  }, []);

  useEffect(() => {
    fetchPoesie();
  }, [fetchPoesie]);

  const poesieFiltrate = useMemo(() => {
    const q = state.search.toLowerCase();
    if (!q) return state.poesie;
    return state.poesie.filter(p =>
      [p.title, p.author_name, p.content]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [state.search, state.poesie]);

  if (state.selectedPoesia) {
    return (
      <PoetryPage
        poesia={state.selectedPoesia}
        onBack={() =>
          setState(s => ({ ...s, selectedPoesia: null }))
        }
      />
    );
  }

  return (
    <div className="app-container">
      <input
        placeholder="Cerca poesie…"
        value={state.search}
        onChange={e =>
          setState(s => ({ ...s, search: e.target.value }))
        }
      />

      {state.loading && <p>Caricamento…</p>}
      {state.error && <p>{state.error}</p>}

      {poesieFiltrate.map(p => (
        <div
          key={p.id}
          className="poesia-card"
          onClick={() =>
            setState(s => ({ ...s, selectedPoesia: p }))
          }
        >
          <h3>{p.title}</h3>
          <p>{p.author_name || 'Anonimo'}</p>
        </div>
      ))}
    </div>
  );
};

export default App;