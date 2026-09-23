"use strict";

// สีหลักตาม palette ของทีม
const PALETTE = {
  amber: "#E3A008",
  teal: "#3FA796",
  coral: "#E8735F",
  sage: "#7FB685",
  sky: "#5FA8D3",
  lilac: "#B892D8",
  bone: "#F1ECE1",
};

const NOTE_COLORS = ["amber", "teal", "coral", "sage", "sky", "lilac", "bone"];

const PEN_COLORS = ["amber", "bone", "teal", "coral", "sage", "sky", "lilac"];

const USER_COLORS = ["teal", "coral", "sage", "sky", "lilac", "amber"];

const CNAME = {
  amber: "เหลือง",
  teal: "เขียวอมฟ้า",
  coral: "ส้มแดง",
  sage: "เขียว",
  sky: "ฟ้า",
  lilac: "ม่วง",
  bone: "ขาวนวล",
};

const EMOJIS = ["👍", "❤️", "😀", "🎉", "✅", "❓", "💡", "🔥", "⭐", "👀"];

const BGS = {
  slate: {
    c: "#1E2530",
    light: false,
    n: "Slate",
  },
  bone: {
    c: "#F7F3EA",
    light: true,
    n: "Bone",
  },
  sun: {
    c: "#FBEFB3",
    light: true,
    n: "Sunny",
  },
};

const isLight = (b) => !!(BGS[b && b.bg] || BGS.slate).light;

const bgColor = (b) => (BGS[b && b.bg] || BGS.slate).c;

const colOn = (k, light) => (light && (k === "bone" || !k) ? "#1E2530" : PALETTE[k] || PALETTE.bone);

const $ = (s, r = document) => r.querySelector(s);

const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const TAB_ID = uid();

const P = "mcb_";

// เก็บข้อมูลใน localStorage ไปก่อน ยังไม่มี backend
const store = {
  get(k, d = null) {
    try {
      const v = localStorage.getItem(P + k);
      return v == null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(P + k, JSON.stringify(v));
      return true;
    } catch (e) {
      toast("พื้นที่จัดเก็บของเบราว์เซอร์เต็ม ลองลบรูปภาพขนาดใหญ่ออกจากบอร์ด");
      return false;
    }
  },
  del(k) {
    try {
      localStorage.removeItem(P + k);
    } catch (e) {}
  },
  keys(prefix) {
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(P + prefix)) out.push(k.slice(P.length));
      }
    } catch (e) {}
    return out;
  },
};

const sess = {
  get(k) {
    try {
      return JSON.parse(sessionStorage.getItem(P + k));
    } catch (e) {
      return null;
    }
  },
  set(k, v) {
    try {
      sessionStorage.setItem(P + k, JSON.stringify(v));
    } catch (e) {}
  },
  del(k) {
    try {
      sessionStorage.removeItem(P + k);
    } catch (e) {}
  },
};

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("on"), 2600);
}

function initials(name) {
  name = (name || "?").trim();
  const parts = name.split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

function colorFor(email) {
  let h = 0;
  for (const c of email || "") h = (h * 31 + c.charCodeAt(0)) | 0;
  return USER_COLORS[Math.abs(h) % USER_COLORS.length];
}

function avatarHTML(u, extra = "") {
  return `<span class="avatar" style="background:${PALETTE[u.color || colorFor(u.email)]};${extra}" title="${esc(u.name || u.email)}">${esc(initials(u.name || u.email))}</span>`;
}

function ago(t) {
  const s = (Date.now() - t) / 1e3;
  if (s < 60) return "เมื่อสักครู่";
  if (s < 3600) return Math.floor(s / 60) + " นาทีที่แล้ว";
  if (s < 86400) return Math.floor(s / 3600) + " ชม.ที่แล้ว";
  const d = Math.floor(s / 86400);
  if (d === 1) return "เมื่อวาน";
  if (d < 7) return d + " วันที่แล้ว";
  if (d < 30) return Math.floor(d / 7) + " สัปดาห์ที่แล้ว";
  return Math.floor(d / 30) + " เดือนที่แล้ว";
}

const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

// firebase auth (ถ้าใส่ config แล้ว)
const fbCfg = window.FIREBASE_CONFIG || {};
const FB = !!(window.firebase && fbCfg.apiKey);
let auth = null;
if (FB) {
  firebase.initializeApp(fbCfg);
  auth = firebase.auth();
  auth.languageCode = "th";
  // เก็บ session แยกแต่ละแท็บ จะได้เปิดสองแท็บเป็นคนละคนได้ตอนเดโม
  auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
}

let me = sess.get("user") || (FB ? null : store.get("last_user"));

if (me) sess.set("user", me);

function setUser(u) {
  me = u;
  sess.set("user", u);
  if (!FB) store.set("last_user", u);
}

function logout() {
  if (me) leavePresence();
  if (CLOUD) cloudStop();
  if (FB) auth.signOut();
  me = null;
  sess.del("user");
  store.del("last_user");
  go("/");
  toast("ออกจากระบบแล้ว");
}

function getBoard(id) {
  if (CLOUD) return cloudBoard(id);
  return store.get("board_" + id);
}

function allBoards() {
  if (CLOUD) return Object.keys(cloud.index || {}).map(cloudBoard).filter(Boolean);
  return store
    .keys("board_")
    .map((k) => store.get(k))
    .filter(Boolean);
}

function putBoard(b) {
  if (CLOUD) return cloudPut(b);
  return store.set("board_" + b.id, b);
}

// ---------- เก็บข้อมูลบน Firebase Realtime Database ----------
// ทุกเครื่องเห็นบอร์ดเดียวกัน ข้อมูลในเครื่องเป็นแค่ cache ที่ sync กับ server ตลอด
const CLOUD = FB && !!firebase.database;
let db = null,
  cloudAuthed = false,
  srvOffset = 0;
const cloud = { boards: {}, subs: {}, index: null, idxOff: null, ready: false, email: null, presence: {}, presOff: null, presRef: null };
const ekey = (e) => (e || "").toLowerCase().replace(/\./g, ",");
const nowS = () => Date.now() + srvOffset;

if (CLOUD) {
  db = firebase
    .app()
    .database(fbCfg.databaseURL || `https://${fbCfg.projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`);
  db.ref(".info/serverTimeOffset").on("value", (s) => (srvOffset = s.val() || 0));
}

// ตัด undefined / null / ของว่างออก (Realtime Database ไม่เก็บค่าพวกนี้) จะได้เทียบกับของบน server ได้ตรง
function clean(v) {
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === "object") {
    const o = {};
    for (const k of Object.keys(v).sort()) {
      const c = clean(v[k]);
      if (c === undefined || c === null) continue;
      if (typeof c === "object" && !Array.isArray(c) && !Object.keys(c).length) continue;
      if (Array.isArray(c) && !c.length) continue;
      o[k] = c;
    }
    return o;
  }
  return v === undefined ? null : v;
}
const same = (a, b) => JSON.stringify(clean(a ?? null)) === JSON.stringify(clean(b ?? null));

function cloudSub(id) {
  if (cloud.subs[id]) return;
  const c = (cloud.boards[id] = { meta: null, access: {}, objects: {}, timer: null, got: 0, waiters: [] });
  const ref = db.ref("boards/" + id);
  cloud.subs[id] = ["meta", "access", "objects", "timer"].map((part, i) => {
    const r = ref.child(part);
    const cb = r.on(
      "value",
      (snap) => {
        c[part] = snap.val() || (part === "meta" || part === "timer" ? null : {});
        c.got |= 1 << i;
        cloudChanged(id, part);
      },
      () => {
        c.got |= 1 << i;
        c.denied = true;
        cloudChanged(id, part);
      },
    );
    return () => r.off("value", cb);
  });
}

function cloudUnsub(id) {
  (cloud.subs[id] || []).forEach((off) => off());
  delete cloud.subs[id];
  delete cloud.boards[id];
}

const cloudLoaded = (id) => !!cloud.boards[id] && cloud.boards[id].got === 15;

function whenLoaded(id, fn) {
  cloudSub(id);
  if (cloudLoaded(id)) fn();
  else cloud.boards[id].waiters.push(fn);
}

let dashT = null,
  lastTimerEnd = {};
function cloudChanged(id, part) {
  const c = cloud.boards[id];
  if (!c) return;
  if (cloudLoaded(id) && c.waiters.length) c.waiters.splice(0).forEach((f) => f());
  checkReady();
  if (B && B.id === id) {
    if (part === "timer") {
      const t = c.timer;
      if (t && t.end > nowS() && lastTimerEnd[id] !== t.end && t.by !== me.name) toast(t.by + " เริ่มจับเวลา " + t.dur + " นาที");
      lastTimerEnd[id] = t ? t.end : 0;
      tickTimer();
    } else if (drag || editing) pendingRemote = true;
    else pullRemote();
  }
  if ($("#v-dash").classList.contains("on")) {
    clearTimeout(dashT);
    dashT = setTimeout(renderDash, 60);
  }
}

function checkReady() {
  if (cloud.ready || !cloud.index) return;
  if (Object.keys(cloud.index).every(cloudLoaded)) {
    cloud.ready = true;
    if ($("#v-dash").classList.contains("on")) renderDash();
  }
}

function cloudStart() {
  if (!CLOUD || !me || cloud.email === me.email) return;
  cloudStop();
  cloud.email = me.email;
  const r = db.ref("userBoards/" + ekey(me.email));
  const cb = r.on("value", (snap) => {
    cloud.index = snap.val() || {};
    Object.keys(cloud.index).forEach(cloudSub);
    checkReady();
    if ($("#v-dash").classList.contains("on")) renderDash();
  });
  cloud.idxOff = () => r.off("value", cb);
}

function cloudStop() {
  if (cloud.idxOff) cloud.idxOff();
  Object.keys(cloud.subs).forEach(cloudUnsub);
  Object.assign(cloud, { boards: {}, subs: {}, index: null, idxOff: null, ready: false, email: null });
}

function cloudBoard(id) {
  const c = cloud.boards[id];
  if (!c || !c.meta) return null;
  const acc = Object.values(c.access || {});
  return JSON.parse(
    JSON.stringify({
      ...c.meta,
      id,
      members: acc.filter((a) => a.role !== "owner").map((a) => ({ email: a.email, name: a.name || "", role: a.role })),
      objects: Object.values(c.objects || {}),
      removed: {},
    }),
  );
}

function cloudPut(b) {
  const id = b.id;
  cloudSub(id);
  const c = cloud.boards[id],
    base = "boards/" + id + "/",
    u = {};
  const { objects, members, removed, ...meta } = b;
  const was = cloudBoard(id);
  const role = was ? roleOf(was) : "owner";
  if ((role === "owner" || role === "editor") && !same(meta, c.meta)) u[base + "meta"] = clean(meta);
  const want = { [ekey(b.owner)]: { email: b.owner, name: b.ownerName || "", role: "owner" } };
  for (const m of members || []) want[ekey(m.email)] = { email: m.email, name: m.name || "", role: m.role };
  const have = c.access || {};
  for (const k of new Set([...Object.keys(want), ...Object.keys(have)])) {
    if (same(want[k], have[k])) continue;
    u[base + "access/" + k] = want[k] ? clean(want[k]) : null;
    u["userBoards/" + k + "/" + id] = want[k] ? true : null;
  }
  const wo = {};
  for (const o of objects || []) wo[o.id] = o;
  const ho = c.objects || {};
  if (role === "owner" || role === "editor")
    for (const k of new Set([...Object.keys(wo), ...Object.keys(ho)]))
      if (!same(wo[k], ho[k])) u[base + "objects/" + k] = wo[k] ? clean(wo[k]) : null;
  if (!Object.keys(u).length) return true;
  db.ref()
    .update(u)
    .catch((err) => {
      console.error(err);
      toast("บันทึกขึ้นระบบไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตหรือสิทธิ์ของบอร์ด");
    });
  return true;
}

function cloudDelete(id) {
  const c = cloud.boards[id];
  if (!c) return;
  const base = "boards/" + id + "/",
    u = { [base + "meta"]: null, [base + "objects"]: null, [base + "timer"]: null };
  for (const k of Object.keys(c.access || {})) {
    u[base + "access/" + k] = null;
    u["userBoards/" + k + "/" + id] = null;
  }
  return db.ref().update(u);
}

function roleOf(b, u = me) {
  if (!b || !u) return null;
  if (b.owner === u.email) return "owner";
  const m = (b.members || []).find((m) => m.email === u.email);
  return m ? m.role : null;
}

// รวมข้อมูลจากแท็บอื่น object ไหนแก้ล่าสุดเอาอันนั้น
function mergeBoards(a, b) {
  if (!a) return b;
  if (!b) return a;
  const removed = {
    ...(b.removed || {}),
  };
  for (const [k, v] of Object.entries(a.removed || {})) removed[k] = Math.max(v, removed[k] || 0);
  const map = new Map();
  for (const o of [...(b.objects || []), ...(a.objects || [])]) {
    const cur = map.get(o.id);
    if (!cur || (o.t || 0) >= (cur.t || 0)) map.set(o.id, o);
  }
  const objects = [...map.values()].filter((o) => !(removed[o.id] >= (o.t || 0)));
  const meta = (a.metaT || 0) >= (b.metaT || 0) ? a : b;
  return {
    ...meta,
    objects,
    removed,
    updated: Math.max(a.updated || 0, b.updated || 0),
  };
}

const N = (x, y, color, text, w = 180, h = 130) => ({
  id: uid(),
  type: "note",
  x,
  y,
  w,
  h,
  color,
  text,
});

const TX = (x, y, text, size = 24, color = "bone", w = 260) => ({
  id: uid(),
  type: "text",
  x,
  y,
  w,
  text,
  size,
  color,
});

const SH = (x, y, w, h, color, kind = "rect", text = "") => ({
  id: uid(),
  type: "shape",
  kind,
  x,
  y,
  w,
  h,
  color,
  text,
});

const LN = (x1, y1, x2, y2, color = "bone") => ({
  id: uid(),
  type: "line",
  x1,
  y1,
  x2,
  y2,
  color,
});

