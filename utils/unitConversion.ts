// Universal weight-group and volume-group unit conversion. Pure fixed math, works for any food on
// earth -- converting WITHIN a group (g<->oz, cup<->mL) never needs per-food data. Converting
// BETWEEN groups (grams to cups) needs food-specific density data this does not attempt to solve.
// See "Universal unit conversion" in SPEC_nutrition_label_scan.md for the full locked design.

export type WeightUnit = 'g' | 'kg' | 'oz' | 'lb';
export type VolumeUnit = 'ml' | 'l' | 'cup' | 'tbsp' | 'tsp' | 'fl oz';

// Grams per 1 unit -- canonical unit for the weight group is grams.
const WEIGHT_TO_GRAMS: Record<WeightUnit, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};

// Milliliters per 1 unit -- canonical unit for the volume group is milliliters.
const VOLUME_TO_ML: Record<VolumeUnit, number> = {
  ml: 1,
  l: 1000,
  cup: 236.588,
  tbsp: 14.7868,
  tsp: 4.92892,
  'fl oz': 29.5735,
};

const WEIGHT_UNITS = Object.keys(WEIGHT_TO_GRAMS) as WeightUnit[];
const VOLUME_UNITS = Object.keys(VOLUME_TO_ML) as VolumeUnit[];

export function isWeightUnit(unit: string): unit is WeightUnit {
  return (WEIGHT_UNITS as string[]).includes(unit.toLowerCase());
}

export function isVolumeUnit(unit: string): unit is VolumeUnit {
  return (VOLUME_UNITS as string[]).includes(unit.toLowerCase());
}

// Which convertible group a unit belongs to -- null for count-based units (container, serving,
// pill, capsule, etc.) that have no fixed relationship to weight or volume at all.
export function unitGroup(unit: string): 'weight' | 'volume' | null {
  const u = unit.toLowerCase();
  if (isWeightUnit(u)) return 'weight';
  if (isVolumeUnit(u)) return 'volume';
  return null;
}

// Converts a value between two units in the SAME group only. Always round-trips through the
// group's canonical unit (grams or mL) rather than a direct pairwise formula, so there's exactly
// one conversion factor to trust per unit, never a growing matrix of unit-to-unit combinations.
// Returns null when the two units aren't in the same convertible group (never guesses).
export function convertUnit(value: number, fromUnit: string, toUnit: string): number | null {
  const from = fromUnit.toLowerCase();
  const to = toUnit.toLowerCase();
  if (from === to) return value;

  if (isWeightUnit(from) && isWeightUnit(to)) {
    const grams = value * WEIGHT_TO_GRAMS[from];
    return grams / WEIGHT_TO_GRAMS[to];
  }
  if (isVolumeUnit(from) && isVolumeUnit(to)) {
    const ml = value * VOLUME_TO_ML[from];
    return ml / VOLUME_TO_ML[to];
  }
  return null;
}

// The units to offer someone entering an alternate serving, given the food's PRIMARY serving
// unit -- same group only (weight units alongside a weight-based primary, volume units alongside
// a volume-based one). Non-convertible primary units (container, serving, pill, etc.) get an
// empty list, meaning the UI should fall back to a plain number with no unit picker at all.
export function convertibleUnitsFor(primaryUnit: string): string[] {
  const group = unitGroup(primaryUnit);
  if (group === 'weight') return WEIGHT_UNITS;
  if (group === 'volume') return VOLUME_UNITS;
  return [];
}
