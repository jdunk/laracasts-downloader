import * as u from './util.js';

u.debugLog('inside browser-action-clicked.js');
var messagePort = chrome.runtime.connect({ name: 'bgtalk' });

messagePort.postMessage({ action: 'download', data: gatherDownloadUrls() });

function gatherDownloadUrls() {
    return [... document.querySelectorAll('li.episode-list-item a.position')].map((e) => e.href );
}
