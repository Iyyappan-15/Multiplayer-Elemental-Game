// ── GAME STATE ──────────────────────────────────────────────────────────────
let player1Move = null, score1 = 0, score2 = 0;

// ── RESULT LOGIC (corrected per user rules) ──────────────────────────────────
function getResult(a, b) {
  if (a === b) return 'draw';
  const W = {
    'Air|Fire':'Air',   'Air|Paper':'draw',  'Air|Scissors':'Scissors',
    'Air|Stone':'draw', 'Air|Water':'Air',   'Fire|Paper':'Fire',
    'Fire|Scissors':'Fire','Fire|Stone':'draw','Fire|Water':'Water',
    'Paper|Scissors':'Scissors','Paper|Stone':'Paper','Paper|Water':'Paper',
    'Scissors|Stone':'Stone','Scissors|Water':'draw','Stone|Water':'Water'
  };
  const key = [a,b].sort().join('|');
  const w = W[key];
  if (!w || w==='draw') return 'draw';
  return w===a ? 'a' : 'b';
}

// ── THREE.JS CORE ─────────────────────────────────────────────────────────────
let R=null, SC=null, CAM=null, AID=null;

function initThreeJS() {
  if (typeof THREE==='undefined') return false;
  if (R) return true;
  const cv = document.getElementById('threeCanvas');
  SC = new THREE.Scene();
  SC.background = new THREE.Color(0xffffff);
  CAM = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
  CAM.position.set(0,0,7);
  R = new THREE.WebGLRenderer({canvas:cv, antialias:true});
  R.setSize(innerWidth, innerHeight);
  R.setPixelRatio(Math.min(devicePixelRatio,2));
  addEventListener('resize', ()=>{
    CAM.aspect=innerWidth/innerHeight; CAM.updateProjectionMatrix();
    R.setSize(innerWidth,innerHeight);
  });
  return true;
}

// ── ELEMENT CONFIGS ───────────────────────────────────────────────────────────
function cfg(move) {
  const M = THREE.MeshPhongMaterial;
  const C = THREE.Color;
  const map = {
    Stone:   {geo:new THREE.IcosahedronGeometry(0.9,1),
               mat:new M({color:0x556677,shininess:50,specular:new C(0x223344),emissive:new C(0x000000),emissiveIntensity:0}),
               pc:0x7799aa, lc:0x445566, lbl:'🪨 Stone'},
    Paper:   {geo:new THREE.BoxGeometry(1.2,1.6,0.06),
               mat:new M({color:0xd4c17a,shininess:80,specular:new C(0x997700),side:THREE.DoubleSide}),
               pc:0xe8d890, lc:0xbbaa44, lbl:'📄 Paper'},
    Scissors:{geo:new THREE.OctahedronGeometry(0.85,0),
               mat:new M({color:0x7799bb,shininess:200,specular:new C(0xffffff)}),
               pc:0x99bbdd, lc:0x5577aa, lbl:'✂️ Scissors'},
    Fire:    {geo:new THREE.ConeGeometry(0.55,1.9,8),
               mat:new M({color:0xff4400,emissive:new C(0xff2200),emissiveIntensity:0.6,shininess:60,specular:new C(0xffaa00)}),
               pc:0xff6600, lc:0xff3300, lbl:'🔥 Fire'},
    Water:   {geo:new THREE.SphereGeometry(0.85,32,32),
               mat:new M({color:0x0077ff,transparent:true,opacity:0.85,shininess:250,specular:new C(0x66ccff)}),
               pc:0x0099ff, lc:0x0055cc, lbl:'💧 Water'},
    Air:     {geo:new THREE.TorusGeometry(0.72,0.22,16,60),
               mat:new M({color:0x00aacc,transparent:true,opacity:0.75,shininess:180,specular:new C(0xaaffff)}),
               pc:0x00ccee, lc:0x009999, lbl:'🌬️ Air'}
  };
  return map[move]||{geo:new THREE.SphereGeometry(0.8,16,16),mat:new THREE.MeshPhongMaterial({color:0x888888}),pc:0x888888,lc:0x444444,lbl:'❓'};
}

