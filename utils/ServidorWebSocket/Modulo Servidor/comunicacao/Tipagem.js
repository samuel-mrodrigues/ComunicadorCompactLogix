
/**
 * Tipos de transmissões possíveis.
 * @enum {String}
 */
export const TiposDeTransmissao = {
    SOLICITA_COMANDO: 'solicita_comando',
    RESPONDE_COMANDO: 'responde_comando',
    TRANSMISSAO_INVALIDA: 'transmissao_invalida',
    KEEPALIVE_COMANDO: 'keepalive_comando'
}

/**
 * @typedef TransmissaoWebSocketInvalida - Uma transmissão que não é valida
 * @property {String} mensagem - Mensagem para devolver  
 * @property {Object} erro - Erro da transmissão não ser valida
 * @property {Boolean} erro.isJSONInvalido - Se o JSON da transmissão é inválido
 * @property {Boolean} erro.isIdInvalido - Se o ID da transmissão é inválido
 * @property {Boolean} erro.isTipoInvalido - Tipo da transmissão é inválido
 * @property {Boolean} erro.isErroFaltandoTipoCorpo - Corpo dos dados do tipo informado é invalido
 * @property {Boolean} erro.isErroFaltandoDadosDoCorpo - Tipo do corpo foi informado, porém está faltando informações importantes nele
 */

/**
 * @typedef SolicitaComando - Solicitação de um comando
 * @property {String} comando - O comando solicitado
 * @property {Any} payload - Payload customizado do comando
 */


/**
 * @typedef RespondeComando - Resposta de um comando
 * @property {Object} solicitacao - Informações da solicitação que gerou essa resposta
 * @property {SolicitaComando} solicitacao.comando - Comando original que essa resposta está respondendo
 * @property {Number} solicitacao.idTransmissaoComando - ID da transmissão original que foi enviada com o comando
 * @property {Object} resposta - Resposta do comando solicitado
 * @property {Boolean} resposta.sucesso - Se a execução do comando foi bem sucedida
 * @property {Any} resposta.payload - Qualquer payload para enviar com a resposta
 * @property {Object} resposta.erro - Se a execução do comando falhou, contém detalhes do erro
 * @property {Boolean} resposta.erro.isComandoNaoExiste - Se o comando solicitado não existe
 * @property {Boolean} resposta.erro.isErroExecucaoComando - O servidor retornou um erro ao executar o comando
 * @property {Object} resposta.erro.erroExecucaoComando - Se o erro for de execução de comando, contém detalhes do erro
 * @property {String} resposta.erro.erroExecucaoComando.descricao - Descrição do erro pego no try-catch
 */

/**
 * @typedef KeepAliveComando - Confirmação para saber que o comando está pendente de execução
 * @property {String} idTransmissaoComando - ID da transmissão original que foi enviada com o comando 
 */

/**
 * @typedef TransmissaoWebSocket - A transmissão de dados entre cliente e servidor
 * @property {String} id - Identificador da transmissão único (UUID de 36 caracteres)
 * @property {TiposDeTransmissao} tipo - O tipo da transmissão
 * @property {SolicitaComando} solicita_comando - Se o tipo da transmissão for a solicitação de um comando, contém os detalhes do comando
 * @property {RespondeComando} responde_comando - Se o tipo da transmissão for uma resposta de um comando, contém os detalhes da resposta
 * @property {TransmissaoWebSocketInvalida} transmissao_invalida - Se a transmissão for inválida, contém detalhes do erro
 * @property {KeepAliveComando} keepalive_comando - Se a transmissão for um keepalive, contém os detalhes do comando que está sendo processado
 */

/**
 * @typedef WebSocketMensagemSegmentadaCabecalho - Representa as informações básicas de uma mensagem segmentada
 * @property {Number} numeroSequencia - Sequencia dessa mensagem segmentada
 * @property {Number} totalBytes - Tamanho dela em bytes
 */

/**
 * @typedef WebSocketMensagemSegmentadaInicio - Representa as informações das segmentações da mensagem
 * @property {Number} totalDeSegmentos - Total de segmentos que a mensagem vai ter
 * @property {WebSocketMensagemSegmentadaCabecalho[]} segmentos - Informações dos segmentos(apenas o cabeçalho, não contém os dados em si)
 * @property {Number} totalBytes - Total de bytes de todos os segmentos juntos
 */

/**
 * @typedef WebSocketMensagemSegmentadaProgresso - Representa uma das segmentações de uma mensagem
 * @property {WebSocketMensagemSegmentadaCabecalho} segmentacao - Informações básicas da segmentação
 * @property {String} textoBase64 - Conteudo da mensagem recebido em base64
 */

