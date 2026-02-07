// hooks/useDynamicWeather.ts (updated)

import { useState, useEffect, useCallback, useRef } from 'react';
import { weatherStore, type ForecastData, type LocationData, type WeatherData } from '../lib/freeWeatherStore';

export interface UseDynamicWeatherReturn {
  // Weather data
  weather: WeatherData | null;
  forecast: ForecastData[];
  loading: boolean;
  error: string | null;
  
  // Location data
  currentLocation: LocationData | null;
  savedLocations: LocationData[];
  locationLoading: boolean;
  locationError: string | null;
  
  // Actions
  refreshWeather: (force?: boolean) => Promise<void>;
  refreshLocation: (force?: boolean) => Promise<void>;
  getWeatherForLocation: (lat: number, lon: number, force?: boolean) => Promise<void>;
  getWeatherForSavedLocation: (index: number, force?: boolean) => Promise<void>;
  addNewLocation: (lat: number, lon: number, name?: string) => Promise<LocationData>;
  removeSavedLocation: (index: number) => void;
  
  // Helpers
  recommendations: ReturnType<typeof weatherStore.getFarmRecommendations> | null;
  getWeatherIcon: (condition: string) => string;
  getWeatherColorScheme: (condition: string) => ReturnType<typeof weatherStore.getWeatherColorScheme>;
}

