import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const REQUIRED_KEYS = ['appid', 'units', 'lang', 'lat', 'lon'];

export function loadConfig(envPath = '.env', overrides = {}) {
  const fileEnv = parseEnvFile(resolve(process.cwd(), envPath));
  const env = { ...fileEnv, ...process.env, ...overrides };

  for (const key of REQUIRED_KEYS) {
    if (!env[key]) {
      throw new Error(`Missing required configuration value: ${key}`);
    }
  }

  const lat = Number(env.lat);
  const lon = Number(env.lon);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error('Invalid lat value. Expected a number between -90 and 90.');
  }

  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new Error('Invalid lon value. Expected a number between -180 and 180.');
  }

  return {
    appid: env.appid,
    units: env.units,
    lang: env.lang,
    locationId: env.id ?? null,
    lat,
    lon,
    databasePath: env.DATABASE_PATH ?? './data/weather.sqlite',
  };
}

function parseEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }

  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  const values = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    values[key] = stripQuotes(rawValue);
  }

  return values;
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
