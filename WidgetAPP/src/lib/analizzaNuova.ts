import { supabase } from './supabaseClient';
import { openai } from './openai';

interface AnalisiResult {
  analisi_letteraria: {
    stile_letterario: string;
    temi: string[];
    struttura: string;
    riferimenti_culturali: string;
  };
  analisi_psicologica: {
    emozioni: string[];
    stato_interno: string;
    visione_del_mondo: string;
  };
}

export async function analizzaPoesiaSeNuova(
  poesia: string, 
  autore: string
): Promise<{
  status: 'già analizzata' | 'analizzata' | 'errore';
  poesia_id?: string;
  analisi?: AnalisiResult;
  error?: unknown;
}> {
  try {
    // 1. Controlla se la poesia esiste già
    const { data: esistente, error: checkError } = await supabase
      .from('poesie')
      .select('id')
      .eq('content', poesia)
      .maybeSingle();

    if (checkError) throw checkError;
    if (esistente) return { status: 'già analizzata', poesia_id: esistente.id };

    // 2. Chiamata a OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{
        role: 'user',
        content: `Analizza questa poesia: ${poesia}`
      }],
      temperature: 0.7
    });

    const analisi: AnalisiResult = JSON.parse(
      completion.choices[0]?.message?.content || '{}'
    );

    // 3. Salva nel database
    const { data: nuovaPoesia, error: insertError } = await supabase
      .from('poesie')
      .insert({
        content: poesia,
        author_name: autore,
        analisi_letteraria: analisi.analisi_letteraria,
        analisi_psicologica: analisi.analisi_psicologica
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    return {
      status: 'analizzata',
      poesia_id: nuovaPoesia.id,
      analisi
    };
  } catch (error) {
    console.error('Errore analisi poesia:', error);
    return {
      status: 'errore',
      error
    };
  }
}
