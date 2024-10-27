// import { Controller, Tag, ControllerManager } from "st-ethernet-ip"



import NodeDrivers from "node-drivers";
import Logix5000 from "node-drivers/src/layers/cip/layers/Logix5000/index.js";
import TCPLayer from "node-drivers/src/layers/tcp/index.js";

import ModbusCliente from "jsmodbus"
import net from "net"
import { Tag, Controller, TagGroup } from "st-ethernet-ip";


async function iniciar() {
    console.log(`Iniciando testes`);

    const tcpIp = new NodeDrivers.TCP('192.168.3.120')
    const clp = new NodeDrivers.CIP.Logix5000(tcpIp);

    const lerTag = async (tag) => {
        return new Promise(async (resolve, reject) => {
            const resposta = await clp.readTag(tag);

            return resolve(resposta);
        });
    }

    const datAgora = new Date();
    console.log(`Iniciando leitura de tags: ${datAgora.getTime()}`);
    let resultadoLeitura = await lerTag('BD_G2_MOTIVO_DIA_1')
    const dataFim = new Date();
    console.log(resultadoLeitura);
    console.log(`Finalizado leitura em ${dataFim.getTime()}. Tempo decorrido: ${dataFim.getTime() - datAgora.getTime()} ms`);

}

async function iniciar2() {
    const controller = new Controller(true);

    controller.on('close', () => {
        console.log('Connection closed');
    });

    controller.on('data', (data) => {
        // console.log('Data received', data.toString());
    })

    controller.on('error', (err) => {
        console.log('An error occurred', err);
    });

    controller.on('ready', async () => {
        console.log('Ready');
    });

    controller.on('connect', () => {
        console.log('Connected to PLC');
    });

    controller.on('timeout', () => {
        console.log('Timeout');
    })

    controller.on('end', () => {
        console.log('End');
    });

    try {
        const statusConecta = await controller.connect('192.168.3.120')
    } catch (ex) {
        console.log(`Erro ao conectar com o CLP: ${ex}`);
    }

    console.log(`Inicializando leitura de tags...`);

    const cadastraList = (tag) => {
        tagPraLer.on('Changed', (tag) => {
            console.log(`Tag ${tag.name} mudou`);
        });

        tagPraLer.on('Initialized', (tag) => {
            console.log(`Tag ${tag.name} inicializada`);
            console.log(tag);
        })

        tagPraLer.on('KeepAlive', (tag) => {
            console.log(`Tag ${tag.name} keep alive`);
        })

        tagPraLer.on('Unknown', (tag) => {
            console.log(`Tag ${tag.name} desconhecida`);
        })
    }

    console.log(`Iniciando leitura de group tag`);

    const tagPraLer = new Tag('BD_D1_MOTIVO_DIA1[3]');
    const tagPraLer2 = new Tag('TESTE2');
    cadastraList(tagPraLer);
    cadastraList(tagPraLer2);

    const tagGroup = new TagGroup();
    tagGroup.add(tagPraLer);
    tagGroup.add(tagPraLer2);

    let resultado = await controller.readTagGroup(tagGroup)
    console.log(resultado);

    return;

    while (true) {
        const datAgora = new Date();
        console.log(`Iniciando leitura de tags: ${datAgora.getTime()}`);

        const tagPraLer = new Tag('BD_D1_MOTIVO_DIAAA1');
        // controller.subscribe(tagPraLer)
        try {
            await controller.readTag(tagPraLer)
        } catch (ex) {
            console.log(`Erro ao ler tag: ${ex}`);

            try {
                controller.destroy();
            } catch (ex) {
                console.log(ex);
            }

            try {
                await controller.connect('192.168.3.120')
            } catch (ex) {
                console.log(ex);
            }
        }

        const dataFim = new Date();
        console.log(tagPraLer.value);
        console.log(`Finalizado leitura em ${dataFim.getTime()}. Tempo decorrido: ${dataFim.getTime() - datAgora.getTime()} ms`);

        console.log(controller.state);
    }
}

async function iniciar3() {
    console.log(`Iniciando teste...`);

    const hdmiTeste = new Controller(false);

    hdmiTeste.on('close', () => {
        console.log('Evento detectado: A conexão foi fechada.');
        this.estado.isConectado = false;
    });

    hdmiTeste.on('data', (data) => {
        // console.log(`Evento detectado: Novos dados recebidos: ${data.toString()}`);
    })

    hdmiTeste.on('error', (err) => {
        console.log(`Evento detectado: Erro ocorrido: ${JSON.stringify(err)}`);
    });

    hdmiTeste.on('ready', async () => {
        console.log('Evento detectado: Pronto');
    });

    hdmiTeste.on('connect', () => {
        console.log(`Evento detectado: Conectado`);
    });

    hdmiTeste.on('timeout', () => {
        console.log('Evento detectado: Timeout');
    })

    hdmiTeste.on('end', () => {
        console.log('Evento detectado: Fim de conexão');
    });

    hdmiTeste.connect('192.168.3.119');

}

