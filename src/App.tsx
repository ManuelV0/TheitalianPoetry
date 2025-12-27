import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "./lib/supabaseClient";
import "./index.css";

/* ============================================================================
   TYPES
============================================================================ */
type Poesia = {
  id: number;
  title: string;
  author_name: string | null;
  content: string;
  analisi_letteraria?: any;
  analisi_psicologica?: any;
  audio_url?: string | null;
};

/* ============================================================================
   UTILS
============================================================================ */
const parseAnalysis = (value: any) => {
  if (!value) return null;
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return String(value);
  }
};

/* ============================================================================
   GENERIC ANALYSIS PRINTER (CORE DEL WIDGET)
============================================================================ */
const AnalysisDump = ({
  title,
  data
}: {
  title: string;
  data: any;
}) => {
  if (!data) return null;

  return (
    <section className="analysis-dump">
      <h2>{title}</h2>
      <pre>{typeof data === "string" ? data : JSON.stringify(data, null, 2)}</pre>
    </section>
  );
};

/* ============================================================================
   POESIA VIEW (SINGOLA)
============================================================================ */
const PoetryView = ({
  poesia,
  onBack
}: {
  poesia: Poesia;
  onBack: () => void;
}) => {
  const analisiLetteraria = useMemo(
    () => parseAnalysis(poesia.analisi_letteraria),
    [poesia.analisi_letteraria]
  );

  const analisiPsicologica = useMemo(
    () => parseAnalysis(poesia.analisi_psicologica),
    [poesia.analisi_psicologica]
  );

  return (
    <div className="poetry-page">
      <button className="back-button" onClick={onBack}>
        ← Torna all’elenco
      </button>

      <header className="poetry-header">
        <h1>{poesia.title}</h1>
        <p className="author">{poesia.author_name || "Anonimo"}</p>
      </header>

      <section className="poetry-text">
        <pre>{poesia.content}</pre>
      </section>

      {poesia.audio_url && (
        <section className="audio-section">
          <audio controls src={poesia.audio_url} />
        </section>
      )}

      <div className="analysis-sections">
        <AnalysisDump
          title="Analisi letteraria"
          data={analisiLetteraria}
        />

        <AnalysisDump
          title="Analisi psicologica"
          data={analisiPsicologica}
        />
      </div>
    </div>
  );
};

/* ============================================================================
   MAIN WIDGET APP
============================================================================ */
const App = () => {
  const [poesie, setPoesie] = useState<Poesia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Poesia | null>(null);

  useEffect(() => {
    const fetchPoesie = async () => {
      try {
        const { data, error } = await supabase
          .from("poesie")
          .select(
            "id, title, author_name, content, analisi_letteraria, analisi_psicologica, audio_url"
          )
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;
        setPoesie(data || []);
      } catch (err) {
        setError("Errore nel caricamento delle poesie");
      } finally {
        setLoading(false);
      }
    };

    fetchPoesie();
  }, []);

  if (loading) {
    return <div className="loader">Caricamento…</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="app-container">
      {selected ? (
        <PoetryView poesia={selected} onBack={() => setSelected(null)} />
      ) : (
        <main className="poesie-list">
          {poesie.map((p) => (
            <article
              key={p.id}
              className="poesia-card"
              onClick={() => setSelected(p)}
            >
              <h3>{p.title}</h3>
              <p className="author">{p.author_name || "Anonimo"}</p>
              <p className="preview">
                {(p.content || "").slice(0, 140)}…
              </p>
            </article>
          ))}
        </main>
      )}
    </div>
  );
};

export default App;