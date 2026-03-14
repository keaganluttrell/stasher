import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const KEYS = ['gh_owner', 'gh_repo', 'gh_branch', 'gh_token'];

function load() {
  if (!browser) return { owner: '', repo: '', branch: 'main', token: '' };
  return {
    owner: localStorage.getItem('gh_owner') || '',
    repo: localStorage.getItem('gh_repo') || '',
    branch: localStorage.getItem('gh_branch') || 'main',
    token: localStorage.getItem('gh_token') || ''
  };
}

function createConfigStore() {
  const { subscribe, set, update } = writable(load());

  return {
    subscribe,
    set(value) {
      if (browser) {
        localStorage.setItem('gh_owner', value.owner);
        localStorage.setItem('gh_repo', value.repo);
        localStorage.setItem('gh_branch', value.branch);
        localStorage.setItem('gh_token', value.token);
      }
      set(value);
    },
    update(fn) {
      update((current) => {
        const next = fn(current);
        if (browser) {
          localStorage.setItem('gh_owner', next.owner);
          localStorage.setItem('gh_repo', next.repo);
          localStorage.setItem('gh_branch', next.branch);
          localStorage.setItem('gh_token', next.token);
        }
        return next;
      });
    }
  };
}

export const config = createConfigStore();
