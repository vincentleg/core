# Founder-only actions — consolidated checklist (INC-2026-10-15-01), 2026-10-15

These steps need your personal access: accounts, macOS administrator rights, the router. An agent cannot do or verify F1, F2 or F6. Tick each one when done. This document stays on the unpublished branch.

## 1. Accounts (do first; about 10 minutes)
- [ ] **F1a — Claude:** on claude.ai, open Settings → Account and use the option to sign out of all sessions / log out all devices. Then sign in again.
- [ ] **F1b — Luma:** on luma.com, sign out everywhere (account or security settings), or change the password, which ends other sessions on most services. Then sign in again.
- [ ] **F2 — Saved passwords:** the exposed Chrome profile is now in `~/CORE-quarantine/2026-10-15-INC-chrome-profile`, unread.
  - If you ever saved passwords in that profile (it was an automation profile, so probably not), change those passwords.
  - If unsure, change the Claude and Luma passwords anyway.
- [ ] **F3b — Quarantined profile:** decide whether to keep it as evidence or delete it: `rm -rf ~/CORE-quarantine/2026-10-15-INC-chrome-profile`. It contains encrypted cookies.

## 2. This Mac's network exposure (about 5 minutes)
- [ ] **F4 — Firewall:** System Settings → Network → Firewall → turn it **On**. The current state is **Off** (checked today).
  - Then open "Options…" and remove `python3` from the list, or set it to "Block incoming connections".
  - Optional: enable "stealth mode".
- [ ] **F5 — Services still listening on all network interfaces.** Each was identified; none belongs to CORE.

  | Port | Process | What it is | Recommended action |
  |---|---|---|---|
  | 3101 | `next-server`, started by `npm run start --port 3101` in `~/vincent-portfolio` | Your portfolio site, production mode, running since 2026-10-11 | Stop it when not in use (Ctrl-C in its terminal), or restart it as `npm run start -- -p 3101 -H 127.0.0.1` |
  | 8080 | `com.apple.WebDriver.HTTPService` | Safari's automation (WebDriver) service, started 2026-10-12, probably by an earlier test session | If you don't automate Safari: in Safari → Develop menu, untick "Allow Remote Automation". The service then stops |
  | 5000, 7000 | `ControlCenter` | macOS AirPlay Receiver | If you don't receive AirPlay on this Mac: System Settings → General → AirDrop & Handoff → turn AirPlay Receiver off |
  | 24267 | `swrm.bin` (Chaos V-Ray Swarm 1.4) | V-Ray distributed-rendering node | Quit Swarm when not rendering, or restrict it in V-Ray Swarm settings |
  | 30304 | `vrol.bin` (Chaos VRLService) | Chaos licence service | Keep if you use V-Ray; the firewall (F4) limits who can reach it |
  | random (`rapportd`) | macOS Continuity/Handoff | System service | Leave it. Once the firewall is on, macOS manages it |

## 3. Router (optional, about 5 minutes)
- [ ] **F6 — Port forwarding:** open your router's admin page (often `http://192.168.1.1` or the address printed on the router).
  - Check "Port forwarding", "Virtual servers" or "NAT" for any rule pointing to this Mac, especially ports 8000, 8765, 3101 or 8080. Delete any you don't need.
  - Disable UPnP if you don't need it.

## 4. Backups (about 5 minutes)
- [ ] Copy `~/CORE-backups/` (git bundles and the database backup) to an external drive or another trusted, encrypted location. Today it exists only on this Mac.

When F1, F2, F4 and F6 are done, tell CORE's agent. The incident record can then move from "contained" to "resolved", with the date and the residual unknown: whether anyone accessed the files during the exposure window cannot be determined.
