const test = require('node:test');
const assert = require('node:assert/strict');
const Calc = require('../js/calc.js');
const { FOODS, COMBOS, FOOD_CATEGORIES } = require('../js/foods.js');

const man = { sex: 'male', age: 30, height: 180, weight: 80, goalWeight: 75, activity: 'sedentary', rate: 0.5 };
const woman = { sex: 'female', age: 25, height: 160, weight: 60, goalWeight: 55, activity: 'sedentary', rate: 0.5 };

test('BMR theo Mifflin-St Jeor', () => {
  assert.equal(Calc.bmr(man), 1780);
  assert.equal(Calc.bmr(woman), 1314);
});

test('TDEE nhân hệ số vận động', () => {
  assert.equal(Math.round(Calc.tdee(man)), 2136);
  assert.equal(Math.round(Calc.tdee({ ...man, activity: 'moderate' })), 2759);
});

test('BMI và phân loại châu Á', () => {
  assert.equal(Calc.bmi(64, 160).toFixed(1), '25.0');
  assert.equal(Calc.bmiCategory(18.4).key, 'under');
  assert.equal(Calc.bmiCategory(22.9).key, 'normal');
  assert.equal(Calc.bmiCategory(23).key, 'over');
  assert.equal(Calc.bmiCategory(25).key, 'obese1');
  assert.equal(Calc.bmiCategory(30).key, 'obese2');
});

test('mục tiêu calo khi giảm 0,5 kg/tuần', () => {
  const t = Calc.dailyTarget(man);
  assert.equal(t.mode, 'lose');
  assert.equal(t.target, 1590); // 2136 - 550, làm tròn 10
  assert.equal(t.clamped, false);
  assert.ok(Math.abs(t.weeklyChange + 0.5) < 0.02);
});

test('không xuống dưới mức calo tối thiểu', () => {
  const t = Calc.dailyTarget({ ...woman, rate: 1 });
  assert.equal(t.target, 1200);
  assert.equal(t.clamped, true);
  assert.ok(t.weeklyChange > -1);
});

test('duy trì và tăng cân', () => {
  assert.equal(Calc.dailyTarget({ ...man, goalWeight: 80 }).mode, 'maintain');
  const g = Calc.dailyTarget({ ...man, goalWeight: 85 });
  assert.equal(g.mode, 'gain');
  assert.ok(g.target > Calc.tdee(man));
});

test('lộ trình giảm 5 kg ở 0,5 kg/tuần mất khoảng 10 tuần', () => {
  const plan = Calc.projectPlan(man);
  assert.equal(plan.reached, true);
  assert.ok(plan.days >= 68 && plan.days <= 72, `days=${plan.days}`);
  const last = plan.weeks[plan.weeks.length - 1];
  assert.equal(last.weight, 75);
  assert.equal(last.maintain, true);
  // mục tiêu calo giảm dần theo cân nặng
  assert.ok(plan.weeks[1].target <= plan.weeks[0].target);
});

test('lộ trình báo không đạt khi không tạo được thâm hụt', () => {
  const tiny = { sex: 'female', age: 70, height: 145, weight: 45, goalWeight: 40, activity: 'sedentary', rate: 0.5 };
  const plan = Calc.projectPlan(tiny);
  assert.equal(plan.reached, false);
});

test('chỉ tiêu đa lượng cộng lại gần đúng tổng calo', () => {
  const m = Calc.macroTargets(1590, man);
  assert.equal(m.protein, 120); // 1,6 × 75 kg
  const kcal = m.protein * 4 + m.carbs * 4 + m.fat * 9;
  assert.ok(Math.abs(kcal - 1590) < 10);
});

test('nước uống', () => {
  assert.deepEqual(Calc.waterTarget(60), { ml: 2100, glasses: 9 });
});

test('cộng dồn món ăn theo số phần', () => {
  const s = Calc.sumEntries([
    { kcal: 200, p: 4, c: 45, f: 0.4, qty: 1.5 },
    { kcal: 75, p: 6.3, c: 0.6, f: 5, qty: 2 },
  ]);
  assert.equal(s.kcal, 450);
  assert.ok(Math.abs(s.p - 18.6) < 1e-9);
});

test('dữ liệu món ăn hợp lệ', () => {
  const ids = new Set();
  const cats = new Set(FOOD_CATEGORIES.map((c) => c.id));
  for (const f of FOODS) {
    assert.ok(!ids.has(f.id), `trùng id ${f.id}`);
    ids.add(f.id);
    assert.ok(cats.has(f.cat), `nhóm lạ ${f.id}`);
    assert.ok(f.kcal >= 0 && f.serving, f.id);
  }
  for (const list of Object.values(COMBOS)) {
    for (const combo of list) for (const [id] of combo.items) assert.ok(ids.has(id), `combo dùng món lạ ${id}`);
  }
});