// templates
const TEMPLATES = [
  {
    id: "blank",
    name: "Blank canvas",
    desc: "เริ่มจากกระดานเปล่า",
    make: () => [],
  },
  {
    id: "kanban",
    name: "Kanban board",
    desc: "ติดตามงาน ต้องทำ → เสร็จ",
    make: () => [
      SH(0, 0, 300, 520, "bone"),
      SH(330, 0, 300, 520, "bone"),
      SH(660, 0, 300, 520, "bone"),
      TX(20, 16, "ต้องทำ", 22),
      TX(350, 16, "กำลังทำ", 22),
      TX(680, 16, "เสร็จแล้ว", 22),
      N(30, 70, "amber", "ออกแบบหน้า Login", 240, 110),
      N(30, 195, "amber", "เขียนคู่มือผู้ใช้", 240, 110),
      N(360, 70, "teal", "พัฒนาหน้า Canvas", 240, 110),
      N(690, 70, "sage", "ทำ Wireframe", 240, 110),
    ],
  },
  {
    id: "mindmap",
    name: "Mind map",
    desc: "แตกประเด็นจากหัวข้อหลัก",
    make: () => {
      const c = SH(330, 210, 240, 120, "amber", "ellipse", "หัวข้อหลัก");
      return [
        LN(450, 210, 160, 110),
        LN(450, 210, 740, 110),
        LN(450, 330, 160, 430),
        LN(450, 330, 740, 430),
        c,
        N(70, 50, "teal", "ประเด็นที่ 1"),
        N(650, 50, "coral", "ประเด็นที่ 2"),
        N(70, 370, "sage", "ประเด็นที่ 3"),
        N(650, 370, "lilac", "ประเด็นที่ 4"),
      ];
    },
  },
  {
    id: "brainstorm",
    name: "Brainstorm",
    desc: "ระดมไอเดียอย่างอิสระ",
    make: () => [
      TX(0, 0, "โจทย์: เราจะทำให้ทีมคุยงานกันง่ายขึ้นได้อย่างไร?", 26, "bone", 720),
      N(0, 90, "amber", "ไอเดีย"),
      N(210, 120, "teal", "ไอเดีย"),
      N(420, 80, "coral", "ไอเดีย"),
      N(630, 110, "sage", "ไอเดีย"),
      N(90, 270, "sky", "ไอเดีย"),
      N(320, 290, "lilac", "ไอเดีย"),
      N(540, 270, "amber", "ไอเดีย"),
    ],
  },
  {
    id: "retro",
    name: "Retro board",
    desc: "สรุปบทเรียนหลังจบ Sprint",
    make: () => [
      N(40, 40, "amber", "What went well?"),
      N(300, 110, "teal", "ปัญหาที่พบ"),
      N(560, 60, "sage", "งานถัดไป"),
      N(120, 270, "coral", "Action items"),
      N(390, 320, "lilac", "ไอเดียใหม่"),
      LN(220, 90, 300, 140),
    ],
  },
  {
    id: "flow",
    name: "Flowchart",
    desc: "ลำดับขั้นตอนการทำงาน",
    make: () => [
      SH(0, 60, 170, 80, "sage", "ellipse", "เริ่มต้น"),
      LN(170, 100, 230, 100),
      SH(230, 60, 180, 80, "sky", "rect", "ขั้นตอนที่ 1"),
      LN(410, 100, 470, 100),
      SH(470, 60, 180, 80, "amber", "rect", "ตรวจสอบผล"),
      LN(650, 100, 710, 100),
      SH(710, 60, 170, 80, "coral", "ellipse", "สิ้นสุด"),
    ],
  },
  {
    id: "sticky",
    name: "Sticky notes",
    desc: "กระดานโน้ตสำหรับจดรวดเร็ว",
    make: () => {
      const out = [];
      for (let i = 0; i < 9; i++)
        out.push(N((i % 3) * 200, Math.floor(i / 3) * 160, NOTE_COLORS[i % 6], "", 180, 140));
      return out;
    },
  },
  {
    id: "swot",
    name: "SWOT analysis",
    desc: "จุดแข็ง จุดอ่อน โอกาส อุปสรรค",
    make: () => [
      SH(0, 0, 420, 280, "teal"),
      SH(440, 0, 420, 280, "coral"),
      SH(0, 300, 420, 280, "sky"),
      SH(440, 300, 420, 280, "amber"),
      TX(20, 14, "Strengths จุดแข็ง", 20),
      TX(460, 14, "Weaknesses จุดอ่อน", 20),
      TX(20, 314, "Opportunities โอกาส", 20),
      TX(460, 314, "Threats อุปสรรค", 20),
      N(24, 70, "teal", "", 170, 110),
      N(464, 70, "coral", "", 170, 110),
      N(24, 370, "sky", "", 170, 110),
      N(464, 370, "amber", "", 170, 110),
    ],
  },
];

function stamp(objs) {
  const t = Date.now();
  return objs.map((o, i) => ({
    ...o,
    t,
    z: i + 1,
  }));
}

function createBoard(tplId, title, extra = {}) {
  const tpl = TEMPLATES.find((t) => t.id === tplId) || TEMPLATES[0];
  const now = Date.now();
  const tag = {
    name: extra.ownerName || me.name,
    color: colorFor(extra.owner || me.email),
  };
  const b = {
    id: uid(),
    title: title || (tpl.id === "blank" ? "บอร์ดไม่มีชื่อ" : tpl.name),
    owner: me.email,
    ownerName: me.name,
    created: now,
    updated: now,
    metaT: now,
    deleted: false,
    template: tpl.id,
    members: [],
    linkRole: "editor",
    objects: stamp(tpl.make()).map((o) =>
      o.type === "note"
        ? {
            ...o,
            by: tag,
          }
        : o,
    ),
    removed: {},
    bg: "slate",
    showBy: true,
    ...extra,
  };
  putBoard(b);
  return b;
}

function seedFor(u) {
  if (store.get("seeded_" + u.email)) return;
  const h = 36e5,
    d = 864e5,
    now = Date.now();
  const mk = (tpl, title, age, extra) => {
    const b = createBoard(tpl, title, extra);
    b.updated = now - age;
    putBoard(b);
  };
  mk("retro", "Sprint Retro - Q3", 2 * h);
  mk("brainstorm", "Brainstorm แคมเปญใหม่", d);
  mk("kanban", "Roadmap 2026", 3 * d);
  mk("sticky", "โน้ตประชุมทีม UX", 7 * d);
  mk("mindmap", "Workshop Ideation", 14 * d, {
    owner: "napat@email.com",
    ownerName: "นภัส",
    members: [
      {
        email: u.email,
        name: u.name,
        role: "editor",
      },
    ],
  });
  store.set("seeded_" + u.email, true);
}

function boundsOf(objs) {
  let x1 = Infinity,
    y1 = Infinity,
    x2 = -Infinity,
    y2 = -Infinity;
  for (const o of objs) {
    let bx, by, bw, bh;
    if (o.type === "line") {
      bx = Math.min(o.x1, o.x2);
      by = Math.min(o.y1, o.y2);
      bw = Math.abs(o.x2 - o.x1);
      bh = Math.abs(o.y2 - o.y1);
    } else if (o.type === "stroke") {
      const xs = o.pts.map((p) => p[0]),
        ys = o.pts.map((p) => p[1]);
      bx = Math.min(...xs);
      by = Math.min(...ys);
      bw = Math.max(...xs) - bx;
      bh = Math.max(...ys) - by;
    } else {
      bx = o.x;
      by = o.y;
      bw = o.w;
      bh = o.h || (o.size || 24) * 1.6;
    }
    x1 = Math.min(x1, bx);
    y1 = Math.min(y1, by);
    x2 = Math.max(x2, bx + bw);
    y2 = Math.max(y2, by + bh);
  }
  if (!isFinite(x1)) return null;
  return {
    x: x1,
    y: y1,
    w: Math.max(x2 - x1, 1),
    h: Math.max(y2 - y1, 1),
  };
}

function thumbSVG(objs, bg) {
  const LT = !!(BGS[bg] || BGS.slate).light,
    BG = (BGS[bg] || BGS.slate).c;
  const bb = boundsOf(objs);
  if (!bb)
    return `<svg class="thumb" viewBox="0 0 160 90" aria-hidden="true"><rect width="160" height="90" fill="${BG}"/><text x="80" y="50" text-anchor="middle" font-size="9" fill="#8A8371" font-family="sans-serif">บอร์ดว่าง</text></svg>`;
  const pad = Math.max(bb.w, bb.h) * 0.08,
    W = bb.w + pad * 2,
    H = bb.h + pad * 2;
  const ar = 16 / 9;
  let vw = W,
    vh = H;
  if (vw / vh > ar) vh = vw / ar;
  else vw = vh * ar;
  const vx = bb.x - pad - (vw - W) / 2,
    vy = bb.y - pad - (vh - H) / 2;
  let s = "";
  for (const o of [...objs].sort((a, b) => (a.z || 0) - (b.z || 0))) {
    const c = o.type === "note" ? PALETTE[o.color] : colOn(o.color, LT);
    if (o.type === "react")
      s += `<circle cx="${o.x + o.w / 2}" cy="${o.y + o.h / 2}" r="${o.w / 2.6}" fill="#E3A008"/>`;
    else if (o.type === "note")
      s += `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="4" fill="${c}"/>`;
    else if (o.type === "shape")
      s +=
        o.kind === "ellipse"
          ? `<ellipse cx="${o.x + o.w / 2}" cy="${o.y + o.h / 2}" rx="${o.w / 2}" ry="${o.h / 2}" fill="${c}33" stroke="${c}" stroke-width="${vw / 90}"/>`
          : `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="4" fill="${c}22" stroke="${c}" stroke-width="${vw / 90}"/>`;
    else if (o.type === "text")
      s += `<rect x="${o.x}" y="${o.y + (o.size || 24) * 0.3}" width="${Math.min(o.w, (o.text || "").length * (o.size || 24) * 0.55)}" height="${(o.size || 24) * 0.5}" rx="3" fill="${c}" opacity=".7"/>`;
    else if (o.type === "line")
      s += `<line x1="${o.x1}" y1="${o.y1}" x2="${o.x2}" y2="${o.y2}" stroke="${c}" stroke-width="${vw / 120}"/>`;
    else if (o.type === "stroke")
      s += `<path d="${pathD(o.pts)}" fill="none" stroke="${c}" stroke-width="${Math.max(o.w, vw / 150)}" stroke-linecap="round" stroke-linejoin="round"${o.hl ? ' opacity=".4"' : ""}/>`;
    else if (o.type === "image")
      s += `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="#3A4556"/>`;
  }
  return `<svg class="thumb" viewBox="${vx} ${vy} ${vw} ${vh}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="${BG}"/>${s}</svg>`;
}

function pathD(pts) {
  if (!pts.length) return "";
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  if (pts.length === 1) return d + ` L${pts[0][0] + 0.1} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2,
      my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${pts[i][0]} ${pts[i][1]} ${mx} ${my}`;
  }
  const l = pts[pts.length - 1];
  return d + ` L${l[0]} ${l[1]}`;
}

let lastFocus = null;

function openModal(id) {
  lastFocus = document.activeElement;
  const m = $("#" + id);
  m.classList.add("on");
  setTimeout(() => {
    const f = m.querySelector("[autofocus],input:not([hidden]),button:not(.x):not([disabled])");
    f && f.focus();
  }, 30);
}

function closeModal(id) {
  const m = $("#" + id);
  if (!m.classList.contains("on")) return;
  m.classList.remove("on");
  if (id === "m-login" && !me) {
    pendingAfterLogin = null;
    if (location.hash.length > 2) history.replaceState(null, "", "#/");
  }
  lastFocus && lastFocus.focus && lastFocus.focus();
}

document.addEventListener("click", (e) => {
  const c = e.target.closest("[data-close]");
  if (c) {
    closeModal(c.closest(".backdrop").id);
    return;
  }
  if (e.target.classList.contains("backdrop") && e.target.id !== "m-onb") closeModal(e.target.id);
});

function confirmBox(title, text, okLabel, fn) {
  $("#cfT").textContent = title;
  $("#cfP").textContent = text;
  const ok = $("#cfOk");
  ok.textContent = okLabel;
  ok.onclick = () => {
    closeModal("m-confirm");
    fn();
  };
  openModal("m-confirm");
}

let pendingAfterLogin = null;

function go(path) {
  if (location.hash === "#" + path) route();
  else location.hash = path;
}

function showView(id) {
  $$(".view").forEach((v) => v.classList.toggle("on", v.id === id));
  $("#v-board").classList.toggle("on", id === "v-board");
  document.body.style.overflow = id === "v-board" ? "hidden" : "";
}

function showLanding() {
  pendingAfterLogin = null;
  closeModal("m-login");
  showView("v-landing");
  document.title = "Magic Co-op Board";
  window.scrollTo(0, 0);
  const t = $(".topnav [data-act=start]");
  t.textContent = me ? "ไปที่บอร์ดของฉัน" : "เริ่มใช้งานฟรี";
  let a = $("#navMe");
  if (me && !a) {
    t.insertAdjacentHTML(
      "afterend",
      `<button id="navMe" class="me-btn" style="margin-left:0" aria-label="ไปที่บอร์ดของฉัน" onclick="go('/dashboard')"></button>`,
    );
    a = $("#navMe");
  }
  if (a) {
    a.hidden = !me;
    if (me) a.innerHTML = avatarHTML(me);
  }
}

// router
function route() {
  const h = (location.hash || "#/").slice(1);
  const [, page, arg] = h.split("/");
  $$(".menu").forEach((m) => m.classList.remove("on"));
  if (page !== "board") closeBoard();
  if (page === "home") {
    showLanding();
    return;
  }
  if (!page) {
    if (me) {
      go("/dashboard");
      return;
    }
    showLanding();
    return;
  }
  if (!me) {
    pendingAfterLogin = h;
    showView("v-landing");
    openLogin();
    return;
  }
  if (CLOUD && !cloudAuthed) {
    if (page === "board" || page === "join") {
      showView("v-board");
      boardMsg("กำลังเชื่อมต่อ...", "", false);
    } else {
      showView("v-dash");
      $("#boardGrid").innerHTML = `<div class="empty"><b>กำลังเชื่อมต่อ...</b>รอสักครู่</div>`;
    }
    return;
  }
  if (page === "dashboard") {
    showView("v-dash");
    renderDash();
    document.title = "Dashboard · Magic Co-op Board";
  } else if (page === "templates") {
    showView("v-tpl");
    renderTemplates();
    document.title = "เลือก Template · Magic Co-op Board";
  } else if (page === "board") {
    showView("v-board");
    openBoard(arg);
  } else if (page === "join") {
    joinBoard(arg);
  } else go("/dashboard");
}

window.addEventListener("hashchange", route);

document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-scroll]");
  if (a) {
    e.preventDefault();
    $(a.getAttribute("href")).scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth",
    });
  }
  if (e.target.closest("[data-act=start]")) {
    if (me) go("/dashboard");
    else {
      pendingAfterLogin = "/dashboard";
      openLogin();
    }
  }
});

function openLogin() {
  $("#emailAuth").hidden = !FB;
  $("#noAuthNotice").hidden = FB;
  $("#gBtn").disabled = !FB;
  if (FB) setAuthMode("signin");
  openModal("m-login");
}

function finishLogin(name, email) {
  setUser({ name, email, color: colorFor(email) });
  closeModal("m-login");
  toast("ยินดีต้อนรับ " + name);
  const next = pendingAfterLogin || "/dashboard";
  pendingAfterLogin = null;
  if (!store.get("onboarded_" + email)) startOnboarding(next);
  else go(next);
}

let authMode = "signin",
  signupName = "";

function setAuthMode(m) {
  authMode = m;
  const up = m === "signup";
  $("#rowName").hidden = !up;
  $("#auSubmit").textContent = up ? "สมัครสมาชิก" : "เข้าสู่ระบบ";
  $("#auSwitch").textContent = up ? "มีบัญชีแล้ว? เข้าสู่ระบบ" : "ยังไม่มีบัญชี? สมัครสมาชิก";
  $("#auForgot").hidden = up;
  $("#lgT").textContent = up ? "สร้างบัญชีใหม่" : "ยินดีต้อนรับสู่ Magic Co-op Board";
  $("#auPass").autocomplete = up ? "new-password" : "current-password";
  $("#auErr").textContent = "";
}

function authError(err) {
  const map = {
    "auth/invalid-email": "รูปแบบอีเมลไม่ถูกต้อง เช่น name@email.com",
    "auth/missing-password": "กรุณาใส่รหัสผ่าน",
    "auth/email-already-in-use": "อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบแทน",
    "auth/weak-password": "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
    "auth/invalid-credential": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    "auth/wrong-password": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    "auth/user-not-found": "ยังไม่มีบัญชีนี้ ลองสมัครสมาชิกก่อน",
    "auth/too-many-requests": "ลองผิดหลายครั้งเกินไป รอสักครู่แล้วลองใหม่",
    "auth/network-request-failed": "เชื่อมต่ออินเทอร์เน็ตไม่ได้ ลองใหม่อีกครั้ง",
    "auth/unauthorized-domain": "โดเมนนี้ยังไม่ได้เพิ่มใน Firebase (Authentication > Settings > Authorized domains)",
    "auth/operation-not-supported-in-this-environment":
      "ต้องเปิดเว็บผ่าน Live Server หรือเว็บจริง จะดับเบิลคลิกเปิดไฟล์ไม่ได้",
    "auth/popup-blocked": "เบราว์เซอร์บล็อกหน้าต่าง popup ลองอนุญาต popup แล้วกดใหม่",
  };
  return map[err.code] || "เข้าสู่ระบบไม่สำเร็จ (" + (err.code || err.message) + ")";
}

