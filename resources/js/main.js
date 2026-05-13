
// State
let currentData = null;
let formats = [];
let metadata = null;
let selectedVideoId = null;
let selectedAudioId = null;
let activeTab = 'combined'; // combined, mixed
let currentDownloadProcess = null; // Track current download process
let sectionTime = ''; // Track download section time e.g. "*00:02:00-00:05:10"
let currentPlaylistData = null;
let playlistItemsToDownload = []; // Array of indices (1-indexed)
let isPlaylistMode = false;
let resolutionSelections = {}; // Track user selections per resolution: { '1920x1080': { cType: 'av01', formatId: '...' } }
let selectedSubtitles = []; // Array of language codes
let autoSubsEnabled = false;
let settings = {
    downloadPath: 'Downloads',
    cookiesPath: '',
    useCookies: false,
    embedMetadata: false,
    embedThumbnail: false,
    restrictFilenames: false,
    noPlaylist: false,
    writeSubs: false,
    ignoreErrors: false,
    concurrentFragments: 8,
    quickAudioFormat: 'opus',
    theme: 'system'
};

// Elements
const el = {
    urlInput: document.getElementById('urlInput'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    analyzePlaylistBtn: document.getElementById('analyzePlaylistBtn'),
    quickM4aBtn: document.getElementById('quickM4aBtn'),
    quickAudioLabel: document.getElementById('quickAudioLabel'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    contentArea: document.getElementById('contentArea'),
    videoInfo: document.getElementById('videoInfo'),
    videoThumbnail: document.getElementById('videoThumbnail'),
    gridBody: document.getElementById('gridBody'),
    videoGridBody: document.getElementById('videoGridBody'),
    audioGridBody: document.getElementById('audioGridBody'),
    subSelectorWrapper: document.getElementById('subSelectorWrapper'),
    subMultiSelect: document.getElementById('subMultiSelect'),
    subCountText: document.getElementById('subCountText'),
    subOptionsList: document.getElementById('subOptionsList'),
    dualView: document.getElementById('dualView'),
    standardView: document.getElementById('standardView'),
    emptyState: document.getElementById('emptyState'),
    tabs: document.querySelectorAll('.tab-btn'),
    cmdPreview: document.getElementById('cmdPreview'),
    downloadBtn: document.getElementById('downloadBtn'),
    downloadSectionBtn: document.getElementById('downloadSectionBtn'),
    clearSectionBadge: document.getElementById('clearSectionBadge'),
    clearFormatBadge: document.getElementById('clearFormatBadge'),
    formatTooltip: document.getElementById('formatTooltip'),
    selectedFormatInfoText: document.getElementById('selectedFormatInfoText'),
    toggleSettings: document.getElementById('toggleSettings'),
    toggleCommand: document.getElementById('toggleCommand'),
    videoOnlyNote: document.getElementById('videoOnlyNote'),
    settingsModal: document.getElementById('settingsModal'),
    commandModal: document.getElementById('commandModal'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    closeCommandBtn: document.getElementById('closeCommandBtn'),
    statusMsg: document.getElementById('statusMsg'),
    inputs: {
        path: document.getElementById('downloadPath'),
        browse: document.getElementById('browseBtn'),
        cookiesPath: document.getElementById('cookiesPath'),
        useCookies: document.getElementById('useCookies'),
        browseCookies: document.getElementById('browseCookiesBtn'),
        clearCookies: document.getElementById('clearCookiesBtn'),
        embedMeta: document.getElementById('embedMetadata'),
        embedThumb: document.getElementById('embedThumbnail'),
        restrict: document.getElementById('restrictFilenames'),
        noPlaylist: document.getElementById('noPlaylist'),
        writeSubs: document.getElementById('writeSubs'),
        ignoreErrors: document.getElementById('ignoreErrors'),
        concurrentFragments: document.getElementById('concurrentFragments'),
        quickAudioFormat: document.getElementById('quickAudioFormat'),
        themeSelect: document.getElementById('themeSelect')
    },
    ytdlpVersionText: document.getElementById('ytdlpVersionText'),
    ffmpegVersionText: document.getElementById('ffmpegVersionText'),
    updateYtdlpBtn: document.getElementById('updateYtdlpBtn'),
    modal: {
        self: document.getElementById('progressModal'),
        bar: document.getElementById('progressBar'),
        log: document.getElementById('progressLog'),
        close: document.getElementById('closeModalBtn'),
        open: document.getElementById('openFolderBtn'),
        cancel: document.getElementById('cancelDownloadBtn'),
        processing: document.getElementById('processingView'),
        success: document.getElementById('successView')
    },
    sections: {
        modal: document.getElementById('sectionsModal'),
        closeBtn: document.getElementById('closeSectionsBtn'),
        startH: document.getElementById('startH'),
        startM: document.getElementById('startM'),
        startS: document.getElementById('startS'),
        endH: document.getElementById('endH'),
        endM: document.getElementById('endM'),
        endS: document.getElementById('endS'),
        applyBtn: document.getElementById('applySectionBtn'),
        clearBtn: document.getElementById('clearSectionBtn'),
        chapterContainer: document.getElementById('chapterContainer'),
        chapterSelect: document.getElementById('chapterSelect')
    },
    playlist: {
        modal: document.getElementById('playlistModal'),
        items: document.getElementById('playlistItems'),
        closeBtn: document.getElementById('closePlaylistBtn'),
        selectAllBtn: document.getElementById('selectAllPlaylistBtn'),
        deselectAllBtn: document.getElementById('deselectAllPlaylistBtn'),
        confirmBtn: document.getElementById('confirmPlaylistBtn')
    },
    install: {
        modal: document.getElementById('installModal'),
        promptView: document.getElementById('installPromptView'),
        progressView: document.getElementById('installProgressView'),
        status: document.getElementById('installStatusText'),
        startBtn: document.getElementById('startInstallBtn'),
        exitBtn: document.getElementById('exitAppBtn'),
        skipBtn: document.getElementById('skipInstallBtn'),
        title: document.getElementById('installTitle'),
        desc: document.getElementById('installDesc'),
        progTitle: document.getElementById('progressTitle'),
        progDesc: document.getElementById('progressDesc')
    },
    alert: {
        modal: document.getElementById('alertModal'),
        title: document.getElementById('alertTitle'),
        msg: document.getElementById('alertMsg'),
        closeBtn: document.getElementById('closeAlertBtn')
    },
    dragOverlay: document.getElementById('dragOverlay')
};

function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
        root.setAttribute('data-theme', theme);
    }
}

// Watch for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settings.theme === 'system') {
        applyTheme('system');
    }
});

function showStatus(text, type = 'info') {
    if (!el.statusMsg) return;
    el.statusMsg.textContent = text;
    el.statusMsg.style.color = 'var(--text-secondary)'; // Default

    if (type === 'success') el.statusMsg.style.color = 'var(--success)';
    else if (type === 'error') el.statusMsg.style.color = 'var(--danger)';
    else if (type === 'warning') el.statusMsg.style.color = 'var(--warning)';
}

function showAlert(message, title = 'Notice') {
    el.alert.title.textContent = title;
    el.alert.msg.textContent = message;
    el.alert.modal.classList.remove('hidden');
}

el.alert.closeBtn.addEventListener('click', () => {
    el.alert.modal.classList.add('hidden');
});

let installTarget = 'ytdlp'; // 'ytdlp' or 'ffmpeg'

// Init
// Event Listeners
Neutralino.events.on("windowClose", () => {
    Neutralino.app.exit();
});

// Protocol Handler Logic (Moved here to ensure registration before init if possible, but init should be last)
Neutralino.events.on("ready", async () => {
    // Focus the window when app becomes ready (useful if launched via protocol)
    await Neutralino.window.focus();

    if (window.NL_ARGS && window.NL_ARGS.length > 0) {
        for (const arg of window.NL_ARGS) {
            if (arg.startsWith("ytdlp://")) {
                let url = arg.replace("ytdlp://", "").replace("ytdlp:", "");
                // Decode URL (in case Chrome sent encoded characters)
                try { url = decodeURIComponent(url); } catch (e) { }

                if (url) {
                    el.urlInput.value = url;
                    await analyzeUrl();
                }
            }
        }
    }

    loadSettings();
});

window.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.dragOverlay.classList.remove('hidden');
    el.dragOverlay.style.display = 'flex';

    const quickZone = document.getElementById('dropZoneQuick');
    if (e.target.closest('#dropZoneQuick')) {
        quickZone.classList.add('drag-over');
    } else {
        quickZone.classList.remove('drag-over');
    }
});

window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.relatedTarget === null || e.relatedTarget === document.documentElement) {
        el.dragOverlay.classList.add('hidden');
        el.dragOverlay.style.display = 'none';
    }
});

window.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.dragOverlay.classList.add('hidden');
    el.dragOverlay.style.display = 'none';

    const data = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
    if (data) {
        const lines = data.split('\n');
        const url = lines[0].trim();

        if (url) {
            el.urlInput.value = url;

            if (e.target.closest('#dropZoneQuick')) {
                quickM4a();
            } else {
                smartAnalyze();
            }
        }
    }
});

window.addEventListener('keydown', async (e) => {
    // Alt + 1 for Quick Audio Download
    if (e.altKey && e.key === '1') {
        e.preventDefault();
        try {
            const data = await Neutralino.clipboard.readText();
            if (data) {
                el.urlInput.value = data.trim();
                quickM4a();
            } else if (el.urlInput.value.trim()) {
                quickM4a();
            }
        } catch (err) {
            if (el.urlInput.value.trim()) quickM4a();
        }
    }
});

// Global Paste Support (Ctrl+V)
window.addEventListener('paste', (e) => {
    // If user is already in an input field (other than the URL input), don't override
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl !== el.urlInput) {
        return;
    }

    const data = (e.clipboardData || window.clipboardData).getData('text');
    if (data) {
        const url = data.trim();
        if (url) {
            // If not already in the input, set it
            if (activeEl !== el.urlInput) {
                el.urlInput.value = url;
                smartAnalyze();
            } else {
                // If they ARE in the input, the paste happens normally.
                // We just need to trigger analysis AFTER the paste value is updated.
                setTimeout(() => {
                    smartAnalyze();
                }, 50);
            }
        }
    }
});

