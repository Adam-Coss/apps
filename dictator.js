    /*************************************************************
     *   Путь к вашему серверу TTS
     *************************************************************/
    const GLITCH_TTS_URL = "https://dictator-tts.rs-stigma.workers.dev/tts";

    // Элементы
    const textInput = document.getElementById('text-input');
    const startStopButton = document.getElementById('start-stop-button');
    const sentenceDisplay = document.getElementById('sentence-display');
    const sentenceContent = document.getElementById('sentence-content');

    const voiceSelect = document.getElementById('voice-select');
    
    const sentenceSpeedControl = document.getElementById('sentence-speed-control');
    const sentenceSpeedValue = document.getElementById('sentence-speed-value');
    const wordSpeedControl = document.getElementById('word-speed-control');
    const wordSpeedValue = document.getElementById('word-speed-value');
    const slowWordSpeedControl = document.getElementById('slow-word-speed-control');
    const slowWordSpeedValue = document.getElementById('slow-word-speed-value');
    const auxSpeedControl = document.getElementById('aux-speed-control');
    const auxSpeedValue = document.getElementById('aux-speed-value');
    const volumeControl = document.getElementById('volume-control');
    const volumeValue = document.getElementById('volume-value');
    const longWordThresholdControl = document.getElementById('long-word-threshold');
    const longWordThresholdValue = document.getElementById('long-word-threshold-value');
    const wordPauseControl = document.getElementById('word-pause-control');
    const wordPauseValue = document.getElementById('word-pause-value');

    
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' || e.repeat) return;
      const t = document.activeElement;
      const isTyping = t && (
        t.tagName === 'TEXTAREA' ||
        (t.tagName === 'INPUT' && !['button','submit','checkbox','radio','range','color','file'].includes((t.type||'').toLowerCase())) ||
        t.isContentEditable
      );
      if (isTyping) return;
      e.preventDefault();
      if (!isSpeaking) {
        startStopButton.click();
      } else {
        if (isPaused) resumeAll(); else pauseAll();
      }
    });

    
    function clearActivePreset() {
      if (!presetButtons) return;
      presetButtons.forEach(btn => btn.setAttribute('aria-pressed', 'false'));
    }

    // Новые настройки размера шрифта:
    const textSizeControl = document.getElementById('text-size-control');
    const textSizeValue = document.getElementById('text-size-value');
    const dictationSizeControl = document.getElementById('dictation-size-control');
    const dictationSizeValue = document.getElementById('dictation-size-value');

    const pasteButton = document.getElementById('paste-button');
    const clearButton = document.getElementById('clear-button');
    const resetButton = document.getElementById('reset-settings-button');
    const timerDisplay = document.getElementById('timer');
    const progressBar = document.getElementById('progress-bar');
    const themeToggle = document.getElementById('theme-toggle');
    const indicator = document.getElementById('indicator');
    // === Автосохранение текста в localStorage ===
    const LOCAL_TEXT_KEY = 'dictatorText';
    function saveTextToStorage(val) {
      try { localStorage.setItem(LOCAL_TEXT_KEY, val || ''); } catch (e) {}
    }
    function loadTextFromStorage() {
      try {
        const v = localStorage.getItem(LOCAL_TEXT_KEY);
        if (v !== null && typeof v === 'string') { textInput.value = v; }
      } catch (e) {}
    }
    function clearTextStorage() {
      try { localStorage.removeItem(LOCAL_TEXT_KEY); } catch (e) {}
    }


    const presetsEl = document.getElementById('presets');
    const presetButtons = presetsEl ? Array.from(presetsEl.querySelectorAll('.preset-btn')) : [];
    function setActivePresetButton(name) {
      presetButtons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.preset === name)));
    }
    function applyPreset(name) {
      const presets = {
        slow:   { sentenceSpeed: 0.9, wordSpeed: 0.85, slowWordSpeed: 0.6, auxSpeed: 0.9, wordPause: 260, longWordThreshold: 6 },
        normal: { sentenceSpeed: 1.0, wordSpeed: 1.0,  slowWordSpeed: 0.5, auxSpeed: 1.0, wordPause: 200, longWordThreshold: 7 },
        fast:   { sentenceSpeed: 1.15, wordSpeed: 1.2, slowWordSpeed: 0.8, auxSpeed: 1.2, wordPause: 120, longWordThreshold: 9 }
      };
      const p = presets[name]; if (!p) return;
      sentenceSpeedControl.value = String(p.sentenceSpeed); sentenceSpeedValue.textContent = p.sentenceSpeed + 'x';
      wordSpeedControl.value     = String(p.wordSpeed);     wordSpeedValue.textContent     = p.wordSpeed + 'x';
      slowWordSpeedControl.value = String(p.slowWordSpeed); slowWordSpeedValue.textContent = p.slowWordSpeed + 'x';
      auxSpeedControl.value      = String(p.auxSpeed);      auxSpeedValue.textContent      = p.auxSpeed + 'x';
      wordPauseControl.value     = String(p.wordPause);     wordPauseValue.textContent     = String(p.wordPause);
      longWordThresholdControl.value = String(p.longWordThreshold); longWordThresholdValue.textContent = String(p.longWordThreshold);
      // Применим сразу сохранение, чтобы настройки не потерялись
      saveSettingsToCookies();
      setActivePresetButton(name);
    }
    if (presetButtons.length) {
      presetButtons.forEach(btn => {
        btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
      });
    }

    const speakPunctToggle = document.getElementById('speak-punct-toggle');
    const pauseResumeButton = document.getElementById('pause-resume-button');

    // Пауза/возобновление
    let isPaused = false;
    let activeAudio = null; // текущий проигрываемый Audio
    const pendingTimeouts = []; // пауза-осведомлённые таймеры

    function schedulePauseable(fn, delay){
      const t = { id: null, start: performance.now(), delay, remaining: delay, fn };
      const runner = () => {
        const idx = pendingTimeouts.indexOf(t);
        if (idx !== -1) pendingTimeouts.splice(idx, 1);
        fn();
      };
      if (!isPaused) { t.id = setTimeout(runner, delay); }
      pendingTimeouts.push(t);
      return t;
    }
    function pauseAll(){
      if (isPaused) return; isPaused = true;
      pauseResumeButton.textContent = 'Продолжить';
      if (activeAudio) { try { activeAudio.pause(); } catch(e){} }
      const now = performance.now();
      for (const t of pendingTimeouts) {
        if (t.id) { clearTimeout(t.id); t.id = null; t.remaining = Math.max(0, t.delay - (now - t.start)); }
      }
    }
    function resumeAll(){
      if (!isPaused) return; isPaused = false;
      pauseResumeButton.textContent = 'Пауза';
      if (activeAudio && activeAudio.paused) { activeAudio.play().catch(()=>{}); }
      const now = performance.now();
      for (const t of pendingTimeouts.slice()) {
        if (!t.id) { t.start = now; t.id = setTimeout(() => {
          const idx = pendingTimeouts.indexOf(t);
          if (idx !== -1) pendingTimeouts.splice(idx, 1);
          t.fn();
        }, t.remaining); }
      }
    }
    function clearAllTimeouts(){
      for (const t of pendingTimeouts) { if (t.id) clearTimeout(t.id); }
      pendingTimeouts.length = 0;
    }

    const helpButton = document.getElementById('help-button');
    const helpSection = document.getElementById('help-section');

    let isSpeaking = false;
    let speechStopped = false;
    let originalText = '';
    let sentences = [];
    let currentSentenceIndex = 0;
    let totalSentences = 0;
    let timer = 0;
    let timerInterval = null;

    // Буквы => названия (двойная буква)
    const letterSounds = {
      'а': 'а', 'б': 'бэ', 'в': 'вэ', 'г': 'гэ', 'д': 'дэ', 'е': 'е', 'ё': 'ё',
      'ж': 'же', 'з': 'зэ', 'и': 'и', 'й': 'и краткое', 'к': 'ка', 'л': 'эль',
      'м': 'эм', 'н': 'эн', 'о': 'о', 'п': 'пэ', 'р': 'эр', 'с': 'эс', 'т': 'тэ',
      'у': 'у', 'ф': 'эф', 'х': 'ха', 'ц': 'це', 'ч': 'че', 'ш': 'ша', 'щ': 'ща',
      'ъ': 'твердый знак', 'ы': 'ы', 'ь': 'мягкий знак', 'э': 'э', 'ю': 'ю', 'я': 'я'
    };

    /*************************************************************
     *   КУКИ (запоминание настроек)
     *************************************************************/
    function setCookie(name, value, days) {
      const date = new Date();
      date.setTime(date.getTime() + (days*24*60*60*1000));
      const expires = "expires="+ date.toUTCString();
      document.cookie = name + "=" + value + ";" + expires + ";path=/";
    }
    function getCookie(name) {
      const nameEQ = name + "=";
      const ca = document.cookie.split(';');
      for(let i=0;i<ca.length;i++) {
        let c = ca[i].trim();
        if (c.indexOf(nameEQ) === 0) {
          return c.substring(nameEQ.length,c.length);
        }
      }
      return null;
    }
    function saveSettingsToCookies() {
      const settings = {
        sentenceSpeed: sentenceSpeedControl.value,
        wordSpeed: wordSpeedControl.value,
        slowWordSpeed: slowWordSpeedControl.value,
        auxSpeed: auxSpeedControl.value,
        volume: volumeControl.value,
        longWordThreshold: longWordThresholdControl.value,
        wordPause: wordPauseControl.value,
        voice: voiceSelect.value,
        nightMode: themeToggle.checked,
        textSize: textSizeControl.value,
        dictationSize: dictationSizeControl.value,
        speakPunctuation: speakPunctToggle ? speakPunctToggle.checked : true
      };
      setCookie("dictatorSettings", JSON.stringify(settings), 365);
      setCookie("dictisSettings", "", -1);
    }

    function loadSettingsFromCookies() {
      const data = getCookie("dictatorSettings") || getCookie("dictisSettings");
      if (!data) return;
      try {
        const settings = JSON.parse(data);
        if (settings.sentenceSpeed) { sentenceSpeedControl.value = settings.sentenceSpeed; sentenceSpeedValue.textContent = settings.sentenceSpeed + "x"; }
        if (settings.wordSpeed) { wordSpeedControl.value = settings.wordSpeed; wordSpeedValue.textContent = settings.wordSpeed + "x"; }
        if (settings.slowWordSpeed) { slowWordSpeedControl.value = settings.slowWordSpeed; slowWordSpeedValue.textContent = settings.slowWordSpeed + "x"; }
        if (settings.auxSpeed) { auxSpeedControl.value = settings.auxSpeed; auxSpeedValue.textContent = settings.auxSpeed + "x"; }
        if (settings.volume) { volumeControl.value = settings.volume; volumeValue.textContent = settings.volume; }
        if (settings.longWordThreshold) { longWordThresholdControl.value = settings.longWordThreshold; longWordThresholdValue.textContent = settings.longWordThreshold; }
        if (settings.wordPause) { wordPauseControl.value = settings.wordPause; wordPauseValue.textContent = settings.wordPause; }
        if (settings.voice) { voiceSelect.value = settings.voice; }
        if (typeof settings.nightMode === 'boolean') { themeToggle.checked = settings.nightMode; document.body.classList.toggle('night-mode', settings.nightMode); }
        if (settings.textSize) { textSizeControl.value = settings.textSize; textSizeValue.textContent = settings.textSize + "px"; textInput.style.fontSize = settings.textSize + "px"; }
        if (settings.dictationSize) { dictationSizeControl.value = settings.dictationSize; dictationSizeValue.textContent = settings.dictationSize + "px"; sentenceContent.style.fontSize = settings.dictationSize + "px"; }
        if (typeof settings.speakPunctuation === "boolean" && speakPunctToggle) { speakPunctToggle.checked = settings.speakPunctuation; }
      } catch (err) {
        console.error("Ошибка при парсинге куки настроек:", err);
      }
    }

    function resetSettings() {
      setCookie("dictatorSettings", "", -1);
      setCookie("dictisSettings", "", -1);
      sentenceSpeedControl.value = "1.0";    sentenceSpeedValue.textContent = "1.0x";
      wordSpeedControl.value = "1.0";       wordSpeedValue.textContent = "1.0x";
      slowWordSpeedControl.value = "0.5";   slowWordSpeedValue.textContent = "0.5x";
      auxSpeedControl.value = "1.0";        auxSpeedValue.textContent = "1.0x";
      volumeControl.value = "1.0";          volumeValue.textContent = "1.0";
      longWordThresholdControl.value = "7"; longWordThresholdValue.textContent = "7";
      wordPauseControl.value = "200";       wordPauseValue.textContent = "200";
      voiceSelect.value = "zahar";
      textSizeControl.value = "16"; textSizeValue.textContent = "16px"; textInput.style.fontSize = "16px";
      dictationSizeControl.value = "48"; dictationSizeValue.textContent = "48px"; sentenceContent.style.fontSize = "48px";
      themeToggle.checked = true; document.body.classList.add('night-mode');
      if (speakPunctToggle) speakPunctToggle.checked = true;
      saveSettingsToCookies();
    }

    /*************************************************************
     *   Обработчики контролов
     *************************************************************/
    sentenceSpeedControl.addEventListener('input', () => { sentenceSpeedValue.textContent = sentenceSpeedControl.value + 'x'; saveSettingsToCookies(); clearActivePreset(); });
    wordSpeedControl.addEventListener('input', () => { wordSpeedValue.textContent = wordSpeedControl.value + 'x'; saveSettingsToCookies(); clearActivePreset(); });
    slowWordSpeedControl.addEventListener('input', () => { slowWordSpeedValue.textContent = slowWordSpeedControl.value + 'x'; saveSettingsToCookies(); clearActivePreset(); });
    auxSpeedControl.addEventListener('input', () => { auxSpeedValue.textContent = auxSpeedControl.value + 'x'; saveSettingsToCookies(); clearActivePreset(); });
    volumeControl.addEventListener('input', () => { volumeValue.textContent = volumeControl.value; saveSettingsToCookies(); });
    longWordThresholdControl.addEventListener('input', () => { longWordThresholdValue.textContent = longWordThresholdControl.value; saveSettingsToCookies(); clearActivePreset(); });
    wordPauseControl.addEventListener('input', () => { wordPauseValue.textContent = wordPauseControl.value; saveSettingsToCookies(); clearActivePreset(); });
    voiceSelect.addEventListener('change', () => { saveSettingsToCookies(); });
    themeToggle.addEventListener('change', () => { document.body.classList.toggle('night-mode', themeToggle.checked); saveSettingsToCookies(); });
    if (speakPunctToggle) speakPunctToggle.addEventListener('change', () => { saveSettingsToCookies(); });

    textSizeControl.addEventListener('input', () => { textSizeValue.textContent = textSizeControl.value + "px"; textInput.style.fontSize = textSizeControl.value + "px"; saveSettingsToCookies(); });
    dictationSizeControl.addEventListener('input', () => { dictationSizeValue.textContent = dictationSizeControl.value + "px"; sentenceContent.style.fontSize = dictationSizeControl.value + "px"; saveSettingsToCookies(); });

    // Автосохранение при любом вводе
    textInput.addEventListener('input', () => saveTextToStorage(textInput.value));

    pasteButton.addEventListener('click', async () => {
      try { const clipText = await navigator.clipboard.readText(); textInput.value += clipText; saveTextToStorage(textInput.value); }
      catch (err) { alert("Не удалось вставить из буфера."); }
    });
    clearButton.addEventListener('click', () => { textInput.value = ''; clearTextStorage(); });
    resetButton.addEventListener('click', resetSettings);

    pauseResumeButton.addEventListener('click', () => {
      if (!isSpeaking) { startStopButton.click(); return; }
      if (isPaused) resumeAll(); else pauseAll();
    });

    helpButton.addEventListener('click', () => { const hidden = getComputedStyle(helpSection).display === 'none'; helpSection.style.display = hidden ? 'block' : 'none'; });

    /*************************************************************
     *   СТАРТ/СТОП
     *************************************************************/
    startStopButton.addEventListener('click', () => {
      if (!isSpeaking) {
        originalText = textInput.value.trim();
        originalText = originalText.replace(/\.\.\./g, '…');
        if (!originalText) { alert("Введите текст!"); return; }
        sentences = splitIntoSentences(originalText);
        totalSentences = sentences.length;
        currentSentenceIndex = 0;
        speechStopped = false;
        isSpeaking = true;
        isPaused = false;
        clearAllTimeouts();
        pauseResumeButton.disabled = false;
        pauseResumeButton.textContent = 'Пауза';

        // Добавили класс, чтобы показать прогресс-бар только во время диктовки
        document.body.classList.add('speaking');

        textInput.style.display = 'none';
        sentenceDisplay.style.display = 'block';
        pasteButton.disabled = true; clearButton.disabled = true; resetButton.disabled = true;

        speakSentence(sentences[currentSentenceIndex]);
        startStopButton.textContent = 'Стоп';
        startTimer();
        updateProgressBar();
      } else {
        speechStopped = true;
        restoreOriginalText();
      }
    });

    function splitIntoSentences(text) {
      const re = /(?<=[.!?]|\.{3}|…)\s+/;
      return text.split(re).filter(s => s.trim().length > 0);
    }
    function splitIntoWords(sentence) {
      return sentence.match(/[\wа-яА-ЯёЁ]+|[^\s\w]/g) || [sentence];
    }
    function isPunctuation(token) {
      return /^[^\wа-яА-ЯёЁ]+$/.test(token);
    }

    function isFirstSentence(i) { return i === 0; }
    function isNewParagraph(i) {
      if (i === 0) return false;
      const lines = originalText.split('\n');
      for (let n = 0; n < lines.length; n++) {
        const line = lines[n].trim();
        if (line.startsWith(sentences[i].trim())) {
          if (n > 0 && lines[n - 1].trim() === '') { return true; }
        }
      }
      return false;
    }
    function isNewLine(i) {
      const lines = originalText.split('\n');
      for (let n = 0; n < lines.length; n++) {
        const line = lines[n].trim();
        if (line.startsWith(sentences[i].trim())) {
          if (n > 0 && lines[n - 1].trim() !== '') { return true; }
        }
      }
      return false;
    }

    function getAuxExpressions(word) {
      const exps = [];
      const dbl = getDoubleLetterName(word);
      if (dbl) exps.push(dbl);
      if (word.includes('-')) exps.push('Через дефис');
      return exps;
    }
    function getDoubleLetterName(word) {
      for (let i = 1; i < word.length; i++) {
        const a = word[i - 1].toLowerCase();
        const b = word[i].toLowerCase();
        if (a === b && letterSounds[a]) { return 'Через две ' + letterSounds[a]; }
      }
      return null;
    }

    /*************************************************************
     *   ОЗВУЧИВАНИЕ
     *************************************************************/
    function speakSentence(sentence) {
      if (speechStopped) return;
      const words = splitIntoWords(sentence);
      const html = words.map((w, i) => `<span id="word-${i}">${w}</span>`).join(' ');
      sentenceContent.innerHTML = html;
      const voice = voiceSelect.value;

      yandexTtsPlay(
        sentence,
        parseFloat(sentenceSpeedControl.value),
        parseFloat(volumeControl.value),
        voice,
        () => {
          if (!speechStopped) {
            speakWords(words, currentSentenceIndex).then(() => {
              updateProgressBar();
              if (currentSentenceIndex === sentences.length - 1 && !speechStopped) {
                playNotificationSound();
                speakFinalExpression();
              } else {
                currentSentenceIndex++;
                if (currentSentenceIndex < sentences.length && !speechStopped) {
                  speakSentence(sentences[currentSentenceIndex]);
                } else {
                  restoreOriginalText();
                }
              }
            });
          }
        }
      );
    }

    function speakWords(words, sentIndex) {
      return new Promise(resolve => {
        let wordIndex = 0;
        function speakNext() {
          if (speechStopped) { resolve(); return; }
          if (wordIndex >= words.length) { resolve(); return; }

          const token = words[wordIndex];
          const isPunctTok = isPunctuation(token);
          const isCapitalized = /^[А-ЯЁ]/.test(token);
          const longWordTh = parseInt(longWordThresholdControl.value, 10);
          const isLongWord = !isPunctTok && token.length >= longWordTh;

          let prependText = '';
          if (wordIndex === 0) {
            if (isNewParagraph(sentIndex)) prependText = 'Новый абзац';
            else if (isNewLine(sentIndex)) prependText = 'Новая строка';
          }

          function stepPrepend(cb) {
            if (prependText && !isFirstSentence(sentIndex)) {
              indicator.textContent = prependText;
              indicator.classList.add('visible');
              schedulePauseable(() => indicator.classList.remove('visible'), 2000);
              yandexTtsPlay(
                prependText,
                parseFloat(auxSpeedControl.value),
                parseFloat(volumeControl.value),
                voiceSelect.value,
                () => { cb(); }
              );
            } else { cb(); }
          }
          function stepCapital(cb) {
            if (!isPunctTok && isCapitalized) {
              yandexTtsPlay(
                'С большой буквы',
                parseFloat(auxSpeedControl.value),
                parseFloat(volumeControl.value),
                voiceSelect.value,
                () => { cb(); }
              );
            } else { cb(); }
          }
          function stepReadToken(cb) {
            highlightWord(wordIndex);
            if (isPunctTok) {
              if (speakPunctToggle && !speakPunctToggle.checked) { unhighlightWord(wordIndex); cb(); }
              else { speakPunctuation(token, wordIndex, () => { cb(); }); }
            } else if (isLongWord) {
              yandexTtsPlay(
                token,
                parseFloat(wordSpeedControl.value),
                parseFloat(volumeControl.value),
                voiceSelect.value,
                () => {
                  const aux = getAuxExpressions(token);
                  speakAuxExpressions(aux, () => {
                    yandexTtsPlay(
                      token,
                      parseFloat(slowWordSpeedControl.value),
                      parseFloat(volumeControl.value),
                      voiceSelect.value,
                      () => { unhighlightWord(wordIndex); cb(); }
                    );
                  });
                }
              );
            } else {
              yandexTtsPlay(
                token,
                parseFloat(wordSpeedControl.value),
                parseFloat(volumeControl.value),
                voiceSelect.value,
                () => { unhighlightWord(wordIndex); const aux = getAuxExpressions(token); speakAuxExpressions(aux, () => { cb(); }); }
              );
            }
          }

          stepPrepend(() => {
            if (speechStopped) { resolve(); return; }
            stepCapital(() => {
              if (speechStopped) { resolve(); return; }
              stepReadToken(() => {
                if (speechStopped) { resolve(); return; }
                const nextI = wordIndex + 1;
                if (nextI < words.length) {
                  const nextTok = words[nextI];
                  if (isPunctTok && isPunctuation(nextTok)) {
                    schedulePauseable(() => { wordIndex++; speakNext(); }, 200);
                  } else if (!isPunctuation(nextTok)) {
                    const pause = parseInt(wordPauseControl.value, 10) || 0;
                    schedulePauseable(() => { wordIndex++; speakNext(); }, pause);
                  } else { wordIndex++; speakNext(); }
                } else { resolve(); }
              });
            });
          });
        }
        speakNext();
      });
    }

    // TTS-прокси
    function yandexTtsPlay(text, speed, volume, voice, callback) {
      if (!text || !text.trim()) { callback(); return; }
      if (speed < 0.1) speed = 0.1; if (speed > 3.0) speed = 3.0;
      fetch(GLITCH_TTS_URL, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, speed, voice })
      })
      .then(res => { if (!res.ok) { throw new Error("Ответ TTS не OK: " + res.status); } return res.blob(); })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.volume = volume;
        audio.onended = () => { if (activeAudio === audio) activeAudio = null; callback(); };
        audio.onerror = () => { if (activeAudio === audio) activeAudio = null; callback(); };
        activeAudio = audio;
        if (!isPaused) {
          audio.play().catch(err => { console.error("Ошибка audio.play():", err); callback(); });
        } // если пауза — запуск произойдёт при resumeAll()
      })
      .catch(err => { console.error("Ошибка fetch TTS:", err); callback(); });
    }

    function speakAuxExpressions(expressions, cb) {
      if (!expressions || expressions.length === 0) { cb(); return; }
      let i = 0; (function next(){ if (i >= expressions.length) { cb(); return; } const text = expressions[i]; yandexTtsPlay(text, parseFloat(auxSpeedControl.value), parseFloat(volumeControl.value), voiceSelect.value, () => { i++; next(); }); })();
    }
    function speakPunctuation(punct, index, cb) {
      const map = typeof PUNCTUATION_MAP !== 'undefined' ? PUNCTUATION_MAP : {};
      const txt = map[punct] || punct;
      yandexTtsPlay(txt, parseFloat(auxSpeedControl.value), parseFloat(volumeControl.value), voiceSelect.value, () => { unhighlightWord(index); cb(); });
    }

    function highlightWord(i) { const sp = document.getElementById(`word-${i}`); if (sp) sp.classList.add('highlight'); }
    function unhighlightWord(i) { const sp = document.getElementById(`word-${i}`); if (sp) sp.classList.remove('highlight'); }

    function restoreOriginalText() {
      speechStopped = true;
      isPaused = false;
      clearAllTimeouts();
      if (activeAudio) { try { activeAudio.pause(); } catch(e){} activeAudio = null; }
      pauseResumeButton.disabled = true; pauseResumeButton.textContent = 'Пауза';
      sentenceDisplay.style.display = 'none';
      textInput.style.display = 'block';
      textInput.value = originalText;
      saveTextToStorage(textInput.value);
      startStopButton.textContent = 'Старт';
      pasteButton.disabled = false; clearButton.disabled = false; resetButton.disabled = false;
      isSpeaking = false;

      // Скрываем прогресс-бар после завершения
      document.body.classList.remove('speaking');

      stopTimer();
      resetProgressBar();
      indicator.textContent = '';
      indicator.classList.remove('visible');
    }
    function startTimer() { timer = 0; timerDisplay.textContent = `Время на странице: ${timer} секунд`; timerInterval = setInterval(() => { timer++; timerDisplay.textContent = `Время на странице: ${timer} секунд`; }, 1000); }
    function stopTimer() { clearInterval(timerInterval); }
    function updateProgressBar() { const p = ((currentSentenceIndex + 1) / totalSentences) * 100; progressBar.style.width = p + '%'; }
    function resetProgressBar() { progressBar.style.width = '0%'; }

    function playNotificationSound() { const audio = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3'); audio.play().catch(e => console.error('bell error', e)); }
    function speakFinalExpression() { yandexTtsPlay('Конспект окончен', parseFloat(auxSpeedControl.value), parseFloat(volumeControl.value), voiceSelect.value, () => { restoreOriginalText(); }); }

    // При загрузке — восстановить настройки и текст
    loadSettingsFromCookies();
    loadTextFromStorage();
