let boardSize; // 棋盤大小 (qípán dàxiǎo) - 現在是變數
const boardElement = document.getElementById("board");
const moveCountElement = document.getElementById("moveCount");
const messageAreaElement = document.getElementById("messageArea");
const resetButton = document.getElementById("resetButton");
const togglePossibleMovesButton = document.getElementById(
  "togglePossibleMovesButton"
);
const boardSizeSelectElement = document.getElementById("boardSizeSelect");
const statusMessageContainerElement = document.querySelector(
  ".status-message-container"
);

let boardState; // 二維陣列，記錄棋盤狀態 (0: 未訪問, >0: 訪問順序)
let knightPosition; // { row, col } 騎士目前位置 (qíshì wèizhì)
let currentMoveCount; // 目前移動步數 (yídòng bùshù)
let path; // 記錄騎士的路徑
let showPossibleMoves = true; // 是否顯示可移動位置

// 騎士可能的八個移動方向 (qíshì de kěnéng yídòng)
const knightMoves = [
  { row: -2, col: -1 },
  { row: -2, col: 1 },
  { row: 2, col: -1 },
  { row: 2, col: 1 },
  { row: -1, col: -2 },
  { row: -1, col: 2 },
  { row: 1, col: -2 },
  { row: 1, col: 2 },
];

// 初始化遊戲函數 (chūshǐhuà yóuxì hánshù)
function initializeGame() {
  boardSize = parseInt(boardSizeSelectElement.value); // 從下拉選單獲取棋盤大小

  boardState = Array(boardSize)
    .fill(null)
    .map(() => Array(boardSize).fill(0));
  knightPosition = null;
  currentMoveCount = 0;
  path = [];
  moveCountElement.textContent = currentMoveCount;
  messageAreaElement.textContent = "請點擊棋盤選擇騎士的起始位置。";
  messageAreaElement.className = "message"; // 重置訊息樣式
  createBoard(); // 創建棋盤的 HTML 結構
  updateBoardDisplay(); // 更新棋盤的視覺顯示
  togglePossibleMovesButton.textContent = "隱藏可走步數 (Hide Moves)"; // 重置按鈕文字
  showPossibleMoves = true; // 預設顯示可走步數
}

// 創建棋盤函數 (chuàngjiàn qípán hánshù)
function createBoard() {
  boardElement.innerHTML = ""; // 清空現有棋盤

  // 動態設定棋盤容器的網格佈局
  boardElement.style.gridTemplateColumns = `repeat(${boardSize}, var(--cell-size))`;
  boardElement.style.gridTemplateRows = `repeat(${boardSize}, var(--cell-size))`;

  // 動態設定狀態訊息容器的最大寬度
  // 首先獲取 --cell-size 的計算值
  const computedCellSize = getComputedStyle(document.documentElement)
    .getPropertyValue("--cell-size")
    .trim();
  // 如果 computedCellSize 包含 vw, 我們需要一個備用值或更複雜的計算, 但這裡假設它解析為一個像素值或 min() 函數能正確工作
  // 為了簡化, 如果是 vw, 我們可能需要一個基於父元素的計算, 但 calc 應該能處理 var()
  statusMessageContainerElement.style.maxWidth = `calc(${boardSize} * ${computedCellSize} + ${
    boardSize * 2
  }px + 4px)`; // 加上格子間邊框和容器邊框的寬度

  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.classList.add((r + c) % 2 === 0 ? "light" : "dark"); // 設定格子顏色
      cell.dataset.row = r; // 儲存行信息
      cell.dataset.col = c; // 儲存列信息
      cell.addEventListener("click", () => handleCellClick(r, c)); // 添加點擊事件
      boardElement.appendChild(cell);
    }
  }
}

