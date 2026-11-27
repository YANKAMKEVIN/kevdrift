// @ts-check
/** Musique et sons générés avec la Web Audio API. */
import { MAXS } from './config.js';
import { rng } from './util.js';
import { P, etat, inp } from './state.js';

export function initAudio(){
 if(etat.AC){if(etat.AC.state==='suspended')etat.AC.resume();return}
 try{const W=/** @type {any} */(window);etat.AC=new(W.AudioContext||W.webkitAudioContext)()}catch(e){return}
 etat.master=etat.AC.createGain();etat.master.gain.value=.85;const comp=etat.AC.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;etat.master.connect(comp);comp.connect(etat.AC.destination);
 etat.musicG=etat.AC.createGain();etat.musicG.gain.value=etat.musicOn?.55:0;etat.musicG.connect(etat.master);etat.sfxG=etat.AC.createGain();etat.sfxG.gain.value=.8;etat.sfxG.connect(etat.master);
 etat.noiseB=etat.AC.createBuffer(1,etat.AC.sampleRate,etat.AC.sampleRate);const d=etat.noiseB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 etat.rev=etat.AC.createConvolver();const L=etat.AC.sampleRate*2.4,ib=etat.AC.createBuffer(2,L,etat.AC.sampleRate);for(let ch=0;ch<2;ch++){const x=ib.getChannelData(ch);for(let i=0;i<L;i++)x[i]=(Math.random()*2-1)*Math.pow(1-i/L,2.6)}etat.rev.buffer=ib;
 const rg=etat.AC.createGain();rg.gain.value=.35;etat.rev.connect(rg);rg.connect(etat.musicG);
 etat.dly=etat.AC.createDelay(1);const fb=etat.AC.createGain();fb.gain.value=.36;const lp=etat.AC.createBiquadFilter();lp.frequency.value=2600;etat.dly.connect(lp);lp.connect(fb);fb.connect(etat.dly);const dg=etat.AC.createGain();dg.gain.value=.45;lp.connect(dg);dg.connect(etat.musicG);
 // moteur
 const o1=etat.AC.createOscillator(),o2=etat.AC.createOscillator(),o3=etat.AC.createOscillator();o1.type='sawtooth';o2.type='square';o3.type='sine';
 const ef=etat.AC.createBiquadFilter();ef.type='lowpass';ef.frequency.value=600;ef.Q.value=4;const eg=etat.AC.createGain();eg.gain.value=0;
 const wg=etat.AC.createGain();wg.gain.value=.12;o1.connect(ef);o2.connect(ef);o3.connect(wg);wg.connect(eg);ef.connect(eg);eg.connect(etat.sfxG);
 const nz=etat.AC.createBufferSource();nz.buffer=etat.noiseB;nz.loop=true;const bp=etat.AC.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2200;bp.Q.value=2.5;const sg=etat.AC.createGain();sg.gain.value=0;nz.connect(bp);bp.connect(sg);sg.connect(etat.sfxG);
 [o1,o2,o3,nz].forEach(o=>o.start());etat.eng={o1,o2,o3,ef,eg,sg,bp};
 etat.schedId=setInterval(sched,25);
}
const mf=m=>440*Math.pow(2,(m-69)/12);
function voice(type,f,t,dur,vol,dest,o={}){
 const os=etat.AC.createOscillator(),g=etat.AC.createGain();os.type=type;os.frequency.setValueAtTime(f,t);if(o.det)os.detune.value=o.det;if(o.to)os.frequency.exponentialRampToValueAtTime(o.to,t+dur);
 let n=os;if(o.cut){const fl=etat.AC.createBiquadFilter();fl.type=o.ft||'lowpass';fl.frequency.setValueAtTime(o.cut,t);if(o.cutTo)fl.frequency.exponentialRampToValueAtTime(o.cutTo,t+dur);fl.Q.value=o.q||1;os.connect(fl);n=fl}
 const a=o.a||.005,r=o.r||.08;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+a);g.gain.setValueAtTime(vol,t+Math.max(a,dur-r));g.gain.linearRampToValueAtTime(0,t+dur);
 n.connect(g);g.connect(dest);if(o.send){const s=etat.AC.createGain();s.gain.value=o.send;g.connect(s);s.connect(o.sendTo||etat.rev)}os.start(t);os.stop(t+dur+.05);
}
function noise(t,dur,vol,dest,o={}){const s=etat.AC.createBufferSource();s.buffer=etat.noiseB;const f=etat.AC.createBiquadFilter();f.type=o.ft||'highpass';f.frequency.setValueAtTime(o.f||1000,t);if(o.fTo)f.frequency.exponentialRampToValueAtTime(o.fTo,t+dur);f.Q.value=o.q||.7;
 const g=etat.AC.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(dest);if(o.send){const sg=etat.AC.createGain();sg.gain.value=o.send;g.connect(sg);sg.connect(etat.rev)}s.start(t,Math.random()*.5);s.stop(t+dur+.02)}
