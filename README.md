# JustNaik Todo

A React Native to-do app built with Expo SDK 58 and TypeScript, using the [JSONPlaceholder](https://jsonplaceholder.typicode.com) API. Tested on Android through Expo Go. AsyncStorage is implemented.

Stack: React Native, Expo SDK, TypeScript, (`fetch`, `useReducer` with custom hooks), AsyncStorage, Reanimated, Gesture Handler, Keyboard Controller.

Specification and design decisions (ADRs): [SPEC.md](./SPEC.md).

## Install the APK

The quickest way to try the app, no setup needed.

1. On your Android phone, download [JustNaik-Todo.apk](https://github.com/justin8ty/mobile-todo/releases/latest/download/JustNaik-Todo.apk) from the latest [release](https://github.com/justin8ty/mobile-todo/releases/latest).
2. Open the downloaded file and allow installing apps from this source when Android asks.
3. Open **JustNaik Todo**. It needs an internet connection the first time, to load tasks from the API.

To build a new APK yourself (optional), follow [Setup](#setup), then run `eas build -p android --profile preview` (requires [EAS CLI](https://docs.expo.dev/build/setup/) and an Expo account).

## Setup

To run from source instead, you'll need Node.js, pnpm, and the Expo Go app on your phone (find it on Play Store).

```sh
git clone https://github.com/justin8ty/mobile-todo.git
cd mobile-todo
pnpm install
pnpm start
```

`pnpm start` prints a QR code in the terminal. Scan it with Expo Go (Android) or the Camera app (iOS). Your phone and computer must be on the same Wi-Fi; if the app doesn't load, run `pnpm start --tunnel` instead.

## Usage

- **View:** the first 10 tasks load from the API. The badge shows how many are left.
- **Complete:** tap a task to toggle it.
- **Add:** tap **+**, type a title, then tap the **✓** button (where **+** was) or press return. The ✓ stays grey until you type a title. Tap anywhere else to cancel. If adding fails, your text stays; tap **✓** again or **Retry** in the message.
- **Edit:** long-press a task to edit its title in place, then tap **✓** or press return. Tap anywhere else to cancel and keep the original title.
- **Filter:** tap **All**, **Active** or **Done** in the bar at the bottom, beside the **+** button. The badge always counts every task left, whatever the filter.
- **Delete:** swipe a task left. Tap **Undo** within 4 seconds to restore it.
- **Reload:** pull down on the list to fetch the original tasks again. If you've made changes, you'll be asked to confirm first, since reloading replaces them through the fake API.

Tasks are saved on the device (AsyncStorage), so they remain after restarting the app.

## API limitations

JSONPlaceholder is a fake API that doesn't save writes:

- Added tasks are sent with `POST /todos`, but the server doesn't store them, and it returns `id: 201` for every new task. The app assigns its own IDs instead.
- Completing, editing and deleting tasks only change the list on the device; they aren't sent to the API. (Edits aren't sent with `PATCH`, since the app's own IDs can match a different task on the server.)
- Reloading always returns the original 10 tasks, so it replaces any local changes.

This is accepted by the task requirements.

## Dev

```sh
pnpm lint
pnpm typecheck
pnpm test
```
