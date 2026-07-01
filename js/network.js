// js/network.js

const peer = new Peer(); 
let conexoes = [];
let ehHost = false;
let meuIdPeer = "";

// Elementos da Interface
const menu = document.getElementById('menu');
const jogoContainer = document.getElementById('jogoContainer');
const statusArea = document.getElementById('statusArea');
const statusTexto = document.getElementById('statusTexto');
const codigoCompartilhar = document.getElementById('codigoCompartilhar');
const idSalaGerado = document.getElementById('idSalaGerado');

peer.on('open', (id) => {
    meuIdPeer = id;
    console.log('Seu ID PeerJS é: ' + id);
});

function iniciarJogoNaTela() {
    menu.classList.add('hidden');
    jogoContainer.classList.remove('hidden');
    startCanvasGame(); // Função que está no game.js
}

// Ação do Host
function criarSala() {
    ehHost = true;
    statusArea.classList.remove('hidden');
    statusTexto.innerText = "Criando sala segura...";

    if (meuIdPeer) {
        mostrarCodigoSala(meuIdPeer);
    } else {
        peer.on('open', (id) => { mostrarCodigoSala(id); });
    }

    // Host fica escutando a conexão dos outros 2 players
    peer.on('connection', (conn) => {
        conexoes.push(conn);
        configurarEventosConexao(conn);
        
        // Quando o primeiro jogador entra, já pode abrir a tela de jogo para o Host
        if (conexoes.length === 1) {
            iniciarJogoNaTela();
        }
    });
}

function mostrarCodigoSala(id) {
    statusTexto.innerText = "Sala Pronta!";
    codigoCompartilhar.classList.remove('hidden');
    idSalaGerado.innerText = id;
}

// Ação dos Clientes
function conectarNaSala() {
    const idDoHost = document.getElementById('idSalaInput').value.trim();
    if (!idDoHost) {
        alert("Por favor, insira o código da sala!");
        return;
    }

    ehHost = false;
    statusArea.classList.remove('hidden');
    statusTexto.innerText = "Conectando ao Host...";

    const conn = peer.connect(idDoHost);
    conexoes.push(conn);
    configurarEventosConexao(conn);
}

function configurarEventosConexao(conn) {
    conn.on('open', () => {
        console.log("Conectado com sucesso a: " + conn.peer);
        iniciarJogoNaTela();
    });

    conn.on('data', (data) => {
        // Recebe dados de posição vindos da rede
        if (data.tipo === 'movimento') {
            atualizarPosicaoInimigo(data.id, data.x, data.y, data.angulo);
        }
    });

    conn.on('close', () => {
        console.log("Um jogador desconectou.");
    });
}

// Envia dados de posição para todos os conectados
function enviarMinhaPosicaoParaRede(x, y, angulo) {
    conexoes.forEach(conn => {
        if (conn.open) {
            conn.send({
                tipo: 'movimento',
                id: meuIdPeer,
                x: x,
                y: y,
                angulo: angulo
            });
        }
    });
}