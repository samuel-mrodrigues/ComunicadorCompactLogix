/**
 * Copia todos os valores de objetoAlvo para objetoOrigem
 * @param {{}} objetoTemplate - Objeto contendo as chaves que deseja copiar do alvo
 * @param {*} objetoAlvo - Objeto contendo chaves e valores que serão usados para copiar
 ** Valores do tipo primitivo(string, numero, boolean) serão copiados diretamente
 ** Objetos serão copiados recursivamente da mesma forma que o objeto original
 ** Para arrays, informe o valor que deverá ser retornado(se for um objeto, informe o objeto com as chaves)
 * @returns {Object} - Retorna um novo objeto com as chaves e valores copiados
 */
export function copiarParaObjeto(objetoTemplate, objetoAlvo) {
    for (const chave in objetoTemplate) {
        if (objetoAlvo.hasOwnProperty(chave)) {
            if (typeof objetoTemplate[chave] === 'object') {
                if (Array.isArray(objetoTemplate[chave])) {

                    const novoArray = []

                    if (objetoTemplate[chave].length != 0) {
                        const itemArrayTemplate = objetoTemplate[chave][0];
                        if (Array.isArray(objetoAlvo[chave]) && objetoAlvo[chave].length != 0) {
                            for (const itemAlvo of objetoAlvo[chave].filter(item => typeof item === typeof itemArrayTemplate)) {
                                let novoValor;
                                if (typeof itemArrayTemplate === 'object') {
                                    novoValor = JSON.parse(JSON.stringify(itemArrayTemplate))
                                    copiarParaObjeto(novoValor, itemAlvo);
                                } else {
                                    novoValor = itemAlvo;
                                }
                                novoArray.push(novoValor);
                            }
                        }
                    }

                    objetoTemplate[chave] = novoArray;
                } else {
                    copiarParaObjeto(objetoTemplate[chave], objetoAlvo[chave]);
                }
            } else {
                objetoTemplate[chave] = objetoAlvo[chave];
            }
        } else {
            if (typeof objetoTemplate[chave] === 'object') {
                if (Array.isArray(objetoTemplate[chave])) {
                    objetoTemplate[chave] = [];
                } else {
                    objetoTemplate[chave] = {}
                }
            }
        }
    }
}

/**
 * Pausa a execução do código por um determinado período de tempo
 * @param {number} milliseconds - O número de milissegundos para pausar a execução
 */
function pausar(milliseconds) {
    setTimeout(() => {
        // Continuar a execução do código após o período de pausa
    }, milliseconds);
}
