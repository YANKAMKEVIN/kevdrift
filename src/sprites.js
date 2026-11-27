// @ts-check
/** Images précalculées sur canvas : voitures et décors. */
import { rng } from './util.js';
import { etat } from './state.js';

// ================== SPRITES PRÉCALCULÉS ==================
/** Canvas hors écran et son contexte. @param {number} w @param {number} h @returns {[HTMLCanvasElement, CanvasRenderingContext2D]} */
export function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return[c,/** @type {CanvasRenderingContext2D} */(c.getContext('2d'))]}
function glow(g,col,b){g.shadowColor=col;g.shadowBlur=b}
export function carSprite(col,col2,lean){
 const[c,g]=mk(320,190),L=lean*16;
 // halo de lévitation
 const hg=g.createRadialGradient(160,172,4,160,172,150);hg.addColorStop(0,col+'cc');hg.addColorStop(1,col+'00');
 g.fillStyle=hg;g.save();g.scale(1,.16);g.beginPath();g.arc(160,172/.16,150,0,7);g.fill();g.restore();
 // carrosserie
 const bg=g.createLinearGradient(0,80,0,150);bg.addColorStop(0,'#3a2f63');bg.addColorStop(.5,'#1c1636');bg.addColorStop(1,'#0a0718');
 g.fillStyle=bg;g.beginPath();g.moveTo(14,150);g.lineTo(306,150);g.lineTo(300,108);g.lineTo(256+L*.6,88);g.lineTo(64+L*.6,88);g.lineTo(20,108);g.closePath();g.fill();
 // ailerons latéraux
 g.fillStyle='#120d26';g.beginPath();g.moveTo(8,150);g.lineTo(30,150);g.lineTo(34,112);g.lineTo(14,118);g.fill();g.beginPath();g.moveTo(312,150);g.lineTo(290,150);g.lineTo(286,112);g.lineTo(306,118);g.fill();
 // cockpit
 const cg=g.createLinearGradient(0,50,0,90);cg.addColorStop(0,'#8fe9ff');cg.addColorStop(.25,'#3a3a8a');cg.addColorStop(1,'#0b0820');
 g.fillStyle=cg;g.beginPath();g.moveTo(92+L,88);g.lineTo(228+L,88);g.lineTo(206+L*1.2,54);g.lineTo(114+L*1.2,54);g.closePath();g.fill();
 g.strokeStyle=col;g.lineWidth=2;glow(g,col,10);g.stroke();
 // liserés néon
 g.lineWidth=3;g.beginPath();g.moveTo(20,108);g.lineTo(64+L*.6,88);g.lineTo(256+L*.6,88);g.lineTo(300,108);g.stroke();
 g.strokeStyle=col2;g.lineWidth=2;g.beginPath();g.moveTo(16,140);g.lineTo(304,140);g.stroke();
 // barre de feux arrière
 glow(g,'#ff1f5a',22);const tg=g.createLinearGradient(30,0,290,0);tg.addColorStop(0,'#ff1f5a');tg.addColorStop(.5,'#ff7aa0');tg.addColorStop(1,'#ff1f5a');
 g.fillStyle=tg;g.fillRect(30,110,260,9);g.fillStyle='#fff';g.globalAlpha=.7;g.fillRect(40,113,240,2);g.globalAlpha=1;
 // diffuseur + tuyères
 g.shadowBlur=0;g.fillStyle='#07040f';g.fillRect(60,126,200,20);
 g.strokeStyle='#2a2250';g.lineWidth=2;for(let i=0;i<9;i++){g.beginPath();g.moveTo(72+i*22,128);g.lineTo(72+i*22,144);g.stroke()}
 glow(g,col,16);g.fillStyle=col;[110,210].forEach(x=>{g.beginPath();g.ellipse(x,136,16,7,0,0,7);g.fill()});
 g.fillStyle='#fff';[110,210].forEach(x=>{g.beginPath();g.ellipse(x,136,7,3,0,0,7);g.fill()});
 // emblème
 g.shadowBlur=8;g.fillStyle=col;g.beginPath();g.moveTo(160+L*.6,92);g.lineTo(168+L*.6,100);g.lineTo(160+L*.6,108);g.lineTo(152+L*.6,100);g.fill();
 return c;
}
export function carSet(col,col2){return[-1,-.5,0,.5,1].map(l=>carSprite(col,col2,l))}
export function buildSprites(TT){
 const R=rng(TT.seed*7+3),S={};
 const E=TT.edge,C=TT.rumble;
 // tours
 S.tower=[0,1,2].map(k=>{const h=[520,680,420][k],[c,g]=mk(200,h);const gr=g.createLinearGradient(0,0,200,0);gr.addColorStop(0,'#0d0620');gr.addColorStop(.5,'#1d0f38');gr.addColorStop(1,'#0a0418');
  g.fillStyle=gr;g.fillRect(10,30,180,h-30);const wc=[E,C,'#ffd23f'];
  for(let y=50;y<h-20;y+=18)for(let x=24;x<176;x+=16)if(R()<.42){g.globalAlpha=.35+R()*.6;g.fillStyle=wc[(R()*3)|0];g.fillRect(x,y,8,9)}
  g.globalAlpha=1;glow(g,E,14);g.strokeStyle=k==1?C:E;g.lineWidth=4;g.strokeRect(10,30,180,h-30);
  g.fillStyle='#ff2050';glow(g,'#ff2050',16);g.fillRect(96,2,8,28);return c});
 S.lamp=(()=>{const[c,g]=mk(80,300);g.fillStyle='#120a22';g.fillRect(34,40,12,260);glow(g,C,18);g.fillStyle=C;g.fillRect(38,60,4,240);
  g.fillStyle='#fff';glow(g,E,30);g.fillRect(10,22,60,12);g.fillStyle=E;g.fillRect(14,34,52,4);return c})();
 S.palm=(()=>{const[c,g]=mk(320,420);glow(g,E,14);g.strokeStyle=E;g.lineWidth=7;g.lineCap='round';
  g.beginPath();g.moveTo(170,420);g.quadraticCurveTo(140,240,168,110);g.stroke();g.strokeStyle='#3dff9a';glow(g,'#3dff9a',14);g.lineWidth=5;
  for(let i=0;i<7;i++){const a=-Math.PI+i*Math.PI/6+.1;g.beginPath();g.moveTo(168,110);g.quadraticCurveTo(168+Math.cos(a)*90,110+Math.sin(a)*90-30,168+Math.cos(a)*150,110+Math.sin(a)*40+60);g.stroke()}return c})();
 S.bill=['KEVDRIFT','RADIO KEV 88.8','TURBO KEV','DRIFTE OU RIEN'].map((txt,k)=>{const[c,g]=mk(420,260);g.fillStyle='#120a22';g.fillRect(70,150,14,110);g.fillRect(336,150,14,110);
  const bg=g.createLinearGradient(0,0,420,170);bg.addColorStop(0,'#2a0845');bg.addColorStop(1,'#0b0420');g.fillStyle=bg;g.fillRect(10,10,400,150);
  glow(g,k%2?C:E,20);g.strokeStyle=k%2?C:E;g.lineWidth=6;g.strokeRect(10,10,400,150);g.fillStyle='#fff';g.font=(txt.length>10?40:62)+'px Audiowide, sans-serif';g.textAlign='center';g.textBaseline='middle';
  glow(g,k%2?E:C,18);g.fillText(txt,210,86);return c});
 S.chevL=(()=>{const[c,g]=mk(180,150);g.fillStyle='#0a0418';g.fillRect(10,10,160,90);g.fillStyle='#120a22';g.fillRect(84,100,12,50);glow(g,'#ffd23f',16);g.strokeStyle='#ffd23f';g.lineWidth=10;g.lineJoin='miter';
  for(let i=0;i<3;i++){g.beginPath();g.moveTo(130-i*40,26);g.lineTo(100-i*40,55);g.lineTo(130-i*40,84);g.stroke()}return c})();
 S.chevR=(()=>{const[c,g]=mk(180,150);g.translate(180,0);g.scale(-1,1);g.drawImage(S.chevL,0,0);return c})();
 S.pylon=(()=>{const[c,g]=mk(300,320);glow(g,E,22);g.strokeStyle=E;g.lineWidth=10;g.beginPath();g.moveTo(20,315);g.lineTo(150,20);g.lineTo(280,315);g.stroke();
  g.strokeStyle=C;g.lineWidth=5;glow(g,C,16);g.beginPath();g.moveTo(80,315);g.lineTo(150,150);g.lineTo(220,315);g.stroke();return c})();
 S.crystal=(()=>{const[c,g]=mk(200,300);glow(g,C,20);for(let i=0;i<4;i++){const x=40+i*38,h=120+R()*170,w=22+R()*16;const gr=g.createLinearGradient(0,300-h,0,300);gr.addColorStop(0,'#ffffffdd');gr.addColorStop(.3,C+'bb');gr.addColorStop(1,E+'33');
  g.fillStyle=gr;g.beginPath();g.moveTo(x,300);g.lineTo(x-w/2,300-h*.75);g.lineTo(x,300-h);g.lineTo(x+w/2,300-h*.75);g.closePath();g.fill()}return c})();
 S.ring=(()=>{const[c,g]=mk(320,360);g.fillStyle='#0a0f24';g.fillRect(140,300,40,60);glow(g,C,24);g.strokeStyle=C;g.lineWidth=12;g.beginPath();g.arc(160,160,130,0,7);g.stroke();
  g.strokeStyle=E;g.lineWidth=4;glow(g,E,14);g.beginPath();g.arc(160,160,108,0,7);g.stroke();return c})();
 S.pillar=(()=>{const[c,g]=mk(90,520);const gr=g.createLinearGradient(0,0,0,520);gr.addColorStop(0,C+'00');gr.addColorStop(.6,C+'99');gr.addColorStop(1,'#ffffff');g.fillStyle=gr;g.fillRect(30,0,30,520);
  g.fillStyle='#0d132c';g.fillRect(18,480,54,40);glow(g,E,10);g.strokeStyle=E;g.lineWidth=3;g.strokeRect(18,480,54,40);return c})();
 S.gate=(()=>{const[c,g]=mk(1000,420);g.fillStyle='#120a22';g.fillRect(30,60,40,360);g.fillRect(930,60,40,360);glow(g,E,18);g.strokeStyle=E;g.lineWidth=5;g.strokeRect(30,60,40,360);g.strokeRect(930,60,40,360);
  g.shadowBlur=0;for(let x=0;x<28;x++)for(let y=0;y<2;y++){g.fillStyle=(x+y)%2?'#fff':'#0a0418';g.fillRect(70+x*31.4,40+y*16,31.4,16)}
  g.fillStyle='#0a0418';g.fillRect(70,72,860,70);glow(g,C,20);g.strokeStyle=C;g.lineWidth=4;g.strokeRect(70,72,860,70);
  g.fillStyle='#fff';g.font='52px Audiowide, sans-serif';g.textAlign='center';g.textBaseline='middle';glow(g,E,20);g.fillText('KEVDRIFT  ·  '+TT.name.toUpperCase(),500,108);return c})();
 // soleil / planète
 S.sun=(()=>{const r=220,[c,g]=mk(r*2+80,r*2+80),cx=r+40;
  if(TT.mount.kind==='space'){const pg=g.createRadialGradient(cx-60,cx-70,10,cx,cx,r);pg.addColorStop(0,TT.sun[0]);pg.addColorStop(.5,TT.sun[1]);pg.addColorStop(1,TT.sun[2]);glow(g,TT.sun[1],60);g.fillStyle=pg;g.beginPath();g.arc(cx,cx,r*.8,0,7);g.fill();
   g.shadowBlur=0;g.globalCompositeOperation='source-atop';g.globalAlpha=.25;g.fillStyle='#000';for(let i=0;i<6;i++){g.fillRect(0,cx-r+i*70+20,r*3,14)}
   g.globalCompositeOperation='source-over';g.globalAlpha=1;g.strokeStyle='#ff2bd6';g.lineWidth=6;glow(g,'#ff2bd6',20);g.save();g.translate(cx,cx);g.rotate(-.25);g.scale(1,.22);g.beginPath();g.arc(0,0,r*1.12,.15,Math.PI-.15);g.stroke();g.restore();return c}
  const sg=g.createLinearGradient(0,cx-r,0,cx+r);sg.addColorStop(0,TT.sun[0]);sg.addColorStop(.5,TT.sun[1]);sg.addColorStop(1,TT.sun[2]);glow(g,TT.sun[2],70);g.fillStyle=sg;g.beginPath();g.arc(cx,cx,r,0,7);g.fill();
  g.shadowBlur=0;g.globalCompositeOperation='destination-out';for(let i=0;i<9;i++){const y=cx+10+i*i*3.2+i*12,h=3+i*2.1;g.fillRect(0,y,r*3,h)}g.globalCompositeOperation='source-over';return c})();
 // relief / skyline
 S.mount=(()=>{const w=2400,h=360,[c,g]=mk(w,h),M=TT.mount;const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,M.fill[0]);gr.addColorStop(1,M.fill[1]);
  if(M.kind==='city'){g.fillStyle=gr;let x=0;const tops=[];while(x<w){const bw=30+R()*90,bh=60+R()*R()*260;g.fillRect(x,h-bh,bw,bh);tops.push([x,bw,bh]);
    for(let yy=h-bh+10;yy<h-6;yy+=12)for(let xx=x+6;xx<x+bw-6;xx+=10)if(R()<.18){g.fillStyle=R()<.5?E+'aa':C+'99';g.fillRect(xx,yy,4,5)}g.fillStyle=gr;x+=bw+2}
   g.strokeStyle=M.line;g.lineWidth=2;glow(g,M.line,8);g.globalAlpha=.6;tops.forEach(([x,bw,bh])=>{g.beginPath();g.moveTo(x,h);g.lineTo(x,h-bh);g.lineTo(x+bw,h-bh);g.lineTo(x+bw,h);g.stroke()});return c}
  const pts=[];let y=h*.6;const N=60;for(let i=0;i<=N;i++){const x=i*w/N;if(M.kind==='mesa'){if(R()<.3)y=h*(.25+R()*.55)}else y=h*(.35+R()*.6);pts.push([x,(i===0||i===N)?h*.6:y])}
  g.fillStyle=gr;g.beginPath();g.moveTo(0,h);pts.forEach(([x,y],i)=>{if(M.kind==='mesa'&&i>0)g.lineTo(x,pts[i-1][1]);g.lineTo(x,y)});g.lineTo(w,h);g.fill();
  g.strokeStyle=M.line;g.lineWidth=3;glow(g,M.line,14);g.beginPath();pts.forEach(([x,y],i)=>{if(i===0)g.moveTo(x,y);else{if(M.kind==='mesa')g.lineTo(x,pts[i-1][1]);g.lineTo(x,y)}});g.stroke();
  g.lineWidth=1;g.globalAlpha=.35;g.shadowBlur=0;pts.forEach(([x,y])=>{g.beginPath();g.moveTo(x,y);g.lineTo(x+(x-w/2)*.05,h);g.stroke()});return c})();
 etat.SP=S;
}
