# Angie's Creative Studio

Portfolio website for Angie — a 10-year-old creator from San Diego.

🌐 **Website:** [https://angiestudio.org](https://angiestudio.org) *(launching soon on AWS: S3 + CloudFront)*

🔗 **Current live site (GitHub Pages):** [https://kungfucyber89.github.io/angietheartist/](https://kungfucyber89.github.io/angietheartist/)

## Features
- The Weird Family — original hand-sculpted & 3D modeled character series
- Art & Drawings gallery with lightbox viewer
- Piano & Music section

## Project Structure
```
angietheartist/
├── index.html
├── css/styles.css
├── js/gallery.js
└── images/
    ├── weird-family/
    └── drawings/
```

## Running Locally
No build step or installs needed — it's a static site. From the project folder, start Python's built-in web server:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser. Refresh the page to see edits, and press **Ctrl+C** in the terminal to stop the server.

If port 8000 is already in use, pick another one (e.g. `python3 -m http.server 8001`).

## Deployment
- **GitHub Pages:** pushes to `main` publish to https://kungfucyber89.github.io/angietheartist/
- **AWS:** `angiestudio.org` is served from a private S3 bucket through CloudFront with a free HTTPS certificate.
