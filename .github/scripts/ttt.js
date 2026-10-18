const SQUARES = ['A1', 'B1', 'C1', 'A2', 'B2', 'C2', 'A3', 'B3', 'C3'];
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const MISTAKE_RATE = 0.2;

const NEW_STATE = () => ({ board: '.........', visitors: 0, bot: 0, draws: 0, last: 'No games finished yet.' });

function winner(board) {
  for (const [a, b, c] of LINES) {
    if (board[a] !== '.' && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.includes('.') ? null : 'draw';
}

function freeSquares(board) {
  const out = [];
  for (let i = 0; i < 9; i++) if (board[i] === '.') out.push(i);
  return out;
}

function with_(board, i, mark) {
  return board.slice(0, i) + mark + board.slice(i + 1);
}

function pick(list, rng) {
  return list[Math.floor(rng() * list.length)];
}

function botMove(board, rng) {
  const free = freeSquares(board);
  if (rng() < MISTAKE_RATE) return pick(free, rng);
  const completing = (mark) => free.find((i) => winner(with_(board, i, mark)) === mark);
  const win = completing('O');
  if (win !== undefined) return win;
  const block = completing('X');
  if (block !== undefined) return block;
  if (board[4] === '.') return 4;
  const corners = free.filter((i) => [0, 2, 6, 8].includes(i));
  return corners.length ? pick(corners, rng) : pick(free, rng);
}

function play(state, square, rng = Math.random) {
  const name = String(square).trim().toUpperCase();
  const idx = SQUARES.indexOf(name);
  if (idx === -1) {
    return { state, changed: false, message: `"${String(square).slice(0, 20)}" is not a square. Use one of ${SQUARES.join(', ')}.` };
  }
  if (state.board[idx] !== '.') {
    return { state, changed: false, message: `${name} is already taken. Pick a free square from the board in the README.` };
  }

  const next = { ...state };
  let board = with_(state.board, idx, 'X');
  let message = `You played ${name}.`;
  let result = winner(board);

  if (result === null) {
    const reply = botMove(board, rng);
    board = with_(board, reply, 'O');
    message += ` I played ${SQUARES[reply]}.`;
    result = winner(board);
  }

  if (result === 'X') {
    next.visitors += 1;
    next.last = 'A visitor won.';
    message += ' You won. Well played. A new game has started.';
  } else if (result === 'O') {
    next.bot += 1;
    next.last = 'The bot won.';
    message += ' I won this one. A new game has started.';
  } else if (result === 'draw') {
    next.draws += 1;
    next.last = 'A draw.';
    message += ' It is a draw. A new game has started.';
  }
  next.board = result === null ? board : '.........';
  return { state: next, changed: true, message, finished: result !== null };
}

function render(state, repo) {
  const b = state.board;
  const row = (r) => ` ${r + 1}  ${b[r * 3]} ${b[r * 3 + 1]} ${b[r * 3 + 2]}`;
  const links = freeSquares(b).map(
    (i) => `[${SQUARES[i]}](https://github.com/${repo}/issues/new?title=ttt%7C${SQUARES[i]})`
  );
  return [
    '<!-- ttt -->',
    `Tic-tac-toe. You are X, I am O. Visitors ${state.visitors}, bot ${state.bot}, draws ${state.draws}.`,
    '',
    '```text',
    '    A B C',
    row(0),
    row(1),
    row(2),
    '```',
    '',
    `Your move (each link opens a prefilled issue, press "Submit new issue"): ${links.join(' · ')}`,
    '',
    `Last game: ${state.last}`,
    '<!-- /ttt -->',
  ].join('\n');
}

const BLOCK_RE = /<!-- ttt -->[\s\S]*?<!-- \/ttt -->/;

function applyToReadme(readme, state, repo) {
  if (!BLOCK_RE.test(readme)) throw new Error('ttt markers not found in README.md');
  return readme.replace(BLOCK_RE, () => render(state, repo));
}

module.exports = { SQUARES, NEW_STATE, winner, botMove, play, render, applyToReadme, BLOCK_RE };
