import { Logger } from "../../utils/Logger.js";
import { pausar } from "../../utils/ServidorWebSocket/Modulo Servidor/utils/EmissorDeEvento.js";
import { getLogger as LoggerEstado } from "../estado.js"

import { Controller, Tag, extController } from "st-ethernet-ip";

let LoggerEstadoCompactLogix;

/**
 * Fazer o startup inicial do estado do CompactLogix
 */
export function iniciar() {
    LoggerEstadoCompactLogix = new Logger('Estado CompactLogix', { isHabilitarLogConsole: true, isHabilitaSalvamento: true, loggerPai: LoggerEstado() });

    LoggerEstadoCompactLogix.log(`Iniciando estado do CompactLogix...`);
    cadastrarCompactFundicao();
}


/**
 * Lista de CompactLogix existentes
 * @type {CompactLogix[]}
 */
const compactLogixs = [];

/**
 * Retorna os CompactLogixs existentes
 */
export function getCompactLogix() {
    return compactLogixs;
}

function cadastrarCompactFundicao() {
    const novoCompact = new CompactLogix('192.168.3.120');

    novoCompact.idUnico = 'compactfundicao'
    novoCompact.conectar();
    novoCompact.iniciarVerificadorConexao();
    novoCompact.togglePing(true);
    novoCompact.togglePingsConsole(false);

    compactLogixs.push(novoCompact);

    LoggerEstadoCompactLogix.log(`CompactLogix Fundição cadastrado com sucesso.`);

    // setTimeout(async () => {
    //     console.log(`Legal em bro`);

    //     let teste = novoCompact.estado.CompactLogixInstancia.tagList

    //     console.log(teste.filter(tag => tag.name.startsWith('BD_G1_')));

    // }, 3000);
    setTimeout(() => {
        novoCompact.desconectar();
    }, 20000);
}

/**
 * @callback CallbackTagAlterouValor - Callback para executar quando a tag alterar seu valor
 * @param {String} antigoValor - Valor antigo da tag
 * @param {String} novoValor - Novo valor atribuido a tag
 */

/**
 * @typedef InstanciaEscutarTag - Representa uma instancia de escutar por alteração de tag
 * @property {Number} idEscuta - ID unico de escuta para cada nova escuta(independente da tag, cada escuta em tag igual ou diferente tem um ID unico)
 * @property {CallbackTagAlterouValor} callbackUsuario - Callback definido para executar quando a tag for alterada 
 */

/**
 * @typedef EventoEscutarTag - Um evento que é executado quando uma tag é atualizada
 * @property {String} nome - Nome da tag sendo observada
 * @property {InstanciaEscutarTag[]} observadores - Observadores que estão observando essa tag.
 */

/**
 * @typedef HistoricoTagLida - Uma tag com seu valor lido(é salvo como historico em casos de não conseguir obter a conexão com o Compact)
 * @property {String} nome - Nome da tag
 * @property {String} valor - Valor da tag
 * @property {Tag} objetoTagEstatisticas - Estatisticas detalhadas e avançadas da tag
 * @property {Date} data - Data em que foi lido o valor pela ultima vez
 * @property {Object} estado - Estados da tag
 * @property {Boolean} estado.isTagExiste - Se a tag pelo menos existe no CompactLogix
 * @property {Boolean} estado.IsJaLeuSucesso - Se a tag já foi lida pelo menos uma vez com sucesso
 * @property {Boolean} estado.isDemorouLer - Se demorou demais para ler a tag e retornou um erro
 * @property {Object} estado.motivoNaoLida - Se a tag não existe ou ainda não foi lida, contém os detalhes do motivo
 * @property {String} estado.motivoNaoLida.descricao - Descrição do erro que ocorreu na ultima tentativa de leitura
 * /

/**
 * Gerenciar uma conexão com um CompactLogix
 */
export class CompactLogix {

    /**
     * ID unico desse CompactLogix
     */
    idUnico = '';

    /**
     * Logger desse Compact
     * @type {Logger}
     */
    logger;

    /**
     * Detalhes do Compact
     */
    configuracao = {
        /**
         * Endereço IP do dispositivo
         */
        ip: ''
    }