if (FB) {
  auth.onAuthStateChanged((u) => {
    if (!u) {
      cloudAuthed = false;
      if (CLOUD) cloudStop();
      // session หมดแต่ยังค้างข้อมูลเก่าในแท็บ
      if (me) {
        me = null;
        sess.del("user");
        route();
      }
      return;
    }
    const email = (u.email || "").toLowerCase();
    const name = u.displayName || signupName || email.split("@")[0];
    cloudAuthed = true;
    if (me && me.email === email) {
      cloudStart();
      route();
      return;
    }
    finishLogin(name, email);
    cloudStart();
  });

  $("#authForm").onsubmit = async (e) => {
    e.preventDefault();
    const email = $("#auEmail").value.trim(),
      pass = $("#auPass").value,
      name = $("#auName").value.trim(),
      btn = $("#auSubmit");
    if (authMode === "signup" && !name) {
      $("#auErr").textContent = "กรุณาใส่ชื่อที่จะแสดงบนบอร์ด";
      return;
    }
    $("#auErr").textContent = "";
    btn.disabled = true;
    try {
      if (authMode === "signup") {
        signupName = name;
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        await cred.user.updateProfile({ displayName: name });
      } else {
        await auth.signInWithEmailAndPassword(email, pass);
      }
    } catch (err) {
      $("#auErr").textContent = authError(err);
    } finally {
      btn.disabled = false;
    }
  };

  $("#auSwitch").onclick = () => setAuthMode(authMode === "signin" ? "signup" : "signin");

  $("#auForgot").onclick = async () => {
    const email = $("#auEmail").value.trim();
    if (!isEmail(email)) {
      $("#auErr").textContent = "ใส่อีเมลก่อน แล้วค่อยกดลืมรหัสผ่าน";
      $("#auEmail").focus();
      return;
    }
    try {
      await auth.sendPasswordResetEmail(email);
      $("#auErr").textContent = "";
      toast("ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่ " + email + " แล้ว");
    } catch (err) {
      $("#auErr").textContent = authError(err);
    }
  };
}

$("#gBtn").onclick = async () => {
  if (!FB) {
    toast("ยังไม่ได้ตั้งค่า Firebase ในไฟล์ firebase-config.js");
    return;
  }
  const btn = $("#gBtn");
  btn.disabled = true;
  $("#auErr").textContent = "";
  try {
    await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  } catch (err) {
    if (!/popup-closed|cancelled-popup/.test(err.code || "")) $("#auErr").textContent = authError(err);
  } finally {
    btn.disabled = false;
  }
};

const ONB = [
  {
    t: "ทำงานร่วมกับทีมได้ทันที",
    p: "เชิญเพื่อนร่วมทีมและเริ่มระดมไอเดียบนบอร์ดเดียวกันได้ทันที เห็นเคอร์เซอร์ของทุกคนแบบเรียลไทม์",
    bg: "var(--sage)",
    art: `<svg viewBox="0 0 300 160"><rect x="20" y="20" width="80" height="60" rx="4" fill="#E3A008"/><rect x="120" y="50" width="80" height="60" rx="4" fill="#F1ECE1"/><rect x="210" y="16" width="70" height="56" rx="4" fill="#E8735F"/><path d="M150 120l20 10-9 2-4 9z" fill="#1E2530"/><path d="M80 100l20 10-9 2-4 9z" fill="#5FA8D3" stroke="#fff"/><rect x="100" y="115" width="30" height="14" rx="7" fill="#5FA8D3"/><rect x="170" y="135" width="30" height="14" rx="7" fill="#1E2530"/></svg>`,
  },
  {
    t: "เริ่มเร็วด้วยเทมเพลต",
    p: "เลือก Kanban, Mind map, Retro board หรือ SWOT แล้วแก้ไขต่อได้ทันที ไม่ต้องเริ่มจากศูนย์",
    bg: "var(--teal)",
    art: `<svg viewBox="0 0 300 160"><rect x="20" y="20" width="80" height="120" rx="6" fill="none" stroke="#F1ECE1" stroke-width="3"/><rect x="110" y="20" width="80" height="120" rx="6" fill="none" stroke="#F1ECE1" stroke-width="3"/><rect x="200" y="20" width="80" height="120" rx="6" fill="none" stroke="#F1ECE1" stroke-width="3"/><rect x="30" y="34" width="60" height="30" rx="3" fill="#E3A008"/><rect x="30" y="72" width="60" height="30" rx="3" fill="#E3A008"/><rect x="120" y="34" width="60" height="30" rx="3" fill="#E8735F"/><rect x="210" y="34" width="60" height="30" rx="3" fill="#B892D8"/></svg>`,
  },
  {
    t: "วาด จด แปะ แล้วส่งออก",
    p: "ใช้ปากกา sticky note ข้อความ รูปทรง และรูปภาพ เสร็จแล้ว Export เป็น PDF หรือ PNG ได้ในคลิกเดียว",
    bg: "var(--coral)",
    art: `<svg viewBox="0 0 300 160"><path d="M30 110c30-60 60 20 90-30s50 10 70-20" fill="none" stroke="#1E2530" stroke-width="6" stroke-linecap="round"/><rect x="200" y="30" width="80" height="70" rx="4" fill="#E3A008"/><ellipse cx="90" cy="45" rx="40" ry="22" fill="none" stroke="#F1ECE1" stroke-width="4"/><rect x="210" y="112" width="60" height="30" rx="6" fill="#1E2530"/><path d="M240 118v14m-6-6l6 6 6-6" stroke="#F1ECE1" stroke-width="3" fill="none"/></svg>`,
  },
];

let onbI = 0,
  onbNext = "/dashboard";

function startOnboarding(next) {
  onbNext = next;
  onbI = 0;
  drawOnb();
  openModal("m-onb");
}

function drawOnb() {
  const s = ONB[onbI];
  $("#onbArt").style.background = s.bg;
  $("#onbArt").innerHTML = s.art;
  $("#onbT").textContent = s.t;
  $("#onbP").textContent = s.p;
  $$("#onbDots i").forEach((d, i) => d.classList.toggle("on", i === onbI));
  $("#onbNext").textContent = onbI === ONB.length - 1 ? "เริ่มเลย" : "ถัดไป";
}

function endOnb() {
  store.set("onboarded_" + me.email, true);
  closeModal("m-onb");
  go(onbNext);
}

$("#onbNext").onclick = () => {
  if (onbI < ONB.length - 1) {
    onbI++;
    drawOnb();
  } else endOnb();
};

$("#onbSkip").onclick = endOnb;

let dashTab = "mine";

function boardsForTab(tab) {
  const q = $("#q").value.trim().toLowerCase();
  let list = allBoards().filter((b) => {
    const r = roleOf(b);
    if (tab === "mine") return r === "owner" && !b.deleted;
    if (tab === "shared") return r && r !== "owner" && !b.deleted;
    if (tab === "trash") return r === "owner" && b.deleted;
  });
  if (q) list = list.filter((b) => b.title.toLowerCase().includes(q));
  return list.sort((a, b) => b.updated - a.updated);
}

// dashboard
function renderDash() {
  if (!me) return;
  $("#meBtn").innerHTML = avatarHTML(me);
  if (CLOUD && !cloud.ready) {
    $("#boardGrid").innerHTML = `<div class="empty"><b>กำลังโหลดบอร์ด...</b>รอสักครู่</div>`;
    return;
  }
  ["mine", "shared", "trash"].forEach((t) => {
    const n = allBoards().filter((b) => {
      const r = roleOf(b);
      return t === "mine"
        ? r === "owner" && !b.deleted
        : t === "shared"
          ? r && r !== "owner" && !b.deleted
          : r === "owner" && b.deleted;
    }).length;
    $("#c-" + t).textContent = n || "";
  });
  $$(".side button").forEach((b) => b.classList.toggle("on", b.dataset.tab === dashTab));
  $("#dashTitle").textContent = {
    mine: "บอร์ดของฉัน",
    shared: "แชร์กับฉัน",
    trash: "ถังขยะ",
  }[dashTab];
  $("#newBoard").style.display = dashTab === "trash" ? "none" : "";
  const list = boardsForTab(dashTab),
    q = $("#q").value.trim();
  const g = $("#boardGrid");
  if (!list.length) {
    g.innerHTML = q
      ? `<div class="empty"><b>ไม่พบบอร์ดที่ชื่อตรงกับ “${esc(q)}”</b>ลองค้นหาด้วยคำอื่น หรือล้างช่องค้นหา</div>`
      : dashTab === "trash"
        ? `<div class="empty"><b>ถังขยะว่าง</b>บอร์ดที่ลบจะอยู่ที่นี่ และกู้คืนได้ตลอด</div>`
        : dashTab === "shared"
          ? `<div class="empty"><b>ยังไม่มีใครแชร์บอร์ดให้คุณ</b>เมื่อเพื่อนเชิญด้วยอีเมล ${esc(me.email)} บอร์ดจะมาอยู่ที่นี่</div>`
          : `<div class="empty"><b>ยังไม่มีบอร์ด</b>กด “สร้างบอร์ดใหม่” เพื่อเริ่มต้นจากเทมเพลต</div>`;
    return;
  }
  g.innerHTML = list
    .map(
      (b) =>
        `<article class="card">\n      <button class="open" data-open="${b.id}" aria-label="เปิดบอร์ด ${esc(b.title)}">${thumbSVG(b.objects || [], b.bg)}\n      <h3>${esc(b.title)}</h3></button>\n      <div class="meta">${dashTab === "shared" ? "จาก " + esc(b.ownerName || b.owner) + " · " : ""}แก้ไขล่าสุด ${ago(b.updated)}${dashTab === "shared" && roleOf(b) === "viewer" ? '<span class="badge">ดูอย่างเดียว</span>' : ""}</div>\n      <button class="icon-btn more" data-more="${b.id}" aria-label="ตัวเลือกของ ${esc(b.title)}"><svg class="icon"><use href="#i-more"/></svg></button>\n    </article>`,
    )
    .join("");
}

$(".side").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  dashTab = b.dataset.tab;
  renderDash();
};

$("#q").oninput = renderDash;

$("#newBoard").onclick = () => go("/templates");

$("#boardGrid").onclick = (e) => {
  const o = e.target.closest("[data-open]");
  if (o) {
    const b = getBoard(o.dataset.open);
    if (b && b.deleted) {
      toast("กู้คืนบอร์ดก่อนจึงจะเปิดได้");
      return;
    }
    go("/board/" + o.dataset.open);
    return;
  }
  const m = e.target.closest("[data-more]");
  if (m) {
    e.stopPropagation();
    openCardMenu(m, m.dataset.more);
  }
};

function placeMenu(menu, anchor) {
  const r = anchor.getBoundingClientRect();
  menu.classList.add("on");
  const mw = menu.offsetWidth,
    mh = menu.offsetHeight;
  menu.style.left = clamp(r.right - mw, 8, innerWidth - mw - 8) + scrollX + "px";
  menu.style.top = (r.bottom + mh + 8 > innerHeight ? r.top - mh - 4 : r.bottom + 4) + scrollY + "px";
}

function openCardMenu(anchor, id) {
  const b = getBoard(id),
    r = roleOf(b),
    menu = $("#cardMenu");
  const items = b.deleted
    ? [
        ["restore", "i-restore", "กู้คืน"],
        ["purge", "i-trash", "ลบถาวร"],
      ]
    : r === "owner"
      ? [
          ["open", "i-play", "เปิดบอร์ด"],
          ["share", "i-share", "แชร์"],
          ["rename", "i-edit", "เปลี่ยนชื่อ"],
          ["dup", "i-copy", "ทำสำเนา"],
          ["trash", "i-trash", "ย้ายไปถังขยะ"],
        ]
      : [
          ["open", "i-play", "เปิดบอร์ด"],
          ["dup", "i-copy", "ทำสำเนาเป็นของฉัน"],
          ["leave", "i-logout", "ออกจากบอร์ดนี้"],
        ];
  menu.innerHTML = items
    .map(
      ([a, i, l]) =>
        `<button role="menuitem" data-a="${a}"><svg class="icon"><use href="#${i}"/></svg>${l}</button>`,
    )
    .join("");
  menu.onclick = (ev) => {
    const btn = ev.target.closest("button");
    if (!btn) return;
    menu.classList.remove("on");
    cardAction(btn.dataset.a, id);
  };
  placeMenu(menu, anchor);
  menu.querySelector("button").focus();
}

function cardAction(a, id) {
  let b = getBoard(id);
  if (!b) return;
  if (a === "open") go("/board/" + id);
  if (a === "share") {
    curShare = b;
    openShare();
  }
  if (a === "rename") {
    $("#rnInput").value = b.title;
    $("#rnForm").onsubmit = (e) => {
      e.preventDefault();
      const v = $("#rnInput").value.trim();
      if (!v) return;
      b = getBoard(id);
      b.title = v;
      b.metaT = b.updated = Date.now();
      putBoard(b);
      closeModal("m-rename");
      renderDash();
      toast("เปลี่ยนชื่อแล้ว");
    };
    openModal("m-rename");
    setTimeout(() => $("#rnInput").select(), 40);
  }
  if (a === "dup") {
    const c = createBoard("blank", b.title + " (สำเนา)");
    c.objects = stamp(
      (b.objects || []).map((o) => ({
        ...o,
        id: uid(),
      })),
    );
    putBoard(c);
    dashTab = "mine";
    renderDash();
    toast("ทำสำเนาแล้ว");
  }
  if (a === "trash") {
    b.deleted = true;
    b.metaT = Date.now();
    putBoard(b);
    renderDash();
    toast("ย้าย “" + b.title + "” ไปถังขยะแล้ว");
  }
  if (a === "restore") {
    b.deleted = false;
    b.metaT = Date.now();
    putBoard(b);
    renderDash();
    toast("กู้คืนบอร์ดแล้ว");
  }
  if (a === "purge")
    confirmBox("ลบบอร์ดถาวร?", "“" + b.title + "” จะถูกลบและกู้คืนไม่ได้อีก", "ลบถาวร", () => {
      if (CLOUD) cloudDelete(id);
      else store.del("board_" + id);
      renderDash();
      toast("ลบถาวรแล้ว");
    });
  if (a === "leave")
    confirmBox(
      "ออกจากบอร์ดนี้?",
      "คุณจะไม่เห็น “" + b.title + "” ในแชร์กับฉันอีก จนกว่าจะได้รับเชิญใหม่",
      "ออกจากบอร์ด",
      () => {
        b.members = b.members.filter((m) => m.email !== me.email);
        b.metaT = Date.now();
        putBoard(b);
        renderDash();
      },
    );
}

$("#meBtn").onclick = (e) => {
  e.stopPropagation();
  const menu = $("#meMenu");
  menu.innerHTML = `<div class="who"><b>${esc(me.name)}</b>${esc(me.email)}</div>\n    <button data-a="reset"><svg class="icon"><use href="#i-restore"/></svg>รีเซ็ตข้อมูลเดโม</button>\n    <button data-a="home"><svg class="icon"><use href="#i-grid"/></svg>ไปหน้าแรกของเว็บ</button>\n    <button data-a="onb"><svg class="icon"><use href="#i-help"/></svg>ดูแนะนำการใช้งานอีกครั้ง</button>\n    <button data-a="out"><svg class="icon"><use href="#i-logout"/></svg>ออกจากระบบ</button>`;
  menu.onclick = (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    menu.classList.remove("on");
    if (b.dataset.a === "out") logout();
    else if (b.dataset.a === "home") go("/home");
    else if (b.dataset.a === "reset") resetDemo();
    else startOnboarding("/dashboard");
  };
  placeMenu(menu, e.currentTarget);
};

