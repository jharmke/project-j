# SPEC -- Body Progress (Photos + Measurements)
Last updated: Session 61 (May 31 2026)
Status: SPECCED -- not yet built. Blocked on Firebase Storage migration for photo persistence.

---

## Overview

A dedicated Body section inside the Stats tab for tracking physical progress over time via photos and body measurements. Photos are organized by pose, filterable, and used to generate timelapses and side-by-side comparisons. Measurements feed into body composition calculations and stats graphs. Everything lives in one place under a single section header (name TBD -- "Body" for now).

---

## Location

Stats tab. New collapsible section alongside At a Glance / Trends / Records / Streaks / Calendar. Section header: BODY (name TBD).

---

## Storage

Photos: Firebase Storage (NOT local only). Blocked until Firebase Storage migration ships. Body progress photos use the same Firebase Storage solution as food photos. Do not build this feature local-only -- data loss on app delete or new phone is unacceptable for something this personal.

Measurements: AsyncStorage under new key `pj_body_measurements`. Array of measurement entries, each with a date and all fields.

---

## Part 1 -- Progress Photos

### Pose System

Three poses: Front, Side, Back. Each photo is tagged to exactly one pose at capture time. Poses are never mixed. All browsing, timelapse generation, and side-by-side comparisons are pose-specific -- always filter to one pose at a time.

### Camera -- First Photo (Silhouette Guide)

When a user taps a pose slot for the very first time, the camera view shows a semi-transparent silhouette/outline matching that pose (front-facing human outline for Front, side profile for Side, rear for Back). Purpose: help user line up distance, angle, and framing consistently from day one. After the first photo is taken the silhouette becomes optional -- toggle on/off in the camera view. Always available as a ghost overlay if user wants it, just slightly dimmer after first use.

No slide-up camera transition -- use opacity fade per existing project standard.

### Logging Flow

No fixed schedule required. User logs whenever they want -- daily, weekly, monthly, sporadically. No minimum frequency. The timelapse and comparisons handle gaps gracefully.

FAB on the Stats tab opens options: Add Graph / Add Report / Log Photo / Log Measurements. Tapping Log Photo opens pose selector (Front / Side / Back), then camera.

### Data Overlay on Saved Photos

Customizable card overlay burned into the saved/exported photo (NOT applied to raw photo stored for timelapse). User configures which data points appear:
- Date (always shown by default, not removable)
- Weight
- Any logged body measurements (each toggleable)
- Delta values from a chosen anchor date (e.g. "-12 lbs since Jan 1")

Overlay position: preset options only (no free drag). Options: Top-Left, Top-Right, Bottom-Left, Bottom-Right, Bottom Bar (full-width strip across bottom). User picks their preferred position in settings or at export time.

Overlay is NOT applied to the raw photo file stored for timelapse generation. Timelapse always uses raw photos only.

### Timelapse Generation

User selects a pose, the app generates a timelapse from all non-excluded photos for that pose in chronological order.

Speed options: Slow / Normal / Fast (pill selector before generating). Approximate frame rates: Slow = 2fps, Normal = 5fps, Fast = 10fps. Exact values TBD during build.

Exclusion: user can exclude any individual photo from the timelapse without deleting it. Excluded photos still appear in the photo browser with a visual indicator (dimmed + exclusion badge). Tap to toggle exclusion on/off.

Output: video file (MP4 preferred over GIF for quality and file size). User can download/export via native iOS share sheet. Output must be polished -- no watermarks, clean transitions between frames.

Disclosure shown before/after generation: "Generated from X photos across Y days" -- honest about gaps.

### Side-by-Side Comparison

User picks 2 or 3 dates. Photos from the same pose for those dates are shown side by side. Up to 3 columns max. Similar date-picker interaction to Head to Head screen. Dates with no photo for that pose show an empty placeholder slot with the date.

### Photo Browser

Grid view of all photos for a selected pose, sorted chronologically. Date stamp on each thumbnail. Tap to view full screen. Full screen view shows: photo, date, weight logged that day (if available), any measurements logged that day (if available). Options: Edit overlay settings, Exclude from timelapse, Delete photo (with confirm Alert + heavy haptic per build standard).

### Day Detail Integration

Photos/Attachments section added to Day Detail screen. Default collapsed (does not kill scroll space on open). When expanded: shows any progress photo(s) taken that day (all poses) and any food photos logged. Tapping a progress photo navigates to full screen view. This section only renders if there is at least one photo or attachment for that day -- hidden entirely if nothing to show.

---

## Part 2 -- Body Measurements

### Fields

