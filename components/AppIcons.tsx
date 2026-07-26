import {
  Ionicons as RNIonicons,
  MaterialCommunityIcons as RNMaterialCommunityIcons,
  AntDesign as RNAntDesign,
} from '@expo/vector-icons';

/**
 * App-wide ICON chokepoint, same idea and same reason as AppText. See SPEC_accessibility.md.
 *
 * Icons are TEXT. @expo/vector-icons renders a glyph from an icon FONT, so iOS Dynamic Type scales
 * icons exactly like words. Some of what looked like layout breakage in the report that started this
 * work was icons growing, not just text.
 *
 * Capping text but not icons is WORSE than capping neither: you get normal-sized words sitting beside
 * oversized glyphs, blown-out header rows, and tab bars that no longer line up. So icons are killed in
 * the same pass as text.
 *
 * `size` is untouched -- callers still control it. This only refuses the SYSTEM's multiplier, and
 * `allowFontScaling` sits before the spread so a caller can still override deliberately.
 */

/**
 * Object.assign, not a plain function, because these icon sets carry STATICS that the app uses.
 * `Ionicons.glyphMap` is read in 9 places (to type or iterate icon names). A bare wrapper function
 * silently drops it, and the failure is not a missing-property error at the call site -- it degrades
 * `keyof typeof Ionicons.glyphMap` to `string | number | symbol`, which then fails to satisfy the
 * `name` prop. Re-attaching the statics keeps every existing call site compiling unchanged.
 */
export const Ionicons = Object.assign(
  (props: React.ComponentProps<typeof RNIonicons>) => <RNIonicons allowFontScaling={false} {...props} />,
  { glyphMap: RNIonicons.glyphMap, font: RNIonicons.font, loadFont: RNIonicons.loadFont },
);

export const MaterialCommunityIcons = Object.assign(
  (props: React.ComponentProps<typeof RNMaterialCommunityIcons>) => (
    <RNMaterialCommunityIcons allowFontScaling={false} {...props} />
  ),
  {
    glyphMap: RNMaterialCommunityIcons.glyphMap,
    font: RNMaterialCommunityIcons.font,
    loadFont: RNMaterialCommunityIcons.loadFont,
  },
);

export const AntDesign = Object.assign(
  (props: React.ComponentProps<typeof RNAntDesign>) => <RNAntDesign allowFontScaling={false} {...props} />,
  { glyphMap: RNAntDesign.glyphMap, font: RNAntDesign.font, loadFont: RNAntDesign.loadFont },
);
