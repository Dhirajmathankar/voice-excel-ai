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
isChatbotOpen = false;

  toggleChatbot() {
    this.isChatbotOpen = !this.isChatbotOpen;
  }
}