// Check YT-DLP Installation and Version
// Check Tools Installation
async function ensureToolsInstalled() {
    const hasYtdlp = await checkYtdlp();
    if (!hasYtdlp) {
        showInstallModal('ytdlp');
        return;
    }

    const hasFfmpeg = await checkFfmpeg();
    if (!hasFfmpeg) {
        showInstallModal('ffmpeg');
    }
}

async function checkYtdlp() {
    try {
        let output = await Neutralino.os.execCommand('yt-dlp --version');
        if (output.exitCode === 0) {
            el.ytdlpVersionText.textContent = `v${output.stdOut.trim()}`;
            el.ytdlpVersionText.style.color = 'var(--success)';
            return true;
        }
    } catch (err) { }
    return false;
}

async function checkFfmpeg() {
    try {
        let output = await Neutralino.os.execCommand('ffmpeg -version');
        if (output.exitCode === 0) {
            // Parse version from "ffmpeg version 7.0.1..."
            const match = output.stdOut.match(/version\s+([^\s]+)/);
            const version = match ? match[1] : 'Installed';
            el.ffmpegVersionText.textContent = version;
            el.ffmpegVersionText.style.color = 'var(--success)';
            return true;
        }
    } catch (err) { }
    el.ffmpegVersionText.textContent = 'Not Found';
    el.ffmpegVersionText.style.color = 'var(--danger)';
    return false;
}

function showInstallModal(target) {
    installTarget = target;
    el.install.modal.classList.remove('hidden');
    el.install.promptView.classList.remove('hidden');
    el.install.progressView.classList.add('hidden');

    if (target === 'ytdlp') {
        el.install.title.textContent = 'yt-dlp Required';
        el.install.desc.textContent = "The core engine (yt-dlp) is missing. It's required to analyze and download videos. Download it now?";
        el.install.exitBtn.classList.remove('hidden');
        el.install.skipBtn.classList.add('hidden');
    } else {
        el.install.title.textContent = 'FFmpeg Recommended';
        el.install.desc.textContent = "FFmpeg is missing. It is highly recommended for merging high-quality video and audio. Install it via Winget?";
        el.install.exitBtn.classList.add('hidden');
        el.install.skipBtn.classList.remove('hidden');
    }
}

// Install Modal Listeners
el.install.exitBtn.addEventListener('click', () => {
    Neutralino.app.exit();
});

el.install.skipBtn.addEventListener('click', () => {
    el.install.modal.classList.add('hidden');
});

el.install.startBtn.addEventListener('click', async () => {
    el.install.promptView.classList.add('hidden');
    el.install.progressView.classList.remove('hidden');

    if (installTarget === 'ytdlp') {
        await downloadYtdlp();
    } else {
        await installFfmpeg();
    }
});

async function downloadYtdlp() {
    el.install.progTitle.textContent = 'Downloading yt-dlp...';
    el.install.progDesc.textContent = 'Fetching the latest version from GitHub';
    el.install.status.textContent = 'Starting download...';
    el.install.status.style.color = 'var(--accent-light)';

    const progressBar = document.getElementById('installProgressBar');
    progressBar.style.animation = 'none';
    progressBar.style.width = '0%';

    try {
        const downloadCmd = 'curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe -o yt-dlp.exe';
        let downloadFinished = false;

        const checkProgress = setInterval(async () => {
            if (downloadFinished) { clearInterval(checkProgress); return; }
            try {
                let stats = await Neutralino.filesystem.getStats('./yt-dlp.exe');
                if (stats && stats.size > 0) {
                    const currentMB = (stats.size / (1024 * 1024)).toFixed(2);
                    const percent = Math.min(Math.round((stats.size / (16 * 1024 * 1024)) * 100), 99);
                    el.install.status.textContent = `Downloaded: ${currentMB} MB...`;
                    progressBar.style.width = `${percent}%`;
                }
            } catch (e) { }
        }, 1000);

        let result = await Neutralino.os.execCommand(downloadCmd);
        downloadFinished = true;

        if (result.exitCode === 0) {
            el.install.status.textContent = 'Success! Checking FFmpeg...';
            progressBar.style.width = '100%';
            await checkYtdlpVersion();
            setTimeout(async () => {
                const hasFfmpeg = await checkFfmpeg();
                if (!hasFfmpeg) showInstallModal('ffmpeg');
                else el.install.modal.classList.add('hidden');
            }, 1500);
        } else {
            throw new Error(result.stdErr || 'Download failed');
        }
    } catch (err) {
        handleInstallError(err.message);
    }
}

async function installFfmpeg() {
    el.install.progTitle.textContent = 'Installing FFmpeg...';
    el.install.progDesc.textContent = 'Using Windows Package Manager (winget)';
    el.install.status.textContent = 'Please wait, this may take a minute...';

    const progressBar = document.getElementById('installProgressBar');
    progressBar.style.animation = 'indeterminate 2s infinite linear';
    progressBar.style.width = '100%';

    try {
        const installCmd = 'winget install "FFmpeg (Essentials Build)" --accept-source-agreements --accept-package-agreements';
        let result = await Neutralino.os.execCommand(installCmd);

        if (result.exitCode === 0) {
            el.install.status.textContent = 'FFmpeg installed successfully!';
            setTimeout(() => el.install.modal.classList.add('hidden'), 2000);
        } else {
            throw new Error(result.stdErr || 'Winget failed. You may need to install it manually.');
        }
    } catch (err) {
        handleInstallError(err.message);
    }
}

function handleInstallError(msg) {
    el.install.status.textContent = 'Error: ' + msg;
    el.install.status.style.color = 'var(--danger)';
    setTimeout(() => {
        el.install.progressView.classList.add('hidden');
        el.install.promptView.classList.remove('hidden');
    }, 4000);
}

async function checkYtdlpVersion() {
    try {
        let output = await Neutralino.os.execCommand('yt-dlp --version');
        if (output.exitCode === 0) {
            el.ytdlpVersionText.textContent = `v${output.stdOut.trim()}`;
            el.ytdlpVersionText.style.color = 'var(--success)';
        }
    } catch (err) { }
}

// Update YT-DLP
el.updateYtdlpBtn.addEventListener('click', async () => {
    el.updateYtdlpBtn.disabled = true;
    const originalText = el.updateYtdlpBtn.innerHTML;
    el.updateYtdlpBtn.innerHTML = 'Updating...';
    el.ytdlpVersionText.textContent = 'Downloading update...';
    el.ytdlpVersionText.style.color = 'var(--warning)';

    try {
        let output = await Neutralino.os.execCommand('yt-dlp -U');
        console.log("Update output:", output.stdOut);

        await checkYtdlpVersion(); // re-check after update

        if (output.stdOut.includes('Up to date') || output.stdOut.includes('Updated to')) {
            el.ytdlpVersionText.textContent += ' (Updated!)';
            el.ytdlpVersionText.style.color = 'var(--success)';
        }
    } catch (err) {
        console.error("Failed to update yt-dlp", err);
        el.ytdlpVersionText.textContent = 'Update failed!';
        el.ytdlpVersionText.style.color = 'var(--danger)';
    } finally {
        setTimeout(() => {
            el.updateYtdlpBtn.disabled = false;
            el.updateYtdlpBtn.innerHTML = originalText;
            checkYtdlpVersion(); // reset text to just the version
        }, 3000);
    }
});

// Call init at the end or here
Neutralino.init();

// Event Listeners
el.analyzeBtn.addEventListener('click', smartAnalyze);
el.analyzePlaylistBtn.addEventListener('click', smartAnalyze);
el.quickM4aBtn.addEventListener('click', quickM4a);
el.urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') smartAnalyze();
});

el.tabs.forEach(btn => {
    btn.addEventListener('click', () => {
        el.tabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = btn.dataset.tab;

        // Show/hide view containers
        if (activeTab === 'combined') {
            el.dualView.classList.remove('hidden');
            el.standardView.classList.add('hidden');
        } else {
            el.dualView.classList.add('hidden');
            el.standardView.classList.remove('hidden');
        }

        renderGrid();
    });
});

el.toggleSettings.addEventListener('click', () => {
    el.settingsModal.classList.toggle('hidden');
});

el.closeSettingsBtn.addEventListener('click', () => {
    el.settingsModal.classList.add('hidden');
});

el.toggleCommand.addEventListener('click', () => {
    el.commandModal.classList.toggle('hidden');
});

el.closeCommandBtn.addEventListener('click', () => {
    el.commandModal.classList.add('hidden');
});

const openGithubBtn = document.getElementById('openGithubBtn');
if (openGithubBtn) {
    openGithubBtn.addEventListener('click', () => {
        Neutralino.os.open('https://github.com/mohmd-v1/yt-dlp-gui');
    });
}

// Playlist Listeners
el.playlist.closeBtn.addEventListener('click', () => {
    el.playlist.modal.classList.add('hidden');
});

el.playlist.selectAllBtn.addEventListener('click', () => {
    const checks = el.playlist.items.querySelectorAll('input[type="checkbox"]');
    checks.forEach(c => c.checked = true);
});

el.playlist.deselectAllBtn.addEventListener('click', () => {
    const checks = el.playlist.items.querySelectorAll('input[type="checkbox"]');
    checks.forEach(c => c.checked = false);
});

