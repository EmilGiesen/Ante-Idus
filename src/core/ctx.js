// Globaler Spielkontext. Wird in game.js befüllt; Systeme greifen darüber auf Zustand und Welt zu.
export const G = {
  data: null,      // geladene JSON-Daten
  state: null,     // serialisierbarer Spielzustand
  game: null,      // Game-Instanz
  ui: null,        // UI-Manager
  input: null,
};