// ── PARTICLE HELPERS ──────────────────────────────────────────────────────────
function mkPts(count, color, size, origin, velFn, lifespan=800) {
  const geo=new THREE.BufferGeometry();
  const pos=new Float32Array(count*3), vel=[];
  for(let i=0;i<count;i++){
    pos[i*3]=origin[0]; pos[i*3+1]=origin[1]; pos[i*3+2]=origin[2]||0;
    vel.push(velFn(i));
  }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const pts=new THREE.Points(geo,new THREE.PointsMaterial({color,size,transparent:true,opacity:1}));
  pts.userData={vel,age:0,lifespan};
  return pts;
}

function tickPts(pts,dt,gy=0,drag=0.96) {
  pts.userData.age+=dt;
  const t=Math.min(pts.userData.age/pts.userData.lifespan,1);
  pts.material.opacity=1-t;
  const pos=pts.geometry.attributes.position.array, vel=pts.userData.vel;
  for(let i=0;i<vel.length;i++){
    vel[i].x*=drag; vel[i].y*=drag; vel[i].z*=drag; vel[i].y+=gy;
    pos[i*3]+=vel[i].x; pos[i*3+1]+=vel[i].y; pos[i*3+2]+=vel[i].z;
  }
  pts.geometry.attributes.position.needsUpdate=true;
  return t>=1;
}

const rnd=()=>Math.random();
const rndDir=()=>({x:(rnd()-0.5)*0.12,y:(rnd()-0.5)*0.1,z:(rnd()-0.5)*0.04});
const rndUp =()=>({x:(rnd()-0.5)*0.05,y:0.025+rnd()*0.045,z:(rnd()-0.5)*0.02});
const rndDn =()=>({x:(rnd()-0.5)*0.05,y:-(0.02+rnd()*0.05),z:(rnd()-0.5)*0.02});
const rndRing=()=>{const a=rnd()*Math.PI*2,s=0.03+rnd()*0.07;return{x:Math.cos(a)*s,y:Math.sin(a)*s*0.3,z:0};};

function smoke(x,y)    {return mkPts(80,0x999999,0.10,[x,y,0],rndUp,900);}
function embers(x,y)   {return mkPts(150,0xff6600,0.07,[x,y,0],rndUp,1000);}
function confetti(x,y) {return mkPts(200,0xddddcc,0.07,[x,y,0],rndDir,900);}
function sparks(x,y)   {return mkPts(200,0xccddff,0.06,[x,y,0],rndRing,700);}
function mist(x,y)     {return mkPts(100,0x44aaff,0.09,[x,y,0],rndUp,1000);}
function drips(x,y)    {return mkPts(80,0xff8800,0.08,[x,y,0.5],rndDn,800);}
function pebbles(x,y)  {return mkPts(120,0x9aaa88,0.08,[x,y,0],rndDir,1000);}
function shimmer(x,y)  {return mkPts(100,0xffcc00,0.07,[x,y,0],rndDir,900);}
function wind(x,y,d=1) {return mkPts(120,0x00ccee,0.06,[x,y,0],()=>({x:d*(0.06+rnd()*0.1),y:(rnd()-0.5)*0.06,z:0}),800);}
function ripple(x,y)   {return mkPts(80,0x44aaff,0.06,[x,y,0],rndRing,900);}