el.playlist.confirmBtn.addEventListener('click', async () => {
    const selected = [];
    const checks = el.playlist.items.querySelectorAll('input[type="checkbox"]');
    checks.forEach(c => {
        if (c.checked) selected.push(parseInt(c.dataset.index));
    });

    if (selected.length === 0) {
        alert("Please select at least one video.");
        return;
    }

    playlistItemsToDownload = selected.sort((a, b) => a - b);
    isPlaylistMode = true;
    el.playlist.modal.classList.add('hidden');

    // Analyze the first selected item to get formats for quality selection
    const firstItem = currentPlaylistData.entries[playlistItemsToDownload[0] - 1];
    const firstUrl = firstItem.url || firstItem.webpage_url || firstItem.id;

    // Temporarily set URL input to first item to analyze its formats
    const originalUrl = el.urlInput.value;
    el.urlInput.value = firstUrl;

    // Run normal analyzeUrl but we'll need to restore the original playlist URL for command generation
    await analyzeUrl(true); // pass true to indicate we're in playlist format mode

    el.urlInput.value = originalUrl;
    updateCommand();
});

// Sections Listeners
if (el.downloadSectionBtn) {
    el.downloadSectionBtn.addEventListener('click', () => {
        el.sections.modal.classList.remove('hidden');
    });
}
if (el.sections.closeBtn) {
    el.sections.closeBtn.addEventListener('click', () => {
        el.sections.modal.classList.add('hidden');
    });
}
// Section Spinners Logic
document.querySelectorAll('.t-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = btn.getAttribute('data-target');
        const isUp = btn.classList.contains('t-up');
        const max = parseInt(btn.getAttribute('data-max'));
        const input = document.getElementById(targetId);
        if (!input) return;

        let val = parseInt(input.value) || 0;
        if (isUp) val++;
        else val--;

        if (val < 0) val = max;
        if (val > max) val = 0;

        input.value = val.toString().padStart(2, '0');
    });
});

document.querySelectorAll('.t-val').forEach(input => {
    input.addEventListener('blur', (e) => {
        let val = parseInt(e.target.value) || 0;
        const max = parseInt(e.target.previousElementSibling.getAttribute('data-max')) || 59;
        if (val < 0) val = 0;
        if (val > max) val = max;
        e.target.value = val.toString().padStart(2, '0');
    });
});

document.querySelectorAll('.time-segment').forEach(seg => {
    seg.addEventListener('wheel', (e) => {
        e.preventDefault();
        const btn = seg.querySelector(e.deltaY < 0 ? '.t-up' : '.t-down');
        if (btn) btn.click();
    });
});

const setTimePicker = (prefix, timeStr) => {
    if (!timeStr) {
        el.sections[prefix + 'H'].value = '00';
        el.sections[prefix + 'M'].value = '00';
        el.sections[prefix + 'S'].value = '00';
        return;
    }
    let parts = timeStr.split(':');
    if (parts.length === 2) parts = ['00', ...parts]; // MM:SS format
    if (parts.length === 1) parts = ['00', '00', ...parts]; // SS format

    el.sections[prefix + 'H'].value = (parts[0] || '0').toString().padStart(2, '0');
    el.sections[prefix + 'M'].value = (parts[1] || '0').toString().padStart(2, '0');
    el.sections[prefix + 'S'].value = (parts[2] || '0').toString().padStart(2, '0');
};

if (el.sections.applyBtn) {
    el.sections.applyBtn.addEventListener('click', () => {
        const startH = el.sections.startH.value;
        const startM = el.sections.startM.value;
        const startS = el.sections.startS.value;
        const endH = el.sections.endH.value;
        const endM = el.sections.endM.value;
        const endS = el.sections.endS.value;

        const start = `${startH}:${startM}:${startS}`;
        const end = `${endH}:${endM}:${endS}`;

        if (end !== "00:00:00") {
            sectionTime = `*${start}-${end}`;
            updateCommand();
            el.sections.modal.classList.add('hidden');
            el.statusMsg.textContent = 'Section Applied ✔️';
            el.downloadSectionBtn.style.color = '#4caf50'; // Make button green to indicate active

            // Show clear badge and make it flex
            if (el.clearSectionBadge) {
                el.clearSectionBadge.classList.remove('hidden');
                el.clearSectionBadge.style.display = 'flex';
            }

            setTimeout(() => el.statusMsg.textContent = 'Ready', 2000);
        } else {
            alert('Please specify an end time greater than 00:00:00.');
        }
    });
}
if (el.sections.clearBtn) {
    el.sections.clearBtn.addEventListener('click', () => {
        sectionTime = '';
        setTimePicker('start', '');
        setTimePicker('end', '');
        el.sections.chapterSelect.value = '';
        updateCommand();
        el.sections.modal.classList.add('hidden');
        el.statusMsg.textContent = 'Section Cleared';
        el.downloadSectionBtn.style.color = ''; // Reset button color

        // Hide clear badge
        if (el.clearSectionBadge) el.clearSectionBadge.classList.add('hidden');

        setTimeout(() => el.statusMsg.textContent = 'Ready', 2000);
    });
}
if (el.clearSectionBadge) {
    el.clearSectionBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        if (el.sections.clearBtn) el.sections.clearBtn.click();
    });
}
if (el.sections.chapterSelect) {
    el.sections.chapterSelect.addEventListener('change', () => {
        const val = el.sections.chapterSelect.value;
        if (val) {
            const parts = val.split('-');
            setTimePicker('start', formatDuration(parseFloat(parts[0])));
            setTimePicker('end', formatDuration(parseFloat(parts[1])));
        } else {
            setTimePicker('start', '');
            setTimePicker('end', '');
        }
    });
}

// Setting Listeners
el.inputs.browse.addEventListener('click', async () => {
    try {
        let entry = await Neutralino.os.showFolderDialog('Select Download Location');
        if (entry) {
            settings.downloadPath = entry;
            el.inputs.path.value = entry;
            updateCommand();
            saveSettings();
        }
    } catch (err) {
        console.error("Folder dialog error:", err);
    }
});

