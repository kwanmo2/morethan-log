const LEGACY_REDIRECTS = [
  [
    "thunderscope-open-source-pc-streaming-oscilloscope",
    "/en/computer-science/thunderscope-open-source-pc-streaming-oscilloscope",
  ],
  [
    "cerebras-wse-3-wafer-scale-engine",
    "/en/computer-science/cerebras-wse-3-wafer-scale-engine",
  ],
  [
    "computer-vision-in-world-cup",
    "/en/computer-vision/computer-vision-in-world-cup",
  ],
  [
    "between-ingaas-and-si-swir-nir-cmos",
    "/en/camera/between-ingaas-and-si-swir-nir-cmos",
  ],
  [
    "starbucks-computer-vision-inventory-failure",
    "/en/computer-vision/starbucks-computer-vision-inventory-failure",
  ],
  [
    "shanghai-vision-china-semicon-china-2026-review",
    "/en/exhibition/shanghai-vision-china-semicon-china-2026-review",
  ],
  ["future-of-vibe-coding", "/en/daily/future-of-vibe-coding"],
  ["talkie-lm-from-1930", "/en/daily/talkie-lm-from-1930"],
  [
    "semicon-korea-2026-field-notes",
    "/en/exhibition/semicon-korea-2026-field-notes",
  ],
  [
    "building-a-16-bit-cpu-from-scratch-in-c-review",
    "/en/computer-science/building-a-16-bit-cpu-from-scratch-in-c-review",
  ],
  ["axelera-ai-250m-funding", "/en/embedded-vision/axelera-ai-250m-funding"],
  ["human-made-playlist-value", "/en/daily/human-made-playlist-value"],
  [
    "time-secured-parenting-business",
    "/en/daily/time-secured-parenting-business",
  ],
  ["moltbook-ai-agent-community", "/en/daily/moltbook-ai-agent-community"],
  ["davos-2026-harari-ai", "/en/daily/davos-2026-harari-ai"],
  ["markdown-product-lessons", "/en/daily/markdown-product-lessons"],
  [
    "lsstcam-overview-structure-performance",
    "/en/camera/lsstcam-overview-structure-performance",
  ],
  [
    "allied-vision-unified-platform-2d-machine-vision",
    "/en/daily/allied-vision-unified-platform-2d-machine-vision",
  ],
  ["genfea", "/en/embedded-vision/genfea"],
  ["comparesdcard", "/en/devboard/comparesdcard"],
  [
    "raspberry-pi-serial-bridge-workaround",
    "/en/troubleshooting/raspberry-pi-serial-bridge-workaround",
  ],
  ["gitcommand", "/en/software-development/gitcommand"],
  ["arducamquadimx477", "/en/embedded-vision/arducamquadimx477"],
  ["lettertoarcbrowser", "/en/daily/lettertoarcbrowser"],
  ["tailscaleforremote", "/en/daily/tailscaleforremote"],
  ["installgitea", "/en/workspace/installgitea"],
  ["fix-fnirsi1014d", "/en/troubleshooting/fix-fnirsi1014d"],
  ["error0-mobaxterm", "/en/troubleshooting/error0-mobaxterm"],
  ["findblogplatform", "/en/daily/findblogplatform"],
  ["about", "/en/about/about"],
  ["ax650", "/en/devboard/ax650"],
  ["roamtologseq", "/en/daily/roamtologseq"],
  ["scriptlanguage", "/en/daily/scriptlanguage"],
].map(([slug, destination]) => ({
  source: `/${slug}`,
  destination,
  permanent: true,
}))

module.exports = { LEGACY_REDIRECTS }
