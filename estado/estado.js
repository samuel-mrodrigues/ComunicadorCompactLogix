import { Logger } from "../utils/Logger.js";
import { getLogger as LoggerIndex } from "../index.js";
import { iniciar as iniciarEstadoCompactLogix } from "./CompactLogix/CompactLogix.js";
import {iniciar as iniciarEstadoServidorWS} from "./WebSocketER/WebSocketER.js";

/**
 * @type {Logger}
 */
let LoggerEstado;

/**
 * Iniciar o estado
 */
export async function iniciar() {
    LoggerEstado = new Logger('Estado', { isHabilitarLogConsole: true, isHabilitaSalvamento: true, loggerPai: LoggerIndex() });
    LoggerEstado.log(`Inicializando o estado...`)
    
    iniciarEstadoCompactLogix();
    iniciarEstadoServidorWS();
}

export function getLogger() {
    return LoggerEstado;
}