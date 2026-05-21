import Body, { ExtendedBodyPart, Slug } from 'react-native-body-highlighter';
import { View } from 'react-native';
import { useTheme } from '../theme';

interface MuscleMapEntry {
  slug: Slug;
  view: 'front' | 'back' | 'both';
}

const MUSCLE_SLUG_MAP: Record<string, MuscleMapEntry> = {
  chest:         { slug: 'chest',       view: 'front' },
  upper_chest:   { slug: 'chest',       view: 'front' },
  lower_chest:   { slug: 'chest',       view: 'front' },
  front_delt:    { slug: 'deltoids',    view: 'front' },
  side_delt:     { slug: 'deltoids',    view: 'both'  },
  rear_delt:     { slug: 'deltoids',    view: 'back'  },
  triceps:       { slug: 'triceps',     view: 'both'  },
  biceps:        { slug: 'biceps',      view: 'front' },
  forearms:      { slug: 'forearm',     view: 'both'  },
  lats:          { slug: 'upper-back',  view: 'back'  },
  rhomboids:     { slug: 'upper-back',  view: 'back'  },
  traps:         { slug: 'trapezius',   view: 'both'  },
  lower_back:    { slug: 'lower-back',  view: 'back'  },
  abs:           { slug: 'abs',         view: 'front' },
  obliques:      { slug: 'obliques',    view: 'front' },
  hip_flexors:   { slug: 'abs',         view: 'front' },
  quads:         { slug: 'quadriceps',  view: 'front' },
  hamstrings:    { slug: 'hamstring',   view: 'back'  },
  glutes:        { slug: 'gluteal',     view: 'back'  },
  hip_abductors: { slug: 'adductors',   view: 'front' },
  hip_adductors: { slug: 'adductors',   view: 'front' },
  calves:        { slug: 'calves',      view: 'both'  },
};

interface Props {
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  scale?: number;
}

export default function MuscleMap({ primaryMuscles = [], secondaryMuscles = [], scale = 0.65 }: Props) {
  const { theme } = useTheme();

  const PRIMARY_COLOR = '#f97316';
  const SECONDARY_COLOR = 'rgba(249,115,22,0.42)';

  const buildData = (view: 'front' | 'back'): ExtendedBodyPart[] => {
    const seen = new Map<string, number>(); // slug -> best intensity (1 beats 2)
    const allMuscles: Array<{ muscle: string; intensity: number }> = [
      ...primaryMuscles.map(m => ({ muscle: m, intensity: 1 })),
      ...secondaryMuscles.filter(m => !primaryMuscles.includes(m)).map(m => ({ muscle: m, intensity: 2 })),
    ];
    for (const { muscle, intensity } of allMuscles) {
      const entry = MUSCLE_SLUG_MAP[muscle];
      if (!entry) continue;
      if (entry.view !== view && entry.view !== 'both') continue;
      const existing = seen.get(entry.slug);
      if (existing === undefined || intensity < existing) seen.set(entry.slug, intensity);
    }
    return Array.from(seen.entries()).map(([slug, intensity]) => ({ slug: slug as Slug, intensity }));
  };

  const frontData = buildData('front');
  const backData = buildData('back');

  // Body fill: use a mid-tone that reads well on both light and dark theme backgrounds
  const bodyFill = theme.bgProgressTrack ?? '#4a4a5e';

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 8 }}>
      <Body
        data={frontData}
        side="front"
        colors={[PRIMARY_COLOR, SECONDARY_COLOR]}
        defaultFill={bodyFill}
        defaultStroke={bodyFill}
        defaultStrokeWidth={0}
        border="none"
        scale={scale}
      />
      <Body
        data={backData}
        side="back"
        colors={[PRIMARY_COLOR, SECONDARY_COLOR]}
        defaultFill={bodyFill}
        defaultStroke={bodyFill}
        defaultStrokeWidth={0}
        border="none"
        scale={scale}
      />
    </View>
  );
}
