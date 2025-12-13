/* Variaveis globais */
let game = 0; // Home = 0, Jogo = 1
let board = []; 
let boardRows = 4;
let boardCols = 7;
let turn = 'P';
let lastRoll = 0;
let selectedPiece = null;
let scoreC = 0, scoreP = 0;
let difficulty = 'medio';
let updateSource = null;

const cellIndex= (r,c) => r*boardCols + c;
const coordFromIndex = i => ({r: Math.floor(i/boardCols), c:i % boardCols});

/* Segunda Entrega */
const SERVER = "http://twserver.alunos.dcc.fc.up.pt:8008";
const GROUP = "group22";
let currentNick = null;
let currentPass = null;
let currentGame = null;

// Funções auxiliares ao http
async function twGet(path, params) {
    const url = new URL(SERVER + "/" + path);
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
    const resp = await fetch(url, { method: "GET" });
    if (!resp.ok) {
        throw new Error("HTTP error " + resp.status);
    }
    const data = await resp.json().catch(() => ({}));
    if (data.error) {
        throw new Error(data.error);
    }
    return data;
}

function showError(msg) {
    if (typeof mostrarMensagem === "function") {
        mostrarMensagem(msg, 4);
    } else {
        alert(msg);
    }
}

let mensagensDiv;

document.addEventListener('DOMContentLoaded', () => {
    mensagensDiv = document.getElementById('mensagens');
    // document.getElementById('btnPvC').style.display = 'block';
    // document.getElementById('btnPvP').style.display = 'block';
    updateBoardLabels();
});

/*Funcões da UI*/ 
// function Menu1(){
//     document.getElementsByClassName("login")[0].style.display = "none";
//     document.getElementById('btnPvC').style.display = "block";
//     document.getElementById('btnPvP').style.display = "block";
// 	document.getElementsByClassName("logout")[0].style.display = "block";
// }

async function registerPlayer(nick, password){
    return twGet("register", {
        nick: nick,
        password : password
    });
}

async function joinGame(nick, password, size){
    return twGet("join", {
        group: GROUP,
        nick : nick,
        password: password,
        size : size
    });
}

async function handleLogin() {
    const nickInput = document.getElementById("inputUser");
    const passInput = document.getElementById("inputPass");

    const nick = nickInput.value.trim();
    const pass = passInput.value.trim();

    if (!nick || !pass) {
        showError("Preenche nick e password");
        return;
    }

    try {
        await registerPlayer(nick, pass);

        const cols = document.getElementById("cols")
            ? parseInt(document.getElementById("cols").value, 10)
            : 7;
        const rows = document.getElementById("rows")
            ? parseInt(document.getElementById("rows").value, 10)
            : 4;

        const sizeStr = rows + "x" + cols;

        const joinResp = await joinGame(nick, pass, sizeStr);

        currentNick = nick;
        currentPass = pass;
        currentGame = joinResp.game;

        startUpdateStream();           

        mostrarMensagem("Ligado ao servidor. Jogo: " + currentGame, 4);

        Menu1();
        Escolhe();
    } catch(err) {
        showError("Erro no servidor: " + err.message);
    }
}

async function rollRemote() {
    if (!currentNick || !currentPass || !currentGame ){
        if (typeof rollSticks === "function") {
            rollSticks();
        } else{
            showError("Não há jogo remoto ativo.")
        }
        return;
    }

    try{
        await twGet("roll", {
            nick: currentNick,
            password : currentPass,
            game: currentGame
        });

        document.getElementById("rollBtn").disabled = true;
        mostrarMensagem("Lançamento pedido ao servidor. Aguarda atualização", 4);
    } catch(err){
        showError("Erro ao lançar dado: " + err.message);
    }
}

async function passTurn() {
    if (!currentNick || !currentPass || !currentGame) {
        showError("Não há jogo remoto ativo para passar a vez.");
        return;
    }

    try {
        await twGet("pass", {
            nick: currentNick,
            password: currentPass,
            game: currentGame
        });

        mostrarMensagem("Passaste a vez. Aguarda atualização do servidor.", 4);
        document.getElementById("rollBtn").disabled = true;
    } catch (err) {
        showError("Erro ao passar a vez: " + err.message);
    }
}

