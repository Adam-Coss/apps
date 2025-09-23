// =============== КОНФИГУРАЦИЯ =================
// Объект для семестров. Для каждого семестра задаются:
// - baseUrl: ссылка для опубликованного документа Google Sheets (без параметра gid)
// - sheetList: список книг, где ключ — название книги, значение — gid листа
const semesterData = {
  "Семестр 1": {
    baseUrl:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTGQuS1flFrgkGssRoixtMX1mY52LmEHKzDL1zfcSXWEr4LW8pVAtrWPnVAAYeZ_nh5WB8p1PvZBn5S/pub",
    sheetList: {
      "Побуждение к приобретению знаний": "0",
      "Время и его важность": "685533543",
      "Становление в знании у праведных предшественников": "443351724",
      "Разъяснение «3 основ и их доказательств»": "1684327546",
      "Разъяснение «Четырех Правил»": "2057566193",
      "Разъяснение «Важных уроков для всей общины»": "972655807",
    },
  },
  "Семестр 2": {
    baseUrl:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTZquSy29GTyQU-hd9zn48iYzqJRPyKntsyWzBBLf6WwV_iR2uQqLKs4L4Qj12IWZZqNtsaZJPOZdeX/pub",
    sheetList: {
      "Ясные заветы относительно извлечения пользы из научных уроков": "0",
      "Этикет ищущего знания": "991814307",
      "Малое завещание": "1535392464",
      "Препятствия на пути требования знания": "863259228",
      "Пророческая сира": "1503861095",
      "40 Хадисов Ан-Навави": "931412257",
    },
  },
  // Для добавления нового семестра добавьте новую пару ключ-значение, например:
  // "Семестр 3": {
  //   baseUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSEMESTER3/pub",
  //   sheetList: {
  //       "Название книги A": "gid_A",
  //       "Название книги B": "gid_B"
  //   }
  // }
};
const DEFAULT_TEST_TITLE = "Тесты Дироя";

// ==============================================
// Ссылки на элементы DOM
const semesterSelect = document.getElementById("semesterSelect");
const sheetSelect = document.getElementById("sheetSelect");
const loadSheetButton = document.getElementById("loadSheetButton");

const sheetSelectScreen = document.getElementById("sheet-select-screen");
const startScreen = document.getElementById("start-screen");
const testTitleElement = document.getElementById("test-title");
const questionCountInfo = document.getElementById("question-count-info");
const startButton = document.getElementById("start-button");

const progressBarContainer = document.getElementById("progress-bar-container");
const progressBar = document.getElementById("progress-bar");

const questionCard = document.getElementById("question-card");
const bookTitleElement = document.getElementById("book-title");
const questionText = document.getElementById("question-text");
const answersContainer = document.getElementById("answers-container");
const nextButton = document.getElementById("next-button");

const resultScreen = document.getElementById("result-screen");
const scoreInfo = document.getElementById("score-info");
const incorrectHeader = document.getElementById("incorrect-header");
const incorrectList = document.getElementById("incorrect-list");
const restartButton = document.getElementById("restart-button");
const selectOtherButton = document.getElementById("select-other-button");
const reviewButton = document.getElementById("review-button");

// Глобальные переменные теста
let questions = []; // Массив вопросов
let currentQuestionIndex = 0;
let userAnswers = []; // Ответы пользователя
let reviewQuestions = []; // Вопросы для работы над ошибками
let selectedBookTitle = DEFAULT_TEST_TITLE; // Заголовок выбранной книги
let currentBaseUrl = ""; // Ссылка для текущего семестра (из semesterData)

// =================== Функции для заполнения селектов ===================
// Заполняем список семестров на основании semesterData
function populateSemesterSelect() {
  semesterSelect.innerHTML = "";
  for (const semester in semesterData) {
    const option = document.createElement("option");
    option.value = semester;
    option.textContent = semester;
    semesterSelect.appendChild(option);
  }
}

// Заполняем список книг для выбранного семестра
function populateSheetSelectForSemester(selectedSemester) {
  sheetSelect.innerHTML = "";
  const sheets = semesterData[selectedSemester].sheetList;
  for (const [name, gid] of Object.entries(sheets)) {
    const option = document.createElement("option");
    option.value = gid;
    option.textContent = name;
    sheetSelect.appendChild(option);
  }
}

// Обработчик изменения семестра: обновляем список книг
semesterSelect.addEventListener("change", (e) => {
  populateSheetSelectForSemester(e.target.value);
});

