// Ekspor scene pulau DraGen untuk hero 3D website (assets/hero/island.json).
// Cara pakai: Unity Play mode dengan save uji yang ramai, jalankan isi berkas ini lewat Unity MCP RunCommand.
// Hasil JSON masuk clipboard; simpan, lalu salin tekstur dari texPaths ke assets/hero/ dan hapus kunci texPaths.
// Koordinat: Three.js (z Unity dicerminkan), berpusat di RanchScenery.Center.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

internal class CommandScript : IRunCommand
{
    static readonly Matrix4x4 S = Matrix4x4.Scale(new Vector3(1, 1, -1));
    Vector3 C;
    Matrix4x4 W; // dunia Unity -> dunia Three
    readonly Dictionary<UnityEngine.Mesh, int> meshIx = new Dictionary<UnityEngine.Mesh, int>();
    readonly Dictionary<UnityEngine.Mesh, List<int>> combinedSubs = new Dictionary<UnityEngine.Mesh, List<int>>();
    readonly Dictionary<UnityEngine.Mesh, Dictionary<int, int>> combinedMats = new Dictionary<UnityEngine.Mesh, Dictionary<int, int>>();
    readonly List<string> meshJson = new List<string>();
    readonly Dictionary<string, int> matIx = new Dictionary<string, int>();
    readonly List<string> matJson = new List<string>();
    readonly List<string> texPaths = new List<string>();
    readonly HashSet<Transform> skip = new HashSet<Transform>();
    readonly List<string> nodes = new List<string>();
    int verts, renderers;
    static string F(float v) => Math.Round(v, 4).ToString(CultureInfo.InvariantCulture);
    static string Arr(IEnumerable<float> v) => "[" + string.Join(",", v.Select(F)) + "]";