async function notifyMove(move) {
    if (!currentNick || !currentPass || !currentGame) {
        showError("Não há jogo remoto ativo.");
        return;
    }

    try {
        await twGet("notify", {
            nick: currentNick,
            password: currentPass,
            game: currentGame,
            move: move
        });

        mostrarMensagem("Jogada enviada. Aguarda atualização do servidor.", 4);
    } catch (err) {
        showError("Erro ao enviar jogada: " + err.message);
    }
}

function startUpdateStream() {
    if (!currentGame || !currentNick) {
        showError("Não há jogo remoto para atualizar.");
        return;
    }

    if (updateSource) {
        updateSource.close();
        updateSource = null;
    }

    const params = new URLSearchParams({
        game: currentGame,
        nick: currentNick
    });

    const url = SERVER + "/update?" + params.toString();

    updateSource = new EventSource(url);

    updateSource.onmessage = function (event) {
        let data;
        try {
            data = JSON.parse(event.data);
        } catch (e) {
            console.error("Update inválido: ", event.data);
            return;
        }

        handleServerUpdate(data);
    };

    updateSource.onerror = function () {
        console.error("Erro na ligação de update.");
    };
}

function stopUpdateStream() {
    if (updateSource) {
        updateSource.close();
        updateSource = null;
    }
}

function handleServerUpdate(data) {
    if (data.error) {
        showError("Erro do servidor: " + data.error);
        return;
    }

    if (data.board) {
        board = data.board;
        renderBoard();
    }

    if (typeof data.scoreP === "number") {
        scoreP = data.scoreP;
        document.getElementById("scoreP").textContent = scoreP;
    }

    if (typeof data.scoreC === "number") {
        scoreC = data.scoreC;
        document.getElementById("scoreC").textContent = scoreC;
    }

    if (typeof data.lastRoll === "number") {
        lastRoll = data.lastRoll;
        document.getElementById("rollBtn").disabled = false;
        document.getElementById("rollResult").textContent = lastRoll;
    }

    if (data.turn) {
        turn = data.turn;
        updateTurnLabel();
    }

    if (data.winner) {
        mostrarMensagem("Jogo terminado. Vencedor: " + data.winner, 6);
        finishGame(data.winner);
        stopUpdateStream();
    }
}

async function getRanking(size){
    try{
        const data = await twGet("ranking", {
            group : GROUP,
            size : size
        });

        renderRanking(data.ranking || []);
    } catch (err) {
        showError("Erro ao obter ranking: " + err.message);
    }
}

function renderRanking(list) {
    const box = document.querySelector('.Classifcacao');
    if (!box) return;

    box.innerHTML = "<br><p class='int'><strong>Ranking</strong></p>";

    if (!list.length) {
        box.innerHTML += "<p class='int'>Ainda não há jogos registados.</p>";
        return;
    }

    list.forEach((item, idx) => {
        const line = document.createElement('p');
        line.className = 'int';
        line.textContent = (idx + 1) + ". " + item.nick + " - " + item.victories + " vitórias";
        box.appendChild(line);
    });

    const btn = document.createElement('button');
    btn.textContent = "Close";
    btn.onclick = FecharClasf;
    box.appendChild(btn);
}


function Instrucoes() {
    document.getElementsByClassName("Instrucoes")[0].style.display = "block";
}

function FecharInsts(){
    document.getElementsByClassName("Instrucoes")[0].style.display = "none";
}

function Classifcacao() {
    document.getElementsByClassName("Classifcacao")[0].style.display = "block";

    const cols = document.getElementById("cols")
        ? parseInt(document.getElementById("cols").value, 10)
        : 7;
    const rows = document.getElementById("rows")
        ? parseInt(document.getElementById("rows").value, 10)
        : 4;
    const sizeStr = rows + "x" + cols;   

    getRanking(sizeStr);
}


function FecharClasf() {
    document.getElementsByClassName("Classifcacao")[0].style.display = "none";
}

function Escolhe(){
    document.getElementById('btnPvC').style.display = "none";
    document.getElementById('btnPvP').style.display = "none";
    document.getElementsByClassName('Escolher')[0].style.display = "block";
    document.getElementsByTagName('button')[2].style.display = "block";
    document.getElementsByClassName("logout")[0].style.display = "none";
    
}

