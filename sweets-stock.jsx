import { useState, useEffect, useRef, useMemo } from "react";

/* ---------- ثوابت ---------- */
const CATS = {
  "نواعم": { a: "#FF9DBB", b: "#EE4F86", edge: "#A92F5C", icon: "🌸" },
  "تورت": { a: "#BFA8FF", b: "#7C5CF2", edge: "#4C33AE", icon: "🎂" },
  "جاتوه عادي": { a: "#FFC978", b: "#F3931C", edge: "#A9650B", icon: "🍰" },
  "جاتوه إسبيشيال": { a: "#FF8585", b: "#DC3348", edge: "#9A1D2F", icon: "🍓" },
  "ديسباسيتو": { a: "#67E0CF", b: "#17A091", edge: "#0F6E63", icon: "🍫" },
  "حلويات شرقية": { a: "#F6D661", b: "#CC9508", edge: "#8C6704", icon: "🥮" },
  "بسكويت وكحك": { a: "#D6A47B", b: "#95602F", edge: "#5E3A18", icon: "🍪" },
};
const CAT_NAMES = Object.keys(CATS);
const RATES = {
  high: { label: "استهلاك عالٍ", short: "عالٍ", low: 0.5, w: 3 },
  mid: { label: "استهلاك متوسط", short: "متوسط", low: 0.35, w: 2 },
  low: { label: "استهلاك بطيء", short: "بطيء", low: 0.25, w: 1 },
};
const STATUS = {
  out: { label: "نفد", bg: "#D92D3F", fg: "#fff" },
  low: { label: "قليل", bg: "#FFB020", fg: "#4A2E00" },
  ok: { label: "متوفر", bg: "#22B573", fg: "#fff" },
};

let _id = 1;
const mk = (name, cat, target, rate, unit = "قطعة") => ({ id: "i" + _id++, name, cat, target, rate, unit, qty: 0 });
const STARTER = [
  mk("بسكوت نشادر", "بسكويت وكحك", 20, "high", "علبة"),
  mk("منين سادة", "بسكويت وكحك", 20, "high", "علبة"),
  mk("منين سمسم", "بسكويت وكحك", 20, "high", "علبة"),
  mk("قرص عجوة", "بسكويت وكحك", 20, "high", "علبة"),
  mk("غريبة", "بسكويت وكحك", 12, "mid", "علبة"),
  mk("كحك بالملبن", "بسكويت وكحك", 10, "low", "علبة"),
  mk("ميني شو", "نواعم", 24, "high"),
  mk("ميني إكلير", "نواعم", 24, "mid"),
  mk("ميني تارت فواكه", "نواعم", 18, "mid"),
  mk("بيتي فور", "نواعم", 30, "high"),
  mk("تورت شيكولاتة", "تورت", 4, "mid", "تورتة"),
  mk("تورت فراولة", "تورت", 4, "mid", "تورتة"),
  mk("تورت فانيليا", "تورت", 3, "low", "تورتة"),
  mk("جاتوه شيكولاتة", "جاتوه عادي", 12, "high"),
  mk("جاتوه فانيليا", "جاتوه عادي", 12, "mid"),
  mk("جاتوه كراميل", "جاتوه عادي", 10, "mid"),
  mk("ريد فيلفيت", "جاتوه إسبيشيال", 8, "mid"),
  mk("أوريو", "جاتوه إسبيشيال", 8, "high"),
  mk("سان سباستيان", "جاتوه إسبيشيال", 6, "low"),
  mk("ديسباسيتو نوتيلا", "ديسباسيتو", 10, "high", "كوب"),
  mk("ديسباسيتو لوتس", "ديسباسيتو", 10, "high", "كوب"),
  mk("ديسباسيتو فراولة", "ديسباسيتو", 8, "mid", "كوب"),
  mk("بسبوسة", "حلويات شرقية", 16, "high"),
  mk("كنافة", "حلويات شرقية", 12, "mid"),
  mk("بقلاوة", "حلويات شرقية", 14, "mid"),
  mk("basbousa قشطة", "حلويات شرقية", 10, "low"),
].map((x) => (x.name === "basbousa قشطة" ? { ...x, name: "بسبوسة بالقشطة" } : x));

