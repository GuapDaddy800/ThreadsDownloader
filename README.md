# Threads Downloader

A lightweight Chrome and Vivaldi extension that adds a download button directly to Threads posts containing photos or videos.

**Version:** 1.6.0  
**Platform:** Chromium browsers (Manifest V3)

## Features

- Download photos and available video files from a post's action row.
- Save individual files without creating a ZIP archive.
- Handle multiple media files where identifiable.
- Choose a save location for every file, or automatically save to a Downloads subfolder.
- Toggle post download buttons on or off.
- Adapts its settings popup to light and dark browser themes.

## Install

1. Download this repository as a ZIP or clone it.
2. Go to `chrome://extensions` (or `vivaldi://extensions`).
3. Enable **Developer mode**.
4. Remove or disable any earlier Threads Downloader extension.
5. Choose **Load unpacked** and select the `ThreadsDownloader` directory.
6. Refresh any open Threads tabs.

For a GitHub source checkout, choose the repository root (the folder containing `manifest.json`) when loading the unpacked extension.

## Use

On Threads, click the download icon in a post's action row. The extension downloads the media it can identify for that particular post.

To configure saving, click the extension icon:

- **Choose save location on:** your browser shows its Save As dialog for each file. You can select any folder.
- **Choose save location off:** files save automatically to your chosen subfolder under the browser's Downloads directory.

The browser may show several Save As dialogs for a multi-image post.

## Privacy and limitations

- No user accounts, analytics or third-party media downloader API.
- Threads media is resolved using post data available to your current session. Media URLs may expire, and Threads can change its markup or data formats.
- Streaming-only or `blob:` video playback without a direct video URL may not be downloadable.
- Post metadata is matched to its shortcode to avoid downloading media from neighbouring posts.
- The browser's downloads API does not allow silent selection of arbitrary destinations outside Downloads. Use Save As for that.

## Release notes

### v1.6.0 — UI and copy refresh

- Refreshed name/description presentation and settings popup.
- Reorganised help text and download preferences.
- Added light/dark theme support and accessible control labels.
- Kept v1.5.1 media extraction and download engine unchanged.

### v1.5.1 — Verified by user

- Improved post-data-based video URL resolution.
- Saved actual videos instead of image thumbnails on the tested posts.

## Testing

ZIP integrity, manifest consistency and JavaScript syntax can be validated outside a browser. Live Threads behaviour should be rechecked after installation; the download engine is unchanged from the user-tested v1.5.1 baseline.

## Credits

Extraction design was informed by an investigation of [the-tet](https://github.com/alexandercroft/the-tet) and [threads-archiver](https://github.com/jeiel85/threads-archiver). No source files from those repositories were copied.

## License

MIT — see [LICENSE](LICENSE). This is an independent community project, not affiliated with Meta or Threads.
