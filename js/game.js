// js/game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Configurações da Pista Vetorial (Suave)
const CENTRO_X = 400;
const CENTRO_Y = 300;
const LARGURA_PISTA = 90; // Largura do asfalto para os carros correrem

// Posição inicial dos carros (Na reta de baixo, antes da linha de chegada)
let meuCarro = { 
    x: 400, 
    y: 510, 
    angulo: 0, 
    velocidade: 0, 
    velX: 0, 
    velY: 0, 
    volta: 1, 
    passouPeloCheckPoint: false 
};

let inimigos = {};
const teclas = {};

window.addEventListener('keydown', e => teclas[e.key] = true);
window.addEventListener('keyup', e => teclas[e.key] = false);

function startCanvasGame() {
    if (!ehHost) {
        meuCarro.y += (Math.random() > 0.5 ? 15 : -15); // Separa os carros na largada
    }
    requestAnimationFrame(gameLoop);
}

// Desenha o traçado da pista usando caminhos geométricos (Paths)
function desenharFormaPista(largura, cor) {
    ctx.strokeStyle = cor;
    ctx.lineWidth = largura;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();

    // Reta Inferior (Largada)
    ctx.moveTo(250, 510);
    ctx.lineTo(550, 510);

    // Curva Inferior Direita (Sobe)
    ctx.arc(550, 420, 90, Math.PI / 2, 0, true);

    // Curva Interna Direita (Faz o desenho do 'E' ou '3')
    ctx.arc(550, 300, 30, 0, Math.PI, true);

    // Curva Superior Direita
    ctx.arc(550, 180, 90, Math.PI, Math.PI * 1.5, true);

    // Reta Superior
    ctx.lineTo(250, 90);

    // Curva Superior Esquerda
    ctx.arc(250, 180, 90, Math.PI * 1.5, Math.PI, true);

    // Curva Interna Esquerda
    ctx.arc(250, 300, 30, Math.PI, 0, true);

    // Curva Inferior Esquerda
    ctx.arc(250, 420, 90, 0, Math.PI / 2, true);

    ctx.closePath();
    ctx.stroke();
}

function desenharCenarioCompleto() {
    // 1. Fundo de Grama Verde
    ctx.fillStyle = "#2e5c1e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Bordas da pista (Zebras Brancas/Vermelhas simuladas pela largura maior)
    desenharFormaPista(LARGURA_PISTA + 10, "#ffffff");

    // 3. O Asfalto Cinza Escuro por cima
    desenharFormaPista(LARGURA_PISTA, "#222222");

    // 4. Linhas de guia centrais (Tracejada discreta)
    ctx.setLineDash([10, 10]);
    desenharFormaPista(2, "#444444");
    ctx.setLineDash([]); // Reseta o estilo de linha

    // 5. Linha de Chegada / Largada (Na reta inferior)
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(400, 510 - LARGURA_PISTA / 2);
    ctx.lineTo(400, 510 + LARGURA_PISTA / 2);
    ctx.stroke();

    // Detalhe quadriculado na linha de chegada
    ctx.fillStyle = "#000000";
    for (let i = 0; i < LARGURA_PISTA; i += 10) {
        if ((i / 10) % 2 === 0) {
            ctx.fillRect(397, (510 - LARGURA_PISTA / 2) + i, 3, 10);
        }
    }
}

