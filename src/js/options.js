// Saves options to chrome.storage
function save_options() {
  let defaultDownloadDir = document.getElementById('defaultDownloadDir').value,
      maxD = document.getElementById('maxConcurrentDownloads').value;

  chrome.storage.sync.set({
    defaultDownloadDir: defaultDownloadDir || "",
    maxConcurrentDownloads: (maxD > 0 && maxD <= 9) ? maxD : 4
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Settings saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.sync.get([
    'stopEverything',
    'defaultDownloadDir',
    'maxConcurrentDownloads',
  ], function(items) {
    document.getElementById('stopEverything').checked = items.stopEverything || false;
    document.getElementById('defaultDownloadDir').value = items.defaultDownloadDir || "";
    document.getElementById('maxConcurrentDownloads').value = items.maxConcurrentDownloads || 4;
  });
}

document.addEventListener('DOMContentLoaded', function () {
  restore_options();

  var checkbox = document.querySelector('input[type="checkbox"]');

  checkbox.addEventListener('change', function () {
    chrome.storage.sync.set({
      stopEverything: checkbox.checked
    });
  });
});

document.getElementById('save').addEventListener('click', save_options);