export const useDynamicWeather = (autoRefresh: boolean = false): UseDynamicWeatherReturn => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [savedLocations, setSavedLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(false); // Start as false, will load on demand
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const isInitialMount = useRef(true);
  const lastRefreshTime = useRef<number>(0);
  const MIN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes minimum between refreshes

  // Load saved locations from cache
  const loadSavedLocations = useCallback(() => {
    const locations = weatherStore.getSavedLocationsList();
    setSavedLocations(locations);
  }, []);

  // Get current location with caching
  const refreshLocation = useCallback(async (force: boolean = false) => {
    // Don't refresh if we have recent location and not forced
    if (!force && currentLocation && Date.now() - currentLocation.lastUsed < 5 * 60 * 1000) {
      return;
    }
    
    setLocationLoading(true);
    setLocationError(null);
    
    try {
      const location = await weatherStore.getCurrentLocation(!force);
      setCurrentLocation(location);
      
      // Update saved locations list
      loadSavedLocations();
    } catch (err: any) {
      setLocationError(err.message || 'Failed to get location');
      console.error('Location error:', err);
    } finally {
      setLocationLoading(false);
    }
  }, [currentLocation, loadSavedLocations]);

  // Get weather with smart caching
  const refreshWeather = useCallback(async (force: boolean = false) => {
    if (!currentLocation) {
      await refreshLocation(force);
      return;
    }
    
    // Prevent rapid successive refreshes
    const now = Date.now();
    if (!force && now - lastRefreshTime.current < MIN_REFRESH_INTERVAL) {
      console.log('Skipping refresh - too soon');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const [currentWeather, currentForecast] = await Promise.all([
        weatherStore.getWeatherForCoordinates(currentLocation.lat, currentLocation.lon, force),
        weatherStore.getForecastForCoordinates(currentLocation.lat, currentLocation.lon, 5)
      ]);
      
      setWeather(currentWeather);
      setForecast(currentForecast);
      lastRefreshTime.current = now;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch weather');
      console.error('Weather error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentLocation, refreshLocation]);

  // Initialize with cached data
  const initializeWithCache = useCallback(async () => {
    setLoading(true);
    
    try {
      // Load saved locations first
      loadSavedLocations();
      
      // Try to get most recent location from cache
      const locations = weatherStore.getSavedLocationsList();
      if (locations.length > 0) {
        const cachedLocation = locations[0];
        setCurrentLocation(cachedLocation);
        
        // Try to get cached weather for this location
        const cachedWeather = await weatherStore.getWeatherForCoordinates(
          cachedLocation.lat, 
          cachedLocation.lon,
          false
        );
        
        if (cachedWeather) {
          setWeather(cachedWeather);
        }
      }
      
      // Then try to get current location in background
      setTimeout(async () => {
        await refreshLocation(false);
      }, 100);
      
    } catch (err: any) {
      console.error('Initialization error:', err);
    } finally {
      setLoading(false);
    }
  }, [loadSavedLocations, refreshLocation]);

  // Get weather for specific coordinates
  const getWeatherForLocation = useCallback(async (lat: number, lon: number, force: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const [newWeather, newForecast] = await Promise.all([
        weatherStore.getWeatherForCoordinates(lat, lon, force),
        weatherStore.getForecastForCoordinates(lat, lon, 5)
      ]);
      
      setWeather(newWeather);
      setForecast(newForecast);
      
      // Update current location
      const locationData: LocationData = {
        ...newWeather.location,
        isCurrentLocation: false,
        lastUsed: Date.now()
      };
      setCurrentLocation(locationData);
      
      // Update saved locations
      loadSavedLocations();
    } catch (err: any) {
      setError(err.message || 'Failed to fetch weather for location');
      console.error('Weather location error:', err);
    } finally {
      setLoading(false);
    }
  }, [loadSavedLocations]);

  // Get weather for saved location
  const getWeatherForSavedLocation = useCallback(async (index: number, force: boolean = false) => {
    if (index < 0 || index >= savedLocations.length) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const [newWeather, newForecast] = await Promise.all([
        weatherStore.getWeatherForCoordinates(
          savedLocations[index].lat,
          savedLocations[index].lon,
          force
        ),
        weatherStore.getForecastForCoordinates(
          savedLocations[index].lat,
          savedLocations[index].lon,
          5
        )
      ]);
      
      setWeather(newWeather);
      setForecast(newForecast);
      setCurrentLocation(savedLocations[index]);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch weather for saved location');
      console.error('Saved location weather error:', err);
    } finally {
      setLoading(false);
    }
  }, [savedLocations]);

  // Initial load - use cached data first
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      initializeWithCache();
      
      // Pre-cache default locations
      setTimeout(() => {
        weatherStore.preCacheDefaultLocations();
      }, 2000);
    }
  }, [initializeWithCache]);

  // Load weather when location changes (only if location is new)
  useEffect(() => {
    if (currentLocation) {
      const locationKey = `${currentLocation.lat.toFixed(1)}_${currentLocation.lon.toFixed(1)}`;
      const previousLocation = weather?.location;
      const previousKey = previousLocation ? 
        `${previousLocation.lat.toFixed(1)}_${previousLocation.lon.toFixed(1)}` : null;
      
      // Only refresh if location changed significantly
      if (!previousKey || locationKey !== previousKey) {
        refreshWeather(false);
      }
    }
  }, [currentLocation, refreshWeather]);

  // Auto-refresh (optional, disabled by default)
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      if (currentLocation) {
        refreshWeather(false);
      }
    }, 60 * 60 * 1000); // Every 60 minutes if enabled
    
    return () => clearInterval(interval);
  }, [autoRefresh, currentLocation, refreshWeather]);

  return {
    // Weather data
    weather,
    forecast,
    loading,
    error,
    
    // Location data
    currentLocation,
    savedLocations,
    locationLoading,
    locationError,
    
    // Actions
    refreshWeather,
    refreshLocation,
    getWeatherForLocation,
    getWeatherForSavedLocation,
    addNewLocation: useCallback(async (lat: number, lon: number, name?: string) => {
      const newLocation = await weatherStore.addNewLocation(lat, lon, name);
      loadSavedLocations();
      return newLocation;
    }, [loadSavedLocations]),
    removeSavedLocation: useCallback((index: number) => {
      weatherStore.removeLocation(index);
      loadSavedLocations();
    }, [loadSavedLocations]),
    
    // Helpers
    recommendations: weather ? weatherStore.getFarmRecommendations(weather) : null,
    getWeatherIcon: weatherStore.getWeatherIcon.bind(weatherStore),
    getWeatherColorScheme: weatherStore.getWeatherColorScheme.bind(weatherStore),
  };
};