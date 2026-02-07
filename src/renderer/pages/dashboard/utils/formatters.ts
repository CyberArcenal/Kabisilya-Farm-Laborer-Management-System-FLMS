// components/Dashboard/utils/formatters.ts
export const formatPercentageValue = (value: number | undefined): string => {
  if (value === undefined || value === null) return "0%";
  return `${Math.round(value * 100) / 100}%`;
};

export const formatDecimal = (value: number | undefined): string => {
  if (value === undefined || value === null) return "0.0";
  return value.toFixed(1);
};

export const formatSeasonType = (seasonType: string) => {
  switch (seasonType?.toLowerCase()) {
    case "tag-ulan":
      return "Tag-ulan";
    case "tag-araw":
      return "Tag-araw";
    default:
      return seasonType || "Custom";
  }
};