document.addEventListener("click", (e) => {
  if (!e.target.closest(".menu")) $$(".menu").forEach((m) => m.classList.remove("on"));
});

function resetDemo() {
  confirmBox(
    "รีเซ็ตข้อมูลเดโม?",
    "บอร์ดทั้งหมดของคุณจะถูกลบ แล้วสร้างบอร์ดตัวอย่างชุดใหม่ ใช้ก่อนอัดคลิปหรือแคปภาพคู่มือ",
    "รีเซ็ต",
    () => {
      if (CLOUD) {
        for (const b of allBoards()) {
          if (roleOf(b) === "owner") cloudDelete(b.id);
          else {
            b.members = b.members.filter((m) => m.email !== me.email);
            putBoard(b);
          }
        }
        store.del("seeded_" + me.email);
      } else
        for (const k of [
          ...store.keys("board_"),
          ...store.keys("pres_"),
          ...store.keys("timer_"),
          ...store.keys("seeded_"),
        ])
          store.del(k);
      seedFor(me);
      dashTab = "mine";
      $("#q").value = "";
      renderDash();
      toast("รีเซ็ตข้อมูลเดโมแล้ว");
    },
  );
}

function renderTemplates() {
  const q = $("#tq").value.trim().toLowerCase();
  const list = TEMPLATES.filter((t) => !q || t.name.toLowerCase().includes(q) || t.desc.includes(q));
  $("#tplGrid").innerHTML = list.length
    ? list
        .map(
          (t) =>
            `<button class="tpl" data-tpl="${t.id}">${thumbSVG(t.make())}<b>${esc(t.name)}</b><small>${esc(t.desc)}</small></button>`,
        )
        .join("")
    : `<div class="empty"><b>ไม่พบ Template “${esc(q)}”</b>ลองพิมพ์ เช่น kanban, retro หรือ swot</div>`;
}

$("#tq").oninput = renderTemplates;

$("#tplGrid").onclick = (e) => {
  const t = e.target.closest("[data-tpl]");
  if (!t) return;
  const b = createBoard(t.dataset.tpl);
  go("/board/" + b.id);
};

let B = null,
  ROLE = null,
  view = {
    x: 0,
    y: 0,
    z: 1,
  },
  tool = "select",
  sel = null,
  editing = null,
  drag = null;

let multi = [],
  penMode = "pen",
  reactEmoji = "👍",
  pointers = new Map();

let noteColor = "amber",
  penColor = "amber",
  penW = 6,
  eraser = false,
  shapeKind = "rect",
  shapeColor = "sky";

let nudgeT = null,
  undoStack = [],
  redoStack = [],
  base = new Map(),
  presTimer = null,
  spaceDown = false,
  pendingRemote = false,
  pendingImagePt = null;

const vp = $("#vp"),
  world = $("#world"),
  objsEl = $("#objs");

function canEdit() {
  return ROLE === "owner" || ROLE === "editor";
}

function toWorld(cx, cy) {
  const r = vp.getBoundingClientRect();
  return [(cx - r.left - view.x) / view.z, (cy - r.top - view.y) / view.z];
}

let lastViewPush = 0;

function applyView() {
  if (B && Date.now() - lastViewPush > 100) {
    lastViewPush = Date.now();
    setTimeout(() => writePresence(), 0);
  }
  world.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.z})`;
  vp.style.backgroundPosition = `${view.x}px ${view.y}px`;
  vp.style.backgroundSize = `${24 * view.z}px ${24 * view.z}px`;
  $("#zPct").textContent = Math.round(view.z * 100) + "%";
  placeCtx();
}

function zoomAt(nz, cx, cy) {
  nz = clamp(nz, 0.2, 3);
  const r = vp.getBoundingClientRect();
  cx ??= r.left + r.width / 2;
  cy ??= r.top + r.height / 2;
  const [wx, wy] = toWorld(cx, cy);
  view.z = nz;
  view.x = cx - r.left - wx * nz;
  view.y = cy - r.top - wy * nz;
  applyView();
}

function fitView() {
  const bb = boundsOf(B.objects);
  const r = vp.getBoundingClientRect();
  if (!bb) {
    view = {
      x: r.width / 2,
      y: r.height / 2,
      z: 1,
    };
    applyView();
    return;
  }
  const left = canEdit() ? (r.width < 760 ? 66 : 84) : 0,
    pad = Math.min(80, r.width * 0.06),
    aw = r.width - left - pad * 2,
    ah = r.height - pad * 2 - 40;
  const z = clamp(Math.min(aw / bb.w, ah / bb.h), 0.2, 1.2);
  view.z = z;
  view.x = left + pad + (aw - bb.w * z) / 2 - bb.x * z;
  view.y = pad + (ah - bb.h * z) / 2 - bb.y * z;
  applyView();
}

function boardMsg(title, text, back = true) {
  const msg = $("#bMsg");
  msg.hidden = false;
  msg.innerHTML = `<div><h2 style="color:var(--bone);margin-bottom:8px">${title}</h2><p style="opacity:.75;margin:0 0 18px">${text}</p>${back ? `<button class="btn btn-primary" onclick="go('/dashboard')">กลับไป Dashboard</button>` : ""}</div>`;
  B = null;
  objsEl.innerHTML = "";
}

function openBoard(id) {
  closeBoard(true);
  if (CLOUD && !cloudLoaded(id)) {
    boardMsg("กำลังโหลดบอร์ด...", "", false);
    whenLoaded(id, () => {
      if (location.hash === "#/board/" + id) openBoard(id);
    });
    return;
  }
  const b = getBoard(id);
  const msg = $("#bMsg");
  msg.hidden = true;
  if (!b || b.deleted) {
    msg.hidden = false;
    msg.innerHTML = `<div><h2 style="color:var(--bone);margin-bottom:8px">${!b ? "ไม่พบบอร์ดนี้" : "บอร์ดนี้อยู่ในถังขยะ"}</h2><p style="opacity:.75;margin:0 0 18px">${!b ? "ลิงก์อาจไม่ถูกต้อง หรือเจ้าของบอร์ดลบบอร์ดไปแล้ว" : "เจ้าของบอร์ดต้องกู้คืนก่อนจึงจะเปิดได้"}</p><button class="btn btn-primary" onclick="go('/dashboard')">กลับไป Dashboard</button></div>`;
    B = null;
    objsEl.innerHTML = "";
    return;
  }
  ROLE = roleOf(b);
  if (!ROLE) {
    msg.hidden = false;
    msg.innerHTML = `<div><h2 style="color:var(--bone);margin-bottom:8px">คุณยังไม่มีสิทธิ์เข้าบอร์ดนี้</h2><p style="opacity:.75;margin:0 0 18px">ขอลิงก์เชิญจากเจ้าของบอร์ด (${esc(b.ownerName || b.owner)})</p><button class="btn btn-primary" onclick="go('/dashboard')">กลับไป Dashboard</button></div>`;
    B = null;
    objsEl.innerHTML = "";
    return;
  }
  B = b;
  setSyncBase();
  sel = null;
  multi = [];
  editing = null;
  undoStack = [];
  redoStack = [];
  resetBase();
  lastFaces = null;
  applyBg();
  document.title = b.title + " · Magic Co-op Board";
  $("#bTitle").value = b.title;
  $("#bTitle").readOnly = ROLE !== "owner";
  $("#roBadge").hidden = canEdit();
  $("#tools").style.display = canEdit() ? "" : "none";
  setTool(canEdit() ? "select" : "pan");
  render();
  requestAnimationFrame(fitView);
  following = null;
  $("#followBar").hidden = true;
  vp.classList.remove("following");
  heartbeat();
  presTimer = setInterval(heartbeat, 1500);
  tickT = setInterval(tickTimer, 250);
  tickTimer();
  if (!canEdit()) hint("คุณมีสิทธิ์ดูอย่างเดียว · ลากเพื่อเลื่อนบอร์ด", 4e3);
}

function closeBoard(silent) {
  clearInterval(tickT);
  $("#timerPill").hidden = true;
  $("#pop-timer").classList.remove("on");
  if (presTimer) {
    clearInterval(presTimer);
    presTimer = null;
    leavePresence();
  }
  closePops();
  $("#ctx").classList.remove("on");
  if (!silent) B = null;
}

function sorted() {
  return [...B.objects].sort((a, b) => (a.z || 0) - (b.z || 0));
}

// วาดของทั้งหมดบนบอร์ด
function render() {
  if (!B) return;
  objsEl.innerHTML = "";
  const LT = isLight(B),
    showBy = B.showBy !== false;
  for (const o of sorted()) {
    const isSel = sel === o.id || multi.includes(o.id);
    const c = o.type === "note" ? PALETTE[o.color] : colOn(o.color, LT);
    if (o.type === "stroke" || o.type === "line") {
      const selc = isSel ? ' class="sel-path"' : "";
      let inner;
      if (o.type === "stroke") {
        const d = pathD(o.pts);
        inner = `<path class="hit" d="${d}" stroke-width="${o.w + 14}"/><path${selc} d="${d}" fill="none" stroke="${c}" stroke-width="${o.w}" stroke-linecap="${o.hl ? "butt" : "round"}" stroke-linejoin="round" pointer-events="none"${o.hl ? ' opacity=".4"' : ""}/>`;
      } else
        inner = `<defs><marker id="ar-${o.id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker></defs><line class="hit" x1="${o.x1}" y1="${o.y1}" x2="${o.x2}" y2="${o.y2}" stroke-width="18"/><line${selc} x1="${o.x1}" y1="${o.y1}" x2="${o.x2}" y2="${o.y2}" stroke="${c}" stroke-width="3" marker-end="url(#ar-${o.id})" pointer-events="none"/>`;
      objsEl.insertAdjacentHTML(
        "beforeend",
        `<svg class="ink" data-id="${o.id}" style="z-index:${o.z || 1}">${inner}</svg>`,
      );
      continue;
    }
    const el = document.createElement("div");
    el.className = "obj " + o.type + (isSel ? " sel" : "");
    el.dataset.id = o.id;
    el.style.cssText = `left:${o.x}px;top:${o.y}px;width:${o.w}px;${o.type === "text" ? "" : `height:${o.h}px;`}z-index:${o.z || 1}`;
    if (o.type === "note") {
      el.style.background = c;
      if (o.fs) el.style.fontSize = o.fs + "px";
      el.innerHTML = `<div class="txt" data-ph="พิมพ์ข้อความ...">${esc(o.text)}</div>`;
    } else if (o.type === "text") {
      el.style.color = c;
      el.style.fontSize = (o.size || 24) + "px";
      el.innerHTML = `<div class="txt" data-ph="พิมพ์ข้อความ">${esc(o.text)}</div>`;
    } else if (o.type === "shape") {
      el.style.border = `3px solid ${c}`;
      el.style.background = c + "22";
      if (o.kind === "ellipse") el.style.borderRadius = "50%";
      else el.style.borderRadius = "6px";
      el.innerHTML = `<div class="txt" data-ph="">${esc(o.text)}</div>`;
    } else if (o.type === "image") {
      el.innerHTML = `<img src="${o.src}" alt="">`;
    } else if (o.type === "react") {
      el.style.fontSize = o.w * 0.78 + "px";
      el.textContent = o.emoji;
      el.setAttribute("aria-label", "สติกเกอร์ " + o.emoji);
    }
    if (o.type === "note") {
      if (showBy && o.by)
        el.insertAdjacentHTML(
          "beforeend",
          `<span class="by" style="background:${PALETTE[o.by.color] || PALETTE.bone}">${esc(o.by.name)}</span>`,
        );
      const rs = Object.entries(o.reacts || {}).filter(([, v]) => v.length);
      if (rs.length)
        el.insertAdjacentHTML(
          "beforeend",
          `<div class="reacts">${rs.map(([em, v]) => `<button data-react="${em}" class="${me && v.includes(me.email) ? "mine" : ""}" title="${esc(v.length + " คน")}">${em}<b>${v.length}</b></button>`).join("")}</div>`,
        );
    }
    if (sel === o.id && canEdit())
      el.insertAdjacentHTML("beforeend", '<div class="handle" data-handle></div>');
    objsEl.appendChild(el);
  }
  if (editing) {
    const el = objsEl.querySelector(`[data-id="${editing}"] .txt`);
    if (el) {
      el.contentEditable = "true";
    }
  }
  placeCtx();
  updUndo();
}

function applyBg() {
  if (!B) return;
  vp.style.backgroundColor = bgColor(B);
  vp.classList.toggle("light", isLight(B));
}

function drawBgPop() {
  $("#bgOpts").innerHTML = Object.entries(BGS)
    .map(
      ([k, v]) =>
        `<button data-bg="${k}" class="${(B.bg || "slate") === k ? "on" : ""}" style="background:${v.c}" aria-label="พื้นหลัง ${v.n}" title="${v.n}"></button>`,
    )
    .join("");
  $("#showBy").checked = B.showBy !== false;
  $$("#bgOpts button").forEach((b) => (b.disabled = !canEdit()));
  $("#showBy").disabled = !canEdit();
}

$("#bgBtn").onclick = (e) => {
  e.stopPropagation();
  const p = $("#pop-bg"),
    on = p.classList.contains("on");
  closePops();
  if (!on) {
    drawBgPop();
    p.classList.add("on");
  }
};

$("#pop-bg").addEventListener("click", (e) => {
  e.stopPropagation();
  const b = e.target.closest("[data-bg]");
  if (!b || !canEdit()) return;
  B.bg = b.dataset.bg;
  B.metaT = Date.now();
  save();
  applyBg();
  render();
  drawBgPop();
});

$("#showBy").onchange = () => {
  B.showBy = $("#showBy").checked;
  B.metaT = Date.now();
  save();
  render();
};

document.addEventListener("click", (e) => {
  if (!e.target.closest("#pop-bg,#bgBtn")) $("#pop-bg").classList.remove("on");
});

function hint(t, ms = 2500) {
  const h = $("#hint");
  h.textContent = t;
  h.style.display = t ? "" : "none";
  clearTimeout(hint._t);
  if (ms) hint._t = setTimeout(() => (h.style.display = "none"), ms);
}

function touch(o) {
  o.t = Date.now();
}

function snapshot() {
  return JSON.stringify(B.objects);
}

const strip = (o) =>
  JSON.stringify({
    ...o,
    t: 0,
  });

function snapMap() {
  return new Map(B.objects.map((o) => [o.id, strip(o)]));
}

function resetBase() {
  base = snapMap();
}

// undo/redo เก็บเฉพาะที่เราแก้เอง จะได้ไม่ไปลบของเพื่อน
function pushHist() {
  const cur = snapMap(),
    ch = [];
  for (const [id, v] of cur)
    if (base.get(id) !== v)
      ch.push({
        id,
        before: base.get(id) || null,
        after: v,
      });
  for (const [id, v] of base)
    if (!cur.has(id))
      ch.push({
        id,
        before: v,
        after: null,
      });
  base = cur;
  if (ch.length) {
    undoStack.push(ch);
    if (undoStack.length > 80) undoStack.shift();
    redoStack = [];
  }
}

function commit() {
  pushHist();
  save();
  render();
}

let saveT = null,
  syncBase = new Map();

function setSyncBase() {
  syncBase = new Map((B ? B.objects : []).map((o) => [o.id, JSON.stringify(clean(o))]));
}

