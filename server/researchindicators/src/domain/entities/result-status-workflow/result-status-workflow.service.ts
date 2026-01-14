import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, DeepPartial, EntityManager, In } from 'typeorm';
import { ResultStatusWorkflow } from './entities/result-status-workflow.entity';
import { ResultsUtil } from '../../shared/utils/results.util';
import { cleanName, isEmpty } from '../../shared/utils/object.utils';
import { Result } from '../results/entities/result.entity';
import { ResultStatus } from '../result-status/entities/result-status.entity';
import { StatusWorkflowFunctionHandlerService } from './function-handler.service';
import { SubmissionHistory } from '../green-checks/entities/submission-history.entity';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { AditionalDataChangeStatusDto } from './dto/aditional-data.dto';
import { StatusTransitionTree } from './satus-graph';
import {
  ConfigWorkflowAction,
  ConfigWorkflowActionEmail,
  ConfigWorkflowActionFunction,
  ConfigWorkflowDto,
  ConfigWorkFlowTypeEnum,
  GeneralDataDto,
} from './config/config-workflow';
import Handlebars from 'handlebars';

@Injectable()
export class ResultStatusWorkflowService {
  private _validateFunction(functionName: string) {
    if (isEmpty(this.handlerService?.[functionName]))
      throw new InternalServerErrorException(
        `The configuration of change status is not valid`,
      );
  }

  constructor(
    private readonly dataSource: DataSource,
    private readonly currentResult: ResultsUtil,
    private readonly currentUserUtil: CurrentUserUtil,
    private readonly handlerService: StatusWorkflowFunctionHandlerService,
  ) {}

  private async getStatusesByIds(statusIds: number[]) {
    return this.dataSource.getRepository(ResultStatus).find({
      where: {
        result_status_id: In(statusIds),
        is_active: true,
      },
    });
  }

  private async getStatusDepthMapByIndicatorId(indicatorId: number) {
    const transitions = await this.getAllStatusesByindicatorId(indicatorId);
    const tree = new StatusTransitionTree(transitions as any);
    const graph = tree.getGraph();

    const depth = new Map<number, number>();
    const queue: { id: number; d: number }[] = [];

    const roots =
      graph.rootNodes.length > 0
        ? graph.rootNodes
        : Array.from(graph.nodes.values());

    for (const r of roots) {
      const existing = depth.get(r.statusId);
      if (existing === undefined || 0 < existing) {
        depth.set(r.statusId, 0);
        queue.push({ id: r.statusId, d: 0 });
      }
    }

    while (queue.length > 0) {
      const { id, d } = queue.shift();
      const node = graph.nodes.get(id);
      if (!node) continue;

      for (const nxt of node.transitions.to) {
        const nd = d + 1;
        const prev = depth.get(nxt.statusId);
        if (prev === undefined || nd < prev) {
          depth.set(nxt.statusId, nd);
          queue.push({ id: nxt.statusId, d: nd });
        }
      }
    }

    return depth;
  }

  private getTransitionDirection(
    fromStatusId: number,
    toStatusId: number,
    depthMap: Map<number, number>,
  ): 'forward' | 'backward' | 'unknown' {
    const fromDepth = depthMap.get(fromStatusId);
    const toDepth = depthMap.get(toStatusId);
    if (fromDepth === undefined || toDepth === undefined) return 'unknown';
    if (toDepth > fromDepth) return 'forward';
    if (toDepth < fromDepth) return 'backward';
    return 'unknown';
  }

  async getAllStatusesByindicatorId(indicatorId: number) {
    return this.dataSource
      .getRepository(ResultStatusWorkflow)
      .find({
        where: {
          indicator_id: indicatorId,
          is_active: true,
        },
        relations: {
          from_status: true,
          to_status: true,
        },
      })
      .then((statuses) =>
        statuses.map((el) => {
          delete el.config;
          return el;
        }),
      );
  }

  async getHierarchicalTreeByIndicatorId(indicatorId: number) {
    const statuses = await this.getAllStatusesByindicatorId(indicatorId);
    const tree = new StatusTransitionTree(statuses);
    return tree.getHierarchicalTree();
  }

  async getConfigWorkflowByIndicatorAndFromStatus(
    indicatorId: number,
    fromStatusId: number,
    showOnlyWorkflow: boolean = false,
  ) {
    const statuses = await this.dataSource
      .getRepository(ResultStatusWorkflow)
      .find({
        where: {
          indicator_id: indicatorId,
          is_active: true,
          from_status_id: fromStatusId,
        },
      });

    if (showOnlyWorkflow) return statuses;

    const toStatusIds = statuses.map((el) => el.to_status_id);
    const [toStatuses, depthMap] = await Promise.all([
      this.getStatusesByIds(toStatusIds),
      this.getStatusDepthMapByIndicatorId(indicatorId),
    ]);

    const statusById = new Map<number, ResultStatus>(
      toStatuses.map((s) => [s.result_status_id, s]),
    );

    return toStatusIds
      .map((toId) => statusById.get(toId))
      .filter((s) => !!s)
      .map((s) => ({
        ...s,
        transition_direction: this.getTransitionDirection(
          fromStatusId,
          s.result_status_id,
          depthMap,
        ),
      }));
  }

