type Env = Record<string, string | undefined>;

export interface Config {
  port: number;
  indexPath: string;
}

const DEFAULT_PORT = 3000;
const DEFAULT_INDEX_PATH = "data/pages.json";

export function loadConfig(env: Env): Config {
  return {
    port: readPort(env.PORT),
    indexPath: env.INDEX_PATH || DEFAULT_INDEX_PATH,
  };
}

function readPort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PORT;
  }
  if (!/^\d+$/.test(value)) {
    throw new Error(`invalid PORT: ${value}`);
  }
  const port = Number(value);
  if (port < 1 || port > 65535) {
    throw new Error(`invalid PORT: ${value}`);
  }
  return port;
}