    estado = {
        /**
         * Instancia do Controlador do CompactLogix
         * @type {Controller}
         */
        CompactLogixInstancia: undefined,
        /**
         * Se atualmente o CompactLogix esta conectadoF
         */
        isConectado: false,
        isExibirPingConsole: false,
        /**
         * Se existe uma solicitação de ping pendente
         */
        isEnviandoPing: false,
        /**
         * ID do setInterval que verifica a conexão com o Compact
         */
        idSetIntervalVerificaConexao: -1,
        /**
         * ID do setInterval que fica enviando o ping pro dispositivo 
         */
        idSetIntervalPingConexao: -1,
        /**
         * Se não estiver conectado, contém o motivo
         */
        motivoNaoConectado: {
            /**
             * Descrição por não estar conectado
             */
            descricao: 'Não tentou conectar-se ainda.',
            /**
             * Se é por erro de timeout de conexão, provavelmente sem conexão com o equipamento
             */
            isTimeoutConexao: false,
            /**
             * Ainda não tentou se conectar
             */
            isNaoTentouConectar: false,
            /**
             * Se cair em qualquer outro erro estranho não tratado
             */
            isErroDesconhecido: false,
            /**
             * Se atualmente está sendo feita uma tentativa de conexão
             */
            isConectando: false
        },
        /**
         * Funções observadores de tags. Todo novo observador é cadastrado aqui e chamado quando a tag em questão é alterada
         * @type {EventoEscutarTag[]}
         */
        observadoresDeTags: [],
        /**
         * Por padrão, todas as leituras de tags são armazenadas aqui para consultas posteriores. Em caso de perder a conexão com o CompactLogix, esses valores ainda estarão disponiveis com a data de última leitura.
         * @type {HistoricoTagLida[]}
         */
        historicoDeTags: []
    }

    isDesconectouJa = false;

    /**
     * Informações do CompactLogix(só é preenchido quando é conectado)
     */
    propriedades = {
        /**
         * Nome de fabrica do dispositivo
         */
        nome: '',
        /**
         * Numero serial
         */
        serial: '',
        /**
         * Slot em que ele está conectado(geralmente é sempre 0)
         */
        slot: 0,
        /**
         * Versão do software do dispositivo
         */
        versao: ''
    }

    /**
     * Instanciar um novo CompactLogix
     * @param {String} ip 
     */
    constructor(ip) {
        this.configuracao.ip = ip;

        this.logger = new Logger(`CompactLogix ${ip}`, { isHabilitarLogConsole: true, isHabilitaSalvamento: true, loggerPai: LoggerEstado() });
    }

    iniciarVerificadorConexao() {
        if (this.estado.idSetIntervalVerificaConexao != undefined) {
            clearInterval(this.estado.idSetIntervalVerificaConexao);
        }

        this.log(`Iniciando verificador de conexão...`);
        this.estado.idSetIntervalVerificaConexao = setInterval(async () => {
            if (!this.estado.isConectado) {
                this.log(`CompactLogix não está conectado, tentando conectar novamente...`);
                await this.conectar();
            }
        }, 10000);
    }

    /**
     * Toggla o envio de pings ao dispositivo(obrigatorio se não ele para e funcionar dps de uns segundos)
     */
    togglePing(isAtivar) {
        if (isAtivar) {
            this.log(`Ativando envio de pings ao CompactLogix`);

            this.estado.idSetIntervalPingConexao = setInterval(async () => {

                if (this.estado.CompactLogixInstancia != undefined) {

                    if (this.estado.isEnviandoPing) return;
                    if (this.estado.motivoNaoConectado.isConectando) return;

                    this.estado.isEnviandoPing = true;

                    this.log(`Enviando ping ao CompactLogix...`, this.estado.isExibirPingConsole);
                    try {
                        await this.estado.CompactLogixInstancia.readControllerProps();
                        this.log(`Ping enviado com sucesso ao CompactLogix`, this.estado.isExibirPingConsole);
                        this.estado.isConectado = true;
                    } catch (ex) {
                        this.log(`Erro ao enviar ping ao CompactLogix: ${ex}`, this.estado.isExibirPingConsole);
                        this.estado.isConectado = false;
                    }

                    this.estado.isEnviandoPing = false;
                }
            }, 2500);
        } else {
            this.log(`Desativando envio de pings ao CompactLogix`);
            clearInterval(this.estado.idSetIntervalPingConexao);
        }
    }

