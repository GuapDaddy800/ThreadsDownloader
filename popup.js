(() => {
  'use strict';
  const enabled = document.querySelector('#enabled');
  const askWhere = document.querySelector('#askWhere');
  const folder = document.querySelector('#folder');
  const folderNote = document.querySelector('#folder-note');
  const status = document.querySelector('#status');
  let statusTimer;
  const indicateSaved = () => {
    status.textContent = 'Saved';
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { status.textContent = ''; }, 1800);
  };
  const updateFolderState = () => {
    const disabled = askWhere.checked;
    folder.disabled = disabled;
    folderNote.textContent = disabled
      ? 'Your browser will ask where to save each file.'
      : "Files are saved inside your browser's Downloads folder.";
  };
  const cleanFolder = value => String(value || '').split(/[\/]+/)
    .map(part => part.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/^\.+/, '').slice(0, 80))
    .filter(part => part && part !== '.' && part !== '..')
    .join('/') || 'ThreadsDownloader';

  chrome.storage.local.get({ enabled: true, askWhere: true, folder: 'ThreadsDownloader' }, settings => {
    enabled.checked = settings.enabled !== false;
    askWhere.checked = settings.askWhere !== false;
    folder.value = settings.folder || 'ThreadsDownloader';
    updateFolderState();
  });
  enabled.addEventListener('change', () => chrome.storage.local.set({ enabled: enabled.checked }, indicateSaved));
  askWhere.addEventListener('change', () => {
    updateFolderState();
    chrome.storage.local.set({ askWhere: askWhere.checked }, indicateSaved);
  });
  folder.addEventListener('change', () => {
    folder.value = cleanFolder(folder.value);
    chrome.storage.local.set({ folder: folder.value }, indicateSaved);
  });
})();
