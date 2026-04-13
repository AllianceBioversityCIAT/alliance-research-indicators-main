# Métodos de servicio sin prueba unitaria evidente

Generado por `npm run docs:service-test-gaps` (no editar a mano; volver a generar).

## Criterios

- **Alcance:** `src/**/*.service.ts` en el paquete **researchindicators** (sin `.spec.` en el nombre del archivo).
- **Clase:** nombre termina en `Service`.
- **Métodos listados:** `MethodDeclaration` público (sin `private` / `protected`), distinto de `constructor`; más propiedades con función flecha o `function` como valor inicial.
- **Sin `*.service.spec.ts`:** todos los métodos anteriores se consideran sin prueba de servicio.
- **Con spec:** se considera cubierto si el texto del spec contiene `.nombreMetodo(`, `jest.spyOn(..., 'nombreMetodo')` o `spyOn(..., 'nombreMetodo')`. Lo demás sigue listado (heurística; puede haber falsos positivos/negativos).

## Resumen

| Métrica | Valor |
|--------|------:|
| Archivos `*.service.ts` | 127 |
| Con `*.service.spec.ts` colocalizado | 14 |
| Sin spec de servicio | 113 |
| Entradas numeradas (huecos detectados) | 207 |

---

## AdminService

- Archivo: `src/admin/services/admin.service.ts`
- Spec: _ninguno_

1. `AdminService.getDashboardStats` _(tipo: method)_
2. `AdminService.getRecentActivity` _(tipo: method)_

## ReactRendererService

- Archivo: `src/admin/services/react-renderer.service.ts`
- Spec: _ninguno_

3. `ReactRendererService.render` _(tipo: method)_

## AppService

- Archivo: `src/app.service.ts`
- Spec: _ninguno_

4. `AppService.getHello` _(tipo: method)_

## DynamoService

- Archivo: `src/db/config/dynamo/dynamo.service.ts`
- Spec: _ninguno_

5. `DynamoService.findAll` _(tipo: method)_

## UserService

- Archivo: `src/domain/complementary-entities/secondary/user/user.service.ts`
- Spec: _ninguno_

6. `UserService.find` _(tipo: method)_
7. `UserService.existUsers` _(tipo: method)_

## ActorRolesService

- Archivo: `src/domain/entities/actor-roles/actor-roles.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## AgressoContractCountriesService

- Archivo: `src/domain/entities/agresso-contract-countries/agresso-contract-countries.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## AgressoContractService

- Archivo: `src/domain/entities/agresso-contract/agresso-contract.service.ts`
- Spec: `src/domain/entities/agresso-contract/agresso-contract.service.spec.ts`

_Todos los métodos públicos de esta clase tienen al menos una referencia heurística en el spec (revisar manualmente la calidad de la prueba)._

## AllianceUserStaffGroupsService

- Archivo: `src/domain/entities/alliance-user-staff-groups/alliance-user-staff-groups.service.ts`
- Spec: _ninguno_

8. `AllianceUserStaffGroupsService.findAllMap` _(tipo: method)_

## AllianceUserStaffService

- Archivo: `src/domain/entities/alliance-user-staff/alliance-user-staff.service.ts`
- Spec: _ninguno_

9. `AllianceUserStaffService.findUserByFirstAndLastName` _(tipo: method)_
10. `AllianceUserStaffService.findBySearch` _(tipo: method)_
11. `AllianceUserStaffService.findWithFilters` _(tipo: method)_

## AnnouncementSettingsService

- Archivo: `src/domain/entities/announcement-settings/announcement-settings.service.ts`
- Spec: _ninguno_

12. `AnnouncementSettingsService.getAvailableAnnouncements` _(tipo: method)_

## AppConfigService

- Archivo: `src/domain/entities/app-config/app-config.service.ts`
- Spec: _ninguno_

13. `AppConfigService.findConfigByKey` _(tipo: method)_
14. `AppConfigService.updateConfig` _(tipo: method)_

## AppSecretHostListService

- Archivo: `src/domain/entities/app-secret-host-list/app-secret-host-list.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## AppSecretsService

- Archivo: `src/domain/entities/app-secrets/app-secrets.service.ts`
- Spec: _ninguno_

15. `AppSecretsService.generateRandomPassword` _(tipo: method)_
16. `AppSecretsService.createCredentials` _(tipo: method)_
17. `AppSecretsService.validation` _(tipo: method)_

## ConnectionService

- Archivo: `src/domain/entities/connections/connections.service.ts`
- Spec: _ninguno_

18. `ConnectionService.createConnection` _(tipo: method)_

## ContractRolesService

- Archivo: `src/domain/entities/contract-roles/contract-roles.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## CountryRolesService