// ── ELEMENT HALO ──────────────────────────────────────────────────────────────
function mkHalo(color,count=100) {
  const geo=new THREE.BufferGeometry();
  const pos=new Float32Array(count*3), bases=[];
  for(let i=0;i<count;i++){
    const th=rnd()*Math.PI*2,ph=Math.acos(2*rnd()-1),r=0.9+rnd()*0.9;
    const x=r*Math.sin(ph)*Math.cos(th),y=r*Math.sin(ph)*Math.sin(th),z=r*Math.cos(ph);
    pos[i*3]=x; pos[i*3+1]=y; pos[i*3+2]=z;
    bases.push({x,y,z,ph:rnd()*Math.PI*2,sp:0.5+rnd()});
  }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const h=new THREE.Points(geo,new THREE.PointsMaterial({color,size:0.055,transparent:true,opacity:0.8}));
  h.userData={bases,t:0}; return h;
}
function tickHalo(h) {
  h.userData.t+=0.022;
  const t=h.userData.t, pos=h.geometry.attributes.position.array;
  for(let i=0;i<h.userData.bases.length;i++){
    const b=h.userData.bases[i], p=1+0.18*Math.sin(t*b.sp+b.ph);
    pos[i*3]=b.x*p; pos[i*3+1]=b.y*p; pos[i*3+2]=b.z*p;
  }
  h.geometry.attributes.position.needsUpdate=true;
}

// ── HELPERS FOR STORIES ────────────────────────────────────────────────────────
function orbit(mA,mB,age){
  const t=age*0.003;
  mA.position.x=-1.5*Math.cos(t); mA.position.y=0.6*Math.sin(t);
  mB.position.x= 1.5*Math.cos(t+Math.PI); mB.position.y=0.6*Math.sin(t+Math.PI);
  mA.rotation.y+=0.025; mB.rotation.y-=0.025;
}
function dieLerp(m,age,dur=800){
  const t=Math.min(age/dur,1);
  m.scale.setScalar(Math.max(0.01,1-t));
  if(m.material.transparent) m.material.opacity=Math.max(0,1-t);
}
function glow(m,hex,age){
  m.material.emissive.setHex(hex);
  m.material.emissiveIntensity=0.3+0.2*Math.sin(age*0.01);
  m.scale.setScalar(1.25+0.12*Math.sin(age*0.008));
  m.rotation.y+=0.04;
}

