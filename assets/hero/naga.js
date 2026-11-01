// Perakit & animator naga DraGen untuk hero 3D website.
// Disalin apa adanya dari bengkel-naga.html (buildDragon, stageDragon, gen, klip animasi): sumber yang sama dengan
// DragonBuilder di game Unity, jadi bentuk naganya identik. Butuh THREE r128 global.
window.NagaDragon = (function () {
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const MATS=['kulit','duri','perut','sayap','tanduk','mata'];
const BODY_PIVOT=V(0,2.2,0);

/* ---------- Kelangkaan ---------- */
const RAR=[{n:'Biasa',w:60,p:0},{n:'Langka',w:25,p:1},{n:'Epik',w:10,p:2},{n:'Legendaris',w:4,p:4},{n:'Mitos',w:1,p:7}];
const RHEX=['#7f8d87','#2f7fd0','#8b4fd8','#d48a00','#d93a60'];
const TIERS=[{n:'Biasa',min:0},{n:'Langka',min:5},{n:'Epik',min:7},{n:'Legendaris',min:10},{n:'Mitos',min:13}];

/* ---------- Elemen (palet warna) ---------- */
const PAL={
  Alam:{kulit:'#2e8b6e',duri:'#1b5a49',perut:'#e6c06a',sayap:'#d8643f',tanduk:'#efe6cf',mata:'#ffd447'},
  Api:{kulit:'#b5332a',duri:'#6f1a15',perut:'#f0a33f',sayap:'#f2c14e',tanduk:'#2e2724',mata:'#fff3a0'},
  Laut:{kulit:'#1f6f8b',duri:'#0f3f52',perut:'#9fe0d0',sayap:'#36b3a8',tanduk:'#e8f1ef',mata:'#b6fff2'},
  Es:{kulit:'#5aa6d3',duri:'#2c6893',perut:'#e4f3fa',sayap:'#9ad6ef',tanduk:'#ffffff',mata:'#7af7ff'},
  Racun:{kulit:'#5b8a2a',duri:'#2f4a14',perut:'#c9e265',sayap:'#9b4fd1',tanduk:'#2b2233',mata:'#d7ff3a'},
  Magma:{kulit:'#3a2626',duri:'#1c1010',perut:'#ff8a3d',sayap:'#ff5a1f',tanduk:'#ffd166',mata:'#ffe14d'},
  Petir:{kulit:'#2d3b8f',duri:'#161d4d',perut:'#ffe066',sayap:'#ffd60a',tanduk:'#f4f4f4',mata:'#9ef0ff'},
  Bayangan:{kulit:'#2c2839',duri:'#16131e',perut:'#6b5a8e',sayap:'#8a3fd1',tanduk:'#cbc4da',mata:'#ff4fd8'},
  Emas:{kulit:'#c9962b',duri:'#7a5414',perut:'#fff1c1',sayap:'#e9d8a6',tanduk:'#ffffff',mata:'#ff6b3d'},
  Kosmik:{kulit:'#1b1446',duri:'#0b0824',perut:'#ff7ad9',sayap:'#47e1ff',tanduk:'#fdf6ff',mata:'#ffffff'},
  Savana:{kulit:'#c8964f',duri:'#6b3f1d',perut:'#ecd3a0',sayap:'#a8743a',tanduk:'#f2ead8',mata:'#ffb627'},
  Loreng:{kulit:'#e07a1f',duri:'#1d1a17',perut:'#f6efe3',sayap:'#c45f12',tanduk:'#f6efe3',mata:'#b8ff5c'},
  Batu:{kulit:'#8c8f94',duri:'#5d6066',perut:'#b9bcc0',sayap:'#7a6f66',tanduk:'#f1ead9',mata:'#f3efe2'},
  Rimba:{kulit:'#7a4f2e',duri:'#3e2716',perut:'#d9b98e',sayap:'#a0703f',tanduk:'#e8dcc4',mata:'#f6e3b4'},
  Salju:{kulit:'#b4cbe0',duri:'#2a6fc0',perut:'#ffffff',sayap:'#9fd0f5',tanduk:'#cfeeff',mata:'#4fc3ff'},   // "Es Kutub": bayangan biru es, perut putih (dulu serba putih)
  Senja:{kulit:'#8a6a4f',duri:'#3b2b22',perut:'#e7d3b5',sayap:'#b08a63',tanduk:'#f0b23c',mata:'#ffcc00'},
  Pasir:{kulit:'#d9a85b',duri:'#8a5a2b',perut:'#f5e1b3',sayap:'#e8c27a',tanduk:'#fff4dc',mata:'#ff9f1c'},
  Karang:{kulit:'#e8676f',duri:'#7d2e3a',perut:'#ffd3c4',sayap:'#2fc4b2',tanduk:'#fff1e6',mata:'#7dfff0'},
  Belang:{kulit:'#f1f1ec',duri:'#1d1d22',perut:'#ffffff',sayap:'#2b2b31',tanduk:'#c9c9c4',mata:'#7ad3ff'},
  Lumpur:{kulit:'#6e5a3c',duri:'#3a2e1e',perut:'#a8916a',sayap:'#5c7a3a',tanduk:'#d8c9a8',mata:'#c8ff4f'},
  Langit:{kulit:'#5b8fe0',duri:'#24427e',perut:'#eef5ff',sayap:'#a7cdfc',tanduk:'#ffe08a',mata:'#ffffff'}
};

/* ---------- Material: satu set per elemen ---------- */
const MSETS={};
// Bagian yang selalu berkilau di semua tahap: intensitas, atau [intensitas, warna] dengan warna = nama bagian palet atau hex.
// Elemen Epik ke atas + Salju (permintaan pengguna). Ultimate tetap memakai kilau ultSet yang lebih terang.
const ELEM_GLOW={Salju:{duri:.45,tanduk:.3},Petir:{duri:[.5,'mata']},Bayangan:{duri:[.5,'mata']},
  Emas:{duri:[.5,'#ffc933'],tanduk:[.35,'#ffc933']},Kosmik:{duri:[.6,'sayap'],tanduk:[.4,'perut']}};
function matSet(el){
  if(MSETS[el])return MSETS[el];
  const s={};MATS.forEach(n=>{s[n]=new THREE.MeshStandardMaterial({color:PAL[el][n],flatShading:true,roughness:n==='tanduk'?.6:.85,metalness:0,side:THREE.FrontSide});s[n].name=n;});
  s.mata.emissive.set(PAL[el].mata);s.mata.emissiveIntensity=.9;
  Object.entries(ELEM_GLOW[el]||{}).forEach(([n,x])=>{const [v,c]=Array.isArray(x)?x:[x,n];s[n].emissive.set(PAL[el][c]||c);s[n].emissiveIntensity=v;});
  return MSETS[el]=s;
}
let CUR=matSet('Alam');

/* ---------- Helper bentuk: semua bagian dari balok berbevel ----------
   seg   = balok yang bisa mengecil ke ujung, dipanjangkan sedikit di kedua ujung supaya sambungan tertutup
   chain = rangkaian seg + balok sambungan di tiap tikungan (leher, ekor, tanduk)
   pyr   = piramida berpenampang kotak (tanduk, cakar, duri)
   Penanda untuk deteksi tabrakan: root = sengaja menancap ke induknya, acc = hiasan kepala (kerah, sirip, pipi). */
const UP=V(0,1,0);
function basis(dir,hint){
  const y=dir.clone().normalize();let u=(hint||UP).clone();
  if(Math.abs(u.dot(y))>.97)u=Math.abs(y.z)<.9?V(0,0,1):V(1,0,0);
  const z=u.sub(y.clone().multiplyScalar(u.dot(y))).normalize(),x=V(0,0,0).crossVectors(y,z);
  return new THREE.Matrix4().makeBasis(x,y,z);
}
/* Balok berbevel: setiap rusuk dipotong miring sebesar r, sudutnya jadi segitiga kecil.
   Penampang: tutup persegi (inset r) → oktagon → oktagon → tutup persegi. BEVEL = pengali dari slider. */
let BEVEL=1.2;
function taperGeo(y0,y1,w1,h1,w2,h2){
  const L=y1-y0,rr=(w,h)=>Math.max(0,Math.min(BEVEL*Math.min(.16,.22*Math.min(w,h)),L*.3));
  const r1=rr(w1,h1),r2=rr(w2,h2);
  const rect=(w,h,r,y)=>[[-(w/2-r),y,-(h/2-r)],[w/2-r,y,-(h/2-r)],[w/2-r,y,h/2-r],[-(w/2-r),y,h/2-r]];
  const oct=(w,h,r,y)=>[[-(w/2-r),y,-h/2],[w/2-r,y,-h/2],[w/2,y,-(h/2-r)],[w/2,y,h/2-r],[w/2-r,y,h/2],[-(w/2-r),y,h/2],[-w/2,y,h/2-r],[-w/2,y,-(h/2-r)]];
  const C0=rect(w1,h1,r1,y0),O0=oct(w1,h1,r1,y0+r1),O1=oct(w2,h2,r2,y1-r2),C1=rect(w2,h2,r2,y1);
  const t=[[C0[0],C0[1],C0[2]],[C0[0],C0[2],C0[3]],[C1[0],C1[2],C1[1]],[C1[0],C1[3],C1[2]]];
  for(let k=0;k<4;k++){const k1=(k+1)%4,a=2*k,b=2*k+1,c=(2*k+2)%8;
    t.push([C0[k],O0[b],C0[k1]],[C0[k],O0[a],O0[b]],[C0[k1],O0[b],O0[c]]);
    t.push([O1[a],C1[k1],O1[b]],[O1[a],C1[k],C1[k1]],[O1[b],C1[k1],O1[c]]);}
  for(let i=0;i<8;i++){const j=(i+1)%8;t.push([O0[i],O1[j],O0[j]],[O0[i],O1[i],O1[j]]);}
  const pos=[];
  t.forEach(([p,q,s])=>{
    const ux=q[0]-p[0],uy=q[1]-p[1],uz=q[2]-p[2],vx=s[0]-p[0],vy=s[1]-p[1],vz=s[2]-p[2];
    const cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx;
    if(cx*cx+cy*cy+cz*cz<1e-12)return; // rusuk tanpa bevel menghasilkan segitiga kosong
    [p,q,s].forEach(v=>pos.push(v[0],v[1],v[2]));
  });
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();return g;
}
function H(g){
  const h={group:g,accMode:false};
  h.add=(geo,m,pos,scale,o)=>{const mesh=new THREE.Mesh(geo,CUR[m]);mesh.userData.mat=m;
    if(h.accMode)mesh.userData.acc=true;if(o&&o.root)mesh.userData.root=true;
    if(pos)mesh.position.copy(pos);if(scale)mesh.scale.set(scale[0],scale[1],scale[2]);mesh.castShadow=true;g.add(mesh);return mesh;};
  h.acc=fn=>{h.accMode=true;fn();h.accMode=false;};
  h.box=(pos,size,m,o)=>{const mesh=h.add(taperGeo(-size[1]/2,size[1]/2,size[0],size[2],size[0],size[2]),m,pos,null,o);
    const r=Math.max(0,Math.min(BEVEL*Math.min(.16,.22*Math.min(size[0],size[2])),size[1]*.3));
    mesh.userData.box={a:size[0]/2,b:size[1]/2,c:size[2]/2,r,max:Math.max(...size)};return mesh;};
  h.seg=(a,b,w1,h1,w2,h2,m,o)=>{o=o||{};const d=b.clone().sub(a),L=d.length();
    const e1=o.e1!=null?o.e1:Math.max(w1,h1)/2,e2=o.e2!=null?o.e2:Math.max(w2,h2)/2;
    const mesh=h.add(taperGeo(-e1,L+e2,w1,h1,w2,h2),m,a,null,o);mesh.quaternion.setFromRotationMatrix(basis(d,o.up));return mesh;};
  h.chain=(P,W,Hs,m,o)=>{o=o||{};
    for(let i=0;i<P.length-1;i++)h.seg(P[i],P[i+1],W[i],Hs[i],W[i+1],Hs[i+1],m,{up:o.up,root:o.root1&&i===0,e2:i===P.length-2&&o.tip?0:undefined});
    for(let i=1;i<P.length-1;i++){
      const d=P[i+1].clone().sub(P[i]).normalize().add(P[i].clone().sub(P[i-1]).normalize()).normalize(),s=Math.max(W[i],Hs[i])*.5,k=1.04;
      h.seg(P[i].clone().addScaledVector(d,-s),P[i].clone().addScaledVector(d,s),W[i]*k,Hs[i]*k,W[i]*k,Hs[i]*k,m,{e1:0,e2:0,up:o.up});
    }};
  h.pyr=(base,ht,w,dir,m,o)=>{o=o||{};const n=dir.clone().normalize();
    return h.seg(base,base.clone().addScaledVector(n,ht),w,o.h||w,.02,.02,m,{e1:0,e2:0,up:o.up,root:o.root});};
  // Selaput sayap: dua lapis berlawanan arah supaya terlihat dari kedua sisi (Roblox memotong sisi belakang)
  h.tris=(list,m)=>{const pos=[];list.forEach(t=>{[t[0],t[1],t[2],t[0],t[2],t[1]].forEach(p=>pos.push(p.x,p.y,p.z));});
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.computeVertexNormals();
    const mesh=h.add(geo,m);mesh.userData.flat=true;return mesh;};
  return h;
}
const rc=new THREE.Raycaster();
function topY(group,x,z){
  group.updateMatrixWorld(true);rc.set(V(x,30,z),V(0,-1,0));
  const meshes=[];group.traverse(o=>{if(o.isMesh&&o.userData.mat!=='perut'&&!o.userData.noTop)meshes.push(o);});
  const hit=rc.intersectObjects(meshes,false)[0];return hit?hit.point.y:null;
}
const r3=n=>Math.round(n*1000)/1000;
const lerpV=(a,b,t)=>a.clone().lerp(b,t);

/* ---------- Badan (asal = tanah di bawah pusat badan; menghadap +Z) ----------
   Soket kaki: y = 2.3 × skala kaki (depan) dan 1.85 × skala kaki (belakang), supaya telapak tepat di tanah.
   Soket sayap: y dicari otomatis di permukaan atas badan. Soket punggung: dilewati bila terlalu dekat kepala. */
const BODY={
  Standar:{torso:[V(0,2.3,0),[2.1,1.7,3]],chest:[V(0,2.62,1.35),[1.8,1.75,1.4]],hips:[V(0,2.2,-1.35),[1.8,1.45,1.1]],
    belly:[V(0,1.42,.1),[1.6,.3,3.4]],plate:[V(0,2.4,2.08),[1.25,1.2,.2]],
    neck:[V(0,2.95,1.6),V(0,3.8,2.35),V(0,4.55,2.8)],neckW:[1.05,.85,.7],
    head:V(0,4.75,3.05),tail:V(0,2.25,-1.55),wing:V(.55,0,.55),front:V(.85,0,1.15),back:V(1,0,-.85),ls:1,spine:{from:2.6,to:-1.45,n:11}},
  Gempal:{torso:[V(0,2.4,-.1),[2.8,2.1,2.9]],chest:[V(0,2.7,1.2),[2.4,2.1,1.3]],hips:[V(0,2.3,-1.4),[2.4,1.7,1]],
    belly:[V(0,1.38,0),[2.2,.3,3.2]],plate:[V(0,2.5,1.9),[1.7,1.4,.2]],
    neck:[V(0,3.1,1.5),V(0,3.75,2.15),V(0,4.15,2.55)],neckW:[1.3,1.1,.85],
    head:V(0,4.35,2.85),tail:V(0,2.3,-1.6),wing:V(.7,0,.4),front:V(1.15,0,1.05),back:V(1.3,0,-.95),ls:1.2,spine:{from:2.4,to:-1.5,n:10}},
  Ramping:{torso:[V(0,2.25,-.1),[1.6,1.5,3.8]],chest:[V(0,2.45,1.6),[1.4,1.5,1]],hips:[V(0,2.15,-2),[1.4,1.25,.9]],
    belly:[V(0,1.5,.1),[1.2,.28,4]],plate:[V(0,2.35,2.15),[1,1,.18]],
    neck:[V(0,2.7,1.8),V(0,3.6,2.5),V(0,4.5,3.1),V(0,5.15,3.55)],neckW:[.9,.75,.65,.58],
    head:V(0,5.35,3.85),tail:V(0,2.15,-2.25),wing:V(.45,0,.7),front:V(.7,0,1.45),back:V(.8,0,-1.35),ls:.88,spine:{from:3.3,to:-2.15,n:14}},
  Panjang:{torso:[V(0,2,0),[1.8,1.5,4.2]],chest:[V(0,2.2,1.9),[1.7,1.6,1.2]],hips:[V(0,1.95,-2.3),[1.6,1.3,.9]],
    belly:[V(0,1.22,0),[1.4,.28,4.6]],plate:[V(0,2.05,2.55),[1.2,1,.18]],
    neck:[V(0,2.5,2.3),V(0,3.2,3),V(0,3.75,3.45)],neckW:[.95,.8,.68],
    head:V(0,3.95,3.7),tail:V(0,2.05,-2.5),wing:V(.5,0,.6),front:V(.85,0,1.8),back:V(.9,0,-1.7),ls:.85,spine:{from:2.6,to:-2.6,n:14}},
  Bungkuk:{torso:[V(0,2.5,-.1),[2,1.8,2.6]],chest:[V(0,2.9,1.2),[2,2.2,1.5]],hips:[V(0,2.15,-1.5),[1.7,1.4,1]],
    belly:[V(0,1.6,.2),[1.5,.3,2.8]],plate:[V(0,2.7,1.98),[1.4,1.5,.18]],
    neck:[V(0,3.6,1.6),V(0,4.25,2.3),V(0,4.6,2.95)],neckW:[1,.85,.7],
    head:V(0,4.75,3.25),tail:V(0,2.2,-1.75),wing:V(.6,0,.9),front:V(.95,0,1.2),back:V(.95,0,-1.1),ls:1.05,spine:{from:2.4,to:-1.7,n:11}},
  Berlapis:{torso:[V(0,2.3,0),[2.1,1.7,3]],chest:[V(0,2.62,1.35),[1.8,1.75,1.4]],hips:[V(0,2.2,-1.35),[1.8,1.45,1.1]],
    belly:[V(0,1.42,.1),[1.6,.3,3.4]],plate:[V(0,2.4,2.08),[1.25,1.2,.2]],
    neck:[V(0,2.95,1.6),V(0,3.8,2.35),V(0,4.55,2.8)],neckW:[1.05,.85,.7],
    head:V(0,4.75,3.05),tail:V(0,2.25,-1.55),wing:V(.55,0,.55),front:V(.85,0,1.15),back:V(1,0,-.85),ls:1,spine:{from:2.6,to:-1.45,n:11},
    extra:h=>{[1.05,.3,-.45,-1.2].forEach(z=>[1,-1].forEach(s=>h.box(V(s*1.1,2.85,z),[.14,.5,.62],'tanduk')));
      [-.3,.4].forEach(z=>h.box(V(0,1.3,z),[1.1,.12,.55],'tanduk'));}},
  Gendut:{torso:[V(0,2.4,0),[2.2,1.8,3]],chest:[V(0,2.62,1.4),[1.9,1.8,1.3]],hips:[V(0,2.25,-1.4),[1.8,1.5,1]],
    belly:[V(0,1.62,.15),[1.7,.9,2.6]],plate:[V(0,2.4,2.08),[1.3,1.2,.18]],
    neck:[V(0,3,1.65),V(0,3.8,2.35),V(0,4.45,2.8)],neckW:[1.1,.9,.72],
    head:V(0,4.65,3.05),tail:V(0,2.3,-1.6),wing:V(.55,0,.4),front:V(.95,0,1.2),back:V(1.05,0,-.9),ls:1,spine:{from:2.5,to:-1.5,n:10}},
  Petarung:{torso:[V(0,2.6,-.4),[1.5,1.4,2]],chest:[V(0,2.9,1.2),[2.4,2.2,1.6]],hips:[V(0,2.35,-1.5),[1.6,1.3,.9]],
    belly:[V(0,1.95,-.4),[1.1,.25,2.2]],plate:[V(0,2.8,2.03),[1.7,1.6,.18]],
    neck:[V(0,3.5,1.7),V(0,4.2,2.35),V(0,4.7,2.8)],neckW:[1,.85,.7],
    head:V(0,4.9,3.05),tail:V(0,2.4,-1.9),wing:V(.6,0,.9),front:V(1.05,0,1.2),back:V(.98,0,-1.2),ls:1.1,spine:{from:2.4,to:-1.8,n:10}},
  Jerapah:{torso:[V(0,2.35,-.2),[1.9,1.6,2.6]],chest:[V(0,2.6,1),[1.7,1.7,1.2]],hips:[V(0,2.25,-1.4),[1.7,1.4,.9]],
    belly:[V(0,1.5,-.1),[1.5,.28,3]],plate:[V(0,2.45,1.65),[1.2,1.2,.18]],
    neck:[V(0,3,1.3),V(0,4.1,1.85),V(0,5.2,2.25),V(0,6.2,2.55),V(0,6.9,2.85)],neckW:[.85,.72,.62,.56,.5],
    head:V(0,7.1,3.1),tail:V(0,2.25,-1.8),wing:V(.5,0,.3),front:V(.8,0,.95),back:V(.95,0,-1.05),ls:1,spine:{from:2.4,to:-1.6,n:13}},
  Kadal:{torso:[V(0,1.8,-.1),[2.4,1.2,3.4]],chest:[V(0,1.95,1.45),[2,1.3,1.2]],hips:[V(0,1.8,-1.6),[1.9,1.1,1]],
    belly:[V(0,1.17,0),[2,.25,3.6]],plate:[V(0,1.85,2.1),[1.4,.9,.18]],
    neck:[V(0,2.1,1.8),V(0,2.6,2.6),V(0,2.95,3.2)],neckW:[.95,.8,.7],
    head:V(0,3.15,3.6),tail:V(0,2,-1.9),wing:V(.6,0,.5),front:V(1,0,1.25),back:V(1.05,0,-1),ls:.75,spine:{from:2.4,to:-1.9,n:10}}
};
function bodyBuild(c){return S=>{
  const h=S('C'),sk=c.skin||'kulit';
  h.box(c.torso[0],c.torso[1],sk);h.box(c.chest[0],c.chest[1],sk);h.box(c.hips[0],c.hips[1],sk);
  // Pelat perut dipotong agar muat di bawah badan utama; pelat dada menempel di muka dada
  const [tp,ts]=c.torso,[bp,bs]=c.belly,bz=Math.min(bs[2],ts[2]-.5),bx=Math.min(bs[0],ts[0]-.4);
  const bzc=Math.max(tp.z-ts[2]/2+bz/2+.25,Math.min(tp.z+ts[2]/2-bz/2-.25,bp.z));
  h.box(V(0,bp.y,bzc),[bx,bs[1],bz],'perut');
  const [cp,cs]=c.chest,[pp,ps]=c.plate,px=Math.min(ps[0],cs[0]-.5),py=Math.min(ps[1],cs[1]-.5);
  const pyc=Math.max(cp.y-cs[1]/2+py/2+.2,Math.min(cp.y+cs[1]/2-py/2-.2,pp.y));
  h.box(V(0,pyc,cp.z+cs[2]/2+ps[2]/2-.07),[px,py,ps[2]],'perut');
  h.chain(c.neck,c.neckW,c.neckW.map(w=>w*.95),sk);
  // Strip leher bawah: mengikuti leher, digeser ke depan-bawah
  const N=c.neck,TP=[],TW=[];
  N.forEach((p,i)=>{const a=N[Math.max(0,i-1)],b=N[Math.min(N.length-1,i+1)],d=b.clone().sub(a).normalize(),perp=V(0,-d.z,d.y);
    const q=i===N.length-1?lerpV(N[i-1],p,.7):p.clone();TP.push(q.addScaledVector(perp,c.neckW[i]*.36));TW.push(c.neckW[i]*.6);});
  h.chain(TP,TW,TW.map(w=>w*.8),'perut');
  if(c.extra)c.extra(h);
  const ls=c.ls,wy=topY(h.group,c.wing.x,c.wing.z)-.05;
  const so={Kepala:c.head.clone(),Ekor:c.tail.clone(),
    Sayap_L:V(c.wing.x,r3(wy),c.wing.z),Sayap_R:V(-c.wing.x,r3(wy),c.wing.z),
    Kaki_DL:V(c.front.x,2.3*ls,c.front.z),Kaki_DR:V(-c.front.x,2.3*ls,c.front.z),
    Kaki_BL:V(c.back.x,1.85*ls,c.back.z),Kaki_BR:V(-c.back.x,1.85*ls,c.back.z),KakiSkala:ls,
    KepalaSkala:r3(Math.max(1,c.neckW[c.neckW.length-1]*1.25)),Punggung:[],Torso:c.torso[0].clone()};
  for(let i=0;i<c.spine.n;i++){
    const t=i/(c.spine.n-1),z=c.spine.from+(c.spine.to-c.spine.from)*t,y=topY(h.group,0,z);
    if(y===null)continue;const p=V(0,r3(y-.06),r3(z));
    if(p.distanceTo(c.head)<2.1*so.KepalaSkala)continue;
    so.Punggung.push([p,r3(.3+.28*Math.sin(Math.PI*(.1+.8*t)))]);
  }
  return so;
};}

/* ---------- Kepala (asal = pusat tengkorak; sub J = rahang, asal = engsel) ----------
   Zona tanduk ada di atas-belakang tengkorak. Hiasan kepala (acc) diletakkan di samping/belakang/moncong. */
// Mata: bola mata menyala + pupil gelap (celah untuk naga/kucing/ular, bulat untuk mamalia/burung)
function eye(h,s,pos,sz,face,pupil){
  const slit=pupil==='slit',pw=slit?.22:.48,ph=slit?.85:.55;
  if(face==='side'){h.box(pos,[.05,sz[1],sz[0]],'mata');h.box(pos.clone().add(V(s*.03,0,sz[0]*.1)),[.03,sz[1]*ph,sz[0]*pw],'duri');}
  else{h.box(pos,[sz[0],sz[1],.05],'mata');h.box(pos.clone().add(V(-s*sz[0]*.08,0,.03)),[sz[0]*pw,sz[1]*ph,.03],'duri');}
}
function teeth(h,s,x,y,z0,n,step,size){for(let i=0;i<n;i++)h.box(V(s*x,y,z0+i*step),[size,size*2.2,size],'tanduk');}
function headClassic(h,j){
  h.box(V(0,0,0),[1.05,.85,1.1],'kulit');
  h.box(V(0,-.1,.95),[.78,.48,1],'kulit');
  h.box(V(0,.18,.85),[.46,.12,.8],'duri');
  j.box(V(0,-.04,.5),[.7,.18,1.05],'perut');
  [1,-1].forEach(s=>{
    eye(h,s,V(s*.535,.12,.33),[.28,.2],'side','slit');
    h.box(V(s*.33,.45,.3),[.32,.12,.42],'duri').rotation.z=-s*.2;
    h.box(V(s*.2,.1,1.46),[.1,.08,.06],'duri');
    teeth(h,s,.3,-.4,.62,3,.25,.07);
  });
  return {Tanduk:V(0,.38,-.25),Rahang:V(0,-.38,.22),Mulut:V(0,-.22,1.5)};
}
const HEAD={
  Klasik:S=>headClassic(S('C'),S('J')),
  Kadal:S=>{
    const h=S('C'),j=S('J');
    h.box(V(0,0,0),[1.3,.72,1.05],'kulit');
    h.box(V(0,-.1,.8),[1.05,.45,.9],'kulit');
    j.box(V(0,-.02,.4),[.98,.16,.85],'perut');
    [1,-1].forEach(s=>{
      h.box(V(s*.42,.38,.2),[.32,.26,.32],'kulit');
      eye(h,s,V(s*.59,.38,.22),[.24,.18],'side','slit');
      h.box(V(s*.28,.14,1.26),[.1,.06,.06],'duri');
      teeth(h,s,.42,-.36,.55,3,.2,.07);
    });
    return {Tanduk:V(0,.38,-.25),Rahang:V(0,-.34,.32),Mulut:V(0,-.2,1.25)};
  },
  Elang:S=>{
    const h=S('C'),j=S('J');
    h.box(V(0,0,0),[.95,.85,1],'kulit');
    h.box(V(0,.42,.3),[1.02,.16,.42],'duri');
    h.seg(V(0,.04,.4),V(0,0,1.22),.74,.52,.52,.4,'tanduk',{e1:0,e2:0});
    h.seg(V(0,0,1.22),V(0,-.44,1.46),.52,.4,.14,.12,'tanduk',{e1:.12,e2:0});
    j.seg(V(0,0,0),V(0,-.02,.85),.58,.2,.36,.14,'tanduk',{e1:0,e2:0});
    [1,-1].forEach(s=>{
      eye(h,s,V(s*.485,.12,.2),[.28,.24],'side','round');
      h.box(V(s*.2,.2,.88),[.08,.06,.12],'duri');
    });
    return {Tanduk:V(0,.38,-.25),Rahang:V(0,-.3,.4),Mulut:V(0,-.22,1.3)};
  },
  Kerah:S=>{
    const h=S('C'),so=headClassic(h,S('J'));
    // Kerah hanya di samping dan bawah, atas kepala dibiarkan kosong untuk tanduk
    const c=V(0,-.1,-.42);
    h.acc(()=>{[1.05,1.4,1.75].forEach(a=>[1,-1].forEach(s=>{
      const p=V(s*Math.sin(a)*1.15,-.1+Math.cos(a)*.95,-.82);
      h.seg(c,p,.22,.06,.55,.06,'sayap',{e1:0,e2:0,up:V(0,0,1)});
      h.seg(c,p,.09,.09,.04,.04,'duri',{e1:0,e2:.04});
    }));});
    return so;
  },
  Buaya:S=>{
    const h=S('C'),j=S('J');
    h.box(V(0,0,0),[1,.65,.9],'kulit');
    h.box(V(0,-.12,1.15),[.72,.36,1.6],'kulit');
    h.box(V(0,-.08,1.92),[.84,.4,.3],'kulit');
    j.box(V(0,-.02,.85),[.7,.16,1.75],'perut');
    [1,-1].forEach(s=>{
      h.box(V(s*.3,.4,.15),[.3,.22,.32],'kulit');
      eye(h,s,V(s*.3,.45,.33),[.22,.14],'front','slit');
      h.box(V(s*.18,.14,1.98),[.1,.08,.1],'duri');
      teeth(h,s,.33,-.36,.5,6,.26,.06);
    });
    return {Tanduk:V(0,.32,-.2),Rahang:V(0,-.32,.25),Mulut:V(0,-.2,2.05)};
  },
  Banteng:S=>{
    const h=S('C'),j=S('J');
    h.box(V(0,0,0),[1.25,1,1],'kulit');
    h.box(V(0,-.15,.7),[1.05,.6,.6],'kulit');
    h.box(V(0,0,1.02),[.5,.25,.08],'duri');
    j.box(V(0,-.05,.48),[1.1,.26,.9],'perut');
    [1,-1].forEach(s=>{
      j.pyr(V(s*.42,.05,.82),.32,.1,V(0,1,.1),'tanduk',{root:true});
      eye(h,s,V(s*.4,.18,.51),[.22,.18],'front','round');
      h.box(V(s*.35,.36,.45),[.36,.14,.2],'duri').rotation.z=-s*.25;
    });
    return {Tanduk:V(0,.48,-.2),Rahang:V(0,-.42,.15),Mulut:V(0,-.3,1.05)};
  },
  Ular:S=>{
    const h=S('C'),j=S('J');
    h.seg(V(0,0,-.5),V(0,-.05,1.3),1.25,.5,.5,.3,'kulit',{e1:0,e2:0});
    h.box(V(0,.27,.1),[.7,.06,.8],'duri');
    j.seg(V(0,0,0),V(0,-.02,1.25),1,.14,.38,.1,'perut',{e1:0,e2:0});
    [1,-1].forEach(s=>{
      eye(h,s,V(s*.52,.1,.1),[.28,.18],'side','slit');
      h.box(V(s*.28,.02,.98),[.08,.06,.08],'duri');
      h.pyr(V(s*.15,-.22,1.05),.24,.06,V(0,-1,.1),'tanduk',{root:true});
    });
    return {Tanduk:V(0,.25,-.3),Rahang:V(0,-.25,-.1),Mulut:V(0,-.15,1.3)};
  },
  Jambul:S=>{
    const h=S('C'),so=headClassic(h,S('J'));
    h.acc(()=>[.62,.98,1.32].forEach((z,i)=>h.seg(V(0,.2,z),V(0,.58-i*.06,z-.18),.42,.06,.15,.05,'sayap',{e1:.05,e2:0,up:V(1,0,0)})));
    return so;
  },
  Sirip:S=>{
    const h=S('C'),so=headClassic(h,S('J'));
    h.acc(()=>[1,-1].forEach(s=>{
      h.seg(V(s*.5,-.05,-.1),V(s*1.15,-.18,-.8),.45,.06,.2,.05,'sayap',{e1:.05,e2:0});
      h.seg(V(s*.5,-.3,0),V(s*.95,-.52,-.55),.3,.05,.12,.04,'sayap',{e1:.05,e2:0});
      h.seg(V(s*.5,-.05,-.1),V(s*1.15,-.18,-.8),.07,.07,.03,.03,'duri',{e1:.04,e2:0});
    }));
    return so;
  },
  Zirah:S=>{
    const h=S('C'),j=S('J');
    h.box(V(0,0,0),[1.1,.9,1.1],'kulit');
    h.box(V(0,-.1,.95),[.8,.5,1],'kulit');
    // helm: tudung membungkus separuh atas kepala, tepinya menjadi alis di atas mata
    h.box(V(0,.33,0),[1.2,.4,1.2],'tanduk');
    h.box(V(0,.45,.6),[1.08,.1,.06],'duri');
    // pelindung hidung membungkus atas moncong
    h.box(V(0,.1,.92),[.36,.18,1.02],'tanduk');
    h.box(V(0,.2,.92),[.12,.06,.9],'duri');

    j.box(V(0,-.04,.5),[.74,.2,1.05],'perut');
    [1,-1].forEach(s=>{
      // mata berupa celah visor yang menyala di muka helm
      eye(h,s,V(s*.27,.27,.61),[.3,.11],'front','slit');
      teeth(h,s,.3,-.4,.62,3,.25,.07);
    });
    // pelindung pipi menempel di sisi kepala
    h.acc(()=>[1,-1].forEach(s=>{h.box(V(s*.58,-.1,.08),[.1,.5,.8],'tanduk');h.box(V(s*.62,-.1,.08),[.04,.12,.5],'duri');}));
    return {Tanduk:V(0,.56,-.25),Rahang:V(0,-.38,.22),Mulut:V(0,-.22,1.5)};
  }
};

/* ---------- Tanduk (asal = socket tanduk di atas-belakang kepala) ---------- */
const HORN={
  Ganda:S=>{const h=S('C');[1,-1].forEach(s=>{
    h.seg(V(s*.28,0,0),V(s*.58,.63,-1.05),.24,.24,.03,.03,'tanduk',{e2:0,root:true});
    h.seg(V(s*.45,-.2,.05),V(s*.95,-.12,-.55),.15,.15,.02,.02,'tanduk',{e2:0,root:true});});},
  Rusa:S=>{const h=S('C');[1,-1].forEach(s=>{
    const A=V(s*.45,.55,-.35),B=V(s*.72,1.1,-.8);
    h.seg(V(s*.25,0,0),A,.17,.17,.13,.13,'tanduk',{root:true});
    h.seg(A,B,.13,.13,.03,.03,'tanduk',{e2:0});h.seg(A,V(s*.9,.85,-.05),.1,.1,.02,.02,'tanduk',{e1:0,e2:0});
    h.seg(lerpV(A,B,.55),V(s*.32,1.3,-.55),.08,.08,.02,.02,'tanduk',{e1:0,e2:0});});},
  Melengkung:S=>{const h=S('C');[1,-1].forEach(s=>{
    const p0=Math.atan2(.25,.35),P=[V(s*.25,0,0)],W=[.24];
    for(let j=1;j<=8;j++){const t=j/8,f=p0+t*1.6*Math.PI,R=.43*(1-.4*t);P.push(V(s*(.62+.22*t),-.25+R*Math.sin(f),-.35+R*Math.cos(f)));W.push(.24*(1-.75*t));}
    h.chain(P,W,W,'tanduk',{root1:true,tip:true});});},
  Mahkota:S=>{const h=S('C');for(let i=-2;i<=2;i++)h.pyr(V(i*.17,-.05,-Math.abs(i)*.06),.66-Math.abs(i)*.1,.14,V(i*.3,1,-.25),'tanduk',{root:true});},
  Unikorn:S=>{const h=S('C'),a=V(0,-.05,.45),m=V(0,.5,.85),b=V(0,1.05,1.25);
    h.seg(a,m,.28,.28,.18,.18,'tanduk',{root:true});h.seg(m,b,.18,.18,.02,.02,'tanduk',{e2:0,up:V(1,0,1)});
    [.3,.6].forEach(t=>h.seg(lerpV(a,b,t),lerpV(a,b,t+.04),.3-t*.2,.3-t*.2,.3-t*.2,.3-t*.2,'duri',{e1:0,e2:0,up:V(1,0,1)}));},
  Kambing:S=>{const h=S('C');[1,-1].forEach(s=>{
    h.seg(V(s*.22,0,.05),V(s*.42,.4,-.9),.2,.2,.13,.13,'tanduk',{root:true});
    h.seg(V(s*.42,.4,-.9),V(s*.5,.45,-1.75),.13,.13,.02,.02,'tanduk',{e2:0});});},
  Banteng:S=>{const h=S('C');[1,-1].forEach(s=>
    h.chain([V(s*.3,0,0),V(s*.8,.08,.1),V(s*1.1,.38,.1),V(s*1.12,.78,-.05)],[.26,.22,.16,.03],[.26,.22,.16,.03],'tanduk',{root1:true,tip:true}));},
  Iblis:S=>{const h=S('C');[1,-1].forEach(s=>
    h.chain([V(s*.28,0,.15),V(s*.42,.32,.12),V(s*.45,.6,.32)],[.2,.15,.03],[.2,.15,.03],'tanduk',{root1:true,tip:true}));},
  Kristal:S=>{const h=S('C');
    [[V(0,1,-.2),.95,.24],[V(.4,1,-.1),.65,.18],[V(-.4,1,-.1),.65,.18],[V(0,.8,-.7),.55,.16]].forEach(([d,len,w])=>{
      const n=d.normalize(),a=V(0,-.05,0),m=a.clone().addScaledVector(n,len*.6);
      h.seg(a,m,w,w,w,w,'sayap',{e1:0,e2:0,root:true});h.pyr(m,len*.4,w,n,'sayap');});}
};

/* ---------- Sayap (asal = socket bahu sayap; L = sisi +X) ----------
   Tepi bawah selaput selalu di atas socket (R.y > 0), supaya tidak masuk ke badan. */
function wingBones(h,P,b,fingers){
  h.seg(P.S,P.E,.26*b,.26*b,.2*b,.2*b,'kulit',{root:true});
  h.seg(P.E,P.W,.2*b,.2*b,.15*b,.15*b,'kulit');
  fingers.forEach((f,i)=>h.seg(P.W,P[f],(i?.1:.12)*b,(i?.1:.12)*b,.04*b,.04*b,'kulit',{e2:0}));
}
function wingPoints(k,s,extra){
  const P=Object.assign({S:V(0,0,0),E:V(1.4,1.25,-.4),W:V(2.85,2.05,-.9),F1:V(4.7,1.4,-1.6),F2:V(4.05,.4,-2.6),F3:V(2.9,.15,-2.95),R:V(.25,.3,-2.1)},extra||{});
  Object.values(P).forEach(p=>{p.multiplyScalar(k);p.x*=s;});return P;
}
function membrane(k,variant){return S=>{[['L',1],['R',-1]].forEach(([sub,s])=>{
  const h=S(sub),b=Math.max(k,.7);
  if(variant==='kelelawar'){
    const P=wingPoints(k,s,{F1:V(4.8,1.3,-1.3),F2:V(4.3,.45,-2.4),F3:V(3.1,.2,-3.05),M1:V(3.9,1.05,-2),M2:V(3.35,.55,-2.6),M3:V(1.9,.5,-2.45)});
    h.tris([[P.S,P.E,P.R],[P.E,P.M3,P.R],[P.E,P.W,P.M3],[P.W,P.F3,P.M3],[P.W,P.M2,P.F3],[P.W,P.F2,P.M2],[P.W,P.M1,P.F2],[P.W,P.F1,P.M1]].map(t=>t.map(n=>P[n]||n)),'sayap');
    wingBones(h,P,b,['F1','F2','F3']);h.pyr(P.W,.42*b,.13*b,V(s*.2,1,.4),'tanduk');return;
  }
  const P=wingPoints(k,s);
  let T=[['S','E','R'],['E','F3','R'],['E','W','F3'],['W','F2','F3'],['W','F1','F2']].map(t=>t.map(n=>P[n]));
  if(variant==='robek'){
    const X1=lerpV(P.F2,P.F3,.35),X2=lerpV(P.F2,P.F3,.62),Y1=lerpV(P.F3,P.R,.38),Y2=lerpV(P.F3,P.R,.56),Z1=lerpV(P.F1,P.F2,.45),Z2=lerpV(P.F1,P.F2,.6);
    T=[[P.S,P.E,P.R],[P.E,Y2,P.R],[P.E,P.F3,Y1],[P.E,P.W,P.F3],[P.W,X2,P.F3],[P.W,P.F2,X1],[P.W,Z2,P.F2],[P.W,P.F1,Z1]];
  }
  h.tris(T,'sayap');
  wingBones(h,P,b,['F1','F2','F3']);
  if(variant==='rusuk'){[[P.E,lerpV(P.F3,P.R,.5)],[P.W,lerpV(P.F2,P.F3,.5)],[P.W,lerpV(P.F1,P.F2,.5)],[P.S,lerpV(P.E,P.R,.55)]].forEach(([a,c])=>h.seg(a,c,.08*b,.08*b,.03*b,.03*b,'duri',{e1:0,e2:0}));}
  h.pyr(P.W,.42*b,.13*b,V(s*.2,1,.4),'tanduk');
});};}
const WING={
  Selaput:membrane(1),
  Kecil:membrane(.55),
  Kelelawar:membrane(1,'kelelawar'),
  Robek:membrane(.95,'robek'),
  Rusuk:membrane(1.05,'rusuk'),
  Bulu:S=>{[['L',1],['R',-1]].forEach(([sub,s])=>{
    const h=S(sub);
    const P=[V(0,0,0),V(s*1.3,1.2,-.35),V(s*2.6,1.9,-.8),V(s*4.1,1.75,-1.3)];
    h.chain(P,[.26,.2,.15,.06],[.26,.2,.15,.06],'kulit',{root1:true,tip:true});
    const along=t=>{const x=t*3,i=Math.min(2,Math.floor(x));return lerpV(P[i],P[i+1],x-i);};
    for(let i=0;i<9;i++){const t=.14+i*.1,L=1+1.5*t,d=V(s*.35*t,-.08+.05*t,-1).normalize(),a=along(t);
      h.seg(a,a.clone().addScaledVector(d,L),.5,.07,.3,.05,'sayap',{e1:0,e2:0});}
    for(let i=0;i<6;i++){const t=.18+i*.13,d=V(s*.2*t,0,-1).normalize(),a=along(t).add(V(0,.07,0));
      h.seg(a,a.clone().addScaledVector(d,.75),.42,.06,.3,.05,'perut',{e1:0,e2:0});}
  });},
  Kristal:S=>{[['L',1],['R',-1]].forEach(([sub,s])=>{
    const h=S(sub);
    h.box(V(0,.05,0),[.45,.45,.45],'tanduk',{root:true});
    [[V(s,.9,-.35),3.4,.42],[V(s,.5,-.8),3.8,.45],[V(s*.85,.3,-1),3.2,.4],[V(s*.6,.25,-1),2.4,.35],[V(s,1.4,-.1),2.4,.32]].forEach(([d,len,w])=>{
      const n=d.normalize();h.seg(n.clone().multiplyScalar(.15),n.clone().multiplyScalar(.15+len),w,w*.35,.03,.03,'sayap',{e1:0,e2:0});
    });
  });},
  Ganda:S=>{[['L',1],['R',-1]].forEach(([sub,s])=>{
    const h=S(sub);
    const P=wingPoints(.85,s),Q=wingPoints(.55,s);Object.values(Q).forEach(p=>p.add(V(-s*.05,.3,-1.25)));
    [P,Q].forEach((X,i)=>{const n0=h.group.children.length;h.tris([['S','E','R'],['E','F3','R'],['E','W','F3'],['W','F2','F3'],['W','F1','F2']].map(t=>t.map(n=>X[n])),'sayap');
      wingBones(h,X,i?.7:.85,['F1','F2','F3']);
      // sayap kecil ditandai supaya pangkalnya bisa diturunkan ke punggung badan saat dirakit
      if(i)h.group.children.slice(n0).forEach(m=>{m.userData.sub2=true;m.userData.root2=Q.S.clone();});});
    h.pyr(P.W,.36,.11,V(s*.2,1,.4),'tanduk');
  });},
  Sirip:S=>{[['L',1],['R',-1]].forEach(([sub,s])=>{
    const h=S(sub);
    h.seg(V(s*.25,.12,-.55),V(s*3.3,1.35,-2.3),1.4,.12,.35,.08,'sayap',{e1:0,e2:0,root:true});
    h.seg(V(0,.1,-.1),V(s*3.35,1.42,-1.95),.16,.16,.05,.05,'kulit',{e1:.05,e2:0,root:true});
  });}
};

/* ---------- Ekor (asal = socket pangkal ekor; ruas pertama menancap ke pinggul) ---------- */
function tailBuild(T,R,end,mat){return S=>{
  const h=S('C');
  h.chain(T,R.map(r=>r*1.7),R.map(r=>r*1.5),mat||'kulit',{root1:true});
  const sp=[];
  for(let i=1;i<T.length-1;i++){const mid=lerpV(T[i],T[i+1],.5),y=topY(h.group,mid.x,mid.z),rr=(R[i]+R[i+1])/2;
    if(y!==null)sp.push([V(r3(mid.x),r3(y-.05),r3(mid.z)),r3(.18+rr*.55)]);}
  end(h,T,R);
  return {Punggung:sp,Jalur:T.map(p=>p.clone()),JalurR:R.slice()};
};}
const TS=[V(0,0,0),V(0,-.4,-1.2),V(0,-.8,-2.3),V(0,-1,-3.35),V(0,-1.05,-4.35)],TR=[.62,.5,.39,.3,.22];
const whipT=[],whipR=[];
for(let i=0;i<=8;i++){whipT.push(V(.45*Math.sin(i*.6),-(i*.2)+(i>5?(i-5)*.15:0),i?-(.45+i*.75):0));whipR.push(.6*Math.pow(1-i/8,.8)+.04);}
const TAIL={
  Sekop:tailBuild([V(0,0,0),V(0,-.4,-1.2),V(.3,-.9,-2.3),V(.8,-1.3,-3.2),V(1.4,-1.5,-3.9),V(2,-1.53,-4.4)],[.62,.5,.39,.29,.2,.12],(h,T)=>{
    const d=T[5].clone().sub(T[4]).normalize();
    h.box(T[5].clone().addScaledVector(d,.5),[.9,.14,.9],'sayap').rotation.y=Math.atan2(d.x,d.z)+Math.PI/4;}),
  Kipas:tailBuild(TS,TR,(h,T)=>{const e=T[4];
    [[V(0,.55,-1),1.6,V(1,0,0)],[V(.8,-.1,-1),1.5,UP],[V(-.8,-.1,-1),1.5,UP],[V(0,-.45,-1),1.1,V(1,0,0)]].forEach(([d,L,up])=>{
      h.seg(e,e.clone().addScaledVector(d.normalize(),L),.3,.07,.85,.05,'sayap',{e1:0,e2:0,up});});}),
  Cambuk:tailBuild(whipT,whipR,(h,T)=>{h.pyr(T[8],.6,.12,T[8].clone().sub(T[7]),'tanduk');}),
  Gada:tailBuild([V(0,0,0),V(0,-.45,-1.15),V(0,-.85,-2.25),V(0,-1.05,-3.3),V(0,-1.1,-4.2)],[.62,.5,.4,.32,.26],(h,T)=>{
    const c=T[4].clone().add(V(0,0,-.45));h.box(c,[1.05,1.05,1.05],'kulit');
    [V(1,0,0),V(-1,0,0),V(0,1,0),V(0,0,-1),V(.6,.6,-.5),V(-.6,.6,-.5),V(.6,-.35,-.6),V(-.6,-.35,-.6)].forEach(d=>{
      const n=d.normalize();h.pyr(c.clone().addScaledVector(n,.45),.55,.26,n,'tanduk');});}),
  Kapak:tailBuild(TS,TR,(h,T)=>{const e=T[4];
    h.box(e.clone().add(V(0,0,-.25)),[.5,.5,.6],'kulit');
    [1,-1].forEach(s=>h.seg(e.clone().add(V(s*.2,0,-.25)),e.clone().add(V(s*1.15,0,-.25)),.5,.1,1.25,.08,'sayap',{e1:0,e2:0}));}),
  Trisula:tailBuild(TS,TR,(h,T)=>{const e=T[4];
    h.seg(e.clone().add(V(-.55,0,-.3)),e.clone().add(V(.55,0,-.3)),.18,.18,.18,.18,'tanduk',{e1:0,e2:0});
    h.pyr(e.clone().add(V(0,0,-.2)),1.05,.24,V(0,0,-1),'tanduk');
    [1,-1].forEach(s=>h.pyr(e.clone().add(V(s*.5,0,-.3)),.75,.18,V(s*.35,0,-1),'tanduk'));}),
  Kembar:tailBuild([V(0,0,0),V(0,-.4,-1.2),V(0,-.8,-2.3),V(0,-1,-3.2)],[.62,.5,.4,.32],(h,T)=>{
    [1,-1].forEach(s=>{const P=[T[3],V(s*.45,-1.05,-4.05),V(s*.95,-1.05,-4.75)];
      h.chain(P,[.5,.34,.2],[.45,.3,.18],'kulit');
      const d=P[2].clone().sub(P[1]).normalize();h.box(P[2].clone().addScaledVector(d,.35),[.6,.12,.6],'sayap').rotation.y=Math.atan2(d.x,d.z)+Math.PI/4;});}),
  Bulu:tailBuild(TS,TR,(h,T)=>{const e=T[4];
    [-.6,-.3,0,.3,.6].forEach((a,i)=>{const d=V(Math.sin(a),.12,-Math.cos(a));
      h.seg(e,e.clone().addScaledVector(d,1.4-Math.abs(a)*.6),.25,.06,.42,.05,i%2?'perut':'sayap',{e1:.05,e2:0});});}),
  Berduri:tailBuild(TS,TR,(h,T,R)=>{
    for(let i=1;i<T.length;i++)[1,-1].forEach(s=>h.pyr(T[i].clone().add(V(s*R[i]*.8,0,0)),.25+R[i]*.5,.1+R[i]*.2,V(s,.15,-.3),'tanduk'));
    h.pyr(T[4],.5,.2,V(0,0,-1),'tanduk');}),
  Kristal:tailBuild(TS,TR,(h,T)=>{const e=T[4];
    [[V(0,.2,-1),.9,.3],[V(.5,.3,-1),.7,.22],[V(-.5,.3,-1),.7,.22],[V(0,.8,-.6),.6,.2]].forEach(([d,len,w])=>{
      const n=d.normalize(),m=e.clone().addScaledVector(n,len*.55);h.seg(e,m,w,w,w,w,'sayap',{e1:.05,e2:0});h.pyr(m,len*.45,w,n,'sayap');});})
};

/* ---------- Kaki ----------
   Asal = socket bahu/pinggul. Telapak menapak di y = -2.3 (depan) dan -1.85 (belakang).
   o.k = ketebalan, o.foot = cakar | kuku | gajah | burung, o.extra = bulu | lapis | duri */
function toes(h,s,x,y,z,k,mode,cl){
  cl=cl||1;
  for(let j=-1;j<=1;j++){
    const tx=s*x+j*.21*k;
    if(mode==='long'){const a=V(tx,y-.05,z-.15),b=V(tx+j*.12,y-.06,z+.45);h.seg(a,b,.14*k,.12,.1*k,.1,'kulit',{e1:.05,e2:0});h.pyr(b,.24*k,.1*k,V(0,-.05,1),'tanduk');}
    else if(mode==='paw')h.box(V(tx,y+.01,z-.04),[.19*k,.2,.24*k],'kulit');
    else{h.box(V(tx,y,z),[.18*k,.22,.3*k],'kulit');h.pyr(V(tx,y-.01,z+.15*k),.26*k*cl,.12*k*Math.min(cl,1.3),V(0,-.06,1),'tanduk');}
  }
}
function legExtra(h,s,o,J,Lo,k){
  if(o.extra==='bulu')[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dz])=>{const a=Lo.clone().add(V(dx*.18*k,0,dz*.18*k));
    h.seg(a,a.clone().add(V(dx*.28,-.32,dz*.28)),.3*k,.06,.18*k,.05,'perut',{e1:0,e2:0,up:V(dx,0,dz)});});
  if(o.extra==='lapis'){h.box(J.clone().add(V(0,0,.3*k)),[.56*k,.5*k,.16],'tanduk');h.box(lerpV(J,Lo,.5).add(V(0,0,.27*k)),[.48*k,.55,.12],'tanduk');}
  if(o.extra==='duri')h.pyr(J.clone().add(V(0,.05,-.2*k)),.42*k,.16*k,V(0,.25,-1),'duri');
}
function frontLeg(h,s,o){
  const k=o.k;
  h.seg(V(s*.06,.3,-.05),V(s*.12,-.45,.08),.78*k,.86*k,.68*k,.64*k,'kulit',{root:true});
  if(o.foot==='gajah'){
    const B=V(s*.15,-1.95,.15);h.seg(V(s*.12,-.3,.05),B,.74*k,.7*k,.68*k,.66*k,'kulit',{e2:.05});
    h.box(V(s*.15,-2.15,.2),[.88*k,.3,.88*k],'kulit');
    for(let j=-1;j<=1;j++)h.box(V(s*.15+j*.25*k,-2.2,.2+.44*k),[.18*k,.18,.08],'tanduk');
    legExtra(h,s,o,V(s*.14,-1.1,.1),B,k);return;
  }
  const E=V(s*.22,-1.2,.25),W=V(s*.2,-1.95,.12);
  h.seg(V(s*.12,-.2,.05),E,.66*k,.62*k,.5*k,.48*k,'kulit');
  h.seg(E,W,.5*k,.48*k,.42*k,.4*k,'kulit',{e2:.05});
  if(o.foot==='kuku'){h.box(V(s*.2,-2.1,.22),[.52*k,.4,.58*k],'tanduk');h.box(V(s*.2,-1.86,.2),[.5*k,.12,.54*k],'perut');}
  else if(o.foot==='burung'){h.box(V(s*.2,-2.18,.2),[.46*k,.24,.5*k],'kulit');toes(h,s,.2,-2.18,.45,k,'long');}
  else if(o.foot==='pad'){h.box(V(s*.2,-2.17,.28),[.62*k+.15,.26,.75*k+.15],'perut');[-1,1].forEach(j=>h.box(V(s*.2+j*.13,-2.2,.28+(.75*k+.15)/2),[.18,.16,.08],'tanduk'));}
  else{h.box(V(s*.2,-2.15,.32),[.64*k,.3,.76*k],'kulit');toes(h,s,.2,-2.19,.74+.3*(k-1),k,o.toe,o.claw);}
  legExtra(h,s,o,E,W,k);
}
function hindLeg(h,s,o){
  const k=o.hk||o.k;
  if(o.foot==='gajah'){
    h.seg(V(s*.05,.15,.15),V(s*.15,-.6,.05),1*k,1.05*k,.78*k,.76*k,'kulit',{root:true});
    const B=V(s*.15,-1.55,.05);h.seg(V(s*.15,-.6,.05),B,.76*k,.74*k,.7*k,.68*k,'kulit',{e2:.05});
    h.box(V(s*.15,-1.7,.1),[.92*k,.3,.92*k],'kulit');
    for(let j=-1;j<=1;j++)h.box(V(s*.15+j*.26*k,-1.75,.1+.46*k),[.18*k,.18,.08],'tanduk');
    legExtra(h,s,o,V(s*.15,-.6,.05),B,k);return;
  }
  const K=V(s*.2,-.75,.55),A=V(s*.18,-1.25,-.15),M=V(s*.18,-1.62,.08);
  h.seg(V(s*.05,.15,.15),K,.95*k,1*k,.62*k,.62*k,'kulit',{root:true});
  h.seg(K,A,.54*k,.54*k,.42*k,.42*k,'kulit');
  h.seg(A,M,.42*k,.42*k,.36*k,.36*k,'kulit',{e2:.05});
  if(o.foot==='kuku'){h.box(V(s*.18,-1.65,.2),[.56*k,.4,.62*k],'tanduk');h.box(V(s*.18,-1.41,.18),[.52*k,.12,.56*k],'perut');}
  else if(o.foot==='pad'){h.box(V(s*.18,-1.72,.2),[.62*k+.15,.26,.75*k+.15],'perut');[-1,1].forEach(j=>h.box(V(s*.18+j*.13,-1.75,.2+(.75*k+.15)/2),[.18,.16,.08],'tanduk'));}
  else if(o.foot==='burung'){h.box(V(s*.18,-1.73,.2),[.48*k,.24,.5*k],'kulit');toes(h,s,.18,-1.73,.45,k,'long');
    const b=V(s*.18,-1.76,-.1);h.pyr(b,.35,.12,V(0,-.03,-1),'tanduk');}
  else{h.box(V(s*.18,-1.71,.35),[.68*k,.28,.86*k],'kulit');toes(h,s,.18,-1.74,.82+.3*(k-1),k,o.toe,o.claw);}
  legExtra(h,s,o,K,A,k);
}
function trexArm(h,s){
  const E=V(s*.26,-.5,.38),Hn=V(s*.2,-.62,.85);
  h.seg(V(s*.06,.2,0),E,.38,.36,.28,.28,'kulit',{root:true});
  h.seg(E,Hn,.28,.28,.22,.22,'kulit');
  for(let j=-1;j<=1;j++)h.pyr(Hn.clone().add(V(j*.08,-.02,.05)),.22,.07,V(j*.25,-.6,1),'tanduk');
}
function wyvernLeg(h,s,k){
  const K=V(s*.2,-.7,.95),A=V(s*.18,-1.25,.4),M=V(s*.18,-1.62,.62);
  h.seg(V(s*.05,.15,.15),K,.95*k,1*k,.62*k,.62*k,'kulit',{root:true});
  h.seg(K,A,.54*k,.54*k,.42*k,.42*k,'kulit');
  h.seg(A,M,.42*k,.42*k,.36*k,.36*k,'kulit',{e2:.05});
  h.box(V(s*.18,-1.71,.88),[.68*k,.28,.86*k],'kulit');toes(h,s,.18,-1.74,1.35+.3*(k-1),k);
}
function legs(o){return S=>{
  if(o.make)o.make(S);
  else if(o.wyvern){trexArm(S('DL'),1);trexArm(S('DR'),-1);wyvernLeg(S('BL'),1,o.hk);wyvernLeg(S('BR'),-1,o.hk);}
  else{if(o.front!==false){frontLeg(S('DL'),1,o);frontLeg(S('DR'),-1,o);}hindLeg(S('BL'),1,o);hindLeg(S('BR'),-1,o);}
  if(o.mat)['DL','DR','BL','BR'].forEach(k=>S(k).group.traverse(m=>{if(m.isMesh&&m.userData.mat==='kulit'){m.userData.mat=o.mat;m.material=CUR[o.mat];}}));
};}

