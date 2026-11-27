// Website backend: the Apps Script web app inside "ARM - DataSheet v1" (datasheet-backend/Website.gs).
window.ARM_CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbw1crfUNj8fcPeE9i-nuqLN5-cQui0dyeiiTSyXVDL3h3IGMgXjwXRUmINhq6U1eRMKzA/exec",
  // OAuth Web client ID for admin Google sign-in (README, step 3). Also paste it in apps-script/Admin.gs.
  GOOGLE_CLIENT_ID: "",
  // These pages stay "being built" until their data is connected to the DataSheet.
  ADMIN_READY: false,
  PROJECTS_READY: true
};

// Local testing: on localhost the site uses the test backend in dev/mock_server.py,
// so practice sign-ups never reach the real DataSheet. Add ?live to test against the real one.
// Add ?nobackend to a local address to preview the "being built" notices.
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !location.search.includes("live")) {
  window.ARM_CONFIG.SCRIPT_URL = location.search.includes("nobackend") ? "" : "/mock-api";
  window.ARM_CONFIG.ADMIN_READY = true;
  window.ARM_CONFIG.PROJECTS_READY = true;
}
