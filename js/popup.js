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
  const msg = 'Do you want to remove all reminders?';
  if (!confirm(msg)) return;

  chrome.storage.sync.set({ reminders: [] });
  chrome.alarms.clearAll();
}

function clearAlarm(event) {
  alert('Deleting');

  /*
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
  */
}

function editAlarm(event) {
  // TODO: populate form
  // TODO: Heading of form should say "Edit Reminder"

  // Open Modal
  const addModal = document.getElementById('add-modal');
  addModal.classList.add('active');
}

function render() {
  const remindersList = document.getElementById('reminders-list');
  const emptyListContent = `<li class="empty-list-item">No Reminders</li>`;

  chrome.storage.sync.get('reminders', function(data) {
    if (!data || !data.reminders) {
      remindersList.classList.add('empty');
      remindersList.innerHTML = emptyListContent;
      return;
    }

    // TODO: revist the badge rendering logic; add blinker instead
    // render badge
    if (data.reminders.length > 0) {
      chrome.browserAction.setBadgeText({ text: 'ON' });
    } else {
      chrome.browserAction.setBadgeText({ text: '' });
    }

    // render list
    const listHTMLString = data.reminders
      .map(function(reminder, index) {
        console.log(index, reminder);
        return getItemString({ ...reminder, index });
      })
      .join('');

    // List is empty or has at least one item
    if (data.reminders.length > 0) {
      remindersList.innerHTML = listHTMLString;
      remindersList.classList.remove('empty');
    } else {
      remindersList.innerHTML = emptyListContent;
      remindersList.classList.add('empty');
    }
  });
}

function getItemString(itemData) {
  const days = new Set(itemData.days);

  return `
  <li class="item">
    <div class="time">
      <span>${itemData.time}</span>
    </div>
    <div class="days">
      <span ${!days.has('Mon') ? 'class="disabled"' : ''}>Mon</span>
      <span ${!days.has('Tue') ? 'class="disabled"' : ''}>Tue</span>
      <span ${!days.has('Wed') ? 'class="disabled"' : ''}>Wed</span>
      <span ${!days.has('Thu') ? 'class="disabled"' : ''}>Thu</span>
      <span ${!days.has('Fri') ? 'class="disabled"' : ''}>Fri</span>
      <span ${!days.has('Sat') ? 'class="disabled"' : ''}>Sat</span>
      <span ${!days.has('Sun') ? 'class="disabled"' : ''}>Sun</span>
    </div>
    <div class="controls">
      <button class="edit-btn" data-item-index="${itemData.index}">
        <i class="fas fa-pen"></i> Edit
      </button>
      <button class="remove-btn" data-item-index="${itemData.index}">
        <i class="fas fa-minus"></i> Remove
      </button>
    </div>
  </li>
  `;
}

window.addEventListener('DOMContentLoaded', function(event) {
  // An Alarm delay of less than the minimum 1 minute will fire
  // in approximately 1 minute incriments if released
  /*
  document
    .getElementById('reminder-clear-all')
    .addEventListener('click', clearAllAlarms);
  document.getElementById('reminder-form').addEventListener('submit', setAlarm);
  document
    .getElementById('reminder-list')
    .addEventListener('click', clearAlarm);
  render();
  */

  // New Stuff
  const addReminderBtn = document.getElementById('add-reminder-btn');
  const addModal = document.getElementById('add-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const appCloseBtn = document.getElementById('app-close-btn');
  const remindersList = document.getElementById('reminders-list');
  const removeRemindersBtn = document.getElementById('remove-reminders-btn');

  addReminderBtn.addEventListener('click', e => {
    addModal.classList.add('active');
  });

  closeModalBtn.addEventListener('click', e => {
    addModal.classList.remove('active');
  });

  appCloseBtn.addEventListener('click', e => {
    window.close();
  });

  // event handler on list (handle span events via delegation)
  remindersList.addEventListener('click', e => {
    // handle only span click events for edit/delete buttons
    if (!e.target.hasAttribute('data-item-index')) return;

    if (e.target.classList.contains('edit-btn')) {
      editAlarm(e);
    } else {
      clearAlarm(e);
    }
  });

  removeRemindersBtn.addEventListener('click', e => {
    clearAllAlarms();
  });

  // TODO: remove the hard coded data
  chrome.storage.sync.set({
    reminders: [
      {
        time: '11:00 AM',
        days: ['Mon', 'Wed', 'Sat', 'Fri']
      },
      {
        time: '04:00 PM',
        days: ['Mon', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      }
    ]
  });

  render();
});

chrome.runtime.onMessage.addListener(function(request) {
  window[request.action]();
});
