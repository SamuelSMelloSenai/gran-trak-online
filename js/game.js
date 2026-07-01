// js/game.js

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TAMANHO_BLOCO = 50; 
// Grid 16x12 legítimo do Gran Trak. 1 = Parede Branca, 0 = Asfalto Preto, 2 = Linha Quadriculada
const MAPA = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
    [1,0,1,1,1,1,0,2,2,0,1,1,1,1,0,1], 
    [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,0,0,0,0,1,1,1,1,0,1],
    [1,0,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Estado do seu carro (Física Arcade Avançada)
let meuCarro = {
    x: 425, 
    y: 175,
    angulo: -Math.PI / 2, // Apontando para cima na largada
    velocidade: 0, 
    velX: 0, 
    velY: 0,
    volta: 1, 
    passouPeloCheckPoint: false,
    raioColisao: 12
};

let jogadoresInimigos = {};
const teclas = {};

// Efeitos de Áudio e Rastro
let audioCtx = null;
let oscMotor = null;
let gainMotor = null;
let rastrosPneu = []; 

window.addEventListener('keydown', e => { 
    teclas[e.key] = true;
    if(!audioCtx) inicializarAudio();
});
window.addEventListener('keyup', e => teclas[e.key] = false);

function inicializarAudio() {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        oscMotor = audioCtx.createOscillator();
        gainMotor = audioCtx.createGain();
        oscMotor.type = 'triangle'; 
        oscMotor.frequency.setValueAtTime(60, audioCtx.currentTime);
        gainMotor.gain.setValueAtTime(0.06, audioCtx.currentTime); 
        oscMotor.connect(gainMotor);
        gainMotor.connect(audioCtx.destination);
        oscMotor.start();
    } catch(e) { console.log("Áudio não suportado"); }
}

function atualizarSomMotor() {
    if (!oscMotor) return;
    let velReal = Math.sqrt(meuCarro.velX * meuCarro.velX + meuCarro.velY * meuCarro.velY);
    let novaFrequencia = 50 + (velReal * 35);
    oscMotor.frequency.setTargetAtTime(novaFrequencia, audioCtx.currentTime, 0.1);
}

