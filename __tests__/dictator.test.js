/** @jest-environment jsdom */
const { performance } = require('perf_hooks');

describe('dictator core functions', () => {
  let moduleExports;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();

    document.body.innerHTML = `
      <textarea id="text-input"></textarea>
      <button id="start-stop-button"></button>
      <div id="sentence-display"></div>
      <div id="sentence-content"></div>
      <select id="voice-select"></select>
      <input id="sentence-speed-control" value="1.0" />
      <span id="sentence-speed-value"></span>
      <input id="word-speed-control" value="1.0" />
      <span id="word-speed-value"></span>
      <input id="slow-word-speed-control" value="0.5" />
      <span id="slow-word-speed-value"></span>
      <input id="aux-speed-control" value="1.0" />
      <span id="aux-speed-value"></span>
      <input id="long-word-threshold" value="7" />
      <span id="long-word-threshold-value"></span>
      <input id="word-pause-control" value="200" />
      <span id="word-pause-value"></span>
      <input id="speak-symbols-toggle" type="checkbox" />
      <input id="text-size-control" />
      <span id="text-size-value"></span>
      <input id="dictation-size-control" />
      <span id="dictation-size-value"></span>
      <button id="paste-button"></button>
      <button id="clear-button"></button>
      <button id="reset-settings-button"></button>
      <span id="timer"></span>
      <div id="progress-bar"></div>
      <button id="theme-toggle"></button>
      <div id="indicator"></div>
      <button id="advanced-toggle"></button>
      <div id="advanced-section"></div>
      <div id="presets">
        <button class="preset-btn" data-preset="slow"></button>
        <button class="preset-btn" data-preset="normal"></button>
        <button class="preset-btn" data-preset="fast"></button>
      </div>
      <input id="speak-punct-toggle" type="checkbox" />
      <button id="pause-resume-button"></button>
      <button id="help-button"></button>
      <div id="help-modal"></div>
      <button id="help-close"></button>
    `;

    const store = {};
    global.localStorage = {
      getItem: key => store[key] || null,
      setItem: (key, val) => { store[key] = String(val); },
      removeItem: key => { delete store[key]; }
    };

    // jsdom already provides performance but ensure it's available
    global.performance = performance;

    moduleExports = require('../dictator');
  });

  test('applyPreset updates controls for fast preset', () => {
    const { applyPreset } = moduleExports;
    const sentenceSpeedControl = document.getElementById('sentence-speed-control');
    const sentenceSpeedValue = document.getElementById('sentence-speed-value');
    const wordSpeedControl = document.getElementById('word-speed-control');
    const wordSpeedValue = document.getElementById('word-speed-value');
    const slowWordSpeedControl = document.getElementById('slow-word-speed-control');
    const slowWordSpeedValue = document.getElementById('slow-word-speed-value');
    const auxSpeedControl = document.getElementById('aux-speed-control');
    const auxSpeedValue = document.getElementById('aux-speed-value');
    const wordPauseControl = document.getElementById('word-pause-control');
    const wordPauseValue = document.getElementById('word-pause-value');
    const longWordThresholdControl = document.getElementById('long-word-threshold');
    const longWordThresholdValue = document.getElementById('long-word-threshold-value');

    applyPreset('fast');

    expect(sentenceSpeedControl.value).toBe('1.15');
    expect(sentenceSpeedValue.textContent).toBe('1.15x');
    expect(wordSpeedControl.value).toBe('1.2');
    expect(wordSpeedValue.textContent).toBe('1.2x');
    expect(slowWordSpeedControl.value).toBe('0.8');
    expect(slowWordSpeedValue.textContent).toBe('0.8x');
    expect(auxSpeedControl.value).toBe('1.2');
    expect(auxSpeedValue.textContent).toBe('1.2x');
    expect(wordPauseControl.value).toBe('120');
    expect(wordPauseValue.textContent).toBe('120');
    expect(longWordThresholdControl.value).toBe('9');
    expect(longWordThresholdValue.textContent).toBe('9');
  });

  test('applyPreset updates controls for normal preset', () => {
    const { applyPreset } = moduleExports;
    const sentenceSpeedControl = document.getElementById('sentence-speed-control');
    const sentenceSpeedValue = document.getElementById('sentence-speed-value');
    const wordSpeedControl = document.getElementById('word-speed-control');
    const wordSpeedValue = document.getElementById('word-speed-value');
    const slowWordSpeedControl = document.getElementById('slow-word-speed-control');
    const slowWordSpeedValue = document.getElementById('slow-word-speed-value');
    const auxSpeedControl = document.getElementById('aux-speed-control');
    const auxSpeedValue = document.getElementById('aux-speed-value');
    const wordPauseControl = document.getElementById('word-pause-control');
    const wordPauseValue = document.getElementById('word-pause-value');
    const longWordThresholdControl = document.getElementById('long-word-threshold');
    const longWordThresholdValue = document.getElementById('long-word-threshold-value');

    applyPreset('normal');

    expect(sentenceSpeedControl.value).toBe('1.2');
    expect(sentenceSpeedValue.textContent).toBe('1.2x');
    expect(wordSpeedControl.value).toBe('0.7');
    expect(wordSpeedValue.textContent).toBe('0.7x');
    expect(slowWordSpeedControl.value).toBe('0.6');
    expect(slowWordSpeedValue.textContent).toBe('0.6x');
    expect(auxSpeedControl.value).toBe('1.2');
    expect(auxSpeedValue.textContent).toBe('1.2x');
    expect(wordPauseControl.value).toBe('1200');
    expect(wordPauseValue.textContent).toBe('1200');
    expect(longWordThresholdControl.value).toBe('9');
    expect(longWordThresholdValue.textContent).toBe('9');
  });

  test('schedulePauseable respects pause and resume', () => {
    const { schedulePauseable, pauseAll, resumeAll } = moduleExports;
    const spy = jest.fn();
    schedulePauseable(spy, 1000);
    jest.advanceTimersByTime(500);
    pauseAll();
    jest.advanceTimersByTime(1000);
    expect(spy).not.toHaveBeenCalled();
    resumeAll();
    jest.advanceTimersByTime(1000);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
