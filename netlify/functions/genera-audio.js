import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// --- Utility per ENV
const getEnvVar = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Variabile d'ambiente mancante: ${name}`);
  return value;
};

// 🔹 Usa la SERVICE_ROLE_KEY lato server
const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
const openaiKey = getEnvVar('OPENAI_API_KEY');

// --- Supabase client (server-safe)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: 'public' }
});

// --- OpenAI client
const openai = new OpenAI({ apiKey: openaiKey });

// --- Funzione mock di fallback
function generateMockAnalysis(content) {
  return {
    vettori_di_cambiamento_attuali: [
      "Avanzamenti tecnologici generici",
      "Cambiamenti sociali globali",
      "Tendenze economiche emergenti"
    ],
    scenario_ottimistico: "Scenario positivo con cooperazione globale e uso etico delle tecnologie.",
    scenario_pessimistico: "Scenario negativo con crisi geopolitiche e uso dannoso delle tecnologie.",
    fattori_inattesi: {
      positivo_jolly: "Scoperta scientifica rivoluzionaria che risolve una crisi globale.",
      negativo_cigno_nero: "Evento catastrofico imprevisto che sconvolge le economie mondiali."
    },
    dossier_strategico_oggi: {
      azioni_preparatorie_immediate: [
        "Investire in formazione continua",
        "Diversificare le fonti di reddito",
        "Creare reti di collaborazione"
      ],
      opportunita_emergenti: [
        "Sviluppo di tecnologie sostenibili",
        "Mercati di nicchia legati all'adattamento climatico"
      ],
      rischio_esistenziale_da_mitigare: "Collasso ecologico globale"
    }
  };
}

const handler = async (event) => {
  console.log("=== Ricevuta chiamata PoetryAI ===");

  // --- Solo POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Solo POST consentito' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // --- Auth: JWT obbligatorio
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Token JWT mancante' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // --- Verifica token
  let user;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw error || new Error('Utente non trovato');
    user = data.user;
  } catch (error) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Accesso non autorizzato', details: error.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // --- Parsing body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Formato JSON non valido' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  if (!body.content || typeof body.content !== 'string') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Il campo "content" è obbligatorio' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // --- Prompt per GPT
  const prompt = `
Agisci come un "Futurista Strategico" e un analista di sistemi complessi.
Non predire il futuro, ma mappa le sue possibilità per fornire un vantaggio decisionale.

Argomento: ${body.content}

Proiettalo 20 anni nel futuro e crea un dossier strategico completo in formato JSON con la seguente struttura:

{
  "vettori_di_cambiamento_attuali": ["..."],
  "scenario_ottimistico": "...",
  "scenario_pessimistico": "...",
  "fattori_inattesi": {
    "positivo_jolly": "...",
    "negativo_cigno_nero": "..."
  },
  "dossier_strategico_oggi": {
    "azioni_preparatorie_immediate": ["..."],
    "opportunita_emergenti": ["..."],
    "rischio_esistenziale_da_mitigare": "..."
  }
}

Requisiti:
- Pensa in modo sistemico
- Tono lucido e strategico
- Usa esempi concreti
`;

  // --- Chiamata a OpenAI
  let analisiGPT;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });

    analisiGPT = JSON.parse(completion.choices[0].message.content || '{}');
  } catch (error) {
    console.error("Errore OpenAI, uso mock:", error);
    analisiGPT = generateMockAnalysis(body.content);
  }

  // --- Prepara record per il DB
  const poemData = {
    title: body.title || null,
    content: body.content,
    author_name: body.author_name || user.user_metadata?.full_name || null,
    profile_id: user.id,
    instagram_handle: body.instagram_handle || null,
    analisi_letteraria: null, // Campo non usato nel nuovo schema
    analisi_psicologica: analisiGPT,
    match_id: body.match_id || null,
    created_at: new Date().toISOString()
  };

  // --- Inserimento in Supabase
  try {
    const { data, error } = await supabase
      .from('poesie')
      .insert(poemData)
      .select('*');

    if (error) throw error;

    return {
      statusCode: 201,
      body: JSON.stringify(data[0]),
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Errore interno del server', details: error.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};

export { handler };
