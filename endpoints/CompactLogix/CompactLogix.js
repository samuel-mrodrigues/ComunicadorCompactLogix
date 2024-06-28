import { addGET } from "../../index.js";
import { Logger } from "../../utils/Logger.js";
import { getLogger as LoggerEndpoints } from "../endpoints.js";


/**
 * @type {Logger}
 */
let LoggerCompact;
/**
 * Realizar o cadastro da rota
 */
export async function cadastrar() {
    LoggerCompact = new Logger('CompactLogix', { isHabilitarLogConsole: true, isHabilitaSalvamento: true, loggerPai: LoggerEndpoints() });

    LoggerCompact.log(`Cadastrando endpoints do CompactLogix...`);
}

/**
 * Consultar a lista de CompactLogix existentes no sistema.
 */
function cadastraConsultarCompactLogix() {
    LoggerCompact.log(`Cadastrando rota para consultar os Compact Logix...`)


}