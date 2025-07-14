# Job Experience Filter - Chrome Extension

A Chrome extension that filters job listings on LinkedIn based on user-set experience level using a visual dimming effect.

## Features

- **Experience Level Slider**: Set your experience level from 0-10+ years
- **Real-time Filtering**: Jobs are filtered instantly as you browse
- **Visual Dimming**: Non-matching jobs are dimmed but remain accessible
- **Smart Detection**: Automatically detects experience requirements in job descriptions
- **Persistent Settings**: Your preferences are saved across sessions
- **Modern UI**: Clean, professional popup interface
- **Accessibility**: Filtered jobs remain clickable and keyboard navigable

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the `job-experience-filter` folder
5. The extension icon will appear in your Chrome toolbar

## Usage

1. Navigate to LinkedIn Jobs (https://www.linkedin.com/jobs/)
2. Click the extension icon in your Chrome toolbar
3. Use the experience slider to set your desired experience level
4. Toggle filtering on/off as needed
5. Jobs that don't match your criteria will be dimmed
6. Hover over dimmed jobs to temporarily view them clearly

## Experience Level Mapping

- **0-1 years**: Internship positions
- **0-2 years**: Entry level positions
- **2-4 years**: Associate level positions
- **4-8 years**: Mid-Senior level positions
- **8+ years**: Director and executive positions

## How It Works

The extension analyzes job listings using:
- Job titles and descriptions
- Experience requirements mentioned in text
- Common keywords and patterns
- Years of experience specified

Jobs are filtered based on your selected experience level with a tolerance range to ensure relevant opportunities aren't missed.

## Privacy

- No data is collected or transmitted
- All filtering happens locally in your browser
- Settings are stored locally using Chrome's storage API
- No external servers or analytics

## Browser Compatibility

- Chrome (Manifest V3)
- Chromium-based browsers (Edge, Brave, etc.)

## File Structure

```
job-experience-filter/
├── manifest.json          # Extension configuration
├── popup/                 # Popup interface
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content/               # Content scripts
│   ├── content.js
│   └── content.css
├── background/            # Background service worker
│   └── background.js
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Development

To modify the extension:

1. Make changes to the source files
2. Reload the extension in `chrome://extensions/`
3. Test on LinkedIn job pages

## License

This project is open source and available under the MIT License.

## Support

For issues or feature requests, please create an issue in the project repository.

