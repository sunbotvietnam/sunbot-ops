const SERVER_TEST_VIEW_KEY = 'ceo-test';

function renderServerTestView_() {
  // Stable review route: server-rendered V2 dashboard using live Google Sheet data.
  // Deliberately bypasses legacy Index.html, google.script.run, external JS loading,
  // RawGitHack and GitHub Pages so the CEO can always review one deterministic URL.
  return renderOpsApp_('USR-TUONGVAN1906');
}