el.inputs.browseCookies.addEventListener('click', async () => {
    try {
        let entry = await Neutralino.os.showOpenDialog('Select Cookies File', {
            filters: [
                { name: 'Text Files', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (entry && entry.length > 0) {
            settings.cookiesPath = entry[0];
            el.inputs.cookiesPath.value = entry[0];
            updateCommand();
            saveSettings();
        }
    } catch (err) {
        console.error("File dialog error:", err);
    }
});

el.inputs.clearCookies.addEventListener('click', () => {
    settings.cookiesPath = '';
    el.inputs.cookiesPath.value = '';
    updateCommand();
    saveSettings();
});

const checkboxes = [
    'embedMeta', 'embedThumb', 'restrict', 'noPlaylist', 'writeSubs', 'ignoreErrors', 'useCookies'
];

checkboxes.forEach(key => {
    const checkbox = el.inputs[key];
    if (checkbox) {
        checkbox.addEventListener('change', () => {
            // Update all settings from DOM to be safe
            settings.embedMetadata = el.inputs.embedMeta.checked;
            settings.embedThumbnail = el.inputs.embedThumb.checked;
            settings.restrictFilenames = el.inputs.restrict.checked;
            settings.noPlaylist = el.inputs.noPlaylist.checked;
            settings.writeSubs = el.inputs.writeSubs.checked;
            settings.ignoreErrors = el.inputs.ignoreErrors.checked;
            settings.useCookies = el.inputs.useCookies.checked;
            updateCommand();
            saveSettings();
        });
    }
});

if (el.inputs.concurrentFragments) {
    el.inputs.concurrentFragments.addEventListener('input', () => {
        let val = parseInt(el.inputs.concurrentFragments.value);
        if (isNaN(val) || val < 1) val = 1;
        settings.concurrentFragments = val;
        updateCommand();
        saveSettings();
    });
}

if (el.inputs.quickAudioFormat) {
    el.inputs.quickAudioFormat.addEventListener('change', () => {
        settings.quickAudioFormat = el.inputs.quickAudioFormat.value;
        if (el.quickAudioLabel) {
            el.quickAudioLabel.textContent = settings.quickAudioFormat.toUpperCase();
        }
        saveSettings();
    });
}

if (el.inputs.themeSelect) {
    el.inputs.themeSelect.addEventListener('change', () => {
        settings.theme = el.inputs.themeSelect.value;
        applyTheme(settings.theme);
        saveSettings();
    });
}

function renderSubtitles() {
    if (!currentData) return;
    
    el.subOptionsList.innerHTML = '';
    const subs = currentData.subtitles || {};
    const autoSubs = currentData.automatic_captions || {};
    
    // Add Auto Captions Toggle inside dropdown
    const autoToggleRow = document.createElement('div');
    autoToggleRow.className = 'custom-option';
    autoToggleRow.style.padding = '8px 12px';
    autoToggleRow.style.borderBottom = '1px solid var(--border-light)';
    autoToggleRow.innerHTML = `
        <label class="toggle-switch" style="gap: 8px; width: 100%; cursor: pointer;">
            <input type="checkbox" id="includeAutoSubsInner" ${autoSubsEnabled ? 'checked' : ''}>
            <span class="slider" style="width: 30px; height: 16px; --slider-size: 11px;"></span>
            <span style="font-size: 10px; font-weight: 800; color: var(--text-muted);">INCLUDE AUTO</span>
        </label>
    `;
    autoToggleRow.onclick = (e) => e.stopPropagation();
    el.subOptionsList.appendChild(autoToggleRow);
    
    // Listener for the inner toggle
    setTimeout(() => {
        const toggle = document.getElementById('includeAutoSubsInner');
        if (toggle) {
            toggle.onchange = (e) => {
                autoSubsEnabled = e.target.checked;
                renderSubtitles();
                updateCommand();
            };
        }
    }, 0);

    const allSubs = { ...subs };
    if (autoSubsEnabled) {
        Object.keys(autoSubs).forEach(lang => {
            if (!allSubs[lang]) allSubs[lang] = autoSubs[lang];
        });
    }
    
    const langCodes = Object.keys(allSubs).sort();
    
    if (langCodes.length > 0) {
        el.subSelectorWrapper.classList.remove('hidden');
        langCodes.forEach(code => {
            const subInfo = allSubs[code];
            const name = subInfo[0]?.name || code;
            const isSelected = selectedSubtitles.includes(code);
            
            const option = document.createElement('div');
            option.className = `custom-option ${isSelected ? 'selected' : ''}`;
            option.style.display = 'flex';
            option.style.alignItems = 'center';
            option.style.gap = '10px';
            
            option.innerHTML = `
                <div style="width: 14px; height: 14px; border: 1.5px solid ${isSelected ? '#a855f7' : 'var(--border)'}; border-radius: 3px; display: flex; align-items: center; justify-content: center; background: ${isSelected ? '#a855f7' : 'transparent'};">
                    ${isSelected ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
                </div>
                <div style="display: flex; flex-direction: column; overflow: hidden;">
                    <span style="font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</span>
                    <span style="font-size: 9px; opacity: 0.6; font-family: var(--font-mono);">${code.toUpperCase()}</span>
                </div>
                <button class="sub-download-btn" title="Download Subtitle File" style="margin-left: auto; padding: 4px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; border-radius: 4px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </button>
            `;
            
            const isAuto = autoSubs[code] && !subs[code];
            
            const subDlBtn = option.querySelector('.sub-download-btn');
            subDlBtn.onclick = (e) => {
                e.stopPropagation();
                downloadSubtitle(code, name, subDlBtn, isAuto);
            };

            option.onclick = (e) => {
                e.stopPropagation();
                if (selectedSubtitles.includes(code)) {
                    selectedSubtitles = selectedSubtitles.filter(c => c !== code);
                } else {
                    selectedSubtitles.push(code);
                }
                renderSubtitles();
                updateCommand();
            };
            
            el.subOptionsList.appendChild(option);
        });
    } else {
        el.subSelectorWrapper.classList.add('hidden');
    }
    
    el.subCountText.textContent = `Subs (${selectedSubtitles.length})`;
    if (selectedSubtitles.length > 0) {
        el.subMultiSelect.querySelector('.custom-select-trigger').style.borderColor = '#a855f7';
        el.subCountText.style.color = '#a855f7';
        el.subCountText.style.fontWeight = '700';
    } else {
        el.subMultiSelect.querySelector('.custom-select-trigger').style.borderColor = 'rgba(168, 85, 247, 0.4)';
        el.subCountText.style.color = 'var(--text-secondary)';
        el.subCountText.style.fontWeight = '500';
    }
}

// Toggle logic for subtitle multi-select
el.subMultiSelect.querySelector('.custom-select-trigger').onclick = (e) => {
    e.stopPropagation();
    const isActive = el.subMultiSelect.classList.contains('active');
    
    // Close all other selects first
    document.querySelectorAll('.custom-select-container').forEach(c => c.classList.remove('active'));
    
    if (!isActive) {
        el.subMultiSelect.classList.add('active');
    }
};

// Global click to close
document.addEventListener('click', () => {
    el.subMultiSelect.classList.remove('active');
});

el.downloadBtn.addEventListener('click', startDownload);

function closeModal() {
    el.modal.self.classList.add('hidden');
    el.modal.log.textContent = '';
    el.modal.bar.style.width = '0%';
    el.modal.close.classList.add('hidden');
    el.modal.open.classList.add('hidden');
    el.modal.cancel.classList.add('hidden');

    // Reset view to processing
    el.modal.processing.classList.remove('hidden');
    el.modal.success.classList.add('hidden');

    // Kill process if still running
    if (currentDownloadProcess) {
        currentDownloadProcess = null;
    }
}

el.modal.close.addEventListener('click', closeModal);

el.modal.cancel.addEventListener('click', async () => {
    if (currentDownloadProcess) {
        try {
            // Kill yt-dlp and all child processes (ffmpeg, etc.)
            await Neutralino.os.execCommand(`taskkill /F /T /IM yt-dlp.exe`);
            await Neutralino.os.execCommand(`taskkill /F /T /IM ffmpeg.exe`);

            el.modal.log.textContent += '\n\n[CANCELLED] Download cancelled by user.';
            el.statusMsg.textContent = 'Download cancelled';
            currentDownloadProcess = null;

            // Show close button
            el.modal.cancel.classList.add('hidden');
            el.modal.close.classList.remove('hidden');
        } catch (err) {
            console.error('Failed to cancel download:', err);
            // Even if taskkill fails, still update UI
            el.modal.log.textContent += '\n\n[CANCELLED] Download process terminated.';
            currentDownloadProcess = null;
            el.modal.cancel.classList.add('hidden');
            el.modal.close.classList.remove('hidden');
        }
    }
});

el.modal.open.addEventListener('click', async () => {
    let path = settings.downloadPath;
    // Use the actual download path from settings
    if (path && path !== 'Downloads') {
        try {
            // Fix for Windows Explorer: Convert forward slashes to backslashes
            let winPath = path.replace(/\//g, '\\');
            await Neutralino.os.execCommand(`explorer "${winPath}"`);
        } catch (err) {
            console.error("Failed to open folder:", err);
        }
    } else {
        // Fallback to system downloads if no custom path
        try {
            const downloadsPath = await Neutralino.os.getPath('downloads');
            let winPath = downloadsPath.replace(/\//g, '\\');
            await Neutralino.os.execCommand(`explorer "${winPath}"`);
        } catch (err) {
            console.error("Failed to open folder:", err);
        }
    }
});

async function loadSettings() {
    try {
        const data = await Neutralino.storage.getData('settings');
        if (data) {
            const saved = JSON.parse(data);
            settings = { ...settings, ...saved };
        }
    } catch (err) {
        // No settings saved yet, ignore
    }

    // Strict Path Logic: If 'Downloads' (default) or empty, resolve absolute system path.
    if (settings.downloadPath === 'Downloads' || !settings.downloadPath) {
        try {
            settings.downloadPath = await Neutralino.os.getPath('downloads');
        } catch (e) {
            console.error("Could not get system downloads path:", e);
            // Fallback to explicit ./Downloads if all else fails, but we want strictness.
        }
    }

    // Sync UI - Make sure cookies path is displayed
    el.inputs.path.value = settings.downloadPath;
    el.inputs.useCookies.checked = settings.useCookies || false;
    el.inputs.cookiesPath.value = settings.cookiesPath || '';
    el.inputs.embedMeta.checked = settings.embedMetadata;
    el.inputs.embedThumb.checked = settings.embedThumbnail;
    el.inputs.restrict.checked = settings.restrictFilenames;
    el.inputs.noPlaylist.checked = settings.noPlaylist;
    el.inputs.writeSubs.checked = settings.writeSubs;
    el.inputs.ignoreErrors.checked = settings.ignoreErrors;
    el.inputs.concurrentFragments.value = settings.concurrentFragments || 1;
    el.inputs.quickAudioFormat.value = settings.quickAudioFormat || 'm4a';
    el.inputs.themeSelect.value = settings.theme || 'system';
    
    applyTheme(settings.theme || 'system');
    
    if (el.quickAudioLabel) {
        el.quickAudioLabel.textContent = (settings.quickAudioFormat || 'm4a').toUpperCase();
    }

    // Log cookies status for debugging
    if (settings.cookiesPath) {
        console.log("Cookies file loaded:", settings.cookiesPath);
    }

    updateCommand();
}

async function saveSettings() {
    try {
        await Neutralino.storage.setData('settings', JSON.stringify(settings));
        showStatus('Settings Saved', 'success');
        setTimeout(() => showStatus('Ready'), 2000);
    } catch (err) {
        console.error("Failed to save settings:", err);
    }
}

// Logic
async function smartAnalyze() {
    const url = el.urlInput.value.trim();
    if (!url) return;

    setLoading(true);
    resetSelection();
    isPlaylistMode = false;
    playlistItemsToDownload = [];

    try {
        let cookiesArg = settings.cookiesPath ? `--cookies "${settings.cookiesPath}"` : '';

        // Optimization: If URL doesn't look like a playlist, skip the flat-playlist check
        const looksLikePlaylist = url.includes('list=') || url.includes('/playlist?');

        if (!looksLikePlaylist) {
            await analyzeUrl();
            return;
        }

        // Speed Boost: --no-check-certificates, --no-warnings, --no-call-home
        let command = `yt-dlp -J --flat-playlist --no-check-certificates --no-warnings --no-call-home ${cookiesArg} "${url}"`;
        console.log("Smart Analysis (Playlist Check):", command);

        let output = await Neutralino.os.execCommand(command);

        if (output.exitCode !== 0) {
            showAlert(output.stdErr, 'Analysis Error');
            setLoading(false);
            return;
        }

        const data = JSON.parse(output.stdOut);

        // Check if it's a playlist with multiple entries
        if (data.entries && data.entries.length > 1) {
            currentPlaylistData = data;
            populatePlaylistModal(data);
            el.playlist.modal.classList.remove('hidden');
            setLoading(false);
        } else {
            // It's a single video or a 1-item playlist
            // Proceed to full analysis for formats
            await analyzeUrl();
        }

    } catch (e) {
        showAlert(e.message, 'Analysis Exception');
        setLoading(false);
    }
}

function populatePlaylistModal(data) {
    el.playlist.items.innerHTML = '';
    data.entries.forEach((entry, idx) => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '10px';
        item.style.padding = '8px';
        item.style.borderBottom = '1px solid var(--border-light)';

        const index = idx + 1;
        item.innerHTML = `
            <input type="checkbox" id="pl-item-${index}" data-index="${index}" checked style="width: 18px; height: 18px; cursor: pointer;">
            <label for="pl-item-${index}" style="flex: 1; cursor: pointer; font-size: 13px;">
                <span style="color: var(--accent-light); font-weight: bold; margin-right: 5px;">${index}.</span>
                ${entry.title || 'Unknown Title'}
                ${entry.duration ? `<span style="color: var(--text-muted); font-size: 11px; margin-left: 10px;">(${formatDuration(entry.duration)})</span>` : ''}
            </label>
        `;
        el.playlist.items.appendChild(item);
    });
}

async function analyzeUrl(isPlaylistFormatMode = false) {
    const url = el.urlInput.value.trim();
    if (!url) return;

    setLoading(true);
    resetSelection();

    try {
        // Speed Boost: --no-check-certificates, --no-warnings, --no-call-home
        let cookiesArg = (settings.useCookies && settings.cookiesPath) ? `--cookies "${settings.cookiesPath}"` : '';
        let command = `yt-dlp -J --no-playlist --no-check-certificates --no-warnings --no-call-home ${cookiesArg} "${url}"`;
        console.log("Analyzing:", command);

        let output = await Neutralino.os.execCommand(command);

        if (output.exitCode !== 0) {
            showAlert(output.stdErr, 'Analysis Error');
            setLoading(false);
            return;
        }

        const data = JSON.parse(output.stdOut);
        currentData = data;
        metadata = data;
        formats = data.formats || [];

        // Display thumbnail if available
        if (data.thumbnail) {
            el.videoThumbnail.src = data.thumbnail;
            el.videoThumbnail.classList.remove('hidden');
        } else {
            el.videoThumbnail.classList.add('hidden');
        }

        // Setup Chapters for Sections Modal
        if (data.chapters && data.chapters.length > 0) {
            el.sections.chapterSelect.innerHTML = '<option value="">-- Custom Time --</option>';
            data.chapters.forEach((ch, idx) => {
                const opt = document.createElement('option');
                opt.value = `${ch.start_time}-${ch.end_time}`;
                opt.textContent = `${idx + 1}. ${ch.title} (${formatDuration(ch.start_time)} - ${formatDuration(ch.end_time)})`;
                el.sections.chapterSelect.appendChild(opt);
            });
            el.sections.chapterContainer.classList.remove('hidden');
        } else {
            el.sections.chapterContainer.classList.add('hidden');
        }

        // Display video info
        let title = data.title || 'Unknown Title';
        if (isPlaylistFormatMode) {
            title = `[Playlist Selection] ${title}`;
        }
        let duration = data.duration ? formatDuration(data.duration) : 'N/A';
        let uploader = data.uploader || 'Unknown';
        el.videoInfo.textContent = `${title} | Duration: ${duration} | Uploader: ${uploader}`;

        el.emptyState.classList.add('hidden');
        el.contentArea.classList.remove('hidden');

        renderGrid();
        renderSubtitles();
        updateCommand(); // Initial command update

    } catch (e) {
        showAlert(e.message, 'Fetch Exception');
    } finally {
        setLoading(false);
    }
}

async function quickM4a() {
    const url = el.urlInput.value.trim();
    if (!url) {
        showAlert('Please enter a URL first.', 'Input Required');
        return;
    }

    resetSelection();

    let path = settings.downloadPath;
    let pathArg = path ? `-P "${path}"` : '';
    let cookiesArg = (settings.useCookies && settings.cookiesPath) ? `--cookies "${settings.cookiesPath}"` : '';

    let cmd = '';
    if (settings.quickAudioFormat === 'opus') {
        // Opus: -f 251 -x --audio-format opus --embed-metadata --embed-thumbnail
        cmd = `yt-dlp -f 251 -x --audio-format opus --embed-metadata --embed-thumbnail --no-playlist ${cookiesArg} ${pathArg} "${url}"`;
    } else {
        // M4A: -f 140 --embed-metadata --embed-thumbnail
        cmd = `yt-dlp -f 140 --embed-metadata --embed-thumbnail --no-playlist ${cookiesArg} ${pathArg} "${url}"`;
    }

    el.cmdPreview.value = cmd;
    startDownload();
}

function renderGrid() {
    // Clear all
    el.gridBody.innerHTML = '';
    el.videoGridBody.innerHTML = '';
    el.audioGridBody.innerHTML = '';

    const duration = currentData?.duration || 1;

    // Tab Visibility Logic (Auto-switch if needed)
    const counts = {
        combined: formats.filter(f => (f.acodec === 'video only' || f.acodec === 'none' || f.vcodec === 'audio only' || f.vcodec === 'none')).length,
        mixed: formats.filter(f => {
            const isStandaloneVideo = (f.acodec === 'video only' || f.acodec === 'none');
            const isStandaloneAudio = (f.vcodec === 'audio only' || f.vcodec === 'none');
            return !isStandaloneVideo && !isStandaloneAudio && f.vcodec !== 'none' && f.acodec !== 'none';
        }).length
    };

    // Ensure we are in a valid tab
    if (counts[activeTab] === 0) {
        if (counts.combined > 0) activeTab = 'combined';
        else if (counts.mixed > 0) activeTab = 'mixed';
    }

    // Update active class on buttons
    el.tabs.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === activeTab);
        btn.classList.toggle('hidden', counts[btn.dataset.tab] === 0);
    });

    if (activeTab === 'combined') {
        el.dualView.classList.remove('hidden');
        el.standardView.classList.add('hidden');

        // Filter Video Only
        const videoOnly = formats.filter(f => (f.acodec === 'video only' || f.acodec === 'none') && (f.vcodec !== 'none' && f.vcodec !== 'audio only'));
        // Group and render Video
        renderDualColumn('video', videoOnly);

        // Filter Audio Only
        const audioOnly = formats.filter(f => (f.vcodec === 'audio only' || f.vcodec === 'none') && (f.acodec !== 'none' && f.acodec !== 'video only'));
        renderAudioColumn(audioOnly);

    } else if (activeTab === 'mixed') {
        el.dualView.classList.add('hidden');
        el.standardView.classList.remove('hidden');

        const mixedFormats = formats.filter(f => {
            const isStandaloneVideo = (f.acodec === 'video only' || f.acodec === 'none');
            const isStandaloneAudio = (f.vcodec === 'audio only' || f.vcodec === 'none');
            return !isStandaloneVideo && !isStandaloneAudio && f.vcodec !== 'none' && f.acodec !== 'none';
        });

        // Use resolution grouping for Mixed
        renderDualColumn('mixed', mixedFormats, el.gridBody);
    }
}

function renderDualColumn(type, filtered, container = null) {
    const groups = {};
    const codecPriority = { 'av01': 5, 'hevc': 4, 'vp9': 3, 'avc': 2, 'unknown': 1, 'other': 0 };

    filtered.forEach(f => {
        const resKey = f.width ? `${f.width}x${f.height}` : (f.format_note || f.format_id || 'Unknown');
        if (!groups[resKey]) groups[resKey] = {};

        const vc = (f.vcodec || '').toLowerCase();
        let cType = 'unknown';
        if (vc.includes('av01')) cType = 'av01';
        else if (vc.includes('vp9')) cType = 'vp9';
        else if (vc.includes('avc') || vc.includes('h264') || vc.includes('mp4v')) cType = 'avc';
        else if (vc.includes('hev') || vc.includes('hvc') || vc.includes('h265')) cType = 'hevc';
        else if (vc && vc !== 'none' && vc !== 'unknown') cType = 'other';

        if (!groups[resKey][cType]) groups[resKey][cType] = [];
        groups[resKey][cType].push(f);
    });

    const sortedResKeys = Object.keys(groups).sort((a, b) => {
        const [w1, h1] = a.split('x').map(Number);
        const [w2, h2] = b.split('x').map(Number);
        return (w2 * h2 || 0) - (w1 * h1 || 0);
    });

    sortedResKeys.forEach(resKey => {
        const resGroup = groups[resKey];
        const availableCTypes = Object.keys(resGroup).sort((a, b) => codecPriority[b] - codecPriority[a]);

        let currentCType = resolutionSelections[resKey]?.cType;
        if (!currentCType || !availableCTypes.includes(currentCType)) {
            currentCType = availableCTypes[0];
        }

        const variants = resGroup[currentCType].sort((a, b) => (b.tbr || b.vbr || 0) - (a.tbr || a.vbr || 0));

        // Ensure resolutionSelections is initialized for this key
        if (!resolutionSelections[resKey]) {
            resolutionSelections[resKey] = { cType: currentCType, formatId: variants[0].format_id };
        }

        let currentFormatId = resolutionSelections[resKey].formatId;
        let activeFmt = variants.find(f => f.format_id === currentFormatId) || variants[0];

        if (type === 'video') {
            renderCompactRow(activeFmt, el.videoGridBody, { resKey, ctypes: availableCTypes, activeCType: currentCType, variants, resGroup });
        } else if (type === 'mixed') {
            renderCompactRow(activeFmt, container, { resKey, ctypes: availableCTypes, activeCType: currentCType, variants, resGroup, isMixed: true, isMultiLang: true });
        } else {
            // Fallback
            renderCompactRow(activeFmt, container || el.gridBody, { resKey, ctypes: availableCTypes, activeCType: currentCType, variants, resGroup });
        }
    });
}

function renderAudioColumn(filtered) {
    const groups = {}; // codecKey -> [formats]
    const codecPriority = { 'opus': 10, 'mp4a': 5 };

    filtered.forEach(f => {
        const ac = (f.acodec || '').toLowerCase();
        const note = (f.format_note || '').toLowerCase();
        const fid = (f.format_id || '').toLowerCase();

        // DRC formats stay separate
        const isDRC = note.includes('drc') || fid.includes('drc');

        // Clean codec name (e.g., mp4a.40.2 -> mp4a)
        let codecKey = 'other';
        const codecMatch = ac.match(/^[a-z0-9]+/);
        if (ac.includes('opus')) codecKey = 'opus';
        else if (ac.includes('mp4a')) codecKey = 'mp4a';
        else if (codecMatch) codecKey = codecMatch[0];

        // Unique key for grouping: Codec + DRC status only
        const groupKey = `${isDRC ? 'DRC_' : ''}${codecKey}`;

        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(f);
    });

    // Sort groups by priority
    const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
        // DRC always last? Or just by codec priority
        const pA = codecPriority[a] || 0;
        const pB = codecPriority[b] || 0;
        return pB - pA;
    });

    sortedGroupKeys.forEach(gKey => {
        const variants = groups[gKey].sort((a, b) => (b.tbr || 0) - (a.tbr || 0));

        // Track selection for audio too
        if (!resolutionSelections[gKey]) {
            resolutionSelections[gKey] = { formatId: variants[0].format_id };
        }

        const currentFormatId = resolutionSelections[gKey].formatId;
        const activeFmt = variants.find(f => f.format_id === currentFormatId) || variants[0];

        renderCompactRow(activeFmt, el.audioGridBody, {
            resKey: gKey,
            variants,
            isAudioGrouping: true,
            isDRC: gKey.startsWith('DRC_'),
            isMultiLang: true
        });
    });
}

