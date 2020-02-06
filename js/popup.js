'use strict';

const MSEC_to_SEC = 1000;
const SEC_to_MIN = 60;
const MIN_to_HRS = 60;
const HRS_to_DAY = 24;
const DAY_IN_MILLISECONDS = HRS_to_DAY * MIN_to_HRS * SEC_to_MIN * MSEC_to_SEC;
const PERIOD_IN_MINUTES = HRS_to_DAY * MIN_to_HRS;

function getDelayInMinutes(timeIn) {
  const now = new Date();
  const nowDateStr = now.toLocaleString().split(',')[0];
  const alarmDate = new Date(nowDateStr + ' ' + timeIn);
  let delayMsec = alarmDate.getTime() - now.getTime();
  delayMsec = delayMsec >= 0 ? delayMsec : delayMsec + DAY_IN_MILLISECONDS;
  return Math.ceil(delayMsec / MSEC_to_SEC / SEC_to_MIN);
}

function formatTimeString(timeIn) {
  const now = new Date();
  const nowDateStr = now.toLocaleString().split(',')[0];
  const alarmDate = new Date(nowDateStr + ' ' + timeIn);
  return alarmDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function setAlarm(event) {
  event.preventDefault();
  if (!document.getElementById('reminder-form').checkValidity()) return;
  chrome.storage.sync.get('reminders', function(data) {
    // Get user inputs
    const name = document.getElementById('reminder-name').value;
    const time = document.getElementById('reminder-time').value;

    // Retrive persisted remainder data as a Map
    const reminders = data.reminders;
    const names = new Map(reminders.map(r => [r.name, r]));
    const times = new Map(reminders.map(r => [r.time, r]));
    let overwrite = false;

    // Test if new reminder name is already in use
    if (names.has(name)) {
      const msg = `The name: "${name}" is already used. Do you want to overwrite its value?`;
      if (!confirm(msg)) {
        return;
      } else {
        overwrite = true;
      }
    }

    // Test if new reminder time is already in use
    if (times.has(time)) {
      const timeString = formatTimeString(time);
      const msg = `There is already a notification set for ${timeString}. Set another time.`;
      alert(msg);
      return;
    }

    // Persist reminder data
    let newReminder = { name, time };
    if (overwrite) {
      const i = reminders.findIndex(r => r.name === name);
      reminders.splice(i, 1);
    }
    reminders.push(newReminder);
    reminders.sort((a, b) => {
      if (a.time < b.time) return -1;
      else if (a.time === b.time) return 0;
      else return 1;
    });
    chrome.storage.sync.set({ reminders }, function() {
      if (chrome.runtime.lastError) {
        console.log('Error adding reminder.');
      } else {
        const msg = overwrite ? `Updated reminder:` : `Added reminder:`;
        console.log(msg, newReminder);
      }
    });

    // Create daily reminder
    const delayInMinutes = getDelayInMinutes(time);
    const periodInMinutes = PERIOD_IN_MINUTES;
    chrome.alarms.create(name, { delayInMinutes, periodInMinutes });
  });
}

function clearAllAlarms() {
  chrome.storage.sync.set({ reminders: [] });
  chrome.alarms.clearAll();
}

// event handler on list (handle span events via delegation)
function clearAlarm(event) {
  // handle only span click events
  if (!event.target.hasAttribute('data-remove-name')) return;
  const name = event.target.dataset.removeName;

  chrome.storage.sync.get('reminders', function(data) {
    if (!data || !data.reminders) return;

    const reminders = data.reminders;
    const i = reminders.findIndex(r => r.name === name);
    const r = reminders[i];

    // Confirm deletion
    const rStr = `${r.name} - ${formatTimeString(r.time)}`;
    const msg = `Do you want to delete reminder: ${rStr}.`;
    if (!confirm(msg)) return;

    // Delete from data model
    reminders.splice(i, 1);

    // Persist reminders data
    chrome.storage.sync.set({ reminders }, function() {
      if (chrome.runtime.lastError) {
        console.log('Error deleting reminder.');
      } else {
        const msg = `Deleted reminder: ${rStr}.`;
        console.log(msg);
      }
    });

    // Remove notification
    chrome.alarms.clear(r.name);
  });
}

function render() {
  chrome.storage.sync.get('reminders', function(data) {
    if (!data || !data.reminders) return;

    // render badge
    if (data.reminders.length > 0) {
      chrome.browserAction.setBadgeText({ text: 'ON' });
    } else {
      chrome.browserAction.setBadgeText({ text: '' });
    }

    // render list
    const listHTMLString = data.reminders
      .map(function(reminder) {
        return `<li>${
          reminder.name
        } - ${formatTimeString(reminder.time)} <span data-remove-name="${reminder.name}">x</span></li>`;
      })
      .join('');

    const reminderList = document.getElementById('reminder-list');
    reminderList.innerHTML = listHTMLString;
  });
}

window.addEventListener('DOMContentLoaded', function(event) {
  //An Alarm delay of less than the minimum 1 minute will fire
  // in approximately 1 minute incriments if released
  document
    .getElementById('reminder-clear-all')
    .addEventListener('click', clearAllAlarms);
  document.getElementById('reminder-form').addEventListener('submit', setAlarm);
  document
    .getElementById('reminder-list')
    .addEventListener('click', clearAlarm);
  render();
});

chrome.runtime.onMessage.addListener(function(request) {
  window[request.action]();
});
