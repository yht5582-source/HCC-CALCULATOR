// Rule tests for the HCC engine embedded in index.html.
// Run: node tests.cjs
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = html.match(/\/\*ENGINE-START\*\/([\s\S]*?)\/\*ENGINE-END\*\//);
if (!m) throw new Error('engine block not found');
const mod = { exports: {} };
new Function('module', m[1])(mod);
const H = mod.exports;

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + e.message); }
}
const lab = o => ({ bilirubin: '1', albumin: '4', inr: '1', creatinine: '1', na: '140', sex: 'male', dialysis: false, cholestatic: false, encephalopathy: 1, ascites: 1, ...o });
const tu = o => ({ count: '1', size: '1.5', vascular: false, extrahepatic: false, diffuse: false, portalHTN: false, ltCandidate: false, ...o });
const stage = (o, cls = 'A', ecog = 0) => H.bclc(tu(o), cls, ecog).stage.split(' ')[1];

console.log('Child-Pugh');
t('normal = A5', () => { const r = H.childPugh(lab()); assert.equal(r.score, 5); assert.equal(r.cls, 'A'); });
t('bili 2.0 = 2 pts, 3.0 = 2 pts, 3.1 = 3 pts', () => {
  assert.equal(H.childPugh(lab({ bilirubin: '2' })).parts.bili, 2);
  assert.equal(H.childPugh(lab({ bilirubin: '3' })).parts.bili, 2);
  assert.equal(H.childPugh(lab({ bilirubin: '3.1' })).parts.bili, 3);
});
t('albumin 3.5 = 2 pts, 2.8 = 2 pts, 2.7 = 3 pts', () => {
  assert.equal(H.childPugh(lab({ albumin: '3.5' })).parts.alb, 2);
  assert.equal(H.childPugh(lab({ albumin: '2.8' })).parts.alb, 2);
  assert.equal(H.childPugh(lab({ albumin: '2.7' })).parts.alb, 3);
});
t('INR 1.7 = 2 pts, 2.4 = 3 pts', () => {
  assert.equal(H.childPugh(lab({ inr: '1.7' })).parts.inr, 2);
  assert.equal(H.childPugh(lab({ inr: '2.4' })).parts.inr, 3);
});
t('cholestatic cut-offs 4/10', () => {
  assert.equal(H.childPugh(lab({ bilirubin: '3.5', cholestatic: true })).parts.bili, 1);
  assert.equal(H.childPugh(lab({ bilirubin: '10', cholestatic: true })).parts.bili, 2);
  assert.equal(H.childPugh(lab({ bilirubin: '11', cholestatic: true })).parts.bili, 3);
});
t('class boundaries 6/7/9/10', () => {
  assert.equal(H.childPugh(lab({ ascites: 2 })).cls, 'A');
  assert.equal(H.childPugh(lab({ ascites: 2, encephalopathy: 2 })).cls, 'B');
  assert.equal(H.childPugh(lab({ ascites: 3, encephalopathy: 3, albumin: '3' })).score, 10);
  assert.equal(H.childPugh(lab({ ascites: 3, encephalopathy: 3, albumin: '3' })).cls, 'C');
});
t('blank bilirubin → null (not silently 1 pt)', () => assert.equal(H.childPugh(lab({ bilirubin: '' })), null));

console.log('ALBI');
t('bili 1, alb 4 → −2.586, grade 2 (just above −2.60)', () => { const r = H.albi(lab()); assert.ok(Math.abs(r.score - (-2.5862)) < 0.001); assert.equal(r.grade, 2); });
t('bili 0.5, alb 4.5 → grade 1', () => assert.equal(H.albi(lab({ bilirubin: '0.5', albumin: '4.5' })).grade, 1));
t('mALBI 2a / 2b split at −2.27', () => {
  assert.equal(H.albi(lab({ albumin: '3.8' })).mGrade, '2a');   // −2.42
  assert.equal(H.albi(lab({ albumin: '3.3' })).mGrade, '2b');   // −1.99
});
t('grade 3 above −1.39', () => assert.equal(H.albi(lab({ bilirubin: '5', albumin: '2.2' })).grade, 3));

