
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import './index.css';

type AppProps = {
  poesiaId?: string | number;
};

type PoetryRecord = Record<string, any>;

const formatKey = (key: string) =>
  key
    .replace(/^analisi_/, 'analisi ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());

const safeParseValue = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
};

const hasMeaningfulValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some(item => hasMeaningfulValue(item));
  }

  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }

  return false;
};

const renderValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined) {
    return <p className="widget-placeholder">N/A</p>;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return <p className="widget-placeholder">N/A</p>;
    return <pre className="widget-pre">{value}</pre>;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return <p className="widget-text">{String(value)}</p>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <p className="widget-placeholder">N/A</p>;
    return (
      <ul className="widget-list">
        {value.map((item, index) => (
          <li key={index}>{renderValue(item)}</li>
        ))}
      </ul>
    );
  }

  if (typeof value === 'object') {
    return (
      <pre className="widget-pre">{JSON.stringify(value, null, 2)}</pre>
    );
  }

  return <p className="widget-text">{String(value)}</p>;
};

const App: React.FC<AppProps> = ({ poesiaId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [poesia, setPoesia] = useState<PoetryRecord | null>(null);

  useEffect(() => {
    let isActive = true;
    const normalizedId =
      typeof poesiaId === 'number'
        ? poesiaId.toString()
        : (poesiaId ?? '').toString().trim();

    if (!normalizedId) {
      setPoesia(null);
      setError('Nessuna poesia selezionata.');
      setLoading(false);
      return () => {
        isActive = false;
      };
    }

    setLoading(true);
    setError(null);
    setPoesia(null);

    const fetchPoetry = async () => {
      try {
        const { data, error: queryError } = await supabase
          .from('poesie')
          .select('*')
          .eq('id', normalizedId)
          .maybeSingle();

        if (!isActive) return;

        if (queryError) {
          setError('Impossibile recuperare la poesia.');
          setLoading(false);
          return;
        }

        if (!data) {
          setError('Poesia non trovata.');
          setLoading(false);
          return;
        }

        setPoesia(data);
        setLoading(false);
      } catch {
        if (!isActive) return;
        setError('Si è verificato un errore inatteso.');
        setLoading(false);
      }
    };

    fetchPoetry();

    return () => {
      isActive = false;
    };
  }, [poesiaId]);

  const analysisSections = useMemo(() => {
    if (!poesia) return [];

    const baseKeys = ['analisi_psicologica', 'analisi_letteraria'];
    const dynamicKeys = Object.keys(poesia).filter(
      key =>
        key.toLowerCase().startsWith('analisi_') && !baseKeys.includes(key)
    );

    const keys = Array.from(new Set([...baseKeys, ...dynamicKeys]));

    return keys.map(key => ({
      key,
      label: formatKey(key),
      value: safeParseValue(poesia[key])
    }));
  }, [poesia]);

  const sectionsWithContent = analysisSections.filter(section =>
    hasMeaningfulValue(section.value)
  );

  const title =
    typeof poesia?.title === 'string' && poesia.title.trim().length > 0
      ? poesia.title.trim()
      : 'Senza titolo';

  const author =
    typeof poesia?.author_name === 'string' &&
    poesia.author_name.trim().length > 0
      ? poesia.author_name.trim()
      : 'Anonimo';

  const content =
    typeof poesia?.content === 'string' && poesia.content.trim().length > 0
      ? poesia.content
      : null;

  const audioUrl =
    typeof poesia?.audio_url === 'string' && poesia.audio_url.trim().length > 0
      ? poesia.audio_url.trim()
      : null;

  return (
    <div className="poetry-widget">
      <div className="poetry-widget__surface">
        {loading ? (
          <p className="widget-status">Caricamento…</p>
        ) : error ? (
          <p className="widget-error">{error}</p>
        ) : !poesia ? (
          <p className="widget-error">Poesia non disponibile.</p>
        ) : (
          <>
            <header className="poetry-widget__header">
              <h1 className="poetry-widget__title">{title}</h1>
              <p className="poetry-widget__author">{author}</p>
            </header>

            <section className="poetry-widget__section">
              <h2 className="poetry-widget__heading">Testo</h2>
              {content ? (
                <pre className="widget-pre">{content}</pre>
              ) : (
                <p className="widget-placeholder">N/A</p>
              )}
            </section>

            <section className="poetry-widget__section">
              <h2 className="poetry-widget__heading">Audio</h2>
              {audioUrl ? (
                <div className="poetry-widget__audio">
                  <audio
                    controls
                    preload="metadata"
                    src={audioUrl}
                    className="poetry-widget__audio-player"
                  >
                    Il tuo browser non supporta l&apos;audio HTML5.
                  </audio>
                  <a
                    className="poetry-widget__audio-link"
                    href={audioUrl}
                    download
                  >
                    Scarica audio
                  </a>
                </div>
              ) : (
                <p className="widget-placeholder">Audio non disponibile</p>
              )}
            </section>

            <section className="poetry-widget__section">
              <h2 className="poetry-widget__heading">Analisi</h2>
              {sectionsWithContent.length === 0 ? (
                <p className="widget-placeholder">N/A</p>
              ) : (
                <div className="poetry-widget__analysis-list">
                  {sectionsWithContent.map(section => (
                    <article
                      key={section.key}
                      className="poetry-widget__analysis-item"
                    >
                      <h3 className="poetry-widget__analysis-title">
                        {section.label}
                      </h3>
                      <div className="poetry-widget__analysis-content">
                        {renderValue(section.value)}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
```

---

### `index.tsx`

```tsx
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import App from './App';
import './index.css';

type WidgetConfig = {
  poesiaId?: string | number;
};

declare global {
  interface Window {
    MyPoetryApp?: {
      mount: (element: HTMLElement, config?: WidgetConfig) => void;
      unmount: (element: HTMLElement) => void;
    };
  }
}

const roots = new Map<HTMLElement, Root>();

const mount = (element: HTMLElement, config?: WidgetConfig) => {
  if (!element) return;

  const existingRoot = roots.get(element);
  if (existingRoot) {
    existingRoot.unmount();
    roots.delete(element);
  }

  const root = createRoot(element);
  roots.set(element, root);
  root.render(<App poesiaId={config?.poesiaId} />);
};

const unmount = (element: HTMLElement) => {
  const root = roots.get(element);
  if (root) {
    root.unmount();
    roots.delete(element);
  }
};

if (typeof window !== 'undefined') {
  window.MyPoetryApp = { mount, unmount };
}
