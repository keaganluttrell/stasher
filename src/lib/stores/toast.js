import { writable } from 'svelte/store';

export const toast = writable(null);

let timer = null;

export function showToast(message, duration = 2000) {
  if (timer) clearTimeout(timer);
  toast.set(message);
  timer = setTimeout(() => {
    toast.set(null);
    timer = null;
  }, duration);
}
