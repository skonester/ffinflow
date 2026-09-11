// Adds a "Download Media" workspace to ffinflow: analyze a URL with the
// bundled yt-dlp engine, download video/audio with live progress and a
// verified-MP4 check, browse the resulting file library, and search the
// engine's supported-sites directory. Built the same way ffinflow's other
// bolt-on dialogs are (see the Convert Media / Update Toast sections in
// renderer.ts) -- plain DOM created at runtime and styled with the app's
// existing CSS variables -- so it needs no changes to index.html/styles.css
// and the player's look is unchanged unless this panel is opened.
const { ipcRenderer, shell } = require('electron');

const QUALITY_OPTIONS = [
    { value: 'best', label: 'Best available' },
    { value: '2160', label: '2160p (4K)' },
    { value: '1440', label: '1440p (2K)' },
    { value: '1080', label: '1080p' },
    { value: '720', label: '720p' },
    { value: '480', label: '480p' },
    { value: '360', label: '360p' },
    { value: '240', label: '240p' },
];
const VIDEO_CONTAINER_OPTIONS = [
    { value: 'mp4', label: 'MP4 (verified)' },
    { value: 'mkv', label: 'MKV' },
    { value: 'webm', label: 'WebM' },
    { value: 'auto', label: 'Auto (no re-mux)' },
];
const AUDIO_CONTAINER_OPTIONS = [
    { value: 'mp3', label: 'MP3' },
    { value: 'm4a', label: 'M4A' },
    { value: 'opus', label: 'Opus' },
    { value: 'wav', label: 'WAV' },
    { value: 'best', label: 'Best (no re-encode)' },
];
const AUDIO_QUALITY_OPTIONS = [
    { value: 'best', label: 'Best' },
    { value: '320', label: '320 kbps' },
    { value: '256', label: '256 kbps' },
    { value: '192', label: '192 kbps' },
    { value: '128', label: '128 kbps' },
];

function formatBytes(value) {
    if (!value || !Number.isFinite(value)) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = value;
    let index = 0;
    while (size >= 1024 && index < units.length - 1) { size /= 1024; index++; }
    return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}