console.log('MELD / MELD-Na');
t('all 1 → MELD 6', () => assert.equal(H.meld(lab()).score, 6));
t('bili 3, INR 1.5, Cr 1.5 → MELD 19', () => assert.equal(H.meld(lab({ bilirubin: '3', inr: '1.5', creatinine: '1.5' })).score, 19));
t('dialysis sets Cr 4 even if blank', () => assert.equal(H.meld(lab({ creatinine: '', dialysis: true })).score, 20));
t('Cr capped at 4', () => assert.equal(H.meld(lab({ creatinine: '8' })).score, H.meld(lab({ creatinine: '4' })).score));
t('capped at 40', () => assert.equal(H.meld(lab({ bilirubin: '40', inr: '6', creatinine: '4' })).score, 40));
t('MELD-Na: MELD ≤ 11 not adjusted', () => assert.equal(H.meldNa(lab({ na: '125' })).score, 6));
t('MELD-Na: MELD 19, Na 130 → 24', () => assert.equal(H.meldNa(lab({ bilirubin: '3', inr: '1.5', creatinine: '1.5', na: '130' })).score, 24));
t('MELD-Na: Na clamped at 125', () => assert.equal(
  H.meldNa(lab({ bilirubin: '3', inr: '1.5', creatinine: '1.5', na: '115' })).score,
  H.meldNa(lab({ bilirubin: '3', inr: '1.5', creatinine: '1.5', na: '125' })).score));

console.log('MELD 3.0');
t('best values male → 6', () => assert.equal(H.meld3(lab()).score, 6));
t('female adds 1.33', () => assert.equal(H.meld3(lab({ sex: 'female' })).score, 7));
t('worked example bili 3 INR 1.5 Cr 1.5 Na 130 Alb 2.8 → 24', () => {
  // 4.56ln3 + 0.82·7 − 0.24·7·ln3 + 9.09ln1.5 + 11.14ln1.5 + 1.85·0.7 − 1.83·0.7·ln1.5 + 6 = 23.9
  assert.equal(H.meld3(lab({ bilirubin: '3', inr: '1.5', creatinine: '1.5', na: '130', albumin: '2.8' })).score, 24);
});
t('dialysis → Cr 3.0 (cap)', () => assert.equal(H.meld3(lab({ dialysis: true })).score, H.meld3(lab({ creatinine: '3' })).score));
t('90-day survival at MELD 20 ≈ 94.7%', () => {
  const s = 100 * Math.pow(0.946, Math.exp(0.17698 * 20 - 3.56));
  assert.ok(Math.abs(s - 94.7) < 0.1);
});
t('missing albumin → null', () => assert.equal(H.meld3(lab({ albumin: '' })), null));

