import { Component } from '@angular/core';
import { TourService } from '../tour/tour.service';

@Component({
  selector: 'app-command-center',
  templateUrl: './command-center.component.html',
  styleUrls: ['./command-center.component.css']
})
export class CommandCenterComponent {
  isOpen = false;
  activeTab: 'commands' | 'instructions' = 'commands';

  // Structured Command Data
 categories = [
  /* ================= Writing & Data ================= */
  {
    name: 'Writing & Data',
    icon: 'fa-pen-to-square',
    items: [
      { en: 'Write "Revenue" in A1', hi: 'A1 mein "Revenue" likho' },
      { en: 'Put 500 in B2', hi: 'B2 par 500 daalo' },
      { en: 'Clear contents of C3', hi: 'C3 ka data clear karo' }
    ]
  },

  /* ================= Formatting ================= */
  {
    name: 'Formatting',
    icon: 'fa-palette',
    items: [
      { en: 'Make A1 bold', hi: 'A1 ko bold karo' },
      { en: 'Italic B2', hi: 'B2 ko italic karo' },
      { en: 'Underline C3', hi: 'C3 ko underline karo' },
      { en: 'Color C5 background green', hi: 'C5 ka background hara karo' },
      { en: 'Center align A1', hi: 'A1 ko center align karo' }
    ]
  },

  /* ================= Navigation (NEW) ================= */
  {
    name: 'Navigation',
    icon: 'fa-arrows-up-down-left-right',
    items: [
      { en: 'Go right', hi: 'Daaye jao' },
      { en: 'Go left', hi: 'Baaye jao' },
      { en: 'Go up', hi: 'Upar jao' },
      { en: 'Go down', hi: 'Neeche jao' },
      { en: 'Move to next cell', hi: 'Agla cell kholo' },
      { en: 'Move to previous cell', hi: 'Pichhla cell kholo' }
    ]
  },

  /* ================= Rows & Columns ================= */
  {
    name: 'Rows & Columns',
    icon: 'fa-table-cells',
    items: [
      { en: 'Insert row above', hi: 'Upar row daalo' },
      { en: 'Insert column left', hi: 'Baaye column daalo' },
      { en: 'Delete selected row', hi: 'Selected row hatao' },
      { en: 'Delete selected column', hi: 'Selected column hatao' }
    ]
  },

  /* ================= Advanced Math ================= */
  {
    name: 'Advanced Math',
    icon: 'fa-calculator',
    items: [
      { en: 'Calculate sum from A1 to A10', hi: 'A1 se A10 ka jod nikalo' },
      { en: 'Average of column B', hi: 'Column B ka average nikalo' },
      { en: 'Find maximum in C column', hi: 'Column C ka maximum nikalo' }
    ]
  }
];


  constructor(private tourService: TourService) {}

  open() { this.isOpen = true; }
  close() { this.isOpen = false; }

  runTour() {
    this.close();
    this.tourService.startTour();
  }
}