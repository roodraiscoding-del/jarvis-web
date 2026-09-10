export interface WeatherInfo {
  city: string;
  tempC: number;
  tempF: number;
  condition: string;
  humidity: number;
  windSpeed: string;
  isLiveLocation?: boolean;
  latitude?: number;
  longitude?: number;
  updatedAt: string;
}

export function decodeWmoWeatherCode(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code === 1) return 'Mainly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Foggy Atmosphere';
  if (code >= 51 && code <= 55) return 'Light Drizzle';
  if (code >= 56 && code <= 57) return 'Freezing Drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code >= 66 && code <= 67) return 'Freezing Rain';
  if (code >= 71 && code <= 77) return 'Snow Flurries';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 85 && code <= 86) return 'Snow Showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm Activity';
  return 'Clear';
}

/**
 * Fetch live weather from Open-Meteo for given coordinates
 */
export async function fetchWeatherByCoordinates(
  lat: number,
  lon: number,
  customCityName?: string
): Promise<WeatherInfo> {
  let cityName = customCityName;

  // If no city name provided, attempt reverse geocoding
  if (!cityName) {
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        {
          headers: {
            'User-Agent': 'JarvisAI-Assistant/2.0 (web-agent)'
          },
          signal: AbortSignal.timeout(4000)
        }
      );
      if (geoRes.ok) {
        const geoData = (await geoRes.json()) as any;
        const addr = geoData.address || {};
        const localName = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || addr.county;
        const region = addr.state || addr.country_code?.toUpperCase() || addr.country;
        if (localName) {
          cityName = region ? `${localName}, ${region}` : localName;
        }
      }
    } catch {
      // Ignore reverse-geocode failure, fallback to formatted coords
    }

    if (!cityName) {
      cityName = `Lat ${lat.toFixed(2)}°, Lon ${lon.toFixed(2)}°`;
    }
  }

  // Fetch real-time weather from Open-Meteo (zero API key needed)
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=kmh`;
  
  const weatherRes = await fetch(weatherUrl, {
    signal: AbortSignal.timeout(5000)
  });

  if (!weatherRes.ok) {
    throw new Error(`Open-Meteo weather query failed with HTTP ${weatherRes.status}`);
  }

  const data = (await weatherRes.json()) as any;
  const current = data.current || {};
  const tempC = Math.round(current.temperature_2m ?? 20);
  const tempF = Math.round((tempC * 9) / 5 + 32);
  const condition = decodeWmoWeatherCode(current.weather_code ?? 0);
  const humidity = Math.round(current.relative_humidity_2m ?? 50);
  const windKmh = current.wind_speed_10m ?? 12;
  const windMph = Math.round(windKmh * 0.621371);

  return {
    city: cityName,
    tempC,
    tempF,
    condition,
    humidity,
    windSpeed: `${windMph} mph`,
    isLiveLocation: true,
    latitude: lat,
    longitude: lon,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Fetch live weather by city name using Open-Meteo Geocoding
 */
export async function fetchWeatherByCityName(cityName: string): Promise<WeatherInfo> {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en`;
  const geoRes = await fetch(geoUrl, {
    signal: AbortSignal.timeout(5000)
  });

  if (!geoRes.ok) {
    throw new Error(`Geocoding search failed for city: ${cityName}`);
  }

  const geoData = (await geoRes.json()) as any;
  if (!geoData.results || geoData.results.length === 0) {
    throw new Error(`Location not found: "${cityName}"`);
  }

  const location = geoData.results[0];
  const formattedCity = location.admin1
    ? `${location.name}, ${location.admin1}`
    : `${location.name}, ${location.country_code || location.country}`;

  return await fetchWeatherByCoordinates(location.latitude, location.longitude, formattedCity);
}
