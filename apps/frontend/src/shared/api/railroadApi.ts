import axios from "axios";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || undefined;

export function buildExternalUrl(path: string) {
  if (!configuredBaseUrl) {
    return path;
  }

  return new URL(path, configuredBaseUrl).toString();
}

export const apiClient = axios.create({
  baseURL: configuredBaseUrl,
});
