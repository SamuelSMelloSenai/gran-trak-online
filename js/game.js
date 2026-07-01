// js/game.js

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TAMANHO_BLOCO = 50; 
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

// Estado do seu carro
let meuCarro = {
    x: 425, y: 175,
    angulo: -Math.PI / 2,
    velocidade: 0, velX: 0, velY: 0,
    volta: 1, passouPeloCheckPoint: false,
    raioColisao: 12 // Para cálculo de colisão circular entre carros
};

let jogadoresInimigos = {};
const teclas = {};

// Sistema de Audio
let audioCtx = null;
let oscMotor = null;
let gainMotor = null;

// Sistema de Rastros de Pneu (Skidmarks)
let rastrosPneu = []; 

window.addEventListener('keydown', e => { 
    teclas[e.key] = true;
    if(!audioCtx) inicializarAudio();
});
window.addEventListener('keyup', e => teclas[e.key] = false);

function inicializarAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Configura áudio contínuo do motor
    oscMotor = audioCtx.createOscillator();
    gainMotor = audioCtx.createGain();
    
    oscMotor.type = 'triangle'; // Som mais suave que dita o ronco do motor
    oscMotor.frequency.setValueAtTime(60, audioCtx.currentTime);
    
    gainMotor.gain.setValueAtTime(0.08, audioCtx.currentTime); // Volume baixo para não incomodar
    
    oscMotor.connect(gainMotor);
    gainMotor.connect(audioCtx.destination);
    oscMotor.start();
}

function atualizarSomMotor() {
    if (!oscMotor) return;
    // O tom do motor sobe proporcionalmente à velocidade real do carro
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
    // 1. Controle e Esterçamento Dinâmico
    let viraVel = 0.055 - (Math.abs(meuCarro.velocidade) * 0.004);
    if (teclas['ArrowLeft']) meuCarro.angulo -= viraVel;
    if (teclas['ArrowRight']) meuCarro.angulo += viraVel;

    // 2. Aceleração e Turbo
    let aceleracao = 0.14;
    let maxVel = teclas[' '] ? 7.5 : 4.8; 

    if (teclas['ArrowUp']) {
        meuCarro.velocidade = Math.min(meuCarro.velocidade + aceleracao, maxVel); 
    } else if (teclas['ArrowDown']) {
        meuCarro.velocidade = Math.max(meuCarro.velocidade - 0.18, -2.5); // Ré mais ágil
    } else {
        meuCarro.velocidade *= 0.93; 
    }

    // 3. Mecânica Avançada de Drift e Derrapagem
    let destinoVelX = Math.cos(meuCarro.angulo) * meuCarro.velocidade;
    let destinoVelY = Math.sin(meuCarro.angulo) * meuCarro.velocidade;

    // Diferença entre para onde o carro aponta e para onde ele está indo
    let desvioX = destinoVelX - meuCarro.velX;
    let desvioY = destinoVelY - meuCarro.velY;
    let intensidadeDerrapagem = Math.sqrt(desvioX * desvioX + desvioY * desvioY);

    // Se estiver derrapando muito de lado ou usando nitro, deixa rastro no chão
    if (intensidadeDerrapagem > 1.8 || (teclas[' '] && meuCarro.velocidade > 3)) {
        rastrosPneu.push({x: meuCarro.x, y: meuCarro.y, vida: 150}); // Dura 150 frames
    }

    meuCarro.velX += desvioX * 0.13; // Fator de aderência (0.13 garante o deslize perfeito)
    meuCarro.velY += desvioY * 0.13;

    let proximoX = meuCarro.x + meuCarro.velX;
    let proximoY = meuCarro.y + meuCarro.velY;

    // 4. Colisão com o Cenário (Paredes)
    if (checarColisaoParedes(proximoX, proximoY)) {
        tocarSomBatida();
        meuCarro.velocidade = -meuCarro.velocidade * 0.5; 
        meuCarro.velX = -meuCarro.velX * 0.5;
        meuCarro.velY = -meuCarro.velY * 0.5;
    } else {
        meuCarro.x = proximoX;
        meuCarro.y = proximoY;
    }

    // 5. NOVA: Colisão Dinâmica entre Carros (Bumping)
    Object.keys(jogadoresInimigos).forEach(id => {
        let inimigo = jogadoresInimigos[id];
        let dx = meuCarro.x - inimigo.x;
        let dy = meuCarro.y - inimigo.y;
        let distancia = Math.sqrt(dx * dx + dy * dy);
        let distanciaMinima = meuCarro.raioColisao + 12; // 12 é o raio aproximado do inimigo

        if (distancia < distanciaMinima) {
            tocarSomBatida();
            // Calcula o ângulo do empurrão
            let anguloColisao = Math.atan2(dy, dx);
            let empurraoX = Math.cos(anguloColisao) * 2.5;
            let empurraoY = Math.sin(anguloColisao) * 2.5;

            // Aplica forças opostas imediatamente
            meuCarro.x += empurraoX;
            meuCarro.y += empurraoY;
            meuCarro.velX += empurraoX * 0.5;
            meuCarro.velY += empurraoY * 0.5;
            meuCarro.velocidade *= 0.6; // Perde embalo no baque
        }
    });

    // 6. Voltas e Checkpoints
    let col = Math.floor(meuCarro.x / TAMANHO_BLOCO);
    let row = Math.floor(meuCarro.y / TAMANHO_BLOCO);
    if(row > 7) meuCarro.passouPeloCheckPoint = true; 

    if (row >= 0 && row < MAPA.length && col >= 0 && col < MAPA[0].length) {
        if (MAPA[row][col] === 2 && meuCarro.passouPeloCheckPoint) {
            meuCarro.volta++;
            meuCarro.passouPeloCheckPoint = false;
            if(meuCarro.volta > 3) {
                alert("🏁 FIM DE PROVA! VOCÊ É O VENCEDOR!");
                meuCarro.volta = 1;
            }
        }
    }

    atualizarSomMotor();

    // Atualiza HUD
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
    ctx.fillStyle = 'rgba(40, 40, 40, 0.4)';
    for (let i = rastrosPneu.length - 1; i >= 0; i--) {
        let rastro = rastrosPneu[i];
        ctx.fillRect(rastro.x - 4, rastro.y - 4, 8, 8);
        rastro.vida--;
        if (rastro.vida <= 0) rastrosPneu.splice(i, 1); // Remove rastros antigos
    }
}

