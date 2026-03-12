import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function evDisplay(value: number): string {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${(value * 100).toFixed(1)}%`;
}

export function riskColor(risk: string): string {
  switch (risk) {
    case "low":
      return "text-green-400";
    case "medium":
      return "text-yellow-400";
    case "high":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

export function confidenceColor(confidence: number): string {
  if (confidence >= 0.7) return "text-green-400";
  if (confidence >= 0.4) return "text-yellow-400";
  return "text-red-400";
}

export function probBar(value: number): string {
  return `${Math.min(Math.max(value * 100, 0), 100)}%`;
}
