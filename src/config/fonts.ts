/**
 * List of available font names.
 * This array is used to generate dynamic font classes (e.g., `font-inter`).
 *
 * How to Add a New Font (Tailwind v4+):
 * 1. Add the font name here.
 * 2. Update the `<link>` tag in 'index.html' to include the new font from Google Fonts (or any other source).
 * 3. Add the new font family to 'theme.css' using `@theme inline` and `font-family` CSS variable.
 *
 * Example:
 * fonts.ts           -> Add 'roboto' to this array.
 * index.html         -> Add Google Fonts link for Roboto.
 * theme.css          -> Add the new font in the CSS, e.g.:
 *   @theme inline {
 *      // ... other font families
 *      --font-roboto: 'Roboto', var(--font-sans);
 *   }
 */
export const fonts = ['inter'] as const
