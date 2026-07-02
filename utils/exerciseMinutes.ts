// Effective exercise minutes for a day, blending Apple Health with the manual workout timer.
//
// Apple Health (the exercise ring) always takes priority: if HealthKit reported any exercise minutes
// for the day, we use ONLY that number. The manual workout-timer minutes (pj_<date>.manualWorkoutMinutes)
// fill in ONLY when there is no HealthKit value -- i.e. for users with no Apple Watch. This guarantees
// we never add manual minutes on top of a watch that already counted them (no double-count), while
// still giving no-watch users credit toward their Exercise Goal, streaks, achievements, and reminders.
export const effectiveExerciseMinutes = (day: any): number => {
  const hk = typeof day?.exerciseMinutes === 'number' ? day.exerciseMinutes : 0;
  const manual = typeof day?.manualWorkoutMinutes === 'number' ? day.manualWorkoutMinutes : 0;
  return hk > 0 ? hk : manual;
};