- Archivo: `src/domain/entities/country-roles/country-roles.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## DegreesService

- Archivo: `src/domain/entities/degrees/degrees.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## DeliveryModalitiesService

- Archivo: `src/domain/entities/delivery-modalities/delivery-modalities.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## DisseminationQualificationsService

- Archivo: `src/domain/entities/dissemination-qualifications/dissemination-qualifications.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## EvidenceRolesService

- Archivo: `src/domain/entities/evidence-roles/evidence-roles.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## ExpansionPotentialsService

- Archivo: `src/domain/entities/expansion-potentials/expansion-potentials.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## GendersService

- Archivo: `src/domain/entities/genders/genders.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## GreenChecksService

- Archivo: `src/domain/entities/green-checks/green-checks.service.ts`
- Spec: _ninguno_

19. `GreenChecksService.findByResultId` _(tipo: method)_
20. `GreenChecksService.statusManagement` _(tipo: method)_
21. `GreenChecksService.saveHistory` _(tipo: method)_
22. `GreenChecksService.prepareDataToEmail` _(tipo: method)_
23. `GreenChecksService.prepareEmail` _(tipo: method)_
24. `GreenChecksService.getSubmissionHistory` _(tipo: method)_
25. `GreenChecksService.newReportingCycle` _(tipo: method)_
26. `GreenChecksService.updateChageStatusDate` _(tipo: method)_
27. `GreenChecksService.saveSubmissionHistoryLog` _(tipo: method)_

## GroupsItemsService

- Archivo: `src/domain/entities/groups_items/groups_items.service.ts`
- Spec: `src/domain/entities/groups_items/groups_items.service.spec.ts`

28. `GroupsItemsService.syncStructures2` _(tipo: method)_

## ImpactAreaScoreService

- Archivo: `src/domain/entities/impact-area-score/impact-area-score.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## IndicatorTypesService

- Archivo: `src/domain/entities/indicator-types/indicator-types.service.ts`
- Spec: _ninguno_

29. `IndicatorTypesService.findAll` _(tipo: method)_

## IndicatorPerItemService

- Archivo: `src/domain/entities/indicator_per_item/indicator_per_item.service.ts`
- Spec: `src/domain/entities/indicator_per_item/indicator_per_item.service.spec.ts`

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## IndicatorsService

- Archivo: `src/domain/entities/indicators/indicators.service.ts`
- Spec: _ninguno_

30. `IndicatorsService.findAll` _(tipo: method)_
31. `IndicatorsService.customFindOne` _(tipo: method)_
32. `IndicatorsService.findIndicatorByAmmountResults` _(tipo: method)_
33. `IndicatorsService.findResultsAmountByIndicatorCurrentUser` _(tipo: method)_

## InformativeRolesService

- Archivo: `src/domain/entities/informative-roles/informative-roles.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## InnovationDevAnticipatedUsersService

- Archivo: `src/domain/entities/innovation-dev-anticipated-users/innovation-dev-anticipated-users.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## InstitutionRolesService

- Archivo: `src/domain/entities/institution-roles/institution-roles.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## InstitutionTypeRolesService

- Archivo: `src/domain/entities/institution-type-roles/institution-type-roles.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## IntellectualPropertyOwnersService

- Archivo: `src/domain/entities/intellectual-property-owners/intellectual-property-owners.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## IpRightsApplicationOptionsService

- Archivo: `src/domain/entities/ip-rights-application-options/ip-rights-application-options.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## IssueCategoriesService

- Archivo: `src/domain/entities/issue-categories/issue-categories.service.ts`
- Spec: _ninguno_

34. `IssueCategoriesService.find` _(tipo: method)_

## LanguageRolesService

- Archivo: `src/domain/entities/language-roles/language-roles.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## LeverRolesService

- Archivo: `src/domain/entities/lever-roles/lever-roles.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## LeverSdgTargetsService

- Archivo: `src/domain/entities/lever-sdg-targets/lever-sdg-targets.service.ts`
- Spec: _ninguno_

35. `LeverSdgTargetsService.createDataTransaction` _(tipo: method)_
36. `LeverSdgTargetsService.softDelete` _(tipo: method)_
37. `LeverSdgTargetsService.findAll` _(tipo: method)_
38. `LeverSdgTargetsService.findByLeverId` _(tipo: method)_

## LeverStrategicOutcomeService

- Archivo: `src/domain/entities/lever-strategic-outcome/lever-strategic-outcome.service.ts`
- Spec: _ninguno_

