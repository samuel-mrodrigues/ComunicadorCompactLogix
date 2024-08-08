import { getCompactLogix } from "../../../estado/CompactLogix/CompactLogix.js";
import { getServidor, onClienteDesconectado } from "../../../estado/WebSocketER/WebSocketER.js";
import { Logger } from "../../../utils/Logger.js";
import { ClienteConectado } from "../../../utils/ServidorWebSocket/Modulo Servidor/servidor/ServidorWS/ClienteWS/ClienteWS.js";
import { copiarParaObjeto } from "../../../utils/ServidorWebSocket/Modulo Servidor/utils/utils.js";
import { formatarDataParaString } from "../../../utils/Utils.js";
import { getLogger } from "../CompactLogix.js"

/**
 * @typedef Observador
 * @property {String} clienteUUID - Cliente que está observando a tag
 * @property {Object[]} tagsObservando - Tags que o cliente tá observando
 * @property {String} tagsObservando[].tag - Nome da tag observada
 * @property {String} tagsObservando[].idCompactLogix - ID do CompactLogix que está sendo observado
 * @property {Number} tagsObservando[].idObservador - ID unico do observador para exclusão posterior
 * @property {String} tagsObservando[].idCanalObservador - ID do canal por onde será enviado as notificações do novo valor
 */

/**
 * @type {Observador[]}
 */
const observadoresExistentes = [];

/**
 * @typedef ComandoCompactsWebSocketER
 * @property {'lerTag' | 'escreverTag' | 'observarTag'} tipo - Tipo do comando para executar no Compact
 * @property {Object} compact - Informações do CompactLogix para interagir
 * @property {string} compact.id - ID do CompactLogix
 * @property {LerTag} lerTag - Se tipo for lerTag, contém detalhes da leitura desejada
 * @property {EscreverTag} escreverTag - Se tipo for escreverTag, contém detalhes da escrita desejada
 * @property {ObservaTag} observarTag - Se tipo for observarTag, contém detalhes da observação desejada
 */

/**
 * @typedef LerTag
 * @property {String} tag - Nome da tag
 */

/**
 * @typedef EscreverTag
 * @property {String} tag - Tag para escrever
 * @property {*} valor - Valor para escrever na tag
 */

/**
 * @typedef ObservaTag
 * @property {String} tag - Tag para observar
 */

/**
 * @type {Logger}
 */
let LoggerComandosWS;

export function cadastrar() {
    LoggerComandosWS = new Logger('Comandos WebSocketER', { isHabilitarLogConsole: true, isHabilitaSalvamento: true, loggerPai: getLogger() });

    LoggerComandosWS.log('Cadastrando comandos ao WebSocketER...');

    cadastraInteracaoCompactLogix();
    gerenciaDesconexoesWebSocket();
}

/**
 * Cadastrar uma funçao que escuta quando um cliente se desconecta para remover vinculos de observadores do cache
 */
function gerenciaDesconexoesWebSocket() {
    LoggerComandosWS.log('Cadastrando gerenciamento de desconexões de clientes');

    onClienteDesconectado((cliente) => {
        LoggerComandosWS.log(`Cliente ${cliente.getUUID()} desconectou-se do servidor WebSocketER.`);

        // Se tiver algum observador cadastrado por esse cliente
        const existeAlgumObservador = observadoresExistentes.find(clienteObj => clienteObj.clienteUUID === cliente.getUUID());
        if (existeAlgumObservador != undefined) {

            for (const tagObservada of existeAlgumObservador.tagsObservando) {

                const compactDaTag = getCompactLogix().find(compactObj => compactObj.idUnico === tagObservada.idCompactLogix);
                if (compactDaTag == undefined) {
                    LoggerComandosWS.log(`Não foi possível parar de observar a tag ${tagObservada.tag} pelo cliente ${cliente.getUUID()}. Motivo: CompactLogix não encontrado pelo id ${tagObservada.idCompactLogix}.`);
                    continue;
                }

                let statusParar = compactDaTag.pararObservarTag(tagObservada.idObservador);
                if (statusParar.isSucesso) {
                    LoggerComandosWS.log(`Parado de observar a tag ${tagObservada.tag} pelo cliente ${cliente.getUUID()}`);

                    existeAlgumObservador.tagsObservando = existeAlgumObservador.tagsObservando.filter(tagObj => tagObj.idObservador !== tagObservada.idObservador);
                } else {
                    LoggerComandosWS.log(`Não foi possível parar de observar a tag ${tagObservada.tag} pelo cliente ${cliente.getUUID()}. Motivo: ${statusParar.erro.descricao}`);
                }
            }
        }
    })
}

