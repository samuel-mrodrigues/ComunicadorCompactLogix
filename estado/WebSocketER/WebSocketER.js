import { addGET } from "../../index.js";
import { Logger } from "../../utils/Logger.js";
import { ClienteConectado } from "../../utils/ServidorWebSocket/Modulo Servidor/servidor/ServidorWS/ClienteWS/ClienteWS.js";
import { WebSocketERServidor } from "../../utils/ServidorWebSocket/Modulo Servidor/servidor/WebSocketERServidor.js";
import { EmissorDeEvento } from "../../utils/ServidorWebSocket/Modulo Servidor/utils/EmissorDeEvento.js";
import { getLogger } from "../estado.js";;

/**
 * @type {Logger}
 */
let LoggerWS;

const servidorWS = new WebSocketERServidor({ isHeadless: true });
const EmissorWebSocketER = new EmissorDeEvento('WebSocketER')

/**
 * Realizar o inicio do servidor WebSocketER
 */
export function iniciar() {
    LoggerWS = new Logger('WebSocketER', { isHabilitarLogConsole: true, isHabilitaSalvamento: true, loggerPai: getLogger() });

    LoggerWS.log('Iniciando servidor WebSocketER');

    servidorWS.iniciarServidor();

    cadastrarGETWebSocket();
    cadastrarFuncoesServidor();
}

/**
 * Obter o servidor WebSocketER
 */
export function getServidor() {
    return servidorWS;
}

/**
 * @callback FuncaoClienteDesconectou
 * @param {ClienteConectado} cliente - Cliente que se desconectou
 */

/**
 * Adicionar um callback para executar quando um cliente se descoenctar
 * @param {FuncaoClienteDesconectou} callback - Sua função de callback que será chamada
 */
export function onClienteDesconectado(callback) {
    EmissorWebSocketER.addEvento('on-cliente-desconectou', callback);
}

/**
 * Cadastra as funções de comportamento do servidor WS
 */
function cadastrarFuncoesServidor() {
    servidorWS.onClienteConectado((cliente) => {
        LoggerWS.log(`Um novo cliente se conectou ao servidor via IP ${cliente.getIP()} com ID: ${cliente.getUUID()}`)

        cliente.onClienteDesconectado(() => {
            LoggerWS.log(`O cliente desconectou-se do servidor via IP ${cliente.getIP()}`)
            EmissorWebSocketER.disparaEvento('on-cliente-desconectou', cliente);
        })
    })
}


/**
 * Cadastrar a rota que pega a solicitação GET de uma requisição WebSocket e dar upgrade
 */
function cadastrarGETWebSocket() {
    LoggerWS.log('Cadastrando rota GET para WebSocketER');

    addGET('/websocketer', (requisicao) => {
        servidorWS.getGerenciadorWebSocket().adicionarClienteHTTPGet(requisicao.parametros.requisicaoOriginal.requisicao, requisicao.parametros.requisicaoOriginal.requisicao.socket);
    })
}
