import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './lib/supabaseClient';

// --- AUDIO PLAYER WITH HIGHLIGHT ---
const AudioPlayerWithHighlight = ({ 
  content, 
  audioUrl,
  onClose
}: {
  content: string,
  audioUrl: string,
  onClose: () => void
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const words = content.split(/\s+/);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Inizializza l'audio e il riconoscimento del testo
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (!audioRef.current) return;
      
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      const progress = currentTime / duration;
      const wordIndex = Math.floor(progress * words.length);
      
      setCurrentWordIndex(Math.min(wordIndex, words.length - 1));
      
      // Scroll to the current word
      wordRefs.current[wordIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.pause();
    };
  }, [audioUrl, words.length]);

  const togglePlayback = async () => {
    if (!audioRef.current) return;
    
    try {
      if (isPlaying) {
        await audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } catch (err) {
      console.error('Playback error:', err);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentWordIndex(-1);
    onClose();
  };

  return (
    <div className="audio-player-modal">
      <div className="audio-controls">
        <button onClick={togglePlayback} className="play-button">
          {isPlaying ? '⏸ Pausa' : '▶️ Riproduci'}
        </button>
        <button onClick={handleStop} className="stop-button">
          ⏹ Stop
        </button>
      </div>
      
      <div className="content-highlight">
        {words.map((word, index) => (
          <span 
            key={index}
            ref={el => wordRefs.current[index] = el}
            className={`word ${currentWordIndex === index ? 'highlight' : ''} ${
              Math.abs(currentWordIndex - index) < 3 ? 'glow' : ''
            }`}
          >
            {word}{' '}
          </span>
        ))}
      </div>
    </div>
  );
};

// --- POESIA BOX COMPONENT (modificato) ---
const PoesiaBox = ({ poesia }: { poesia: any }) => {
  const [aperta, setAperta] = useState(false);
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState(poesia.audio_url || null);

  // ... (altri stati e funzioni rimangono uguali)

  return (
    <div className={`poesia-box${aperta ? ' aperta' : ''}`}>
      {/* ... (header e altri elementi rimangono uguali) ... */}
      
      {aperta && (
        <div className="contenuto">
          {audioModalOpen && audioUrl ? (
            <AudioPlayerWithHighlight 
              content={poesia.content} 
              audioUrl={audioUrl}
              onClose={() => setAudioModalOpen(false)}
            />
          ) : (
            <>
              <pre>{poesia.content}</pre>
              
              <div className="audio-section">
                {audioUrl ? (
                  <button 
                    onClick={() => setAudioModalOpen(true)}
                    className="listen-button"
                  >
                    🎧 Ascolta con highlight
                  </button>
                ) : (
                  <button
                    onClick={handleGeneraAudio}
                    disabled={loadingAudio}
                  >
                    {loadingAudio ? "Generazione..." : "🎙️ Genera audio"}
                  </button>
                )}
              </div>
              
              {/* ... (analisi sections rimangono uguali) ... */}
            </>
          )}
        </div>
      )}
    </div>
  );
};
