# AeroClean

A sign-in / registration system for **students**, **personnel** and an **administrator**.
Built with plain HTML, CSS and JavaScript — no build step, no server, no database.

## Open it

Double-click `index.html`. That's it.

Everything runs in the browser and accounts are saved in `localStorage`, so the
data stays on that device and browser.

## Accounts

| Role | How it is created | Access |
|---|---|---|
| **Student** | Self-registration | Instant |
| **Personnel** | Self-registration | Locked until the administrator accepts it |
| **Administrator** | Seeded automatically | Full access |

Default administrator: **`ADMIN001`** / **`admin123`**

## Pages

| File | Purpose |
|---|---|
| `index.html` | Sign in with School ID + password |
| `register.html` | Register — pick **Student** or **Personnel** |
| `dashboard-monitor.html` | **Dashboard** — odor monitoring for all roles |
| `dashboard-student.html` | Student area |
| `dashboard-personnel.html` | Approved personnel area |
| `pending.html` | "Awaiting approval" screen shown when a personnel account is blocked |
| `admin.html` | Stats, pending approvals (Accept / Decline) and all accounts |

## Menu

Every signed-in page has a **hamburger button** (top right) that opens a
slide-in drawer with:

- **Dashboard** — the monitoring page
- role links (**Account details** for students/personnel, **Approvals** and
  **Accounts** for the administrator)
- **Sign out**
- a **red alert pill** showing how many rooms are currently in odor alert

## Monitoring dashboard

`dashboard-monitor.html` shows, for the six ESP32 nodes in the system
(each node carries an **MQ137** NH3 sensor and an **MQ3** alcohol sensor):

- **Top:** two square tiles — *Rooms in Normal Odor* and *Rooms in Odor Alert*
  with a live count, the room names in alert, a 30-sample sparkline and the
  time of the last reading.
- **Below:** a square grid of device cards. Each card has a **circular gauge**
  for the combined **odor index %**
  (`max(MQ137 ÷ 50, MQ3 ÷ 25) × 100`), a Normal / Odor Alert status badge,
  and beneath the gauge the exact ppm readings against their thresholds:

  | Sensor | Threshold |
  |---|---|
  | MQ137 (NH3) | 50 ppm |
  | MQ3 (alcohol) | 25 ppm |

Readings are **simulated** and refresh every 2 seconds. They live in
`js/telemetry.js` — thresholds, rooms and the update interval are all defined
at the top of that file. To use a real ESP32 later, replace the `simulate()`
call with a `fetch()` to the device endpoint; the rest of the dashboard keeps
working unchanged.

## How to test the approval flow

1. Open `index.html` and sign in as `ADMIN001` / `admin123`.
2. Sign out, then register a **personnel** account.
3. Try to sign in with it — you are sent to `pending.html` because it is not approved yet.
4. Sign in as the administrator again and press **Accept** on the pending row.
5. Sign in as the personnel account — the dashboard unlocks.

## Files

```
index.html  register.html  pending.html  dashboard-monitor.html
dashboard-student.html  dashboard-personnel.html  admin.html
css/theme.css      theme (gradient #00B6FB → #0766A3), menu, gauges, tiles
js/core.js         storage, SHA-256, validation, session, route guards
js/telemetry.js    simulated ESP32 readings (MQ137 + MQ3), thresholds, rooms
js/menu.js         hamburger button, slide-in drawer, alert badge
js/login.js  register.js  pending.js  dashboard.js  admin.js  monitor.js
```

## Reset the demo data

Open the browser console (F12) and run:

```js
Aero.resetDemo()
```

This deletes every account, re-creates the default administrator and clears
the simulated sensor readings.

## Notes

- Passwords are stored as salted SHA-256 hashes. This is fine for a local demo,
  but a real deployment must hash on a server you control.
- Because data lives in `localStorage`, accounts do **not** sync between
  devices or browsers.
- To publish it, push the folder to GitHub and import it in Vercel as a
  **static** site (Framework preset: *Other*), or run `vercel deploy`.
