// src/openai.ts

export async function fetchOpenAIChatCompletion(messages: any[]) {
  const apiKey = import.meta.env.VITE_OPENAI_KEY;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",    // Usa qui il modello che preferisci
      messages,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    throw new Error("Errore nella richiesta a OpenAI: " + response.statusText);
  }

  return response.json();
}
