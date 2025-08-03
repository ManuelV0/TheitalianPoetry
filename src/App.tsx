
import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

// LOG all'importazione del modulo
console.log(">> [App.tsx] File importato");

function PoesiaBox({ poesia }: { poesia: any }) {
  const [aperta, setAperta] = useState(false)

  // LOG al montaggio del componente PoesiaBox
  useEffect(() => {
    console.log(">> [PoesiaBox] Montato. ID poesia:", poesia?.id);
  }, [poesia?.id]);

  return (
    <div className="w-full border rounded-lg p-6 shadow-lg mb-6 bg-white transition-all hover:shadow-xl font-sans">
      {/* ...resto invariato */}
      {/* Puoi aggiungere altri log qui se vuoi vedere click/apertura */}
    </div>
  )
}

export default function App() {
  const [poesie, setPoesie] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // LOG: quando viene montato App
  useEffect(() => {
    console.log(">> [App] COMPONENT montato");
  }, []);

  const fetchPoesie = async () => {
    console.log(">> [App] fetchPoesie() chiamata");
    const { data, error } = await supabase
      .from('poesie')
      .select('id, title, content, author_name, analisi_letteraria, analisi_psicologica, created_at')
      .order('created_at', { ascending: false })

    if (!error) {
      console.log(">> [App] poesie caricate:", data?.length);
      setPoesie(data || [])
    } else {
      console.error(">> [App] ERRORE caricamento poesie:", error);
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPoesie()

    const interval = setInterval(() => {
      fetchPoesie()
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const poesieFiltrate = poesie.filter(p =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.author_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.content?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <main className="max-w-lg sm:max-w-3xl mx-auto p-6 bg-gray-50 min-h-screen font-open-sans">
      <h1 className="text-3xl font-extrabold mb-6 text-center text-green-700 tracking-wide font-montserrat">
        TheItalianPoetryProject.com
      </h1>

      <div className="mb-8">
        <input
          type="search"
          value={search}
          onChange={e => {
            console.log(">> [App] Ricerca cambiata:", e.target.value);
            setSearch(e.target.value)
          }}
          placeholder="Cerca per titolo, autore o testo..."
          className="w-full p-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-4 focus:ring-green-500 focus:border-transparent text-gray-700 text-lg"
          aria-label="Barra di ricerca poesie"
          autoComplete="off"
        />
      </div>

      {loading && <p className="text-center text-gray-500">Caricamento poesie...</p>}

      {poesieFiltrate.length > 0 ? (
        poesieFiltrate.map(poesia => (
          <PoesiaBox key={poesia.id} poesia={poesia} />
        ))
      ) : (
        !loading && (
          <p className="text-center text-gray-400 mt-12 text-lg">Nessuna poesia trovata.</p>
        )
      )}
    </main>
  )
}
