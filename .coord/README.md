# .coord/ — GitHub-backed message queue

This directory only exists on the `coord` branch. It is the M4↔M1 message
queue for the BW-Trader coord daemon.

- `inbox/<task_id>.json` — dispatch (M4) writes tasks here
- `outbox/<task_id>.json` — M1 daemon writes replies here

**Never merge this branch into `main`.** The queue history is the audit log
of every command dispatch sent and every reply M1 returned.

Full protocol, schema, whitelist, and operational runbooks:

- `docs/deploy/COORD-DAEMON-PROTOCOL.md`
- `docs/deploy/COORD-DAEMON-M1-BOOTSTRAP-2026-05-15.md`
- `docs/deploy/COORD-DAEMON-DISPATCH-USAGE.md`

(Those docs are on `main`, not here.)