/* ---------- Hiasan punggung (satu keping, dipasang di tiap socket punggung, skala 0.3–0.6) ---------- */
const SPINE={
  Duri:S=>{S('C').pyr(V(0,-.12,.05),1.1,.5,V(0,1,-.45),'duri',{root:true});},
  Sirip:S=>{S('C').seg(V(0,-.1,0),V(0,1,-.55).normalize().multiplyScalar(1.1),.95,.09,.14,.06,'sayap',{e1:0,e2:0,up:V(1,0,0),root:true});},
  Kristal:S=>{const h=S('C'),d=V(0,1,-.3).normalize(),m=d.clone().multiplyScalar(.5);
    h.seg(V(0,-.1,0),m,.36,.36,.36,.36,'tanduk',{e1:0,e2:0,root:true});h.pyr(m,.65,.36,d,'tanduk');},
  Gergaji:S=>{const h=S('C');[[.22,.75],[-.22,.55]].forEach(([z,ht])=>h.seg(V(0,-.1,z),V(0,ht,z-.25),.5,.09,.04,.05,'duri',{e1:0,e2:0,up:V(1,0,0),root:true}));},
  Lempeng:S=>{const h=S('C'),m=V(0,.55,-.1);
    h.seg(V(0,-.1,0),m,.3,.09,.9,.09,'sayap',{e1:0,e2:0,up:V(1,0,0),root:true});h.seg(m,V(0,1.15,-.25),.9,.09,.05,.05,'sayap',{e1:0,e2:0,up:V(1,0,0)});},
  Ganda:S=>{const h=S('C');[1,-1].forEach(s=>h.pyr(V(s*.14,-.1,0),.9,.26,V(s*.15,1,-.4),'duri',{root:true}));},
  Bulu:S=>{const h=S('C');[[.15,'sayap'],[0,'perut'],[-.15,'sayap']].forEach(([z,m],i)=>h.seg(V(0,-.1,z),V(0,.95-i*.12,z-.55),.3,.06,.16,.05,m,{e1:0,e2:0,up:V(1,0,0),root:true}));},
  Kait:S=>{S('C').chain([V(0,-.1,.05),V(0,.5,-.05),V(0,.85,-.45)],[.4,.22,.03],[.4,.22,.03],'duri',{root1:true,tip:true});},
  Paku:S=>{const h=S('C');h.box(V(0,.08,0),[.45,.36,.45],'duri',{root:true});h.pyr(V(0,.26,0),.3,.22,UP,'tanduk');}
};

