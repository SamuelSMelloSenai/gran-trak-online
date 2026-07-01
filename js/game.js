// js/game.js

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TAMANHO_BLOCO = 50; 
// Grid 16x12. 1 = Parede, 0 = Asfalto, 2 = Linha de Chegada/Largada
const MAPA = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
    [1,0,1,1,1,1,0,2,2,0,1,1,1,1,0,1], // Linha de chegada no meio
    [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,0,0,0,0,1,1,1,1,0,1],
    [1,0,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Física melhorada: Adicionado vetor de movimento (velX, velY) para efeito de Drift
let meuCarro = {
    x: 425,
    y: 175,
    angulo: -Math.PI / 2, // Apontando para cima na largada
    velocidade: 0,
    velX: 0,
    velY: 0,
    volta: 1,
    passouPeloCheckPoint: false
};

let jogadoresInimigos = {};
const teclas = {};
let audioCtx = null;

window.addEventListener('keydown', e => { 
    teclas[e.key] = true;
    // Inicializa o áudio no primeiro clique do jogador (exigência dos navegadores)
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
});
window.addEventListener('keyup', e => teclas[e.key] = false);

// Sons Retro gerados via código (Web Audio API)
function tocarSomBatida() {
    if(!audioCtx) return;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

function startCanvasGame() {
    if (!ehHost) {
        // Separa os carros no grid de largada
        meuCarro.x += (Math.random() > 0.5 ? 25 : -25);
    }
    requestAnimationFrame(gameLoop);
}

function atualizarFisica() {
    // 1. Direção sensível à velocidade (Gira menos se estiver muito rápido)
    let viraVel = 0.06 - (Math.abs(meuCarro.velocidade) * 0.005);
    if (teclas['ArrowLeft']) meuCarro.angulo -= viraVel;
    if (teclas['ArrowRight']) meuCarro.angulo += viraVel;

    // 2. Aceleração / Frenagem / Turbo
    let aceleracao = 0.12;
    let maxVel = teclas[' '] ? 7 : 4.5; // Barra de espaço ativa o Turbo!

    if (teclas['ArrowUp']) {
        meuCarro.velocidade = Math.min(meuCarro.velocidade + aceleracao, maxVel); 
    } else if (teclas['ArrowDown']) {
        meuCarro.velocidade = Math.max(meuCarro.velocidade - 0.15, -2); // Ré
    } else {
        meuCarro.velocidade *= 0.94; // Atrito do asfalto
    }

    // 3. O SEGREDO DO DRIFT: Misturar a direção do carro com a inércia anterior
    let destinoVelX = Math.cos(meuCarro.angulo) * meuCarro.velocidade;
    let destinoVelY = Math.sin(meuCarro.angulo) * meuCarro.velocidade;

    // O fator 0.15 dita o deslize. Valores menores = mais sabão na pista.
    meuCarro.velX += (destinoVelX - meuCarro.velX) * 0.15;
    meuCarro.velY += (destinoVelY - meuCarro.velY) * 0.15;

    let proximoX = meuCarro.x + meuCarro.velX;
    let proximoY = meuCarro.y + meuCarro.velY;

    // 4. Detecção de Colisão por pixel (Bordas do carro)
    if (checarColisao(proximoX, proximoY)) {
        tocarSomBatida();
        meuCarro.velocidade = -meuCarro.velocidade * 0.4; // Rebote
        meuCarro.velX = -meuCarro.velX * 0.4;
        meuCarro.velY = -meuCarro.velY * 0.4;
    } else {
        meuCarro.x = proximoX;
        meuCarro.y = proximoY;
    }

    // 5. Sistema de Voltas e Checkpoint (Evita trapaça de andar de ré)
    let col = Math.floor(meuCarro.x / TAMANHO_BLOCO);
    let row = Math.floor(meuCarro.y / TAMANHO_BLOCO);

    // Metade de baixo da pista serve de checkpoint
    if(row > 7) meuCarro.passouPeloCheckPoint = true; 

    if (row >= 0 && row < MAPA.length && col >= 0 && col < MAPA[0].length) {
        if (MAPA[row][col] === 2 && meuCarro.passouPeloCheckPoint) {
            meuCarro.volta++;
            meuCarro.passouPeloCheckPoint = false;
            if(meuCarro.volta > 3) {
                alert("FIM DE CORRIDA! VOCÊ VENCEU!");
                meuCarro.volta = 1;
            }
        }
    }

    // Atualiza Painel Visual (HUD)
    document.getElementById('placarVoltas').innerText = `VOLTA: ${meuCarro.volta}/3`;
    document.getElementById('placarVelocidade').innerText = `${Math.round(Math.abs(meuCarro.velocidade) * 30)} KM/H`;
}

function checarColisao(x, y) {
    // Checa o centro e as 4 extremidades do carro
    let pontos = [
        {x: x, y: y},
        {x: x - 10, y: y - 6},
        {x: x + 10, y: y - 6},
        {x: x - 10, y: y + 6},
        {x: x + 10, y: y + 6}
    ];

    for(let p of pontos) {
        let col = Math.floor(p.x / TAMANHO_BLOCO);
        let row = Math.floor(p.y / TAMANHO_BLOCO);
        if (row < 0 || row >= MAPA.length || col < 0 || col >= MAPA[0].length || MAPA[row][col] === 1) {
            return true;
        }
    }
    return false;
}

function desenharPista() {
    for (let r = 0; r < MAPA.length; r++) {
        for (let c = 0; c < MAPA[r].length; c++) {
            if (MAPA[r][c] === 1) {
                ctx.fillStyle = '#ffffff'; 
                ctx.fillRect(c * TAMANHO_BLOCO, r * TAMANHO_BLOCO, TAMANHO_BLOCO - 1, TAMANHO_BLOCO - 1);
            } else if (MAPA[r][c] === 2) {
                // Linha de chegada quadriculada retro
                ctx.fillStyle = (c % 2 === 0) ? '#fff' : '#444';
                ctx.fillRect(c * TAMANHO_BLOCO, r * TAMANHO_BLOCO, TAMANHO_BLOCO, TAMANHO_BLOCO);
            }
        }
    }
}

function desenharCarro(x, y, angulo, corPrincipal, corDetalhe, rastro) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angulo);
    
    // Rodas (Estilo F1 clássico exposto)
    ctx.fillStyle = '#444';
    ctx.fillRect(-12, -10, 6, 4);
    ctx.fillRect(6, -10, 6, 4);
    ctx.fillRect(-12, 6, 6, 4);
    ctx.fillRect(6, 6, 6, 4);

    // Corpo do carro
    ctx.fillStyle = corPrincipal;
    ctx.fillRect(-12, -6, 24, 12);
    
    // bico/aerofólio frontal
    ctx.fillStyle = corDetalhe;
    ctx.fillRect(8, -6, 4, 12); 
    
    ctx.restore();
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    atualizarFisica();
    enviarMinhaPosicaoParaRede(meuCarro.x, meuCarro.y, meuCarro.angulo);
    desenharPista();

    // Desenha os competidores da rede primeiro (para o seu ficar por cima)
    Object.keys(jogadoresInimigos).forEach(id => {
        let inimigo = jogadoresInimigos[id];
        desenharCarro(inimigo.x, inimigo.y, inimigo.angulo, '#ff3333', '#ffff00');
    });

    // Seu carrinho (Verde Neon de destaque)
    desenharCarro(meuCarro.x, meuCarro.y, meuCarro.angulo, '#00ff00', '#ffffff');

    requestAnimationFrame(gameLoop);
}

function atualizarPosicaoInimigo(id, x, y, angulo) {
    jogadoresInimigos[id] = { x, y, angulo };
}