function createCustomSelect(options, selectedValue, onChange, placeholder = 'Select...') {
    const container = document.createElement('div');
    container.className = 'custom-select-container';

    const selectedOption = options.find(o => o.value === selectedValue) || options[0];

    container.innerHTML = `
        <div class="custom-select-trigger">
            <span>${selectedOption ? selectedOption.label : placeholder}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px; opacity: 0.6;"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
        <div class="custom-options custom-scrollbar">
            ${options.map(o => `
                <div class="custom-option ${o.value === selectedValue ? 'selected' : ''}" data-value="${o.value}">
                    ${o.label}
                </div>
            `).join('')}
        </div>
    `;

    const trigger = container.querySelector('.custom-select-trigger');
    const optionsList = container.querySelector('.custom-options');

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close other open selects
        document.querySelectorAll('.custom-select-container.active').forEach(s => {
            if (s !== container) s.classList.remove('active');
        });
        container.classList.toggle('active');
    });

    container.querySelectorAll('.custom-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = opt.dataset.value;
            container.classList.remove('active');
            if (value !== selectedValue) {
                onChange(value);
            }
        });
    });

    return container;
}

// Global click to close selects
document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-container.active').forEach(s => s.classList.remove('active'));
});

function renderCompactRow(fmt, container, smartData = null) {
    const isAudioOnly = (fmt.vcodec === 'audio only' || fmt.vcodec === 'none');
    const isMixed = smartData?.isMixed;

    const row = document.createElement('div');
    row.className = 'compact-row';
    if (isAudioOnly) row.classList.add('audio-row');
    if (isMixed) row.classList.add('mixed-row');

    if (fmt.format_id === selectedVideoId || fmt.format_id === selectedAudioId) {
        row.classList.add('selected');
    }

    const size = fmt.filesize ? formatBytes(fmt.filesize) : (fmt.filesize_approx ? '~' + formatBytes(fmt.filesize_approx) : '≈' + formatBytes(((fmt.tbr || 0) * 1024 / 8) * (currentData?.duration || 0)));
    const bitrate = Math.round(fmt.tbr || fmt.vbr || 0) + 'k';

    // Main Title
    let mainTitle = '';
    let subTitle = '';
    let icon = '';

    if (isAudioOnly) {
        const codecName = (fmt.acodec || '').split('.')[0].toUpperCase();
        mainTitle = codecName;

        subTitle = (fmt.acodec || '').split('.')[0];
        icon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--warning);"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;
    } else {
        mainTitle = smartData ? smartData.resKey : (fmt.width ? `${fmt.width}x${fmt.height}` : 'Video');
        subTitle = (fmt.vcodec || '').split('.')[0];
        if (isMixed) {
            icon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #a855f7;"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect><path d="M9 18V5l12-2v13"></path></svg>`;
        } else {
            icon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent);"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
        }
    }

    // Detail Tooltip (Native Title)
    const details = `ID: ${fmt.format_id}\nCodec: ${isAudioOnly ? fmt.acodec : fmt.vcodec}\nProtocol: ${fmt.protocol}\nFPS: ${fmt.fps || 'N/A'}`;
    row.title = details;

    const getLangInfo = (f) => {
        const match = (f.format_note || '').match(/\[(.*?)\]\s*(.*?),/);
        return { code: f.language || match?.[1] || 'und', name: match?.[2] || '' };
    };

    let langSelectContainer = null;
    if ((isAudioOnly || isMixed) && smartData?.isMultiLang) {
        const langMap = new Map();
        smartData.variants.forEach(v => {
            const info = getLangInfo(v);
            if (!langMap.has(info.code)) langMap.set(info.code, info.name);
        });

        const langOptions = Array.from(langMap).map(([code, name]) => ({
            value: code,
            label: `[${code.toUpperCase()}]${name ? ' ' + name : ''}`
        }));

        const currentLang = getLangInfo(fmt).code;

        if (langOptions.length > 1) {
            langSelectContainer = createCustomSelect(langOptions, currentLang, (newCode) => {
                const variantsForLang = smartData.variants.filter(v => getLangInfo(v).code === newCode).sort((a, b) => (b.tbr || 0) - (a.tbr || 0));
                const firstVariant = variantsForLang[0];

                if (fmt.format_id === selectedVideoId || fmt.format_id === selectedAudioId) {
                    if (isMixed) {
                        selectedVideoId = firstVariant.format_id;
                        selectedAudioId = null;
                    } else {
                        selectedAudioId = firstVariant.format_id;
                    }
                }
                resolutionSelections[smartData.resKey].formatId = firstVariant.format_id;
                renderGrid();
                updateCommand();
            });
            langSelectContainer.style.marginRight = '5px';
        } else if (isMixed && langOptions.length === 1) {
            const info = getLangInfo(fmt);
            if (info.code !== 'und') {
                const badge = document.createElement('span');
                badge.className = 'badge-pill';
                badge.style.marginRight = '5px';
                badge.textContent = `[${info.code.toUpperCase()}]`;
                langSelectContainer = badge;
            }
        }
    }

    let codecSelectContainer = null;
    if (smartData && smartData.ctypes && smartData.ctypes.length > 1) {
        const codecOptions = smartData.ctypes.map(c => ({ value: c, label: c.toUpperCase() }));
        codecSelectContainer = createCustomSelect(codecOptions, smartData.activeCType, (newCType) => {
            const variants = smartData.resGroup[newCType].sort((a, b) => (b.tbr || b.vbr || 0) - (a.tbr || a.vbr || 0));
            const firstVariant = variants[0];

            if (fmt.format_id === selectedVideoId) {
                selectedVideoId = firstVariant.format_id;
                if (isMixed) selectedAudioId = null;
            }

            resolutionSelections[smartData.resKey] = { cType: newCType, formatId: firstVariant.format_id };
            renderGrid();
            updateCommand();
        });
    } else {
        if (!isAudioOnly) {
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.alignItems = 'center';

            if (langSelectContainer) container.appendChild(langSelectContainer);

            const badge = document.createElement('span');
            badge.className = 'badge-pill';
            badge.textContent = subTitle.toUpperCase();
            container.appendChild(badge);

            codecSelectContainer = container;
        } else {
            codecSelectContainer = langSelectContainer;
        }
    }

    let bitrateSelectContainer = null;
    const filteredVars = smartData ? ((isAudioOnly || isMixed) ? smartData.variants.filter(v => getLangInfo(v).code === getLangInfo(fmt).code) : smartData.variants) : [];

    if (smartData && filteredVars.length > 1) {
        const bitOptions = filteredVars.map(v => ({
            value: v.format_id,
            label: Math.round(v.tbr || v.vbr || 0) + 'k'
        }));

        bitrateSelectContainer = createCustomSelect(bitOptions, fmt.format_id, (newId) => {
            if (fmt.format_id === selectedVideoId || fmt.format_id === selectedAudioId) {
                if (isAudioOnly) selectedAudioId = newId;
                else selectedVideoId = newId;
            }

            resolutionSelections[smartData.resKey].formatId = newId;
            renderGrid();
            updateCommand();
        });
    } else {
        const span = document.createElement('span');
        span.className = 'info-sub';
        span.textContent = Math.round(fmt.tbr || fmt.vbr || 0) + 'k';
        bitrateSelectContainer = span;
    }

    row.innerHTML = `
        <div class="info-group">
            <div class="info-main">${icon} ${mainTitle}</div>
            ${smartData?.isDRC ? `<div class="info-sub" style="color: var(--warning); font-size: 9px; margin-top: -2px; font-weight: 800; letter-spacing: 0.5px;">DRC ACTIVE</div>` : ''}
            ${!isAudioOnly && fmt.fps ? `<div class="info-sub">${fmt.fps} FPS</div>` : ''}
        </div>
        <div class="col" style="font-weight: 600; color: var(--text-secondary);">${size}</div>
        <div class="col codec-slot"></div>
        <div class="col bitrate-slot"></div>
        <div class="col" style="text-align: center;">
            <button class="copy-link-btn" title="Copy URL" style="padding: 4px; border: 1px solid var(--border); border-radius: 4px; background: rgba(255,255,255,0.02);">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
        </div>
    `;

    // Inject custom selects
    const codecSlot = row.querySelector('.codec-slot');
    const bitrateSlot = row.querySelector('.bitrate-slot');
    if (codecSelectContainer) codecSlot.appendChild(codecSelectContainer);
    if (bitrateSelectContainer) bitrateSlot.appendChild(bitrateSelectContainer);

    // Row Click
    row.addEventListener('click', (e) => {
        if (e.target.closest('.custom-select-container') || e.target.closest('.copy-link-btn')) return;
        handleRowClick(fmt, row);
    });

    const copyBtn = row.querySelector('.copy-link-btn');
    copyBtn.onclick = (e) => {
        e.stopPropagation();
        copyDirectLink(fmt.format_id, copyBtn);
    };

    container.appendChild(row);
}

