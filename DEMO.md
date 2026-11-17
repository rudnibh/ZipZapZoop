# ZipZapZoop — Professor Demo Guide

A practical script for showing ZipZapZoop in **5 minutes** (with a **30-second**
fallback and a **2-minute** version).

The goal is not to show a polished landing page. The goal is to make one idea
unmistakable:

> **A five-digit code can be a live TCP port. The file is staged locally, served
> over a raw socket, and the sender gets a delivery receipt when the stream
> completes.**

---

## 1. The one-slide explanation

```text
Sender browser ──POST /upload──▶ Java FileController
                                      │
                                      ├─ saves file in OS temp dir
                                      ├─ picks a random port (49152–65535)
                                      └─ opens ServerSocket on that port
                                                │
                                      returns {"port": 54321}
                                                │
Sender UI shows code + QR ◀─────────────────────┘
                                                │
Receiver ──GET /download/54321──▶ Java FileController
                                      │
                                      └─ connects to localhost:54321
                                                │
                                      "Filename: ..." + file bytes
                                                │
Receiver browser ◀──────────────────────────────┘
                                                │
Sender polls GET /status/54321 ─────────────────┘
                                      → {"status":"sent"}
                                      → UI flips to "Delivered"
```

Say this out loud:

> “The code is not a database key. It is the actual TCP port the sender's file
> server is listening on. The Java service connects to that socket when the
> receiver asks for the file.”

---

## 2. Before the demo (5-minute checklist)

### Build and start everything

Use three terminals from the repository root.

```bash
# Terminal 1 — Java backend
mvn clean package
java -jar target/p2p-1.0-SNAPSHOT.jar
```

```bash
# Terminal 2 — Next.js UI
cd ui
npm install          # only the first time
npm run build
npm run start -- -H 0.0.0.0 -p 3000
```

```bash
# Terminal 3 — public tunnel (only if the phone is not on the same LAN)
cloudflared tunnel --url http://localhost:3000 --no-autoupdate
```

Copy the `https://…trycloudflare.com` URL that `cloudflared` prints. **Open that
URL on the laptop too**, not `localhost`. The QR code uses the page's origin, so
both devices must use the same reachable origin.

### Prepare the demo file

- Pick a **3–8 MB photo or PDF** with visible content. The sender card shows an
  image thumbnail, which looks better than a `.txt` file.
- Keep a **small text file** as a backup in case the phone download is slow.
- Do **not** use a confidential file. The demo has no encryption or auth.

### Prepare the devices

- Phone: Wi-Fi on, **Do Not Disturb** on, screen brightness high, camera ready.
- Laptop: browser zoom **110%**, unrelated tabs closed, notifications off.
- Keep the **sender tab visible** during the receive. The sender polls
  `/status/{port}` while its status is `ready`; starting a download in the same
  tab switches the monitor to receiver mode and stops the sender poll.
- Open the receiver on the **phone** (or a second laptop tab). Do not use the
  same tab for both sender and receiver.
- If the phone cannot reach the LAN URL, use the tunnel URL.

### Verify before you present

```bash
# The backend has no root route; "Not Found" proves the process is up.
curl -s http://localhost:8080/; echo
curl -s -o /dev/null -w 'UI: %{http_code}\n' http://localhost:3000
curl -s -o /dev/null -w 'Tunnel: %{http_code}\n' https://YOUR-TUNNEL.trycloudflare.com
```

Then run the smoke test from the README once. If it fails, fix it before the
demo, not during it.

> Each upload is **one-shot**. Every rehearsal consumes its code. Upload a fresh
> file for the real demo.

---

## 3. The 5-minute demo script

### 0:00–0:30 — Hook

**Screen:** landing page.

**Say:**

> “Every normal file share starts with someone else's server. You upload to a
> bucket, wait, and send a link. We wanted to make the handoff itself visible:
> drop a file, get a five-digit code, and let the bytes move over a TCP socket.”

Point at the three stat chips: **5-digit invite code**, **TCP socket stream**,
**0 accounts needed**.

---

### 0:30–1:00 — Show the console

**Action:** scroll to **Transfer console**.

**Say:**

> “There are two directions: share and receive. The left side is the control
> plane. The right side is a live session monitor: a progress ring, throughput,
> elapsed time, ETA, and a byte-rate trace.”

Point out:

- the **Share a file** / **Receive a file** tabs,
- the **live session** card,
- the **session log** underneath (it is stored locally in the browser).

---

### 1:00–1:30 — Stage a file

**Action:** drag the photo/PDF into the drop zone.

**Say:**

> “The first step is staging, not sending. The Java service writes the file to
> the OS temp directory and picks a random dynamic port. That port becomes the
> invite code.”

Wait for the code and QR to appear.

**Point at:**

- the five large digits,
- the QR code,
- the status line: **File staged · waiting for receiver**,
- the stats: **Upload speed**, **Uploaded**, **Waiting**.

