// stores/freeWeatherStore.ts
export interface WeatherData {
  temperature: number;
  feelsLike: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  precipitation: number;
  cloudCover: number;
  visibility: number;
  sunrise: string;
  sunset: string;
  uvIndex: number;
  location: {
    name: string;
    lat: number;
    lon: number;
    timezone: string;
    city?: string;
    province?: string;
    region?: string;
    country: string;
  };
  timestamp: number;
  source: "openmeteo" | "weathergov" | "mock" | "geolocation";
}

export interface ForecastData {
  date: string;
  maxTemp: number;
  minTemp: number;
  condition: string;
  precipitation: number;
  precipitationProbability: number;
  sunrise: string;
  sunset: string;
  uvIndex: number;
  windSpeed: number;
  humidity: number;
}

export interface LocationData {
  name: string;
  lat: number;
  lon: number;
  city?: string;
  province?: string;
  region?: string;
  country: string;
  timezone: string;
  isCurrentLocation: boolean;
  lastUsed: number;
}

export class FreeWeatherStore {
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour for weather
  private readonly FORECAST_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours for forecast
  private readonly LOCATION_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days for location
  private readonly APP_NAME = "KABISILYA";

  // Track in-memory cache to prevent duplicate requests
  private memoryCache: Map<string, { data: any; timestamp: number }> =
    new Map();

  // Enhanced cache methods with memory fallback
  private cacheWeatherData(locationKey: string, data: WeatherData): void {
    const cache = {
      data,
      timestamp: Date.now(),
    };

    // Store in localStorage
    localStorage.setItem(
      `${this.APP_NAME}_weather_${locationKey}`,
      JSON.stringify(cache),
    );

    // Store in memory cache
    this.memoryCache.set(`weather_${locationKey}`, cache);
  }