// ── 15 CLASH STORIES ─────────────────────────────────────────────────────────
// Each entry: winner:'ElementName'|'draw', init(sc,wM,lM,st), update(sc,wM,lM,st,age,dt)
// For draws: wM=meshA (alpha first), lM=meshB
const STORIES = {

  'Air|Fire':{ winner:'Air',
    init(sc,wM,lM,st){st.p=smoke(lM.position.x,lM.position.y);sc.add(st.p);},
    update(sc,wM,lM,st,age,dt){
      lM.material.emissiveIntensity=Math.max(0,0.6-age/600);
      lM.material.color.lerp(new THREE.Color(0x888888),0.04);
      dieLerp(lM,age,900);
      glow(wM,0x00ddff,age);
      if(st.p)tickPts(st.p,dt,0.001);
    }},

  'Air|Paper':{ winner:'draw',
    init(sc,wM,lM,st){st.p=wind(0,0,1);sc.add(st.p);},
    update(sc,wM,lM,st,age,dt){
      // wM=Air, lM=Paper
      orbit(wM,lM,age);
      lM.rotation.z=0.4*Math.sin(age*0.015);
      wM.rotation.y+=0.04;
      if(st.p)tickPts(st.p,dt);
    }},

  'Air|Scissors':{ winner:'Scissors',
    init(sc,wM,lM,st){st.p=wind(lM.position.x,0,Math.sign(lM.position.x)||1);sc.add(st.p);},
    update(sc,wM,lM,st,age,dt){
      // wM=Scissors(winner), lM=Air(loser)
      dieLerp(lM,age,700);
      glow(wM,0x6699ff,age); wM.rotation.y+=0.04;
      if(st.p)tickPts(st.p,dt);
    }},

  'Air|Stone':{ winner:'draw',
    init(sc,wM,lM,st){st.p=wind(-0.5,0,1);sc.add(st.p);},
    update(sc,wM,lM,st,age,dt){
      // wM=Air, lM=Stone
      orbit(wM,lM,age);
      lM.position.x+=Math.sin(age*0.03)*0.001;
      wM.rotation.y+=0.05;
      if(st.p)tickPts(st.p,dt);
    }},

  'Air|Water':{ winner:'Air',
    init(sc,wM,lM,st){st.p=mist(lM.position.x,lM.position.y);sc.add(st.p);},
    update(sc,wM,lM,st,age,dt){
      // wM=Air, lM=Water
      lM.position.y+=0.003;
      dieLerp(lM,age,900);
      glow(wM,0x00eeee,age);
      if(st.p)tickPts(st.p,dt,0.001);
    }},

  'Fire|Paper':{ winner:'Fire',
    init(sc,wM,lM,st){st.p=embers(lM.position.x,lM.position.y);sc.add(st.p);},
    update(sc,wM,lM,st,age,dt){
      // wM=Fire, lM=Paper
      lM.material.color.lerp(new THREE.Color(0x111100),0.04);
      dieLerp(lM,age,900);
      wM.material.emissiveIntensity=0.6+0.4*Math.sin(age*0.01);
      wM.scale.setScalar(1.35+0.15*Math.sin(age*0.008));
      wM.rotation.y+=0.04;
      if(st.p)tickPts(st.p,dt,-0.0003);
    }},

  'Fire|Scissors':{ winner:'Fire',
    init(sc,wM,lM,st){st.p=drips(lM.position.x,lM.position.y);sc.add(st.p);},
    update(sc,wM,lM,st,age,dt){
      // wM=Fire, lM=Scissors
      const t=Math.min(age/900,1);
      lM.material.emissive.setHex(0xff4400);
      lM.material.emissiveIntensity=t*1.5;
      lM.material.color.lerp(new THREE.Color(0xff6600),0.03);
      lM.scale.x=Math.max(0.01,1-t*0.9);
      lM.scale.y=Math.max(0.3,1-t*0.6);
      lM.scale.z=Math.max(0.01,1-t*0.9);
      wM.material.emissiveIntensity=0.6+0.5*Math.sin(age*0.01);
      wM.scale.setScalar(1.3+0.15*Math.sin(age*0.008));
      wM.rotation.y+=0.04;
      if(st.p)tickPts(st.p,dt,-0.003);
    }},

  'Fire|Stone':{ winner:'draw',
    init(sc,wM,lM,st){
      // wM=Fire,lM=Stone
      st.p=embers(0,0); st.p.userData.lifespan=1200; sc.add(st.p);
    },
    update(sc,wM,lM,st,age,dt){
      orbit(wM,lM,age);
      lM.material.emissive.setHex(0xff2200);
      lM.material.emissiveIntensity=0.1+0.1*Math.sin(age*0.008);
      wM.rotation.y+=0.04;
      if(st.p)tickPts(st.p,dt,0.0003);
    }},

  'Fire|Water':{ winner:'Water',
    init(sc,wM,lM,st){st.p=smoke(lM.position.x,lM.position.y);sc.add(st.p);},
    update(sc,wM,lM,st,age,dt){
      // wM=Water, lM=Fire
      lM.material.emissiveIntensity=Math.max(0,0.6-age/500);
      lM.material.color.lerp(new THREE.Color(0x888888),0.04);
      dieLerp(lM,age,800);
      glow(wM,0x0044ff,age);
      if(st.p)tickPts(st.p,dt,0.001);
    }},

  'Paper|Scissors':{ winner:'Scissors',
    init(sc,wM,lM,st){st.p=confetti(lM.position.x,lM.position.y);sc.add(st.p);},
    update(sc,wM,lM,st,age,dt){
      // wM=Scissors, lM=Paper
      const t=Math.min(age/800,1);
      lM.scale.x=Math.max(0.01,1-t);
      lM.scale.y=Math.max(0.01,1-t*0.6);
      lM.position.y-=0.003;
      glow(wM,0x99bbff,age); wM.rotation.y+=0.04;
      if(st.p)tickPts(st.p,dt,-0.0005);
    }},

  'Paper|Stone':{ winner:'Paper',
    init(sc,wM,lM,st){st.p=shimmer(wM.position.x,0);sc.add(st.p);},
    update(sc,wM,lM,st,age,dt){
      // wM=Paper, lM=Stone
      lM.material.transparent=true;
      lM.material.opacity=Math.max(0,1-Math.min(age/900,1));
      lM.scale.setScalar(Math.max(0.01,1-Math.min(age/900,1)*0.7));
      glow(wM,0xffcc00,age);
      wM.rotation.z=0.1*Math.sin(age*0.006);
      if(st.p)tickPts(st.p,dt);
    }},

  'Paper|Water':{ winner:'Paper',
    init(sc,wM,lM,st){
      // wM=Paper, lM=Water
      const ox=lM.position.x;
      st.p=mkPts(100,0x0099ff,0.06,[ox,0,0],()=>{
        const a=rnd()*Math.PI*2,s=0.03+rnd()*0.05;
        return{x:-Math.cos(a)*s,y:Math.sin(a)*s,z:0};
      },800);
      sc.add(st.p);
    },
    update(sc,wM,lM,st,age,dt){
      dieLerp(lM,age,800);
      wM.scale.setScalar(1.3+0.12*Math.sin(age*0.008));
      const t=Math.min(age/900,1);
      wM.material.color.lerp(t<0.5?new THREE.Color(0x99aacc):new THREE.Color(0xd4c17a),0.04);
      wM.rotation.y+=0.03;
      if(st.p)tickPts(st.p,dt);
    }},

  'Scissors|Stone':{ winner:'Stone',
    init(sc,wM,lM,st){st.p=sparks(0,0);sc.add(st.p);},
    update(sc,wM,lM,st,age,dt){
      // wM=Stone, lM=Scissors
      dieLerp(lM,age,700);
      lM.rotation.x+=0.08*(1-Math.min(age/700,1));
      lM.rotation.z+=0.06*(1-Math.min(age/700,1));
      if(age<200){
        wM.material.emissive.setHex(0xffffff);
        wM.material.emissiveIntensity=(1-age/200)*1.5;
      } else {
        wM.material.emissiveIntensity=Math.max(0,wM.material.emissiveIntensity-0.02);
      }
      wM.scale.setScalar(1.2+0.1*Math.sin(age*0.008));
      wM.rotation.y+=0.02;
      if(st.p)tickPts(st.p,dt);
    }},

  'Scissors|Water':{ winner:'draw',
    init(sc,wM,lM,st){st.p=ripple(0,0);sc.add(st.p);},
    update(sc,wM,lM,st,age,dt){
      orbit(wM,lM,age);
      wM.rotation.y+=0.04;
      if(st.p)tickPts(st.p,dt);
    }},

  'Stone|Water':{ winner:'Water',
    init(sc,wM,lM,st){st.p=pebbles(lM.position.x,lM.position.y);sc.add(st.p);},
    update(sc,wM,lM,st,age,dt){
      // wM=Water, lM=Stone
      dieLerp(lM,age,1000);
      lM.material.color.lerp(new THREE.Color(0x333333),0.02);
      glow(wM,0x0033cc,age);
      if(st.p)tickPts(st.p,dt,-0.002);
    }}
};

