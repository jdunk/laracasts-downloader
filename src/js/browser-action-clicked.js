import * as u from './util.js';

u.debugLog('inside browser-action-clicked.js');
let messagePort = chrome.runtime.connect({ name: 'bgtalk' });

messagePort.postMessage({ action: 'download', data: gatherLessonUrls() });

function gatherLessonUrls() {
    let href = window.location.href;

    if (!href.startsWith("https://laracasts.com/series/") && !href.startsWith("https://www.laracasts.com/series/")) {
        return false;
    }

    if (href.includes('/episodes/')) {
        return false;
    }

    return [... document.querySelectorAll('li .episode-list-item a.position')].map((e) => e.href );
}