function save() {
  if (!B) return;
  const st = $("#saveState span");
  st.textContent = "กำลังบันทึก...";
  const stored = getBoard(B.id);
  if (CLOUD && stored) {
    // เอาเฉพาะชิ้นที่เราแก้ ไปวางบนข้อมูลล่าสุดจาก server กันไม่ให้ของที่เพื่อนลบไปแล้วกลับมา
    const cur = new Map(B.objects.map((o) => [o.id, o]));
    const out = new Map(stored.objects.map((o) => [o.id, o]));
    for (const [id, o] of cur) if (syncBase.get(id) !== JSON.stringify(clean(o))) out.set(id, o);
    for (const id of syncBase.keys()) if (!cur.has(id)) out.delete(id);
    B = {
      ...B,
      owner: stored.owner,
      ownerName: stored.ownerName,
      members: stored.members,
      linkRole: stored.linkRole,
      objects: [...out.values()],
    };
  } else B = mergeBoards(B, stored);
  B.updated = Date.now();
  const old = Date.now() - 7 * 864e5;
  for (const k in B.removed) if (B.removed[k] < old) delete B.removed[k];
  const ok = putBoard(B);
  setSyncBase();
  clearTimeout(saveT);
  saveT = setTimeout(() => (st.textContent = ok ? "บันทึกแล้ว" : "บันทึกไม่สำเร็จ"), 350);
}

function applyChanges(ch, key) {
  const now = Date.now();
  for (const c of ch) {
    const v = c[key],
      i = B.objects.findIndex((o) => o.id === c.id);
    if (v == null) {
      if (i >= 0) {
        B.objects.splice(i, 1);
        B.removed[c.id] = now;
      }
    } else {
      const o = {
        ...JSON.parse(v),
        t: now,
      };
      delete B.removed[c.id];
      if (i >= 0) B.objects[i] = o;
      else B.objects.push(o);
    }
  }
  sel = null;
  multi = [];
  save();
  resetBase();
  render();
}

function undo() {
  if (!canEdit() || !undoStack.length) return;
  const ch = undoStack.pop();
  redoStack.push(ch);
  applyChanges(ch, "before");
}

function redo() {
  if (!canEdit() || !redoStack.length) return;
  const ch = redoStack.pop();
  undoStack.push(ch);
  applyChanges(ch, "after");
}

function updUndo() {
  const u = !undoStack.length,
    r = !redoStack.length;
  $("#undoBtn").disabled = u;
  $("#redoBtn").disabled = r;
  $("#undoBtn").style.opacity = u ? 0.4 : 1;
  $("#redoBtn").style.opacity = r ? 0.4 : 1;
}

$("#undoBtn").onclick = undo;

$("#redoBtn").onclick = redo;

const FS = {
  text: [18, 24, 36],
  note: [13, 15, 20],
};

const maxZ = () => B.objects.reduce((m, o) => Math.max(m, o.z || 0), 0);

function addObj(o) {
  o.id = uid();
  o.z = maxZ() + 1;
  touch(o);
  B.objects.push(o);
  return o;
}

function findObj(id) {
  return B && B.objects.find((o) => o.id === id);
}

function removeObj(id) {
  B.objects = B.objects.filter((o) => o.id !== id);
  B.removed[id] = Date.now();
  if (sel === id) sel = null;
}

function setTool(t) {
  tool = t;
  eraser = t === "erase";
  if (t === "erase") penMode = "erase";
  else if (t === "pen" && penMode === "erase") penMode = "pen";
  $$("#penMode button").forEach((b) => b.classList.toggle("on", b.dataset.m === penMode));
  if (t !== "select" && multi.length) {
    multi = [];
    render();
  }
  $$(".tool[data-tool]").forEach((b) =>
    b.classList.toggle("on", b.dataset.tool === t || (t === "erase" && b.dataset.tool === "pen")),
  );
  vp.className = "vp t-" + t;
  if (B) vp.classList.toggle("light", isLight(B));
  const tips = {
    react: "คลิกบนบอร์ดเพื่อวางสติกเกอร์ " + reactEmoji,
    note: "คลิกบนบอร์ดเพื่อวาง Note",
    pen: penMode === "hl" ? "ลากเพื่อไฮไลต์" : "ลากเพื่อวาด",
    erase: "ลากผ่านเส้นที่ต้องการลบ",
    text: "คลิกบนบอร์ดเพื่อพิมพ์ข้อความ",
    shape: shapeKind === "line" ? "ลากเพื่อวาดลูกศร" : "ลากเพื่อวาดรูปทรง",
  };
  if (tips[t]) hint(tips[t], 3e3);
  else hint("", 0);
}

function placePop(pop, btn) {
  const m = $(".b-main").getBoundingClientRect(),
    br = btn.getBoundingClientRect(),
    tr = $("#tools").getBoundingClientRect();
  pop.style.left = tr.right - m.left + 10 + "px";
  pop.style.top = clamp(br.top - m.top, 8, m.height - pop.offsetHeight - 8) + "px";
}

function closePops() {
  $$(".pop").forEach((p) => p.classList.remove("on"));
}

$("#tools").onclick = (e) => {
  const b = e.target.closest("[data-tool]");
  if (!b) return;
  const t = b.dataset.tool;
  if (t === "image") {
    closePops();
    pendingImagePt = null;
    $("#imgInput").click();
    return;
  }
  if (t === "tpl") {
    closePops();
    openTplInsert();
    return;
  }
  const pop = $("#pop-" + t),
    wasOpen = pop && pop.classList.contains("on"),
    wasActive = tool === t || (t === "pen" && tool === "erase");
  closePops();
  if (pop && !(wasActive && wasOpen)) {
    pop.classList.add("on");
    placePop(pop, b);
  }
  if (!(t === "pen" && tool === "erase")) setTool(t);
  if (sel && t !== "select") {
    sel = null;
    render();
  }
};

function buildSwatches() {
  $$("[data-sw]").forEach((box) => {
    const kind = box.dataset.sw,
      cols = kind === "pen" || kind === "shape" ? PEN_COLORS : NOTE_COLORS;
    const cur = {
      note: noteColor,
      pen: penColor,
      shape: shapeColor,
    }[kind];
    box.innerHTML = cols
      .map(
        (k) =>
          `<button class="sw${k === cur ? " on" : ""}" style="background:${PALETTE[k]}" data-k="${k}" aria-label="สี${CNAME[k]}" title="${CNAME[k]}"></button>`,
      )
      .join("");
    box.onclick = (e) => {
      const s = e.target.closest(".sw");
      if (!s) return;
      const k = s.dataset.k;
      if (kind === "note") noteColor = k;
      if (kind === "pen") {
        penColor = k;
        if (eraser) setTool("pen");
      }
      if (kind === "shape") shapeColor = k;
      buildSwatches();
    };
  });
}

buildSwatches();

$("#penW").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  penW = +b.dataset.w;
  $$("#penW button").forEach((x) => x.classList.toggle("on", x === b));
  if (eraser) setTool("pen");
};

$("#penMode").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  penMode = b.dataset.m;
  setTool(penMode === "erase" ? "erase" : "pen");
};

function drawEmojis() {
  $$("[data-emo]").forEach((box) => {
    box.innerHTML = EMOJIS.map(
      (em) =>
        `<button data-em="${em}" class="${box.dataset.emo === "tool" && em === reactEmoji ? "on" : ""}" aria-label="${em}">${em}</button>`,
    ).join("");
  });
}

drawEmojis();

$("#pop-react").onclick = (e) => {
  const b = e.target.closest("[data-em]");
  if (!b) return;
  reactEmoji = b.dataset.em;
  drawEmojis();
  setTool("react");
};

$("#pop-ctxreact").onclick = (e) => {
  const b = e.target.closest("[data-em]");
  if (!b) return;
  const o = sel && findObj(sel);
  if (o && o.type === "note") toggleReact(o, b.dataset.em);
  closePops();
};

function toggleReact(o, em) {
  if (!me) return;
  if (CLOUD && !canEdit()) {
    toast("สิทธิ์ดูอย่างเดียว กดรีแอคชันไม่ได้");
    return;
  }
  o.reacts = o.reacts || {};
  const a = (o.reacts[em] = o.reacts[em] || []);
  const i = a.indexOf(me.email);
  if (i >= 0) a.splice(i, 1);
  else a.push(me.email);
  if (!a.length) delete o.reacts[em];
  touch(o);
  commit();
}

$("#shapeK").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  shapeKind = b.dataset.k;
  $$("#shapeK button").forEach((x) => x.classList.toggle("on", x === b));
  setTool("shape");
};

function placeCtx() {
  const ctx = $("#ctx");
  if (multi.length && canEdit() && !drag && !editing) {
    const bb = boundsOf(multi.map(findObj).filter(Boolean));
    if (!bb) {
      ctx.classList.remove("on");
      return;
    }
    $("#ctxSw").innerHTML =
      `<span style="font-size:13px;font-weight:600;padding:0 6px">${multi.length} ชิ้น</span>`;
    $("#ctxSw").nextElementSibling.style.display = "";
    ctx.querySelector("[data-c=react]").style.display = "none";
    ctx.querySelector("[data-c=edit]").style.display = "none";
    $("#ctxSize").style.display = "none";
    ctx.classList.add("on");
    const r = vp.getBoundingClientRect();
    ctx.style.left = clamp((bb.x + bb.w / 2) * view.z + view.x, 130, r.width - 130) + "px";
    ctx.style.top = Math.max(bb.y * view.z + view.y - 14, 60) + "px";
    return;
  }
  const o = sel && findObj(sel);
  if (!o || !canEdit() || drag || editing) {
    ctx.classList.remove("on");
    $("#pop-ctxreact").classList.remove("on");
    return;
  }
  ctx.querySelector("[data-c=react]").style.display = o.type === "note" ? "" : "none";
  const txtObj = ["note", "text", "shape"].includes(o.type);
  ctx.querySelector("[data-c=edit]").style.display = txtObj ? "" : "none";
  const fsz = FS[o.type];
  $("#ctxSize").style.display = fsz ? "" : "none";
  if (fsz) {
    const cur = o.type === "text" ? o.size || 24 : o.fs || fsz[1];
    $$("#ctxSize button").forEach((b, i) => b.classList.toggle("on", fsz[i] === cur));
  }
  let x, y;
  if (o.type === "line") {
    x = (o.x1 + o.x2) / 2;
    y = Math.min(o.y1, o.y2);
  } else if (o.type === "stroke") {
    const bb = boundsOf([o]);
    x = bb.x + bb.w / 2;
    y = bb.y;
  } else {
    x = o.x + o.w / 2;
    y = o.y;
  }
  const cols =
    o.type === "note" ? NOTE_COLORS : o.type === "image" || o.type === "react" ? [] : PEN_COLORS;
  $("#ctxSw").innerHTML = cols
    .map(
      (k) =>
        `<button class="sw${k === o.color ? " on" : ""}" style="background:${PALETTE[k]}" data-k="${k}" aria-label="เปลี่ยนเป็นสี${CNAME[k]}" title="${CNAME[k]}"></button>`,
    )
    .join("");
  $("#ctxSw").nextElementSibling.style.display = cols.length ? "" : "none";
  ctx.classList.add("on");
  const r = vp.getBoundingClientRect();
  ctx.style.left = clamp(x * view.z + view.x, 130, r.width - 130) + "px";
  ctx.style.top = Math.max(y * view.z + view.y - 14, 60) + "px";
}

$("#ctx").onclick = (e) => {
  if (multi.length) {
    const c = e.target.closest("[data-c]");
    if (!c) return;
    if (c.dataset.c === "del") {
      multi.forEach(removeObj);
      multi = [];
      commit();
    }
    if (c.dataset.c === "dup") duplicate();
    if (c.dataset.c === "front") {
      let z = maxZ();
      sorted()
        .filter((o) => multi.includes(o.id))
        .forEach((o) => {
          o.z = ++z;
          touch(o);
        });
      commit();
    }
    return;
  }
  const o = sel && findObj(sel);
  if (!o) return;
  const fb = e.target.closest("[data-fs]");
  if (fb) {
    const v = FS[o.type][+fb.dataset.fs];
    if (o.type === "text") o.size = v;
    else o.fs = v;
    touch(o);
    commit();
    return;
  }
  if (e.target.closest("[data-c=edit]")) {
    startEdit(o.id);
    return;
  }
  if (e.target.closest("[data-c=react]")) {
    const p = $("#pop-ctxreact");
    const on = p.classList.contains("on");
    closePops();
    if (!on) {
      const r = $("#ctx").getBoundingClientRect(),
        vr = vp.getBoundingClientRect();
      p.style.left = clamp(r.left - vr.left, 8, vr.width - 230) + "px";
      p.style.top = r.bottom - vr.top + 8 + "px";
      p.classList.add("on");
    }
    return;
  }
  const s = e.target.closest(".sw");
  if (s) {
    o.color = s.dataset.k;
    touch(o);
    if (o.type === "note") noteColor = o.color;
    commit();
    return;
  }
  const c = e.target.closest("[data-c]");
  if (!c) return;
  if (c.dataset.c === "del") {
    removeObj(o.id);
    commit();
  }
  if (c.dataset.c === "dup") duplicate();
  if (c.dataset.c === "front") {
    o.z = maxZ() + 1;
    touch(o);
    commit();
  }
};

function shiftObj(o, g, dx, dy) {
  if (o.type === "line") {
    o.x1 = g.x1 + dx;
    o.y1 = g.y1 + dy;
    o.x2 = g.x2 + dx;
    o.y2 = g.y2 + dy;
  } else if (o.type === "stroke") o.pts = g.pts.map((p) => [p[0] + dx, p[1] + dy]);
  else {
    o.x = g.x + dx;
    o.y = g.y + dy;
  }
}

function duplicate() {
  const src = multi.length
    ? sorted().filter((o) => multi.includes(o.id))
    : [sel && findObj(sel)].filter(Boolean);
  if (!src.length) return;
  const ids = src.map((o) => {
    const c = JSON.parse(JSON.stringify(o));
    shiftObj(c, o, 24, 24);
    if (c.type === "note") {
      c.by = {
        name: me.name,
        color: me.color || colorFor(me.email),
      };
      c.reacts = {};
    }
    addObj(c);
    return c.id;
  });
  if (ids.length > 1) {
    multi = ids;
    sel = null;
  } else {
    sel = ids[0];
    multi = [];
  }
  commit();
}

function startEdit(id) {
  if (!canEdit()) return;
  const o = findObj(id);
  if (!o || !["note", "text", "shape"].includes(o.type)) return;
  editing = id;
  sel = id;
  render();
  const el = objsEl.querySelector(`[data-id="${id}"] .txt`);
  if (!el) return;
  el.contentEditable = "true";
  el.focus();
  const r = document.createRange();
  r.selectNodeContents(el);
  if (o.text) r.collapse(false);
  const s = getSelection();
  s.removeAllRanges();
  s.addRange(r);
  el.onblur = () => finishEdit(el);
  el.onkeydown = (ev) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      el.blur();
    }
    ev.stopPropagation();
  };
  el.oninput = () => {
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      const o = findObj(editing);
      if (o) {
        o.text = el.innerText.replace(/\n$/, "");
        touch(o);
        save();
      }
    }, 500);
  };
  el.onpaste = (ev) => {
    ev.preventDefault();
    document.execCommand("insertText", false, ev.clipboardData.getData("text/plain"));
  };
  placeCtx();
}

