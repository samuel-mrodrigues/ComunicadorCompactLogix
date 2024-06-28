import { Logger } from "../utils/Logger.js";
import { getLogger as LoggerIndex } from "../index.js";

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
}

export function getLogger() {
    return LoggerEstado;
}