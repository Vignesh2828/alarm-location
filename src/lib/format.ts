export function formatRadius(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${km % 1 === 0 ? km.toFixed(0) : km.toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

export function formatTriggerLabel(trigger: 'enter' | 'exit' | 'both'): string {
  switch (trigger) {
    case 'enter':
      return 'Rings on arrival';
    case 'exit':
      return 'Rings on departure';
    case 'both':
      return 'Rings on arrival & departure';
  }
}

export function formatTriggerShort(trigger: 'enter' | 'exit' | 'both'): string {
  switch (trigger) {
    case 'enter':
      return 'Arrival';
    case 'exit':
      return 'Departure';
    case 'both':
      return 'Both ways';
  }
}
