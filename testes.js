import { Controller, Tag, ControllerManager } from "st-ethernet-ip"

import NodeDrivers from "node-drivers";
import Logix5000 from "node-drivers/src/layers/cip/layers/Logix5000/index.js";
import TCPLayer from "node-drivers/src/layers/tcp/index.js";

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

    while (true) {
        const datAgora = new Date();
        console.log(`Iniciando leitura de tags: ${datAgora.getTime()}`);
        let resultadoLeitura = await lerTag('BD_D1_MOTIVO_DIA1')
        const dataFim = new Date();
        console.log(resultadoLeitura);
        console.log(`Finalizado leitura em ${dataFim.getTime()}. Tempo decorrido: ${dataFim.getTime() - datAgora.getTime()} ms`);
    }
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

    const tagPraLer = new Tag('BD_D1_MOTIVO_DIA1');
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

    controller.subscribe(tagPraLer);
    controller.scan_rate = 1000;
    let statusScan = controller.scan();

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

iniciar2();