39. `LeverStrategicOutcomeService.findByLeverId` _(tipo: method)_

## LinkResultRolesService

- Archivo: `src/domain/entities/link-result-roles/link-result-roles.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## LinkResultsService

- Archivo: `src/domain/entities/link-results/link-results.service.ts`
- Spec: _ninguno_

40. `LinkResultsService.findAndDetails` _(tipo: method)_
41. `LinkResultsService.saveLinkResults` _(tipo: method)_

## MaturityLevelService

- Archivo: `src/domain/entities/maturity-level/maturity-level.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## NotableReferenceTypesService

- Archivo: `src/domain/entities/notable-reference-types/notable-reference-types.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## PolicyStagesService

- Archivo: `src/domain/entities/policy-stages/policy-stages.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## PolicyTypesService

- Archivo: `src/domain/entities/policy-types/policy-types.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## PooledFundingContractsService

- Archivo: `src/domain/entities/pooled-funding-contracts/pooled-funding-contracts.service.ts`
- Spec: _ninguno_

42. `PooledFundingContractsService.findMappingPooledFundingContracts` _(tipo: method)_

## ProjectGroupsService

- Archivo: `src/domain/entities/project_groups/project_groups.service.ts`
- Spec: `src/domain/entities/project_groups/project_groups.service.spec.ts`

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## ProjectIndicatorsService

- Archivo: `src/domain/entities/project_indicators/project_indicators.service.ts`
- Spec: `src/domain/entities/project_indicators/project_indicators.service.spec.ts`

43. `ProjectIndicatorsService.generarExcel` _(tipo: method)_

## ProjectIndicatorsResultsService

- Archivo: `src/domain/entities/project_indicators_results/project_indicators_results.service.ts`
- Spec: `src/domain/entities/project_indicators_results/project_indicators_results.service.spec.ts`

_Todos los métodos públicos de esta clase tienen al menos una referencia heurística en el spec (revisar manualmente la calidad de la prueba)._

## QuantificationRolesService

- Archivo: `src/domain/entities/quantification-roles/quantification-roles.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## ReportYearService

- Archivo: `src/domain/entities/report-year/report-year.service.ts`
- Spec: _ninguno_

44. `ReportYearService.activeReportYear` _(tipo: method)_
45. `ReportYearService.getReportYear` _(tipo: method)_

## ReportingFeedbackService

- Archivo: `src/domain/entities/reporting-feedback/reporting-feedback.service.ts`
- Spec: _ninguno_

46. `ReportingFeedbackService.handleFeedback` _(tipo: method)_

## ResultActorsService

- Archivo: `src/domain/entities/result-actors/result-actors.service.ts`
- Spec: _ninguno_

47. `ResultActorsService.saveInnovationDev` _(tipo: method)_
48. `ResultActorsService.customSaveInnovationDev` _(tipo: method)_

## ResultCapacitySharingService

- Archivo: `src/domain/entities/result-capacity-sharing/result-capacity-sharing.service.ts`
- Spec: _ninguno_

49. `ResultCapacitySharingService.processedAiInfo` _(tipo: method)_
50. `ResultCapacitySharingService.processedAiInfoIndividual` _(tipo: method)_
51. `ResultCapacitySharingService.processedAiInfoGroup` _(tipo: method)_
52. `ResultCapacitySharingService.create` _(tipo: method)_
53. `ResultCapacitySharingService.update` _(tipo: method)_
54. `ResultCapacitySharingService.findByResultId` _(tipo: method)_

## ResultContractsService

- Archivo: `src/domain/entities/result-contracts/result-contracts.service.ts`
- Spec: _ninguno_

55. `ResultContractsService.getLeverFromPrimaryContract` _(tipo: method)_
56. `ResultContractsService.deleteAll` _(tipo: method)_
57. `ResultContractsService.getPrimaryContract` _(tipo: method)_
58. `ResultContractsService.getPrincipalContractByResultsIds` _(tipo: method)_
59. `ResultContractsService.findAllResultByContractId` _(tipo: method)_

## ResultCountriesSubNationalsService

