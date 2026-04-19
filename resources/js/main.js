
// State
let currentData = null;
let formats = [];
let metadata = null;
let selectedFormat = null;
let activeTab = 'video'; // video, audio, mixed
let currentDownloadProcess = null; // Track current download process
let sectionTime = ''; // Track download section time e.g. "*00:02:00-00:05:10"
let settings = {
    downloadPath: 'Downloads', // Default relative
    cookiesPath: '', // Cookies file path
    embedMetadata: true,
    embedThumbnail: true,
    restrictFilenames: false,
    noPlaylist: true,
    writeSubs: false,
    ignoreErrors: true
};

// Elements
const el = {
    urlInput: document.getElementById('urlInput'),
    analyzeBtn: document.getElementById('analyzeBtn'),
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
    toggleSettings: document.getElementById('toggleSettings'),
    toggleCommand: document.getElementById('toggleCommand'),
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
        ignoreErrors: document.getElementById('ignoreErrors')
    },
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
});

// Call init at the end or here
Neutralino.init();

// Event Listeners
el.analyzeBtn.addEventListener('click', analyzeUrl);
el.quickM4aBtn.addEventListener('click', quickM4a);
el.urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') analyzeUrl();
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
        el.sections[prefix+'H'].value = '00';
        el.sections[prefix+'M'].value = '00';
        el.sections[prefix+'S'].value = '00';
        return;
    }
    let parts = timeStr.split(':');
    if (parts.length === 2) parts = ['00', ...parts]; // MM:SS format
    if (parts.length === 1) parts = ['00', '00', ...parts]; // SS format
    
    el.sections[prefix+'H'].value = (parts[0] || '0').toString().padStart(2, '0');
    el.sections[prefix+'M'].value = (parts[1] || '0').toString().padStart(2, '0');
    el.sections[prefix+'S'].value = (parts[2] || '0').toString().padStart(2, '0');
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
            if(el.clearSectionBadge) {
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
        if(el.clearSectionBadge) el.clearSectionBadge.classList.add('hidden');
        
        setTimeout(() => el.statusMsg.textContent = 'Ready', 2000);
    });
}
if (el.clearSectionBadge) {
    el.clearSectionBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        if(el.sections.clearBtn) el.sections.clearBtn.click();
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
            await Neutralino.os.execCommand(`explorer "${path}"`);
        } catch (err) {
            console.error("Failed to open folder:", err);
        }
    } else {
        // Fallback to system downloads if no custom path
        try {
            const downloadsPath = await Neutralino.os.getPath('downloads');
            await Neutralino.os.execCommand(`explorer "${downloadsPath}"`);
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
async function analyzeUrl() {
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

    // Filter formats
    let displayFormats = formats.filter(f => {
        const isVideo = f.vcodec !== 'none';
        const isAudio = f.acodec !== 'none';

        if (activeTab === 'video') return isVideo && !isAudio; // Video only streams usually have acodec='none'
        if (activeTab === 'audio') return isAudio && !isVideo;
        if (activeTab === 'mixed') return isVideo && isAudio;
        return false;
    });

    // Sort: Best resolution/bitrate first
    displayFormats.sort((a, b) => {
        // Simple sort by tbr (total bitrate) or filesize if available
        let aSize = a.filesize || a.filesize_approx || ((a.tbr || 0) * 1024 / 8 * (currentData?.duration || 0));
        let bSize = b.filesize || b.filesize_approx || ((b.tbr || 0) * 1024 / 8 * (currentData?.duration || 0));
        return (b.tbr || bSize || 0) - (a.tbr || aSize || 0);
    });

    displayFormats.forEach(fmt => {
        const row = document.createElement('div');
        row.className = 'grid-row';
        row.dataset.id = fmt.format_id;

        // Determine selection state
        if (fmt.format_id === selectedVideoId || fmt.format_id === selectedAudioId) {
            row.classList.add('selected');
        }

        row.onclick = () => handleRowClick(fmt, row);

        // Badge Logic
        // Resolution specific
        let resClass = 'res-sd';
        const h = fmt.height || 0;
        const w = fmt.width || 0;
        if (h >= 2160 || w >= 3840) resClass = 'res-4k';
        else if (h >= 1440) resClass = 'res-1440';
        else if (h >= 1080) resClass = 'res-1080';
        else if (h >= 720) resClass = 'res-720';
        else if (fmt.acodec !== 'none' && fmt.vcodec === 'none') resClass = 'res-audio';

        // Codec specific
        const vc = fmt.vcodec || 'none';
        const ac = fmt.acodec || 'none';

        let vcClass = (vc.includes('av01') || vc.includes('vp9')) ? 'codec-mod' : (vc !== 'none' ? 'codec-leg' : 'codec-none');
        let acClass = (ac.includes('opus') || ac.includes('mp4a')) ? 'codec-mod' : (ac !== 'none' ? 'codec-leg' : 'codec-none');

        // Helpers
        const resText = fmt.resolution || (fmt.width ? `${fmt.width}x${fmt.height}` : 'Audio');
        
        let size = '-';
        if (fmt.filesize) {
            size = formatBytes(fmt.filesize);
        } else if (fmt.filesize_approx) {
            size = '~' + formatBytes(fmt.filesize_approx);
        } else if ((fmt.tbr || fmt.vbr || fmt.abr) && currentData && currentData.duration) {
            const bitrate = fmt.tbr || ((fmt.vbr || 0) + (fmt.abr || 0));
            const estBytes = (bitrate * 1024 / 8) * currentData.duration;
            size = '≈' + formatBytes(estBytes);
        }

        row.innerHTML = `
            <div class="col">${fmt.format_id}</div>
            <div class="col">${fmt.ext}</div>
            <div class="col"><span class="badge ${resClass}">${resText}</span></div>
            <div class="col">${fmt.fps || ''}</div>
            <div class="col">${size}</div>
            <div class="col"><span class="badge ${vcClass}">${vc}</span></div>
            <div class="col"><span class="badge ${acClass}">${ac}</span></div>
            <div class="col">${Math.round(fmt.tbr || 0)}k</div>
            <div class="col" title="${fmt.format_note || ''}">${fmt.format_note || ''}</div>
            <div class="col" style="flex: 0.5; text-align: center;">
                <button class="icon-btn copy-link-btn" title="Copy direct stream URL (-g)" style="font-size: 1.1em; background: none; border: none; cursor: pointer;">📋</button>
            </div>
        `;

        const copyBtn = row.querySelector('.copy-link-btn');
        if (copyBtn) {
            copyBtn.onclick = (e) => {
                e.stopPropagation(); // prevent row click selection
                copyDirectLink(fmt.format_id, copyBtn);
            };
        }

        el.gridBody.appendChild(row);
    });
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

    let path = settings.downloadPath;
    // Strict: Always use -P with quotes
    let pathArg = path ? `-P "${path}"` : '';

    // Add cookies if specified
    let cookiesArg = settings.cookiesPath ? `--cookies "${settings.cookiesPath}"` : '';

    let sectionArg = sectionTime ? `--download-sections "${sectionTime}"` : '';

    let cmd = `yt-dlp ${sectionArg} ${formatPart} ${flags.join(' ')} ${cookiesArg} ${pathArg} "${el.urlInput.value.trim()}"`;
    // Clean up extra spaces
    cmd = cmd.replace(/\s+/g, ' ').trim();
    el.cmdPreview.value = cmd;
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

    // Change button state to loading
    const originalText = btnElement.textContent;
    const originalTitle = btnElement.title;
    btnElement.textContent = '⏳';
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
            btnElement.textContent = '✔';
            btnElement.title = 'Copied!';
            setTimeout(() => {
                btnElement.textContent = originalText;
                btnElement.title = originalTitle;
                btnElement.disabled = false;
            }, 2000);
        } else {
            console.error("yt-dlp command failed:", output.stdErr);
            btnElement.textContent = '❌';
            btnElement.title = 'Failed to fetch link';
            setTimeout(() => {
                btnElement.textContent = originalText;
                btnElement.title = originalTitle;
                btnElement.disabled = false;
            }, 2000);
        }
    } catch (e) {
        console.error("Error copy link:", e);
        btnElement.textContent = '❌';
        btnElement.title = 'Error occurred';
        setTimeout(() => {
            btnElement.textContent = originalText;
            btnElement.title = originalTitle;
            btnElement.disabled = false;
        }, 2000);
    }
}

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
