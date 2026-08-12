# PIN login rollout

GitHub Pages login UI now uses email + PIN 4 digits for authorized staff accounts. Backend resolves the email to the canonical `NHAN_SU` record, then authenticates against the existing salted staff PIN hash. Raw PIN values are never committed to the repository.