/* ---------- Bagian hewan (keluarga Savana & Hutan; keluarga lain di blok "Hewan tambahan") ----------
   Memakai socket yang sama dengan bagian naga, jadi bisa dicampur: kepala singa di badan naga = "Singa Naga". */
Object.assign(BODY,{
  Badak:{torso:[V(0,2.3,0),[2.3,1.8,3.2]],chest:[V(0,2.4,1.45),[2,1.7,.9]],hips:[V(0,2.3,-1.6),[2,1.7,.8]],
    belly:[V(0,1.38,0),[2,.3,3]],plate:[V(0,2.2,1.92),[1,.9,.1]],
    neck:[V(0,2.7,1.7),V(0,2.85,2.5)],neckW:[1.2,1.05],
    head:V(0,2.95,3.05),tail:V(0,2.5,-2),wing:V(.6,0,.4),front:V(.9,0,1.2),back:V(.95,0,-1.1),ls:1,spine:{from:1.5,to:-1.8,n:9},
    extra:h=>[.9,-1].forEach(z=>h.box(V(0,2.3,z),[2.36,1.86,.12],'duri'))},
  Gajah:{torso:[V(0,2.9,-.1),[2.6,2.2,3.4]],chest:[V(0,3,1.4),[2.3,2.1,.9]],hips:[V(0,2.8,-1.75),[2.3,2,.9]],
    belly:[V(0,1.75,0),[2.1,.3,3.2]],plate:[V(0,2.9,1.88),[1.4,1.2,.08]],
    neck:[V(0,3.3,1.7),V(0,3.6,2.7)],neckW:[1.3,1.2],
    head:V(0,3.8,3.25),tail:V(0,3.2,-2.2),wing:V(.6,0,.4),front:V(1,0,1.2),back:V(1.05,0,-1.3),ls:1.15,spine:{from:1.5,to:-2,n:9}},
  Singa:{torso:[V(0,2.45,-.2),[1.6,1.3,3]],chest:[V(0,2.6,1.3),[1.8,1.6,1.1]],hips:[V(0,2.4,-1.6),[1.6,1.3,.9]],
    belly:[V(0,1.75,-.2),[1.2,.25,2.8]],plate:[V(0,2.4,1.88),[1.1,1,.1]],
    neck:[V(0,3,1.6),V(0,3.45,2.3)],neckW:[1,.9],
    head:V(0,3.7,2.7),tail:V(0,2.7,-2),wing:V(.55,0,.3),front:V(.75,0,1.25),back:V(.75,0,-1.45),ls:1,spine:{from:1.5,to:-1.9,n:9},
    extra:h=>h.box(V(0,3,1.1),[2,1.4,1.3],'duri')},
  Harimau:{torso:[V(0,2.45,-.2),[1.6,1.3,3]],chest:[V(0,2.6,1.3),[1.8,1.6,1.1]],hips:[V(0,2.4,-1.6),[1.6,1.3,.9]],
    belly:[V(0,1.75,-.2),[1.2,.25,2.8]],plate:[V(0,2.4,1.88),[1.1,1,.1]],
    neck:[V(0,3,1.6),V(0,3.45,2.3)],neckW:[1,.9],
    head:V(0,3.7,2.7),tail:V(0,2.7,-2),wing:V(.55,0,.3),front:V(.75,0,1.25),back:V(.75,0,-1.45),ls:1,spine:{from:1.5,to:-1.9,n:9},
    extra:h=>[-1.3,-.7,-.1,.5].forEach(z=>{h.box(V(0,3.115,z),[1,.04,.16],'duri');[1,-1].forEach(s=>h.box(V(s*.815,2.55,z+.12),[.04,.8,.16],'duri'));})},
  Serigala:{torso:[V(0,2.35,-.2),[1.4,1.2,2.8]],chest:[V(0,2.5,1.2),[1.5,1.5,1]],hips:[V(0,2.3,-1.5),[1.4,1.2,.8]],
    belly:[V(0,1.72,-.1),[1,.22,2.6]],plate:[V(0,2.3,1.72),[1,1,.1]],
    neck:[V(0,2.85,1.5),V(0,3.3,2.2)],neckW:[.9,.8],
    head:V(0,3.5,2.6),tail:V(0,2.6,-1.95),wing:V(.5,0,.3),front:V(.7,0,1.2),back:V(.72,0,-1.35),ls:.95,spine:{from:1.4,to:-1.8,n:9}},
  Beruang:{torso:[V(0,2.5,-.1),[2.2,1.9,3]],chest:[V(0,2.6,1.3),[2,1.8,1]],hips:[V(0,2.45,-1.5),[2,1.8,.9]],
    belly:[V(0,1.5,0),[1.8,.3,2.8]],plate:[V(0,2.4,1.82),[1.2,1,.08]],
    neck:[V(0,3,1.5),V(0,3.3,2.5)],neckW:[1.1,1],
    head:V(0,3.45,3),tail:V(0,2.7,-1.95),wing:V(.6,0,.2),front:V(.95,0,1.2),back:V(1,0,-1.2),ls:1,spine:{from:1.6,to:-1.8,n:9},
    extra:h=>h.box(V(0,3.5,.8),[1.6,.4,1.2],'kulit')},
  Rusa:{torso:[V(0,2.85,-.1),[1.3,1.3,2.6]],chest:[V(0,3,1.1),[1.4,1.4,.9]],hips:[V(0,2.75,-1.3),[1.3,1.4,.8]],
    belly:[V(0,2.15,-.1),[1,.2,2.4]],plate:[V(0,2.95,1.57),[.9,.9,.08]],
    neck:[V(0,3.4,1.3),V(0,4.15,1.9),V(0,4.65,2.25)],neckW:[.7,.6,.5],
    head:V(0,4.85,2.55),tail:V(0,3.3,-2.05),wing:V(.5,0,.3),front:V(.55,0,1.1),back:V(.55,0,-1.15),ls:1.15,spine:{from:1,to:-1.6,n:8}},
  BurungHantu:{torso:[V(0,2.3,-.1),[1.8,1.8,2.2]],chest:[V(0,2.4,.9),[1.7,1.7,.8]],hips:[V(0,2.1,-1.2),[1.6,1.4,.8]],
    belly:[V(0,1.33,0),[1.4,.2,2]],plate:[V(0,2.2,1.32),[1.3,1.4,.08]],
    neck:[V(0,2.9,.9),V(0,3.25,1.6)],neckW:[1.1,1],
    head:V(0,3.55,1.95),tail:V(0,2.3,-1.5),wing:V(.6,0,-.3),front:V(.75,0,.8),back:V(.75,0,-.8),ls:.8,spine:{from:1,to:-1.2,n:7}}
});

function catHead(h,j){
  h.box(V(0,0,0),[1,.9,.95],'kulit');
  h.box(V(0,-.18,.62),[.66,.46,.5],'perut');
  h.box(V(0,-.02,.9),[.3,.16,.1],'duri');
  j.box(V(0,-.02,.28),[.55,.15,.5],'perut');
  [1,-1].forEach(s=>{eye(h,s,V(s*.27,.15,.49),[.22,.17],'front','slit');h.box(V(s*.2,.36,.47),[.24,.07,.06],'duri').rotation.z=-s*.2;});
  return {Tanduk:V(0,.45,-.12),Rahang:V(0,-.38,.32),Mulut:V(0,-.3,.95)};
}
Object.assign(HEAD,{
  Badak:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[1,.85,1.1],'kulit');
    h.box(V(0,-.15,.95),[.9,.65,1.1],'kulit');
    h.box(V(0,-.12,1.55),[.8,.6,.25],'kulit');
    h.box(V(0,.05,-.55),[1.15,1,.14],'duri');
    j.box(V(0,-.03,.6),[.8,.2,1.1],'perut');
    [1,-1].forEach(s=>{eye(h,s,V(s*.505,.12,.3),[.18,.14],'side','round');h.box(V(s*.22,-.1,1.68),[.1,.1,.04],'duri');});
    h.acc(()=>{h.pyr(V(0,.12,1.4),1.05,.42,V(0,1,.35),'tanduk');h.pyr(V(0,.22,.95),.45,.28,V(0,1,.15),'tanduk');
      [1,-1].forEach(s=>h.box(V(s*.4,.55,-.3),[.16,.36,.12],'kulit'));});
    return {Tanduk:V(0,.42,-.2),Rahang:V(0,-.45,.3),Mulut:V(0,-.35,1.6)};},
  Gajah:S=>{const h=S('C'),j=S('J');
    h.box(V(0,.1,0),[1.2,1.15,1],'kulit');
    h.box(V(0,.12,.5),[1,.9,.3],'kulit');
    j.box(V(0,0,.3),[.6,.15,.5],'perut');
    [1,-1].forEach(s=>eye(h,s,V(s*.38,.3,.66),[.18,.16],'front','round'));
    h.acc(()=>{
      h.chain([V(0,-.1,.62),V(0,-.6,.95),V(0,-1.15,1.08),V(0,-1.6,1.3)],[.44,.36,.3,.26],[.44,.36,.3,.26],'kulit');
      [1,-1].forEach(s=>{
        const ear=h.box(V(s*.98,-.02,-.22),[1.05,1.25,.12],'kulit');ear.rotation.y=-s*.3;ear.rotation.z=s*.12;
        const inner=h.box(V(s*.96,-.04,-.15),[.75,.95,.03],'perut');inner.rotation.y=-s*.3;inner.rotation.z=s*.12;
        h.chain([V(s*.32,-.35,.45),V(s*.4,-.78,.85),V(s*.3,-.88,1.3)],[.17,.13,.03],[.17,.13,.03],'tanduk',{tip:true});
      });});
    return {Tanduk:V(0,.68,-.2),Rahang:V(0,-.45,.25),Mulut:V(0,-.5,.75),Belalai:V(0,-1.74,1.36)};},
  Singa:S=>{const h=S('C'),so=catHead(h,S('J'));
    h.acc(()=>{
      for(let i=0;i<10;i++){const a=i/10*Math.PI*2;h.box(V(Math.sin(a)*.72,Math.cos(a)*.72-.05,-.22),[.5,.5,.55],'duri').rotation.z=-a;}
      h.box(V(0,-.05,-.55),[1.55,1.55,.3],'duri');
      [1,-1].forEach(s=>h.box(V(s*.36,.62,.05),[.2,.2,.1],'kulit'));
    });
    return so;},
  Harimau:S=>{const h=S('C'),so=catHead(h,S('J'));
    [-.1,.1,.3].forEach((z,i)=>h.box(V(0,.455,z),[.5-i*.1,.03,.07],'duri'));
    [1,-1].forEach(s=>[0,.25].forEach(z=>h.box(V(s*.505,.05,z-.1),[.03,.35,.07],'duri')));
    h.acc(()=>[1,-1].forEach(s=>{h.box(V(s*.36,.55,-.1),[.24,.24,.1],'kulit');h.box(V(s*.36,.53,-.04),[.14,.14,.03],'perut');
      h.box(V(s*.52,-.25,.2),[.18,.3,.38],'perut');}));
    return so;},
  Serigala:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[.9,.8,.9],'kulit');
    h.seg(V(0,-.12,.35),V(0,-.2,1.35),.55,.42,.38,.3,'kulit',{e1:0,e2:0});
    h.box(V(0,-.08,1.4),[.2,.14,.1],'duri');
    j.seg(V(0,0,0),V(0,-.05,.95),.45,.14,.3,.1,'perut',{e1:0,e2:0});
    [1,-1].forEach(s=>{eye(h,s,V(s*.3,.15,.45),[.2,.14],'front','round');h.box(V(s*.47,-.2,.15),[.06,.3,.4],'perut');});
    h.acc(()=>[1,-1].forEach(s=>h.pyr(V(s*.27,.32,-.15),.58,.28,V(s*.18,1,-.12),'kulit',{h:.12})));
    return {Tanduk:V(0,.4,-.2),Rahang:V(0,-.32,.32),Mulut:V(0,-.25,1.35)};},
  Beruang:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[1.15,1,1],'kulit');
    h.box(V(0,-.2,.65),[.6,.45,.5],'perut');
    h.box(V(0,-.05,.92),[.28,.16,.08],'duri');
    j.box(V(0,0,.28),[.5,.14,.45],'perut');
    [1,-1].forEach(s=>eye(h,s,V(s*.3,.18,.51),[.16,.16],'front','round'));
    h.acc(()=>[1,-1].forEach(s=>{h.box(V(s*.45,.58,-.1),[.32,.3,.14],'kulit');h.box(V(s*.45,.56,-.02),[.18,.16,.03],'perut');}));
    return {Tanduk:V(0,.5,-.15),Rahang:V(0,-.42,.32),Mulut:V(0,-.35,.9)};},
  Rusa:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[.8,.75,.85],'kulit');
    h.seg(V(0,-.05,.3),V(0,-.2,1.15),.55,.45,.4,.32,'kulit',{e1:0,e2:0});
    h.box(V(0,-.12,1.18),[.24,.15,.08],'duri');
    j.seg(V(0,0,0),V(0,-.06,.85),.36,.12,.25,.08,'perut',{e1:0,e2:0});
    [1,-1].forEach(s=>eye(h,s,V(s*.415,.12,.2),[.26,.22],'side','round'));
    h.acc(()=>[1,-1].forEach(s=>{h.seg(V(s*.38,.1,-.2),V(s*.92,.18,-.42),.3,.08,.14,.06,'kulit',{e1:0,e2:0});
      h.seg(V(s*.42,.145,-.2),V(s*.84,.215,-.39),.17,.03,.08,.03,'perut',{e1:0,e2:0});}));
    return {Tanduk:V(0,.38,-.15),Rahang:V(0,-.3,.25),Mulut:V(0,-.25,1.2)};},
  BurungHantu:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[1.3,1.15,.9],'kulit');
    h.box(V(0,-.02,.46),[1.1,.95,.06],'perut');
    [1,-1].forEach(s=>{h.box(V(s*.27,.08,.5),[.26,.26,.04],'mata');h.box(V(s*.27,.08,.525),[.11,.11,.02],'duri');});
    h.box(V(0,.32,.5),[.8,.1,.06],'duri');
    h.pyr(V(0,-.12,.48),.32,.18,V(0,-.45,1),'tanduk');
    j.box(V(0,0,.06),[.14,.06,.12],'tanduk');
    h.acc(()=>[1,-1].forEach(s=>h.pyr(V(s*.45,.5,-.05),.48,.22,V(s*.35,1,-.1),'kulit',{h:.12})));
    return {Tanduk:V(0,.58,-.15),Rahang:V(0,-.32,.48),Mulut:V(0,-.25,.75)};}
});

Object.assign(TAIL,{
  Jumbai:tailBuild([V(0,0,0),V(0,-.45,-.75),V(0,-1,-1.15),V(0,-1.45,-1.3)],[.25,.18,.14,.12],(h,T)=>{
    h.box(T[3].clone().add(V(0,-.2,-.05)),[.36,.46,.36],'duri');}),
  Loreng:tailBuild([V(0,0,0),V(0,-.35,-.9),V(0,-.6,-1.9),V(.15,-.5,-2.8),V(.3,-.1,-3.5)],[.32,.27,.23,.2,.16],(h,T,R)=>{
    for(let i=1;i<T.length;i++){
      const d=(T[i+1]||T[i]).clone().sub(T[i-1]).normalize(),k=1.14;
      [[T[i],R[i]],[lerpV(T[i-1],T[i],.5),(R[i-1]+R[i])/2]].forEach(([p,r])=>
        h.seg(p.clone().addScaledVector(d,-.06),p.clone().addScaledVector(d,.06),r*1.7*k,r*1.5*k,r*1.7*k,r*1.5*k,'duri',{e1:0,e2:0}));
    }}),
  Lebat:tailBuild([V(0,0,0),V(0,-.4,-.8),V(0,-.85,-1.55),V(0,-1.1,-2.25)],[.28,.42,.48,.36],(h,T)=>{
    const d=T[3].clone().sub(T[2]).normalize();h.seg(T[3],T[3].clone().addScaledVector(d,.45),.62,.55,.2,.18,'perut',{e1:.1,e2:0});}),
  Pendek:tailBuild([V(0,0,0),V(0,-.12,-.45)],[.3,.24],(h,T)=>{h.box(T[1].clone().add(V(0,-.02,-.14)),[.3,.3,.2],'perut');}),
  Burung:tailBuild([V(0,0,0),V(0,-.15,-.5)],[.3,.26],(h,T)=>{
    [-.5,-.25,0,.25,.5].forEach((a,i)=>{const d=V(Math.sin(a),-.15,-Math.cos(a));
      h.seg(T[1],T[1].clone().addScaledVector(d,1.1-Math.abs(a)*.4),.25,.06,.4,.05,i%2?'perut':'kulit',{e1:.05,e2:0});});})
});
SPINE.Surai=S=>{S('C').box(V(0,.15,0),[.75,.6,.55],'duri',{root:true}).rotation.x=-.3;};

/* ---------- Hewan tambahan: Gurun, Samudra, Kutub, Rawa, Langit (+ Savana & Hutan) ----------
   quad() menyusun badan berkaki empat dari ukuran torso; soket kaki dihitung dari tinggi torso supaya telapak menapak tanah.
   skin = bahan kulit badan (Orca & Pinguin memakai 'duri' supaya punggungnya gelap di palet Belang). */
const GR='Gurun',SM='Samudra',KT='Kutub',RW='Rawa',LG='Langit';
function quad(p){const {y,w,h,l}=p,ls=p.ls??r3((y-.25)/2.3);
  return {torso:[V(0,y,-.1),[w,h,l]],chest:[V(0,y+(p.cy??.12),l/2-.35),[w*(p.cw??1.08),h*(p.ch??1.12),p.cd??1]],
    hips:[V(0,y-(p.hy??.05),-l/2+.25),[w*(p.hw??1),h*(p.hh??1),p.hd??.9]],
    belly:[V(0,y-h/2-.08,-.1),[w*.75,.25,l*.85]],plate:[V(0,y,l/2),[w*.6,h*.6,.1]],
    neck:p.neck,neckW:p.neckW,head:p.head,tail:V(0,p.ty??y+.15,-l/2-.4),wing:V(w*.32,0,p.wz??.2),
    front:V(w/2-.05,0,Math.max(l/2-.35,.75)),back:V(w/2-.02,0,Math.min(-l/2+.3,-.75)),ls,spine:{from:l/2-.2,to:-l/2-.1,n:p.sn??9},extra:p.extra,skin:p.skin};}
const zebraBody=quad({y:3,w:1.35,h:1.35,l:2.9,ls:1.2,neck:[V(0,3.4,1.1),V(0,4.15,1.65),V(0,4.75,1.95)],neckW:[.85,.72,.62],head:V(0,4.95,2.3),sn:9,
  extra:h=>{for(let i=0;i<6;i++){const z=1.1-i*.45;h.box(V(0,3.69,z),[1.39,.04,.12],'duri');[1,-1].forEach(s=>h.box(V(s*.695,3.2,z+.08),[.04,.9,.12],'duri'));}}});
