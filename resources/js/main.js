
// State
let currentData = null;
let formats = [];
let metadata = null;
let selectedVideoId = null;
let selectedAudioId = null;
let activeTab = 'video'; // video, audio, mixed
let currentDownloadProcess = null; // Track current download process
let sectionTime = ''; // Track download section time e.g. "*00:02:00-00:05:10"
let currentPlaylistData = null;
let playlistItemsToDownload = []; // Array of indices (1-indexed)
let isPlaylistMode = false;
let resolutionSelections = {}; // Track user selections per resolution: { '1920x1080': { cType: 'av01', formatId: '...' } }
let settings = {
    downloadPath: 'Downloads', // Default relative
    cookiesPath: '', // Cookies file path
    embedMetadata: false,
    embedThumbnail: false,
    restrictFilenames: false,
    noPlaylist: false,
    writeSubs: false,
    ignoreErrors: false,
    concurrentFragments: 1
};

// Elements
const el = {
    urlInput: document.getElementById('urlInput'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    analyzePlaylistBtn: document.getElementById('analyzePlaylistBtn'),
    quickM4aBtn: document.getElementById('quickM4aBtn'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    contentArea: document.getElementById('contentArea'),
    videoInfo: document.getElementById('videoInfo'),
    videoThumbnail: document.getElementById('videoThumbnail'),
    gridBody: document.getElementById('gridBody'),
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
        browseCookies: document.getElementById('browseCookiesBtn'),
        clearCookies: document.getElementById('clearCookiesBtn'),
        embedMeta: document.getElementById('embedMetadata'),
        embedThumb: document.getElementById('embedThumbnail'),
        restrict: document.getElementById('restrictFilenames'),
        noPlaylist: document.getElementById('noPlaylist'),
        writeSubs: document.getElementById('writeSubs'),
        ignoreErrors: document.getElementById('ignoreErrors'),
        concurrentFragments: document.getElementById('concurrentFragments')
    },
    ytdlpVersionText: document.getElementById('ytdlpVersionText'),
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
    }
};

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
    checkYtdlpVersion();
});

// Check YT-DLP Version
async function checkYtdlpVersion() {
    try {
        let output = await Neutralino.os.execCommand('yt-dlp --version');
        if (output.exitCode === 0) {
            el.ytdlpVersionText.textContent = `v${output.stdOut.trim()}`;
            el.ytdlpVersionText.style.color = 'var(--success)';
        } else {
            el.ytdlpVersionText.textContent = 'Not Found / Error';
            el.ytdlpVersionText.style.color = 'var(--danger)';
        }
    } catch (err) {
        el.ytdlpVersionText.textContent = 'Not Installed';
        el.ytdlpVersionText.style.color = 'var(--danger)';
        console.error("Failed to check yt-dlp version", err);
    }
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
    'embedMeta', 'embedThumb', 'restrict', 'noPlaylist', 'writeSubs', 'ignoreErrors'
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
    el.inputs.cookiesPath.value = settings.cookiesPath || '';
    el.inputs.embedMeta.checked = settings.embedMetadata;
    el.inputs.embedThumb.checked = settings.embedThumbnail;
    el.inputs.restrict.checked = settings.restrictFilenames;
    el.inputs.noPlaylist.checked = settings.noPlaylist;
    el.inputs.writeSubs.checked = settings.writeSubs;
    el.inputs.ignoreErrors.checked = settings.ignoreErrors;
    el.inputs.concurrentFragments.value = settings.concurrentFragments || 1;

    // Log cookies status for debugging
    if (settings.cookiesPath) {
        console.log("Cookies file loaded:", settings.cookiesPath);
    }

    updateCommand();
}

