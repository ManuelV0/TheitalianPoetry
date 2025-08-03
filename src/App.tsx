import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';

// Debug iniziale
console.groupCollapsed(">> [App.tsx] Inizializzazione");
console.log("Ambiente:", process.env.NODE_ENV);
console.log("Supabase inizializzato:", !!supabase);
console.groupEnd();

function PoesiaBox({ poesia }: { poesia: any }) {
  const [aperta, setAperta] = useState(false);

  useEffect(() => {
    console.debug(`[PoesiaBox ${poesia.id}] Montato`, { 
      titolo: poesia.title,
      autore: poesia.author_name 
    });
    
    return () => {
      console.debug(`[PoesiaBox ${poesia.id}] Smontato`);
    };
  }, [poesia]);

  const toggleAperta = () => {
    console.debug(`[PoesiaBox ${poesia.id}] Click - Stato: ${!aperta}`);
    setAperta(!aperta);
  };

  return (
    <div 
      className={`poesia-box ${aperta ? 'aperta' : ''}`}
      onClick={toggleAperta}
      data-testid={`poesia-${poesia.id}`}
    >
      <h3>{poesia.title}</h3>
      <p className="autore">{poesia.author_name}</p>
      {aperta && (
        <div className="contenuto">
          <pre>{poesia.content}</pre>
          <div className="analisi">
            <h4>Analisi Letteraria</h4>
            <p>{poesia.analisi_letteraria}</p>
            <h4>Analisi Psicologica</h4>
            <p>{poesia.analisi_psicologica}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [state, setState] = useState({
    poesie: [] as any[],
    loading: true,
    error: null as string | null,
    search: ''
  });

  const fetchPoesie = useCallback(async () => {
    console.group("[App] fetchPoesie()");
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const { data, error } = await supabase
        .from('poesie')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      console.debug("Poesie caricate:", data.length);
      setState(prev => ({ ...prev, poesie: data, loading: false }));
    } catch (err) {
      console.error("Errore fetch:", err);
      setState(prev => ({
        ...prev,
        error: 'Errore nel caricamento',
        loading: false
      }));
    } finally {
      console.groupEnd();
    }
  }, []);

  useEffect(() => {
    console.log("[App] Effetto montaggio");
    fetchPoesie();

    const interval = setInterval(fetchPoesie, 300000); // 5 minuti

    return () => {
      console.log("[App] Smontaggio - cleanup");
      clearInterval(interval);
    };
  }, [fetchPoesie]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.debug(`Ricerca: "${value}"`);
    setState(prev => ({ ...prev, search: value }));
  };

  const poesieFiltrate = state.poesie.filter(p =>
    Object.values(p).some(
      val => val?.toString().toLowerCase().includes(state.search.toLowerCase())
    )
  );

  console.debug("[App] Render", {
    poesieTotali: state.poesie.length,
    poesieFiltrate: poesieFiltrate.length,
    searchTerm: state.search
  });

  return (
    <div className="app-container">
      <header>
        <h1>The Italian Poetry Project</h1>
        <input
          type="search"
          value={state.search}
          onChange={handleSearch}
          placeholder="Cerca poesie..."
          aria-label="Cerca poesie"
        />
      </header>

      {state.error && (
        <div className="error-banner" role="alert">
          {state.error}
          <button onClick={fetchPoesie}>Riprova</button>
        </div>
      )}

      <div className="poesie-list">
        {state.loading ? (
          <div className="loader">Caricamento...</div>
        ) : poesieFiltrate.length > 0 ? (
          poesieFiltrate.map(poesia => (
            <PoesiaBox key={poesia.id} poesia={poesia} />
          ))
        ) : (
          <div className="empty-state">Nessun risultato</div>
        )}
      </div>
    </div>
  );
}
