# BDS Marvel WordPress embed

## Build

Build the frontend in WordPress mode so client-side links use hash routing and do not require WordPress rewrite rules:

```bash
cd frontend
REACT_APP_WORDPRESS_MODE=true PUBLIC_URL=/wp-content/plugins/bds-marvel/build yarn build
```

Copy the generated `frontend/build/` directory beside `bds-marvel.php` in the installed plugin directory. Install and activate the plugin, then place `[bds_marvel]` in the page content where the experience should appear.

The WordPress page must be able to reach the FastAPI backend. Set `REACT_APP_BACKEND_URL` during the build when the API is hosted on a different origin; otherwise the app uses same-origin `/api` requests.
