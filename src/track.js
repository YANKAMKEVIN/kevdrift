// @ts-check
/** Construction du circuit en segments (pseudo-3D). */
import { PZ, SEG, TRACKS } from './config.js';
import { easeIn, easeInOut, lerp, rng, wrap } from './util.js';
import { etat } from './state.js';

function lastY(){return etat.segs.length?etat.segs[etat.segs.length-1].p2.w.y:0}
function addSeg(curve,y){const n=etat.segs.length;etat.segs.push({i:n,p1:{w:{y:lastY(),z:n*SEG},c:{},s:{}},p2:{w:{y,z:(n+1)*SEG},c:{},s:{}},curve,sprites:[],cars:[],pad:null,stripe:Math.floor(n/3)%2,start:false,clip:0})}
function addRoad(e,h,l,curve,y){const sy=lastY(),ey=sy+y*SEG,tot=e+h+l;for(let n=0;n<e;n++)addSeg(easeIn(0,curve,n/e),easeInOut(sy,ey,n/tot));for(let n=0;n<h;n++)addSeg(curve,easeInOut(sy,ey,(e+n)/tot));for(let n=0;n<l;n++)addSeg(lerp(curve,0,n/l),easeInOut(sy,ey,(e+h+n)/tot))}
export function buildTrack(ti){
 etat.T=TRACKS[ti];etat.segs=[];
 for(const[n,c,hh]of etat.T.layout){const e=Math.round(n*.25);addRoad(e,n-2*e,e,c,hh)}
 addRoad(30,40,30,0,-lastY()/SEG);
 etat.trackLen=etat.segs.length*SEG;
 const R=rng(etat.T.seed),add=(i,img,off,w,col=true)=>{etat.segs[wrap(i,etat.segs.length)].sprites.push({img,off,w,col})};
 const N=etat.segs.length,startI=Math.floor(PZ/SEG);
 etat.segs[startI].start=true;etat.segs[startI+1].start=true;
 add(startI+1,etat.SP.gate,0,4900,false);
 for(let i=20;i<N-10;i++){
  const s=etat.segs[i];
  if(etat.T.deco==='city'){
   if(i%8===0){add(i,etat.SP.lamp,-1.18,260);add(i,etat.SP.lamp,1.18,260)}
   if(i%14===3){add(i,etat.SP.tower[(R()*3)|0],-(2.6+R()*2.4),1700);}
   if(i%14===10){add(i,etat.SP.tower[(R()*3)|0],2.6+R()*2.4,1700)}
   if(i%90===45)add(i,etat.SP.bill[(R()*4)|0],R()<.5?-1.9:1.9,1800);
   if(i%22===11)add(i,etat.SP.palm,R()<.5?-1.6:1.6,1300);
  }else if(etat.T.deco==='desert'){
   if(i%30===0){add(i,etat.SP.pylon,-1.5,1500);add(i,etat.SP.pylon,1.5,1500)}
   if(i%11===5)add(i,etat.SP.crystal,(R()<.5?-1:1)*(1.8+R()*3),900);
   if(i%17===8)add(i,etat.SP.palm,(R()<.5?-1:1)*(2+R()*2.5),1300);
   if(i%100===60)add(i,etat.SP.bill[(R()*4)|0],R()<.5?-2:2,1800);
  }else{
   if(i%10===0){add(i,etat.SP.pillar,-1.2,380);add(i,etat.SP.pillar,1.2,380)}
   if(i%40===20)add(i,etat.SP.ring,0,4600,false);
   if(i%13===6)add(i,etat.SP.crystal,(R()<.5?-1:1)*(2.2+R()*3),1000);
   if(i%110===70)add(i,etat.SP.bill[(R()*4)|0],R()<.5?-2.1:2.1,1800);
  }
  if(Math.abs(s.curve)>=2.5&&i%7===0)add(i,s.curve>0?etat.SP.chevR:etat.SP.chevL,s.curve>0?-1.32:1.32,620);
 }
 // plaques de boost sur les lignes droites
 for(let i=260;i<N-60;i+=230){let j=i;while(j<N-60&&etat.segs.slice(j,j+6).some(s=>s.curve!==0))j++;if(j>=N-60)break;const lane=[-.55,0,.55][(R()*3)|0];for(let k=0;k<6;k++)etat.segs[j+k].pad=lane;i=j}
}
export const findSeg=z=>etat.segs[Math.floor(z/SEG)%etat.segs.length];
