# BuyMesho CI

BuyMesho CI runs automatically for pushes and pull requests targeting `main`.

The workflow validates:

- TypeScript/lint checks through `npm run lint`
- Repository structure through `npm run check:structure-gate`
- Frontend and server production build through `npm run build`

The workflow can also be started manually from the GitHub Actions tab.

Seller workspace cache/loading changes are validated through the same CI pipeline.
