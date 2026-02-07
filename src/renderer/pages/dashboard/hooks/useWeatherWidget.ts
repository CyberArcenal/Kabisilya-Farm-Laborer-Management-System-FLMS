// hooks/useWeatherWidget.ts
import { useState, useCallback, useMemo } from 'react';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudFog,
} from "lucide-react";
import { useDynamicWeather } from '../../../hooks/useDynamicWeather';

export const useWeatherWidget = () => {
  const {
    weather,
    loading,
    error,
    currentLocation,
    refreshWeather,
    getWeatherIcon,
    getWeatherColorScheme,
  } = useDynamicWeather();

  const handleRefreshWeather = useCallback(async () => {
    await refreshWeather();
  }, [refreshWeather]);

  const formatTemperature = useCallback((temp: number | undefined) => {
    if (!temp) return '--°C';
    return `${Math.round(temp)}°C`;
  }, []);

  const getConditionIcon = useCallback((condition: string) => {
    const iconName = getWeatherIcon(condition);
    const iconMap: { [key: string]: any } = {
      'Sun': Sun,
      'Cloud': Cloud,
      'CloudRain': CloudRain,
      'CloudLightning': CloudLightning,
      'CloudFog': CloudFog,
      'CloudDrizzle': CloudRain,
      'CloudSnow': Cloud,
      'Snowflake': Cloud,
    };
    return iconMap[iconName] || Sun;
  }, [getWeatherIcon]);

  return {
    weather,
    loading,
    error,
    currentLocation,
    handleRefreshWeather,
    getWeatherColorScheme,
    formatTemperature,
    getConditionIcon,
  };
};