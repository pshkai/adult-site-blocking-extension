# Never Give Up Site Blocker

A Manifest V3 Chrome extension that blocks adult websites and redirects the browser to an encouragement page with the requested motivational video.

## How it works

- Downloads the public StevenBlack adult-domain hosts list from `https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/porn/hosts`.
- Parses host entries into domains and stores them in Chrome local storage.
- Adds dynamic `declarativeNetRequest` rules for top-level navigation.
- Uses a small built-in fallback list so blocking still works before the first successful update.

## Local install

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select this project folder.

## Notes

Chrome limits how many dynamic rules an extension can register, so this project caps the downloaded list to 4,500 domains. The webNavigation listener uses the stored list as an additional guard for typed URLs and direct navigation.
