'use strict';

const newURL = 'https://esports.visionsciencelabs.com';

chrome.runtime.onInstalled.addListener(function(details) {
  const currentVersion = chrome.runtime.getManifest().version;
  const previousVersion = details.previousVersion;
  const reason = details.reason;

  console.log(`Previous Version: ${previousVersion}`);
  console.log(`Current Version: ${currentVersion}`);

  switch (reason) {
    case 'install':
      console.log('New User installed the extension.');
      chrome.alarms.clearAll();
      chrome.browserAction.setBadgeText({ text: '' });
      chrome.storage.sync.clear(function() {
        if (chrome.runtime.lastError) {
          console.log('Error while clearing storage.');
        } else {
          console.log('cleared storage.');
        }
        chrome.storage.sync.set({ reminders: [] }, function() {
          if (chrome.runtime.lastError) {
            console.log('Error while setting initial value for reminders.');
          } else {
            console.log('reminders initialized to empty.');
          }
        });
      });
      break;
    case 'update':
      console.log('User has updated their extension.');
      chrome.alarms.getAll(function(alarms) {
        if (alarms.length > 0) {
          chrome.browserAction.setBadgeText({ text: 'ON' });
        }
      });
      break;
    case 'chrome_update':
    case 'shared_module_update':
    default:
      console.log('Other install events within the browser');
      break;
  }
});

chrome.alarms.onAlarm.addListener(function() {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'images/vsl_logo.png',
    title: 'Time for Vision Training',
    message: 'Visit the VSL website to continue your training!',
    buttons: [{ title: 'Ok' }, { title: 'Snooze' }],
    priority: 0,
    requireInteraction: true
  });
});

chrome.notifications.onButtonClicked.addListener(function(notId, btnId) {
  if (btnId === 0) {
    chrome.tabs.create({ url: newURL });
  } else if (btnId === 1) {
    chrome.alarms.create({ delayInMinutes: 10 });
  }
});

chrome.notifications.onClicked.addListener(function(notId) {
  chrome.tabs.create({ url: newURL });
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
  for (var key in changes) {
    if (namespace === 'sync' && key === 'reminders') {
      chrome.runtime.sendMessage({ action: 'render' });
    }
  }
});