function atualizarFisica() {
    // Direção sensível
    let vira = 0.05 - (Math.abs(meuCarro.velocidade) * 0.003);
    if (teclas['ArrowLeft']) meuCarro.angulo -= vira;
    if (teclas['ArrowRight']) meuCarro.angulo += vira;

    // Aceleração / Ré
    if (teclas['ArrowUp']) meuCarro.velocidade = Math.min(meuCarro.velocidade + 0.15, 5.5);
    else if (teclas['ArrowDown']) meuCarro.velocidade = Math.max(meuCarro.velocidade - 0.12, -2.5);
    else meuCarro.velocidade *= 0.94; // Fricção

    let dX = Math.cos(meuCarro.angulo) * meuCarro.velocidade;
    let dY = Math.sin(meuCarro.angulo) * meuCarro.velocidade;

    // Drift / Inércia suavizada
    meuCarro.velX += (dX - meuCarro.velX) * 0.16;
    meuCarro.velY += (dY - meuCarro.velY) * 0.16;

    let proximoX = meuCarro.x + meuCarro.velX;
    let proximoY = meuCarro.y + meuCarro.velY;

    // SISTEMA DE COLISÃO POR COR: Se o carro sair do asfalto (#222222), ele bate
    if (checarColisaoAsfalto(proximoX, proximoY)) {
        meuCarro.x = proximoX;
        meuCarro.y = proximoY;
    } else {
        // Reduz a velocidade drasticamente ao bater na grama/borda
        meuCarro.velocidade = -meuCarro.velocidade * 0.4;
        meuCarro.velX *= -0.4;
        meuCarro.velY *= -0.4;
    }

    // Sistema de Voltas (Checkpoint na metade superior da pista: y < 200)
    if (meuCarro.y < 200) meuCarro.passouPeloCheckPoint = true;

    // Se cruzar o X:400 indo da esquerda para a direita na reta inferior
    if (meuCarro.passouPeloCheckPoint && meuCarro.x >= 400 && meuCarro.x - meuCarro.velX < 400 && meuCarro.y > 450) {
        meuCarro.volta++;
        meuCarro.passouPeloCheckPoint = false;
        if (meuCarro.volta > 3) {
            alert("🏁 VITÓRIA! VOCÊ COMPLETOU AS 3 VOLTAS!");
            meuCarro.volta = 1;
        }
    }

    document.getElementById('placarVoltas').innerText = `VOLTA: ${meuCarro.volta}/3`;
    document.getElementById('placarVelocidade').innerText = `${Math.round(Math.abs(meuCarro.velocidade) * 30)} KM/H`;
}

// Lê o pixel do Canvas para saber se o carro está no asfalto limpo
function checarColisaoAsfalto(x, y) {
    // Desenha a pista invisível em um buffer rápido para checar a cor do pixel
    // Para simplificar e performar bem, checamos se o ponto está dentro do limite aceitável da pista
    // Testamos os 4 cantos do carro
    return testarPontoNoAsfalto(x, y);
}

function testarPontoNoAsfalto(x, y) {
    // Cria um pequeno teste de cor direto no canvas antes de desenhar os carros
    let pixel = ctx.getImageData(x, y, 1, 1).data;
    // Se o canal Verde (pixel[1]) for maior que o Vermelho (pixel[0]), significa que é Grama (#2e5c1e)
    if (pixel[1] > pixel[0] && pixel[1] > 50 && pixel[0] < 100) {
        return false; // Colisão com a grama
    }
    return true; // Está no asfalto ou na linha branca
}

function desenharCarro(x, y, ang, cor) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    
    // Rodas pretas
    ctx.fillStyle = "#111111";
    ctx.fillRect(-10, -8, 5, 3);
    ctx.fillRect(5, -8, 5, 3);
    ctx.fillRect(-10, 5, 5, 3);
    ctx.fillRect(5, 5, 5, 3);

    // Carroceria
    ctx.fillStyle = cor;
    ctx.fillRect(-10, -5, 20, 10);

    // Para-brisa (Indica a frente do carro)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(4, -4, 3, 8);
    
    ctx.restore();
}

function gameLoop() {
    // 1. Renderiza o cenário suave primeiro (Grama, asfalto e linhas)
    desenharCenarioCompleto();

    // 2. Roda a física de colisão baseada nas cores renderizadas
    atualizarFisica();
    enviarMinhaPosicaoParaRede(meuCarro.x, meuCarro.y, meuCarro.angulo);

    // 3. Desenha os outros PCs conectados (Adversários em Vermelho)
    Object.keys(inimigos).forEach(id => {
        let i = inimigos[id];
        desenharCarro(i.x, i.y, i.angulo, "#ff2222");
    });

    // 4. Desenha o seu carro (Verde Neon)
    desenharCarro(meuCarro.x, meuCarro.y, meuCarro.angulo, "#00ff66");

    requestAnimationFrame(gameLoop);
}

function atualizarPosicaoInimigo(id, x, y, angulo) {
    inimigos[id] = { x, y, angulo };
}