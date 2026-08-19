# Credential visibility boundary

`AUTH_CREDENTIALS.visible_pin` exists because the Sunbot Ops owner explicitly requires Admin to be able to view and reset staff login PINs from the operational backend and Admin UI, following the established PEFSO operating pattern.

Security boundaries:
- The GitHub repository is public and must never contain real PIN values or default PIN literals.
- PIN values live only in the private production Google Sheet and are available only to users who have access to that backend.
- Authentication still uses an HMAC verifier with a pepper stored in Apps Script Properties; the public source does not contain the pepper.
- Changing `visible_pin` in the private backend causes the verifier to be synchronized at login.
- User disable/enable and PIN reset actions are audit logged.

This is an operational-security tradeoff selected for the current internal team size. If Sunbot Ops later expands to a larger external collaborator network, migrate from visible reusable PINs to Admin-triggered one-time reset codes or invite links.
