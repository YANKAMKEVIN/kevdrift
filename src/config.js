// @ts-check
/** Constantes, circuits, voitures, rivaux : données sans logique. */

export const SEG=200,RW=2000,CAMH=1000,FOV=100,CAMD=1/Math.tan(FOV/2*Math.PI/180);
export const PZ=CAMH*CAMD;
// distance caméra -> voiture du joueur
export const STEP=1/60,MAXS=SEG/STEP,ACC=MAXS/5,BRAKE=MAXS,DECEL=MAXS/5,OFFDECEL=MAXS/1.6,OFFLIM=MAXS/4;
/** Charge de drift (secondes pondérées) pour les boosts de niveau 1, 2 et 3. */
export const DRIFT=[.7,1.5,2.6];
/** Durée de chaque niveau de boost (s). */
export const BOOST_TIME=[0,.7,1.2,1.9];
export const VERSION='1.1.0';
const Q=typeof location!=='undefined'?new URLSearchParams(location.search):new URLSearchParams();
/** ?robot : la voiture se pilote seule (partie jouée par la CI). ?turbo=N : N fois plus vite. */
export const ROBOT=Q.has('robot');
export const TURBO=Math.max(1,Math.min(20,Number(Q.get('turbo'))||1));
export const CARW=520,CARU=CARW/RW,LAPS=3;
export const DEMO=typeof location!=='undefined'&&location.hash.startsWith('#demo');
// ================== CIRCUITS ==================
export const TRACKS=[
 {name:'Néon Boulevard',sub:'Mégapole de minuit · facile',diff:1,song:0,seed:11,
  sky:['#05010f','#1d0638','#5a0f5c','#ff2a8a'],sun:['#fff27a','#ff9a3c','#ff2a8a'],sunR:.2,
  ground:'#0b0318',ground2:'#0e041f',grid:'#ff2bd6',road:'#140a26',road2:'#180c2e',edge:'#ff2bd6',rumble:'#19f0ff',lane:'#7ff8ff',fog:'#3a0b45',fogK:1.15,
  mount:{fill:['#2a0a4a','#0b0318'],line:'#ff4fd8',kind:'city'},deco:'city',
  layout:[[120,0,0],[160,2,0],[120,0,15],[220,-3,0],[140,0,-15],[240,4,30],[100,0,0],[220,-2,-30],[160,5,0],[160,-5,0],[200,0,25],[240,-3,-25],[180,3,0],[140,0,0]]},
 {name:'Dunes de Chrome',sub:'Désert électrique · moyen',diff:1.045,song:1,seed:27,
  sky:['#0a0220','#3b0b5e','#c2186b','#ff9a3c'],sun:['#fff7a8','#ffb13c','#ff3d6e'],sunR:.26,
  ground:'#170722',ground2:'#1c0928',grid:'#ff8a3c',road:'#1a0b24',road2:'#200e2c',edge:'#ff8a3c',rumble:'#ffd23f',lane:'#ffe08a',fog:'#6a1a4a',fogK:1.05,
  mount:{fill:['#4a0f5a','#170722'],line:'#ffb13c',kind:'mesa'},deco:'desert',
  layout:[[120,0,0],[200,-3,20],[160,4,-20],[120,0,40],[200,-6,0],[160,0,-40],[200,5,20],[220,-4,-20],[140,6,30],[160,0,-30],[240,-5,0],[160,3,25],[160,-3,-25],[140,0,0]]},
 {name:'Anneau Orbital',sub:'Autoroute stellaire · difficile',diff:1.085,song:2,seed:42,
  sky:['#000005','#020322','#0a1446','#1b6b8a'],sun:['#e9fbff','#66e0ff','#5a3cff'],sunR:.24,
  ground:'#02040f',ground2:'#030617',grid:'#19f0ff',road:'#0a0f24',road2:'#0d132c',edge:'#3dff9a',rumble:'#19f0ff',lane:'#b6fff0',fog:'#0a1a3a',fogK:1.0,
  mount:{fill:['#0a1446','#02040f'],line:'#19f0ff',kind:'space'},deco:'space',
  layout:[[120,0,0],[180,5,30],[140,-6,-30],[160,0,50],[200,6,0],[200,-6,-50],[120,0,0],[220,4,40],[180,-5,-40],[160,6,20],[160,-6,-20],[200,3,35],[200,-4,-35],[120,0,0]]}
];
export const CARS=[
 {name:'Lame Rose',sub:'Équilibrée, idéale pour débuter',col:'#ff2bd6',col2:'#7a1fff',top:1.04,accel:1.05,hand:1.0,stats:[4,3,3]},
 {name:'Spectre Cyan',sub:'Agile, drifts redoutables',col:'#19f0ff',col2:'#1b4dff',top:1.0,accel:1.1,hand:1.25,stats:[3,4,5]},
 {name:'Comète Or',sub:'Vitesse pure, plus dure à tenir',col:'#ffd23f',col2:'#ff6a00',top:1.1,accel:.92,hand:.85,stats:[5,2,2]}
];
export const RIVALS=[['VOLT','#3dff9a','#0a8f5a'],['NOVA','#ff5a5a','#8f0a2a'],['ZÉRO','#ffffff','#5a5a8f'],['ÉCHO','#b06cff','#4a1a9f'],['RUSH','#ff9a3c','#8f3a0a'],['FLUX','#4d8bff','#0a2a8f'],['KIRA','#ff6ad5','#8f0a6a']];
export const BOOSTC=['#ffffff','#19f0ff','#ff2bd6','#ffd23f'];
