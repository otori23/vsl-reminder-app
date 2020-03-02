'use strict';

const MSEC_to_SEC = 1000;
const SEC_to_MIN = 60;
const MIN_to_HRS = 60;
const HRS_to_DAY = 24;
const DAY_IN_MILLISECONDS = HRS_to_DAY * MIN_to_HRS * SEC_to_MIN * MSEC_to_SEC;
const DAYS_IN_WEEK = 7;
const PERIOD_IN_MINUTES = DAYS_IN_WEEK * HRS_to_DAY * MIN_to_HRS;

const newReminder = {
  time: '',
  days: new Set()
};
let editIndex = -1;

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

function setAlarm(reminder) {
  const now = new Date();
  const days = new Set(reminder.days);
  const createdAlarmNames = new Set();

  for (let i = 0; i <= DAYS_IN_WEEK; i++) {
    const alarmDate = new Date(now.getTime() + i * DAY_IN_MILLISECONDS);
    const alarmDateStr = alarmDate.toLocaleString().split(',')[0];
    const timeStr = formatTimeString(reminder.time);
    const alarmDateTime = new Date(alarmDateStr + ' ' + timeStr);
    const nextAlarmDay = alarmDateTime.toString().split(' ')[0];
    if (days.has(nextAlarmDay)) {
      const name = `${reminder.time}-${nextAlarmDay}`;
      const when = alarmDateTime.getTime();
      const periodInMinutes = PERIOD_IN_MINUTES;

      const delta = when - now.getTime();
      if (delta < 0) continue; // alarm for same day, but time has passed that day

      if (!createdAlarmNames.has(name)) {
        chrome.alarms.create(name, { when, periodInMinutes });
        createdAlarmNames.add(name);
      }
    }
  }
}

function clearAllAlarms() {
  const msg = 'Do you want to remove all reminders?';
  if (!confirm(msg)) return;

  chrome.storage.sync.set({ reminders: [] });
  chrome.alarms.clearAll();
}

function clearAlarm(reminder) {
  reminder.days.forEach(d => {
    const name = `${reminder.time}-${d}`;
    chrome.alarms.clear(name);
  });
}

function openEditReminderModal(event) {
  // Set Edit Mode
  editIndex = event.target.dataset.itemIndex;

  // Set Modal Title
  const titleElem = document.querySelector('.modal-header h3');
  titleElem.innerHTML = 'Edit Reminder';

  chrome.storage.sync.get('reminders', function(data) {
    const reminders = data.reminders;
    const r = reminders[editIndex];
    const form = document.getElementById('form');

    // Set time
    form.time.value = r.time;

    // Set days
    const checkboxes = document.querySelectorAll('form .checkbox');
    const days = new Set(r.days);
    checkboxes.forEach(chb => {
      if (days.has(chb.name)) {
        form[chb.name].checked = true;
      }
    });

    // Set newReminder
    newReminder.days = new Set(r.days);
    newReminder.time = r.time;

    // Open Modal
    const addModal = document.getElementById('add-modal');
    addModal.classList.add('active');
  });
}

function openAddReminderModal(event) {
  // Set Modal Title
  const titleElem = document.querySelector('.modal-header h3');
  titleElem.innerHTML = 'Add Reminder';

  // Open Modal
  const addModal = document.getElementById('add-modal');
  addModal.classList.add('active');
}

function render() {
  const remindersList = document.getElementById('reminders-list');
  const emptyListContent = `<li class="empty-list-item">No Reminders</li>`;
  const removeRemindersBtn = document.getElementById('remove-reminders-btn');
  chrome.storage.sync.get('reminders', function(data) {
    if (!data || !data.reminders) {
      remindersList.classList.add('empty');
      removeRemindersBtn.classList.add('empty');
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
        return getItemString({ ...reminder, index });
      })
      .join('');

    // List is empty or has at least one item
    if (data.reminders.length > 0) {
      remindersList.innerHTML = listHTMLString;
      remindersList.classList.remove('empty');
      removeRemindersBtn.classList.remove('empty');
    } else {
      remindersList.innerHTML = emptyListContent;
      remindersList.classList.add('empty');
      removeRemindersBtn.classList.add('empty');
    }
  });
}