console.log('BCLC 2022');
t('single 1.5 cm, PS0, CP-A → 0', () => assert.equal(stage({}), '0'));
t('single 2.0 cm → 0', () => assert.equal(stage({ size: '2' }), '0'));
t('single 2.5 cm → A', () => assert.equal(stage({ size: '2.5' }), 'A'));
t('single 8 cm → A (size alone does not upstage)', () => assert.equal(stage({ size: '8' }), 'A'));
t('3 nodules ≤ 3 cm → A', () => assert.equal(stage({ count: '3', size: '3' }), 'A'));
t('2 nodules, largest 3.5 cm → B (old page said A)', () => assert.equal(stage({ count: '2', size: '3.5' }), 'B'));
t('4 nodules → B', () => assert.equal(stage({ count: '4', size: '2' }), 'B'));
t('diffuse B → systemic therapy', () => assert.match(H.bclc(tu({ count: '5', size: '4', diffuse: true }), 'A', 0).treatment, /系統治療/));
t('portal invasion → C', () => assert.equal(stage({ vascular: true }), 'C'));
t('extrahepatic → C', () => assert.equal(stage({ extrahepatic: true }), 'C'));
t('ECOG 1 with small tumour → C', () => assert.equal(stage({}, 'A', 1), 'C'));
t('ECOG 3 → D', () => assert.equal(stage({}, 'A', 3), 'D'));
t('Child-Pugh C → D, Milan note', () => {
  const r = H.bclc(tu({ size: '4' }), 'C', 0);
  assert.equal(r.stage.split(' ')[1], 'D');
  assert.ok(r.notes.some(n => n.includes('Milan')));
});
t('ascites or encephalopathy → D even at Child-Pugh A or B', () => {
  assert.equal(H.childPugh(lab({ ascites: 2 })).cls, 'A');
  assert.equal(H.bclc(tu(), 'A', 0, H.decompensated(lab({ ascites: 2 }))).stage.split(' ')[1], 'D');
  assert.equal(H.bclc(tu(), 'B', 0, H.decompensated(lab({ encephalopathy: 2 }))).stage.split(' ')[1], 'D');
});
t('jaundice / prior decompensation → D; scores unchanged', () => {
  assert.equal(H.decompensated(lab({ jaundice: true })), true);
  assert.equal(H.childPugh(lab({ jaundice: true })).score, 5);
  assert.equal(H.bclc(tu(), 'A', 0, true).stage.split(' ')[1], 'D');
});
t('compensated Child-Pugh B keeps tumour-based stage', () => {
  assert.equal(H.decompensated(lab({ bilirubin: '2.5', albumin: '3' })), false);
  assert.equal(stage({ size: '3' }, 'B', 0), 'A');
});
t('not preserved + Milan + LT candidate → transplant evaluation', () => {
  const r = H.bclc(tu({ size: '3', ltCandidate: true }), 'B', 0, true);
  assert.match(r.stage, /^LT/); assert.match(r.treatment, /移植/);
  assert.match(H.bclc(tu({ size: '3', ltCandidate: true }), 'C', 0).stage, /^LT/);
});
t('not preserved beyond Milan → D, even if LT candidate', () => {
  const r = H.bclc(tu({ size: '6', ltCandidate: true }), 'B', 0, true);
  assert.equal(r.stage.split(' ')[1], 'D'); assert.ok(r.notes.some(n => n.includes('超出 Milan')));
});
t('ECOG 3 stays D with LT candidate, note on Milan', () => {
  const r = H.bclc(tu({ size: '3', ltCandidate: true }), 'B', 3, true);
  assert.equal(r.stage.split(' ')[1], 'D'); assert.ok(r.notes.some(n => n.includes('Milan')));
});
t('Child-Pugh B adds caution note', () => assert.ok(H.bclc(tu(), 'B', 0).notes.length > 0));
t('single A + CSPH + LT candidate → transplant', () => assert.match(H.bclc(tu({ size: '3', portalHTN: true, ltCandidate: true }), 'A', 0).treatment, /移植/));
t('single A no CSPH → resection', () => assert.match(H.bclc(tu({ size: '3' }), 'A', 0).treatment, /切除/));
t('blank size → null', () => assert.equal(H.bclc(tu({ size: '' }), 'A', 0), null));

console.log('Milan / up-to-7');
t('single 5 cm in Milan; 5.1 out', () => {
  assert.equal(H.bclc(tu({ size: '5' }), 'A', 0).milan, true);
  assert.equal(H.bclc(tu({ size: '5.1' }), 'A', 0).milan, false);
});
t('3 × 3 cm in Milan; 4 nodules out', () => {
  assert.equal(H.bclc(tu({ count: '3', size: '3' }), 'A', 0).milan, true);
  assert.equal(H.bclc(tu({ count: '4', size: '2' }), 'A', 0).milan, false);
});
t('up-to-7: 3 nodules 4 cm = 7 → in', () => assert.equal(H.bclc(tu({ count: '3', size: '4' }), 'A', 0).upTo7, true));

