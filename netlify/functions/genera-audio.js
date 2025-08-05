// netlify/functions/genera-audio.js

const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// --- CONFIGURAZIONE SUPABASE (SERVICE KEY necessaria!) ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'uScy1bXtKz8vPzfdFsFw'; // Voce italiana maschile ElevenLabs

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY
);

exports.handler = async function(event, context) {
  console.log('🟠 [genera-audio] Function CALLED!');
  console.log('🟡 Method:', event.httpMethod);
  console.log('🟡 Headers:', event.headers);
  console.log('🟡 Body:', event.body);

  if (event.httpMethod !== 'POST') {
    console.log('🔴 Solo POST ammesso!');
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Solo POST ammesso' }),
    };
  }

  if (!SUPABASE_URL) console.error('❌ SUPABASE_URL mancante!');
  if (!SUPABASE_SERVICE_KEY) console.error('❌ SUPABASE_SERVICE_ROLE_KEY mancante!');
  if (!ELEVENLABS_API_KEY) console.error('❌ ELEVENLABS_API_KEY mancante!');

  let text, poesia_id;
  try {
    ({ text, poesia_id } = JSON.parse(event.body || '{}'));
    console.log('🟢 text:', text);
    console.log('🟢 poesia_id:', poesia_id);
  } catch (err) {
    console.error('❌ Errore parsing body:', err);
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Body non valido' }),
    };
  }

  if (!text || !poesia_id) {
    console.error('❌ Testo o ID poesia mancante!');
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Testo o ID poesia mancante' }),
    };
  }

  if (!ELEVENLABS_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Configurazione server incompleta (env missing)');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Configurazione server incompleta (env missing)' }),
    };
  }

  try {
    // 1. Richiesta TTS a ElevenLabs
    console.log('🟡 Invio richiesta TTS a ElevenLabs...');
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
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
      const errorText = await ttsResponse.text();
      console.error('❌ Errore ElevenLabs:', errorText);
      return {
        statusCode: ttsResponse.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Errore dal servizio vocale', details: errorText }),
      };
    }
    console.log('🟢 ElevenLabs risposta OK');

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    console.log('🟢 Audio buffer generato, lunghezza:', audioBuffer.length);

    // 2. Carica su Supabase Storage
    const fileName = `poesia-${poesia_id}-${Date.now()}.mp3`;
    console.log('🟡 Upload audio su Supabase:', fileName);

    const { error: uploadError } = await supabase
      .storage
      .from('poetry-audio')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Errore upload Supabase:', uploadError.message);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Upload audio fallito', details: uploadError.message }),
      };
    }

    // 3. Ottieni URL pubblico del file caricato
    const { data: { publicUrl }, error: urlError } = supabase
      .storage
      .from('poetry-audio')
      .getPublicUrl(fileName);

    console.log('🟢 Public URL generato:', publicUrl);

    if (urlError || !publicUrl) {
      console.error('❌ Errore publicUrl Supabase:', urlError?.message);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'URL pubblico non trovato', details: urlError?.message }),
      };
    }

    // 4. Aggiorna la tabella poesie
    const { error: updateError } = await supabase
      .from('poesie')
      .update({ audio_url: publicUrl, audio_generated: true })
      .eq('id', poesia_id);

    if (updateError) {
      console.error('❌ Errore update DB:', updateError.message);
    } else {
      console.log('🟢 Aggiornamento DB avvenuto con successo');
    }

    // Successo finale!
    console.log('🟢 Funzione completata con successo!');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_url: publicUrl }),
    };

  } catch (error) {
    console.error('❌ Errore generale:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Errore interno del server', details: error.message }),
    };
  }
};
