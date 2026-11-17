// How things look. Add a style for a new block id here; a block with no style
// is drawn with the fallback, so nothing breaks.

export const COLORS = {
  sea: '#2f6f8f', wave: 'rgba(255, 255, 255, 0.10)', shallows: 'rgba(120, 190, 200, 0.35)',
  sand: '#d9c48c', grass: '#6b9b4f', grassAlt: '#679649', tuft: 'rgba(40, 70, 30, 0.22)',
  cleared: 'rgba(110, 84, 50, 0.18)', shadow: 'rgba(20, 30, 18, 0.28)',
  ballast: '#8b8069', sleeper: '#5b4733', rail: '#2b2824',
  engine: '#c9452c', engineDark: '#8f2d1c', iron: '#2b2824', trim: '#e2a52e',
  station: '#7a4a32', stationRoof: '#3b2a22',
  coinText: '#ffd970', textOutline: 'rgba(20, 28, 24, 0.85)', smoke: '240, 238, 228',
};

// painter: which drawing routine to use. The rest are its colours.
export const BLOCK_STYLES = {
  tree:   { painter: 'tree', leaves: [['#3f6b34', '#5c8c44'], ['#3a6638', '#55874a'], ['#476f2f', '#6a963f']], chip: '#5c8c44' },
  rock:   { painter: 'rock', base: '#6f6e68', light: '#9a998f', fleck: null, chip: '#9a998f' },
  copper: { painter: 'rock', base: '#5c4a40', light: '#7a6458', fleck: '#d5793f', chip: '#d5793f' },
  gold:   { painter: 'rock', base: '#6e6347', light: '#8f8160', fleck: '#f6cf4d', chip: '#f6cf4d' },
  fallback: { painter: 'rock', base: '#6a6a72', light: '#8e8e98', fleck: '#ffffff', chip: '#cccccc' },
};

// Cart colours by level, repeating after the last.
export const LEVEL_COLORS = ['#d1a13a', '#7fae4e', '#3f8fc4', '#9a68d4', '#e0603f', '#2fb3a3', '#d65a96', '#f2d14a'];
export const levelColor = level => LEVEL_COLORS[(level - 1) % LEVEL_COLORS.length];

export const FONT = '"Barlow Condensed", "Arial Narrow", sans-serif';