    /**
     * Não exibir as mensagens de ping via console
     */
    togglePingsConsole(bool) {
        if (bool) {
            this.log(`Ativando exibição de pings via console`);
            this.estado.isExibirPingConsole = true;
        } else {
            this.log(`Desativando exibição de pings via console`);
            this.estado.isExibirPingConsole = false;
        }
    }

    /**
     * Conectar-se ao CompactLogix
     */
    async conectar() {
        let retornoConexao = {
            /**
             * Se conectou com sucesso
             */
            isConectado: false,
            /**
             * Detalhes do erro se não conectou
             */
            erro: {
                descricao: '',
                /**
                 * Demorou para se conectar, provavelmente o dispositivo pelo IP fornecido não é um CompactLogix ou não está conectado
                 */
                isTempoConexaoExcedido: false,
                /**
                 * Já está sendo feito uma requisição para conexão
                 */
                isJaConectando: false,
                /**
                 * Não deu pra reconhecer o tipo do erro ocorrido. Acredite na descrição
                 */
                isErroDesconhecido: false,
            }
        }

        // Se já estiver sendo conectado
        if (this.estado.motivoNaoConectado.isConectando) {
            this.log(`Já está tentando conectar ao CompactLogix ${this.configuracao.ip}, aguarde...`);
            return retornoConexao;
        }

        this.log(`Tentando conectar ao CompactLogix ${this.configuracao.ip}`);
        this.estado.isConectado = false;

        this.estado.motivoNaoConectado = {
            ...this.estado.motivoNaoConectado,
            descricao: 'Tentando iniciar a conexão...',
            isNaoTentouConectar: false,
            isTimeoutConexao: false,
            isConectando: true
        }

        // // Se já tiver uma instancia do Controller Manager, desconectar os controllers
        if (this.estado.CompactLogixInstancia != undefined) {
            this.log(`Desconectando instancia compact antigo...`);
            try {
                this.estado.CompactLogixInstancia.destroy();
                this.estado.CompactLogixInstancia = undefined;
            } catch (ex) {
                this.log(`Erro ao desconectar instancia compact antigo: ${ex}`);
            }
        }

        if (this.estado.CompactLogixInstancia == undefined) {
            this.log(`Instanciando um novo Controller`);
            this.estado.CompactLogixInstancia = new Controller(false);

            this.estado.CompactLogixInstancia.on('close', () => {
                this.log('Evento detectado: A conexão foi fechada.');
                this.estado.isConectado = false;
            });

            this.estado.CompactLogixInstancia.on('data', (data) => {
                // this.log(`Evento detectado: Novos dados recebidos: ${data.toString()}`);
            })

            this.estado.CompactLogixInstancia.on('error', (err) => {
                this.log(`Evento detectado: Erro ocorrido: ${JSON.stringify(err)}`);
            });

            this.estado.CompactLogixInstancia.on('ready', async () => {
                this.log('Evento detectado: Pronto');
            });

            this.estado.CompactLogixInstancia.on('connect', () => {
                this.log(`Evento detectado: Conectado`);
            });

            this.estado.CompactLogixInstancia.on('timeout', () => {
                this.log('Evento detectado: Timeout');
            })

            this.estado.CompactLogixInstancia.on('end', () => {
                this.log('Evento detectado: Fim de conexão');
            });
        } else {
            this.log(`Reutilizando instancia do Controller`);
        }
        const controller = this.estado.CompactLogixInstancia

        this.log(`Abrindo conexão com o endereço Compact...`)
        try {
            await controller.connect(this.configuracao.ip)
            controller.setTimeout(5000)

            this.log(`Conectado com sucesso ao CompactLogix. Lendo informações do controlador...`);
            await controller.readControllerProps();
            this.propriedades = {
                ...this.propriedades,
                nome: controller.properties.name,
                serial: controller.properties.serial_number,
                slot: controller.properties.slot,
                versao: controller.properties.version
            }

            this.log(`Informações do controlador lidas com sucesso: ${JSON.stringify(this.propriedades)}`);

            this.estado.isConectado = true;

            this.estado.motivoNaoConectado = {
                ...this.estado.motivoNaoConectado,
                descricao: '',
                isConectando: false,
                isNaoTentouConectar: false,
                isErroDesconhecido: false,
                isTimeoutConexao: false
            }

            // Setar o delay de procura de alteração da tag
            controller.scan_rate = 500;

            controller.scan();
            this.log(`Scan rate setado para 500ms`);

        } catch (ex) {
            this.log(`Erro ao conectar com o CLP: ${ex}`);

            if (ex.message.includes('TIMEOUT')) {
                retornoConexao.erro.isTempoConexaoExcedido = true;
                this.estado.motivoNaoConectado.descricao = `Tempo de conexão excedido para tentar se conectar ao dispositivo`;
                this.estado.motivoNaoConectado.isTimeoutConexao = true;
            } else {
                retornoConexao.erro.isErroDesconhecido = true;
                this.estado.motivoNaoConectado.descricao = `Erro desconhecido ao tentar se conectar ao dispositivo`;
                this.estado.motivoNaoConectado.isErroDesconhecido = true;
            }

            this.estado.motivoNaoConectado.isConectando = false;

            retornoConexao.erro.descricao = ex.message;
        }

        // Se tiver alguns observadores existentes, eu preciso reler as tags para os eventos onChanges serem disparados
        if (this.estado.observadoresDeTags.length > 0) {

            this.#recadastrarObservadores();
        } else {
            this.log(`Não há observadores de tags cadastrados, não é necessário re-lê-las.`);
        }

        return retornoConexao;
    }

