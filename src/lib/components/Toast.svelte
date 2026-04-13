<script>
  import { toast } from '$lib/stores/toast.js';
</script>

{#if $toast}
  <div class="toast-container" role="status" aria-live="polite">
    <div class="toast-message">
      {$toast}
    </div>
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    animation: toast-slide-up 0.2s ease;
    pointer-events: none;
  }

  @keyframes toast-slide-up {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(0.5rem);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .toast-message {
    font-family: 'Nunito', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    background: var(--color-base-200, #2a303c);
    border: 1px solid var(--color-base-300, #374151);
    color: var(--color-base-content, #a6adbb);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    white-space: nowrap;
  }
</style>