function finishEdit(el) {
  const id = editing;
  editing = null;
  const o = findObj(id);
  if (o) {
    const v = el.innerText.replace(/\n$/, "");
    if (o.type === "text" && !v.trim()) {
      removeObj(o.id);
      commit();
      return;
    }
    if (v !== o.text) {
      o.text = v;
      touch(o);
      if (o.type === "text") {
        o.w = Math.max(o.w, el.parentElement.offsetWidth);
      }
    }
  }
  commit();
  if (pendingRemote) {
    pendingRemote = false;
    pullRemote();
  }
}

function pinchInfo() {
  const [a, b] = [...pointers.values()];
  return {
    d: Math.hypot(a.x - b.x, a.y - b.y),
    mx: (a.x + b.x) / 2,
    my: (a.y + b.y) / 2,
  };
}

// mouse / touch บน canvas
vp.addEventListener("pointerdown", (e) => {
  if (!B) return;
  if (e.target.closest("[contenteditable=true]")) return;
  if (e.pointerType === "touch") {
    pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
    });
    if (pointers.size === 2) {
      if (drag && drag.mode === "draw") {
        removeObj(drag.o.id);
        render();
      } else if (drag && drag.mode === "shape") {
        removeObj(drag.o.id);
        render();
      } else if (drag && (drag.mode === "move" || drag.mode === "moveMulti")) {
        (drag.list || [[drag.o, drag.orig]]).forEach(([o, g]) => shiftObj(o, g, 0, 0));
        render();
      }
      const p = pinchInfo();
      drag = {
        mode: "pinch",
        d0: p.d,
        z0: view.z,
        mx: p.mx,
        my: p.my,
        vx: view.x,
        vy: view.y,
      };
      e.preventDefault();
      return;
    }
    if (pointers.size > 2) return;
  }
  const rb = e.target.closest("[data-react]");
  if (rb) {
    e.preventDefault();
    e.stopPropagation();
    const o = findObj(rb.closest("[data-id]").dataset.id);
    if (o && me) toggleReact(o, rb.dataset.react);
    return;
  }
  closePops();
  e.preventDefault();
  const ae = document.activeElement;
  if (ae && ae !== document.body && ae.blur) ae.blur();
  const [wx, wy] = toWorld(e.clientX, e.clientY);
  const hitEl = e.target.closest("[data-id]");
  const hit = hitEl && findObj(hitEl.dataset.id);
  vp.setPointerCapture(e.pointerId);
  const panMode = e.button === 1 || spaceDown || tool === "pan" || !canEdit();
  if (!panMode && tool === "select" && !hit && e.shiftKey) {
    sel = null;
    multi = [];
    drag = {
      mode: "marquee",
      sx: wx,
      sy: wy,
      x: wx,
      y: wy,
    };
    const m = document.createElement("div");
    m.className = "marquee";
    m.id = "marq";
    objsEl.appendChild(m);
    placeCtx();
    return;
  }
  if (panMode || (tool === "select" && !hit)) {
    if (tool === "select" && (sel || multi.length) && !panMode) {
      sel = null;
      multi = [];
      render();
    }
    stopFollow();
    drag = {
      mode: "pan",
      sx: e.clientX,
      sy: e.clientY,
      vx: view.x,
      vy: view.y,
    };
    vp.classList.add("panning");
    return;
  }
  if (tool === "select") {
    if (multi.includes(hit.id)) {
      drag = {
        mode: "moveMulti",
        sx: wx,
        sy: wy,
        list: multi
          .map(findObj)
          .filter(Boolean)
          .map((o) => [o, JSON.parse(JSON.stringify(o))]),
        moved: false,
      };
      placeCtx();
      return;
    }
    if (multi.length) {
      multi = [];
      sel = null;
    }
    if (sel !== hit.id) {
      sel = hit.id;
      render();
    }
    const o = hit;
    if (e.target.closest("[data-handle]"))
      drag = {
        mode: "resize",
        o,
        sx: wx,
        sy: wy,
        ow: o.w,
        oh: o.h,
      };
    else
      drag = {
        mode: "move",
        o,
        sx: wx,
        sy: wy,
        orig: JSON.parse(JSON.stringify(o)),
        moved: false,
      };
    placeCtx();
    return;
  }
  if (tool === "react") {
    const o = addObj({
      type: "react",
      emoji: reactEmoji,
      x: wx - 28,
      y: wy - 28,
      w: 56,
      h: 56,
    });
    commit();
    return;
  }
  if (tool === "note") {
    const o = addObj({
      type: "note",
      x: wx - 90,
      y: wy - 65,
      w: 180,
      h: 130,
      color: noteColor,
      text: "",
      by: myTag(),
    });
    setTool("select");
    commit();
    startEdit(o.id);
    return;
  }
  if (tool === "text") {
    const o = addObj({
      type: "text",
      x: wx,
      y: wy - 16,
      w: 220,
      text: "",
      size: 24,
      color: "bone",
    });
    setTool("select");
    render();
    startEdit(o.id);
    return;
  }
  if (tool === "pen") {
    const hl = penMode === "hl";
    const o = {
      type: "stroke",
      pts: [[wx, wy]],
      color: penColor,
      w: hl ? penW * 3 + 6 : penW,
      hl,
    };
    addObj(o);
    drag = {
      mode: "draw",
      o,
    };
    render();
    return;
  }
  if (tool === "erase") {
    drag = {
      mode: "erase",
      n: 0,
    };
    eraseAt(wx, wy);
    return;
  }
  if (tool === "shape") {
    const o =
      shapeKind === "line"
        ? addObj({
            type: "line",
            x1: wx,
            y1: wy,
            x2: wx,
            y2: wy,
            color: shapeColor,
          })
        : addObj({
            type: "shape",
            kind: shapeKind,
            x: wx,
            y: wy,
            w: 1,
            h: 1,
            color: shapeColor,
            text: "",
          });
    drag = {
      mode: "shape",
      o,
      sx: wx,
      sy: wy,
    };
    render();
    return;
  }
});

let lastPres = 0;

vp.addEventListener("pointermove", (e) => {
  if (!B) return;
  if (pointers.has(e.pointerId))
    pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
    });
  if (drag && drag.mode === "pinch") {
    if (pointers.size < 2) return;
    const p = pinchInfo();
    const r = vp.getBoundingClientRect();
    const nz = clamp((drag.z0 * p.d) / drag.d0, 0.2, 3);
    const wx0 = (drag.mx - r.left - drag.vx) / drag.z0,
      wy0 = (drag.my - r.top - drag.vy) / drag.z0;
    view.z = nz;
    view.x = p.mx - r.left - wx0 * nz;
    view.y = p.my - r.top - wy0 * nz;
    applyView();
    return;
  }
  const [wx, wy] = toWorld(e.clientX, e.clientY);
  if (Date.now() - lastPres > 70) {
    lastPres = Date.now();
    writePresence({
      x: wx,
      y: wy,
    });
  }
  if (!drag) return;
  if (drag.mode === "pan") {
    view.x = drag.vx + e.clientX - drag.sx;
    view.y = drag.vy + e.clientY - drag.sy;
    applyView();
    return;
  }
  const dx = wx - drag.sx,
    dy = wy - drag.sy;
  if (drag.mode === "marquee") {
    drag.x = wx;
    drag.y = wy;
    const m = $("#marq");
    if (m) {
      m.style.cssText = `left:${Math.min(wx, drag.sx)}px;top:${Math.min(wy, drag.sy)}px;width:${Math.abs(dx)}px;height:${Math.abs(dy)}px`;
    }
    return;
  }
  if (drag.mode === "moveMulti") {
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
    drag.list.forEach(([o, g]) => shiftObj(o, g, dx, dy));
    render();
    $("#ctx").classList.remove("on");
    return;
  }
  if (drag.mode === "move") {
    const o = drag.o,
      g = drag.orig;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
    if (o.type === "line") {
      o.x1 = g.x1 + dx;
      o.y1 = g.y1 + dy;
      o.x2 = g.x2 + dx;
      o.y2 = g.y2 + dy;
      render();
    } else if (o.type === "stroke") {
      o.pts = g.pts.map((p) => [p[0] + dx, p[1] + dy]);
      render();
    } else {
      o.x = g.x + dx;
      o.y = g.y + dy;
      const el = objsEl.querySelector(`[data-id="${o.id}"]`);
      if (el) {
        el.style.left = o.x + "px";
        el.style.top = o.y + "px";
      }
    }
    $("#ctx").classList.remove("on");
    return;
  }
  if (drag.mode === "resize") {
    const o = drag.o;
    let w = Math.max(o.type === "react" ? 24 : 40, drag.ow + dx),
      h = Math.max(30, (drag.oh || 0) + dy);
    if (o.type === "image" || o.type === "react") {
      h = w * (drag.oh / drag.ow);
    }
    if (o.type === "react") {
      o.w = o.h = w;
      render();
      return;
    }
    o.w = w;
    if (o.type !== "text") o.h = h;
    const el = objsEl.querySelector(`[data-id="${o.id}"]`);
    if (el) {
      el.style.width = w + "px";
      if (o.type !== "text") el.style.height = h + "px";
    }
    return;
  }
  if (drag.mode === "draw") {
    const p = drag.o.pts,
      l = p[p.length - 1];
    if (Math.hypot(wx - l[0], wy - l[1]) * view.z > 2) {
      p.push([wx, wy]);
      const g = objsEl.querySelector(`[data-id="${drag.o.id}"]`);
      if (g) {
        const d = pathD(p);
        g.querySelectorAll("path").forEach((x) => x.setAttribute("d", d));
      } else render();
    }
    return;
  }
  if (drag.mode === "erase") {
    eraseAt(wx, wy);
    return;
  }
  if (drag.mode === "shape") {
    const o = drag.o;
    if (o.type === "line") {
      o.x2 = wx;
      o.y2 = wy;
    } else {
      o.x = Math.min(wx, drag.sx);
      o.y = Math.min(wy, drag.sy);
      o.w = Math.abs(dx);
      o.h = Math.abs(dy);
      if (e.shiftKey) {
        o.w = o.h = Math.max(o.w, o.h);
      }
    }
    render();
  }
});

function endDrag(e) {
  if (e && pointers.has(e.pointerId)) {
    pointers.delete(e.pointerId);
    if (drag && drag.mode === "pinch") {
      if (pointers.size === 0) {
        drag = null;
      }
      return;
    }
  }
  if (!drag) return;
  const d = drag;
  drag = null;
  vp.classList.remove("panning");
  if (d.mode === "marquee") {
    $("#marq")?.remove();
    const x1 = Math.min(d.x, d.sx),
      y1 = Math.min(d.y, d.sy),
      x2 = Math.max(d.x, d.sx),
      y2 = Math.max(d.y, d.sy);
    const ids = B.objects
      .filter((o) => {
        const b = boundsOf([o]);
        return b && b.x >= x1 && b.y >= y1 && b.x + b.w <= x2 && b.y + b.h <= y2;
      })
      .map((o) => o.id);
    if (ids.length === 1) {
      sel = ids[0];
      multi = [];
    } else {
      multi = ids;
      sel = null;
    }
    render();
    if (ids.length > 1) hint("เลือก " + ids.length + " ชิ้น · ลากเพื่อย้ายพร้อมกัน", 2500);
    return;
  }
  if (d.mode === "moveMulti") {
    if (d.moved) {
      d.list.forEach(([o]) => touch(o));
      commit();
    } else placeCtx();
    return;
  }
  if (d.mode === "move") {
    if (d.moved) {
      touch(d.o);
      commit();
    } else placeCtx();
  } else if (d.mode === "resize") {
    touch(d.o);
    commit();
  } else if (d.mode === "draw") {
    touch(d.o);
    commit();
  } else if (d.mode === "erase") {
    if (d.n) commit();
  } else if (d.mode === "shape") {
    const o = d.o;
    if (o.type === "line") {
      if (Math.hypot(o.x2 - o.x1, o.y2 - o.y1) < 8) {
        o.x2 = o.x1 + 140;
      }
    } else if (o.w < 10 || o.h < 10) {
      o.x -= 80;
      o.y -= 50;
      o.w = 160;
      o.h = 100;
    }
    touch(o);
    sel = o.id;
    setTool("select");
    commit();
  }
  if (pendingRemote) {
    pendingRemote = false;
    pullRemote();
  }
}

vp.addEventListener("pointerup", endDrag);

vp.addEventListener("pointercancel", endDrag);

vp.addEventListener("dblclick", (e) => {
  if (!B || !canEdit()) return;
  const hitEl = e.target.closest("[data-id]");
  if (hitEl) {
    startEdit(hitEl.dataset.id);
    return;
  }
  if (tool === "select") {
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    const o = addObj({
      type: "note",
      x: wx - 90,
      y: wy - 65,
      w: 180,
      h: 130,
      color: noteColor,
      text: "",
      by: myTag(),
    });
    commit();
    startEdit(o.id);
  }
});

function myTag() {
  return {
    name: me.name,
    color: me.color || colorFor(me.email),
  };
}

function eraseAt(wx, wy) {
  const r = 10 / view.z;
  let hit = false;
  for (const o of [...B.objects]) {
    if (o.type !== "stroke") continue;
    if (o.pts.some((p) => Math.hypot(p[0] - wx, p[1] - wy) < r + o.w / 2)) {
      removeObj(o.id);
      hit = true;
      drag.n++;
    }
  }
  if (hit) render();
}

vp.addEventListener(
  "wheel",
  (e) => {
    if (!B) return;
    e.preventDefault();
    stopFollow();
    if (e.ctrlKey || e.metaKey) zoomAt(view.z * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
    else {
      view.x -= e.deltaX;
      view.y -= e.deltaY;
      applyView();
    }
  },
  {
    passive: false,
  },
);

$("#zIn").onclick = () => {
  stopFollow();
  zoomAt(view.z * 1.2);
};

$("#zOut").onclick = () => {
  stopFollow();
  zoomAt(view.z / 1.2);
};

$("#zPct").onclick = () => {
  stopFollow();
  fitView();
};

window.addEventListener("resize", () => B && placeCtx());

function openTplInsert() {
  $("#tinsGrid").innerHTML = TEMPLATES.filter((t) => t.id !== "blank")
    .map(
      (t) =>
        `<button class="tpl" data-ti="${t.id}">${thumbSVG(t.make(), B.bg)}<b>${esc(t.name)}</b></button>`,
    )
    .join("");
  openModal("m-tins");
}

$("#tinsGrid").onclick = (e) => {
  const b = e.target.closest("[data-ti]");
  if (!b) return;
  const objs = TEMPLATES.find((t) => t.id === b.dataset.ti).make();
  const nb = boundsOf(objs),
    cb = boundsOf(B.objects);
  const ox = cb ? cb.x + cb.w + 140 - nb.x : -nb.x,
    oy = cb ? cb.y - nb.y : -nb.y;
  let z = maxZ();
  const ids = [];
  for (const o of objs) {
    shiftObj(o, JSON.parse(JSON.stringify(o)), ox, oy);
    if (o.type === "note") o.by = myTag();
    o.z = ++z;
    touch(o);
    B.objects.push(o);
    ids.push(o.id);
  }
  multi = ids;
  sel = null;
  setTool("select");
  commit();
  closeModal("m-tins");
  const bb = boundsOf(objs),
    r = vp.getBoundingClientRect(),
    zz = clamp(Math.min((r.width - 200) / bb.w, (r.height - 160) / bb.h), 0.2, 1.2);
  view.z = zz;
  view.x = (r.width - bb.w * zz) / 2 - bb.x * zz;
  view.y = (r.height - bb.h * zz) / 2 - bb.y * zz;
  applyView();
  hint("แทรกเทมเพลตแล้ว · ลากเพื่อย้ายทั้งชุด", 3e3);
};

$("#imgInput").onchange = async (e) => {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f || !B) return;
  if (!f.type.startsWith("image/")) {
    toast("ไฟล์นี้ไม่ใช่รูปภาพ รองรับ JPG, PNG, GIF, WebP");
    return;
  }
  try {
    const src = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(f);
    });
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
    const s = Math.min(1, 900 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    const data = c.toDataURL("image/jpeg", 0.82);
    const r = vp.getBoundingClientRect();
    const [cx, cy] = toWorld(r.left + r.width / 2, r.top + r.height / 2);
    const w = Math.min(360, c.width),
      h = (w * c.height) / c.width;
    const o = addObj({
      type: "image",
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
      src: data,
    });
    sel = o.id;
    setTool("select");
    commit();
  } catch (err) {
    toast("เปิดรูปภาพไม่สำเร็จ ลองไฟล์อื่น");
  }
};