/**
 * @typedef WebSocketMensagemSegmentada - Representa uma mensagem segmentada em bytes devido ao tamanho grande da mensagem
 ** Transmissões no incio enviam as informações da mensagem que vai ser transmitida(nenhum byte ainda, segmentacoes tem os dados iniciais da mensagem e segmentacao é nullo)
 ** Transmissões em progresso enviam as segmentações de bytes para completar a mensagem(segmentacoes é nullo e segmentacao tem os dados atuais dos bytes)
 ** Transmissões em fim sinalizam que a mensagem foi completada(segmentacoes é nullo e segmentacao é nullo)
 * @property {Boolean} isInicio - Se é o inicio da mensagem
 * @property {Boolean} isEmProgresso - Se esta em progresso
 * @property {Boolean} isConfirmacaoInicioSegmento - Se a mensagem é uma confirmação de inicio de segmento
 * @property {Object} confirmacaoInicioSegmento - Dados da confirmação
 * @property {String} confirmacaoInicioSegmento.id - ID da mensagem segmentada pronta para receber as segmentações
 * @property {WebSocketMensagemSegmentadaInicio} inicio - Informações de inicio da mensagem
 * @property {WebSocketMensagemSegmentadaProgresso} progresso - Informações de progresso da mensagem
 */

/**
 * @typedef WebSocketMensagemUnica - Representa uma mensagem inteira
 * @property {Any} textoBase64 - Conteudo da mensagem recebido em base64
 */

/**
 * @typedef WebSocketMensagem - Representa o envio de uma mensagem inicial
 * @property {String} id - Identificador da mensagem(UUID também de 36 caracteres)
 * @property {Boolean} isSegmentada - Se a mensagem foi dividada em segmentos de bytes
 * @property {Boolean} isUnica - Se a mensagem é única e não foi dividida
 * @property {WebSocketMensagemUnica} unica - Informações da mensagem recebida(se isUnica for true)
 * @property {WebSocketMensagemSegmentada} segmentada - Informações da mensagem segmentada(se isSegmentada for true)
 */

/**
 * @typedef WebSocketMensagemPendente - Uma mensagem que estão sendo recebida e ainda não foi completada com todos os bytes
 * @property {String} id - ID da mensagem que está sendo recebida(todos os segmentos possuem o mesmo ID)
 * @property {Number} numeroSegmentosPendentes - Segmentos que ainda faltam ser recebidos
 * @property {Number} totalEmBytes - Total em bytes esperados para a mensagem
 * @property {WebSocketMensagemSegmentadaCabecalho[]} segmentosEsperados - Segmentos de bytes que devem ser aguardados
 * @property {WebSocketMensagemSegmentadaProgresso[]} segmentosRecebidos - Segmentos que foram recebidos
 */

/**
 * @typedef PromiseEnviarComando - Promise que é resolvida quando o comando solicitado for executado
 * @property {Boolean} sucesso - Se o comando foi executado com sucesso
 * @property {Object} retorno - Se o comando foi executado, contém a resposta do comando
 * @property {Object} retorno.payload - Payload retornado da execução do comando pelo cliente
 * @property {Object} transmissoes - Detalhes das transmissões envolvidas na execução do comando
 * @property {Object} transmissoes.solicitacao - Detalhes da transmissão de solicitação do comando
 * @property {String} transmissoes.solicitacao.idTransmissao - ID da transmissão original que solicitou o comando
 * @property {Object} transmissoes.solicitacao.comando - Detalhes do comando que foi solicitado
 * @property {String} transmissoes.solicitacao.comando.nome - Nome do comando que foi solicitado
 * @property {String} transmissoes.solicitacao.comando.payload - Payload que foi enviado junto com o comando
 * @property {Object} transmissoes.resposta - Detalhes da transmissão de resposta do comando(se pelo menos chegou ao cliente o comando)
 * @property {String} transmissoes.resposta.idTransmissao - ID da transmissão de resposta do comando 
 * @property {Object} erro - Se o comando falhou, contém detalhes do erro
 * @property {Boolean} erro.isComandoNaoExiste - Se o comando solicitado não existe no cliente
 * @property {Boolean} erro.isErroExecucaoComando - Se o comando solicitado falhou ao ser executado
 * @property {Object} erro.erroExecucaoComando - Se o erro foi de execução de comando, contém detalhes do erro
 * @property {String} erro.erroExecucaoComando.descricao - Descrição do erro pego no try-catch
 * @property {String} erro.isDemorouResponder - O cliente demorou demais para responder ao comando
 */

/**
 * @typedef Comando - Um comando que pode ser solicitado
 * @property {String} comando - Nome do comando
 * @property {CallbackExecutarComando} callback - Função a ser executada quando o comando for solicitado
 */

/**
 * @callback CallbackExecutarComando - Uma função a ser executada quando o comando for solicitado
 * @param {TipagensClienteWS.SolicitaComando} solicitacao - A solicitação de comando
 * @param {TipagensClienteWS.TransmissaoWebSocket} transmissao - Transmissão original recebida
 */

/**
 * @callback CallbackOnClienteDesconectado - uma função a ser executada quando o cliente desconectar
 * @param {Number} codigo - Código de desconexão
 * @param {Buffer} razao - Razão da desconexão
 */


export const a = 1;