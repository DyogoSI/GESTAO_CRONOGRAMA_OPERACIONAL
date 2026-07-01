var WidgetGestaoCronograma = SuperWidget.extend({
    editDocId: null, 
    
    ID_DO_FORMULARIO: null,
    ID_DA_PASTA: null,
    NOME_DATASET: "DScronogramaTakono", 
    dadosCronograma: [],
    parentDocumentIdDetectado: null,

    eventDates: {},
    currentDate: null,
    mockToday: null,

    bindings: {
        local: {
            'toggle-form': ['click_toggleForm'],
            'cancelar-etapa': ['click_cancelarEtapa'],
            'salvar-etapa': ['click_salvarEtapa'],
            'excluir-etapa': ['click_excluirEtapa'],
            'editar-etapa': ['click_editarEtapa'],
            'abrir-modal-duplicar': ['click_abrirModalDuplicar'],
            'cancelar-duplicar': ['click_cancelarDuplicar'],
            'salvar-duplicar': ['click_salvarDuplicar']
        },
        global: {}
    },

    init: function() {
        var that = this;
        var $widgetContext = $("#WidgetGestaoCronograma_" + this.instanceId);
        
        var hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        this.mockToday = hoje.getTime();
        this.currentDate = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

        var mesAtual = hoje.getFullYear() + '-' + ("0" + (hoje.getMonth() + 1)).slice(-2);
        
        $widgetContext.find("#mesFiltro_" + this.instanceId).val(mesAtual);
        
        that.atualizarTextoMes(mesAtual);
        that.sincronizarModoMes();
        
        $widgetContext.find("#mesFiltro_" + this.instanceId).on('change', function() {
            var val = $(this).val();
            var partes = val.split('-');
            that.currentDate = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, 1);
            that.atualizarTextoMes(val);
            that.sincronizarModoMes();
            that.renderizarTabela();
        });

        $widgetContext.on('click', '#btnPrevMes_' + this.instanceId, function() {
            that.alterarMesFiltro(-1);
        });

        $widgetContext.on('click', '#btnNextMes_' + this.instanceId, function() {
            that.alterarMesFiltro(1);
        });

        $widgetContext.find("#mesOrigemDuplicar_" + this.instanceId).on('change', function() {
            that.renderizarTarefasDuplicar($(this).val());
        });

        $widgetContext.on('change', '#selecionarTodasDuplicar_' + this.instanceId, function() {
            var marcado = $(this).is(':checked');
            $widgetContext.find('.duplicar-tarefa-check').prop('checked', marcado);
        });

        $widgetContext.on('change', '.duplicar-tarefa-check', function() {
            var total = $widgetContext.find('.duplicar-tarefa-check').length;
            var selecionadas = $widgetContext.find('.duplicar-tarefa-check:checked').length;
            $widgetContext.find("#selecionarTodasDuplicar_" + that.instanceId).prop('checked', total > 0 && total === selecionadas);
        });

        $widgetContext.find("#dataInicio_" + this.instanceId).on('change', function() {
            var dataInicioVal = $(this).val();
            var $dataTermino = $widgetContext.find("#dataTermino_" + that.instanceId);
            
            if (dataInicioVal && dataInicioVal.length === 10) {
                var anoInicio = parseInt(dataInicioVal.split('-')[0], 10);
                
                if (anoInicio >= 2000) {
                    var dataTerminoVal = $dataTermino.val();
                    var anoTermino = dataTerminoVal ? parseInt(dataTerminoVal.split('-')[0], 10) : 0;
                    
                    if (!dataTerminoVal || anoTermino < 2000) {
                        $dataTermino.val(dataInicioVal);
                    }
                }
            }
            
            that.calcularStatusDinamico();
        });

        $widgetContext.find("#dataTermino_" + this.instanceId + ", #checkConcluido_" + this.instanceId).on('change', function() {
            that.calcularStatusDinamico();
        });

        $widgetContext.on('click', 'tbody tr', function(e) {
            e.stopPropagation();
            var rowId = $(this).attr('id');
            if (!rowId) return;
            var stepId = rowId.split('-')[1];
            
            that.resetFilters(true);
            
            $(this).css('background-color', '#fff7ed');
            var $row = $(this);
            setTimeout(function() { $row.css('background-color', '#fff'); }, 2000);
            
            that.destacarCalendario(stepId);
        });

        $widgetContext.on('click', '.toggle-month-btn, .toggle-month-btn-due', function(e) {
            e.stopPropagation();
            var $listWrapper = $(this).siblings('.month-task-list-wrapper');
            var $icon = $(this).find('.month-toggle-icon');
            
            $icon.toggleClass('open');
            if ($icon.hasClass('open')) {
                $icon.css('transform', 'rotate(180deg)');
            } else {
                $icon.css('transform', 'rotate(0deg)');
            }
            
            $listWrapper.slideToggle(250);
        });

        $widgetContext.on('click', '.overdue-task-item, .vencimento-item, .future-task-item', function(e) {
            e.stopPropagation();
            var taskId = $(this).attr('data-task-id');
            var taskStartMonth = $(this).attr('data-task-month');

            var partes = taskStartMonth.split('-');
            that.currentDate = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, 1);
            
            $widgetContext.find("#mesFiltro_" + that.instanceId).val(taskStartMonth);
            that.atualizarTextoMes(taskStartMonth);
            that.sincronizarModoMes();
            that.renderizarTabela();

            setTimeout(function() {
                var targetId = '#step-' + taskId + '-' + that.instanceId;
                var $targetRow = $widgetContext.find(targetId);
                if ($targetRow.length > 0) {
                    $targetRow[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                    $targetRow.css('background-color', '#fff7ed');
                    setTimeout(function() { $targetRow.css('background-color', '#fff'); }, 2000);
                }
                that.destacarCalendario(taskId);
            }, 150);
        });

        this.carregarConfiguracoesAmbiente();
    },

    carregarConfiguracoesAmbiente: function() {
        var that = this;
        var loading = FLUIGC.loading(window);
        loading.show();

        $.ajax({
            url: '/api/public/ecm/dataset/datasets',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ name: "ds_config_cronograma3" }),
            success: function(response) {
                var valores = response.content.values;

                if (valores && valores.length > 0) {
                    that.ID_DO_FORMULARIO = parseInt(valores[0].idFormulario, 10);
                    that.ID_DA_PASTA = parseInt(valores[0].idPasta, 10);
                    that.carregarDadosDoBanco();
                } else {
                    loading.hide();
                    FLUIGC.toast({ title: 'Erro Crítico: ', message: 'Dataset ds_config_cronograma não retornou configurações.', type: 'danger' });
                }
            },
            error: function(err) {
                loading.hide();
                FLUIGC.toast({ title: 'Erro: ', message: 'Não foi possível ler os IDs de configuração.', type: 'danger' });
            }
        });
    },

    getMesAtual: function() {
        var hoje = new Date();
        return hoje.getFullYear() + '-' + ("0" + (hoje.getMonth() + 1)).slice(-2);
    },

    criarDataLocal: function(dataStr) {
        if (!dataStr) return null;
        var partes = dataStr.indexOf('/') > -1 ? dataStr.split('/') : dataStr.split('-');
        if (partes.length !== 3) return null;
        var ano = dataStr.indexOf('/') > -1 ? parseInt(partes[2], 10) : parseInt(partes[0], 10);
        var mes = dataStr.indexOf('/') > -1 ? parseInt(partes[1], 10) : parseInt(partes[1], 10);
        var dia = dataStr.indexOf('/') > -1 ? parseInt(partes[0], 10) : parseInt(partes[2], 10);
        if (isNaN(dia) || isNaN(mes) || isNaN(ano)) return null;
        var data = new Date(ano, mes - 1, dia);
        if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) return null;
        return data;
    },

    alterarMesFiltro: function(diffMeses) {
        var $mesFiltro = $("#mesFiltro_" + this.instanceId);
        var mesSelecionado = $mesFiltro.val() || this.getMesAtual();
        var partes = mesSelecionado.split('-');
        var dataBase = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, 1);
        dataBase.setMonth(dataBase.getMonth() + diffMeses);
        var novoMes = dataBase.getFullYear() + '-' + ("0" + (dataBase.getMonth() + 1)).slice(-2);
        
        this.currentDate = dataBase;
        $mesFiltro.val(novoMes);
        this.atualizarTextoMes(novoMes);
        this.sincronizarModoMes();
        this.renderizarTabela();
    },

    sincronizarModoMes: function() {
        var $ctx = $("#WidgetGestaoCronograma_" + this.instanceId);
        $ctx.removeClass("is-view-only");
        $ctx.find("#modoSomenteVisualizacao_" + this.instanceId).hide();
    },

    atualizarTextoMes: function(val) {
        if(!val) return;
        var partes = val.split('-');
        var meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
        var mesNome = meses[parseInt(partes[1], 10) - 1];
        $("#textoMesFiltro_" + this.instanceId).text(mesNome + "/" + partes[0]);
    },

    validarDataBanco: function(dataStr) {
        if (!dataStr || dataStr === "A definir" || dataStr === "") return false;
        var partes = dataStr.split('/');
        if (partes.length !== 3) return false;
        var dia = parseInt(partes[0], 10);
        var mes = parseInt(partes[1], 10);
        var ano = parseInt(partes[2], 10);
        
        if (isNaN(dia) || isNaN(mes) || isNaN(ano)) return false;
        if (mes < 1 || mes > 12) return false;
        if (ano < 2000 || ano > 2100) return false;
        return true;
    },

    parseDate: function(dataBr) {
        if (!dataBr || dataBr === "A definir" || dataBr === "Data Inválida" || !this.validarDataBanco(dataBr)) return null;
        var p = dataBr.split('/');
        return new Date(p[2], p[1] - 1, p[0]).getTime();
    },

    parseNumber: function(valor) {
        if (valor === undefined || valor === null || valor === "") return null;
        if (typeof valor === "number") return isNaN(valor) ? null : valor;
        var normalizado = String(valor).replace(/[^\d,.-]/g, "");
        if (normalizado.indexOf(",") > -1) {
            normalizado = normalizado.replace(/\./g, "").replace(",", ".");
        }
        var numero = parseFloat(normalizado);
        return isNaN(numero) ? null : numero;
    },

    getFirstNumber: function(item, campos) {
        for (var i = 0; i < campos.length; i++) {
            var numero = this.parseNumber(item[campos[i]]);
            if (numero !== null) return numero;
        }
        return null;
    },

    formatCurrencyBR: function(valor) {
        if (valor === null || valor === undefined || isNaN(valor)) return "--";
        return "R$ " + valor.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },

    getResponsavelInfo: function(responsavel) {
        var normalizado = (responsavel || "").trim().toLowerCase();
        if (normalizado === "cliente") {
            return { key: "cliente", textClass: "resp-cliente", bgClass: "bg-cliente", stepClass: "step-cliente" };
        }
        if (normalizado === "irho") {
            return { key: "irho", textClass: "resp-irho", bgClass: "bg-irho", stepClass: "step-irho" };
        }
        return { key: "outros", textClass: "resp-outros", bgClass: "bg-outros", stepClass: "step-outros" };
    },

    formatarCompetencia: function(val) {
        if (!val) return "-";
        var partes = val.split('-');
        var meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
        var mesNome = meses[parseInt(partes[1], 10) - 1] || "";
        return mesNome + "/" + partes[0];
    },

    escapeHtml: function(valor) {
        return String(valor === undefined || valor === null ? "" : valor)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    avaliarStatusAtual: function(dataTerminoStr, statusSalvo) {
        if ((statusSalvo || "").toLowerCase() === 'concluído') {
            return { texto: "Concluído", hex: "#2ecc71" };
        }
        
        if (!this.validarDataBanco(dataTerminoStr)) {
            return { texto: "Pendente", hex: "#3498db" };
        }
        var p = dataTerminoStr.split('/');
        var dTermino = new Date(p[2], p[1]-1, p[0]);
        dTermino.setHours(0,0,0,0);
        
        var hoje = new Date();
        hoje.setHours(0,0,0,0);
        
        var diffTime = dTermino.getTime() - hoje.getTime();
        var diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDias < 0) {
            return { texto: "Atrasado", hex: "#e74c3c" };
        } else if (diffDias === 0) {
            return { texto: "Vence hoje", hex: "#e67e22" };
        } else if (diffDias > 0 && diffDias <= 3) {
            return { texto: "Próxima de vencer", hex: "#f1c40f" };
        } else {
            return { texto: "Pendente", hex: "#3498db" };
        }
    },

    calcularStatusDinamico: function() {
        var $ctx = $("#WidgetGestaoCronograma_" + this.instanceId);
        var isConcluido = $ctx.find("#checkConcluido_" + this.instanceId).is(':checked');
        var $statusText = $ctx.find("#statusCalculado_" + this.instanceId);
        var $statusVal = $ctx.find("#statusEtapa_" + this.instanceId);
        
        if (isConcluido) {
            $statusText.text("Concluído").css({"color": "#16a34a", "background": "#ecfdf5", "border-color": "#d1fae5"});
            $statusVal.val("Concluído");
            return;
        }
        var dtTermino = $ctx.find("#dataTermino_" + this.instanceId).val();
        var dtTerminoBR = dtTermino ? dtTermino.split('-').reverse().join('/') : "";
        
        var statusCalculado = this.avaliarStatusAtual(dtTerminoBR, "Pendente");
        var novoStatus = statusCalculado.texto;
        var cor = "var(--text-muted)", bg = "#f1f5f9", border = "#e2e8f0";
        if (novoStatus === "Atrasado") {
            cor = "#ef4444"; bg = "#fef2f2"; border = "#fee2e2";
        } else if (novoStatus === "Vence hoje") {
            cor = "#ea580c"; bg = "#fff7ed"; border = "#ffedd5";
        } else if (novoStatus === "Próxima de vencer") {
            cor = "#ca8a04"; bg = "#fefce8"; border = "#fef08a";
        } else if (novoStatus === "Pendente") {
            cor = "#3b82f6"; bg = "#eff6ff"; border = "#dbeafe";
        }
        $statusText.text(novoStatus).css({"color": cor, "background": bg, "border-color": border});
        $statusVal.val(novoStatus);
    },

    detectarParentDocumentId: function(item) {
        var camposPossiveis = ["metadata#parent_id", "metadata#parentid", "parentDocumentId", "parentdocumentid", "documentParentId", "documentparentid"];
        for (var i = 0; i < camposPossiveis.length; i++) {
            var valor = parseInt(item[camposPossiveis[i]], 10);
            if (!isNaN(valor) && valor > 0) return valor;
        }
        return null;
    },

    getParentDocumentId: function() {
        return this.parentDocumentIdDetectado || parseInt(this.ID_DO_FORMULARIO, 10);
    },

    carregarDadosDoBanco: function() {
        var that = this;
        var loading = FLUIGC.loading(window);
        
        $.ajax({
            url: '/api/public/ecm/dataset/datasets',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ name: that.NOME_DATASET }),
            success: function(response) {
                loading.hide();
                that.dadosCronograma = [];
                var valores = response.content.values;
                var idCounter = 1;
                
                if (valores && valores.length > 0) {
                    for (var i = 0; i < valores.length; i++) {
                        var item = valores[i];
                        if (!item.documentid || !item.txt_atividade) continue;
                        
                        var parentDetectado = that.detectarParentDocumentId(item);
                        if (parentDetectado) that.parentDocumentIdDetectado = parentDetectado;
                        
                        var dtInicio = item.data_inicio || "";
                        var dtTermino = item.data_termino || "";
                        if (dtInicio === "") dtInicio = "A definir";
                        else if (!that.validarDataBanco(dtInicio)) dtInicio = "Data Inválida";
                        
                        if (dtTermino === "") dtTermino = "A definir";
                        else if (!that.validarDataBanco(dtTermino)) dtTermino = "Data Inválida";
                        
                        var competenciaStr = item.txt_competencia || "";
                        if (!competenciaStr) {
                            var dtCompat = that.parseDate(dtInicio) || that.parseDate(dtTermino);
                            if (dtCompat) {
                                var dCompat = new Date(dtCompat);
                                competenciaStr = dCompat.getFullYear() + "-" + ("0" + (dCompat.getMonth() + 1)).slice(-2);
                            }
                        }

                        var statusDinamico = that.avaliarStatusAtual(dtTermino, item.txt_status);
                        
                        that.dadosCronograma.push({
                            documentId: item.documentid,
                            id: idCounter++, 
                            icon: "fa-solid fa-thumbtack",
                            name: item.txt_atividade.toUpperCase(),
                            desc: item.txt_descricao || "",
                            responsavel: item.txt_responsavel || "Não atribuído",
                            competencia: competenciaStr,
                            start: dtInicio,
                            end: dtTermino,
                            status: statusDinamico.texto,
                            statusHex: statusDinamico.hex,
                            folhasProcessadas: that.getFirstNumber(item, ["num_folhas_processadas", "num_folhas", "qtd_folhas_processadas"]),
                            folhasComRetrabalho: that.getFirstNumber(item, ["num_folhas_retrabalho", "num_retrabalhos", "qtd_retrabalhos"]),
                            errosLancamento: that.getFirstNumber(item, ["num_erros_lancamento", "qtd_erros_lancamento", "num_apontamentos_incorretos"]),
                            custoFolha: that.getFirstNumber(item, ["vl_custo_folha", "num_custo_folha", "valor_custo_folha"]),
                            colaboradores: that.getFirstNumber(item, ["num_colaboradores", "qtd_colaboradores", "total_colaboradores"]),
                            desligamentos: that.getFirstNumber(item, ["num_desligamentos", "qtd_desligamentos", "num_rescisoes"]),
                            admissoes: that.getFirstNumber(item, ["num_admissoes", "qtd_admissoes"])
                        });
                    }
                }
                that.renderizarTabela();
            },
            error: function(err) {
                loading.hide();
                FLUIGC.toast({ title: 'Atenção: ', message: 'Erro ao carregar o Dataset de Cronogramas.', type: 'warning' });
                that.renderizarTabela();
            }
        });
    },

    renderizarTabela: function() {
        var that = this;
        var $tbody = $("#tbody-gestao-" + this.instanceId);
        $tbody.empty();
        
        var mesSelecionado = $("#mesFiltro_" + this.instanceId).val();
        
        var dadosFiltrados = this.dadosCronograma.filter(function(item) {
            if (item.competencia && item.competencia !== "") {
                return item.competencia === mesSelecionado;
            }
            if (item.start && item.start !== "A definir" && item.start !== "Data Inválida") {
                var tInicio = that.parseDate(item.start);
                if (tInicio) {
                    var dInicio = new Date(tInicio);
                    var mesFisico = dInicio.getFullYear() + "-" + ("0" + (dInicio.getMonth() + 1)).slice(-2);
                    return mesFisico === mesSelecionado;
                }
            }
            return false;
        });
        
        if (dadosFiltrados.length === 0) {
            $tbody.append('<tr><td colspan="9" class="text-center" style="padding: 30px; color: #888;">Nenhuma etapa com competência ou data de início neste mês.</td></tr>');
            this.renderizarKpisGestao(dadosFiltrados);
            this.renderizarPaneisLaterais(); 
            this.extractDates();
            this.renderCalendar(this.currentDate);
            return;
        }
        
        dadosFiltrados.sort(function(a, b) {
            var valA = (a.start === "A definir" || a.start === "Data Inválida") ? a.end : a.start;
            var valB = (b.start === "A definir" || b.start === "Data Inválida") ? b.end : b.start;
            var dateA = valA.split('/').reverse().join(''); 
            var dateB = valB.split('/').reverse().join('');
            return dateA.localeCompare(dateB);
        });
        
        dadosFiltrados.forEach(function(item, index) {
            var displayId = index + 1; 
            var respInfo = that.getResponsavelInfo(item.responsavel);
            item.class = respInfo.textClass;
            
            var duracaoDias = 0;
            if (item.start !== "A definir" && item.start !== "Data Inválida" && item.end !== "A definir" && item.end !== "Data Inválida") {
                var pI = item.start.split('/');
                var pF = item.end.split('/');
                var d1 = new Date(pI[2], pI[1]-1, pI[0]);
                var d2 = new Date(pF[2], pF[1]-1, pF[0]);
                duracaoDias = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
            }
            
            var labelCompetencia = "-";
            if (item.competencia) {
                labelCompetencia = that.formatarCompetencia(item.competencia);
            }
            
            var temDetalhe = item.desc && item.desc !== "-" && String(item.desc).trim() !== "";
            var detalheAttr = temDetalhe ? ' data-tooltip="' + String(item.desc).replace(/"/g, '&quot;') + '"' : '';
            var iconeDetalhe = temDetalhe ? ' <i class="fa-regular fa-circle-question detail-hint"></i>' : '';
            
            var acoesHtml = '<button class="btn btn-sm" data-editar-etapa data-docid="' + item.documentId + '" title="Editar Etapa" style="padding: 6px 10px; border-radius: 4px; margin-right: 6px; background-color: var(--primary-blue); color: white; border: none;">' +
                    '<i class="fa-solid fa-pen"></i>' +
                  '</button>' +
                  '<button class="btn btn-danger btn-sm" data-excluir-etapa data-docid="' + item.documentId + '" title="Excluir Etapa" style="padding: 6px 10px; border-radius: 4px;">' +
                    '<i class="fa-solid fa-trash"></i>' +
                  '</button>';
                  
            var trHtml = '<tr id="step-' + item.id + '-' + that.instanceId + '" style="cursor: pointer;">' +
                '<td data-label="ETAPA"><span class="step-number ' + respInfo.stepClass + '">' + displayId + '</span></td>' +
                '<td data-label="TAREFAS">' +
                    '<div class="process-col ' + item.class + '"' + detalheAttr + '><i class="' + item.icon + '"></i> ' + item.name + iconeDetalhe + '</div>' +
                '</td>' +
                '<td data-label="RESPONSÁVEL"><span class="' + respInfo.textClass + '" style="font-weight: 800;">' + item.responsavel + '</span></td>' +
                '<td data-label="INÍCIO" class="date-col date-start">' + item.start + '</td>' +
                '<td data-label="TÉRMINO" class="date-col date-end">' + item.end + '</td>' +
                '<td data-label="DURAÇÃO">' + duracaoDias + ' dias</td>' +
                '<td data-label="COMPETÊNCIA" style="font-weight: 700; color: var(--primary-blue); font-size: 11px; text-transform: lowercase;">' + labelCompetencia + '</td>' +
                '<td data-label="STATUS"><div class="status"><span class="dot" style="background-color: ' + item.statusHex + ';"></span> ' + item.status + '</div></td>' +
                '<td data-label="AÇÕES" style="text-align: center; white-space: nowrap;">' +
                    acoesHtml +
                '</td>' +
            '</tr>';
            $tbody.append(trHtml);
        });
        
        this.renderizarKpisGestao(dadosFiltrados);
        this.renderizarPaneisLaterais(); 
        this.extractDates();
        this.renderCalendar(this.currentDate);
    },

    extractDates: function() {
        var that = this;
        this.eventDates = {};
        
        var calAno = this.currentDate.getFullYear();
        var calMes = this.currentDate.getMonth();
        
        this.dadosCronograma.forEach(function(item) {
            // CALENDÁRIO: Continua mapeando a data de Término para mostrar a bolinha do vencimento real
            var tFim = that.parseDate(item.end);
            if (!tFim) return;
            
            var dFim = new Date(tFim);
            
            if (dFim.getFullYear() === calAno && dFim.getMonth() === calMes) {
                var status = (item.status || "").toLowerCase();
                
                if (status !== 'concluído') {
                    var time = dFim.getTime();
                    if (!that.eventDates[time]) {
                        that.eventDates[time] = { steps: [], isStart: false, isEnd: true };
                    }
                    
                    // CORREÇÃO: O redirecionamento no clique deve ir para a aba da competência.
                    var targetMes = item.competencia;
                    if (!targetMes || targetMes === "") {
                        var tIni = that.parseDate(item.start) || tFim;
                        var dIni = new Date(tIni);
                        targetMes = dIni.getFullYear() + "-" + ("0" + (dIni.getMonth() + 1)).slice(-2); 
                    }
                    
                    that.eventDates[time].steps.push({ 
                        id: item.id, 
                        name: item.name.replace(/\n/g, ' ').trim(), 
                        type: 'Vencimento',
                        startMes: targetMes 
                    });
                }
            }
        });
    },

    renderCalendar: function(date) {
        var that = this;
        var $widgetContext = $("#WidgetGestaoCronograma_" + this.instanceId);
        
        var $monthYear = $widgetContext.find("#month-year_" + this.instanceId);
        var $daysContainer = $widgetContext.find("#calendar-days_" + this.instanceId);
        
        var monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        
        var month = date.getMonth();
        var year = date.getFullYear();

        $monthYear.text(monthNames[month] + " " + year);
        $daysContainer.empty();
        
        var firstDay = new Date(year, month, 1).getDay();
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        var realToday = new Date(that.mockToday);
        
        for (var i = 0; i < firstDay; i++) {
            $daysContainer.append('<div class="calendar-day empty"></div>');
        }
        
        var listaVencimentosMês = []; 

        for (var j = 1; j <= daysInMonth; j++) {
            var $day = $('<div class="calendar-day">' + j + '</div>');
            var currentDayTime = new Date(year, month, j).getTime();
            var eventData = that.eventDates[currentDayTime];
            
            if (eventData) {
                $day.addClass("event-end"); 
                $day.css({'background-color': '#fee2e2', 'color': '#ef4444', 'font-weight': 'bold'});
                
                var tooltipLines = eventData.steps.map(function(s) { return "■  " + s.name; });
                var tooltipText = tooltipLines.join('\n\n');
                
                $day.attr('data-tooltip', tooltipText); 
                $day.attr('data-original-tooltip', tooltipText); 
                $day.addClass('has-tooltip');
                
                eventData.steps.forEach(function(s) {
                    listaVencimentosMês.push({ dia: j, id: s.id, name: s.name, startMes: s.startMes });
                });
                
                (function(currentEventData, currentDayElement) {
                    currentDayElement.on('click', function(e) {
                        e.stopPropagation();
                        that.resetFilters(true); 
                        
                        var firstStep = currentEventData.steps[0];
                        var taskMonth = firstStep.startMes; // Agora puxa a competência

                        that.currentDate = new Date(parseInt(taskMonth.split('-')[0], 10), parseInt(taskMonth.split('-')[1], 10) - 1, 1);
                        $widgetContext.find("#mesFiltro_" + that.instanceId).val(taskMonth);
                        that.atualizarTextoMes(taskMonth);
                        that.renderizarTabela();
                        
                        setTimeout(function() {
                            var rolouTela = false;
                            currentEventData.steps.forEach(function(step) {
                                var targetId = '#step-' + step.id + '-' + that.instanceId;
                                var $targetRow = $widgetContext.find(targetId);
                                if ($targetRow.length > 0) {
                                    if (!rolouTela) {
                                        $targetRow[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        rolouTela = true;
                                    }
                                    $targetRow.css('background-color', '#fff7ed');
                                    setTimeout(function() { $targetRow.css('background-color', '#fff'); }, 2000);
                                }
                            });
                            that.destacarCalendario(firstStep.id, currentEventData.steps);
                        }, 150);
                    });
                })(eventData, $day);

            } else {
                $day.on('click', function(e) {
                    e.stopPropagation();
                    that.resetFilters(true);
                });
            }

            if (currentDayTime === realToday.getTime()) {
                $day.addClass("today");
            }
            
            $daysContainer.append($day);
        }

        var $calContainer = $widgetContext.find(".calendar-legend");
        $widgetContext.find("#due-this-month-container-" + this.instanceId).remove();
        
        if (listaVencimentosMês.length > 0) {
            var mesNomeStr = monthNames[month] + "/" + year;
            var listHtml = '<div id="due-this-month-container-' + this.instanceId + '" class="due-months-panel" style="margin-top: 15px; border-top: 1px solid var(--border-color); background: #ffffff; padding: 12px; margin-bottom: 0;">' +
                           '<div class="due-months-title" id="toggle-due-this-month-' + this.instanceId + '" style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 800; margin-bottom: 10px; text-transform: uppercase; color: #ea580c; cursor: pointer;" title="Clique para expandir/recolher">' +
                               '<div style="display: flex; align-items: center; gap: 7px;">' +
                                   '<i class="fa-regular fa-calendar-check" style="color: #ea580c;"></i>' +
                                   '<span>A Vencer Neste Mês (Físico)</span>' +
                               '</div>' +
                           '</div>' +
                           '<div style="margin-bottom: 10px; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.02); width: 100%;">' +
                               '<button type="button" class="toggle-month-btn-due" data-current-month="' + year + '-' + ("0" + (month + 1)).slice(-2) + '" style="width: 100%; display: flex; justify-content: space-between; align-items: center; background: #fff7ed; border: none; border-bottom: 1px solid transparent; padding: 10px 12px; cursor: pointer; transition: background 0.2s;" title="Expandir/Recolher ' + mesNomeStr + '">' +
                                   '<div style="display: flex; gap: 10px; align-items: center;">' +
                                       '<div style="background: #ffedd5; color: #ea580c; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center;"><i class="fa-regular fa-calendar-check"></i></div>' +
                                       '<span style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase;">' + mesNomeStr + '</span>' +
                                   '</div>' +
                                   '<div style="display: flex; align-items: center; gap: 12px;">' +
                                       '<strong style="background: rgba(234, 88, 12, 0.12); color: #9a3412; border-radius: 999px; font-size: 11px; height: 22px; min-width: 22px; display: inline-flex; align-items: center; justify-content: center; padding: 0 6px;">' + listaVencimentosMês.length + '</strong>' +
                                       '<i class="fa-solid fa-chevron-down month-toggle-icon" style="color: #64748b; font-size: 12px; transition: transform 0.3s ease;"></i>' +
                                   '</div>' +
                               '</button>' +
                               '<div class="month-task-list-wrapper" id="due-this-month-list-' + this.instanceId + '" style="display: none;"><div style="padding: 0 4px 4px 4px; margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">';
                               
            listaVencimentosMês.forEach(function(v) {
                listHtml += '<button type="button" class="vencimento-item" data-task-id="'+v.id+'" data-task-month="'+v.startMes+'" ' +
                            'style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%; padding: 8px 10px; ' +
                            'background: #fff; border: 1px solid #fed7aa; border-radius: 6px; cursor: pointer; text-align: left; transition: background 0.2s ease, border-color 0.2s ease;">' +
                            '<span style="font-size: 11px; font-weight: 600; color: #9a3412; white-space: normal; line-height: 1.4; word-break: break-word;">' + v.name + '</span>' +
                            '<strong style="color: #ea580c; font-size: 10px; flex-shrink: 0; margin-left: 5px; margin-top: 2px;">Dia ' + ("0" + v.dia).slice(-2) + '</strong>' +
                            '</button>';
            });
            listHtml += '</div></div></div></div>';
            
            $calContainer.after(listHtml);
            
            $widgetContext.find('.vencimento-item').on('click', function(e) {
                e.stopPropagation();
                that.resetFilters(true);
                var taskId = $(this).attr('data-task-id');
                var taskMonth = $(this).attr('data-task-month');
                
                that.currentDate = new Date(parseInt(taskMonth.split('-')[0], 10), parseInt(taskMonth.split('-')[1], 10) - 1, 1);
                $widgetContext.find("#mesFiltro_" + that.instanceId).val(taskMonth);
                that.atualizarTextoMes(taskMonth);
                that.renderizarTabela();
                
                setTimeout(function() {
                    var targetId = '#step-' + taskId + '-' + that.instanceId;
                    var $targetRow = $widgetContext.find(targetId);
                    if ($targetRow.length > 0) {
                        $targetRow[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                        $targetRow.css('background-color', '#fff7ed');
                        setTimeout(function() { $targetRow.css('background-color', '#fff'); }, 2000);
                    }
                    that.destacarCalendario(taskId);
                }, 150);
            });
        }
    },

    resetFilters: function(keepPanels) {
        var $widgetContext = $("#WidgetGestaoCronograma_" + this.instanceId);
        $widgetContext.find('.calendar-day.has-tooltip').each(function() {
            var orig = $(this).attr('data-original-tooltip');
            if (orig) $(this).attr('data-tooltip', orig);
            $(this).removeClass('dimmed-day only-this-day');
        });
        $widgetContext.find('tbody tr').css('background-color', '#fff');
    },

    destacarCalendario: function(originalId, multipleStepsArray) {
        var that = this;
        var $widgetContext = $("#WidgetGestaoCronograma_" + this.instanceId);
        
        $widgetContext.find('.calendar-day.has-tooltip').each(function() {
            var orig = $(this).attr('data-original-tooltip');
            if (orig) $(this).attr('data-tooltip', orig);
            $(this).removeClass('dimmed-day only-this-day');
        });

        if (multipleStepsArray && multipleStepsArray.length > 1) {
            var firstItemMulti = this.dadosCronograma.find(function(i) { return i.id == multipleStepsArray[0].id; });
            if (firstItemMulti && firstItemMulti.end && firstItemMulti.end !== "A definir" && firstItemMulti.end !== "Data Inválida") {
                var dFimMulti = new Date(that.parseDate(firstItemMulti.end));
                if (dFimMulti.getMonth() === that.currentDate.getMonth() && dFimMulti.getFullYear() === that.currentDate.getFullYear()) {
                    var diaVencMulti = dFimMulti.getDate();
                    $widgetContext.find('.calendar-day.event-end').each(function() {
                        if (parseInt($(this).text()) === diaVencMulti) {
                            $(this).addClass('only-this-day');
                        } else {
                            $(this).addClass('dimmed-day'); 
                        }
                    });
                }
            }
            return; 
        }

        var item = this.dadosCronograma.find(function(i) { return i.id == originalId; });
        if (!item) return;

        if (item.end && item.end !== "A definir" && item.end !== "Data Inválida") {
            var tFim = this.parseDate(item.end);
            var dFim = new Date(tFim);
            if (dFim.getMonth() === this.currentDate.getMonth() && dFim.getFullYear() === this.currentDate.getFullYear()) {
                var diaVencimento = dFim.getDate();
                $widgetContext.find('.calendar-day.event-end').each(function() {
                    if (parseInt($(this).text()) === diaVencimento) {
                        $(this).addClass('only-this-day');
                        $(this).attr('data-tooltip', '■  ' + item.name); 
                    } else {
                        $(this).addClass('dimmed-day'); 
                    }
                });
            } else {
                $widgetContext.find('.calendar-day.event-end').addClass('dimmed-day');
            }
        } else {
            $widgetContext.find('.calendar-day.event-end').addClass('dimmed-day');
        }
    },

    renderizarKpisGestao: function(lista) {
        var dados = lista || [];
        var total = dados.length;
        var concluidas = 0;
        var atrasadas = 0; 
        var folhasProcessadas = 0;
        var folhasComRetrabalho = 0;
        var custoFolha = 0;
        var colaboradores = 0;
        var temDadosQualidade = false;
        var temDadosCusto = false;
        
        dados.forEach(function(item) {
            if (item.status === "Concluído") concluidas++;
            if (item.status === "Atrasado") atrasadas++;
            
            if (item.folhasProcessadas !== null && item.folhasProcessadas !== "") {
                folhasProcessadas += parseFloat(item.folhasProcessadas);
                temDadosQualidade = true;
            }
            if (item.folhasComRetrabalho !== null && item.folhasComRetrabalho !== "") {
                folhasComRetrabalho += parseFloat(item.folhasComRetrabalho);
                temDadosQualidade = true;
            }
            if (item.custoFolha !== null && item.custoFolha !== "") {
                custoFolha += parseFloat(item.custoFolha);
                temDadosCusto = true;
            }
            if (item.colaboradores !== null && item.colaboradores !== "") {
                colaboradores = Math.max(colaboradores, parseFloat(item.colaboradores));
                temDadosCusto = true;
            }
        }, this);
        
        var execucao = total > 0 ? Math.round((concluidas / total) * 100) : 0;
        var taxaAcerto = (temDadosQualidade && folhasProcessadas > 0)
            ? Math.max(0, Math.round(((folhasProcessadas - folhasComRetrabalho) / folhasProcessadas) * 1000) / 10)
            : null;
        var custoMedio = (temDadosCusto && colaboradores > 0) ? custoFolha / colaboradores : null;
        
        var $ctx = $("#WidgetGestaoCronograma_" + this.instanceId);
        $ctx.find("#gestao-kpi-periodo-" + this.instanceId).text(this.formatarCompetencia($("#mesFiltro_" + this.instanceId).val()));
        $ctx.find("#gestao-kpi-execucao-" + this.instanceId).text(execucao + "%");
        $ctx.find("#gestao-kpi-execucao-desc-" + this.instanceId).text(concluidas + " de " + total + " etapas concluídas");
        $ctx.find("#gestao-kpi-atrasos-" + this.instanceId).text(atrasadas);
        $ctx.find("#gestao-kpi-atrasos-desc-" + this.instanceId).text(atrasadas > 0 ? atrasadas + " etapa(s) fora do prazo" : "Nenhuma etapa crítica");
        $ctx.find("#gestao-kpi-acerto-" + this.instanceId).text(taxaAcerto !== null ? taxaAcerto.toString().replace(".", ",") + "%" : "--");
        $ctx.find("#gestao-kpi-acerto-desc-" + this.instanceId).text(taxaAcerto !== null ? folhasComRetrabalho + " folha(s) com retrabalho" : "Aguardando volume processado");
        $ctx.find("#gestao-kpi-custo-" + this.instanceId).text(custoMedio !== null ? this.formatCurrencyBR(custoMedio) : "--");
        $ctx.find("#gestao-kpi-custo-desc-" + this.instanceId).text(custoMedio !== null ? colaboradores + " colaborador(es) consideredos" : "Aguardando custo e headcount");
    },
    
    renderizarPaneisLaterais: function() {
        var that = this;
        var $widgetContext = $("#WidgetGestaoCronograma_" + this.instanceId);
        
        var $containerAtrasos = $widgetContext.find("#overdue-months-" + this.instanceId);
        var $containerFuturos = $widgetContext.find("#future-months-" + this.instanceId);
        
        var mesesAtraso = {};
        var mesesFuturo = {};
        
        this.dadosCronograma.forEach(function(item) {
            if (item.end === "Data Inválida" || item.end === "A definir") return;

            var termino = that.parseDate(item.end);
            var status = (item.status || "").toLowerCase();
            var concluido = status === "concluído";
            
            if (!termino) return;
            
            var dataTermino = new Date(termino);
            var chaveMesFisicoTermino = dataTermino.getFullYear() + "-" + ("0" + (dataTermino.getMonth() + 1)).slice(-2);

            var tInicio = that.parseDate(item.start) || termino;
            var dataInicio = new Date(tInicio);
            var chaveMesFisicoInicio = dataInicio.getFullYear() + "-" + ("0" + (dataInicio.getMonth() + 1)).slice(-2);

            // CORREÇÃO: Força o redirecionamento para o mês da competência
            var targetMes = item.competencia;
            if (!targetMes || targetMes === "") {
                targetMes = chaveMesFisicoInicio;
            }

            if (!concluido && termino < that.mockToday) {
                if (!mesesAtraso[chaveMesFisicoTermino]) {
                    mesesAtraso[chaveMesFisicoTermino] = { total: 0, tarefas: [] };
                }
                mesesAtraso[chaveMesFisicoTermino].total++;
                mesesAtraso[chaveMesFisicoTermino].tarefas.push({ id: item.id, name: item.name, startMes: targetMes });
            }
            
            if (!concluido && tInicio > that.mockToday) {
                if (!mesesFuturo[chaveMesFisicoInicio]) {
                    mesesFuturo[chaveMesFisicoInicio] = { total: 0, tarefas: [] };
                }
                mesesFuturo[chaveMesFisicoInicio].total++;
                mesesFuturo[chaveMesFisicoInicio].tarefas.push({ id: item.id, name: item.name, startMes: targetMes });
            }
        });

        // ================= CONSTRUIR ATRASOS =================
        var chavesAtraso = Object.keys(mesesAtraso).sort();
        if (chavesAtraso.length === 0) {
            $containerAtrasos.html('<span class="overdue-months-empty">Nenhuma tarefa atrasada fisicamente.</span>');
        } else {
            var htmlAtrasos = chavesAtraso.map(function(chave) {
                var item = mesesAtraso[chave];
                var listaTarefas = '<div class="month-task-list-wrapper" style="display: none;"><div style="padding: 0 4px 4px 4px; margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">';
                item.tarefas.forEach(function(t) {
                    listaTarefas += '<button type="button" class="overdue-task-item" data-task-id="'+ t.id +'" data-task-month="'+ t.startMes +'" style="display: flex; align-items: flex-start; gap: 8px; width: 100%; padding: 8px 10px; background: #fff5f2; border: 1px solid #ffc7b5; border-radius: 6px; cursor: pointer; text-align: left; transition: background 0.2s ease, border-color 0.2s ease;">' +
                                    '<i class="fa-solid fa-circle-exclamation" style="font-size: 12px; color: #e74c3c; flex-shrink: 0; margin-top: 2px;"></i>' + 
                                    '<span style="font-size: 11px; font-weight: 600; color: #991b1b;">' + t.name + '</span>' +
                                    '</button>';
                });
                listaTarefas += '</div></div>';

                return '<div style="margin-bottom: 10px; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.02); width: 100%;">' +
                       '<button type="button" class="toggle-month-btn" data-overdue-month="'+chave+'" style="width: 100%; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: none; border-bottom: 1px solid transparent; padding: 10px 12px; cursor: pointer; transition: background 0.2s;" title="Expandir/Recolher ' + that.formatarCompetencia(chave) + '">' +
                           '<div style="display: flex; gap: 10px; align-items: center;">' +
                               '<div style="background: #fee2e2; color: #e74c3c; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-triangle-exclamation"></i></div>' +
                               '<span style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase;">' + that.formatarCompetencia(chave) + '</span>' +
                           '</div>' +
                           '<div style="display: flex; align-items: center; gap: 12px;">' +
                               '<strong style="background: rgba(231, 76, 60, 0.12); color: #b91c1c; border-radius: 999px; font-size: 11px; height: 22px; min-width: 22px; display: inline-flex; align-items: center; justify-content: center; padding: 0 6px;">' + item.total + '</strong>' +
                               '<i class="fa-solid fa-chevron-down month-toggle-icon" style="color: #64748b; font-size: 12px; transition: transform 0.3s ease;"></i>' +
                           '</div>' +
                       '</button>' +
                       listaTarefas +
                       '</div>';
            }).join("");
            $containerAtrasos.html(htmlAtrasos);
        }
        
        // ================= CONSTRUIR FUTUROS =================
        var chavesFuturo = Object.keys(mesesFuturo).sort();
        if (chavesFuturo.length === 0) {
            $containerFuturos.html('<span class="future-months-empty" style="color: var(--text-muted); font-size: 11px; font-weight: 700;">Nenhuma atividade futura agendada fisicamente.</span>');
        } else {
            var htmlFuturos = chavesFuturo.map(function(chave) {
                var item = mesesFuturo[chave];
                var listaTarefas = '<div class="month-task-list-wrapper" style="display: none;"><div style="padding: 0 4px 4px 4px; margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">';
                item.tarefas.forEach(function(t) {
                    listaTarefas += '<button type="button" class="future-task-item" data-task-id="'+ t.id +'" data-task-month="'+ t.startMes +'" style="display: flex; align-items: flex-start; gap: 8px; width: 100%; padding: 8px 10px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; cursor: pointer; text-align: left; transition: background 0.2s ease, border-color 0.2s ease;">' +
                                    '<i class="fa-regular fa-calendar-plus" style="font-size: 12px; color: #0ea5e9; flex-shrink: 0; margin-top: 2px;"></i>' + 
                                    '<span style="font-size: 11px; font-weight: 600; color: #0369a1;">' + t.name + '</span>' +
                                    '</button>';
                });
                listaTarefas += '</div></div>';

                return '<div style="margin-bottom: 10px; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.02); width: 100%;">' +
                       '<button type="button" class="toggle-month-btn" data-future-month="'+chave+'" style="width: 100%; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: none; border-bottom: 1px solid transparent; padding: 10px 12px; cursor: pointer; transition: background 0.2s;" title="Expandir/Recolher ' + that.formatarCompetencia(chave) + '">' +
                           '<div style="display: flex; gap: 10px; align-items: center;">' +
                               '<div style="background: #e0f2fe; color: #0284c7; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center;"><i class="fa-regular fa-calendar-plus"></i></div>' +
                               '<span style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase;">' + that.formatarCompetencia(chave) + '</span>' +
                           '</div>' +
                           '<div style="display: flex; align-items: center; gap: 12px;">' +
                               '<strong style="background: rgba(2, 132, 199, 0.15); color: #0369a1; border-radius: 999px; font-size: 11px; height: 22px; min-width: 22px; display: inline-flex; align-items: center; justify-content: center; padding: 0 6px;">' + item.total + '</strong>' +
                               '<i class="fa-solid fa-chevron-down month-toggle-icon" style="color: #64748b; font-size: 12px; transition: transform 0.3s ease;"></i>' +
                           '</div>' +
                       '</button>' +
                       listaTarefas +
                       '</div>';
            }).join("");
            $containerFuturos.html(htmlFuturos);
        }
    },

    toggleForm: function() {
        if(!this.editDocId) {
            $("#competenciaEtapa_" + this.instanceId).val($("#mesFiltro_" + this.instanceId).val() || this.getMesAtual());
        }
        
        $("#formDuplicarMes_" + this.instanceId).slideUp();
        $("#formNovaEtapa_" + this.instanceId).slideToggle(); 
    },

    abrirModalDuplicar: function() {
        $("#formNovaEtapa_" + this.instanceId).slideUp();
        
        var mesFiltro = $("#mesFiltro_" + this.instanceId).val();
        $("#mesOrigemDuplicar_" + this.instanceId).val(mesFiltro);
        $("#mesDestinoDuplicar_" + this.instanceId).val("");
        this.renderizarTarefasDuplicar(mesFiltro);
        
        $("#formDuplicarMes_" + this.instanceId).slideDown()[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    cancelarDuplicar: function() {
        $("#formDuplicarMes_" + this.instanceId).slideUp();
        $("#mesOrigemDuplicar_" + this.instanceId).val("");
        $("#mesDestinoDuplicar_" + this.instanceId).val("");
        $("#selecionarTodasDuplicar_" + this.instanceId).prop("checked", true);
        $("#listaTarefasDuplicar_" + this.instanceId).html('<span class="duplicar-empty">Selecione um mês de origem para carregar as tarefas.</span>');
    },

    getTarefasPorMes: function(mesRef) {
        if (!mesRef) return [];
        var that = this;
        // Prioriza a DATA DE INÍCIO para listar o que está na tabela do gestor
        return this.dadosCronograma.filter(function(item) {
            if (item.end === "Data Inválida" || item.end === "A definir") return false;
            
            var tRef = that.parseDate(item.start) || that.parseDate(item.end);
            if (!tRef) return false;
            
            var dRef = new Date(tRef);
            var mesFisico = dRef.getFullYear() + "-" + ("0" + (dRef.getMonth() + 1)).slice(-2);
            
            return mesFisico === mesRef;
        });
    },

    renderizarTarefasDuplicar: function(mesOrigem) {
        var $lista = $("#listaTarefasDuplicar_" + this.instanceId);
        var $selecionarTodas = $("#selecionarTodasDuplicar_" + this.instanceId);
        var tarefas = this.getTarefasPorMes(mesOrigem);
        
        $lista.empty();
        $selecionarTodas.prop("checked", tarefas.length > 0).prop("disabled", tarefas.length === 0);
        
        if (!mesOrigem) {
            $lista.html('<span class="duplicar-empty">Selecione um mês de origem para carregar as tarefas.</span>');
            return;
        }
        if (tarefas.length === 0) {
            $lista.html('<span class="duplicar-empty">Nenhuma tarefa iniciada fisicamente em ' + this.escapeHtml(this.formatarCompetencia(mesOrigem)) + '.</span>');
            return;
        }
        
        var html = tarefas.map(function(item) {
            var periodo = (item.start && item.start !== "A definir" && item.start !== "Data Inválida" ? item.start : item.end) + " a " + item.end;
            return '<label class="duplicar-tarefa-item">' +
                '<input type="checkbox" class="duplicar-tarefa-check" value="' + this.escapeHtml(item.documentId) + '" checked>' +
                '<span class="duplicar-tarefa-info">' +
                    '<strong>' + this.escapeHtml(item.name) + '</strong>' +
                    '<small>' + this.escapeHtml(periodo) + ' | Comp: ' + this.escapeHtml(this.formatarCompetencia(item.competencia)) + '</small>' +
                '</span>' +
            '</label>';
        }, this).join("");
        $lista.html(html);
    },

    deslocarDataMensal: function(dateStr, diffMeses) {
        var p = dateStr.split('/');
        var dia = parseInt(p[0], 10);
        var mes = parseInt(p[1], 10) - 1;
        var ano = parseInt(p[2], 10);
        
        var novoMes = mes + diffMeses;
        var novoAno = ano + Math.floor(novoMes / 12);
        novoMes = novoMes % 12;
        if (novoMes < 0) { novoMes += 12; }
        
        var diasNoNovoMes = new Date(novoAno, novoMes + 1, 0).getDate();
        var novoDia = Math.min(dia, diasNoNovoMes);
        
        var dateObj = new Date(novoAno, novoMes, novoDia);
        
        if (dateObj.getDay() === 6) { 
            dateObj.setDate(dateObj.getDate() + 2);
        } else if (dateObj.getDay() === 0) { 
            dateObj.setDate(dateObj.getDate() + 1);
        }
        
        return ("0" + dateObj.getDate()).slice(-2) + '/' + ("0" + (dateObj.getMonth() + 1)).slice(-2) + '/' + dateObj.getFullYear();
    },

    salvarDuplicar: function() {
        var that = this;
        var mesOrigem = $("#mesOrigemDuplicar_" + that.instanceId).val();
        var mesDestino = $("#mesDestinoDuplicar_" + that.instanceId).val();
        
        if (!mesOrigem || !mesDestino) {
            FLUIGC.toast({ title: 'Atenção: ', message: 'Preencha os meses de origem e destino.', type: 'warning' });
            return;
        }
        if (mesOrigem === mesDestino) {
            FLUIGC.toast({ title: 'Atenção: ', message: 'O mês de origem deve ser diferente do mês de destino.', type: 'warning' });
            return;
        }
        
        var anoOrigem = parseInt(mesOrigem.split('-')[0], 10);
        var mesSelOrigem = parseInt(mesOrigem.split('-')[1], 10);
        var anoDestino = parseInt(mesDestino.split('-')[0], 10);
        var mesSelDestino = parseInt(mesDestino.split('-')[1], 10);
        
        var tarefasOrigem = this.getTarefasPorMes(mesOrigem);
        var idsSelecionados = {};
        
        $("#WidgetGestaoCronograma_" + this.instanceId).find(".duplicar-tarefa-check:checked").each(function() {
            idsSelecionados[$(this).val()] = true;
        });
        tarefasOrigem = tarefasOrigem.filter(function(item) {
            return idsSelecionados[String(item.documentId)] === true;
        });
        if (tarefasOrigem.length === 0) {
            FLUIGC.toast({ title: 'Atenção: ', message: 'Selecione ao menos uma tarefa para duplicar.', type: 'warning' });
            return;
        }
        
        var diffMeses = (anoDestino - anoOrigem) * 12 + (mesSelDestino - mesSelOrigem);
        var novasTarefas = [];
        
        for (var i = 0; i < tarefasOrigem.length; i++) {
            var t = tarefasOrigem[i];
            var endNovo = this.deslocarDataMensal(t.end, diffMeses);
            var startNovo = "";
            var duracaoDias = 0;
            
            if (t.start !== "A definir" && t.start !== "Data Inválida") {
                startNovo = this.deslocarDataMensal(t.start, diffMeses);
                var pIn = startNovo.split('/');
                var pFim = endNovo.split('/');
                var d1 = new Date(pIn[2], pIn[1]-1, pIn[0]);
                var d2 = new Date(pFim[2], pFim[1]-1, pFim[0]);
                duracaoDias = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
            }
            
            var competenciaOrigem = t.competencia || mesOrigem;
            var anoComp = parseInt(competenciaOrigem.split('-')[0], 10);
            var mesComp = parseInt(competenciaOrigem.split('-')[1], 10);
            
            var dComp = new Date(anoComp, mesComp - 1, 1);
            dComp.setMonth(dComp.getMonth() + diffMeses);
            var novaCompetencia = dComp.getFullYear() + "-" + ("0" + (dComp.getMonth() + 1)).slice(-2);
            
            novasTarefas.push({
                "documentDescription": t.name,
                "parentDocumentId": parseInt(that.ID_DO_FORMULARIO, 10),
                "version": 1000,
                "inheritSecurity": true,
                "formData": [
                    { "name": "txt_atividade", "value": t.name },
                    { "name": "txt_descricao", "value": t.desc },
                    { "name": "txt_responsavel", "value": (t.responsavel === "Não atribuído" ? "" : t.responsavel) },
                    { "name": "txt_competencia", "value": novaCompetencia },
                    { "name": "data_inicio", "value": startNovo },
                    { "name": "data_termino", "value": endNovo },
                    { "name": "txt_status", "value": "Pendente" },
                    { "name": "num_duracao", "value": duracaoDias.toString() },
                    { "name": "num_folhas_processadas", "value": t.folhasProcessadas !== null ? t.folhasProcessadas.toString() : "" },
                    { "name": "num_folhas_retrabalho", "value": t.folhasComRetrabalho !== null ? t.folhasComRetrabalho.toString() : "" },
                    { "name": "num_erros_lancamento", "value": t.errosLancamento !== null ? t.errosLancamento.toString() : "" },
                    { "name": "vl_custo_folha", "value": t.custoFolha !== null ? t.custoFolha.toString() : "" },
                    { "name": "num_colaboradores", "value": t.colaboradores !== null ? t.colaboradores.toString() : "" },
                    { "name": "num_admissoes", "value": t.admissoes !== null ? t.admissoes.toString() : "" },
                    { "name": "num_desligamentos", "value": t.desligamentos !== null ? t.desligamentos.toString() : "" }
                ]
            });
        }
        
        var loading = FLUIGC.loading(window);
        loading.show();
        var tarefasSalvas = 0;
        var falhas = 0;
        
        function salvarProximaTarefa(index) {
            if (index >= novasTarefas.length) {
                loading.hide();
                if (falhas === 0) {
                    FLUIGC.toast({ title: 'Sucesso: ', message: tarefasSalvas + ' tarefas foram duplicadas com datas e competências reajustadas!', type: 'success' });
                } else {
                    FLUIGC.toast({ title: 'Concluído: ', message: tarefasSalvas + ' duplicadas. (' + falhas + ' falharam)', type: 'warning' });
                }
                
                that.cancelarDuplicar();
                $("#mesFiltro_" + that.instanceId).val(mesDestino);
                that.atualizarTextoMes(mesDestino);
                that.carregarDadosDoBanco();
                return;
            }
            $.ajax({
                url: '/api/public/2.0/cards/create',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(novasTarefas[index]),
                success: function() { tarefasSalvas++; salvarProximaTarefa(index + 1); },
                error: function() { falhas++; salvarProximaTarefa(index + 1); }
            });
        }
        
        salvarProximaTarefa(0);
    },

    cancelarEtapa: function() {
        $("#formNovaEtapa_" + this.instanceId).slideUp();
        this.editDocId = null;
        $("#atividadeEtapa_" + this.instanceId).val('');
        $("#detalheAtividadeEtapa_" + this.instanceId).val('');
        $("#responsavelEtapa_" + this.instanceId).val('');
        $("#competenciaEtapa_" + this.instanceId).val($("#mesFiltro_" + this.instanceId).val() || this.getMesAtual());
        $("#dataInicio_" + this.instanceId).val('');
        $("#dataTermino_" + this.instanceId).val('');
        
        $("#checkConcluido_" + this.instanceId).prop('checked', false);
        this.calcularStatusDinamico();
        
        $("#folhasProcessadas_" + this.instanceId).val('');
        $("#folhasRetrabalho_" + this.instanceId).val('');
        $("#errosLancamento_" + this.instanceId).val('');
        $("#custoFolha_" + this.instanceId).val('');
        $("#colaboradores_" + this.instanceId).val('');
        $("#admissoes_" + this.instanceId).val('');
        $("#desligamentos_" + this.instanceId).val('');
        
        $("#tituloFormulario_" + this.instanceId).html('<i class="fa-solid fa-pen-to-square"></i> ADICIONAR NOVA ETAPA');
        $("#subtituloFormulario_" + this.instanceId).text('Preencha os detalhes da operação para atualizar o cronograma.');
        $("#btnSalvarForm_" + this.instanceId).html('<i class="fa-solid fa-save"></i> Guardar Etapa');
    },

    editarEtapa: function(el) {
        var docId = $(el).attr('data-docid');
        var itemToEdit = this.dadosCronograma.find(function(i) { return i.documentId == docId; });
        if (!itemToEdit) return;
        
        this.editDocId = docId;
        var formatarData = function(dataBr) {
            if (!dataBr || dataBr === "Data Inválida" || dataBr === "A definir") return "";
            var p = dataBr.split('/');
            return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : "";
        };
        
        $("#atividadeEtapa_" + this.instanceId).val(itemToEdit.name);
        $("#detalheAtividadeEtapa_" + this.instanceId).val(itemToEdit.desc && itemToEdit.desc !== "-" ? itemToEdit.desc : "");
        $("#responsavelEtapa_" + this.instanceId).val(itemToEdit.responsavel === "Não atribuído" ? "" : itemToEdit.responsavel);
        $("#competenciaEtapa_" + this.instanceId).val(itemToEdit.competencia || "");
        $("#dataInicio_" + this.instanceId).val(formatarData(itemToEdit.start));
        $("#dataTermino_" + this.instanceId).val(formatarData(itemToEdit.end));
        
        $("#checkConcluido_" + this.instanceId).prop('checked', itemToEdit.status === 'Concluído');
        this.calcularStatusDinamico();
        
        $("#folhasProcessadas_" + this.instanceId).val(itemToEdit.folhasProcessadas !== null ? itemToEdit.folhasProcessadas : "");
        $("#folhasRetrabalho_" + this.instanceId).val(itemToEdit.folhasComRetrabalho !== null ? itemToEdit.folhasComRetrabalho : "");
        $("#errosLancamento_" + this.instanceId).val(itemToEdit.errosLancamento !== null ? itemToEdit.errosLancamento : "");
        $("#custoFolha_" + this.instanceId).val(itemToEdit.custoFolha !== null ? itemToEdit.custoFolha : "");
        $("#colaboradores_" + this.instanceId).val(itemToEdit.colaboradores !== null ? itemToEdit.colaboradores : "");
        $("#admissoes_" + this.instanceId).val(itemToEdit.admissoes !== null ? itemToEdit.admissoes : "");
        $("#desligamentos_" + this.instanceId).val(itemToEdit.desligamentos !== null ? itemToEdit.desligamentos : "");
        
        $("#tituloFormulario_" + this.instanceId).html('<i class="fa-solid fa-pen"></i> EDITAR ETAPA');
        $("#subtituloFormulario_" + this.instanceId).text('Altere as informações abaixo e clique em Atualizar.');
        $("#btnSalvarForm_" + this.instanceId).html('<i class="fa-solid fa-rotate"></i> Atualizar Etapa');
        
        $("#formDuplicarMes_" + this.instanceId).slideUp();
        $("#formNovaEtapa_" + this.instanceId).slideDown()[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    salvarEtapa: function() {
        var that = this;
        var atividade = $("#atividadeEtapa_" + that.instanceId).val() || "";
        var descricao = $("#detalheAtividadeEtapa_" + that.instanceId).val() || "";
        var responsavel = $("#responsavelEtapa_" + that.instanceId).val() || "";
        var competencia = $("#competenciaEtapa_" + that.instanceId).val() || "";
        var dataInicio = $("#dataInicio_" + that.instanceId).val() || "";
        var dataTermino = $("#dataTermino_" + that.instanceId).val() || "";
        var status = $("#statusEtapa_" + that.instanceId).val() || "Pendente";
        
        var folhasProcessadas = $("#folhasProcessadas_" + that.instanceId).val() || "";
        var folhasRetrabalho = $("#folhasRetrabalho_" + that.instanceId).val() || "";
        var errosLancamento = $("#errosLancamento_" + that.instanceId).val() || "";
        var custoFolha = $("#custoFolha_" + that.instanceId).val() || "";
        var colaboradores = $("#colaboradores_" + that.instanceId).val() || "";
        var admissoes = $("#admissoes_" + that.instanceId).val() || "";
        var desligamentos = $("#desligamentos_" + that.instanceId).val() || "";
        
        if (!atividade || !dataTermino || !competencia) {
            FLUIGC.toast({ title: 'Atenção: ', message: 'Preencha a Tarefa, a Competência e a Data de Término.', type: 'warning' });
            return;
        }
        
        var duracaoDias = 0;
        var srtInicio = "";
        var d2 = new Date(dataTermino + "T00:00:00");
        
        if (isNaN(d2.getTime()) || d2.getFullYear() < 2000 || d2.getFullYear() > 2100) {
            FLUIGC.toast({ title: 'Data de Término Inválida: ', message: 'Verifique os valores do mês/ano.', type: 'warning' });
            return;
        }
        
        if (d2.getDay() === 0 || d2.getDay() === 6) {
            FLUIGC.toast({ title: 'Atenção: ', message: 'A data de término não pode cair no fim de semana (sábado ou domingo).', type: 'warning' });
            return;
        }
        
        if (dataInicio) {
            var d1 = new Date(dataInicio + "T00:00:00");
            if (isNaN(d1.getTime()) || d1.getFullYear() < 2000 || d1.getFullYear() > 2100) {
                FLUIGC.toast({ title: 'Data de Início Inválida: ', message: 'Verifique os valores do mês/ano.', type: 'warning' });
                return;
            }
            
            if (d1.getDay() === 0 || d1.getDay() === 6) {
                FLUIGC.toast({ title: 'Atenção: ', message: 'A data de início não pode cair no fim de semana (sábado ou domingo).', type: 'warning' });
                return;
            }
            
            if (d2 < d1) {
                FLUIGC.toast({ title: 'Atenção: ', message: 'A data de término não pode ser anterior à data de início.', type: 'warning' });
                return;
            }
            duracaoDias = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
            srtInicio = dataInicio.split('-').reverse().join('/');
        }
        
        var strTermino = dataTermino.split('-').reverse().join('/');
        
        var pacoteDados = {
            "documentDescription": atividade,
            "parentDocumentId": parseInt(that.ID_DO_FORMULARIO, 10),
            "version": 1000,
            "inheritSecurity": true,
            "formData": [
                { "name": "txt_atividade", "value": atividade },
                { "name": "txt_descricao", "value": descricao },
                { "name": "txt_responsavel", "value": responsavel },
                { "name": "txt_competencia", "value": competencia },
                { "name": "data_inicio", "value": srtInicio },
                { "name": "data_termino", "value": strTermino },
                { "name": "txt_status", "value": status },
                { "name": "num_duracao", "value": duracaoDias.toString() },
                { "name": "num_folhas_processadas", "value": folhasProcessadas },
                { "name": "num_folhas_retrabalho", "value": folhasRetrabalho },
                { "name": "num_erros_lancamento", "value": errosLancamento },
                { "name": "vl_custo_folha", "value": custoFolha },
                { "name": "num_colaboradores", "value": colaboradores },
                { "name": "num_admissoes", "value": admissoes },
                { "name": "num_desligamentos", "value": desligamentos }
            ]
        };
        
        var loading = FLUIGC.loading(window);
        loading.show();
        
        if (this.editDocId) {
            $.ajax({
                url: '/api/public/2.0/documents/deleteDocument/' + that.editDocId,
                type: 'POST',
                success: function() {
                    $.ajax({ 
                        url: '/api/public/2.0/cards/create', 
                        type: 'POST', 
                        contentType: 'application/json', 
                        data: JSON.stringify(pacoteDados),
                        success: function() { loading.hide(); FLUIGC.toast({ title: 'Sucesso: ', message: 'Atualizado!', type: 'success' }); that.cancelarEtapa(); that.carregarDadosDoBanco(); },
                        error: function() { loading.hide(); FLUIGC.toast({ title: 'Erro: ', message: 'Falha ao gravar.', type: 'danger' }); }
                    });
                }, error: function() { loading.hide(); FLUIGC.toast({ title: 'Erro: ', message: 'Não foi possível atualizar.', type: 'danger' }); }
            });
        } else {
            $.ajax({ 
                url: '/api/public/2.0/cards/create', 
                type: 'POST', 
                contentType: 'application/json', 
                data: JSON.stringify(pacoteDados),
                success: function() { loading.hide(); FLUIGC.toast({ title: 'Sucesso: ', message: 'Salvo!', type: 'success' }); that.cancelarEtapa(); that.carregarDadosDoBanco(); },
                error: function() { loading.hide(); FLUIGC.toast({ title: 'Erro: ', message: 'Falha ao salvar no Fluig.', type: 'danger' }); }
            });
        }
    },

    excluirEtapa: function(el) {
        var that = this;
        var docId = $(el).attr('data-docid');
        if (!docId) return;
        
        FLUIGC.message.confirm({ message: 'Excluir esta etapa do cronograma?', title: 'Confirmar Exclusão', labelYes: 'Sim, Excluir', labelNo: 'Cancelar' }, function(res) {
            if (res) {
                var loading = FLUIGC.loading(window); loading.show();
                $.ajax({ url: '/api/public/2.0/documents/deleteDocument/' + docId, type: 'POST',
                    success: function() { loading.hide(); FLUIGC.toast({ title: 'Sucesso: ', message: 'Etapa excluída!', type: 'success' }); that.carregarDadosDoBanco(); },
                    error: function() { loading.hide(); FLUIGC.toast({ title: 'Erro: ', message: 'Não foi possível excluir.', type: 'danger' }); }
                });
            }
        });
    }
});