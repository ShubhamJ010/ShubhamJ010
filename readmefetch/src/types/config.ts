export interface Config {
  display_stats: string[];
  additional_info: string;
  preferred_color: string;
  max_languages: number;
  append_automatic: boolean;
  exclude_orgainzations: boolean;
}

export interface Colors {
  name: string;
  background: string;
  foreground: string;
  value: string;
  palette: string[];
}

export interface StatItem {
  label: string;
  value: number | string;
  suffix?: string;
}