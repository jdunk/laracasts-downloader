import * as u from './util.js';
import _cloneDeep from 'lodash/cloneDeep';
import _every from 'lodash/every';
import _filter from 'lodash/filter';
import _find from 'lodash/find';
import _forOwn from 'lodash/forOwn';

u.debugLog('in background.js 2', 3);

// Init settings
let settings = {};
chrome.storage.sync.get(null, (data) => {
  settings = data;
  u.debugLog('settings onInit');
  u.debugLog({settings});
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') { return; }

  _forOwn(changes, (values, key) => { settings[key] = values.newValue; } );

  if (changes.stopEverything && changes.stopEverything.newValue) {
    downloadQ.onKillswitchThrown();
  }

  u.debugLog('storage.sync changed:');
  u.debugLog({settings});
});

chrome.downloads.onCreated.addListener((downloadItem) => {
  u.debugLog('download created');
  u.debugLog({downloadItem});
});

chrome.downloads.onChanged.addListener((downloadItem) => {
  u.debugLog('Download changed');
  u.debugLog({downloadItem});

  let theFile = downloadQ.findByDownloadId(downloadItem.id);
  if (!theFile) { return; }

  if (downloadItem.state) {
    theFile.downloadState = downloadItem.state.current;
    
    if (theFile.downloadState === 'complete') {
      downloadQ.startNextDownload();
    }
  }
});

chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggestFn) => {
  u.debugLog({downloadItem});
  u.debugLog({settings});
  let path = settings.defaultDownloadDir || '';
  let theFile = downloadQ.findByDownloadId(downloadItem.id);

  if (!theFile) {
    if (downloadItem.byExtensionId === chrome.runtime.id) {
      chrome.downloads.cancel(downloadItem.id);
    }

    return;
  }

  u.debugLog({path, theFile});

  let dlFilename = downloadItem.filename;

  if (dlFilename === 'download.html') {
    downloadQ.onKillswitchThrown();

    alert("Error: It looks like you don't currently have a paid laracasts.com membership (or you are not currently signed in).");
    chrome.downloads.cancel(downloadItem.id);
    return;
  }

  let filename = dlFilename,
      matches,
      lessonNum;
  
  if (matches = dlFilename.match(/([0-9]+)-(.*)/)) {
    filename = matches[1].padStart(2, '0') + '-' + matches[2];
  }
  else {
    filename = theFile.lessonNum.padStart(2, '0') + '-' + filename;
  }

  suggestFn({
    filename: (path ? path + '/' : 'laracasts/') + (theFile.coursePath ? theFile.coursePath + '/' : '') + filename,
    conflictAction: "overwrite", // "uniquify", "overwrite", or "prompt"
  });
})

let downloadQ = {

  q: [],

  onKillswitchThrown: function() {
    u.debugLog('killswitch thrown');
    this.q = [];
    updateRemainingNumItems();
  },

  findByDownloadId: function(downloadId) {
    return _find(this.q, { downloadId });
  },

  getNumCurrentlyDownloading: function() {
    return _filter(this.q, (f) => { return f.downloadState && f.downloadState == 'in_progress'; }).length; 
  },

  getNumUnstarted: function() {
    let items = _filter(this.q, (f) => { return !f.downloadId; }); 

    if (!items) { return 0; }

    return items.length;
  },

  getNextReadyToStart: function() {
    let item = _find(this.q, (f) => { return !f.downloadId; }); 
    
    if (!item || item.xhrPending !== 'done' || item.downloadState) {
      return false;
    }

    return item;
  },

  startDownloadProcess: function(lessonUrls) {

    if (lessonUrls === false) {
      alert("This only works from a Laracasts series index page where all the episodes are listed.\n\nThe URL should start with:\n\nhttps://laracasts.com/series/\n\n...and it should *not* be an episode page.");
      return;
    }

    if (!lessonUrls.length) {
      alert("Hmmm, that's odd. Laracasts Downloader couldn't find any lesson URLs on this page. Please contact me immediately and I will fix this! Be sure to include which URL you were on.");
      return;
    }

    if (settings.stopEverything) {
      if (! confirm('The Killswitch is currently ON. Press "OK" to have it switched it OFF and to continue downloading...')) {
        return;
      }

      // Switch off killswitch and continue downloading...

      chrome.storage.sync.set({
        stopEverything: false
      });

      settings.stopEverything = false;
    }

    u.debugLog('i will download now:');
    u.debugLog(lessonUrls);

    this.addLessons(lessonUrls);

    u.debugLog({downloadQ: _cloneDeep(this.q)});

    this.process();
  },

  addLessons: function(lessonUrls) {
    // First, filter out any URLs already enqueued
    let q = this.q;

    lessonUrls = _filter(lessonUrls, (url) => {
      return ! _find(q, (item) => {
        return item.lessonUrl == url && (!item.downloadState || item.downloadState == 'in_progress');
      });
    });

    // Then add each as an object with props including 'coursePath' and 'lessonNum'
    this.q = this.q.concat(lessonUrls.map( url => ({
      lessonUrl: url,
      coursePath: (function() {
        let matches = url.match(/\/series\/(.+)\/episodes\//);
        return matches && matches.length && matches[1];
      })(),
      lessonNum: (function() {
        let matches = url.match(/\/series\/.+\/episodes\/([0-9]+)/);
        return matches && matches.length && matches[1];
      })(),
    }) ));

    updateRemainingNumItems();
  },

  process: function() {
    u.debugLog(_cloneDeep(this.q));
    this.q.forEach(item => {
      if (!item.downloadUrl && !item.xhrPending) {
        item.xhrPending = true;

        u.doXhr(
          'GET',
          item.lessonUrl,
          (xhrResponseText) => {
            item.xhrPending = 'done';
            let matches = xhrResponseText.match(/href=['"]\/downloads\/([^'"]+)/);

            if (! matches) {
              alert("Oh no! The regex didn't match the download URL");
              return;
            }
              
            item.downloadUrl = 'https://laracasts.com/downloads/' + matches[1];

            this.startNextDownload();
          }
        );
      }
    });

    u.debugLog('process() done');
    u.debugLog(_cloneDeep(this.q));
  },

  startNextDownload: function() {
    if (settings.stopEverything || this.getNumCurrentlyDownloading() >= settings.maxConcurrentDownloads) {
      return;
    }

    let item = this.getNextReadyToStart();
    if (!item || this.getNumCurrentlyDownloading() >= settings.maxConcurrentDownloads) {
      return;
    }

    item.downloadState = 'in_progress';

u.debugLog('About to start downloading lesson ' + item.lessonNum);
u.debugLog(_cloneDeep(this.q));
    chrome.downloads.download(
      {
        url: item.downloadUrl,
        saveAs: false,
      },
      (downloadId) => {
        u.debugLog('download callback called: ' + downloadId);
        item.downloadId = downloadId;
        updateRemainingNumItems();
        downloadQ.startNextDownload();
      }
    );
  }
};

let messageHandler = {
  download: (data) => downloadQ.startDownloadProcess(data)
};

function updateRemainingNumItems() {
  chrome.browserAction.setBadgeText({ text: '' + (downloadQ.getNumUnstarted() || "") });
}

function onMessageReceived(messagePort, data) {
  u.debugLog({'message recd': data});

  messageHandler[data.action](data.data, function(response) {
    messagePort.postMessage(response);
  });
}

chrome.runtime.onConnect.addListener(function(messagePort) {
  messagePort.onMessage.addListener(function(data) {
    onMessageReceived(messagePort, data);
  });
});

chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.executeScript(tab.id, { file: 'browser-action-clicked.bundle.js' });
});
