'use strict';

chrome.runtime.onInstalled.addListener(function() {
  chrome.alarms.clearAll();
  chrome.browserAction.setBadgeText({ text: '' });
});

chrome.alarms.onAlarm.addListener(function() {
  chrome.browserAction.setBadgeText({ text: '' });
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'vsl_logo.png',
    title: 'Time for Vision Training',
    message: 'Visit the VSL website to continue your training!',
    buttons: [{ title: 'Remind me Tomorrow.' }],
    priority: 0
  });
});

chrome.notifications.onButtonClicked.addListener(function() {
  chrome.storage.sync.get(['minutes'], function(item) {
    chrome.browserAction.setBadgeText({ text: 'ON' });
    chrome.alarms.create({ delayInMinutes: item.minutes });
  });
});
