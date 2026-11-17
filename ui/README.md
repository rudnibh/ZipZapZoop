# ZipZapZoop UI

The Next.js 15 frontend for ZipZapZoop. It provides the transfer console, QR
handoff, live telemetry, and local session history.

For the full project documentation, architecture, API reference, and demo
guide, see:

- [`../readme.md`](../readme.md)
- [`../DEMO.md`](../DEMO.md)

## Run locally

Start the Java backend first (from the repository root):

```bash
mvn clean package
java -jar target/p2p-1.0-SNAPSHOT.jar
```

Then start the UI:

```bash
cd ui
npm install
npm run dev
```

Open <http://localhost:3000>.

## Production build

```bash
cd ui
npm run build
npm run start -- -H 0.0.0.0 -p 3000
```

The UI expects the backend at `http://localhost:8080`. The rewrites in
`next.config.ts` map `/api/upload`, `/api/download/:port`, and
`/api/status/:port` to the Java endpoints.

## Checks

```bash
npx tsc --noEmit
npm run lint
npm run build
```
