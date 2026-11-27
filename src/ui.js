// @ts-check
/** Écrans (titre, grille de départ, pause, résultats) et tableau de bord. */
import { $, fmt, wrap } from './util.js';
import { BOOSTC, CARS, LAPS, MAXS, TRACKS } from './config.js';
import { sel, store } from './save.js';
import { P, etat, inp, fx } from './state.js';
import { buildSprites, carSprite, carSet, mk } from './sprites.js';
import { progress, resetRace , driftLevel } from './race.js';
import { initAudio, setSong, sfx } from './audio.js';

// ================== MENUS ==================
const screens=['sTitle','sSelect','sPause','sResult'];
function show(id){screens.forEach(s=>$(s).classList.toggle('on',s===id))}
function thumb(ti){const t=TRACKS[ti],[c,g]=mk(300,130);const gr=g.createLinearGradient(0,0,0,70);t.sky.forEach((col,i)=>gr.addColorStop(i/(t.sky.length-1),col));g.fillStyle=gr;g.fillRect(0,0,300,70);
 const sg=g.createLinearGradient(0,20,0,70);sg.addColorStop(0,t.sun[0]);sg.addColorStop(1,t.sun[2]);g.fillStyle=sg;g.beginPath();g.arc(150,70,40,Math.PI,0);g.fill();
 g.fillStyle=t.ground;g.fillRect(0,70,300,60);g.strokeStyle=t.grid;g.globalAlpha=.6;for(let i=-10;i<=10;i++){g.beginPath();g.moveTo(150+i*6,70);g.lineTo(150+i*60,130);g.stroke()}for(let y=74;y<130;y+=(y-66)*.5){g.beginPath();g.moveTo(0,y);g.lineTo(300,y);g.stroke()}
 g.globalAlpha=1;g.fillStyle=t.road;g.beginPath();g.moveTo(146,70);g.lineTo(154,70);g.lineTo(230,130);g.lineTo(70,130);g.fill();g.strokeStyle=t.edge;g.lineWidth=3;g.beginPath();g.moveTo(146,70);g.lineTo(70,130);g.moveTo(154,70);g.lineTo(230,130);g.stroke();return c}
