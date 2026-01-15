declare module 'luckysheet';

declare global {
  interface Window {
    luckysheet: any; // या proper type अगर आप के पास हो
  }
}

export {};