/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(auth)` | `/(auth)/login` | `/(auth)/register` | `/(tabs)` | `/(tabs)/` | `/(tabs)/backtest` | `/(tabs)/history` | `/(tabs)/matches` | `/(tabs)/profile` | `/(tabs)/value-bets` | `/_sitemap` | `/backtest` | `/history` | `/login` | `/match-detail` | `/matches` | `/notifications` | `/profile` | `/register` | `/value-bets`;
      DynamicRoutes: never;
      DynamicRouteTemplate: never;
    }
  }
}