- Archivo: `src/domain/entities/result-countries-sub-nationals/result-countries-sub-nationals.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## ResultCountriesService

- Archivo: `src/domain/entities/result-countries/result-countries.service.ts`
- Spec: _ninguno_

60. `ResultCountriesService.findOneCountryByRoleResult` _(tipo: method)_
61. `ResultCountriesService.comparerClientToServerCountry` _(tipo: method)_

## ResultEvidencesService

- Archivo: `src/domain/entities/result-evidences/result-evidences.service.ts`
- Spec: _ninguno_

62. `ResultEvidencesService.updateResultEvidences` _(tipo: method)_
63. `ResultEvidencesService.findPrincipalEvidence` _(tipo: method)_

## ResultImpactAreaGlobalTargetsService

- Archivo: `src/domain/entities/result-impact-area-global-targets/result-impact-area-global-targets.service.ts`
- Spec: _ninguno_

64. `ResultImpactAreaGlobalTargetsService.disableAllByResultId` _(tipo: method)_
65. `ResultImpactAreaGlobalTargetsService.findByResultImpactAreaIds` _(tipo: method)_

## ResultImpactAreasService

- Archivo: `src/domain/entities/result-impact-areas/result-impact-areas.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## ResultInitiativesService

- Archivo: `src/domain/entities/result-initiatives/result-initiatives.service.ts`
- Spec: `src/domain/entities/result-initiatives/result-initiatives.service.spec.ts`

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## ResultInnovationDevService

- Archivo: `src/domain/entities/result-innovation-dev/result-innovation-dev.service.ts`
- Spec: _ninguno_

66. `ResultInnovationDevService.processedCenters` _(tipo: method)_
67. `ResultInnovationDevService.processedInstitutionTypes` _(tipo: method)_
68. `ResultInnovationDevService.processedAiInfo` _(tipo: method)_
69. `ResultInnovationDevService.processDataArrayString` _(tipo: method)_
70. `ResultInnovationDevService.create` _(tipo: method)_
71. `ResultInnovationDevService.update` _(tipo: method)_
72. `ResultInnovationDevService.findOne` _(tipo: method)_

## ResultInnovationToolFunctionService

- Archivo: `src/domain/entities/result-innovation-tool-function/result-innovation-tool-function.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## ResultInstitutionTypesService

- Archivo: `src/domain/entities/result-institution-types/result-institution-types.service.ts`
- Spec: _ninguno_

73. `ResultInstitutionTypesService.saveInnovationDev` _(tipo: method)_
74. `ResultInstitutionTypesService.customSaveInnovationDev` _(tipo: method)_

## ResultInstitutionsService

- Archivo: `src/domain/entities/result-institutions/result-institutions.service.ts`
- Spec: `src/domain/entities/result-institutions/result-institutions.service.spec.ts`

75. `ResultInstitutionsService.filterInstitutionsAi` _(tipo: method)_
76. `ResultInstitutionsService.insertInstitutionsAi` _(tipo: method)_

## ResultIpRightsService

- Archivo: `src/domain/entities/result-ip-rights/result-ip-rights.service.ts`
- Spec: _ninguno_

77. `ResultIpRightsService.create` _(tipo: method)_
78. `ResultIpRightsService.update` _(tipo: method)_
79. `ResultIpRightsService.findByResultId` _(tipo: method)_

## ResultKeywordsService

- Archivo: `src/domain/entities/result-keywords/result-keywords.service.ts`
- Spec: _ninguno_

80. `ResultKeywordsService.transformData` _(tipo: method)_
81. `ResultKeywordsService.findKeywordsByResultId` _(tipo: method)_

## ResultKnowledgeProductService

- Archivo: `src/domain/entities/result-knowledge-product/result-knowledge-product.service.ts`
- Spec: _ninguno_

82. `ResultKnowledgeProductService.create` _(tipo: method)_
83. `ResultKnowledgeProductService.update` _(tipo: method)_
84. `ResultKnowledgeProductService.activeKpByResultId` _(tipo: method)_

## ResultLanguagesService

- Archivo: `src/domain/entities/result-languages/result-languages.service.ts`
- Spec: _ninguno_

85. `ResultLanguagesService.findLanguageByRoleResult` _(tipo: method)_

## ResultLeverSdgTargetsService

- Archivo: `src/domain/entities/result-lever-sdg-targets/result-lever-sdg-targets.service.ts`
- Spec: _ninguno_

86. `ResultLeverSdgTargetsService.findByMultiplesResultLeverIds` _(tipo: method)_

## ResultLeverStrategicOutcomeService

- Archivo: `src/domain/entities/result-lever-strategic-outcome/result-lever-strategic-outcome.service.ts`
- Spec: _ninguno_

87. `ResultLeverStrategicOutcomeService.findByMultiplesResultLeverIds` _(tipo: method)_

## ResultLeversService

- Archivo: `src/domain/entities/result-levers/result-levers.service.ts`
- Spec: _ninguno_

88. `ResultLeversService.deleteAll` _(tipo: method)_
89. `ResultLeversService.comparerClientToServer` _(tipo: method)_

## ResultNotableReferencesService

- Archivo: `src/domain/entities/result-notable-references/result-notable-references.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## ResultOicrService