const CH={m:[0,3,7],M:[0,4,7],m7:[0,3,7,10],M7:[0,4,7,11]};
const SONGS=[
 {bpm:112,prog:[[57,'m'],[53,'M'],[60,'M'],[55,'M']],scale:[0,2,3,5,7,8,10],key:57,seed:5},
 {bpm:120,prog:[[52,'m'],[48,'M7'],[55,'M'],[50,'M']],scale:[0,2,3,5,7,8,10],key:52,seed:9},
 {bpm:128,prog:[[54,'m'],[50,'M'],[57,'M'],[52,'M']],scale:[0,2,3,5,7,8,10],key:54,seed:13},
 {bpm:90,prog:[[57,'m7'],[53,'M7'],[50,'m7'],[52,'M']],scale:[0,2,3,5,7,8,10],key:57,seed:21,menu:true}
];
SONGS.forEach(s=>{const R=rng(s.seed);s.lead=[];for(let b=0;b<4;b++){const bar=[];const ch=s.prog[b];const tones=CH[ch[1]].map(x=>ch[0]+x+12);const rh=[[0,3,6,8,10,12,14],[0,2,4,7,10,12],[0,3,6,10,11,12,14],[0,4,6,8,12,14]][b];
  for(let i=0;i<16;i++){if(rh.includes(i)){const useScale=R()<.3;bar.push(useScale?s.key+12+s.scale[(R()*7)|0]+(R()<.3?12:0):tones[(R()*tones.length)|0]+(R()<.35?12:0))}else bar.push(-1)}s.lead.push(bar)}});
