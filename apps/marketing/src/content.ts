export const productPillars = [
  {
    description:
      'Log common and branded foods quickly, scan a barcode, and see the nutrients that actually matter.',
    eyebrow: 'Nutrition',
    id: 'nutrition',
    metric: '2.7M+',
    metricLabel: 'searchable foods',
    title: 'Food logging without the friction.',
  },
  {
    description:
      'Build reusable sessions, record every set, and keep the active workout available wherever you go.',
    eyebrow: 'Training',
    id: 'training',
    metric: '1 tap',
    metricLabel: 'to resume a workout',
    title: 'A workout log that stays out of your way.',
  },
  {
    description:
      'Connect intake, training consistency, and weight trends so a single day never tells the whole story.',
    eyebrow: 'Progress',
    id: 'progress',
    metric: '3 views',
    metricLabel: 'one daily picture',
    title: 'See the trend, not just the number.',
  },
] as const

export const principles = [
  [
    'Start with your goal',
    'Set a realistic calorie ceiling from your body, activity, and desired pace.',
  ],
  ['Move through the day', 'Food and workouts live in one calm timeline built for quick capture.'],
  ['Adjust with evidence', 'Use weekly trends to make smaller, more confident decisions.'],
] as const

export const dailyMeals = [
  { calories: 334, macros: '16 P · 29 F · 1 C', name: 'Eggs, grade A, large', time: '7:20 AM' },
  { calories: 282, macros: '31 P · 8 F · 22 C', name: 'Chicken grain bowl', time: '12:35 PM' },
] as const
