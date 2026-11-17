import { AsyncLocalStorage } from "node:async_hooks";

export type VoiceFaceRuntimeEnv = {
  PYTHON_BACKEND_URL?: string;
};

// Cloudflare Worker bindings are request-scoped. Keep them in async-local
// storage so route handlers can read configuration without sharing mutable
// state between concurrent requests.
const runtimeEnvironments = new AsyncLocalStorage<VoiceFaceRuntimeEnv>();

export function runWithRuntimeEnv<T>(env: VoiceFaceRuntimeEnv, run: () => T): T {
  return runtimeEnvironments.run(env, run);
}

export function getPythonBackendUrl(): string | undefined {
  const value = runtimeEnvironments.getStore()?.PYTHON_BACKEND_URL
    ?? process.env.PYTHON_BACKEND_URL;
  const normalized = value?.trim().replace(/\/$/, "");
  return normalized || undefined;
}