function buildMenus(){
 const tr=$('trackRow');tr.innerHTML='';TRACKS.forEach((t,i)=>{const b=document.createElement('button');b.className='card'+(i===sel.track?' sel':'');const best=store.get('best'+i,null);
  b.appendChild(thumb(i));const n=document.createElement('div');n.className='n';n.textContent=t.name;const s=document.createElement('div');s.className='s';s.textContent=t.sub;const r=document.createElement('div');r.className='s';r.textContent='Record : '+(best?fmt(best):'—');
  b.append(n,s,r);b.onclick=()=>{sel.track=i;store.set('track',i);sfx('click');buildMenus()};tr.appendChild(b)});
 const cr=$('carRow');cr.innerHTML='';CARS.forEach((c,i)=>{const b=document.createElement('button');b.className='card'+(i===sel.car?' sel':'');const[cc,g]=mk(300,130);const bg=g.createLinearGradient(0,0,0,130);bg.addColorStop(0,'#1a0838');bg.addColorStop(1,'#05010f');g.fillStyle=bg;g.fillRect(0,0,300,130);
  g.drawImage(carSprite(c.col,c.col2,0),60,18,180,107);b.appendChild(cc);const n=document.createElement('div');n.className='n';n.style.color=c.col;n.textContent=c.name;const s=document.createElement('div');s.className='s';s.textContent=c.sub;b.append(n,s);
  ['Vitesse','Accélération','Maniabilité'].forEach((l,k)=>{const d=document.createElement('div');d.className='stat';d.innerHTML='<span>'+l+'</span><div class="bar"><i style="width:'+c.stats[k]*20+'%"></i></div>';b.appendChild(d)});
  b.onclick=()=>{sel.car=i;store.set('car',i);sfx('click');buildMenus()};cr.appendChild(b)});
 const mt='Musique : '+(etat.musicOn?'oui':'non');$('bMusic').textContent=mt;$('bMusic2').textContent=mt;
}
export function toggleMusic(){etat.musicOn=!etat.musicOn;store.set('music',etat.musicOn);if(etat.musicG)etat.musicG.gain.setTargetAtTime(etat.musicOn?.55:0,etat.AC.currentTime,.1);buildMenus()}
export function goSelect(){initAudio();sfx('click');setSong(3);buildMenus();show('sSelect')}
export function startRace(){
 buildSprites(TRACKS[sel.track]);initAudio();sfx('click');resetRace();show(null);$('hud').classList.add('on');$('touch').classList.toggle('on',etat.touchMode);
 const pg=$('hProg');pg.innerHTML='';[...etat.rivals.map(r=>r.col),CARS[sel.car].col].forEach((c,k)=>{const d=document.createElement('i');d.style.background=c;d.style.color=c;if(k===7){d.style.zIndex='2';d.style.width=d.style.height='16px';d.style.top='-5px';d.style.marginLeft='-8px';d.style.border='2px solid #fff'}pg.appendChild(d)});
 etat.state='countdown';etat.cd=3.999;etat.lastCd=4;setSong(TRACKS[sel.track].song);
}
export function pause(){if(etat.state!=='race'&&etat.state!=='countdown')return;etat.prevState=etat.state;etat.state='pause';show('sPause');$('touch').classList.remove('on');for(const k in inp)inp[k]=false}
export function resume(){etat.state=etat.prevState;show(null);$('touch').classList.toggle('on',etat.touchMode);sfx('click')}
function quit(){etat.state='title';$('hud').classList.remove('on');$('touch').classList.remove('on');attract();show('sTitle');setSong(3)}
$('bPlay').onclick=goSelect;
$('bBack').onclick=()=>{sfx('click');show('sTitle')};
$('bStart').onclick=startRace;
$('bMusic').onclick=toggleMusic;
$('bMusic2').onclick=toggleMusic;
$('bResume').onclick=resume;
$('bRestart').onclick=startRace;
$('bQuit').onclick=quit;
$('pauseBtn').onclick=()=>{initAudio();pause()};
$('bMenu').onclick=()=>{quit();goSelect()};
$('bAgain').onclick=startRace;
$('bNext').onclick=()=>{sel.track=(sel.track+1)%TRACKS.length;store.set('track',sel.track);startRace()};
function bigMsg(t,col){const m=$('msg');m.textContent=t;m.style.color=col||'#fff';m.classList.remove('pop');void m.offsetWidth;m.classList.add('pop')}
function toast(t,col){const m=$('toast');m.textContent=t;m.style.color=col;m.style.textShadow='0 0 18px '+col;m.classList.remove('pop');void m.offsetWidth;m.classList.add('pop')}
function flash(a){const f=$('flash');f.style.transition='none';f.style.opacity=a;requestAnimationFrame(()=>{f.style.transition='opacity .35s';f.style.opacity='0'})}
export const gauge=$('hGauge');
function showResults(){
 const r=P.finalRank||8;$('rPlace').textContent=r+(r===1?'er':'e');$('rVerdict').textContent=r===1?'VICTOIRE ÉCLATANTE':r<=3?'SUR LE PODIUM':r<=5?'PAS MAL, ENCORE UN EFFORT':'LA REVANCHE T’ATTEND';
 const rows=[['Temps total',fmt(P.finalT)],['Meilleur tour',fmt(etat.bestLap)],...etat.lapTimes.map((t,i)=>['Tour '+(i+1),fmt(t)]),['Machine',CARS[sel.car].name]];
 const tb=$('rTable');tb.innerHTML='';rows.forEach(([a,b])=>{const tr=document.createElement('tr');const t1=document.createElement('td');t1.textContent=a;const t2=document.createElement('td');t2.textContent=b;tr.append(t1,t2);tb.appendChild(tr)});
 $('rRec').textContent=P.newRec?'★ Nouveau record sur '+TRACKS[sel.track].name+' !':'';$('hud').classList.remove('on');$('touch').classList.remove('on');show('sResult');
}
export function hud(){
 if(etat.state!=='race'&&etat.state!=='countdown'&&etat.state!=='finish')return;
 const rank=etat.state==='finish'?P.finalRank:1+etat.rivals.filter(r=>r.d>progress()).length;
 setT('hPos',rank+'<small>/8</small>',true);setT('hLap','TOUR '+Math.min(etat.lap+1,LAPS)+'/'+LAPS);
 setT('hTime',fmt(etat.raceT));setT('hLapT','Tour '+fmt(etat.lapT));setT('hBest','Meilleur tour '+fmt(etat.bestLap));
 const kmh=Math.round(P.speed/MAXS*290);setT('hKmh',kmh+'<small>KM/H</small>',true);
 const on=Math.round(P.speed/(MAXS*1.35)*16);const gs=/** @type {any} */(gauge.children);for(let i=0;i<16;i++){const c=i<on?(i>=12?'#ffd23f':i>=8?'#ff2bd6':'#19f0ff'):'rgba(255,255,255,.1)';if(gs[i]._c!==c){gs[i].style.background=c;gs[i]._c=c}}
 const ch=P.drift?P.charge:0,lvl=driftLevel(ch);const db=$('hDrift');db.style.width=Math.min(100,ch/2.6*100)+'%';db.style.background=lvl?BOOSTC[lvl]:'#8a7ab8';
 const dots=/** @type {any} */($('hProg').children);const all=[...etat.rivals.map(r=>r.d),progress()];all.forEach((d,i)=>{dots[i].style.left=(wrap(d,etat.trackLen)/etat.trackLen*100)+'%'});
}
const hc={};
function setT(id,v,html){if(hc[id]===v)return;hc[id]=v;if(html)$(id).innerHTML=v;else $(id).textContent=v}
export function attract(){sel.track=store.get('track',0);buildSprites(TRACKS[sel.track]);resetRace();P.x=0;P.speed=MAXS*.8;etat.rivals.forEach(r=>{r.speed=r.top*.8});etat.state='title'}
$('bStart').onclick=()=>startRace();
$('bRestart').onclick=()=>startRace();
$('bAgain').onclick=()=>startRace();
$('bNext').onclick=()=>{sel.track=(sel.track+1)%TRACKS.length;store.set('track',sel.track);startRace()};

// la course annonce ses événements à l'interface
Object.assign(fx, {
  bigMsg, toast, flash, sfx, results: showResults,
  resultsShown: () => $('sResult').classList.contains('on'),
  /** @param {number} i */ carImgs(i) { const C = CARS[i]; etat.carImgs = carSet(C.col, C.col2); },
});
