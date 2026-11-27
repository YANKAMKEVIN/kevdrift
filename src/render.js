// @ts-check
/** Rendu pseudo-3D de la route, du décor et des voitures. */
import { BOOSTC, CAMD, CAMH, CARW, MAXS, PZ, RW, SEG } from './config.js';
import { P, carBase, etat } from './state.js';
import { clamp, lerp, rng, wrap } from './util.js';
import { findSeg } from './track.js';
import { relZ , driftLevel } from './race.js';

// ================== CONSTANTES ==================
const cv=/** @type {HTMLCanvasElement} */(document.getElementById('c')),ctx=/** @type {CanvasRenderingContext2D} */(cv.getContext('2d'));
// ================== RENDU ==================
export function resize(){
 const dpr=Math.min(devicePixelRatio||1,1.5);etat.W=innerWidth;etat.H=innerHeight;etat.DPR=Math.min(dpr,Math.sqrt(2.4e6/(etat.W*etat.H)));
 cv.width=Math.round(etat.W*etat.DPR);cv.height=Math.round(etat.H*etat.DPR);ctx.setTransform(etat.DPR,0,0,etat.DPR,0,0);
 etat.PX=Math.max(etat.W/2,etat.H*.36);const portrait=etat.H>etat.W*1.1;etat.CY=portrait?etat.H*.44:etat.H*.5;etat.PY=carBase()-etat.CY+etat.H*.012;etat.DRAW=etat.W<700?200:260;
}
addEventListener('resize',resize);
function project(p,cx,cy,cz){p.c.x=(p.w.x||0)-cx;p.c.y=p.w.y-cy;p.c.z=p.w.z-cz;p.s.scale=CAMD/p.c.z;p.s.x=etat.W/2+p.s.scale*p.c.x*etat.PX;p.s.y=etat.CY-p.s.scale*p.c.y*etat.PY;p.s.w=p.s.scale*RW*etat.PX}
function quad(x1,y1,w1a,w1b,x2,y2,w2a,w2b){ctx.beginPath();ctx.moveTo(x1+w1a,y1);ctx.lineTo(x1+w1b,y1);ctx.lineTo(x2+w2b,y2);ctx.lineTo(x2+w2a,y2);ctx.closePath();ctx.fill()}
function drawBackground(){
 const hz=etat.CY;const g=ctx.createLinearGradient(0,0,0,hz);etat.T.sky.forEach((c,i)=>g.addColorStop(i/(etat.T.sky.length-1),c));ctx.fillStyle=g;ctx.fillRect(0,0,etat.W,hz+2);
 // étoiles
 ctx.fillStyle='#fff';const R=rng(99);const ns=etat.T.mount.kind==='space'?180:70;for(let i=0;i<ns;i++){const x=wrap(R()*etat.W*2-etat.skyX*etat.W*.15,etat.W*2)-etat.W*.5,y=R()*hz*.8;ctx.globalAlpha=(.3+R()*.7)*(.6+.4*Math.sin(etat.time*2+i));ctx.fillRect(x,y,R()<.1?2:1.2,R()<.1?2:1.2)}ctx.globalAlpha=1;
 if(etat.T.mount.kind==='space'){const ng=ctx.createRadialGradient(etat.W*.25,hz*.35,0,etat.W*.25,hz*.35,etat.W*.4);ng.addColorStop(0,'rgba(122,31,255,.35)');ng.addColorStop(1,'rgba(122,31,255,0)');ctx.fillStyle=ng;ctx.fillRect(0,0,etat.W,hz)}
 const sun=etat.SP.sun,ss=Math.min(etat.W,etat.H*1.4)*etat.T.sunR*2/440;const sx=etat.W/2-wrap(etat.skyX*etat.W*.3+etat.W,etat.W*2)+etat.W;
 ctx.drawImage(sun,sx-sun.width*ss/2,hz-sun.height*ss*(etat.T.mount.kind==='space'?.75:.62),sun.width*ss,sun.height*ss);
 const m=etat.SP.mount,ms=Math.max(.5,etat.H/900)*.9,mw=m.width*ms,mh=m.height*ms;let ox=-wrap(etat.skyX*etat.W*.6,mw);
 for(let x=ox;x<etat.W;x+=mw)ctx.drawImage(m,x,hz-mh+2,mw,mh);
 const gg=ctx.createLinearGradient(0,hz,0,etat.H);gg.addColorStop(0,etat.T.fog);gg.addColorStop(.25,etat.T.ground);ctx.fillStyle=gg;ctx.fillRect(0,hz,etat.W,etat.H-hz);
}
export function render(){
 if(!etat.segs.length)return;
 ctx.save();
 if(etat.shake>0)ctx.translate((Math.random()-.5)*etat.shake*14,(Math.random()-.5)*etat.shake*10);
 drawBackground();
 const base=findSeg(etat.pos),bp=(etat.pos%SEG)/SEG,pSeg=findSeg(etat.pos+PZ),pp=((etat.pos+PZ)%SEG)/SEG;
 const pY=lerp(pSeg.p1.w.y,pSeg.p2.w.y,pp);let maxy=etat.H,x=0,dx=-(base.curve*bp);
 const camY=pY+CAMH+(P.boostT>0?-60:0);
 for(const s of etat.segs)s.cars.length=0;
 for(const r of etat.rivals)findSeg(r.z).cars.push(r);
 const gp=[new Path2D(),new Path2D(),new Path2D(),new Path2D()];
 const N=etat.segs.length;
 for(let n=0;n<etat.DRAW;n++){
  const s=etat.segs[(base.i+n)%N],looped=s.i<base.i;s.clip=maxy;s.vis=false;
  project(s.p1,P.x*RW-x,camY,etat.pos-(looped?etat.trackLen:0));project(s.p2,P.x*RW-x-dx,camY,etat.pos-(looped?etat.trackLen:0));
  x+=dx;dx+=s.curve;
  if(s.p1.c.z<=CAMD||s.p2.s.y>=s.p1.s.y||s.p2.s.y>=maxy)continue;
  s.vis=true;
  let x1=s.p1.s.x,y1=s.p1.s.y,w1=s.p1.s.w;const x2=s.p2.s.x,y2=s.p2.s.y,w2=s.p2.s.w;
  if(y1>maxy){const t=(maxy-y2)/(y1-y2);x1=x2+(x1-x2)*t;w1=w2+(w1-w2)*t;y1=maxy}
  ctx.fillStyle=s.stripe?etat.T.ground:etat.T.ground2;ctx.fillRect(0,y2,etat.W,y1-y2+1);
  // halo des bords
  ctx.globalAlpha=.16;ctx.fillStyle=etat.T.edge;quad(x1,y1,-w1*1.28,-w1,x2,y2,-w2*1.28,-w2);quad(x1,y1,w1,w1*1.28,x2,y2,w2,w2*1.28);ctx.globalAlpha=1;
  // route
  ctx.fillStyle=s.stripe?etat.T.road:etat.T.road2;quad(x1,y1,-w1,w1,x2,y2,-w2,w2);
  // bords néon
  ctx.fillStyle=etat.T.edge;quad(x1,y1,-w1*1.04,-w1*.97,x2,y2,-w2*1.04,-w2*.97);quad(x1,y1,w1*.97,w1*1.04,x2,y2,w2*.97,w2*1.04);
  if(s.stripe){ctx.fillStyle=etat.T.rumble;quad(x1,y1,-w1*.95,-w1*.91,x2,y2,-w2*.95,-w2*.91);quad(x1,y1,w1*.91,w1*.95,x2,y2,w2*.91,w2*.95);
   ctx.fillStyle=etat.T.lane;ctx.globalAlpha=.55;quad(x1,y1,-w1*.345,-w1*.325,x2,y2,-w2*.345,-w2*.325);quad(x1,y1,w1*.325,w1*.345,x2,y2,w2*.325,w2*.345);ctx.globalAlpha=1}
  if(s.pad!==null){const c=s.pad,pw=.2;const ph=(s.i+Math.floor(etat.time*12))%3;ctx.fillStyle=ph===0?'#fff':'#ffd23f';ctx.globalAlpha=.85;quad(x1,y1,w1*(c-pw),w1*(c+pw),x2,y2,w2*(c-pw),w2*(c+pw));
   ctx.fillStyle='#ff6a00';quad(x1,y1,w1*(c-pw*.4),w1*(c+pw*.4),x2,y2,w2*(c-pw*.15),w2*(c+pw*.15));ctx.globalAlpha=1}
  if(s.start){const cn=10;for(let k=0;k<cn;k++){ctx.fillStyle=(k+s.i)%2?'#fff':'#0a0418';const a=-1+k*2/cn,b=a+2/cn;quad(x1,y1,w1*a,w1*b,x2,y2,w2*a,w2*b)}}
  // grille
  const bk=Math.min(3,Math.floor(n/etat.DRAW*5)),P2=gp[bk];
  for(const k of[1.55,2.2,3,4,5.3,7,9.5,13]){P2.moveTo(x1-w1*k,y1);P2.lineTo(x2-w2*k,y2);P2.moveTo(x1+w1*k,y1);P2.lineTo(x2+w2*k,y2)}
  if(s.i%4===0){P2.moveTo(0,y1);P2.lineTo(x1-w1*1.3,y1);P2.moveTo(x1+w1*1.3,y1);P2.lineTo(etat.W,y1)}
  // brume
  const f=Math.min(1,Math.pow(n/etat.DRAW,1.5)*etat.T.fogK);if(f>.02){ctx.globalAlpha=f;ctx.fillStyle=etat.T.fog;ctx.fillRect(0,y2,etat.W,y1-y2+1);ctx.globalAlpha=1}
  maxy=y2;
 }
 ctx.strokeStyle=etat.T.grid;ctx.lineWidth=1.4;[.75,.45,.25,.1].forEach((a,i)=>{ctx.globalAlpha=a;ctx.stroke(gp[i])});ctx.globalAlpha=1;
 // sprites et voitures, du plus loin au plus proche
 const behind=[];
 for(let n=etat.DRAW-1;n>0;n--){
  const s=etat.segs[(base.i+n)%N];if(s.p1.c.z<=CAMD)continue;
  const fa=1-Math.min(1,Math.pow(n/etat.DRAW,1.5)*etat.T.fogK*.9);
  for(const r of s.cars){const rz=relZ(r.z);if(rz<-20){behind.push(r);continue}drawRival(r,s,fa)}
  if(!s.sprites.length)continue;ctx.globalAlpha=fa;
  for(const sp of s.sprites){if(!sp.col&&n<=Math.floor(PZ/SEG)+2)continue;const sc=s.p1.s.scale;drawSprite(sp.img,sp.w,sc,s.p1.s.x+sc*sp.off*RW*etat.PX,s.p1.s.y,s.clip)}
  ctx.globalAlpha=1;
 }
 drawPlayer();
 for(const r of behind){const s=findSeg(r.z);if(relZ(r.z)>-500)drawRival(r,s,1,true)}
 // particules
 ctx.globalCompositeOperation='lighter';
 for(const p of etat.particles){const a=p.l/p.ml;ctx.globalAlpha=a;if(p.line){ctx.strokeStyle=p.c;ctx.lineWidth=2;const dx=p.x-etat.W/2,dy=p.y-etat.H*.45;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+dx*.25,p.y+dy*.25);ctx.stroke()}else{ctx.fillStyle=p.c;ctx.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s)}}
 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
 ctx.restore();
}
function drawSprite(img,ww,sc,sx,sy,clipY){
 const dw=ww*sc*etat.PX;if(dw<1.5||dw>etat.W*6)return;const dh=dw*img.height/img.width,dx=sx-dw/2,dy=sy-dh;
 const ch=clipY?Math.max(0,dy+dh-clipY):0;if(ch>=dh)return;
 ctx.drawImage(img,0,0,img.width,img.height*(1-ch/dh),dx,dy,dw,dh-ch);
}
function drawRival(r,s,fa,noClip){
 if(!s.vis&&!noClip)return;const pc=(r.z%SEG)/SEG,sc=lerp(s.p1.s.scale,s.p2.s.scale,pc);if(!(sc>0))return;
 const x=lerp(s.p1.s.x,s.p2.s.x,pc)+sc*r.x*RW*etat.PX,y=lerp(s.p1.s.y,s.p2.s.y,pc)+Math.sin(etat.time*6+r.d*.01)*sc*20*etat.PY;
 const li=clamp(Math.round((r.steer-s.curve*.15)*2)+2,0,4);ctx.globalAlpha=fa;drawSprite(r.imgs[li],CARW,sc,x,y,noClip?0:s.clip);ctx.globalAlpha=1;
}
function drawPlayer(){
 if(etat.state==='select')return;
 const cw=CARW*etat.PX/CAMH*(etat.H>etat.W*1.1?1.3:1),img=etat.carImgs[clamp(Math.round(P.lean*2)+2,0,4)],ch=cw*img.height/img.width;
 const bob=Math.sin(etat.time*7)*2*(.4+P.speed/MAXS)+(P.boostT>0?(Math.random()-.5)*3:0);
 const x=etat.W/2,y=carBase()+bob;
 ctx.save();ctx.translate(x,y);ctx.rotate(P.drift?P.dDir*.09:P.lean*.025);
 if(P.boostT>0){ctx.globalCompositeOperation='lighter';const c=BOOSTC[P.boostLvl||1];for(const ex of[-.19,.19]){const fl=ctx.createRadialGradient(ex*cw,-ch*.26,0,ex*cw,-ch*.26,cw*.16+Math.random()*cw*.05);fl.addColorStop(0,'#fff');fl.addColorStop(.3,c);fl.addColorStop(1,c+'00');ctx.fillStyle=fl;ctx.beginPath();ctx.ellipse(ex*cw,-ch*.2,cw*.1,cw*.22+Math.random()*cw*.05,0,0,7);ctx.fill()}ctx.globalCompositeOperation='source-over'}
 ctx.drawImage(img,-cw/2,-ch,cw,ch);
 if(P.drift&&P.charge>=.7){const lvl=Math.max(1,driftLevel(P.charge));ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35+.25*Math.sin(etat.time*30);ctx.fillStyle=BOOSTC[lvl];ctx.beginPath();ctx.ellipse(0,-ch*.08,cw*.52,ch*.1,0,0,7);ctx.fill();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
 ctx.restore();
}