function tocarSomBatida() {
    if(!audioCtx) return;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

function startCanvasGame() {
    if (!ehHost) {
        meuCarro.x += (Math.random() > 0.5 ? 20 : -20);
    }
    requestAnimationFrame(gameLoop);
}

function atualizarFisica() {
    // 1. Controle Dinâmico de Curva (Mais difícil de virar em alta velocidade)
    let viraVel = 0.055 - (Math.abs(meuCarro.velocidade) * 0.004);
    if (teclas['ArrowLeft']) meuCarro.angulo -= viraVel;
    if (teclas['ArrowRight']) meuCarro.angulo += viraVel;

    // 2. Aceleração e botão de Turbo (Espaço)
    let aceleracao = 0.14;
    let maxVel = teclas[' '] ? 7.5 : 4.8; 

    if (teclas['ArrowUp']) {
        meuCarro.velocidade = Math.min(meuCarro.velocidade + aceleracao, maxVel); 
    } else if (teclas['ArrowDown']) {
        meuCarro.velocidade = Math.max(meuCarro.velocidade - 0.18, -2.5); 
    } else {
        meuCarro.velocidade *= 0.93; 
    }

    // 3. Sistema de Drift (Inércia)
    let destinoVelX = Math.cos(meuCarro.angulo) * meuCarro.velocidade;
    let destinoVelY = Math.sin(meuCarro.angulo) * meuCarro.velocidade;

    let desvioX = destinoVelX - meuCarro.velX;
    let desvioY = destinoVelY - meuCarro.velY;
    let intensidadeDerrapagem = Math.sqrt(desvioX * desvioX + desvioY * desvioY);

    if (intensidadeDerrapagem > 1.8 || (teclas[' '] && meuCarro.velocidade > 3)) {
        rastrosPneu.push({x: meuCarro.x, y: meuCarro.y, vida: 120});
    }

    meuCarro.velX += desvioX * 0.14; 
    meuCarro.velY += desvioY * 0.14;

    let proximoX = meuCarro.x + meuCarro.velX;
    let proximoY = meuCarro.y + meuCarro.velY;

    // 4. Colisão Precisa com as Paredes
    if (checarColisaoParedes(proximoX, proximoY)) {
        tocarSomBatida();
        meuCarro.velocidade = -meuCarro.velocidade * 0.5; 
        meuCarro.velX = -meuCarro.velX * 0.5;
        meuCarro.velY = -meuCarro.velY * 0.5;
    } else {
        meuCarro.x = proximoX;
        meuCarro.y = proximoY;
    }

    // 5. Colisão Física entre Carrinhos (Bumping)
    Object.keys(jogadoresInimigos).forEach(id => {
        let inimigo = jogadoresInimigos[id];
        let dx = meuCarro.x - inimigo.x;
        let dy = meuCarro.y - inimigo.y;
        let distancia = Math.sqrt(dx * dx + dy * dy);
        if (distancia < (meuCarro.raioColisao + 12)) {
            tocarSomBatida();
            let anguloColisao = Math.atan2(dy, dx);
            meuCarro.x += Math.cos(anguloColisao) * 3;
            meuCarro.y += Math.sin(anguloColisao) * 3;
            meuCarro.velocidade *= 0.5;
        }
    });

    // 6. Voltas
    let col = Math.floor(meuCarro.x / TAMANHO_BLOCO);
    let row = Math.floor(meuCarro.y / TAMANHO_BLOCO);
    if(row > 7) meuCarro.passouPeloCheckPoint = true; 

    if (row >= 0 && row < MAPA.length && col >= 0 && col < MAPA[0].length) {
        if (MAPA[row][col] === 2 && meuCarro.passouPeloCheckPoint) {
            meuCarro.volta++;
            meuCarro.passouPeloCheckPoint = false;
            if(meuCarro.volta > 3) {
                alert("🏁 FIM DE CORRIDA! VOCÊ VENCEU!");
                meuCarro.volta = 1;
            }
        }
    }

    atualizarSomMotor();

    document.getElementById('placarVoltas').innerText = `VOLTA: ${meuCarro.volta}/3`;
    document.getElementById('placarVelocidade').innerText = `${Math.round(Math.abs(meuCarro.velocidade) * 32)} KM/H`;
}

function checarColisaoParedes(x, y) {
    let pontos = [
        {x: x - 11, y: y - 7}, {x: x + 11, y: y - 7},
        {x: x - 11, y: y + 7}, {x: x + 11, y: y + 7}
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

function desenharRastros() {
    ctx.fillStyle = 'rgba(40, 40, 40, 0.4)'; // Marcas pretas suaves no asfalto
    for (let i = rastrosPneu.length - 1; i >= 0; i--) {
        let rastro = rastrosPneu[i];
        ctx.fillRect(rastro.x - 4, rastro.y - 4, 8, 8);
        rastro.vida--;
        if (rastro.vida <= 0) rastrosPneu.splice(i, 1);
    }
}

function desenharPista() {
    // RESOLVIDO: O Canvas inteiro vira asfalto preto primeiro
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < MAPA.length; r++) {
        for (let c = 0; c < MAPA[r].length; c++) {
            if (MAPA[r][c] === 1) {
                // Desenha os blocos maciços brancos (sem grades cinzas)
                ctx.fillStyle = '#ffffff'; 
                ctx.fillRect(c * TAMANHO_BLOCO, r * TAMANHO_BLOCO, TAMANHO_BLOCO, TAMANHO_BLOCO);
            } else if (MAPA[r][c] === 2) {
                // Linha de chegada quadriculada estilizada em alta definição de Canvas
                for (let i = 0; i < TAMANHO_BLOCO; i += 10) {
                    for (let j = 0; j < TAMANHO_BLOCO; j += 10) {
                        ctx.fillStyle = ((i + j) / 10 % 2 === 0) ? '#ffffff' : '#000000';
                        ctx.fillRect((c * TAMANHO_BLOCO) + i, (r * TAMANHO_BLOCO) + j, 10, 10);
                    }
                }
            }
        }
    }
}

function desenharCarro(x, y, angulo, corPrincipal, corDetalhe) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angulo);
    
    // Rodas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-13, -11, 7, 4);
    ctx.fillRect(6, -11, 7, 4);
    ctx.fillRect(-13, 7, 7, 4);
    ctx.fillRect(6, 7, 7, 4);

    // Chassi do carro
    ctx.fillStyle = corPrincipal;
    ctx.fillRect(-13, -7, 26, 14);
    
    // Bico direcional
    ctx.fillStyle = corDetalhe;
    ctx.fillRect(8, -7, 5, 14); 
    
    ctx.restore();
}

function gameLoop() {
    atualizarFisica();
    enviarMinhaPosicaoParaRede(meuCarro.x, meuCarro.y, meuCarro.angulo);

    // Renderização em ordem correta de camadas
    desenharPista();
    desenharRastros();

    // Desenha Adversários conectados (Vermelhos)
    Object.keys(jogadoresInimigos).forEach(id => {
        let inimigo = jogadoresInimigos[id];
        desenharCarro(inimigo.x, inimigo.y, inimigo.angulo, '#ff3333', '#ffff00');
    });

    // Desenha Seu Carro (Verde Neon)
    desenharCarro(meuCarro.x, meuCarro.y, meuCarro.angulo, '#00ff66', '#ffffff');

    requestAnimationFrame(gameLoop);
}