// 處理格子點擊事件函數 (chǔlǐ gézi diǎnjī shìjiàn hánshù)
function handleCellClick(row, col) {
  messageAreaElement.textContent = ""; // 清除先前訊息
  messageAreaElement.className = "message"; // 重置訊息樣式

  if (currentMoveCount === boardSize * boardSize) {
    // 如果遊戲已經完成
    messageAreaElement.textContent = `遊戲已完成！請按「重新開始」進行新遊戲。`;
    messageAreaElement.className = "message success";
    return;
  }
  // 檢查騎士是否已放置且無路可走 (在所有格子被填滿之前)
  if (
    knightPosition &&
    getPossibleMoves(knightPosition.row, knightPosition.col).length === 0 &&
    currentMoveCount > 0 &&
    currentMoveCount < boardSize * boardSize
  ) {
    messageAreaElement.textContent = `騎士已無路可走！請按「重新開始」進行新遊戲。`;
    messageAreaElement.className = "message error";
    return;
  }

  if (!knightPosition) {
    // 第一次點擊，設置騎士起始位置
    placeKnight(row, col);
    messageAreaElement.textContent =
      "騎士已放置。請點擊一個有效的格子進行移動。";
  } else {
    // 檢查是否為有效移動
    if (isValidMove(row, col)) {
      moveKnight(row, col);
      if (currentMoveCount === boardSize * boardSize) {
        messageAreaElement.textContent = `恭喜！您已完成騎士巡邏，共 ${currentMoveCount} 步！`;
        messageAreaElement.className = "message success";
        clearPossibleMovesHighlights(); // 遊戲結束清除提示
      } else {
        const possibleMoves = getPossibleMoves(
          knightPosition.row,
          knightPosition.col
        );
        if (possibleMoves.length === 0) {
          messageAreaElement.textContent = `遊戲結束！騎士已無路可走。您走了 ${currentMoveCount} 步。`;
          messageAreaElement.className = "message error";
          clearPossibleMovesHighlights();
        } else {
          messageAreaElement.textContent = "請繼續移動騎士。";
        }
      }
    } else {
      // 檢查是否點擊了已訪問的格子或無效格子
      if (boardState[row][col] > 0) {
        messageAreaElement.textContent = "此格子已被訪問，請選擇其他格子。";
        messageAreaElement.className = "message error";
      } else if (
        knightPosition &&
        row === knightPosition.row &&
        col === knightPosition.col
      ) {
        messageAreaElement.textContent =
          "騎士已在此處。請選擇其他可移動的格子。";
        messageAreaElement.className = "message";
      } else {
        messageAreaElement.textContent = "無效的移動！請選擇騎士可跳躍的格子。";
        messageAreaElement.className = "message error";
      }
    }
  }
  updateBoardDisplay(); // 更新棋盤顯示
}

// 放置騎士函數 (fàngzhì qíshì hánshù)
function placeKnight(row, col) {
  knightPosition = { row, col };
  currentMoveCount = 1;
  boardState[row][col] = currentMoveCount; // 記錄步數
  path.push({ row, col, move: currentMoveCount });
  moveCountElement.textContent = currentMoveCount;
}

// 移動騎士函數 (yídòng qíshì hánshù)
function moveKnight(row, col) {
  knightPosition = { row, col };
  currentMoveCount++;
  boardState[row][col] = currentMoveCount; // 記錄步數
  path.push({ row, col, move: currentMoveCount });
  moveCountElement.textContent = currentMoveCount;
}

// 檢查是否為有效移動函數 (jiǎnchá shìfǒu wéi yǒuxiào yídòng hánshù)
function isValidMove(targetRow, targetCol) {
  if (!knightPosition) return false; // 騎士尚未放置

  // 檢查目標是否在棋盤內
  if (
    targetRow < 0 ||
    targetRow >= boardSize ||
    targetCol < 0 ||
    targetCol >= boardSize
  ) {
    return false;
  }
  // 檢查目標格子是否已被訪問
  if (boardState[targetRow][targetCol] > 0) {
    return false;
  }

  // 檢查是否是騎士的標準移動 (L型)
  const dr = Math.abs(targetRow - knightPosition.row);
  const dc = Math.abs(targetCol - knightPosition.col);
  return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
}

