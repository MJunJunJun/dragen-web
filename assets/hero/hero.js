// Hero 3D DraGen: pulau utama dari game (data ekspor scene Unity, assets/hero/island.json) + naga dari perakit asli
// (naga.js = buildDragon bengkel-naga, sumber yang sama dengan DragonBuilder Unity). Perilakunya port dari game VR:
//   - WorldDragon: naga berjalan ke titik acak di kandangnya, diam / senang / mengaum / kibas ekor, kadang terbang rendah.
//   - DragonSky: sesekali SATU naga bersayap lepas landas, terbang bebas atau mengejar burung (zig-zag, lama-lama lelah),
//     tertangkap → gigit, bulu beterbangan, naga melayang mengunyah, pulang & mendarat. Burung baru keluar dari awan.
//   - IslandLife: burung berputar, batu mengorbit, asap, tetes air terjun, kupu-kupu, cincin rune & kristal.
//   - RanchScenery: 28 awan hanyut di jalur angin (mode diorama VR) dan memudar di tepi.
// Koordinat data sudah Three.js (tangan kanan, z Unity dicerminkan) dan berpusat di RanchScenery.Center.
(function () {
  'use strict';
  const wrapEl = document.querySelector('.hero-wrap');
  const stage = document.getElementById('hero-stage');
  if (!wrapEl || !stage || !window.THREE || !window.NagaDragon) return;
  const T = THREE, N = NagaDragon;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return; }
  if (!renderer.getContext()) return;
  renderer.setClearColor(0x000000, 0);
  stage.appendChild(renderer.domElement);

  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(30, 1, 1, 4000);
  scene.add(new T.HemisphereLight(0xf2f7ff, 0x4a4438, .8));
  const sun = new T.DirectionalLight(0xffffff, .95); sun.position.set(60, 120, 90); scene.add(sun);
  const fill = new T.DirectionalLight(0xbcd4ff, .3); fill.position.set(-60, -30, -80); scene.add(fill);

  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DEG = Math.PI / 180;

  // ---------- data ekspor ----------
  function bytes(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; }
  function mat12(a, o) { return new T.Matrix4().set(a[o], a[o + 1], a[o + 2], a[o + 3], a[o + 4], a[o + 5], a[o + 6], a[o + 7], a[o + 8], a[o + 9], a[o + 10], a[o + 11], 0, 0, 0, 1); }

  let D, geos = [], mats = [], vcMats = [];
  function geometry(m) {
    const q = m.q, p = new Uint16Array(bytes(m.p)), n = p.length / 3, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) pos[i * 3 + k] = q[k] + p[i * 3 + k] / 65535 * (q[k + 3] - q[k]);
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    if (m.n) { const s = new Int8Array(bytes(m.n)), f = new Float32Array(s.length); for (let i = 0; i < s.length; i++) f[i] = s[i] / 127; g.setAttribute('normal', new T.BufferAttribute(f, 3)); }
    if (m.u) {
      const s = new Uint16Array(bytes(m.u)), r = m.uq, f = new Float32Array(s.length);
      for (let i = 0; i < s.length; i += 2) { f[i] = r[0] + s[i] / 65535 * (r[2] - r[0]); f[i + 1] = r[1] + s[i + 1] / 65535 * (r[3] - r[1]); }
      g.setAttribute('uv', new T.BufferAttribute(f, 2));
    }
    if (m.c) { const s = new Uint8Array(bytes(m.c)), f = new Float32Array(n * 3); for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) f[i * 3 + k] = s[i * 4 + k] / 255; g.setAttribute('color', new T.BufferAttribute(f, 3)); }
    g.setIndex(new T.BufferAttribute(m.w === 32 ? new Uint32Array(bytes(m.i)) : new Uint16Array(bytes(m.i)), 1));
    m.g.forEach((r, k) => g.addGroup(r[0], r[1], k));
    if (!m.n) g.computeVertexNormals();
    return g;
  }
  function material(d, tex, vc) {
    const o = { color: new T.Color(d.c[0], d.c[1], d.c[2]) };
    if (d.t >= 0 && tex[d.t]) o.map = tex[d.t];
    if (vc) o.vertexColors = true;
    if (d.c[3] < .99) { o.transparent = true; o.opacity = d.c[3]; o.depthWrite = false; }
    const m = d.u ? new T.MeshBasicMaterial(o) : new T.MeshLambertMaterial(o);
    if (d.e && !d.u) m.emissive = new T.Color(d.e[0], d.e[1], d.e[2]);
    return m;
  }
  const matsFor = (mesh, list) => list.map(i => (geos[mesh].attributes.color ? vcMats : mats)[i]);
  function meshOf(node) {
    const mesh = new T.Mesh(geos[node[0]], node[1].length > 1 ? matsFor(node[0], node[1]) : matsFor(node[0], node[1])[0]);
    return mesh;
  }

  // pohon simpul animasi: [induk, mesh (-1 = kosong), [material], TRS lokal 10 angka (posisi, kuaternion, skala)]
  function tree(list, parent) {
    const objs = [];
    list.forEach((n, i) => {
      const o = n[1] >= 0 ? meshOf([n[1], n[2]]) : new T.Object3D();
      const a = n[3];
      o.position.set(a[0], a[1], a[2]); o.quaternion.set(a[3], a[4], a[5], a[6]); o.scale.set(a[7], a[8], a[9]);
      (n[0] >= 0 ? objs[n[0]] : parent).add(o);
      objs.push(o);
    });
    return objs;
  }

  // ---------- naga ----------
  const LOOP = { Diam: 1, Jalan: 1, Terbang: 1, Tidur: 1 };
  const SHOW = 1.6; // naga diperbesar khusus di hero web: skala game terlalu kecil untuk dilihat di layar
  const IDLES = ['Diam', 'Diam', 'Diam', 'Senang', 'Mengaum', 'KibasEkor'];
  class Animator {
    constructor(rig) { this.rig = rig; this.cur = 'Diam'; this.t = 0; this.prev = null; this.blend = 1; this.after = null; }
    play(name, restart) {
      if (!N.ANIMS[name]) name = 'Diam';
      if (name === this.cur && !restart) return;
      this.prev = this.pose(); this.blend = 0; this.cur = name; this.t = 0;
    }
    pose() {
      const a = N.ANIMS[this.cur], u = LOOP[this.cur] ? (this.t % a.dur) / a.dur : Math.min(1, this.t / a.dur);
      return N.samplePose(a, u);
    }
    tick(dt) {
      this.t += dt;
      const a = N.ANIMS[this.cur];
      if (!LOOP[this.cur] && this.t >= a.dur) this.play('Diam');
      let p = this.pose();
      if (this.blend < 1 && this.prev) {
        this.blend = Math.min(1, this.blend + dt / .25);
        const w = this.blend * this.blend * (3 - 2 * this.blend), q = {};
        for (const k in p) q[k] = this.prev[k] + (p[k] - this.prev[k]) * w;
        p = q;
      }
      N.applyPose(this.rig, p);
    }
  }

  // satu mesh per tulang per material (seperti DragonBuilder Unity): puluhan bagian naga → beberapa draw call
  function mergeRig(d) {
    const r = d.rig, bones = new Set([r.root, r.body, r.inner, r.head, r.jaw, r.mouth, r.tail].concat(r.wings, r.wings2, Object.values(r.legs)).filter(Boolean));
    r.root.updateMatrixWorld(true);
    const groups = new Map();
    r.root.traverse(o => {
      if (!o.isMesh || !o.visible) return;
      let b = o.parent; while (b && !bones.has(b)) b = b.parent;
      if (!b) return;
      const key = b.uuid + '|' + o.material.uuid;
      if (!groups.has(key)) groups.set(key, { bone: b, mat: o.material, list: [] });
      groups.get(key).list.push(o);
    });
    groups.forEach(gr => {
      const inv = new T.Matrix4().copy(gr.bone.matrixWorld).invert(), pos = [], nor = [];
      gr.list.forEach(o => {
        let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld));
        if (!g.attributes.normal) g.computeVertexNormals();
        pos.push(g.attributes.position.array); nor.push(g.attributes.normal.array);
        o.parent.remove(o);
      });
      const cat = arrs => { const n = arrs.reduce((a, x) => a + x.length, 0), out = new Float32Array(n); let k = 0; arrs.forEach(x => { out.set(x, k); k += x.length; }); return out; };
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(cat(pos), 3));
      g.setAttribute('normal', new T.BufferAttribute(cat(nor), 3));
      gr.bone.add(new T.Mesh(g, gr.mat));
    });
  }

  function makeDragon(info) {
    let genes = null;
    try { genes = N.parseCode(info.code); } catch (e) { genes = null; }
    if (!genes || Object.values(genes).some(v => v == null)) genes = N.roll('Campuran');
    let d;
    try { d = N.buildDragon(genes, false, info.stage || 'Dewasa'); }
    catch (e) { d = N.buildDragon(N.roll('Campuran'), false, 'Dewasa'); }
    mergeRig(d);
    const holder = new T.Object3D();
    holder.add(d.root);
    if (info.s) d.root.scale.setScalar(info.s * SHOW);
    scene.add(holder);
    return { d, holder, anim: new Animator(d.rig), winged: genes.Sayap !== 'Tanpa' && info.winged !== false };
  }

  class PenDragon {
    constructor(info, i) {
      Object.assign(this, makeDragon(info));
      this.id = i; this.zone = info.zone.map(z => V3(z[0], 0, z[1])); this.zoneR = info.zoneR || 3; this.radius = (info.r || 1.5) * SHOW;
      this.pos = V3(info.p[0], info.p[1], info.p[2]); this.yaw = info.yaw || 0; this.alt = 0; this.altT = 0;
      this.wait = rnd(.5, 3); this.target = this.pos.clone(); this.speed = 1.6; this.inSky = false; this.biting = false;
      this.pitch = 0; this.roll = 0; this.level = info.level || 1; this.mates = null;
      this.apply();
    }
    randomIn() {
      const z = this.zone; let p;
      let a = Math.random(), b = Math.random(); if (a + b > 1) { a = 1 - a; b = 1 - b; }
      if (z.length >= 3) { const t = 1 + Math.floor(Math.random() * (z.length - 2)); p = z[0].clone().add(z[t].clone().sub(z[0]).multiplyScalar(a)).add(z[t + 1].clone().sub(z[0]).multiplyScalar(b)); }
      else if (z.length === 2) p = z[0].clone().lerp(z[1], a); else p = z[0].clone();
      const ang = Math.random() * Math.PI * 2, rr = this.zoneR * .8 * Math.sqrt(Math.random());
      return V3(p.x + Math.cos(ang) * rr, 0, p.z + Math.sin(ang) * rr);
    }
    gap(c) {
      let g = Infinity;
      (this.mates || []).forEach(m => { if (m === this) return; g = Math.min(g, Math.min(flat(m.pos, c), flat(m.target, c)) - (this.radius + m.radius)); });
      return g;
    }
    pickTarget() {
      let best = this.pos.clone(), bg = -Infinity;
      for (let i = 0; i < 12; i++) { const c = this.randomIn(), g = this.gap(c); if (g > .3) return c; if (g > bg) { bg = g; best = c; } }
      return best;
    }
    clampZone(p) {
      const c = closest(this.zone, p), dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
      if (d > this.zoneR) { p.x = c.x + dx / d * this.zoneR; p.z = c.z + dz / d * this.zoneR; }
    }
    face(dir, dt) {
      if (dir.x * dir.x + dir.z * dir.z < 1e-3) return;
      const want = Math.atan2(dir.x, dir.z);
      this.yaw += wrapA(want - this.yaw) * Math.min(1, dt * 4);
    }
    apply() {
      this.holder.position.copy(this.pos);
      this.holder.rotation.set(this.inSky ? this.pitch : 0, this.yaw, this.inSky ? this.roll : 0, 'YXZ');
    }
    tick(dt) {
      this.anim.tick(dt);
      if (this.inSky) return;
      const p = this.pos;
      if (this.wait > 0) {
        this.wait -= dt; this.altT = 0;
        if (this.wait <= 0) { this.target = this.pickTarget(); this.altT = this.winged && Math.random() < .25 ? rnd(1.5, 3) : 0; }
      } else {
        const d = V3(this.target.x - p.x, 0, this.target.z - p.z), len = d.length();
        if (len < .3) { this.wait = rnd(2, 6); this.anim.play(IDLES[Math.floor(Math.random() * IDLES.length)]); }
        else {
          d.divideScalar(len);
          p.addScaledVector(d, Math.min(len, this.speed * (this.alt > .5 ? 1.6 : 1) * dt));
          this.face(d, dt);
          this.anim.play(this.alt > .5 ? 'Terbang' : 'Jalan');
        }
      }
      // naga sekandang saling menjauh pelan
      (this.mates || []).forEach(m => {
        if (m === this || m.inSky) return;
        const dx = p.x - m.pos.x, dz = p.z - m.pos.z, dist = Math.hypot(dx, dz), need = this.radius + m.radius;
        if (dist >= need || dist < 1e-3) return;
        const k = Math.min(need - dist, 2.5 * dt) / dist; p.x += dx * k; p.z += dz * k;
      });
      this.clampZone(p);
      this.alt += (this.altT - this.alt) * Math.min(1, dt * 1.5);
      p.y = this.ground + this.alt;
      if (this.alt > .5 && this.wait > 0) this.anim.play('Terbang');
      this.apply();
    }
    // posisi dari langit; menghadap arah terbang, hidung naik/turun, miring ke belokan
    skyPose(pos, vel, dt) {
      this.pos.copy(pos);
      const fl = Math.hypot(vel.x, vel.z);
      let turn = 0;
      if (fl > .1) { turn = wrapA(Math.atan2(vel.x, vel.z) - this.yaw); this.yaw += turn * Math.min(1, dt * 4); }
      const k = Math.min(1, dt * 3);
      this.roll += (clamp(-turn * 1.2, -.6, .6) - this.roll) * k;
      this.pitch += (clamp(-Math.atan2(vel.y, Math.max(.5, fl)), -.5, .5) - this.pitch) * k;
      if (!this.biting) this.anim.play('Terbang');
      this.apply();
    }
    bite(on) { if (on === this.biting) return; this.biting = on; this.anim.play(on ? 'Gigit' : 'Terbang', on); }
    beginSky() { this.inSky = true; this.biting = false; this.anim.play('Terbang'); }
    landed(home) {
      this.inSky = false; this.biting = false; this.pitch = this.roll = 0;
      this.pos.set(home.x, this.ground, home.z); this.clampZone(this.pos);
      this.alt = this.altT = 0; this.target = this.pos.clone(); this.wait = rnd(1.5, 3);
      this.apply(); this.anim.play(Math.random() < .5 ? 'Senang' : 'KibasEkor');
    }
  }
  const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  function closestOnSeg(p, a, b) {
    const abx = b.x - a.x, abz = b.z - a.z, t = clamp(((p.x - a.x) * abx + (p.z - a.z) * abz) / Math.max(abx * abx + abz * abz, 1e-6), 0, 1);
    return { x: a.x + abx * t, z: a.z + abz * t };
  }
  function closest(z, p) {
    if (z.length === 1) return { x: z[0].x, z: z[0].z };
    if (z.length === 2) return closestOnSeg(p, z[0], z[1]);
    let inside = false, best = { x: z[0].x, z: z[0].z }, bd = Infinity;
    for (let i = 0, j = z.length - 1; i < z.length; j = i++) {
      const a = z[j], b = z[i];
      if ((a.z > p.z) !== (b.z > p.z) && p.x < (b.x - a.x) * (p.z - a.z) / (b.z - a.z) + a.x) inside = !inside;
      const n = closestOnSeg(p, a, b), d = (n.x - p.x) ** 2 + (n.z - p.z) ** 2;
      if (d < bd) { bd = d; best = n; }
    }
    return inside ? { x: p.x, z: p.z } : best;
  }

  // ---------- langit: DragonSky ----------
  const SKY = { NextMin: 9, NextMax: 20, ChaseChance: .65, FreeMin: 14, FreeMax: 22, ChaseMin: 14, ChaseMax: 22, RespawnMin: 18, RespawnMax: 35,
    Cruise: 13, BirdSpeed: 15, BirdTired: 8, Sprint: 18, TurnDeg: 150, CatchR: 2.8, LowY: 12, HighY: 28 };
  function rotateTowards(cur, target, maxRad, maxMag) {
    const cl = cur.length(), tl = target.length();
    if (cl < 1e-6 || tl < 1e-6) return target.clone();
    const a = cur.clone().divideScalar(cl), b = target.clone().divideScalar(tl), ang = Math.acos(clamp(a.dot(b), -1, 1));
    let dir;
    if (ang <= maxRad || ang < 1e-5) dir = b;
    else {
      let axis = a.clone().cross(b);
      if (axis.lengthSq() < 1e-10) axis = V3(0, 1, 0);
      dir = a.applyAxisAngle(axis.normalize(), maxRad);
    }
    const mag = cl + clamp(tl - cl, -maxMag, maxMag);
    return dir.multiplyScalar(mag);
  }
  function steer(vel, want, speed, dt) {
    if (want.lengthSq() < 1e-4) want = vel.clone();
    if (vel.lengthSq() < 1e-4) vel = want.clone().normalize().multiplyScalar(.1);
    return rotateTowards(vel, want.clone().normalize().multiplyScalar(speed), SKY.TurnDeg * DEG * dt, speed * 1.5 * dt);
  }
  function moveTowards(v, to, maxD) { const d = to.clone().sub(v), l = d.length(); return l <= maxD || l < 1e-6 ? to.clone() : v.clone().addScaledVector(d, maxD / l); }

  const sky = { center: V3(0, 0, 0), r: 120, flight: null, next: 4, clock: 0 };
  const birds = [], feathers = [];
  let featherGeo, featherMat;
  function keep(p) {
    const pull = V3(0, 0, 0), dx = p.x - sky.center.x, dz = p.z - sky.center.z, d = Math.hypot(dx, dz), over = d - sky.r * .85;
    if (over > 0) { pull.x -= dx / d * over / 10; pull.z -= dz / d * over / 10; }
    if (p.y < SKY.LowY + yOff) pull.y += (SKY.LowY + yOff - p.y) / 6;
    if (p.y > SKY.HighY + yOff) pull.y -= (p.y - SKY.HighY - yOff) / 6;
    return pull;
  }
  function waypoint() {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * sky.r * .7;
    return V3(sky.center.x + Math.cos(a) * r, rnd(SKY.LowY + 2, SKY.HighY - 2) + yOff, sky.center.z + Math.sin(a) * r);
  }
  function freeBird() {
    let best = null, bd = Infinity;
    birds.forEach(b => { if (b.eaten || b.returning || b.held) return; const d = b.obj.position.distanceToSquared(sky.center); if (d < bd) { bd = d; best = b; } });
    return best;
  }
  let yOff = 0; // y data = y Unity − Center.y
  let dragons = [];
  function skyTick(dt) {
    sky.clock += dt;
    birdsTick(dt);
    feathersTick(dt);
    const f = sky.flight;
    if (f) return flightTick(f, dt);
    if (sky.clock < sky.next) return;
    sky.next = sky.clock + rnd(SKY.NextMin, SKY.NextMax);
    const pick = dragons.filter(d => d.winged && !d.inSky && d.alt < .2);
    if (!pick.length) return;
    const who = pick[Math.floor(Math.random() * pick.length)];
    const chase = freeBird() && Math.random() < SKY.ChaseChance;
    const fwd = V3(Math.sin(who.yaw), 0, Math.cos(who.yaw));
    const fl = { d: who, phase: 'TakeOff', pos: who.pos.clone(), home: who.pos.clone(), vel: fwd.multiplyScalar(3).add(V3(0, 7, 0)), t: 0, len: 1.6, prey: null, way: null };
    if (chase) { fl.prey = freeBird(); fl.prey.held = true; fl.prey.vel = V3(0, 0, -1).applyQuaternion(fl.prey.obj.quaternion).multiplyScalar(SKY.BirdSpeed); }
    who.beginSky();
    sky.flight = fl;
  }
  function next(f, phase, len) { f.phase = phase; f.t = 0; f.len = len; }
  function flightTick(f, dt) {
    f.t += dt;
    const flatV = v => V3(v.x, 0, v.z);
    switch (f.phase) {
      case 'TakeOff':
        f.vel = moveTowards(f.vel, flatV(f.vel).normalize().multiplyScalar(SKY.Cruise * .6).add(V3(0, 5, 0)), 10 * dt);
        if (f.t >= f.len || f.pos.y >= SKY.LowY + yOff) { if (f.prey) next(f, 'Chase', rnd(SKY.ChaseMin, SKY.ChaseMax)); else { next(f, 'Roam', rnd(SKY.FreeMin, SKY.FreeMax)); f.way = waypoint(); } }
        break;
      case 'Roam':
        if (f.way.distanceTo(f.pos) < 7) f.way = waypoint();
        f.vel = steer(f.vel, f.way.clone().sub(f.pos).add(keep(f.pos)), SKY.Cruise, dt);
        if (f.t >= f.len) next(f, 'Home', 0);
        break;
      case 'Chase': {
        const b = f.prey, bp = b.obj.position, dist = bp.distanceTo(f.pos);
        let speed = dist > 22 ? SKY.Sprint : dist > 10 ? SKY.Cruise + 1.5 : SKY.Cruise;
        if (f.t >= f.len) speed = SKY.Sprint;
        f.vel = steer(f.vel, bp.clone().addScaledVector(b.vel, .35).sub(f.pos), speed, dt);
        f.d.bite(dist < 6);
        if ((f.t >= f.len && dist < SKY.CatchR * 1.6) || f.t >= f.len + 10) { eat(b); f.prey = null; next(f, 'Feast', 2.2); f.d.anim.play('Gigit', true); }
        break;
      }
      case 'Feast':
        f.vel = moveTowards(f.vel, V3(0, .5, 0), 14 * dt);
        f.d.bite(f.t < .8);
        if (f.t > 1.2 && f.t - dt <= 1.2) f.d.anim.play('Mengaum', true);
        if (f.t >= f.len) next(f, 'Home', 0);
        break;
      case 'Home': {
        const above = f.home.clone().add(V3(0, 9, 0));
        f.vel = steer(f.vel, above.clone().sub(f.pos).addScaledVector(keep(f.pos), .3), SKY.Cruise, dt);
        if (flatV(above.clone().sub(f.pos)).length() < 4) next(f, 'Land', 0);
        break;
      }
      case 'Land': {
        const to = f.home.clone().sub(f.pos);
        f.vel = moveTowards(f.vel, to.clone().normalize().multiplyScalar(clamp(to.length() * 1.2, 1.5, 6)), 12 * dt);
        if (to.length() < .25 || f.t > 6) { f.d.landed(f.home); sky.flight = null; return; }
        break;
      }
    }
    f.pos.addScaledVector(f.vel, dt);
    if (f.phase !== 'Land' && f.phase !== 'TakeOff') f.pos.y = Math.max(f.pos.y, 3 + yOff);
    if (f.d.anim.cur === 'Mengaum') { f.d.pos.copy(f.pos); f.d.apply(); } else f.d.skyPose(f.pos, f.vel, dt);
  }

  // burung: balok putih + paruh jingga + dua sayap berengsel (sama dengan ModularIslands.Birds)
  function makeBird() {
    const white = new T.MeshLambertMaterial({ color: 0xffffff }), wingM = new T.MeshLambertMaterial({ color: new T.Color(.92, .94, .96) });
    const beak = new T.MeshBasicMaterial({ color: new T.Color(1, .6, .15) }), box = (w, h, d, m, x, y, z, par) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); par.add(o); return o; };
    const b = new T.Object3D();
    box(.7, .55, 1.4, white, 0, 0, 0, b); box(.5, .5, .5, white, 0, .25, .8, b); box(.2, .15, .3, beak, 0, .2, 1.15, b);
    const wl = new T.Object3D(); wl.position.set(-.35, .1, 0); b.add(wl); box(1.7, .1, .8, wingM, -.85, 0, 0, wl);
    const wr = new T.Object3D(); wr.position.set(.35, .1, 0); b.add(wr); box(1.7, .1, .8, wingM, .85, 0, 0, wr);
    scene.add(b);
    return { obj: b, wl, wr };
  }
  // jalur putar (ruang lokal pulau Unity) → dunia
  function orbitPoint(b, t) {
    const a = t * b.speed * DEG + b.phase;
    return V3(b.center[0] + Math.cos(a) * b.radius, b.center[1] + b.height + Math.sin(a * 2) * 1.5, b.center[2] + Math.sin(a) * b.radius);
  }
  const unityLocal = (frame, v) => V3(v.x, v.y, -v.z).applyMatrix4(frame);
  function birdsTick(dt) {
    birds.forEach(b => {
      if (b.eaten) {
        if (sky.clock < b.respawnAt) return;
        // burung baru keluar dari perut awan acak, lalu terbang masuk ke jalur putarnya
        const c = clouds.length ? clouds[Math.floor(Math.random() * clouds.length)] : null;
        b.obj.position.copy(c ? c.obj.position.clone().add(V3(0, -3, 0)) : sky.center.clone().add(V3(0, SKY.HighY + 15 + yOff, 0)));
        b.obj.visible = true; b.vel = V3(0, -4, 0); b.eaten = false; b.returning = true;
        return;
      }
      if (b.returning) {
        const goal = unityLocal(b.frame, orbitPoint(b, life.time)), to = goal.clone().sub(b.obj.position);
        if (to.length() < 1.5) { b.returning = false; b.held = false; return; }
        b.vel = steer(b.vel, to, clamp(to.length(), 4, SKY.BirdSpeed), dt);
        moveBird(b, dt, 16);
        return;
      }
      if (b.held && sky.flight && sky.flight.prey === b) {
        const fl = sky.flight, away = b.obj.position.clone().sub(fl.pos);
        if (away.lengthSq() < 1e-4) away.set(0, 0, 1);
        away.normalize();
        const side = V3(0, 1, 0).cross(away), c = sky.clock;
        const jink = Math.sin(c * 1.9 + b.phase) + .5 * Math.sin(c * 4.3);
        const want = away.multiplyScalar(1.1).addScaledVector(side, jink * .9).add(V3(0, Math.sin(c * 1.1) * .35, 0)).add(keep(b.obj.position));
        const speed = fl.phase === 'TakeOff' ? SKY.BirdSpeed * .7 : fl.t < fl.len ? SKY.BirdSpeed : SKY.BirdTired;
        b.vel = steer(b.vel, want, speed, dt);
        moveBird(b, dt, 16);
        return;
      }
      if (b.held) { b.returning = true; return; }
      // jalur putar biasa (IslandLife)
      const p = unityLocal(b.frame, orbitPoint(b, life.time)), prev = b.obj.position.clone();
      b.obj.position.copy(p);
      const v = p.clone().sub(prev);
      if (v.lengthSq() > 1e-6) orient(b, v, -15 * Math.sign(b.speed) * DEG);
      flap(b, 9, 35);
    });
  }
  function orient(b, v, roll) {
    const m = new T.Matrix4().lookAt(V3(0, 0, 0), v.clone().normalize().negate(), V3(0, 1, 0));
    b.obj.quaternion.setFromRotationMatrix(m);
    if (roll) b.obj.rotateZ(roll);
  }
  function flap(b, speed, deg) { const a = Math.sin(life.time * speed + b.phase) * deg * DEG; b.wl.rotation.z = a; b.wr.rotation.z = -a; }
  function moveBird(b, dt, speed) {
    b.obj.position.addScaledVector(b.vel, dt);
    if (b.vel.lengthSq() > .01) orient(b, b.vel, 0);
    flap(b, speed, 45);
  }
  function eat(b) {
    const at = b.obj.position.clone();
    b.obj.visible = false; b.eaten = true; b.returning = false; b.held = false;
    b.respawnAt = sky.clock + rnd(SKY.RespawnMin, SKY.RespawnMax);
    if (!featherGeo) { featherGeo = new T.BoxGeometry(.5, .08, .9); featherMat = new T.MeshBasicMaterial({ color: new T.Color(.95, .96, .98) }); }
    for (let i = 0; i < 9; i++) {
      const o = new T.Mesh(featherGeo, featherMat); o.position.copy(at); o.rotation.set(rnd(0, 6.3), rnd(0, 6.3), rnd(0, 6.3)); scene.add(o);
      feathers.push({ o, vel: V3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(0, 6)).add(V3(0, 3, 0)), life: 1.6 + Math.random() * .6 });
    }
  }
  function feathersTick(dt) {
    for (let i = feathers.length - 1; i >= 0; i--) {
      const f = feathers[i]; f.life -= dt;
      if (f.life <= 0) { scene.remove(f.o); feathers.splice(i, 1); continue; }
      f.vel = moveTowards(f.vel, V3(0, -1.5, 0), 6 * dt);
      f.o.position.addScaledVector(f.vel, dt);
      f.o.rotateX(140 * DEG * dt); f.o.rotateY(90 * DEG * dt);
      f.o.scale.setScalar(Math.min(1, f.life * 1.5));
    }
  }

  // ---------- IslandLife & awan ----------
  const life = { time: 0, groups: [] };
  const toThreeQ = (x, y, z, w) => new T.Quaternion(-x, -y, z, w);
  function lifeTick(dt) {
    life.time += dt;
    const t = life.time;
    life.groups.forEach(g => {
      const o = g.root, p = g.p;
      switch (g.k) {
        case 'orbit': {
          const a = t * p.speed * DEG + p.phase;
          o.position.set(p.center[0] + Math.cos(a) * p.radius, p.center[1] + p.height + Math.sin(t * .9 + p.phase) * .8, -(p.center[2] + Math.sin(a) * p.radius));
          o.quaternion.copy(toThreeQ(0, Math.sin(-a * .25), 0, Math.cos(-a * .25)));
          break;
        }
        case 'drop': {
          const u = ((t * p.speed + p.phase) % 1 + 1) % 1;
          o.position.set(p.top[0] + p.out[0] * u * 2.2, p.top[1] + p.out[1] * u * 2.2 - u * u * p.length, -(p.top[2] + p.out[2] * u * 2.2));
          o.scale.setScalar(.55 + (.2 - .55) * u);
          break;
        }
        case 'puff': {
          const u = ((t / p.life + p.phase) % 1 + 1) % 1;
          o.position.set(p.origin[0] + Math.sin(u * 5 + p.phase * 9) * (.4 + u * 1.4), p.origin[1] + u * 6, -(p.origin[2] + u * 2.2));
          o.scale.setScalar(Math.sin(u * Math.PI) * (.5 + u * .8));
          break;
        }
        case 'flutter': {
          const a = t * .8 + p.phase;
          o.position.set(p.center[0] + Math.sin(a * 1.3) * p.radius, p.center[1] + 2.2 + Math.sin(a * 3.1) * .9, -(p.center[2] + Math.cos(a * .9) * p.radius));
          o.rotation.set(0, -a * 70 * DEG, 0);
          const fl = Math.sin(t * 22 + p.phase * 5) * 60 * DEG;
          if (g.wl) g.wl.rotation.z = fl; if (g.wr) g.wr.rotation.z = -fl;
          break;
        }
        case 'spin':
          o.quaternion.multiply(new T.Quaternion().setFromAxisAngle(V3(p.axis[0], p.axis[1], -p.axis[2]).normalize(), -p.speed * DEG * dt));
          break;
        case 'pulse': {
          const k = Math.sin(t * p.speed + p.phase);
          o.scale.set(p.scale[0], p.scale[1], p.scale[2]).multiplyScalar(1 + k * p.amp);
          o.position.set(p.pos[0], p.pos[1] + k * p.bob, -p.pos[2]);
          break;
        }
      }
    });
  }

  const clouds = [];
  function cloudsTick(dt) {
    const range = 260, half = range / 2, fadeW = 30;
    clouds.forEach(c => {
      c.t += dt;
      const x = ((c.phase + c.t * c.speed) % range + range) % range - half;
      let fade = smooth(clamp((half - Math.abs(x)) / fadeW, 0, 1));
      c.obj.position.set(x, c.height * .75 + Math.sin(c.t * .16 + c.phase) * .8 - cy, -c.z * .45);
      // seperti di VR: awan yang melintas di antara mata dan pulau memudar. Di layar datar awan dekat kamera menutupi seluruh
      // gambar (tampak berkabut), jadi semua awan di sisi kamera (lebih dekat dari jarak kamera–pusat pulau) dihilangkan
      fade *= smooth(clamp((c.obj.position.distanceTo(cam.position) / focus - .82) / .18, 0, 1));
      // muncul/hilang dengan MENGECIL, bukan transparan: awan setengah tembus di atas latar gelap tampak seperti panel abu-abu
      c.obj.visible = fade > .04;
      c.obj.scale.setScalar(c.size * (.2 + .8 * fade));
      const op = c.alpha * Math.min(1, fade * 4);
      c.mats.forEach(m => { m.opacity = op; });
    });
  }
  const smooth = u => u * u * (3 - 2 * u);
  let cy = 0, focus = 1;

  // ---------- kamera: putar pelan + seret ----------
  // Seret ke kiri/kanan sama ringannya: selama & sesaat sesudah diseret putaran otomatis berhenti (dulu tetap mendorong ke satu
  // arah, jadi memutar melawannya terasa tertahan), lalu kembali pelan searah putaran terakhir pengguna. Luncuran sesudah
  // dilepas memakai kecepatan seret yang dihaluskan; jari diam sebelum dilepas = tidak meluncur.
  const view = { theta: .55, phi: 1.1, r: 150, target: V3(0, 2, 0), vel: 0, drag: null, auto: reduce ? 0 : .045, dir: 1, autoK: 1, idle: 99 };
  stage.addEventListener('pointerdown', e => {
    view.drag = { x: e.clientX, y: e.clientY, theta: view.theta, phi: view.phi, t: performance.now(), moved: false };
    view.vel = 0; view.autoK = 0;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', e => {
    const d = view.drag; if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
    d.moved = true;
    const now = performance.now(), nt = d.theta - dx * .006;
    view.vel = view.vel * .6 + (nt - view.theta) / Math.max(.008, (now - d.t) / 1000) * .4;
    d.t = now;
    view.theta = nt;
    view.phi = clamp(d.phi - dy * .004, .7, 1.32);
  });
  const end = e => {
    if (!view.drag) return;
    if (performance.now() - view.drag.t > 90) view.vel = 0;
    view.vel = clamp(view.vel, -2.5, 2.5);
    if (Math.abs(view.vel) > .05) view.dir = Math.sign(view.vel);
    view.idle = 0;
    view.drag = null;
    try { stage.releasePointerCapture(e.pointerId); } catch (x) { /* sudah lepas */ }
  };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);

  let wide = false;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 700 ? 1.5 : 1.75));
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    // layar lebar: pulau di sisi kanan, teks hero di kiri
    wide = w >= 960;
    view.r = wide ? 150 : 215; // layar sempit: pulau utuh di panggung yang lebih tegak
    if (wide) cam.setViewOffset(w, h, -w * .2, 0, w, h); else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  // ---------- rakit dunia ----------
  function build(data) {
    D = data;
    cy = data.cy || 0;
    yOff = -cy;
    const loader = new T.TextureLoader();
    const tex = (data.tex || []).map(n => { const t = loader.load('/assets/hero/' + n); t.anisotropy = 4; return t; });
    geos = data.meshes.map(geometry);
    mats = data.mats.map(d => material(d, tex, false));
    vcMats = data.mats.map(d => material(d, tex, true));

    // benda diam digabung per material (seperti static batching di game): ratusan simpul → beberapa puluh draw call
    const buckets = new Map(), tv = new T.Vector3(), nm = new T.Matrix3();
    data.nodes.forEach(n => {
      const g = geos[n[0]], M = mat12(n[2], 0), a = g.attributes, idx = g.index.array;
      nm.getNormalMatrix(M);
      const pos = a.position.array, nor = a.normal && a.normal.array, uv = a.uv && a.uv.array, col = a.color && a.color.array;
      (g.groups.length ? g.groups : [{ start: 0, count: idx.length, materialIndex: 0 }]).forEach(gr => {
        const mi = n[1][Math.min(gr.materialIndex, n[1].length - 1)], key = mi + '|' + (col ? 1 : 0) + '|' + (uv ? 1 : 0);
        let b = buckets.get(key);
        if (!b) buckets.set(key, b = { mi, vc: !!col, pos: [], nor: [], uv: uv ? [] : null, col: col ? [] : null, idx: [], n: 0 });
        const remap = new Map();
        for (let i = gr.start; i < gr.start + gr.count; i++) {
          const v = idx[i];
          let r = remap.get(v);
          if (r === undefined) {
            r = b.n++; remap.set(v, r);
            tv.fromArray(pos, v * 3).applyMatrix4(M); b.pos.push(tv.x, tv.y, tv.z);
            if (nor) { tv.fromArray(nor, v * 3).applyMatrix3(nm).normalize(); b.nor.push(tv.x, tv.y, tv.z); } else b.nor.push(0, 1, 0);
            if (uv) b.uv.push(uv[v * 2], uv[v * 2 + 1]);
            if (col) b.col.push(col[v * 3], col[v * 3 + 1], col[v * 3 + 2]);
          }
          b.idx.push(r);
        }
      });
    });
    buckets.forEach(b => {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new T.Float32BufferAttribute(b.nor, 3));
      if (b.uv) g.setAttribute('uv', new T.Float32BufferAttribute(b.uv, 2));
      if (b.col) g.setAttribute('color', new T.Float32BufferAttribute(b.col, 3));
      g.setIndex(new T.BufferAttribute(b.n > 65535 ? new Uint32Array(b.idx) : new Uint16Array(b.idx), 1));
      scene.add(new T.Mesh(g, (b.vc ? vcMats : mats)[b.mi]));
    });

    // gerak-gerik pulau (IslandLife): tiap kelompok = bingkai pulau + simpul yang digerakkan
    (data.groups || []).forEach(g => {
      const frame = new T.Object3D(); frame.matrixAutoUpdate = false; frame.matrix.copy(mat12(g.frame, 0)); scene.add(frame);
      const root = new T.Object3D(); frame.add(root);
      const objs = tree(g.nodes, root);
      const r = g.root; root.position.set(r[0], r[1], r[2]); root.quaternion.set(r[3], r[4], r[5], r[6]); root.scale.set(r[7], r[8], r[9]);
      life.groups.push({ k: g.k, p: g.p, root, wl: g.wl >= 0 ? objs[g.wl] : null, wr: g.wr >= 0 ? objs[g.wr] : null });
    });

    // burung langit
    (data.birds || []).forEach(p => {
      const b = Object.assign(makeBird(), p, { frame: mat12(p.frame, 0), vel: V3(0, 0, 0), held: false, eaten: false, returning: false, respawnAt: 0 });
      birds.push(b);
    });

    // awan: jalur angin RanchScenery (28 awan), mode diorama
    if (data.clouds && data.clouds.length) {
      for (let i = 0; i < 28; i++) {
        const lane = Math.floor(i / 4), slot = i % 4, z = -210 + lane * 70, phase = slot * 160 + lane * 23;
        const src = data.clouds[i % 3 === 0 ? 0 : Math.min(1, data.clouds.length - 1)];
        const obj = new T.Object3D(), cm = [];
        src.forEach(n => {
          const ms = n[1].map(k => { const m = mats[k].clone(); m.transparent = true; m.depthWrite = false; cm.push(m); return m; });
          const o = new T.Mesh(geos[n[0]], ms.length > 1 ? ms : ms[0]); o.matrixAutoUpdate = false; o.matrix.copy(mat12(n[2], 0)); obj.add(o);
        });
        obj.rotation.y = Math.random() * Math.PI * 2;
        obj.scale.setScalar(.85 + Math.random() * .4);
        scene.add(obj);
        clouds.push({ obj, size: obj.scale.x, mats: cm, alpha: cm.length ? cm[0].opacity : 1, phase, z, speed: 2.5 + lane * .16, t: 0, height: 32 + Math.random() * 12 + (Math.abs(z) < 80 ? 35 : 0) });
      }
    }

    // naga di kandang (dari save pamer) + beberapa naga bersayap tambahan dari perakit yang sama, supaya langit lebih ramai
    const list = (data.dragons || []).slice();
    if (list.length) {
      // skala dunia naga game = baseScale perakit × k (sama untuk semua naga pulau)
      let k = .85;
      try { k = list.reduce((a, x) => a + x.s / N.buildDragon(N.parseCode(x.code), false, x.stage).baseScale, 0) / list.length; } catch (e) { /* kode gen lama: pakai k bawaan */ }
      for (let i = 0; list.filter(x => x.winged).length < 5 && i < 40; i++) {
        const g = N.roll(i % 3 ? 'Naga' : 'Campuran');
        if (g.Sayap === 'Tanpa') continue;
        const base = list[0], code = N.geneCode(g), d0 = N.buildDragon(g, false, 'Dewasa');
        list.push(Object.assign({}, base, { code, stage: 'Dewasa', level: 25, winged: true, s: d0.baseScale * k, yaw: Math.random() * 6.28 }));
      }
    }
    dragons = list.map((info, i) => { const d = new PenDragon(info, i); d.ground = info.p[1]; d.pen = info.pen; if (i >= (data.dragons || []).length) { d.pos.copy(d.randomIn()); d.apply(); } return d; });
    dragons.forEach(d => { d.mates = dragons.filter(m => m.pen === d.pen); });
    if (data.sky) { sky.center.set(data.sky[0], data.sky[1], data.sky[2]); sky.r = data.sky[3]; }

    if (data.view) { view.r = data.view.r; view.target.set(data.view.t[0], data.view.t[1], data.view.t[2]); }
    resize();
    // satu frame dulu, baru tampil (gambar statis disembunyikan sesudah kanvas siap)
    step(0); renderer.render(scene, cam);
    wrapEl.classList.add('has-3d');
    if (location.search.indexOf('hero-debug') >= 0) window.__hero = { scene, cam, view, sky, dragons, birds, clouds, renderer };
    requestAnimationFrame(loop);
  }

  let last = 0, visible = true, running = true;
  function step(dt) {
    if (!view.drag) {
      view.idle += dt;
      if (view.idle > 2.5) view.autoK = Math.min(1, view.autoK + dt / 2);
      view.theta += (view.auto * view.dir * view.autoK + view.vel) * dt;
      view.vel *= Math.pow(.08, dt);
    }
    const sp = Math.sin(view.phi);
    cam.position.set(view.target.x + view.r * sp * Math.sin(view.theta), view.target.y + view.r * Math.cos(view.phi), view.target.z + view.r * sp * Math.cos(view.theta));
    cam.lookAt(view.target);
    focus = Math.max(1, cam.position.distanceTo(view.target));
    if (reduce) dt = 0;
    lifeTick(dt);
    cloudsTick(dt);
    dragons.forEach(d => d.tick(dt));
    skyTick(dt);
  }
  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    if (!visible || document.hidden) { last = now; return; }
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
    last = now;
    step(dt);
    renderer.render(scene, cam);
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(stage);

  fetch('/assets/hero/island.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(build).catch(() => { running = false; });
})();
