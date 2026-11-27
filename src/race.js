// @ts-check
/** Course : pilotage, drift et boosts, rivaux, tours, arrivée. Sans DOM : testé sous Node. */
import { ROBOT, DRIFT, BOOST_TIME, ACC, BOOSTC, BRAKE, CAMH, CARS, CARU, CARW, DECEL, DEMO, LAPS, MAXS, OFFDECEL, OFFLIM, PZ, RIVALS, RW, SEG } from './config.js';
import { P, carBase, etat, fx, inp } from './state.js';
import { clamp, lerp, wrap } from './util.js';
import { sel, store } from './save.js';
import { buildTrack, findSeg } from './track.js';

/** Niveau de boost gagné par une charge de drift (0 rien, 1 BOOST, 2 SUPER, 3 ULTRA).
 * @param {number} c charge accumulée */
export function driftLevel(c){return c>=DRIFT[2]?3:c>=DRIFT[1]?2:c>=DRIFT[0]?1:0}

export function resetRace(){
 buildTrack(sel.track);
 etat.pos=0;etat.raceT=0;etat.lapT=0;etat.lap=0;etat.bestLap=Infinity;etat.lapTimes=[];etat.shake=0;etat.particles=[];
 Object.assign(P,{x:.5,speed:0,drift:false,charge:0,boostT:0,boostLvl:0,padCD:0,lean:0,hitCD:0});
 fx.carImgs(sel.car);
 etat.rivals=RIVALS.map((r,k)=>{const d=(7-k)*300;return{name:r[0],col:r[1],d,z:wrap(d+PZ,etat.trackLen),x:k%2?.5:-.5,lane:k%2?.5:-.5,speed:0,top:MAXS*(etat.T.diff-k*.022),imgs:etat.rivalImgs[k],steer:0}});
}
function startBoost(lvl,dur){P.boostT=Math.max(P.boostT,dur);P.boostLvl=lvl;P.speed=Math.min(P.speed+MAXS*.05*lvl,MAXS*1.45);fx.sfx('boost');fx.flash(.12+lvl*.05);etat.shake=Math.max(etat.shake,.25)}
export function relZ(z){let r=z-(etat.pos+PZ);r=wrap(r,etat.trackLen);if(r>etat.trackLen/2)r-=etat.trackLen;return r}
export function autoSteer(seg){
 let target=clamp(-seg.curve*.1,-.6,.6);
 for(const r of etat.rivals){const rz=relZ(r.z);if(rz>0&&rz<2400&&Math.abs(r.x-target)<CARU*1.3)target=r.x>0?r.x-CARU*1.8:r.x+CARU*1.8}
 return clamp((target-P.x)*4,-1,1);
}
export function progress(){return etat.lap*etat.trackLen+etat.pos}
export function update(dt){
 etat.time+=dt;
 const C=CARS[sel.car],racing=etat.state==='race',auto=etat.state==='title'||etat.state==='finish'||((DEMO||ROBOT)&&racing);
 if(etat.state==='pause')return;
 if(etat.state==='countdown'){
  etat.cd-=dt;const n=Math.ceil(etat.cd);if(n!==etat.lastCd&&n>0){etat.lastCd=n;fx.bigMsg(String(n),n===1?'#ffd23f':'#fff');fx.sfx('beep')}
  if(etat.cd<=0){etat.state='race';fx.bigMsg('GO!','#19f0ff');fx.sfx('go');if(inp.up)startBoost(1,.6)}
 }
 const pSeg=findSeg(etat.pos+PZ),sp=P.speed/MAXS;
 const dx=dt*2.1*Math.min(1,sp+.05);
 let steer=0;
 if(auto)steer=autoSteer(pSeg);else if(racing){if(inp.left)steer-=1;if(inp.right)steer+=1}
 const driftKey=racing&&inp.drift;
 if(driftKey&&!P.drift&&steer!==0&&sp>.35){P.drift=true;P.dDir=Math.sign(steer);P.charge=0;fx.sfx('hop')}
 if(P.drift){
  if(!driftKey||sp<.25){const c=P.charge,lvl=driftLevel(c);P.drift=false;if(lvl&&racing){startBoost(lvl,BOOST_TIME[lvl]);fx.toast(['','BOOST !','SUPER BOOST !','ULTRA BOOST !'][lvl],BOOSTC[lvl])}P.charge=0}
  else{P.charge+=dt*(steer===P.dDir?1.3:.6)*C.hand}
 }
 if(racing||auto){
  if(P.drift)P.x+=(P.dDir*.32+steer*.6)*dx*1.15*C.hand;else P.x+=steer*dx*C.hand;
  P.x-=dx*sp*pSeg.curve*(P.drift?.17:.3);
 }
 P.lean=lerp(P.lean,P.drift?P.dDir*1.2:steer,.18);
 // vitesse
 const cap=MAXS*C.top*(P.boostT>0?1.32:1)*(etat.state==='finish'?.55:1);
 const thr=etat.state==='countdown'?0:auto?1:(inp.up||(etat.touchMode&&!inp.down))?1:0;
 if(P.boostT>0){P.boostT-=dt;P.speed+=ACC*2.4*dt}
 else if(racing&&inp.down)P.speed-=BRAKE*dt;
 else if(thr)P.speed+=ACC*C.accel*dt*(1-.45*sp);
 else P.speed-=DECEL*dt;
 if(P.drift)P.speed-=ACC*.1*dt;
 if(Math.abs(P.x)>1.08){if(P.speed>OFFLIM)P.speed-=OFFDECEL*dt;
  if(P.hitCD<=0)for(const s of pSeg.sprites){if(!s.col)continue;const sw=s.w/RW;if(Math.abs(P.x-s.off)<(CARU+sw*.5)*.5){P.speed=Math.min(P.speed,MAXS/5);etat.pos=wrap(etat.pos-SEG*.6,etat.trackLen);P.x+=s.off>P.x?-.15:.15;fx.sfx('bump');etat.shake=.6;P.hitCD=.5;P.drift=false;P.charge=0;break}}
  if(racing&&Math.random()<sp*.8)part(etat.W/2+(Math.random()-.5)*etat.W*.25,etat.H-20,(Math.random()-.5)*200,-80-Math.random()*120,'#a080ff',.5,3);
 }
 P.hitCD-=dt;P.padCD-=dt;
 if(pSeg.pad!==null&&Math.abs(P.x-pSeg.pad)<.3&&P.padCD<=0&&etat.state!=='countdown'){startBoost(2,1.1);P.padCD=1;if(racing)fx.toast('TURBO !','#ffd23f')}
 if(P.speed>cap)P.speed=Math.max(cap,P.speed-ACC*1.4*dt);
 P.speed=Math.max(0,P.speed);P.x=clamp(P.x,-2.1,2.1);
 // collisions rivaux
 for(const r of etat.rivals){const rz=relZ(r.z);if(Math.abs(P.x-r.x)<CARU*.85){
   if(rz>-60&&rz<CARW*.75&&P.speed>r.speed){P.speed=r.speed*.88;P.x+=P.x<r.x?-.06:.06;r.x+=P.x<r.x?.05:-.05;if(P.hitCD<=0){fx.sfx('bump');etat.shake=.4;P.hitCD=.35}}
   else if(rz<0&&rz>-CARW*.6&&r.speed>P.speed){r.speed=P.speed*.92}}}
 // avance
 const old=etat.pos;etat.pos=wrap(etat.pos+dt*P.speed,etat.trackLen);
 if(etat.state!=='countdown'&&etat.state!=='title')etat.raceT+=dt,etat.lapT+=dt;
 if(etat.pos<old&&etat.state!=='title'&&P.speed>0){
  if(racing){etat.lap++;etat.lapTimes.push(etat.lapT);etat.bestLap=Math.min(etat.bestLap,etat.lapT);etat.lapT=0;
   if(etat.lap>=LAPS){finish()}else{fx.sfx('lap');fx.bigMsg(etat.lap===LAPS-1?'DERNIER TOUR':'TOUR '+(etat.lap+1),etat.lap===LAPS-1?'#ffd23f':'#19f0ff')}}
 }
 etat.skyX+=dt*sp*pSeg.curve*.002*(P.speed>0?1:0);
 // rivaux
 if(etat.state!=='countdown')for(const r of etat.rivals){
  const seg=findSeg(r.z);let tgt=r.top*(1-Math.abs(seg.curve)*.018);
  if(etat.state==='title')tgt*=.92;else{const gap=r.d-progress();if(gap>3000)tgt*=.9;else if(gap<-4000)tgt*=1.07}
  r.speed+=(tgt-r.speed)*dt*(r.speed<tgt?.55:1.5);
  // évitement
  let goal=r.lane-seg.curve*.06;
  const others=[...etat.rivals.filter(o=>o!==r).map(o=>[o.z,o.x,o.speed]),[wrap(etat.pos+PZ,etat.trackLen),P.x,P.speed]];
  for(const[oz,ox,os]of others){let d=wrap(oz-r.z,etat.trackLen);if(d<1600&&os<r.speed&&Math.abs(ox-r.x)<CARU*1.4){goal=ox>r.x?ox-CARU*2:ox+CARU*2;if(goal<-.85)goal=ox+CARU*2;if(goal>.85)goal=ox-CARU*2;break}}
  r.steer=clamp((goal-r.x)*3,-1,1);r.x=clamp(r.x+r.steer*dt*.9,-.9,.9);
  r.d+=r.speed*dt;r.z=wrap(r.d+PZ,etat.trackLen);
 }
 // fin
 if(etat.state==='finish'){etat.finishT+=dt;if(etat.finishT>2.2&&!fx.resultsShown())fx.results()}
 if(racing){const rank=1+etat.rivals.filter(r=>r.d>progress()).length;if(rank<etat.lastRank&&etat.lap>0)fx.toast('+1 PLACE','#3dff9a');etat.lastRank=rank}
 // particules de drift
 if(P.drift){const lvl=driftLevel(P.charge);const col=lvl?BOOSTC[lvl]:'#ffb070';const cw=CARW*etat.PX/CAMH;
  for(const sx of[-.38,.38])if(Math.random()<.9)part(etat.W/2+sx*cw+P.dDir*cw*.12,carBase()-cw*.05,(Math.random()-.5)*160-P.dDir*160,-60-Math.random()*160,col,.35+Math.random()*.3,2+lvl)}
 if(P.boostT>0)for(let k=0;k<2;k++)part(etat.W/2+(Math.random()-.5)*etat.W*1.2,etat.H*.2+Math.random()*etat.H*.6,0,0,'#ffffff',.25,0,true);
 etat.particles=etat.particles.filter(p=>(p.l-=dt)>0);etat.particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=380*dt});
 etat.shake=Math.max(0,etat.shake-dt*1.8);
}
function part(x,y,vx,vy,c,l,s,line){if(etat.particles.length<500)etat.particles.push({x,y,vx,vy,c,l,ml:l,s,line})}
function finish(){
 etat.state='finish';etat.finishT=0;const rank=1+etat.rivals.filter(r=>r.d>progress()).length;P.finalRank=rank;P.drift=false;
 fx.bigMsg(rank===1?'VICTOIRE':'ARRIVÉE',rank===1?'#ffd23f':'#19f0ff');fx.sfx(rank<=3?'win':'lap');fx.flash(.3);
 const best=store.get('best'+sel.track,null);P.newRec=!best||etat.raceT<best;if(P.newRec)store.set('best'+sel.track,etat.raceT);P.finalT=etat.raceT;
}