// ── ARENA RING ────────────────────────────────────────────────────────────────
function mkRing(){
  const m=new THREE.Mesh(
    new THREE.TorusGeometry(4,0.04,8,120),
    new THREE.MeshBasicMaterial({color:0x4466cc,transparent:true,opacity:0.3})
  );
  m.rotation.x=Math.PI/2; m.position.y=-2.8; return m;
}

// ── CLASH EXPLOSION BURST ─────────────────────────────────────────────────────
function mkBurst(){
  const n=500,geo=new THREE.BufferGeometry();
  const pos=new Float32Array(n*3),col=new Float32Array(n*3),vel=[];
  const pal=[[1,.9,.1],[1,.5,0],[1,.2,.1],[1,1,.9],[.7,.9,1]];
  for(let i=0;i<n;i++){
    pos[i*3]=pos[i*3+1]=pos[i*3+2]=0;
    const sp=0.04+rnd()*0.16,th=rnd()*Math.PI*2,ph=Math.acos(2*rnd()-1);
    vel.push({x:sp*Math.sin(ph)*Math.cos(th),y:sp*Math.sin(ph)*Math.sin(th),z:sp*Math.cos(ph)*0.3});
    const c=pal[Math.floor(rnd()*pal.length)];
    col[i*3]=c[0];col[i*3+1]=c[1];col[i*3+2]=c[2];
  }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  const pts=new THREE.Points(geo,new THREE.PointsMaterial({size:0.09,transparent:true,opacity:1,vertexColors:true}));
  pts.userData={vel,age:0};
  return pts;
}
function tickBurst(b,dt){
  b.userData.age+=dt;
  const pos=b.geometry.attributes.position.array,vel=b.userData.vel;
  for(let i=0;i<vel.length;i++){
    vel[i].x*=0.96;vel[i].y*=0.96;vel[i].z*=0.96;
    pos[i*3]+=vel[i].x;pos[i*3+1]+=vel[i].y;pos[i*3+2]+=vel[i].z;
  }
  b.geometry.attributes.position.needsUpdate=true;
  b.material.opacity=Math.max(0,1-b.userData.age/600);
}

