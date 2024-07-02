import { validate as validaUUID, v4 as uuidv4 } from "uuid"
import fs from "fs"

import * as TipagemClienteWS from "./Tipagem.js";

import { EmissorDeEvento } from "../utils/EmissorDeEvento.js";
import { copiarParaObjeto } from "../utils/utils.js";

export class ClienteWS {
    #emissorEventos = new EmissorDeEvento('Cliente');

    /**
     * Mensagens incompletas que estão sendo recebidas 
     * @type {TipagemClienteWS.WebSocketMensagemPendente[]}
     */
    #mensagensPendentes = []

    idConexaoUnico = this.#getUUIDUnico();

    /**
     * Instanciar um novo cliente
     */
    constructor() {
    }

    /**
     * Retorna um UUID único
     */
    #getUUIDUnico() {
        const novoId = uuidv4();

        return novoId;
    }
    /**
     * Escutar pelo evento quando o cliente for desconectado
     * @param {TipagemClienteWS.CallbackOnClienteDesconectado} callback - Função a ser executada quando o cliente desconectar
     */
    onClienteDesconectado(callback) {
        this.getEmissorEventos().addEvento('desconectado', callback, {excluirAposExecutar: false});
    }

    /**
     * Retorna uma transmissão vazia
     * @param {'responde_comando' | 'solicita_comando' | 'transmissao_invalida'} tipo - Filtrar os campos do objeto retornado
     */
    #getTemplateDeTransmissao(tipo) {
        /**
          * @type {TipagemClienteWS.TransmissaoWebSocket}
          */
        let transmissao = {
            id: '',
            tipo: '',
            responde_comando: {
                solicitacao: {
                    comando: {
                        comando: '',
                        payload: ''
                    },
                    idTransmissaoComando: 0
                },
                resposta: {
                    sucesso: false,
                    payload: '',
                    erro: {
                        isComandoNaoExiste: false,
                        isErroExecucaoComando: false,
                        erroExecucaoComando: {
                            descricao: ''
                        }
                    }
                }
            },
            solicita_comando: {
                comando: '',
                payload: ''
            },
            transmissao_invalida: {
                erro: {
                    isJSONInvalido: false,
                    isIdInvalido: false,
                    isTipoInvalido: false,
                    isErroFaltandoTipoCorpo: false
                },
                mensagem: ''
            },
            keepalive_comando: {
                idTransmissaoComando: ''
            }
        }

        if (tipo != undefined) {
            switch (tipo) {
                case 'responde_comando': {
                    transmissao.solicita_comando = undefined;
                    transmissao.transmissao_invalida = undefined;
                    transmissao.transmissao_recebida = undefined;
                    break;
                }
                case 'solicita_comando': {
                    transmissao.responde_comando = undefined;
                    transmissao.transmissao_invalida = undefined;
                    transmissao.transmissao_recebida = undefined;
                    break;
                }
                case 'transmissao_invalida': {
                    transmissao.responde_comando = undefined;
                    transmissao.solicita_comando = undefined;
                    transmissao.transmissao_recebida = undefined;
                    break;
                }
            }
        }

        return transmissao;
    }

    /**
     * Retorna um objeto template usado para enviar informações 
     * @param {Boolean} isPreencherDadosTemplates - Se deve arrays com os itens esperado do array
     */
    #getTemplateDeMensagemWebsocket(isPreencherDadosTemplates) {
        /**
         * @type {TipagemClienteWS.WebSocketMensagem}
         */
        let mensagemWebSocket = {
            id: '',
            isSegmentada: false,
            isUnica: false,
            unica: {
                textoBase64: ''
            },
            segmentada: {
                isInicio: false,
                isConfirmacaoInicioSegmento: false,
                confirmacaoInicioSegmento: {
                    id: ''
                },
                isEmProgresso: false,
                confirmaRecebimentoProgresso: {
                    numeroSequencia: 0
                },
                inicio: {
                    totalDeSegmentos: 0,
                    segmentos: [],
                    totalBytes: 0
                },
                progresso: {
                    segmentacao: {
                        totalBytes: 0,
                        numeroSequencia: 0
                    },
                    textoBase64: ''
                }
            }
        }

        if (isPreencherDadosTemplates) {
            mensagemWebSocket.segmentada.inicio.segmentos = [{
                numeroSequencia: 0,
                totalBytes: 0
            }]
        }

        return mensagemWebSocket;
    }

    /**
     * Enviar uma nova mensagem
     * @param {TipagemClienteWS.WebSocketMensagem} mensagemWebsocket 
     */
    #enviarMensagem(mensagemWebsocket) {
        this.#emissorEventos.disparaEvento('enviar-mensagem', mensagemWebsocket);
    }

    /**
     * Processar uma mensagem pura recebida 
     * @param {Buffer} rawdata 
     */
    processaMensagemWebSocket(rawdata) {

        /**
         * @type {TipagemClienteWS.WebSocketMensagem}
         */
        let mensagemWebSocket = this.#getTemplateDeMensagemWebsocket(true);

        try {
            const jsonMensagem = JSON.parse(rawdata.toString())

            copiarParaObjeto(mensagemWebSocket, jsonMensagem);
        } catch (ex) {
            return;
        }

        // A mensagem não foi segmentada.
        if (mensagemWebSocket.isUnica) {
            const objetoTransmissao = this.#getTemplateDeTransmissao();

            const bufferPayloadTransmissao = Buffer.from(mensagemWebSocket.unica.textoBase64, 'base64');
            let jsonTransmissao = {};
            try {
                jsonTransmissao = JSON.parse(bufferPayloadTransmissao.toString('utf-8'));
            } catch (ex) {
                return;
            }

            copiarParaObjeto(objetoTransmissao, jsonTransmissao)

            this.#processaTransmissao(objetoTransmissao);
        } else {
            // Se for segmentada, juntar todos os segmentos

            // Colocar a mensagem na lista de mensagens pendentes

            // Se for o inicio da mensagem, contem os dados basicos inicias pra eu saber quantos segmentos eu vou receber
            if (mensagemWebSocket.segmentada.isInicio) {
                this.#mensagensPendentes.push({
                    id: mensagemWebSocket.id,
                    numeroSegmentosPendentes: mensagemWebSocket.segmentada.inicio.totalDeSegmentos,
                    segmentosEsperados: mensagemWebSocket.segmentada.inicio.segmentos.map(segmento => {
                        return {
                            numeroSequencia: segmento.numeroSequencia,
                            totalBytes: segmento.totalBytes
                        }
                    }),
                    totalEmBytes: mensagemWebSocket.segmentada.inicio.totalBytes,
                    segmentosRecebidos: []
                })

                // Devolver a confirmação de inicio de segmento
                /**
                 * @type {TipagemClienteWS.WebSocketMensagem}
                 */
                const mensagemConfirmaRecebimento = {
                    id: mensagemWebSocket.id,
                    isSegmentada: true,
                    segmentada: {
                        isConfirmacaoInicioSegmento: true,
                        confirmacaoInicioSegmento: {
                            id: mensagemWebSocket.id
                        }
                    }
                }

                this.#enviarMensagem(mensagemConfirmaRecebimento);

            } else if (mensagemWebSocket.segmentada.isConfirmacaoInicioSegmento) {
                // Recebi a confirmação de inicio de segmento
                this.#emissorEventos.disparaEvento(`mensagem-websocket-iniciada-${mensagemWebSocket.segmentada.confirmacaoInicioSegmento.id}`);
            } else if (mensagemWebSocket.segmentada.isEmProgresso) {
                // Recebi um segmento de uma mensagem pendente

                const mensagemPendente = this.#mensagensPendentes.find(mensagem => mensagem.id == mensagemWebSocket.id);
                if (mensagemPendente == undefined) {
                    // Não existe a mensagem pendente
                    return;
                }

                mensagemPendente.numeroSegmentosPendentes--;
                mensagemPendente.segmentosRecebidos.push({
                    segmentacao: {
                        numeroSequencia: mensagemWebSocket.segmentada.progresso.segmentacao.numeroSequencia,
                        totalBytes: mensagemWebSocket.segmentada.progresso.segmentacao.totalBytes
                    },
                    textoBase64: mensagemWebSocket.segmentada.progresso.textoBase64
                })

                // Se já recebeu todos os segmentos necessários
                if (mensagemPendente.segmentosRecebidos.length == mensagemPendente.segmentosEsperados.length) {
                    // Recebi a confirmação de que a mensagem foi completada

                    // Ordenar as segmentações de acordo com o numero de sequencia do 0 até n
                    mensagemPendente.segmentosRecebidos.sort((a, b) => a.segmentacao.numeroSequencia - b.segmentacao.numeroSequencia);

                    const bufferComPayload = Buffer.alloc(mensagemPendente.totalEmBytes);
                    let offsetBufferPayload = 0;
                    for (const sequenciasDeBase64 of mensagemPendente.segmentosRecebidos) {
                        const sequenciaEsperada = mensagemPendente.segmentosEsperados.find(segmento => segmento.numeroSequencia == sequenciasDeBase64.segmentacao.numeroSequencia);

                        if (sequenciaEsperada == undefined) {
                            return;
                        }

                        const bufferComTexto = Buffer.from(sequenciasDeBase64.textoBase64, 'base64');
                        if (bufferComTexto.length != sequenciaEsperada.totalBytes) {
                            return;
                        }

                        bufferComTexto.copy(bufferComPayload, offsetBufferPayload);

                        offsetBufferPayload += bufferComTexto.length;
                    }

                    const objetoTransmissao = this.#getTemplateDeTransmissao();
                    let jsonTransmissao = {};

                    try {
                        jsonTransmissao = JSON.parse(bufferComPayload.toString('utf-8'));
                    } catch (ex) {
                        return;
                    }
                    copiarParaObjeto(objetoTransmissao, jsonTransmissao)
                    this.#processaTransmissao(objetoTransmissao);
                }
            }
        }
    }

    /**
     * Enviar uma transmissão
     * @param {TipagemClienteWS.TransmissaoWebSocket} transmissao 
     */
    #enviarTransmissao(transmissao) {
        /**
         * @type {TipagemClienteWS.WebSocketMensagem}
         */
        const novaWebSocketMensagem = this.#getTemplateDeMensagemWebsocket();
        novaWebSocketMensagem.id = transmissao.id;

        const conteudoParaEnviar = JSON.stringify(transmissao);
        const bufferDados = Buffer.from(conteudoParaEnviar, 'utf-8');

        const tamanhoEmBytes = bufferDados.length;
        const tamanhoEmMB = tamanhoEmBytes / 1024 / 1024;

        // Limite de bytes por segmentação
        const limiteDeBytesPorSegmentacao = 4 * 1024 * 1024

        // Se for maior a 100 MBs, segmentar a mensagem
        if (tamanhoEmMB >= (limiteDeBytesPorSegmentacao / 1024 / 1024)) {

            novaWebSocketMensagem.isSegmentada = true;

            /**
             * Guardar as segmentações da mensagem para enviar
             * @type {TipagemClienteWS.WebSocketMensagem[]}
             */
            const arrayDeSegmentacoes = [];

            // Separar o buffer a cada 100 MBs
            let indexSegmentacao = 0;
            for (let bytesSegmentar = tamanhoEmBytes; bytesSegmentar > 0; bytesSegmentar -= limiteDeBytesPorSegmentacao) {

                const bufferSegmentado = bufferDados.subarray(indexSegmentacao * limiteDeBytesPorSegmentacao, (indexSegmentacao + 1) * limiteDeBytesPorSegmentacao)

                const novaMensagemSegmentacao = this.#getTemplateDeMensagemWebsocket();
                novaMensagemSegmentacao.id = novaWebSocketMensagem.id;

                novaMensagemSegmentacao.segmentada.isEmProgresso = true;
                novaMensagemSegmentacao.segmentada.progresso.segmentacao = {
                    numeroSequencia: indexSegmentacao,
                    totalBytes: bufferSegmentado.length
                }

                novaMensagemSegmentacao.segmentada.progresso.textoBase64 = bufferSegmentado.toString('base64');

                arrayDeSegmentacoes.push(novaMensagemSegmentacao);
                indexSegmentacao++;
            }

            // Notificar primeiro o cliente sobre essa segmentação de mensagem
            novaWebSocketMensagem.segmentada.isInicio = true;
            novaWebSocketMensagem.segmentada.inicio = {
                totalDeSegmentos: arrayDeSegmentacoes.length,
                segmentos: arrayDeSegmentacoes.map(segmentacao => {
                    return {
                        numeroSequencia: segmentacao.segmentada.progresso.segmentacao.numeroSequencia,
                        totalBytes: segmentacao.segmentada.progresso.segmentacao.totalBytes
                    }
                }),
                totalBytes: tamanhoEmBytes
            }


            // Esperar o cliente confirmar que recebeu o inicio da mensagem, para então transmitir as segmentações
            this.#emissorEventos.addEvento(`mensagem-websocket-iniciada-${novaWebSocketMensagem.id}`, () => {

                for (const segmentacao of arrayDeSegmentacoes) {
                    this.#enviarMensagem(segmentacao);
                }
            }, {
                excluirAposExecutar: true, expirarAposMs: {
                    expirarAposMs: 15000,
                    callback: () => {
                    }
                }
            });

            // Vou notificar o cliente do inicio da mensagem
            this.#enviarMensagem(novaWebSocketMensagem);
        } else {
            // Não precisa segmentar
            novaWebSocketMensagem.isUnica = true;
            novaWebSocketMensagem.unica.textoBase64 = bufferDados.toString('base64');

            this.#enviarMensagem(novaWebSocketMensagem);
        }
    }

    /**
     * Processar uma transmissão recebida
     * @param {TipagemClienteWS.TransmissaoWebSocket} transmissaoRecebida - Transmissão que foi recebida
     */
    #processaTransmissao(transmissaoRecebida) {

        // Preparar uma transmissão para devolver caso a transmissão seja inválida
        const transmissaoParaDevolver = this.#getTemplateDeTransmissao();
        transmissaoParaDevolver.id = this.#getUUIDUnico();
        transmissaoParaDevolver.tipo = TipagemClienteWS.TiposDeTransmissao.TRANSMISSAO_INVALIDA;

        // Verificar qual o tipo de transmissão
        switch (transmissaoRecebida.tipo) {
            // Recebendo a solicitação de comando para o servidor
            case TipagemClienteWS.TiposDeTransmissao.SOLICITA_COMANDO: {

                // Não especificado o corpo da solicitação de comando
                if (transmissaoRecebida.solicita_comando == undefined || typeof transmissaoRecebida.solicita_comando != 'object') {
                    transmissaoParaDevolver.transmissao_invalida.erro.isErroFaltandoTipoCorpo = true;
                    transmissaoParaDevolver.transmissao_invalida.mensagem = `Corpo da solicitação de comando inválido, esperado uma chave 'soliciata_comando' com os dados do comando`
                    this.#enviarTransmissao(transmissaoParaDevolver);
                    return;
                }

                // Não especificado o comando desejado
                if (transmissaoRecebida.solicita_comando.comando == undefined || transmissaoRecebida.solicita_comando.comando == '') {
                    transmissaoParaDevolver.transmissao_invalida.erro.isErroFaltandoDadosDoCorpo = true;
                    transmissaoParaDevolver.transmissao_invalida.mensagem = `O comando solicitado não foi especificado com a chave 'comando'`
                    this.#enviarTransmissao(transmissaoParaDevolver);
                    return;
                }

                // Nenhum payload, definir como vazio
                if (transmissaoRecebida.solicita_comando.payload == undefined) {
                    transmissaoRecebida.solicita_comando.payload = '';
                }

                this.#processarComandoSolicitado(transmissaoRecebida.solicita_comando, transmissaoRecebida);
                break;
            }
            // Recebendo a resposta de um cliente
            case TipagemClienteWS.TiposDeTransmissao.RESPONDE_COMANDO: {

                // Corpo da resposta não especificado
                if (transmissaoRecebida.responde_comando == undefined || typeof transmissaoRecebida.responde_comando != 'object') {
                    transmissaoParaDevolver.transmissao_invalida.erro.isErroFaltandoTipoCorpo = true;
                    transmissaoParaDevolver.transmissao_invalida.mensagem = `Corpo da resposta de comando inválido, esperado uma chave 'responde_comando' com os dados da resposta`
                    this.#enviarTransmissao(transmissaoParaDevolver);
                    return;
                }

                // Solicitação do comando inicial não especificado 
                if (transmissaoRecebida.responde_comando.solicitacao == undefined || typeof transmissaoRecebida.responde_comando.solicitacao != 'object') {
                    transmissaoParaDevolver.transmissao_invalida.erro.isErroFaltandoDadosDoCorpo = true;
                    transmissaoParaDevolver.transmissao_invalida.mensagem = `Dados da solicitação do comando não especificados`
                    this.#enviarTransmissao(transmissaoParaDevolver);
                    return;
                } else {

                    // ID da transmissão original da resposta não é valido
                    if (!validaUUID(transmissaoRecebida.responde_comando.solicitacao.idTransmissaoComando)) {
                        transmissaoParaDevolver.transmissao_invalida.erro.isErroFaltandoDadosDoCorpo = true;
                        transmissaoParaDevolver.transmissao_invalida.mensagem = `ID da transmissão original ${transmissaoRecebida.responde_comando.solicitacao.idTransmissaoComando} não é valido`
                        this.#enviarTransmissao(transmissaoParaDevolver);
                        return;
                    }
                }

                // Resposta do comando não especificado
                if (transmissaoRecebida.responde_comando.resposta == undefined || typeof transmissaoRecebida.responde_comando.resposta != 'object') {
                    transmissaoParaDevolver.transmissao_invalida.erro.isErroFaltandoDadosDoCorpo = true;
                    transmissaoParaDevolver.transmissao_invalida.mensagem = `Dados da resposta do comando não especificados`
                    this.#enviarTransmissao(transmissaoParaDevolver);
                    return;
                } else {

                    // Se o status de sucesso da resposta não estiver presente
                    if (transmissaoRecebida.responde_comando.resposta.sucesso == undefined) {
                        transmissaoParaDevolver.transmissao_invalida.erro.isErroFaltandoDadosDoCorpo = true;
                        transmissaoParaDevolver.transmissao_invalida.mensagem = `A chave 'sucesso' não foi especificada na resposta do comando`
                        this.#enviarTransmissao(transmissaoParaDevolver);
                        return;
                    }
                }

                // Se tudo estiver certo, notificar o servidor que uma resposta foi recebida
                this.#emissorEventos.disparaEvento(`comando-respondido-${transmissaoRecebida.responde_comando.solicitacao.idTransmissaoComando}`, transmissaoRecebida.responde_comando, transmissaoRecebida);
                break;
            }
            case TipagemClienteWS.TiposDeTransmissao.TRANSMISSAO_INVALIDA: {

                if (transmissaoRecebida.transmissao_invalida == undefined || typeof transmissaoRecebida.transmissao_invalida != 'object') {
                    return;
                }

                // Recebido uma transmissão inválida
                break;
            }
            case TipagemClienteWS.TiposDeTransmissao.KEEPALIVE_COMANDO: {
                // Um keepalive para manter um comando ativo

                this.#emissorEventos.disparaEvento(`comando-keepalive-${transmissaoRecebida.keepalive_comando.idTransmissaoComando}`);
                break
            }
            default: {

                // transmissaoParaDevolver.transmissao_invalida.erro.isTipoInvalido = true;
                // transmissaoParaDevolver.transmissao_invalida.mensagem = `Tipo de transmissão inválido: ${transmissaoRecebida.tipo}`;
                // this.#enviarTransmissao(transmissaoParaDevolver);
                break;
            }
        }

    }

    /**
     * Enviar um keepalive para manter um comando ativo
     * @param {String} uuidComandoTransmissao - UUID do comando para manter ativo 
     */
    async #notificarKeepAliveComando(uuidComandoTransmissao) {

        /**
         * @type {TipagemClienteWS.TransmissaoWebSocket}
         */
        const novaTransmissao = {
            id: this.#getUUIDUnico(),
            tipo: TipagemClienteWS.TiposDeTransmissao.KEEPALIVE_COMANDO,
            keepalive_comando: {
                idTransmissaoComando: uuidComandoTransmissao
            }
        }

        this.#enviarTransmissao(novaTransmissao);
    }

    /**
     * Processar um comando solicitado
     * @param {TipagemClienteWS.SolicitaComando} comando - Comando solicitado
     * @param {TipagemClienteWS.TransmissaoWebSocket} transmissao - Transmissão original recebida
     */
    async #processarComandoSolicitado(comando, transmissao) {

        /**
         * Preparar a transmissão de resposta
         * @type {TipagemClienteWS.TransmissaoWebSocket}
         */
        const respostaTransmissao = this.#getTemplateDeTransmissao();

        respostaTransmissao.id = this.#getUUIDUnico();
        respostaTransmissao.tipo = TipagemClienteWS.TiposDeTransmissao.RESPONDE_COMANDO;
        respostaTransmissao.responde_comando = {
            solicitacao: {
                comando: comando,
                idTransmissaoComando: transmissao.id
            },
            resposta: {
                sucesso: false,
                payload: {},
                erro: {
                    isComandoNaoExiste: false,
                    isErroExecucaoComando: false,
                    erroExecucaoComando: {
                        descricao: ''
                    }
                }
            }
        }

        // Validar se existe o comando solicitado
        const comandoEncontrado = this.getComandos().find(comandoObj => comandoObj.comando == comando.comando);
        if (comandoEncontrado == undefined) {
            respostaTransmissao.responde_comando.resposta.erro.isComandoNaoExiste = true;

            this.#enviarTransmissao(respostaTransmissao);
            return;
        }

        let respostaDaExecucao = {};

        // Cria um setInterval que envia um keepAlive para manter o outro lado esperando pela execução da resposta
        const setIntervalKeepAliveComando = setInterval(() => {

            this.#notificarKeepAliveComando(transmissao.id);
        }, 2000);

        // Se o comando existir, processar a execução dele
        try {
            respostaDaExecucao = await this.executorDeComando(comando, transmissao);
        } catch (ex) {
            respostaTransmissao.responde_comando.resposta.erro.isErroExecucaoComando = true;
            respostaTransmissao.responde_comando.resposta.erro.erroExecucaoComando.descricao = ex.message;

            this.#enviarTransmissao(respostaTransmissao);
            clearInterval(setIntervalKeepAliveComando);
            return;
        }

        // Se o comando processou com sucesso, retornar a resposta;
        respostaTransmissao.responde_comando.resposta.sucesso = true;
        respostaTransmissao.responde_comando.resposta.payload = respostaDaExecucao;
        respostaTransmissao.responde_comando.resposta.erro = undefined;

        this.#enviarTransmissao(respostaTransmissao);
        clearInterval(setIntervalKeepAliveComando);
    }

    /**
     * Enviar a execução de um comando no cliente
     * @param {String} comando - Comando
     * @param {*} payload - Algum payload adicional
     * @returns {Promise<TipagemClienteWS.PromiseEnviarComando>}
     */
    async enviarComando(comando, payload) {
        /**
         * Estado do comando retornado
         * @type {TipagemClienteWS.PromiseEnviarComando}
         */
        const retornoComando = {
            sucesso: false,
            retorno: {
                payload: {},
            },
            transmissoes: {
                solicitacao: {
                    idTransmissao: '',
                    comando: {
                        nome: '',
                        payload: {}
                    }
                },
                resposta: {
                    idTransmissao: ''
                }
            },
            erro: {
                isComandoNaoExiste: false,
                isErroExecucaoComando: false,
                erroExecucaoComando: {
                    descricao: ''
                },
                isDemorouResponder: false
            }
        }

        const novaTransmissao = this.#getTemplateDeTransmissao();
        novaTransmissao.id = this.#getUUIDUnico();
        novaTransmissao.tipo = TipagemClienteWS.TiposDeTransmissao.SOLICITA_COMANDO;
        novaTransmissao.responde_comando = undefined;
        novaTransmissao.transmissao_invalida = undefined;

        novaTransmissao.solicita_comando = {
            comando: comando,
            payload: payload
        }

        retornoComando.transmissoes.solicitacao = {
            ...retornoComando.transmissoes.solicitacao,
            comando: {
                nome: comando,
                payload: payload
            },
            idTransmissao: novaTransmissao.id
        }

        return new Promise((resolve) => {
            const aguardaResponsta = this.#emissorEventos.addEvento(`comando-respondido-${novaTransmissao.id}`,
                /**
                 * Escutar a resposta quando ela chegar
                 * @param {TipagemClienteWS.RespondeComando} respostaComando 
                 * @param {TipagemClienteWS.TransmissaoWebSocket} transmissao 
                 */
                async (respostaComando, transmissao) => {
                    // Cliente devolveu alguma resposta

                    // Anexar o ID da transmissão da resposta
                    retornoComando.transmissoes.resposta.idTransmissao = transmissao.id;
                    if (respostaComando.resposta.sucesso) {
                        retornoComando.sucesso = true;
                        retornoComando.retorno.payload = respostaComando.resposta.payload;
                    } else {
                        // Ocorreu algum erro na execução do comando

                        if (respostaComando.resposta.erro.isComandoNaoExiste) {
                            retornoComando.erro.isComandoNaoExiste = true;
                        } else if (respostaComando.resposta.erro.isErroExecucaoComando) {
                            retornoComando.erro.isErroExecucaoComando = true;
                            retornoComando.erro.erroExecucaoComando.descricao = respostaComando.resposta.erro.erroExecucaoComando.descricao;
                        }
                    }

                    onProgressoMensagem.excluir();
                    resolve(retornoComando);
                }, {
                excluirAposExecutar: true,
                expirarAposMs: {
                    expirarAposMs: 7000,
                    // Cliente demorou para responder
                    callback: () => {
                        retornoComando.erro.isDemorouResponder = true;
                        onProgressoMensagem.excluir();
                        resolve(retornoComando);
                    }
                }
            });


            // Acompnhar o progresso da mensagem se for muito grande.
            const onProgressoMensagem = this.#emissorEventos.addEvento(`comando-keepalive-${novaTransmissao.id}`, () => {
                aguardaResponsta.renovarTimeout();
            }, {
                excluirAposExecutar: false
            });

            this.#enviarTransmissao(novaTransmissao);
        })
    }

    /**
     * Retorna o emissor de eventos do cliente
     */
    getEmissorEventos() {
        return this.#emissorEventos;
    }

    /**
     * Retorna os comandos disponíveis para executar
     * @returns {TipagemClienteWS.Comando[]}
     */
    getComandos() {
        return [];
    }

    /**
     * Realiza a execução de um comando solicitado
     * @param {TipagemClienteWS.SolicitaComando} comando - Comando solicitado
     * @param {TipagemClienteWS.TransmissaoWebSocket} transmissao - Transmissão original recebida
     */
    async executorDeComando(comando, transmissao) {
        return '';
    }
}   