function iniciar4() {
    console.log(`Iniciando teste 4...`);

    // Criar cliente TCP
    const socket = new net.Socket();
    const client = new ModbusCliente.client.TCP(socket);

    socket.connect({ host: '192.168.3.119', port: 502 }, () => {
        console.log(`Conectado ao MicroLogix`);

        // client.readHoldingRegisters(0, 2).then((resposta) => {
        //     console.log(resposta.response._body.valuesAsArray);
        //     // console.log(resposta);

        // }).catch((ex) => {
        //     console.log(`Erro ao ler registradores`);
        //     console.log(ex);

        // });

        client.writeSingleRegister(0, 33).then((resposta) => {
            console.log(resposta);
        }).catch((ex) => {
            console.log(`Erro ao escrever registrador`);
            console.log(ex);
        })

        // client.readCoils(1, 1).then((resposta) => {
        //     console.log(resposta);
        // }).catch((ex) => {
        //     console.log(`Erro ao ler coils`);
        //     console.log(ex);
        // });
    });
}

function iniciar5() {

    // Criar um controlador
    const PLC = new Controller(false);


    // Definir o endereço IP do PLC
    PLC.connect('192.168.3.120').then(() => {

        console.log("Conectado ao PLC");

        const tags = new TagGroup();
        tags.add(new Tag('BD_D1_MOTIVO_DIA1'));
        tags.add(new Tag('TESTE'));
        tags.add(new Tag('TESTE2'))


        PLC.readTagGroup(tags);

        // // Ler dados de uma tag
        // PLC.readTag('N7:0').then(tag => {
        //     console.log(`Valor da tag N7:0: ${tag.value}`);
        // }).catch(err => console.log(err));

        // // Escrever um valor para uma tag
        // PLC.writeTag('N7:0', 42).then(() => {
        //     console.log("Escreveu 42 em N7:0");
        // }).catch(err => console.log(err));
    });
}

/**
 * Gerencia a conexão com um CompactLogix V2
 */
export class CompactLogixV2 {

