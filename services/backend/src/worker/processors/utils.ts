export const wait = async (durationMs: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });

export const getString = (
  payload: Record<string, unknown>,
  key: string,
  fallback: string,
) => {
  const value = payload[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
};

export const getNumber = (
  payload: Record<string, unknown>,
  key: string,
  fallback: number,
) => {
  const value = payload[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};
