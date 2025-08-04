// netlify/functions/genera-audio.js

const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// --- CONFIGURAZIONE SUPABASE (Service Role Key NECESSARIA per scrivere!) ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Service Role Key (NON usare anon!)
);

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Solo POST ammesso' }),
    };
  }

  // Parsing body
  const { text, poesia_id } = JSON.parse(event.body || '{}');
  if (!text || !poesia_id) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Testo o ID poesia mancante' }),
    };
  }

  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  const VOICE_ID = 'uScy1bXtKz8vPzfdFsFw'; // Maschile, IT

  if (!ELEVENLABS_API_KEY) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Chiave API ElevenLabs mancante' }),
    };
  }

  try {
    // 1. Genera audio con ElevenLabs
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      return {
        statusCode: ttsResponse.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Errore dal servizio vocale', details: errorText }),
      };
    }

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

    // 2. Carica su Supabase Storage
    const fileName = `poesia-${poesia_id}-${Date.now()}.mp3`;
    const { error: uploadError } = await supabase
      .storage
      .from('poetry-audio')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Upload audio fallito', details: uploadError.message }),
      };
    }

    // 3. Ottieni l'URL pubblico
    const { publicURL } = supabase
      .storage
      .from('poetry-audio')
      .getPublicUrl(fileName);

    // 4. Aggiorna la tabella poesie
    const { error: updateError } = await supabase
      .from('poesie')
      .update({ audio_url: publicURL, audio_generated: true })
      .eq('id', poesia_id);

    // (puoi anche loggare updateError ma proseguiamo)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_url: publicURL }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Errore interno del server', details: error.message }),
    };
  }
};
