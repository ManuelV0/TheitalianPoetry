const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Configurazione
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'uScy1bXtKz8vPzfdFsFw'; // Voce italiana ElevenLabs
const ALLOWED_ORIGIN = 'https://poetry.theitalianpoetryproject.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configurazione CORS avanzata
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400' // Preflight cache per 24 ore
};

exports.handler = async (event) => {
  // Gestione preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  // Verifica origine della richiesta
  const requestOrigin = event.headers.origin || event.headers.Origin;
  if (requestOrigin && requestOrigin !== ALLOWED_ORIGIN) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Origin non consentita' })
    };
  }

  // Verifica metodo HTTP
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  // Validazione input
  let payload;
  try {
    payload = JSON.parse(event.body);
    if (!payload.text || !payload.poesia_id) {
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
    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: payload.text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.7,  // Aumentata stabilità
            similarity_boost: 0.8
          }
        })
      }
    );

    if (!elevenLabsResponse.ok) {
      const errorData = await elevenLabsResponse.json();
      throw new Error(`API ElevenLabs: ${errorData.detail?.message || 'Errore sconosciuto'}`);
    }

    // 2. Upload su Supabase Storage
    const timestamp = Date.now();
    const fileName = `audio/${payload.poesia_id}/${timestamp}.mp3`;
    const audioBuffer = await elevenLabsResponse.buffer();

    const { error: uploadError } = await supabase.storage
      .from('poetry-audio')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false, // Non sovrascrivere file esistenti
        cacheControl: 'public, max-age=31536000' // Cache per 1 anno
      });

    if (uploadError) throw uploadError;

    // 3. Generazione URL firmato (più sicuro di publicUrl)
    const { data: { signedUrl } } = await supabase.storage
      .from('poetry-audio')
      .createSignedUrl(fileName, 3600); // Valido per 1 ora

    // 4. Aggiornamento database
    const { error: dbError } = await supabase
      .from('poesie')
      .update({ 
        audio_url: signedUrl,
        audio_generated: true,
        audio_generated_at: new Date().toISOString()
      })
      .eq('id', payload.poesia_id);

    if (dbError) throw dbError;

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        audio_url: signedUrl,
        expires_at: new Date(Date.now() + 3600000).toISOString()
      })
    };

  } catch (error) {
    console.error('Errore nella generazione audio:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Errore interno del server',
        details: error.message 
      })
    };
  }
};
