# JustNaik Todo

A React Native to-do app built with Expo SDK 58 and TypeScript, using the [JSONPlaceholder](https://jsonplaceholder.typicode.com) API. Tested on Android through Expo Go.

## Setup

Requires Node.js, pnpm, and the Expo Go app (SDK 58) on your phone.

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
- **Delete:** swipe a task left. Tap **Undo** within 4 seconds to restore it.
- **Reload:** pull down on the list to fetch the original tasks again. If you've made changes, you'll be asked to confirm first, since reloading replaces them.

Tasks are saved on the device, so they remain after restarting the app.

## API limitations

JSONPlaceholder is a fake API that doesn't save writes:

- Added tasks are sent with `POST /todos`, but the server doesn't store them, and it returns `id: 201` for every new task. The app assigns its own IDs instead.
- Completing and deleting tasks only change the list on the device; they aren't sent to the API.
- Reloading always returns the original 10 tasks, so it replaces any local changes.