**Say:**

> “Staged is not delivered. Nothing has been sent to another person yet. The
> server socket is open and waiting.”

---

### 1:30–2:00 — Hand off to the phone

**Action:** pick up the phone and scan the QR code.

**Say:**

> “The QR code is just a convenience wrapper around the invite link. It opens
> the receive tab with the code already filled in.”

If scanning is awkward, tap **Copy link** and open it on the phone. If the
phone is unavailable, open the link in a second laptop tab.

**Point at:** the receive tab showing the five digits filled in.

---

### 2:00–2:45 — The money shot: download and delivery receipt

**Action:** on the phone, press **Download**. Keep the laptop's sender tab
visible.

**Say:**

> “Now the receiver asks the Java service for `/download/54321`. The service
> connects to the sender's socket, reads the filename header and the bytes, and
> streams them back to the browser.”

**Point at the phone:** the progress bar, throughput, and completion toast.

**Point at the laptop:** after a moment, the sender flips from:

- **File staged · waiting for receiver** → **Delivered to receiver**,
- ring label **staged** → **delivered**,
- invite card **Session live** → **Session complete · code used**,
- history chip **Staged** → **Delivered**.

**Say:**

> “That receipt is new. The sender polls `/status/{port}` every 1.5 seconds.
> When the Java service finishes flushing the file stream, the status changes
> to `sent`, and the UI updates. This is not a guess from the upload progress;
> it is a backend lifecycle event.”

**Important nuance to say:**

> “`sent` means the Java service finished writing the stream to the download
> handler. A true end-to-end ACK from the receiver's browser is future work.”

---

### 2:45–3:15 — Show the session log

**Action:** scroll to **Recent handoffs**.

**Say:**

> “The session log is browser-local `localStorage`. The sender entry is now
> **Delivered**. On the phone, the receiver entry says **Received**. There is no
> history database.”

**Point at:** file name, size, code, time, and the **Delivered** chip.

---

### 3:15–4:15 — Explain the architecture

**Action:** show the diagram in the README, or draw four boxes:

```text
Browser (sender)  →  Java FileController  →  FileSharer / ServerSocket
       ↑                                             │
       └──────── /status polling ────────────────────┘
                              │
                    Browser (receiver)
```

**Say:**

> “There are three HTTP endpoints: `/upload`, `/download/{port}`, and
> `/status/{port}`. Uppercase: the browser is the control plane. The Java
> process is the data plane. The actual file bytes move over a TCP `ServerSocket`
> on a port in the dynamic range. The five-digit code is that port.”

**Say:**

> “The frontend is Next.js 15 and React 19. It measures transfer speed from XHR
> progress events, so the telemetry is client-side. The backend is Java 17 with
> `HttpServer`, `ServerSocket`, and `Socket`. No database.”

---

### 4:15–4:45 — Limitations and next steps

**Say:**

> “This is a demo, not a production service. There is no auth, no encryption,
> and the codes are guessable. Each upload accepts one receiver and the status
> map is in memory, so a backend restart loses the codes. The natural next steps
> are a receiver ACK, TLS, chunked/resumable transfer, TTL cleanup, and
> authentication.”

This honesty is usually a strength in a professor demo. Do not oversell it.

---

### 4:45–5:00 — Close

**Say:**

> “ZipZapZoop makes the handoff visible: a local file, a random TCP port, a
> five-digit code, and a receipt when the stream completes. Send a file. Share a
> code. That's it.”

---

## 4. The 30-second version

If you are short on time:

1. Drop the file.
2. Say: “The Java service staged it locally and opened a TCP port; the code is
   the port.”
3. Scan the QR.
4. Download on the phone.
5. Point at the sender: “**Delivered** — the sender polled the backend status
   and got the completion event.”
6. Say: “One-shot, no accounts, no cloud bucket.”

Skip the session log and roadmap if necessary.

---

## 5. What not to claim

Avoid these claims unless you add the feature first:

- ❌ “Direct browser-to-browser P2P” — the Java service brokers the data path.
- ❌ “End-to-end encrypted” — there is no application-layer encryption.
- ❌ “BitTorrent” / “blockchain” / “WebRTC” — none are used.
- ❌ “Production-ready” — this is a classroom prototype.
- ❌ “The receiver definitely saved the file” — `sent` means the stream was
  flushed by the backend, not a browser-level ACK.
- ❌ “Unlimited file size” — browser memory and disk are real limits.

Useful phrasing instead:

- ✅ “Socket-based, server-assisted handoff.”
- ✅ “A live TCP port behind a five-digit code.”
- ✅ “Sender-side delivery receipt.”
- ✅ “One-shot, ephemeral transfer.”

---

## 6. Failure drills

### Phone cannot open the LAN URL

**Cause:** Android hotspot host-to-client routing or client isolation.

**Fix:** use the Cloudflare tunnel URL on both laptop and phone. The QR code
will then encode the reachable HTTPS origin.

