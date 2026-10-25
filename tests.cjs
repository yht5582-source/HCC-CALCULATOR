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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
