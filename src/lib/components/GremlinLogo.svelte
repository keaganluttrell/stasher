<script>
  export let size = '32';
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 64 64"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  aria-label="Stasher gremlin mascot"
>
  <!-- Left ear (pointy, triangular) -->
  <path
    d="M10 28 L2 10 L18 22 Z"
    style="fill: var(--color-accent); stroke: var(--color-base-content); stroke-width: 1.5;"
  />
  <!-- Right ear (pointy, triangular) -->
  <path
    d="M54 28 L62 10 L46 22 Z"
    style="fill: var(--color-accent); stroke: var(--color-base-content); stroke-width: 1.5;"
  />

  <!-- Inner ear detail -->
  <path
    d="M11 25 L6 14 L17 23 Z"
    style="fill: var(--color-secondary); opacity: 0.6;"
  />
  <path
    d="M53 25 L58 14 L47 23 Z"
    style="fill: var(--color-secondary); opacity: 0.6;"
  />

  <!-- Head / face (rounded squarish shape) -->
  <ellipse
    cx="32" cy="34" rx="20" ry="18"
    style="fill: var(--color-primary); stroke: var(--color-base-content); stroke-width: 1.5;"
  />

  <!-- Left horn -->
  <path
    d="M20 18 L16 4 L24 15 Z"
    style="fill: var(--color-secondary); stroke: var(--color-base-content); stroke-width: 1;"
  />
  <!-- Right horn -->
  <path
    d="M44 18 L48 4 L40 15 Z"
    style="fill: var(--color-secondary); stroke: var(--color-base-content); stroke-width: 1;"
  />

  <!-- Eye whites (left) -->
  <ellipse
    cx="24" cy="31" rx="6" ry="6.5"
    style="fill: var(--color-base-100); stroke: var(--color-base-content); stroke-width: 1;"
  />
  <!-- Eye whites (right) -->
  <ellipse
    cx="40" cy="31" rx="6" ry="6.5"
    style="fill: var(--color-base-100); stroke: var(--color-base-content); stroke-width: 1;"
  />

  <!-- Pupils (left) — looking slightly to the side, mischievous -->
  <ellipse
    cx="26" cy="31.5" rx="3" ry="3.5"
    style="fill: var(--color-base-content);"
  />
  <!-- Pupils (right) -->
  <ellipse
    cx="42" cy="31.5" rx="3" ry="3.5"
    style="fill: var(--color-base-content);"
  />

  <!-- Pupil shine (left) -->
  <circle
    cx="27.5" cy="29.5" r="1.2"
    style="fill: var(--color-base-100);"
  />
  <!-- Pupil shine (right) -->
  <circle
    cx="43.5" cy="29.5" r="1.2"
    style="fill: var(--color-base-100);"
  />

  <!-- Eyebrows — raised mischievously, asymmetric -->
  <path
    d="M18 24 Q24 20 30 24"
    style="stroke: var(--color-base-content); stroke-width: 1.8; fill: none; stroke-linecap: round;"
  />
  <path
    d="M34 22 Q40 18 46 23"
    style="stroke: var(--color-base-content); stroke-width: 1.8; fill: none; stroke-linecap: round;"
  />

  <!-- Nose — small triangle -->
  <path
    d="M30 37 L32 34 L34 37 Z"
    style="fill: var(--color-accent); opacity: 0.7;"
  />

  <!-- Mouth — big cheeky grin -->
  <path
    d="M21 42 Q26 50 32 48 Q38 50 43 42"
    style="stroke: var(--color-base-content); stroke-width: 1.8; fill: none; stroke-linecap: round;"
  />

  <!-- Teeth — two little fangs poking down -->
  <path
    d="M26 43 L27 46 L28 43"
    style="fill: var(--color-base-100); stroke: var(--color-base-content); stroke-width: 0.8;"
  />
  <path
    d="M36 43 L37 46 L38 43"
    style="fill: var(--color-base-100); stroke: var(--color-base-content); stroke-width: 0.8;"
  />

  <!-- Cheek blush spots -->
  <circle
    cx="16" cy="38" r="3"
    style="fill: var(--color-accent); opacity: 0.25;"
  />
  <circle
    cx="48" cy="38" r="3"
    style="fill: var(--color-accent); opacity: 0.25;"
  />

  <!-- Spiky hair tufts on top -->
  <path
    d="M28 17 L30 8 L33 17"
    style="fill: var(--color-primary); stroke: var(--color-base-content); stroke-width: 0.8;"
  />
  <path
    d="M33 16 L36 6 L38 16"
    style="fill: var(--color-primary); stroke: var(--color-base-content); stroke-width: 0.8;"
  />
</svg>