// =================== Функции отображения экранов ===================
function showSheetSelectScreen() {
  sheetSelectScreen.style.display = "block";
  startScreen.style.display = "none";
  questionCard.style.display = "none";
  resultScreen.style.display = "none";
  progressBarContainer.style.display = "none";
}

function showStartScreen() {
  sheetSelectScreen.style.display = "none";
  startScreen.style.display = "block";
  questionCard.style.display = "none";
  resultScreen.style.display = "none";
  progressBarContainer.style.display = "none";
}

// Функция перемешивания массива
function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

// =================== Загрузка и обработка CSV ===================
// Загружаем CSV для выбранного листа (gid) по ссылке выбранного семестра
async function loadSheetData(gid) {
  const csvUrl = `${currentBaseUrl}?gid=${gid}&output=csv`;
  try {
    const response = await fetch(csvUrl);
    const csvText = await response.text();
    return parseCsv(csvText);
  } catch (error) {
    console.error("Ошибка при получении CSV:", error);
    alert("Не удалось загрузить данные из выбранного листа.");
    return [];
  }
}

// Парсер CSV (учитывает кавычки)
function parseCsv(csvText) {
  const rows = [];
  let curRow = [];
  let curField = "";
  let insideQuotes = false;
  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i];
    if (c === '"') {
      if (insideQuotes && i + 1 < csvText.length && csvText[i + 1] === '"') {
        curField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (c === "," && !insideQuotes) {
      curRow.push(curField);
      curField = "";
    } else if ((c === "\r" || c === "\n") && !insideQuotes) {
      if (curField !== "" || curRow.length > 0) {
        curRow.push(curField);
        curField = "";
      }
      if (curRow.length > 0) {
        rows.push(curRow);
        curRow = [];
      }
    } else {
      curField += c;
    }
  }
  if (curField !== "" || curRow.length > 0) {
    curRow.push(curField);
    rows.push(curRow);
  }
  return rows;
}

// Формирование массива вопросов из CSV
// row[0] - вопрос, row[1] - правильный ответ, row[2..] - неправильные ответы
function createQuestionsData(rows) {
  const result = [];
  rows.forEach((row) => {
    if (row.length < 2) return;
    const questionText = row[0].trim();
    const correctAnswer = row[1].trim();
    if (!questionText || !correctAnswer) return;
    const wrongAnswers = row
      .slice(2)
      .map((a) => a.trim())
      .filter((a) => a);
    result.push({
      question: questionText,
      correctAnswer: correctAnswer,
      allAnswers: [correctAnswer, ...wrongAnswers],
    });
  });
  return result;
}

// =================== Логика теста ===================
// Показ вопроса и обновление названия книги
function showQuestion(index) {
  const q = questions[index];
  bookTitleElement.textContent = selectedBookTitle;
  questionText.textContent = q.question;
  answersContainer.innerHTML = "";
  nextButton.textContent = "Далее";
  answersContainer.removeAttribute("data-answered");

  const shuffledAnswers = shuffleArray([...q.allAnswers]);
  shuffledAnswers.forEach((answer) => {
    const btn = document.createElement("div");
    btn.className = "answer-btn";
    btn.textContent = answer;
    btn.addEventListener("click", () => {
      if (answersContainer.getAttribute("data-answered") === "true") return;
      answersContainer.setAttribute("data-answered", "true");
      userAnswers[index] = answer;
      Array.from(answersContainer.children).forEach((child) => {
        child.style.background = "#f0f0f0";
      });
      if (answer === q.correctAnswer) {
        btn.style.background = "#c8e6c9";
      } else {
        btn.style.background = "#ffcdd2";
        Array.from(answersContainer.children).forEach((child) => {
          if (child.textContent === q.correctAnswer) {
            child.style.background = "#c8e6c9";
          }
        });
        nextButton.textContent = "Учтено!";
      }
    });
    answersContainer.appendChild(btn);
  });
}

function updateProgressBar() {
  const progress = (currentQuestionIndex / questions.length) * 100;
  progressBar.style.width = `${progress}%`;
}

function nextQuestion() {
  if (!userAnswers[currentQuestionIndex]) {
    alert("Сначала выберите ответ!");
    return;
  }
  currentQuestionIndex++;
  if (currentQuestionIndex < questions.length) {
    showQuestion(currentQuestionIndex);
    updateProgressBar();
  } else {
    finishTest();
  }
}

