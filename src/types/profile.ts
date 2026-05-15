export type Profile = {
  name: string;
  username: string;
  role: string;
  stack: string[];
  tools: string[];
  interests: string[];
  learning?: string[];
  os?: string;
  terminal?: string;
  editor?: string;
  vibe?: string;
  statusLine?: string;
};

export type ReadmeStyle =
  | "fastfetch"
  | "side-by-side"
  | "ultra-minimal"
  | "anime-terminal";

export type ThemeName = "minimal-dark" | "tokyo-night" | "catppuccin" | "hacker";

export type GenerateReadmeOptions = {
  style: ReadmeStyle;
  theme: ThemeName;
  includeOptional?: {
    githubStats?: boolean;
    spotify?: boolean;
    animeWatching?: boolean;
    terminalScreenshot?: boolean;
  };
};
