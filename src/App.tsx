import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from './lib/supabaseClient';
import { FaArrowLeft, FaPlay, FaDownload } from 'react-icons/fa';
import './index.css';

/* ===============================
   CONFIG
================================ */

const BACKEND_BASE_URL = 'https://backend.theitalianpoetryproject.com';

const AUDIO_API_URL =
  `${BACKEND_BASE_URL}/.netlify/functions/genera-audio`;

/* ===============================
   UTILS
================================ */

const isNonEmptyObject = (v: any) =>
  v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0;

/* ===============================
   TYPES
================================ */

type RecommendedPoem = {
  id: string;
  title: string;
  author_name: string | null;
  similarity: number | null;
};

/* ===============================
   POETRY PAGE
================================ */

const PoetryPage = ({
  poesia,
  onBack
}: {
  poesia: any;
  onBack: () => void;
}) => {
  const [recommended, setRecommended] = useState<RecommendedPoem[]>([]);
  const [loadingRec, setLoadingRec] = useState(false);
  const [errorRec, setErrorRec] = useState<string | null>(null);

  /* ---- FETCH RECOMMENDED ---- */
  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoadingRec(true);
      setErrorRec(null);

      try {
        const res = await fetch(
          `${BACKEND_BASE_URL}/.netlify/functions/match-poesie`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ poesia_id: poesia.id })
          }
        );

        if (!res.ok) throw new Error('HTTP error');

        const json = await res.json();

        if (alive) {
          setRecommended(
            Array.isArray(json.matches) ? json.matches : []
          );
        }
      } catch {
        if (alive) setErrorRec('Errore caricamento suggerimenti');
      } finally {
        if (alive) setLoadingRec(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [poesia.id]);

  return (
    <div className="poetry-page">
      <button onClick={onBack} className="back-button">
        <FaArrowLeft /> Torna all’elenco
      </button>

      <h1>{poesia.title}</h1>
      <p className="author">{poesia.author_name || 'Anonimo'}</p>

      <pre className="poetry-text">{poesia.content}</pre>

      {/* ---- AUDIO ---- */}
      {poesia.audio_url && (
        <a href={poesia.audio_url} download className="audio-download-link">
          <FaDownload /> Scarica audio
        </a>
      )}

      {/* ---- RECOMMENDED ---- */}
      <section className="poetry-recommendations">
        <h2>Poesie consigliate</h2>

        {loadingRec && <p>Caricamento…</p>}
        {errorRec && <p className="error">{errorRec}</p>}

        {recommended.length > 0 && (
          <ul>
            {recommended.map(p => (
              <li key={p.id}>
                <strong>{p.title}</strong>
                {p.author_name && ` — ${p.author_name}`}
              </li>
            ))}
          </ul>
        )}

        {!loadingRec && !errorRec && recommended.length === 0 && (
          <p>Nessun suggerimento disponibile</p>
        )}
      </section>
    </div>
  );
};

/* ===============================
   APP ROOT
================================ */

const App = () => {
  const [poesie, setPoesie] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  /* ---- FETCH POESIE ---- */
  const fetchPoesie = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('poesie')
        .select('id,title,content,author_name,audio_url,created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPoesie(data || []);
    } catch {
      setError('Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPoesie();
  }, [fetchPoesie]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return poesie;

    return poesie.filter(p =>
      [p.title, p.author_name, p.content]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(q))
    );
  }, [poesie, search]);

  /* ---- RENDER ---- */
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
      {error && <p className="error">{error}</p>}

      <div className="poesie-list">
        {filtered.map(p => (
          <div
            key={p.id}
            className="poesia-card"
            onClick={() => setSelected(p)}
          >
            <h3>{p.title}</h3>
            <p>{p.author_name || 'Anonimo'}</p>
            <p>{(p.content || '').slice(0, 120)}…</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;