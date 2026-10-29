export const queryKeys = {
  home: ['home'] as const,
  stall: (id: string) => ['stall', id] as const,
};
