let trueList = [];
let falseList = [];
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let answered = 0;
let markedIndices = new Set();
let usingMarkedOnly = false;
let originalQuestions = [];

function parseList(text) {
  return text.split('\n').map(line => line.trim()).filter(Boolean);
}

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

const combinations = [
  [true, true, true],
  [true, true, false],
  [true, false, true],
  [true, false, false],
  [false, true, true],
  [false, true, false],
  [false, false, true],
  [false, false, false]
];

function calculateMinQuestions(trueLen, falseLen) {
  return Math.floor((trueLen * 2) / 3) + 5;
}

function saveToLocal(name, data) {
  localStorage.setItem(name, JSON.stringify(data));
}

function loadFromLocal(name) {
  const data = localStorage.getItem(name);
  return data ? JSON.parse(data) : null;
}

// 初期ページのセットアップ
function setupListPage() {
  const list = document.getElementById('list-buttons');
  const savedLists = loadFromLocal('savedLists') || [];

  list.innerHTML = '';
  savedLists.forEach((name, idx) => {
    const input = document.createElement('input');
    input.value = name;
    input.onchange = () => {
      savedLists[idx] = input.value;
      saveToLocal('savedLists', savedLists);
    };

    const btn = document.createElement('button');
    btn.textContent = '作成';
    btn.onclick = () => {
      document.getElementById('list-page').style.display = 'none';
      document.getElementById('input-screen').style.display = 'block';
      document.getElementById('true-list').value = loadFromLocal(name + '_true') || '';
      document.getElementById('false-list').value = loadFromLocal(name + '_false') || '';
      document.getElementById('current-list-name').value = name;
    };

    list.appendChild(input);
    list.appendChild(btn);
    list.appendChild(document.createElement('br'));
  });

  const addBtn = document.getElementById('add-list-btn');
  addBtn.onclick = () => {
    const newName = 'リスト' + (savedLists.length + 1);
    savedLists.push(newName);
    saveToLocal('savedLists', savedLists);
    setupListPage();
  };
}

function saveInputData() {
  const name = document.getElementById('current-list-name').value;
  saveToLocal(name + '_true', document.getElementById('true-list').value);
  saveToLocal(name + '_false', document.getElementById('false-list').value);
}

function generateQuestions() {
  saveInputData();

  trueList = parseList(document.getElementById('true-list').value);
  falseList = parseList(document.getElementById('false-list').value);

  const maxQuestions = trueList.length + 20;
  questions = [];

  const allTrue = [...trueList];
  const allFalse = [...falseList];
  const usedTrue = new Set();
  const usedFalse = new Set();

  let attempts = 0;
  const maxAttempts = maxQuestions * 10;

  while (questions.length < maxQuestions && attempts < maxAttempts) {
    attempts++;

    const pattern = combinations[Math.floor(Math.random() * combinations.length)];
    const requiredTrue = pattern.filter(v => v).length;
    const requiredFalse = 3 - requiredTrue;

    const availableTrue = shuffle([...allTrue]);
    const availableFalse = shuffle([...allFalse]);

    if (availableTrue.length < requiredTrue || availableFalse.length < requiredFalse) {
      continue;
    }

    const selected = [];
    const answers = [];

    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i]) {
        const item = availableTrue.pop();
        selected.push(item);
        answers.push(true);
        usedTrue.add(item);
      } else {
        const item = availableFalse.pop();
        selected.push(item);
        answers.push(false);
        usedFalse.add(item);
      }
    }

    const zipped = selected.map((s, i) => ({ text: s, answer: answers[i] }));
    const shuffled = shuffle(zipped);
    const finalStatements = shuffled.map(z => z.text);
    const finalAnswers = shuffled.map(z => z.answer);

    questions.push({
      statements: finalStatements,
      answers: finalAnswers,
      checked: false
    });

    if (questions.length >= maxQuestions && usedTrue.size === allTrue.length && usedFalse.size === allFalse.length) {
      break;
    }
  }

  currentQuestionIndex = 0;
  score = 0;
  answered = 0;
  markedIndices = new Set();
  usingMarkedOnly = false;

  document.getElementById('input-screen').style.display = 'none';
  document.getElementById('quiz-screen').style.display = 'block';
  showQuestion();
}

