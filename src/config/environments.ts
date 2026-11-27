export type Environment = {
  baseUrl: string;
  /** Whether RESET_DB=true and `npm run app:reset` may restore the base database here. */
  resettable: boolean;
  /** What to do when the app does not answer; ends the "not reachable" error. */
  whenUnreachable: string;
};

// The servers the suite can run against; APP_ENV picks one. Tests are written and gated on dev,
// which is also what CI starts. A new environment is one more entry here; tests do not change.
export const environments = {
  dev: {
    baseUrl: 'http://localhost:3000',
    resettable: true,
    whenUnreachable: 'Start it with: npm run app:up',
  },
  // No real staging server exists for this project, so the entry points at the local app. It shows
  // the switch; replace the address when a real one appears.
  staging: {
    baseUrl: 'http://localhost:3000',
    resettable: false,
    whenUnreachable: 'It is a shared environment that this repository does not start.',
  },
} satisfies Record<string, Environment>;

export type EnvironmentName = keyof typeof environments;

export const environmentNames = Object.keys(environments) as [EnvironmentName, ...EnvironmentName[]];
