export const apiBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  return url.replace(/\/$/, '');
};