Object.assign(BODY,{
  Unta:quad({y:3.3,w:1.4,h:1.3,l:2.8,ls:1.32,neck:[V(0,3.65,1.1),V(0,4.1,2),V(0,4.85,2.45),V(0,5.4,2.6)],neckW:[.8,.62,.55,.5],head:V(0,5.6,2.95),
    extra:h=>{h.box(V(0,4.15,-.15),[1.15,.6,1.3],'kulit');h.box(V(0,4.5,-.15),[.8,.3,.9],'kulit');}}),
  Kalajengking:quad({y:1.25,w:2,h:.8,l:2.6,ls:.47,cy:0,ch:1,cw:.95,neck:[V(0,1.35,1),V(0,1.4,1.45)],neckW:[.9,.85],head:V(0,1.45,1.75),ty:1.4,sn:7,
    extra:h=>[.7,.2,-.3,-.8].forEach(z=>h.box(V(0,1.66,z),[1.9,.06,.2],'duri'))}),
  Fennec:quad({y:1.9,w:1,h:.95,l:2.1,neck:[V(0,2.25,.75),V(0,2.65,1.15)],neckW:[.65,.58],head:V(0,2.85,1.45)}),
  Kobra:quad({y:1.2,w:1.1,h:.9,l:3.6,ls:.43,cy:.05,ch:1,neck:[V(0,1.45,1.5),V(0,2.3,2),V(0,3.1,2.25)],neckW:[.85,.72,.65],head:V(0,3.3,2.55),ty:1.25,sn:12,
    extra:h=>{for(let z=-1.5;z<=1.4;z+=.5)h.box(V(0,1.66,z),[.6,.04,.25],'duri');}}),
  Kanguru:quad({y:2.1,w:1.25,h:1.3,l:2,ls:.88,cy:.45,cw:.9,ch:.95,cd:.8,hw:1.15,hh:1.25,hd:1.1,hy:.25,neck:[V(0,3.05,.65),V(0,3.5,.95)],neckW:[.65,.56],head:V(0,3.75,1.25),ty:1.7}),
  Hiu:quad({y:2,w:1.35,h:1.3,l:3.4,ls:.62,neck:[V(0,2.2,1.5),V(0,2.25,2)],neckW:[1.15,1.05],head:V(0,2.3,2.5),ty:2.1,sn:7,
    extra:h=>{h.seg(V(0,2.55,.1),V(0,3.75,-.55),1.1,.14,.2,.08,'kulit',{e1:0,e2:0,up:V(1,0,0)}).userData.noTop=true;h.box(V(0,1.42,0),[1.1,.2,2.8],'perut');}}),
  Orca:quad({y:2.3,w:1.8,h:1.65,l:3.6,ls:.7,neck:[V(0,2.5,1.6),V(0,2.6,2.1)],neckW:[1.45,1.35],head:V(0,2.65,2.6),ty:2.4,sn:7,skin:'duri',
    extra:h=>{h.seg(V(0,3,.1),V(0,4.6,-.2),1,.16,.25,.1,'duri',{e1:0,e2:0,up:V(1,0,0)}).userData.noTop=true;h.box(V(0,1.5,.2),[1.4,.3,3],'perut');[1,-1].forEach(s=>h.box(V(s*.91,2,-.9),[.04,.5,1],'perut'));}}),
  Gurita:quad({y:1.9,w:1.6,h:1.3,l:1.6,ls:.8,cw:1.05,cd:.8,hw:.95,neck:[V(0,2.1,.7),V(0,2.2,1.05)],neckW:[1,.95],head:V(0,2.35,1.4),ty:1.7,sn:5,
    extra:h=>{h.box(V(0,2.9,-.35),[1.5,1.2,1.5],'kulit');h.box(V(0,3.55,-.5),[1.1,.5,1.1],'kulit');[1,-1].forEach(s=>[.0,-.6].forEach(z=>h.box(V(s*.765,2.9,z),[.04,.22,.22],'perut')));}}),
  Kepiting:quad({y:1.45,w:2.2,h:.75,l:1.7,ls:.55,cy:0,ch:1,cw:1,cd:.7,neck:[V(0,1.55,.7),V(0,1.6,.95)],neckW:[.8,.75],head:V(0,1.65,1.2),ty:1.45,sn:5,
    extra:h=>{h.box(V(0,1.92,-.05),[2.6,.3,1.9],'kulit');[1,-1].forEach(s=>[.5,.1,-.3].forEach(z=>h.pyr(V(s*1.28,1.92,z),.3,.14,V(s,0,.3),'duri')));}}),
  Penyu:quad({y:1.55,w:1.7,h:.85,l:2.3,ls:.55,cy:0,ch:1,neck:[V(0,1.65,1),V(0,1.85,1.55)],neckW:[.6,.55],head:V(0,1.95,1.9),ty:1.55,sn:7,
    extra:h=>{h.box(V(0,2.05,-.1),[2.3,.55,2.7],'duri');h.box(V(0,2.45,-.1),[1.7,.35,2.1],'duri');[[0,.4],[0,-.5],[.5,0],[-.5,0]].forEach(([x,z])=>h.box(V(x,2.63,z-.1),[.45,.04,.45],'tanduk'));}}),
  Lumba:quad({y:2,w:1.15,h:1.15,l:3.2,ls:.6,neck:[V(0,2.2,1.4),V(0,2.25,1.85)],neckW:[.95,.88],head:V(0,2.3,2.25),ty:2.05,sn:7,
    extra:h=>{h.seg(V(0,2.45,-.1),V(0,3.25,-.7),.9,.12,.2,.08,'kulit',{e1:0,e2:0,up:V(1,0,0)}).userData.noTop=true;h.box(V(0,1.45,.1),[.9,.2,2.6],'perut');}}),
  Pinguin:quad({y:1.8,w:1.4,h:1.9,l:1.6,ls:.5,cy:.1,cw:1,ch:1,cd:.75,hy:.1,hh:.95,hd:.75,neck:[V(0,2.7,.2),V(0,3,.25)],neckW:[1.05,.95],head:V(0,3.3,.45),ty:1.1,sn:4,skin:'duri',
    extra:h=>h.box(V(0,1.75,.86),[1.15,1.6,.14],'perut')}),
  Walrus:quad({y:1.75,w:2.1,h:1.45,l:2.7,ls:.58,neck:[V(0,2.1,1.2),V(0,2.4,1.75)],neckW:[1.35,1.25],head:V(0,2.5,2.15),ty:1.6,sn:7}),
  Mamut:Object.assign({},BODY.Gajah,{extra:h=>{h.box(V(0,4.1,.9),[2.2,.5,1.4],'kulit');[1,-1].forEach(s=>[1,.2,-.6,-1.4].forEach(z=>h.box(V(s*1.32,2.05,z),[.08,.6,.75],'duri')));}}),
  Yak:quad({y:2.55,w:1.85,h:1.6,l:2.8,ls:.98,neck:[V(0,2.9,1.2),V(0,2.95,1.85)],neckW:[1.1,1],head:V(0,2.9,2.3),sn:8,
    extra:h=>{h.box(V(0,3.45,.6),[1.5,.45,1.2],'kulit');[1,-1].forEach(s=>[1,.2,-.6].forEach(z=>h.box(V(s*.95,1.85,z),[.1,.7,.8],'duri')));h.box(V(0,1.6,0),[1.6,.25,2.4],'duri');}}),
  Gorila:quad({y:2.55,w:1.7,h:1.5,l:2.5,ls:1.02,cy:.35,cw:1.3,ch:1.25,cd:1.1,hw:.9,hh:.85,hy:.25,neck:[V(0,3.35,.75),V(0,3.55,1.05)],neckW:[.95,.9],head:V(0,3.85,1.4),ty:2,sn:6}),
  Monyet:quad({y:1.95,w:.95,h:.95,l:1.7,neck:[V(0,2.3,.55),V(0,2.65,.85)],neckW:[.55,.5],head:V(0,2.9,1.1),sn:6}),
  Panda:Object.assign({},BODY.Beruang,{extra:h=>{h.box(V(0,3.5,.8),[1.6,.4,1.2],'kulit');h.box(V(0,2.6,1.05),[2.26,1.86,.9],'duri');}}),
  Babi:quad({y:1.85,w:1.55,h:1.25,l:2.5,neck:[V(0,2.1,1),V(0,2.2,1.5)],neckW:[1.05,.95],head:V(0,2.25,1.9),sn:8}),
  Landak:quad({y:1.3,w:1.4,h:1.05,l:1.8,ls:.45,cy:0,ch:1,neck:[V(0,1.35,.7),V(0,1.4,1)],neckW:[.7,.62],head:V(0,1.45,1.3),ty:1.4,sn:8,
    extra:h=>{[-.45,0,.45].forEach((x,i)=>[.45,0,-.45,-.9].forEach((z,j)=>h.pyr(V(x,1.7,z),.8-Math.abs(x)*.4,.2,V(x*1.3,1,-.7),(i+j)%2?'perut':'duri',{root:true}).userData.noTop=true));}}),
  Rakun:quad({y:1.75,w:1.15,h:.95,l:1.9,neck:[V(0,2.05,.75),V(0,2.4,1.1)],neckW:[.72,.64],head:V(0,2.6,1.4),sn:7}),
  Katak:quad({y:1.4,w:1.7,h:.95,l:1.5,ls:.5,cy:.1,cd:.7,hd:.7,neck:[V(0,1.6,.45),V(0,1.7,.65)],neckW:[1.15,1.1],head:V(0,1.85,1),ty:1.3,sn:4}),
  Komodo:quad({y:1.65,w:2,h:1.05,l:3.2,ls:.62,cy:.05,neck:[V(0,1.85,1.5),V(0,2.1,2.15)],neckW:[1,.9],head:V(0,2.25,2.6),ty:1.75,sn:11}),
  KudaNil:quad({y:2,w:2.3,h:1.75,l:2.9,ls:.7,neck:[V(0,2.45,1.25),V(0,2.55,1.8)],neckW:[1.45,1.35],head:V(0,2.6,2.3),sn:8}),
  Rajawali:quad({y:2.25,w:1.3,h:1.45,l:1.9,ls:.85,cy:.15,neck:[V(0,2.85,.7),V(0,3.2,1)],neckW:[.8,.7],head:V(0,3.45,1.3),ty:2.1,wz:-.1,sn:6}),
  Kambing:quad({y:2.45,w:1.3,h:1.25,l:2.3,neck:[V(0,2.85,.95),V(0,3.45,1.4)],neckW:[.72,.62],head:V(0,3.7,1.7),sn:8}),
  Kalong:quad({y:2,w:1,h:1,l:1.5,neck:[V(0,2.45,.5),V(0,2.75,.75)],neckW:[.65,.58],head:V(0,3,1),sn:5,wz:.1}),
  Cendrawasih:quad({y:2.05,w:1,h:1.1,l:1.5,neck:[V(0,2.55,.45),V(0,2.9,.7)],neckW:[.6,.52],head:V(0,3.15,.95),ty:1.95,sn:5,extra:h=>h.box(V(0,2.15,.62),[.85,.8,.12],'sayap')}),
  Zebra:zebraBody,
  Cheetah:quad({y:2.3,w:1.15,h:1.05,l:2.9,neck:[V(0,2.65,1.2),V(0,3.05,1.75)],neckW:[.78,.68],head:V(0,3.25,2.1),sn:9,
    extra:h=>[[.3,.8],[-.2,.4],[.25,-.1],[-.3,-.6],[.2,-1],[0,.1],[-.1,-1.3]].forEach(([y,z])=>[1,-1].forEach(s=>h.box(V(s*.585,2.3+y,z),[.03,.13,.13],'duri')))})
});

Object.assign(HEAD,{
  Unta:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[.8,.75,.85],'kulit');
    h.seg(V(0,-.05,.3),V(0,-.22,1.25),.6,.5,.5,.42,'kulit',{e1:0,e2:0});
    h.box(V(0,-.36,1.1),[.48,.16,.3],'perut');
    [1,-1].forEach(s=>{eye(h,s,V(s*.405,.1,.18),[.22,.16],'side','round');h.box(V(s*.4,.22,.18),[.06,.07,.3],'duri');h.box(V(s*.14,-.08,1.3),[.08,.12,.04],'duri');});
    j.seg(V(0,0,0),V(0,-.04,.85),.42,.12,.36,.1,'perut',{e1:0,e2:0});
    h.acc(()=>[1,-1].forEach(s=>h.box(V(s*.36,.42,-.2),[.14,.22,.12],'kulit')));
    return {Tanduk:V(0,.38,-.15),Rahang:V(0,-.3,.3),Mulut:V(0,-.3,1.3)};},
  Kalajengking:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[1.1,.5,.9],'kulit');
    h.box(V(0,.2,-.05),[.8,.16,.6],'duri');
    [[.12,.3],[-.12,.3],[.3,.15],[-.3,.15]].forEach(([x,z])=>h.box(V(x,.29,z),[.1,.08,.1],'mata'));
    [1,-1].forEach(s=>h.seg(V(s*.2,-.05,.4),V(s*.18,-.12,.8),.2,.18,.12,.1,'tanduk',{e1:0,e2:.04}));
    j.box(V(0,0,.2),[.5,.1,.35],'perut');
    return {Tanduk:V(0,.3,-.25),Rahang:V(0,-.22,.25),Mulut:V(0,-.15,.85)};},
  Fennec:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[.85,.75,.8],'kulit');
    h.seg(V(0,-.1,.3),V(0,-.18,1.1),.45,.36,.26,.2,'kulit',{e1:0,e2:0});
    h.box(V(0,-.14,1.12),[.14,.1,.08],'duri');
    j.seg(V(0,0,0),V(0,-.04,.75),.36,.1,.22,.08,'perut',{e1:0,e2:0});
    [1,-1].forEach(s=>{eye(h,s,V(s*.24,.12,.41),[.18,.15],'front','round');h.box(V(s*.33,-.18,.3),[.18,.2,.3],'perut');});
    h.acc(()=>[1,-1].forEach(s=>{h.pyr(V(s*.28,.3,-.1),1.05,.5,V(s*.4,1,-.15),'kulit',{h:.1});h.pyr(V(s*.29,.33,-.04),.8,.3,V(s*.4,1,-.15),'perut',{h:.04});}));
    return {Tanduk:V(0,.38,-.25),Rahang:V(0,-.3,.3),Mulut:V(0,-.22,1.1)};},
  Kobra:S=>{const so=HEAD.Ular(S),h=S('C');
    h.acc(()=>[1,-1].forEach(s=>{h.seg(V(s*.25,-.05,-.35),V(s*1.2,.2,-.6),1.4,.1,.9,.08,'kulit',{e1:0,e2:0,up:V(0,0,1)});
      h.seg(V(s*.3,-.02,-.29),V(s*1.05,.18,-.48),.8,.04,.5,.04,'perut',{e1:0,e2:0,up:V(0,0,1)});}));
    return so;},
  Kanguru:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[.75,.7,.8],'kulit');
    h.seg(V(0,-.08,.3),V(0,-.2,1.05),.5,.42,.36,.3,'kulit',{e1:0,e2:0});
    h.box(V(0,-.13,1.08),[.2,.13,.08],'duri');
    j.seg(V(0,0,0),V(0,-.05,.7),.32,.1,.24,.08,'perut',{e1:0,e2:0});
    [1,-1].forEach(s=>eye(h,s,V(s*.38,.12,.2),[.22,.18],'side','round'));
    h.acc(()=>[1,-1].forEach(s=>{h.seg(V(s*.22,.3,-.15),V(s*.42,1.05,-.3),.24,.1,.16,.06,'kulit',{e1:0,e2:0,up:V(0,0,1)});
      h.seg(V(s*.225,.36,-.1),V(s*.4,.95,-.23),.13,.03,.08,.03,'perut',{e1:0,e2:0,up:V(0,0,1)});}));
    return {Tanduk:V(0,.36,-.2),Rahang:V(0,-.28,.28),Mulut:V(0,-.22,1.05)};},
  Hiu:S=>{const h=S('C'),j=S('J');
    h.seg(V(0,0,-.45),V(0,.02,1.2),1,.85,.42,.3,'kulit',{e1:0,e2:.12});
    h.box(V(0,-.28,.2),[.74,.12,.9],'perut');
    [1,-1].forEach(s=>{eye(h,s,V(s*.37,.1,.3),[.14,.12],'side','round');[-.35,-.2,-.05].forEach(z=>h.box(V(s*.47,-.1,z),[.03,.35,.04],'duri'));});
    j.box(V(0,0,.35),[.72,.16,.75],'perut');
    for(let i=0;i<5;i++)[1,-1].forEach(s=>j.pyr(V(s*(.28-i*.02),.06,.1+i*.14),.14,.06,UP,'tanduk'));
    return {Tanduk:V(0,.38,-.2),Rahang:V(0,-.38,.15),Mulut:V(0,-.3,.9)};},
  Orca:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[1.15,.95,1.1],'duri');
    h.seg(V(0,-.05,.45),V(0,-.1,1.15),1,.8,.8,.55,'duri',{e1:0,e2:.1});
    j.box(V(0,0,.45),[.9,.16,.9],'perut');
    [1,-1].forEach(s=>{h.box(V(s*.58,.12,-.05),[.04,.22,.4],'perut');eye(h,s,V(s*.58,.02,.25),[.12,.1],'side','round');});
    return {Tanduk:V(0,.48,-.2),Rahang:V(0,-.42,.2),Mulut:V(0,-.3,1.15)};},
  Gurita:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[1.1,1,.9],'kulit');
    h.box(V(0,.55,-.1),[.9,.3,.75],'kulit');
    [1,-1].forEach(s=>{h.box(V(s*.5,.12,.2),[.18,.3,.3],'perut');eye(h,s,V(s*.6,.12,.2),[.24,.18],'side','slit');});
    h.seg(V(.3,-.25,.4),V(.5,-.38,.65),.18,.18,.14,.14,'perut',{e1:0,e2:.05});
    j.box(V(0,0,.25),[.5,.12,.4],'perut');
    return {Tanduk:V(0,.7,-.2),Rahang:V(0,-.42,.15),Mulut:V(0,-.3,.6)};},
  Kepiting:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[1,.5,.7],'kulit');
    [1,-1].forEach(s=>h.box(V(s*.14,-.12,.38),[.14,.14,.1],'tanduk'));
    j.box(V(0,0,.15),[.5,.1,.3],'perut');
    h.acc(()=>[1,-1].forEach(s=>{h.seg(V(s*.25,.2,.2),V(s*.32,.65,.3),.12,.12,.1,.1,'kulit',{e1:0,e2:0});h.box(V(s*.32,.72,.3),[.2,.2,.2],'mata');h.box(V(s*.32,.72,.41),[.08,.08,.03],'duri');}));
    return {Tanduk:V(0,.25,-.2),Rahang:V(0,-.22,.2),Mulut:V(0,-.15,.45)};},
  Penyu:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[.8,.65,.85],'kulit');
    h.seg(V(0,-.02,.35),V(0,-.12,.85),.6,.45,.42,.3,'kulit',{e1:0,e2:0});
    h.pyr(V(0,-.08,.86),.22,.3,V(0,-.6,1),'tanduk',{h:.2});
    h.box(V(0,.3,.05),[.6,.08,.55],'duri');
    [1,-1].forEach(s=>eye(h,s,V(s*.405,.1,.3),[.18,.14],'side','round'));
    j.seg(V(0,0,0),V(0,-.03,.55),.4,.1,.3,.08,'perut',{e1:0,e2:0});
    return {Tanduk:V(0,.34,-.2),Rahang:V(0,-.25,.3),Mulut:V(0,-.2,.9)};},
  Lumba:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[.95,.85,.95],'kulit');
    h.box(V(0,.15,.45),[.8,.55,.3],'kulit');
    h.seg(V(0,-.15,.5),V(0,-.2,1.35),.38,.3,.3,.24,'kulit',{e1:0,e2:.08});
    j.seg(V(0,0,0),V(0,-.04,1),.34,.12,.26,.1,'perut',{e1:0,e2:0});
    [1,-1].forEach(s=>eye(h,s,V(s*.48,.05,.28),[.14,.12],'side','round'));
    h.box(V(0,.43,-.15),[.12,.04,.12],'duri');
    return {Tanduk:V(0,.43,-.3),Rahang:V(0,-.32,.4),Mulut:V(0,-.22,1.35)};},
  Pinguin:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[.85,.8,.8],'duri');
    h.box(V(0,-.1,.32),[.6,.45,.2],'perut');
    h.pyr(V(0,-.02,.4),.45,.2,V(0,-.15,1),'tanduk',{h:.14});
    [1,-1].forEach(s=>{h.box(V(s*.43,.05,.05),[.04,.3,.28],'perut');eye(h,s,V(s*.43,.12,.25),[.12,.12],'side','round');});
    j.pyr(V(0,0,.05),.35,.16,V(0,-.2,1),'tanduk',{h:.06});
    return {Tanduk:V(0,.4,-.15),Rahang:V(0,-.12,.38),Mulut:V(0,-.05,.8)};},
  Walrus:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[1.05,.85,.9],'kulit');
    h.box(V(0,-.2,.55),[1,.55,.45],'perut');
    [1,-1].forEach(s=>{eye(h,s,V(s*.3,.2,.46),[.12,.1],'front','round');
      for(let i=0;i<3;i++)h.box(V(s*.28,-.12-i*.1,.79),[.3,.025,.025],'duri');
      h.seg(V(s*.2,-.4,.65),V(s*.24,-1.2,.85),.14,.14,.05,.05,'tanduk',{e2:0});});
    j.box(V(0,0,.3),[.5,.12,.35],'perut');
    return {Tanduk:V(0,.42,-.2),Rahang:V(0,-.45,.2),Mulut:V(0,-.35,.75)};},
  Mamut:S=>{const h=S('C'),j=S('J');
    h.box(V(0,.1,0),[1.2,1.15,1],'kulit');
    h.box(V(0,.72,-.05),[.95,.4,.8],'kulit');
    h.box(V(0,.6,-.15),[1.05,.5,.85],'duri');
    h.box(V(0,.12,.5),[1,.9,.3],'kulit');
    j.box(V(0,0,.3),[.6,.15,.5],'perut');
    [1,-1].forEach(s=>eye(h,s,V(s*.38,.3,.66),[.16,.14],'front','round'));
    h.acc(()=>{h.chain([V(0,-.1,.62),V(0,-.6,.95),V(0,-1.15,1.08),V(0,-1.6,1.3)],[.44,.36,.3,.26],[.44,.36,.3,.26],'kulit');
      [1,-1].forEach(s=>{h.box(V(s*.62,0,-.15),[.12,.55,.5],'duri');
        h.chain([V(s*.32,-.35,.45),V(s*.55,-.95,.95),V(s*.5,-1.1,1.6),V(s*.25,-.75,2)],[.2,.17,.12,.03],[.2,.17,.12,.03],'tanduk',{tip:true});});});
    return {Tanduk:V(0,.92,-.2),Rahang:V(0,-.45,.25),Mulut:V(0,-.5,.75),Belalai:V(0,-1.74,1.36)};},
  Yak:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[1.1,.9,.95],'kulit');
    h.box(V(0,-.2,.6),[.8,.6,.5],'kulit');
    h.box(V(0,-.25,.86),[.6,.35,.06],'perut');
    h.box(V(0,.28,.35),[.9,.4,.35],'duri');
    [1,-1].forEach(s=>{eye(h,s,V(s*.555,.02,.25),[.16,.12],'side','round');h.box(V(s*.62,.15,-.15),[.28,.12,.18],'kulit');});
    j.box(V(0,0,.32),[.55,.14,.45],'perut');
    h.acc(()=>h.box(V(0,-.65,.1),[.8,.5,.6],'duri'));
    return {Tanduk:V(0,.45,-.15),Rahang:V(0,-.45,.35),Mulut:V(0,-.35,.9)};},
  Gorila:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[1,.95,.9],'kulit');
    h.box(V(0,.55,-.15),[.5,.3,.6],'kulit');
    h.box(V(0,.3,.45),[.95,.2,.2],'duri');
    h.box(V(0,-.2,.5),[.75,.5,.4],'perut');
    h.box(V(0,-.08,.71),[.35,.14,.05],'duri');
    [1,-1].forEach(s=>{eye(h,s,V(s*.24,.12,.455),[.14,.1],'front','round');h.box(V(s*.52,.05,-.05),[.1,.22,.18],'perut');});
    j.box(V(0,0,.3),[.65,.14,.4],'perut');
    return {Tanduk:V(0,.6,-.3),Rahang:V(0,-.45,.25),Mulut:V(0,-.35,.7)};},
  Monyet:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[.85,.8,.8],'kulit');
    h.box(V(0,-.05,.38),[.65,.6,.1],'perut');
    h.box(V(0,-.22,.48),[.4,.25,.2],'perut');
    h.box(V(0,-.16,.585),[.14,.06,.03],'duri');
    [1,-1].forEach(s=>{eye(h,s,V(s*.15,.08,.44),[.14,.12],'front','round');h.box(V(s*.48,.02,-.02),[.12,.32,.3],'kulit');h.box(V(s*.545,.02,-.01),[.03,.22,.2],'perut');});
    j.box(V(0,0,.2),[.35,.1,.28],'perut');
    return {Tanduk:V(0,.4,-.15),Rahang:V(0,-.32,.3),Mulut:V(0,-.25,.6)};},
  Panda:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[1.15,1,1],'kulit');
    h.box(V(0,-.2,.6),[.6,.42,.3],'perut');
    h.box(V(0,-.06,.76),[.24,.14,.04],'duri');
    [1,-1].forEach(s=>{h.box(V(s*.26,.1,.51),[.3,.22,.04],'duri').rotation.z=s*.5;eye(h,s,V(s*.27,.12,.535),[.1,.1],'front','round');});
    j.box(V(0,0,.28),[.5,.14,.45],'perut');
    h.acc(()=>[1,-1].forEach(s=>h.box(V(s*.45,.58,-.1),[.34,.32,.16],'duri')));
    return {Tanduk:V(0,.5,-.15),Rahang:V(0,-.42,.32),Mulut:V(0,-.35,.85)};},
  Babi:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[1,.85,.95],'kulit');
    h.seg(V(0,-.1,.35),V(0,-.15,.95),.7,.6,.55,.5,'kulit',{e1:0,e2:0});
    h.box(V(0,-.15,1),[.5,.4,.1],'perut');
    [1,-1].forEach(s=>{h.box(V(s*.11,-.15,1.055),[.09,.12,.03],'duri');eye(h,s,V(s*.36,.25,.48),[.13,.1],'front','round');
      h.pyr(V(s*.28,-.35,.85),.35,.1,V(s*.3,1,.2),'tanduk');});
    j.seg(V(0,0,0),V(0,-.04,.65),.45,.12,.35,.1,'perut',{e1:0,e2:0});
    h.acc(()=>[1,-1].forEach(s=>{h.box(V(s*.38,.45,-.05),[.3,.12,.3],'kulit').rotation.z=-s*.5;}));
    return {Tanduk:V(0,.42,-.2),Rahang:V(0,-.38,.35),Mulut:V(0,-.3,1)};},
  Landak:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[.8,.7,.75],'kulit');
    h.seg(V(0,-.1,.3),V(0,-.2,.95),.45,.38,.2,.16,'perut',{e1:0,e2:.05});
    h.box(V(0,-.2,1),[.14,.12,.08],'duri');
    [1,-1].forEach(s=>{eye(h,s,V(s*.3,.1,.385),[.12,.1],'front','round');h.box(V(s*.36,.32,-.1),[.14,.1,.1],'kulit');});
    j.box(V(0,0,.25),[.3,.08,.35],'perut');
    return {Tanduk:V(0,.35,-.15),Rahang:V(0,-.3,.3),Mulut:V(0,-.22,.95)};},
  Rakun:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[.95,.8,.85],'kulit');
    h.seg(V(0,-.12,.3),V(0,-.18,.95),.42,.32,.24,.2,'perut',{e1:0,e2:0});
    h.box(V(0,-.17,.98),[.13,.1,.06],'duri');
    h.box(V(0,.08,.43),[.9,.2,.04],'duri');
    h.box(V(0,.26,.43),[.6,.08,.04],'perut');
    [1,-1].forEach(s=>eye(h,s,V(s*.24,.08,.465),[.13,.1],'front','round'));
    j.box(V(0,0,.25),[.32,.08,.4],'perut');
    h.acc(()=>[1,-1].forEach(s=>{h.pyr(V(s*.3,.32,-.1),.4,.28,V(s*.25,1,-.1),'kulit',{h:.1});h.pyr(V(s*.3,.34,-.05),.28,.16,V(s*.25,1,-.1),'perut',{h:.03});}));
    return {Tanduk:V(0,.4,-.2),Rahang:V(0,-.3,.3),Mulut:V(0,-.22,.95)};},
  Katak:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,.1),[1.35,.55,1.1],'kulit');
    h.box(V(0,-.05,.66),[1.1,.38,.12],'perut');
    [1,-1].forEach(s=>{h.box(V(s*.38,.38,.2),[.36,.32,.36],'kulit');h.box(V(s*.38,.42,.385),[.26,.22,.05],'mata');h.box(V(s*.38,.42,.42),[.16,.06,.03],'duri');});
    h.box(V(0,-.15,.725),[1,.03,.03],'duri');
    j.box(V(0,0,.42),[1.2,.14,.95],'perut');
    return {Tanduk:V(0,.3,-.3),Rahang:V(0,-.27,0),Mulut:V(0,-.15,.7)};},
  Komodo:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[1.1,.65,1],'kulit');
    h.seg(V(0,-.06,.4),V(0,-.12,1.45),.85,.45,.6,.32,'kulit',{e1:0,e2:.08});
    [1,-1].forEach(s=>{eye(h,s,V(s*.555,.1,.2),[.2,.12],'side','round');h.box(V(s*.45,-.28,.2),[.25,.22,.5],'kulit');h.box(V(s*.17,-.03,1.42),[.06,.05,.04],'duri');});
    j.seg(V(0,0,0),V(0,-.03,1.15),.72,.14,.5,.1,'perut',{e1:0,e2:0});
    teeth(h,1,.3,-.32,.6,3,.25,.06);teeth(h,-1,.3,-.32,.6,3,.25,.06);
    h.acc(()=>[1,-1].forEach(s=>h.seg(V(0,-.25,1.4),V(s*.12,-.3,1.9),.06,.03,.04,.02,'sayap',{e1:.05,e2:0})));
    return {Tanduk:V(0,.33,-.2),Rahang:V(0,-.3,.25),Mulut:V(0,-.22,1.5)};},
  KudaNil:S=>{const h=S('C'),j=S('J');
    h.box(V(0,.1,0),[1.2,.8,.9],'kulit');
    h.box(V(0,-.12,.8),[1.4,.75,.85],'kulit');
    [1,-1].forEach(s=>{h.box(V(s*.35,.3,1),[.24,.14,.24],'kulit');h.box(V(s*.35,.38,1.06),[.1,.04,.08],'duri');
      h.box(V(s*.38,.55,.15),[.24,.18,.24],'kulit');eye(h,s,V(s*.38,.58,.275),[.14,.1],'front','round');h.box(V(s*.42,.58,-.32),[.14,.16,.08],'kulit');});
    j.box(V(0,0,.55),[1.3,.2,1],'perut');
    [1,-1].forEach(s=>j.pyr(V(s*.5,.08,.95),.3,.14,UP,'tanduk'));
    return {Tanduk:V(0,.52,-.2),Rahang:V(0,-.5,.3),Mulut:V(0,-.35,1.2)};},
  Rajawali:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[.85,.8,.9],'perut');
    h.box(V(0,.32,.1),[.9,.14,.6],'perut');
    h.seg(V(0,.02,.35),V(0,-.05,.9),.42,.38,.3,.28,'tanduk',{e1:0,e2:0});
    h.seg(V(0,-.05,.9),V(0,-.38,1.08),.3,.28,.08,.08,'tanduk',{e1:.08,e2:0});
    j.seg(V(0,0,0),V(0,-.02,.55),.34,.12,.22,.08,'tanduk',{e1:0,e2:0});
    [1,-1].forEach(s=>eye(h,s,V(s*.43,.12,.18),[.2,.16],'side','round'));
    h.acc(()=>[0,1,-1].forEach(s=>h.seg(V(s*.2,.1,-.4),V(s*.25,-.05,-.85),.3,.08,.12,.05,'perut',{e1:0,e2:0})));
    return {Tanduk:V(0,.4,-.2),Rahang:V(0,-.22,.4),Mulut:V(0,-.18,.95)};},
  Kambing:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[.8,.75,.8],'kulit');
    h.seg(V(0,-.05,.3),V(0,-.25,1.05),.52,.45,.36,.3,'kulit',{e1:0,e2:0});
    h.box(V(0,-.2,1.07),[.18,.12,.06],'duri');
    [1,-1].forEach(s=>{eye(h,s,V(s*.405,.1,.15),[.2,.13],'side','slit');h.seg(V(s*.38,.15,-.12),V(s*.75,.12,-.18),.22,.1,.12,.06,'kulit',{e1:0,e2:0,up:V(0,0,1)});});
    j.seg(V(0,0,0),V(0,-.05,.75),.38,.12,.26,.1,'perut',{e1:0,e2:0});
    h.acc(()=>h.seg(V(0,-.45,.75),V(0,-.95,.65),.24,.16,.1,.08,'perut',{e1:0,e2:0}));
    return {Tanduk:V(0,.38,-.15),Rahang:V(0,-.32,.3),Mulut:V(0,-.25,1.05)};},
  Kalong:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[.85,.75,.8],'kulit');
    h.seg(V(0,-.1,.3),V(0,-.2,1),.45,.38,.24,.2,'kulit',{e1:0,e2:0});
    h.box(V(0,-.17,1.03),[.14,.1,.06],'duri');
    [1,-1].forEach(s=>eye(h,s,V(s*.24,.1,.41),[.2,.18],'front','round'));
    j.seg(V(0,0,0),V(0,-.04,.7),.34,.1,.22,.08,'perut',{e1:0,e2:0});
    teeth(h,1,.12,-.36,.75,1,.2,.06);teeth(h,-1,.12,-.36,.75,1,.2,.06);
    h.acc(()=>[1,-1].forEach(s=>{h.pyr(V(s*.25,.3,-.1),.75,.36,V(s*.3,1,0),'kulit',{h:.08});h.pyr(V(s*.25,.32,-.06),.55,.2,V(s*.3,1,0),'perut',{h:.03});}));
    return {Tanduk:V(0,.38,-.2),Rahang:V(0,-.3,.3),Mulut:V(0,-.22,1)};},
  Cendrawasih:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[.75,.7,.75],'kulit');
    h.box(V(0,-.2,.25),[.6,.3,.35],'sayap');
    h.pyr(V(0,0,.37),.38,.18,V(0,-.2,1),'tanduk',{h:.14});
    j.pyr(V(0,0,.02),.3,.14,V(0,-.25,1),'tanduk',{h:.05});
    [1,-1].forEach(s=>eye(h,s,V(s*.38,.1,.15),[.14,.13],'side','round'));
    h.acc(()=>[-.15,0,.15].forEach((x,i)=>h.seg(V(x,.3,0),V(x*2.2,.85+(i===1?.15:0),-.35),.16,.05,.08,.04,'perut',{e1:0,e2:0})));
    return {Tanduk:V(0,.36,-.2),Rahang:V(0,-.05,.35),Mulut:V(0,0,.7)};},
  Zebra:S=>{const h=S('C'),j=S('J');
    h.box(V(0,0,0),[.75,.8,.8],'kulit');
    h.seg(V(0,-.05,.25),V(0,-.45,1.25),.55,.5,.42,.4,'kulit',{e1:0,e2:.05});
    h.box(V(0,-.5,1.28),[.4,.25,.1],'duri');
    [1,-1].forEach(s=>{eye(h,s,V(s*.38,.12,.18),[.18,.14],'side','round');
      [0,.3,.6].forEach((z,i)=>{h.box(V(s*(.27-i*.02),-.1-z*.35,.45+z*.7),[.04,.46-i*.08,.08],'duri').rotation.x=-.45;});});
    [-.15,.15].forEach(z=>h.box(V(0,.41,z),[.5,.03,.08],'duri'));
    j.seg(V(0,0,0),V(0,-.18,.75),.34,.1,.28,.08,'perut',{e1:0,e2:0});
    h.acc(()=>{[1,-1].forEach(s=>h.pyr(V(s*.2,.35,-.15),.45,.18,V(s*.15,1,-.1),'kulit',{h:.12}));h.box(V(0,.4,-.35),[.18,.35,.4],'duri');});
    return {Tanduk:V(0,.4,-.15),Rahang:V(0,-.32,.3),Mulut:V(0,-.45,1.25)};},
  Cheetah:S=>{const h=S('C'),so=catHead(h,S('J'));
    [1,-1].forEach(s=>{h.box(V(s*.22,-.08,.48),[.04,.3,.03],'duri').rotation.z=s*.25;});
    [[.25,.3],[-.25,.3],[.1,.42],[-.15,.2],[.3,-.1],[-.3,-.1]].forEach(([x,z])=>h.box(V(x,.455,z-.1),[.08,.03,.08],'duri'));
    h.acc(()=>[1,-1].forEach(s=>{h.box(V(s*.34,.52,-.12),[.2,.16,.08],'kulit');h.box(V(s*.34,.52,-.075),[.12,.1,.02],'perut');}));
    return so;}
});

