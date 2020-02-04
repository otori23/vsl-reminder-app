'use strict';

chrome.runtime.onInstalled.addListener(function() {
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
});

chrome.alarms.onAlarm.addListener(function() {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'images/vsl_logo.png',
    title: 'Time for Vision Training',
    message: 'Visit the VSL website to continue your training!',
    buttons: [{ title: 'Ok' }, { title: 'Cancel' }],
    priority: 0
  });
});

chrome.notifications.onButtonClicked.addListener(function(notId, btnId) {
  if (btnId === 0) {
    var newURL = 'https://www.visionsciencelabs.com/';
    chrome.tabs.create({ url: newURL });
  }
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
  for (var key in changes) {
    if (namespace === 'sync' && key === 'reminders') {
      chrome.runtime.sendMessage({ action: 'render' });
    }
  }
});
