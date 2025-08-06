
         
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';

// Definizione dei tipi TypeScript
type Poem = {
  id: string;
  title: string;
  content: string;
  author_name?: string;
  audio_url?: string | null;
  created_at: string;
  audio_generated?: boolean;
  audio_generated_at?: string;
};

type AudioState = {
  loading: boolean;
  url: string | null;
  error: string | null;
};

// Error Boundary per gestire gli errori UI
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Component Error:", error, errorInfo);
    // Qui puoi inviare l'errore a un servizio di monitoring come Sentry
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h3>Qualcosa è andato storto</h3>
          <button 
            onClick={() => window.location.reload()}
            className="reload-button"
          >
            Ricarica la pagina
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Componente per la singola poesia
const PoetryWidget = ({ poem }: { poem: Poem }) => {
  const [expanded, setExpanded] = useState(false);
  const [audioState, setAudioState] = useState<AudioState>({
    loading: false,
    url: poem.audio_url || null,
    error: null
  });

  const generateAudio = useCallback(async () => {
    setAudioState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const API_ENDPOINT = 'https://poetry.theitalianpoetryproject.com/.netlify/functions/genera-audio';
      
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          text: poem.content,
          poesia_id: poem.id
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Errore nella generazione audio');
      }

      const data = await response.json();
      const audioUrl = data.audio_url;
      if (!audioUrl) throw new Error('URL audio non valido');

      // Aggiorna lo stato locale
      setAudioState(prev => ({ ...prev, url: audioUrl }));

      // Aggiorna il database Supabase
      const { error } = await supabase
        .from('poesie')
        .update({ 
          audio_url: audioUrl, 
          audio_generated: true,
          audio_generated_at: new Date().toISOString()
        })
        .eq('id', poem.id);

      if (error) throw error;

    } catch (err) {
      console.error('Audio generation error:', err);
      setAudioState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Errore sconosciuto'
      }));
    } finally {
      setAudioState(prev => ({ ...prev, loading: false }));
    }
  }, [poem.id, poem.content]);

  return (
    <div className={`poetry-widget ${expanded ? 'expanded' : ''}`}>
      <div 
        className="widget-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="header-content">
          <h3>{poem.title || 'Senza titolo'}</h3>
          <p className="author">{poem.author_name || 'Anonimo'}</p>
          {poem.audio_generated_at && (
            <span className="audio-date">
              Generato il: {new Date(poem.audio_generated_at).toLocaleDateString()}
            </span>
          )}
        </div>
        <span className="toggle-icon">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="widget-content">
          <pre className="poem-content">{poem.content}</pre>

          <div className="audio-section">
            {audioState.error && (
              <div className="error-message">
                <span>⚠️ {audioState.error}</span>
                <button 
                  className="retry-button"
                  onClick={generateAudio}
                >
                  Riprova
                </button>
              </div>
            )}

            {audioState.url ? (
              <div className="audio-player-container">
                <audio controls className="audio-player">
                  <source src={audioState.url} type="audio/mpeg" />
                  Il tuo browser non supporta l'elemento audio
                </audio>
                <a 
                  href={audioState.url} 
                  download={`${poem.title.replace(/ /g, '_')}.mp3`}
                  className="download-button"
                >
                  Scarica audio
                </a>
              </div>
            ) : (
              <button
                className={`generate-button ${audioState.loading ? 'loading' : ''}`}
                onClick={generateAudio}
                disabled={audioState.loading}
                aria-busy={audioState.loading}
              >
                {audioState.loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Generazione in corso...
                  </>
                ) : (
                  '🎙️ Genera audio'
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Componente principale
const App = () => {
  const [state, setState] = useState<{
    poems: Poem[];
    loading: boolean;
    error: string | null;
    search: string;
  }>({
    poems: [],
    loading: true,
    error: null,
    search: ''
  });

  const fetchPoems = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await supabase
        .from('poesie')
        .select('id, title, content, author_name, audio_url, created_at, audio_generated, audio_generated_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data) throw new Error('Nessun dato ricevuto');

      setState(prev => ({ ...prev, poems: data }));
    } catch (err) {
      console.error('Fetch poems error:', err);
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Errore nel caricamento delle poesie'
      }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchPoems();
    const interval = setInterval(fetchPoems, 30000); // Aggiorna ogni 30 secondi
    return () => clearInterval(interval);
  }, [fetchPoems]);

  const filteredPoems = state.poems.filter(poem =>
    poem.title.toLowerCase().includes(state.search.toLowerCase()) ||
    (poem.author_name && poem.author_name.toLowerCase().includes(state.search.toLowerCase())) ||
    poem.content.toLowerCase().includes(state.search.toLowerCase())
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>TheItalianPoetryProject.com</h1>
        <div className="search-container">
          <input
            type="text"
            value={state.search}
            onChange={(e) => setState(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Cerca poesie..."
            className="search-input"
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

      <main className="main-content">
        {state.error && (
          <div className="error-alert">
            <span>{state.error}</span>
            <button 
              className="retry-button"
              onClick={fetchPoems}
            >
              Riprova
            </button>
          </div>
        )}

        {state.loading ? (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>Caricamento poesie...</p>
          </div>
        ) : filteredPoems.length > 0 ? (
          <div className="poems-list">
            {filteredPoems.map(poem => (
              <ErrorBoundary key={poem.id}>
                <PoetryWidget poem={poem} />
              </ErrorBoundary>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            {state.search ? (
              <p>Nessuna poesia trovata per "{state.search}"</p>
            ) : (
              <p>Nessuna poesia disponibile al momento</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
