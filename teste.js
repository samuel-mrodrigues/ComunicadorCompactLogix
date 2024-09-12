import { CompactLogix } from "./estado/CompactLogix/CompactLogix.js";

const novoCompact = new CompactLogix('192.168.3.120')


async function testeIniciar() {
    console.log(`Testando...`);

    await novoCompact.conectar();

    console.log(`Testando tags!`);
}

testeIniciar();
