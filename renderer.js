let config = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
  sessionsBeforeLong: 4
};

const saved = localStorage.getItem('pomodoro-config');
if (saved) {
  try {
    config = { ...config, ...JSON.parse(saved) };
  } catch { /* */ }
}

function saveConfig() {
  localStorage.setItem('pomodoro-config', JSON.stringify(config));
}

function nextBreakMode() {
  return completedSessions % config.sessionsBeforeLong === 0 ? 'longBreak' : 'shortBreak';
}

const MODES = ['work', 'shortBreak', 'longBreak'];

let currentMode = 'work';
let remainingSeconds = config.work;
let isRunning = false;
let completedSessions = 0;
let timerInterval = null;

let wasPausedByVisibility = false;

const timerTime = document.getElementById('timerTime');
const timerLabel = document.getElementById('timerLabel');
const startBtn = document.getElementById('startBtn');
const startBtnText = document.getElementById('startBtnText');
const resetBtn = document.getElementById('resetBtn');
const skipBtn = document.getElementById('skipBtn');
const sessionDots = document.getElementById('sessionDots');
const sessionCount = document.getElementById('sessionCount');
const ringProgress = document.querySelector('.ring-progress');
const tabs = document.querySelectorAll('.tab');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const modalClose = document.getElementById('modalClose');
const cancelSettings = document.getElementById('cancelSettings');
const saveSettingsBtn = document.getElementById('saveSettings');
const dots = sessionDots.querySelectorAll('.dot');

const CIRCUMFERENCE = 2 * Math.PI * 88;
ringProgress.style.strokeDasharray = CIRCUMFERENCE;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getModeLabel(mode) {
  return { work: '专注时间', shortBreak: '短休息', longBreak: '长休息' }[mode];
}

function render() {
  timerTime.textContent = formatTime(remainingSeconds);
  timerLabel.textContent = getModeLabel(currentMode);

  const offset = CIRCUMFERENCE * (1 - remainingSeconds / config[currentMode]);
  ringProgress.style.strokeDashoffset = offset;

  startBtnText.textContent = isRunning ? '暂停' : '开始';

  const sessionProgress = completedSessions % config.sessionsBeforeLong;
  dots.forEach((dot, i) => {
    dot.classList.toggle('completed', i < sessionProgress);
  });
  sessionCount.textContent = `${sessionProgress} / ${config.sessionsBeforeLong}`;

  document.title = `${formatTime(remainingSeconds)} - ${getModeLabel(currentMode)}`;
}

function tick() {
  remainingSeconds--;
  if (remainingSeconds <= 0) {
    clearInterval(timerInterval);
    isRunning = false;
    onTimerComplete();
  } else {
    render();
  }
}

function startTimer() {
  if (isRunning) {
    clearInterval(timerInterval);
    isRunning = false;
    render();
    return;
  }

  isRunning = true;
  wasPausedByVisibility = false;
  timerInterval = setInterval(tick, 1000);
}

function onTimerComplete() {
  window.electronAPI.playSound();

  if (currentMode === 'work') {
    completedSessions++;
    window.electronAPI.showNotification('番茄钟', '专注时间结束！休息一下吧。');
    switchMode(nextBreakMode());
  } else {
    window.electronAPI.showNotification('番茄钟', '休息结束！开始专注吧。');
    switchMode('work');
  }
}

function switchMode(mode) {
  currentMode = mode;
  document.body.setAttribute('data-mode', mode === 'work' ? '' : mode);
  remainingSeconds = config[mode];

  tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });

  window.electronAPI.updateTray(getModeLabel(mode));
  render();
}

function resetTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  remainingSeconds = config[currentMode];
  render();
}

function skipToNext() {
  clearInterval(timerInterval);
  isRunning = false;

  if (currentMode === 'work') {
    completedSessions++;
    switchMode(nextBreakMode());
  } else {
    switchMode('work');
  }
}

startBtn.addEventListener('click', startTimer);
resetBtn.addEventListener('click', resetTimer);
skipBtn.addEventListener('click', skipToNext);

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    if (isRunning) return;
    switchMode(tab.dataset.mode);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') {
    e.preventDefault();
    startTimer();
  } else if (e.code === 'KeyR') {
    resetTimer();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && isRunning) {
    wasPausedByVisibility = true;
    clearInterval(timerInterval);
    isRunning = false;
  } else if (wasPausedByVisibility && document.visibilityState === 'visible') {
    wasPausedByVisibility = false;
    isRunning = true;
    timerInterval = setInterval(tick, 1000);
  }
});

const SETTINGS_FIELDS = [
  { id: 'workDuration', key: 'work' },
  { id: 'shortBreakDuration', key: 'shortBreak' },
  { id: 'longBreakDuration', key: 'longBreak' },
  { id: 'sessionsBeforeLong', key: 'sessionsBeforeLong' }
];

function openSettings() {
  SETTINGS_FIELDS.forEach(f => {
    const el = document.getElementById(f.id);
    el.value = f.key === 'sessionsBeforeLong' ? config[f.key] : config[f.key] / 60;
  });
  settingsModal.classList.add('show');
}

function closeSettings() {
  settingsModal.classList.remove('show');
}

function saveAndCloseSettings() {
  SETTINGS_FIELDS.forEach(f => {
    const raw = parseInt(document.getElementById(f.id).value);
    config[f.key] = f.key === 'sessionsBeforeLong'
      ? (raw || 4)
      : (raw || ({ work: 25, shortBreak: 5, longBreak: 15 }[f.key])) * 60;
  });

  remainingSeconds = config[currentMode];
  saveConfig();
  resetTimer();
  closeSettings();
}

settingsBtn.addEventListener('click', openSettings);
modalClose.addEventListener('click', closeSettings);
cancelSettings.addEventListener('click', closeSettings);
saveSettingsBtn.addEventListener('click', saveAndCloseSettings);

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) closeSettings();
});

render();
