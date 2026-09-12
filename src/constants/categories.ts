import type { CategoryType, CategoryDefinition } from '../types';

export const CATEGORIES: Record<CategoryType, CategoryDefinition> = {
  foundation: {
    id: 'foundation',
    label: 'Foundation',
    badgeDefault: 'Paradigm Shift',
    accentHue: '#E4E4E7',
    iconType: 'foundation',
    neutralTag: 'Shift',
  },
  psychology: {
    id: 'psychology',
    label: 'Psychology',
    badgeDefault: 'Value Delivery',
    accentHue: '#D4D4D8',
    iconType: 'psychology',
    neutralTag: 'Value',
  },
  hardware: {
    id: 'hardware',
    label: 'Hardware Engine',
    badgeDefault: 'Retention Tool',
    accentHue: '#A1A1AA',
    iconType: 'hardware',
    neutralTag: 'Signal',
  },
  retention: {
    id: 'retention',
    label: 'Retention Mechanism',
    badgeDefault: 'Habit Loop',
    accentHue: '#9F1239', // Refined deep burgundy / wine accent
    iconType: 'retention',
    neutralTag: 'Habit',
  },
  event: {
    id: 'event',
    label: 'Event Architecture',
    badgeDefault: 'Execution',
    accentHue: '#CBD5E1',
    iconType: 'event',
    neutralTag: 'Scale',
  },
  lifecycle: {
    id: 'lifecycle',
    label: 'Lifecycle & Churn',
    badgeDefault: 'Relevance Engine',
    accentHue: '#881337', // Deep velvet wine
    iconType: 'lifecycle',
    neutralTag: 'Cycle',
  },
  outcome: {
    id: 'outcome',
    label: 'Strategic Outcome',
    badgeDefault: 'End Result',
    accentHue: '#FAFAFA',
    iconType: 'outcome',
    neutralTag: 'Apex',
  },
  custom: {
    id: 'custom',
    label: 'Custom Strategy',
    badgeDefault: 'Custom Block',
    accentHue: '#71717A',
    iconType: 'custom',
    neutralTag: 'Custom',
  },
};
