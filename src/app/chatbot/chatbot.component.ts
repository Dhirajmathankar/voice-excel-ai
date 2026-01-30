import { Component } from '@angular/core';
import { ChatService } from '../services/chat.service';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent {

  messages: any[] = [];

  userInput = '';

  userData: any = {
    name: '',
    email: '',
    mobile: ''
  };

  step = 1; // 1-name, 2-email, 3-mobile, 4-chat

  constructor(private chatService: ChatService) {
    this.botMessage('Hi 👋 Welcome! What is your name?');
  }

  send() {
    if (!this.userInput.trim()) return;

    this.userMessage(this.userInput);

    if (this.step === 1) {
      this.userData.name = this.userInput;
      this.step++;
      this.botMessage(`Nice to meet you ${this.userData.name} 😊. Please share your email.`);
    }
    else if (this.step === 2) {
      this.userData.email = this.userInput;
      this.step++;
      this.botMessage('Great 👍 Now enter your mobile number.');
    }
    else if (this.step === 3) {
      this.userData.mobile = this.userInput;
      this.step++;
      this.botMessage('🎉 Welcome! How can I help you today?');
    }
    else {
      this.sendToBackend(this.userInput);
    }

    this.userInput = '';
  }

  sendToBackend(message: string) {
    const payload = {
      ...this.userData,
      message
    };

    this.chatService.sendMessage(payload).subscribe({
      next: (res: any) => {
        this.botMessage(res.botReply || 'Thanks! We will contact you soon 😊');
      },
      error: () => {
        this.botMessage('❌ Something went wrong. Please try again later.');
      }
    });
  }

  botMessage(text: string) {
    this.messages.push({ sender: 'BOT', text });
  }

  userMessage(text: string) {
    this.messages.push({ sender: 'USER', text });
  }
}
