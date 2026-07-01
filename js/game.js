// js/game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TAM_B = 25; // Blocos menores = pista mais detalhada
const MAPA = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
    [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
    [1,1,0,0,1,1,1,1,1,1,1,1,0,0,0,1,1,0,0,0,1,1,1,1,1,1,1,1,0,0,1,1],
    [1,1,0,0,1,1,1,1,1,1,1,1,0,0,0,2,2,0,0,0,1,1,1,1,1,1,1,1,0,0,1,1],
    [1,1,0,0,1,1,1,1,1,1,1,1,0,0,0,2,2,0,0,0,1,1,1,1,1,1,1,1,0,0,1,1],
    [1,1,0,0,1,1,1,1,1,1,1,1,0,0,0,1,1,0,0,0,1,1,1,1,1,1,1,1,0,0,1,1],
    [1,1,0,0,1,1,1,1,1,1,1,1,0,0,0,1,1,0,0,0,1,1,1,1,1,1,1,1,0,0,1,1],
    [1,1,0,0,0,0,0,0,0,1,1,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
    [1,1,0,0,0,0,0,0,0,1,1,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
    [1,1,1,1,1,1,1,0,0,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,0,0,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,0,0,0,0,0,0,0,1,1,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
    [1,1,0,0,0,0,0,0,0,1,1,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
    [1,1,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,1,1],
    [1,1,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,1,1],
    [1,1,0,0,1,1,1,1,1,1,1,1,0,0,0,1,1,0,0,0,1,1,1,1,1,1,1,1,0,0,1,1],
    [1,1,0,0,1,1,1,1,1,1,1,1,0,0,0,1,1,0,0,0,1,1,1,1,1,1,1,1,0,0,1,1],
    [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
    [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

let meuCarro = { x: 400, y: 135, angulo: 0, velocidade: 0, velX: 0, velY: 0, volta: 1, cp: false };
let inimigos = {};
const teclas = {};

window.addEventListener('keydown', e => teclas[e.key] = true);
window.addEventListener('keyup', e => teclas[e.key] = false);

function atualizarFisica() {
    let vira = 0.05 - (Math.abs(meuCarro.velocidade) * 0.003);
    if (teclas['ArrowLeft']) meuCarro.angulo -= vira;
    if (teclas['ArrowRight']) meuCarro.angulo += vira;

    if (teclas['ArrowUp']) meuCarro.velocidade = Math.min(meuCarro.velocidade + 0.15, 5);
    else if (teclas['ArrowDown']) meuCarro.velocidade = Math.max(meuCarro.velocidade - 0.1, -2);
    else meuCarro.velocidade *= 0.95;

    let dX = Math.cos(meuCarro.angulo) * meuCarro.velocidade;
    let dY = Math.sin(meuCarro.angulo) * meuCarro.velocidade;

    // Efeito de Drift
    meuCarro.velX += (dX - meuCarro.velX) * 0.15;
    meuCarro.velY += (dY - meuCarro.velY) * 0.15;

    if (!colisao(meuCarro.x + meuCarro.velX, meuCarro.y + meuCarro.velY)) {
        meuCarro.x += meuCarro.velX;
        meuCarro.y += meuCarro.velY;
    } else {
        meuCarro.velocidade = -meuCarro.velocidade * 0.5;
        meuCarro.velX = 0; meuCarro.velY = 0;
    }

    // Voltas
    let r = Math.floor(meuCarro.y / TAM_B), c = Math.floor(meuCarro.x / TAM_B);
    if (r > 15) meuCarro.cp = true;
    if (MAPA[r] && MAPA[r][c] === 2 && meuCarro.cp) {
        meuCarro.volta++; meuCarro.cp = false;
        if(meuCarro.volta > 3) alert("VENCEU!");
    }
    document.getElementById('placarVoltas').innerText = `VOLTA: ${meuCarro.volta}/3`;
}

function colisao(x, y) {
    let pontos = [{x:x-8,y:y-5}, {x:x+8,y:y-5}, {x:x-8,y:y+5}, {x:x+8,y:y+5}];
    for(let p of pontos) {
        let c = Math.floor(p.x / TAM_B), r = Math.floor(p.y / TAM_B);
        if(!MAPA[r] || MAPA[r][c] === 1) return true;
    }
    return false;
}

function desenharPista() {
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,800,600);
    for(let r=0; r<MAPA.length; r++) {
        for(let c=0; c<MAPA[r].length; c++) {
            if(MAPA[r][c] === 1) {
                ctx.fillStyle = "#FFF";
                ctx.fillRect(c*TAM_B, r*TAM_B, TAM_B, TAM_B);
            } else if(MAPA[r][c] === 2) {
                ctx.fillStyle = (c%2 === 0) ? "#FFF" : "#555";
                ctx.fillRect(c*TAM_B, r*TAM_B, TAM_B, TAM_B);
            }
        }
    }
}

function desenharCarro(x, y, ang, cor) {
    ctx.save(); ctx.translate(x,y); ctx.rotate(ang);
    ctx.fillStyle = "#222"; ctx.fillRect(-10, -8, 5, 3); ctx.fillRect(5, -8, 5, 3);
    ctx.fillStyle = cor; ctx.fillRect(-10, -5, 20, 10);
    ctx.fillStyle = "#FFF"; ctx.fillRect(6, -5, 4, 10);
    ctx.restore();
}

function gameLoop() {
    atualizarFisica();
    enviarMinhaPosicaoParaRede(meuCarro.x, meuCarro.y, meuCarro.angulo);
    desenharPista();
    Object.keys(inimigos).forEach(id => {
        let i = inimigos[id];
        desenharCarro(i.x, i.y, i.angulo, "#F33");
    });
    desenharCarro(meuCarro.x, meuCarro.y, meuCarro.angulo, "#0F6");
    requestAnimationFrame(gameLoop);
}

function atualizarPosicaoInimigo(id, x, y, angulo) {
    inimigos[id] = { x, y, angulo };
}

function startCanvasGame() { requestAnimationFrame(gameLoop); }