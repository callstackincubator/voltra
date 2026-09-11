---
'@use-voltra/ios-client': patch
---

Decompressing a Live Activity payload whose decompressed size exceeds eight times its compressed size no longer truncates the payload. The decoder previously sized its output buffer at a fixed multiple of the compressed bytes, so highly repetitive payloads could decode to cut-off JSON and fail to render.
