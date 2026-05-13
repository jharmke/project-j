export interface TooltipDefinition {
  key: string;
  title: string;
  body: string;
  example?: {
    label: string;
    lines: { desc: string; value: string }[];
    result: { desc: string; value: string };
  };
}

export const TOOLTIP_REGISTRY: TooltipDefinition[] = [
  {
    key: 'sleep_score',
    title: 'Sleep Score',
    body: 'Your sleep score is a 0–100 rating calculated from three factors: how long you slept, how much Deep sleep you got, and how much REM sleep you got.\n\nDuration accounts for 40 points — scored against your sleep goal. Deep sleep accounts for 30 points, peaking at around 20% of total sleep. REM accounts for 30 points, peaking at around 22% of total sleep.\n\nIf Apple Health can\'t provide stage data, your score is calculated using your feel rating (1–5) instead of stages.',
    example: {
      label: 'Example',
      lines: [
        { desc: 'Duration  (7.5 hrs, goal 8 hrs)', value: '37 / 40 pts' },
        { desc: 'Deep sleep  (19% of total)',       value: '28 / 30 pts' },
        { desc: 'REM sleep  (21% of total)',        value: '28 / 30 pts' },
      ],
      result: { desc: 'Final Score', value: '93 — Well Rested' },
    },
  },
];