export function setSong(i){if(i===etat.songIdx)return;etat.songIdx=i;etat.song=SONGS[i];etat.step=0;if(etat.AC)etat.nextT=etat.AC.currentTime+.08}
function sched(){
 if(!etat.AC||!etat.song)return;if(etat.nextT<etat.AC.currentTime-.2)etat.nextT=etat.AC.currentTime+.05;
 const sd=60/etat.song.bpm/4;if(etat.dly)etat.dly.delayTime.value=sd*3;
 while(etat.nextT<etat.AC.currentTime+.14){playStep(etat.step,etat.nextT,sd);etat.nextT+=sd;etat.step++}
}
function playStep(st,t,sd){
 if(!etat.musicOn||etat.state==='pause')return;const s=etat.song,bar=Math.floor(st/16)%8,i=st%16,ch=s.prog[bar%4],root=ch[0],ct=CH[ch[1]],M=etat.musicG;
 const intense=!s.menu&&(etat.state==='race'||etat.state==='countdown'||etat.state==='finish');
 if(i===0)ct.forEach(iv=>{[-9,9].forEach(det=>voice('sawtooth',mf(root+iv),t,sd*16,.035,M,{det,cut:1300,a:.35,r:.6,send:.4}))});
 // basse
 if(s.menu){if(i%4===0)voice('sawtooth',mf(root-24),t,sd*3.6,.16,M,{cut:500,cutTo:180,q:5})}
 else{const oct=(i===6||i===14)?12:0;voice('sawtooth',mf(root-24+oct),t,sd*.92,i%2?.1:.17,M,{cut:900,cutTo:160,q:6,r:.04})}
 // arpège
 const ar=[...ct.map(x=>root+x+12),...ct.map(x=>root+x+24)];
 if(s.menu?i%2===0:true){const k=s.menu?(i/2)%ar.length:[0,1,2,3,4,5,4,3,2,1,0,1,2,3,4,5][i]%ar.length;voice('square',mf(ar[k|0]),t,sd*.85,.035,M,{cut:3200,cutTo:900,r:.05,send:.15,sendTo:etat.dly})}
 // lead
 if(intense&&bar>=4){const n=s.lead[bar%4][i];if(n>0){voice('sawtooth',mf(n),t,sd*1.8,.06,M,{det:6,cut:2600,q:2,r:.12,send:.3,sendTo:etat.dly});voice('sawtooth',mf(n),t,sd*1.8,.04,M,{det:-8,cut:2200,r:.12})}}
 // batterie
 if(intense){
  if(i%4===0){const o=etat.AC.createOscillator(),g=etat.AC.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.13);g.gain.setValueAtTime(.9,t);g.gain.exponentialRampToValueAtTime(.001,t+.38);o.connect(g);g.connect(M);o.start(t);o.stop(t+.4)}
  if(i===4||i===12){noise(t,.22,.42,M,{f:1400,send:.9});voice('triangle',190,t,.1,.25,M,{to:120})}
  if(bar===7&&i>=12)noise(t,.12,.25,M,{f:1600,send:.5});
  if(i%2===1)noise(t,.045,.12,M,{f:8000});else if(i%4===2)noise(t,.03,.06,M,{f:9000});
 }else if(s.menu&&i%4===2)noise(t,.05,.04,M,{f:9000});
}
export function sfx(kind){
 if(!etat.AC)return;const t=etat.AC.currentTime,G=etat.sfxG;
 if(kind==='beep')voice('square',660,t,.18,.18,G,{cut:3000});
 else if(kind==='go'){voice('square',1320,t,.5,.2,G,{cut:4000});voice('sawtooth',660,t,.5,.12,G,{cut:3000})}
 else if(kind==='click')voice('square',880,t,.05,.08,G,{to:1400});
 else if(kind==='boost'){noise(t,.6,.35,G,{ft:'bandpass',f:400,fTo:5000,q:1.5});voice('sawtooth',120,t,.6,.12,G,{to:480,cut:1800})}
 else if(kind==='bump'){voice('sine',110,t,.25,.6,G,{to:40});noise(t,.18,.35,G,{ft:'lowpass',f:900})}
 else if(kind==='hop')voice('triangle',300,t,.12,.15,G,{to:600});
 else if(kind==='lap')[0,4,7,12].forEach((n,k)=>voice('square',mf(76+n),t+k*.08,.22,.1,G,{cut:4000,send:.3}));
 else if(kind==='win')[0,4,7,12,16,19,24].forEach((n,k)=>voice('sawtooth',mf(64+n),t+k*.09,.4,.09,G,{cut:3500,send:.4}));
 else if(kind==='lvl')voice('sine',[0,880,1100,1320][P.boostLvlPreview||1],t,.12,.12,G);
}
export function engineUpdate(){
 if(!etat.eng)return;const t=etat.AC.currentTime,sp=P.speed/MAXS,active=etat.state==='race'||etat.state==='countdown'||etat.state==='finish';
 const gear=Math.min(4,Math.floor(sp*4.2)),rpm=sp*4.2-gear,f=55+rpm*95+gear*18+(etat.state==='countdown'&&inp.up?60:0);
 etat.eng.o1.frequency.setTargetAtTime(f,t,.05);etat.eng.o2.frequency.setTargetAtTime(f*.5,t,.05);etat.eng.o3.frequency.setTargetAtTime(f*4+(P.boostT>0?400:0),t,.05);
 etat.eng.ef.frequency.setTargetAtTime(400+sp*1600+(P.boostT>0?1500:0),t,.05);
 etat.eng.eg.gain.setTargetAtTime(active?(.07+sp*.06):0,t,.1);
 etat.eng.sg.gain.setTargetAtTime(active&&P.drift?.12:0,t,.04);etat.eng.bp.frequency.setTargetAtTime(1800+P.charge*500,t,.05);
}
