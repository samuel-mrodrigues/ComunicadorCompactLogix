import express from 'express';
import { v4 as uuidv4 } from "uuid"

/**
 * Uma implementação de uma requisição Express pra os endpoints interagirem
 */
export class RequisicaoExpress {

    /**
     * UUID unico da requisição
     */
    uuid = uuidv4();

    /**
     * Parametros da requisição
     */
    parametros = {
        /**
         * Informações da requisição original vinda do Express
         */
        requisicaoOriginal: {

            /**
             * @type {express.Request}
            */
            requisicao: null,
            /**
             * @type {express.Response}
            */
            resposta: null
        }
    }

    /**
     * Informações que serão montadas e enviadas ao requisitante
     */
    respostaAtual = {
        /**
         * Se aprovado ou recusado foram chamados
         */
        isConfigurada: false,
        isSucesso: false,
        sucesso: {
            descricao: '',
            codigo: '',
            dados: ''
        },
        erro: {
            descricao: '',
            codigo: '',
            dados: ''
        }
    }

    /**
     * Retorna o template de resposta a ser enviado ao usuario
     */
    getTemplateResposta() {
        return {
            /**
             * Se a requisicao foi bem sucedida
             */
            isSucesso: false,
            /**
             * Se isSucesso, pode conter dados opcionais a serem adicionados
             */
            sucesso: {
                /**
                 * Mensagem de sucesso a ser enviada ao usuario (opcional)
                 */
                descricao: '',
                /**
                 * Código de sucesso (opcional) para ser enviado ao usuario para facilitar a identificação do sucesso
                 */
                codigo: '',
                /**
                 * Dados a serem enviados ao usuario (opcional)
                 */
                dados: ''
            },
            /**
             * Se isSucesso for false, contém detalhes do erro
             */
            erro: {
                /**
                 * Mensagem descritiva do erro
                 */
                descricao: '',
                /**
                 * Um código de erro (opcional) para ser enviado ao usuario para facilitar a identificação do erro
                 */
                codigo: '',
                /**
                 * Dados a serem enviados ao usuario (opcional) com algum detalhe mais profundo do erro
                 */
                dados: ''
            }
        }
    }

    /**
     * Instanciar uma nova requisição express
     * @param {express.Request} requisicao - A requisição express original
     * @param {express.Response} resposta - A resposta express original
     */
    constructor(requisicao, resposta) {
        this.parametros.requisicaoOriginal.requisicao = requisicao;
        this.parametros.requisicaoOriginal.resposta = resposta;
    }

    /**
     * Aprovar a requisição
     * @param {String} codigoSucesso - O código de sucesso a ser enviado ao usuario (opcional)
     * @param {String} mensagemSucesso - A mensagem de sucesso a ser enviada ao usuario (opcional)
     * @param {*} dados - Dados a serem enviados ao usuario (opcional)
     */
    aprovar(codigoSucesso, mensagemSucesso, dados) {

        this.respostaAtual.isSucesso = true;
        this.respostaAtual.isConfigurada = true;

        if (codigoSucesso != undefined) {
            this.respostaAtual.sucesso.codigo = codigoSucesso;
        }

        if (mensagemSucesso != undefined) {
            this.respostaAtual.sucesso.descricao = mensagemSucesso;
        }

        if (dados != undefined) {
            this.respostaAtual.sucesso.dados = dados;
        }

        return this;
    }

    /**
     * Recusar a requisição
     * @param {String}  codigoErro - O código de erro a ser enviado ao usuario (opcional)
     * @param {String} mensagemErro - A mensagem de erro a ser enviada ao usuario
     * @param {*} dados - Dados a serem enviados ao usuario (opcional)
     */
    recusar(codigoErro, mensagemErro, dados) {
        this.respostaAtual.isSucesso = false;
        this.respostaAtual.isConfigurada = true;

        if (codigoErro != undefined) {
            this.respostaAtual.erro.codigo = codigoErro;
        }

        if (mensagemErro != undefined) {
            this.respostaAtual.erro.descricao = mensagemErro;
        }

        if (dados != undefined) {
            this.respostaAtual.erro.dados = dados;
        }

        return this;
    }

    /**
     * Enviar a resposta configurada ao usuario
     */
    devolverResposta() {
        if (!this.respostaAtual.isConfigurada) {
            throw new Error(`A requisição ${this.uuid} não foi nem aprovada nem recusada. Não é possível enviar uma resposta.`);
        }

        let respostaRetorno = this.getTemplateResposta();

        if (this.respostaAtual.isSucesso) {
            respostaRetorno = {
                isSucesso: true,
                sucesso: {
                    descricao: this.respostaAtual.sucesso.descricao,
                    codigo: this.respostaAtual.sucesso.codigo,
                    dados: this.respostaAtual.sucesso.dados
                }
            }
        } else {
            respostaRetorno = {
                isSucesso: false,
                erro: {
                    descricao: this.respostaAtual.erro.descricao,
                    codigo: this.respostaAtual.erro.codigo,
                    dados: this.respostaAtual.erro.dados
                }
            }
        }

        this.parametros.requisicaoOriginal.resposta.statusCode = 200;
        this.parametros.requisicaoOriginal.resposta.setHeader('Content-Type', 'application/json');
        this.parametros.requisicaoOriginal.resposta.send(JSON.stringify(respostaRetorno));
        this.parametros.requisicaoOriginal.resposta.end();
    }

    /**
     * Retorna os headers existentes na requisição recebida
     */
    getHeaders() {
        /**
         * @typedef Header
         * @property {String} nome - Nome do header
         * @property {String} valor - Valor do header
         */

        /**
         * @type {Header[]}
         */
        const headers = []

        for (const chaveHeader in this.parametros.requisicaoOriginal.requisicao.headers) {
            headers.push({
                nome: chaveHeader,
                valor: this.parametros.requisicaoOriginal.requisicao.headers[chaveHeader]
            })
        }

        return headers;
    }

    /**
     * Retorna o token de autenticação presente no header da requisição. Se não tiver ele retorna undefined
     */
    getBearerToken() {
        const header = this.getHeaders().find(headerObj => headerObj.nome == 'authorization')

        if (header == undefined) {
            return undefined;
        }

        return header.valor.replace('Bearer ', '');
    }

    /**
     * Retorna o payload em JSON do body(se houver, se não ele irá retornar undefined)
     */
    getBody() {
        return this.parametros.requisicaoOriginal.requisicao.BODY;
    }

    /**
     * Retorna as variaveis enviadas na URL da requisição após o ? (query). Ex: &usuario=1&senha=123
     */
    getQuery() {
        return this.parametros.requisicaoOriginal.requisicao.query;
    }

    /**
     * Retorna as as variaveis que compoem o URL da requisição de forma dinamica. Ex: /usuarios/:id/status
     */
    getParametrosURL() {
        return this.parametros.requisicaoOriginal.requisicao.params;
    }
}