console.log('Range warnings');
t('albumin 40 (g/L typed) warns', () => assert.equal(H.rangeWarnings(lab({ albumin: '40' })).length, 1));

// 教學內容：病例數字、計算題答案都要與引擎一致
const block = name => {
  const b = html.match(new RegExp('/\\*' + name + '-START\\*/([\\s\\S]*?)/\\*' + name + '-END\\*/'));
  if (!b) throw new Error(name + ' block not found');
  return b[1];
};
const CASES = new Function(block('CASES') + '; return HCC_CASES;')();
const QUIZ = new Function(block('QUIZ') + '; return HCC_QUIZ;')();
const MAP = new Function(block('MAP') + '; return HCC_MAP;')();
const fmt = x => x.toFixed(2).replace('-', '−');

console.log('Demo cases');
t('6 cases with unique ids', () => { assert.equal(CASES.length, 6); assert.equal(new Set(CASES.map(c => c.id)).size, 6); });
t('stages cover 0, A, B, C, D', () => ['0', 'A', 'B', 'C', 'D'].forEach(x => assert.ok(CASES.some(c => c.expect.stage === x), x)));
for (const c of CASES) {
  t(`${c.id} matches the engine`, () => {
    const i = lab({ ...c.in.lab, ...c.in.clinical });
    const p = H.childPugh(i), a = H.albi(i), m3 = H.meld3(i);
    const r = H.bclc(tu({ ...c.in.tumor }), p.cls, c.in.clinical.ecog, H.decompensated(i));
    const e = c.expect;
    assert.equal(p.cls + p.score, e.cp);
    assert.equal(fmt(a.score), e.albi);
    assert.equal(a.grade, e.grade);
    assert.equal(a.mGrade, e.mGrade);
    assert.equal(H.meld(i).score, e.meld);
    assert.equal(H.meldNa(i).score, e.meldNa);
    assert.equal(m3.score, e.meld3);
    if (e.surv90) assert.equal(m3.surv90.toFixed(1), e.surv90);
    assert.equal(r.stage.split(' ')[1], e.stage);
    assert.equal(r.milan, e.milan);
    assert.equal(r.upTo7, e.upTo7);
    assert.ok(r.treatment.includes(e.treat), r.treatment);
  });
  t(`${c.id} text quotes the computed scores`, () => {
    const text = c.steps.map(s => s[1]).join(' ');
    assert.ok(text.includes(c.expect.albi), 'ALBI ' + c.expect.albi);
    assert.ok(text.includes(c.expect.cp) || text.includes('Stage ' + c.expect.stage), 'Child-Pugh / stage');
    if (c.expect.surv90) assert.ok(text.includes(c.expect.surv90 + '%'), 'survival');
  });
}
t('case 2: LT candidate switches to transplant', () => {
  const c = CASES.find(x => x.id === 'c2');
  assert.match(H.bclc(tu({ ...c.in.tumor, ltCandidate: true }), 'A', 0).treatment, /移植/);
});
t('case 3: diffuse switches to systemic therapy', () => {
  const c = CASES.find(x => x.id === 'c3');
  assert.match(H.bclc(tu({ ...c.in.tumor, diffuse: true }), 'A', 0).treatment, /系統治療/);
});
t('case 5: LT candidate switches to transplant evaluation', () => {
  const c = CASES.find(x => x.id === 'c5');
  assert.match(H.bclc(tu({ ...c.in.tumor, ltCandidate: true }), 'B', 0, true).stage, /^LT/);
});
t('case 6: without LT candidacy → D', () => {
  const c = CASES.find(x => x.id === 'c6');
  assert.equal(H.bclc(tu({ ...c.in.tumor, ltCandidate: false }), 'C', 2, true).stage.split(' ')[1], 'D');
});
t('case 6: without cholestatic cut-offs still C, 13 points', () => {
  const c = CASES.find(x => x.id === 'c6');
  const r = H.childPugh(lab({ ...c.in.lab, ...c.in.clinical, cholestatic: false }));
  assert.equal(r.cls + r.score, 'C13');
});