// ── EASING ────────────────────────────────────────────────────────────────────
function easeOutExpo(t){return t>=1?1:1-Math.pow(2,-10*t);}

// ── MAIN BATTLE ANIMATION ─────────────────────────────────────────────────────
function runBattleAnimation(move1, move2, onComplete) {
  if (!initThreeJS()){onComplete();return;}
  if (AID) cancelAnimationFrame(AID);
  while(SC.children.length) SC.remove(SC.children[0]);
  CAM.position.set(0,0,7);

  SC.add(mkRing());
  SC.add(new THREE.AmbientLight(0xffffff,1.8));
  const tL=new THREE.PointLight(0xffffff,2,40); tL.position.set(0,8,5); SC.add(tL);

  const c1=cfg(move1), c2=cfg(move2);
  const m1=new THREE.Mesh(c1.geo,c1.mat), m2=new THREE.Mesh(c2.geo,c2.mat);
  m1.position.set(-11,0,0); m2.position.set(11,0,0);
  SC.add(m1); SC.add(m2);

  const eL1=new THREE.PointLight(c1.lc,2,16); eL1.position.set(-5,0,3); SC.add(eL1);
  const eL2=new THREE.PointLight(c2.lc,2,16); eL2.position.set( 5,0,3); SC.add(eL2);

  const h1=mkHalo(c1.pc), h2=mkHalo(c2.pc);
  SC.add(h1); SC.add(h2);

  // Labels
  const lblDiv=document.getElementById('battleLabels');
  document.getElementById('battleLabel1').textContent=c1.lbl;
  document.getElementById('battleLabel2').textContent=c2.lbl;
  lblDiv.style.display='flex';

  // Show canvas
  const cv=document.getElementById('threeCanvas');
  cv.style.display='block'; cv.style.transition='opacity 0.22s ease';
  requestAnimationFrame(()=>{cv.style.opacity='1';});

  // Result & story setup
  const res=getResult(move1,move2);
  const key=[move1,move2].sort().join('|');
  const story=STORIES[key];

  // Map alphabetically-first element to meshA
  const sorted=[move1,move2].sort();
  const mMap={[move1]:m1,[move2]:m2};
  const mA=mMap[sorted[0]], mB=mMap[sorted[1]];

  let wM,lM,wH,lH;
  if(res==='a'){wM=m1;lM=m2;wH=h1;lH=h2;}
  else if(res==='b'){wM=m2;lM=m1;wH=h2;lH=h1;}

  // Timing (ms)
  const T_FLY=1000, T_CLASH=1060, T_STORY=T_CLASH+280,
        T_FADE=T_CLASH+1200, T_DONE=T_FADE+600;

  let start=null,prev=null,clashDone=false,storyInit=false,fadingOut=false;
  let burst=null;
  const st={};

  function loop(ts){
    if(!start){start=ts;prev=ts;}
    const el=ts-start, dt=ts-prev; prev=ts;
    AID=requestAnimationFrame(loop);

    // FLY-IN
    if(el<T_FLY){
      const t=easeOutExpo(el/T_FLY);
      m1.position.x=-11+9*t; m2.position.x=11-9*t;
      h1.position.copy(m1.position); h2.position.copy(m2.position);
      eL1.position.x=m1.position.x; eL2.position.x=m2.position.x;
      m1.rotation.y+=0.045; m2.rotation.y-=0.045;
      m1.rotation.x+=0.018; m2.rotation.x-=0.018;
      tickHalo(h1); tickHalo(h2);
    }

    // CLASH BURST
    if(el>=T_CLASH&&!clashDone){
      clashDone=true;
      burst=mkBurst(); SC.add(burst);
      eL1.intensity=10; eL2.intensity=10; tL.intensity=7;
    }
    if(burst)tickBurst(burst,dt);
    if(clashDone&&el<T_STORY){
      const f=Math.max(0,1-(el-T_CLASH)/350);
      eL1.intensity=2+f*8; eL2.intensity=2+f*8; tL.intensity=2+f*5;
    }

    // CAMERA SHAKE
    if(el>=T_CLASH&&el<T_CLASH+350){
      const s=(1-(el-T_CLASH)/350)*0.14;
      CAM.position.x=(rnd()-0.5)*s; CAM.position.y=(rnd()-0.5)*s;
    } else {
      CAM.position.x+=(0-CAM.position.x)*0.12;
      CAM.position.y+=(0-CAM.position.y)*0.12;
    }

    // STORY FX
    if(el>=T_STORY){
      if(!storyInit&&story){
        storyInit=true;
        if(res==='draw') story.init(SC,mA,mB,st);
        else story.init(SC,wM,lM,st);
      }
      if(story){
        const age=el-T_STORY;
        if(res==='draw') story.update(SC,mA,mB,st,age,dt);
        else story.update(SC,wM,lM,st,age,dt);
      }
      // Keep winner halo
      if(res!=='draw'&&wM&&wH){wH.position.copy(wM.position);tickHalo(wH);}
    }

    // FADE OUT
    if(el>=T_FADE&&!fadingOut){
      fadingOut=true;
      cv.style.transition='opacity 0.55s ease';
      cv.style.opacity='0';
    }

    // DONE
    if(el>=T_DONE){
      cancelAnimationFrame(AID);
      cv.style.display='none'; cv.style.opacity='0';
      lblDiv.style.display='none';
      onComplete(); return;
    }

    R.render(SC,CAM);
  }
  requestAnimationFrame(loop);
}

