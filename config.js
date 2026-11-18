// Paste your Google Apps Script Web App URL here (see README.md, step 2).
// Example: "https://script.google.com/macros/s/AKfycb.../exec"
window.ARM_CONFIG = {
  SCRIPT_URL: "",
  // OAuth Web client ID for admin Google sign-in (README, step 3). Also paste it in apps-script/Admin.gs.
  GOOGLE_CLIENT_ID: ""
};

// Local testing: with no SCRIPT_URL, localhost uses the test backend in dev/mock_server.py.
// Add ?nobackend to a local address to preview the "being built" notices.
if (!window.ARM_CONFIG.SCRIPT_URL && /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !location.search.includes("nobackend")) {
  window.ARM_CONFIG.SCRIPT_URL = "/mock-api";
}
