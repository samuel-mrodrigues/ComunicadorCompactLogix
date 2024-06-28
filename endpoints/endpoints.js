import { Logger } from "../utils/Logger.js";
import { getLogger as LoggerIndex } from "../index.js"
import { cadastrar as cadastrarEndpointsCompactLogix } from "./CompactLogix/CompactLogix.js"

/**
 * @type {Logger}
 */
let LoggerEndpoints

export async function cadastrarEndpoints() {
    LoggerEndpoints = new Logger('Endpoints', { isHabilitarLogConsole: true, isHabilitaSalvamento: true, loggerPai: LoggerIndex() });

    LoggerEndpoints.log(`Realizando o cadastro de endpoints...`)
    cadastrarEndpointsCompactLogix();
}

/**
 * Retorna o Logger dos Endpoints
 */
export function getLogger() {
    return LoggerEndpoints;
}