function renderSmartRow(resKey, ctypes, activeCType, variants, activeFmt, resGroup) {
    const row = document.createElement('div');
    row.className = 'grid-row';
    if (activeFmt.format_id === selectedVideoId || activeFmt.format_id === selectedAudioId) {
        row.classList.add('selected');
    }

    // Determine Res Class
    let resClass = 'res-sd';
    if (activeFmt.height >= 2160) resClass = 'res-4k';
    else if (activeFmt.height >= 1440) resClass = 'res-1440';
    else if (activeFmt.height >= 1080) resClass = 'res-1080';
    else if (activeFmt.height >= 720) resClass = 'res-720';

    const size = activeFmt.filesize ? formatBytes(activeFmt.filesize) : (activeFmt.filesize_approx ? '~' + formatBytes(activeFmt.filesize_approx) : '≈' + formatBytes(((activeFmt.tbr || 0) * 1024 / 8) * (currentData?.duration || 0)));

    const codecHTML = ctypes.length > 1
        ? `<select class="res-select codec-select">
            ${ctypes.map(c => `<option value="${c}" ${c === activeCType ? 'selected' : ''}>${c.toUpperCase()}</option>`).join('')}
           </select>`
        : `<span class="badge codec-mod">${activeCType.toUpperCase()}</span>`;

    const bitrateHTML = variants.length > 1
        ? `<select class="res-select bitrate-select">
            ${variants.map(v => `<option value="${v.format_id}" ${v.format_id === activeFmt.format_id ? 'selected' : ''}>${Math.round(v.tbr || v.vbr || 0)}k</option>`).join('')}
           </select>`
        : `<span>${Math.round(activeFmt.tbr || activeFmt.vbr || 0)}k</span>`;

    row.innerHTML = `
        <div class="col">${activeFmt.format_id}</div>
        <div class="col">${activeFmt.ext}</div>
        <div class="col"><span class="badge ${resClass}">${resKey}</span></div>
        <div class="col">${activeFmt.fps || ''}</div>
        <div class="col">${size}</div>
        <div class="col">${codecHTML}</div>
        <div class="col">${activeFmt.acodec || 'none'}</div>
        <div class="col">${bitrateHTML}</div>
        <div class="col" style="text-align: center;">
            <button class="copy-link-btn" title="Copy URL">
               <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
        </div>
    `;

    // Row Click (Selection)
    row.addEventListener('click', (e) => {
        if (e.target.tagName === 'SELECT' || e.target.closest('.copy-link-btn')) return;
        handleRowClick(activeFmt, row);
    });

    // Selectors
    const codecSel = row.querySelector('.codec-select');
    if (codecSel) {
        codecSel.addEventListener('change', (e) => {
            const newCType = e.target.value;
            const variants = resGroup[newCType].sort((a, b) => (b.tbr || b.vbr || 0) - (a.tbr || a.vbr || 0));
            const firstVariant = variants[0];

            if (activeFmt.format_id === selectedVideoId) {
                selectedVideoId = firstVariant.format_id;
            }

            resolutionSelections[resKey] = { cType: newCType, formatId: firstVariant.format_id };
            renderGrid();
            updateCommand();
        });
    }

    const bitSel = row.querySelector('.bitrate-select');
    if (bitSel) {
        bitSel.addEventListener('change', (e) => {
            const newId = e.target.value;

            if (activeFmt.format_id === selectedVideoId) {
                selectedVideoId = newId;
            }

            resolutionSelections[resKey] = { cType: activeCType, formatId: newId };
            renderGrid();
            updateCommand();
        });
    }

    const copyBtn = row.querySelector('.copy-link-btn');
    copyBtn.addEventListener('click', () => copyDirectLink(activeFmt.format_id, copyBtn));

    el.gridBody.appendChild(row);
}

