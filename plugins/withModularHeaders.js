// Expo config plugin: inject `use_modular_headers!` into the generated Podfile.
//
// Why this exists: under the New Architecture (RN 0.81 / Expo SDK 54), Swift pods
// (e.g. expo-speech-recognition, expo-image-manipulator) must be integrated as
// static libraries, and they import the Google pods pulled in by
// @react-native-google-signin (AppCheckCore -> GoogleUtilities, RecaptchaInterop).
// Those Google pods don't define module maps, so CocoaPods fails with
// "The following Swift pods cannot yet be integrated as static libraries."
// Setting use_modular_headers! globally generates the module maps and resolves it.
//
// Expo regenerates the Podfile on every prebuild, so this must run as a plugin
// rather than a manual Podfile edit.

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withModularHeaders = (config) => {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      if (contents.includes('use_modular_headers!')) {
        return cfg; // already present, nothing to do
      }

      // Preferred: insert right after the `platform :ios ...` line (global scope).
      const platformMatch = contents.match(/^platform :ios.*$/m);
      if (platformMatch) {
        contents = contents.replace(
          platformMatch[0],
          `${platformMatch[0]}\nuse_modular_headers!`
        );
      } else {
        // Fallback: insert before the first `target ` block.
        contents = contents.replace(/^target /m, "use_modular_headers!\n\ntarget ");
      }

      fs.writeFileSync(podfilePath, contents);
      return cfg;
    },
  ]);
};

module.exports = withModularHeaders;