/* ---------- دوال مساعدة ---------- */
const lowLevel = (it) => Math.max(1, Math.ceil(it.target * RATES[it.rate].low));
const statusOf = (it) => (it.qty <= 0 ? "out" : it.qty <= lowLevel(it) ? "low" : "ok");
const needOf = (it) => Math.max(0, it.target - it.qty);
const priorityOf = (it) => (needOf(it) / Math.max(1, it.target)) * RATES[it.rate].w;

function fileToB64(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, 1400 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const d = c.toDataURL("image/jpeg", 0.82).split(",")[1];
      URL.revokeObjectURL(url);
      res(d);
    };
    img.onerror = () => rej(new Error("تعذر قراءة الصورة"));
    img.src = url;
  });
}

async function scanPhotos(files, scopeItems) {
  const images = await Promise.all(files.map(fileToB64));
  const list = scopeItems.map((i) => `- ${i.name} (${i.cat}, unit: ${i.unit})`).join("\n");
  const prompt = `You are the stock counter for an Egyptian sweets shop. The photos show display cases, shelves or trays.
Catalog to look for:
${list}

For each catalog item that is visible, estimate how many units are on display (count cakes as whole cakes, slices/pieces as pieces, biscuit or kahk boxes/bags as boxes/bags, cups as cups). Match by appearance and any labels. If photos overlap, do not double count. Omit catalog items you cannot see.
Return ONLY compact JSON, no markdown: {"counts":{"<exact catalog name>":number},"unknown":["short Arabic description of sweets visible but not in the catalog"]}`;
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            ...images.map((data) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } })),
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });
  const data = await response.json();
  const text = (data.content || []).map((c) => (c.type === "text" ? c.text : "")).join("");
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  return { counts: parsed.counts || {}, unknown: parsed.unknown || [] };
}

