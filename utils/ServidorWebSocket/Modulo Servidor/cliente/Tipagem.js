import * as TipagensCliente from "../comunicacao/Tipagem.js";

/**
 * @typedef PromiseConectarWebSocketER
 * @property {Boolean} sucesso - Se a conexão com o servidor WebSocket está estabelecida
 * @property {Number} porta - Se estabelecida a conexão, contém a porta sendo utilizada na conexão.
 */

/**
 * @callback CallbackExecutarComando - Uma função a ser executada quando o comando for solicitado
 * @param {TipagensCliente.SolicitaComando} solicitacao - A solicitação de comando
 * @param {TipagensCliente.TransmissaoWebSocket} transmissao - Transmissão original recebida
 */

export const a = 1;