    public void Execute(ExecutionResult result)
    {
        C = Naga.RanchScenery.Center;
        W = S * Matrix4x4.Translate(-C);
        var ranch = UnityEngine.Object.FindAnyObjectByType<Naga.Ranch>();

        // ---- yang TIDAK masuk ekspor diam ----
        var dragons = UnityEngine.Object.FindObjectsByType<Naga.WorldDragon>();
        foreach (var d in dragons) { skip.Add(d.transform); if (d.disc != null) skip.Add(d.disc); }
        var lives = UnityEngine.Object.FindObjectsByType<Naga.Proto.IslandLife>();
        foreach (var l in lives)
        {
            foreach (var x in l.orbiters) skip.Add(x.t); foreach (var x in l.drops) skip.Add(x.t); foreach (var x in l.puffs) skip.Add(x.t);
            foreach (var x in l.flyers) skip.Add(x.t); foreach (var x in l.flutters) skip.Add(x.t); foreach (var x in l.spins) skip.Add(x.t);
            foreach (var x in l.pulses) skip.Add(x.t); foreach (var x in l.walkers) skip.Add(x.t);
        }
        Transform cloudBig = null, cloudSmall = null;
        foreach (var t in UnityEngine.Object.FindObjectsByType<Transform>())
        {
            if (t.name.StartsWith("cloud_")) { skip.Add(t); if (t.name.StartsWith("cloud_big") && cloudBig == null) cloudBig = t; if (t.name.StartsWith("cloud_small") && cloudSmall == null) cloudSmall = t; }
            if (t.name == "Label" || t.name == "TandaMisi" || t.name == "CincinPilih" || t.name == "CincinSorot") skip.Add(t);
        }

        // ---- benda diam ----
        string[] roots = { "DuniaRanch", "Benda Menu VR", "Goa Naga", "Benteng Jaga Pulau" };
        foreach (var name in roots)
        {
            var go = GameObject.Find(name);
            if (go == null) continue;
            foreach (var r in go.GetComponentsInChildren<MeshRenderer>(false))
            {
                if (!Use(r)) continue;
                var mf = r.GetComponent<MeshFilter>();
                var mesh = mf.sharedMesh;
                if (r.isPartOfStaticBatch)
                {
                    // mesh gabungan (static batching) sudah di ruang dunia: satu simpul per mesh gabungan, submesh dipilih per renderer
                    if (!combinedSubs.ContainsKey(mesh)) { combinedSubs[mesh] = new List<int>(); combinedMats[mesh] = new Dictionary<int, int>(); }
                    var mats = r.sharedMaterials;
                    for (int k = 0; k < mats.Length; k++)
                    {
                        int sub = r.subMeshStartIndex + k;
                        if (sub >= mesh.subMeshCount || combinedMats[mesh].ContainsKey(sub)) continue;
                        combinedSubs[mesh].Add(sub);
                        combinedMats[mesh][sub] = Mat(mats[k], r);
                    }
                    renderers++;
                    continue;
                }
                int mi = MeshOf(mesh, null, false);
                if (mi < 0) continue;
                var m3 = W * r.transform.localToWorldMatrix * S;
                nodes.Add("[" + mi + "," + MatList(r, mesh) + "," + M12(m3) + "]");
                renderers++;
            }
        }
        foreach (var kv in combinedSubs)
        {
            var subs = kv.Value; subs.Sort();
            int mi = MeshOf(kv.Key, subs, true);
            if (mi < 0) continue;
            nodes.Add("[" + mi + ",[" + string.Join(",", subs.Select(s => combinedMats[kv.Key][s])) + "]," + M12(Matrix4x4.identity) + "]");
        }

        // ---- gerak-gerik pulau (IslandLife) ----
        var groups = new List<string>();
        var birds = new List<string>();
        foreach (var l in lives)
        {
            foreach (var x in l.drops) groups.Add(Group("drop", x.t, $"{{\"top\":{V(x.top)},\"out\":{V(x.outward)},\"length\":{F(x.length)},\"speed\":{F(x.speed)},\"phase\":{F(x.phase)}}}"));
            foreach (var x in l.puffs) groups.Add(Group("puff", x.t, $"{{\"origin\":{V(x.origin)},\"life\":{F(x.life)},\"phase\":{F(x.phase)}}}"));
            foreach (var x in l.orbiters) groups.Add(Group("orbit", x.t, $"{{\"center\":{V(x.center)},\"radius\":{F(x.radius)},\"height\":{F(x.height)},\"speed\":{F(x.speed)},\"phase\":{F(x.phase)}}}"));
            foreach (var x in l.flutters) groups.Add(Group("flutter", x.t, $"{{\"center\":{V(x.center)},\"radius\":{F(x.radius)},\"phase\":{F(x.phase)}}}", x.wingL, x.wingR));
            foreach (var x in l.spins) groups.Add(Group("spin", x.t, $"{{\"axis\":{V(x.axis)},\"speed\":{F(x.speed)}}}"));
            foreach (var x in l.pulses) groups.Add(Group("pulse", x.t, $"{{\"scale\":{V(x.baseScale)},\"pos\":{V(x.basePos)},\"amp\":{F(x.amp)},\"speed\":{F(x.speed)},\"bob\":{F(x.bob)},\"phase\":{F(x.phase)}}}"));
            foreach (var x in l.flyers)
            {
                // jalur putar dihitung di ruang lokal induk burung (Unity); bingkai = W · induk (tanpa cermin kanan: titik lokal dicerminkan di JS)
                var frame = W * x.t.parent.localToWorldMatrix * S;
                birds.Add($"{{\"center\":{V(x.center)},\"radius\":{F(x.radius)},\"height\":{F(x.height)},\"speed\":{F(x.speed)},\"phase\":{F(x.phase)},\"frame\":{M12(frame)}}}");
            }
        }

        // ---- awan: dua model (besar, kecil) relatif ke akarnya dengan skala RanchScenery.S ----
        var cloudJson = new List<string>();
        foreach (var root in new[] { cloudBig, cloudSmall })
        {
            if (root == null) continue;
            var rel = (Matrix4x4.TRS(root.position, root.rotation, Vector3.one * root.lossyScale.x)).inverse;
            var list = new List<string>();
            foreach (var r in root.GetComponentsInChildren<MeshRenderer>(true))
            {
                var mesh = r.GetComponent<MeshFilter>()?.sharedMesh; if (mesh == null) continue;
                int mi = MeshOf(mesh, null, false); if (mi < 0) continue;
                var local = S * Matrix4x4.Scale(Vector3.one * Naga.RanchScenery.S) * rel * r.transform.localToWorldMatrix * S;
                list.Add("[" + mi + "," + MatList(r, mesh) + "," + M12(local) + "]");
            }
            cloudJson.Add("[" + string.Join(",", list) + "]");
        }

        // ---- naga di kandang ----
        var dj = new List<string>();
        foreach (var d in dragons)
        {
            var od = ranch.Dragon(d.dragonId);
            if (od == null) continue;
            var p = d.transform.position; p.y = 0;
            var pt = W.MultiplyPoint3x4(p);
            var f = W.MultiplyVector(d.transform.forward);
            var zone = d.zone == null ? "[]" : "[" + string.Join(",", d.zone.Select(z => { var q = W.MultiplyPoint3x4(z); return "[" + F(q.x) + "," + F(q.z) + "]"; })) + "]";
            dj.Add($"{{\"code\":\"{od.code}\",\"stage\":\"{od.stage}\",\"level\":{od.level},\"winged\":{(d.Winged ? "true" : "false")},\"pen\":{od.pen},\"p\":{Arr(new[] { pt.x, pt.y, pt.z })},\"yaw\":{F(Mathf.Atan2(f.x, f.z))},\"zone\":{zone},\"zoneR\":{F(d.zoneR)},\"r\":{F(d.radius)},\"s\":{F(d.transform.lossyScale.x)}}}");
        }

        // ---- langit pulau (DragonSky.Sky, mode modular) ----
        Vector3 sc = Vector3.zero; int n = 0; float sr = 40;
        for (int i = 0; i < Naga.RanchScenery.PreviewIsle; i++) if (Naga.RanchScenery.IsleTiles(i).Count > 0) { sc += Naga.RanchScenery.IsleCenter(i); n++; }
        sc = n > 0 ? sc / n : C; sc.y = 0;
        for (int i = 0; i < Naga.RanchScenery.PreviewIsle; i++)
        {
            if (Naga.RanchScenery.IsleTiles(i).Count == 0) continue;
            var dd = Naga.RanchScenery.IsleCenter(i) - sc; dd.y = 0;
            sr = Mathf.Max(sr, dd.magnitude + Naga.RanchScenery.IsleRadius(i));
        }
        var skyT = W.MultiplyPoint3x4(sc);

        var sb = new StringBuilder();
        sb.Append("{\"v\":1,\"cy\":").Append(F(0));
        sb.Append(",\"tex\":[").Append(string.Join(",", texPaths.Select(t => "\"" + System.IO.Path.GetFileName(t) + "\""))).Append("]");
        sb.Append(",\"texPaths\":[").Append(string.Join(",", texPaths.Select(t => "\"" + t + "\""))).Append("]");
        sb.Append(",\"mats\":[").Append(string.Join(",", matJson)).Append("]");
        sb.Append(",\"meshes\":[").Append(string.Join(",", meshJson)).Append("]");
        sb.Append(",\"nodes\":[").Append(string.Join(",", nodes)).Append("]");
        sb.Append(",\"groups\":[").Append(string.Join(",", groups)).Append("]");
        sb.Append(",\"birds\":[").Append(string.Join(",", birds)).Append("]");
        sb.Append(",\"clouds\":[").Append(string.Join(",", cloudJson)).Append("]");
        sb.Append(",\"dragons\":[").Append(string.Join(",", dj)).Append("]");
        sb.Append(",\"sky\":").Append(Arr(new[] { skyT.x, skyT.y, skyT.z, sr }));
        sb.Append("}");
        GUIUtility.systemCopyBuffer = sb.ToString();
        result.Log($"renderer {renderers}, mesh {meshJson.Count}, vertex {verts}, simpul {nodes.Count}, material {matJson.Count}, tekstur {texPaths.Count}, gerak {groups.Count}, burung {birds.Count}, awan {cloudJson.Count}, naga {dj.Count}, langit {sc}/{sr}, ukuran JSON {sb.Length / 1024} KB");
        foreach (var t in texPaths) result.Log("tekstur: " + t);
    }