function cadastraInteracaoCompactLogix() {
    LoggerComandosWS.log('Cadastrando comando de interação com o CompactLogix');

    getServidor().adicionarComando('interagir_compact_logix', async (cliente, solicitacao) => {
        LoggerComandosWS.log('Recebendo solicitação de interação com o CompactLogix');

        /**
         * Comando original como deveria ser
         * @type {ComandoCompactsWebSocketER}
         */
        let payloadOriginal = {
            tipo: '',
            compact: {
                id: ''
            },
            escreverTag: {
                tag: '',
                valor: ''
            },
            lerTag: {
                tag: ''
            },
            observarTag: {
                tag: ''
            }
        }

        copiarParaObjeto(payloadOriginal, solicitacao.payload);

        // Verificar o tipo de evento solicitado no CompactLogix
        switch (payloadOriginal.tipo) {
            case 'escreverTag': {
                return await processaInteracaoEscreverTag(payloadOriginal);
            }
            case 'lerTag': {
                return await processaInteracaoLerTag(payloadOriginal);
            }
            case 'observarTag': {
                return await processaInteracaObservarTag(cliente, payloadOriginal);
            }
            default: {

                return {
                    isSucesso: false,
                    erro: {
                        descricao: `O tipo de interação ${payloadOriginal.tipo} não é valido.`
                    }
                }
            }
        }
    })
}

/**
 * Processar uma interação de leitura de tag com um payload recebido por um cliente
 * @param {ComandoCompactsWebSocketER} payloadCompact 
 */
async function processaInteracaoLerTag(payloadCompact) {
    const retornoLeituraTag = {
        isSucesso: false,
        sucesso: {
            tipoLeitura: '',
            valor: '',
            tagHistorico: {
                nome: '',
                valor: '',
                dataLeitura: '',
                motivoRetornoDoHistorico: {
                    descricao: '',
                    codigo: ''
                }
            },
            tagReal: {
                nome: '',
                valor: '',
                dataLeitura: ''
            }
        },
        erro: {
            codigoErro: '',
            descricao: ''
        }
    }

    let tagDesejada = payloadCompact.lerTag.tag

    const compact = getCompactLogix().find((compactObj) => compactObj.idUnico === payloadCompact.compact.id);
    if (!compact) {
        retornoLeituraTag.erro.descricao = `CompactLogix não encontrado pelo id ${payloadCompact.compact.id}`;
        return retornoLeituraTag;
    }

    /**
     * Se possui algum historico de leitura já armazenado pra essa tag atual
     */
    let isPossuiHistorico = false;
    const ultimaInformacoesLidas = {
        nome: tagDesejada,
        valor: '',
        dataLeitura: ''
    }

    // Se a tag já existe
    const existeTagjaLida = compact.estado.historicoDeTags.find((tagObj) => tagObj.nome === tagDesejada);
    if (existeTagjaLida != undefined) {
        if (existeTagjaLida.estado.isTagExiste && existeTagjaLida.estado.IsJaLeuSucesso) {
            isPossuiHistorico = true;
            ultimaInformacoesLidas.valor = existeTagjaLida.valor;
            ultimaInformacoesLidas.dataLeitura = formatarDataParaString(existeTagjaLida.data, '%dia%/%mes%/%ano% %hora%:%minuto%:%segundo%');
        }
    }

    const funcaoFormataRetorno = (isSucesso, isExisteHistorico, valor, dataLeitura, descricao, codigo) => {
        retornoLeituraTag.isSucesso = isSucesso;

        if (isSucesso) {
            if (isExisteHistorico) {
                retornoLeituraTag.sucesso.tipoLeitura = 'historico';
                retornoLeituraTag.sucesso.valor = valor;

                retornoLeituraTag.sucesso.tagHistorico = {
                    nome: tagDesejada,
                    dataLeitura: dataLeitura,
                    valor: valor,
                    motivoRetornoDoHistorico: {
                        descricao: descricao,
                        codigo: codigo
                    }
                }
            } else {
                retornoLeituraTag.sucesso.tipoLeitura = 'real';
                retornoLeituraTag.sucesso.valor = valor;

                retornoLeituraTag.sucesso.tagReal = {
                    nome: tagDesejada,
                    dataLeitura: dataLeitura,
                    valor: valor
                }
            }
        } else {
            retornoLeituraTag.erro.descricao = descricao;
            retornoLeituraTag.erro.codigoErro = codigo;
        }
    }

    // Tentar ler a tag com o valor atualizado
    const aguardaLeituraTag = await compact.lerTag(tagDesejada);
    if (!aguardaLeituraTag.isSucesso) {

        if (aguardaLeituraTag.erro.isCompactNaoConectado) {
            if (isPossuiHistorico) {
                funcaoFormataRetorno(true, true, ultimaInformacoesLidas.valor, ultimaInformacoesLidas.dataLeitura, `CompactLogix não está conectado, foi retornado o valor da ultima leitura da tag. Erro original: ${aguardaLeituraTag.erro.descricao}`, 'compactlogix-nao-conectado')
            } else {
                funcaoFormataRetorno(false, false, '', '', 'CompactLogix não está conectado, não é possível ler o valor em tempo real e nem existe algum historico da tag.', 'compactlogix-nao-conectado')
            }
        } else {
            funcaoFormataRetorno(false, false, '', '', `Não foi possível efetuar a leitura da tag, motivo: ${aguardaLeituraTag.erro.descricao}`, 'compactlogix-erro-desconhecido')
        }
        return retornoLeituraTag;
    }

    // Demorou demais para ler a tag
    if (aguardaLeituraTag.sucesso.tagLida.estado.isDemorouLer) {
        if (isPossuiHistorico) {
            funcaoFormataRetorno(true, true, ultimaInformacoesLidas.valor, ultimaInformacoesLidas.dataLeitura, `Tag demorou demais para ser lida, foi retornado o valor da ultima leitura da tag. Erro original: ${aguardaLeituraTag.sucesso.tagLida.estado.motivoNaoLida.descricao}`, 'compactlogix-tag-demorou')
        } else {
            funcaoFormataRetorno(false, false, '', '', `Tag ${tagDesejada} demorou demais para ser lida. Erro original: ${aguardaLeituraTag.sucesso.tagLida.estado.motivoNaoLida.descricao}`, 'compactlogix-tag-demorou')
        }
        return retornoLeituraTag;
    }

    // Se a tag não existir
    if (!aguardaLeituraTag.sucesso.tagLida.estado.isTagExiste) {
        if (isPossuiHistorico) {
            funcaoFormataRetorno(true, true, ultimaInformacoesLidas.valor, ultimaInformacoesLidas.dataLeitura, `Tag não encontrada, foi retornado o valor da ultima leitura da tag. Erro original: ${aguardaLeituraTag.sucesso.tagLida.estado.motivoNaoLida.descricao}`, 'compactlogix-tag-nao-encontrada')
        } else {
            funcaoFormataRetorno(false, false, '', '', `Tag ${tagDesejada} não encontrada. Erro original: ${aguardaLeituraTag.sucesso.tagLida.estado.motivoNaoLida.descricao}`, 'compactlogix-tag-nao-encontrada')
        }
        return retornoLeituraTag;
    }

    // Se existe a tag, verificar se a ultima lida deu certo
    if (!aguardaLeituraTag.sucesso.tagLida.estado.IsJaLeuSucesso) {
        if (isPossuiHistorico) {
            funcaoFormataRetorno(true, true, ultimaInformacoesLidas.valor, ultimaInformacoesLidas.dataLeitura, `A ultima leitura da tag não retornou sucesso, foi retornado o valor da ultima leitura da tag. Erro original: ${aguardaLeituraTag.sucesso.tagLida.estado.motivoNaoLida.descricao}`, 'compactlogix-tag-nao-lida')
        } else {
            funcaoFormataRetorno(false, false, '', '', `Tag ${tagDesejada} não foi lida ainda. Erro original: ${aguardaLeituraTag.sucesso.tagLida.estado.motivoNaoLida.descricao}`, 'compactlogix-tag-nao-lida')
        }

        return retornoLeituraTag;
    }

    retornoLeituraTag.isSucesso = true;
    retornoLeituraTag.sucesso.tipoLeitura = 'real';
    retornoLeituraTag.sucesso.valor = aguardaLeituraTag.sucesso.tagLida.valor;
    retornoLeituraTag.sucesso.tagReal = {
        nome: tagDesejada,
        valor: aguardaLeituraTag.sucesso.tagLida.valor,
        dataLeitura: formatarDataParaString(aguardaLeituraTag.sucesso.tagLida.data, '%dia%/%mes%/%ano% %hora%:%minuto%:%segundo%')
    }

    return retornoLeituraTag;
}