console.log('Quiz');
t('20 questions: 10 basic + 10 advanced, unique ids', () => {
  assert.equal(QUIZ.length, 20);
  assert.equal(QUIZ.filter(q => q.lv === '基礎').length, 10);
  assert.equal(QUIZ.filter(q => q.lv === '高階').length, 10);
  assert.equal(new Set(QUIZ.map(q => q.id)).size, 20);
});
t('each has 4 distinct options, explanation and source', () => QUIZ.forEach(q => {
  assert.equal(new Set(q.o).size, 4, q.id);
  assert.ok(q.a >= 0 && q.a < 4 && q.why && q.src, q.id);
}));
t('answers evenly spread, A–D 5 each', () => [0, 1, 2, 3].forEach(k => assert.equal(QUIZ.filter(q => q.a === k).length, 5, 'ABCD'[k])));
const ans = id => { const q = QUIZ.find(x => x.id === id); return q.o[q.a]; };
t('b1 Child-Pugh answer', () => {
  const r = H.childPugh(lab({ bilirubin: '2.5', albumin: '3', inr: '1.5', ascites: 2 }));
  assert.equal(ans('b1'), r.cls + r.score);
});
t('b4 only the correct option meets Milan', () => {
  assert.equal(H.bclc(tu({ size: '5' }), 'A', 0).milan, true);
  [tu({ size: '5.5' }), tu({ count: '2', size: '3.5' }), tu({ count: '4', size: '2' })].forEach(x => assert.equal(H.bclc(x, 'A', 0).milan, false));
  assert.equal(ans('b4'), '單顆 5 cm');
});
t('b5 up-to-7 in, Milan out', () => {
  const r = H.bclc(tu({ count: '3', size: '4' }), 'A', 0);
  assert.equal(r.upTo7, true); assert.equal(r.milan, false);
  assert.match(ans('b5'), /^符合，3 \+ 4/);
});
t('b8 stage B, TACE', () => {
  const r = H.bclc(tu({ count: '2', size: '3.5' }), 'A', 0);
  assert.equal(r.stage.split(' ')[1], 'B'); assert.match(r.treatment, /TACE/); assert.match(ans('b8'), /^B 期，TACE/);
});
t('b10 stage C, systemic', () => {
  const r = H.bclc(tu({ size: '2', vascular: true }), 'A', 0);
  assert.equal(r.stage.split(' ')[1], 'C'); assert.match(r.treatment, /系統治療/); assert.match(ans('b10'), /^C 期，系統治療/);
});
t('a3 decompensated B8 → D, not A', () => {
  const i = lab({ bilirubin: '2.4', albumin: '2.9', inr: '1.5', ascites: 2 });
  assert.equal(H.childPugh(i).cls, 'B');
  assert.equal(H.bclc(tu({ size: '3' }), 'B', 0, H.decompensated(i)).stage.split(' ')[1], 'D');
});
t('a9 dialysis example: MELD-Na 24, MELD 3.0 23', () => {
  const i = lab({ bilirubin: '1.2', inr: '1.3', na: '135', albumin: '3', creatinine: '', dialysis: true });
  assert.equal(H.meldNa(i).score, 24); assert.equal(H.meld3(i).score, 23);
  assert.equal(ans('a9'), '4.0 與 3.0');
});
t('a10 engine reads ECOG 2 as stage C', () => assert.equal(stage({ size: '1.5' }, 'A', 2), 'C'));

console.log('Mind map');
t('two sides, every branch has leaves', () => {
  assert.deepEqual(MAP.map(s => s.t), ['診斷與評估', '分期與治療']);
  MAP.forEach(s => s.c.forEach(b => assert.ok(b.c && b.c.length, b.t)));
});
t('sibling labels are unique (used as Vue keys)', () => MAP.forEach(s => {
  assert.equal(new Set(s.c.map(b => b.t)).size, s.c.length);
  s.c.forEach(b => assert.equal(new Set(b.c.map(x => x.t)).size, b.c.length, b.t));
}));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
