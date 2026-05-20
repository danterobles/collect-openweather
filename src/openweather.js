const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

export async function fetchCurrentWeather(config) {
  const url = new URL(BASE_URL);
  url.searchParams.set('lat', String(config.lat));
  url.searchParams.set('lon', String(config.lon));
  url.searchParams.set('appid', config.appid);
  url.searchParams.set('units', config.units);
  url.searchParams.set('lang', config.lang);

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'openweather-extractor/1.0',
    },
  });

  const body = await response.text();
  let payload;

  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error(`OpenWeather returned non-JSON response with status ${response.status}`);
  }

  if (!response.ok) {
    const message = payload?.message ? `: ${payload.message}` : '';
    throw new Error(`OpenWeather request failed with status ${response.status}${message}`);
  }

  return payload;
}
