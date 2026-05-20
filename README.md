# OpenWeather Extractor For analisys

Recolector CLI en Node.js para consultar Current Weather Data de OpenWeather y guardar observaciones en SQLite.

## Requisitos

- Node.js 18 o superior. Se recomienda Node.js 22.
- El binario `sqlite3` disponible en el sistema.
- Una API key activa de OpenWeather.

Verificacion rapida:

```bash
node --version
sqlite3 --version
```

## Instalacion

Desde este directorio:

```bash
cd /Users/danterobles/Desktop/GitHub/clima/extractor
npm install
```

El proyecto no requiere dependencias npm externas actualmente, pero `npm install` deja preparado el paquete para uso local.

Si quieres instalar el comando `weather-collector` como CLI local enlazada:

```bash
npm link
weather-collector help
```

## Configuracion

Los valores se cargan desde `.env`. Puedes partir de `.env.example`:

```bash
cp .env.example .env
```

Ejemplo:

```ini
appid=05xxxxxxxxxxxxxxxx
units=metric
lang=es
id=3995465
lat=25.7239
lon=-100.3804
DATABASE_PATH=./data/weather.sqlite
```

La llamada principal usa:

```text
https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={appid}
```

Tambien se envian `units` y `lang`. El campo `id` se conserva como referencia local, aunque la consulta recomendada por OpenWeather para coordenadas usa `lat` y `lon`.

Variables:

- `appid`: API key de OpenWeather.
- `units`: sistema de unidades. Valores comunes: `metric`, `imperial`, `standard`.
- `lang`: idioma de la descripcion climatica. Para espanol usa `es`.
- `id`: identificador local de referencia.
- `lat`: latitud de consulta.
- `lon`: longitud de consulta.
- `DATABASE_PATH`: ruta del archivo SQLite.

## Uso

Ver ayuda:

```bash
npm run help
node src/cli.js help
node src/cli.js --help
```

Inicializar la base de datos:

```bash
npm run init-db
```

Recolectar una observacion y guardarla:

```bash
npm run collect
```

Consultar la ultima observacion:

```bash
npm run latest
```

Listar observaciones recientes:

```bash
npm run list
```

Tambien puede invocarse directamente:

```bash
node src/cli.js collect
node src/cli.js collect --json
node src/cli.js collect --dry-run --json
node src/cli.js latest --json
node src/cli.js list --limit 20
```

Si ejecutaste `npm link`, puedes usar:

```bash
weather-collector collect
weather-collector latest
weather-collector list --limit 20
```

## Sintaxis CLI

```text
node src/cli.js <command> [options]
weather-collector <command> [options]
```

Comandos:

```text
collect          Consulta OpenWeather y guarda el resultado en SQLite.
init             Crea la base de datos y la tabla si no existen.
latest           Muestra la ultima observacion guardada.
list             Muestra observaciones de la mas reciente a la mas antigua.
help             Muestra la ayuda.
```

Opciones comunes:

```text
--env <path>     Ruta del archivo .env. Default: .env
--db <path>      Ruta alternativa para SQLite.
--lat <value>    Latitud alternativa.
--lon <value>    Longitud alternativa.
--units <value>  Unidades: standard, metric, imperial.
--lang <value>   Idioma de respuesta, por ejemplo es.
--json           Imprime JSON.
--help, -h       Muestra ayuda.
```

Opciones por comando:

```text
collect --dry-run       Consulta la API sin guardar en SQLite.
list --limit <number>   Limita registros impresos. Default: 10. Max: 500.
```

Ejemplos con overrides:

```bash
node src/cli.js collect --lat 25.7239 --lon -100.3804
node src/cli.js collect --db ./data/test.sqlite
node src/cli.js list --limit 50 --json
```

## Automatizacion

Para automatizar cada 15 minutos con cron:

```cron
*/15 * * * * cd /Users/danterobles/Desktop/GitHub/clima/extractor && /usr/local/bin/node src/cli.js collect >> logs/collector.log 2>&1
```

Antes de usar esa entrada, crea el directorio de logs si lo quieres usar:

```bash
mkdir -p logs
```

## Datos almacenados

La tabla `weather_observations` guarda timestamp UTC de recoleccion, timestamp UTC reportado por OpenWeather, ubicacion, condicion climatica, temperatura, sensacion termica, humedad, presion, viento, nubosidad, lluvia/nieve por hora cuando existe, amanecer/atardecer UTC y el JSON original para auditoria.

Campos principales:

- `collected_at_utc`: fecha/hora UTC en que corrio el recolector.
- `api_dt_utc`: fecha/hora UTC reportada por OpenWeather.
- `city_name`, `country`, `lat`, `lon`: ubicacion.
- `weather_main`, `weather_description`, `weather_icon`: condicion climatica.
- `temp`, `feels_like`, `temp_min`, `temp_max`: temperatura.
- `pressure`, `humidity`, `visibility`: condiciones atmosfericas.
- `wind_speed`, `wind_deg`, `wind_gust`: viento.
- `clouds_all`, `rain_1h`, `snow_1h`: nubosidad y precipitacion.
- `sunrise_utc`, `sunset_utc`: amanecer y atardecer en UTC.
- `raw_json`: respuesta completa original de OpenWeather.

## Solucion de problemas

Si aparece `fetch failed`, revisa conectividad a internet y que la API key sea valida.

Si aparece `sqlite3: command not found`, instala SQLite o ajusta el entorno para que el binario `sqlite3` este disponible en `PATH`.

Si OpenWeather responde `401`, la API key no es valida o aun no esta activa.
