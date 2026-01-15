  import { Injectable } from '@angular/core';
  import { AI_KEYS } from '../../environments/iconfig';

  @Injectable({
    providedIn: 'root'
  })
  export class GeminiService {
    private apiKey = AI_KEYS.GEMINI_API_KEY;

    async parseCommand(prompt: string): Promise<string> {
      const url =
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' +
        this.apiKey;

      const body = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      };

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          throw new Error('Gemini API error: ' + response.statusText);
        }

        const data = await response.json();
        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
        return text;
      } catch (err: any) {
        console.error('Gemini API call failed:', err);
        return 'Error calling Gemini API';
      }
    }
  }