function showQuestion() {
  const q = questions[currentQuestionIndex];
  const qt = document.getElementById('question-texts');
  qt.innerHTML = '';
  q.statements.forEach((s, i) => {
    qt.innerHTML += `<div>${String.fromCharCode(97 + i)}. ${s}</div>`;
  });

  const table = document.getElementById('answer-table');
  table.innerHTML = '';
  const header = document.createElement('tr');
  header.innerHTML = `<th></th>${[...Array(8)].map((_, i) => `<th><button onclick="selectAnswer(${i})" class="answer-button" id="btn-${i}">${i + 1}</button></th>`).join('')}`;
  table.appendChild(header);

  ['a', 'b', 'c'].forEach((label, rowIndex) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<th>${label}.</th>${combinations.map(combo => `<td>${combo[rowIndex] ? '○' : '×'}</td>`).join('')}`;
    table.appendChild(tr);
  });

  document.getElementById('mark-question').checked = q.checked;
  document.getElementById('explanation').style.display = 'none';
  document.getElementById('explanation').innerHTML = '';
  document.getElementById('progress').textContent = `${currentQuestionIndex + 1}問目 / 全${questions.length}問`;
  document.getElementById('next-button').disabled = true;

  const result = document.getElementById('result-message');
  if (result) result.textContent = '';
}

function selectAnswer(index) {
  const q = questions[currentQuestionIndex];
  const isCorrect = combinations[index].every((val, i) => val === q.answers[i]);
  const correctIndex = combinations.findIndex(combo =>
    combo.every((val, i) => val === q.answers[i])
  );

  const result = document.getElementById('result-message');
  result.style.color = isCorrect ? 'green' : 'red';
  result.textContent = isCorrect ? '正解！' : `不正解。正解の番号は ${correctIndex + 1} です`;
  document.getElementById(`btn-${index}`).classList.add(isCorrect ? 'correct' : 'incorrect');

  if (isCorrect) score++;
  answered++;
  document.getElementById('next-button').disabled = false;
  document.getElementById('accuracy').textContent = `正答率: ${Math.round((score / answered) * 100)}%`;
}

function nextQuestion() {
  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex++;
    showQuestion();
  }
}

function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    showQuestion();
  }
}

function toggleExplanation() {
  const exp = document.getElementById('explanation');
  const q = questions[currentQuestionIndex];

  if (exp.style.display === 'none') {
    exp.style.display = 'block';
    const trueLines = parseList(document.getElementById('true-list').value);
    const falseLines = parseList(document.getElementById('false-list').value);

    const explanations = q.statements.map((s, i) => {
      if (q.answers[i]) {
        return `${i + 1}. ${s}`;
      } else {
        const falseIndex = falseLines.indexOf(s);
        const mappedTrue = trueLines[falseIndex] || '（対応する正文なし）';
        return `${i + 1}. ${mappedTrue}`;
      }
    });

    exp.innerHTML = explanations.join('<br>');
  } else {
    exp.style.display = 'none';
    exp.innerHTML = '';
  }
}

function goToInput() {
  document.getElementById('quiz-screen').style.display = 'none';
  document.getElementById('input-screen').style.display = 'block';
}

function toggleMarkedOnly() {
  const btn = document.getElementById('toggle-marked-btn');

  if (!usingMarkedOnly) {
    const markedQuestions = questions.filter(q => q.checked);
    if (markedQuestions.length === 0) {
      alert('チェックされた問題がありません。');
      return;
    }
    originalQuestions = questions;
    questions = markedQuestions;
    currentQuestionIndex = 0;
    usingMarkedOnly = true;
    btn.textContent = '全問題に戻す';
  } else {
    questions = originalQuestions;
    currentQuestionIndex = 0;
    usingMarkedOnly = false;
    btn.textContent = 'チェックした問題のみ出題';
  }

  showQuestion();
}

function toggleMark() {
  questions[currentQuestionIndex].checked = document.getElementById('mark-question').checked;
}

window.onload = setupListPage;