- Archivo: `src/domain/entities/result-oicr/result-oicr.service.ts`
- Spec: `src/domain/entities/result-oicr/result-oicr.service.spec.ts`

90. `ResultOicrService.validateOicrInternalCode` _(tipo: method)_
91. `ResultOicrService.review` _(tipo: method)_

## ResultPolicyChangeService

- Archivo: `src/domain/entities/result-policy-change/result-policy-change.service.ts`
- Spec: _ninguno_

92. `ResultPolicyChangeService.create` _(tipo: method)_
93. `ResultPolicyChangeService.processedAiInfo` _(tipo: method)_
94. `ResultPolicyChangeService.update` _(tipo: method)_
95. `ResultPolicyChangeService.findPolicyChange` _(tipo: method)_

## ResultQuantificationsService

- Archivo: `src/domain/entities/result-quantifications/result-quantifications.service.ts`
- Spec: _ninguno_

96. `ResultQuantificationsService.upsertQuantificationsByRole` _(tipo: method)_
97. `ResultQuantificationsService.findByResultIdAndRoles` _(tipo: method)_

## ResultRegionsService

- Archivo: `src/domain/entities/result-regions/result-regions.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## ResultSdgsService

- Archivo: `src/domain/entities/result-sdgs/result-sdgs.service.ts`
- Spec: _ninguno_

98. `ResultSdgsService.saveSdgAi` _(tipo: method)_

## ResultStatusTransitionsService

- Archivo: `src/domain/entities/result-status-transitions/result-status-transitions.service.ts`
- Spec: _ninguno_

99. `ResultStatusTransitionsService.findNextStatuses` _(tipo: method)_

## StatusWorkflowFunctionHandlerService

- Archivo: `src/domain/entities/result-status-workflow/function-handler.service.ts`
- Spec: _ninguno_

100. `StatusWorkflowFunctionHandlerService.getTemplate` _(tipo: method)_
101. `StatusWorkflowFunctionHandlerService.sendEmail` _(tipo: method)_
102. `StatusWorkflowFunctionHandlerService.validateInnovationReadinessLevelSevenOrHigher` _(tipo: method)_
103. `StatusWorkflowFunctionHandlerService.findInnovationDevData` _(tipo: method)_
104. `StatusWorkflowFunctionHandlerService.findInnovationReadinessLevel` _(tipo: method)_
105. `StatusWorkflowFunctionHandlerService.createSnapshot` _(tipo: method)_
106. `StatusWorkflowFunctionHandlerService.submittedConfigEmail` _(tipo: method)_
107. `StatusWorkflowFunctionHandlerService.revisionConfigEmail` _(tipo: method)_
108. `StatusWorkflowFunctionHandlerService.approvedConfigEmail` _(tipo: method)_
109. `StatusWorkflowFunctionHandlerService.noApprovedConfigEmail` _(tipo: method)_
110. `StatusWorkflowFunctionHandlerService.isPiValidation` _(tipo: method)_
111. `StatusWorkflowFunctionHandlerService.generalRevisionConfigEmail` _(tipo: method)_
112. `StatusWorkflowFunctionHandlerService.findCustomDataSubmitted` _(tipo: method)_
113. `StatusWorkflowFunctionHandlerService.findCustomDataForInnovationReadinessLevelSeven` _(tipo: method)_
114. `StatusWorkflowFunctionHandlerService.findCustomDataForRevision` _(tipo: method)_
115. `StatusWorkflowFunctionHandlerService.findCustomDataForOicr` _(tipo: method)_
116. `StatusWorkflowFunctionHandlerService.completenessValidation` _(tipo: method)_
117. `StatusWorkflowFunctionHandlerService.reviewOicr` _(tipo: method)_
118. `StatusWorkflowFunctionHandlerService.oicrRoleChangeStatusValidation` _(tipo: method)_
119. `StatusWorkflowFunctionHandlerService.directlyApprovedConfigEmail` _(tipo: method)_
120. `StatusWorkflowFunctionHandlerService.oicrGeneralConfigEmail` _(tipo: method)_
121. `StatusWorkflowFunctionHandlerService.innovationLevelSevenConfigEmail` _(tipo: method)_
122. `StatusWorkflowFunctionHandlerService.oicrApprovalConfigEmail` _(tipo: method)_
123. `StatusWorkflowFunctionHandlerService.oicrPostponeConfigEmail` _(tipo: method)_
124. `StatusWorkflowFunctionHandlerService.oicrRejectedConfigEmail` _(tipo: method)_
125. `StatusWorkflowFunctionHandlerService.oicrRequestConfigEmail` _(tipo: method)_
126. `StatusWorkflowFunctionHandlerService.commentValidation` _(tipo: method)_

## ResultStatusWorkflowService

- Archivo: `src/domain/entities/result-status-workflow/result-status-workflow.service.ts`
- Spec: _ninguno_

127. `ResultStatusWorkflowService.getAllStatusesByindicatorId` _(tipo: method)_
128. `ResultStatusWorkflowService.getHierarchicalTreeByIndicatorId` _(tipo: method)_
129. `ResultStatusWorkflowService.getConfigWorkflowByIndicatorAndFromStatus` _(tipo: method)_
130. `ResultStatusWorkflowService.getNextStepsByResultId` _(tipo: method)_
131. `ResultStatusWorkflowService.changeStatus` _(tipo: method)_

## ResultStatusService

- Archivo: `src/domain/entities/result-status/result-status.service.ts`
- Spec: _ninguno_

132. `ResultStatusService.findAmountOfResultsByStatusCurrentUser` _(tipo: method)_
133. `ResultStatusService.findReviewStatuses` _(tipo: method)_

## ResultTagsService

- Archivo: `src/domain/entities/result-tags/result-tags.service.ts`
- Spec: `src/domain/entities/result-tags/result-tags.service.spec.ts`

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## ResultUsersService

- Archivo: `src/domain/entities/result-users/result-users.service.ts`
- Spec: _ninguno_

134. `ResultUsersService.findAuthorContactUserByResultId` _(tipo: method)_
135. `ResultUsersService.deleteAuthorContactByResultIdAndKey` _(tipo: method)_
136. `ResultUsersService.saveAuthorContactUserByResultId` _(tipo: method)_
137. `ResultUsersService.filterInstitutionsAi` _(tipo: method)_
138. `ResultUsersService.insertUserAi` _(tipo: method)_
139. `ResultUsersService.findUsersByRoleResult` _(tipo: method)_

## ResultsService

- Archivo: `src/domain/entities/results/results.service.ts`
- Spec: `src/domain/entities/results/results.service.spec.ts`

140. `ResultsService.findResultv2` _(tipo: method)_
141. `ResultsService.findOne` _(tipo: method)_
142. `ResultsService.findBaseInfo` _(tipo: method)_
143. `ResultsService.updateInactiveResult` _(tipo: method)_
144. `ResultsService.createUserProcess` _(tipo: method)_
145. `ResultsService.validateResultTitle` _(tipo: method)_
146. `ResultsService.filterResultByIndicators` _(tipo: method)_
147. `ResultsService.formalizeResult` _(tipo: method)_
148. `ResultsService.createResultFromAiBulk` _(tipo: method)_
149. `ResultsService.validateAiRawCountries` _(tipo: method)_
150. `ResultsService.createMappingIpRights` _(tipo: method)_
151. `ResultsService.createResultFromAiRoar` _(tipo: method)_
152. `ResultsService.generalReport` _(tipo: method)_

## SessionFormatsService

- Archivo: `src/domain/entities/session-formats/session-formats.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## SessionLengthsService

