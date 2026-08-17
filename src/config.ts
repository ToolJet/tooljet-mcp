export interface Config { apiUrl: string; appUrl: string; email: string; password: string; }

export function loadConfig(): Config {
  const email = process.env.TOOLJET_EMAIL;
  const password = process.env.TOOLJET_PASSWORD;
  if (!email) throw new Error('TOOLJET_EMAIL is required');
  if (!password) throw new Error('TOOLJET_PASSWORD is required');
  return {
    apiUrl: process.env.TOOLJET_URL ?? 'http://localhost:3000',
    appUrl: process.env.TOOLJET_APP_URL ?? 'http://localhost:8082',
    email,
    password,
  };
}