function renderRow(fmt) {
    const row = document.createElement('div');
    row.className = 'grid-row';
    row.dataset.id = fmt.format_id;
    if (fmt.format_id === selectedVideoId || fmt.format_id === selectedAudioId) row.classList.add('selected');

    row.onclick = () => handleRowClick(fmt, row);

    const size = fmt.filesize ? formatBytes(fmt.filesize) : (fmt.filesize_approx ? '~' + formatBytes(fmt.filesize_approx) : '≈' + formatBytes(((fmt.tbr || 0) * 1024 / 8) * (currentData?.duration || 0)));

    row.innerHTML = `
        <div class="col">${fmt.format_id}</div>
        <div class="col">${fmt.ext}</div>
        <div class="col"><span class="badge res-audio">Audio</span></div>
        <div class="col">-</div>
        <div class="col">${size}</div>
        <div class="col">-</div>
        <div class="col"><span class="badge codec-mod">${fmt.acodec}</span></div>
        <div class="col">${Math.round(fmt.tbr || 0)}k</div>
        <div class="col" style="text-align: center;">
            <button class="copy-link-btn" title="Copy URL">
               <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
        </div>
    `;
    const copyBtn = row.querySelector('.copy-link-btn');
    copyBtn.onclick = (e) => {
        e.stopPropagation();
        copyDirectLink(fmt.format_id, copyBtn);
    };
    el.gridBody.appendChild(row);
}

function handleRowClick(fmt, rowElement) {
    const isVideo = fmt.vcodec !== 'none';
    const isAudio = fmt.acodec !== 'none';
    const isMixed = isVideo && isAudio;

    // Helper to check if currently selected video is mixed
    const currentVideoIsMixed = () => {
        if (!selectedVideoId) return false;
        const f = formats.find(x => x.format_id === selectedVideoId);
        return f && f.vcodec !== 'none' && f.acodec !== 'none';
    };

    if (isMixed) {
        if (selectedVideoId === fmt.format_id) {
            selectedVideoId = null;
            selectedAudioId = null;
        } else {
            selectedVideoId = fmt.format_id;
            selectedAudioId = null; // Mixed already has audio
        }
    } else if (isVideo) {
        if (selectedVideoId === fmt.format_id) {
            selectedVideoId = null;
        } else {
            // If current selection is Mixed, clear everything first
            if (currentVideoIsMixed()) {
                selectedAudioId = null;
            }
            selectedVideoId = fmt.format_id;

            // AUTO-SELECT AUDIO: Pick the best one according to our UI priority (Opus > MP4A > others, excluding DRC)
            if (!selectedAudioId) {
                const audioOnly = formats.filter(f => (f.vcodec === 'audio only' || f.vcodec === 'none') && f.acodec !== 'none');

                // Sort by: 1. Not DRC, 2. Codec Priority, 3. Bitrate
                const codecPriority = { 'opus': 10, 'mp4a': 5 };
                const getScore = (f) => {
                    const ac = (f.acodec || '').toLowerCase();
                    const note = (f.format_note || '').toLowerCase();
                    const fid = (f.format_id || '').toLowerCase();
                    const isDRC = note.includes('drc') || fid.includes('drc');

                    let score = isDRC ? -100 : 0; // Penalize DRC
                    if (ac.includes('opus')) score += 10;
                    else if (ac.includes('mp4a')) score += 5;

                    return score;
                };

                const bestAudio = audioOnly.sort((a, b) => {
                    const scoreDiff = getScore(b) - getScore(a);
                    if (scoreDiff !== 0) return scoreDiff;
                    return (b.tbr || 0) - (a.tbr || 0); // Then by bitrate
                })[0];

                if (bestAudio) {
                    selectedAudioId = bestAudio.format_id;
                }
            }
        }
    } else if (isAudio) {
        if (selectedAudioId === fmt.format_id) {
            selectedAudioId = null;
        } else {
            // If current selection is Mixed, clear it because we want standalone audio
            if (currentVideoIsMixed()) {
                selectedVideoId = null;
            }
            selectedAudioId = fmt.format_id;
        }
    }

    renderGrid(); // Re-render to show selection visuals
    updateCommand();
}

function updateCommand() {
    if (!currentData) return;

    let formatPart = '';

    if (selectedVideoId && selectedAudioId) {
        formatPart = `-f ${selectedVideoId}+${selectedAudioId}`;
    } else if (selectedVideoId) {
        formatPart = `-f ${selectedVideoId}`;
    } else if (selectedAudioId) {
        formatPart = `-f ${selectedAudioId}`;
    } else {
        // Default best
        formatPart = ''; // checks default behavior, usually bestvideo+bestaudio
    }

    // If user explicitly unselected everything, maybe empty logic?
    // Let's assume if nothing selected, we don't put -f, or we put best.
    // But for the GUI, explicit selection is key. If nothing selected, maybe disable download?

    el.downloadBtn.disabled = (!selectedVideoId && !selectedAudioId);
    if (el.downloadSectionBtn) el.downloadSectionBtn.disabled = el.downloadBtn.disabled;

    // Update Download Button Badge Info
    let formatInfoText = '';
    const bottomPanel = document.querySelector('.bottom-panel');
    if (selectedVideoId || selectedAudioId) {
        let vFmt = formats.find(f => f.format_id === selectedVideoId);
        let aFmt = formats.find(f => f.format_id === selectedAudioId);

        if (vFmt && aFmt) {
            let vC = (vFmt.vcodec || 'none').split('.')[0];
            let aC = (aFmt.acodec || 'none').split('.')[0];
            let bitrate = Math.round((vFmt.tbr || 0) + (aFmt.tbr || 0));
            formatInfoText = `${vFmt.resolution || 'N/A'} • ${vC}+${aC} • ${bitrate}k`;
        } else if (vFmt) {
            let vC = (vFmt.vcodec || 'none').split('.')[0];
            let bitrate = Math.round(vFmt.tbr || 0);
            formatInfoText = `${vFmt.resolution || 'N/A'} • ${vC}${bitrate ? ` • ${bitrate}k` : ''}`;
        } else if (aFmt) {
            let aC = (aFmt.acodec || 'none').split('.')[0];
            formatInfoText = `Audio • ${aC} • ${Math.round(aFmt.tbr || 0)}k`;
        }
        if (bottomPanel) bottomPanel.classList.add('sticky-mode');
    } else {
        if (bottomPanel) bottomPanel.classList.remove('sticky-mode');
    }

    if (el.formatTooltip && el.selectedFormatInfoText) {
        if (formatInfoText) {
            el.selectedFormatInfoText.textContent = formatInfoText;
            el.formatTooltip.classList.remove('hidden');
            el.formatTooltip.style.display = 'flex';
        } else {
            el.formatTooltip.classList.add('hidden');
            el.formatTooltip.style.display = 'none';
        }
    }

    if (!selectedVideoId && !selectedAudioId && el.downloadBtn.disabled) {
        el.cmdPreview.value = "Select a stream to generate command...";
        return;
    }

    let flags = [];
    if (settings.embedMetadata) flags.push('--embed-metadata');
    if (settings.embedThumbnail) flags.push('--embed-thumbnail');
    if (settings.restrictFilenames) flags.push('--restrict-filenames');
    if (settings.noPlaylist) flags.push('--no-playlist');
    if (settings.writeSubs) flags.push('--write-subs');
    if (settings.ignoreErrors) flags.push('--ignore-errors');
    
    // Global Stability Flags
    flags.push('--no-check-certificates');
    flags.push('--no-warnings');

    if (selectedSubtitles.length > 0) {
        flags.push('--embed-subs');
        flags.push(`--sub-langs "${selectedSubtitles.join(',')}"`);
        if (autoSubsEnabled) flags.push('--write-auto-subs');
    }

    if (settings.concurrentFragments > 1) {
        flags.push(`-N ${settings.concurrentFragments}`);
    }

    // Audio Extraction Optimization
    // If only audio is selected and it's Opus, add -x --audio-format opus
    if (!selectedVideoId && selectedAudioId && currentData) {
        const aFmt = currentData.formats.find(f => f.format_id === selectedAudioId);
        if (aFmt) {
            const ac = (aFmt.acodec || '').toLowerCase();
            if (ac.includes('opus')) {
                flags.push('-x');
                flags.push('--audio-format opus');
            }
        }
    }

    let path = settings.downloadPath;
    // Strict: Always use -P with quotes
    let pathArg = path ? `-P "${path}"` : '';

    // Add cookies if specified
    let cookiesArg = (settings.useCookies && settings.cookiesPath) ? `--cookies "${settings.cookiesPath}"` : '';

    let sectionArg = sectionTime ? `--download-sections "${sectionTime}"` : '';

    let playlistArg = "";
    if (isPlaylistMode && playlistItemsToDownload.length > 0) {
        playlistArg = `--playlist-items ${playlistItemsToDownload.join(',')}`;
    }

    let cmd = `yt-dlp ${sectionArg} ${playlistArg} ${formatPart} ${flags.join(' ')} ${cookiesArg} ${pathArg} "${el.urlInput.value.trim()}"`;
    // Clean up extra spaces
    cmd = cmd.replace(/\s+/g, ' ').trim();
    el.cmdPreview.value = cmd;
}

