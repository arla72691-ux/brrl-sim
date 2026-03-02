# BRRL Simulation

Accenture CNR India — BRRL Digital Transformation Simulation.

## Routes

| URL | Who uses it |
|-----|-------------|
| `/part1` | All players — AI Transformation scenarios |
| `/part2` | All players — APS / Blue Yonder scenarios |
| `/presenter` | Facilitator only — live dashboard |

## Firebase Setup (already done)

Database: `https://brrl-sim-default-rtdb.firebaseio.com`

Rules must be set to test mode (public read/write) for the session duration. Reset via the Firebase console after the session.

## Before each session

1. Open `/presenter` and click **Clear all session data** to reset scores and votes
2. Share `/part1` URL with all players
3. After Part 1 debrief, share `/part2` URL — scores carry over automatically by name

## Local development

```bash
npm install
npm start
```