$("#bTitle").addEventListener("change", () => {
  if (!B || ROLE !== "owner") return;
  const v = $("#bTitle").value.trim() || "บอร์ดไม่มีชื่อ";
  $("#bTitle").value = v;
  B.title = v;
  B.metaT = Date.now();
  save();
  document.title = v + " · Magic Co-op Board";
});

$("#bTitle").addEventListener("keydown", (e) => {
  if (e.key === "Enter") e.target.blur();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const open = $$(".backdrop.on").pop();
    if (open && open.id !== "m-onb") {
      closeModal(open.id);
      return;
    }
  }
  if (!B || !$("#v-board").classList.contains("on") || $$(".backdrop.on").length) return;
  const t = e.target;
  if (t.matches("input,textarea,select,[contenteditable=true]")) return;
  if (e.code === "Space") {
    spaceDown = true;
    vp.classList.add("t-pan");
    e.preventDefault();
    return;
  }
  const k = e.key.toLowerCase(),
    mod = e.ctrlKey || e.metaKey;
  if (mod && k === "z") {
    e.preventDefault();
    e.shiftKey ? redo() : undo();
    return;
  }
  if (mod && k === "y") {
    e.preventDefault();
    redo();
    return;
  }
  if (mod && k === "d") {
    e.preventDefault();
    duplicate();
    return;
  }
  if (e.key.startsWith("Arrow") && (sel || multi.length) && canEdit()) {
    e.preventDefault();
    const st = e.shiftKey ? 20 : 2,
      dx = e.key === "ArrowLeft" ? -st : e.key === "ArrowRight" ? st : 0,
      dy = e.key === "ArrowUp" ? -st : e.key === "ArrowDown" ? st : 0;
    (multi.length ? multi : [sel])
      .map(findObj)
      .filter(Boolean)
      .forEach((o) => {
        shiftObj(o, JSON.parse(JSON.stringify(o)), dx, dy);
        touch(o);
      });
    render();
    clearTimeout(nudgeT);
    nudgeT = setTimeout(commit, 400);
    return;
  }
  if (mod && k === "a" && canEdit()) {
    e.preventDefault();
    multi = B.objects.map((o) => o.id);
    sel = null;
    setTool("select");
    render();
    return;
  }
  if (mod) return;
  if (e.key === "?") {
    openModal("m-help");
    return;
  }
  if (!canEdit()) return;
  if ((e.key === "Delete" || e.key === "Backspace") && multi.length) {
    multi.forEach(removeObj);
    multi = [];
    commit();
    return;
  }
  if ((e.key === "Delete" || e.key === "Backspace") && sel) {
    removeObj(sel);
    commit();
    return;
  }
  if (e.key === "Enter" && sel) {
    e.preventDefault();
    startEdit(sel);
    return;
  }
  if (e.key === "Escape") {
    sel = null;
    multi = [];
    setTool("select");
    closePops();
    render();
    return;
  }
  if (k === "h") {
    penMode = "hl";
    setTool("pen");
    return;
  }
  if (k === "p" && penMode !== "pen") {
    penMode = "pen";
  }
  const map = {
    v: "select",
    n: "note",
    p: "pen",
    e: "erase",
    t: "text",
    s: "shape",
    r: "react",
  };
  if (map[k]) {
    setTool(map[k]);
    if (sel) {
      sel = null;
      render();
    }
  }
  if (k === "i") $("#imgInput").click();
});

document.addEventListener("keyup", (e) => {
  if (e.code === "Space") {
    spaceDown = false;
    if (B) {
      vp.className = "vp t-" + tool;
      vp.classList.toggle("light", isLight(B));
    }
  }
});

$("#helpBtn").onclick = () => openModal("m-help");

function pullRemote() {
  if (!B) return;
  const stored = getBoard(B.id);
  if (!stored) return;
  if (stored.deleted && !B.deleted) {
    toast("เจ้าของย้ายบอร์ดนี้ไปถังขยะแล้ว");
    go("/dashboard");
    return;
  }
  B = CLOUD ? stored : mergeBoards(B, stored);
  setSyncBase();
  ROLE = roleOf(B);
  applyBg();
  resetBase();
  multi = multi.filter((id) => findObj(id));
  if (document.activeElement !== $("#bTitle")) $("#bTitle").value = B.title;
  $("#roBadge").hidden = canEdit();
  $("#tools").style.display = canEdit() ? "" : "none";
  if (sel && !findObj(sel)) sel = null;
  render();
}

window.addEventListener("storage", (e) => {
  if (!e.key || !e.key.startsWith(P)) return;
  const k = e.key.slice(P.length);
  if (B && k === "board_" + B.id) {
    if (drag || editing) pendingRemote = true;
    else pullRemote();
  } else if (B && k === "pres_" + B.id) renderPresence();
  else if (B && k === "timer_" + B.id) {
    const t = store.get("timer_" + B.id);
    if (t && t.end > Date.now()) toast(t.by + " เริ่มจับเวลา " + t.dur + " นาที");
    tickTimer();
  } else if (k.startsWith("board_") && $("#v-dash").classList.contains("on")) renderDash();
});

let myCursor = null;

// presence = ใครอยู่ในบอร์ด + ตำแหน่ง cursor
let presW = 0;
function writePresence(cur) {
  if (!B || !me) return;
  if (cur) myCursor = cur;
  if (CLOUD) {
    if (!cur && Date.now() - presW < 90) return;
    presW = Date.now();
    const r = vp.getBoundingClientRect();
    if (!cloud.presRef || cloud.presRef.key !== TAB_ID || cloud.presBoard !== B.id) {
      cloud.presRef = db.ref("boards/" + B.id + "/presence/" + TAB_ID);
      cloud.presBoard = B.id;
      cloud.presRef.onDisconnect().remove();
      const pr = db.ref("boards/" + B.id + "/presence");
      const cb = pr.on("value", (s) => {
        cloud.presence = s.val() || {};
        renderPresence();
      });
      cloud.presOff = () => pr.off("value", cb);
    }
    cloud.presRef.set(
      clean({
        name: me.name,
        email: me.email,
        color: me.color || colorFor(me.email),
        ts: nowS(),
        x: myCursor?.x,
        y: myCursor?.y,
        cx: (r.width / 2 - view.x) / view.z,
        cy: (r.height / 2 - view.y) / view.z,
        vz: view.z,
      }),
    );
    return;
  }
  const k = "pres_" + B.id,
    p = store.get(k, {}) || {},
    now = Date.now();
  for (const id in p) if (now - p[id].ts > 6e3) delete p[id];
  const r = vp.getBoundingClientRect();
  p[TAB_ID] = {
    name: me.name,
    email: me.email,
    color: me.color || colorFor(me.email),
    ts: now,
    x: myCursor?.x,
    y: myCursor?.y,
    cx: (r.width / 2 - view.x) / view.z,
    cy: (r.height / 2 - view.y) / view.z,
    vz: view.z,
  };
  try {
    localStorage.setItem(P + k, JSON.stringify(p));
  } catch (e) {}
}

function heartbeat() {
  writePresence();
  renderPresence();
}

function leavePresence() {
  if (CLOUD) {
    if (cloud.presOff) cloud.presOff();
    if (cloud.presRef) cloud.presRef.remove();
    cloud.presRef = cloud.presOff = null;
    cloud.presence = {};
    $("#cursors").innerHTML = "";
    return;
  }
  if (!B) return;
  const k = "pres_" + B.id,
    p = store.get(k, {}) || {};
  delete p[TAB_ID];
  try {
    localStorage.setItem(P + k, JSON.stringify(p));
  } catch (e) {}
  $("#cursors").innerHTML = "";
}

let lastFaces = null;

let tickT = null,
  timerDoneFor = 0;

const fmt = (ms) => {
  const t = Math.max(0, Math.ceil(ms / 1e3));
  return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
};

// timer
function tickTimer() {
  if (!B) return;
  const t = CLOUD ? cloud.boards[B.id]?.timer : store.get("timer_" + B.id),
    pill = $("#timerPill");
  if (!t) {
    pill.hidden = true;
    return;
  }
  const left = t.end - (CLOUD ? nowS() : Date.now());
  if (left <= -8e3) {
    pill.hidden = true;
    return;
  }
  pill.hidden = false;
  $("#timerT").textContent = left > 0 ? fmt(left) : "หมดเวลา";
  pill.classList.toggle("low", left > 0 && left <= 1e4);
  pill.classList.toggle("done", left <= 0);
  $("#timerStop").hidden = !canEdit();
  if (left <= 0 && timerDoneFor !== t.end) {
    timerDoneFor = t.end;
    if (left > -2e3) {
      toast("หมดเวลาแล้ว");
      beep();
    }
  }
}

function beep() {
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((d) => {
      const o = a.createOscillator(),
        g = a.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.15, a.currentTime + d);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + d + 0.2);
      o.connect(g).connect(a.destination);
      o.start(a.currentTime + d);
      o.stop(a.currentTime + d + 0.22);
    });
  } catch (e) {}
}

$("#timerBtn").onclick = (e) => {
  e.stopPropagation();
  if (!canEdit()) {
    toast("เฉพาะคนที่แก้ไขบอร์ดได้เท่านั้นที่ตั้งเวลาได้");
    return;
  }
  const p = $("#pop-timer"),
    on = p.classList.contains("on");
  closePops();
  $("#pop-bg").classList.remove("on");
  if (!on) p.classList.add("on");
};

$("#timerPresets").onclick = (e) => {
  const b = e.target.closest("[data-min]");
  if (!b) return;
  const m = +b.dataset.min;
  const t = { end: (CLOUD ? nowS() : Date.now()) + m * 6e4, dur: m, by: me.name };
  if (CLOUD) {
    lastTimerEnd[B.id] = t.end;
    db.ref("boards/" + B.id + "/timer").set(t);
  } else store.set("timer_" + B.id, t);
  $("#pop-timer").classList.remove("on");
  timerDoneFor = 0;
  tickTimer();
  toast("เริ่มจับเวลา " + m + " นาที");
};

$("#timerStop").onclick = () => {
  if (CLOUD) db.ref("boards/" + B.id + "/timer").remove();
  else store.del("timer_" + B.id);
  tickTimer();
};

document.addEventListener("click", (e) => {
  if (!e.target.closest("#pop-timer,#timerBtn")) $("#pop-timer").classList.remove("on");
});

let following = null,
  followName = "";

function startFollow(tab, name) {
  following = tab;
  followName = name;
  $("#followTxt").textContent = "กำลังดูตามหน้าจอของ " + name;
  $("#followBar").hidden = false;
  vp.classList.add("following");
  renderPresence();
}

function stopFollow() {
  if (!following) return;
  following = null;
  $("#followBar").hidden = true;
  vp.classList.remove("following");
  renderPresence();
}

$("#faces").onclick = (e) => {
  const b = e.target.closest(".face");
  if (!b || b.disabled) return;
  if (following === b.dataset.tab) stopFollow();
  else startFollow(b.dataset.tab, b.title.replace("ติดตามหน้าจอของ ", ""));
};

$("#stopFollow").onclick = stopFollow;

function renderPresence() {
  if (!B) return;
  const p = CLOUD ? cloud.presence : store.get("pres_" + B.id, {}) || {},
    now = CLOUD ? nowS() : Date.now();
  // บน cloud คนที่ปิดแท็บจะถูกลบออกเองผ่าน onDisconnect ส่วน 60 วิไว้กันกรณีค้าง
  const live = Object.entries(p).filter(([id, v]) => now - v.ts < (CLOUD ? 6e4 : 6e3));
  const names = new Map(live.filter(([, v]) => v.email !== me.email).map(([, v]) => [v.email, v.name]));
  if (lastFaces) {
    for (const [em, n] of names) if (!lastFaces.has(em)) toast(n + " เข้าร่วมบอร์ด");
    for (const [em, n] of lastFaces) if (!names.has(em)) toast(n + " ออกจากบอร์ดแล้ว");
  }
  lastFaces = names;
  const seen = new Set(),
    faces = [];
  for (const [id, v] of live) {
    if (seen.has(v.email)) continue;
    seen.add(v.email);
    faces.push({
      ...v,
      tab: id,
    });
  }
  if (following) {
    const L = live.find(([id]) => id === following);
    if (!L) {
      stopFollow();
      toast("คนที่คุณติดตามออกจากบอร์ดแล้ว");
    } else {
      const v = L[1],
        r = vp.getBoundingClientRect();
      if (v.cx != null) {
        view.z = v.vz;
        view.x = r.width / 2 - v.cx * v.vz;
        view.y = r.height / 2 - v.cy * v.vz;
        applyView();
      }
    }
  }
  $("#faces").innerHTML =
    faces
      .slice(0, 5)
      .map((u) => {
        const mine = u.email === me.email;
        return `<button class="face${following === u.tab ? " on" : ""}" data-tab="${u.tab}" ${mine ? "disabled" : ""} title="${mine ? "คุณ" : "ติดตามหน้าจอของ " + esc(u.name)}" aria-label="${mine ? "คุณ" : "ติดตาม " + esc(u.name)}">${avatarHTML(u)}</button>`;
      })
      .join("") +
    (faces.length > 5
      ? `<span class="avatar" style="background:var(--bone)">+${faces.length - 5}</span>`
      : "");
  $("#cursors").innerHTML = live
    .filter(([id, v]) => id !== TAB_ID && v.x != null)
    .map(
      ([, v]) =>
        `<div class="cursor" style="left:${v.x}px;top:${v.y}px"><svg width="18" height="20" viewBox="0 0 16 18"><path d="M1 1l13 7-6 1.5L5 16z" fill="${PALETTE[v.color]}" stroke="#fff" stroke-width="1.5"/></svg><span style="background:${PALETTE[v.color]}">${esc(v.name)}</span></div>`,
    )
    .join("");
}

window.addEventListener("beforeunload", () => {
  if (!B) return;
  if (editing) {
    const o = findObj(editing),
      el = objsEl.querySelector(`[data-id="${editing}"] .txt`);
    if (o && el) {
      o.text = el.innerText.replace(/\n$/, "");
      touch(o);
      save();
    }
  }
  leavePresence();
});

let curShare = null;

$("#shareBtn").onclick = () => {
  if (!B) return;
  curShare = B;
  openShare();
};

function inviteLink(id) {
  return location.href.split("#")[0] + "#/join/" + id;
}

function openShare() {
  const b = (curShare = getBoard(curShare.id) || curShare),
    r = roleOf(b);
  $("#shSub").textContent =
    r === "owner"
      ? "เชิญด้วยอีเมล หรือส่งลิงก์เชิญให้เพื่อนร่วมทีม"
      : "เฉพาะเจ้าของบอร์ดเท่านั้นที่เปลี่ยนสิทธิ์ได้ แต่คุณคัดลอกลิงก์ส่งต่อได้";
  $("#invForm").style.display = r === "owner" ? "" : "none";
  $("#linkRole").disabled = r !== "owner";
  $("#linkRole").value = b.linkRole || "editor";
  $("#invErr").textContent = "";
  $("#invEmail").value = "";
  $("#copyLink span").textContent = "คัดลอกลิงก์เชิญ";
  drawPeople();
  openModal("m-share");
}