- Archivo: `src/domain/entities/session-lengths/session-lengths.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## SessionPurposesService

- Archivo: `src/domain/entities/session-purposes/session-purposes.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## SessionTypesService

- Archivo: `src/domain/entities/session-types/session-types.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## SettingKeysService

- Archivo: `src/domain/entities/setting-keys/setting-keys.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## StaffGroupsService

- Archivo: `src/domain/entities/staff-groups/staff-groups.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## SyncProcessLogStaleService

- Archivo: `src/domain/entities/sync-process-log/sync-process-log-stale.service.ts`
- Spec: _ninguno_

153. `SyncProcessLogStaleService.markStaleInProgressAsFailed` _(tipo: method)_

## SyncProcessLogService

- Archivo: `src/domain/entities/sync-process-log/sync-process-log.service.ts`
- Spec: _ninguno_

154. `SyncProcessLogService.initiateSync` _(tipo: method)_
155. `SyncProcessLogService.update` _(tipo: method)_
156. `SyncProcessLogService.endSync` _(tipo: method)_

## TagsService

- Archivo: `src/domain/entities/tags/tags.service.ts`
- Spec: `src/domain/entities/tags/tags.service.spec.ts`

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## TempExternalOicrsService

- Archivo: `src/domain/entities/temp_external_oicrs/temp_external_oicrs.service.ts`
- Spec: _ninguno_

157. `TempExternalOicrsService.findExternalOicrs` _(tipo: method)_
158. `TempExternalOicrsService.mappingExternalOicrs` _(tipo: method)_

## ToolFunctionsService

- Archivo: `src/domain/entities/tool-functions/tool-functions.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## UserAgressoContractsService

