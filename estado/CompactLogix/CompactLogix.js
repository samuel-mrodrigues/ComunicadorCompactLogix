import { Logger } from "../../utils/Logger.js";
import { getLogger as LoggerEstado } from "../estado.js"

import { Controller, Tag, ControllerManager } from "st-ethernet-ip";

import NodeDrivers from "node-drivers";
import Logix5000 from "node-drivers/src/layers/cip/layers/Logix5000/index.js";
import TCPLayer from "node-drivers/src/layers/tcp/index.js";

/**
 * Gerenciar uma conexão com um CompactLogix
 */
export class CompactLogix {

    /**
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
         * @type {Logix5000}
         */
        CompactLogixInstanciaNodeDriver: undefined,
        /**
         * @type {CompactLogix}
         */
        CompactLogixInstancia: undefined
    }

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

    /**
     * Conectar-se ao CompactLogix
     */
    async conectar1() {
        let resultadoConexao = {
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
                isTempoConexaoExcedido: false
            }
        }

        this.logger.log(`Tentando conectar ao CompactLogix ${this.configuracao.ip}`);

        const tcpIp = new NodeDrivers.TCP(`${this.configuracao.ip}`)
        const clp = new NodeDrivers.CIP.Logix5000(tcpIp,);

        this.estado.tcpIP = tcpIp;
        this.estado.CLP = clp;

        try {
            let resultadoConectado = await clp.readControllerAttributes();


            resultadoConexao.isConectado = true;
        } catch (ex) {
            resultadoConexao.erro.descricao = ex.message;

            if (ex.message == 'TCP layer connect timeout') {
                resultadoConexao.erro.isTempoConexaoExcedido = true;
            }
        }

        return resultadoConexao;
    }

    /**
     * Conectar-se ao CompactLogix
     */
    async conectar2() {
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
                 * Não deu pra reconhecer o tipo do erro ocorrido. Acredite na descrição
                 */
                isErroDesconhecido: false,
            }
        }

        this.logger.log(`Tentando conectar ao CompactLogix ${this.configuracao.ip}`);

        // Instanciar o controller
        const controller = new Controller(true);
        this.estado.CompactLogixInstancia = controller;

        controller.on('close', () => {
            console.log('Connection closed');
        });

        controller.on('data', (data) => {
            console.log('Data received', data.toString());
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
            await controller.connect(this.configuracao.ip, undefined, false)

            await controller.readControllerProps();
            this.propriedades = {
                ...this.propriedades,
                nome: controller.properties.name,
                serial: controller.properties.serial_number,
                slot: controller.properties.slot,
                versao: controller.properties.version
            }

            console.log(controller.state);

        } catch (ex) {
            console.log(`Erro ao conectar com o CLP: ${ex}`);

            if (ex.message.includes('TIMEOUT')) {
                retornoConexao.erro.isTempoConexaoExcedido = true;
            } else {
                retornoConexao.erro.isErroDesconhecido = true;
            }

            retornoConexao.erro.descricao = ex.message;
        }

        return retornoConexao;
    }
}