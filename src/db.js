import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function initDatabase(databasePath) {
  const dbPath = resolve(process.cwd(), databasePath);
  mkdirSync(dirname(dbPath), { recursive: true });

  runSql(dbPath, `
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS weather_observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collected_at_utc TEXT NOT NULL,
      api_dt_utc TEXT,
      openweather_id INTEGER,
      configured_location_id TEXT,
      city_name TEXT,
      country TEXT,
      lat REAL NOT NULL,
      lon REAL NOT NULL,
      timezone_offset_seconds INTEGER,
      weather_id INTEGER,
      weather_main TEXT,
      weather_description TEXT,
      weather_icon TEXT,
      temp REAL,
      feels_like REAL,
      temp_min REAL,
      temp_max REAL,
      pressure INTEGER,
      humidity INTEGER,
      sea_level INTEGER,
      grnd_level INTEGER,
      visibility INTEGER,
      wind_speed REAL,
      wind_deg INTEGER,
      wind_gust REAL,
      clouds_all INTEGER,
      rain_1h REAL,
      snow_1h REAL,
      sunrise_utc TEXT,
      sunset_utc TEXT,
      raw_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_weather_observations_collected_at
      ON weather_observations (collected_at_utc);

    CREATE INDEX IF NOT EXISTS idx_weather_observations_api_dt
      ON weather_observations (api_dt_utc);
  `);

  return dbPath;
}

export function insertObservation(databasePath, config, payload, collectedAt = new Date()) {
  const dbPath = initDatabase(databasePath);
  const observation = mapObservation(config, payload, collectedAt);

  runSql(dbPath, `
    INSERT INTO weather_observations (
      collected_at_utc,
      api_dt_utc,
      openweather_id,
      configured_location_id,
      city_name,
      country,
      lat,
      lon,
      timezone_offset_seconds,
      weather_id,
      weather_main,
      weather_description,
      weather_icon,
      temp,
      feels_like,
      temp_min,
      temp_max,
      pressure,
      humidity,
      sea_level,
      grnd_level,
      visibility,
      wind_speed,
      wind_deg,
      wind_gust,
      clouds_all,
      rain_1h,
      snow_1h,
      sunrise_utc,
      sunset_utc,
      raw_json
    ) VALUES (
      ${sqlValue(observation.collectedAtUtc)},
      ${sqlValue(observation.apiDtUtc)},
      ${sqlValue(observation.openweatherId)},
      ${sqlValue(observation.configuredLocationId)},
      ${sqlValue(observation.cityName)},
      ${sqlValue(observation.country)},
      ${sqlValue(observation.lat)},
      ${sqlValue(observation.lon)},
      ${sqlValue(observation.timezoneOffsetSeconds)},
      ${sqlValue(observation.weatherId)},
      ${sqlValue(observation.weatherMain)},
      ${sqlValue(observation.weatherDescription)},
      ${sqlValue(observation.weatherIcon)},
      ${sqlValue(observation.temp)},
      ${sqlValue(observation.feelsLike)},
      ${sqlValue(observation.tempMin)},
      ${sqlValue(observation.tempMax)},
      ${sqlValue(observation.pressure)},
      ${sqlValue(observation.humidity)},
      ${sqlValue(observation.seaLevel)},
      ${sqlValue(observation.grndLevel)},
      ${sqlValue(observation.visibility)},
      ${sqlValue(observation.windSpeed)},
      ${sqlValue(observation.windDeg)},
      ${sqlValue(observation.windGust)},
      ${sqlValue(observation.cloudsAll)},
      ${sqlValue(observation.rain1h)},
      ${sqlValue(observation.snow1h)},
      ${sqlValue(observation.sunriseUtc)},
      ${sqlValue(observation.sunsetUtc)},
      ${sqlValue(JSON.stringify(payload))}
    );
  `);

  const [latest] = queryRows(dbPath, `
    SELECT *
    FROM weather_observations
    ORDER BY id DESC
    LIMIT 1;
  `);

  return latest;
}

export function getLatestObservation(databasePath) {
  initDatabase(databasePath);
  const [latest] = queryRows(databasePath, `
    SELECT *
    FROM weather_observations
    ORDER BY id DESC
    LIMIT 1;
  `);

  return latest ?? null;
}

export function listObservations(databasePath, limit = 10) {
  initDatabase(databasePath);
  const normalizedLimit = Math.max(1, Math.min(Number(limit) || 10, 500));

  return queryRows(databasePath, `
    SELECT *
    FROM weather_observations
    ORDER BY id DESC
    LIMIT ${normalizedLimit};
  `);
}

function mapObservation(config, payload, collectedAt) {
  const weather = Array.isArray(payload.weather) ? payload.weather[0] : null;

  return {
    collectedAtUtc: collectedAt.toISOString(),
    apiDtUtc: unixToIso(payload.dt),
    openweatherId: payload.id,
    configuredLocationId: config.locationId,
    cityName: payload.name,
    country: payload.sys?.country,
    lat: payload.coord?.lat ?? config.lat,
    lon: payload.coord?.lon ?? config.lon,
    timezoneOffsetSeconds: payload.timezone,
    weatherId: weather?.id,
    weatherMain: weather?.main,
    weatherDescription: weather?.description,
    weatherIcon: weather?.icon,
    temp: payload.main?.temp,
    feelsLike: payload.main?.feels_like,
    tempMin: payload.main?.temp_min,
    tempMax: payload.main?.temp_max,
    pressure: payload.main?.pressure,
    humidity: payload.main?.humidity,
    seaLevel: payload.main?.sea_level,
    grndLevel: payload.main?.grnd_level,
    visibility: payload.visibility,
    windSpeed: payload.wind?.speed,
    windDeg: payload.wind?.deg,
    windGust: payload.wind?.gust,
    cloudsAll: payload.clouds?.all,
    rain1h: payload.rain?.['1h'],
    snow1h: payload.snow?.['1h'],
    sunriseUtc: unixToIso(payload.sys?.sunrise),
    sunsetUtc: unixToIso(payload.sys?.sunset),
  };
}

function unixToIso(value) {
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  return new Date(Number(value) * 1000).toISOString();
}

function queryRows(databasePath, sql) {
  const dbPath = resolve(process.cwd(), databasePath);
  const output = execFileSync('sqlite3', ['-json', '-cmd', '.timeout 5000', dbPath, sql], {
    encoding: 'utf8',
  }).trim();

  return output ? JSON.parse(output) : [];
}

function runSql(databasePath, sql) {
  const dbPath = resolve(process.cwd(), databasePath);
  execFileSync('sqlite3', ['-cmd', '.timeout 5000', dbPath, sql], {
    encoding: 'utf8',
  });
}

function sqlValue(value) {
  if (value === undefined || value === null || value === '') {
    return 'NULL';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL';
  }

  return `'${String(value).replaceAll("'", "''")}'`;
}