function getItemString(itemData) {
  const days = new Set(itemData.days);

  return `
  <li class="item">
    <div class="time">
      <span>${formatTimeString(itemData.time)}</span>
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

function resetForm() {
  document.getElementById('form').reset();
  newReminder.time = '';
  newReminder.days = new Set();
  editIndex = -1;
}

function addReminder() {
  chrome.storage.sync.get('reminders', function(data) {
    // Retrive persisted remainder data as a Map
    const reminders = data.reminders;
    const times = new Map(reminders.map(r => [r.time, r]));
    let overwrite = false;

    // Test if new reminder time is already in use
    if (times.has(newReminder.time)) {
      const t = formatTimeString(newReminder.time);
      const msg = `There is already a notification set for ${t}. Overwrite?`;
      if (!confirm(msg)) {
        return;
      } else {
        overwrite = true;
      }
    }

    // Handle overwrite
    if (overwrite) {
      const i = reminders.findIndex(r => r.time === newReminder.time);
      reminders.splice(i, 1);
    }

    // Persist reminder data
    reminders.push({ ...newReminder, days: Array.from(newReminder.days) });
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

    // Create the System Alarm
    setAlarm(newReminder);

    // Clean up
    closeModal();
  });
}

function editReminder() {
  chrome.storage.sync.get('reminders', function(data) {
    // Retrive persisted remainder data as a Map
    const reminders = data.reminders;
    const newRem = {
      ...newReminder,
      days: Array.from(newReminder.days)
    };
    const oldRem = reminders.splice(editIndex, 1, newRem)[0];

    // Remove old alarms
    clearAlarm(oldRem);

    // Persist reminder data
    chrome.storage.sync.set({ reminders }, function() {
      if (chrome.runtime.lastError) {
        console.log('Error editing reminder.');
      } else {
        console.log('Edited reminder.', newReminder);
      }
    });

    // Set new Alarms
    setAlarm(newRem);

    // Clean up
    closeModal();
  });
}

function removeReminder(e) {
  const i = e.target.dataset.itemIndex;

  chrome.storage.sync.get('reminders', function(data) {
    if (!data || !data.reminders) return;

    const reminders = data.reminders;
    const r = reminders[i];

    // Confirm deletion
    const rStr = formatTimeString(r.time) + ' [' + r.days.join(',') + ']';
    const msg = 'Do you want to remove reminder:';
    if (!confirm(msg + '\n' + rStr + '.')) return;

    // Delete from data model
    reminders.splice(i, 1);

    // Persist reminders data
    chrome.storage.sync.set({ reminders }, function() {
      if (chrome.runtime.lastError) {
        console.log('Error deleting reminder.');
      } else {
        console.log(`Deleted reminder: ${rStr}.`);
      }
    });

    clearAlarm(r);
  });
}

function validateCheckboxInputs() {
  let res = true;
  const daysRow = document.querySelector('.row.days');

  // Checkboxes
  if (newReminder.days.size === 0) {
    daysRow.classList.add('error');
    res = false;
  } else {
    daysRow.classList.remove('error');
  }

  return res;
}

function validateTimeInput() {
  let res = true;
  const timeRow = document.querySelector('.row.time');

  // Time
  if (newReminder.time === '') {
    timeRow.classList.add('error');
    res = false;
  } else {
    timeRow.classList.remove('error');
  }

  return res;
}

function checkFormInputs() {
  const checkboxValid = validateCheckboxInputs();
  const timeValid = validateTimeInput();
  return checkboxValid && timeValid;
}

function closeModal() {
  const addModal = document.getElementById('add-modal');
  addModal.classList.remove('active');
  resetForm();
}

window.addEventListener('DOMContentLoaded', function(event) {
  const addReminderBtn = document.getElementById('add-reminder-btn');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const appCloseBtn = document.getElementById('app-close-btn');
  const remindersList = document.getElementById('reminders-list');
  const removeRemindersBtn = document.getElementById('remove-reminders-btn');
  const form = document.getElementById('form');
  const timeInput = document.getElementById('time');
  const formOkBtn = document.getElementById('form-ok-btn');
  const formCancelBtn = document.getElementById('form-cancel-btn');

  addReminderBtn.addEventListener('click', e => {
    openAddReminderModal(e);
  });

  closeModalBtn.addEventListener('click', e => {
    closeModal();
  });

  appCloseBtn.addEventListener('click', e => {
    window.close();
  });

  // event handler on list (handle span events via delegation)
  remindersList.addEventListener('click', e => {
    // handle only span click events for edit/delete buttons
    if (!e.target.hasAttribute('data-item-index')) return;

    if (e.target.classList.contains('edit-btn')) {
      openEditReminderModal(e);
    } else {
      removeReminder(e);
    }
  });

  removeRemindersBtn.addEventListener('click', e => {
    clearAllAlarms();
  });

  form.addEventListener('click', e => {
    const isDay = e.target.classList.contains('checkbox');

    if (!isDay) return;

    if (e.target.checked) {
      newReminder.days.add(e.target.dataset.day);
    } else {
      newReminder.days.delete(e.target.dataset.day);
    }

    validateCheckboxInputs();
  });

  timeInput.addEventListener('change', e => {
    const t = e.target.value;
    newReminder.time = !!t ? e.target.value : '';
    validateTimeInput();
  });

  formOkBtn.addEventListener('click', e => {
    e.preventDefault();
    if (checkFormInputs()) {
      editIndex < 0 ? addReminder() : editReminder();
    }
  });

  formCancelBtn.addEventListener('click', e => {
    e.preventDefault();
    closeModal();
  });

  render();
});

chrome.runtime.onMessage.addListener(function(request) {
  window[request.action]();
});
