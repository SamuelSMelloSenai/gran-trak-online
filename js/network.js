// js/network.js
const peer = new Peer(); 
let conexoes = [];
let ehHost = false;
let meuIdPeer = "";

const menu = document.getElementById('menu');
const jogoContainer = document.getElementById('jogoContainer');
const idSalaGerado = document.getElementById('idSalaGerado');

peer.on('open', (id) => {
    meuIdPeer = id;
});

function iniciarJogoNaTela() {
    menu.classList.add('hidden');
    jogoContainer.classList.remove('hidden');
    startCanvasGame(); 
}

function criarSala() {
    ehHost = true;
    document.getElementById('statusArea').classList.remove('hidden');
    if (meuIdPeer) mostrarCodigo(meuIdPeer);
    
    peer.on('connection', (conn) => {
        conexoes.push(conn);
        configurarEventos(conn);
        iniciarJogoNaTela();
    });
}

function mostrarCodigo(id) {
    document.getElementById('codigoCompartilhar').classList.remove('hidden');
    idSalaGerado.innerText = id;
}

function conectarNaSala() {
    const idDoHost = document.getElementById('idSalaInput').value.trim();
    if (!idDoHost) return alert("Insira o código!");

    ehHost = false;
    const conn = peer.connect(idDoHost);
    conexoes.push(conn);
    configurarEventos(conn);
}

function configurarEventos(conn) {
    conn.on('open', () => {
        iniciarJogoNaTela();
    });

    conn.on('data', (data) => {
        if (data.tipo === 'movimento') {
            atualizarPosicaoInimigo(data.id, data.x, data.y, data.angulo);
            // Se for o Host, ele replica a posição para os outros jogadores (Broadcast)
            if (ehHost) {
                conexoes.forEach(c => {
                    if (c.peer !== data.id && c.open) c.send(data);
                });
            }
        }
    });
}

function enviarMinhaPosicaoParaRede(x, y, angulo) {
    const dados = { tipo: 'movimento', id: meuIdPeer, x, y, angulo };
    conexoes.forEach(conn => {
        if (conn.open) conn.send(dados);
    });
}