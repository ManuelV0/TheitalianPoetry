const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Configurazione
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'uScy1bXtKz8vPzfdFsFw'; // Voce italiana ElevenLabs

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.theitalianpoetryproject.com',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
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

  // Verifica metodo HTTP
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Parsing del body
  let text, poesia_id;
  try {
    const body = JSON.parse(event.body);
    text = body.text;
    poesia_id = body.poesia_id;
    if (!text || !poesia_id) {
      throw new Error('Missing required fields');
    }
  } catch (err) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid request body' })
    };
  }

  try {
    // 1. Generazione audio con ElevenLabs (usa /stream!)
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
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
      let error = null;
      try { error = await ttsResponse.json(); } catch {}
      throw new Error(`ElevenLabs error: ${error?.detail || ttsResponse.statusText || 'Unknown error'}`);
    }

    // 2. Caricamento su Supabase Storage
    const audioBuffer = await ttsResponse.buffer();
    const fileName = `poesia-${poesia_id}-${Date.now()}.mp3`;

    const { error: uploadError } = await supabase.storage
      .from('poetry-audio')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // 3. Recupero URL pubblico
    const { data, error: urlError } = supabase
      .storage
      .from('poetry-audio')
      .getPublicUrl(fileName);

    if (urlError || !data?.publicUrl) {
      throw urlError || new Error("Unable to get public URL from Supabase");
    }
    const publicUrl = data.publicUrl;

    // 4. Aggiornamento database
    const { error: dbError } = await supabase
      .from('poesie')
      .update({
        audio_url: publicUrl,
        audio_generated: true,
        audio_generated_at: new Date().toISOString()
      })
      .eq('id', poesia_id);

    if (dbError) throw dbError;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ audio_url: publicUrl })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};
