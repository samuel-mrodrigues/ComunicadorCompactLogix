/**
 * Formata uma data de acordo com a máscara fornecida
 * @param {Date} data - Objeto Date a ser formatado
 * @param {string} mascara - Máscara de formatação da data
 * @returns {string} - Data formatada
 */
export function formatarDataParaString(data, mascara) {
    const dia = data.getDate().toString().padStart(2, '0');
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    const ano = data.getFullYear().toString();

    let dataFormatada = mascara.replace('%dia%', dia);
    dataFormatada = dataFormatada.replace('%mes%', mes);
    dataFormatada = dataFormatada.replace('%ano%', ano);
    dataFormatada = dataFormatada.replace('%hora%', data.getHours().toString().padStart(2, '0'));
    dataFormatada = dataFormatada.replace('%minuto%', data.getMinutes().toString().padStart(2, '0'));
    dataFormatada = dataFormatada.replace('%segundo%', data.getSeconds().toString().padStart(2, '0'));
    dataFormatada = dataFormatada.replace('%millisegundo%', data.getMilliseconds().toString().padStart(3, '0'));

    return dataFormatada;
}