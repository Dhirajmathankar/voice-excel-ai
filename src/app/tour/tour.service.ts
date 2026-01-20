import { Injectable } from '@angular/core';
import Shepherd from 'shepherd.js';


@Injectable({
  providedIn: 'root'
})
export class TourService {

  private tour!: Shepherd.Tour;

  startTour() {
    this.tour = new Shepherd.Tour({
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        scrollTo: { behavior: 'smooth', block: 'center' },
        classes: 'mittra-tour'
      }
    });

    this.tour.addStep({
      id: 'welcome',
      text: '👋 Welcome to Mittra Sheet – your voice-powered spreadsheet',
      buttons: [
        { text: 'Skip', action: this.tour.cancel },
        { text: 'Start', action: this.tour.next }
      ]
    });

    this.tour.addStep({
      id: 'sheet',
      attachTo: {
        element: '.luckysheet-grid',
        on: 'top'
      },
      text: 'This is your spreadsheet area',
      buttons: [{ text: 'Next', action: this.tour.next }]
    });

    this.tour.addStep({
      id: 'voice',
      attachTo: {
        element: '#startVoiceBtn',
        on: 'bottom'
      },
      text: 'Click here and speak commands like "bold this cell"',
      buttons: [{ text: 'Finish', action: this.tour.complete }]
    });

    this.tour.start();
  }
}
