// Unit tests for the calorie floor classifier (utils/calorieFloor.ts). Pure logic, no RN.
// Run: compile with tsc to a temp dir and `node` the output (same as liftPR.test.ts).
// Covers zones (green/whisper/modal) per sex, sex-unset fallback, loss-only gate, the
// pace/activity lever flags, and all four modal-branch cases.
import { computeCalorieFloor } from './calorieFloor';

// Node global (no @types/node in this project); erased at compile time, real at runtime.
declare const process: { exit(code: number): void };

let passed = 0, failed = 0;
const fails: string[] = [];
function check(name: string, cond: boolean, got?: any) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ✗ ${name}${got !== undefined ? `  (got: ${JSON.stringify(got)})` : ''}`); }
}

// Convenience builder with sensible defaults; override per test.
const f = (over: Partial<Parameters<typeof computeCalorieFloor>[0]>) => computeCalorieFloor({
  calTarget: 1638, sex: 'male', weightGoal: 'lose_1', lifestyleActivity: 'active', trainingFrequency: '3x',
  ...over,
});

// ── Zones by sex ──────────────────────────────────────────────────────────────
check('man 1638 -> green', f({ calTarget: 1638 }).zone === 'green');
check('man 1500 exactly -> green (whisper is strictly below)', f({ calTarget: 1500 }).zone === 'green');
check('man 1499 -> whisper', f({ calTarget: 1499 }).zone === 'whisper');
check('man 1388 (his -2/wk example) -> whisper, not modal', f({ calTarget: 1388, weightGoal: 'lose_2' }).zone === 'whisper');
check('man 1200 exactly -> whisper (modal is strictly below)', f({ calTarget: 1200 }).zone === 'whisper');
check('man 1199 -> modal', f({ calTarget: 1199, weightGoal: 'lose_2' }).zone === 'modal');
check('man 1150 -> modal', f({ calTarget: 1150, weightGoal: 'lose_2' }).zone === 'modal');

check('woman 1250 -> green', f({ calTarget: 1250, sex: 'female' }).zone === 'green');
check('woman 1150 -> whisper', f({ calTarget: 1150, sex: 'female', weightGoal: 'lose_1' }).zone === 'whisper');
check('woman 999 -> modal', f({ calTarget: 999, sex: 'female', weightGoal: 'lose_1' }).zone === 'modal');
check('woman 915 (Megan) -> modal', f({ calTarget: 915, sex: 'female', weightGoal: 'lose_1' }).zone === 'modal');

// ── Sex-unset falls back to WOMEN'S (stricter) lines ────────────────────────────
check('sex undefined uses women lines (1150 -> whisper)', f({ calTarget: 1150, sex: undefined, weightGoal: 'lose_1' }).zone === 'whisper');
check('sex undefined: 1450 -> green (would whisper for a man)', f({ calTarget: 1450, sex: undefined, weightGoal: 'lose_1' }).zone === 'green');
check('woman whisperLine is 1200', f({ sex: 'female' }).whisperLine === 1200);
check('man whisperLine is 1500', f({ sex: 'male' }).whisperLine === 1500);

// ── Loss-only gate ──────────────────────────────────────────────────────────────
check('maintain never warns even at 900', f({ calTarget: 900, weightGoal: 'maintain', sex: 'female' }).zone === 'green');
check('gain never warns even at 900', f({ calTarget: 900, weightGoal: 'gain_0_5', sex: 'female' }).zone === 'green');
check('calTarget 0 (incomplete stats) -> green', f({ calTarget: 0, weightGoal: 'lose_2' }).zone === 'green');

// ── Lever flags ─────────────────────────────────────────────────────────────────
check('lose_0_25 -> paceIsLever false (gentlest loss)', f({ weightGoal: 'lose_0_25' }).paceIsLever === false);
check('lose_0_5 -> paceIsLever true (0.25 exists below it)', f({ weightGoal: 'lose_0_5' }).paceIsLever === true);
check('lose_0_75 -> paceIsLever true', f({ weightGoal: 'lose_0_75' }).paceIsLever === true);
check('lose_1 -> paceIsLever true', f({ weightGoal: 'lose_1' }).paceIsLever === true);
check('lose_2 -> paceIsLever true', f({ weightGoal: 'lose_2' }).paceIsLever === true);
check('maintain -> paceIsLever false', f({ weightGoal: 'maintain' }).paceIsLever === false);
check('sedentary + none -> activityIsLever true', f({ lifestyleActivity: 'sedentary', trainingFrequency: 'none' }).activityIsLever === true);
check('sedentary + 3x -> activityIsLever false', f({ lifestyleActivity: 'sedentary', trainingFrequency: '3x' }).activityIsLever === false);
check('light + none -> activityIsLever false', f({ lifestyleActivity: 'light', trainingFrequency: 'none' }).activityIsLever === false);

// ── The 4 modal cases (only in the modal zone) ──────────────────────────────────
const c1 = f({ calTarget: 950, sex: 'female', weightGoal: 'lose_2', lifestyleActivity: 'sedentary', trainingFrequency: 'none' });
check('case 1: aggressive + sedentary -> both levers, modalCase 1', c1.zone === 'modal' && c1.modalCase === 1, c1);
const c2 = f({ calTarget: 1150, sex: 'male', weightGoal: 'lose_2', lifestyleActivity: 'active', trainingFrequency: '3x' });
check('case 2: aggressive + active -> pace only, modalCase 2', c2.modalCase === 2, c2);
const c3 = f({ calTarget: 950, sex: 'female', weightGoal: 'lose_0_25', lifestyleActivity: 'sedentary', trainingFrequency: 'none' });
check('case 3: gentle + sedentary -> activity only, modalCase 3', c3.modalCase === 3, c3);
const c4 = f({ calTarget: 950, sex: 'female', weightGoal: 'lose_0_25', lifestyleActivity: 'active', trainingFrequency: '3x' });
check('case 4: gentle + active -> no lever, modalCase 4', c4.modalCase === 4, c4);

// modalCase is null outside the modal zone
check('whisper zone -> modalCase null', f({ calTarget: 1400, weightGoal: 'lose_2' }).modalCase === null);
check('green zone -> modalCase null', f({ calTarget: 1800 }).modalCase === null);

// ── summary ─────────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) { console.log('FAILED: ' + fails.join(', ')); process.exit(1); }