// 獲取所有可能的移動函數 (huòqǔ suǒyǒu kěnéng de yídòng hánshù)
function getPossibleMoves(currentRow, currentCol) {
  const moves = [];
  if (!knightPosition) return moves; // 如果騎士還沒放置，則沒有可移動的步

  for (const move of knightMoves) {
    const nextRow = currentRow + move.row;
    const nextCol = currentCol + move.col;
    // 檢查移動是否在棋盤內且目標格子未被訪問
    if (
      nextRow >= 0 &&
      nextRow < boardSize &&
      nextCol >= 0 &&
      nextCol < boardSize &&
      boardState[nextRow][nextCol] === 0
    ) {
      moves.push({ row: nextRow, col: nextCol });
    }
  }
  return moves;
}

// 更新棋盤顯示函數 (gēngxīn qípán xiǎnshì hánshù)
function updateBoardDisplay() {
  const cells = boardElement.children;
  clearPossibleMovesHighlights(); // 先清除所有高亮提示

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const r = parseInt(cell.dataset.row);
    const c = parseInt(cell.dataset.col);

    // 重置基本樣式
    cell.classList.remove("knight", "visited", "possible-move");
    // 根據格子是否為淺色或深色重新應用基礎樣式
    cell.classList.remove("light", "dark"); // 先移除，避免重複添加
    cell.classList.add((r + c) % 2 === 0 ? "light" : "dark");
    cell.textContent = ""; // 清除數字

    if (boardState[r][c] > 0) {
      cell.classList.add("visited");
      cell.textContent = boardState[r][c]; // 顯示步數
    }

    if (
      knightPosition &&
      knightPosition.row === r &&
      knightPosition.col === c
    ) {
      cell.classList.add("knight");
      // 如果騎士所在的格子也被訪問過，確保 'visited' 樣式也應用，但 'knight' 圖標優先
      if (boardState[r][c] > 0) {
        cell.classList.add("visited"); // 確保 visited 樣式
        cell.textContent = boardState[r][c]; // 顯示步數
      }
    }
  }
  // 如果騎士已放置且需要顯示可移動位置，並且遊戲尚未結束
  if (
    knightPosition &&
    showPossibleMoves &&
    currentMoveCount < boardSize * boardSize &&
    getPossibleMoves(knightPosition.row, knightPosition.col).length > 0
  ) {
    highlightPossibleMoves();
  }
}

// 高亮顯示可能的移動函數 (gāoliàng xiǎnshì kěnéng de yídòng hánshù)
function highlightPossibleMoves() {
  if (!knightPosition) return;
  const possibleMoves = getPossibleMoves(
    knightPosition.row,
    knightPosition.col
  );
  possibleMoves.forEach((move) => {
    const cellElement = boardElement.querySelector(
      `.cell[data-row='${move.row}'][data-col='${move.col}']`
    );
    if (cellElement) {
      cellElement.classList.add("possible-move");
    }
  });
}

// 清除可能的移動高亮函數 (qīngchú kěnéng de yídòng gāoliàng hánshù)
function clearPossibleMovesHighlights() {
  const highlightedCells = boardElement.querySelectorAll(".possible-move");
  highlightedCells.forEach((cell) => cell.classList.remove("possible-move"));
}

// 重置按鈕的事件監聽器
resetButton.addEventListener("click", initializeGame);

// 切換顯示可移動步數按鈕的事件監聽器
togglePossibleMovesButton.addEventListener("click", () => {
  showPossibleMoves = !showPossibleMoves;
  togglePossibleMovesButton.textContent = showPossibleMoves
    ? "隱藏可走步數 (Hide Moves)"
    : "顯示可走步數 (Show Moves)";

  if (!knightPosition) return; // 如果騎士還沒放，就不需要更新顯示

  if (showPossibleMoves) {
    // 只有在遊戲進行中才高亮
    if (
      currentMoveCount < boardSize * boardSize &&
      getPossibleMoves(knightPosition.row, knightPosition.col).length > 0
    ) {
      highlightPossibleMoves();
    }
  } else {
    clearPossibleMovesHighlights();
  }
});

// 棋盤大小選擇下拉選單的事件監聽器
boardSizeSelectElement.addEventListener("change", initializeGame);

// 初始加載時初始化遊戲
initializeGame();
