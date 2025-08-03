import { supabase } from './supabaseClient';
import { openai } from './openai';

// Definizione dei tipi per l'analisi
type AnalisiLetteraria = {
  stile_letterario: string;
  temi: string[];
  struttura: string;
  riferimenti_culturali: string;
};

type AnalisiPsicologica = {
  emozioni: string[];
  stato_interno: string;
  visione_del_mondo: string;
};

type RisultatoAnalisi = {
  analisi_letteraria: AnalisiLetteraria;
  analisi_psicologica: AnalisiPsicologica;
};

type RisultatoOperazione = {
  status: 'già analizzata' | 'analizzata' | 'errore';
  poesia_id?: string;
  analisi?: RisultatoAnalisi;
  error?: unknown;
};

/**
 * Analizza una poesia con GPT solo se non già presente nel database.
 * Salva analisi_letteraria e analisi_psicologica come JSONB nella tabella poesie.
 */
export async function analizzaPoesiaSeNuova(
  poesia: string, 
  autore: string
): Promise<RisultatoOperazione> {
  try {
    // 1. Controlla se la poesia esiste già nel database
    const { data: esistente, error: checkError } = await supabase
      .from('poesie')
      .select('id')
      .eq('content', poesia)
      .maybeSingle();

    if (checkError) throw checkError;

    if (esistente) {
      return {
        status: 'già analizzata',
        poesia_id: esistente.id
      };
    }

    // 2. Prompt per GPT con validazione JSON
    const prompt = `
Analizza la poesia fornita e restituisci un JSON valido con questa struttura:

{
  "analisi_letteraria": {
    "stile_letterario": "stringa",
    "temi": ["array", "di", "stringhe"],
    "struttura": "stringa",
    "riferimenti_culturali": "stringa"
  },
  "analisi_psicologica": {
    "emozioni": ["array", "di", "stringhe"],
    "stato_interno": "stringa",
    "visione_del_mondo": "stringa"
  }
}

POESIA DA ANALIZZARE:
${poesia}
`.trim();

    // 3. Chiamata a OpenAI con validazione
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: 'Restituisci SOLO un JSON valido senza commenti o testo aggiuntivo.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    // 4. Parsing e validazione della risposta
    const risposta = completion.choices[0]?.message?.content;
    if (!risposta) throw new Error('Nessuna risposta da OpenAI');

    const analisi: RisultatoAnalisi = JSON.parse(risposta);

    // Validazione della struttura
    if (!analisi.analisi_letteraria || !analisi.analisi_psicologica) {
      throw new Error('Struttura di analisi non valida');
    }

    // 5. Inserimento nel database con transazione
    const { data: nuovaPoesia, error: insertError } = await supabase
      .from('poesie')
      .insert({
        content: poesia,
        author_name: autore,
        analisi_letteraria: analisi.analisi_letteraria,
        analisi_psicologica: analisi.analisi_psicologica,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    return {
      status: 'analizzata',
      poesia_id: nuovaPoesia.id,
      analisi
    };

  } catch (err) {
    console.error('Errore durante analisi:', err);
    
    // Invia l'errore a un servizio di logging se necessario
    // await logErrorToService(err);
    
    return {
      status: 'errore',
      error: err instanceof Error ? err.message : 'Errore sconosciuto'
    };
  }
}
   
