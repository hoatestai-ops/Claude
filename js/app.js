(function () {
  'use strict';

  const { FOODS, FOOD_CATEGORIES, COMBOS } = window.FoodDB;
  const Calc = window.Calc;

  const STORE_KEY = 'socalo.v1';
  const VIEWS = ['hom-nay', 'ke-hoach', 'can-nang', 'ho-so'];
  const MEALS = [
    { id: 'breakfast', label: 'Bữa sáng' },
    { id: 'lunch', label: 'Bữa trưa' },
    { id: 'dinner', label: 'Bữa tối' },
    { id: 'snack', label: 'Ăn vặt' },
  ];
  const MEAL_LABEL = Object.fromEntries(MEALS.map((m) => [m.id, m.label]));
  const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const nf0 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nfq = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
  const k0 = (n) => nf0.format(Math.round(n));
  const k1 = (n) => nf1.format(n);

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const fold = (s) =>
    String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

  /* ---------------- Ngày tháng ---------------- */
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = (k) => {
    const [y, m, d] = k.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const addDays = (k, n) => {
    const d = parseKey(k);
    d.setDate(d.getDate() + n);
    return keyOf(d);
  };
  const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
  const today = () => keyOf(new Date());
  const dm = (k) => {
    const d = parseKey(k);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  };
  const dmy = (k) => `${dm(k)}/${parseKey(k).getFullYear()}`;
  const longDate = (k) =>
    parseKey(k).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' });
  const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);

  /* ---------------- Lưu trữ ---------------- */
  function normalize(d) {
    if (!d || typeof d !== 'object') throw new Error('Dữ liệu không đúng định dạng');
    const out = { profile: null, logs: {}, weights: [], customFoods: [], sample: !!d.sample };
    const p = d.profile;
    if (p && typeof p === 'object') {
      const num = (v) => Number(v);
      const prof = {
        sex: p.sex === 'male' ? 'male' : 'female',
        age: num(p.age),
        height: num(p.height),
        weight: num(p.weight),
        goalWeight: num(p.goalWeight),
        activity: Calc.ACTIVITY[p.activity] ? p.activity : 'sedentary',
        rate: Calc.RATES.includes(num(p.rate)) ? num(p.rate) : 0.5,
        startDate: isKey(p.startDate) ? p.startDate : today(),
      };
      if ([prof.age, prof.height, prof.weight, prof.goalWeight].every((n) => Number.isFinite(n) && n > 0)) out.profile = prof;
    }
    if (d.logs && typeof d.logs === 'object') {
      for (const [k, day] of Object.entries(d.logs)) {
        if (!isKey(k) || !day) continue;
        const entries = Array.isArray(day.entries)
          ? day.entries
              .filter((e) => e && MEAL_LABEL[e.meal] && Number.isFinite(Number(e.kcal)))
              .map((e) => ({
                id: String(e.id || uid('e')),
                meal: e.meal,
                foodId: e.foodId ? String(e.foodId) : null,
                name: String(e.name || 'Món ăn').slice(0, 80),
                serving: String(e.serving || '1 phần').slice(0, 40),
                kcal: Number(e.kcal),
                p: Number(e.p) || 0,
                c: Number(e.c) || 0,
                f: Number(e.f) || 0,
                qty: Number(e.qty) > 0 ? Number(e.qty) : 1,
              }))
          : [];
        out.logs[k] = { entries, water: Math.max(0, Math.min(20, Number(day.water) || 0)) };
      }
    }
    if (Array.isArray(d.weights)) {
      out.weights = d.weights
        .filter((w) => w && isKey(w.date) && Number(w.kg) > 0)
        .map((w) => ({ date: w.date, kg: Number(w.kg) }));
    }
    if (Array.isArray(d.customFoods)) {
      out.customFoods = d.customFoods
        .filter((f) => f && f.name && Number.isFinite(Number(f.kcal)))
        .map((f) => ({
          id: String(f.id || uid('u')),
          name: String(f.name).slice(0, 80),
          cat: 'cua-toi',
          serving: String(f.serving || '1 phần').slice(0, 40),
          kcal: Number(f.kcal),
          p: Number(f.p) || 0,
          c: Number(f.c) || 0,
          f: Number(f.f) || 0,
        }));
    }
    return out;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) {
      /* bộ nhớ trình duyệt bị chặn hoặc dữ liệu hỏng: dùng dữ liệu mẫu */
    }
    return null;
  }
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      /* không lưu được (chế độ ẩn danh...): app vẫn chạy trong phiên này */
    }
  }

  function entryFromFood(food, meal, qty) {
    return {
      id: uid('e'),
      meal,
      foodId: food.id,
      name: food.name,
      serving: food.serving,
      kcal: food.kcal,
      p: food.p,
      c: food.c,
      f: food.f,
      qty,
    };
  }

  function sampleState() {
    const t = today();
    const start = addDays(t, -21);
    const fb = (id) => FOODS.find((f) => f.id === id);
    const mk = (meal, list) => list.map(([id, q]) => entryFromFood(fb(id), meal, q));
    return {
      sample: true,
      profile: { sex: 'female', age: 28, height: 162, weight: 64, goalWeight: 56, activity: 'light', rate: 0.5, startDate: start },
      weights: [
        { date: start, kg: 64 },
        { date: addDays(t, -14), kg: 63.4 },
        { date: addDays(t, -10), kg: 63.3 },
        { date: addDays(t, -7), kg: 62.8 },
        { date: addDays(t, -3), kg: 62.7 },
        { date: t, kg: 62.4 },
      ],
      logs: {
        [addDays(t, -6)]: { water: 7, entries: [...mk('breakfast', [['pho-bo', 1]]), ...mk('lunch', [['com-tam', 1]]), ...mk('dinner', [['com-trang', 1], ['ca-kho', 1], ['rau-luoc', 1]])] },
        [addDays(t, -5)]: { water: 8, entries: [...mk('breakfast', [['banh-mi-trung', 1]]), ...mk('lunch', [['bun-cha', 1]]), ...mk('dinner', [['chao-ga', 1]]), ...mk('snack', [['tra-sua', 1]])] },
        [addDays(t, -4)]: { water: 6, entries: [...mk('breakfast', [['xoi-xeo', 1]]), ...mk('lunch', [['com-ga', 1]]), ...mk('dinner', [['bun-rieu', 1]])] },
        [addDays(t, -3)]: { water: 9, entries: [...mk('breakfast', [['yen-mach', 1], ['chuoi', 1]]), ...mk('lunch', [['com-gao-lut', 1], ['uc-ga', 1.5], ['rau-luoc', 1]]), ...mk('dinner', [['tom-luoc', 1.5], ['ngo-luoc', 1]])] },
        [addDays(t, -2)]: { water: 7, entries: [...mk('breakfast', [['pho-ga', 1]]), ...mk('lunch', [['bun-thit-nuong', 1]]), ...mk('dinner', [['com-trang', 1], ['thit-kho', 1]]), ...mk('snack', [['cafe-sua', 1]])] },
        [addDays(t, -1)]: { water: 8, entries: [...mk('breakfast', [['banh-cuon', 1]]), ...mk('lunch', [['com-trang', 1], ['dau-phu', 1.5], ['canh-chua', 1]]), ...mk('dinner', [['uc-ga', 1.5], ['salad', 1], ['khoai-lang', 1]]), ...mk('snack', [['oi', 1]])] },
        [t]: { water: 4, entries: [...mk('breakfast', [['banh-mi-trung', 1], ['cafe-den', 1]]), ...mk('lunch', [['com-trang', 1], ['ca-kho', 1], ['rau-muong-xao', 1]]), ...mk('snack', [['oi', 1]])] },
      },
      customFoods: [],
    };
  }

  function emptyState() {
    return { sample: false, profile: null, logs: {}, weights: [], customFoods: [] };
  }

  let state = load() || sampleState();
  const ui = { date: today(), view: 'hom-nay', sheet: null, resetArmed: false, lastDeleted: null };

  /* ---------------- Truy vấn ---------------- */
  const allFoods = () => FOODS.concat(state.customFoods);
  const findFood = (id) => allFoods().find((f) => f.id === id);
  const getDay = (k) => state.logs[k] || { entries: [], water: 0 };
  const ensureDay = (k) => (state.logs[k] = state.logs[k] || { entries: [], water: 0 });
  const sortedWeights = () => [...state.weights].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  function currentWeight() {
    const ws = sortedWeights();
    if (ws.length) return ws[ws.length - 1].kg;
    return state.profile ? state.profile.weight : null;
  }
  function currentTarget() {
    if (!state.profile) return null;
    return Calc.dailyTarget(state.profile, currentWeight());
  }
  function recentFoodIds() {
    const keys = Object.keys(state.logs).sort().reverse().slice(0, 14);
    const seen = [];
    for (const k of keys) {
      for (const e of [...state.logs[k].entries].reverse()) {
        if (e.foodId && !seen.includes(e.foodId) && findFood(e.foodId)) seen.push(e.foodId);
        if (seen.length >= 12) return seen;
      }
    }
    return seen;
  }

  /* ---------------- Toast ---------------- */
  let toastTimer = null;
  function toast(msg, action) {
    const el = $('#toast');
    el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button" id="toast-action">${esc(action.label)}</button>` : ''}`;
    el.hidden = false;
    if (action) $('#toast-action').onclick = () => { action.run(); el.hidden = true; };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, action ? 6000 : 3000);
  }

  /* ---------------- Hôm nay ---------------- */
  function dayTitle(k) {
    const diff = daysBetween(k, today());
    if (diff === 0) return 'Hôm nay';
    if (diff === 1) return 'Hôm qua';
    if (diff === -1) return 'Ngày mai';
    const d = parseKey(k);
    return `${WEEKDAYS[d.getDay()]}, ${dm(k)}`;
  }

  function ringSvg(consumed, target) {
    const r = 86;
    const c = 2 * Math.PI * r;
    const pct = target ? Math.min(consumed / target, 1) : 0;
    const over = target && consumed > target;
    return `<svg class="ring" viewBox="0 0 200 200" aria-hidden="true">
      <circle class="ring-track" cx="100" cy="100" r="${r}"/>
      <circle class="ring-fill${over ? ' over' : ''}" cx="100" cy="100" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}"/>
    </svg>`;
  }

  function macroBar(label, color, got, goal) {
    const pct = goal ? Math.min(100, (got / goal) * 100) : 0;
    return `<div class="macro">
      <div class="macro-top"><span><i class="dot" style="--c:var(${color})"></i>${label}</span><span>${k0(got)}${goal ? ` / ${k0(goal)}` : ''} g</span></div>
      <div class="bar" role="img" aria-label="${label}: ${k0(got)} trên ${goal ? k0(goal) : '?'} gam"><i style="width:${pct.toFixed(1)}%;--c:var(${color})"></i></div>
    </div>`;
  }

  function weekStrip(target) {
    const days = [];
    for (let i = 6; i >= 0; i--) days.push(addDays(ui.date, -i));
    const vals = days.map((k) => Calc.sumEntries(getDay(k).entries).kcal);
    const max = Math.max(target ? target * 1.25 : 0, ...vals, 1);
    const bars = days
      .map((k, i) => {
        const v = vals[i];
        const over = target && v > target;
        const sel = k === ui.date;
        return `<button type="button" class="week-bar${over ? ' over' : ''}${sel ? ' sel' : ''}" data-action="pick-day" data-date="${k}" aria-label="${dayTitle(k)}: ${k0(v)} kcal"><i style="height:${((v / max) * 100).toFixed(1)}%"></i></button>`;
      })
      .join('');
    const line = target ? `<div class="week-target" style="bottom:${((target / max) * 100).toFixed(1)}%" title="Mục tiêu ${k0(target)} kcal"></div>` : '';
    const labels = days.map((k) => `<span>${WEEKDAYS[parseKey(k).getDay()]}</span>`).join('');
    const logged = vals.filter((v) => v > 0);
    const avg = logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : 0;
    return `<div class="week">
      <div class="panel-head"><h3>7 ngày</h3><p>${logged.length ? `Trung bình ${k0(avg)} kcal/ngày` : 'Chưa có dữ liệu'}</p></div>
      <div class="week-bars">${line}${bars}</div>
      <div class="week-days">${labels}</div>
    </div>`;
  }

  function renderToday() {
    const el = $('#view-hom-nay');
    const day = getDay(ui.date);
    const tot = Calc.sumEntries(day.entries);
    const p = state.profile;
    const w = currentWeight();
    const plan = currentTarget();
    const target = plan ? plan.target : null;
    const macros = plan ? Calc.macroTargets(target, p, w) : null;
    const water = w ? Calc.waterTarget(w) : { ml: 2000, glasses: 8 };
    const remaining = target ? target - tot.kcal : null;
    const isToday = ui.date === today();

    const centre = target
      ? `<span class="big${remaining < 0 ? ' over' : ''}">${k0(Math.abs(remaining))}</span><span class="lbl">${remaining < 0 ? 'kcal vượt mức' : 'kcal còn lại'}</span>`
      : `<span class="big">${k0(tot.kcal)}</span><span class="lbl">kcal đã ăn</span>`;

    const glasses = Array.from({ length: Math.max(water.glasses, day.water) }, (_, i) => {
      const full = i < day.water;
      return `<button type="button" class="glass${full ? ' full' : ''}" data-action="water" data-n="${i + 1}" aria-label="${i + 1} ly" aria-pressed="${full}"></button>`;
    }).join('');

    const meals = MEALS.map((m) => {
      const list = day.entries.filter((e) => e.meal === m.id);
      const mk = Calc.sumEntries(list).kcal;
      const budget = target ? target * Calc.MEAL_SPLIT[m.id] : null;
      const items = list
        .map((e) => {
          const kcal = e.kcal * e.qty;
          return `<li class="entry">
            <div class="entry-name"><b>${esc(e.name)}</b><span>${e.qty === 1 ? '' : `${nfq.format(e.qty)} × `}${esc(e.serving)}</span></div>
            <span class="entry-kcal">${k0(kcal)}</span>
            <button type="button" class="icon-btn" data-action="del-entry" data-id="${esc(e.id)}" aria-label="Xoá ${esc(e.name)}">×</button>
          </li>`;
        })
        .join('');
      return `<article class="meal">
        <div class="meal-head">
          <h3>${m.label}</h3>
          <span class="meal-kcal${budget && mk > budget * 1.15 ? ' over' : ''}">${k0(mk)}${budget ? ` / ~${k0(budget)}` : ''} kcal</span>
          <button type="button" class="btn btn-primary" data-action="add-food" data-meal="${m.id}">+ Thêm món</button>
        </div>
        <ul class="entries">${items}</ul>
        ${list.length ? '' : `<p class="meal-empty">Chưa ghi món nào.</p>`}
      </article>`;
    }).join('');

    el.innerHTML = `
      <div class="daybar">
        <button type="button" class="icon-btn" data-action="prev-day" aria-label="Ngày trước">‹</button>
        <div class="daylabel"><strong>${dayTitle(ui.date)}</strong><span>${longDate(ui.date)}</span></div>
        ${isToday ? '' : `<button type="button" class="btn" data-action="go-today">Về hôm nay</button>`}
        <button type="button" class="icon-btn" data-action="next-day" aria-label="Ngày sau" ${isToday ? 'disabled' : ''}>›</button>
      </div>
      <div class="today-grid">
        <section class="panel" aria-label="Tổng quan calo">
          <div class="ring-wrap">${ringSvg(tot.kcal, target)}<div class="ring-center">${centre}</div></div>
          ${target
            ? `<div class="kv-row"><div><b>${k0(target)}</b><span>Mục tiêu</span></div><div><b>${k0(tot.kcal)}</b><span>Đã ăn</span></div><div><b>${k0(plan.tdee)}</b><span>Tiêu hao</span></div></div>`
            : `<div class="notice">Nhập hồ sơ để app tính mục tiêu calo cho bạn. <a href="#ho-so">Mở Hồ sơ</a></div>`}
          <div class="macros">
            ${macroBar('Đạm', '--protein', tot.p, macros && macros.protein)}
            ${macroBar('Tinh bột', '--carb', tot.c, macros && macros.carbs)}
            ${macroBar('Chất béo', '--fat', tot.f, macros && macros.fat)}
          </div>
          <div class="water">
            <div class="water-head"><b>Nước uống</b><span class="muted tabular">${k1((day.water * 250) / 1000)} / ${k1(water.ml / 1000)} lít</span></div>
            <div class="glasses">${glasses}</div>
          </div>
          ${weekStrip(target)}
        </section>
        <div class="meals">${meals}</div>
      </div>`;
  }

  /* ---------------- Bảng chọn món ---------------- */
  function openSheet(meal) {
    const recents = recentFoodIds();
    ui.sheet = { meal, tab: 'search', cat: recents.length ? 'gan-day' : 'all', query: '', selected: null, qty: 1, returnFocus: document.activeElement };
    renderSheet();
    $('#sheet').hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => { const s = $('#food-search'); if (s) s.focus(); }, 30);
  }
  function closeSheet() {
    if (!ui.sheet) return;
    const back = ui.sheet.returnFocus;
    ui.sheet = null;
    $('#sheet').hidden = true;
    document.body.style.overflow = '';
    if (back && document.contains(back)) back.focus();
  }

  function renderSheet() {
    const s = ui.sheet;
    const panel = $('#sheet .sheet-panel');
    const recents = recentFoodIds();
    const cats = [
      ...(recents.length ? [{ id: 'gan-day', label: 'Gần đây' }] : []),
      { id: 'all', label: 'Tất cả' },
      ...(state.customFoods.length ? [{ id: 'cua-toi', label: 'Món của tôi' }] : []),
      ...FOOD_CATEGORIES,
    ];
    panel.innerHTML = `
      <div class="sheet-head">
        <h2 id="sheet-title">Thêm vào ${MEAL_LABEL[s.meal].toLowerCase()}</h2>
        <div class="seg" role="group" aria-label="Cách thêm">
          <button type="button" data-action="sheet-tab" data-tab="search" aria-pressed="${s.tab === 'search'}">Chọn món</button>
          <button type="button" data-action="sheet-tab" data-tab="custom" aria-pressed="${s.tab === 'custom'}">Tự nhập</button>
        </div>
        <button type="button" class="icon-btn" data-action="close-sheet" aria-label="Đóng">×</button>
      </div>
      ${s.tab === 'search'
        ? `<div class="sheet-tools">
            <input id="food-search" type="search" placeholder="Tìm món: pho, com tam, trứng…" value="${esc(s.query)}" autocomplete="off" aria-label="Tìm món ăn">
            <div class="chips" role="group" aria-label="Nhóm món">${cats
              .map((c) => `<button type="button" data-action="cat" data-cat="${c.id}" aria-pressed="${s.cat === c.id && !s.query}">${esc(c.label)}</button>`)
              .join('')}</div>
          </div>
          <div class="sheet-body"><ul class="results" id="food-results"></ul></div>
          <div class="portion" id="portion" hidden></div>`
        : `<div></div><div class="sheet-body custom-pane">${customForm()}</div><div></div>`}
    `;
    if (s.tab === 'search') {
      renderResults();
      renderPortion();
    }
  }

  function customForm() {
    return `<form class="form" id="custom-form" novalidate>
      <div class="field"><label for="cf-name">Tên món</label><input id="cf-name" type="text" required maxlength="80" placeholder="Ví dụ: Bánh canh cua"></div>
      <div class="form-grid">
        <div class="field"><label for="cf-kcal">Calo (kcal)</label><input id="cf-kcal" type="number" inputmode="decimal" min="0" max="5000" required placeholder="450"></div>
        <div class="field"><label for="cf-serving">Khẩu phần</label><input id="cf-serving" type="text" maxlength="40" placeholder="1 tô"></div>
      </div>
      <div class="form-grid">
        <div class="field"><label for="cf-p">Đạm (g)</label><input id="cf-p" type="number" inputmode="decimal" min="0" placeholder="Không bắt buộc"></div>
        <div class="field"><label for="cf-c">Tinh bột (g)</label><input id="cf-c" type="number" inputmode="decimal" min="0" placeholder="Không bắt buộc"></div>
        <div class="field"><label for="cf-f">Chất béo (g)</label><input id="cf-f" type="number" inputmode="decimal" min="0" placeholder="Không bắt buộc"></div>
      </div>
      <label class="check"><input id="cf-save" type="checkbox" checked> Lưu vào “Món của tôi” để lần sau chọn nhanh</label>
      <p class="small muted" id="cf-error" role="alert"></p>
      <div><button type="submit" class="btn btn-primary">Thêm vào ${MEAL_LABEL[ui.sheet.meal].toLowerCase()}</button></div>
    </form>`;
  }

  function filteredFoods() {
    const s = ui.sheet;
    const q = fold(s.query.trim());
    let list = allFoods();
    if (q) {
      const terms = q.split(/\s+/);
      list = list.filter((f) => {
        const hay = fold(f.name);
        return terms.every((t) => hay.includes(t));
      });
      list.sort((a, b) => fold(a.name).indexOf(terms[0]) - fold(b.name).indexOf(terms[0]));
    } else if (s.cat === 'gan-day') {
      list = recentFoodIds().map(findFood).filter(Boolean);
    } else if (s.cat !== 'all') {
      list = list.filter((f) => f.cat === s.cat);
    }
    return list;
  }

  function renderResults() {
    const s = ui.sheet;
    const ul = $('#food-results');
    if (!ul) return;
    const list = filteredFoods();
    ul.innerHTML = list.length
      ? list
          .map(
            (f) => `<li><button type="button" data-action="pick-food" data-id="${esc(f.id)}" aria-pressed="${s.selected === f.id}">
              <span><b>${esc(f.name)}</b><span>${esc(f.serving)}</span></span><span class="k">${k0(f.kcal)} kcal</span></button></li>`
          )
          .join('')
      : `<li class="no-results">Không tìm thấy “${esc(s.query)}”. Bạn có thể chuyển sang <button type="button" class="btn" data-action="sheet-tab" data-tab="custom">Tự nhập</button></li>`;
    $('#sheet .chips').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === s.cat && !s.query)));
  }

  function renderPortion() {
    const s = ui.sheet;
    const box = $('#portion');
    if (!box) return;
    const f = s.selected && findFood(s.selected);
    if (!f) { box.hidden = true; return; }
    box.hidden = false;
    const presets = [0.5, 1, 1.5, 2];
    box.innerHTML = `
      <div class="portion-top"><b>${esc(f.name)}</b><span class="muted small">${esc(f.serving)} = ${k0(f.kcal)} kcal</span></div>
      <div class="qty-row" role="group" aria-label="Số phần">
        ${presets.map((q) => `<button type="button" class="btn" data-action="qty" data-q="${q}" aria-pressed="${s.qty === q}">${nfq.format(q)} phần</button>`).join('')}
        <input id="qty-input" type="number" inputmode="decimal" min="0.1" max="20" step="0.1" value="${s.qty}" aria-label="Số phần tuỳ chỉnh">
      </div>
      <button type="button" class="btn btn-primary" data-action="confirm-add" id="confirm-add">${portionLabel(f)}</button>`;
  }
  function portionLabel(f) {
    const s = ui.sheet;
    const n = Calc.entryNutrients({ ...f, qty: s.qty });
    return `Thêm ${nfq.format(s.qty)} phần · ${k0(n.kcal)} kcal`;
  }

  function addEntries(meal, entries, date = ui.date) {
    const day = ensureDay(date);
    day.entries.push(...entries);
    save();
  }

  /* ---------------- Kế hoạch ---------------- */
  function needProfile(title) {
    return `<section class="panel empty-state">
      <h2>${title}</h2>
      <p class="muted">Nhập giới tính, tuổi, chiều cao, cân nặng và cân nặng mục tiêu. App sẽ tính lượng calo cần ăn mỗi ngày và lộ trình theo tuần.</p>
      <a class="btn btn-primary" href="#ho-so">Nhập hồ sơ</a>
    </section>`;
  }

  function bmiBlock(b) {
    const lo = 15, hi = 35;
    const pos = (v) => ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * 100;
    const segs = [
      [lo, 18.5, 'var(--warn)'],
      [18.5, 23, 'var(--brand)'],
      [23, 25, 'var(--warn)'],
      [25, 30, 'color-mix(in srgb, var(--over) 70%, var(--surface))'],
      [30, hi, 'var(--over)'],
    ];
    return `<div class="bmi-wrap">
      <div class="bmi-scale" role="img" aria-label="Thang BMI châu Á, bạn ở mức ${k1(b)}">
        ${segs.map(([a, z, c]) => `<span style="width:${pos(z) - pos(a)}%;background:${c}"></span>`).join('')}
      </div>
      <i class="bmi-marker" style="left:${pos(b)}%"></i>
      <div class="bmi-ticks">${[18.5, 23, 25, 30].map((v) => `<span style="left:${pos(v)}%">${k1(v)}</span>`).join('')}</div>
    </div>`;
  }

  function pickCombos(meal, budget) {
    const scored = COMBOS[meal].map((c, idx) => {
      const kcal = c.items.reduce((a, [id, q]) => a + findFood(id).kcal * q, 0);
      return { ...c, idx, kcal };
    });
    const fit = scored.filter((c) => c.kcal <= budget * 1.1).sort((a, b) => Math.abs(a.kcal - budget) - Math.abs(b.kcal - budget));
    return (fit.length ? fit : scored.sort((a, b) => a.kcal - b.kcal)).slice(0, 3);
  }

  function renderPlan() {
    const el = $('#view-ke-hoach');
    const p = state.profile;
    if (!p) { el.innerHTML = needProfile('Chưa có kế hoạch'); return; }
    const w = currentWeight();
    const t = Calc.dailyTarget(p, w);
    const b = Calc.bmi(w, p.height);
    const cat = Calc.bmiCategory(b);
    const range = Calc.healthyRange(p.height);
    const goalBmi = Calc.bmi(p.goalWeight, p.height);
    const macros = Calc.macroTargets(t.target, p, w);
    const water = Calc.waterTarget(w);
    const proj = Calc.projectPlan(p, w);
    const goalDate = proj.reached ? addDays(today(), proj.days) : null;
    const act = Calc.ACTIVITY[p.activity];
    const weekly = Math.abs(t.weeklyChange);

    const notes = [];
    if (t.clamped) notes.push(['bad', `Để giảm ${nfq.format(p.rate)} kg/tuần bạn phải ăn dưới ${k0(t.floor)} kcal, mức tối thiểu an toàn khi tự ăn kiêng. App giữ mục tiêu ở ${k0(t.floor)} kcal nên tốc độ thực tế khoảng ${k1(weekly)} kg/tuần. Tăng vận động sẽ giúp nhanh hơn.`]);
    if (t.mode === 'lose' && p.rate / w > 0.01) notes.push(['', `Tốc độ ${nfq.format(p.rate)} kg/tuần cao hơn 1% cân nặng mỗi tuần. Mức 0,5 kg/tuần dễ duy trì hơn và ít mất cơ hơn.`]);
    if (goalBmi < 18.5) notes.push(['bad', `Cân nặng mục tiêu ${k1(p.goalWeight)} kg cho BMI ${k1(goalBmi)}, dưới mức bình thường. Khoảng khỏe mạnh với chiều cao ${p.height} cm là ${k1(range.min)}–${k1(range.max)} kg.`]);
    if (b >= 30) notes.push(['', 'BMI từ 30 trở lên: nên trao đổi với bác sĩ trước khi bắt đầu, nhất là khi có bệnh tiểu đường, huyết áp hoặc tim mạch.']);
    if (t.mode === 'maintain') notes.push(['ok', 'Bạn đang ở cân nặng mục tiêu. Mục tiêu calo bên dưới là mức duy trì.']);

    let summary;
    if (t.mode === 'maintain') summary = `Giữ quanh ${k1(p.goalWeight)} kg bằng cách ăn khoảng ${k0(t.target)} kcal mỗi ngày.`;
    else if (proj.reached)
      summary = `${t.mode === 'lose' ? 'Giảm' : 'Tăng'} khoảng ${k1(weekly)} kg/tuần, từ ${k1(w)} kg ${t.mode === 'lose' ? 'xuống' : 'lên'} ${k1(p.goalWeight)} kg trong khoảng ${Math.ceil(proj.days / 7)} tuần. Dự kiến đạt mục tiêu vào <b>${dmy(goalDate)}</b>.`;
    else summary = 'Với mức calo tối thiểu và mức vận động hiện tại, app chưa tạo được thâm hụt đủ để về mục tiêu. Hãy tăng mức vận động trong Hồ sơ.';

    const rows = proj.weeks;
    const stepRows = rows.length > 40 ? rows.filter((r, i) => i % 4 === 0 || i === rows.length - 1) : rows;
    const table = stepRows
      .map((r, i) => {
        const isGoal = r.maintain && i === stepRows.length - 1 && t.mode !== 'maintain';
        const date = isGoal && goalDate ? goalDate : addDays(today(), r.week * 7);
        return `<tr class="${isGoal ? 'goal-row' : ''}"><td>${r.week === 0 ? 'Bây giờ' : `Tuần ${r.week}`}</td><td>${dm(date)}</td><td>${k1(r.weight)} kg</td><td>${k0(r.target)} kcal${isGoal ? ' (duy trì)' : ''}</td></tr>`;
      })
      .join('');

    const combos = MEALS.map((m) => {
      const budget = t.target * Calc.MEAL_SPLIT[m.id];
      const list = pickCombos(m.id, budget);
      return `<div class="combo-meal">
        <h3>${m.label} <span>~${k0(budget)} kcal</span></h3>
        ${list
          .map(
            (c) => `<div class="combo"><div class="combo-top"><b>${esc(c.name)}</b><span>${k0(c.kcal)} kcal</span></div>
              <button type="button" class="btn" data-action="add-combo" data-meal="${m.id}" data-idx="${c.idx}">+ Ghi vào hôm nay</button></div>`
          )
          .join('')}
      </div>`;
    }).join('');

    const pct = (g, kcalPerG) => Math.round(((g * kcalPerG) / t.target) * 100);

    el.innerHTML = `
      <section class="panel">
        <div class="panel-head"><h2>Mục tiêu mỗi ngày</h2><p>Theo cân nặng hiện tại ${k1(w)} kg</p></div>
        <div class="hero-target"><span class="v">${k0(t.target)}</span><span class="u">kcal/ngày</span></div>
        <p class="equation">Tiêu hao (TDEE) ${k0(t.tdee)} kcal ${t.balance <= 0 ? '−' : '+'} ${k0(Math.abs(t.balance))} kcal ${t.balance <= 0 ? 'thâm hụt' : 'dư'} = ${k0(t.target)} kcal. Cứ 7.700 kcal thâm hụt tương đương khoảng 1 kg mỡ.</p>
        <div class="stats">
          <div class="stat"><span class="k"><i class="dot" style="--c:var(--protein)"></i>Đạm</span><span class="v">${macros.protein}<small>g</small></span><span class="s muted">${pct(macros.protein, 4)}% năng lượng</span></div>
          <div class="stat"><span class="k"><i class="dot" style="--c:var(--carb)"></i>Tinh bột</span><span class="v">${macros.carbs}<small>g</small></span><span class="s muted">${pct(macros.carbs, 4)}% năng lượng</span></div>
          <div class="stat"><span class="k"><i class="dot" style="--c:var(--fat)"></i>Chất béo</span><span class="v">${macros.fat}<small>g</small></span><span class="s muted">${pct(macros.fat, 9)}% năng lượng</span></div>
          <div class="stat"><span class="k"><i class="dot" style="--c:var(--water)"></i>Nước</span><span class="v">${k1(water.ml / 1000)}<small>lít</small></span><span class="s muted">${water.glasses} ly 250 ml</span></div>
        </div>
        ${notes.map(([cls, txt]) => `<p class="notice ${cls}">${txt}</p>`).join('')}
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Chỉ số cơ thể</h2><p>${p.sex === 'male' ? 'Nam' : 'Nữ'}, ${p.age} tuổi, ${p.height} cm · ${act.label.toLowerCase()}</p></div>
        <div class="stats">
          <div class="stat"><span class="k">BMI</span><span class="v">${k1(b)}</span><span class="s"><span class="chip ${cat.key}">${cat.label}</span></span></div>
          <div class="stat"><span class="k">Cân nặng khỏe mạnh</span><span class="v">${k1(range.min)}–${k1(range.max)}<small>kg</small></span><span class="s muted">BMI 18,5–22,9</span></div>
          <div class="stat"><span class="k">Chuyển hoá cơ bản (BMR)</span><span class="v">${k0(t.bmr)}<small>kcal</small></span><span class="s muted">Khi nằm nghỉ cả ngày</span></div>
          <div class="stat"><span class="k">Tiêu hao mỗi ngày (TDEE)</span><span class="v">${k0(t.tdee)}<small>kcal</small></span><span class="s muted">BMR × ${String(act.factor).replace('.', ',')}</span></div>
        </div>
        ${bmiBlock(b)}
        <p class="small muted">Thang BMI cho người châu Á (WHO): từ 23 là thừa cân, từ 25 là béo phì.</p>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Lộ trình</h2><p>Mục tiêu calo được tính lại mỗi tuần theo cân nặng mới</p></div>
        <p>${summary}</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Mốc</th><th>Ngày</th><th>Cân nặng dự kiến</th><th>Nên ăn</th></tr></thead>
          <tbody>${table}</tbody>
        </table></div>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Gợi ý thực đơn</h2><p>Chia calo: sáng 25%, trưa 35%, tối 30%, ăn vặt 10%</p></div>
        <div class="combo-grid">${combos}</div>
      </section>

      <section class="panel">
        <h2>Nguyên tắc dễ làm theo</h2>
        <ul class="tips">
          <li>Ăn rau trước, rồi đến đạm, cơm sau cùng. Nửa đĩa là rau, một phần tư là thịt cá, một phần tư là cơm.</li>
          <li>Ăn phở, bún: xin thêm rau và giá, bớt bánh, uống ít nước dùng vì nước dùng nhiều mỡ và muối.</li>
          <li>Cơm trắng 1 bát khoảng 200 kcal. Giảm từ 2 bát xuống 1,5 bát mỗi bữa là bớt được khoảng 200 kcal/ngày.</li>
          <li>Đồ uống có đường dễ vượt calo nhất: 1 ly trà sữa ≈ 450 kcal, cà phê sữa ≈ 160 kcal, cà phê đen ≈ 5 kcal.</li>
          <li>Ưu tiên luộc, hấp, kho nhạt thay cho chiên rán. Đậu phụ rán gần gấp 3 calo đậu phụ trắng.</li>
          <li>Cân vào cùng một giờ mỗi sáng, sau khi đi vệ sinh. Nhìn xu hướng cả tuần, đừng lo khi cân tăng 1 ngày.</li>
          <li>Ngủ đủ 7–8 tiếng và đi bộ 7.000–10.000 bước mỗi ngày giúp giữ tốc độ giảm cân.</li>
        </ul>
      </section>`;
  }

  /* ---------------- Cân nặng ---------------- */
  function weightChart() {
    const p = state.profile;
    const ws = sortedWeights();
    if (!p || !ws.length) return '';
    const start = p.startDate;
    const startW = p.weight;
    const first = ws[0].date < start ? ws[0].date : start;
    const last = ws[ws.length - 1].date;
    const t0 = Calc.dailyTarget(p, startW);
    const perDay = t0.weeklyChange / 7;
    const startOff = daysBetween(first, start);
    let goalDays = null;
    if (t0.mode !== 'maintain' && Math.abs(perDay) > 1e-4 && (p.goalWeight - startW) / perDay > 0) goalDays = (p.goalWeight - startW) / perDay;

    let span = Math.max(daysBetween(first, last) + 14, 42);
    if (goalDays && startOff + goalDays <= 26 * 7) span = Math.max(span, Math.ceil(startOff + goalDays) + 4);

    const vals = ws.map((x) => x.kg).concat([startW, p.goalWeight]);
    const yMin = Math.floor(Math.min(...vals) - 0.5);
    const yMax = Math.ceil(Math.max(...vals) + 0.5);
    const W = 640, H = 260, m = { l: 40, r: 18, t: 14, b: 28 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const xd = (d) => m.l + (d / span) * iw;
    const x = (k) => xd(daysBetween(first, k));
    const y = (v) => m.t + ((yMax - v) / (yMax - yMin)) * ih;

    const range = yMax - yMin;
    const step = range <= 6 ? 1 : range <= 14 ? 2 : 5;
    let grid = '';
    for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) {
      grid += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="axis" x="${m.l - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${v}</text>`;
    }
    for (let i = 0; i <= 4; i++) {
      const d = Math.round((span * i) / 4);
      grid += `<text class="axis" x="${xd(d).toFixed(1)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}">${dm(addDays(first, d))}</text>`;
    }

    const gy = y(p.goalWeight).toFixed(1);
    const goalLine = `<line class="goal" x1="${m.l}" x2="${W - m.r}" y1="${gy}" y2="${gy}"/><text class="goal-lbl" x="${m.l + 6}" y="${(+gy - 6).toFixed(1)}" text-anchor="start">Mục tiêu ${k1(p.goalWeight)} kg</text>`;

    const planEnd = goalDays ? Math.min(goalDays, span - startOff) : span - startOff;
    const planLine = `<path class="plan" d="M${xd(startOff).toFixed(1)},${y(startW).toFixed(1)} L${xd(startOff + planEnd).toFixed(1)},${y(startW + perDay * planEnd).toFixed(1)}"/>`;

    const pts = ws.map((w) => [x(w.date), y(w.kg)]);
    const line = pts.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join(' ');
    const dots = pts.slice(0, -1).map(([a, b]) => `<circle class="pt" cx="${a.toFixed(1)}" cy="${b.toFixed(1)}" r="3.5"/>`).join('');
    const [lx, ly] = pts[pts.length - 1];
    const lastLbl = `<circle class="pt-last" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="6"/><text class="last-lbl" x="${(lx + (lx > W - 90 ? -10 : 10)).toFixed(1)}" y="${(ly - 10).toFixed(1)}" text-anchor="${lx > W - 90 ? 'end' : 'start'}">${k1(ws[ws.length - 1].kg)} kg</text>`;

    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Biểu đồ cân nặng từ ${dm(first)} đến nay, hiện tại ${k1(ws[ws.length - 1].kg)} kg, mục tiêu ${k1(p.goalWeight)} kg">
      ${grid}${goalLine}${planLine}<path class="line" d="${line}"/>${dots}${lastLbl}
    </svg>
    <div class="legend"><span><i></i>Cân nặng thực tế</span><span><i class="plan"></i>Theo kế hoạch</span><span><i class="goal"></i>Mục tiêu</span></div>`;
  }

  function renderWeight() {
    const el = $('#view-can-nang');
    const p = state.profile;
    if (!p) { el.innerHTML = needProfile('Chưa có hồ sơ'); return; }
    const ws = sortedWeights();
    const cur = currentWeight();
    const change = cur - p.weight;
    const totalGoal = p.weight - p.goalWeight;
    const done = totalGoal !== 0 ? Math.max(0, Math.min(100, ((p.weight - cur) / totalGoal) * 100)) : 100;
    const left = cur - p.goalWeight;

    const list = [...ws]
      .reverse()
      .map((w, i, arr) => {
        const prev = arr[i + 1];
        const d = prev ? w.kg - prev.kg : null;
        const cls = d == null || Math.abs(d) < 0.05 ? 'muted' : d < 0 ? 'delta-down' : 'delta-up';
        return `<li><span>${longDate(w.date)}</span><b>${k1(w.kg)} kg</b><span class="${cls} small">${d == null ? '' : `${d > 0 ? '+' : d < 0 ? '−' : '±'}${k1(Math.abs(d))}`}</span>
          <button type="button" class="icon-btn" data-action="del-weight" data-date="${w.date}" aria-label="Xoá lần cân ngày ${dm(w.date)}">×</button></li>`;
      })
      .join('');

    el.innerHTML = `
      <section class="panel">
        <div class="panel-head"><h2>Ghi cân nặng</h2><p>Cân buổi sáng, trước khi ăn</p></div>
        <form class="inline-form" id="weight-form" novalidate>
          <div class="field"><label for="w-date">Ngày</label><input id="w-date" type="date" value="${today()}" max="${today()}" required></div>
          <div class="field"><label for="w-kg">Cân nặng (kg)</label><input id="w-kg" type="number" inputmode="decimal" step="0.1" min="25" max="300" value="${cur ? cur : ''}" required></div>
          <button type="submit" class="btn btn-primary">Lưu</button>
        </form>
        <p class="small muted" id="w-error" role="alert"></p>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Tiến độ</h2><p>Bắt đầu ${dmy(p.startDate)}</p></div>
        <div class="stats">
          <div class="stat"><span class="k">Ban đầu</span><span class="v">${k1(p.weight)}<small>kg</small></span></div>
          <div class="stat"><span class="k">Hiện tại</span><span class="v">${k1(cur)}<small>kg</small></span></div>
          <div class="stat"><span class="k">Đã thay đổi</span><span class="v ${change < 0 ? 'delta-down' : change > 0 ? 'delta-up' : ''}">${change > 0 ? '+' : change < 0 ? '−' : ''}${k1(Math.abs(change))}<small>kg</small></span></div>
          <div class="stat"><span class="k">Còn lại</span><span class="v">${k1(Math.abs(left))}<small>kg</small></span></div>
        </div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(done)}" aria-label="Hoàn thành ${Math.round(done)}% mục tiêu"><i style="width:${done.toFixed(1)}%"></i></div>
        <p class="small muted">Đã đi được ${Math.round(done)}% chặng đường tới ${k1(p.goalWeight)} kg.</p>
        ${ws.length ? weightChart() : '<p class="muted">Chưa có lần cân nào.</p>'}
      </section>

      <section class="panel">
        <h2>Lịch sử</h2>
        ${ws.length ? `<ul class="wlist">${list}</ul>` : '<p class="muted">Chưa có lần cân nào.</p>'}
      </section>`;
  }

  /* ---------------- Hồ sơ ---------------- */
  function renderProfile() {
    const el = $('#view-ho-so');
    const p = state.profile || { sex: 'female', age: '', height: '', weight: '', goalWeight: '', activity: 'light', rate: 0.5 };
    const w = state.profile ? currentWeight() : '';
    const acts = Object.entries(Calc.ACTIVITY)
      .map(([k, a]) => `<option value="${k}" ${p.activity === k ? 'selected' : ''}>${a.label} · ${a.hint}</option>`)
      .join('');
    const rates = Calc.RATES.map((r) => `<option value="${r}" ${p.rate === r ? 'selected' : ''}>${nfq.format(r)} kg mỗi tuần${r === 0.5 ? ' (khuyên dùng)' : ''}</option>`).join('');

    el.innerHTML = `
      <section class="panel">
        <div class="panel-head"><h2>Hồ sơ của bạn</h2><p>Dùng để tính BMR, TDEE và mục tiêu calo</p></div>
        <form class="form" id="profile-form" novalidate>
          <div class="field"><span class="label" id="sex-label">Giới tính</span>
            <div class="seg" role="radiogroup" aria-labelledby="sex-label">
              <label><input type="radio" name="sex" id="sex-female" value="female" ${p.sex !== 'male' ? 'checked' : ''}>Nữ</label>
              <label><input type="radio" name="sex" id="sex-male" value="male" ${p.sex === 'male' ? 'checked' : ''}>Nam</label>
            </div>
          </div>
          <div class="form-grid">
            <div class="field"><label for="pf-age">Tuổi</label><input id="pf-age" type="number" inputmode="numeric" min="15" max="90" value="${p.age}" required></div>
            <div class="field"><label for="pf-height">Chiều cao (cm)</label><input id="pf-height" type="number" inputmode="decimal" min="120" max="230" value="${p.height}" required><span class="hint" id="pf-range"></span></div>
            <div class="field"><label for="pf-weight">Cân nặng hiện tại (kg)</label><input id="pf-weight" type="number" inputmode="decimal" step="0.1" min="30" max="300" value="${w}" required></div>
            <div class="field"><label for="pf-goal">Cân nặng mục tiêu (kg)</label><input id="pf-goal" type="number" inputmode="decimal" step="0.1" min="30" max="300" value="${p.goalWeight}" required></div>
          </div>
          <div class="form-grid">
            <div class="field"><label for="pf-activity">Mức vận động</label><select id="pf-activity">${acts}</select></div>
            <div class="field"><label for="pf-rate">Tốc độ giảm cân</label><select id="pf-rate">${rates}</select></div>
          </div>
          <p class="small" id="pf-error" role="alert"></p>
          <div><button type="submit" class="btn btn-primary">Lưu và xem kế hoạch</button></div>
        </form>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Dữ liệu</h2><p>Lưu trên trình duyệt này, không gửi đi đâu</p></div>
        <p class="small muted">Sao chép để lưu dự phòng hoặc chuyển sang máy khác, rồi dán vào ô bên dưới để khôi phục.</p>
        <div class="qty-row">
          <button type="button" class="btn" data-action="export">Sao chép dữ liệu</button>
          <button type="button" class="btn btn-danger" data-action="reset">${ui.resetArmed ? 'Bấm lần nữa để xoá hết' : 'Xoá toàn bộ dữ liệu'}</button>
        </div>
        <form class="form" id="import-form" novalidate>
          <div class="field"><label for="import-text">Dữ liệu sao lưu</label><textarea id="import-text" spellcheck="false" placeholder='Dán nội dung đã sao chép, bắt đầu bằng {"profile":...'></textarea></div>
          <p class="small" id="import-msg" role="alert"></p>
          <div><button type="submit" class="btn">Khôi phục từ dữ liệu đã dán</button></div>
        </form>
      </section>`;
    updateRangeHint();
  }

  function updateRangeHint() {
    const h = Number($('#pf-height') && $('#pf-height').value);
    const hint = $('#pf-range');
    if (!hint) return;
    if (h >= 120 && h <= 230) {
      const r = Calc.healthyRange(h);
      hint.textContent = `Cân nặng khỏe mạnh: ${k1(r.min)}–${k1(r.max)} kg`;
    } else hint.textContent = '';
  }

  /* ---------------- Điều hướng ---------------- */
  function render() {
    $('#sample-banner').hidden = !state.sample;
    VIEWS.forEach((v) => { $(`#view-${v}`).hidden = v !== ui.view; });
    document.querySelectorAll('[data-nav]').forEach((a) => {
      if (a.dataset.nav === ui.view) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    if (ui.view === 'hom-nay') renderToday();
    if (ui.view === 'ke-hoach') renderPlan();
    if (ui.view === 'can-nang') renderWeight();
    if (ui.view === 'ho-so') renderProfile();
  }

  function route() {
    const h = location.hash.replace('#', '');
    const next = VIEWS.includes(h) ? h : 'hom-nay';
    if (next !== ui.view) {
      ui.view = next;
      ui.resetArmed = false;
      window.scrollTo(0, 0);
    }
    render();
  }
  function go(view) {
    if (location.hash === `#${view}`) route();
    else location.hash = view;
  }

  /* ---------------- Hành động ---------------- */
  const actions = {
    'prev-day': () => { ui.date = addDays(ui.date, -1); renderToday(); },
    'next-day': () => { if (ui.date < today()) { ui.date = addDays(ui.date, 1); renderToday(); } },
    'go-today': () => { ui.date = today(); renderToday(); },
    'pick-day': (b) => { ui.date = b.dataset.date; renderToday(); },
    water: (b) => {
      const n = Number(b.dataset.n);
      const day = ensureDay(ui.date);
      day.water = day.water === n ? n - 1 : n;
      save();
      renderToday();
    },
    'add-food': (b) => openSheet(b.dataset.meal),
    'del-entry': (b) => {
      const day = ensureDay(ui.date);
      const idx = day.entries.findIndex((e) => e.id === b.dataset.id);
      if (idx < 0) return;
      const [removed] = day.entries.splice(idx, 1);
      const date = ui.date;
      save();
      renderToday();
      toast(`Đã xoá ${removed.name}`, {
        label: 'Hoàn tác',
        run: () => { ensureDay(date).entries.splice(idx, 0, removed); save(); render(); },
      });
    },
    'close-sheet': closeSheet,
    'sheet-tab': (b) => { ui.sheet.tab = b.dataset.tab; renderSheet(); const f = ui.sheet.tab === 'custom' ? $('#cf-name') : $('#food-search'); if (f) f.focus(); },
    cat: (b) => {
      ui.sheet.cat = b.dataset.cat;
      ui.sheet.query = '';
      const s = $('#food-search');
      if (s) s.value = '';
      renderResults();
      $('#sheet .sheet-body').scrollTop = 0;
    },
    'pick-food': (b) => {
      ui.sheet.selected = b.dataset.id;
      ui.sheet.qty = 1;
      renderResults();
      renderPortion();
      const c = $('#confirm-add');
      if (c) c.focus({ preventScroll: true });
    },
    qty: (b) => { ui.sheet.qty = Number(b.dataset.q); renderPortion(); },
    'confirm-add': () => {
      const s = ui.sheet;
      const f = findFood(s.selected);
      if (!f || !(s.qty > 0)) return;
      addEntries(s.meal, [entryFromFood(f, s.meal, s.qty)]);
      const meal = s.meal;
      closeSheet();
      renderToday();
      toast(`Đã thêm ${f.name} vào ${MEAL_LABEL[meal].toLowerCase()}`);
    },
    'add-combo': (b) => {
      const meal = b.dataset.meal;
      const combo = COMBOS[meal][Number(b.dataset.idx)];
      addEntries(meal, combo.items.map(([id, q]) => entryFromFood(findFood(id), meal, q)), today());
      toast(`Đã ghi “${combo.name}” vào ${MEAL_LABEL[meal].toLowerCase()} hôm nay`, {
        label: 'Xem',
        run: () => { ui.date = today(); go('hom-nay'); },
      });
    },
    'del-weight': (b) => {
      const date = b.dataset.date;
      const old = state.weights.find((w) => w.date === date);
      state.weights = state.weights.filter((w) => w.date !== date);
      save();
      renderWeight();
      toast(`Đã xoá lần cân ngày ${dm(date)}`, {
        label: 'Hoàn tác',
        run: () => { state.weights.push(old); save(); render(); },
      });
    },
    'clear-sample': () => {
      state = emptyState();
      save();
      ui.date = today();
      go('ho-so');
      toast('Đã xoá dữ liệu mẫu. Hãy nhập hồ sơ của bạn.');
    },
    export: () => {
      const json = JSON.stringify(state);
      const ta = $('#import-text');
      const fallback = () => {
        ta.value = json;
        ta.focus();
        ta.select();
        $('#import-msg').textContent = 'Không sao chép tự động được. Dữ liệu đã nằm trong ô bên dưới và đã được chọn sẵn, hãy sao chép thủ công.';
      };
      try {
        navigator.clipboard.writeText(json).then(() => toast('Đã sao chép dữ liệu vào bộ nhớ tạm'), fallback);
      } catch (e) {
        fallback();
      }
    },
    reset: () => {
      if (!ui.resetArmed) {
        ui.resetArmed = true;
        renderProfile();
        $('[data-action="reset"]').focus();
        return;
      }
      ui.resetArmed = false;
      state = emptyState();
      save();
      ui.date = today();
      render();
      toast('Đã xoá toàn bộ dữ liệu');
    },
  };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (!b || b.disabled) return;
    const fn = actions[b.dataset.action];
    if (fn) {
      e.preventDefault();
      fn(b, e);
    }
    if (b.dataset.action !== 'reset' && ui.resetArmed) {
      ui.resetArmed = false;
      if (ui.view === 'ho-so') { const r = $('[data-action="reset"]'); if (r) r.textContent = 'Xoá toàn bộ dữ liệu'; }
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'food-search') {
      ui.sheet.query = e.target.value;
      renderResults();
    } else if (e.target.id === 'qty-input') {
      const v = Number(e.target.value);
      if (v > 0 && v <= 20) {
        ui.sheet.qty = Math.round(v * 100) / 100;
        const f = findFood(ui.sheet.selected);
        $('#confirm-add').textContent = portionLabel(f);
        document.querySelectorAll('#portion [data-action="qty"]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.q) === ui.sheet.qty)));
      }
    } else if (e.target.id === 'pf-height') updateRangeHint();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ui.sheet) closeSheet();
    if (e.key === 'Enter' && e.target.id === 'food-search') {
      e.preventDefault();
      const first = $('#food-results [data-action="pick-food"]');
      if (first) first.click();
    }
  });

  document.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = e.target.id;
    const val = (sel) => $(sel).value.trim();
    const num = (sel) => Number(val(sel).replace(',', '.'));

    if (id === 'custom-form') {
      const name = val('#cf-name');
      const kcal = num('#cf-kcal');
      const err = $('#cf-error');
      if (!name) { err.textContent = 'Hãy nhập tên món.'; $('#cf-name').focus(); return; }
      if (!(kcal >= 0 && kcal <= 5000) || val('#cf-kcal') === '') { err.textContent = 'Hãy nhập số calo từ 0 đến 5.000.'; $('#cf-kcal').focus(); return; }
      const food = {
        id: uid('u'),
        name,
        cat: 'cua-toi',
        serving: val('#cf-serving') || '1 phần',
        kcal,
        p: num('#cf-p') || 0,
        c: num('#cf-c') || 0,
        f: num('#cf-f') || 0,
      };
      if ($('#cf-save').checked) state.customFoods.push(food);
      const meal = ui.sheet.meal;
      addEntries(meal, [entryFromFood(food, meal, 1)]);
      closeSheet();
      renderToday();
      toast(`Đã thêm ${name} vào ${MEAL_LABEL[meal].toLowerCase()}`);
    }

    if (id === 'weight-form') {
      const date = val('#w-date');
      const kg = num('#w-kg');
      const err = $('#w-error');
      if (!isKey(date) || date > today()) { err.textContent = 'Hãy chọn một ngày không ở tương lai.'; return; }
      if (!(kg >= 25 && kg <= 300)) { err.textContent = 'Cân nặng cần trong khoảng 25–300 kg.'; $('#w-kg').focus(); return; }
      const rounded = Math.round(kg * 10) / 10;
      const existing = state.weights.find((w) => w.date === date);
      if (existing) existing.kg = rounded;
      else state.weights.push({ date, kg: rounded });
      save();
      renderWeight();
      toast(`Đã lưu ${k1(rounded)} kg ngày ${dm(date)}`);
    }

    if (id === 'profile-form') {
      const err = $('#pf-error');
      const prof = {
        sex: $('#sex-male').checked ? 'male' : 'female',
        age: num('#pf-age'),
        height: num('#pf-height'),
        weight: num('#pf-weight'),
        goalWeight: num('#pf-goal'),
        activity: $('#pf-activity').value,
        rate: Number($('#pf-rate').value),
      };
      const bad = [
        [!(prof.age >= 15 && prof.age <= 90), '#pf-age', 'Tuổi cần trong khoảng 15–90. App không dành cho trẻ em.'],
        [!(prof.height >= 120 && prof.height <= 230), '#pf-height', 'Chiều cao cần trong khoảng 120–230 cm.'],
        [!(prof.weight >= 30 && prof.weight <= 300), '#pf-weight', 'Cân nặng cần trong khoảng 30–300 kg.'],
        [!(prof.goalWeight >= 30 && prof.goalWeight <= 300), '#pf-goal', 'Cân nặng mục tiêu cần trong khoảng 30–300 kg.'],
      ].find(([cond]) => cond);
      if (bad) { err.textContent = bad[2]; $(bad[1]).focus(); return; }
      err.textContent = '';
      prof.weight = Math.round(prof.weight * 10) / 10;
      prof.goalWeight = Math.round(prof.goalWeight * 10) / 10;

      if (state.sample) state = emptyState();
      const t = today();
      const isNew = !state.profile;
      const prevCurrent = currentWeight();
      if (isNew) {
        state.profile = { ...prof, startDate: t };
      } else {
        state.profile = { ...state.profile, ...prof, weight: state.profile.weight };
      }
      if (isNew || prevCurrent !== prof.weight) {
        const existing = state.weights.find((w) => w.date === t);
        if (existing) existing.kg = prof.weight;
        else state.weights.push({ date: t, kg: prof.weight });
        if (isNew) state.profile.weight = prof.weight;
      }
      save();
      const target = currentTarget();
      go('ke-hoach');
      toast(`Đã lưu hồ sơ. Mục tiêu: ${k0(target.target)} kcal/ngày`);
    }

    if (id === 'import-form') {
      const msg = $('#import-msg');
      try {
        const data = normalize(JSON.parse($('#import-text').value));
        data.sample = false;
        state = data;
        save();
        ui.date = today();
        render();
        toast('Đã khôi phục dữ liệu');
      } catch (ex) {
        msg.textContent = 'Không đọc được dữ liệu. Hãy dán đúng toàn bộ nội dung đã sao chép từ nút “Sao chép dữ liệu”.';
      }
    }
  });

  window.addEventListener('hashchange', route);

  // Ngày mới khi để app mở qua đêm
  let lastToday = today();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && today() !== lastToday) {
      if (ui.date === lastToday) ui.date = today();
      lastToday = today();
      render();
    }
  });

  route();
})();
