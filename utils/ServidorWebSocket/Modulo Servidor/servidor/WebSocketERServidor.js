import { EmissorDeEvento } from "../utils/EmissorDeEvento.js";
import { ServidorWS } from "./ServidorWS/ServidorWS.js"
import * as TIpagensWebSocketER from "./Tipagem.js";
import * as TipagensCliente from "../comunicacao/Tipagem.js";


export class WebSocketERServidor {

    /**
     * @type {ServidorWS}
     */
    #servidorGerenciaConexoes;

    /**
     * Comandos cadastrados no servidor
     * @type {TipagensCliente.Comando[]}
     */
    #comandos = []

    #emissorEvento = new EmissorDeEvento('WebSocketERServidor');

    /**
     * Instanciar um novo servidor
     * @param {Object} propriedades - Propriedades da conexão.
     * @param {Number} propriedades.porta - Porta para iniciar o servidor
     * @param {Boolean} propriedades.isHeadless - Se o servidor deve ser aberto em uma porta ou ficar esperando conexões de outra forma.
     */
    constructor(propriedades) {
        this.#servidorGerenciaConexoes = new ServidorWS(this, {
            porta: propriedades != undefined && propriedades.porta != undefined ? propriedades.porta : 5005,
            isHeadless: propriedades.isHeadless != undefined ? propriedades.isHeadless != undefined : false
        });
    }

    /**
     * Iniciar o servidor WebSocket
     */
    iniciarServidor() {
        return this.#servidorGerenciaConexoes.abrirWebSocket();
    }

    /**
     * Retorna todos os clientes conectados
     */
    getClientesConectados() {
        return this.#servidorGerenciaConexoes.getClientes();
    }

    /**
     * Retorna o gerencaidor do servidor websocket
     */
    getGerenciadorWebSocket() {
        return this.#servidorGerenciaConexoes;
    }

    /**
     * Adicionar um novo comando ao servidor
     * @param {String} comando - Nome do comando
     * @param {TIpagensWebSocketER.CallbackExecutarComando} callback - Função a ser executada quando o comando for solicitado
     */
    adicionarComando(comando, callback) {
        /**
         * @type {TIpagensWebSocketER.Comando}
         */
        const novoComando = {
            comando: comando,
            callback: callback
        }

        this.#comandos.push(novoComando);
    }

    /**
     * Escutar quando um novo cliente se conecta ao servidor
     * @param {TIpagensWebSocketER.OnClienteConectado} callback - Função a ser executada quando um novo cliente se conecta
     */
    onClienteConectado(callback) {
        this.#emissorEvento.addEvento('cliente-conectado', callback);
    }

    /**
     * Retorna o emissor de eventos do servidor
     */
    getEmissorEventos() {
        return this.#emissorEvento;
    }

    /**
     * Retorna a lista de comandos cadastrados
     */
    getComandos() {
        return this.#comandos;
    }
}