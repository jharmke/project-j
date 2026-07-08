// utils/calorieFloor.ts
// Pure classifier for the low-target safeguard (SPEC_calorie_floor.md). No React/RN, no
// storage, no Date -- so it stays testable (compiled + node-run like utils/liftPR.ts).
//
// Option B "warn + consent": we NEVER clamp the target. This only decides how loud the
// warning is and which fixes are actually available to the user.

// Sex-based lines: whisper = the classic recommended minimum, modal = ~300 lower ("now we
// should talk"). Sex unset falls back to the WOMEN'S (stricter) numbers as a safety net.
export const FLOOR_LINES = {
  male:   { whisper: 1500, modal: 1200 },
  female: { whisper: 1200, modal: 1000 },
};

export type FloorZone = 'green' | 'whisper' | 'modal';

export interface CalorieFloor {
  zone: FloorZone;
  whisperLine: number;
  modalLine: number;
  paceIsLever: boolean;             // a slower LOSS pace exists below the current one
  activityIsLever: boolean;         // sedentary + no training -> room to add movement
  modalCase: 1 | 2 | 3 | 4 | null;  // modal branch (SPEC 4 cases); null unless zone === 'modal'
}

// Loss goals that still have a slower loss pace below them. lose_0_5 is the gentlest loss
// today, so it is NOT a pace lever (stepping further down means maintain, i.e. not losing).
const PACE_LEVER_GOALS = new Set(['lose_1', 'lose_1_5', 'lose_2']);
const LOSS_GOALS = new Set(['lose_0_5', 'lose_1', 'lose_1_5', 'lose_2']);

// Given the resolved target + profile settings, classify the floor zone, which levers are
// available, and the resulting modal branch. Never mutates the target.
export function computeCalorieFloor(input: {
  calTarget: number;
  sex: string | undefined;
  weightGoal: string | undefined;
  lifestyleActivity: string | undefined;
  trainingFrequency: string | undefined;
}): CalorieFloor {
  const { whisper: whisperLine, modal: modalLine } =
    input.sex === 'male' ? FLOOR_LINES.male : FLOOR_LINES.female;

  const paceIsLever = PACE_LEVER_GOALS.has(input.weightGoal ?? '');
  const activityIsLever = input.lifestyleActivity === 'sedentary' && input.trainingFrequency === 'none';

  // Floors apply only to LOSS goals; maintain / gain never warn.
  const isLoss = LOSS_GOALS.has(input.weightGoal ?? '');
  let zone: FloorZone = 'green';
  if (isLoss && input.calTarget > 0) {
    if (input.calTarget < modalLine) zone = 'modal';
    else if (input.calTarget < whisperLine) zone = 'whisper';
  }

  // 4-case modal branch, only meaningful in the modal zone.
  let modalCase: 1 | 2 | 3 | 4 | null = null;
  if (zone === 'modal') {
    if (paceIsLever && activityIsLever) modalCase = 1;        // both fixes
    else if (paceIsLever && !activityIsLever) modalCase = 2;  // pace only
    else if (!paceIsLever && activityIsLever) modalCase = 3;  // activity only
    else modalCase = 4;                                       // no lever
  }

  return { zone, whisperLine, modalLine, paceIsLever, activityIsLever, modalCase };
}
