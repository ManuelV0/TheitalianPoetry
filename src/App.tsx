// WidgetApp.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from './lib/supabaseClient';
import './widget.css'; // ⬅️ placeholder stile widget

type Poesia = {
  id: number;
  title: string;
  author_name: string | null;
  content: string;
  audio_url?: string | null;
};

const WidgetApp = () => {
  const [poesie, setPoesie] = useState<Poesia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Poesia | null>(null);

  const fetchPoesie = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('poesie')
        .select('id, title, content, author_name, audio_url')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setPoesie(data || []);
    } catch {
      setError('Errore nel caricamento poesie');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPoesie();
  }, [fetchPoesie]);

  const poesieFiltrate = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return poesie;
    return poesie.filter(p =>
      [p.title, p.author_name, p.content]
        .filter(Boolean)
        .some(v => v!.toLowerCase().includes(q))
    );
  }, [poesie, search]);

  if (loading) return <div className="pw-loading">Caricamento…</div>;
  if (error) return <div className="pw-error">{error}</div>;

  return (
    <div className="poetry-widget">
      {selected ? (
        <div className="pw-detail">
          <button onClick={() => setSelected(null)}>← Indietro</button>
          <h2>{selected.title}</h2>
          <p className="pw-author">{selected.author_name || 'Anonimo'}</p>
          <pre className="pw-text">{selected.content}</pre>

          {selected.audio_url && (
            <audio controls src={selected.audio_url} />
          )}

          <a
            href={`https://www.theitalianpoetryproject.com/poesia/${selected.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="pw-link"
          >
            Leggi analisi completa →
          </a>
        </div>
      ) : (
        <>
          <input
            className="pw-search"
            placeholder="Cerca poesie…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div className="pw-list">
            {poesieFiltrate.map(p => (
              <div
                key={p.id}
                className="pw-card"
                onClick={() => setSelected(p)}
              >
                <h3>{p.title}</h3>
                <p>{p.author_name || 'Anonimo'}</p>
                <p className="pw-preview">
                  {(p.content || '').slice(0, 100)}…
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default WidgetApp;