function Home(){
    document.getElementById('btnPvC').style.display = 'block';
    document.getElementById('btnPvP').style.display = 'block';
    document.getElementsByClassName('Escolher')[0].style.display = 'none';
    document.getElementsByClassName("logout")[0].style.display = "block";
    document.getElementById('boardArea').style.display = 'none';
    game = 0;
    mostrarMensagem("Regresso ao menu.");
    document.querySelectorAll('.MenuLateral button').forEach(btn => {
        btn.style.display = 'none';
    });
}

/*Funções do jogo*/

function updateBoardLabels(){
    const cols = parseInt(document.getElementById('cols').value,10);
    const rows = parseInt(document.getElementById('rows').value,10);
    document.getElementById('colsLabel').textContent = cols;
    document.getElementById('rowsLabel').textContent = rows;
}

function play1(){
    boardCols = parseInt(document.getElementById('cols').value,10);
    boardRows = parseInt(document.getElementById('rows').value,10);
    const level = document.querySelector('input[name="level"]:checked');
    difficulty = level ? level.value : 'medio';

    document.getElementsByClassName('Escolher')[0].style.display = "none";
    document.getElementsByClassName("surrender")[0].style.display = "flex";
    document.getElementsByClassName("logout")[0].style.display = "none";
    document.getElementById('boardArea').style.display = 'block';
    iniciarTabuleiro(boardRows, boardCols);
    game = 1;
    turn = 'P';
    updateTurnLabel();

    document.querySelectorAll('.MenuLateral button').forEach(btn => {
        btn.style.display = 'block';
    });
}

function iniciarTabuleiro(rows, cols){
    board = new Array(rows * cols).fill(null);
    boardRows = rows;
    boardCols = cols;
    scoreP = 0; scoreC = 0;
    selectedPiece = null;
    lastRoll = 0;
    // preencher peças iniciais: jogador na linha inferior, IA na linha superior
    for(let c=0;c<cols;c++){
        board[cellIndex(0,c)] = 'C';              // IA, linha 0
        board[cellIndex(rows-1,c)] = 'P';         // Player, linha rows-1
    }
    renderBoard();
    mostrarMensagem(`Tabuleiro ${rows}x${cols} iniciado. Primeira jogada: Jogador (P).`);
}

function renderBoard(){
    const boardBack = document.getElementById('boardBack');
    boardBack.innerHTML = '';
    boardBack.style.gridTemplateColumns = `repeat(${boardCols}, 1fr)`;
    boardBack.style.display = 'grid';
    boardBack.className = 'boardBack';

    for(let r=0;r<boardRows;r++){
        for(let c=0;c<boardCols;c++){
            const idx = cellIndex(r,c);
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.idx = idx;
            cell.addEventListener('click', () => onCellClick(idx));
            const content = board[idx] ? (board[idx] === 'P' ? 'P' : 'C') : '';
            cell.textContent = content;
            const coord = document.createElement('div');
            coord.className = 'coord';
            coord.textContent = `${r},${c}`;
            cell.appendChild(coord);
            // styling classes
            cell.classList.toggle('player', board[idx] === 'P');
            cell.classList.toggle('pc', board[idx] === 'C');
            cell.classList.toggle('empty', board[idx] === null);
            boardBack.appendChild(cell);
        }
    }
    document.getElementById('scoreP').textContent = scoreP;
    document.getElementById('scoreC').textContent = scoreC;
    updateTurnLabel();
}

/*Lançamento*/
function rollSticks(){
    if(game !== 1) return;
    if(turn !== 'P') { mostrarMensagem("Não é a tua vez."); return; }
    lastRoll = 1 + Math.floor(Math.random()*4); // 1..4
    document.getElementById('rollResult').textContent = lastRoll;
    mostrarMensagem(`Obtiveste ${lastRoll}. Agora escolhe uma peça sua para mover.`);
    highlightMovablePieces();
}

