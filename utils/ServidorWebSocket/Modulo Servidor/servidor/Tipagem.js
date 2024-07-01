import { ClienteConectado } from "./ServidorWS/ClienteWS/ClienteWS.js";
import * as TipagemComunicacao from "../comunicacao/Tipagem.js";

/**
 * @callback OnClienteConectado - Uma função a ser executada quando um novo cliente se conecta ao servidor
 * @param {ClienteConectado} cliente - Cliente que se conectou
 */

/**
 * @callback CallbackExecutarComando - Uma função a ser executada quando o comando for solicitado
 * @param {ClienteConectado} cliente - Cliente que solicitou o comando
 * @param {TipagemComunicacao.SolicitaComando} solicitacao - A solicitação de comando
 * @param {TipagemComunicacao.TransmissaoWebSocket} transmissao - Transmissão original recebida
 */

export const a = 1;
