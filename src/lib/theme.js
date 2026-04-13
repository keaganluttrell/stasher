import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const DEFAULT_THEME = 'night';

function createThemeStore() {
  const initial = browser
    ? localStorage.getItem('theme') || DEFAULT_THEME
    : DEFAULT_THEME;

  const { subscribe, set } = writable(initial);

  return {
    subscribe,
    set(value) {
      if (browser) {
        localStorage.setItem('theme', value);
      }
      set(value);
    }
  };
}

export const theme = createThemeStore();

export const THEMES = [
  'light', 'dark', 'cupcake', 'bumblebee', 'emerald', 'corporate',
  'synthwave', 'retro', 'cyberpunk', 'valentine', 'halloween', 'garden',
  'forest', 'aqua', 'lofi', 'pastel', 'fantasy', 'wireframe', 'black',
  'luxury', 'dracula', 'cmyk', 'autumn', 'business', 'acid', 'lemonade',
  'night', 'coffee', 'winter', 'dim', 'nord', 'sunset', 'terminal'
];
