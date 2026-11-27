// @ts-check
/** Petits outils : bornes, interpolations, hasard à graine, format des temps. */

/** @param {string} id */
export const $=id=>/** @type {HTMLElement} */(document.getElementById(id));
export const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
export const easeIn=(a,b,p)=>a+(b-a)*p*p,easeInOut=(a,b,p)=>a+(b-a)*(-Math.cos(p*Math.PI)/2+.5);
export const wrap=(s,max)=>{s%=max;return s<0?s+max:s};
export function rng(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
export const fmt=t=>{if(!isFinite(t))return'—';const m=Math.floor(t/60),s=t-m*60;return m+':'+(s<10?'0':'')+s.toFixed(2)};
