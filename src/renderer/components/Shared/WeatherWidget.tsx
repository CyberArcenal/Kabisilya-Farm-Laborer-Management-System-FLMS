// components/WeatherWidget.tsx
import React from 'react';
import {
    Droplets, Wind as WindIcon,
    RefreshCw
} from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';

const WeatherWidget: React.FC = () => {
  const { 
    current: weather, 
    loading, 
    refreshing,
    refreshWeather,
    getWeatherColorScheme,
    getFarmRecommendations
  } = useWeather();

  const recommendations = getFarmRecommendations();

  if (loading) {
    return <div className="p-4">Loading weather...</div>;
  }

  if (!weather) {
    return <div className="p-4">Weather data unavailable</div>;
  }

  return (
    <div className="weather-widget windows-card p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Weather Forecast</h3>
        <button
          onClick={() => refreshWeather(true)}
          disabled={refreshing}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <div className="flex items-center justify-between p-3 rounded-lg"
            style={{
              background: getWeatherColorScheme(weather.condition).bg,
              color: getWeatherColorScheme(weather.condition).text
            }}
          >
            <div>
              <div className="text-3xl font-bold">{weather.temperature}°C</div>
              <div className="text-sm">{weather.condition}</div>
              <div className="text-xs opacity-75">{weather.city}</div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4" />
                <span>{weather.humidity}%</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <WindIcon className="w-4 h-4" />
                <span>{Math.round(weather.windSpeed)} km/h</span>
              </div>
            </div>
          </div>
        </div>
        
        {recommendations.warnings.length > 0 && (
          <div className="col-span-2">
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <h4 className="font-semibold text-yellow-800 mb-2">Farm Warnings</h4>
              <ul className="text-sm text-yellow-700">
                {recommendations.warnings.map((warning, index) => (
                  <li key={index}>⚠️ {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherWidget;