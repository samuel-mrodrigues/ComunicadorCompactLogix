import { addGET, addPOST } from "../../../index.js";
import { getCompactLogix } from "../../../estado/CompactLogix/CompactLogix.js";
import { formatarDataParaString } from "../../../utils/Utils.js";

/**
 * Cadastrar as rotas HTTP do CompactLogix
 */
export function cadastrar() {
    cadastrarConsultarCompactLogix();
    cadastrarLerTagCompactLogix();
    cadastrarSetTagCompactLogix();
}

/**
 * Listar os CompactLogix existentes cadastrados no sistema
 */
function cadastrarConsultarCompactLogix() {
    addGET('/equipamentos/compactlogix', (requisicao) => {
        const compacts = getCompactLogix();

        requisicao.aprovar('compactlogix-sucesso', 'CompactLogix listados com sucesso', {
            dispositivos: compacts.map((compactObj) => {
                return {
                    id: compactObj.idUnico,
                    ip: compactObj.configuracao.ip
                }
            })
        }).devolverResposta();
    })
}

/**
 * Ler a informaçõa de alguma tag de um compact logix
 */
function cadastrarLerTagCompactLogix() {
    addGET('/equipamentos/compactlogix/:idcompact/tags/:tag', async (requisicao) => {
        const idCompact = requisicao.getParametrosURL().idcompact
        const tagDesejada = requisicao.getParametrosURL().tag

        const compact = getCompactLogix().find((compactObj) => compactObj.idUnico === idCompact);
        if (!compact) {
            requisicao.recusar('compactlogix-nao-encontrado', `CompactLogix não encontrado pelo id ${idCompact}`).devolverResposta();
            return;
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

        const retornaRespostaTagLidaHistorico =
            /**
             * Retorna uma resposta de sucesso avisando que a tag foi lida do historico
             * @param {String} codigo - Algum codigo de identificação pro cliente saber o motivo do retorno direto do historico e não do valor real 
             * @param {String} descricao - Alguma decrição para descrever pro cliente o motivo do retorno direto do historico e não do valor real
             */
            (codigo, descricao) => {
                requisicao.aprovar('compactlogix-tag-lida-historico', `Tag ${tagDesejada} foi retornada do historico pois não foi possível ler o valor dela atualmente.`, {
                    tipoLeitura: 'historico',
                    tagHistorico: {
                        nome: ultimaInformacoesLidas.nome,
                        valor: ultimaInformacoesLidas.valor,
                        dataLeitura: ultimaInformacoesLidas.dataLeitura
                    },
                    motivoRetornoDoHistorico: {
                        descricao: descricao,
                        codigo: codigo
                    }
                }).devolverResposta()
            }

        // Tentar ler a tag com o valor atualizado
        const aguardaLeituraTag = await compact.lerTag(tagDesejada);
        if (!aguardaLeituraTag.isSucesso) {

            if (aguardaLeituraTag.erro.isCompactNaoConectado) {
                if (isPossuiHistorico) {
                    retornaRespostaTagLidaHistorico('compactlogix-nao-conectado', `CompactLogix não está conectado, foi retornado o valor da ultima leitura da tag. Erro original: ${aguardaLeituraTag.erro.descricao}`);
                } else {
                    requisicao.recusar('compactlogix-nao-conectado', `CompactLogix não está conectado, não é possível ler o valor em tempo real e nem existe algum historico da tag.`).devolverResposta();
                }
            } else {
                requisicao.recusar('compactlogix-erro-desconhecido', `Não foi possível efetuar a leitura da tag, motivo: ${aguardaLeituraTag.erro.descricao}`).devolverResposta();
            }
            return;
        }

        // Demorou demais para ler a tag
        if (aguardaLeituraTag.sucesso.tagLida.estado.isDemorouLer) {
            if (isPossuiHistorico) {
                retornaRespostaTagLidaHistorico('compactlogix-tag-demorou', `Tag demorou demais para ser lida, foi retornado o valor da ultima leitura da tag. Erro original: ${aguardaLeituraTag.sucesso.tagLida.estado.motivoNaoLida.descricao}`)
            } else {
                requisicao.recusar('compactlogix-tag-demorou', `Tag ${tagDesejada} demorou demais para ser lida. Erro original: ${aguardaLeituraTag.sucesso.tagLida.estado.motivoNaoLida.descricao}`).devolverResposta();
            }
            return;
        }

        // Se a tag não existir
        if (!aguardaLeituraTag.sucesso.tagLida.estado.isTagExiste) {
            if (isPossuiHistorico) {
                retornaRespostaTagLidaHistorico('compactlogix-tag-nao-encontrada', `Tag não encontrada, foi retornado o valor da ultima leitura da tag. Erro original: ${aguardaLeituraTag.sucesso.tagLida.estado.motivoNaoLida.descricao}`)
            } else {
                requisicao.recusar('compactlogix-tag-nao-encontrada', `Tag ${tagDesejada} não encontrada. Erro original: ${aguardaLeituraTag.sucesso.tagLida.estado.motivoNaoLida.descricao}`).devolverResposta();
            }
            return;
        }

        // Se existe a tag, verificar se a ultima lida deu certo
        if (!aguardaLeituraTag.sucesso.tagLida.estado.IsJaLeuSucesso) {
            if (isPossuiHistorico) {
                retornaRespostaTagLidaHistorico('compactlogix-tag-nao-lida', `A ultima leitura da tag não retornou sucesso, foi retornado o valor da ultima leitura da tag. Erro original: ${aguardaLeituraTag.sucesso.tagLida.estado.motivoNaoLida.descricao}`)
            } else {
                requisicao.recusar('compactlogix-tag-nao-lida', `Tag ${tagDesejada} não foi lida ainda. Erro original: ${aguardaLeituraTag.sucesso.tagLida.estado.motivoNaoLida.descricao}`).devolverResposta();
            }

            return;
        }

        let informacoesTag = {
            tipoLeitura: 'real',
            tagReal: {
                nome: ultimaInformacoesLidas.nome,
                valor: ultimaInformacoesLidas.valor,
                dataLeitura: ultimaInformacoesLidas.dataLeitura
            }
        }

        // Se a leitura foi concluida com sucesso, retornar o valor
        informacoesTag.tagReal.nome = aguardaLeituraTag.sucesso.tagLida.nome;
        informacoesTag.tagReal.valor = aguardaLeituraTag.sucesso.tagLida.valor;
        informacoesTag.tagReal.dataLeitura = formatarDataParaString(aguardaLeituraTag.sucesso.tagLida.data, '%dia%/%mes%/%ano% %hora%:%minuto%:%segundo%');

        return requisicao.aprovar('compactlogix-tag-lida', `Tag ${tagDesejada} lida com sucesso`, informacoesTag).devolverResposta();
    })
}
/**
 * Setar uma tag com um novo valor
 */
function cadastrarSetTagCompactLogix() {
    addPOST('/equipamentos/compactlogix/:idcompact/tags/:tag', async (requisicao) => {
        const idCompact = requisicao.getParametrosURL().idcompact
        const tagDesejada = requisicao.getParametrosURL().tag
        const novoValor = requisicao.getBody().novoValor;

        if (novoValor == undefined) {
            requisicao.recusar('novovalor-nao-informado', 'O novo valor da tag não foi informado').devolverResposta();
            return;
        }

        const compact = getCompactLogix().find((compactObj) => compactObj.idUnico === idCompact);
        if (!compact) {
            requisicao.recusar('compactlogix-nao-encontrado', `CompactLogix não encontrado pelo id ${idCompact}`).devolverResposta();
            return;
        }

        // Solicitar a escrita da tag
        const statusSolicitaWriteTag = await compact.setTag(tagDesejada, novoValor);
        if (!statusSolicitaWriteTag.isSucesso) {
            if (statusSolicitaWriteTag.erro.isErroDesconhecido) {
                requisicao.recusar(`erro-desconhecido`, `Ocorreu algum erro desconhecido ao tentar escrever a tag: ${statusSolicitaWriteTag.erro.descricao}`);
            } else if (statusSolicitaWriteTag.erro.isErroLerInformacoesTag) {
                requisicao.recusar(`erro-ler-tag`, `Não foi possível ler as informações da tag ${tagDesejada} para escrever um novo valor. Motivo: ${statusSolicitaWriteTag.erro.descricao}`);
            } else if (statusSolicitaWriteTag.erro.isTagDemorouEscrever) {
                requisicao.recusar(`tag-demorou-escrever`, `A tag ${tagDesejada} demorou demais para ser escrita. Motivo: ${statusSolicitaWriteTag.erro.descricao}`);
            } else if (statusSolicitaWriteTag.erro.isTagNaoExiste) {
                requisicao.recusar(`tag-nao-existe`, `A tag ${tagDesejada} não existe no CompactLogix. Motivo: ${statusSolicitaWriteTag.erro.descricao}`);
            }

            return requisicao.devolverResposta();
        }

        // Escreveu com sucesso
        requisicao.aprovar('tag-escrita', `A tag ${tagDesejada} foi escrita com sucesso com o valor ${novoValor}`).devolverResposta();
    });
}