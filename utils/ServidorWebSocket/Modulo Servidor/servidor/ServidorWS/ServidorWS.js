import { WebSocketServer } from "ws"
import { ClienteConectado } from "./ClienteWS/ClienteWS.js";
import { EmissorDeEvento } from "../../utils/EmissorDeEvento.js";

import { WebSocketERServidor } from "../WebSocketERServidor.js";

import * as TipagemServidorWS from "./Tipagem.js";
import { IncomingMessage } from "http"
import { Socket } from "net";

export class ServidorWS {

    /**
     * Instancia do WebSocketER que gerencia esse servidor
     * @type {WebSocketERServidor}
     */
    #websocketERInstancia

    /**
     * Instancia do servidor WebSocket que recebe as conexões
     * @type {WebSocketServer}
     */
    #servidorWebsocket;

    /**
     * Clientes que possuem conexão no WebSocket
     * @type {ClienteConectado[]}
     */
    #clientes = []

    /**
     * Estado atual do servidor
     */
    #estado = {
        /**
         * Se o WebSocket está aberto.
         */
        isConectado: false
    }

    /**
     * Configurações do servidor
     */
    #configuracoes = {
        /**
         * Porta para abrir o servidor
         */
        porta: 5005,
        /**
         * Servidor não é pra abrir a porta.
         */
        isHeadless: false,
    }

    /**
     * Instanciar um novo servidor WebSocket
     * @param {WebSocketERServidor} instanciaWebSocketER - Instancai WebSocket de comandos que este servidor pertence
     * @param {Object} propriedades - Propriedades da conexão
     * @param {Number} propriedades.porta - Porta para abrir o servidor
     * @param {Boolean} propriedades.isHeadless - Abrir o servidor sem utilizar a porta, apenas manter a conexão aberta
     */
    constructor(instanciaWebSocketER, propriedades) {
        this.#websocketERInstancia = instanciaWebSocketER;
        if (propriedades != undefined) {
            if (propriedades.porta != undefined && !isNaN(propriedades.porta)) {
                this.#configuracoes.porta = propriedades.porta;
            }

            if (propriedades.isHeadless != undefined) {
                this.#configuracoes.isHeadless = propriedades.isHeadless;
            }
        }
    }

    /**
     * Abrir o servidor WebSocket para escutar por clientes
     * @returns {Promise<TipagemServidorWS.PromiseAbrirWebSocket>}
     */
    async abrirWebSocket() {
        /**
         * @type {TipagemServidorWS.PromiseAbrirWebSocket}
         */
        const estadoAbrir = {
            sucesso: false,
            porta: -1
        }

        if (!this.#configuracoes.isHeadless) {
            this.#servidorWebsocket = new WebSocketServer({ port: this.#configuracoes.porta });
        } else {
            this.#servidorWebsocket = new WebSocketServer({ noServer: true });
        }

        // Toda vez que um novo cliente se conectar
        this.#servidorWebsocket.on('connection', (socket, requisicao) => {

            // Headers recebidos na conexão
            const headersRecebidos = []
            for (const headerNome in requisicao.headers) {
                const headerValor = requisicao.headers[headerNome];

                headersRecebidos.push({
                    headerNome: headerNome,
                    headerValor: headerValor
                })
            }

            // Endereço IP do cliente
            const enderecoIP = requisicao.socket.remoteAddress;

            // Instanciar um cliente
            const novoCliente = new ClienteConectado(this, socket, {
                enderecoIp: enderecoIP,
                headers: headersRecebidos
            });
            this.#clientes.push(novoCliente);

            // Disparar que houve um novo cliente conectado pra meros usuarios mortais poderem fazer oq quiser
            this.#websocketERInstancia.getEmissorEventos().disparaEvento('cliente-conectado', novoCliente);
        })

        if (this.#configuracoes.isHeadless) {
            estadoAbrir.sucesso = true;
            return estadoAbrir;
        } else {
            return new Promise((resolve) => {

                this.#servidorWebsocket.on('close', () => {
                    this.#estado.isConectado = false;
                    resolve(estadoAbrir);
                })

                this.#servidorWebsocket.on('error', (erro) => {
                })

                this.#servidorWebsocket.on('listening', () => {
                    this.#estado.isConectado = true;

                    estadoAbrir.sucesso = true;
                    estadoAbrir.porta = this.#configuracoes.porta;
                    resolve(estadoAbrir);
                });
            })
        }
    }

    /**
     * Retorna a instancia do conexão do servidor WebSocket
     */
    geConexaoServidor() {
        return this.#servidorWebsocket;
    }

    /**
     * Adicionar um novo cliente a lista de clientes conectados utilizando o objeto IncomingMessage 
     * @param {IncomingMessage} incomingMessage - Objeto de requisição do servidor HTTP
     * @param {Socket} socket - Instancia do socket
     * @param {String} headers - Cabeçalhos da requisição
     */
    adicionarClienteHTTPGet(incomingMessage, socket, headers = '') {
        this.#servidorWebsocket.handleUpgrade(incomingMessage, socket, headers, (cliente) => {
            this.#servidorWebsocket.emit('connection', cliente, incomingMessage);
        })
    }

    /**
     * Retorna os comandos cadastrados
     */
    getComandosCadastrados() {
        return this.#websocketERInstancia.getComandos();
    }

    /**
     * Retorna todos os clientes conectados
     */
    getClientes() {
        return this.#clientes;
    }
}