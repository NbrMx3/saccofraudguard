# SaccoFraudGuard

## Presentation demo

Use the **Demo Scenario** action in the administrator dashboard to submit three rapid transfers from **Stima Sacco** to **Kirobon Chamaa Group** and trigger the cross-institution velocity alert.

Demo institution IDs:

- Stima Sacco: `SAC-STIMA-001`
- Kirobon Chamaa Group: `CHA-KIROBON-001`

Seeded demo accounts are `STIMA-DEMO-001` and `KIROBON-DEMO-001`. The login page displays the administrator ID (`ADM001`); use only credentials configured by the local seed/environment.

## Run locally

```bash
pnpm setup
pnpm db:seed
pnpm dev
```