Full measurement set for both weight loss and muscle growth tracking:

**Circumference (tape measure):**
- Neck
- Chest (at nipple line)
- Shoulders (widest point)
- Waist (at navel)
- Hips (widest point)
- Left Bicep (flexed, at peak)
- Right Bicep (flexed, at peak)
- Left Forearm (widest point)
- Right Forearm (widest point)
- Left Thigh (widest point)
- Right Thigh (widest point)
- Left Calf (widest point)
- Right Calf (widest point)

**Calculated (auto-computed, not manually entered):**
- Navy Method Body Fat % -- requires Neck + Waist for males, Neck + Waist + Hips for females. Formula uses sex from profile. Shown as a calculated read-only field when required inputs are present.

**Units:** inches (US default) with cm toggle. Preference saved to profile.

### Logging UI

Flat form -- all fields on one screen, scroll to see all. No multi-step wizard. Fields grouped by body region for scanability:

- Upper Body: Neck, Chest, Shoulders
- Core: Waist, Hips
- Arms: Left/Right Bicep, Left/Right Forearm
- Legs: Left/Right Thigh, Left/Right Calf
- Calculated: Navy Body Fat % (read-only, auto-fills when inputs present)

All fields optional -- user fills in what they track. Empty fields save as null, not 0.

### How-to Tooltips

Every measurement field has a small (i) icon to the right of the label. Tapping opens TooltipModal with:
- The measurement name as title
- One to two sentences explaining where exactly to place the tape
- A static illustration (PNG or SVG asset) showing correct tape placement for that measurement
- Incorrect technique callout where relevant (e.g. bicep: measure at peak, arm parallel to floor, tape snug not tight)

Illustrations are original, minimal line-art style, theme-aware colors (stroke color follows textPrimary token). One illustration asset per measurement field. Design session required to produce the full illustration set before this feature can ship.

### Measurement History

Each measurement log is a dated entry. User can log measurements as frequently as they want. History view shows entries in reverse chronological order. Tap any entry to view full detail or edit.

### Stats Graph Integration

All measurement fields available as data series in the Stats tab graph system -- same as existing graph cards (weight, sleep score, steps, etc.). User can add a "Left Bicep" graph card, "Waist" graph card, etc. Body fat % (Navy method) also available as a graph series. This is already noted in the roadmap as a planned graph option.

---

## Part 3 -- Technical Notes

### Firebase Storage

Progress photos require Firebase Storage -- same solution as food photo migration. Do not build photo storage local-only. Architecture decision: photos keyed by `users/{uid}/progress_photos/{pose}/{timestamp}.jpg`. Thumbnail generation TBD (could generate on-device before upload).

### Timelapse Generation

On-device video generation from a sequence of images. Expo/React Native options include `react-native-ffmpeg` or a custom native module. Needs technical spike during build session to confirm best approach before committing to an implementation. This is the most technically complex part of this feature.

### Overlay Rendering

Overlay burned into exported photo using canvas/image compositing on-device before share. Raw photo stored in Firebase Storage without overlay.

### Performance

Photo grids must use lazy loading / virtualized FlatList. Full-resolution photos only loaded on tap (thumbnails in grid). Timelapse generation should show a progress indicator and run without blocking the UI.

---

## Build Dependencies / Blockers

1. Firebase Storage migration must ship first (food photos + progress photos use same solution)
2. Illustration asset set must be designed before measurements feature can ship (one SVG/PNG per measurement field)
3. Timelapse technical spike needed to confirm video generation library before building

---

## Open Questions (not yet decided)

- Final section name ("Body", "Physique", "Progress", "Transformation" -- TBD)
- Exact timelapse frame rates for Slow/Normal/Fast
- Whether Navy Body Fat % gets a disclaimer modal (likely yes per build standard -- health metric)
- Whether measurements are mode-aware (Mindful mode behavior TBD at build time per mode-awareness standard)
- Whether there is a home screen card for Body Progress (quick-add shortcut or streak) -- revisit when rest of feature is specced
- Thumbnail generation strategy for Firebase Storage (on-device vs cloud function)
- Whether silhouette guide assets need separate versions per sex (male/female outlines)

---

## Gates (Three Gate Rule)

Feature does not ship until:
1. It works correctly -- photos save/load from Firebase, timelapse generates correctly, measurements log and persist, Navy BF% calculates accurately
2. It looks premium -- CPP. Photo grid, timelapse output, and measurement form all feel polished. Silhouette guide and overlays are clean
3. It feels right -- camera flow is smooth, timelapse is satisfying to watch, side-by-side comparison is as polished as Head to Head