/**
 * Processar uma interação de escrita em uma tag com um payload recebido por um cliente
 * @param {ComandoCompactsWebSocketER} payloadCompact
 */
async function processaInteracaoEscreverTag(payloadCompact) {
    const retornoEscritaTag = {
        isSucesso: false,
        erro: {
            descricao: ''
        }
    }

    let tagDesejada = payloadCompact.escreverTag.tag
    let novoValor = payloadCompact.escreverTag.valor

    const compact = getCompactLogix().find((compactObj) => compactObj.idUnico === payloadCompact.compact.id);
    if (!compact) {
        retornoEscritaTag.erro.descricao = `CompactLogix não encontrado pelo id ${payloadCompact.compact.id}`;
        return retornoEscritaTag;
    }

    if (novoValor == undefined) {
        retornoEscritaTag.erro.descricao = 'O novo valor da tag não foi informado';
        return retornoEscritaTag;
    }

    // Solicitar a escrita da tag
    const statusSolicitaWriteTag = await compact.setTag(tagDesejada, novoValor);
    if (!statusSolicitaWriteTag.isSucesso) {
        if (statusSolicitaWriteTag.erro.isErroDesconhecido) {
            retornoEscritaTag.erro.descricao = `Ocorreu algum erro desconhecido ao tentar escrever a tag: ${statusSolicitaWriteTag.erro.descricao}`;
        } else if (statusSolicitaWriteTag.erro.isErroLerInformacoesTag) {
            retornoEscritaTag.erro.descricao = `Não foi possível ler as informações da tag ${tagDesejada} para escrever um novo valor. Motivo: ${statusSolicitaWriteTag.erro.descricao}`;
        } else if (statusSolicitaWriteTag.erro.isTagDemorouEscrever) {
            retornoEscritaTag.erro.descricao = `A tag ${tagDesejada} demorou demais para ser escrita. Motivo: ${statusSolicitaWriteTag.erro.descricao}`;
        } else if (statusSolicitaWriteTag.erro.isTagNaoExiste) {
            retornoEscritaTag.erro.descricao = `A tag ${tagDesejada} não existe no CompactLogix. Motivo: ${statusSolicitaWriteTag.erro.descricao}`;
        }

        return retornoEscritaTag;
    }

    retornoEscritaTag.isSucesso = true;
    return retornoEscritaTag;
}