/* kaki khusus: tiap fungsi mengisi grup DL/DR/BL/BR sendiri (telapak depan y -2.3, belakang -1.85) */
function finLegs(S){
  [['DL',1],['DR',-1]].forEach(([k,s])=>S(k).seg(V(s*.05,.15,0),V(s*.95,-2.13,.45),1.15,.13,.38,.08,'duri',{e1:0,e2:.05,root:true,up:V(s,1,0)}));
  [['BL',1],['BR',-1]].forEach(([k,s])=>S(k).seg(V(s*.05,.1,0),V(s*.7,-1.62,-.7),1,.13,.34,.08,'duri',{e1:0,e2:.05,root:true,up:V(s,1,0)}));
}
function tentacleLegs(S){
  [['DL',1,1,-2.15],['DR',-1,1,-2.15],['BL',1,-1,-1.7],['BR',-1,-1,-1.7]].forEach(([k,s,f,gy])=>{const h=S(k);
    const P=[V(0,.2,0),V(s*.35,gy*.4,f*.3),V(s*.75,gy*.8,f*.55),V(s*1.05,gy+.1,f*.9),V(s*1.35,gy+.25,f*1.35),V(s*1.4,gy+.55,f*1.6)],W=[.6,.5,.4,.3,.2,.08];
    h.chain(P,W,W,'kulit',{root1:true,tip:true});
    for(let i=1;i<4;i++){const q=lerpV(P[i],P[i+1],.5);h.box(q.clone().add(V(0,-W[i]*.42,0)),[.14,.06,.14],'perut');}});
}
function clawLegs(S){
  [['DL',1],['DR',-1]].forEach(([k,s])=>{const h=S(k),E=V(s*.7,-.6,.5),W=V(s*.75,-.9,1.4);
    h.seg(V(s*.05,.2,0),E,.5,.5,.42,.42,'kulit',{root:true});h.seg(E,W,.42,.42,.6,.5,'kulit');
    h.box(W.clone().add(V(0,0,.3)),[.75,.6,.75],'kulit');
    h.seg(W.clone().add(V(s*.12,.12,.55)),W.clone().add(V(s*.05,.18,1.35)),.32,.3,.06,.06,'tanduk',{e1:0,e2:0});
    h.seg(W.clone().add(V(-s*.12,-.12,.55)),W.clone().add(V(-s*.02,-.2,1.2)),.28,.26,.06,.06,'tanduk',{e1:0,e2:0});});
  [['BL',1],['BR',-1]].forEach(([k,s])=>{const h=S(k);[.32,-.32].forEach(z=>{const K=V(s*.75,.35,z),F=V(s*.95,-1.85,z*1.3);
    h.seg(V(s*.05,0,z*.5),K,.24,.24,.2,.2,'kulit',{root:true});h.seg(K,F,.2,.2,.05,.05,'kulit',{e2:0});});});
}
function kangarooLegs(S){trexArm(S('DL'),1);trexArm(S('DR'),-1);
  [['BL',1],['BR',-1]].forEach(([k,s])=>{const h=S(k),K=V(s*.3,-.7,.7),A=V(s*.3,-1.45,-.3);
    h.seg(V(s*.1,.25,.1),K,1,1.1,.6,.6,'kulit',{root:true});h.seg(K,A,.5,.5,.38,.38,'kulit');
    h.box(V(s*.3,-1.72,.35),[.45,.26,1.5],'kulit');h.pyr(V(s*.3,-1.75,1.1),.3,.14,V(0,-.05,1),'tanduk');});}
function penguinLegs(S){
  [['DL',1],['DR',-1]].forEach(([k,s])=>S(k).seg(V(s*.05,.9,0),V(s*.35,-.6,-.05),.85,.16,.5,.1,'duri',{root:true,up:V(s,0,0)}));
  [['BL',1],['BR',-1]].forEach(([k,s])=>{const h=S(k);h.seg(V(s*.1,.2,0),V(s*.15,-1.45,.1),.4,.4,.3,.3,'duri',{root:true});
    h.box(V(s*.15,-1.73,.35),[.55,.24,.75],'tanduk');});}
function frogLegs(S){
  [['DL',1],['DR',-1]].forEach(([k,s])=>{const h=S(k),W=V(s*.35,-2.05,.4);
    h.seg(V(s*.05,.2,0),W,.4,.4,.3,.3,'kulit',{root:true});
    [-1,0,1].forEach(j=>h.seg(W,W.clone().add(V(s*.15+j*.25,-.18,.45-Math.abs(j)*.1)),.12,.1,.12,.08,'kulit',{e1:.05,e2:.02}));});
  [['BL',1],['BR',-1]].forEach(([k,s])=>{const h=S(k),K=V(s*1,-.6,.5),A=V(s*.75,-1.5,-.6),F=V(s*.9,-1.68,.4);
    h.seg(V(s*.1,.2,0),K,.85,.8,.55,.5,'kulit',{root:true});h.seg(K,A,.5,.45,.3,.3,'kulit');h.seg(A,F,.3,.25,.25,.2,'kulit');
    [-1,0,1].forEach(j=>h.seg(F,F.clone().add(V(s*.15+j*.3,-.05,.55)),.14,.08,.16,.06,'sayap',{e1:.05,e2:.02}));});}

Object.assign(TAIL,{
  Sengat:tailBuild([V(0,0,0),V(0,.2,-.9),V(0,1.1,-1.35),V(0,2,-1.2),V(0,2.6,-.6),V(0,2.7,0)],[.45,.4,.35,.3,.26,.2],(h,T)=>{
    h.box(T[5].clone().add(V(0,0,.25)),[.38,.38,.45],'kulit');h.pyr(T[5].clone().add(V(0,-.05,.45)),.6,.16,V(0,-.7,.7),'tanduk');}),
  Tebal:tailBuild([V(0,0,0),V(0,-.55,-1),V(0,-1.05,-2),V(0,-1.3,-2.9)],[.6,.5,.38,.26],(h,T)=>{h.pyr(T[3],.4,.3,V(0,-.1,-1),'kulit');}),
  Hiu:tailBuild([V(0,0,0),V(0,.05,-1),V(0,.1,-1.9)],[.5,.38,.25],(h,T)=>{const e=T[2];
    h.seg(e,e.clone().add(V(0,1.3,-.75)),.55,.12,.1,.06,'kulit',{e1:.1,e2:0,up:V(1,0,0)});h.seg(e,e.clone().add(V(0,-.85,-.55)),.45,.12,.1,.06,'kulit',{e1:.1,e2:0,up:V(1,0,0)});}),
  Paus:tailBuild([V(0,0,0),V(0,.05,-1),V(0,.1,-1.9)],[.5,.38,.25],(h,T)=>{const e=T[2];
    [1,-1].forEach(s=>h.seg(e,e.clone().add(V(s*1.15,.05,-.65)),.6,.1,.18,.06,'duri',{e1:.1,e2:0,up:UP}));},'duri'),
  Tentakel:tailBuild([V(0,0,0),V(0,-.3,-.6)],[.4,.32],(h,T)=>{[1,-1].forEach(s=>{const P=[T[1],V(s*.4,-.7,-1.3),V(s*.7,-1.1,-2),V(s*.6,-1,-2.6),V(s*.35,-.7,-2.75)],W=[.5,.38,.26,.15,.05];
    h.chain(P,W,W,'kulit',{tip:true});});}),
  Melingkar:tailBuild([V(0,0,0),V(0,-.2,-.8),V(0,.1,-1.6),V(0,.7,-2.2),V(0,1.3,-2.3),V(0,1.6,-1.9),V(0,1.45,-1.55),V(0,1.15,-1.65)],[.2,.17,.15,.13,.12,.1,.09,.08],()=>{}),
  Kuda:tailBuild([V(0,0,0),V(0,-.25,-.5)],[.28,.24],(h,T)=>{h.seg(T[1],T[1].clone().add(V(0,-1.5,-.5)),.45,.35,.3,.22,'duri',{e1:.1,e2:0});}),
  Cendrawasih:tailBuild([V(0,0,0),V(0,-.1,-.45)],[.28,.24],(h,T)=>{const P=cendPlumes(T[1]);
    // batang bulu: panjang dan pendek berselang-seling
    P.forEach((pts,i)=>{const W=[.09,.08,.06,.04];h.chain(pts,W,W,'tanduk');const q=pts[3];
      if(!cendLong(i)){h.box(q,[.16,.16,.16],'perut');}else{h.pyr(q,.26,.22,UP,'sayap');h.pyr(q,.26,.22,V(0,-1,0),'sayap');}});
    // selaput di antara batang yang bersebelahan, sampai ke ujung masing-masing (tepinya bergerigi panjang-pendek)
    const tri=[];for(let i=0;i<P.length-1;i++)for(let k=0;k<3;k++){const a=P[i][k],b=P[i][k+1],c=P[i+1][k+1],d=P[i+1][k];tri.push([a,b,c],[a,c,d]);}
    h.tris(tri,'sayap');}),
  Komodo:tailBuild([V(0,0,0),V(0,-.5,-1.2),V(0,-.95,-2.4),V(.3,-1.15,-3.5),V(.7,-1.2,-4.3)],[.6,.5,.38,.27,.15],(h,T)=>{h.pyr(T[4],.4,.2,V(.4,0,-1),'kulit');}),
  Tanpa:S=>{S('C').box(V(0,0,.2),[.3,.3,.3],'kulit',{root:true});return {Punggung:[],Jalur:[],JalurR:[]};}
});
/* titik ujung tiap ekor dalam ruang ekor: [[titik, arah], ...]. T = jalur ruas ekor. */
const nrm=v=>v.clone().normalize(),lastDir=T=>T[T.length-1].clone().sub(T[T.length-2]).normalize();
const at=(p,d,L)=>[p.clone().addScaledVector(nrm(d),L),nrm(d)];
// pola panjang-pendek dicerminkan dari tengah supaya kipas simetris kiri-kanan
// 12 batang: paling luar pendek, tengah sepasang panjang
const CEND_N=12,cendLong=i=>Math.min(i,CEND_N-1-i)%2===1;
function cendPlumes(e){const out=[];for(let i=0;i<CEND_N;i++){const s=-1.35+2.7*i/(CEND_N-1),L=cendLong(i)?2.8:1.7,d=V(Math.sin(s),0,-Math.cos(s));
  out.push([0,.36,.7,1].map((t,k)=>e.clone().addScaledVector(d,L*t).add(V(0,[0,.6,.95,1][k]*L*.62,0))));}return out;}
const TAIL_TIPS={
  Sekop:T=>[at(T[5],lastDir(T),.95)],Kipas:T=>[at(T[4],V(0,.05,-1),1.35)],Cambuk:T=>[at(T[8],lastDir(T),.6)],
  Gada:T=>[at(T[4].clone().add(V(0,0,-.45)),V(0,0,-1),1)],
  Kapak:T=>[at(T[4],V(0,0,-1),.55),...[1,-1].map(s=>at(T[4].clone().add(V(0,0,-.25)),V(s,0,0),1.2))],
  Trisula:T=>[at(T[4].clone().add(V(0,0,-.2)),V(0,0,-1),1.05),...[1,-1].map(s=>at(T[4].clone().add(V(s*.5,0,-.3)),V(s*.35,0,-1),.75))],
  Kembar:()=>[1,-1].map(s=>{const a=V(s*.45,-1.05,-4.05),b=V(s*.95,-1.05,-4.75);return at(b,b.clone().sub(a),.65);}),
  Bulu:T=>[at(T[4],V(0,.12,-1),1.4)],Berduri:T=>[at(T[4],V(0,0,-1),.5)],Kristal:T=>[at(T[4],V(0,.2,-1),.9)],
  Jumbai:T=>[at(T[3],V(0,-1,-.1),.45)],Loreng:T=>[at(T[4],lastDir(T),.15)],Lebat:T=>[at(T[3],lastDir(T),.65)],
  Pendek:T=>[at(T[1],V(0,-.05,-1),.26)],Burung:T=>[at(T[1],V(0,-.15,-1),1.1)],
  Sengat:T=>[at(T[5].clone().add(V(0,-.05,.45)),V(0,-.7,.7),.6)],Tebal:T=>[at(T[3],V(0,-.1,-1),.4)],
  Hiu:T=>[at(T[2],V(0,1.3,-.75),1.5),at(T[2],V(0,-.85,-.55),1)],Paus:T=>[1,-1].map(s=>at(T[2],V(s*1.15,.05,-.65),1.32)),
  Tentakel:()=>[1,-1].map(s=>{const a=V(s*.6,-1,-2.6),b=V(s*.35,-.7,-2.75);return at(b,b.clone().sub(a),.05);}),
  Melingkar:T=>[at(T[7],lastDir(T),.1)],Kuda:T=>[at(T[1],V(0,-1.5,-.5),1.6)],
  Cendrawasih:T=>cendPlumes(T[1]).filter((_,i)=>cendLong(i)).map(p=>at(p[3],p[3].clone().sub(p[2]),.32)),Komodo:T=>[at(T[4],V(.4,0,-1),.4)],Tanpa:()=>[]
};
SPINE.Landak=S=>{const h=S('C');[[0,1,-.3],[.35,.9,-.45],[-.35,.9,-.45],[.2,.7,-.8],[-.2,.7,-.8]].forEach(([x,y,z],i)=>h.pyr(V(x*.4,-.1,0),1-i*.08,.16,V(x,y,z),i%2?'perut':'duri',{root:true}));};


