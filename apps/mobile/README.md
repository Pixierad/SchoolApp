# Mobile App

Expo / React Native entrypoint for iOS, Android, and native development.

The root `App.js` points here so native builds avoid importing the website
shell. Shared product UI still lives under `src/features`, `src/application`,
and shared data helpers are exposed through `packages/core`.
