/** Accès au DOM. */

/** Élément par identifiant (le HTML est fixe : il existe toujours). */
export const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

/** Crée un élément avec une classe et un texte. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