/* sublinha peças que o jogador pode mover com lastRoll */
function highlightMovablePieces(){
    clearSelectable();
    if(lastRoll <= 0) return;
    const cells = document.querySelectorAll('#boardBack .cell');
    for(const el of cells){
        const idx = parseInt(el.dataset.idx,10);
        if(board[idx] !== 'P') continue;
        if(canMovePiece(idx, lastRoll, 'P')) el.classList.add('selectable');
    }
}

/* remove highlights */
function clearSelectable(){
    document.querySelectorAll('#boardBack .cell.selectable').forEach(e => e.classList.remove('selectable'));
}

/*Movimento*/

function canMovePiece(idx, step, player){
    const pos = coordFromIndex(idx);
    if(player === 'P'){
        const destR = pos.r - step;
        if(destR < 0) return true; 
        const destIdx = cellIndex(destR, pos.c);
        if(board[destIdx] === 'P') return false;
        return true;
    } else { 
        const destR = pos.r + step; // desce
        if(destR >= boardRows) return true;
        const destIdx = cellIndex(destR, pos.c);
        if(board[destIdx] === 'C') return false;
        return true;
    }
}

function onCellClick(idx) {
    if (game !== 1) return;

    if (turn === 'P') {
        if (lastRoll <= 0) {
            mostrarMensagem('Primeiro clica em "Lançar (1-4)".');
            return;
        }
        if (board[idx] !== 'P') {
            mostrarMensagem('Escolhe uma das tuas peças (verde).');
            return;
        }
        if (!canMovePiece(idx, lastRoll, 'P')) {
            mostrarMensagem('Essa peça não pode mover com o valor lançado.');
            return;
        }

        const moveStr = String(idx);
        notifyMove(moveStr);

        clearSelectable();
        document.getElementById('rollResult').textContent = '—';
        lastRoll = 0;
        mostrarMensagem('Jogada enviada. Aguarda resposta do servidor.', 4);
    } else {
        mostrarMensagem('Não é a tua vez.');
    }
}



function moverPeca(idx, step, player){
    const pos = coordFromIndex(idx);
    if(player === 'P'){
        const destR = pos.r - step;
        if(destR < 0){
            board[idx] = null;
            scoreP += 1;
            mostrarMensagem('Peça saiu do tabuleiro — +1 ponto!');
            renderBoard();
            return;
        }
        const destIdx = cellIndex(destR, pos.c);
        if(board[destIdx] === 'C'){
            board[destIdx] = 'P';
            board[idx] = null;
            mostrarMensagem('Capturaste uma peça inimiga!');
        } else {
            board[destIdx] = 'P';
            board[idx] = null;
        }
    } else { 
        const destR = pos.r + step;
        if(destR >= boardRows){
            board[idx] = null;
            scoreC += 1;
            mostrarMensagem('IA fez uma peça sair — IA +1 ponto.');
            renderBoard();
            return;
        }
        const destIdx = cellIndex(destR, pos.c);
        if(board[destIdx] === 'P'){
            board[destIdx] = 'C';
            board[idx] = null;
            mostrarMensagem('IA capturou uma peça tua.');
        } else {
            board[destIdx] = 'C';
            board[idx] = null;
        }
    }
    renderBoard();
}

/*IA*/