    /**
     * Ler valor de tag atual
     * @param {String} tag 
     */
    async lerTag(tag) {
        const retornoLeitura = {
            /**
             * Se a leitura deu certo
             */
            isSucesso: false,
            /**
             * Se sucesso, contém os detalhes da tag lida
             */
            sucesso: {
                /**
                 * Informações da tag lida
                 * @type {HistoricoTagLida}
                 */
                tagLida: undefined
            },
            /**
             * Se não deu pra ler a tag, contém detalhes do erro
             */
            erro: {
                descricao: '',
                /**
                 * O Compact não está conectado para fazer a leitura da tag
                 */
                isCompactNaoConectado: false
            }
        }

        // Se não estiver conectado não permitir a leitura
        // if (!this.estado.isConectado) {
        //     this.log(`Não foi possível ler a tag ${tag} pois o CompactLogix não está conectado.`);

        //     retornoLeitura.erro.descricao = 'CompactLogix não está conectado.';
        //     retornoLeitura.erro.isCompactNaoConectado = true;
        //     return retornoLeitura;
        // }

        this.log(`Lendo tag: ${tag}`);

        let historicoLeituraTag = this.estado.historicoDeTags.find(tagObj => tagObj.nome == tag);
        if (historicoLeituraTag == undefined) {
            // Se a tag ainda não existir no cache, adicionar ela

            if (!this.estado.isConectado) {
                this.log(`CompactLogix não está conectado, não é possível adicionar a tag ${tag} ao cache de leitura.`);
                retornoLeitura.erro.descricao = 'CompactLogix não está conectado e não há historico de leitura para essa tag solicitada.';
                retornoLeitura.erro.isCompactNaoConectado = true;
                return retornoLeitura;
            }

            historicoLeituraTag = {
                nome: tag,
                valor: undefined,
                data: undefined,
                objetoTagEstatisticas: undefined,
                estado: {
                    IsJaLeuSucesso: false,
                    isDemorouLer: false,
                    isTagExiste: false,
                    motivoNaoLida: {
                        descricao: ''
                    }
                },
            }

            const novaTag = new Tag(tag)

            novaTag.on('Changed', (valor) => {
                this.log(`Tag ${tag} ocorreu o evento Changed com o valor: ${valor.value}}`);
                this.#processarTagAlterada(tag, valor.value);
            })

            novaTag.on('Initialized', (iniciada) => {

            })

            novaTag.on('KeepAlive', () => {

            })

            novaTag.on('Unknown', () => {

            })

            historicoLeituraTag.objetoTagEstatisticas = novaTag;
            this.estado.historicoDeTags.push(historicoLeituraTag);
        }

        // Tentar obter o valor da tag do CompactLogix
        try {
            await this.estado.CompactLogixInstancia.readTag(historicoLeituraTag.objetoTagEstatisticas);

            // Se leu com sucesso
            historicoLeituraTag.data = new Date();

            // Atualizar com o novo valor
            historicoLeituraTag.valor = historicoLeituraTag.objetoTagEstatisticas.value;

            historicoLeituraTag.estado = {
                ...historicoLeituraTag.estado,
                IsJaLeuSucesso: true,
                isTagExiste: true,
                isDemorouLer: false,
                motivoNaoLida: {
                    descricao: ''
                }
            }

            historicoLeituraTag.valor = historicoLeituraTag.objetoTagEstatisticas.value;
        } catch (ex) {
            if (typeof ex == "object") {

                // Se for um erro que retornou algo do compact, geralmente retorna um generalStatusCode do motivo do erro
                if (ex.generalStatusCode != undefined) {

                    // O erro 4 é que o caminho pra tag não existe
                    if (ex.generalStatusCode == 4) {
                        historicoLeituraTag.estado.isTagExiste = false;
                        historicoLeituraTag.estado.motivoNaoLida.descricao = `A tag não existe no CompactLogix. Erro Original: ${JSON.stringify(ex)}`
                    }

                    // Informou um caminho para o objeto na tag que não existe, como informar um espaço de um array que não existe
                    if (ex.generalStatusCode == 5) {
                        historicoLeituraTag.estado.isTagExiste = false;
                        historicoLeituraTag.estado.motivoNaoLida.descricao = `O caminho do objeto especificado na tag não existe no CompactLogix. Erro Original: ${JSON.stringify(ex)}`
                    }
                } else {
                    if (ex.message.toLowerCase().includes('timeout')) {
                        historicoLeituraTag.estado.isDemorouLer = true;
                        historicoLeituraTag.estado.motivoNaoLida.descricao = `O CompactLogix não respondeu a tempo. Erro Original: ${JSON.stringify(ex)}`;
                    } else {
                        historicoLeituraTag.estado.motivoNaoLida.descricao = `O CompactLogix retornou o erro:  ${JSON.stringify(ex)}`;
                    }
                }
            }
        }

        retornoLeitura.isSucesso = true;
        retornoLeitura.sucesso.tagLida = historicoLeituraTag;

        return retornoLeitura;
    }

    /**
     * Setar uma tag com um novo valor
     * @param {String} tag - Nome da tag
     * @param {String} valor - Valor para aplicar
     */
    async setTag(tag, valor) {
        const retornoSetarTag = {
            /**
             * Se a operação de setar o valor da tag deu certo
             */
            isSucesso: false,
            /**
             * Detalhes do erro se não sucesso
             */
            erro: {
                descricao: '',
                /**
                 * Não deu pra ler as informações da tag(é obrigatorio ler antes pra pegar os dados da tag pra setar)
                 */
                isErroLerInformacoesTag: false,
                /**
                 * A TAG não existe
                 */
                isTagNaoExiste: false,
                /**
                 * Demorou demais pra ler a tag
                 */
                isTagDemorouEscrever: false,
                /**
                 * Ocorreu um erro desconhecido
                 */
                isErroDesconhecido: false
            }
        }

        const lerTagAtual = await this.lerTag(tag);
        if (!lerTagAtual.isSucesso) {
            retornoSetarTag.erro.descricao = `Erro ao invocar a leitura da tag ${tag} para setar o valor. Motivo: ${lerTagAtual.erro.descricao}`;
            return retornoSetarTag;
        }

        if (!lerTagAtual.sucesso.tagLida.estado.IsJaLeuSucesso) {
            retornoSetarTag.erro.descricao = `Erro ao tentar ler a tag ${tag}. Motivo: ${lerTagAtual.sucesso.tagLida.estado.motivoNaoLida.descricao}`;
            retornoSetarTag.erro.isErroLerInformacoesTag = true;
            return retornoSetarTag;
        }

        if (!lerTagAtual.sucesso.tagLida.estado.isTagExiste) {
            retornoSetarTag.erro.descricao = `A tag ${tag} não existe`;
            retornoSetarTag.erro.isTagNaoExiste = true;
            return retornoSetarTag
        }

        try {
            await this.estado.CompactLogixInstancia.writeTag(lerTagAtual.sucesso.tagLida.objetoTagEstatisticas, valor);

            retornoSetarTag.isSucesso = true
        } catch (ex) {
            if (ex.message.toLowerCase().includes('timeout')) {
                retornoSetarTag.erro.descricao = `O CompactLogix não respondeu a tempo para setar o valor da tag ${tag}`;
                retornoSetarTag.erro.isTagDemorouEscrever = true;
            } else {
                retornoSetarTag.erro.descricao = `Erro desconhecido ao tentar setar o valor da tag ${tag}. Motivo: ${ex.message}`;
                retornoSetarTag.erro.isErroDesconhecido = true;
            }
        }

        return retornoSetarTag;
    }

