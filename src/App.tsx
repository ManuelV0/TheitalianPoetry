import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';

// 1. Definizione dei tipi TypeScript
type Poem = {
  id: string;
  title: string;
  content: string;
  author_name?: string;
  audio_url?: string | null;
  created_at: string;
  audio_generated?: boolean;
};

type AudioState = {
  loading: boolean;
  url: string | null;
  error: string | null;
};

// 2. Error Boundary per gestire gli errori UI
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Component Error:", error, errorInfo);
    // Invia l'errore a un servizio di monitoring
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h3>Errore nel componente</h3>
          <button onClick={() => window.location.reload()}>Ricarica</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// 3. Componente per la singola poesia
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
      if (audioState.url) return;

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
  }, [poem.id, poem.content, audioState.url]);

  return (
    <div className="poetry-widget">
      <div className="widget-header" onClick={() => setExpanded(!expanded)}>
        <div>
          <h3>{poem.title || 'Senza titolo'}</h3>
          <p className="author">{poem.author_name || 'Anonimo'}</p>
        </div>
        <span className="toggle-icon">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="widget-content">
          <pre className="poem-content">{poem.content}</pre>

          <div className="audio-section">
            {audioState.error && (
              <div className="error-message">
                <span>Errore: {audioState.error}</span>
                <button className="retry-button" onClick={generateAudio}>
                  Riprova
                </button>
              </div>
            )}

            {audioState.url ? (
              <audio controls className="audio-player">
                <source src={audioState.url} type="audio/mpeg" />
                Il tuo browser non supporta l'elemento audio
              </audio>
            ) : (
              <button
                className={`generate-button ${audioState.loading ? 'loading' : ''}`}
                onClick={generateAudio}
                disabled={audioState.loading}
              >
                {audioState.loading ? (
                  <span className="loading-spinner"></span>
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

// 4. Componente principale
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
        .select('id, title, content, author_name, audio_url, created_at, audio_generated')
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
    const interval = setInterval(fetchPoems, 30000);
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
          />
        </div>
      </header>

      <main className="main-content">
        {state.error && (
          <div className="error-alert">
            <span>{state.error}</span>
            <button className="retry-button" onClick={fetchPoems}>
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
            {state.search ? 'Nessuna poesia trovata' : 'Nessuna poesia disponibile'}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
