# SUNBOT OPS V2 review route

- Review URL uses the proven Apps Script `?view=ceo-test` route.
- `renderServerTestView_()` delegates to `renderOpsApp_('USR-TUONGVAN1906')`.
- The view is server-rendered and reads live data from `SUNBOT_OPS_DATABASE`.
- No `google.script.run`, no RawGitHack, no GitHub Pages dependency for review.
- GitHub remains the source repository; Google Sheets/Drive remain the operational backend.
