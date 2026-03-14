import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function load() {
  if (!browser) return { owner: '', repo: '', branch: 'main', token: '', clientId: '' };
  return {
    owner: localStorage.getItem('gh_owner') || '',
    repo: localStorage.getItem('gh_repo') || '',
    branch: localStorage.getItem('gh_branch') || 'main',
    token: localStorage.getItem('gh_token') || '',
    clientId: localStorage.getItem('gh_client_id') || ''
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
        localStorage.setItem('gh_client_id', value.clientId || '');
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
          localStorage.setItem('gh_client_id', next.clientId || '');
        }
        return next;
      });
    }
  };
}

export const config = createConfigStore();
