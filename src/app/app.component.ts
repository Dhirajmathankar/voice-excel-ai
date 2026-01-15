import { Component, NgZone } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_KEYS } from '../environments/iconfig';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  liveLine: string = '';
  finalTranscript: string = '';
  recognition: any;
  isListening: boolean = false;
  lastSpeechAgoSec: number | null = null;
  language: string = 'en-US';

  aiResponse: string = '';  // Gemini ka response
  aiType: 'text' | 'code' | 'other' | null = null;

  genAI: any;
  model: any;
  aiBlocks
: { type: string, content: string }[] = [];

  constructor(private ngZone: NgZone) {
    // Gemini init
    this.genAI = new GoogleGenerativeAI(AI_KEYS.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

//   toggleListening() {
//     if (this.isListening) {
//       this.stopListening();
//     } else {
//       this.startListening();
//     }
//   }

//   startListening() {
//     const SpeechRecognition =
//       (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

//     if (!SpeechRecognition) {
//       alert('Speech Recognition not supported in this browser.');
//       return;
//     }

//     this.recognition = new SpeechRecognition();
//     this.recognition.continuous = true;
//     this.recognition.interimResults = true;
//     this.recognition.lang = this.language;

//     this.recognition.onresult = (event: any) => {
//       let interim = '';
//       let final = '';

//       for (let i = event.resultIndex; i < event.results.length; ++i) {
//         const transcript = event.results[i][0].transcript;
//         if (event.results[i].isFinal) {
//           final += transcript + ' ';
//         } else {
//           interim += transcript + ' ';
//         }
//       }

//       this.ngZone.run(() => {
//         this.liveLine = interim;
//         this.finalTranscript += final;
//       });

//       if (final.trim()) {
//         this.sendToGemini(final.trim());
//       }
//     };

//     this.recognition.onend = () => {
//       if (this.isListening) this.recognition.start();
//     };

//     this.recognition.start();
//     this.isListening = true;
//   }

//   stopListening() {
//     if (this.recognition) {
//       this.recognition.stop();
//     }
//     this.isListening = false;
//   }

//   async sendToGemini(query: string) {
//     try {
//       const result = await this.model.generateContent(query);
//       const response = await result.response;
//       const text = response.text();

//       this.ngZone.run(() => {
//         // Check content type
//         if (text.startsWith("```")) {
//           this.aiType = "code";
//         } else if (text.includes("http") && (text.includes(".png") || text.includes(".jpg"))) {
//           this.aiType = "other";
//         } else {
//           this.aiType = "text";
//         }
//         this.aiResponse = text;
//         this.aiBlocks = this.parseAiResponse(text);
//       });

//       this.speak(text);
//     } catch (err) {
//       console.error("Gemini error:", err);
//     }
//   }

//   parseAiResponse(raw: string) {
//   const blocks: { type: string, content: string }[] = [];
//   const lines = raw.split('\n');

//   let currentBlock: { type: string, content: string } | null = null;

//   for (let line of lines) {
//     if (line.trim().startsWith('```')) {
//       // toggle code block
//       if (currentBlock && currentBlock.type === 'code') {
//         // close existing code block
//         blocks.push(currentBlock);
//         currentBlock = null;
//       } else {
//         // start new code block
//         currentBlock = { type: 'code', content: '' };
//       }
//       continue;
//     }

//     if (currentBlock && currentBlock.type === 'code') {
//       currentBlock.content += line + '\n';
//     } else {
//       // normal text line
//       if (line.trim() === '') continue;
//       blocks.push({ type: 'text', content: line });
//     }
//   }

//   if (currentBlock) {
//     blocks.push(currentBlock);
//   }

//   return blocks;
// }

//   speak(text: string) {
//     if ('speechSynthesis' in window) {
//       const utterance = new SpeechSynthesisUtterance(text);
//       utterance.lang = 'en-US';
//       speechSynthesis.speak(utterance);
//     }
//   }

//   hasAnyText() {
//     return this.finalTranscript.trim().length > 0;
//   }

//   copyTranscript() {
//     navigator.clipboard.writeText(this.finalTranscript);
//   }

//   downloadTranscript() {
//     const blob = new Blob([this.finalTranscript], { type: 'text/plain' });
//     const url = window.URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = 'transcript.txt';
//     a.click();
//     window.URL.revokeObjectURL(url);
//   }

//   clearTranscript() {
//     this.finalTranscript = '';
//     this.liveLine = '';
//   }
}
