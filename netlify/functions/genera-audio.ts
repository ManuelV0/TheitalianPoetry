function PoesiaBox({ poesia }) {
  const [aperta, setAperta] = useState(false);
  const [audioUrl, setAudioUrl] = useState(poesia.audio_url || null);
  const [loading, setLoading] = useState(false);

  // ...parsing analisiL e analisiP come già fai

  const handleGeneraAudio = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch('/.netlify/functions/genera-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: poesia.content,
          poesia_id: poesia.id
        })
      });
      const json = await res.json();
      if (json.audio_url) setAudioUrl(json.audio_url);
    } catch (err) {
      alert("Errore nella generazione audio.");
    }
    setLoading(false);
  };

  return (
    <div className={`poesia-box${aperta ? ' aperta' : ''}`}
      // ...altri props e onClick/onKeyDown
    >
      {/* ...header */}
      {/* Preview o contenuto */}
      {aperta && (
        <div>
          {/* ...contenuto poesia, analisi ecc */}
          {audioUrl ? (
            <audio controls src={audioUrl} />
          ) : (
            <button onClick={handleGeneraAudio} disabled={loading}>
              {loading ? "Generazione in corso..." : "🎙️ Genera voce AI"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