- Archivo: `src/domain/entities/user-agresso-contracts/user-agresso-contracts.service.ts`
- Spec: _ninguno_

159. `UserAgressoContractsService.linkUserToContract` _(tipo: method)_
160. `UserAgressoContractsService.automaticLinkUserAgressoContract` _(tipo: method)_

## UserRolesService

- Archivo: `src/domain/entities/user-roles/user-roles.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## UserSettingsService

- Archivo: `src/domain/entities/user-settings/user-settings.service.ts`
- Spec: _ninguno_

161. `UserSettingsService.updateSettings` _(tipo: method)_
162. `UserSettingsService.findByUserIdAndComponent` _(tipo: method)_

## TemplateService

- Archivo: `src/domain/shared/auxiliar/template/template.service.ts`
- Spec: _ninguno_

163. `TemplateService._getTemplate` _(tipo: method)_

## QueryService

- Archivo: `src/domain/shared/utils/query.service.ts`
- Spec: _ninguno_

164. `QueryService.deleteFullResultById` _(tipo: method)_

## AgressoToolsService

- Archivo: `src/domain/tools/agresso/agresso-tools.service.ts`
- Spec: _ninguno_

165. `AgressoToolsService.cloneAllAgressoEntities` _(tipo: method)_

## AgressoStaffToolsService

- Archivo: `src/domain/tools/agresso/staff/agresso-staff-tools.service.ts`
- Spec: _ninguno_

166. `AgressoStaffToolsService.cloneAllAgressoStaff` _(tipo: method)_

## ClarisaService

- Archivo: `src/domain/tools/clarisa/clarisa.service.ts`
- Spec: _ninguno_

167. `ClarisaService.searchToOS` _(tipo: method)_
168. `ClarisaService.partnerRequest` _(tipo: method)_
169. `ClarisaService.cloneAllClarisaEntities` _(tipo: method)_
170. `ClarisaService.authorization` _(tipo: method)_
171. `ClarisaService.createPermission` _(tipo: method)_

## ClarisaActorTypesService

- Archivo: `src/domain/tools/clarisa/entities/clarisa-actor-types/clarisa-actor-types.service.ts`
- Spec: _ninguno_

172. `ClarisaActorTypesService.validateActorTypes` _(tipo: method)_

## ClarisaCountriesService

- Archivo: `src/domain/tools/clarisa/entities/clarisa-countries/clarisa-countries.service.ts`
- Spec: _ninguno_

173. `ClarisaCountriesService.findByIso2` _(tipo: method)_
174. `ClarisaCountriesService.findByUm49Codes` _(tipo: method)_

## ClarisaGeoScopeService

- Archivo: `src/domain/tools/clarisa/entities/clarisa-geo-scope/clarisa-geo-scope.service.ts`
- Spec: _ninguno_

175. `ClarisaGeoScopeService.transformGeoScope` _(tipo: method)_
176. `ClarisaGeoScopeService.findByName` _(tipo: method)_

## ClarisaGlobalTargetsService

- Archivo: `src/domain/tools/clarisa/entities/clarisa-global-targets/clarisa-global-targets.service.ts`
- Spec: _ninguno_

177. `ClarisaGlobalTargetsService.findGlobalTargetsByImpactArea` _(tipo: method)_

## ClarisaImpactAreasService

- Archivo: `src/domain/tools/clarisa/entities/clarisa-impact-areas/clarisa-impact-areas.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## ClarisaInitiativesService

- Archivo: `src/domain/tools/clarisa/entities/clarisa-initiatives/clarisa-initiatives.service.ts`
- Spec: `src/domain/tools/clarisa/entities/clarisa-initiatives/clarisa-initiatives.service.spec.ts`

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## ClarisaInnovationCharacteristicsService

- Archivo: `src/domain/tools/clarisa/entities/clarisa-innovation-characteristics/clarisa-innovation-characteristics.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## ClarisaInnovationReadinessLevelsService

- Archivo: `src/domain/tools/clarisa/entities/clarisa-innovation-readiness-levels/clarisa-innovation-readiness-levels.service.ts`
- Spec: _ninguno_

178. `ClarisaInnovationReadinessLevelsService.findByValue` _(tipo: method)_

## ClarisaInnovationTypesService

- Archivo: `src/domain/tools/clarisa/entities/clarisa-innovation-types/clarisa-innovation-types.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## ClarisaInstitutionLocationsService

