import { writable } from 'svelte/store';

const defaultState = {
  editing: false,
  canEdit: false,
  startEdit: () => {},
  save: () => {},
  cancelEdit: () => {}
};

export const editorState = writable({ ...defaultState });

export function resetEditorState() {
  editorState.set({ ...defaultState });
}
