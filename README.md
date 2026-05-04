# YT-DLP GUI


A modern, professional desktop application for downloading videos using yt-dlp with an intuitive graphical interface.
# Main Interface
<img width="1140" height="895" alt="Screenshot 2026-05-05 003417" src="https://github.com/user-attachments/assets/a2abebfe-5588-4670-8aed-4951efc8e893" />
<img width="687" height="650" alt="Screenshot 2026-05-04 224942" src="https://github.com/user-attachments/assets/226c109b-db63-45c2-a0c2-e5a4da6acc36" />
<img width="462" height="655" alt="Screenshot 2026-05-04 200215" src="https://github.com/user-attachments/assets/7d2ca662-f976-49ed-ad7e-899880e80903" />
<img width="1138" height="911" alt="Screenshot 2026-05-04 195141" src="https://github.com/user-attachments/assets/cc9273ab-b590-404f-aa22-f2c7e94d674d" />





## ✨ Features

- **Smart Analysis**: Automatically detects whether a URL is a single video or a playlist to optimize startup speed.
- **Advanced Format Grid**:
  - **Hierarchical Grouping**: Streams are grouped by resolution (e.g., 4K, 1080p, 720p).
  - **Smart Codec Selection**: Interactive selectors for choosing between AV01, HEVC, VP9, and AVC.
  - **Bitrate Control**: Select specific bitrate variants for each resolution/codec combination.
- **Smart Playlist Management**: 📑 Interactively select specific videos from a playlist to download.
- **Download Sections**: ⏱️ Precise time-based downloading. Select specific chapters or set custom start/end times.
- **Modern UI/UX**: High-density, glassmorphic design with premium aesthetics and smooth animations.
- **Performance Optimized**: Minimal CPU/Memory footprint with pre-calculated sorting and rendering logic.
- **Integrated Updater**: Update `yt-dlp` directly from the app settings.
- **Comprehensive Settings**: ⚙️
  - Custom download locations and cookies file support.
  - Metadata and thumbnail embedding.
  - Concurrent fragments control (`-N`) for faster downloads.
  - Filename restriction and error handling options.
## Requirements

- **yt-dlp**: Must be installed and available in PATH
- **ffmpeg**: Required for merging video and audio streams


## Download
- Get the latest ready-to-use version:
https://github.com/mohmd-v1/yt-dlp-gui/releases/download/v2/yt_dlp_gui-win.zip
https://github.com/mohmd-v1/yt-dlp-gui/releases/tag/v2

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