- Archivo: `src/domain/tools/clarisa/entities/clarisa-institution-locations/clarisa-institution-locations.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## ClarisaInstitutionTypesService

- Archivo: `src/domain/tools/clarisa/entities/clarisa-institution-types/clarisa-institution-types.service.ts`
- Spec: _ninguno_

179. `ClarisaInstitutionTypesService.findInstitutionTypeToPartner` _(tipo: method)_
180. `ClarisaInstitutionTypesService.findByName` _(tipo: method)_
181. `ClarisaInstitutionTypesService.getChildlessInstitutionTypes` _(tipo: method)_
182. `ClarisaInstitutionTypesService.getInstitutionTypesByDepthLevel` _(tipo: method)_
183. `ClarisaInstitutionTypesService.findByLikeNames` _(tipo: method)_

## ClarisaInstitutionsService

- Archivo: `src/domain/tools/clarisa/entities/clarisa-institutions/clarisa-institutions.service.ts`
- Spec: _ninguno_

184. `ClarisaInstitutionsService.clonePath` _(tipo: method)_
185. `ClarisaInstitutionsService.getInstitutionsByCountry` _(tipo: method)_
186. `ClarisaInstitutionsService.findByLikeNames` _(tipo: method)_

## ClarisaLanguagesService

- Archivo: `src/domain/tools/clarisa/entities/clarisa-languages/clarisa-languages.service.ts`
- Spec: _ninguno_

187. `ClarisaLanguagesService.findOneByiso3` _(tipo: method)_

## ClarisaLeversService

- Archivo: `src/domain/tools/clarisa/entities/clarisa-levers/clarisa-levers.service.ts`
- Spec: _ninguno_

188. `ClarisaLeversService.iconMapper` _(tipo: method)_
189. `ClarisaLeversService.findByShortName` _(tipo: method)_
190. `ClarisaLeversService.homologatedData` _(tipo: method)_

## ClarisaRegionsService

- Archivo: `src/domain/tools/clarisa/entities/clarisa-regions/clarisa-regions.service.ts`
- Spec: _ninguno_

191. `ClarisaRegionsService.findByUm49Codes` _(tipo: method)_

## ClarisaSdgTargetsService

- Archivo: `src/domain/tools/clarisa/entities/clarisa-sdg-targets/clarisa-sdg-targets.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## ClarisaSdgsService

- Archivo: `src/domain/tools/clarisa/entities/clarisa-sdgs/clarisa-sdgs.service.ts`
- Spec: _ninguno_

_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._

## ClarisaSubNationalsService

- Archivo: `src/domain/tools/clarisa/entities/clarisa-sub-nationals/clarisa-sub-nationals.service.ts`
- Spec: _ninguno_

192. `ClarisaSubNationalsService.findByCodes` _(tipo: method)_
193. `ClarisaSubNationalsService.findSubNationalsByCountryIso2` _(tipo: method)_

## DynamoFeedbackService

- Archivo: `src/domain/tools/dynamo-feedback/dynamo-feedback.service.ts`
- Spec: _ninguno_

194. `DynamoFeedbackService.saveData` _(tipo: method)_
195. `DynamoFeedbackService.getAllFeedback` _(tipo: method)_

## PrmsOpenSearchService

- Archivo: `src/domain/tools/open-search/prms/prms.opensearch.service.ts`
- Spec: _ninguno_

196. `PrmsOpenSearchService.mapToExternalCreateResultDto` _(tipo: method)_
197. `PrmsOpenSearchService.getData` _(tipo: method)_
198. `PrmsOpenSearchService.processData` _(tipo: method)_
199. `PrmsOpenSearchService.createResultInStar` _(tipo: method)_

## RoarManagementService

- Archivo: `src/domain/tools/roar-management/roar-management.service.ts`
- Spec: _ninguno_

200. `RoarManagementService.validateToken` _(tipo: method)_

## TipIntegrationService

- Archivo: `src/domain/tools/tip-integration/tip-integration.service.ts`
- Spec: `src/domain/tools/tip-integration/tip-integration.service.spec.ts`

201. `TipIntegrationService.inactiveAllTipResults` _(tipo: method)_
202. `TipIntegrationService.getKnowledgeProductsByYear` _(tipo: method)_
203. `TipIntegrationService.processing` _(tipo: method)_
204. `TipIntegrationService.mapRegions` _(tipo: method)_
205. `TipIntegrationService.mapCountries` _(tipo: method)_
206. `TipIntegrationService.mapLevers` _(tipo: method)_
207. `TipIntegrationService.createKpInStar` _(tipo: method)_