function iaTurn(){
    if(game !== 1) return;
    const roll = 1 + Math.floor(Math.random()*4);
    mostrarMensagem(`IA lança e obtém ${roll}`);
    const moves = [];
    for(let r=0;r<boardRows;r++){
        for(let c=0;c<boardCols;c++){
            const i = cellIndex(r,c);
            if(board[i] === 'C' && canMovePiece(i, roll, 'C')){
                moves.push(i);
            }
        }
    }
    if(moves.length === 0){
        mostrarMensagem('IA não tem jogadas válidas. Volta a tua vez.');
        turn = 'P';
        updateTurnLabel();
        return;
    }
    let chosen;
    if(difficulty === 'facil'){
        chosen = moves[Math.floor(Math.random()*moves.length)];
    } else if(difficulty === 'medio'){
        const captureMoves = moves.filter(i => {
            const pos = coordFromIndex(i);
            const destR = pos.r + roll;
            if(destR >= boardRows) return true; 
            const destIdx = cellIndex(destR, pos.c);
            return board[destIdx] === 'P';
        });
        chosen = captureMoves.length ? captureMoves[Math.floor(Math.random()*captureMoves.length)]
                                      : moves[Math.floor(Math.random()*moves.length)];
    } else { 
        const captureMoves = moves.filter(i => {
            const pos = coordFromIndex(i);
            const destR = pos.r + roll;
            if(destR >= boardRows) return true;
            const destIdx = cellIndex(destR, pos.c);
            return board[destIdx] === 'P';
        });
        if(captureMoves.length){
            chosen = captureMoves[Math.floor(Math.random()*captureMoves.length)];
        } else {
            const pontua = moves.filter(i => {
                const pos = coordFromIndex(i);
                return (pos.r + roll) >= boardRows;
            });
            if(pontua.length) chosen = pontua[Math.floor(Math.random()*pontua.length)];
            else {
                moves.sort((a,b) => coordFromIndex(b).r - coordFromIndex(a).r);
                chosen = moves[0];
            }
        }
    }
    moverPeca(chosen, roll, 'C');
    if(checkEnd()) return;
    turn = 'P';
    updateTurnLabel();
    mostrarMensagem('A tua vez.');
}

/*Fim do Jogo*/
function checkEnd(){
    const piecesP = board.filter(x => x === 'P').length;
    const piecesC = board.filter(x => x === 'C').length;
    if(piecesP === 0){
        mostrarMensagem('Perdeste: todas as tuas peças foram eliminadas.');
        finishGame('C');
        return true;
    }
    if(piecesC === 0){
        mostrarMensagem('Ganhaste! Eliminaste todas as peças inimigas.');
        finishGame('P');
        return true;
    }
    if(scoreP >= boardCols){
        mostrarMensagem('Ganhaste por pontuação!');
        finishGame('P');
        return true;
    }
    if(scoreC >= boardCols){
        mostrarMensagem('IA ganha por pontuação!');
        finishGame('C');
        return true;
    }
    return false;
}

function finishGame(winner) {
    stopUpdateStream(); 

    game = 2;
    document.querySelectorAll('#boardBack .cell')
        .forEach(c => c.classList.add('disabled'));

    const t = "Fim - " + (winner || "");
    document.getElementById('turnLabel').textContent = t;

    document.getElementById('rollBtn').disabled = true;
}

/*Auxiliares*/
async function desistir(){
    if (!currentNick || !currentGame || !currentPass){
        mostrarMensagem("Desististe. IA vence por desistência.");
        finishGame("C");
        return;
    }

    try{
        await twGet("leave", {
            nick: currentNick,
            password: currentPass,
            game: currentGame
        });

        mostrarMensagem("Saíste do jogo. Vitória do adversário.", 4);
        currentGame = null;
        stopUpdateStream();
        finishGame("C");
    } catch(err){
        showError("Erro ao sair do jogo: " + err.message);
    }
}

function reiniciar(){
    iniciarTabuleiro(boardRows, boardCols);
    game = 1;
    turn = 'P';
    lastRoll = 0;
    document.getElementById('rollResult').textContent = '—';
    document.getElementById('rollBtn').disabled = false;
    mostrarMensagem('Tabuleiro reiniciado.');
}

function Logout(){
    document.getElementsByClassName("login")[0].style.display = "block";
    document.getElementsByClassName("logout")[0].style.display = "none";
    document.getElementById('boardArea').style.display = 'none';
    game = 0;
    mostrarMensagem("Sessão terminada.");
    document.querySelectorAll('.MenuLateral button').forEach(btn => {
        btn.style.display = 'none';
    });
}

function updateTurnLabel(){
    const t = (game === 2) ? 'Jogo acabado' : (turn === 'P' ? 'Jogador (P)' : 'IA (C)');
    document.getElementById('turnLabel').textContent = t;
}

/*Mensagens*/
function mostrarMensagem(text, seconds=4){
    if(!mensagensDiv) mensagensDiv = document.getElementById('mensagens');
    mensagensDiv.style.display = 'block';
    mensagensDiv.textContent = text;
    if(seconds > 0){
        setTimeout(() => { mensagensDiv.style.display = 'none'; }, seconds*1000);
    }
}