    bool Use(Renderer r)
    {
        if (!r.enabled || r.forceRenderingOff || !r.gameObject.activeInHierarchy) return false;
        if (r.GetComponent<TMPro.TextMeshPro>() != null) return false;
        var mf = r.GetComponent<MeshFilter>(); if (mf == null || mf.sharedMesh == null) return false;
        foreach (var m in r.sharedMaterials) if (m != null && m.shader != null && m.shader.name.Contains("TextMeshPro")) return false;
        for (var t = r.transform; t != null; t = t.parent) if (skip.Contains(t)) return false;
        return true;
    }

    string V(Vector3 v) => Arr(new[] { v.x, v.y, v.z });
    static string M12(Matrix4x4 m) => Arr(new[] { m.m00, m.m01, m.m02, m.m03, m.m10, m.m11, m.m12, m.m13, m.m20, m.m21, m.m22, m.m23 });

    string MatList(Renderer r, UnityEngine.Mesh mesh)
    {
        var mats = r.sharedMaterials;
        var ix = new List<int>();
        for (int k = 0; k < mesh.subMeshCount; k++) ix.Add(Mat(mats[Mathf.Min(k, mats.Length - 1)], r));
        return "[" + string.Join(",", ix) + "]";
    }

    int Mat(Material m, Renderer r)
    {
        if (m == null) return Mat(new Material(Shader.Find("Universal Render Pipeline/Lit")), r);
        Color c = m.HasProperty("_BaseColor") ? m.GetColor("_BaseColor") : m.HasProperty("_Color") ? m.GetColor("_Color") : Color.white;
        if (r != null && r.HasPropertyBlock())
        {
            var mpb = new MaterialPropertyBlock(); r.GetPropertyBlock(mpb);
            if (mpb.HasColor("_BaseColor")) c = mpb.GetColor("_BaseColor"); else if (mpb.HasColor("_Color")) c = mpb.GetColor("_Color");
        }
        Texture tex = m.HasProperty("_BaseMap") ? m.GetTexture("_BaseMap") : m.HasProperty("_MainTex") ? m.GetTexture("_MainTex") : null;
        int ti = -1;
        if (tex != null)
        {
            var path = AssetDatabase.GetAssetPath(tex);
            if (!string.IsNullOrEmpty(path) && path.StartsWith("Assets/"))
            {
                ti = texPaths.IndexOf(path);
                if (ti < 0) { texPaths.Add(path); ti = texPaths.Count - 1; }
            }
        }
        bool transparent = m.HasProperty("_Surface") && m.GetFloat("_Surface") > .5f;
        bool unlit = m.shader != null && m.shader.name.ToLowerInvariant().Contains("unlit");
        string e = "0";
        if (m.IsKeywordEnabled("_EMISSION") && m.HasProperty("_EmissionColor"))
        {
            var ec = m.GetColor("_EmissionColor");
            if (ec.maxColorComponent > .01f) e = Arr(new[] { Mathf.Min(1, ec.r), Mathf.Min(1, ec.g), Mathf.Min(1, ec.b) });
        }
        string json = $"{{\"c\":{Arr(new[] { c.r, c.g, c.b, transparent ? c.a : 1 })},\"t\":{ti},\"e\":{e},\"u\":{(unlit ? 1 : 0)}}}";
        if (!matIx.TryGetValue(json, out int i)) { i = matJson.Count; matIx[json] = i; matJson.Add(json); }
        return i;
    }

