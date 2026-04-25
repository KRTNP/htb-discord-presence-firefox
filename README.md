# HTB Discord Presence for Firefox (VibeCoding)

Discord Rich Presence integration for Hack The Box on **Firefox (Kali Linux)**.

This project uses:
- Firefox WebExtension (detects HTB page activity)
- Native Messaging Host in Python (bridges browser -> local process)
- Discord IPC via `pypresence` (updates your Rich Presence)

## Features

- Auto-detect activity from HTB routes (Machines, Challenges, Academy, etc.)
- Updates Discord Rich Presence in near real-time
- Configurable in extension options:
  - Enable/disable integration
  - Discord Application Client ID
  - Large image key/text
  - Polling interval
- No HTB private API token required (uses URL/title context only)

## Project Structure

- `extension/` Firefox WebExtension
- `native-host/` Python native host for Firefox Native Messaging
- `install_native_host.sh` one-shot installer for Kali/Linux

## Requirements

- Kali Linux (or compatible Linux distro)
- Firefox
- Discord Desktop (native package recommended)
- Python 3 + `venv`

Install system deps:

```bash
sudo apt update
sudo apt install -y python3 python3-venv
```

## Installation

### 1) Install Native Host

From project root:

```bash
chmod +x install_native_host.sh native-host/launch_host.sh native-host/htb_discord_host.py
./install_native_host.sh htb-presence@local
```

What this does:
- Creates virtualenv at `native-host/.venv`
- Installs Python dependency `pypresence`
- Writes native host manifest to:
  - `~/.mozilla/native-messaging-hosts/com.htb.discord.presence.json`

### 2) Load Extension in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click `Load Temporary Add-on...`
3. Select `extension/manifest.json`

### 3) Configure Extension

1. Open extension **Options**
2. Set **Discord Application Client ID**
3. (Optional) Set **Large Image Key** and **Large Image Text**
4. Save

## Usage

1. Open Discord Desktop and log in
2. Browse `https://app.hackthebox.com/`
3. Your Discord profile should show HTB activity automatically

## Troubleshooting

- `Permission denied (publickey)` while pushing to GitHub
  - Your SSH key is not configured for GitHub. Use HTTPS+PAT or set up SSH keys.
- Discord activity not appearing
  - Ensure Discord Desktop is running (not only web version)
  - If using Flatpak Discord, IPC socket behavior may differ
- HTB page updates not reflected
  - HTB route may have changed; update mappings in `extension/content.js`

## Main Files

- `extension/manifest.json`
- `extension/background.js`
- `extension/content.js`
- `extension/options.html`
- `native-host/htb_discord_host.py`
- `install_native_host.sh`