function finishTest() {
  questionCard.style.display = "none";
  progressBarContainer.style.display = "none";
  resultScreen.style.display = "block";
  let correctCount = 0;
  let incorrectArray = [];
  questions.forEach((q, i) => {
    const userAnswer = userAnswers[i];
    if (userAnswer === q.correctAnswer) {
      correctCount++;
    } else {
      incorrectArray.push({
        question: q.question,
        userAnswer,
        correctAnswer: q.correctAnswer,
      });
    }
  });
  if (incorrectArray.length === 0) {
    scoreInfo.innerHTML = `
      <div style="font-size:1.5rem; text-align:center; color: green; font-weight:bold;">
        Вы все ответили верно! Вы просто Мозг!
      </div>
    `;
    incorrectHeader.style.display = "none";
    incorrectList.innerHTML = "";
    reviewButton.style.display = "none";
  } else {
    scoreInfo.innerHTML = `
      <div style="font-size:1.2rem; text-align:center; color:red; font-weight:bold;">
        Не ошибается тот, кто ничего не делает.
      </div>
      <div style="margin-top:0.5rem;">
        Вы ответили правильно на ${correctCount} из ${questions.length}.
      </div>
    `;
    incorrectHeader.style.display = "block";
    incorrectList.innerHTML = "";
    incorrectArray.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>Вопрос:</strong> ${item.question}<br/>
        <strong>Ваш ответ:</strong> ${item.userAnswer}<br/>
        <strong>Правильный ответ:</strong> ${item.correctAnswer}
      `;
      incorrectList.appendChild(li);
    });
    reviewQuestions = questions.filter((q, i) => userAnswers[i] !== q.correctAnswer);
    reviewButton.style.display = "block";
  }
}

function restartTest() {
  currentQuestionIndex = 0;
  userAnswers = [];
  shuffleArray(questions);
  resultScreen.style.display = "none";
  questionCard.style.display = "block";
  progressBarContainer.style.display = "block";
  progressBar.style.width = "0%";
  showQuestion(currentQuestionIndex);
}

function goSelectAnotherTest() {
  showSheetSelectScreen();
}

function startReviewTest() {
  if (!reviewQuestions || reviewQuestions.length === 0) {
    alert("Нет ошибок для работы над ними!");
    return;
  }
  questions = shuffleArray([...reviewQuestions]);
  userAnswers = [];
  currentQuestionIndex = 0;
  resultScreen.style.display = "none";
  questionCard.style.display = "block";
  progressBarContainer.style.display = "block";
  progressBar.style.width = "0%";
  showQuestion(currentQuestionIndex);
}

// =================== События ===================
window.addEventListener("load", () => {
  populateSemesterSelect(); // Заполняем список семестров
  // Устанавливаем значение первого семестра по умолчанию и заполняем список книг для него
  semesterSelect.value = Object.keys(semesterData)[0];
  populateSheetSelectForSemester(semesterSelect.value);
  showSheetSelectScreen();
});

loadSheetButton.addEventListener("click", async () => {
  const selectedSemester = semesterSelect.value;
  if (!selectedSemester) {
    alert("Сначала выберите семестр!");
    return;
  }

  const selectedGid = sheetSelect.value;
  if (!selectedGid) {
    alert("Сначала выберите книгу!");
    return;
  }

  // Получаем настройки для выбранного семестра
  currentBaseUrl = semesterData[selectedSemester].baseUrl;
  // Сохраняем название выбранной книги
  selectedBookTitle = sheetSelect.options[sheetSelect.selectedIndex].text;
  testTitleElement.textContent = selectedBookTitle;

  const rows = await loadSheetData(selectedGid);
  questions = createQuestionsData(rows);
  questionCountInfo.textContent = `В тесте ${questions.length} вопросов.`;
  showStartScreen();
});

startButton.addEventListener("click", () => {
  if (questions.length === 0) {
    alert("Нет вопросов для выбранного листа!");
    return;
  }
  userAnswers = [];
  currentQuestionIndex = 0;
  shuffleArray(questions);
  startScreen.style.display = "none";
  questionCard.style.display = "block";
  progressBarContainer.style.display = "block";
  progressBar.style.width = "0%";
  showQuestion(currentQuestionIndex);
});

nextButton.addEventListener("click", nextQuestion);
restartButton.addEventListener("click", restartTest);
selectOtherButton.addEventListener("click", goSelectAnotherTest);
reviewButton.addEventListener("click", startReviewTest);
