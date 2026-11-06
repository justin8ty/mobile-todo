If you are doing design, please do it tastefully. Avoid slop, lazy, or anti-human UI/UX sensibilities design. The design for this app will be oriented towards mobile sensibilities.

- Expo SDK 58. Check the versioned docs (`https://docs.expo.dev/versions/v58.0.0/`, index at `https://docs.expo.dev/llms.txt`) before using Expo/RN APIs; don't rely on memory.
- Add Expo/RN packages with `pnpm exec expo install <pkg>` (`-- -D` for dev) so versions match the SDK.
- Expo Go only: no dev builds, no `ios/`/`android/` folders, only modules bundled in Expo Go.
- Before finishing: `pnpm lint`, `pnpm typecheck`, `pnpm test`.