// Clear format badge listener
if (el.clearFormatBadge) {
    el.clearFormatBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedVideoId = null;
        selectedAudioId = null;
        renderGrid();
        updateCommand();
    });
}

async function startDownload() {
    if (!el.cmdPreview.value) return;

    // Show modal
    el.modal.self.classList.remove('hidden');
    el.modal.log.textContent = 'Starting download...\n';
    el.modal.bar.style.width = '0%';
    el.modal.cancel.classList.remove('hidden'); // Show cancel button
    el.modal.close.classList.add('hidden');
    el.modal.open.classList.add('hidden');
    el.statusMsg.textContent = 'Downloading...';

    let cmd = el.cmdPreview.value;

    try {
        let proc = await Neutralino.os.spawnProcess(cmd);
        currentDownloadProcess = proc.id; // Store process ID for tracking

        // Ensure correct view
        el.modal.processing.classList.remove('hidden');
        el.modal.success.classList.add('hidden');

        el.modal.bar.style.width = '0%';

        // Use os.spawn for real-time output
        // We need to split command into cmd and args?
        // Neutralino.os.spawn(command: string) -> Process

        Neutralino.events.on('spawnedProcess', (evt) => {
            if (evt.detail.id == proc.id) {
                if (evt.detail.action == 'stdOut') {
                    const text = evt.detail.data;
                    el.modal.log.textContent += text;
                    el.modal.log.scrollTop = el.modal.log.scrollHeight;

                    // Parse progress
                    // [download]  45.0% of 10.00MiB at 2.00MiB/s ETA 00:05
                    const match = text.match(/(\d+(\.\d+)?)%/);
                    if (match) {
                        el.modal.bar.style.width = match[1] + '%';
                    }
                }
                if (evt.detail.action == 'stdErr') {
                    // yt-dlp sends progress to stdout usually, but sometimes stderr
                    const text = evt.detail.data;
                    el.modal.log.textContent += text;
                    el.modal.log.scrollTop = el.modal.log.scrollHeight;

                    const match = text.match(/(\d+(\.\d+)?)%/);
                    if (match) {
                        el.modal.bar.style.width = match[1] + '%';
                    }
                }
                if (evt.detail.action == 'exit') {
                    const code = evt.detail.data;
                    el.modal.log.textContent += `\nProcess exited with code ${code}`;

                    if (code === 0) {
                        el.modal.bar.style.width = '100%';
                        currentDownloadProcess = null; // Clear process

                        // Success State
                        setTimeout(() => {
                            el.modal.processing.classList.add('hidden');
                            el.modal.success.classList.remove('hidden');
                            el.modal.cancel.classList.add('hidden'); // Hide cancel
                            el.modal.open.classList.remove('hidden');
                            el.modal.close.classList.remove('hidden');

                            // No Windows notification - only in-app success screen
                        }, 500);
                    } else {
                        // Error State
                        currentDownloadProcess = null; // Clear process
                        el.modal.cancel.classList.add('hidden'); // Hide cancel
                        el.modal.close.classList.remove('hidden');
                    }
                }
            }
        });

    } catch (err) {
        el.modal.log.textContent += `\nError launching process: ${err.message}`;
        el.modal.close.classList.remove('hidden');
    }
}

async function copyDirectLink(formatId, btnElement) {
    const url = el.urlInput.value.trim();
    if (!url) return;

    const spinIcon = `<svg class="svg-icon anim-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;
    const checkIcon = `<svg class="svg-icon check-draw" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    const failIcon = `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

    // Change button state to loading
    const originalHTML = btnElement.innerHTML;
    const originalTitle = btnElement.title;
    btnElement.innerHTML = spinIcon;
    btnElement.title = 'Fetching...';
    btnElement.disabled = true;

    try {
        // Since we used -J, all formats with their direct URLs are already in currentData
        if (!currentData || !currentData.formats) {
            throw new Error("No data available");
        }

        const fmt = currentData.formats.find(f => f.format_id === formatId);
        if (fmt && fmt.url) {
            await Neutralino.clipboard.writeText(fmt.url);

            // Show success
            btnElement.innerHTML = checkIcon;
            btnElement.title = 'Copied!';
            setTimeout(() => {
                btnElement.innerHTML = originalHTML;
                btnElement.title = originalTitle;
                btnElement.disabled = false;
            }, 2000);
        } else {
            throw new Error("Direct URL not found in metadata");
        }
    } catch (e) {
        console.error("Error copying link from cache:", e);
        // Fallback or show error
        btnElement.innerHTML = failIcon;
        btnElement.title = 'Failed to copy';
        setTimeout(() => {
            btnElement.innerHTML = originalHTML;
            btnElement.title = originalTitle;
            btnElement.disabled = false;
        }, 2000);
    }
}

// Float tabs on scroll
window.addEventListener('scroll', () => {
    const tabs = document.querySelector('.tabs');
    if (!tabs) return;

    // Check scroll position. 200px is roughly below the search input and video info
    if (window.scrollY > 700) {
        tabs.classList.add('tabs-floating');
    } else {
        tabs.classList.remove('tabs-floating');
    }
});

// Helpers
function setLoading(isLoading) {
    if (isLoading) el.loadingOverlay.classList.remove('hidden');
    else el.loadingOverlay.classList.add('hidden');
}

function resetSelection() {
    selectedVideoId = null;
    selectedAudioId = null;
    selectedSubtitles = [];
    currentData = null;
    currentFormats = [];
    el.contentArea.classList.add('hidden');
    el.gridBody.innerHTML = '';
}

function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatBytes(bytes, decimals = 1) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'K', 'M', 'G', 'T'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Initialize app
Neutralino.init();

Neutralino.events.on("windowClose", () => {
    Neutralino.app.exit();
});

// Load settings and check tools on startup
async function downloadSubtitle(langCode, langName, btnElement, isAuto = false) {
    if (!currentData) return;
    
    const subs = isAuto ? currentData.automatic_captions : currentData.subtitles;
    const subInfo = subs[langCode];
    
    if (!subInfo || subInfo.length === 0) {
        showStatus("Subtitle URL not found", "error");
        return;
    }

    // Pick the best format (prefer srt or vtt)
    const bestFormat = subInfo.find(s => s.ext === 'srt') || subInfo.find(s => s.ext === 'vtt') || subInfo[0];
    const subUrl = bestFormat.url;
    const ext = bestFormat.ext || 'vtt';
    
    // Sanitize title for default filename
    const safeTitle = (currentData.title || 'subtitle').replace(/[\\/:*?"<>|]/g, '_').substring(0, 80);
    const defaultName = `${safeTitle}_${langCode}.${ext}`;

    try {
        // Ask user where to save
        const fullPath = await Neutralino.os.showSaveDialog('Save Subtitle', {
            defaultPath: defaultName,
            filters: [
                { name: 'Subtitle Files', extensions: [ext, 'srt', 'vtt'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (!fullPath) return; // User cancelled

        const originalHTML = btnElement.innerHTML;
        btnElement.innerHTML = `<svg class="anim-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>`;
        btnElement.disabled = true;

        // Direct download using PowerShell
        const cmd = `powershell -Command "Invoke-WebRequest -Uri '${subUrl}' -OutFile '${fullPath}'"`;
        const output = await Neutralino.os.execCommand(cmd);
        
        // PowerShell success is exitCode 0
        if (output.exitCode === 0) {
            btnElement.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="4"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            showStatus(`Saved: ${langName} subtitle`, 'success');
        } else {
            console.error("PS Error:", output.stdErr);
            btnElement.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        }

        setTimeout(() => {
            btnElement.innerHTML = originalHTML;
            btnElement.disabled = false;
        }, 2500);

    } catch (e) {
        console.error("Subtitle save error:", e);
        showStatus("Error saving subtitle", "error");
    }
}

loadSettings();
ensureToolsInstalled();
