import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';

// COMPONENTE BOX POESIA
function PoesiaBox({ poesia }: { poesia: any }) {
  const [aperta, setAperta] = useState(false);

  return (
    <div
      className={`poesia-box group transition-all bg-white rounded-xl shadow hover:shadow-xl border border-gray-100 p-6 mb-6 cursor-pointer ${aperta ? 'ring-2 ring-green-300' : ''}`}
      tabIndex={0}
      onClick={() => setAperta(v => !v)}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setAperta(v => !v)}
      aria-expanded={aperta}
      role="button"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-green-700 mb-1">{poesia.title}</h3>
          <p className="italic text-gray-500 mb-2">{poesia.author_name || "Anonimo"}</p>
        </div>
        <button
          className="ml-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-full px-4 py-1 font-semibold transition shadow"
          style={{ userSelect: 'none' }}
          tabIndex={-1}
          onClick={e => { e.stopPropagation(); setAperta(a => !a); }}
          aria-label={aperta ? "Chiudi dettagli poesia" : "Espandi dettagli poesia"}
        >
          {aperta ? "Chiudi" : "Espandi"}
        </button>
      </div>
      {/* Preview testo */}
      {!aperta && (
        <p className="mt-3 text-gray-700 line-clamp-2">{poesia.content?.slice(0, 120)}...</p>
      )}
      {/* Dettagli */}
      {aperta && (
        <div className="mt-4 animate-fade-in-down">
          <pre className="mb-3 whitespace-pre-line text-lg font-medium text-gray-900">{poesia.content}</pre>
          <div className="grid md:grid-cols-2 gap-4">
            <section className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-1">Analisi Letteraria</h4>
              <p className="text-gray-700">{poesia.analisi_letteraria || <i>Nessuna analisi disponibile</i>}</p>
            </section>
            <section className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h4 className="font-semibold text-indigo-800 mb-1">Analisi Psicologica</h4>
              <p className="text-gray-700">{poesia.analisi_psicologica || <i>Nessuna analisi disponibile</i>}</p>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

// COMPONENTE PRINCIPALE
export default function App() {
  const [state, setState] = useState({
    poesie: [] as any[],
    loading: true,
    error: null as string | null,
    search: ''
  });

  // Fetch poesie
  const fetchPoesie = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from('poesie')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setState(prev => ({ ...prev, poesie: data, loading: false, error: null }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: 'Errore nel caricamento',
        loading: false
      }));
    }
  }, []);

  useEffect(() => {
    fetchPoesie();
    const interval = setInterval(fetchPoesie, 300000); // 5 minuti
    return () => clearInterval(interval);
  }, [fetchPoesie]);

  // Ricerca
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, search: e.target.value }));
  };
  const poesieFiltrate = state.poesie.filter(p =>
    (p.title?.toLowerCase().includes(state.search.toLowerCase()) ||
    p.author_name?.toLowerCase().includes(state.search.toLowerCase()) ||
    p.content?.toLowerCase().includes(state.search.toLowerCase()))
  );

  // RENDER
  return (
    <div className="poetry-widget-app w-full max-w-3xl mx-auto p-6 bg-gray-50 rounded-xl shadow">
      <header className="mb-6">
        <h1 className="text-3xl md:text-4xl text-center font-extrabold text-green-700 font-montserrat mb-6">
          The Italian Poetry Project
        </h1>
        <div className="flex justify-center">
          <input
            type="search"
            value={state.search}
            onChange={handleSearch}
            placeholder="Cerca poesie, autori o testo..."
            aria-label="Cerca poesie"
            className="w-full max-w-xl p-4 rounded-full border border-gray-300 focus:ring-4 focus:ring-green-400 focus:outline-none shadow text-lg transition"
            style={{ fontFamily: 'Open Sans, sans-serif' }}
          />
        </div>
      </header>

      {/* Banner errore */}
      {state.error && (
        <div className="error-banner bg-red-100 text-red-700 p-4 rounded mb-4 flex items-center justify-between" role="alert">
          <span>{state.error}</span>
          <button
            className="bg-red-700 hover:bg-red-900 text-white rounded-full px-4 py-1 ml-3"
            onClick={fetchPoesie}
          >
            Riprova
          </button>
        </div>
      )}

      <div className="poesie-list">
        {state.loading ? (
          <div className="loader text-center text-gray-500 my-8">Caricamento poesie...</div>
        ) : poesieFiltrate.length > 0 ? (
          poesieFiltrate.map(poesia => (
            <PoesiaBox key={poesia.id} poesia={poesia} />
          ))
        ) : (
          <div className="empty-state text-center text-gray-400 mt-12 text-lg">Nessuna poesia trovata.</div>
        )}
      </div>
    </div>
  );
}
