import express from "express";
import { RequisicaoExpress } from "./utils/RequisicaoExpress.js"
import { Logger } from "./utils/Logger.js";

import { cadastrarEndpoints } from "./endpoints/endpoints.js";
import { iniciar as iniciarEstado } from "./estado/estado.js";

const LoggerIndex = new Logger('Inicio', {
    isHabilitarLogConsole: true,
    isHabilitaSalvamento: true,
    caminhoRelativoSalvamento: './Logs de Atividade'
})

/**
 * Retorna o Logger do Index
 */
export function getLogger() {
    return LoggerIndex;
}

// Instancia Express
const instanciaExpress = express();

/**
 * Fazer todo o inicio do backend
 */
async function iniciarBackend() {
    LoggerIndex.log(`Iniciando o backend...`);

    instanciaExpress.use(tratarOPTIONS);
    instanciaExpress.use(tratarCorpoRequisicao);

    iniciarEstado();
    cadastrarEndpoints();

    instanciaExpress.use(tratarEndpointInvalido);

    instanciaExpress.listen(3009, () => {
        LoggerIndex.log(`Backend iniciado na porta 3009`);
    })
}

/**
 * Se for solicitado algum endpoint que não existe
 */
function tratarEndpointInvalido(req, resp, next) {
    const novaResposta = new RequisicaoExpress(req, resp);

    novaResposta.recusar("endpoint-invalido", `O endpoint solicitado ${novaResposta.parametros.requisicaoOriginal.requisicao.method} -> (${req.url}) não existe.`).devolverResposta();
}

/**
 * Tratar o recebimento de solicitações OPTIONS
 */
function tratarOPTIONS(req, res, next) {

    // Seto os headers para permitir as requisições de qualquer origem
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Expose-Headers', 'Authorization');
    // res.setHeader('Access-Control-Allow-Credentials', true);

    // Se for uma request do tipo OPTIONS, envio os headers e finalizado a verificação
    if (req.method == "OPTIONS") {
        res.sendStatus("200")
        return;
    } else {
        next();
    }
}

/**
 * Dar parse no body da requisição e adicionar um BODY com o objeto JSON recebido
 */
function tratarCorpoRequisicao(req, resp, next) {

    req.BODY = {}
    let conteudoCorpo = req.headers["content-length"];
    // Verifica se a requisição tem algum payload para carregar
    if (conteudoCorpo != undefined && conteudoCorpo != 0) {

        // Guardar as strings recebidas no POST
        let dataRecebida = '';

        // Recebe todo o conteudo do payload do POST e inclui na dataRecebida
        req.on("data", (data) => {
            dataRecebida += data;
        })

        // Quando todo o payload tiver sido enviado, tentar dar parse pra validar se pode continuar ou não
        req.on("end", () => {
            try {
                req.BODY = JSON.parse(dataRecebida);
                // Se não der erros, a requisição terá os dados do POST e as rotas terão acesso ao conteudo enviado pelo usuario

                next();
            } catch (ex) {
                // Se der erros, notificar o usuario que o payload dele é inválido
                LoggerIndex.log(`Não foi possível converter o payload do POST em JSON da requisição recebida. Motivo: ${ex.message}. Mensagem recebida: ${dataRecebida}`)

                resp.statusCode = '500';
                resp.send("A sua solicitação POST enviou um corpo que não pode ser convertido para JSON. Sua solicitação será recusada.");
                resp.end();
                return;
            }
        })
    } else {
        // Caso não tenha, apenas ignorar e seguir para os proximos endpoints
        next()
    }
}

iniciarBackend();

/**
 * Retorna a instancia do express
 */
export function getInstanciaExpress() {
    return instanciaExpress;
}

/**
 * @callback CallbackOnRequisicaoRecebida
 * @param {RequisicaoExpress} requisicao - Dados da requisição recebida
 */

/**
 * Adiciona um endpoint do tipo POST
 * @param {String} endpoint - O endpoint desejado para cadastra o POST
 * @param {CallbackOnRequisicaoRecebida} callback - Função a ser chamada quando a requisição for recebida
 */
export function addPOST(endpoint, callback) {
    LoggerIndex.log(`Adicionando endpoint POST ${endpoint}`);
    instanciaExpress.post(endpoint, async (req, resp) => {
        const novaRequisicao = new RequisicaoExpress(req, resp);
        try {
            await callback(novaRequisicao);
        } catch (ex) {
            LoggerIndex.log(`Erro ao processar requisição POST ${novaRequisicao.uuid} em ${endpoint}. Motivo: ${ex.message}`);
            novaRequisicao.recusar(`Erro interno ao processar a requisição. Stacktrace: ${ex.message}`).devolverResposta();
        }
    })
}

/**
 * Adiciona um endpoint do tipo GET
 * @param {String} endpoint - O endpoint desejado para cadastra o GET
 * @param {CallbackOnRequisicaoRecebida} callback - Função a ser chamada quando a requisição for recebida
 */
export function addGET(endpoint, callback) {
    LoggerIndex.log(`Adicionando endpoint GET ${endpoint}`);
    instanciaExpress.get(endpoint, async (req, resp) => {
        const novaRequisicao = new RequisicaoExpress(req, resp);
        try {
            await callback(novaRequisicao);
        } catch (ex) {
            LoggerIndex.log(`Erro ao processar requisição GET ${novaRequisicao.uuid} em ${endpoint}. Motivo: ${ex.message}`);
            novaRequisicao.recusar(`Erro interno ao processar a requisição. Stacktrace: ${ex.message}`).devolverResposta();
        }
    })
}

