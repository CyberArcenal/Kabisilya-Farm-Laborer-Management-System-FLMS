// components/Dashboard/components/WeatherWidget.tsx (updated)

import React, { useState, useEffect } from 'react';
import {
  ThermometerSun,
  Droplets,
  Wind,
  RefreshCw,
  Cloud,
  Sun,
  CloudRain,
  CloudLightning,
  CloudFog,
} from "lucide-react";

interface WeatherWidgetProps {
  showAdvanced?: boolean;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ showAdvanced = false }) => {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Initialize with cached weather data
  useEffect(() => {
    const loadCachedWeather = () => {
      try {
        const cached = localStorage.getItem('KABISILYA_weather_cache');
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          // Use cached data if less than 30 minutes old
          if (Date.now() - timestamp < 30 * 60 * 1000) {
            setWeather(data);
            setLastUpdated(new Date(timestamp).toLocaleTimeString());
          }
        }
      } catch (error) {
        console.error('Error loading cached weather:', error);
      }
    };

    loadCachedWeather();
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    
    // Simulate API call with delay
    setTimeout(() => {
      const mockWeather = {
        temperature: 28,
        condition: "Clear",
        humidity: 65,
        windSpeed: 12,
        feelsLike: 30,
        location: { city: "San Jose" },
        timestamp: Date.now(),
      };
      
      // Cache the data
      const cache = {
        data: mockWeather,
        timestamp: Date.now(),
      };
      localStorage.setItem('KABISILYA_weather_cache', JSON.stringify(cache));
      
      setWeather(mockWeather);
      setLastUpdated(new Date().toLocaleTimeString());
      setLoading(false);
    }, 1000);
  };

  if (!weather) {
    return (
      <div className="windows-card p-5">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2 windows-title">
            <ThermometerSun className="w-5 h-5" />
            Weather Conditions
          </h3>
        </div>
        <div className="text-center py-8">
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
            Loading weather data...
          </p>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="windows-btn windows-btn-primary px-4 py-2 text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 inline mr-1 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Load Weather'}
          </button>
        </div>
      </div>
    );
  }

  // Get icon based on condition
  const getWeatherIcon = (condition: string) => {
    const iconMap: { [key: string]: any } = {
      'Clear': Sun,
      'Sunny': Sun,
      'Partly cloudy': Cloud,
      'Cloudy': Cloud,
      'Overcast': Cloud,
      'Rain': CloudRain,
      'Drizzle': CloudRain,
      'Thunderstorm': CloudLightning,
      'Fog': CloudFog,
      'Mist': CloudFog,
    };
    return iconMap[condition] || Sun;
  };

  const WeatherIcon = getWeatherIcon(weather.condition);

  // Get color scheme based on condition
  const getColorScheme = (condition: string) => {
    const schemes: { [key: string]: any } = {
      'Clear': { bg: 'var(--accent-gold-light)', text: 'var(--accent-gold-dark)', icon: 'var(--accent-gold)' },
      'Sunny': { bg: 'var(--accent-gold-light)', text: 'var(--accent-gold-dark)', icon: 'var(--accent-gold)' },
      'Partly cloudy': { bg: 'var(--accent-sky-light)', text: 'var(--accent-sky-dark)', icon: 'var(--accent-sky)' },
      'Cloudy': { bg: 'var(--accent-sky-light)', text: 'var(--accent-sky-dark)', icon: 'var(--accent-sky)' },
      'Rain': { bg: 'var(--accent-blue-light)', text: 'var(--accent-blue-dark)', icon: 'var(--accent-blue)' },
      'Drizzle': { bg: 'var(--accent-blue-light)', text: 'var(--accent-blue-dark)', icon: 'var(--accent-blue)' },
    };
    return schemes[condition] || { bg: 'var(--card-bg)', text: 'var(--text-primary)', icon: 'var(--text-secondary)' };
  };

  const colors = getColorScheme(weather.condition);

  return (
    <div className="windows-card p-5" style={{ background: colors.bg }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 windows-title"
            style={{ color: colors.text }}>
          <ThermometerSun className="w-5 h-5" />
          Weather Conditions
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: colors.text }}>
            {lastUpdated && `Updated ${lastUpdated}`}
          </span>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 rounded-lg hover:opacity-80 transition-opacity"
            style={{ background: colors.text + '20', color: colors.text }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex items-center justify-between">
        {/* Temperature & Condition */}
        <div className="flex items-center gap-4">
          <WeatherIcon className="w-12 h-12" style={{ color: colors.icon }} />
          <div>
            <div className="text-4xl font-bold mb-1 windows-title"
                 style={{ color: colors.text }}>
              {weather.temperature}°C
            </div>
            <div className="text-sm windows-text" style={{ color: colors.text }}>
              {weather.condition}
            </div>
            {weather.location?.city && (
              <div className="text-xs mt-1" style={{ color: colors.text }}>
                {weather.location.city}
              </div>
            )}
          </div>
        </div>

        {/* Weather metrics */}
        <div className="space-y-3">
          {/* Humidity */}
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5" style={{ color: colors.icon }} />
            <div>
              <div className="text-sm font-medium windows-title" 
                   style={{ color: colors.text }}>
                {weather.humidity}%
              </div>
              <div className="text-xs windows-text" style={{ color: colors.text }}>
                Humidity
              </div>
            </div>
          </div>

          {/* Wind */}
          <div className="flex items-center gap-2">
            <Wind className="w-5 h-5" style={{ color: colors.icon }} />
            <div>
              <div className="text-sm font-medium windows-title"
                   style={{ color: colors.text }}>
                {weather.windSpeed} km/h
              </div>
              <div className="text-xs windows-text" style={{ color: colors.text }}>
                Wind
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cache indicator */}
      <div className="mt-4 pt-4 border-t" style={{ borderColor: colors.text + '20' }}>
        <div className="text-xs flex justify-between" style={{ color: colors.text }}>
          <span>Using cached data</span>
          <button 
            onClick={handleRefresh}
            className="text-xs hover:underline"
            style={{ color: colors.icon }}
          >
            Refresh now
          </button>
        </div>
      </div>
    </div>
  );
};