    #configuracoes = {
        ip: '',
        /**
         * Configuraçoes do comportamento da leitura de tags
         */
        leitura: {
            /**
             * Tempo em millisegundos que deve ocorrer as leituras das tags pendentes de leituras
            */
            tempoMinimoEntreLeituras: 1400
        },
        /**
         * Configurações do comportamento das escritas de tags
         */
        escrita: {
            /**
             * Tempo em millisegundos que deve ocorrer as escritas das tags pendentes de escritas
             */
            tempoMinimoEntreEscritas: 1400
        }
    }

    /**
    * @callback CallbackConfirmaLeituraTag
    * @param {String} tag - Tag que foi lido
    * @param {String} valor - Valor lido da tag
    * @param {String} erro - Se ocorreu algum erro, descreve o erro
    */

    /**
     * @typedef LeituraTagResultado
     * @property {String} tag - Tag que foi lido
     * @property {*} valor - Valor lido da tag
     * @property {String} erro - Se ocorreu algum erro, descreve o erro
     * @property {Boolean} isRecebido - Se essa tag foi recebida(sendo sucesso ou não)
     * @property {Boolean} isLeituraSucesso - Se a leitura recebida foi sucesso com um valor valido
     */

    /**
     * @typedef PromiseLeituraTag
     * @property {Number} id - ID unico incremental
     * @property {LeituraTagResultado[]} tags - Tags da leitura
     * @property {CallbackConfirmaLeituraTag} confirmaTag - Função a ser chamada para confirmar a leitura de uma tag
     * @property {Number} idTimeout - ID do setTimeout caso demore demais para a leitura das tags 
     */

    /**
     * @callback CallbackConfirmaEscritaTag
     * @param {String} tag - A tag que foi escrita
     * @param {String} erro - Se ocorreu um erro, contém o motivo de não ter escrevido
     */

    /**
     * @typedef EscritaTagResultado
     * @property {String} tag - Tag no CompactLogix
     * @property {*} valor - Valor a ser escrito na tag
     * @property {Boolean} isEscritoSucesso - Se a escrita foi confirmada no CompactLogix
     * @property {Boolean} isRecebido - Se o retorno da tag foi escrita com sucesso ou não
     * @property {String} erro - Descrição do erro se não confirmou a escrita
     */

    /**
     * @typedef PromiseEscritaTag
     * @property {Number} id - ID unico incremental
     * @property {EscritaTagResultado[]} tags - Tags a serem escritas
     * @property {CallbackConfirmaEscritaTag} confirmaEscrita - Confirma a escrita de uma tag
     * @property {Number} idTimeout - ID do setTimeout caso demore demais para a escrita das tags
     */

    /**
     * Controle de estado com o CompactLogix
     */
    #estado = {
        /**
         * Estado de conectar
         */
        conectar: {
            /**
             * Se atualmente está tentando ser feito uma conexão com o CompactLogix
             */
            isConectando: false,
            /**
             * Se atualmente está conectado ao CompatLogix
             */
            isConectado: false
        },
        /**
         * Instancia da biblioteca de Controller que comunica via EtherNet IP via protocolo CIP
         * @type {Controller}
         */
        controller: undefined,
        /**
         * Estado de leituras de tags
         */
        leituras: {
            /**
             * Tags que estão na fila de pendentes para serem lidas
             * @type {PromiseLeituraTag[]}
             */
            pendentesDeLeitura: [],
            /**
             * Se existe uma chamada de leitura pendente para executar
             */
            isLeituraPendente: false,
            /**
             * Se a leitura está sendo executada, ou seja aguardando a resposta do CompactLogix
             */
            isLeituraExecutando: false,
            /**
             * Data da última vez que foi executado a leitura das tags no CompactLogix
             * @type {Date}
             */
            dataUltimaExecucao: undefined
        },
        /**
         * Estado de escrita de tags
         */
        escritas: {
            /**
             * Tags que estão na fila para serem escritas
             * @type {PromiseEscritaTag[]}
             */
            pendentesDeEscrita: [],
            /**
             * Se já existe uma chamada pendente que será executada
             */
            isEscritaPendente: false,
            /**
             * Se esta atualmente executando a escrita das tags no CompactLogix
             */
            isEscritaExecutando: false,
            /**
             * Data em que ocorreu a ultima execução de escrita de tags
             */
            dataUltimaExecucao: undefined
        }
    }

    /**
     * Instanciar uma nova conexão com um CompactLogix
     * @param {Object} propsConexao - Propriedades de conexão
     * @param {String} propsConexao.ip - Endereço IP do CompactLogix
     */
    constructor(propsConexao) {
        if (propsConexao == undefined) {
            throw new Error('As propriedades de conexão não foram informadas.');
        }

        if (propsConexao.ip == undefined) {
            throw new Error('O endereço IP do CompactLogix não foi informado.');
        }

        this.#configuracoes.ip = propsConexao.ip;
    }

    /**
     * Iniciar a conexão com o CompactLogix
     */
    async conectar() {
        const retornoConexao = {
            /**
             * Se conectou com sucesso
             */
            isConectado: false,
            /**
             * Se está atualmente tentando conectar
             */
            isConectando: false,
            /**
             * Se não estiver conectado ou conectando, contém detalhes do erro
             */
            erro: {
                descricao: ''
            }
        }

        this.log(`Conectando-se ao CompactLogix...`)

        // Se já tiver uma conexão pendente, retorna que já está conectando
        if (this.#estado.conectar.isConectando) {
            retornoConexao.erro = {
                descricao: 'Já existe uma solicitação de conexão pendente...'
            }

            return retornoConexao;
        } else {
            // Setar o estado pra conetando
            this.#estado.conectar.isConectando = true;
        }

        // Setar como modo conectado que evita overhead em novas solicitações enquanto conectado.
        this.#estado.controller = new Controller(true);
        this.#capturarEventosTCP();

        try {
            await this.#estado.controller.connect(this.#configuracoes.ip);

            // Setar como conectado
            this.#estado.conectar.isConectado = true;
            this.#estado.conectar.isConectando = false;

            this.log(`Conectado com sucesso ao CompactLogix`);
        } catch (ex) {
            this.log(`Ocorreu um erro de conexão com o CompactLogix. Razão: ${ex.message}`);
            console.log(ex);
        }
    }

    /**
     * Cadastrar os eventos de eventos da conexão TCP com o CompactLogix
     */
    #capturarEventosTCP() {
        if (this.#estado.controller == undefined) {
            this.log(`Não foi possível iniciar a captura dos eventos da conexão TCP pois o controller não foi instanciado.`);
            return;
        }

        this.#estado.controller.on('close', () => {
            this.log(`Conexão TCP: Conexão com o CompactLogix fechada..`);
        });

        this.#estado.controller.on('data', (data) => {
            // this.log(`Conexão TCP: Dados: ${data.toString()}`);
        });

        this.#estado.controller.on('error', (err) => {
            this.log(`Conexão TCP: Erro ocorrido: ${err.message}`);
        });

        this.#estado.controller.on('ready', () => {
            this.log(`Conexão TCP: Pronto`);
        });

        this.#estado.controller.on('connect', () => {
            this.log(`Conexão TCP: Conectado`);
        });

        this.#estado.controller.on('timeout', () => {
            this.log(`Conexão TCP: Timeout`);
        });

        this.#estado.controller.on('end', () => {
            this.log(`Conexão TCP: Fim de conexão`);
        });
    }

    /**
     * @typedef LeituraTagResultado
     * @property {String} tag - Tag lido
     * @property {String} valor - Valor lido da tag
     * @property {String} erro - Se ocorreu algum erro, descreve o erro
     * @property {Boolean} isRecebido - Se essa tag foi recebido(sendo sucesso ou não)
     * @property {Boolean} isLeituraSucesso - Se a leitura recebida foi sucesso com um valor valido
     */

    /**
     * @typedef RetLerTags
     * @property {Boolean} isSucesso - Se a leitura foi sucesso
     * @property {Object} sucesso - Tags lidas com sucesso
     * @property {LeituraTagResultado[]} sucesso.tags - Tags lidas com sucesso
     * @property {Object} erro - Descrição do erro ocorrido
     * @property {String} erro.descricao - Descrição do erro ocorrido
     */

    /**
     * Ler tags no CompactLogix
     * @param {Array<String>} tags - Array de tags string a serem lidas
     */
    lerTags(tags) {

        /**
         * @type {RetLerTags}
         */
        let retornoLeitura = {
            isSucesso: false,
            sucesso: {
                tags: []
            },
            erro: {
                descricao: ''
            }
        }

        // Precisa ser um array de tags
        if (tags == undefined || Array.isArray(tags) == false) {
            throw new Error('As tags a serem lidas não foram informadas ou não são um array.');
        }

        // Tags que vão ser adicionados na leitura
        let tagsDesejadas = [];
        for (const tagString of tags) {
            if (typeof tagString != 'string') {
                retornoLeitura.erro.descricao = `A tag informada não é uma string: ${tagString}`;

                return retornoLeitura;
            }

            tagsDesejadas.push(tagString);
        }

        /**
         * @type {PromiseLeituraTag}
         */
        let novaLeitura = {
            id: this.#estado.leituras.pendentesDeLeitura.length + 1,
            tags: [],
            confirmaTag: () => { },
            idTimeout: -1
        }

        // Adicionar o status das tags pro retorno
        for (const tagString of tagsDesejadas) {
            novaLeitura.tags.push({
                tag: tagString,
                valor: undefined,
                erro: undefined,
                isRecebido: false,
                isLeituraSucesso: false
            })
        }

        const logLeitura = (string) => {
            this.log(`[Leitura Tag] (${novaLeitura.id} ${tagsDesejadas.join(', ')}) ${string}`);
        }

        const promiseAguarda = new Promise((resolve) => {

            // Essa função é utilizada para confirmar a leitura de uma tag
            const confirmaLeituraTag = (tag, valor, algumErro) => {

                // Encontrar a tag confirmada na lista de tags pendentes
                const tagObj = novaLeitura.tags.find(t => t.tag == tag);
                if (tagObj != undefined) {

                    // Se a tag já foi recebida, eu só ignoro
                    if (tagObj.isRecebido) {
                        logLeitura(`A tag ${tag} já foi confirmada anteriormente. Ignorando...`);
                        isTodosConfirmados();
                        return;
                    }

                    // Se teve sucesso na leitura, algumErro será nullo
                    if (algumErro == undefined) {
                        logLeitura(`Tag ${tag} confirmada com o valor: ${valor}`);
                    } else {
                        logLeitura(`Tag ${tag} confirmada com erro: ${algumErro}`);
                    }

                    tagObj.isRecebido = true;
                    tagObj.valor = valor;
                    tagObj.erro = algumErro;

                    // Verificar se todas as tags já foram confirmadas e se sim, resolver a promise
                    isTodosConfirmados();
                } else {
                    logLeitura(`Tag ${tag} não foi encontrada na lista de tags pendentes.`);
                }
            }

            // Valida se todas as tags foram lidas
            const isTodosConfirmados = () => {
                const tagsAguardandoConfirmacao = novaLeitura.tags.filter(t => t.isRecebido == false);
                if (tagsAguardandoConfirmacao.length == 0) {
                    retornoLeitura.isSucesso = true;

                    // Cancelar o timeout de leitura
                    clearTimeout(novaLeitura.idTimeout);

                    // Remover da lista de leituras pendentes
                    this.#estado.leituras.pendentesDeLeitura = this.#estado.leituras.pendentesDeLeitura.filter(l => l.id != novaLeitura.id);
                    logLeitura(`Todas as tags foram confirmadas. Resolvendo a promise...`);

                    retornoLeitura.sucesso.tags = novaLeitura.tags.map(t => {
                        return {
                            valor: t.valor,
                            erro: t.erro,
                            isLeituraSucesso: t.isLeituraSucesso,
                            isRecebido: t.isRecebido,
                            tag: t.tag
                        }
                    })

                    return resolve(retornoLeitura);
                } else {
                    logLeitura(`Aguardando confirmações das tags ${tagsAguardandoConfirmacao.map(t => t.tag).join(', ')}...`);
                }
            }

            // Inicia um setTimeout para retornar caso demore na leitura das tags
            novaLeitura.idTimeout = setTimeout(() => {
                const tagsAguardandoConfirmacao = novaLeitura.tags.filter(t => t.isRecebido == false);

                tagsAguardandoConfirmacao.forEach(t => {
                    t.erro = 'O CompactLogix demorou para retornar a leitura da tag.';
                    t.isRecebido = true;
                })

                // Se pelo menos alguma tag ocorreu sucesso, eu considero que a leitura foi sucesso
                if (tagsAguardandoConfirmacao.length != novaLeitura.tags.length) {
                    retornoLeitura.isSucesso = true;
                } else {
                    // Se todas as tags deram erro de leitura, não devo considerar com sucesso.
                    retornoLeitura.erro.descricao = `Timeout ocorrido para todas as leituras de tags`;
                }

                logLeitura(`Timeout de leitura ocorrido para as tags: ${tagsAguardandoConfirmacao.map(t => t.tag).join(', ')}. Resolvendo promise...`);

                retornoLeitura.sucesso.tags = novaLeitura.tags.map(t => {
                    return {
                        valor: t.valor,
                        erro: t.erro,
                        isLeituraSucesso: t.isLeituraSucesso,
                        isRecebido: t.isRecebido,
                        tag: t.tag
                    }
                })
                return resolve(retornoLeitura);
            }, 10000);
            novaLeitura.confirmaTag = confirmaLeituraTag;
        })

        // Adicionar essa leitura pendente a lista para ser lida quando possível
        this.#estado.leituras.pendentesDeLeitura.push(novaLeitura);

        this.#triggerLeituraTags();
        return promiseAguarda;
    }

    /**
     * @typedef RetEscrituraTag
     * @property {String} tag - Tag que foi esrita
     * @property {Boolean} isRecebido - Se recebeu uma confirmação(de sucesso ou erro) da tag
     * @property {Boolean} isEscritaSucesso - Se a escritura foi realizada com sucesso no CompactLogix
     * @property {String} erro - Se ocorreu algum erro, descreve o erro
     */

    /**
     * @typedef RetEscreverTags
     * @property {Boolean} isSucesso - Se a escrita foi sucesso
     * @property {Object} sucesso - Tags escritas com sucesso
     * @property {RetEscrituraTag[]} sucesso.tags - Tags escritas com sucesso
     * @property {Object} erro - Descrição do erro ocorrido
     * @property {String} erro.descricao - Descrição do erro ocorrido
     */

    /**
     * Escrever tags no CompactLogix
     * @param {Object[]} tags - Tags para escrever no CompactLogix
     * @param {String} tags[].tag - Tag a ser escrita
     * @param {*} tags[].valor - Valor a ser escrito na tag
     */
    async escreverTags(tags) {

        /**
         * @type {RetEscreverTags}
         */
        let retornoEscrita = {
            isSucesso: false,
            sucesso: {
                tags: []
            },
            erro: {
                descricao: ''
            }
        }

        // Se não foi informado um array válido de tags, retornar erro
        if (tags == undefined || Array.isArray(tags) == false) {
            throw new Error('As tags a serem escritas não foram informadas ou não são um array.');
        }

        /**
         * @type {PromiseEscritaTag}
         */
        let novaEscrita = {
            id: this.#estado.escritas.pendentesDeEscrita.length + 1,
            tags: [],
            confirmaEscrita: () => { }
        }

        // Adicionar as tags a serem escritas
        for (const tag of tags) {
            novaEscrita.tags.push({
                tag: tag.tag,
                valor: tag.valor,
                erro: undefined,
                isEscritoSucesso: false,
                isRecebido: false
            })
        }

        const logEscrita = (string) => {
            this.log(`[Leitura Tag] (${novaEscrita.id} ${novaEscrita.tags.map(t => t.tag).join(', ')}) ${string}`);
        }

        const promiseAguardaEscrita = new Promise((resolve) => {

            // Vincular a função de confirmação de escrita de tag
            novaEscrita.confirmaEscrita = (tag, erro) => {
                const tagObj = novaEscrita.tags.find(t => t.tag == tag);

                if (tagObj != undefined) {

                    // Se a tag já foi recebida
                    if (tagObj.isRecebido) {
                        logEscrita(`A tag ${tag} já foi confirmada anteriormente. Ignorando...`);
                        isTudoOk();
                        return;
                    }

                    if (erro == undefined) {
                        logEscrita(`Tag '${tag}' confirmada a escrita com sucesso.`);
                        tagObj.isEscritoSucesso = true;
                    } else {
                        logEscrita(`Tag '${tag}' confirmada com erro. Erro: ${erro}`);
                        tagObj.erro = erro;
                    }

                    tagObj.isRecebido = true;
                    isTudoOk();
                } else {
                    logEscrita(`Tag ${tag} não foi encontrada na lista de tags pendentes de escrita.`);
                }
            }

            const isTudoOk = () => {
                // Valida se todas as escritas foram realizadas com sucesso pra retornar a mensagem
                const escritasAguardando = novaEscrita.tags.filter(t => t.isRecebido == false);

                if (escritasAguardando.length == 0) {
                    retornoEscrita.isSucesso = true;

                    // Cancelar o timeout de escrita
                    clearTimeout(novaEscrita.idTimeout);

                    logEscrita(`Todas as tags foram confirmadas. Resolvendo a promise...`);

                    retornoEscrita.sucesso = novaEscrita.tags.map(t => {
                        return {
                            tag: t.tag,
                            valor: t.valor,
                            isEscritoSucesso: t.isEscritoSucesso,
                            erro: t.erro,
                            isRecebido: t.isRecebido
                        }
                    })

                    resolve(retornoEscrita);
                } else {
                    logEscrita(`Aguardando confirmações das tags ${escritasAguardando.map(t => t.tag).join(', ')}...`);
                }
            }

            // Definir o timeout se demorar para receber as confirmações
            novaEscrita.idTimeout = setTimeout(() => {
                const escritasAguardando = novaEscrita.tags.filter(t => t.isRecebido == false);

                escritasAguardando.forEach(t => {
                    t.erro = 'O CompactLogix demorou para retornar a escrita da tag.';
                    t.isRecebido = true;
                })

                // Se pelo menos alguma tag ocorreu sucesso, eu considero que a leitura foi sucesso
                if (escritasAguardando.length != novaEscrita.tags.length) {
                    retornoEscrita.isSucesso = true;
                } else {
                    // Se todas as tags deram erro de leitura, não devo considerar com sucesso.
                    retornoEscrita.erro.descricao = `Timeout ocorrido para todas as escritas de tags`;
                }

                logEscrita(`Timeout de escrita ocorrido para as tags: ${escritasAguardando.map(t => t.tag).join(', ')}. Resolvendo promise...`);

                retornoEscrita.sucesso = novaEscrita.tags.map(t => {
                    return {
                        tag: t.tag,
                        valor: t.valor,
                        isEscritoSucesso: t.isEscritoSucesso,
                        erro: t.erro,
                        isRecebido: t.isRecebido
                    }
                })

                return resolve(retornoEscrita);
            }, 999999999);

        })

        // Adicionar ao array de escritas pendentes
        this.#estado.escritas.pendentesDeEscrita.push(novaEscrita);

        logEscrita(`Adicionado a lista de escritas pendentes`);

        // Triggar a escritura de tags se possível
        this.#triggerEscreverTags();

        return promiseAguardaEscrita;
    }

    /**
     * Inicia a leitura das tags que estão pendentes
     */
    async #triggerLeituraTags() {

        // Se já tiver uma chamada de leitura pendente, não deixar iniciar outra
        if (this.#estado.leituras.isLeituraPendente) {
            this.log(`Já existe uma chamada de leitura pendente. Ignorando...`);
            return;
        }

        // Se já tiver uma chamada de leitura em execução e aguardando a resposta do CompactLogix
        if (this.#estado.leituras.isLeituraExecutando) {
            this.log(`Já existe uma chamada de leitura em execução no CompactLogix. Ignorando...`);
            return;
        }

        let dataAgra = new Date();
        const diffMsUltimaExecucao = dataAgra.getTime() - (this.#estado.leituras.dataUltimaExecucao != undefined ? this.#estado.leituras.dataUltimaExecucao.getTime() : this.#configuracoes.leitura.tempoMinimoEntreLeituras + 1);

        // Se o tempo desde a ultima leitura ainda não atingiu o tempo minimo de espera
        if (this.#estado.leituras.dataUltimaExecucao != undefined && (diffMsUltimaExecucao < this.#configuracoes.leitura.tempoMinimoEntreLeituras)) {
            this.#estado.leituras.isLeituraPendente = true;
            let diffRestante = this.#configuracoes.leitura.tempoMinimoEntreLeituras - diffMsUltimaExecucao;

            setTimeout(() => {
                this.#estado.leituras.isLeituraPendente = false;
                this.#triggerLeituraTags();
            }, diffRestante);

            return;
        }

        this.#estado.leituras.dataUltimaExecucao = dataAgra;
        this.log(`Iniciando leitura de tags pendentes...`);
        this.#estado.leituras.isLeituraExecutando = true;

        // Array de string contendo as tags para ler
        const listaDeTagsParaLer = [];

        // Pra cada leitura pendente, coletar as tags que preciso adicionar no TagGroup pra solicitar
        for (const leituraTag of this.#estado.leituras.pendentesDeLeitura) {
            leituraTag.tags.forEach(tag => {
                if (listaDeTagsParaLer.indexOf(tag.tag) == -1) {
                    listaDeTagsParaLer.push(tag.tag);
                }
            });
        }

        // Iniciar a leitura das tags pendentes
        const tagsParaLer = new TagGroup();

        listaDeTagsParaLer.forEach(tag => {
            tagsParaLer.add(new Tag(tag));
        })

        // Iniciar a solicitação de leitura
        try {
            await this.#estado.controller.readTagGroup(tagsParaLer);
        } catch (ex) {
            this.log(`Erro ao solicitar as tags pro CompactLogix: ${ex.message}`);

            this.#estado.leituras.isLeituraExecutando = false;
            return;
        }

        // Passar por cada requisição de leitura de tag
        for (const leituraDeTag in tagsParaLer.state.tags) {
            let informacoesDeTagCIP = tagsParaLer.state.tags[leituraDeTag];

            // Encontrar todas as leituras pendentes que possuem essa tag no meio
            const leiturasPendentesDeTag = this.#estado.leituras.pendentesDeLeitura.filter(l => l.tags.find(t => t.tag == informacoesDeTagCIP.name) != undefined);

            if (leiturasPendentesDeTag.length == 0) {
                this.log(`Não há leituras pendentes para a tag ${informacoesDeTagCIP.name}. Ignorando...`);
                continue;
            }

            this.log(`Leitura da tag ${informacoesDeTagCIP.name} tem ${leiturasPendentesDeTag.length} callbacks pendentes.`);

            // Passar por cada leitura que quer a confirmação da tag atual
            for (const leituraPendente of leiturasPendentesDeTag) {

                // Se a tag tiver um type valido, ela existe no CompactLogix
                if (informacoesDeTagCIP.type != undefined) {
                    leituraPendente.confirmaTag(informacoesDeTagCIP.name, informacoesDeTagCIP.value, undefined);
                } else {
                    // Se o tipo for undefined, ela provavélmente é erro que não existe no CompactLogix
                    leituraPendente.confirmaTag(informacoesDeTagCIP.name, undefined, 'Tag não existe no CompactLogix. (O tipo está como undefined)');
                }
            }
        }

        this.#estado.leituras.isLeituraExecutando = false;
    }

    /**
     * Inicia a escrita das tags que estão pendentes
     */
    async #triggerEscreverTags() {
        if (this.#estado.escritas.isEscritaPendente) {
            this.log(`Já existe uma chamada de escrita pendente. Ignorando...`);
            return;
        }

        if (this.#estado.escritas.isEscritaExecutando) {
            this.log(`Já existe uma chamada de escrita em execução no CompactLogix. Ignorando...`);
            return;
        }

        let dataAgra = new Date();
        const diffMsUltimaExecucao = dataAgra.getTime() - (this.#estado.escritas.dataUltimaExecucao != undefined ? this.#estado.escritas.dataUltimaExecucao.getTime() : this.#configuracoes.escrita.tempoMinimoEntreEscritas + 1);

        // Se o tempo desde a ultima escrita ainda não atingiu o tempo minimo de espera
        if (this.#estado.escritas.dataUltimaExecucao != undefined && (diffMsUltimaExecucao < this.#configuracoes.escrita.tempoMinimoEntreEscritas)) {
            this.#estado.escritas.isEscritaPendente = true;
            let diffRestante = this.#configuracoes.escrita.tempoMinimoEntreEscritas - diffMsUltimaExecucao;

            setTimeout(() => {
                this.#estado.escritas.isEscritaPendente = false;
                this.#triggerLeituraTags();
            }, diffRestante);

            return;
        }

        this.#estado.escritas.dataUltimaExecucao = dataAgra;
        this.log(`Iniciando escrita de tags pendentes...`);
        this.#estado.escritas.isEscritaExecutando = true;

        /**
         * Tags para adicionar no grupo
         * @type {Tag[]}
         */
        const tagsParaEscrever = []

        // Passar por todas as escritas pendentes
        for (const escritaPendente of this.#estado.escritas.pendentesDeEscrita) {
            // Adicionar todas as tags que essa escrita pendente existe a lista

            for (const escrita of escritaPendente.tags) {

                let instanciaTag = tagsParaEscrever.find(t => t.name == escrita.tag);

                // Se a tag ainda não tiver sido adicionado, analisar ela pra adicionar
                if (instanciaTag == undefined) {

                    // Procurar as informações da tag pra instanciar
                    const metadadosTagDoControlador = this.#estado.controller.tagList.find(tagObj => tagObj.name == escrita.tag);

                    // Se achar a tag especificada no controlador
                    if (metadadosTagDoControlador != undefined) {
                        instanciaTag = new Tag(escrita.tag, null, metadadosTagDoControlador.type.code, 0, metadadosTagDoControlador.type.arrayDims, 0);
                    } else {
                        // Se não achar a tag especificada no controlador, adicionar ela com o valor undefined
                        instanciaTag = new Tag(escrita.tag, null, 196, 0, 0, 0);
                    }
                }


                instanciaTag.value = escrita.valor;
                tagsParaEscrever.push(instanciaTag);
            }
        }

        // Criar um tag group onde vou por todas as tags para escrever
        const grupoTagsParaEscrever = new TagGroup();
        tagsParaEscrever.forEach(tag => {
            grupoTagsParaEscrever.add(tag);
        });



        // Enviar ao CompactLogix a solicitação de escrita
        try {
            await this.#estado.controller.writeTagGroup(grupoTagsParaEscrever);
        } catch (ex) {
            this.log(`Erro ao solicitar escritura CIP para o CompactLogix: ${ex.message}`);
            this.#estado.escritas.isEscritaExecutando = false;
            return;
        }

        // Passar por todas as tags no grupo e notificar as confirmações pendentes que foram escritas
        for (const escritaTag in grupoTagsParaEscrever.state.tags) {
            let informacoesDeTagCIP = grupoTagsParaEscrever.state.tags[escritaTag];

            // Encontrar todas as escritas pendentes que possuem essa tag no meio
            const escritasPendentesDeTag = this.#estado.escritas.pendentesDeEscrita.filter(e => e.tags.find(t => t.tag == informacoesDeTagCIP.name) != undefined);

            if (escritasPendentesDeTag.length == 0) {
                this.log(`Não há escritas pendentes para a tag ${informacoesDeTagCIP.name}. Ignorando...`);
                continue;
            }

            this.log(`Escrita da tag ${informacoesDeTagCIP.name} tem ${escritasPendentesDeTag.length} callbacks pendentes.`);

            // Passar por cada escrita que quer a confirmação da tag atual
            for (const escritaPendente of escritasPendentesDeTag) {

                // Se a tag tiver um type valido, ela existe no CompactLogix
                if (informacoesDeTagCIP.type != undefined) {
                    escritaPendente.confirmaEscrita(informacoesDeTagCIP.name, undefined);
                } else {
                    // Se o tipo for undefined, ela provavélmente é erro que não existe no CompactLogix
                    escritaPendente.confirmaEscrita(informacoesDeTagCIP.name, 'Tag não existe no CompactLogix. (O tipo está como undefined)');
                }
            }
        }

        this.#estado.escritas.isEscritaExecutando = false;
    }

    /**
     * Retorna a classe controladora CIP
     */
    getControladorCIP() {
        return this.#estado.controller;
    }

    /**
     * Anotar um log no console
     * @param {String} msg 
     */
    log(msg) {
        console.log(`[CompactLogixV2 ${this.#configuracoes.ip}] ${msg}`);
    }
}

async function iniciar6() {
    let testeCompact = new CompactLogixV2({ ip: '192.168.3.120' });

    await testeCompact.conectar();

    await testeCompact.escreverTags([{ tag: 'xablauziho', valor: 3 }, { tag: 'TESTE', valor: 4 }]);



}

iniciar5();