### Tunnel returns `530`

**Cause:** the quick tunnel is reconnecting.

**Fix:** wait a few seconds and reload. Restarting `cloudflared` changes the URL;
update both tabs and rescan the QR.

### “No file answered on port …”

**Cause:** wrong code, code already used, or backend restarted.

**Fix:** upload the file again. Every upload gets a new code.

### Sender stays on “File staged”

**Cause:** the receiver has not completed the download, or the download failed.

**Fix:** check the receiver's error, then query:

```bash
curl http://localhost:8080/status/54321
```

Replace `54321` with the visible code.

### Sender shows “Session expired”

**Cause:** the backend restarted and lost its in-memory status map.

**Fix:** upload again. Do not reuse the old code.

### Phone download stalls

**Fix:** cancel, re-upload, and use a smaller file. Confirm both devices are on
the same tunnel URL. If the tunnel is flaky, fall back to a second laptop tab
for the receiver and explain the phone flow verbally.

### Backend port already in use

```bash
pkill -f p2p-1.0-SNAPSHOT.jar
java -jar target/p2p-1.0-SNAPSHOT.jar
```

### UI build or start fails

```bash
cd ui
npm install
npx tsc --noEmit
npm run lint
npm run build
npm run start -- -H 0.0.0.0 -p 3000
```

---

## 7. Likely Q&A

**Q: Is this really peer-to-peer?**
A: It is a socket-based, server-assisted handoff. The browser is the control
plane and the Java process is the data plane. A true browser-to-browser version
would need WebRTC signaling, ICE, and NAT traversal.

**Q: Why use a TCP port as the invite code?**
A: It makes the networking idea concrete: the code is the port that the
`ServerSocket` is listening on. It also keeps the system small enough to explain
in one sitting.

**Q: How are collisions handled?**
A: `FileSharer.offerFile()` checks a concurrent map and retries until it finds
an unused port.

**Q: What happens if two receivers use the same code?**
A: The `ServerSocket` accepts one connection and closes after the transfer. The
second attempt fails. That is the one-shot design.

**Q: How does the sender know the file was delivered?**
A: `FileSharer` records `staged`, `sending`, `sent`, or `error`. The UI polls
`/status/{port}` every 1.5 seconds while the sender is waiting. On `sent`, it
updates the monitor, toast, invite card, and local history.

**Q: Why not use a database?**
A: The file and status are ephemeral by design. The OS temp directory plus an
in-memory map is enough for a single-process demo. A production version would
need TTL cleanup and durable metadata.

**Q: What happens if the backend restarts?**
A: All codes and statuses are lost because they are in memory. The sender sees
“Session expired” and must upload again.

**Q: How would you scale it?**
A: Add authentication and rate limits, TLS, chunked/resumable transfers,
multiple downloads per upload, TTL cleanup, and a persistent status store. For
remote peers, add NAT traversal or a relay/WebRTC path.

**Q: Why is the QR code important?**
A: It removes typing on a phone and demonstrates that the invite link can carry
the code (`/?code=54321`). It is a UX layer, not a separate transfer protocol.

---

## 8. If you only have 2 minutes

Use this compressed sequence:

1. **Drop** the file.
2. **Say:** “The Java service staged it locally and opened a TCP port. The
   code is the port.”
3. **Scan** the QR.
4. **Download** on the phone.
5. **Point** at the sender's **Delivered** state and say: “The sender polls the
   backend status endpoint; this is a completion event, not an upload guess.”
6. **Close:** “One-shot, no accounts, no cloud bucket.”

---

## 9. Post-demo reset

After the demo, the code is used and the socket is closed.

```bash
# Optional: start fresh
pkill -f p2p-1.0-SNAPSHOT.jar
java -jar target/p2p-1.0-SNAPSHOT.jar
```

Then reload the UI and upload a new file. Restarting the backend clears staged
statuses; old codes are invalid.

---

## 10. Quick reference

| Item | Value |
| --- | --- |
| UI (local) | `http://localhost:3000` |
| Backend | `http://localhost:8080` |
| Start backend | `java -jar target/p2p-1.0-SNAPSHOT.jar` |
| Start UI (prod) | `cd ui && npm run build && npm run start -- -H 0.0.0.0 -p 3000` |
| Start UI (dev) | `cd ui && npm run dev` |
| Public tunnel | `cloudflared tunnel --url http://localhost:3000 --no-autoupdate` |
| Upload API | `POST /upload` (`multipart/form-data`, field `file`) |
| Download API | `GET /download/{port}` |
| Status API | `GET /status/{port}` |
| Status values | `staged` → `sending` → `sent` / `error` |
| Code range | `49152–65535` |
| Storage | `${java.io.tmpdir}/zipzapzoop-uploads` |
| Transfer limit | One receiver per upload |
| Sender receipt | Poll `/status/{port}` every 1.5 s while staged |