async function saveSettings() {
    try {
        await Neutralino.storage.setData('settings', JSON.stringify(settings));
        const status = document.getElementById('statusMsg');
        if (status) {
            status.textContent = 'Settings Saved';
            setTimeout(() => status.textContent = 'Ready', 2000);
        }
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

        // Step 1: Check if it's actually a playlist using --flat-playlist
        let command = `yt-dlp -J --flat-playlist ${cookiesArg} "${url}"`;
        console.log("Smart Analysis (Playlist Check):", command);

        let output = await Neutralino.os.execCommand(command);

        if (output.exitCode !== 0) {
            alert("Error analyzing URL:\n" + output.stdErr);
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
        alert("Exception during analysis: " + e.message);
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
        // Use -J for JSON output
        // Add cookies if specified
        let cookiesArg = settings.cookiesPath ? `--cookies "${settings.cookiesPath}"` : '';
        let command = `yt-dlp -J --no-playlist ${cookiesArg} "${url}"`;
        console.log("Analyzing:", command);

        let output = await Neutralino.os.execCommand(command);

        if (output.exitCode !== 0) {
            alert("Error analyzing URL:\n" + output.stdErr);
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
        updateCommand(); // Initial command update

    } catch (e) {
        alert("Exception during analysis: " + e.message);
    } finally {
        setLoading(false);
    }
}

async function quickM4a() {
    const url = el.urlInput.value.trim();
    if (!url) {
        alert("Please enter a URL first.");
        return;
    }

    // reset selection visualization as we are bypassing it
    resetSelection();

    let path = settings.downloadPath;
    // Strict: Always use -P with quotes
    let pathArg = path ? `-P "${path}"` : '';

    // Add cookies if specified
    let cookiesArg = settings.cookiesPath ? `--cookies "${settings.cookiesPath}"` : '';

    // Hardcoded M4A command as requested
    // yt-dlp -f 140 --embed-metadata --embed-thumbnail --no-playlist "link"
    let cmd = `yt-dlp -f 140 --embed-metadata --embed-thumbnail --no-playlist ${cookiesArg} ${pathArg} "${url}"`;

    el.cmdPreview.value = cmd;
    startDownload();
}

function renderGrid() {
    el.gridBody.innerHTML = '';
    const duration = currentData?.duration || 1;

    // Tab Visibility Logic
    const counts = {
        video: formats.filter(f => (f.vcodec && f.vcodec !== 'none') && (!f.acodec || f.acodec === 'none')).length,
        audio: formats.filter(f => (f.acodec && f.acodec !== 'none') && (!f.vcodec || f.vcodec === 'none')).length,
        mixed: formats.filter(f => (f.vcodec && f.vcodec !== 'none') && (f.acodec && f.acodec !== 'none')).length
    };

    let firstAvailable = null;
    el.tabs.forEach(btn => {
        const tab = btn.dataset.tab;
        const hasItems = counts[tab] > 0;
        btn.classList.toggle('hidden', !hasItems);
        if (hasItems && !firstAvailable) firstAvailable = tab;
    });

    // Show/Hide Video Only Note
    if (el.videoOnlyNote) {
        el.videoOnlyNote.classList.toggle('hidden', activeTab !== 'video');
    }

    // Auto-switch if current tab is empty
    if (counts[activeTab] === 0 && firstAvailable) {
        activeTab = firstAvailable;
        el.tabs.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === activeTab);
        });
    }

    // Filter formats
    let filtered = formats.filter(f => {
        const isVideo = (f.vcodec && f.vcodec !== 'none');
        const isAudio = (f.acodec && f.acodec !== 'none');
        if (activeTab === 'video') return isVideo && !isAudio;
        if (activeTab === 'audio') return isAudio && !isVideo;
        if (activeTab === 'mixed') return isVideo && isAudio;
        return false;
    });

    if (activeTab === 'audio') {
        // Simple list for audio
        filtered.sort((a, b) => (b.tbr || 0) - (a.tbr || 0));
        filtered.forEach(fmt => renderRow(fmt));
        return;
    }

    // Advanced Grouping for Video/Mixed
    const groups = {}; // resKey -> { cType -> [formats] }
    const codecPriority = { 'av01': 4, 'hevc': 3, 'vp9': 2, 'avc': 1, 'other': 0 };

    filtered.forEach(f => {
        const resKey = f.width ? `${f.width}x${f.height}` : 'Audio';
        if (!groups[resKey]) groups[resKey] = {};
        
        const vc = f.vcodec || '';
        let cType = 'other';
        if (vc.includes('av01')) cType = 'av01';
        else if (vc.includes('vp9')) cType = 'vp9';
        else if (vc.includes('avc') || vc.includes('mp4v')) cType = 'avc';
        else if (vc.includes('hev') || vc.includes('hvc')) cType = 'hevc';
        
        if (!groups[resKey][cType]) groups[resKey][cType] = [];
        groups[resKey][cType].push(f);
    });

    // Sort resolutions (highest first)
    const sortedResKeys = Object.keys(groups).sort((a, b) => {
        const [w1, h1] = a.split('x').map(Number);
        const [w2, h2] = b.split('x').map(Number);
        return (w2 * h2 || 0) - (w1 * h1 || 0);
    });

    sortedResKeys.forEach(resKey => {
        const resGroup = groups[resKey];
        const availableCTypes = Object.keys(resGroup).sort((a, b) => codecPriority[b] - codecPriority[a]);
        
        // Use previous selection or default to best
        let currentCType = resolutionSelections[resKey]?.cType;
        if (!currentCType || !availableCTypes.includes(currentCType)) {
            currentCType = availableCTypes[0];
        }

        const formatsForCType = resGroup[currentCType].sort((a, b) => (b.tbr || b.vbr || 0) - (a.tbr || a.vbr || 0));
        
        let currentFormatId = resolutionSelections[resKey]?.formatId;
        let activeFmt = formatsForCType.find(f => f.format_id === currentFormatId) || formatsForCType[0];

        renderSmartRow(resKey, availableCTypes, currentCType, formatsForCType, activeFmt, resGroup);
    });
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

    // Logic:
    // If selecting Mixed (Video+Audio): clear others, set as main.
    // If selecting Video Only: Clear previous Video Only. Keep Audio if present.
    // If selecting Audio Only: Clear previous Audio Only. Keep Video if present.

    if (isVideo && isAudio) {
        // Mixed
        if (selectedVideoId === fmt.format_id) {
            // Deselect
            selectedVideoId = null;
            selectedAudioId = null;
        } else {
            selectedVideoId = fmt.format_id; // Treat as video source
            selectedAudioId = null; // No separate audio needed
        }
    } else if (isVideo) {
        if (selectedVideoId === fmt.format_id) {
            selectedVideoId = null;
        } else {
            selectedVideoId = fmt.format_id;
            // If previously selected a Mixed stream, clear it? Yes, can't have mixed + video usually (unless merge, but assume replacement).
            // Logic improvement: If current selection was mixed, clear it.
            // Check if current selectedVideo was mixed: hard to tell without lookups.
            // Simplification: We just track IDs. 
        }
    } else if (isAudio) {
        if (selectedAudioId === fmt.format_id) {
            selectedAudioId = null;
        } else {
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

    if (settings.concurrentFragments > 1) {
        flags.push(`-N ${settings.concurrentFragments}`);
    }

    let path = settings.downloadPath;
    // Strict: Always use -P with quotes
    let pathArg = path ? `-P "${path}"` : '';

    // Add cookies if specified
    let cookiesArg = settings.cookiesPath ? `--cookies "${settings.cookiesPath}"` : '';

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
        let cookiesArg = settings.cookiesPath ? `--cookies "${settings.cookiesPath}"` : '';
        let command = `yt-dlp -f ${formatId} -g ${cookiesArg} "${url}"`;
        let output = await Neutralino.os.execCommand(command);

        if (output.exitCode === 0 && output.stdOut) {
            // yt-dlp might return multiple links (e.g. video and audio if it's a mixed format, or just one)
            // It usually prints them on separate lines.
            let directLink = output.stdOut.trim();
            await Neutralino.clipboard.writeText(directLink);

            // Show success
            btnElement.innerHTML = checkIcon;
            btnElement.title = 'Copied!';
            setTimeout(() => {
                btnElement.innerHTML = originalHTML;
                btnElement.title = originalTitle;
                btnElement.disabled = false;
            }, 2000);
        } else {
            console.error("yt-dlp command failed:", output.stdErr);
            btnElement.innerHTML = failIcon;
            btnElement.title = 'Failed to fetch link';
            setTimeout(() => {
                btnElement.innerHTML = originalHTML;
                btnElement.title = originalTitle;
                btnElement.disabled = false;
            }, 2000);
        }
    } catch (e) {
        console.error("Error copy link:", e);
        btnElement.innerHTML = failIcon;
        btnElement.title = 'Error occurred';
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
    if (window.scrollY > 350) {
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

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Initialize app
Neutralino.init();

Neutralino.events.on("windowClose", () => {
    Neutralino.app.exit();
});

// Load settings on startup
loadSettings();