function formatSpeed(value) { return value ? `${formatBytes(value)}/s` : ''; }
function formatEta(seconds) {
    if (!seconds || !Number.isFinite(seconds)) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `ETA ${m}:${String(s).padStart(2, '0')}`;
}
function formatDuration(seconds) {
    if (!seconds || !Number.isFinite(seconds)) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
function formatDate(iso) { try { return new Date(iso).toLocaleString(); } catch { return iso; } }

function styled(tag, styles?, props?) {
    const el = document.createElement(tag);
    if (styles) Object.assign(el.style, styles);
    if (props) Object.assign(el, props);
    return el;
}

function pillButton(label, variant?) {
    const isPrimary = variant === 'primary';
    const isDanger = variant === 'danger';
    return styled('button', {
        padding: '6px 12px',
        borderRadius: '5px',
        fontSize: '12px',
        cursor: 'pointer',
        border: isPrimary ? '1px solid var(--primary-color, #ff6600)' : '1px solid rgba(255, 255, 255, 0.12)',
        background: isPrimary ? 'var(--primary-color, #ff6600)' : isDanger ? 'rgba(255, 90, 90, 0.12)' : 'rgba(255, 255, 255, 0.05)',
        color: isPrimary ? '#fff' : isDanger ? '#ff9b9b' : 'var(--text-color, #e0e0e0)'
    }, { innerText: label });
}

function buildSelect(options) {
    const select = styled('select', {
        padding: '7px 10px', borderRadius: '5px', fontSize: '13px',
        background: '#1a1a1a', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-color, #e0e0e0)',
        colorScheme: 'dark'
    });
    options.forEach((option) => {
        const el = styled('option', { background: '#1a1a1a', color: '#e0e0e0' }, { value: option.value, innerText: option.label });
        select.appendChild(el);
    });
    return select;
}

function initDownloaderUI() {
    let settings = null;
    let latestAnalysis = null;
    const jobs = new Map();
    let activeTab = 'download';
    let sitesLoaded = false;
    let allSites = [];

    // --- Floating entry point (the "section at the top" for this feature) ---
    const launcher = styled('button', {
        position: 'fixed', top: '10px', right: '20px', zIndex: '950',
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontFamily: 'system-ui, -apple-system, sans-serif',
        background: 'var(--control-bg, rgba(28, 28, 28, 0.9))', color: 'var(--text-color, #e0e0e0)',
        border: '1px solid rgba(255, 255, 255, 0.15)', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.35)'
    });
    launcher.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg><span>Download</span>';
    document.body.appendChild(launcher);

    // --- Modal shell ---
    const overlay = styled('div', {
        position: 'fixed', inset: '0', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: '10000',
        display: 'none', alignItems: 'center', justifyContent: 'center'
    });
    overlay.id = 'downloader-overlay';

    const box = styled('div', {
        background: 'var(--bg-dark, #232323)', color: 'var(--text-color, #e0e0e0)', borderRadius: '10px',
        width: 'min(880px, 94vw)', height: 'min(720px, 90vh)', display: 'flex', flexDirection: 'column',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)',
        fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden'
    });

    const header = styled('div', {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
    });
    const titleEl = styled('h2', { margin: '0', color: 'var(--primary-color, #ff6600)', fontSize: '17px' }, { innerText: 'Download Media' });
    const closeBtn = pillButton('Close');
    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    const tabRow = styled('div', { display: 'flex', gap: '4px', padding: '10px 20px 0' });
    const tabs = {
        download: styled('button', {}, { innerText: 'Download' }),
        files: styled('button', {}, { innerText: 'Files' }),
        sites: styled('button', {}, { innerText: 'Supported Sites' })
    };
    Object.entries(tabs).forEach(([key, el]) => {
        Object.assign(el.style, {
            padding: '8px 14px', borderRadius: '6px 6px 0 0', fontSize: '13px', cursor: 'pointer',
            border: 'none', borderBottom: '2px solid transparent', background: 'transparent', color: 'rgba(255, 255, 255, 0.6)'
        });
        el.addEventListener('click', () => setActiveTab(key));
        tabRow.appendChild(el);
    });

    const body = styled('div', { flex: '1', overflowY: 'auto', padding: '16px 20px' });
    box.appendChild(header);
    box.appendChild(tabRow);
    box.appendChild(body);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function setActiveTab(key) {
        activeTab = key;
        Object.entries(tabs).forEach(([tabKey, el]) => {
            const on = tabKey === key;
            el.style.color = on ? 'var(--primary-color, #ff6600)' : 'rgba(255, 255, 255, 0.6)';
            el.style.borderBottomColor = on ? 'var(--primary-color, #ff6600)' : 'transparent';
        });
        downloadPane.style.display = key === 'download' ? 'block' : 'none';
        filesPane.style.display = key === 'files' ? 'block' : 'none';
        sitesPane.style.display = key === 'sites' ? 'block' : 'none';
        if (key === 'files') void loadFiles();
        if (key === 'sites' && !sitesLoaded) void loadSites();
    }

    function openModal() {
        overlay.style.display = 'flex';
        setActiveTab('download');
        if (!jobs.size) void refreshHistory();
    }
    function closeModal() { overlay.style.display = 'none'; }

    closeBtn.addEventListener('click', closeModal);
    launcher.addEventListener('click', openModal);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) closeModal(); });
    document.addEventListener('keydown', (event) => {
        if (overlay.style.display === 'flex' && event.key === 'Escape') closeModal();
    });
    ipcRenderer.on('menu-open-downloader', openModal);

    // ============================= Download tab =============================
    const downloadPane = styled('div', {});

    const urlRow = styled('div', { display: 'flex', gap: '8px', marginBottom: '10px' });
    const urlInput = styled('input', {
        flex: '1', padding: '8px 10px', borderRadius: '5px', fontSize: '13px',
        background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-color, #e0e0e0)'
    }, { type: 'text', placeholder: 'Paste a video, audio, or playlist URL...' });
    const analyzeBtn = pillButton('Analyze', 'primary');
    urlRow.appendChild(urlInput);
    urlRow.appendChild(analyzeBtn);

    const analyzeMessage = styled('div', { fontSize: '12px', marginBottom: '10px', display: 'none', color: '#ff9b9b' });

    const resultPanel = styled('div', { display: 'none', marginBottom: '14px', padding: '10px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' });
    const resultTitle = styled('div', { fontSize: '13px', fontWeight: '600', marginBottom: '4px' });
    const resultMeta = styled('div', { fontSize: '12px', color: 'rgba(255, 255, 255, 0.55)', marginBottom: '8px' });
    const entriesList = styled('div', { maxHeight: '150px', overflowY: 'auto', display: 'none', marginBottom: '4px' });
    resultPanel.appendChild(resultTitle);
    resultPanel.appendChild(resultMeta);
    resultPanel.appendChild(entriesList);

    const optionsRow = styled('div', { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' });
    const kindSelect = buildSelect([{ value: 'video', label: 'Video' }, { value: 'audio', label: 'Audio only' }]);
    const qualitySelect = buildSelect(QUALITY_OPTIONS);
    const containerSelect = buildSelect(VIDEO_CONTAINER_OPTIONS);
    const audioContainerSelect = buildSelect(AUDIO_CONTAINER_OPTIONS);
    const audioQualitySelect = buildSelect(AUDIO_QUALITY_OPTIONS);
    [kindSelect, qualitySelect, containerSelect, audioContainerSelect, audioQualitySelect].forEach((el) => optionsRow.appendChild(el));

    const folderRow = styled('div', { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' });
    const folderPathEl = styled('div', {
        flex: '1', padding: '7px 10px', borderRadius: '5px', fontSize: '12px',
        background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
    });
    const chooseFolderBtn = pillButton('Choose Folder');
    folderRow.appendChild(folderPathEl);
    folderRow.appendChild(chooseFolderBtn);

    const downloadBtn = styled('button', {
        padding: '9px 18px', border: '1px solid var(--primary-color, #ff6600)', borderRadius: '6px',
        background: 'var(--primary-color, #ff6600)', color: '#fff', cursor: 'pointer', fontSize: '13px', marginBottom: '16px'
    }, { innerText: 'Download', disabled: true });
    downloadBtn.style.opacity = '0.5';

    const jobsHeader = styled('div', { fontSize: '13px', fontWeight: '600', margin: '4px 0 8px', color: 'rgba(255, 255, 255, 0.75)' }, { innerText: 'Downloads' });
    const jobsList = styled('div', { display: 'flex', flexDirection: 'column', gap: '8px' });

    downloadPane.appendChild(urlRow);
    downloadPane.appendChild(analyzeMessage);
    downloadPane.appendChild(resultPanel);
    downloadPane.appendChild(optionsRow);
    downloadPane.appendChild(folderRow);
    downloadPane.appendChild(downloadBtn);
    downloadPane.appendChild(jobsHeader);
    downloadPane.appendChild(jobsList);

    function updateKindVisibility() {
        const isAudio = kindSelect.value === 'audio';
        qualitySelect.style.display = isAudio ? 'none' : '';
        containerSelect.style.display = isAudio ? 'none' : '';
        audioContainerSelect.style.display = isAudio ? '' : 'none';
        audioQualitySelect.style.display = isAudio ? '' : 'none';
    }
    kindSelect.addEventListener('change', updateKindVisibility);

    function currentOptions() {
        return {
            kind: kindSelect.value,
            quality: qualitySelect.value,
            videoContainer: containerSelect.value,
            audioContainer: audioContainerSelect.value,
            audioQuality: audioQualitySelect.value,
            outputDirectory: folderPathEl.dataset.path || (settings ? settings.outputDirectory : '')
        };
    }

    function showAnalyzeMessage(text) {
        analyzeMessage.innerText = text || '';
        analyzeMessage.style.display = text ? 'block' : 'none';
    }

    function renderAnalysis(analysis) {
        latestAnalysis = analysis;
        resultPanel.style.display = 'block';
        resultTitle.innerText = analysis.title;
        const bits = [];
        if (analysis.uploader) bits.push(analysis.uploader);
        if (analysis.duration) bits.push(formatDuration(analysis.duration));
        if (analysis.isPlaylist) bits.push(`${analysis.entries.length} items`);
        if (analysis.isLive) bits.push('Live');
        resultMeta.innerText = bits.join(' • ');
        entriesList.innerHTML = '';
        if (analysis.isPlaylist) {
            entriesList.style.display = 'block';
            analysis.entries.forEach((entry) => {
                const row = styled('label', { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '2px 0' });
                const checkbox = styled('input', {}, { type: 'checkbox', checked: true });
                checkbox.dataset.entryId = entry.id;
                row.appendChild(checkbox);
                row.appendChild(document.createTextNode(entry.title));
                entriesList.appendChild(row);
            });
        } else {
            entriesList.style.display = 'none';
        }
        downloadBtn.disabled = false;
        downloadBtn.style.opacity = '1';
    }

    analyzeBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) return;
        showAnalyzeMessage('');
        resultPanel.style.display = 'none';
        analyzeBtn.disabled = true;
        analyzeBtn.innerText = 'Analyzing...';
        try {
            const analysis = await ipcRenderer.invoke('downloader:analyze', { url });
            renderAnalysis(analysis);
        } catch (error) {
            showAnalyzeMessage(error instanceof Error ? error.message : 'Could not analyze that URL.');
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.innerText = 'Analyze';
        }
    });

    chooseFolderBtn.addEventListener('click', async () => {
        const chosen = await ipcRenderer.invoke('downloader:select-folder');
        if (chosen) setFolder(chosen);
    });

    function setFolder(folderPath) {
        folderPathEl.dataset.path = folderPath;
        folderPathEl.innerText = folderPath;
    }

    downloadBtn.addEventListener('click', async () => {
        if (!latestAnalysis) return;
        const selectedEntryIds = latestAnalysis.isPlaylist
            ? Array.from(entriesList.querySelectorAll('input[type=checkbox]') as NodeListOf<HTMLInputElement>).filter((cb) => cb.checked).map((cb) => cb.dataset.entryId)
            : [];
        try {
            const created = await ipcRenderer.invoke('downloader:enqueue', { analysis: latestAnalysis, selectedEntryIds, options: currentOptions() });
            created.forEach((job) => upsertJob(job));
        } catch (error) {
            showAnalyzeMessage(error instanceof Error ? error.message : 'Could not queue that download.');
        }
    });

    function jobButtons(job) {
        const row = styled('div', { display: 'flex', gap: '6px' });
        const add = (label, handler, variant?) => { const btn = pillButton(label, variant); btn.addEventListener('click', handler); row.appendChild(btn); };
        if (job.state === 'downloading' || job.state === 'analyzing' || job.state === 'postprocessing') {
            add('Pause', () => ipcRenderer.invoke('downloader:pause', job.id));
            add('Cancel', () => ipcRenderer.invoke('downloader:cancel', job.id), 'danger');
        } else if (job.state === 'queued') {
            add('Pause', () => ipcRenderer.invoke('downloader:pause', job.id));
        } else if (job.state === 'paused') {
            add('Resume', () => ipcRenderer.invoke('downloader:resume', job.id), 'primary');
            add('Cancel', () => ipcRenderer.invoke('downloader:cancel', job.id), 'danger');
        } else if (job.state === 'blocked') {
            add('Retry', () => ipcRenderer.invoke('downloader:retry', job.id), 'primary');
        } else if (job.state === 'completed') {
            add('Open', () => ipcRenderer.invoke('downloader:open', job.outputPath));
            add('Reveal', () => ipcRenderer.invoke('downloader:reveal', job.outputPath));
        }
        if (['completed', 'cancelled'].includes(job.state)) {
            add('Remove', () => ipcRenderer.invoke('downloader:remove-history', job.id).then(() => { jobs.delete(job.id); renderJobs(); }));
        }
        return row;
    }

    function renderJobs() {
        jobsList.innerHTML = '';
        const sorted = Array.from(jobs.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        if (!sorted.length) {
            jobsList.appendChild(styled('div', { fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }, { innerText: 'No downloads yet.' }));
            return;
        }
        sorted.forEach((job) => {
            const card = styled('div', { padding: '10px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' });
            const top = styled('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '10px' });
            top.appendChild(styled('div', { fontSize: '12.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1' }, { innerText: job.title }));
            top.appendChild(jobButtons(job));
            card.appendChild(top);

            const track = styled('div', { height: '5px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden', marginBottom: '5px' });
            const bar = styled('div', { height: '100%', width: `${job.progress?.percent || 0}%`, background: job.state === 'blocked' ? '#ff6666' : 'var(--primary-color, #ff6600)', transition: 'width 0.2s ease' });
            track.appendChild(bar);
            card.appendChild(track);

            const statusBits = [job.progress?.phase || job.state];
            if (job.progress?.speed) statusBits.push(formatSpeed(job.progress.speed));
            if (job.progress?.eta) statusBits.push(formatEta(job.progress.eta));
            if (job.errorMessage) statusBits.push(job.errorMessage);
            card.appendChild(styled('div', { fontSize: '11px', color: job.state === 'blocked' ? '#ff9b9b' : 'rgba(255, 255, 255, 0.5)' }, { innerText: statusBits.filter(Boolean).join(' • ') }));

            jobsList.appendChild(card);
        });
    }

    function upsertJob(job) { jobs.set(job.id, job); renderJobs(); }

    async function refreshHistory() {
        try {
            const history = await ipcRenderer.invoke('downloader:history');
            history.forEach((job) => jobs.set(job.id, job));
            renderJobs();
        } catch { /* best effort */ }
    }

    ipcRenderer.on('downloader:job-changed', (_event, job) => upsertJob(job));

    // =============================== Files tab ===============================
    const filesPane = styled('div', { display: 'none' });
    const filesToolbar = styled('div', { display: 'flex', gap: '8px', marginBottom: '10px' });
    const filesSearch = styled('input', {
        flex: '1', padding: '7px 10px', borderRadius: '5px', fontSize: '13px',
        background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-color, #e0e0e0)'
    }, { type: 'text', placeholder: 'Search downloaded files...' });
    const filesRefreshBtn = pillButton('Refresh');
    const filesOpenFolderBtn = pillButton('Open Folder');
    filesToolbar.appendChild(filesSearch);
    filesToolbar.appendChild(filesRefreshBtn);
    filesToolbar.appendChild(filesOpenFolderBtn);
    const filesList = styled('div', { display: 'flex', flexDirection: 'column', gap: '6px' });
    filesPane.appendChild(filesToolbar);
    filesPane.appendChild(filesList);

    let allFiles = [];
    function renderFiles() {
        const term = filesSearch.value.trim().toLowerCase();
        const matches = term ? allFiles.filter((file) => file.name.toLowerCase().includes(term)) : allFiles;
        filesList.innerHTML = '';
        if (!matches.length) {
            filesList.appendChild(styled('div', { fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }, { innerText: 'No files found.' }));
            return;
        }
        matches.slice(0, 500).forEach((file) => {
            const row = styled('div', { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', borderRadius: '5px', background: 'rgba(255, 255, 255, 0.03)' });
            row.appendChild(styled('div', { flex: '1', fontSize: '12.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, { innerText: file.name }));
            row.appendChild(styled('div', { fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', width: '70px' }, { innerText: file.category }));
            row.appendChild(styled('div', { fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', width: '70px' }, { innerText: formatBytes(file.size) }));
            if (!file.missing) {
                const openBtn = pillButton('Open');
                openBtn.addEventListener('click', () => ipcRenderer.invoke('downloader:open', file.path));
                const revealBtn = pillButton('Reveal');
                revealBtn.addEventListener('click', () => ipcRenderer.invoke('downloader:reveal', file.path));
                row.appendChild(openBtn);
                row.appendChild(revealBtn);
            } else {
                row.appendChild(styled('div', { fontSize: '11px', color: '#ff9b9b' }, { innerText: 'Missing' }));
            }
            filesList.appendChild(row);
        });
    }
    async function loadFiles() {
        filesList.innerHTML = '';
        filesList.appendChild(styled('div', { fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }, { innerText: 'Scanning...' }));
        try {
            const library = await ipcRenderer.invoke('downloader:library');
            allFiles = library.files;
            renderFiles();
        } catch (error) {
            filesList.innerHTML = '';
            filesList.appendChild(styled('div', { fontSize: '12px', color: '#ff9b9b' }, { innerText: error instanceof Error ? error.message : 'Could not scan the download folder.' }));
        }
    }
    filesSearch.addEventListener('input', renderFiles);
    filesRefreshBtn.addEventListener('click', loadFiles);
    filesOpenFolderBtn.addEventListener('click', () => ipcRenderer.invoke('downloader:open-download-folder'));

    // ============================ Supported Sites tab ==========================
    const sitesPane = styled('div', { display: 'none' });
    const sitesToolbar = styled('div', { display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' });
    const sitesSearch = styled('input', {
        flex: '1', padding: '7px 10px', borderRadius: '5px', fontSize: '13px',
        background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-color, #e0e0e0)'
    }, { type: 'text', placeholder: 'Search supported sites...' });
    const sitesVersionEl = styled('div', { fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', whiteSpace: 'nowrap' });
    sitesToolbar.appendChild(sitesSearch);
    sitesToolbar.appendChild(sitesVersionEl);
    const sitesList = styled('div', { display: 'flex', flexDirection: 'column', gap: '4px' });
    sitesPane.appendChild(sitesToolbar);
    sitesPane.appendChild(sitesList);

    function renderSites() {
        const term = sitesSearch.value.trim().toLowerCase();
        const matches = term ? allSites.filter((site) => site.name.toLowerCase().includes(term)) : allSites.slice(0, 300);
        sitesList.innerHTML = '';
        if (!term && allSites.length > 300) sitesList.appendChild(styled('div', { fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '4px' }, { innerText: `Showing 300 of ${allSites.length}. Search to narrow.` }));
        matches.slice(0, 500).forEach((site) => {
            const row = styled('div', { display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.03)', fontSize: '12px' });
            row.appendChild(styled('div', {}, { innerText: site.name }));
            row.appendChild(styled('div', { color: site.broken ? '#ff9b9b' : 'rgba(255, 255, 255, 0.4)' }, { innerText: site.broken ? 'Broken' : site.type }));
            sitesList.appendChild(row);
        });
    }
    async function loadSites() {
        sitesList.innerHTML = '';
        sitesList.appendChild(styled('div', { fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }, { innerText: 'Loading supported sites...' }));
        try {
            const directory = await ipcRenderer.invoke('downloader:supported-sites');
            allSites = directory.sites;
            sitesLoaded = true;
            sitesVersionEl.innerText = `Engine ${directory.version}`;
            renderSites();
        } catch (error) {
            sitesList.innerHTML = '';
            sitesList.appendChild(styled('div', { fontSize: '12px', color: '#ff9b9b' }, { innerText: error instanceof Error ? error.message : 'Could not load the supported-sites directory.' }));
        }
    }
    sitesSearch.addEventListener('input', renderSites);

    // ================================ Boot ====================================
    body.appendChild(downloadPane);
    body.appendChild(filesPane);
    body.appendChild(sitesPane);
    downloadPane.style.display = 'block';
    updateKindVisibility();
    (async () => {
        try {
            settings = await ipcRenderer.invoke('downloader:get-settings');
            setFolder(settings.outputDirectory);
            qualitySelect.value = settings.defaultQuality;
            containerSelect.value = settings.defaultVideoContainer;
            audioContainerSelect.value = settings.defaultAudioContainer;
        } catch { /* defaults stay blank until the user chooses a folder */ }
    })();
}

module.exports = { initDownloaderUI };
export {};
