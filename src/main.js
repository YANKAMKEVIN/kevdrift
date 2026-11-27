// @ts-check
/** Point d'entrée : démarrage et boucle de jeu. */
import { $ } from './util.js';
import { RIVALS, STEP, TRACKS, TURBO, VERSION } from './config.js';
import { sel } from './save.js';
import { buildSprites, carSet } from './sprites.js';
import { loadArt, tintedRival } from './art.js';
import { P, etat } from './state.js';
import { engineUpdate } from './audio.js';
import { attract, gauge, hud, startRace } from './ui.js';
import { progress, update } from './race.js';
import { render, resize } from './render.js';
import './input.js';

for(let i=0;i<16;i++)gauge.appendChild(document.createElement('i'));
function frame(now){
 const dt=Math.min(.1,(now-etat.last)/1000);etat.last=now;etat.acc+=dt*TURBO;etat.fc++;etat.ft+=dt;if(etat.ft>1){etat.fpsv=etat.fc;etat.fc=0;etat.ft=0}
 while(etat.acc>=STEP){update(STEP);etat.acc-=STEP}
 render();hud();if(etat.AC)engineUpdate();
 requestAnimationFrame(frame);
}
/** @type {any} */(window).__kd=()=>({state:etat.state,pos:etat.pos,lap:etat.lap,raceT:etat.raceT,speed:Math.round(P.speed),x:P.x,rank:1+etat.rivals.filter(r=>r.d>progress()).length,boost:P.boostT,charge:P.charge,drift:P.drift,fps:etat.fpsv});
etat.rivalImgs=RIVALS.map(r=>carSet(r[1],r[2]));
/** Bolides peints : chaque rival reçoit le bolide générique repeint à sa couleur. */
const artReady=loadArt().then(n=>{RIVALS.forEach((r,k)=>{const c=tintedRival(r[1]);if(c)etat.rivalImgs[k]=[c,c,c,c,c]});/** @type {any} */(window).__kdArt=n});
$('ver').textContent='v'+VERSION;
resize();
const boot=()=>{attract();
 if(location.hash==='#demo'){sel.track=0;startRace();P.x=0;}
 if(location.hash==='#demo2'||location.hash==='#demo3'){sel.track=location.hash==='#demo2'?1:2;buildSprites(TRACKS[sel.track]);startRace()}
 requestAnimationFrame(frame)};
Promise.all([document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve(),artReady]).then(boot,boot);
