<!-- gestao_cronograma / view.ftl — código completo final -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

<div id="WidgetGestaoCronograma_${instanceId}" class="super-widget wcm-widget-class widget-cronograma" data-params="WidgetGestaoCronograma.instance()">
    <div class="crono-wrapper" style="font-family: 'Montserrat', sans-serif;">
        <div class="crono-container">
            
            <header class="crono-header" style="display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 20px; margin-bottom: 30px; border-bottom: 1px solid var(--border-color, #e2e8f0); padding-bottom: 20px;">
                <div class="header-banner" style="display: flex; align-items: center; gap: 12px;">
                    <img src="/gestao_cronograma_takono/resources/images/IRHO-BRANCO.png" alt="Logo" class="banner-logo" onerror="this.style.display='none'" style="margin: 0; max-height: 42px;">
                    <div class="header-text" style="text-align: left; margin: 0;">
                        <h1 style="margin: 0 0 2px 0; font-size: 25px; font-weight: 700; font-family: 'Montserrat', sans-serif; letter-spacing: -0.5px;">GESTÃO DO CRONOGRAMA</h1>
                        <p class="banner-subtitle" style="margin: 0; font-size: 12px; font-family: 'Montserrat', sans-serif; opacity: 0.8;">Painel de Acompanhamento e Implantação de Clientes</p>
                    </div>
                </div>

                <div class="header-filter" style="background: linear-gradient(135deg, #002b5c 0%, #0056b3 100%); padding: 8px 24px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.18); display: inline-flex; align-items: center; justify-content: center; gap: 14px; box-shadow: 0 4px 12px rgba(0, 43, 92, 0.15);">
                    <button type="button" class="btn-month-nav" id="btnPrevMes_${instanceId}" title="Mês anterior" aria-label="Mês anterior">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    
                    <label style="margin: 0; font-weight: 600; font-size: 18px; text-transform: lowercase; display: flex; align-items: center; gap: 10px; cursor: pointer; font-family: 'Montserrat', sans-serif;" onclick="try { document.getElementById('mesFiltro_${instanceId}').showPicker(); } catch(e) {}" title="Clique para trocar de mês">
                        <i class="fa-regular fa-calendar-days" style="color: #ffffff; font-size: 20px;"></i> 
                        <span id="textoMesFiltro_${instanceId}" style="padding-bottom: 2px; text-align: center; color: #ffffff; font-weight: 700;">-</span>
                    </label>
                    <button type="button" class="btn-month-nav" id="btnNextMes_${instanceId}" title="Próximo mês" aria-label="Próximo mês">
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>
                    <input type="month" id="mesFiltro_${instanceId}" style="width: 0; height: 0; opacity: 0; position: absolute; z-index: -1;">
                </div>
            </header>

            <div class="crono-actions" style="display: flex; gap: 15px; justify-content: flex-end;">
                <button class="btn-crono-outline" data-abrir-modal-duplicar>
                    <i class="fa-regular fa-copy"></i> Duplicar Mês
                </button>
                <button class="btn-crono-gradient" data-toggle-form>
                    <i class="fa-solid fa-plus"></i> Nova Etapa
                </button>
            </div>

            <div id="modoSomenteVisualizacao_${instanceId}" class="view-only-alert" style="display: none;">
                <i class="fa-solid fa-eye"></i>
                <span>Competências anteriores estão disponíveis apenas para visualização.</span>
            </div>

            <div id="formDuplicarMes_${instanceId}" class="crono-form-card" style="display: none; border-top: 5px solid var(--brand-orange);">
                <div class="form-card-header">
                    <h3 style="color: var(--brand-orange);"><i class="fa-regular fa-copy"></i> DUPLICAR TAREFAS DO MÊS</h3>
                    <p>Selecione o mês de origem (que possui as tarefas) e o mês de destino para copi-las automaticamente. O sistema recalculará os dias.</p>
                </div>
                
                <div class="row">
                    <div class="form-group col-md-3">
                        <label for="mesOrigemDuplicar_${instanceId}">Mês de Origem</label>
                        <input type="month" class="form-control" id="mesOrigemDuplicar_${instanceId}">
                    </div>
                    <div class="form-group col-md-3">
                        <label for="mesDestinoDuplicar_${instanceId}">Mês de Destino</label>
                        <input type="month" class="form-control" id="mesDestinoDuplicar_${instanceId}">
                    </div>
                </div>

                <div class="duplicar-tarefas-panel">
                    <div class="duplicar-tarefas-header">
                        <span>Tarefas que serão duplicadas</span>
                        <label class="duplicar-select-all">
                            <input type="checkbox" id="selecionarTodasDuplicar_${instanceId}" checked>
                            Selecionar todas
                        </label>
                    </div>
                    <div id="listaTarefasDuplicar_${instanceId}" class="duplicar-tarefas-list">
                        <span class="duplicar-empty">Selecione um mês de origem para carregar as tarefas.</span>
                    </div>
                </div>

                <div class="form-card-footer">
                    <button class="btn-crono-outline" data-cancelar-duplicar>Cancelar</button>
                    <button class="btn-crono-save" id="btnSalvarDuplicar_${instanceId}" data-salvar-duplicar>
                         <i class="fa-solid fa-copy"></i> Confirmar Duplicação
                    </button>
                </div>
            </div>

            <div id="formNovaEtapa_${instanceId}" class="crono-form-card" style="display: none;">
                <div class="form-card-header">
                    <h3 id="tituloFormulario_${instanceId}"><i class="fa-solid fa-pen-to-square"></i> ADICIONAR NOVA ETAPA</h3>
                    <p id="subtituloFormulario_${instanceId}">Preencha os detalhes da operação para atualizar o cronograma.</p>
                </div>
                
                <div class="row">
                    <div class="form-group col-md-3">
                        <label for="atividadeEtapa_${instanceId}">Atividade</label>
                        <div class="input-with-icon">
                            <i class="fa-solid fa-tag"></i>
                            <input type="text" class="form-control" id="atividadeEtapa_${instanceId}" placeholder="Nome da Tarefa">
                        </div>
                    </div>
                    <div class="form-group col-md-2">
                        <label for="responsavelEtapa_${instanceId}">Responsável</label>
                        <div class="input-with-icon">
                            <i class="fa-solid fa-user"></i>
                            <select class="form-control" id="responsavelEtapa_${instanceId}">
                                <option value="">Selecione...</option>
                                <option value="Cliente">Cliente</option>
                                <option value="IRHO">IRHO</option>
                                <option value="Takono">Takono</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group col-md-2">
                        <label for="competenciaEtapa_${instanceId}">Competência</label>
                        <input type="month" class="form-control" id="competenciaEtapa_${instanceId}" title="Mês e Ano da Competência">
                    </div>
                    <div class="form-group col-md-2">
                        <label for="dataInicio_${instanceId}">Início</label>
                        <input type="date" class="form-control" id="dataInicio_${instanceId}">
                    </div>
                    <div class="form-group col-md-2">
                        <label for="dataTermino_${instanceId}">Término</label>
                        <input type="date" class="form-control" id="dataTermino_${instanceId}">
                    </div>
                    <div class="form-group col-md-1" style="display: flex; flex-direction: column;">
                        <label>Status</label>
                        <div style="display: flex; align-items: center; gap: 4px; margin-top: 5px; min-height: 34px;">
                            <span id="statusCalculado_${instanceId}" style="font-weight: 700; color: var(--text-muted); font-size: 11px; background: #f1f5f9; padding: 4px 6px; border-radius: 4px; border: 1px solid #e2e8f0; display: inline-block; min-width: 60px; text-align: center;">Pendente</span>
                            <label style="display: flex; align-items: center; gap: 2px; cursor: pointer; margin: 0; font-size: 11px; color: #16a34a; background: #ecfdf5; padding: 4px; border-radius: 4px; border: 1px solid #d1fae5; transition: all 0.2s;" title="Marcar como concluído">
                                <input type="checkbox" id="checkConcluido_${instanceId}" style="width: 14px; height: 14px; margin: 0; cursor: pointer;">
                            </label>
                        </div>
                        <input type="hidden" id="statusEtapa_${instanceId}" value="Pendente">
                    </div>
                </div>

                <div class="row">
                    <div class="form-group col-md-12">
                        <label for="detalheAtividadeEtapa_${instanceId}">Detalhe da Atividade <small style="font-weight: 500; color: var(--text-muted);">(exibido ao passar o mouse sobre a atividade no cronograma)</small></label>
                        <textarea class="form-control" id="detalheAtividadeEtapa_${instanceId}" rows="2" placeholder="Descreva detalhes complementares desta atividade..."></textarea>
                    </div>
                </div>

                <div class="row metrics-row">
                    <div class="form-group col-md-2">
                        <label for="folhasProcessadas_${instanceId}">Folhas Processadas</label>
                        <input type="number" min="0" step="1" class="form-control" id="folhasProcessadas_${instanceId}">
                    </div>
                    <div class="form-group col-md-2">
                        <label for="folhasRetrabalho_${instanceId}">Folhas com Retrabalho</label>
                        <input type="number" min="0" step="1" class="form-control" id="folhasRetrabalho_${instanceId}">
                    </div>
                    <div class="form-group col-md-2">
                        <label for="errosLancamento_${instanceId}">Erros de Lançamento</label>
                        <input type="number" min="0" step="1" class="form-control" id="errosLancamento_${instanceId}">
                    </div>
                    <div class="form-group col-md-2">
                        <label for="custoFolha_${instanceId}">Custo da Folha</label>
                        <input type="number" min="0" step="0.01" class="form-control" id="custoFolha_${instanceId}">
                    </div>
                    <div class="form-group col-md-2">
                        <label for="colaboradores_${instanceId}">Colaboradores</label>
                        <input type="number" min="0" step="1" class="form-control" id="colaboradores_${instanceId}">
                    </div>
                    <div class="form-group col-md-1">
                        <label for="admissoes_${instanceId}">Admissões</label>
                        <input type="number" min="0" step="1" class="form-control" id="admissoes_${instanceId}">
                    </div>
                    <div class="form-group col-md-1">
                        <label for="desligamentos_${instanceId}">Deslig.</label>
                        <input type="number" min="0" step="1" class="form-control" id="desligamentos_${instanceId}">
                    </div>
                </div>

                <div class="form-card-footer">
                    <button class="btn-crono-outline" data-cancelar-etapa>Cancelar</button>
                    <button class="btn-crono-save" id="btnSalvarForm_${instanceId}" data-salvar-etapa>
                        <i class="fa-solid fa-save"></i> Guardar Etapa
                    </button>
                </div>
             </div>

            <div class="main-content" style="display: grid; grid-template-columns: 1.8fr 0.8fr; gap: 25px; margin-bottom: 25px;">
                <div class="left-column">
                    <div class="responsavel-legend">
                        <span class="responsavel-legend-item"><span class="responsavel-dot resp-cliente-bg"></span> Cliente</span>
                        <span class="responsavel-legend-item"><span class="responsavel-dot resp-irho-bg"></span> IRHO</span>
                        <span class="responsavel-legend-item"><span class="responsavel-dot resp-outros-bg"></span> Takono</span>
                    </div>
                    <div class="table-container">
                        <table style="width: 100%;">
                            <thead>
                                <tr>
                                    <th style="width: 5%;">ETAPA</th>
                                    <th style="width: 35%;">TAREFAS</th>
                                    <th style="width: 15%;">RESPONSÁVEL</th>
                                    <th style="width: 9%;">INÍCIO</th>
                                    <th style="width: 9%;">TÉRMINO</th>
                                    <th style="width: 8%;">DURAÇÃO</th>
                                    <th style="width: 9%;">COMPETÊNCIA</th>
                                    <th style="width: 10%;">STATUS</th>
                                    <th style="width: 10%; text-align: center;">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody id="tbody-gestao-${instanceId}"></tbody>
                        </table>
                    </div>

                    <section class="gestao-kpi-panel" aria-label="Indicadores de Gestão">
                        <div class="gestao-kpi-header">
                            <div>
                                <span class="gestao-kpi-eyebrow">Indicadores de Gestão</span>
                                <h2>KPIs da Competência</h2>
                            </div>
                            <div class="gestao-kpi-period">
                                <i class="fa-regular fa-calendar-check"></i>
                                <span id="gestao-kpi-periodo-${instanceId}">-</span>
                            </div>
                        </div>

                        <div class="gestao-kpi-grid">
                            <div class="gestao-kpi-card">
                                <div class="gestao-kpi-icon"><i class="fa-solid fa-list-check"></i></div>
                                <span>Execução</span>
                                <strong id="gestao-kpi-execucao-${instanceId}">0%</strong>
                                <small id="gestao-kpi-execucao-desc-${instanceId}">0 de 0 etapas concluídas</small>
                            </div>
                            <div class="gestao-kpi-card">
                                <div class="gestao-kpi-icon danger"><i class="fa-solid fa-triangle-exclamation"></i></div>
                                <span>Atrasos</span>
                                <strong id="gestao-kpi-atrasos-${instanceId}">0</strong>
                                <small id="gestao-kpi-atrasos-desc-${instanceId}">Nenhuma etapa crítica</small>
                            </div>
                            <div class="gestao-kpi-card">
                                <div class="gestao-kpi-icon success"><i class="fa-solid fa-circle-check"></i></div>
                                <span>Acerto da Folha</span>
                                <strong id="gestao-kpi-acerto-${instanceId}">--</strong>
                                <small id="gestao-kpi-acerto-desc-${instanceId}">Aguardando volume processado</small>
                            </div>
                            <div class="gestao-kpi-card">
                                <div class="gestao-kpi-icon cost"><i class="fa-solid fa-coins"></i></div>
                                <span>Custo por Colaborador</span>
                                <strong id="gestao-kpi-custo-${instanceId}">--</strong>
                                <small id="gestao-kpi-custo-desc-${instanceId}">Aguardando custo e headcount</small>
                            </div>
                        </div>
                    </section>
                </div>

                <div class="right-column">
                    <div class="calendar-container">
                        <div class="calendar-header" style="justify-content: center; padding: 15px 0;">
                            <h3 id="month-year_${instanceId}" style="margin: 0; text-align: center; width: 100%; font-family: 'Montserrat', sans-serif;">-</h3>
                        </div>
                        <div class="calendar-body">
                            <div class="calendar-days-name"><span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span></div>
                            <div class="calendar-days" id="calendar-days_${instanceId}"></div>
                        </div>
                        <div class="calendar-legend">
                            <div class="legend-item"><span class="legend-color start"></span> Início de Etapa</div>
                            <div class="legend-item"><span class="legend-color end"></span> Término de Etapa</div>
                        </div>
                        
                        <div id="due-this-month-container-${instanceId}"></div>

                        <div class="overdue-months-panel">
                            <div class="overdue-months-title">
                                <div style="display: flex; align-items: center; gap: 7px;">
                                    <i class="fa-solid fa-triangle-exclamation"></i>
                                    <span>Atividades Atrasadas</span>
                                </div>
                            </div>
                            <div id="overdue-months-${instanceId}" class="overdue-months-list">
                                <span class="overdue-months-empty">Nenhuma tarefa atrasada em outras competências.</span>
                            </div>
                        </div>

                        <div class="future-months-panel">
                            <div class="future-months-title">
                                <div style="display: flex; align-items: center; gap: 7px;">
                                    <i class="fa-solid fa-calendar-arrow-up"></i>
                                    <span>Atividades Futuras</span>
                                </div>
                            </div>
                            <div id="future-months-${instanceId}" class="future-months-list">
                                <span class="future-months-empty">Nenhuma atividade futura agendada.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="info-footer"></div>
        </div>
    </div>
</div>
<script type="text/javascript" src="/gestao_cronograma_takono/resources/js/gestao_cronograma_takono.js"></script>