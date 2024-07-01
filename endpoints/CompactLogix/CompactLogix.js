import { addGET } from "../../index.js";
import { Logger } from "../../utils/Logger.js";
import { getLogger as LoggerEndpoints } from "../endpoints.js";
import {cadastrar as cadastrarRotasHTTP} from "./HTTP/HTTP.js";

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
    cadastrarRotasHTTP();
}
