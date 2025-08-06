const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Configurazione Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'uScy1bXtKz8vPzfdFsFw'; // Voce italiana ElevenLabs

// Inizializza client Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configurazione CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://theitalianpoetryproject.com',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event, context) => {
  // Gestione preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // Log iniziale
  console.log('[Audio Generation] Inizio elaborazione richiesta');

  // Verifica metodo HTTP
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  // Verifica variabili d'ambiente
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ELEVENLABS_API_KEY) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Configurazione server incompleta' })
    };
  }

  // Parsing del body
  let text, poesia_id;
  try {
    const body = JSON.parse(event.body);
    text = body.text;
    poesia_id = body.poesia_id;
    
    if (!text || !poesia_id) {
      throw new Error('Dati mancanti');
    }
  } catch (err) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Richiesta malformata' })
    };
  }

  try {
    // 1. Generazione audio con ElevenLabs
    console.log('[Audio Generation] Invio richiesta a ElevenLabs');
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      }
    );

    if (!ttsResponse.ok) {
      const error = await ttsResponse.text();
      throw new Error(`Errore ElevenLabs: ${error}`);
    }

    // 2. Conversione in buffer
    const audioBuffer = await ttsResponse.arrayBuffer();
    console.log('[Audio Generation] Audio generato con successo');

    // 3. Upload su Supabase Storage
    const fileName = `poesia-${poesia_id}-${Date.now()}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from('poetry-audio')
      .upload(fileName, Buffer.from(audioBuffer), {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // 4. Recupero URL pubblico
    const { data: { publicUrl } } = supabase.storage
      .from('poetry-audio')
      .getPublicUrl(fileName);

    // 5. Aggiornamento record poesia
    const { error: dbError } = await supabase
      .from('poesie')
      .update({ 
        audio_url: publicUrl,
        audio_generated: true,
        audio_generated_at: new Date().toISOString()
      })
      .eq('id', poesia_id);

    if (dbError) throw dbError;

    console.log('[Audio Generation] Processo completato con successo');
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ audio_url: publicUrl })
    };

  } catch (error) {
    console.error('[Audio Generation] Errore:', error.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Errore nella generazione audio',
        details: error.message 
      })
    };
  }
};