    // world = true: verteks sudah di ruang dunia (mesh gabungan) → dipindah ke ruang Three di sini, simpul memakai identitas
    int MeshOf(UnityEngine.Mesh mesh, List<int> subs, bool world)
    {
        if (!world && meshIx.TryGetValue(mesh, out int known)) return known;
        Vector3[] v; Vector3[] nrm; Vector2[] uv; Color32[] col;
        try { v = mesh.vertices; nrm = mesh.normals; uv = mesh.uv; col = mesh.colors32; }
        catch { return -1; }
        if (v == null || v.Length == 0) return -1;
        var pos = new Vector3[v.Length];
        var nr = new Vector3[v.Length];
        for (int i = 0; i < v.Length; i++)
        {
            pos[i] = world ? W.MultiplyPoint3x4(v[i]) : new Vector3(v[i].x, v[i].y, -v[i].z);
            if (nrm != null && nrm.Length == v.Length) nr[i] = world ? W.MultiplyVector(nrm[i]).normalized : new Vector3(nrm[i].x, nrm[i].y, -nrm[i].z);
        }
        if (subs == null) { subs = new List<int>(); for (int k = 0; k < mesh.subMeshCount; k++) subs.Add(k); }
        var idx = new List<int>(); var groups = new List<string>();
        foreach (int k in subs)
        {
            var tri = mesh.GetTriangles(k);
            int start = idx.Count;
            for (int i = 0; i + 2 < tri.Length; i += 3) { idx.Add(tri[i]); idx.Add(tri[i + 2]); idx.Add(tri[i + 1]); } // cermin → balik urutan
            groups.Add("[" + start + "," + (idx.Count - start) + "]");
        }
        // hanya verteks yang dipakai (mesh gabungan memuat semua benda, termasuk yang dilewati)
        var remap = new Dictionary<int, int>(); var keep = new List<int>();
        for (int i = 0; i < idx.Count; i++) { if (!remap.TryGetValue(idx[i], out int ni)) { ni = keep.Count; remap[idx[i]] = ni; keep.Add(idx[i]); } idx[i] = ni; }
        if (keep.Count == 0) return -1;
        Vector3 mn = Vector3.one * float.MaxValue, mx = Vector3.one * float.MinValue;
        foreach (int i in keep) { mn = Vector3.Min(mn, pos[i]); mx = Vector3.Max(mx, pos[i]); }
        var span = mx - mn; span.x = Mathf.Max(span.x, 1e-5f); span.y = Mathf.Max(span.y, 1e-5f); span.z = Mathf.Max(span.z, 1e-5f);
        var pb = new byte[keep.Count * 6];
        for (int j = 0; j < keep.Count; j++)
        {
            var p = pos[keep[j]];
            Put16(pb, j * 3 + 0, (p.x - mn.x) / span.x); Put16(pb, j * 3 + 1, (p.y - mn.y) / span.y); Put16(pb, j * 3 + 2, (p.z - mn.z) / span.z);
        }
        var sb = new StringBuilder();
        sb.Append("{\"q\":").Append(Arr(new[] { mn.x, mn.y, mn.z, mx.x, mx.y, mx.z }));
        sb.Append(",\"p\":\"").Append(Convert.ToBase64String(pb)).Append("\"");
        if (nrm != null && nrm.Length == v.Length)
        {
            var nb = new byte[keep.Count * 3];
            for (int j = 0; j < keep.Count; j++) { var q = nr[keep[j]]; nb[j * 3] = (byte)(sbyte)Mathf.RoundToInt(q.x * 127); nb[j * 3 + 1] = (byte)(sbyte)Mathf.RoundToInt(q.y * 127); nb[j * 3 + 2] = (byte)(sbyte)Mathf.RoundToInt(q.z * 127); }
            sb.Append(",\"n\":\"").Append(Convert.ToBase64String(nb)).Append("\"");
        }
        if (uv != null && uv.Length == v.Length)
        {
            Vector2 a = Vector2.one * float.MaxValue, b = Vector2.one * float.MinValue;
            foreach (int i in keep) { a = Vector2.Min(a, uv[i]); b = Vector2.Max(b, uv[i]); }
            var us = b - a; us.x = Mathf.Max(us.x, 1e-6f); us.y = Mathf.Max(us.y, 1e-6f);
            var ub = new byte[keep.Count * 4];
            for (int j = 0; j < keep.Count; j++) { var u = uv[keep[j]]; Put16(ub, j * 2, (u.x - a.x) / us.x); Put16(ub, j * 2 + 1, (u.y - a.y) / us.y); }
            sb.Append(",\"u\":\"").Append(Convert.ToBase64String(ub)).Append("\",\"uq\":").Append(Arr(new[] { a.x, a.y, b.x, b.y }));
        }
        if (col != null && col.Length == v.Length && col.Any(c => c.r < 250 || c.g < 250 || c.b < 250))
        {
            var cb = new byte[keep.Count * 4];
            for (int j = 0; j < keep.Count; j++) { var c = col[keep[j]]; cb[j * 4] = c.r; cb[j * 4 + 1] = c.g; cb[j * 4 + 2] = c.b; cb[j * 4 + 3] = c.a; }
            sb.Append(",\"c\":\"").Append(Convert.ToBase64String(cb)).Append("\"");
        }
        bool wide = keep.Count > 65535;
        var ib = new byte[idx.Count * (wide ? 4 : 2)];
        for (int i = 0; i < idx.Count; i++) { if (wide) BitConverter.GetBytes(idx[i]).CopyTo(ib, i * 4); else BitConverter.GetBytes((ushort)idx[i]).CopyTo(ib, i * 2); }
        sb.Append(",\"i\":\"").Append(Convert.ToBase64String(ib)).Append("\",\"w\":").Append(wide ? 32 : 16);
        sb.Append(",\"g\":[").Append(string.Join(",", groups)).Append("]}");
        meshJson.Add(sb.ToString());
        verts += keep.Count;
        int ix = meshJson.Count - 1;
        if (!world) meshIx[mesh] = ix;
        return ix;
    }

