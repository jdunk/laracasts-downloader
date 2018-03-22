import * as u from './util.js';

u.debugLog('in background.js', 3);

let messageHandler = {
  download: function handleDownloadAction(data, cb) {
    u.debugLog('i will download now:');
    u.debugLog(data);
    u.debugLog(chrome.downloads);
  }
};

function onMessageReceived(messagePort, data) {
  u.debugLog({'message recd': data});

  messageHandler[data.action](data, function(response) {
    messagePort.postMessage(response);
  });
}

chrome.runtime.onConnect.addListener(function(messagePort) {
  messagePort.onMessage.addListener(function(data) {
    onMessageReceived(messagePort, data);
  });
});

chrome.browserAction.onClicked.addListener(function(tab) {

  chrome.tabs.executeScript(tab.id, { file: 'browser-action-clicked-load.js' }, function() {
    //chrome.tabs.executeScript({ file: 'content-script.js' });
  });
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
