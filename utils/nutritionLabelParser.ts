// Turns raw OCR output (expo-ocr-kit's { text, blocks: [{ text, confidence, boundingBox }] })
// into structured nutrition-label data. Matches field NAMES + their bounding-box POSITIONS
// rather than assuming any fixed layout -- this is what makes it format-agnostic (works across
// old/new FDA formats) and is the same technique the dual-column column-matching (a later step)
// extends further. See SPEC_nutrition_label_scan.md for the full locked design.

export interface OcrBlockLike {
  text: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface OcrResultLike {
  text: string;
  blocks: OcrBlockLike[];
}

export interface ParsedField {
  value: number | null;
  percentDV: number | null;
  confidence: number | null; // null = field was not found on the label at all
}

export interface ParsedServing {
  description: string | null; // e.g. "1 Bar (37g)"
  grams: number | null;       // e.g. 37, parsed out of the description if present
  confidence: number | null;
  // The measured part split off from the description, so the review screen can offer it as an
  // editable amount + unit instead of one dead string: "1 Can (16 fl oz)" -> name "1 Can",
  // amount 16, unit "fl oz". Volume labels are why `grams` alone was never enough.
  name: string | null;
  amount: number | null;
  unit: string | null;
}

// Units a serving size is actually printed in. mg is deliberately absent: it appears all over a
// label as a nutrient unit and never as a serving size.
const SERVING_UNIT_PATTERN = 'fl\\s*oz|kg|g|oz|lb|ml|l|cup|tbsp|tsp';

// Splits "1 Can (16 fl oz)" / "1/3 cup mix (40g)" / "16 fl oz" into a name and a measured amount.
// Prefers the parenthetical (that's where the regulated measure lives), falls back to a trailing
// bare measure. Anything it can't split stays whole in the name so nothing is silently dropped.
function splitServingDescription(description: string): { name: string; amount: number | null; unit: string | null } {
  const paren = new RegExp(`\\((\\d+(?:\\.\\d+)?)\\s*(${SERVING_UNIT_PATTERN})\\b[^)]*\\)`, 'i').exec(description);
  if (paren) {
    return {
      name: description.replace(paren[0], '').trim().replace(/[,\s]+$/, ''),
      amount: parseFloat(paren[1]),
      unit: paren[2].toLowerCase().replace(/\s+/g, ' '),
    };
  }
  const bare = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${SERVING_UNIT_PATTERN})\\b\\s*$`, 'i').exec(description);
  if (bare) {
    return {
      name: description.replace(bare[0], '').trim().replace(/[,\s]+$/, ''),
      amount: parseFloat(bare[1]),
      unit: bare[2].toLowerCase().replace(/\s+/g, ' '),
    };
  }
  return { name: description.trim(), amount: null, unit: null };
}

export interface ParsedLabel {
  fields: Record<string, ParsedField>;
  serving: ParsedServing;
  servingsPerContainer: { value: number | null; confidence: number | null };
  missingCoreField: string | null; // 'Calories' | 'Total Fat' | 'Total Carbohydrate' | 'Protein' | null
  lowConfidenceCount: number;
}

// FDA Daily Value reference (mirrors components/NutritionGearModal.tsx's 'standard' preset --
// this is the FIXED reference a label's own %DV column is calculated against, never the user's
// personal/dynamic goal). Fields with no real published DV (calories, Poly/Mono Fat, Sugar
// Alcohols) are omitted on purpose -- deriving a fake number for them would be worse than
// leaving the field un-derivable.
export const DV_REFERENCE: Record<string, number> = {
  fat: 78, saturatedFat: 20, cholesterol: 300, sodium: 2300, carbs: 275, fiber: 28,
  addedSugars: 50, potassium: 4700,
  vitaminA: 900, vitaminC: 90, vitaminD: 20, vitaminE: 15, vitaminK: 120,
  vitaminB6: 1.7, folate: 400, vitaminB12: 2.4, biotin: 30,
  thiamin: 1.2, riboflavin: 1.3, niacin: 16, choline: 550,
  calcium: 1300, iron: 18, magnesium: 420, zinc: 11, copper: 0.9,
};

interface FieldDef {
  key: string;
  unit: string;
  // Matches the field's name + an inline value in the SAME block, e.g. "Total Fat 3.5g".
  namePattern: RegExp;
  // Some labels also print the %DV inline right after the value, e.g. "Total Fat 3.5g 4%" --
  // captured here so it doesn't need a second, cross-block lookup when it's already available.
  inlinePercentPattern: RegExp;
}

const CORE_FIELD_KEYS = ['calories', 'fat', 'carbs', 'protein'];

const FIELD_DEFS: FieldDef[] = [
  { key: 'calories',    unit: 'kcal', namePattern: /calories\D{0,3}(\d+(?:\.\d+)?)/i, inlinePercentPattern: /calories.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'fat',          unit: 'g',   namePattern: /total fat\D{0,3}(\d+(?:\.\d+)?)\s*g/i,          inlinePercentPattern: /total fat.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'saturatedFat', unit: 'g',   namePattern: /saturated fat\D{0,3}(\d+(?:\.\d+)?)\s*g/i,       inlinePercentPattern: /saturated fat.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'transFat',     unit: 'g',   namePattern: /trans fat\D{0,3}(\d+(?:\.\d+)?)\s*g/i,           inlinePercentPattern: /trans fat.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'cholesterol',  unit: 'mg',  namePattern: /cholesterol\D{0,3}(\d+(?:\.\d+)?)\s*mg/i,        inlinePercentPattern: /cholesterol.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'sodium',       unit: 'mg',  namePattern: /sodium\D{0,3}(\d+(?:\.\d+)?)\s*mg/i,             inlinePercentPattern: /sodium.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'carbs',        unit: 'g',   namePattern: /total carbohydrate\D{0,3}(\d+(?:\.\d+)?)\s*g/i, inlinePercentPattern: /total carbohydrate.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'fiber',        unit: 'g',   namePattern: /dietary fiber\D{0,3}(\d+(?:\.\d+)?)\s*g/i,       inlinePercentPattern: /dietary fiber.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'sugar',        unit: 'g',   namePattern: /total sugars\D{0,3}(\d+(?:\.\d+)?)\s*g/i,        inlinePercentPattern: /total sugars.*?(\d+(?:\.\d+)?)\s*%/i },
  // "Incl. 11g Added Sugars" -- the ONE field on a real FDA label where the number comes BEFORE
  // the name instead of after. Handled as its own pattern rather than forcing it into the
  // name-then-number shape every other field uses.
  { key: 'addedSugars',  unit: 'g',   namePattern: /incl\.?\s+(\d+(?:\.\d+)?)\s*g\s+added sugars/i,  inlinePercentPattern: /added sugars.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'protein',      unit: 'g',   namePattern: /protein\D{0,3}(\d+(?:\.\d+)?)\s*g/i,             inlinePercentPattern: /protein.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'vitaminD',     unit: 'mcg', namePattern: /vitamin d\D{0,3}(\d+(?:\.\d+)?)\s*mcg/i,          inlinePercentPattern: /vitamin d.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'calcium',      unit: 'mg',  namePattern: /calcium\D{0,3}(\d+(?:\.\d+)?)\s*mg/i,            inlinePercentPattern: /calcium.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'iron',         unit: 'mg',  namePattern: /iron\D{0,3}(\d+(?:\.\d+)?)\s*mg/i,                inlinePercentPattern: /iron.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'potassium',    unit: 'mg',  namePattern: /potassium\D{0,3}(\d+(?:\.\d+)?)\s*mg/i,           inlinePercentPattern: /potassium.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'vitaminA',     unit: 'mcg', namePattern: /vitamin a\D{0,3}(\d+(?:\.\d+)?)\s*mcg/i,          inlinePercentPattern: /vitamin a.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'vitaminC',     unit: 'mg',  namePattern: /vitamin c\D{0,3}(\d+(?:\.\d+)?)\s*mg/i,           inlinePercentPattern: /vitamin c.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'vitaminE',     unit: 'mg',  namePattern: /vitamin e\D{0,3}(\d+(?:\.\d+)?)\s*mg/i,           inlinePercentPattern: /vitamin e.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'vitaminK',     unit: 'mcg', namePattern: /vitamin k\D{0,3}(\d+(?:\.\d+)?)\s*mcg/i,          inlinePercentPattern: /vitamin k.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'vitaminB6',    unit: 'mg',  namePattern: /vitamin b ?6\D{0,3}(\d+(?:\.\d+)?)\s*mg/i,        inlinePercentPattern: /vitamin b ?6.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'folate',       unit: 'mcg', namePattern: /folate\D{0,3}(\d+(?:\.\d+)?)\s*mcg/i,             inlinePercentPattern: /folate.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'vitaminB12',   unit: 'mcg', namePattern: /vitamin b ?12\D{0,3}(\d+(?:\.\d+)?)\s*mcg/i,      inlinePercentPattern: /vitamin b ?12.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'biotin',       unit: 'mcg', namePattern: /biotin\D{0,3}(\d+(?:\.\d+)?)\s*mcg/i,             inlinePercentPattern: /biotin.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'thiamin',      unit: 'mg',  namePattern: /thiamin\D{0,3}(\d+(?:\.\d+)?)\s*mg/i,             inlinePercentPattern: /thiamin.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'riboflavin',   unit: 'mg',  namePattern: /riboflavin\D{0,3}(\d+(?:\.\d+)?)\s*mg/i,          inlinePercentPattern: /riboflavin.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'niacin',       unit: 'mg',  namePattern: /niacin\D{0,3}(\d+(?:\.\d+)?)\s*mg/i,              inlinePercentPattern: /niacin.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'choline',      unit: 'mg',  namePattern: /choline\D{0,3}(\d+(?:\.\d+)?)\s*mg/i,             inlinePercentPattern: /choline.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'magnesium',    unit: 'mg',  namePattern: /magnesium\D{0,3}(\d+(?:\.\d+)?)\s*mg/i,           inlinePercentPattern: /magnesium.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'zinc',         unit: 'mg',  namePattern: /zinc\D{0,3}(\d+(?:\.\d+)?)\s*mg/i,                inlinePercentPattern: /zinc.*?(\d+(?:\.\d+)?)\s*%/i },
  { key: 'copper',       unit: 'mg',  namePattern: /copper\D{0,3}(\d+(?:\.\d+)?)\s*mg/i,              inlinePercentPattern: /copper.*?(\d+(?:\.\d+)?)\s*%/i },
];

// A field's NAME can appear in a block with no adjacent value at all (e.g. a bare "Thiamin"
// label sitting to the left of its own %DV in a separate block) -- this catches that case so the
// cross-block %DV lookup below still has something to anchor to.
// Anchored with a word boundary: without it, "choline" matched inside "Alpha-Glyceryl Phosphoryl
// Choline" in an ingredients list and then grabbed the nearest number as a value (2026-07-22).
const BARE_NAME_PATTERNS: Record<string, RegExp> = Object.fromEntries(
  FIELD_DEFS.map(f => [f.key, new RegExp('\\b' + f.namePattern.source.split('\\D')[0], 'i')])
);

const LONE_PERCENT = /^\s*(\d+(?:\.\d+)?)\s*%\s*$/;
// A block that's JUST a number, optionally with a unit -- deliberately does NOT allow a trailing
// "%" so this can never collide with LONE_PERCENT above; the two patterns are mutually exclusive
// by construction, one finds a raw value, the other finds a %DV, never the same block.
const BARE_VALUE = /^\s*(\d+(?:\.\d+)?)\s*(?:g|mg|mcg)?\s*$/i;
// "Same row" tolerance scales with the text's own size instead of a fixed pixel count -- a fixed
// number only holds up at one specific distance from the label. Confirmed on real device scans:
// a farther-away photo shrinks every row proportionally, so a fixed tolerance that was safely
// tight up close starts reaching into the NEXT row's numbers once everything gets smaller. Using
// a fraction of the row's actual height keeps the same relative safety margin at any distance.
const ROW_TOLERANCE_RATIO = 0.45;

function rowsOverlap(a: OcrBlockLike, b: OcrBlockLike): boolean {
  const centerA = a.boundingBox.y + a.boundingBox.height / 2;
  const centerB = b.boundingBox.y + b.boundingBox.height / 2;
  const tolerance = Math.min(a.boundingBox.height, b.boundingBox.height) * ROW_TOLERANCE_RATIO;
  return Math.abs(centerA - centerB) <= tolerance;
}

// A CAN is a cylinder: the label wraps away from the camera, so the farther apart two blocks are
// horizontally, the more their baselines drift vertically. A label name hard-left and its number
// hard-right (Calories/10, Serving Size/1 Can) drift enough to fail the flat test above, which is
// exactly what a real Ghost Energy can did on 2026-07-22 while a flat pancake box read fine.
//
// This is deliberately a SECOND PASS, only consulted when the strict test found nothing: any label
// that already reads correctly takes the identical path it always did and cannot change. The extra
// drift grows with horizontal distance and is capped below one full row height, so it can never
// reach the next row's center -- the %DV-bleeding-across-rows bug is not coming back.
const CURVE_DRIFT_PER_WIDTH = 0.5;  // extra tolerance per one row-height of horizontal distance
const CURVE_DRIFT_CAP = 0.9;        // never more than 0.9 of a row height, total
function rowsOverlapCurved(a: OcrBlockLike, b: OcrBlockLike): boolean {
  const rowH = Math.min(a.boundingBox.height, b.boundingBox.height);
  if (rowH <= 0) return false;
  const centerA = a.boundingBox.y + a.boundingBox.height / 2;
  const centerB = b.boundingBox.y + b.boundingBox.height / 2;
  const gapX = Math.max(0, b.boundingBox.x - (a.boundingBox.x + a.boundingBox.width));
  const extra = Math.min((gapX / rowH) * CURVE_DRIFT_PER_WIDTH, CURVE_DRIFT_CAP - ROW_TOLERANCE_RATIO);
  const tolerance = rowH * (ROW_TOLERANCE_RATIO + Math.max(0, extra));
  return Math.abs(centerA - centerB) <= tolerance;
}

// The loosened tolerance alone is not enough: on a tightly compressed label it can reach a value
// that belongs to the NEXT row (caught by the iron/potassium regression test). A value belongs to
// whichever row label sits nearest to it vertically, so the curved pass additionally refuses any
// candidate that some other label to its left owns more closely than we do.
function ownsRow(anchor: OcrBlockLike, candidate: OcrBlockLike, blocks: OcrBlockLike[]): boolean {
  const centerOf = (x: OcrBlockLike) => x.boundingBox.y + x.boundingBox.height / 2;
  const candidateCenter = centerOf(candidate);
  const ourDistance = Math.abs(centerOf(anchor) - candidateCenter);
  for (const b of blocks) {
    if (b === anchor || b === candidate) continue;
    if (b.boundingBox.x >= candidate.boundingBox.x) continue; // only things to its LEFT can be its label
    if (!/[a-z]/i.test(b.text)) continue;                     // a row label has letters; a number doesn't
    if (Math.abs(centerOf(b) - candidateCenter) < ourDistance) return false;
  }
  return true;
}

/** Finds a standalone "NN%" block on the same row and to the right of `anchor`, if any. */
function findRowPercent(anchor: OcrBlockLike, blocks: OcrBlockLike[]): OcrBlockLike | null {
  const pick = (sameRow: (a: OcrBlockLike, b: OcrBlockLike) => boolean, curved: boolean) => {
    let best: OcrBlockLike | null = null;
    for (const b of blocks) {
      if (b === anchor) continue;
      if (!LONE_PERCENT.test(b.text)) continue;
      if (b.boundingBox.x <= anchor.boundingBox.x) continue;
      if (!sameRow(anchor, b)) continue;
      if (curved && !ownsRow(anchor, b, blocks)) continue;
      if (!best || b.boundingBox.x < best.boundingBox.x) best = b;
    }
    return best;
  };
  return pick(rowsOverlap, false) ?? pick(rowsOverlapCurved, true);
}

// Same technique as findRowPercent, pointed at the raw VALUE instead -- Vision sometimes reads a
// field's name and its number as two separate blocks (confirmed on real photos: "Calories" and
// "140" recognized as disconnected chunks at 100% confidence each, not a low-confidence misread).
// Only ever consulted when Pass 1/2 above found the field's NAME but no inline number, so this
// can't invent a field that was never printed, and BARE_VALUE's %-exclusion keeps it from ever
// grabbing a %DV number instead of the real value.
function findRowValue(anchor: OcrBlockLike, blocks: OcrBlockLike[]): OcrBlockLike | null {
  const pick = (sameRow: (a: OcrBlockLike, b: OcrBlockLike) => boolean, curved: boolean) => {
    let best: OcrBlockLike | null = null;
    for (const b of blocks) {
      if (b === anchor) continue;
      if (!BARE_VALUE.test(b.text)) continue;
      if (b.boundingBox.x <= anchor.boundingBox.x) continue;
      if (!sameRow(anchor, b)) continue;
      if (curved && !ownsRow(anchor, b, blocks)) continue;
      if (!best || b.boundingBox.x < best.boundingBox.x) best = b;
    }
    return best;
  };
  return pick(rowsOverlap, false) ?? pick(rowsOverlapCurved, true);
}

// "Not a significant source of saturated fat, trans fat, dietary fiber, vitamin D, calcium, iron
// and potassium." is a regulated FDA footnote meaning those nutrients are below the labeling
// threshold -- i.e. zero for our purposes. It is REAL data, not noise: read it as 0 rather than
// letting the nutrient names inside it look like findings with no numbers attached.
const NOT_SIGNIFICANT_KEYWORDS: Record<string, RegExp> = {
  saturatedFat: /saturated fat/i,
  transFat:     /trans fat/i,
  fiber:        /dietary fiber|fiber/i,
  sugar:        /total sugars|sugars/i,
  addedSugars:  /added sugars/i,
  cholesterol:  /cholesterol/i,
  protein:      /protein/i,
  vitaminA:     /vitamin a/i,
  vitaminC:     /vitamin c/i,
  vitaminD:     /vitamin d/i,
  calcium:      /calcium/i,
  iron:         /iron/i,
  potassium:    /potassium/i,
};

export function parseNutritionLabel(ocr: OcrResultLike): ParsedLabel {
  const allBlocks = ocr.blocks;

  // Everything from the INGREDIENTS list down (ingredients, supplement-facts panels, marketing
  // copy) is not Nutrition Facts data. Matching into it is how a can with "Alpha-Glyceryl
  // Phosphoryl Choline" in its ingredients produced a phantom 100mg of choline on 2026-07-22.
  const ingredientsBlock = allBlocks.find(b => /^\s*ingredients\s*:/i.test(b.text) || /\bingredients\s*:/i.test(b.text));
  const cutoffY = ingredientsBlock ? ingredientsBlock.boundingBox.y : Infinity;
  const blocks = allBlocks.filter(b => b.boundingBox.y < cutoffY);

  // The "not a significant source of ..." footnote, if the label prints one. It wraps across OCR
  // blocks unpredictably, so it's identified by TEXT rather than geometry: stitch the label back
  // together in reading order and take the sentence. A geometric window around the first block
  // missed the continuation line on a real can (2026-07-22) and let "calcium, iron" in that
  // sentence read as found-but-numberless fields.
  const orderedText = [...blocks]
    .sort((a, b) => a.boundingBox.y - b.boundingBox.y)
    .map(b => b.text.trim())
    .join(' ');
  const footnoteStart = orderedText.search(/not a significant source/i);
  let notSignificantText = '';
  if (footnoteStart >= 0) {
    const rest = orderedText.slice(footnoteStart);
    const end = rest.indexOf('.');
    notSignificantText = end > 0 ? rest.slice(0, end) : rest;
  }
  const notSignificantAnchor = blocks.find(b => /not a significant source/i.test(b.text)) ?? null;
  const notSignificantConfidence = notSignificantAnchor?.confidence ?? null;
  // Any block whose text is part of that sentence is prose, not a nutrition row.
  const footnoteBlocks = notSignificantText
    ? blocks.filter(b => b.text.trim().length > 3 && notSignificantText.includes(b.text.trim()))
    : [];
  const matchBlocks = blocks.filter(b => !footnoteBlocks.includes(b));

  const fields: Record<string, ParsedField> = {};

  for (const def of FIELD_DEFS) {
    let value: number | null = null;
    let percentDV: number | null = null;
    let confidence: number | null = null;
    let anchorBlock: OcrBlockLike | null = null;

    // Pass 1: find the block that names this field, pulling an inline value if present.
    for (const b of matchBlocks) {
      const m = def.namePattern.exec(b.text);
      if (m) {
        value = parseFloat(m[1]);
        confidence = b.confidence;
        anchorBlock = b;
        const pm = def.inlinePercentPattern.exec(b.text);
        if (pm) percentDV = parseFloat(pm[1]);
        break;
      }
    }

    // Not found with a value -- check for a BARE name mention (field printed as %DV only,
    // e.g. "Thiamin 10%" as one block or "Thiamin" / "10%" as two separate blocks).
    if (!anchorBlock) {
      const bare = BARE_NAME_PATTERNS[def.key];
      for (const b of matchBlocks) {
        if (bare.test(b.text)) {
          anchorBlock = b;
          confidence = b.confidence;
          const pm = /(\d+(?:\.\d+)?)\s*%/.exec(b.text);
          if (pm) percentDV = parseFloat(pm[1]);
          break;
        }
      }
    }

    // Field name never appeared anywhere on the label at all -- leave untouched, per the
    // "never overwrite a field the label didn't print" rule. Zero and absent are NOT the same;
    // this only fires when the name genuinely never matched, not when a real "0" was read.
    if (!anchorBlock) {
      // ...unless the label explicitly declared it insignificant, which means zero.
      const kw = NOT_SIGNIFICANT_KEYWORDS[def.key];
      if (notSignificantText && kw && kw.test(notSignificantText)) {
        fields[def.key] = { value: 0, percentDV: 0, confidence: notSignificantConfidence };
        continue;
      }
      fields[def.key] = { value: null, percentDV: null, confidence: null };
      continue;
    }

    // Value still missing -- name was found but not an inline number (see findRowValue above for
    // why this happens on real photos). Look for a bare number on the same row, to the right.
    if (value === null) {
      const rowValue = findRowValue(anchorBlock, matchBlocks);
      if (rowValue) {
        value = parseFloat(BARE_VALUE.exec(rowValue.text)![1]);
        confidence = Math.min(confidence ?? 1, rowValue.confidence);
      }
    }

    // Percent still missing -- look for a separate "NN%" block on the same row, to the right
    // (the real dual-column-style layout Vision's bounding boxes make possible to detect).
    if (percentDV === null) {
      const rowPercent = findRowPercent(anchorBlock, matchBlocks);
      if (rowPercent) {
        percentDV = parseFloat(LONE_PERCENT.exec(rowPercent.text)![1]);
        confidence = Math.min(confidence ?? 1, rowPercent.confidence);
      }
    }

    // Named on the label but with no number anywhere -- if the "not a significant source" footnote
    // names it, that IS its number: zero. Checked here rather than only in the never-matched branch
    // above, because the name often matches inside the footnote sentence itself.
    if (value === null && percentDV === null) {
      const kw = NOT_SIGNIFICANT_KEYWORDS[def.key];
      if (notSignificantText && kw && kw.test(notSignificantText)) {
        fields[def.key] = { value: 0, percentDV: 0, confidence: notSignificantConfidence };
        continue;
      }
    }

    // Derive whichever side wasn't printed, from the fixed FDA reference -- never chaining off
    // an already-derived number, always straight from the one canonical DV constant.
    const dv = DV_REFERENCE[def.key];
    if (dv) {
      if (value === null && percentDV !== null) value = Math.round((percentDV / 100) * dv * 10) / 10;
      else if (value !== null && percentDV === null) percentDV = Math.round((value / dv) * 100);
      else if (value !== null && percentDV !== null) {
        // Both printed -- flag if the label's own numbers don't agree with each other (normal
        // rounding aside), but the printed VALUE stays canonical either way.
        const expectedPercent = Math.round((value / dv) * 100);
        if (Math.abs(expectedPercent - percentDV) > Math.max(2, expectedPercent * 0.15)) {
          confidence = Math.min(confidence ?? 1, 0.4);
        }
      }
    }

    fields[def.key] = { value, percentDV, confidence };
  }

  // Serving size: "Serving size" and its value can land in ONE merged block ("Serving size 1/3
  // cup mix (40g)") or TWO separate blocks ("Serving size" / "1 Bar (37g)") -- confirmed both
  // happen on real photos of the exact same product across different scans, same lesson as the
  // calories fix above: check the same block first, only search a neighboring block as a fallback.
  let serving: ParsedServing = { description: null, grams: null, confidence: null, name: null, amount: null, unit: null };
  const servingLabelBlock = blocks.find(b => /serving size/i.test(b.text));
  const buildServing = (description: string, confidence: number): ParsedServing => {
    const gramsMatch = /\(?(\d+(?:\.\d+)?)\s*g\)?/i.exec(description);
    const split = splitServingDescription(description);
    return {
      description,
      grams: gramsMatch ? parseFloat(gramsMatch[1]) : null,
      confidence,
      name: split.name || null,
      amount: split.amount,
      unit: split.unit,
    };
  };
  if (servingLabelBlock) {
    const inlineMatch = /serving size\s*[:\-]?\s*(.+)/i.exec(servingLabelBlock.text);
    const inlineDescription = inlineMatch ? inlineMatch[1].trim() : '';
    // A capture of pure punctuation (a stray ":" from "Serving Size:") is NOT a serving size --
    // accepting it used to short-circuit the same-row search below, losing values printed off to
    // the right of the label ("1 Can (16 fl oz)"). Confirmed on a real can 2026-07-22.
    const inlineIsReal = /[a-z0-9]/i.test(inlineDescription);

    if (inlineIsReal) {
      serving = buildServing(inlineDescription, servingLabelBlock.confidence);
    } else {
      // Strict same-row first, then the curved-surface pass -- on a can the serving value sits hard
      // right of "Serving Size:" and drifts vertically exactly like the Calories number does.
      const sameRow = (test: (a: OcrBlockLike, b: OcrBlockLike) => boolean) => blocks
        .filter(b => b !== servingLabelBlock && b.boundingBox.x > servingLabelBlock.boundingBox.x && test(servingLabelBlock, b) && /[a-z0-9]/i.test(b.text))
        .sort((a, b) => a.boundingBox.x - b.boundingBox.x);
      const valueBlock = sameRow(rowsOverlap)[0]
        ?? sameRow(rowsOverlapCurved).find(b => ownsRow(servingLabelBlock, b, blocks))
        ?? null;
      if (valueBlock) {
        serving = buildServing(valueBlock.text.trim(), Math.min(servingLabelBlock.confidence, valueBlock.confidence));
      }
    }
  }

  // "X servings per container/package/box/etc." -- the fixed, regulated part is "[number]
  // serving(s) per," the noun after it varies by manufacturer (confirmed real: one can printed
  // "per package" instead of "per container"). Matching any trailing word instead of a specific
  // list avoids chasing every possible noun one at a time.
  let servingsPerContainer: { value: number | null; confidence: number | null } = { value: null, confidence: null };
  for (const b of blocks) {
    const m = /(\d+(?:\.\d+)?)\s+servings?\s+per\s+\w+/i.exec(b.text);
    if (m) {
      servingsPerContainer = { value: parseFloat(m[1]), confidence: b.confidence };
      break;
    }
  }

  // Completeness check: the 4 fields printed on literally every real FDA label. Missing one is
  // a reliable "the photo itself was bad" signal, unlike total field count (varies legitimately
  // by product).
  const CORE_LABELS: Record<string, string> = { calories: 'Calories', fat: 'Total Fat', carbs: 'Total Carbohydrate', protein: 'Protein' };
  let missingCoreField: string | null = null;
  for (const key of CORE_FIELD_KEYS) {
    if (fields[key].value === null) { missingCoreField = CORE_LABELS[key]; break; }
  }

  const LOW_CONFIDENCE_THRESHOLD = 0.5;
  const lowConfidenceCount = Object.values(fields).filter(f => f.confidence !== null && f.confidence < LOW_CONFIDENCE_THRESHOLD).length;

  return { fields, serving, servingsPerContainer, missingCoreField, lowConfidenceCount };
}
