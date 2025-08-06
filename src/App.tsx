import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';

// 1. Error Boundary per gestire crash UI
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Component Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '1rem', border: '1px solid red', margin: '1rem 0' }}>
          <h3>Errore nel componente</h3>
          <button onClick={() => window.location.reload()}>Ricarica</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// 2. Componente per la singola poesia
const PoetryWidget = ({ poem }: { poem: Poem }) => {
  const [expanded, setExpanded] = useState(false);
  const [audioState, setAudioState] = useState<{
    loading: boolean;
    url: string | null;
    error: string | null;
  }>({
    loading: false,
    url: poem.audio_url || null,
    error: null
  });

  const generateAudio = useCallback(async () => {
    setAudioState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      if (audioState.url) return;

      const API_ENDPOINT = 'https://theitalianpoetryproject.com/.netlify/functions/genera-audio';
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: poem.content,
          poem_id: poem.id,
          voice: 'it-IT'
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const audioUrl = data.audio_url || data.audioUrl;
      if (!audioUrl) throw new Error('Invalid audio URL');

      // Aggiorna il database
      const { error } = await supabase
        .from('poems')
        .update({ audio_url: audioUrl })
        .eq('id', poem.id);

      if (error) throw error;

      setAudioState(prev => ({ ...prev, url: audioUrl }));
    } catch (err) {
      setAudioState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Unknown error'
      }));
    } finally {
      setAudioState(prev => ({ ...prev, loading: false }));
    }
  }, [poem.id, poem.content, audioState.url]);

  return (
    <div style={{ marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{ padding: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
      >
        <div>
          <h3 style={{ margin: 0 }}>{poem.title || 'Untitled'}</h3>
          <p style={{ margin: '0.5rem 0 0', fontStyle: 'italic' }}>
            {poem.author_name || 'Anonymous'}
          </p>
        </div>
        <span>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ padding: '1rem', borderTop: '1px solid #eee' }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
            {poem.content}
          </pre>

          <div style={{ marginTop: '1rem' }}>
            {audioState.error && (
              <div style={{ color: 'red', marginBottom: '0.5rem' }}>
                Error: {audioState.error}
                <button onClick={generateAudio} style={{ marginLeft: '0.5rem' }}>
                  Retry
                </button>
              </div>
            )}

            {audioState.url ? (
              <audio controls style={{ width: '100%' }}>
                <source src={audioState.url} type="audio/mpeg" />
                Your browser does not support audio.
              </audio>
            ) : (
              <button
                onClick={generateAudio}
                disabled={audioState.loading}
                style={{ padding: '0.5rem 1rem' }}
              >
                {audioState.loading ? 'Generating...' : 'Generate Audio'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 3. Tipi TypeScript
type Poem = {
  id: string;
  title: string;
  content: string;
  author_name?: string;
  audio_url?: string | null;
  created_at: string;
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
        .from('poems')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data) throw new Error('No data received');

      setState(prev => ({ ...prev, poems: data }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to load poems'
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
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ textAlign: 'center' }}>TheItalianPoetryProject.com</h1>
        <input
          type="text"
          value={state.search}
          onChange={(e) => setState(prev => ({ ...prev, search: e.target.value }))}
          placeholder="Search poems..."
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '1rem',
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}
        />
      </header>

      {state.error && (
        <div style={{ color: 'red', margin: '1rem 0', padding: '1rem', border: '1px solid red' }}>
          {state.error}
          <button onClick={fetchPoems} style={{ marginLeft: '1rem' }}>
            Retry
          </button>
        </div>
      )}

      {state.loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading poems...</div>
      ) : filteredPoems.length > 0 ? (
        filteredPoems.map(poem => (
          <ErrorBoundary key={poem.id}>
            <PoetryWidget poem={poem} />
          </ErrorBoundary>
        ))
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          {state.search ? 'No matching poems found' : 'No poems available'}
        </div>
      )}
    </div>
  );
};

export default App;