// ── GAME FUNCTIONS ────────────────────────────────────────────────────────────
function chooseMove1(){
  const v=document.getElementById('move1').value;
  if(v){
    player1Move=v;
    document.getElementById('move1').style.visibility='hidden';
    document.getElementById('move2').disabled=false;
    document.getElementById('playBtn').disabled=false;
  }
}

function playGame(){
  const move2=document.getElementById('move2').value;
  const rDiv=document.getElementById('result');
  if(!player1Move||!move2){rDiv.textContent='Both players must choose a move!';rDiv.classList.add('show');return;}
  rDiv.classList.remove('show'); rDiv.textContent='';
  document.getElementById('playBtn').disabled=true;
  document.body.classList.add('shake');
  setTimeout(()=>document.body.classList.remove('shake'),500);
  const move1=player1Move;
  runBattleAnimation(move1,move2,()=>{
    const res=getResult(move1,move2);
    let txt='';
    if(res==='draw')txt='🤝 It\'s a tie!';
    else if(res==='a'){txt='🎉 Player 1 wins!';score1++;}
    else{txt='🎉 Player 2 wins!';score2++;}
    rDiv.textContent=txt; rDiv.classList.add('show');
    document.getElementById('score1').textContent=score1;
    document.getElementById('score2').textContent=score2;
    const li=document.createElement('li');
    li.textContent=`Player 1: ${move1}, Player 2: ${move2} → ${txt}`;
    document.getElementById('historyList').appendChild(li);
    document.getElementById('move1').style.visibility='visible';
    document.getElementById('move1').value='';
    document.getElementById('move2').value='';
    document.getElementById('move2').disabled=true;
    document.getElementById('playBtn').disabled=true;
    player1Move=null;
  });
}

