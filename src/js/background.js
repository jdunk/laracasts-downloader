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

  u.debugLog('storage.sync changed:');
  _forOwn(changes, (values, key) => { settings[key] = values.newValue; } );

});

chrome.downloads.onCreated.addListener((downloadItem) => {
console.log('download created!');
//  let theFile = downloadQ.findByDownloadId(downloadItem.id);
//  theFile.downloadState = downloadItem.state;
  console.log({downloadItem});
});

chrome.downloads.onChanged.addListener((downloadItem) => {
console.log('download changed!');
  let theFile = downloadQ.findByDownloadId(downloadItem.id);
  if (downloadItem.state) {
    theFile.downloadState = downloadItem.state.current;
    
    if (theFile.downloadState === 'complete') {
      downloadQ.downloadAllTheThings();
    }
  }
  console.log({downloadItem});
});

chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggestFn) => {
  u.debugLog({downloadItem});
  console.log({settings});
  let path = settings.defaultDownloadDir || '';
  let theFile = downloadQ.findByDownloadId(downloadItem.id);

  u.debugLog({path, theFile});

  suggestFn({
    filename: (path ? path + '/' : '') + (theFile.coursePath ? theFile.coursePath + '/' : '') + downloadItem.filename,
    conflictAction: "overwrite", // "uniquify", "overwrite", or "prompt"
  });
})

let downloadQ = {

  q: [],

  findByDownloadId: function(downloadId) {
    return _find(this.q, { downloadId });
  },

  getNumCurrentlyDownloading: function() {
    return _filter(this.q, (f) => { return f.downloadState && f.downloadState == 'in_progress'; }).length; 
  },

  getUnstartedDownloads: function() {
    return _filter(this.q, (f) => { return !f.downloadState; }); 
  },

  startDownloadProcess: function(lessonUrls) {
    u.debugLog('i will download now:');
    u.debugLog(lessonUrls);

    this.addLessons(lessonUrls);

    console.log({downloadQ: _cloneDeep(this.q)});

    this.process();
  },

  addLessons: function(lessonUrls) {
    this.q = this.q.concat(lessonUrls.map( url => ({
      lessonUrl: url,
      coursePath: (function() {
        let matches = url.match(/\/series\/(.+)\/episodes\//);
        return matches && matches.length && matches[1];
      })(),
    }) ));
  },

  process: function() {
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

            if (_every(this.q, 'downloadUrl')) {
              this.downloadAllTheThings();
            }
          }
        );
      }
    });
  },

  downloadAllTheThings: function() {
    if (this.getNumCurrentlyDownloading() >= settings.maxConcurrentDownloads) {
      return;
    }

    this.getUnstartedDownloads().forEach(item => {
      if (this.getNumCurrentlyDownloading() >= settings.maxConcurrentDownloads) {
        return;
      }

      item.downloadState = 'in_progress';

      chrome.downloads.download(
        {
          url: item.downloadUrl,
          saveAs: false,
        },
        (downloadId) => {
          item.downloadId = downloadId;
          u.debugLog('download callback called: ' + downloadId);
        }
      );
    });
  }
};

let messageHandler = {
  download: (data) => downloadQ.startDownloadProcess(data)
};

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

var doXhr = function(method, url, onSuccess, onError) {
  var xhr = new XMLHttpRequest()

  xhr.onload = function() {
    onSuccess(xhr.responseText);
  };

  if (typeof onError !== 'undefined') {
    xhr.onerror = function() {
      onError(xhr);
    }
  }

  xhr.open(method, url, true);

  xhr.send();
};
