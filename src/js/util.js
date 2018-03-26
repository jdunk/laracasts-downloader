export let debugLogLevel = 4;

export function debugLog(logMe, logLevel)
{
  if (debugLogLevel < logLevel) { return; }

  if (typeof logMe === 'string')
  {
    console.debug('%c' + logMe, 'background: #f3f; font-size: 20px');
  }
  else
  {
    console.debug('%cdebugLog:', 'background: #f3f; font-size: 20px');
    console.debug(logMe);
  }
}

export function ready(fn) {
  if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading"){
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

export function doXhr(method, url, onSuccess, onError) {
  var xhr = new XMLHttpRequest();

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
}
