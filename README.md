# Static edition

Build from the generated deployment directory: `docker build -t night-garden .`
Run private local edition with:

```
docker run --rm --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  -p 127.0.0.1:8080:8080 night-garden
```

No writable volume, host socket, credentials, worker, or provider connection is
needed. The unprivileged server supports only static GET/HEAD, without directory
listing. Do not expose the private edition on a public interface.

Publish only `site/` for GitHub Pages (including `.nojekyll`); relative links work
under a project subpath. The included Vercel configuration publishes `site/` at
the domain root. Publish only the public edition to either public host.

The public edition is a curated presentation: private state, mission IDs, notes,
snapshots, workspace data, and raw receipts are not included. PNG metadata and
SVG text/metadata are removed; visible illustration pixels remain unchanged.
Public captions are general descriptions rather than operational evidence.

Source payloads and manifests are deterministic. The Python base image tag is
not digest-pinned, so a rebuilt container is not claimed to be bit reproducible.