function desenharPista() {
    for (let r = 0; r < MAPA.length; r++) {
        for (let c = 0; c < MAPA[r].length; c++) {
            if (MAPA[r][c] === 1) {
                ctx.fillStyle = '#ffffff'; 
                ctx.fillRect(c * TAMANHO_BLOCO, r * TAMANHO_BLOCO, TAMANHO_BLOCO - 1, TAMANHO_BLOCO - 1);
            } else if (MAPA[r][c] === 2) {
                ctx.fillStyle = (c % 2 === 0) ? '#ffffff' : '#333333';
                ctx.fillRect(c * TAMANHO_BLOCO, r * TAMANHO_BLOCO, TAMANHO_BLOCO, TAMANHO_BLOCO);
            }
        }
    }
}

function desenharCarro(x, y, angulo, corPrincipal, corDetalhe) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angulo);
    
    // Rodas largas (Visual agressivo)
    ctx.fillStyle = '#222';
    ctx.fillRect(-13, -11, 7, 4);
    ctx.fillRect(6, -11, 7, 4);
    ctx.fillRect(-13, 7, 7, 4);
    ctx.fillRect(6, 7, 7, 4);

    // Chassi
    ctx.fillStyle = corPrincipal;
    ctx.fillRect(-13, -7, 26, 14);
    
    // Aerofólio/Bico de cor diferente
    ctx.fillStyle = corDetalhe;
    ctx.fillRect(8, -7, 5, 14); 
    
    ctx.restore();
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    atualizarFisica();
    enviarMinhaPosicaoParaRede(meuCarro.x, meuCarro.y, meuCarro.angulo);

    // Renderização em Camadas (Rastro fica embaixo da pista/carros)
    desenharRastros();
    desenharPista();

    // Desenha Adversários (Vermelhos)
    Object.keys(jogadoresInimigos).forEach(id => {
        let inimigo = jogadoresInimigos[id];
        desenharCarro(inimigo.x, inimigo.y, inimigo.angulo, '#ff3333', '#ffff00');
    });

    // Desenha Seu Carro (Verde Elétrico)
    desenharCarro(meuCarro.x, meuCarro.y, meuCarro.angulo, '#00ff66', '#ffffff');

    requestAnimationFrame(gameLoop);
}

function atualizarPosicaoInimigo(id, x, y, angulo) {
    jogadoresInimigos[id] = { x, y, angulo };
}