    /**
     * Solicitar a desconexão do Compact
     */
    async desconectar() {
        this.estado.CompactLogixInstancia.destroy();
    }

    /**
     * Observar por alterações em uma tag
     * @param {String} tag - Código da tag a ser observada
     * @param {CallbackTagAlterouValor} callback - Callback a ser executado quando a tag for alterada
     */
    async observarTag(tag, callback) {
        const retornoObservar = {
            /**
             * Se deu certo em observar a tag
             */
            isSucesso: false,
            sucesso: {
                /**
                 * ID unico desse observador para cancelamento.
                 */
                idUnicoObservador: -1
            },
            erro: {
                descricao: '',
                /**
                 * Se a tag não existir, não é possível criar o observador
                 */
                isTagNaoExiste: false
            }
        }

        const tagValorAtual = await this.lerTag(tag);
        if (!tagValorAtual.isSucesso) {
            retornoObservar.erro.descricao = `Não foi possível observar a tag ${tag} pois houve um erro ao tentar ler a tag`;
            return retornoObservar;
        }

        if (tagValorAtual.isSucesso && tagValorAtual.sucesso.tagLida.estado.isTagExiste == false) {
            retornoObservar.erro.descricao = `Não foi possível observar a tag ${tag} pois ela não existe no CompactLogix`;
            retornoObservar.erro.isTagNaoExiste = true;
            return retornoObservar;
        }

        // Verificar se a tag já não está sendo observada
        let observadorDaTag = this.estado.observadoresDeTags.find(obs => obs.nome == tag);
        if (observadorDaTag == undefined) {

            // Adicionar inicialmente a tag no observador
            observadorDaTag = {
                nome: tag,
                observadores: []
            }

            this.estado.observadoresDeTags.push(observadorDaTag);

            let tagObservar = tagValorAtual.sucesso.tagLida.objetoTagEstatisticas;

            // Adicionar a subscrição da tag
            this.estado.CompactLogixInstancia.subscribe(tagObservar)
        }

        /**
         * Nova instancia de observação da tag
         * @type {InstanciaEscutarTag}
         */
        let novoObservador = {
            idEscuta: this.#getProximoIdObservador(),
            callbackUsuario: callback
        }

        observadorDaTag.observadores.push(novoObservador);

        retornoObservar.sucesso.idUnicoObservador = novoObservador.idEscuta;
        retornoObservar.isSucesso = true;
        return retornoObservar;
    }

    /**
     * Retorna o próximo ID disponível de observador
     */
    #getProximoIdObservador() {
        let idAtualObservador = 0;

        for (const tagObservada of this.estado.observadoresDeTags) {
            for (const observador of tagObservada.observadores) {
                if (observador.idEscuta >= idAtualObservador) {
                    idAtualObservador = observador.idEscuta;
                }
            }
        }

