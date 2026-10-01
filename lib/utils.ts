/**
 * Utility functions for class names and formatting
 */

export function cn(...inputs: (string | undefined | null | false | Record<string, boolean> | (string | undefined | null | false)[])[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === 'string') {
      classes.push(input);
    } else if (Array.isArray(input)) {
      const inner = cn(...input);
      if (inner) classes.push(inner);
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }

  return classes.join(' ').replace(/\s+/g, ' ').trim();
}