/* ---------- Slot ---------- */
const SLOTS=[
  {key:'Badan',v:[{id:'Standar',r:0},{id:'Gempal',r:1,ep:'Raksasa'},{id:'Ramping',r:1,ep:'Angin'},{id:'Panjang',r:0},{id:'Bungkuk',r:1,ep:'Gunung'},
    {id:'Berlapis',r:2,ep:'Benteng'},{id:'Gendut',r:0},{id:'Petarung',r:2,ep:'Petarung'},{id:'Jerapah',r:3,ep:'Menara'},{id:'Kadal',r:1,ep:'Melata'}].map(v=>Object.assign(v,{b:bodyBuild(BODY[v.id])}))},
  {key:'Kepala',v:[{id:'Klasik',r:0},{id:'Kadal',r:0},{id:'Elang',r:1,ep:'Elang'},{id:'Kerah',r:2,ep:'Kobra'},{id:'Buaya',r:1,ep:'Rawa'},
    {id:'Banteng',r:0},{id:'Ular',r:1,ep:'Bisa'},{id:'Jambul',r:1,ep:'Jambul'},{id:'Sirip',r:2,ep:'Samudra'},{id:'Zirah',r:3,ep:'Kesatria'}].map(v=>Object.assign(v,{b:HEAD[v.id]}))},
  {key:'Tanduk',v:[{id:'Ganda',r:0},{id:'Tanpa',r:0},{id:'Kambing',r:0},{id:'Rusa',r:1,ep:'Hutan'},{id:'Banteng',r:1,ep:'Penyeruduk'},
    {id:'Iblis',r:1,ep:'Iblis'},{id:'Melengkung',r:2,ep:'Pendobrak'},{id:'Kristal',r:2,ep:'Kristal'},{id:'Mahkota',r:3,ep:'Raja'},{id:'Unikorn',r:4,ep:'Suci'}].map(v=>Object.assign(v,{b:HORN[v.id]}))},
  {key:'Sayap',v:[{id:'Selaput',r:0},{id:'Kecil',r:0},{id:'Kelelawar',r:0},{id:'Tanpa',r:1},{id:'Robek',r:1,ep:'Kelana'},
    {id:'Rusuk',r:1,ep:'Bayu'},{id:'Bulu',r:2,ep:'Phoenix'},{id:'Sirip',r:2,ep:'Jet'},{id:'Kristal',r:3,ep:'Prisma'},{id:'Ganda',r:4,ep:'Empat Sayap'}].map(v=>Object.assign(v,{b:WING[v.id]}))},
  {key:'Ekor',v:[{id:'Sekop',r:0},{id:'Berduri',r:0},{id:'Kipas',r:1,ep:'Ombak'},{id:'Cambuk',r:1,ep:'Badai'},{id:'Bulu',r:1,ep:'Merak'},
    {id:'Gada',r:2,ep:'Penghancur'},{id:'Kapak',r:2,ep:'Algojo'},{id:'Trisula',r:3,ep:'Trisula'},{id:'Kristal',r:3,ep:'Permata'},{id:'Kembar',r:4,ep:'Kembar'}].map(v=>Object.assign(v,{b:TAIL[v.id]}))},
  {key:'Kaki',v:[{id:'Cakar',r:0,o:{k:1}},{id:'Ramping',r:0,o:{k:.82}},{id:'Berduri',r:0,o:{k:1,extra:'duri'}},{id:'Kekar',r:1,ep:'Baja',o:{k:1.3}},
    {id:'Gajah',r:1,ep:'Bumi',o:{k:1.1,foot:'gajah'}},{id:'Berbulu',r:1,ep:'Salju',o:{k:1,extra:'bulu'}},{id:'Kuku',r:1,ep:'Pelari',o:{k:.95,foot:'kuku'}},
    {id:'Burung',r:2,ep:'Pemburu',o:{k:.85,foot:'burung'}},{id:'Berlapis',r:2,ep:'Perisai',o:{k:1.05,extra:'lapis'}},{id:'Wyvern',r:2,o:{k:1,hk:1.1,wyvern:true}}].map(v=>Object.assign(v,{b:legs(v.o)}))},
  {key:'Punggung',v:[{id:'Duri',r:0},{id:'Tanpa',r:0},{id:'Kait',r:0},{id:'Paku',r:0},{id:'Ganda',r:1,ep:'Taring'},
    {id:'Gergaji',r:1,ep:'Gergaji'},{id:'Sirip',r:1,ep:'Karang'},{id:'Bulu',r:1,ep:'Rimba'},{id:'Lempeng',r:2,ep:'Purba'},{id:'Kristal',r:2,ep:'Permata'}].map(v=>Object.assign(v,{b:SPINE[v.id]}))},
  {key:'Ukuran',v:[{id:'Normal',r:0,sc:1},{id:'Besar',r:1,sc:1.25},{id:'Mungil',r:2,sc:.72,ep:'Mungil'},{id:'Titan',r:3,sc:1.6,ep:'Titan'}]},
  {key:'Elemen',v:[{id:'Alam',r:0},{id:'Api',r:0},{id:'Laut',r:0},{id:'Es',r:1},{id:'Racun',r:1},{id:'Magma',r:1},{id:'Petir',r:2},{id:'Bayangan',r:2},{id:'Emas',r:3},{id:'Kosmik',r:4}]}
];
const slotOf=k=>SLOTS.find(s=>s.key===k);
const varOf=(k,id)=>slotOf(k).v.find(v=>v.id===id);
// an = nama hewan untuk penamaan, fam = keluarga telur. Varian tanpa fam adalah bagian naga / umum.
const SV='Savana',HT='Hutan';
const ANIMAL_PARTS={
  Badan:[['Badak',1,SV],['Gajah',2,SV],['Singa',1,SV],['Harimau',1,HT],['Serigala',1,HT],['Beruang',1,HT],['Rusa',1,HT],['BurungHantu',2,HT,'Burung Hantu']]
    .map(([id,r,fam,an])=>({id,r,fam,an:an||id,label:an,b:bodyBuild(BODY[id])})),
  Kepala:[['Badak',2,SV],['Gajah',2,SV],['Singa',1,SV],['Harimau',1,HT],['Serigala',1,HT],['Beruang',1,HT],['Rusa',1,HT],['BurungHantu',2,HT,'Burung Hantu']]
    .map(([id,r,fam,an])=>({id,r,fam,an:an||id,label:an,b:HEAD[id]})),
  Kaki:[['Kucing',0,SV,{k:.82,toe:'paw'}],['Badak',1,SV,{k:.95,foot:'gajah'}],['Serigala',0,HT,{k:.72}],['Beruang',1,HT,{k:1.15,claw:1.3}]]
    .map(([id,r,fam,o])=>({id,r,fam,o,b:legs(o)})),
  Ekor:[['Jumbai',0,SV],['Pendek',0,HT],['Loreng',1,HT],['Lebat',1,HT],['Burung',1,HT]].map(([id,r,fam])=>({id,r,fam,b:TAIL[id]})),
  Punggung:[{id:'Surai',r:1,fam:SV,b:SPINE.Surai}],
  Elemen:[['Savana',0,SV],['Batu',0,SV],['Rimba',0,HT],['Loreng',1,HT],['Salju',1,HT],['Senja',1,HT]].map(([id,r,fam])=>({id,r,fam}))
};
Object.entries(ANIMAL_PARTS).forEach(([k,vs])=>slotOf(k).v.push(...vs));
// Hewan tambahan didaftarkan setelah bagian lama, supaya indeks kode gen lama tidak bergeser
const ANIMAL_PARTS2={
  Badan:[['Unta',1,GR],['Kalajengking',2,GR],['Fennec',1,GR],['Kobra',2,GR],['Kanguru',1,GR],
    ['Hiu',2,SM],['Orca',3,SM],['Gurita',2,SM],['Kepiting',1,SM],['Penyu',1,SM],['Lumba',1,SM,'Lumba-lumba'],
    ['Pinguin',1,KT],['Walrus',1,KT],['Mamut',3,KT],['Yak',1,KT],
    ['Gorila',2,HT],['Monyet',0,HT],['Panda',2,HT],['Babi',0,HT,'Babi Hutan'],['Landak',1,HT],['Rakun',1,HT],
    ['Katak',0,RW],['Komodo',2,RW],['KudaNil',1,RW,'Kuda Nil'],
    ['Rajawali',2,LG],['Kambing',1,LG,'Kambing Gunung'],['Kalong',1,LG],['Cendrawasih',3,LG],
    ['Zebra',1,SV],['Cheetah',1,SV]],
  Kaki:[['Unta',0,GR,{k:.62,foot:'pad'}],['Capit',2,SM,{make:clawLegs}],['Kanguru',1,GR,{make:kangarooLegs}],['Sirip',0,SM,{make:finLegs}],
    ['Tentakel',2,SM,{make:tentacleLegs}],['Pinguin',1,KT,{make:penguinLegs}],['Mamut',2,KT,{k:1.2,foot:'gajah'}],
    ['Gorila',1,HT,{k:1.3,hk:.95,toe:'paw'}],['Katak',1,RW,{make:frogLegs}],['Panda',1,HT,{k:1.15,claw:1.3,mat:'duri'}]],
  Ekor:[['Sengat',2,GR],['Tebal',0,GR],['Hiu',1,SM],['Paus',1,SM],['Tentakel',2,SM],['Melingkar',1,HT],['Kuda',0,SV],['Cendrawasih',3,LG],['Komodo',1,RW],['Tanpa',0,RW]],
  Punggung:[['Landak',1,HT]],
  Elemen:[['Pasir',0,GR],['Karang',1,SM],['Belang',1,SM],['Lumpur',0,RW],['Langit',1,LG]]
};
ANIMAL_PARTS2.Kepala=ANIMAL_PARTS2.Badan;
Object.entries(ANIMAL_PARTS2).forEach(([k,vs])=>slotOf(k).v.push(...vs.map(([id,r,fam,x])=>{
  if(k==='Badan')return {id,r,fam,an:x||id,label:x,b:bodyBuild(BODY[id])};
  if(k==='Kepala')return {id,r,fam,an:x||id,label:x,b:HEAD[id]};
  if(k==='Kaki')return {id,r,fam,o:x,b:legs(x)};
  if(k==='Ekor')return {id,r,fam,b:TAIL[id]};
  if(k==='Punggung')return {id,r,fam,b:SPINE[id]};
  return {id,r,fam};})));

const ANIMALS={
  Badak:{fam:SV,g:{Badan:'Badak',Kepala:'Badak',Tanduk:'Tanpa',Sayap:'Tanpa',Ekor:'Pendek',Kaki:'Badak',Punggung:'Tanpa',Elemen:'Batu'}},
  Gajah:{fam:SV,g:{Badan:'Gajah',Kepala:'Gajah',Tanduk:'Tanpa',Sayap:'Tanpa',Ekor:'Jumbai',Kaki:'Gajah',Punggung:'Tanpa',Elemen:'Batu'}},
  Singa:{fam:SV,g:{Badan:'Singa',Kepala:'Singa',Tanduk:'Tanpa',Sayap:'Tanpa',Ekor:'Jumbai',Kaki:'Kucing',Punggung:'Surai',Elemen:'Savana'}},
  Harimau:{fam:HT,g:{Badan:'Harimau',Kepala:'Harimau',Tanduk:'Tanpa',Sayap:'Tanpa',Ekor:'Loreng',Kaki:'Kucing',Punggung:'Tanpa',Elemen:'Loreng'}},
  Serigala:{fam:HT,g:{Badan:'Serigala',Kepala:'Serigala',Tanduk:'Tanpa',Sayap:'Tanpa',Ekor:'Lebat',Kaki:'Serigala',Punggung:'Tanpa',Elemen:'Salju'}},
  Beruang:{fam:HT,g:{Badan:'Beruang',Kepala:'Beruang',Tanduk:'Tanpa',Sayap:'Tanpa',Ekor:'Pendek',Kaki:'Beruang',Punggung:'Tanpa',Elemen:'Rimba'}},
  Rusa:{fam:HT,g:{Badan:'Rusa',Kepala:'Rusa',Tanduk:'Rusa',Sayap:'Tanpa',Ekor:'Pendek',Kaki:'Kuku',Punggung:'Tanpa',Elemen:'Rimba'}},
  BurungHantu:{fam:HT,label:'Burung Hantu',g:{Badan:'BurungHantu',Kepala:'BurungHantu',Tanduk:'Tanpa',Sayap:'Bulu',Ekor:'Burung',Kaki:'Burung',Punggung:'Tanpa',Elemen:'Senja'}}
};
// templat hewan baru: [keluarga, Badan=Kepala, Tanduk, Sayap, Ekor, Kaki, Punggung, Elemen, label]
[['Unta',GR,'Tanpa','Tanpa','Jumbai','Unta','Tanpa','Pasir'],['Kalajengking',GR,'Tanpa','Tanpa','Sengat','Capit','Tanpa','Bayangan'],
 ['Fennec',GR,'Tanpa','Tanpa','Lebat','Serigala','Tanpa','Pasir','Rubah Fennec'],['Kobra',GR,'Tanpa','Tanpa','Cambuk','Ramping','Tanpa','Racun'],
 ['Kanguru',GR,'Tanpa','Tanpa','Tebal','Kanguru','Tanpa','Senja'],
 ['Hiu',SM,'Tanpa','Tanpa','Hiu','Sirip','Tanpa','Batu'],['Orca',SM,'Tanpa','Tanpa','Paus','Sirip','Tanpa','Belang'],
 ['Gurita',SM,'Tanpa','Tanpa','Tentakel','Tentakel','Tanpa','Karang'],['Kepiting',SM,'Tanpa','Tanpa','Pendek','Capit','Tanpa','Api'],
 ['Penyu',SM,'Tanpa','Tanpa','Pendek','Sirip','Tanpa','Alam'],['Lumba',SM,'Tanpa','Tanpa','Paus','Sirip','Tanpa','Laut','Lumba-lumba'],
 ['Pinguin',KT,'Tanpa','Tanpa','Pendek','Pinguin','Tanpa','Belang'],['Walrus',KT,'Tanpa','Tanpa','Pendek','Sirip','Tanpa','Rimba'],
 ['Mamut',KT,'Tanpa','Tanpa','Jumbai','Mamut','Tanpa','Senja'],['Yak',KT,'Banteng','Tanpa','Jumbai','Kuku','Tanpa','Salju'],
 ['Gorila',HT,'Tanpa','Tanpa','Tanpa','Gorila','Tanpa','Batu'],['Monyet',HT,'Tanpa','Tanpa','Melingkar','Serigala','Tanpa','Rimba'],
 ['Panda',HT,'Tanpa','Tanpa','Pendek','Panda','Tanpa','Belang'],['Babi',HT,'Tanpa','Tanpa','Pendek','Kuku','Surai','Lumpur','Babi Hutan'],
 ['Landak',HT,'Tanpa','Tanpa','Pendek','Kucing','Landak','Senja'],['Rakun',HT,'Tanpa','Tanpa','Loreng','Kucing','Tanpa','Batu'],
 ['Katak',RW,'Tanpa','Tanpa','Tanpa','Katak','Tanpa','Racun'],['Komodo',RW,'Tanpa','Tanpa','Komodo','Cakar','Tanpa','Lumpur'],
 ['KudaNil',RW,'Tanpa','Tanpa','Pendek','Badak','Tanpa','Lumpur','Kuda Nil'],
 ['Rajawali',LG,'Tanpa','Bulu','Burung','Burung','Tanpa','Langit'],['Kambing',LG,'Kambing','Tanpa','Pendek','Kuku','Tanpa','Salju','Kambing Gunung'],
 ['Kalong',LG,'Tanpa','Kelelawar','Tanpa','Serigala','Tanpa','Bayangan'],['Cendrawasih',LG,'Tanpa','Bulu','Cendrawasih','Burung','Tanpa','Emas'],
 ['Zebra',SV,'Tanpa','Tanpa','Kuda','Kuku','Surai','Belang'],['Cheetah',SV,'Tanpa','Tanpa','Loreng','Kucing','Tanpa','Savana']
].forEach(([id,fam,Tanduk,Sayap,Ekor,Kaki,Punggung,Elemen,label])=>{ANIMALS[id]={fam,label,g:{Badan:id,Kepala:id,Tanduk,Sayap,Ekor,Kaki,Punggung,Elemen}};});
// Telur keluarga memilih satu hewan, lalu tiap bagian punya peluang MUTATION diganti bagian acak (persilangan)
const EGGS=[{id:'Campuran',label:'Telur Campuran'},{id:'Naga',label:'Telur Naga'},{id:SV,label:'Telur Savana'},{id:HT,label:'Telur Hutan'},
  {id:GR,label:'Telur Gurun'},{id:SM,label:'Telur Samudra'},{id:KT,label:'Telur Kutub'},{id:RW,label:'Telur Rawa'},{id:LG,label:'Telur Langit'}];
const MUTATION={Bagian:.22,Elemen:.3};
let egg='Campuran';

/* Detail kecil (balok < 0.5) yang menempel di dekat rusuk balok induk bisa melayang setelah rusuknya di-bevel.
   Langkah ini mencari balok induk terdekat, lalu menggeser detail ke arah pusat induk sampai sisi dalamnya
   benar-benar masuk ke bentuk ber-bevel (rusuk dan sudut terpotong). */
function settleDetails(g){
  g.updateMatrixWorld(true);
  const boxes=[];g.traverse(o=>{if(o.isMesh&&o.userData.box)boxes.push(o);});
  const vol=m=>{const b=m.userData.box;return b.a*b.b*b.c;};
  const inv=new THREE.Matrix4(),q=V(0,0,0);
  const local=(host,p)=>{inv.copy(host.matrixWorld).invert();return q.copy(p).applyMatrix4(inv);};
  const inside=(host,p,m)=>{const l=local(host,p),{a,b,c,r}=host.userData.box,x=Math.abs(l.x)+m,y=Math.abs(l.y)+m,z=Math.abs(l.z)+m;
    return x<=a&&y<=b&&z<=c&&x+y<=a+b-r&&x+z<=a+c-r&&y+z<=b+c-r&&x+y+z<=a+b+c-2*r;};
  const outside=(host,p)=>{const l=local(host,p),{a,b,c}=host.userData.box;
    return Math.hypot(Math.max(0,Math.abs(l.x)-a),Math.max(0,Math.abs(l.y)-b),Math.max(0,Math.abs(l.z)-c));};
  boxes.filter(d=>d.userData.box.max<.5&&!d.userData.acc).forEach(d=>{
    const p=V(0,0,0).setFromMatrixPosition(d.matrixWorld),reach=d.userData.box.max*.6+.08;
    const hosts=boxes.filter(o=>o!==d&&vol(o)>vol(d)*4&&outside(o,p)<reach)
      .sort((x,y)=>outside(x,p)-outside(y,p)||vol(y)-vol(x));
    const host=hosts[0];if(!host||!host.userData.box.r)return;
    const u=V(0,0,0).setFromMatrixPosition(host.matrixWorld).sub(p).normalize();
    // titik terdalam detail ke arah induk
    const e=d.matrixWorld.elements,b=d.userData.box;
    const ext=Math.abs(u.dot(V(e[0],e[1],e[2]).normalize()))*b.a+Math.abs(u.dot(V(e[4],e[5],e[6]).normalize()))*b.b+Math.abs(u.dot(V(e[8],e[9],e[10]).normalize()))*b.c;
    const c0=p.clone().addScaledVector(u,ext*.92);
    let t=0;while(t<.45&&!inside(host,c0.clone().addScaledVector(u,t),.012))t+=.005;
    if(t>0&&t<.45){d.position.addScaledVector(u,t);d.updateMatrixWorld(true);}
  });
}
function buildVariant(slotKey,id){
  const groups={};
  const S=name=>{if(!groups[name]){groups[name]=new THREE.Group();groups[name].name=name;}return H(groups[name]);};
  const v=varOf(slotKey,id);
  const sockets=v&&v.b?(v.b(S)||{}):{};
  Object.values(groups).forEach(settleDetails);
  return {groups,sockets};
}

/* ---------- Deteksi tabrakan antar bagian ----------
   Titik sampel (sudut, tengah sisi, pusat segitiga) dari satu bagian diuji apakah masuk ke balok bagian lain.
   Titik dalam radius 0.45 dari socket diabaikan (memang tempat menempel). */
function prepMeshes(group){
  group.updateMatrixWorld(true);const ms=[];
  group.traverse(o=>{if(o.isMesh&&o.userData.mat){if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
    o.userData.inv=o.matrixWorld.clone().invert();ms.push(o);}});
  return ms;
}
function meshSamples(mesh){
  if(mesh.userData.samples&&mesh.userData.samplesFor===mesh.matrixWorld.elements.join())return mesh.userData.samples;
  const pos=mesh.geometry.attributes.position,m=mesh.matrixWorld,out=[];
  for(let i=0;i<pos.count;i+=3){
    const a=V(0,0,0).fromBufferAttribute(pos,i).applyMatrix4(m),b=V(0,0,0).fromBufferAttribute(pos,i+1).applyMatrix4(m),c=V(0,0,0).fromBufferAttribute(pos,i+2).applyMatrix4(m);
    out.push(a,b,c,a.clone().add(b).add(c).divideScalar(3),lerpV(a,b,.5),lerpV(b,c,.5),lerpV(a,c,.5));
  }
  mesh.userData.samples=out;mesh.userData.samplesFor=m.elements.join();return out;
}
const _q=V(0,0,0);
function insideMesh(p,mesh){
  if(mesh.userData.flat)return false;
  _q.copy(p).applyMatrix4(mesh.userData.inv);const b=mesh.geometry.boundingBox;
  for(const ax of ['x','y','z']){const ext=b.max[ax]-b.min[ax],m=Math.min(.03,ext*.25);if(_q[ax]<=b.min[ax]+m||_q[ax]>=b.max[ax]-m)return false;}
  return true;
}
function hits(srcMs,dstMs,anchors,filter,hidden){
  for(const s of srcMs){const targets=dstMs.filter(d=>filter(s,d));if(!targets.length)continue;
    for(const p of meshSamples(s)){if(anchors.some(a=>a.distanceTo(p)<.45))continue;if(targets.some(t=>insideMesh(p,t))&&!(hidden&&hidden.some(m=>insideMesh(p,m))))return true;}}
  return false;
}
// Induk–anak: bagian anak yang menancap (root) hanya dilarang menembus hiasan induk
function clashParentChild(parentMs,childMs,anchors){
  return hits(childMs,parentMs,anchors,(c,p)=>!c.userData.root||p.userData.acc)||
         hits(parentMs.filter(p=>p.userData.acc),childMs,anchors,()=>true);
}
function clashSiblings(aMs,bMs,hidden){return hits(aMs,bMs,[],()=>true,hidden)||hits(bMs,aMs,[],()=>true,hidden);}

/* ---------- Animasi (keyframe, waktu 0..1, menghadap +Z) ----------
   Kanal: body.py/pz (geser), body.rx/ry/rz, head.*, jaw.rx, wing.* (dicerminkan untuk sayap kanan),
   tail.rx/ry, leg.DL/DR/BL/BR, fire (on/off). Singkatan: leg.F = kaki depan, leg.H = kaki belakang,
   leg.A = DL+BR, leg.B = DR+BL (pasangan diagonal saat berjalan). */
const CH=['body.py','body.pz','body.rx','body.ry','body.rz','head.rx','head.ry','head.rz','jaw.rx','wing.rx','wing.ry','wing.rz','tail.rx','tail.ry','leg.DL','leg.DR','leg.BL','leg.BR','fire'];
const K=v=>[[0,v]];
const ANIM_SRC={
  Diam:{label:'Diam',dur:3.2,ch:{'body.py':[[0,0],[.5,.06],[1,0]],'head.ry':[[0,0],[.3,.35],[.5,.35],[.7,-.3],[.9,-.3],[1,0]],'head.rx':[[0,0],[.5,-.08],[1,0]],
    'jaw.rx':[[0,0],[.84,0],[.9,.18],[.96,0],[1,0]],'wing.rz':[[0,0],[.5,.08],[1,0]],'wing.ry':K(.25),'tail.ry':[[0,.12],[.5,-.12],[1,.12]]}},
  Jalan:{label:'Jalan',dur:1.1,ch:{'leg.A':[[0,.4],[.5,-.4],[1,.4]],'leg.B':[[0,-.4],[.5,.4],[1,-.4]],'body.py':[[0,0],[.25,.12],[.5,0],[.75,.12],[1,0]],
    'body.rz':[[0,.04],[.5,-.04],[1,.04]],'head.rx':[[0,.05],[.25,-.04],[.5,.05],[.75,-.04],[1,.05]],'head.ry':[[0,.06],[.5,-.06],[1,.06]],
    'tail.ry':[[0,.2],[.5,-.2],[1,.2]],'wing.ry':K(.5),'wing.rz':K(-.15)}},
  Terbang:{label:'Terbang',dur:.9,ch:{'body.py':[[0,2.4],[.5,2.75],[1,2.4]],'body.rx':[[0,-.06],[.5,-.12],[1,-.06]],'wing.rz':[[0,.55],[.5,-.6],[1,.55]],
    'wing.ry':[[0,-.1],[.5,.15],[1,-.1]],'wing.rx':[[0,0],[.5,.1],[1,0]],'leg.F':K(.9),'leg.H':K(1),'tail.rx':[[0,-.2],[.5,-.05],[1,-.2]],
    'tail.ry':[[0,.1],[.5,-.1],[1,.1]],'head.rx':[[0,.12],[.5,.02],[1,.12]]}},
  Sembur:{label:'Semburan',dur:3,ch:{'head.rx':[[0,0],[.25,-.45],[.33,-.45],[.42,.18],[.8,.15],[1,0]],'head.ry':[[0,0],[.45,0],[.6,.25],[.75,-.25],[.85,0],[1,0]],
    'jaw.rx':[[0,0],[.33,.05],[.42,.6],[.8,.55],[.9,0],[1,0]],'body.rx':[[0,0],[.3,-.12],[.42,.08],[.8,.08],[1,0]],'body.py':[[0,0],[.3,.15],[.45,-.05],[1,0]],
    'wing.rz':[[0,0],[.3,.5],[.42,.2],[.8,.25],[1,0]],'wing.ry':K(.2),'tail.rx':[[0,0],[.3,.15],[.45,-.1],[1,0]],'fire':[[0,0],[.42,1],[.82,0]]}},
  Mengaum:{label:'Mengaum',dur:2.6,ch:{'body.rx':[[0,0],[.3,-.35],[.75,-.35],[1,0]],'body.py':[[0,0],[.3,.35],[.75,.35],[1,0]],
    'leg.F':[[0,0],[.3,-.6],[.75,-.6],[1,0]],'leg.H':[[0,0],[.3,.35],[.75,.35],[1,0]],'head.rx':[[0,0],[.3,-.5],[.75,-.4],[1,0]],
    'jaw.rx':[[0,0],[.3,.7],[.75,.6],[1,0]],'wing.rz':[[0,0],[.3,.75],[.4,.62],[.5,.8],[.6,.62],[.75,.8],[1,0]],'wing.ry':[[0,.1],[.3,-.25],[.75,-.25],[1,.1]],
    'tail.rx':[[0,0],[.3,.25],[.75,.25],[1,0]]}},
  Gigit:{label:'Gigit',dur:1.4,ch:{'head.rx':[[0,0],[.25,-.3],[.4,.35],[.5,.35],[.7,0],[1,0]],'jaw.rx':[[0,0],[.25,.6],[.4,.6],[.45,0],[1,0]],
    'body.rx':[[0,0],[.25,-.08],[.4,.12],[.6,.12],[1,0]],'body.pz':[[0,0],[.25,-.2],[.4,.45],[.6,.45],[1,0]],'leg.F':[[0,0],[.25,.15],[.4,-.3],[.6,-.3],[1,0]],
    'wing.rz':[[0,0],[.25,.3],[.45,.1],[1,0]],'wing.ry':K(.2),'tail.ry':[[0,0],[.4,-.3],[.7,.1],[1,0]]}},
  Tidur:{label:'Tidur',dur:4,ch:{'body.py':[[0,-.95],[.5,-.88],[1,-.95]],'body.rx':K(.12),'leg.F':K(-1.25),'leg.H':K(1),'head.rx':[[0,.45],[.5,.5],[1,.45]],
    'head.ry':K(.25),'jaw.rx':K(0),'wing.ry':K(.55),'wing.rz':[[0,-.25],[.5,-.2],[1,-.25]],'tail.ry':K(.7),'tail.rx':K(-.15)}},
  Tembak:{label:'Tembak',dur:1.4,ch:{'head.rx':[[0,0],[.25,-.4],[.35,.15],[.7,.1],[1,0]],'jaw.rx':[[0,0],[.28,.05],[.36,.55],[.7,.45],[.85,0],[1,0]],'body.rx':[[0,0],[.25,-.1],[.36,.06],[1,0]],'wing.rz':[[0,0],[.25,.4],[.4,.15],[1,0]],'body.py':[[0,0],[.25,.1],[.4,0],[1,0]]}},
  AngkatEkor:{label:'Angkat Ekor',dur:1.3,ch:{'tail.rx':[[0,0],[.3,1.15],[.55,1.25],[.7,.6],[1,0]],'tail.ry':[[0,0],[.3,.15],[.45,-.15],[.55,.1],[1,0]],
    'body.rx':[[0,0],[.3,.14],[.6,.12],[1,0]],'head.rx':[[0,0],[.3,.15],[.6,.1],[1,0]],'wing.rz':[[0,0],[.3,.3],[.6,.2],[1,0]],'body.py':[[0,0],[.3,-.1],[.6,-.05],[1,0]]}},
  KibasEkor:{label:'Kibas Ekor',dur:1,ch:{'body.ry':[[0,0],[.3,.45],[.55,-.55],[1,0]],'tail.ry':[[0,0],[.3,-.6],[.55,.75],[1,0]],'head.ry':[[0,0],[.3,-.25],[.55,.3],[1,0]],
    'body.py':[[0,0],[.3,.1],[.55,0],[1,0]],'wing.rz':[[0,0],[.3,.25],[.6,.1],[1,0]],'leg.F':[[0,0],[.3,-.2],[.6,.1],[1,0]]}},
  Hentak:{label:'Hentak',dur:1,ch:{'body.py':[[0,0],[.35,.6],[.5,-.15],[.7,0],[1,0]],'body.rx':[[0,0],[.35,-.25],[.5,.08],[1,0]],'leg.F':[[0,0],[.35,-.7],[.5,.1],[1,0]],
    'head.rx':[[0,0],[.35,-.3],[.5,.2],[1,0]],'jaw.rx':[[0,0],[.35,.4],[.6,.1],[1,0]],'wing.rz':[[0,0],[.35,.4],[.5,-.1],[1,0]]}},
  Senang:{label:'Senang',dur:1.2,ch:{'body.py':[[0,0],[.15,-.1],[.35,.9],[.55,0],[.65,-.1],[1,0]],'leg.F':[[0,0],[.35,-.4],[.55,0],[1,0]],'leg.H':[[0,0],[.35,.4],[.55,0],[1,0]],
    'wing.rz':[[0,0],[.2,.6],[.3,-.2],[.4,.6],[.5,-.2],[.6,0],[1,0]],'tail.ry':[[0,.4],[.25,-.4],[.5,.4],[.75,-.4],[1,.4]],'head.rz':[[0,.15],[.5,-.15],[1,.15]],
    'head.rx':[[0,0],[.35,-.25],[.6,0],[1,0]],'jaw.rx':K(.2)}}
};
const LEG_ALIAS={'leg.F':['leg.DL','leg.DR'],'leg.H':['leg.BL','leg.BR'],'leg.A':['leg.DL','leg.BR'],'leg.B':['leg.DR','leg.BL']};
const ANIMS={};
Object.entries(ANIM_SRC).forEach(([k,a])=>{const ch={};Object.entries(a.ch).forEach(([c,keys])=>(LEG_ALIAS[c]||[c]).forEach(cc=>ch[cc]=keys));ANIMS[k]={label:a.label,dur:a.dur,ch};});
function sampleKeys(keys,u,step){
  if(keys.length===1||u<=keys[0][0])return keys[0][1];
  for(let i=0;i<keys.length-1;i++){const a=keys[i],b=keys[i+1];
    if(u<=b[0]){if(step)return a[1];const w=(u-a[0])/Math.max(b[0]-a[0],1e-6);return a[1]+(b[1]-a[1])*(1-Math.cos(Math.PI*w))/2;}}
  return keys[keys.length-1][1];
}
function samplePose(anim,u){const p={};CH.forEach(c=>{const k=anim.ch[c];p[c]=k?sampleKeys(k,u,c==='fire'):0;});return p;}
const ZERO={};CH.forEach(c=>ZERO[c]=0);
function applyPose(rig,p){
  rig.body.position.set(BODY_PIVOT.x,BODY_PIVOT.y+p['body.py'],BODY_PIVOT.z+p['body.pz']);
  rig.body.rotation.set(p['body.rx'],p['body.ry'],p['body.rz']);
  rig.head.rotation.set(p['head.rx'],p['head.ry'],p['head.rz']);
  if(rig.jaw)rig.jaw.rotation.set(p['jaw.rx'],0,0);
  rig.wings.forEach(w=>{const s=w.userData.side;w.rotation.set(p['wing.rx'],s*p['wing.ry'],s*p['wing.rz']);});
  // sayap belakang (Ganda): pose tertunda (p.w2) dengan ayunan sedikit berbeda
  if(rig.wings2){const q=p.w2||p;rig.wings2.forEach(w=>{const s=w.userData.side;w.rotation.set(q['wing.rx']*.85,s*q['wing.ry']*.8,s*q['wing.rz']*1.15);});}
  rig.tail.rotation.set(p['tail.rx'],p['tail.ry'],0);
  Object.entries(rig.legs).forEach(([k,g])=>g.rotation.set(p['leg.'+k],0,0));
}

