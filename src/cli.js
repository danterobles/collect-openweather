#!/usr/bin/env node

import { loadConfig } from './config.js';
import { fetchCurrentWeather } from './openweather.js';
import {
  getLatestObservation,
  initDatabase,
  insertObservation,
  listObservations,
} from './db.js';

const COMMANDS = new Set(['collect', 'init', 'latest', 'list', 'help']);

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));

  if (command === 'help') {
    printHelp();
    return;
  }

  const config = loadConfig(options.env, {
    ...(options.lat ? { lat: options.lat } : {}),
    ...(options.lon ? { lon: options.lon } : {}),
    ...(options.units ? { units: options.units } : {}),
    ...(options.lang ? { lang: options.lang } : {}),
    ...(options.db ? { DATABASE_PATH: options.db } : {}),
  });

  if (command === 'init') {
    const dbPath = initDatabase(config.databasePath);
    console.log(`Database ready: ${dbPath}`);
    return;
  }

  if (command === 'latest') {
    const latest = getLatestObservation(config.databasePath);
    printResult(latest, options);
    return;
  }

  if (command === 'list') {
    const observations = listObservations(config.databasePath, options.limit);
    printResult(observations, options);
    return;
  }

  const payload = await fetchCurrentWeather(config);

  if (options.dryRun) {
    printResult(payload, options);
    return;
  }

  const observation = insertObservation(config.databasePath, config, payload);
  printResult(observation, options);
}

function parseArgs(args) {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return { command: 'help', options: {} };
  }

  const first = args[0];
  const command = COMMANDS.has(first) ? first : 'collect';
  const rest = COMMANDS.has(first) ? args.slice(1) : args;
  const options = {
    env: '.env',
    json: false,
    dryRun: false,
    limit: 10,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    const next = rest[index + 1];

    if (arg === '--json') {
      options.json = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--env') {
      options.env = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === '--db') {
      options.db = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === '--limit') {
      options.limit = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === '--lat') {
      options.lat = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === '--lon') {
      options.lon = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === '--units') {
      options.units = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === '--lang') {
      options.lang = requireValue(arg, next);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return { command, options };
}

function requireValue(option, value) {
  if (!value || value.startsWith('--')) {
    throw new Error(`Option ${option} requires a value.`);
  }

  return value;
}

function printResult(result, options) {
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (!result) {
    console.log('No observations found.');
    return;
  }

  if (Array.isArray(result)) {
    for (const item of result) {
      printObservationSummary(item);
    }
    return;
  }

  if (result.raw_json !== undefined) {
    printObservationSummary(result);
    return;
  }

  console.log(JSON.stringify(result, null, 2));
}

function printObservationSummary(observation) {
  console.log(
    [
      `#${observation.id}`,
      observation.collected_at_utc,
      observation.city_name ?? 'Unknown location',
      `${observation.temp ?? 'n/a'} C`,
      observation.weather_description ?? observation.weather_main ?? 'n/a',
      `humidity=${observation.humidity ?? 'n/a'}%`,
      `wind=${observation.wind_speed ?? 'n/a'} m/s`,
    ].join(' | '),
  );
}

function printHelp() {
  console.log(`
OpenWeather Extractor

Usage:
  node src/cli.js <command> [options]
  weather-collector <command> [options]

Commands:
  collect          Fetch current weather and save it in SQLite. Default command.
  init             Create the SQLite database and schema.
  latest           Print the latest saved observation.
  list             Print saved observations ordered from newest to oldest.
  help             Show this help message.

Common options:
  --env <path>     Env file path. Default: .env
  --db <path>      SQLite database path override.
  --lat <value>    Latitude override.
  --lon <value>    Longitude override.
  --units <value>  Units override: standard, metric, imperial.
  --lang <value>   Language override, for example es.
  --json           Print JSON output.
  --help, -h       Show this help message.

Command options:
  collect --dry-run       Fetch data without writing to SQLite.
  list --limit <number>   Limit rows printed. Default: 10. Max: 500.

Examples:
  node src/cli.js collect
  node src/cli.js collect --json
  node src/cli.js collect --dry-run --json
  node src/cli.js list --limit 20
  node src/cli.js latest --json
`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