function restartGame(){
  score1=0;score2=0;player1Move=null;
  document.getElementById('score1').textContent=0;
  document.getElementById('score2').textContent=0;
  document.getElementById('result').textContent='';
  document.getElementById('result').classList.remove('show');
  document.getElementById('move1').value='';
  document.getElementById('move1').style.visibility='visible';
  document.getElementById('move2').value='';
  document.getElementById('move2').disabled=true;
  document.getElementById('playBtn').disabled=true;
  document.getElementById('historyList').innerHTML='';
}

function getIcon(move){
  return{Stone:'🪨',Paper:'📄',Scissors:'✂️',Water:'💧',Fire:'🔥',Air:'🌬️'}[move]||'❓';
}

function showRules(type){
  const rt=document.getElementById('rulesText');
  const modal=document.getElementById('rulesModal');
  if(type==='basic'){
    rt.innerHTML=`<h4>📘 Basic Rules</h4><p>Each player selects one of six elements: Stone, Paper, Scissors, Water, Air, or Fire.</p><p>Winner is determined by the element interaction rules.</p>`;
  }else if(type==='win'){
    rt.innerHTML=`
      <h4>🏆 Win Conditions</h4>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:10px;">
        <thead>
          <tr style="background:#f0f4ff;font-weight:700;">
            <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #c0ccee;">Element</th>
            <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #c0ccee;color:#2e7d32;">Beats</th>
            <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #c0ccee;color:#888;">Draws With</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:6px 10px;">🌬️ Air</td>
            <td style="padding:6px 10px;color:#2e7d32;">🔥 Fire, 💧 Water</td>
            <td style="padding:6px 10px;color:#888;">📄 Paper, 🪨 Stone</td>
          </tr>
          <tr style="background:#fafafa;border-bottom:1px solid #eee;">
            <td style="padding:6px 10px;">🔥 Fire</td>
            <td style="padding:6px 10px;color:#2e7d32;">📄 Paper, ✂️ Scissors</td>
            <td style="padding:6px 10px;color:#888;">🪨 Stone</td>
          </tr>
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:6px 10px;">💧 Water</td>
            <td style="padding:6px 10px;color:#2e7d32;">🔥 Fire, 🪨 Stone</td>
            <td style="padding:6px 10px;color:#888;">✂️ Scissors</td>
          </tr>
          <tr style="background:#fafafa;border-bottom:1px solid #eee;">
            <td style="padding:6px 10px;">🪨 Stone</td>
            <td style="padding:6px 10px;color:#2e7d32;">✂️ Scissors</td>
            <td style="padding:6px 10px;color:#888;">🔥 Fire, 🌬️ Air</td>
          </tr>
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:6px 10px;">📄 Paper</td>
            <td style="padding:6px 10px;color:#2e7d32;">🪨 Stone, 💧 Water</td>
            <td style="padding:6px 10px;color:#888;">🌬️ Air</td>
          </tr>
          <tr style="background:#fafafa;">
            <td style="padding:6px 10px;">✂️ Scissors</td>
            <td style="padding:6px 10px;color:#2e7d32;">📄 Paper, 🌬️ Air</td>
            <td style="padding:6px 10px;color:#888;">💧 Water</td>
          </tr>
        </tbody>
      </table>
      <p style="font-size:12px;color:#888;margin:4px 0 0;">Same element always draws. Unmatched pairs draw.</p>`;

  }else if(type==='tips'){

    rt.innerHTML=`<h4>💡 Strategy Tips</h4><ul>
      <li>Try to remember your opponent's patterns.</li>
      <li>Don't repeat the same move often!</li>
      <li>Use Air or Water to surprise — they are less expected!</li>
    </ul>`;
  }
  modal.classList.remove('hidden');
}

function closeRules(){document.getElementById('rulesModal').classList.add('hidden');}
