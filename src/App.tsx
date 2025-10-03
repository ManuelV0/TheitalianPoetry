import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';

function App() {
  const [poesie, setPoesie] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoesia, setSelectedPoesia] = useState<any>(null);

  useEffect(() => {
    fetchPoesie();
  }, []);

  const fetchPoesie = async () => {
    try {
      const { data, error } = await supabase
        .from('poesie')
        .select('id, title, content, author_name, analisi_psicologica, analisi_letteraria, audio_url')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPoesie(data || []);
    } catch (err) {
      console.error('Errore:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>📚 Poesie AI</h1>
        <p>Caricamento in corso...</p>
      </div>
    );
  }

  if (selectedPoesia) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <button 
          onClick={() => setSelectedPoesia(null)}
          style={{
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            marginBottom: '2rem',
            cursor: 'pointer'
          }}
        >
          ← Torna all'elenco
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1>{selectedPoesia.title}</h1>
          <p style={{ color: '#666', fontSize: '1.2rem' }}>
            di {selectedPoesia.author_name || 'Anonimo'}
          </p>
        </div>

        <div style={{
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.8',
          fontFamily: 'Georgia, serif'
        }}>
          {selectedPoesia.content}
        </div>

        {selectedPoesia.audio_url && (
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <h3>🎵 Audio</h3>
            <audio controls style={{ width: '100%', marginTop: '1rem' }}>
              <source src={selectedPoesia.audio_url} type="audio/mpeg" />
              Il tuo browser non supporta l'audio.
            </audio>
            <a 
              href={selectedPoesia.audio_url} 
              download
              style={{
                display: 'inline-block',
                background: '#10b981',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                textDecoration: 'none',
                marginTop: '1rem'
              }}
            >
              📥 Scarica audio
            </a>
          </div>
        )}

        {!selectedPoesia.analisi_psicologica && (
          <div style={{
            background: '#f8fafc',
            border: '2px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '1.5rem',
            textAlign: 'center',
            marginBottom: '2rem'
          }}>
            <button
              onClick={async () => {
                alert('Funzione di generazione analisi verrà implementata');
              }}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              🧠 Genera Analisi con AI
            </button>
            <p style={{ color: '#666', marginTop: '0.5rem' }}>
              Analisi psicologica e letteraria dettagliata
            </p>
          </div>
        )}

        {(selectedPoesia.analisi_psicologica || selectedPoesia.analisi_letteraria) && (
          <div>
            <h2>Analisi</h2>
            
            {selectedPoesia.analisi_psicologica && (
              <div style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <h3>🧠 Analisi Psicologica</h3>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                  {typeof selectedPoesia.analisi_psicologica === 'string' 
                    ? selectedPoesia.analisi_psicologica 
                    : JSON.stringify(selectedPoesia.analisi_psicologica, null, 2)
                  }
                </pre>
              </div>
            )}

            {selectedPoesia.analisi_letteraria && (
              <div style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <h3>📖 Analisi Letteraria</h3>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                  {typeof selectedPoesia.analisi_letteraria === 'string' 
                    ? selectedPoesia.analisi_letteraria 
                    : JSON.stringify(selectedPoesia.analisi_letteraria, null, 2)
                  }
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'white' }}>
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '1rem 2rem'
      }}>
        <h1 style={{ margin: 0 }}>📚 Poesie AI</h1>
      </header>

      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {poesie.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            <h2>Nessuna poesia trovata</h2>
            <p>Il database delle poesie è vuoto.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gap: '1rem'
          }}>
            {poesie.map(poesia => (
              <div 
                key={poesia.id}
                onClick={() => setSelectedPoesia(poesia)}
                style={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>
                  {poesia.title}
                </h3>
                <p style={{ color: '#64748b', margin: '0 0 1rem 0', fontStyle: 'italic' }}>
                  di {poesia.author_name || 'Anonimo'}
                </p>
                <p style={{ color: '#475569', margin: 0, lineHeight: '1.5' }}>
                  {(poesia.content || '').slice(0, 120)}...
                </p>
                
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {poesia.audio_url && (
                    <span style={{
                      background: '#f0f9ff',
                      color: '#0369a1',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem'
                    }}>
                      🎵 Audio
                    </span>
                  )}
                  {poesia.analisi_psicologica && (
                    <span style={{
                      background: '#f0fdf4',
                      color: '#166534',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem'
                    }}>
                      🧠 Analisi
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
