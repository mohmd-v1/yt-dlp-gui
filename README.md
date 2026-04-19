# YT-DLP GUI

A modern, professional desktop application for downloading videos using yt-dlp with an intuitive graphical interface.
<img width="1227" height="840" alt="image" src="https://github.com/user-attachments/assets/cc5d9ffa-0e7f-4940-ac3b-da37a1086c3d" />

## Features

- 🎨 **Modern UI**: Professional dark theme with smooth animations
- 🎬 **Format Selection**: Choose from video-only, audio-only, or mixed formats
- 📊 **Quality Badges**: Color-coded resolution and codec indicators
- ⚙️ **Advanced Settings**: Metadata embedding, subtitles, cookies support
- 🚀 **Quick Actions**: One-click M4A audio download
- 💾 **Persistent Settings**: Your preferences are saved automatically
- 🔒 **Cookie Authentication**: Support for private/restricted videos
- 📁 **Custom Download Path**: Choose where to save your files

## Requirements

- **yt-dlp**: Must be installed and available in PATH
- **ffmpeg**: Required for merging video and audio streams

## Installation

### Option 1: Pre-built Release
1. Download the latest release from the `dist/yt_dlp_gui` folder
2. Ensure `yt-dlp.exe` and `ffmpeg.exe` are in the same folder
3. Run `yt_dlp_gui-win_x64.exe`

### Option 2: Build from Source
1. Install [Neutralinojs](https://neutralino.js.org/docs/getting-started/your-first-neutralinojs-app)
2. Clone this repository
3. Run `neu build`
4. Copy `yt-dlp.exe` and `ffmpeg.exe` to `dist/yt_dlp_gui/`

## Usage

1. **Paste URL**: Enter a video URL in the input field
2. **Analyze**: Click "Analyze" to fetch available formats
3. **Select Format**: Choose from Video Only, Audio Only, or Mixed tabs
4. **Download**: Click on your preferred quality and hit "Download"

### Quick M4A Download
Click the "M4A" button for instant audio download without format selection.

### Settings
- **Download Location**: Choose custom download folder
- **Cookies File**: Use cookies for authentication
- **Metadata Options**: Embed thumbnails and metadata
- **Download Behavior**: Configure playlist handling and error management

## Keyboard Shortcuts

- `Ctrl+S`: Open Settings
- `Ctrl+D`: Start Download (when format is selected)

## Technical Details

- **Framework**: Neutralinojs 6.4.0
- **Languages**: HTML, CSS, JavaScript
- **Backend**: yt-dlp CLI
- **Architecture**: Lightweight native application (~5MB)

## License

MIT License - See LICENSE file for details

## Credits

- Built with [Neutralinojs](https://neutralino.js.org/)
- Powered by [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- Uses [ffmpeg](https://ffmpeg.org/) for media processing

## Version

Current Version: 2.0.0