/**
 * Processar uma interação de observar uma tag com um payload recebido por um cliente
 * @param {ComandoCompactsWebSocketER} payloadCompact - Payload enviado com as informações da tag para observar
 * @param {ClienteConectado} clienteConexao - Instancia da conexão do cliente que solicitou a observação
 */
async function processaInteracaObservarTag(clienteConexao, payloadCompact) {
    const retornoObserva = {
        /**
         * Se a observação foi feita com sucesso
         */
        isSucesso: false,
        sucesso: {
            /**
             * O cliente deve abrir um comando com esse nome para receber os eventos de observação
             */
            idDeCanalObservador: '',
            /**
             * O valor atual da tag
             */
            valorTagAtual: -1
        },
        erro: {
            descricao: ''
        }
    }

    let tagDesejada = payloadCompact.observarTag.tag

    const compact = getCompactLogix().find((compactObj) => compactObj.idUnico === payloadCompact.compact.id);
    if (!compact) {
        retornoObserva.erro.descricao = `CompactLogix não encontrado pelo id ${payloadCompact.compact.id}`;
        return retornoObserva;
    }

    const gerarObservador = await compact.observarTag(tagDesejada, (antigoValor, novoValor) => {

        // Achar o cliente interessado na interação da tag
        let clienteInteressado = observadoresExistentes.find(clienteObj => clienteObj.clienteUUID === clienteConexao.getUUID());

        if (clienteInteressado == undefined) return;

        // Filtrar a pela tag que foi alterada e ele se interessou
        const tagInteressada = clienteInteressado.tagsObservando.find(tagObj => tagObj.tag === tagDesejada);
        if (tagInteressada == undefined) return;

        // Obter a conexão do WebSocket
        const instanciaConexao = getServidor().getClientesConectados().find(clienteConectado => clienteConectado.getUUID() === clienteConexao.getUUID());
        if (instanciaConexao == undefined) return;

        LoggerComandosWS.log(`Notificando o cliente ${clienteConexao.getUUID()} sobre a alteração da tag ${tagDesejada}`);
        instanciaConexao.enviarComando(`interagir_compact_logix-tag-alterada-${tagInteressada.idCanalObservador}`, {
            anterior: antigoValor,
            novo: novoValor
        })
    });

    if (!gerarObservador.isSucesso) {
        retornoObserva.erro.descricao = `Não foi possível observar a tag ${tagDesejada}. Motivo: ${gerarObservador.erro.descricao}`;
        return retornoObserva;
    }

    const idDeCanalUnico = new Date().getTime();

    retornoObserva.sucesso.idDeCanalObservador = idDeCanalUnico;

    // Obter o valor atual da tag pra retornar também
    const tagLidaHistorico = compact.estado.historicoDeTags.find(tagObj => tagObj.nome === tagDesejada);
    
    retornoObserva.sucesso.valorTagAtual = tagLidaHistorico.valor
    retornoObserva.isSucesso = true;

    LoggerComandosWS.log(`Cliente ${clienteConexao.getUUID()} subscreveu-se na tag ${tagDesejada}.`)

    // Se o o cliente ainda não estiver observando, será adicionado
    let jaExisteClienteObservando = observadoresExistentes.find(clienteObj => clienteObj.clienteUUID === clienteConexao.getUUID());
    if (jaExisteClienteObservando == undefined) {
        jaExisteClienteObservando = {
            clienteUUID: clienteConexao.getUUID(),
            tagsObservando: []
        }

        observadoresExistentes.push(jaExisteClienteObservando)
    }

    // Adicionar a lista de tags observadas para notifica-lo quando a tag for alterada
    jaExisteClienteObservando.tagsObservando.push({
        idObservador: gerarObservador.sucesso.idUnicoObservador,
        tag: tagDesejada,
        idCompactLogix: payloadCompact.compact.id,
        idCanalObservador: idDeCanalUnico
    })

    return retornoObserva;
}