function drawPeople() {
  const b = curShare,
    isOwner = roleOf(b) === "owner";
  const rows = [
    {
      email: b.owner,
      name: b.ownerName,
      role: "owner",
    },
    ...(b.members || []),
  ];
  $("#people").innerHTML = rows
    .map(
      (m) =>
        `<li>${avatarHTML({
          name: m.name || m.email,
          email: m.email,
        })}<span class="em">${esc(m.name || m.email.split("@")[0])}${m.email === me.email ? " (คุณ)" : ""}<small>${esc(m.email)}</small></span>\n    ${m.role === "owner" ? '<span style="font-size:13px;color:var(--muted)">เจ้าของ</span>' : isOwner ? `<select data-em="${esc(m.email)}" aria-label="สิทธิ์ของ ${esc(m.email)}"><option value="editor"${m.role === "editor" ? " selected" : ""}>แก้ไขได้</option><option value="viewer"${m.role === "viewer" ? " selected" : ""}>ดูอย่างเดียว</option><option value="remove">นำออก</option></select>` : `<span style="font-size:13px;color:var(--muted)">${m.role === "editor" ? "แก้ไขได้" : "ดูอย่างเดียว"}</span>`}</li>`,
    )
    .join("");
}

function saveShare() {
  curShare.metaT = curShare.updated = Date.now();
  putBoard(curShare);
  if (!CLOUD && B && B.id === curShare.id) {
    B = mergeBoards(curShare, B);
    B.members = curShare.members;
    B.linkRole = curShare.linkRole;
  }
}

$("#invForm").onsubmit = (e) => {
  e.preventDefault();
  const em = $("#invEmail").value.trim().toLowerCase(),
    b = curShare;
  if (!isEmail(em)) {
    $("#invErr").textContent = "รูปแบบอีเมลไม่ถูกต้อง เช่น friend@email.com";
    return;
  }
  if (em === b.owner || (b.members || []).some((m) => m.email === em)) {
    $("#invErr").textContent = "อีเมลนี้มีสิทธิ์เข้าถึงบอร์ดอยู่แล้ว";
    return;
  }
  b.members = [
    ...(b.members || []),
    {
      email: em,
      role: $("#invRole").value,
    },
  ];
  saveShare();
  $("#invEmail").value = "";
  $("#invErr").textContent = "";
  drawPeople();
  toast("เชิญ " + em + " แล้ว");
};

$("#people").onchange = (e) => {
  const s = e.target.closest("select");
  if (!s) return;
  const b = curShare;
  if (s.value === "remove") b.members = b.members.filter((m) => m.email !== s.dataset.em);
  else b.members.find((m) => m.email === s.dataset.em).role = s.value;
  saveShare();
  drawPeople();
};

$("#linkRole").onchange = () => {
  curShare.linkRole = $("#linkRole").value;
  saveShare();
};

$("#copyLink").onclick = async () => {
  const link = inviteLink(curShare.id);
  let ok = false;
  try {
    await navigator.clipboard.writeText(link);
    ok = true;
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = link;
    document.body.appendChild(ta);
    ta.select();
    try {
      ok = document.execCommand("copy");
    } catch (_) {}
    ta.remove();
  }
  $("#copyLink span").textContent = ok ? "คัดลอกลิงก์แล้ว" : "คัดลอกไม่สำเร็จ";
  if (!ok) prompt("คัดลอกลิงก์นี้", link);
};

// เข้าบอร์ดจากลิงก์เชิญ
function joinBoard(id) {
  if (CLOUD && !cloudLoaded(id)) {
    showView("v-board");
    boardMsg("กำลังเข้าร่วมบอร์ด...", "", false);
    whenLoaded(id, () => {
      if (location.hash === "#/join/" + id) joinBoard(id);
    });
    return;
  }
  const b = getBoard(id);
  if (!b) {
    go("/board/" + id);
    return;
  }
  const r = roleOf(b);
  if (!r) {
    b.members = [
      ...(b.members || []),
      {
        email: me.email,
        name: me.name,
        role: b.linkRole || "editor",
      },
    ];
    b.metaT = Date.now();
    putBoard(b);
    toast("เข้าร่วม “" + b.title + "” แล้ว");
  } else {
    const m = (b.members || []).find((m) => m.email === me.email);
    if (m && !m.name) {
      m.name = me.name;
      putBoard(b);
    }
  }
  history.replaceState(null, "", "#/board/" + id);
  route();
}

let expFmt = "pdf";

$("#exportBtn").onclick = () => {
  if (!B) return;
  $("#expName").value = B.title.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "-");
  openModal("m-export");
  updPreview();
};

$$(".fmt button").forEach(
  (b) =>
    (b.onclick = () => {
      expFmt = b.dataset.fmt;
      $$(".fmt button").forEach((x) => {
        x.classList.toggle("on", x === b);
        x.setAttribute("aria-checked", x === b);
      });
    }),
);

$("#expWhite").onchange = updPreview;

async function updPreview() {
  const c = await drawBoardCanvas(B, {
    white: $("#expWhite").checked,
    scale: 0.6,
  });
  $("#expPrev").src = c.toDataURL("image/png");
}

function wrapLines(ctx, text, maxW) {
  const out = [];
  const seg =
    typeof Intl !== "undefined" && Intl.Segmenter
      ? new Intl.Segmenter("th", {
          granularity: "word",
        })
      : null;
  for (const para of String(text || "").split("\n")) {
    const words = seg ? [...seg.segment(para)].map((s) => s.segment) : para.split(/(\s+)/);
    let line = "";
    for (const w of words) {
      const test = line + w;
      if (ctx.measureText(test).width > maxW && line) {
        out.push(line);
        line = w.trimStart();
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

// export png / pdf
async function drawBoardCanvas(b, { white = false, scale = 2 } = {}) {
  await document.fonts.ready;
  const objs = [...b.objects].sort((a, c) => (a.z || 0) - (c.z || 0));
  const bb = boundsOf(objs) || {
    x: 0,
    y: 0,
    w: 800,
    h: 500,
  };
  const pad = 60;
  const W = bb.w + pad * 2,
    H = bb.h + pad * 2;
  const s = Math.min(scale, 6e3 / Math.max(W, H));
  const cv = document.createElement("canvas");
  cv.width = Math.round(W * s);
  cv.height = Math.round(H * s);
  const LT = white || isLight(b);
  const ctx = cv.getContext("2d");
  ctx.scale(s, s);
  ctx.fillStyle = white ? "#FFFFFF" : bgColor(b);
  ctx.fillRect(0, 0, W, H);
  ctx.translate(pad - bb.x, pad - bb.y);
  const fg = (k) => colOn(k, LT);
  const font = (sz, w = 500) => `${w} ${sz}px "IBM Plex Sans Thai", sans-serif`;
  const text = (t, x, y, maxW, sz, color, center, maxH) => {
    ctx.font = font(sz);
    ctx.fillStyle = color;
    const lh = sz * 1.45;
    let lines = wrapLines(ctx, t, maxW);
    if (maxH) lines = lines.slice(0, Math.max(1, Math.floor(maxH / lh)));
    let yy = center ? y - (lines.length * lh) / 2 + lh * 0.78 : y + sz;
    ctx.textAlign = center ? "center" : "left";
    for (const l of lines) {
      ctx.fillText(l, x, yy);
      yy += lh;
    }
    ctx.textAlign = "left";
  };
  for (const o of objs) {
    const c = PALETTE[o.color] || PALETTE.bone;
    if (o.type === "note") {
      ctx.fillStyle = "rgba(0,0,0,.25)";
      ctx.fillRect(o.x + 1, o.y + 3, o.w, o.h);
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(o.x, o.y, o.w, o.h, 4) : ctx.rect(o.x, o.y, o.w, o.h);
      ctx.fill();
      text(o.text, o.x + 12, o.y + 10, o.w - 24, o.fs || 15, "#1E2530", false, o.h - 22);
      if (b.showBy !== false && o.by) {
        ctx.font = font(10.5, 600);
        const tw = ctx.measureText(o.by.name).width + 16,
          tx = o.x + o.w - 6 - tw,
          ty = o.y + o.h - 9;
        ctx.fillStyle = PALETTE[o.by.color] || PALETTE.bone;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(tx, ty, tw, 18, 9) : ctx.rect(tx, ty, tw, 18);
        ctx.fill();
        ctx.fillStyle = "#1E2530";
        ctx.fillText(o.by.name, tx + 8, ty + 13);
      }
      let rx = o.x + 8;
      for (const [em, v] of Object.entries(o.reacts || {})) {
        if (!v.length) continue;
        ctx.font = font(12, 600);
        const lab = em + " " + v.length,
          tw = ctx.measureText(lab).width + 14;
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.roundRect
          ? ctx.roundRect(rx, o.y + o.h - 12, tw, 22, 11)
          : ctx.rect(rx, o.y + o.h - 12, tw, 22);
        ctx.fill();
        ctx.fillStyle = "#1E2530";
        ctx.fillText(lab, rx + 7, o.y + o.h + 4);
        rx += tw + 4;
      }
    } else if (o.type === "react") {
      ctx.font = `${o.w * 0.78}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(o.emoji, o.x + o.w / 2, o.y + o.h / 2 + o.w * 0.04);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    } else if (o.type === "text")
      text(o.text, o.x + 4, o.y + 2, Math.max(o.w, 40), o.size || 24, fg(o.color));
    else if (o.type === "shape") {
      const col = fg(o.color);
      ctx.lineWidth = 3;
      ctx.strokeStyle = col;
      ctx.fillStyle = col + "22";
      ctx.beginPath();
      if (o.kind === "ellipse")
        ctx.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
      else if (ctx.roundRect) ctx.roundRect(o.x, o.y, o.w, o.h, 6);
      else ctx.rect(o.x, o.y, o.w, o.h);
      ctx.fill();
      ctx.stroke();
      if (o.text) text(o.text, o.x + o.w / 2, o.y + o.h / 2, o.w - 16, 15, fg("bone"), true);
    } else if (o.type === "line") {
      const col = fg(o.color);
      ctx.strokeStyle = ctx.fillStyle = col;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(o.x1, o.y1);
      ctx.lineTo(o.x2, o.y2);
      ctx.stroke();
      const a = Math.atan2(o.y2 - o.y1, o.x2 - o.x1),
        L = 13;
      ctx.beginPath();
      ctx.moveTo(o.x2 + Math.cos(a) * 3, o.y2 + Math.sin(a) * 3);
      ctx.lineTo(o.x2 - L * Math.cos(a - 0.45), o.y2 - L * Math.sin(a - 0.45));
      ctx.lineTo(o.x2 - L * Math.cos(a + 0.45), o.y2 - L * Math.sin(a + 0.45));
      ctx.fill();
    } else if (o.type === "stroke") {
      ctx.save();
      ctx.globalAlpha = o.hl ? 0.4 : 1;
      ctx.strokeStyle = fg(o.color);
      ctx.lineWidth = o.w;
      ctx.lineCap = o.hl ? "butt" : "round";
      ctx.lineJoin = "round";
      ctx.stroke(new Path2D(pathD(o.pts)));
      ctx.restore();
    } else if (o.type === "image") {
      await new Promise((res) => {
        const i = new Image();
        i.onload = () => {
          ctx.drawImage(i, o.x, o.y, o.w, o.h);
          res();
        };
        i.onerror = res;
        i.src = o.src;
      });
    }
  }
  return cv;
}

function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4e3);
}

function loadJsPDF() {
  return window.jspdf
    ? Promise.resolve()
    : new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
      });
}

$("#expGo").onclick = async () => {
  const btn = $("#expGo"),
    lbl = btn.querySelector("span");
  const name = $("#expName").value.trim() || "magic-coop-board";
  btn.disabled = true;
  lbl.textContent = "กำลังสร้างไฟล์...";
  try {
    const cv = await drawBoardCanvas(B, {
      white: $("#expWhite").checked,
      scale: 2,
    });
    if (expFmt === "png") {
      const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
      download(blob, name + ".png");
    } else {
      await loadJsPDF();
      const { jsPDF } = window.jspdf;
      const land = cv.width >= cv.height;
      const pdf = new jsPDF({
        orientation: land ? "landscape" : "portrait",
        unit: "pt",
        format: "a4",
      });
      const pw = pdf.internal.pageSize.getWidth(),
        ph = pdf.internal.pageSize.getHeight(),
        m = 24,
        k = Math.min((pw - m * 2) / cv.width, (ph - m * 2) / cv.height);
      const w = cv.width * k,
        h = cv.height * k;
      pdf.addImage(cv.toDataURL("image/jpeg", 0.92), "JPEG", (pw - w) / 2, (ph - h) / 2, w, h);
      pdf.save(name + ".pdf");
    }
    closeModal("m-export");
    toast("ดาวน์โหลด " + name + "." + expFmt + " แล้ว");
  } catch (e) {
    console.error(e);
    toast(
      expFmt === "pdf"
        ? "สร้าง PDF ไม่สำเร็จ ต้องต่ออินเทอร์เน็ตเพื่อโหลดตัวสร้าง PDF หรือเลือก PNG แทน"
        : "สร้างไฟล์ไม่สำเร็จ ลองอีกครั้ง",
    );
  } finally {
    btn.disabled = false;
    lbl.textContent = "ดาวน์โหลด";
  }
};

// ของตกแต่งหน้าแรก: เอียงแบบ 3D ตามเมาส์ ลากเล่นได้ ปล่อยแล้วเด้งกลับที่เดิม
(function () {
  const all = document.querySelectorAll(".hero-scene .fl, .deco-scene .fl");
  if (!all.length) return;
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const items = [...all].map((el) => ({
    el,
    d: +el.dataset.d || 50,
    x: 0, y: 0, vx: 0, vy: 0,
    drag: null,
  }));
  let mx = 0, my = 0, tx = 0, ty = 0;
  window.addEventListener("mousemove", (e) => {
    mx = e.clientX / innerWidth - 0.5;
    my = e.clientY / innerHeight - 0.5;
  });

  items.forEach((it) => {
    it.el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      it.el.setPointerCapture(e.pointerId);
      it.drag = { sx: e.clientX - it.x, sy: e.clientY - it.y };
      it.el.classList.add("drag");
    });
    it.el.addEventListener("pointermove", (e) => {
      if (!it.drag) return;
      const nx = e.clientX - it.drag.sx, ny = e.clientY - it.drag.sy;
      it.vx = nx - it.x;
      it.vy = ny - it.y;
      it.x = nx;
      it.y = ny;
    });
    const up = () => {
      it.drag = null;
      it.el.classList.remove("drag");
    };
    it.el.addEventListener("pointerup", up);
    it.el.addEventListener("pointercancel", up);
  });

  function frame() {
    if (!calm) {
      tx += (mx - tx) * 0.06;
      ty += (my - ty) * 0.06;
    }
    for (const it of items) {
      if (!it.drag) {
        // สปริงดึงกลับ ให้เด้งนิดๆ ก่อนหยุด
        it.vx = (it.vx - it.x * 0.06) * 0.86;
        it.vy = (it.vy - it.y * 0.06) * 0.86;
        it.x += it.vx;
        it.y += it.vy;
      }
      const k = it.d / 60;
      const px = tx * 40 * k, py = ty * 30 * k;
      const tilt = it.drag ? 0 : 1;
      it.el.style.transform =
        `translate3d(${it.x + px}px, ${it.y + py}px, ${it.d * 0.5}px) ` +
        `rotateY(${tx * 22 * tilt}deg) rotateX(${-ty * 18 * tilt}deg)` +
        (it.drag ? " scale(1.08)" : "");
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

route();