/* ---------- Aturan gen ---------- */
/* ---------- Kombinasi terlarang ----------
   Dihitung saat halaman dibuka: setiap kepala dirakit dengan setiap tanduk, lalu diuji tabrakannya.
   Pasangan yang saling menembus tidak pernah keluar dari tetasan, dan di Roblox dikocok ulang lewat Data.Conflicts. */
let CONFLICTS=[];
function computeConflicts(){
  const out=[];
  {const box=new THREE.Box3(),low=(g,pos,sc)=>{const w=new THREE.Group();w.position.copy(pos);if(sc)w.scale.setScalar(sc);w.add(g);w.updateMatrixWorld(true);const y=box.setFromObject(w).min.y;w.remove(g);return y;};
    const tails=slotOf('Ekor').v.map(v=>({id:v.id,g:buildVariant('Ekor',v.id).groups.C}));
    const hornsB=slotOf('Tanduk').v.map(v=>({id:v.id,g:buildVariant('Tanduk',v.id).groups.C})).filter(x=>x.g);
    const heads=slotOf('Kepala').v.map(v=>{const hd=buildVariant('Kepala',v.id),g=new THREE.Group();g.add(hd.groups.C);if(hd.groups.J){hd.groups.J.position.copy(hd.sockets.Rahang);g.add(hd.groups.J);}return {id:v.id,g};});
    slotOf('Badan').v.forEach(bv=>{const so=buildVariant('Badan',bv.id);
      tails.forEach(t=>{if(low(t.g,so.sockets.Ekor)<.02)out.push(['Badan',bv.id,'Ekor',t.id]);});
      heads.forEach(hh=>{if(low(hh.g,so.sockets.Kepala,so.sockets.KepalaSkala)<.05)out.push(['Badan',bv.id,'Kepala',hh.id]);});
      // tanduk × badan: tanduk di posisi tanduk kepala yang umum; titik tanduk di belakang kepala harus berada di atas punggung (+0.08)
      {const ks=so.sockets.KepalaSkala,base=so.sockets.Kepala.clone().add(V(0,.42,-.2).multiplyScalar(ks)),ms=[];so.groups.C.updateMatrixWorld(true);so.groups.C.traverse(o=>{if(o.isMesh)ms.push(o);});
        const grid={},top=(x,z)=>{const k=Math.round(x/.3)+','+Math.round(z/.25);if(!(k in grid)){rc.set(V(Math.round(x/.3)*.3,30,Math.round(z/.25)*.25),V(0,-1,0));const hit=rc.intersectObjects(ms,false)[0];grid[k]=hit?hit.point.y:null;}return grid[k];};
        hornsB.forEach(hn=>{const w=new THREE.Group();w.position.copy(base);w.scale.setScalar(ks);w.add(hn.g);w.updateMatrixWorld(true);let bad=false;const v=V(0,0,0);
          hn.g.traverse(m=>{if(bad||!m.isMesh)return;const pa=m.geometry.attributes.position;for(let q=0;q<pa.count&&!bad;q+=3){v.fromBufferAttribute(pa,q).applyMatrix4(m.matrixWorld);
            if(v.z>base.z-.3||Math.abs(v.x)>1.5)continue;const t=top(v.x,v.z);if(t!==null&&v.y<t+.08)bad=true;}});
          if(bad)out.push(['Badan',bv.id,'Tanduk',hn.id]);w.remove(hn.g);});}
      disposeTree(so.groups.C);});
    hornsB.forEach(hn=>disposeTree(hn.g));
    tails.forEach(t=>disposeTree(t.g));heads.forEach(hh=>disposeTree(hh.g));
    // pasangan yang tidak bisa diatasi lewat desain: ekor sengat di pinggul pinguin, duri landak menembus sayap pendek
    out.push(['Badan','Pinguin','Ekor','Sengat'],['Badan','Landak','Sayap','Kecil'],['Badan','Landak','Sayap','Rusuk']);}
  const horns=slotOf('Tanduk').v.filter(v=>v.b).map(v=>({id:v.id,g:buildVariant('Tanduk',v.id).groups.C}));
  slotOf('Kepala').v.forEach(hv=>{
    const hd=buildVariant('Kepala',hv.id),hg=new THREE.Group();
    hg.add(hd.groups.C);if(hd.groups.J){hd.groups.J.position.copy(hd.sockets.Rahang);hg.add(hd.groups.J);}
    const pm=prepMeshes(hg);
    horns.forEach(hn=>{hn.g.position.copy(hd.sockets.Tanduk);const cm=prepMeshes(hn.g);
      if(clashParentChild(pm,cm,[hd.sockets.Tanduk.clone()]))out.push(['Kepala',hv.id,'Tanduk',hn.id]);});
    disposeTree(hg);
  });
  horns.forEach(hn=>disposeTree(hn.g));
  return out;
}
const isConflict=(sa,ia,sb,ib)=>CONFLICTS.some(c=>(c[0]===sa&&c[1]===ia&&c[2]===sb&&c[3]===ib)||(c[0]===sb&&c[1]===ib&&c[2]===sa&&c[3]===ia));
function pickWeighted(slot,ok){
  const vs=slot.v.filter(ok),tot=vs.reduce((a,v)=>a+RAR[v.r].w,0);let x=Math.random()*tot;
  for(const v of vs){x-=RAR[v.r].w;if(x<=0)return v.id;}return vs[vs.length-1].id;
}
function roll(eg){
  eg=eg||egg;const g={};
  const pool=Object.values(ANIMALS).filter(a=>a.fam===eg),tpl=pool.length?pool[Math.floor(Math.random()*pool.length)].g:null;
  SLOTS.forEach(s=>{
    const mut=s.key==='Elemen'?MUTATION.Elemen:MUTATION.Bagian;
    g[s.key]=tpl&&tpl[s.key]&&Math.random()>=mut?tpl[s.key]:pickWeighted(s,v=>eg!=='Naga'||!v.fam);
  });
  // ulangi sampai stabil: memperbaiki satu pasangan bisa memunculkan tabrakan pasangan lain
  for(let pass=0;pass<8;pass++){let ch=false;
    CONFLICTS.forEach(([sa,,sb])=>{if(isConflict(sa,g[sa],sb,g[sb])){g[sb]=pickWeighted(slotOf(sb),v=>!isConflict(sa,g[sa],sb,v.id));ch=true;}});
    if(!ch)break;}
  return g;
}
// Kalau pilihan bertabrakan, slot yang tidak sedang dipilih diganti ke varian pertama yang cocok
function fixGenes(g,keep){
  let msg=null;
  for(let pass=0;pass<8;pass++)CONFLICTS.forEach(([sa,,sb])=>{
    if(!isConflict(sa,g[sa],sb,g[sb]))return;
    const change=keep===sb?sa:sb,other=change===sa?sb:sa;
    const ok=slotOf(change).v.find(v=>!isConflict(change,v.id,other,g[other]));
    msg=`${change} ${g[change]} menembus ${other} ${g[other]}, jadi ${change} diganti ke ${ok.id}.`;g[change]=ok.id;
  });
  return msg;
}
function score(g){return SLOTS.reduce((a,s)=>a+RAR[varOf(s.key,g[s.key]).r].p,0);}
// Kelas dari poin, tapi tidak boleh lebih tinggi dari bagian terbaik (naga Legendaris wajib punya bagian Legendaris)
function bestRarity(g){return SLOTS.reduce((a,s)=>Math.max(a,varOf(s.key,g[s.key]).r),0);}
function tierOf(g){const p=score(g);let t=0;TIERS.forEach((x,i)=>{if(p>=x.min)t=i;});return Math.min(t,bestRarity(g));}
function nameOf(g){
  const head=varOf('Kepala',g.Kepala).an||'Naga',body=varOf('Badan',g.Badan).an||'Naga';
  const noun=head==='Naga'&&body==='Naga'?(g.Kaki==='Wyvern'?'Wyvern':g.Sayap==='Tanpa'?'Drake':'Naga'):head===body?head:head+' '+body;
  let best=null,br=0;
  SLOTS.forEach(s=>{if(s.key==='Elemen')return;const v=varOf(s.key,g[s.key]);if(v.ep&&v.r>br){best=v.ep;br=v.r;}});
  return noun+' '+g.Elemen+(best?' '+best:'');
}
const B62='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function geneCode(g){return 'NG-'+SLOTS.map(s=>B62[s.v.findIndex(v=>v.id===g[s.key])]).join('');}
function parseCode(c){
  const m=/^\s*(?:NG-)?([0-9a-zA-Z]+)\s*$/i.exec(c||'');if(!m||m[1].length!==SLOTS.length)return null;
  const g={};for(let i=0;i<SLOTS.length;i++){const v=SLOTS[i].v[B62.indexOf(m[1][i])];if(!v)return null;g[SLOTS[i].key]=v.id;}return g;
}

/* ---------- Statistik: HP, Serangan, Pertahanan, Kecepatan, Kritis ----------
   Nilai dasar + sumbangan tiap bagian (sesuai peran slot, makin langka makin besar, plus ciri khas varian),
   lalu dikali tier, tahap, dan ukuran. Damage jurus = Serangan × kekuatan jurus × 100/(100 + Pertahanan lawan). */
const STAT_BASE={hp:100,atk:20,def:20,spd:20,crit:5};
const STAT_ROLE={Badan:{hp:22,def:4},Kepala:{atk:5,crit:1},Tanduk:{atk:4,crit:1.5},Sayap:{spd:5},Ekor:{atk:4,def:2},Kaki:{spd:3,def:3},Punggung:{def:4},Elemen:{atk:3,crit:.5}};
const STAT_MOD={
  'Badan:Gempal':{hp:25,spd:-3},'Badan:Ramping':{spd:6,hp:-10},'Badan:Berlapis':{def:10},'Badan:Gendut':{hp:45,spd:-4},'Badan:Petarung':{atk:8},
  'Badan:Jerapah':{crit:3},'Badan:Kadal':{spd:4},'Badan:Panjang':{spd:3},'Badan:Bungkuk':{atk:4,def:2},
  'Badan:Gajah':{hp:60,spd:-5},'Badan:Badak':{def:12,atk:4},'Badan:Singa':{atk:9},'Badan:Harimau':{atk:7,spd:3},'Badan:Serigala':{spd:7,crit:2},
  'Badan:Beruang':{hp:35,atk:5},'Badan:Rusa':{spd:9},'Badan:BurungHantu':{crit:6,spd:3},
  'Kaki:Kekar':{def:5},'Kaki:Gajah':{hp:30,spd:-2},'Kaki:Badak':{hp:20,def:3},'Kaki:Ramping':{spd:5},'Kaki:Kucing':{spd:5,crit:1},'Kaki:Serigala':{spd:6},
  'Kaki:Kuku':{spd:7},'Kaki:Burung':{crit:3},'Kaki:Berlapis':{def:6},'Kaki:Berduri':{atk:3},'Kaki:Wyvern':{spd:3,atk:2},'Kaki:Beruang':{atk:4},
  'Sayap:Ganda':{spd:8},'Sayap:Kristal':{crit:4},'Sayap:Bulu':{spd:4},'Sayap:Sirip':{spd:6},'Sayap:Kecil':{spd:-2},
  'Kepala:Zirah':{def:6},'Kepala:Banteng':{atk:3},'Kepala:Gajah':{hp:20},'Kepala:Badak':{def:4},'Kepala:Singa':{atk:4},'Kepala:BurungHantu':{crit:3},
  'Ekor:Gada':{atk:5},'Ekor:Kapak':{atk:6},'Ekor:Trisula':{crit:3},'Ekor:Berduri':{def:3},'Punggung:Lempeng':{def:4},'Punggung:Kristal':{crit:2}
};
const TIER_MUL=[1,1.15,1.35,1.6,2],STAGE_MUL={Telur:0,Anak:.6,Dewasa:1,Ultimate:1.4};
const SIZE_MUL={Normal:{},Besar:{hp:1.2,atk:1.05,spd:.95},Mungil:{hp:.8,spd:1.25},Titan:{hp:1.5,atk:1.15,spd:.85}};
const STAT_NAMES=[['hp','HP',900],['atk','Serangan',170],['def','Pertahanan',130],['spd','Kecepatan',110],['crit','Kritis',30]];
function partStats(slot,v){if(v.id==='Tanpa')return {};const role=STAT_ROLE[slot]||{},k=1+v.r*.6,o={};
  for(const [s,x] of Object.entries(role))o[s]=x*k;for(const [s,x] of Object.entries(STAT_MOD[slot+':'+v.id]||{}))o[s]=(o[s]||0)+x;return o;}
Object.assign(STAT_MOD,{
  'Badan:Unta':{hp:20,spd:2},'Badan:Kalajengking':{atk:6,def:6},'Badan:Fennec':{spd:8,crit:2},'Badan:Kobra':{crit:5,atk:3},'Badan:Kanguru':{spd:6,atk:3},
  'Badan:Hiu':{atk:9},'Badan:Orca':{hp:30,atk:7},'Badan:Gurita':{crit:4,def:3},'Badan:Kepiting':{def:12},'Badan:Penyu':{def:15,spd:-4},'Badan:Lumba':{spd:8},
  'Badan:Pinguin':{def:4,hp:10},'Badan:Walrus':{hp:40,spd:-3},'Badan:Mamut':{hp:65,def:4,spd:-6},'Badan:Yak':{hp:35,def:4},
  'Badan:Gorila':{atk:10,hp:20},'Badan:Monyet':{spd:7,crit:3},'Badan:Panda':{hp:35,def:4},'Badan:Babi':{hp:20,atk:4},'Badan:Landak':{def:10},'Badan:Rakun':{crit:4,spd:3},
  'Badan:Katak':{spd:5,crit:2},'Badan:Komodo':{atk:7,hp:15},'Badan:KudaNil':{hp:50,atk:5,spd:-4},
  'Badan:Rajawali':{spd:6,crit:4},'Badan:Kambing':{spd:5,def:3},'Badan:Kalong':{spd:6,crit:3},'Badan:Cendrawasih':{crit:7,spd:4},'Badan:Zebra':{spd:9},'Badan:Cheetah':{spd:12,hp:-10},
  'Kaki:Capit':{atk:5,def:3},'Kaki:Kanguru':{spd:8},'Kaki:Sirip':{spd:2,def:2},'Kaki:Tentakel':{crit:3,atk:2},'Kaki:Mamut':{hp:35,spd:-3},'Kaki:Gorila':{atk:5},
  'Kaki:Katak':{spd:6},'Kaki:Panda':{atk:4},'Kaki:Unta':{hp:10,spd:4},'Kaki:Pinguin':{def:3},
  'Ekor:Sengat':{atk:6,crit:3},'Ekor:Tebal':{def:4},'Ekor:Cendrawasih':{crit:5},'Punggung:Landak':{def:6}
});
SLOTS.forEach(s=>s.v.forEach(v=>{v.st=partStats(s.key,v);}));
function statsOf(g,st,lv){
  st=st||stage;const t=Object.assign({},STAT_BASE),ti=tierOf(g),sm=STAGE_MUL[st]??1,sz=SIZE_MUL[g.Ukuran]||{};
  const tm=TIER_MUL[ti]*(1+(clampLevel(lv??level,st)-1)*LEVEL.per);
  SLOTS.forEach(s=>{const v=varOf(s.key,g[s.key]);if(v&&v.st)for(const [k,x] of Object.entries(v.st))t[k]+=x;});
  return {hp:Math.round(t.hp*(sz.hp||1)*tm*sm),atk:Math.round(t.atk*(sz.atk||1)*tm*sm),def:Math.round(t.def*tm*sm),
    spd:Math.round(t.spd*(sz.spd||1)*(1+(tm-1)*.4)*Math.max(sm,.6)),crit:+(t.crit+ti*1.5).toFixed(1)};
}
/* Keunggulan elemen: tiap elemen kuat melawan 2 dan lemah terhadap 2 (seimbang, tidak ada pasangan saling mengalahkan). */
const ELEMENT_CHART={Api:['Alam','Es'],Magma:['Batu','Salju'],Laut:['Lumpur','Magma'],Es:['Laut','Rimba'],Salju:['Rimba','Loreng'],Petir:['Laut','Emas'],
  Alam:['Batu','Savana'],Rimba:['Petir','Racun'],Racun:['Alam','Loreng'],Batu:['Api','Pasir'],Savana:['Es','Belang'],Loreng:['Savana','Senja'],
  Bayangan:['Senja','Kosmik'],Emas:['Bayangan','Langit'],Kosmik:['Karang','Emas'],Senja:['Salju','Kosmik'],
  Pasir:['Petir','Lumpur'],Lumpur:['Api','Karang'],Karang:['Magma','Belang'],Belang:['Bayangan','Langit'],Langit:['Racun','Pasir']};
const ELEM_MUL={kuat:1.5,lemah:.7};
const weakTo=el=>Object.keys(ELEMENT_CHART).filter(k=>ELEMENT_CHART[k].includes(el));
function elemMul(a,t){if(!t||t==='Netral')return 1;if((ELEMENT_CHART[a]||[]).includes(t))return ELEM_MUL.kuat;if((ELEMENT_CHART[t]||[]).includes(a))return ELEM_MUL.lemah;return 1;}
/* Level 1–50: +2.5% HP/Serangan/Pertahanan/Kecepatan per level. Batas per tahap; evolusi terbuka di level 20 dan 40. */
const LEVEL={max:50,per:.025,xpBase:40,xpExp:1.6,min:{Telur:1,Anak:1,Dewasa:20,Ultimate:40},cap:{Telur:1,Anak:20,Dewasa:40,Ultimate:50}};
let level=1;
const xpToNext=L=>Math.round(LEVEL.xpBase*Math.pow(L,LEVEL.xpExp));
const clampLevel=(L,st)=>Math.max(LEVEL.min[st]||1,Math.min(LEVEL.cap[st]||LEVEL.max,L));
function powerOf(S){return Math.round(S.hp/5+S.atk*2+S.def*1.5+S.spd+S.crit*2);}

/* ---------- Merakit naga lengkap dengan rig ---------- */
const sockMat=new THREE.MeshBasicMaterial({color:0xff3d7f,depthTest:false});
function disposeTree(o){o.traverse(x=>{if(x.isMesh&&x.material!==sockMat)x.geometry.dispose();});}
function matCount(g){const s=new Set();g.traverse(o=>{if(o.isMesh&&o.userData.mat)s.add(o.userData.mat);});return s.size;}
function triCount(g){let t=0;g.traverse(o=>{if(o.isMesh&&o.userData.mat){const q=o.geometry;t+=(q.index?q.index.count:q.attributes.position.count)/3;}});return t;}

function buildDragon(genes,withMarkers,st){
  st=st||'Dewasa';
  CUR=(st==='Ultimate'?ultSet:matSet)(genes.Elemen);
  const root=new THREE.Group();
  const body=new THREE.Group();body.position.copy(BODY_PIVOT);root.add(body);
  const inner=new THREE.Group();inner.position.copy(BODY_PIVOT).multiplyScalar(-1);body.add(inner);
  const rig={root,body,inner,wings:[],wings2:[],legs:{},markers:new THREE.Group()};const stats={tris:0,parts:0};
  const placed=(g,parent)=>{parent.add(g);stats.tris+=triCount(g);stats.parts+=matCount(g);};
  const pivot=(p,parent)=>{const g=new THREE.Group();g.position.copy(p);parent.add(g);return g;};
  const mark=(p,parent)=>{if(!withMarkers)return;const m=new THREE.Mesh(new THREE.OctahedronGeometry(.12,0),sockMat);m.position.copy(p);m.renderOrder=10;parent.add(m);rig.markers.add(m);};

  const B=buildVariant('Badan',genes.Badan),so=B.sockets;placed(B.groups.C,inner);
  const Hd=buildVariant('Kepala',genes.Kepala),hs=Hd.sockets;
  rig.head=pivot(so.Kepala,inner);rig.head.scale.setScalar(so.KepalaSkala);placed(Hd.groups.C,rig.head);mark(V(0,0,0),rig.head);
  rig.jaw=pivot(hs.Rahang,rig.head);if(Hd.groups.J)placed(Hd.groups.J,rig.jaw);
  rig.mouth=pivot(hs.Mulut,rig.head);rig.trunk=hs.Belalai?pivot(hs.Belalai,rig.head):null;
  const Hn=buildVariant('Tanduk',genes.Tanduk);
  if(Hn.groups.C){Hn.groups.C.position.copy(hs.Tanduk);placed(Hn.groups.C,rig.head);}
  mark(hs.Tanduk,rig.head);
  const W=buildVariant('Sayap',genes.Sayap);
  [['L',1],['R',-1]].forEach(([k,s])=>{const p=pivot(so['Sayap_'+k],inner);p.userData.side=s;rig.wings.push(p);if(W.groups[k])placed(W.groups[k],p);mark(V(0,0,0),p);
    // sayap ganda: pangkal sayap kecil diletakkan di permukaan punggung (dicari maju dari belakang sampai mengenai badan)
    const sub=W.groups[k]?W.groups[k].children.filter(m=>m.userData.sub2):[];
    if(sub.length){const r0=sub[0].userData.root2,sk=so['Sayap_'+k];let hit=null,z=r0.z;
      for(;z<=-.2&&hit===null;z+=.1)hit=topY(B.groups.C,sk.x+r0.x,sk.z+z);
      const d=hit!==null?V(0,hit-.06-(sk.y+r0.y),z-.1-r0.z):V(0,0,0);
      // sayap kecil pindah ke engselnya sendiri di pangkalnya, supaya bisa mengepak terpisah dari sayap depan
      const p2=pivot(sk.clone().add(r0).add(d),inner);p2.userData.side=s;rig.wings2.push(p2);
      const off=sk.clone().add(d).sub(p2.position);sub.forEach(m=>{W.groups[k].remove(m);m.position.add(off);p2.add(m);});}});
  const T=buildVariant('Ekor',genes.Ekor);rig.tail=pivot(so.Ekor,inner);placed(T.groups.C,rig.tail);
  rig.tailPath=T.sockets.Jalur||[];rig.tailR=T.sockets.JalurR||[];rig.tailTips=rig.tailPath.length>1&&TAIL_TIPS[genes.Ekor]?TAIL_TIPS[genes.Ekor](rig.tailPath):[];mark(V(0,0,0),rig.tail);
  const L=buildVariant('Kaki',genes.Kaki);
  ['DL','DR','BL','BR'].forEach(k=>{const p=pivot(so['Kaki_'+k],inner);p.scale.setScalar(so.KakiSkala);rig.legs[k]=p;if(L.groups[k])placed(L.groups[k],p);mark(V(0,0,0),p);});
  const sp=buildVariant('Punggung',genes.Punggung).groups.C;
  const putSpine=(p,s,parent)=>{mark(p,parent);if(!sp)return;const c=sp.clone();c.userData.spine=true;c.position.copy(p);c.scale.setScalar(s);placed(c,parent);};
  so.Punggung.forEach(([p,s])=>putSpine(p,s,inner));
  T.sockets.Punggung.forEach(([p,s])=>putSpine(p,s,rig.tail));
  rig.markers.visible=false;
  const d={root,rig,stats,baseScale:varOf('Ukuran',genes.Ukuran).sc};
  stageDragon(d,genes,so,hs,Hd,Hn,st,B);
  root.scale.setScalar(d.baseScale);
  return d;
}

const STAGES=['Telur','Anak','Dewasa','Ultimate'];
let stage='Dewasa';
const GOLD=new THREE.MeshStandardMaterial({color:'#ffc933',emissive:'#5a3c00',emissiveIntensity:.6,metalness:.55,roughness:.32,flatShading:true});
function ultSet(el){
  const k=el+'#ult';if(MSETS[k])return MSETS[k];
  const b=matSet(el),s={};MATS.forEach(n=>{s[n]=b[n].clone();});
  // palet Belang memakai 'duri' sebagai kulit (Orca, Pinguin), jadi kilaunya dibuat gelap supaya tetap hitam
  s.duri.emissive.set(el==='Belang'?'#34345a':PAL[el].mata);s.duri.emissiveIntensity=.7;
  s.mata.emissiveIntensity=2.2;s.sayap.emissive.set(PAL[el].sayap);s.sayap.emissiveIntensity=.25;
  return MSETS[k]=s;
}
function goldBox(parent,pos,size,rz){const m=new THREE.Mesh(taperGeo(-size[1]/2,size[1]/2,size[0],size[2],size[0],size[2]),GOLD);m.position.copy(pos);if(rz)m.rotation.z=rz;m.castShadow=true;parent.add(m);return m;}
function goldPyr(parent,base,ht,w,dir){const n=dir.clone().normalize(),m=new THREE.Mesh(taperGeo(0,ht,w,w,.02,.02),GOLD);m.position.copy(base);m.quaternion.setFromRotationMatrix(basis(n));m.castShadow=true;parent.add(m);return m;}
function tipMarker(group,pivot,pick){
  // titik ujung (ujung sayap / ujung ekor) untuk jejak cahaya Ultimate
  const b=new THREE.Box3();group.updateMatrixWorld(true);
  const inv=pivot.matrixWorld.clone().invert();
  group.traverse(o=>{if(o.isMesh){const g=o.geometry;if(!g.boundingBox)g.computeBoundingBox();b.union(g.boundingBox.clone().applyMatrix4(o.matrixWorld).applyMatrix4(inv));}});
  if(b.isEmpty())return null;const m=new THREE.Object3D();m.position.copy(pick(b));pivot.add(m);return m;
}
/* ---------- Set ornamen Ultimate (10 gaya, dipilih dari gen) ----------
   m = bahan utama, t = bahan hiasan, g = warna permata ('el' = warna mata elemen).
   pd = gaya bahu, cf = gaya gelang kaki/ekor, em = lambang kepala/dada, tip = ujung tanduk/ekor/sayap,
   fl = hiasan sisi badan, x = efek khas yang melayang. */