  private getCachedWeather(locationKey: string): WeatherData | null {
    // Check memory cache first (fastest)
    const memoryKey = `weather_${locationKey}`;
    const memoryCached = this.memoryCache.get(memoryKey);
    if (
      memoryCached &&
      Date.now() - memoryCached.timestamp < this.CACHE_DURATION
    ) {
      return memoryCached.data;
    }

    // Check localStorage
    const cached = localStorage.getItem(
      `${this.APP_NAME}_weather_${locationKey}`,
    );
    if (!cached) return null;

    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < this.CACHE_DURATION) {
        // Update memory cache
        this.memoryCache.set(memoryKey, { data, timestamp });
        return data;
      } else {
        // Clear expired cache
        localStorage.removeItem(`${this.APP_NAME}_weather_${locationKey}`);
        this.memoryCache.delete(memoryKey);
      }
    } catch (error) {
      console.error("Error reading weather cache:", error);
      this.clearCorruptedCache(locationKey, "weather");
    }
    return null;
  }

  // Clear corrupted cache
  private clearCorruptedCache(
    key: string,
    type: "weather" | "forecast" | "location",
  ): void {
    localStorage.removeItem(`${this.APP_NAME}_${type}_${key}`);
    this.memoryCache.delete(`${type}_${key}`);
  }

  // Get weather with better caching strategy
  async getWeatherForCoordinates(
    lat: number,
    lon: number,
    forceRefresh: boolean = false,
  ): Promise<WeatherData> {
    const locationKey = this.getLocationKey(lat, lon);

    // Check cache first (unless forced refresh)
    if (!forceRefresh) {
      const cached = this.getCachedWeather(locationKey);
      if (cached) {
        console.log("Using cached weather data");
        return cached;
      }
    }

    // Try to get location info from cache
    let locationInfo;
    const locationCacheKey = `location_${locationKey}`;
    const cachedLocation = localStorage.getItem(
      `${this.APP_NAME}_location_${locationKey}`,
    );

    if (cachedLocation) {
      try {
        const { data, timestamp } = JSON.parse(cachedLocation);
        if (Date.now() - timestamp < this.LOCATION_CACHE_DURATION) {
          locationInfo = data;
        }
      } catch (error) {
        console.error("Error reading location cache:", error);
      }
    }

    // If no cached location info, fetch it
    if (!locationInfo) {
      try {
        locationInfo = await this.reverseGeocode(lat, lon);
        // Cache location info
        localStorage.setItem(
          `${this.APP_NAME}_location_${locationKey}`,
          JSON.stringify({
            data: locationInfo,
            timestamp: Date.now(),
          }),
        );
      } catch {
        locationInfo = {
          name: `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
          country: "Philippines",
        };
      }
    }

    // Try to fetch from API
    const weatherData = await this.fetchFromOpenMeteo(lat, lon);

    if (weatherData) {
      const enhancedData: WeatherData = {
        ...weatherData,
        location: {
          name: locationInfo.name,
          lat: lat,
          lon: lon,
          city: locationInfo.city,
          province: locationInfo.province,
          region: locationInfo.region,
          country: locationInfo.country,
          timezone: "Asia/Manila",
        },
        source: "openmeteo" as const,
      };

      this.cacheWeatherData(locationKey, enhancedData);

      // Save this location
      this.saveLocation({
        name: locationInfo.name,
        lat,
        lon,
        city: locationInfo.city,
        province: locationInfo.province,
        region: locationInfo.region,
        country: locationInfo.country,
        timezone: "Asia/Manila",
        isCurrentLocation: false,
        lastUsed: Date.now(),
      });

      return enhancedData;
    }

    // Fallback to mock data (should rarely happen)
    console.warn("Using mock weather data for coordinates");
    const mockData = this.getMockWeather(lat, lon);
    const enhancedMockData: WeatherData = {
      ...mockData,
      location: {
        name: locationInfo.name,
        lat: lat,
        lon: lon,
        city: locationInfo.city,
        province: locationInfo.province,
        region: locationInfo.region,
        country: locationInfo.country,
        timezone: "Asia/Manila",
      },
      source: "mock" as const,
    };

    this.cacheWeatherData(locationKey, enhancedMockData);
    return enhancedMockData;
  }

  // Get current location with better error handling
  async getCurrentLocation(useCache: boolean = true): Promise<LocationData> {
    // Check for recent location in cache
    if (useCache) {
      const recentLocation = this.getMostRecentLocation();
      if (
        recentLocation &&
        Date.now() - recentLocation.lastUsed < 5 * 60 * 1000
      ) {
        // 5 minutes
        return { ...recentLocation, isCurrentLocation: true };
      }
    }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        // Use most recent saved location
        const savedLocations = this.getSavedLocations();
        const recentLocation = savedLocations[0] || this.defaultLocations[0];
        resolve({ ...recentLocation, isCurrentLocation: false });
        return;
      }

      const options = {
        enableHighAccuracy: false, // Set to false for faster response
        timeout: 5000, // 5 seconds timeout
        maximumAge: 5 * 60 * 1000, // 5 minutes cache for geolocation
      };

      const onSuccess = async (position: GeolocationPosition) => {
        const { latitude, longitude } = position.coords;

        // Try to get location info from cache first
        const locationKey = this.getLocationKey(latitude, longitude);
        const cachedLocation = localStorage.getItem(
          `${this.APP_NAME}_reverse_${locationKey}`,
        );

        let locationInfo;
        if (cachedLocation) {
          try {
            const { data, timestamp } = JSON.parse(cachedLocation);
            if (Date.now() - timestamp < this.LOCATION_CACHE_DURATION) {
              locationInfo = data;
            }
          } catch (error) {
            console.error("Error reading cached location:", error);
          }
        }

        // If no cached info, fetch it
        if (!locationInfo) {
          try {
            locationInfo = await this.reverseGeocode(latitude, longitude);
          } catch {
            locationInfo = {
              name: `Location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
              country: "Philippines",
            };
          }
        }

        const locationData: LocationData = {
          name: locationInfo.name,
          lat: latitude,
          lon: longitude,
          city: locationInfo.city,
          province: locationInfo.province,
          region: locationInfo.region,
          country: locationInfo.country,
          timezone: "Asia/Manila",
          isCurrentLocation: true,
          lastUsed: Date.now(),
        };

        this.saveLocation(locationData);
        resolve(locationData);
      };

      const onError = (error: GeolocationPositionError) => {
        console.warn(`Geolocation error (${error.code}): ${error.message}`);

        // Use most recent location as fallback
        const savedLocations = this.getSavedLocations();
        const recentLocation = savedLocations[0] || this.defaultLocations[0];
        resolve({ ...recentLocation, isCurrentLocation: false });
      };

      navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
    });
  }

  // Get most recent location from cache
  private getMostRecentLocation(): LocationData | null {
    const locations = this.getSavedLocations();
    if (locations.length > 0) {
      return locations.reduce((latest, current) =>
        current.lastUsed > latest.lastUsed ? current : latest,
      );
    }
    return null;
  }

  // Simple location key (less precise for better caching)
  private getLocationKey(lat: number, lon: number): string {
    // Use 1 decimal place (≈11km precision) for better caching
    return `${lat.toFixed(1)}_${lon.toFixed(1)}`;
  }

  // Pre-cache default locations
  async preCacheDefaultLocations(): Promise<void> {
    for (const location of this.defaultLocations) {
      const locationKey = this.getLocationKey(location.lat, location.lon);

      // Check if we already have cached weather
      const cached = this.getCachedWeather(locationKey);
      if (!cached) {
        // Pre-fetch weather in background
        setTimeout(async () => {
          try {
            await this.getWeatherForCoordinates(
              location.lat,
              location.lon,
              false,
            );
          } catch (error) {
            // Silent fail for pre-caching
          }
        }, 1000);
      }
    }
  }

  // Default Philippine locations (fallback)
  private defaultLocations: LocationData[] = [
    {
      name: "San Jose, Nueva Ecija",
      lat: 15.7934,
      lon: 120.992,
      city: "San Jose",
      province: "Nueva Ecija",
      region: "Central Luzon",
      country: "Philippines",
      timezone: "Asia/Manila",
      isCurrentLocation: false,
      lastUsed: Date.now(),
    },
    {
      name: "Cabanatuan, Nueva Ecija",
      lat: 15.4862,
      lon: 120.9676,
      city: "Cabanatuan",
      province: "Nueva Ecija",
      region: "Central Luzon",
      country: "Philippines",
      timezone: "Asia/Manila",
      isCurrentLocation: false,
      lastUsed: Date.now(),
    },
    {
      name: "Science City of Muñoz",
      lat: 15.7161,
      lon: 120.9031,
      city: "Muñoz",
      province: "Nueva Ecija",
      region: "Central Luzon",
      country: "Philippines",
      timezone: "Asia/Manila",
      isCurrentLocation: false,
      lastUsed: Date.now(),
    },
  ];

  // Multiple API endpoints for fallback
  private apis = {
    openmeteo: {
      name: "Open-Meteo",
      url: "https://api.open-meteo.com/v1",
      noKey: true,
    },
    openweather: {
      name: "OpenWeatherMap",
      url: "https://api.openweathermap.org/data/2.5",
      requiresKey: true,
    },
  };

  // Cache methods

  private cacheForecast(locationKey: string, forecast: ForecastData[]): void {
    const cache = {
      forecast,
      timestamp: Date.now(),
    };
    localStorage.setItem(
      `${this.APP_NAME}_forecast_${locationKey}`,
      JSON.stringify(cache),
    );
  }

  private getCachedForecast(locationKey: string): ForecastData[] | null {
    const cached = localStorage.getItem(
      `${this.APP_NAME}_forecast_${locationKey}`,
    );
    if (!cached) return null;

    try {
      const { forecast, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < this.FORECAST_CACHE_DURATION) {
        return forecast;
      }
    } catch (error) {
      console.error("Error reading forecast cache:", error);
    }
    return null;
  }

  // Location management
  private saveLocation(location: LocationData): void {
    const locations = this.getSavedLocations();

    // Check if location already exists
    const existingIndex = locations.findIndex(
      (loc) =>
        this.calculateDistance(loc.lat, loc.lon, location.lat, location.lon) <
        1, // Within 1km
    );

    if (existingIndex >= 0) {
      locations[existingIndex] = {
        ...locations[existingIndex],
        ...location,
        lastUsed: Date.now(),
      };
    } else {
      locations.push({ ...location, lastUsed: Date.now() });
    }

    // Keep only last 10 locations
    const sortedLocations = locations
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, 10);

    localStorage.setItem(
      `${this.APP_NAME}_locations`,
      JSON.stringify(sortedLocations),
    );
  }

  private getSavedLocations(): LocationData[] {
    try {
      const saved = localStorage.getItem(`${this.APP_NAME}_locations`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Error reading saved locations:", error);
    }
    return [...this.defaultLocations];
  }

  // Reverse geocoding using Nominatim (free)
  private async reverseGeocode(
    lat: number,
    lon: number,
  ): Promise<{
    name: string;
    city?: string;
    province?: string;
    region?: string;
    country: string;
  }> {
    try {
      // Check cache first
      const cacheKey = `reverse_geocode_${lat.toFixed(4)}_${lon.toFixed(4)}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < this.LOCATION_CACHE_DURATION) {
          return data;
        }
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
      );

      if (!response.ok) throw new Error("Reverse geocoding failed");

      const data = await response.json();

      const address = data.address;
      let name = "";
      let city = "";
      let province = "";
      let region = "";
      let country = address.country || "Philippines";

      // Build location name based on available address components
      if (address.city) {
        name = address.city;
        city = address.city;
      } else if (address.town) {
        name = address.town;
        city = address.town;
      } else if (address.village) {
        name = address.village;
        city = address.village;
      } else if (address.municipality) {
        name = address.municipality;
        city = address.municipality;
      }

      if (address.state) {
        province = address.state;
        if (name) {
          name += `, ${address.state}`;
        } else {
          name = address.state;
        }
      }

      if (address.region) {
        region = address.region;
      }

      if (address.country && name) {
        name += `, ${address.country}`;
      } else if (address.country) {
        name = address.country;
      }

      if (!name) {
        name =
          data.display_name?.split(",")[0] ||
          `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
      }

      const result = { name, city, province, region, country };

      // Cache the result
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: result,
          timestamp: Date.now(),
        }),
      );

      return result;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return {
        name: `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
        country: "Philippines",
      };
    }
  }

  // Get weather for current location
  async getWeatherForCurrentLocation(): Promise<WeatherData> {
    const location = await this.getCurrentLocation();
    const locationKey = this.getLocationKey(location.lat, location.lon);

    // Check cache first
    const cached = this.getCachedWeather(locationKey);
    if (cached) {
      return cached;
    }

    // Fetch from Open-Meteo
    const weatherData = await this.fetchFromOpenMeteo(
      location.lat,
      location.lon,
    );
    if (weatherData) {
      // Enhance with location info
      const enhancedData: WeatherData = {
        ...weatherData,
        location: {
          name: location.name,
          lat: location.lat,
          lon: location.lon,
          city: location.city,
          province: location.province,
          region: location.region,
          country: location.country,
          timezone: location.timezone,
        },
        source: "geolocation" as const,
      };

      this.cacheWeatherData(locationKey, enhancedData);
      return enhancedData;
    }

    // Fallback to mock data
    console.warn("Using mock weather data for current location");
    const mockData = this.getMockWeather(location.lat, location.lon);
    const enhancedMockData: WeatherData = {
      ...mockData,
      location: {
        name: location.name,
        lat: location.lat,
        lon: location.lon,
        city: location.city,
        province: location.province,
        region: location.region,
        country: location.country,
        timezone: location.timezone,
      },
      source: "mock" as const,
    };

    this.cacheWeatherData(locationKey, enhancedMockData);
    return enhancedMockData;
  }

  // Get weather for saved location
  async getWeatherForSavedLocation(index: number = 0): Promise<WeatherData> {
    const savedLocations = this.getSavedLocations();
    if (index < 0 || index >= savedLocations.length) {
      index = 0;
    }

    const location = savedLocations[index];
    return this.getWeatherForCoordinates(location.lat, location.lon);
  }

  // Get weather from Open-Meteo (primary)
  private async fetchFromOpenMeteo(
    lat: number,
    lon: number,
  ): Promise<WeatherData | null> {
    try {
      const [currentRes, forecastRes, airQualityRes] = await Promise.all([
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,precipitation,windspeed_10m,cloudcover&timezone=auto`,
        ),
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=sunrise,sunset,uv_index_max,precipitation_sum&timezone=auto`,
        ),
        fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`,
        ).catch(() => null), // Optional air quality
      ]);

      const currentData = await currentRes.json();
      const forecastData = await forecastRes.json();

      if (!currentData.current_weather) return null;

      // Calculate feels-like temperature (simplified)
      const temp = currentData.current_weather.temperature;
      const humidity = currentData.hourly?.relativehumidity_2m?.[0] || 65;
      const windSpeed = currentData.current_weather.windspeed;
      const feelsLike = this.calculateFeelsLike(temp, humidity, windSpeed);

      return {
        temperature: Math.round(temp),
        feelsLike: Math.round(feelsLike),
        condition: this.mapWMOcode(currentData.current_weather.weathercode),
        description: this.getConditionDescription(
          currentData.current_weather.weathercode,
        ),
        humidity: currentData.hourly?.relativehumidity_2m?.[0] || 65,
        windSpeed: Math.round(currentData.current_weather.windspeed * 3.6), // Convert m/s to km/h
        windDirection: currentData.current_weather.winddirection,
        pressure: 1013, // Default
        precipitation: currentData.hourly?.precipitation?.[0] || 0,
        cloudCover:
          currentData.hourly?.cloudcover?.[0] ||
          this.estimateCloudCover(currentData.current_weather.weathercode),
        visibility: 10, // Default in km
        sunrise:
          forecastData.daily?.sunrise?.[0]?.split("T")[1]?.substring(0, 5) ||
          "06:00",
        sunset:
          forecastData.daily?.sunset?.[0]?.split("T")[1]?.substring(0, 5) ||
          "18:00",
        uvIndex: forecastData.daily?.uv_index_max?.[0] || 5,
        location: {
          name: "", // Will be filled later
          lat: lat,
          lon: lon,
          timezone: currentData.timezone || "Asia/Manila",
          country: "Philippines",
        },
        timestamp: Date.now(),
        source: "openmeteo",
      };
    } catch (error) {
      console.error("Open-Meteo API error:", error);
      return null;
    }
  }

  // Get forecast for current location
  async getForecastForCurrentLocation(
    days: number = 7,
  ): Promise<ForecastData[]> {
    const location = await this.getCurrentLocation();
    return this.getForecastForCoordinates(location.lat, location.lon, days);
  }

  // Get forecast for specific coordinates
  async getForecastForCoordinates(
    lat: number,
    lon: number,
    days: number = 7,
  ): Promise<ForecastData[]> {
    const locationKey = this.getLocationKey(lat, lon);

    // Check cache first
    const cached = this.getCachedForecast(locationKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset,uv_index_max,windspeed_10m_max,relativehumidity_2m_max&timezone=auto&forecast_days=${days}`,
      );

      const data = await response.json();

      const forecast = data.daily.time.map((date: string, index: number) => ({
        date,
        maxTemp: Math.round(data.daily.temperature_2m_max[index]),
        minTemp: Math.round(data.daily.temperature_2m_min[index]),
        condition: this.mapWMOcode(data.daily.weathercode[index]),
        precipitation: data.daily.precipitation_sum[index],
        precipitationProbability:
          data.daily.precipitation_probability_max[index],
        sunrise:
          data.daily.sunrise[index]?.split("T")[1]?.substring(0, 5) || "06:00",
        sunset:
          data.daily.sunset[index]?.split("T")[1]?.substring(0, 5) || "18:00",
        uvIndex: data.daily.uv_index_max[index],
        windSpeed: data.daily.windspeed_10m_max[index] || 0,
        humidity: data.daily.relativehumidity_2m_max[index] || 65,
      }));

      this.cacheForecast(locationKey, forecast);
      return forecast;
    } catch (error) {
      console.error("Error fetching forecast:", error);
      return this.getMockForecast(days);
    }
  }

  // Get saved locations
  getSavedLocationsList(): LocationData[] {
    return this.getSavedLocations();
  }

  // Add new location
  async addNewLocation(
    lat: number,
    lon: number,
    name?: string,
  ): Promise<LocationData> {
    try {
      const locationInfo = await this.reverseGeocode(lat, lon);

      const locationData: LocationData = {
        name: name || locationInfo.name,
        lat,
        lon,
        city: locationInfo.city,
        province: locationInfo.province,
        region: locationInfo.region,
        country: locationInfo.country,
        timezone: "Asia/Manila",
        isCurrentLocation: false,
        lastUsed: Date.now(),
      };

      this.saveLocation(locationData);
      return locationData;
    } catch (error) {
      console.error("Error adding new location:", error);
      throw error;
    }
  }

  // Remove location
  removeLocation(index: number): void {
    const locations = this.getSavedLocations();
    if (index >= 0 && index < locations.length) {
      // Don't remove default locations
      if (
        !this.defaultLocations.some(
          (loc) =>
            this.calculateDistance(
              loc.lat,
              loc.lon,
              locations[index].lat,
              locations[index].lon,
            ) < 1,
        )
      ) {
        locations.splice(index, 1);
        localStorage.setItem(
          `${this.APP_NAME}_locations`,
          JSON.stringify(locations),
        );
      }
    }
  }

  // Helper methods
  private calculateFeelsLike(
    temp: number,
    humidity: number,
    windSpeed: number,
  ): number {
    // Simplified heat index calculation
    if (temp >= 27) {
      // Heat index approximation
      const c1 = -8.78469475556;
      const c2 = 1.61139411;
      const c3 = 2.33854883889;
      const c4 = -0.14611605;
      const c5 = -0.012308094;
      const c6 = -0.0164248277778;
      const c7 = 0.002211732;
      const c8 = 0.00072546;
      const c9 = -0.000003582;

      const T = temp;
      const R = humidity;

      const feelsLike =
        c1 +
        c2 * T +
        c3 * R +
        c4 * T * R +
        c5 * T * T +
        c6 * R * R +
        c7 * T * T * R +
        c8 * T * R * R +
        c9 * T * T * R * R;

      return Math.max(temp, feelsLike);
    } else if (windSpeed > 1.34 && temp <= 10) {
      // Wind chill approximation
      const windChill =
        13.12 +
        0.6215 * temp -
        11.37 * Math.pow(windSpeed, 0.16) +
        0.3965 * temp * Math.pow(windSpeed, 0.16);
      return Math.min(temp, windChill);
    }
    return temp;
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Rest of helper methods remain the same...
  private mapWMOcode(code: number): string {
    const weatherCodes: { [key: number]: string } = {
      0: "Clear",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Fog",
      51: "Light drizzle",
      53: "Drizzle",
      55: "Heavy drizzle",
      56: "Light freezing drizzle",
      57: "Freezing drizzle",
      61: "Light rain",
      63: "Rain",
      65: "Heavy rain",
      66: "Light freezing rain",
      67: "Freezing rain",
      71: "Light snow",
      73: "Snow",
      75: "Heavy snow",
      77: "Snow grains",
      80: "Light showers",
      81: "Showers",
      82: "Heavy showers",
      85: "Light snow showers",
      86: "Snow showers",
      95: "Thunderstorm",
      96: "Thunderstorm with hail",
      99: "Heavy thunderstorm with hail",
    };
    return weatherCodes[code] || "Clear";
  }

  private getConditionDescription(code: number): string {
    const descriptions: { [key: number]: string } = {
      0: "Clear skies",
      1: "Mostly clear",
      2: "Partly cloudy",
      3: "Cloudy",
      45: "Foggy",
      48: "Foggy with frost",
      51: "Light drizzle",
      53: "Drizzle",
      55: "Heavy drizzle",
      61: "Light rain",
      63: "Rain",
      65: "Heavy rain",
      80: "Light showers",
      81: "Showers",
      82: "Heavy showers",
      95: "Thunderstorm",
      99: "Severe thunderstorm",
    };
    return descriptions[code] || "Fair weather";
  }

  private estimateCloudCover(code: number): number {
    const cloudMap: { [key: number]: number } = {
      0: 10, // Clear
      1: 30, // Mainly clear
      2: 50, // Partly cloudy
      3: 90, // Overcast
      45: 100, // Fog
      48: 100, // Fog
    };
    return cloudMap[code] || 50;
  }

  // Mock data generators (fallback)
  private getMockWeather(lat: number, lon: number): WeatherData {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth();

    // Philippines-specific weather patterns
    let temperature = 28;
    let condition = "Clear";
    let precipitation = 0;

    // Time of day effect
    if (hour >= 6 && hour < 18) {
      temperature = 28 + Math.sin(((hour - 6) / 12) * Math.PI) * 5;
      condition = hour > 11 && hour < 15 ? "Partly cloudy" : "Clear";
    } else {
      temperature = 23 + Math.sin(((hour - 18) / 12) * Math.PI) * 2;
      condition = "Clear";
    }

    // Seasonal adjustment (Philippines)
    if (month >= 5 && month <= 10) {
      // Rainy season
      if (Math.random() > 0.6) {
        condition = "Rain";
        precipitation = 0.5 + Math.random() * 5;
        temperature -= 3;
      }
    } else {
      // Dry season
      if (Math.random() > 0.8) {
        condition = "Partly cloudy";
      }
    }

    // Geographic variation (simplified)
    if (lat > 16) {
      // Northern Luzon
      temperature -= 2;
    } else if (lat < 14) {
      // Southern areas
      temperature += 2;
    }

    return {
      temperature: Math.round(temperature),
      feelsLike: Math.round(temperature + 2),
      condition,
      description: this.getConditionDescriptionFromText(condition),
      humidity: 65 + Math.round(Math.random() * 20),
      windSpeed: 5 + Math.round(Math.random() * 15),
      windDirection: 90 + Math.round(Math.random() * 180),
      pressure: 1010 + Math.round(Math.random() * 10),
      precipitation,
      cloudCover:
        condition === "Clear" ? 10 : condition === "Partly cloudy" ? 40 : 80,
      visibility: 8 + Math.round(Math.random() * 12),
      sunrise: "06:00",
      sunset: "18:00",
      uvIndex: 5 + Math.round(Math.random() * 5),
      location: {
        name: `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
        lat,
        lon,
        timezone: "Asia/Manila",
        country: "Philippines",
      },
      timestamp: Date.now(),
      source: "mock",
    };
  }

  private getMockForecast(days: number): ForecastData[] {
    const forecast: ForecastData[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);

      // Simple weather pattern with some variation
      const baseTemp = 28;
      const variation = Math.sin(i * 0.5) * 3;

      // 30% chance of rain on any given day
      const willRain = Math.random() > 0.7;

      forecast.push({
        date: date.toISOString().split("T")[0],
        maxTemp: Math.round(baseTemp + variation),
        minTemp: Math.round(baseTemp + variation - 5),
        condition: willRain
          ? "Rain"
          : i % 3 === 0
            ? "Clear"
            : i % 3 === 1
              ? "Partly cloudy"
              : "Cloudy",
        precipitation: willRain ? 5.2 + Math.random() * 10 : 0,
        precipitationProbability: willRain ? 70 + Math.random() * 30 : 10,
        sunrise: "06:00",
        sunset: "18:00",
        uvIndex: 5 + i,
        windSpeed: 5 + Math.random() * 15,
        humidity: 60 + Math.random() * 30,
      });
    }

    return forecast;
  }

  private getConditionDescriptionFromText(condition: string): string {
    const map: { [key: string]: string } = {
      Clear: "Clear skies, perfect for farm work",
      "Partly cloudy": "Partly cloudy, good working conditions",
      Cloudy: "Cloudy, mild temperature",
      Overcast: "Overcast, might rain later",
      Rain: "Rainy, consider indoor tasks",
      Drizzle: "Light drizzle, use rain gear",
      Thunderstorm: "Thunderstorm, suspend outdoor activities",
      Fog: "Foggy, low visibility",
      Showers: "Rain showers, intermittent work possible",
    };
    return map[condition] || "Normal weather conditions";
  }

  // Get weather icon name for Lucide
  getWeatherIcon(condition: string): string {
    const iconMap: { [key: string]: string } = {
      Clear: "Sun",
      "Mainly clear": "Sun",
      "Partly cloudy": "Cloud",
      Cloudy: "Cloud",
      Overcast: "Cloud",
      Fog: "CloudFog",
      Drizzle: "CloudDrizzle",
      Rain: "CloudRain",
      "Heavy rain": "CloudRain",
      "Freezing rain": "CloudHail",
      Snow: "Snowflake",
      Thunderstorm: "CloudLightning",
      Showers: "CloudRain",
    };
    return iconMap[condition] || "Cloud";
  }

  // Get farm recommendations based on weather
  getFarmRecommendations(weather: WeatherData): {
    status: "good" | "moderate" | "poor";
    activities: string[];
    warnings: string[];
    suggestions: string[];
  } {
    const recommendations = {
      status: "good" as "good" | "moderate" | "poor",
      activities: [] as string[],
      warnings: [] as string[],
      suggestions: [] as string[],
    };

    // Temperature-based recommendations
    if (weather.temperature > 35) {
      recommendations.status = "poor";
      recommendations.warnings.push("Extreme heat: Risk of heat stroke");
      recommendations.suggestions.push("Work early morning or late afternoon");
      recommendations.suggestions.push("Ensure adequate water supply");
      recommendations.activities.push("Indoor maintenance");
      recommendations.activities.push("Equipment repair");
    } else if (weather.temperature > 30) {
      recommendations.status = "moderate";
      recommendations.suggestions.push("Take frequent breaks in shade");
      recommendations.activities.push("Light harvesting tasks");
      recommendations.activities.push("Irrigation work");
    } else if (weather.temperature < 20) {
      recommendations.suggestions.push("Cool weather: Good for strenuous work");
      recommendations.activities.push("Land preparation");
      recommendations.activities.push("Planting");
    } else {
      recommendations.activities.push("Full farm operations");
      recommendations.activities.push("Planting and cultivation");
      recommendations.activities.push("Harvesting");
    }

    // Rain-based recommendations
    if (weather.condition.includes("Rain") || weather.precipitation > 5) {
      recommendations.status = weather.precipitation > 10 ? "poor" : "moderate";
      recommendations.warnings.push("Wet conditions: Slippery surfaces");
      recommendations.activities.push("Indoor maintenance tasks");
      recommendations.activities.push("Equipment repair");
      recommendations.suggestions.push(
        "Use proper rain gear if working outside",
      );
      recommendations.suggestions.push("Check drainage systems");

      if (weather.precipitation > 20) {
        recommendations.warnings.push("Heavy rain: Flood risk");
        recommendations.suggestions.push("Secure farm equipment");
        recommendations.suggestions.push("Monitor water levels");
      }
    }

    // Wind-based recommendations
    if (weather.windSpeed > 30) {
      recommendations.status = "poor";
      recommendations.warnings.push("Strong winds: Dangerous for outdoor work");
      recommendations.activities.push("Secure loose items and structures");
      recommendations.suggestions.push("Delay work with tall equipment");
    } else if (weather.windSpeed > 20) {
      recommendations.status = "moderate";
      recommendations.suggestions.push("Be cautious with tall equipment");
      recommendations.activities.push("Light field work");
    }

    // UV Index recommendations
    if (weather.uvIndex > 8) {
      recommendations.suggestions.push("High UV: Use sun protection");
      recommendations.suggestions.push("Schedule work in shaded areas");
    }

    // Fog/low visibility
    if (weather.condition.includes("Fog") || weather.visibility < 2) {
      recommendations.status = "moderate";
      recommendations.warnings.push("Low visibility: Use caution");
      recommendations.suggestions.push("Use lights on equipment");
      recommendations.suggestions.push("Work in pairs for safety");
    }

    return recommendations;
  }

  // Get color scheme based on weather condition
  getWeatherColorScheme(condition: string): {
    bg: string;
    text: string;
    icon: string;
  } {
    const schemes: {
      [key: string]: { bg: string; text: string; icon: string };
    } = {
      Clear: {
        bg: "linear-gradient(135deg, #FFD70020, #FFA50020)",
        text: "#D97706",
        icon: "#F59E0B",
      },
      "Mainly clear": {
        bg: "linear-gradient(135deg, #FEF3C720, #FBBF2420)",
        text: "#B45309",
        icon: "#D97706",
      },
      "Partly cloudy": {
        bg: "linear-gradient(135deg, #E0F2FE20, #BAE6FD20)",
        text: "#0369A1",
        icon: "#0EA5E9",
      },
      Cloudy: {
        bg: "linear-gradient(135deg, #CBD5E120, #94A3B820)",
        text: "#475569",
        icon: "#64748B",
      },
      Overcast: {
        bg: "linear-gradient(135deg, #94A3B820, #64748B20)",
        text: "#334155",
        icon: "#475569",
      },
      Rain: {
        bg: "linear-gradient(135deg, #DBEAFE20, #93C5FD20)",
        text: "#1D4ED8",
        icon: "#3B82F6",
      },
      Drizzle: {
        bg: "linear-gradient(135deg, #E0F2FE20, #7DD3FC20)",
        text: "#0EA5E9",
        icon: "#38BDF8",
      },
      Thunderstorm: {
        bg: "linear-gradient(135deg, #5B21B620, #7C3AED20)",
        text: "#7C3AED",
        icon: "#8B5CF6",
      },
      Fog: {
        bg: "linear-gradient(135deg, #F1F5F920, #E2E8F020)",
        text: "#64748B",
        icon: "#94A3B8",
      },
    };

    return (
      schemes[condition] || {
        bg: "linear-gradient(135deg, #F3F4F620, #E5E7EB20)",
        text: "#6B7280",
        icon: "#9CA3AF",
      }
    );
  }
}

// Singleton instance
export const weatherStore = new FreeWeatherStore();
