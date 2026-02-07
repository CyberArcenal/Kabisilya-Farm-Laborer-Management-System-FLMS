// components/Dashboard/components/WeatherWidget.tsx (updated)

import React, { useState, useEffect, useRef } from "react";
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

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  showAdvanced = false,
}) => {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousWeather, setPreviousWeather] = useState<any>(null);
  const prevWeatherRef = useRef<any>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Initialize with cached weather data
  useEffect(() => {
    const loadCachedWeather = () => {
      try {
        const cached = localStorage.getItem("KABISILYA_weather_cache");
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          // Use cached data if less than 30 minutes old
          if (Date.now() - timestamp < 30 * 60 * 1000) {
            setWeather(data);
            setLastUpdated(new Date(timestamp).toLocaleTimeString());
            prevWeatherRef.current = data;
            return true; // Cache was valid
          }
        }
      } catch (error) {
        console.error("Error loading cached weather:", error);
      }
      return false; // No valid cache
    };

    const hasValidCache = loadCachedWeather();

    // If no valid cache, automatically load weather
    if (!hasValidCache) {
      handleRefresh();
    }
  }, []);

  const handleRefresh = async () => {
    if (loading) return;

    setIsTransitioning(true);
    setLoading(true);

    // Store current weather as previous for transition
    if (weather) {
      setPreviousWeather(weather);
      prevWeatherRef.current = weather;
    }

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
      localStorage.setItem("KABISILYA_weather_cache", JSON.stringify(cache));

      // Smooth transition delay
      setTimeout(() => {
        setWeather(mockWeather);
        setLastUpdated(new Date().toLocaleTimeString());

        // End transition after animation completes
        setTimeout(() => {
          setIsTransitioning(false);
          setLoading(false);
          setPreviousWeather(null);
        }, 300);
      }, 300);
    }, 800); // Simulated API delay
  };

  // Get icon based on condition
  const getWeatherIcon = (condition: string) => {
    const iconMap: { [key: string]: any } = {
      Clear: Sun,
      Sunny: Sun,
      "Partly cloudy": Cloud,
      Cloudy: Cloud,
      Overcast: Cloud,
      Rain: CloudRain,
      Drizzle: CloudRain,
      Thunderstorm: CloudLightning,
      Fog: CloudFog,
      Mist: CloudFog,
    };
    return iconMap[condition] || Sun;
  };

  // Get color scheme based on condition
  const getColorScheme = (condition: string) => {
    const schemes: { [key: string]: any } = {
      Clear: {
        bg: "var(--accent-gold-light)",
        text: "var(--accent-gold-dark)",
        icon: "var(--accent-gold)",
        gradient:
          "linear-gradient(135deg, var(--accent-gold-light) 0%, rgba(255, 255, 255, 0.1) 100%)",
      },
      Sunny: {
        bg: "var(--accent-gold-light)",
        text: "var(--accent-gold-dark)",
        icon: "var(--accent-gold)",
        gradient:
          "linear-gradient(135deg, var(--accent-gold-light) 0%, rgba(255, 255, 255, 0.1) 100%)",
      },
      "Partly cloudy": {
        bg: "var(--accent-sky-light)",
        text: "var(--accent-sky-dark)",
        icon: "var(--accent-sky)",
        gradient:
          "linear-gradient(135deg, var(--accent-sky-light) 0%, rgba(255, 255, 255, 0.1) 100%)",
      },
      Cloudy: {
        bg: "var(--accent-sky-light)",
        text: "var(--accent-sky-dark)",
        icon: "var(--accent-sky)",
        gradient:
          "linear-gradient(135deg, var(--accent-sky-light) 0%, rgba(255, 255, 255, 0.1) 100%)",
      },
      Rain: {
        bg: "var(--accent-blue-light)",
        text: "var(--accent-blue-dark)",
        icon: "var(--accent-blue)",
        gradient:
          "linear-gradient(135deg, var(--accent-blue-light) 0%, rgba(255, 255, 255, 0.1) 100%)",
      },
      Drizzle: {
        bg: "var(--accent-blue-light)",
        text: "var(--accent-blue-dark)",
        icon: "var(--accent-blue)",
        gradient:
          "linear-gradient(135deg, var(--accent-blue-light) 0%, rgba(255, 255, 255, 0.1) 100%)",
      },
    };
    return (
      schemes[condition] || {
        bg: "var(--card-bg)",
        text: "var(--text-primary)",
        icon: "var(--text-secondary)",
        gradient:
          "linear-gradient(135deg, var(--card-bg) 0%, rgba(255, 255, 255, 0.1) 100%)",
      }
    );
  };

  // Get previous color scheme for transition
  const getPreviousColorScheme = () => {
    if (!previousWeather) {
      return {
        bg: "var(--card-bg)",
        text: "var(--text-primary)",
        icon: "var(--text-secondary)",
        gradient:
          "linear-gradient(135deg, var(--card-bg) 0%, rgba(255, 255, 255, 0.1) 100%)",
      };
    }
    return getColorScheme(previousWeather.condition);
  };

  const colors = weather
    ? getColorScheme(weather.condition)
    : getColorScheme("");
  const prevColors = getPreviousColorScheme();

  if (!weather || loading) {
    const defaultColors = {
      bg: "var(--card-bg)",
      text: "var(--text-primary)",
      icon: "var(--text-secondary)",
    };

    return (
      <div
        className="windows-card p-5 relative overflow-hidden"
        style={{
          background: defaultColors.bg,
          transition: "all 0.5s ease-in-out",
        }}
      >
        {/* Animated background overlay */}
        {loading && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
        )}

        <div className="flex justify-between items-center mb-6 relative z-10">
          <h3
            className="text-lg font-semibold flex items-center gap-2 windows-title"
            style={{ color: defaultColors.text }}
          >
            <ThermometerSun className="w-5 h-5" />
            Weather Conditions
          </h3>
        </div>
        <div className="text-center py-8 relative z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw
                className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
              />
              <p className="text-sm" style={{ color: defaultColors.text }}>
                {loading
                  ? "Loading weather data..."
                  : "No weather data available"}
              </p>
            </div>
            {!loading && (
              <button
                onClick={handleRefresh}
                className="windows-btn windows-btn-primary px-4 py-2 text-sm font-medium flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Load Weather
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const WeatherIcon = getWeatherIcon(weather.condition);
  const PreviousWeatherIcon = previousWeather
    ? getWeatherIcon(previousWeather.condition)
    : Sun;

  return (
    <div
      ref={widgetRef}
      className="windows-card p-5 relative overflow-hidden transition-all duration-500 ease-in-out"
      style={{
        background: isTransitioning
          ? `linear-gradient(135deg, ${prevColors.bg} 0%, ${colors.bg} 100%)`
          : colors.bg,
        transform: isTransitioning ? "scale(0.98)" : "scale(1)",
        opacity: isTransitioning ? 0.9 : 1,
      }}
    >
      {/* Shimmer effect during loading/transition */}
      {isTransitioning && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer z-0"></div>
      )}

      {/* Previous weather fade-out */}
      {isTransitioning && previousWeather && (
        <div
          className="absolute inset-0 p-5 transition-all duration-300 ease-in-out z-10"
          style={{ opacity: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <PreviousWeatherIcon
                className="w-12 h-12"
                style={{ color: prevColors.icon, opacity: 0.7 }}
              />
              <div>
                <div
                  className="text-4xl font-bold mb-1 windows-title"
                  style={{ color: prevColors.text, opacity: 0.7 }}
                >
                  {previousWeather.temperature}°C
                </div>
                <div
                  className="text-sm windows-text"
                  style={{ color: prevColors.text, opacity: 0.7 }}
                >
                  {previousWeather.condition}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current weather */}
      <div
        className={`relative z-20 transition-all duration-500 ease-in-out ${isTransitioning ? "opacity-0" : "opacity-100"}`}
        style={{ transitionDelay: isTransitioning ? "0ms" : "300ms" }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3
            className="text-lg font-semibold flex items-center gap-2 windows-title transition-colors duration-300"
            style={{ color: colors.text }}
          >
            <ThermometerSun className="w-5 h-5" />
            Weather Conditions
          </h3>
          <div className="flex items-center gap-2">
            <span
              className="text-xs transition-colors duration-300"
              style={{ color: colors.text }}
            >
              {lastUpdated && `Updated ${lastUpdated}`}
            </span>
            <button
              onClick={handleRefresh}
              disabled={loading || isTransitioning}
              className="p-2 rounded-lg hover:opacity-80 transition-all duration-300 hover:scale-110 active:scale-95"
              style={{
                background: colors.text + "20",
                color: colors.text,
                transform: loading ? "rotate(180deg)" : "none",
              }}
            >
              <RefreshCw
                className={`w-4 h-4 transition-transform duration-300 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex items-center justify-between">
          {/* Temperature & Condition */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <WeatherIcon
                className="w-12 h-12 transition-all duration-500 ease-in-out"
                style={{
                  color: colors.icon,
                  transform: isTransitioning
                    ? "scale(0.8) rotate(-10deg)"
                    : "scale(1) rotate(0deg)",
                }}
              />
            </div>
            <div>
              <div
                className="text-4xl font-bold mb-1 windows-title transition-all duration-500"
                style={{
                  color: colors.text,
                  transform: isTransitioning
                    ? "translateY(10px)"
                    : "translateY(0)",
                }}
              >
                {weather.temperature}°C
              </div>
              <div
                className="text-sm windows-text transition-colors duration-300"
                style={{ color: colors.text }}
              >
                {weather.condition}
              </div>
              {weather.location?.city && (
                <div
                  className="text-xs mt-1 transition-colors duration-300"
                  style={{ color: colors.text }}
                >
                  {weather.location.city}
                </div>
              )}
            </div>
          </div>

          {/* Weather metrics */}
          <div className="space-y-3">
            {/* Humidity */}
            <div
              className="flex items-center gap-2 transition-all duration-500"
              style={{
                transform: isTransitioning
                  ? "translateX(10px)"
                  : "translateX(0)",
                transitionDelay: "100ms",
              }}
            >
              <Droplets
                className="w-5 h-5 transition-colors duration-300"
                style={{ color: colors.icon }}
              />
              <div>
                <div
                  className="text-sm font-medium windows-title transition-colors duration-300"
                  style={{ color: colors.text }}
                >
                  {weather.humidity}%
                </div>
                <div
                  className="text-xs windows-text transition-colors duration-300"
                  style={{ color: colors.text }}
                >
                  Humidity
                </div>
              </div>
            </div>

            {/* Wind */}
            <div
              className="flex items-center gap-2 transition-all duration-500"
              style={{
                transform: isTransitioning
                  ? "translateX(10px)"
                  : "translateX(0)",
                transitionDelay: "200ms",
              }}
            >
              <Wind
                className="w-5 h-5 transition-colors duration-300"
                style={{ color: colors.icon }}
              />
              <div>
                <div
                  className="text-sm font-medium windows-title transition-colors duration-300"
                  style={{ color: colors.text }}
                >
                  {weather.windSpeed} km/h
                </div>
                <div
                  className="text-xs windows-text transition-colors duration-300"
                  style={{ color: colors.text }}
                >
                  Wind
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cache indicator */}
        <div
          className="mt-4 pt-4 border-t transition-all duration-300"
          style={{ borderColor: colors.text + "20" }}
        >
          <div
            className="text-xs flex justify-between transition-colors duration-300"
            style={{ color: colors.text }}
          >
            <span>Using cached data</span>
            <button
              onClick={handleRefresh}
              disabled={loading || isTransitioning}
              className="text-xs hover:underline transition-all duration-200 hover:scale-105"
              style={{ color: colors.icon }}
            >
              Refresh now
            </button>
          </div>
        </div>
      </div>

      {/* Add CSS animations */}
      {/* Add CSS animations */}
      <style>{`
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
`}</style>
    </div>
  );
};
