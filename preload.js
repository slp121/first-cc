const { contextBridge, ipcRenderer } = require('electron');

let cachedAudioCtx;

contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  updateTray: (text) => ipcRenderer.send('update-tray', text),
  playSound: () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!cachedAudioCtx || cachedAudioCtx.state === 'closed') {
      cachedAudioCtx = new AudioCtx();
    }
    const ctx = cachedAudioCtx;
    const playBeep = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playBeep(880, now, 0.2);
    playBeep(880, now + 0.3, 0.2);
    playBeep(1100, now + 0.6, 0.4);
  }
});
