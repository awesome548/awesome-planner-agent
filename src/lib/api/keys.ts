export const queryKeys = {
  calendars: ["calendars"] as const,
  usage: {
    all: ["usage"] as const,
    records: () => ["usage", "records"] as const,
  },
  routine: {
    all: ["routine"] as const,
    actions: () => ["routine", "actions"] as const,
    records: (date: string) => ["routine", "records", date] as const,
    completions: () => ["routine", "completions"] as const,
  },
} as const;