        idAtualObservador++;

        return idAtualObservador;
    }

    /**
     * Parar a observação de uma tag
     * @param {Number} idUnico - ID unico da tag para parar de observar
     */
    pararObservarTag(idUnico) {
        const retornoParar = {
            /**
             * Se deu certo em parar de observar a tag
             */
            isSucesso: false,
            erro: {
                descricao: ''
            }
        }

        for (const tagObservada of this.estado.observadoresDeTags) {

            const indexObservador = tagObservada.observadores.findIndex(obs => obs.idEscuta == idUnico);
            if (indexObservador != -1) {
                tagObservada.observadores.splice(indexObservador, 1);
                retornoParar.isSucesso = true;

                this.log(`Observador pelo id ${idUnico} parou de observar a tag ${tagObservada.nome}`);
                return retornoParar;
            }
        }

        // Se passou por todas as tags e não achou, o ID informado não existe
        retornoParar.erro.descricao = `Não foi possível encontrar nenhum oservador com o ID unico ${idUnico}`;
        return retornoParar
    }

    /**
     * Processar a alteração de uma tag, invocando os observadores cadastrados
     * @param {String} tagAlterada 
     * @param {*} novoValor 
     */
    #processarTagAlterada(tagAlterada, novoValor) {

        const observadoresInteressados = this.estado.observadoresDeTags.find(obs => obs.nome == tagAlterada);
        if (observadoresInteressados == undefined) {
            this.log(`Detectado alteração na tag ${tagAlterada} mas ela não existe nenhum observador..`);
            return;
        }

        if (observadoresInteressados.observadores.length == 0) {
            this.log(`Detectado alteração na tag ${tagAlterada} porém não há observadores cadastrados.`);
            return;
        }

        this.log(`Processando alteração de tag ${tagAlterada} com o novo valor ${novoValor} para ${observadoresInteressados.observadores.length} observadores`);

        let valorAnterior = undefined;

        // Coletar o valor anterior antes da mudança
        const tagAtualAlterada = this.estado.historicoDeTags.find(tag => tag.nome == tagAlterada);
        if (tagAtualAlterada != undefined) {
            valorAnterior = tagAtualAlterada.valor;

            tagAtualAlterada.valor = novoValor;
            tagAtualAlterada.data = new Date();
            tagAtualAlterada.estado = {
                ...tagAtualAlterada.estado,
                IsJaLeuSucesso: true,
                isTagExiste: true,
                motivoNaoLida: {
                    descricao: ''
                }
            }
        }

        // Processar cada observador
        for (const observador of observadoresInteressados.observadores) {
            this.log(`Disparando observador ID ${observador.idEscuta}..`);

            try {
                observador.callbackUsuario(valorAnterior, novoValor);
            } catch (ex) {
                this.log(`Erro ao disparar observador ID ${observador.idEscuta}: ${ex}`);
            }

        }

        this.log(`Processando de alterações pra tag ${tagAlterada} finalizada.`);
    }

    /**
     * Recadastra todos os observadores atuais novamente
     */
    async #recadastrarObservadores() {
        this.log(`Recadastrando todos os observadores...`);

        // Passar por cada observador existente e solicitar o recadastro dela no subscribe

        for (const tagObservada of this.estado.observadoresDeTags) {
            this.log(`Recadastrando subscribe da tag ${tagObservada.nome}...`);

            let statusLeituraTag = await this.lerTag(tagObservada.nome);
            if (statusLeituraTag.isSucesso) {
                this.estado.CompactLogixInstancia.subscribe(statusLeituraTag.sucesso.tagLida.objetoTagEstatisticas);
            }
        }
    }

    /**
     * Escrever um log desse store
     * @param {String} msg - String ou objeto para mostrar no console
     */
    log(msg) {
        let conteudoMsg = ''
        if (typeof msg == 'object') {
            conteudoMsg = JSON.stringify(msg, null, 4);
        } else {
            conteudoMsg = msg;
        }

        this.logger.log(`[CompactLogix ${this.configuracao.ip}] ${conteudoMsg}`)
    }
}   