    static void Put16(byte[] b, int i, float u) { ushort s = (ushort)Mathf.Clamp(Mathf.RoundToInt(u * 65535), 0, 65535); b[i * 2] = (byte)(s & 255); b[i * 2 + 1] = (byte)(s >> 8); }

    // kelompok animasi: bingkai = induk t (dunia Three, dengan cermin kanan), akar = TRS lokal t (dicerminkan), simpul = keturunan t
    string Group(string kind, Transform t, string p, Transform wl = null, Transform wr = null)
    {
        var frame = W * t.parent.localToWorldMatrix * S;
        var list = new List<Transform>();
        var nodesG = new List<string>();
        void Walk(Transform x, int parent)
        {
            var r = x.GetComponent<MeshRenderer>();
            var mf = x.GetComponent<MeshFilter>();
            int mi = -1; string mats = "[]";
            if (x != t && r != null && mf != null && mf.sharedMesh != null && r.enabled) { mi = MeshOf(mf.sharedMesh, null, false); if (mi >= 0) mats = MatList(r, mf.sharedMesh); }
            int me = parent;
            if (x != t)
            {
                me = list.Count; list.Add(x);
                var lp = x.localPosition; var lq = x.localRotation; var ls = x.localScale;
                nodesG.Add($"[{parent},{mi},{mats},{Arr(new[] { lp.x, lp.y, -lp.z, -lq.x, -lq.y, lq.z, lq.w, ls.x, ls.y, ls.z })}]");
            }
            foreach (Transform c in x) Walk(c, me);
        }
        // t sendiri juga punya mesh? jadikan simpul anak tanpa geser
        var rt = t.GetComponent<MeshRenderer>(); var mft = t.GetComponent<MeshFilter>();
        if (rt != null && mft != null && mft.sharedMesh != null && rt.enabled)
        {
            int mi = MeshOf(mft.sharedMesh, null, false);
            if (mi >= 0) { list.Add(t); nodesG.Add($"[-1,{mi},{MatList(rt, mft.sharedMesh)},[0,0,0,0,0,0,1,1,1,1]]"); }
        }
        foreach (Transform c in t) Walk(c, -1);
        var tp = t.localPosition; var tq = t.localRotation; var ts = t.localScale;
        return $"{{\"k\":\"{kind}\",\"p\":{p},\"frame\":{M12(frame)},\"root\":{Arr(new[] { tp.x, tp.y, -tp.z, -tq.x, -tq.y, tq.z, tq.w, ts.x, ts.y, ts.z })},\"nodes\":[{string.Join(",", nodesG)}],\"wl\":{(wl != null ? list.IndexOf(wl) : -1)},\"wr\":{(wr != null ? list.IndexOf(wr) : -1)}}}";
    }
}