  async getNextStepsByResultId(resultId: number) {
    let indicatorId: number, currentStatusId: number;
    if (isEmpty(this.currentResult?.nullResultId)) {
      await this.dataSource
        .getRepository(Result)
        .findOne({
          where: {
            result_id: resultId,
            is_active: true,
          },
          select: {
            indicator_id: true,
            result_status_id: true,
          },
        })
        .then((result) => {
          indicatorId = result.indicator_id;
          currentStatusId = result.result_status_id;
        });
    } else {
      indicatorId = this.currentResult.indicatorId;
      currentStatusId = this.currentResult.statusId;
    }
    return this.getConfigWorkflowByIndicatorAndFromStatus(
      indicatorId,
      currentStatusId,
    );
  }

  async changeStatus(
    resultId: number,
    toStatusId: number,
    aditionalData: AditionalDataChangeStatusDto,
  ) {
    const result = await this.dataSource.getRepository(Result).findOne({
      where: {
        result_id: resultId,
        is_active: true,
      },
    });
    if (!result) {
      throw new NotFoundException('Result not found');
    }

    const transitionStatus = await this.dataSource
      .getRepository(ResultStatusWorkflow)
      .findOne({
        where: {
          indicator_id: result.indicator_id,
          from_status_id: result.result_status_id,
          to_status_id: toStatusId,
          is_active: true,
        },
      });

    if (!transitionStatus) {
      throw new NotFoundException('Is not a valid status change');
    }

    const generalData = new GeneralDataDto();

    generalData.result = result;
    generalData.aditionalData = aditionalData;
    generalData.customData.action_executor.name =
      cleanName(this.currentUserUtil.user.first_name) +
      ' ' +
      cleanName(this.currentUserUtil.user.last_name);
    generalData.customData.action_executor.email =
      this.currentUserUtil.user.email;

    const history = this._createHistory(
      transitionStatus,
      result,
      aditionalData,
    );

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(SubmissionHistory).insert(history);
      await manager.getRepository(Result).update(resultId, {
        result_status_id: toStatusId,
        ...this.currentUserUtil.audit(SetAuditEnum.UPDATE),
      });
      await this._executeConfigWorkflow(
        transitionStatus.config,
        manager,
        generalData,
      );
    });
  }

  private sortActionsByPriority(
    actions: DeepPartial<ConfigWorkflowAction>[],
    priorityOrder?: ConfigWorkFlowTypeEnum[],
  ): DeepPartial<ConfigWorkflowAction>[] {
    const defaultOrder = [
      ConfigWorkFlowTypeEnum.VALIDATION,
      ConfigWorkFlowTypeEnum.FUNCTION,
      ConfigWorkFlowTypeEnum.EMAIL,
    ];

    const order = priorityOrder || defaultOrder;

    const priorityMap = new Map<ConfigWorkFlowTypeEnum, number>();
    order.forEach((type, index) => {
      priorityMap.set(type, index);
    });

    return [...actions].sort((a, b) => {
      const priorityA = priorityMap.get(a.type) ?? Number.MAX_SAFE_INTEGER;
      const priorityB = priorityMap.get(b.type) ?? Number.MAX_SAFE_INTEGER;
      return priorityA - priorityB;
    });
  }

  private async _executeConfigWorkflow(
    config: DeepPartial<ConfigWorkflowDto>,
    manager: EntityManager,
    generalData: GeneralDataDto,
  ) {
    if (config?.actions?.length === 0) return;
    const workflowActions = {
      [ConfigWorkFlowTypeEnum.FUNCTION]: async (
        action: DeepPartial<ConfigWorkflowAction>,
      ) => {
        const config: ConfigWorkflowActionFunction =
          action.config as ConfigWorkflowActionFunction;
        this._validateFunction(config?.function_name);
        await this.handlerService?.[config?.function_name](
          generalData,
          manager,
        );
      },
      [ConfigWorkFlowTypeEnum.VALIDATION]: async (
        action: DeepPartial<ConfigWorkflowAction>,
      ) => {
        const config: ConfigWorkflowActionFunction =
          action.config as ConfigWorkflowActionFunction;

        this._validateFunction(config?.function_name);
        await this.handlerService?.[config?.function_name](
          generalData,
          manager,
        );
      },
      [ConfigWorkFlowTypeEnum.EMAIL]: async (
        action: DeepPartial<ConfigWorkflowAction>,
      ) => {
        const config = action.config as ConfigWorkflowActionEmail;
        generalData.configEmail.templateCode = config.template;
        generalData.configEmail.rawTemplate =
          await this.handlerService.getTemplate(generalData, manager);

        this._validateFunction(config?.custom_data_resolver);
        await this.handlerService?.[config?.custom_data_resolver](
          generalData,
          manager,
        );

        this._validateFunction(config?.custom_config_email);
        await this.handlerService?.[config?.custom_config_email](
          generalData,
          manager,
        );
        generalData.configEmail.body = Handlebars.compile(
          generalData.configEmail.rawTemplate,
        )(generalData.customData);
        await this.handlerService.sendEmail(generalData, manager);
      },
    };
    if (!isEmpty(config?.actions)) {
      const sortedActions = this.sortActionsByPriority(config.actions);
      for (const action of sortedActions) {
        await workflowActions[action.type](action);
      }
    }
  }

  private _createHistory(
    transitionStatus: ResultStatusWorkflow,
    result: Result,
    aditionalData: AditionalDataChangeStatusDto,
  ) {
    const history = new SubmissionHistory();
    history.result_id = result.result_id;
    history.from_status_id = transitionStatus.from_status_id;
    history.to_status_id = transitionStatus.to_status_id;
    history.submission_comment = aditionalData.submission_comment;
    history.created_by = this.currentUserUtil.user_id;
    return history;
  }
}
