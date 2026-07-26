// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },

  // ─── Text + icon imports must go through the app-wide chokepoints ───────────
  //
  // WHY THIS RULE EXISTS: iOS Dynamic Type scaled every piece of text and every icon in the app without
  // limit. At a near-max system setting text ran enormous and content was cut off, worst on onboarding.
  // It shipped that way and was found on TestFlight. The fix routes ALL text and icons through
  // components/AppText.tsx and components/AppIcons.tsx, which refuse the system multiplier and apply the
  // user's own chosen size instead.
  //
  // That fix holds only as long as every file imports from those two places. Nothing about writing
  // `import { Text } from 'react-native'` looks wrong -- it is the obvious thing to type, it compiles,
  // it renders, and it fails silently for anyone with large text turned on. You would find out from a
  // screenshot months later. The rules are written in CLAUDE.md and in Claude's memory, but both of
  // those depend on a human or a model REMEMBERING mid-session. This does not.
  //
  // See SPEC_accessibility.md for the full story, including the two traps that made it expensive to
  // diagnose (Fast Refresh not re-applying a chokepoint change, and Animated.Text bypassing it).
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: [
      // The chokepoints themselves have to import the real thing.
      'components/AppText.tsx',
      'components/AppIcons.tsx',
      // Imports MaterialIcons by subpath and handles allowFontScaling directly; not covered by AppIcons.
      'components/ui/icon-symbol.tsx',
      'functions/**',
      'scripts/**',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: 'react-native',
            importNames: ['Text', 'TextInput'],
            message:
              "Import Text/TextInput from '@/components/AppText' instead. Importing them straight from " +
              "react-native re-enables iOS Dynamic Type for that file, which silently breaks layouts for " +
              'anyone using large text. See SPEC_accessibility.md.',
          },
          {
            name: '@expo/vector-icons',
            message:
              "Import icons from '@/components/AppIcons' instead. Icons render from an icon FONT, so iOS " +
              'scales them exactly like text, and capped text beside uncapped icons looks worse than ' +
              'capping neither. See SPEC_accessibility.md.',
          },
        ],
      }],
    },
  },
]);