const ULT_SETS=[
  {n:'Raja Emas',m:['#ffc933','#5a3c00',.6,.55,.32],t:['#fff1b8','#6a5000',.4,.6,.3],g:'#e8304a',pd:'spike',cf:'gem',em:'gem',tip:'gem',fl:'plate',x:'crown'},
  {n:'Kesatria Perak',m:['#dfe4ec','#1c2636',.25,.75,.26],t:['#7f8fa6','#000000',0,.7,.35],g:'#3d7bff',pd:'layer',cf:'double',em:'chevron',tip:'blade',fl:'plate',x:'blades'},
  {n:'Iblis Obsidian',m:['#26212c','#000000',0,.45,.38],t:['#c0122c','#ff1e1e',.9,.3,.4],g:'#ff3b1f',pd:'spike3',cf:'spike',em:'chevron',tip:'spike',fl:'stud',x:'embers'},
  {n:'Malaikat Suci',m:['#fbf8ef','#3a3320',.25,.15,.4],t:['#ffd75a','#5a3c00',.6,.55,.3],g:'#7fe3ff',pd:'layer',cf:'band',em:'gem',tip:'gem',fl:'plate',x:'halo'},
  {n:'Kristal Es',m:['#bdf3ff','#4fd2ff',.6,.1,.1,.8],t:['#ffffff','#9fe8ff',.8,.1,.1],g:'el',pd:'crystal',cf:'band',em:'crystal',tip:'crystal',fl:'stud',x:'orbit'},
  {n:'Giok Kaisar',m:['#2fa36b','#0b3a22',.35,.2,.3],t:['#ffc933','#5a3c00',.6,.55,.32],g:'#ffd85a',pd:'plate',cf:'double',em:'disc',tip:'orb',fl:'plate',x:'crown'},
  {n:'Gladiator Perunggu',m:['#c0743a','#3a1a00',.35,.65,.38],t:['#7a3f1c','#000000',0,.6,.45],g:'#ffd85a',pd:'blade',cf:'spike',em:'chevron',tip:'blade',fl:'plate',x:'blades'},
  {n:'Tulang Purba',m:['#e8dfc8','#000000',0,0,.85],t:['#8c7a5c','#000000',0,0,.8],g:'#8cff3a',pd:'spike3',cf:'band',em:'gem',tip:'spike',fl:'stud',x:'embers'},
  {n:'Kosmik Bintang',m:['#2b1d5c','#4a2fbf',.5,.4,.3],t:['#e0d6ff','#9f8bff',.7,.5,.3],g:'#ff7ad9',pd:'orb',cf:'gem',em:'star',tip:'gem',fl:'stud',x:'orbit'},
  {n:'Phoenix Surya',m:['#ff9b2f','#c43c00',.7,.5,.3],t:['#ffe36a','#ff7a00',.8,.5,.3],g:'#fff3a0',pd:'blade',cf:'spike',em:'disc',tip:'blade',fl:'plate',x:'halo'}
];
let ultPick=null; // null = otomatis dari gen
function ultIndexOf(g){if(ultPick!=null)return ultPick;let h=7;for(const ch of geneCode(g))h=(h*31+ch.charCodeAt(0))>>>0;return h%ULT_SETS.length;}
const UMAT={};
function umat(key,d){return UMAT[key]||(UMAT[key]=new THREE.MeshStandardMaterial({color:d[0],emissive:d[1]||'#000000',emissiveIntensity:d[2]??.5,metalness:d[3]??.5,roughness:d[4]??.35,flatShading:true,transparent:d[5]!=null,opacity:d[5]??1}));}
function oBox(par,pos,size,mat,rz){const m=new THREE.Mesh(taperGeo(-size[1]/2,size[1]/2,size[0],size[2],size[0],size[2]),mat);m.position.copy(pos);if(rz)m.rotation.z=rz;m.castShadow=true;par.add(m);return m;}
function oPyr(par,base,ht,w,dir,mat,flat){const m=new THREE.Mesh(taperGeo(0,ht,w,flat?w*.3:w,.02,.02),mat);m.position.copy(base);m.quaternion.setFromRotationMatrix(basis(dir.clone().normalize()));m.castShadow=true;par.add(m);return m;}
function oGem(par,pos,s,mat,st){const m=new THREE.Mesh(new THREE.OctahedronGeometry(1,0),mat);m.position.copy(pos);m.scale.set(s,s*(st||1.3),s);par.add(m);return m;}
// kerangka lokal: +y = arah keluar permukaan (n), +z kira-kira ke atas
function oFrame(par,pos,n,sc){const g=new THREE.Group();g.position.copy(pos);g.quaternion.setFromRotationMatrix(basis(n.clone().normalize()));if(sc)g.scale.setScalar(sc);par.add(g);return g;}
// penampang bagian pada bidang lewat p0 dengan normal n (dari irisan segitiga), dalam ruang pivot.
// Hasil: rentang a (sumbu x kerangka basis(n)) dan b (sumbu z kerangka). rmax membuang potongan yang jauh dari p0.
function planeSection(group,pivot,p0,n,rmax){
  const inv=pivot.matrixWorld.clone().invert(),bm=basis(n),ux=V(0,0,0).setFromMatrixColumn(bm,0),uz=V(0,0,0).setFromMatrixColumn(bm,2),nn=n.clone().normalize();
  const A=V(0,0,0),B=V(0,0,0),C=V(0,0,0),X=V(0,0,0);let r=null;
  group.traverse(m=>{if(!m.isMesh||!m.userData.mat)return;const M=m.matrixWorld.clone().premultiply(inv),pa=m.geometry.attributes.position,ix=m.geometry.index,cnt=ix?ix.count:pa.count;
    const get=(i,v)=>v.fromBufferAttribute(pa,ix?ix.getX(i):i).applyMatrix4(M);
    for(let i=0;i+2<cnt;i+=3){get(i,A);get(i+1,B);get(i+2,C);
      for(const [p,q] of [[A,B],[B,C],[C,A]]){const dp=X.subVectors(p,p0).dot(nn),dq=X.subVectors(q,p0).dot(nn);if(dp*dq>0||dp===dq)continue;
        X.lerpVectors(p,q,dp/(dp-dq)).sub(p0);if(rmax&&X.length()>rmax)continue;
        const a=X.dot(ux),b=X.dot(uz);if(!r)r={a0:a,a1:a,b0:b,b1:b};r.a0=Math.min(r.a0,a);r.a1=Math.max(r.a1,a);r.b0=Math.min(r.b0,b);r.b1=Math.max(r.b1,b);}}});
  return r;
}
// penampang tegak lurus sumbu pivot (ax = 'y' atau 'z' pada nilai t); a = x, b = sumbu sisanya
function partSection(group,pivot,ax,t){
  const s=planeSection(group,pivot,ax==='y'?V(0,t,0):V(0,0,t),ax==='y'?V(0,1,0):V(0,0,1));if(!s)return null;
  // basis(+y): a = x, b = z. basis(+z): a = -x, b = y, jadi a dibalik supaya tetap = x
  if(ax==='z'){const a0=-s.a1,a1=-s.a0;s.a0=a0;s.a1=a1;}
  return s;
}
// titik permukaan dengan skor tertinggi (misal paling bawah / paling ujung), dalam ruang pivot
function partExtreme(group,pivot,score){const inv=pivot.matrixWorld.clone().invert(),v=V(0,0,0);let best=null,bs=-1e9;
  group.traverse(m=>{if(!m.isMesh||!m.userData.mat)return;const M=m.matrixWorld.clone().premultiply(inv),pa=m.geometry.attributes.position;
    for(let i=0;i<pa.count;i++){v.fromBufferAttribute(pa,i).applyMatrix4(M);const s=score(v);if(s>bs){bs=s;best=v.clone();}}});return best;}
const URC=new THREE.Raycaster();
function partHit(group,par,o,d){
  const ms=[];group.traverse(m=>{if(m.isMesh&&m.userData.mat)ms.push(m);});
  URC.set(par.localToWorld(o.clone()),d.clone().transformDirection(par.matrixWorld));URC.far=80;
  const h=URC.intersectObjects(ms,false)[0];if(!h)return null;const inv=par.matrixWorld.clone().invert();
  return {p:h.point.clone().applyMatrix4(inv),n:h.face.normal.clone().transformDirection(h.object.matrixWorld).transformDirection(inv)};
}
function ultEmblem(g,type,S){
  if(type==='chevron'){[1,-1].forEach(s=>{const b=oBox(g,V(s*.13,.05,-.04),[.12,.1,.46],S.m);b.rotation.y=s*.55;});oGem(g,V(0,.1,.1),.11,S.gm,1);}
  else if(type==='crystal'){oBox(g,V(0,.03,0),[.34,.08,.34],S.t);oGem(g,V(0,.16,0),.12,S.gm,2.2);}
  else if(type==='disc'){oBox(g,V(0,.03,0),[.52,.08,.52],S.m);oBox(g,V(0,.08,0),[.34,.06,.34],S.t);oGem(g,V(0,.14,0),.09,S.gm,1);}
  else if(type==='star'){oGem(g,V(0,.1,0),.13,S.gm,1);for(let i=0;i<4;i++){const a=i/4*Math.PI*2+Math.PI/4;oPyr(g,V(0,.06,0),.34,.1,V(Math.cos(a),.15,Math.sin(a)),S.t);}}
  else{oBox(g,V(0,.03,0),[.42,.1,.42],S.t);oGem(g,V(0,.13,0),.15,S.gm,1);}
}
function ultTip(par,pos,dir,type,S,sc){const g=oFrame(par,pos,dir,sc);oBox(g,V(0,-.02,0),[.26,.12,.26],S.m);
  if(type==='spike')oPyr(g,V(0,.02,0),.5,.17,UP,S.t);
  else if(type==='blade')oPyr(g,V(0,.02,0),.62,.24,UP,S.t,true);
  else if(type==='crystal')oGem(g,V(0,.24,0),.11,S.gm,2.6);
  else if(type==='orb')oBox(g,V(0,.15,0),[.22,.22,.22],S.gm);
  else oGem(g,V(0,.17,0),.14,S.gm);
  return g;}
// titik tengah penampang bagian pada bidang ax = t
function partCenter(group,pivot,ax,t){const s=partSection(group,pivot,ax,t);if(!s)return null;const a=(s.a0+s.a1)/2,b=(s.b0+s.b1)/2;return ax==='y'?V(a,t,b):V(a,b,t);}
// gelang tegak lurus bagian: arah bagian diambil dari titik tengah sedikit sebelum dan sesudah t
function ultRing(par,group,ax,t,dt,type,S){
  const c=partCenter(group,par,ax,t),c0=partCenter(group,par,ax,t-dt),c1=partCenter(group,par,ax,t+dt);if(!c||!c0||!c1)return;
  const dir=c1.sub(c0);if(dir.lengthSq()<1e-6)return;dir.normalize();
  const flat=partSection(group,par,ax,t),rmax=Math.hypot(flat.a1-flat.a0,flat.b1-flat.b0)/2+.15;
  const sec=planeSection(group,par,c,dir,rmax);if(!sec)return;
  drawRing(par,c,dir,sec,type,S);
}
// gelang tegak lurus arah dir di titik c; sec = rentang penampang dalam kerangka basis(dir) (a = sumbu x, b = sumbu z)
function drawRing(par,c,dir,sec,type,S,th){
  const g=oFrame(par,c,dir),pad=.07,w=sec.a1-sec.a0+pad*2,d=sec.b1-sec.b0+pad*2,cx=(sec.a0+sec.a1)/2,cz=(sec.b0+sec.b1)/2,k=th||1;
  const band=(y,t,mat)=>oBox(g,V(cx,y,cz),[w,t*k,d],mat);
  if(type==='double'){band(-.13*k,.11,S.m);band(.13*k,.11,S.m);band(0,.07,S.t);}
  else band(0,.26,S.m);
  if(type==='spike')[1,-1].forEach(s=>oPyr(g,V(cx+s*w/2,0,cz),.3*k,.13*k,V(s,0,.35),S.t));
  if(type==='gem')oGem(g,V(cx,0,cz+d/2+.03),.1*k,S.gm,1.2);
}
// titik & lebar ruas ekor pada jarak u (0..1) sepanjang jalur
function pathAt(P,R,u){const L=[0];for(let i=1;i<P.length;i++)L.push(L[i-1]+P[i].distanceTo(P[i-1]));const s=u*L[L.length-1];
  let i=1;while(i<P.length-1&&L[i]<s)i++;const t=(s-L[i-1])/Math.max(1e-6,L[i]-L[i-1]);
  return {p:lerpV(P[i-1],P[i],t),d:P[i].clone().sub(P[i-1]).normalize(),r:R[i-1]+(R[i]-R[i-1])*t,len:L[L.length-1]};}
function ultArmor(rig,so,hs,Hd,Hn,B,genes){
  const si=ultIndexOf(genes),D=ULT_SETS[si],gcol=D.g==='el'?PAL[genes.Elemen].mata:D.g;
  const S={m:umat('m'+si,D.m),t:umat('t'+si,D.t),gm:umat('g'+gcol,[gcol,gcol,.9,.2,.25])};
  const spin=[];rig.ult={set:si,spin,gem:S.gm};
  const inner=rig.inner,body=B.groups.C,legKeys=['DL','DR','BL','BR'];
  // kotak kepala (dengan rahang & tanduk) di ruang badan, diambil sebelum hiasan kepala dipasang
  const headBox=new THREE.Box3().setFromObject(Hd.groups.C);if(Hn.groups.C)headBox.union(new THREE.Box3().setFromObject(Hn.groups.C));
  rig.jaw.children.forEach(c=>{if(c.isGroup)headBox.union(new THREE.Box3().setFromObject(c));});headBox.applyMatrix4(inner.matrixWorld.clone().invert());
  // kepala: lambang di dahi
  const hh=partHit(Hd.groups.C,rig.head,V(0,.22,8),V(0,0,-1));
  if(hh)ultEmblem(oFrame(rig.head,hh.p.addScaledVector(hh.n,-.02),hh.n,.8),D.em,S);
  // ujung tanduk (kiri, kanan, tengah)
  if(Hn.groups.C){const base=hs.Tanduk;[[v=>v.x<-.12],[v=>v.x>.12],[v=>Math.abs(v.x)<=.12]].forEach(([f])=>{
    const tip=partExtreme(Hn.groups.C,rig.head,v=>f(v)?v.distanceTo(base):-1);
    if(tip&&f(tip)&&tip.distanceTo(base)>.45)ultTip(rig.head,tip,tip.clone().sub(base),D.tip,S,.55);});}
  // bahu
  const shoulders=rig.legs.DL.children.some(c=>c.isGroup)?['DL','DR']:['BL','BR'];
  shoulders.forEach(k=>{const s=k[1]==='L'?1:-1,p=rig.legs[k];
    oBox(p,V(s*.15,.25,0),[1,.42,1.05],S.m,-s*.35);oBox(p,V(s*.2,.47,0),[.8,.1,.85],S.t,-s*.35);
    if(D.pd==='spike')[-.22,.22].forEach(z=>oPyr(p,V(s*.5,.42,z),.45,.16,V(s*.6,1,0),S.t));
    else if(D.pd==='spike3')[-.3,0,.3].forEach((z,i)=>oPyr(p,V(s*.48,.42,z),i===1?.75:.55,.2,V(s*.5,1,-.15),S.t));
    else if(D.pd==='layer'){oBox(p,V(s*.42,-.02,0),[.75,.3,.95],S.m,-s*.6);oBox(p,V(s*.6,-.22,0),[.5,.22,.85],S.t,-s*.8);}
    else if(D.pd==='orb')oGem(p,V(s*.32,.62,0),.17,S.gm,1.2);
    else if(D.pd==='blade')oPyr(p,V(s*.45,.38,-.2),.95,.3,V(s*.35,.5,-1),S.t,true);
    else if(D.pd==='crystal')[-.25,0,.25].forEach((z,i)=>oGem(p,V(s*(.4+i%2*.1),.55+(i===1?.15:0),z),.1,S.gm,2.6));
    else oBox(p,V(s*.15,.25,.52),[.9,.36,.08],S.t,-s*.35);});
  // dada dan sisi badan
  const zf=so.Kaki_DL.z,zb=so.Kaki_BL.z,zm=(zf+zb)/2;
  const cs=partSection(body,inner,'z',zf),ms=partSection(body,inner,'z',zm);
  // pelat dada & sisi ikut membesar di badan yang tinggi
  const bodySc=s=>Math.min(1.7,Math.max(.85,(s.b1-s.b0)/1.4));
  // dada: cari dari tengah badan ke bawah, lewati titik yang dekat kepala/rahang dan permukaan yang terlalu datar
  if(cs){const sc=bodySc(cs),hb=headBox.clone().expandByScalar(.55*sc);let h=null;
    for(const f of [.45,.35,.25,.15]){const q=partHit(body,inner,V(0,cs.b0+(cs.b1-cs.b0)*f,40),V(0,0,-1));if(q&&!hb.containsPoint(q.p)&&Math.abs(q.n.y)<.6){h=q;break;}}
    if(h){h.n.x=0;h.n.y=Math.max(-.25,Math.min(.25,h.n.y));h.n.normalize();const g=oFrame(inner,h.p.addScaledVector(h.n,-.03),h.n,sc);oBox(g,V(0,0,0),[.95,.14,.8],S.m);oBox(g,V(0,.07,0),[.62,.08,.5],S.t);
      const e=new THREE.Group();e.position.y=.1;e.scale.setScalar(.8);g.add(e);ultEmblem(e,D.em,S);}}
  if(ms){const tc=so.Torso||V(0,(ms.b0+ms.b1)/2,zm);[1,-1].forEach(s=>{const h=partHit(body,inner,V(s*40,tc.y,tc.z),V(-s,0,0));if(!h)return;
    const g=oFrame(inner,h.p.addScaledVector(h.n,-.03),h.n,bodySc(ms));
    if(D.fl==='stud')[-.42,0,.42].forEach(x=>{oBox(g,V(x,0,0),[.24,.1,.24],S.t);oGem(g,V(x,.08,0),.1,S.gm,1);});
    else{oBox(g,V(0,0,0),[1.1,.12,.7],S.m);oBox(g,V(0,.06,0),[1.1,.06,.16],S.t);oGem(g,V(0,.1,0),.1,S.gm,1);}});}
  // gelang keempat kaki
  const noCuff={Capit:'DLDRBLBR',Sirip:'DLDRBLBR',Pinguin:'DLDR',Kanguru:'DLDR',Wyvern:'DLDR'}[genes.Kaki]||'';
  legKeys.forEach(k=>{const p=rig.legs[k],lg=p.children.find(c=>c.isGroup);if(!lg||noCuff.includes(k))return;
    const lo=partExtreme(lg,p,v=>-v.y);if(!lo)return;ultRing(p,lg,'y',lo.y*.5,.2,D.cf,S);});
  // ekor: gelang di sepanjang ruas ekor (bukan di kipas/bilah ujung) + hiasan di setiap ujung
  const TP=rig.tailPath,TR=rig.tailR;
  if(TP&&TP.length>1){const len=pathAt(TP,TR,1).len,us=len<1.3?[.55]:[.35,.62];
    us.forEach(u=>{const q=pathAt(TP,TR,u),w=q.r*1.7,hh=q.r*1.5;drawRing(rig.tail,q.p,q.d,{a0:-w/2,a1:w/2,b0:-hh/2,b1:hh/2},D.cf,S,Math.min(1,.5+q.r));});
    (rig.tailTips||[]).forEach(([p,d])=>ultTip(rig.tail,p,d,D.tip,S,.8));}
  // ujung sayap
  rig.wings.forEach(w=>{const s=w.userData.side,g=w.children.find(c=>c.isGroup);if(!g)return;
    const tip=partExtreme(g,w,v=>v.x*s);if(tip&&Math.abs(tip.x)>.8)ultTip(w,tip,V(s,.3,0),D.tip,S,.75);});
  // efek khas yang melayang
  // titik tertinggi & terbelakang kepala+tanduk (ruang kepala); jarak dibagi skala kepala supaya celahnya sama di semua ukuran
  const hsc=rig.head.scale.x,hg=[Hd.groups.C,Hn.groups.C].filter(Boolean);
  let topY=-1e9,backZ=1e9;hg.forEach(g=>{const a=partExtreme(g,rig.head,v=>v.y),b=partExtreme(g,rig.head,v=>-v.z);if(a)topY=Math.max(topY,a.y);if(b)backZ=Math.min(backZ,b.z);});
  const top=V(0,topY,hs.Tanduk.z);
  if(D.x==='crown'){const crown=new THREE.Group();crown.position.copy(top).add(V(0,.5/hsc,-.1));rig.head.add(crown);
    [[0,.45],[0,-.45],[.45,0],[-.45,0]].forEach(([x,z])=>oBox(crown,V(x,0,z),x?[.1,.14,1]:[1,.14,.1],S.m));
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2;oPyr(crown,V(Math.sin(a)*.45,.05,Math.cos(a)*.45),i%2?.32:.5,.14,UP,S.t);if(i%2===0)oGem(crown,V(Math.sin(a)*.47,.02,Math.cos(a)*.47),.07,S.gm,1);}
    spin.push([crown,'y',.8]);}
  if(D.x==='halo'){const halo=new THREE.Group();halo.position.set(0,topY+.85,backZ-.2/hsc);halo.scale.setScalar(.8);rig.head.add(halo);
    for(let i=0;i<14;i++){const a=i/14*Math.PI*2,b=oBox(halo,V(Math.cos(a)*1,Math.sin(a)*1,0),[.42,.12,.12],S.t);b.rotation.z=a+Math.PI/2;
      if(i%2===0)oPyr(halo,V(Math.cos(a)*1.06,Math.sin(a)*1.06,0),.32,.1,V(Math.cos(a),Math.sin(a),0),S.m);}
    spin.push([halo,'z',.5]);}
  if(D.x==='blades'){const bl=new THREE.Group();bl.position.copy(top).add(V(0,.3/hsc,0));rig.head.add(bl);
    [1,-1].forEach(s=>{oPyr(bl,V(s*.35,0,0),1.1,.3,V(s*.45,1,-.1),S.m,true);oGem(bl,V(s*.32,0,0),.1,S.gm,1);});spin.push([bl,'bob',1]);}
  // orbit lonjong mengikuti panjang badan setinggi perut, dan melebar ke depan kalau kepala/leher turun sampai ketinggian itu
  if(D.x==='orbit'||D.x==='embers'){const yo=ms?ms.b0+(ms.b1-ms.b0)*.4:2.5,sy=partSection(body,inner,'y',yo)||{a0:-1,a1:1,b0:zb-1,b1:zf+1};
    const zc=(sy.b0+sy.b1)/2;let rx=Math.max(-sy.a0,sy.a1)+1.1,rz=(sy.b1-sy.b0)/2+1.1;
    if(headBox.min.y<yo+.5){rz=Math.max(rz,headBox.max.z-zc+.7);rx=Math.max(rx,Math.max(-headBox.min.x,headBox.max.x)+.7);}
    const ob=new THREE.Group();ob.position.set(0,yo,zc);inner.add(ob);const items=[];
    const n=D.x==='orbit'?6:8;for(let i=0;i<n;i++){const m=D.x==='orbit'?oGem(ob,V(0,0,0),.2,S.gm,1.6):oPyr(ob,V(0,0,0),.4,.16,UP,S.t);items.push([m,i/n*Math.PI*2]);}
    ob.userData={rx,rz,items,t:0};spin.push([ob,'orbit',D.x==='orbit'?.6:-.9]);
    const place=()=>items.forEach(([m,a0])=>{const a=a0+ob.userData.t;m.position.set(Math.sin(a)*rx,Math.sin(a*2)*.3,Math.cos(a)*rz);});place();ob.userData.place=place;}
}
function stageDragon(d,genes,so,hs,Hd,Hn,st,B){
  const {rig}=d;
  if(st==='Anak'){
    const ls=so.KakiSkala,drop=.45*ls;
    rig.inner.position.y-=drop;
    ['DL','DR'].forEach(k=>rig.legs[k].scale.set(ls,ls*(2.3*ls-drop)/(2.3*ls),ls));
    ['BL','BR'].forEach(k=>rig.legs[k].scale.set(ls,ls*(1.85*ls-drop)/(1.85*ls),ls));
    rig.head.scale.multiplyScalar(1.45);
    if(Hn.groups.C)Hn.groups.C.scale.setScalar(.5);
    Hd.groups.C.traverse(o=>{if(o.isMesh&&o.userData.mat==='mata')o.scale.multiplyScalar(1.5);});
    rig.wings.forEach(w=>w.scale.setScalar(.6));rig.wings2.forEach(w=>w.scale.setScalar(.6));rig.tail.scale.setScalar(.75);
    rig.inner.traverse(o=>{if(o.userData.spine)o.scale.multiplyScalar(.6);});
    d.baseScale*=.62;
  }
  if(st==='Ultimate'){
    d.baseScale*=1.2;
    rig.root.updateMatrixWorld(true);
    ultArmor(rig,so,hs,Hd,Hn,B,genes);
  }
  // titik jejak cahaya
  rig.root.updateMatrixWorld(true);
  rig.tips=[];
  rig.wings.forEach(w=>{const s=w.userData.side,g=w.children.find(c=>c.isGroup);if(g){const m=tipMarker(g,w,b=>V(s>0?b.max.x:b.min.x,(b.min.y+b.max.y)/2+.3,(b.min.z+b.max.z)/2));if(m)rig.tips.push(m);}});
  // balok-balok ekor: untuk jejak putaran (tailMeshes) dan titik tembak di ujung tiap cabang (tailEnds)
  {const tp=new THREE.Vector3(),tms=[];rig.tail.getWorldPosition(tp);
    rig.tail.traverse(o=>{if(o.isMesh&&o.userData.mat){const p=new THREE.Vector3();o.getWorldPosition(p);tms.push([o,p.distanceTo(tp)]);}});
    const mx=Math.max(.001,...tms.map(x=>x[1]));rig.tailMeshes=tms.filter(x=>x[1]>mx*.3).map(x=>x[0]);rig.tailEnds=tms.filter(x=>x[1]>mx*.78).map(x=>x[0]);}
  const tg=rig.tail.children.find(c=>c.isGroup);if(tg){const m=tipMarker(tg,rig.tail,b=>V((b.min.x+b.max.x)/2,(b.min.y+b.max.y)/2,b.min.z));if(m)rig.tips.push(m);}
}

/* ---------- Telur ---------- */

return { buildDragon, parseCode, geneCode, roll, EGGS, ANIMS, samplePose, applyPose, ZERO };
})();
