# FFinFlow testing in Debian WSL

## Confirmed result

On November 13, 2026, `ffinflow-1.5.4-x86_64.flatpak` installed, launched, and rendered its interface in Debian WSL. Rendering was confirmed by the user. Media playback and the rest of the app's features have not yet been verified.

Environment used:

| Component | Value |
| --- | --- |
| Distribution | Debian GNU/Linux 13 (trixie), x86_64, WSL 2 |
| WSL | 2.6.3.0 |
| Linux kernel | 6.6.87.2-microsoft-standard-WSL2 |
| WSLg | 1.0.71 |
| Flatpak | 1.16.6 |
| App ID / branch | `com.ffinflow.mediaplayer` / `master` |
| Required runtime | `org.freedesktop.Platform/x86_64/24.08` |
| Test account | `ffinflow-test`, UID 1001 |
| Installation scope | System-wide Flatpak installation in Debian |
| Original bundle | `C:\Users\admin\Downloads\ffinflow-1.5.4-x86_64.flatpak` |

## Launch on this machine

All command blocks below run in **Windows PowerShell**, not inside a Debian shell.

The app and its dependencies are already installed. Launch with:

```powershell
wsl.exe -d Debian -u ffinflow-test --exec flatpak run com.ffinflow.mediaplayer
```

Keep that terminal open while testing so you can see startup errors. Use the app's normal Quit/Exit action when finished. If it is stuck, stop it with:

```powershell
wsl.exe -d Debian -u ffinflow-test --exec flatpak kill com.ffinflow.mediaplayer
```

## Set up another Debian WSL installation

### 1. Check WSL and GUI support

```powershell
wsl.exe --version
wsl.exe --list --verbose
```

Debian must use WSL **2**. WSLg supplies the Linux GUI display; a full Linux desktop is not needed. If Debian is not installed yet:

```powershell
wsl.exe --install --distribution Debian --web-download --no-launch
```

For WSLg problems, check the [Microsoft Linux GUI app guide](https://learn.microsoft.com/en-us/windows/wsl/tutorials/gui-apps). These commands inspect the display configuration:

```powershell
wsl.exe -d Debian -u root --exec printenv DISPLAY WAYLAND_DISPLAY PULSE_SERVER
wsl.exe -d Debian -u root --exec ls -l /mnt/wslg /tmp/.X11-unix
```

This test used `DISPLAY=:0`, `WAYLAND_DISPLAY=wayland-0`, and `PULSE_SERVER=unix:/mnt/wslg/PulseServer`.

### 2. Install Flatpak and desktop integration

```powershell
wsl.exe -d Debian -u root --exec apt-get update
wsl.exe -d Debian -u root --exec env DEBIAN_FRONTEND=noninteractive apt-get install --yes --no-install-recommends flatpak dbus-user-session xdg-desktop-portal-gtk
wsl.exe -d Debian -u root --exec flatpak remote-add --system --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
```

Flathub provides the runtime dependencies. The local `.flatpak` bundle alone was insufficient: installation initially failed because the Freedesktop 24.08 runtime was missing. Adding Flathub before installing the bundle resolved that dependency.

### 3. Choose a non-root Linux account

This machine had no regular Linux user yet, so a separate local test account was created. It has a locked password and no sudo membership; WSL can launch it explicitly with `-u ffinflow-test`. Debian's default user was left unchanged.

Check whether the account already exists:

```powershell
wsl.exe -d Debian -u root --exec id ffinflow-test
```

Only if it does not exist, check that UID 1001 is unused and create it:

```powershell
wsl.exe -d Debian -u root --exec getent passwd 1001
wsl.exe -d Debian -u root --exec /usr/sbin/useradd --create-home --uid 1001 --shell /bin/bash ffinflow-test
```

If `getent` returns an existing account, choose another unused UID above 1000 before running `useradd`. UID 1000 was reserved for Debian's normal first-launch account setup. Alternatively, use an existing regular Linux account and substitute its name for `ffinflow-test` in the launch and diagnostic commands.

### 4. Install the local bundle and launch

```powershell
wsl.exe -d Debian -u root --exec flatpak install --system --noninteractive --bundle /mnt/c/Users/admin/Downloads/ffinflow-1.5.4-x86_64.flatpak
wsl.exe -d Debian -u ffinflow-test --exec flatpak run com.ffinflow.mediaplayer
```

Replace the bundle path for another machine or build. Windows drive `C:` is available inside Debian as `/mnt/c`. Launch the installed **app ID**, not the `.flatpak` filename. See [Flatpak's bundle documentation](https://docs.flatpak.org/en/latest/single-file-bundles.html).

## Test a newer local build

Quit the running app first. Install the new bundle with `--or-update` so an existing installation can be updated. Replace the example filename with the new build's actual name:

```powershell
wsl.exe -d Debian -u root --exec flatpak install --system --noninteractive --or-update --bundle /mnt/c/Users/admin/Downloads/ffinflow-1.5.4-x86_64.flatpak
wsl.exe -d Debian -u ffinflow-test --exec flatpak run com.ffinflow.mediaplayer
```

This reuses the test account's existing app data. Reinstalling the package does not by itself establish a clean first-run test. Use a separate test account when you need an untouched app profile.

## Diagnostics

```powershell
# Installed app metadata and required runtime
wsl.exe -d Debian -u root --exec flatpak info --system com.ffinflow.mediaplayer

# Active Flatpak processes for the test account
wsl.exe -d Debian -u ffinflow-test --exec flatpak ps --columns=application,pid,runtime

# Recent application log
wsl.exe -d Debian -u ffinflow-test --exec tail -n 100 /home/ffinflow-test/.var/app/com.ffinflow.mediaplayer/config/ffinflow/logs/main.log
```

The test account's app data is under `/home/ffinflow-test/.var/app/com.ffinflow.mediaplayer/`. WSLg's compositor log is `/mnt/wslg/weston.log`.

Observed messages during the successful rendering test:

- Chromium reported a missing system D-Bus socket inside the sandbox.
- Chromium reported `WebGL1 blocklisted`. `/dev/dri` was absent in Debian; hardware acceleration and WebGL features remain unverified even though the interface rendered.
- Node emitted a `DEP0174` warning about calling `promisify` on a function that returns a Promise.
- The updater logged `APPIMAGE env is not defined`; this package is a Flatpak. Flatpak-specific update behavior remains unverified.
- Flatpak reported that Freedesktop runtime 24.08 is end-of-life. A future app build should target a supported runtime rather than treating this old runtime as a permanent requirement.

None of these messages prevented the observed app rendering. No `--no-sandbox` flag or permission overrides were used.

The earlier Debian boot failure was a stale distro registration pointing to a missing `ext4.vhdx`, resolved by unregistering the broken distro and installing a fresh Debian. **Do not unregister Debian as part of normal app testing or updates:** unregistering permanently removes that distro's Linux files and settings.

## Manual test record

- [x] Install the local Flatpak and its runtime dependencies.
- [x] Launch as a non-root Linux user.
- [x] Confirm the interface renders (user confirmed).
- [ ] Open a local audio file and confirm playback and audio output.
- [ ] Open a local video file and check picture, sound, seeking, and fullscreen.
- [ ] Test the file picker, library/folder access, and drag and drop.
- [ ] Test any WebGL-dependent visualizers or graphics features.
- [ ] Quit and relaunch; confirm settings and library state persist.
- [ ] Install a newer bundle and verify the update behavior.

Add test files, results, errors, and any additional setup requirements here as testing continues.
