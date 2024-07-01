import { ClienteWS } from "../../../comunicacao/Cliente.js";
import * as TipagemComunicacaoCliente from "../../../comunicacao/Tipagem.js";
import { ServidorWS } from "../ServidorWS.js"
import { WebSocket } from "ws"


/**
 * Uma conexão do servidor com o cliente para comunicação
 */
export class ClienteConectado extends ClienteWS {

    /**
     * Instancia do servidor WebSocket que esse cliente está conectado
     * @type {ServidorWS}
     */
    #instanciaServidor;

    /**
     * Socket de comunicação com o cliente
     * @type {WebSocket}
     */
    #socket;

    /**
     * Headers que foram recebidos na solicitação WebSocket
     * @type {{headerNome: String, headerValor: String}[]}
     */
    #headersRecebidos = []

    /**
     * Endereço IP do cliente conectado
     */
    #enderecoIp = ''

    /**
     * Instanciar um novo cliente WebSocket para o servidor
     * @param {ServidorWS} instanciaServidor - Instancia do servidor ao qual esse cliente pertence 
     * @param {WebSocket} websocketSocket - Socket de comunicação com o cliente
     * @param {Object} parametros - Parametros recebidos na conexão do cliente
     * @param {String} parametros.enderecoIp - Endereço IP do cliente conectado
     * @param {{headerNome: String, headerValor: String}[]} parametros.headers - Headers recebidos na solicitação WebSocket
     */
    constructor(instanciaServidor, websocketSocket, parametros) {
        super();

        this.#instanciaServidor = instanciaServidor;
        this.#socket = websocketSocket;

        this.#headersRecebidos = parametros.headers;
        this.#enderecoIp = parametros.enderecoIp;

        // Quando o servidor quiser enviar uma mensagem para o cliente
        this.getEmissorEventos().addEvento('enviar-mensagem', (webSocketMensagem) => {
            this.#processaClienteEnviaMensagem(webSocketMensagem);
        })

        // Quando o cliente devolver uma resposta ao servidor pra esse cara
        this.#socket.on('message', (bufferMensagem) => {
            this.processaMensagemWebSocket(bufferMensagem);
        })

        // Notificar quando for desconectado
        this.#socket.on('close', (codigo, razao) => {
            this.getEmissorEventos().disparaEvento('desconectado', codigo, razao);
        })

        this.getComandos = () => {
            return this.#instanciaServidor.getComandosCadastrados();
        }

        this.executorDeComando = async (solicitacao, transmissao) => {
            return await this.#processarExecucaoComando(solicitacao, transmissao);
        }
    }

    /**
     * Descontar essa conexão do cliente
     */
    desconectar() {
        this.#socket.close('66666', 'Desconectado pelo servidor');
    }

    /**
     * Retorna os headers que foram enviados na requisição inicial do WebSocket
     */
    getHeaders() {
        return this.#headersRecebidos;
    }

    /**
     * Retorna o endereço IP do cliente conectado
     */
    getIP() {
        return this.#enderecoIp;
    }

    /**
     * Realiza a ação de enviar mensagem ao cliente conectado no servidor
     * @param {TipagemComunicacaoCliente.WebSocketMensagem} webSocketMensagem
     */
    #processaClienteEnviaMensagem(webSocketMensagem) {
        this.#socket.send(JSON.stringify(webSocketMensagem));
    }

    /**
     * Processar uma execução de um comando
     * @param {TipagemComunicacaoCliente.SolicitaComando} solicitacao
     * @param {TipagemComunicacaoCliente.TransmissaoWebSocket} transmissao
     */
    async #processarExecucaoComando(solicitacao, transmissao) {
        const comandoSolicitado = this.#instanciaServidor.getComandosCadastrados().find(comando => comando.comando === solicitacao.comando);

        if (comandoSolicitado != undefined) {
            return await comandoSolicitado.callback(this, solicitacao, transmissao);
        } else {
            return;
        }
    }
}
