/*
 * Các công thức dinh dưỡng dùng trong app.
 * - BMR: phương trình Mifflin-St Jeor.
 * - TDEE = BMR × hệ số vận động.
 * - 1 kg mỡ cơ thể ≈ 7.700 kcal.
 * - Phân loại BMI theo ngưỡng WHO cho người châu Á – Thái Bình Dương.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Calc = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const KCAL_PER_KG = 7700;
  const MAX_WEEKS = 156;

  const ACTIVITY = {
    sedentary: { factor: 1.2, label: 'Ít vận động', hint: 'Ngồi nhiều, hầu như không tập' },
    light: { factor: 1.375, label: 'Vận động nhẹ', hint: 'Tập 1–3 buổi mỗi tuần' },
    moderate: { factor: 1.55, label: 'Vận động vừa', hint: 'Tập 3–5 buổi mỗi tuần' },
    active: { factor: 1.725, label: 'Vận động nhiều', hint: 'Tập 6–7 buổi mỗi tuần' },
    athlete: { factor: 1.9, label: 'Rất nhiều', hint: 'Lao động nặng hoặc tập 2 buổi mỗi ngày' },
  };

  /* Mức calo tối thiểu khi ăn kiêng không có giám sát y tế. */
  const MIN_KCAL = { male: 1500, female: 1200 };

  const MEAL_SPLIT = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 };

  const RATES = [0.25, 0.5, 0.75, 1];

  function bmi(weight, height) {
    const m = height / 100;
    return weight / (m * m);
  }

  function bmiCategory(value) {
    if (value < 18.5) return { key: 'under', label: 'Thiếu cân' };
    if (value < 23) return { key: 'normal', label: 'Bình thường' };
    if (value < 25) return { key: 'over', label: 'Thừa cân' };
    if (value < 30) return { key: 'obese1', label: 'Béo phì độ I' };
    return { key: 'obese2', label: 'Béo phì độ II' };
  }

  function healthyRange(height) {
    const m2 = (height / 100) ** 2;
    return { min: 18.5 * m2, max: 22.9 * m2 };
  }

  function bmr({ sex, weight, height, age }) {
    return 10 * weight + 6.25 * height - 5 * age + (sex === 'male' ? 5 : -161);
  }

  function tdee(profile, weight = profile.weight) {
    const a = ACTIVITY[profile.activity] || ACTIVITY.sedentary;
    return bmr({ ...profile, weight }) * a.factor;
  }

  /**
   * Mục tiêu calo mỗi ngày ở một mức cân nặng.
   * weeklyChange: số kg thay đổi mỗi tuần nếu ăn đúng mục tiêu (âm = giảm).
   */
  function dailyTarget(profile, weight = profile.weight) {
    const base = tdee(profile, weight);
    const diff = profile.goalWeight - weight;
    const mode = Math.abs(diff) < 0.1 ? 'maintain' : diff < 0 ? 'lose' : 'gain';
    const planned = mode === 'maintain' ? 0 : (profile.rate * KCAL_PER_KG) / 7;
    let target = mode === 'lose' ? base - planned : mode === 'gain' ? base + planned : base;
    const floor = MIN_KCAL[profile.sex] || MIN_KCAL.female;
    let clamped = false;
    if (mode === 'lose' && target < floor) {
      target = floor;
      clamped = true;
    }
    target = Math.round(target / 10) * 10;
    const weeklyChange = ((target - base) * 7) / KCAL_PER_KG;
    return {
      bmr: bmr({ ...profile, weight }),
      tdee: base,
      target,
      mode,
      balance: target - base,
      weeklyChange,
      clamped,
      floor,
    };
  }

  /** Đạm 1,6 g/kg (theo cân nặng mục tiêu khi giảm cân), béo 25%, còn lại là tinh bột. */
  function macroTargets(target, profile, weight = profile.weight) {
    const refWeight = profile.goalWeight < weight ? profile.goalWeight : weight;
    const protein = Math.min(1.6 * refWeight, (target * 0.35) / 4);
    const fat = (target * 0.25) / 9;
    const carbs = Math.max(0, (target - protein * 4 - fat * 9) / 4);
    return { protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) };
  }

  /** 35 ml nước cho mỗi kg cân nặng, quy ra ly 250 ml. */
  function waterTarget(weight) {
    const ml = Math.round((weight * 35) / 50) * 50;
    return { ml, glasses: Math.ceil(ml / 250) };
  }

  /**
   * Lộ trình theo tuần. Mỗi tuần tính lại mục tiêu calo theo cân nặng mới,
   * vì cơ thể nhẹ hơn thì tiêu hao ít hơn.
   */
  function projectPlan(profile, weight = profile.weight) {
    const goal = profile.goalWeight;
    const weeks = [];
    let w = weight;
    for (let i = 0; i <= MAX_WEEKS; i++) {
      const t = dailyTarget(profile, w);
      if (t.mode === 'maintain') {
        weeks.push({ week: i, weight: w, target: t.target, maintain: true });
        return { weeks, reached: true, days: i * 7 };
      }
      weeks.push({ week: i, weight: w, target: t.target, maintain: false });
      const stuck = t.mode === 'lose' ? t.weeklyChange > -0.01 : t.weeklyChange < 0.01;
      if (stuck) return { weeks, reached: false, days: null };
      const next = w + t.weeklyChange;
      const crossed = t.mode === 'lose' ? next <= goal : next >= goal;
      if (crossed) {
        const frac = (goal - w) / t.weeklyChange;
        const days = Math.round((i + frac) * 7);
        weeks.push({
          week: Math.ceil(i + frac),
          weight: goal,
          target: dailyTarget(profile, goal).target,
          maintain: true,
        });
        return { weeks, reached: true, days };
      }
      w = next;
    }
    return { weeks, reached: false, days: null };
  }

  function entryNutrients(e) {
    const q = Number(e.qty) || 0;
    return { kcal: e.kcal * q, p: (e.p || 0) * q, c: (e.c || 0) * q, f: (e.f || 0) * q };
  }

  function sumEntries(entries) {
    return (entries || []).reduce(
      (acc, e) => {
        const n = entryNutrients(e);
        acc.kcal += n.kcal;
        acc.p += n.p;
        acc.c += n.c;
        acc.f += n.f;
        return acc;
      },
      { kcal: 0, p: 0, c: 0, f: 0 }
    );
  }

  return {
    KCAL_PER_KG,
    ACTIVITY,
    MIN_KCAL,
    MEAL_SPLIT,
    RATES,
    bmi,
    bmiCategory,
    healthyRange,
    bmr,
    tdee,
    dailyTarget,
    macroTargets,
    waterTarget,
    projectPlan,
    entryNutrients,
    sumEntries,
  };
});