/* ---------- الأنماط ---------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@500;700;900&display=swap');
.sw{--ink:#3B1F2B;--paper:#FFF4F8;font-family:'Cairo','Tajawal',system-ui,sans-serif;color:var(--ink);min-height:100vh;
 background:radial-gradient(900px 500px at 100% -10%,#FFD6E6 0,transparent 60%),radial-gradient(800px 500px at -10% 10%,#D9CCFF 0,transparent 55%),#FFF4F8;padding-bottom:110px}
.sw *{box-sizing:border-box}
.sw button{font-family:inherit;cursor:pointer;border:0}
.sw input,.sw select,.sw textarea{font-family:inherit;font-size:16px}
.sw-top{padding:18px 16px 6px;display:flex;align-items:center;justify-content:space-between;gap:10px}
.sw-top h1{margin:0;font-size:24px;font-weight:900}
.sw-top p{margin:2px 0 0;font-size:13px;opacity:.7}
.sw-sum{display:flex;gap:10px;padding:8px 16px;overflow-x:auto}
.sw-pill{flex:1;min-width:92px;border-radius:18px;padding:10px 12px;text-align:center;color:#fff;font-weight:900;
 box-shadow:0 5px 0 rgba(0,0,0,.22),0 12px 18px -8px rgba(0,0,0,.35),inset 0 2px 0 rgba(255,255,255,.4)}
.sw-pill b{display:block;font-size:26px;line-height:1.1}
.sw-pill span{font-size:12px;font-weight:700}
.sw-tabs{display:flex;gap:8px;padding:10px 16px;position:sticky;top:0;z-index:5;background:linear-gradient(#FFF4F8 70%,transparent)}
.sw-tab{flex:1;padding:11px 6px;border-radius:16px;font-weight:900;font-size:15px;background:#fff;color:var(--ink);
 box-shadow:0 4px 0 #E4C9D6,0 8px 14px -6px rgba(90,30,60,.3);transition:transform .12s,box-shadow .12s}
.sw-tab[aria-selected=true]{background:linear-gradient(160deg,#5B2A44,#3B1F2B);color:#fff;transform:translateY(3px);box-shadow:0 1px 0 #1d0f16,0 4px 8px -4px rgba(0,0,0,.4)}
.sw-tools{padding:4px 16px 8px;display:flex;flex-direction:column;gap:8px}
.sw-search{width:100%;padding:11px 14px;border-radius:14px;border:2px solid #F0CFDD;background:#fff;color:var(--ink)}
.sw-chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}
.sw-chip{flex:none;padding:7px 13px;border-radius:999px;background:#fff;color:var(--ink);font-weight:700;font-size:14px;box-shadow:0 3px 0 #E4C9D6}
.sw-chip[aria-pressed=true]{background:var(--ink);color:#fff;box-shadow:0 3px 0 #000}
.sw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(165px,1fr));gap:20px 14px;padding:10px 16px;perspective:900px}
.sw-card{position:relative;border-radius:24px;padding:12px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.28);
 background:linear-gradient(150deg,var(--a),var(--b));
 box-shadow:0 9px 0 var(--edge),0 22px 26px -8px rgba(40,10,25,.5),inset 0 3px 0 rgba(255,255,255,.55),inset 0 -14px 24px rgba(0,0,0,.1);
 transform-style:preserve-3d;transition:transform .15s ease-out;will-change:transform}
.sw-card:before{content:"";position:absolute;inset:0;border-radius:24px;background:radial-gradient(120px 70px at 20% 0,rgba(255,255,255,.45),transparent 70%);pointer-events:none}
.sw-ic{font-size:30px;line-height:1;transform:translateZ(30px);filter:drop-shadow(0 6px 4px rgba(0,0,0,.3))}
.sw-nm{margin:6px 0 0;font-size:16px;font-weight:900;line-height:1.25;min-height:40px;transform:translateZ(18px)}
.sw-badge{position:absolute;top:10px;left:10px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;text-shadow:none;box-shadow:0 2px 0 rgba(0,0,0,.25)}
.sw-rate{font-size:11px;opacity:.92;font-weight:700}
.sw-well{margin-top:8px;border-radius:16px;padding:8px;background:rgba(255,255,255,.93);color:var(--ink);text-shadow:none;
 box-shadow:inset 0 3px 6px rgba(0,0,0,.18);transform:translateZ(10px)}
.sw-q{display:flex;align-items:center;justify-content:space-between;gap:4px}
.sw-q b{font-size:26px;font-weight:900;min-width:40px;text-align:center}
.sw-step{width:36px;height:36px;border-radius:12px;font-size:22px;font-weight:900;color:#fff;background:linear-gradient(160deg,var(--a),var(--b));
 box-shadow:0 3px 0 var(--edge);text-shadow:none;line-height:1}
.sw-step:active{transform:translateY(3px);box-shadow:0 0 0 var(--edge)}
.sw-gauge{height:8px;border-radius:99px;background:#EADCE3;margin-top:6px;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,.2)}
.sw-gauge i{display:block;height:100%;border-radius:99px}
.sw-meta{display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-top:4px;opacity:.8}
.sw-edit{position:absolute;bottom:-2px;left:8px;background:none;color:inherit;font-size:11px;opacity:.85;text-shadow:inherit;display:none}
.sw-list{padding:8px 16px;display:flex;flex-direction:column;gap:14px}
.sw-row{display:flex;align-items:center;gap:10px;border-radius:20px;padding:10px 12px;background:#fff;
 box-shadow:0 6px 0 var(--edge),0 14px 18px -8px rgba(40,10,25,.4),inset 4px 0 0 var(--b)}
.sw-row h4{margin:0;font-size:16px;font-weight:900}
.sw-row small{font-size:12px;opacity:.75;font-weight:700}
.sw-row .grow{flex:1;min-width:0}
.sw-need{min-width:64px;text-align:center;border-radius:14px;padding:6px 8px;font-weight:900;color:#fff;background:linear-gradient(160deg,var(--a),var(--b));box-shadow:0 3px 0 var(--edge)}
.sw-need b{display:block;font-size:22px;line-height:1}
.sw-need span{font-size:11px}
.sw-num{width:64px;text-align:center;padding:8px 4px;border-radius:12px;border:2px solid #E7CBD8;font-weight:900;color:var(--ink);background:#fff}
.sw-fab{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:10;display:flex;gap:12px}
.sw-btn{padding:14px 20px;border-radius:20px;font-weight:900;font-size:16px;color:#fff;background:linear-gradient(160deg,#FF6FA3,#D92B6B);
 box-shadow:0 6px 0 #8E1747,0 16px 22px -8px rgba(0,0,0,.5),inset 0 2px 0 rgba(255,255,255,.45)}
.sw-btn:active{transform:translateY(5px);box-shadow:0 1px 0 #8E1747}
.sw-btn.alt{background:linear-gradient(160deg,#6E8BFF,#3D55D6);box-shadow:0 6px 0 #22308F,0 16px 22px -8px rgba(0,0,0,.5),inset 0 2px 0 rgba(255,255,255,.45)}
.sw-btn.green{background:linear-gradient(160deg,#39D98A,#0E9E5B);box-shadow:0 6px 0 #076B3D,0 16px 22px -8px rgba(0,0,0,.5),inset 0 2px 0 rgba(255,255,255,.45)}
.sw-btn.ghost{background:#fff;color:var(--ink);box-shadow:0 5px 0 #E4C9D6}
.sw-btn.sm{padding:9px 14px;font-size:14px;border-radius:14px}
.sw-mask{position:fixed;inset:0;background:rgba(40,10,25,.55);z-index:20;display:flex;align-items:flex-end;justify-content:center}
.sw-sheet{width:100%;max-width:560px;max-height:88vh;overflow:auto;background:#FFF9FB;border-radius:28px 28px 0 0;padding:18px 16px 26px;box-shadow:0 -12px 30px rgba(0,0,0,.35)}
.sw-sheet h3{margin:0 0 10px;font-size:20px;font-weight:900}
.sw-f{display:flex;flex-direction:column;gap:4px;margin-bottom:10px;font-weight:700;font-size:14px}
.sw-f input,.sw-f select,.sw-f textarea{padding:10px 12px;border-radius:12px;border:2px solid #E7CBD8;background:#fff;color:var(--ink)}
.sw-toast{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:40;background:var(--ink);color:#fff;padding:10px 18px;border-radius:14px;font-weight:700;box-shadow:0 8px 20px rgba(0,0,0,.4)}
.sw-empty{padding:40px 24px;text-align:center;font-weight:700;opacity:.8}
.sw-err{background:#FFE3E6;color:#8E1230;border-radius:14px;padding:10px 12px;font-weight:700;margin:8px 0}
.sw-spin{display:inline-block;width:18px;height:18px;border-radius:50%;border:3px solid #fff;border-top-color:transparent;animation:sws .8s linear infinite;vertical-align:middle;margin-inline-end:8px}
@keyframes sws{to{transform:rotate(360deg)}}
.sw button:focus-visible,.sw input:focus-visible,.sw select:focus-visible{outline:3px solid #3D55D6;outline-offset:2px}
@media (prefers-reduced-motion:reduce){.sw-card,.sw-tab{transition:none}.sw-spin{animation:none}}
`;

/* ---------- بطاقة صنف ثلاثية الأبعاد ---------- */
function ItemCard({ it, onQty, onEdit }) {
  const ref = useRef(null);
  const c = CATS[it.cat] || CATS["نواعم"];
  const st = STATUS[statusOf(it)];
  const pct = Math.min(100, Math.round((it.qty / Math.max(1, it.target)) * 100));
  const tilt = (e) => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg) translateY(-3px)`;
  };
  const reset = () => ref.current && (ref.current.style.transform = "");
  return (
    <div
      ref={ref}
      className="sw-card"
      style={{ "--a": c.a, "--b": c.b, "--edge": c.edge }}
      onPointerMove={tilt}
      onPointerLeave={reset}
      onPointerUp={reset}
    >
      <span className="sw-badge" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
      <div className="sw-ic">{c.icon}</div>
      <p className="sw-nm">{it.name}</p>
      <div className="sw-rate">{it.cat} · {RATES[it.rate].short}</div>
      <div className="sw-well">
        <div className="sw-q">
          <button className="sw-step" aria-label={`إنقاص ${it.name}`} onClick={() => onQty(it.id, Math.max(0, it.qty - 1))}>−</button>
          <b>{it.qty}</b>
          <button className="sw-step" aria-label={`زيادة ${it.name}`} onClick={() => onQty(it.id, it.qty + 1)}>+</button>
        </div>
        <div className="sw-gauge"><i style={{ width: pct + "%", background: st.bg }} /></div>
        <div className="sw-meta">
          <span>المطلوب {it.target} {it.unit}</span>
          <button onClick={() => onEdit(it)} style={{ background: "none", color: "var(--ink)", fontWeight: 900, fontSize: 12, textDecoration: "underline" }}>تعديل</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- التطبيق ---------- */
export default function SweetsStock() {
  const [items, setItems] = useState(STARTER);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("stock");
  const [cat, setCat] = useState("الكل");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null); // item | {isNew}
  const [scan, setScan] = useState(null); // {scope, files, loading, error, result}
  const [feed, setFeed] = useState({}); // id -> amount
  const [share, setShare] = useState(false);
  const [toast, setToast] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("sweets-stock-v1");
        if (r && r.value) setItems(JSON.parse(r.value));
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try { await window.storage.set("sweets-stock-v1", JSON.stringify(items)); } catch (e) {}
    })();
  }, [items, loaded]);

  const say = (m) => { setToast(m); setTimeout(() => setToast(""), 2200); };
  const setQty = (id, qty) => setItems((L) => L.map((i) => (i.id === id ? { ...i, qty } : i)));

  const counts = useMemo(() => {
    const c = { out: 0, low: 0, ok: 0 };
    items.forEach((i) => c[statusOf(i)]++);
    return c;
  }, [items]);

  const shown = useMemo(
    () => items.filter((i) => (cat === "الكل" || i.cat === cat) && i.name.includes(q.trim())),
    [items, cat, q]
  );
  const shortages = useMemo(
    () =>
      items
        .filter((i) => statusOf(i) !== "ok")
        .sort((a, b) => priorityOf(b) - priorityOf(a) || RATES[b.rate].w - RATES[a.rate].w),
    [items]
  );
  const feedList = useMemo(
    () => [...items].sort((a, b) => RATES[b.rate].w - RATES[a.rate].w || statusOf(b).localeCompare(statusOf(a)) || a.name.localeCompare(b.name, "ar")),
    [items]
  );

  /* حفظ صنف */
  const saveItem = (d) => {
    if (!d.name.trim()) return say("اكتب اسم الصنف");
    if (d.isNew) setItems((L) => [...L, { id: "n" + Date.now(), name: d.name.trim(), cat: d.cat, target: +d.target || 1, rate: d.rate, unit: d.unit || "قطعة", qty: 0 }]);
    else setItems((L) => L.map((i) => (i.id === d.id ? { ...i, name: d.name.trim(), cat: d.cat, target: +d.target || 1, rate: d.rate, unit: d.unit || "قطعة" } : i)));
    setEdit(null);
  };
  const delItem = (id) => { setItems((L) => L.filter((i) => i.id !== id)); setEdit(null); };

  /* تصوير */
  const startScan = () => setScan({ scope: "الكل", files: [], loading: false, error: "", result: null });
  const runScan = async () => {
    const scopeItems = items.filter((i) => scan.scope === "الكل" || i.cat === scan.scope);
    setScan((s) => ({ ...s, loading: true, error: "" }));
    try {
      const { counts: cts, unknown } = await scanPhotos(scan.files, scopeItems);
      const rows = scopeItems.map((i) => ({ id: i.id, name: i.name, seen: cts[i.name] != null, qty: Math.max(0, Math.round(+cts[i.name] || 0)) }));
      setScan((s) => ({ ...s, loading: false, result: { rows, unknown } }));
    } catch (e) {
      setScan((s) => ({ ...s, loading: false, error: "تعذر تحليل الصور. جرّب صورة أوضح أو أقل عددًا من الأصناف." }));
    }
  };
  const applyScan = () => {
    const map = Object.fromEntries(scan.result.rows.map((r) => [r.id, r.qty]));
    setItems((L) => L.map((i) => (map[i.id] != null ? { ...i, qty: map[i.id] } : i)));
    setScan(null);
    setTab("short");
    say("تم تحديث الكميات");
  };

  /* تغذية */
  const applyFeed = () => {
    const n = Object.values(feed).filter((v) => v > 0).length;
    if (!n) return say("أدخل كميات التغذية أولًا");
    setItems((L) => L.map((i) => (feed[i.id] > 0 ? { ...i, qty: i.qty + feed[i.id] } : i)));
    setFeed({});
    setTab("stock");
    say(`تمت تغذية ${n} صنف`);
  };
  const fillAll = () => {
    const f = {};
    items.forEach((i) => { if (needOf(i) > 0) f[i.id] = needOf(i); });
    setFeed(f);
  };

  const shareText = useMemo(() => {
    const d = new Date().toLocaleDateString("ar-EG");
    const lines = shortages.map((i) => `• ${i.name} — الموجود ${i.qty} / المطلوب ${i.target} — ناقص ${needOf(i)} ${i.unit}${i.rate === "high" ? " 🔥" : ""}`);
    return `نواقص المحل ${d}\n\n${lines.join("\n") || "لا توجد نواقص 🎉"}`;
  }, [shortages]);

  return (
    <div className="sw" dir="rtl">
      <style>{CSS}</style>
      {toast && <div className="sw-toast" role="status">{toast}</div>}

      <header className="sw-top">
        <div>
          <h1>مخزون المحل</h1>
          <p>صوّر الفاترينة وشوف النواقص فورًا</p>
        </div>
        <button className="sw-btn ghost sm" onClick={() => setEdit({ isNew: true, name: "", cat: CAT_NAMES[0], target: 10, rate: "mid", unit: "قطعة" })}>+ صنف</button>
      </header>

      <div className="sw-sum">
        {["out", "low", "ok"].map((k) => (
          <div key={k} className="sw-pill" style={{ background: `linear-gradient(160deg,${STATUS[k].bg},${STATUS[k].bg}cc)`, color: STATUS[k].fg }}>
            <b>{counts[k]}</b><span>{STATUS[k].label}</span>
          </div>
        ))}
      </div>

      <nav className="sw-tabs" role="tablist">
        {[["stock", "المخزون"], ["short", `النواقص (${shortages.length})`], ["feed", "التغذية"]].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className="sw-tab" onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>

      {/* ----- المخزون ----- */}
      {tab === "stock" && (
        <>
          <div className="sw-tools">
            <input className="sw-search" placeholder="ابحث عن صنف" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="sw-chips">
              {["الكل", ...CAT_NAMES].map((c) => (
                <button key={c} className="sw-chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
              ))}
            </div>
          </div>
          {shown.length === 0 ? (
            <div className="sw-empty">لا توجد أصناف مطابقة. أضف صنفًا من زر «+ صنف».</div>
          ) : (
            <div className="sw-grid">
              {shown.map((it) => <ItemCard key={it.id} it={it} onQty={setQty} onEdit={(x) => setEdit({ ...x })} />)}
            </div>
          )}
        </>
      )}

      {/* ----- النواقص ----- */}
      {tab === "short" && (
        <>
          <div className="sw-tools" style={{ flexDirection: "row" }}>
            <button className="sw-btn green sm" onClick={() => setShare(true)}>نسخ / إرسال القائمة</button>
          </div>
          {shortages.length === 0 ? (
            <div className="sw-empty">كل الأصناف متوفرة 🎉<br />صوّر الفاترينة لتحديث الكميات.</div>
          ) : (
            <div className="sw-list">
              {shortages.map((i) => {
                const c = CATS[i.cat]; const st = STATUS[statusOf(i)];
                return (
                  <div key={i.id} className="sw-row" style={{ "--a": c.a, "--b": c.b, "--edge": c.edge }}>
                    <span style={{ fontSize: 28 }}>{c.icon}</span>
                    <div className="grow">
                      <h4>{i.name} {i.rate === "high" && "🔥"}</h4>
                      <small>{i.cat} · موجود {i.qty} من {i.target}</small>
                    </div>
                    <span className="sw-badge" style={{ position: "static", background: st.bg, color: st.fg }}>{st.label}</span>
                    <div className="sw-need"><b>{needOf(i)}</b><span>{i.unit}</span></div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ----- التغذية ----- */}
      {tab === "feed" && (
        <>
          <div className="sw-tools" style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <button className="sw-btn alt sm" onClick={fillAll}>املأ كل النواقص للهدف</button>
            <button className="sw-btn ghost sm" onClick={() => setFeed({})}>مسح</button>
          </div>
          <div className="sw-list">
            {feedList.map((i) => {
              const c = CATS[i.cat]; const st = STATUS[statusOf(i)]; const v = feed[i.id] || 0;
              return (
                <div key={i.id} className="sw-row" style={{ "--a": c.a, "--b": c.b, "--edge": c.edge }}>
                  <div className="grow">
                    <h4>{i.name}</h4>
                    <small style={{ color: st.bg === "#FFB020" ? "#9A6400" : st.bg }}>{st.label} · موجود {i.qty} · ناقص {needOf(i)} {i.unit} · {RATES[i.rate].short}</small>
                  </div>
                  <button className="sw-step" style={{ "--a": c.a, "--b": c.b, "--edge": c.edge }} onClick={() => setFeed({ ...feed, [i.id]: Math.max(0, v - 1) })} aria-label="إنقاص">−</button>
                  <input className="sw-num" inputMode="numeric" value={v || ""} placeholder="0" onChange={(e) => setFeed({ ...feed, [i.id]: Math.max(0, parseInt(e.target.value) || 0) })} aria-label={`كمية تغذية ${i.name}`} />
                  <button className="sw-step" style={{ "--a": c.a, "--b": c.b, "--edge": c.edge }} onClick={() => setFeed({ ...feed, [i.id]: v + 1 })} aria-label="زيادة">+</button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ----- أزرار عائمة ----- */}
      <div className="sw-fab">
        {tab === "feed" ? (
          <button className="sw-btn green" onClick={applyFeed}>تأكيد التغذية</button>
        ) : (
          <button className="sw-btn" onClick={startScan}>📷 صوّر الأصناف</button>
        )}
      </div>

      {/* ----- شاشة التصوير ----- */}
      {scan && (
        <div className="sw-mask" onClick={(e) => e.target === e.currentTarget && !scan.loading && setScan(null)}>
          <div className="sw-sheet">
            <h3>تصوير الفاترينة</h3>
            {!scan.result ? (
              <>
                <div className="sw-f">
                  القسم الذي تصوّره
                  <select value={scan.scope} onChange={(e) => setScan({ ...scan, scope: e.target.value })}>
                    {["الكل", ...CAT_NAMES].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" hidden
                  onChange={(e) => setScan({ ...scan, files: [...scan.files, ...Array.from(e.target.files)].slice(0, 6) })} />
                <button className="sw-btn alt sm" onClick={() => fileRef.current.click()}>+ أضف صورة ({scan.files.length}/6)</button>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
                  {scan.files.map((f, idx) => (
                    <div key={idx} style={{ position: "relative" }}>
                      <img src={URL.createObjectURL(f)} alt="" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 14, boxShadow: "0 4px 0 #E4C9D6" }} />
                      <button aria-label="حذف الصورة" onClick={() => setScan({ ...scan, files: scan.files.filter((_, j) => j !== idx) })}
                        style={{ position: "absolute", top: -6, left: -6, width: 24, height: 24, borderRadius: 99, background: "#D92D3F", color: "#fff", fontWeight: 900 }}>×</button>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 13, opacity: 0.75, margin: "0 0 10px" }}>الأصناف التي لا تظهر في الصور داخل القسم المختار تُحسب «نفدت». اختر القسم بدقة إن صوّرت جزءًا فقط.</p>
                {scan.error && <div className="sw-err">{scan.error}</div>}
                <button className="sw-btn" disabled={!scan.files.length || scan.loading} style={{ width: "100%", opacity: scan.files.length ? 1 : 0.5 }} onClick={runScan}>
                  {scan.loading ? <><span className="sw-spin" />جارٍ العدّ...</> : "حلّل الصور"}
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, opacity: 0.75, margin: "0 0 10px" }}>راجع الأعداد وعدّلها قبل التطبيق. العدّ من الصور تقريبي.</p>
                <div className="sw-list" style={{ padding: 0 }}>
                  {scan.result.rows.map((r, idx) => {
                    const it = items.find((x) => x.id === r.id); const c = CATS[it.cat];
                    return (
                      <div key={r.id} className="sw-row" style={{ "--a": c.a, "--b": c.b, "--edge": c.edge, padding: "8px 10px" }}>
                        <div className="grow"><h4 style={{ fontSize: 15 }}>{r.name}</h4><small>{r.seen ? "ظهر في الصور" : "لم يظهر"}</small></div>
                        <input className="sw-num" inputMode="numeric" value={r.qty}
                          onChange={(e) => {
                            const rows = scan.result.rows.map((x, j) => (j === idx ? { ...x, qty: Math.max(0, parseInt(e.target.value) || 0) } : x));
                            setScan({ ...scan, result: { ...scan.result, rows } });
                          }} />
                      </div>
                    );
                  })}
                </div>
                {scan.result.unknown.length > 0 && (
                  <div style={{ marginTop: 12, fontSize: 14, fontWeight: 700 }}>
                    أصناف ظهرت وليست في القائمة: {scan.result.unknown.join("، ")}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button className="sw-btn green" style={{ flex: 1 }} onClick={applyScan}>تطبيق الكميات</button>
                  <button className="sw-btn ghost" onClick={() => setScan({ ...scan, result: null })}>رجوع</button>
                </div>
              </>
            )}
            {!scan.loading && <button className="sw-btn ghost sm" style={{ marginTop: 12 }} onClick={() => setScan(null)}>إغلاق</button>}
          </div>
        </div>
      )}

      {/* ----- تعديل / إضافة صنف ----- */}
      {edit && (
        <div className="sw-mask" onClick={(e) => e.target === e.currentTarget && setEdit(null)}>
          <div className="sw-sheet">
            <h3>{edit.isNew ? "صنف جديد" : "تعديل الصنف"}</h3>
            <label className="sw-f">الاسم<input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
            <label className="sw-f">القسم
              <select value={edit.cat} onChange={(e) => setEdit({ ...edit, cat: e.target.value })}>{CAT_NAMES.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <label className="sw-f" style={{ flex: 1 }}>الكمية المطلوبة<input inputMode="numeric" value={edit.target} onChange={(e) => setEdit({ ...edit, target: e.target.value })} /></label>
              <label className="sw-f" style={{ flex: 1 }}>الوحدة<input value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} /></label>
            </div>
            <label className="sw-f">معدل الاستهلاك
              <select value={edit.rate} onChange={(e) => setEdit({ ...edit, rate: e.target.value })}>
                {Object.entries(RATES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <p style={{ fontSize: 12, opacity: 0.7, margin: "0 0 12px" }}>الأصناف عالية الاستهلاك تُنبَّه أبكر (عند نصف الكمية) وتظهر أولًا في النواقص.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="sw-btn green" style={{ flex: 1 }} onClick={() => saveItem(edit)}>حفظ</button>
              {!edit.isNew && <button className="sw-btn ghost" style={{ color: "#B3122B" }} onClick={() => delItem(edit.id)}>حذف</button>}
            </div>
          </div>
        </div>
      )}

      {/* ----- مشاركة القائمة ----- */}
      {share && (
        <div className="sw-mask" onClick={(e) => e.target === e.currentTarget && setShare(false)}>
          <div className="sw-sheet">
            <h3>قائمة النواقص</h3>
            <textarea readOnly rows={10} style={{ width: "100%", padding: 10, borderRadius: 12, border: "2px solid #E7CBD8" }} value={shareText} onFocus={(e) => e.target.select()} />
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button className="sw-btn alt" style={{ flex: 1 }} onClick={async () => { try { await navigator.clipboard.writeText(shareText); say("تم النسخ"); } catch (e) { say("حدّد النص وانسخه يدويًا"); } }}>نسخ</button>
              <a className="sw-btn green" style={{ flex: 1, textAlign: "center", textDecoration: "none" }} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}>واتساب</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
