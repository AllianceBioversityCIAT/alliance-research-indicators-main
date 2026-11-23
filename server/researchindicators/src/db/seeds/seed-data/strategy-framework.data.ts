/**
 * Strategy framework seed constants
 * (R-STF-011, design section 3.4, D-STF-7, D-STF-8).
 * Generated once from the workbooks. The migration does not read them.
 *
 * Generator command:
 *   python3 generate_strategy_framework_data.py --sources <dir with the four source files> --out src/db/seeds/seed-data/strategy-framework.data.ts (throw-away generator, not committed; full command recorded in execution.md T-09)
 *
 * Sources. The filesystem mtime is the download date, not the authoring date.
 * - 2026_Strategic-Objectives-Tracking-Tool.xlsx
 *   sha256 b87a5f5064084c398f5a242ee382cc0482fc8285a87775155d9f59b804d152ab
 *   docProps/core.xml modified 2026-11-19T20:18:40Z
 *   filesystem mtime 2026-11-19T20:44:03Z (download date, not the authoring date)
 * - Alliance-Strategy-2026-2030_20260902.xlsx
 *   sha256 22b0250f844cb43b26ff65174075e65e6c15649c25d725be19d70b13008c61f8
 *   docProps/core.xml modified 2026-10-22T14:16:16Z
 *   filesystem mtime 2026-11-19T20:44:51Z (download date, not the authoring date)
 * - Master-Monitoring-Framework_5.28.2026-Combined_20260818_adjusted_MA_v2.xlsx
 *   sha256 4a17bc155059c73180b258f44d29c1086b69969a3883e127d09744ea87ceb203
 *   docProps/core.xml modified 2026-11-19T17:23:35Z
 *   filesystem mtime 2026-11-19T20:44:58Z (download date, not the authoring date)
 * - project/kpi-framework.json
 *   sha256 456735a99e9f8c3c1ce7634b869684add51ec97aac60288e597a8169eefcb294
 *   no docProps (JSON canvas file)
 *   filesystem mtime 2026-11-19T20:47:24Z (download date, not the authoring date)
 *
 * Non-person tokens skipped by the generator, so they are not candidates:
 * - 'TBC and regions' on 'Compliance' (parenthetical)
 * - 'or rep TBC' on 'Cost Efficiency' (parenthetical)
 * - 'or rep TBC' on 'Execution & Control' (parenthetical)
 * - 'BOF rep' on 'Process efficiency' (not a person)
 * - 'BOF rep' on 'Service delivery' (not a person)
 * - '?' on None (not a person)
 *
 * @akili-spec institutional-performance/strategy-framework
 */

export const SEED_PORTFOLIO_ID = 2;
export const SEED_IOB_YEAR = 2026;

export interface StrategyFrameworkSeedLevel {
  id: number;
  depth: number;
  name: string;
  pluralName: string;
  shortLabel: string;
  isIndicatorLevel: number;
}

export interface StrategyFrameworkSeedElement {
  id: number;
  depth: number;
  code: string;
  name: string;
  description: string | null;
  parentCode: string | null;
}

export interface StrategyFrameworkSeedObjective {
  id: number;
  code: string;
  statement: string;
}

export interface StrategyFrameworkSeedLink {
  id: number;
  objectiveCode: string;
  elementCode: string;
  sourceLabel: string;
}

export interface StrategyFrameworkSeedResponsible {
  elementCode: string;
  name: string;
  email: string | null;
  position: number;
}

export const SEED_LEVELS: readonly StrategyFrameworkSeedLevel[] = [
  {
    id: 1,
    depth: 1,
    name: 'Performance Area',
    pluralName: 'Performance Areas',
    shortLabel: 'AREA',
    isIndicatorLevel: 0,
  },
  {
    id: 2,
    depth: 2,
    name: 'Dimension',
    pluralName: 'Dimensions',
    shortLabel: 'DIMENSION',
    isIndicatorLevel: 0,
  },
  {
    id: 3,
    depth: 3,
    name: 'Indicator',
    pluralName: 'Indicators',
    shortLabel: 'INDICATOR',
    isIndicatorLevel: 1,
  },
];

export const SEED_ELEMENTS: readonly StrategyFrameworkSeedElement[] = [
  {
    depth: 1,
    code: '1',
    name: 'Embody Institutional Excellence',
    parentCode: null,
    description:
      'It focuses on how well the organization functions as a whole, including efficient processes, strong governance, and a positive external reputation.',
    id: 1,
  },
  {
    depth: 1,
    code: '2',
    name: 'Cultivate Culture for Change',
    parentCode: null,
    description: null,
    id: 2,
  },
  {
    depth: 1,
    code: '3',
    name: 'Scientific Excellence',
    parentCode: null,
    description:
      'The extent to which the Alliance produces rigorous, credible, relevant, and influential research and knowledge that advances scientific understanding, addresses priority development challenges, and contributes to the global evidence base.',
    id: 3,
  },
  {
    depth: 1,
    code: '4',
    name: 'Enable system change',
    parentCode: null,
    description:
      'Engaging diverse partners to co-develop and apply evidence that informs and aligns policies, finance, and institutional frameworks, creating the conditions to transform food and land systems. We will foster an enabling environment to drive the Alliance’s engagement and impact through institutional partnerships building, relationship management and science-based advocacy. We will partner widely and engage deeply to co-create science-based solutions that inform and enable policies, investments, and institutional innovations for food and land systems transformation. Monitoring partnership health, building structured spaces for co-creation, and leveraging our comparative advantage will maximize joint learning, shared ownership, and trust — ensuring that our science delivers systemic impact at scale. (source: Narrative from Vanessa Riveros, October 2025)',
    id: 4,
  },
  {
    depth: 2,
    code: '1.1',
    name: 'Operational efficiency and agility',
    parentCode: '1',
    description:
      'Redesigned operating model, end-to-end processes, streamlineed project management lifecycle, and responsiveness to our mission ensured — integrating both research and regional needs',
    id: 5,
  },
  {
    depth: 2,
    code: '1.2',
    name: 'Financial health',
    parentCode: '1',
    description:
      'Diversified revenue sources and strengthened financial models that sustain research portfolios, introducing competitive benchmarking, and transparent value-for-money mechanisms ensured.',
    id: 6,
  },
  {
    depth: 2,
    code: '1.3',
    name: 'Partnership',
    parentCode: '1',
    description: null,
    id: 7,
  },
  {
    depth: 2,
    code: '1.4',
    name: 'Digital and data enablement',
    parentCode: '1',
    description:
      'AI deployed, ERP platforms integrated, including with real-time dashboards to optimize decision-making. Research programs supported with data interoperability, digital research tools, and predictive analytics enhancing collaboration, learning, and innovation.',
    id: 8,
  },
  {
    depth: 2,
    code: '1.5',
    name: 'Governance and Management',
    parentCode: '1',
    description: null,
    id: 9,
  },
  {
    depth: 2,
    code: '1.6',
    name: 'Combined assurance',
    parentCode: '1',
    description:
      'Risk integration, internal controls, and multi-layered compliance posture. It measures how effectively the institution mitigates operational risk, resolves audit findings, enforces legal and ethical standards, and maintains accountability across financial, labor, and host-country regulations.',
    id: 10,
  },
  {
    depth: 2,
    code: '2.1',
    name: 'People and culture',
    parentCode: '2',
    description: null,
    id: 11,
  },
  {
    depth: 2,
    code: '3.1',
    name: 'Knowledge products',
    parentCode: '3',
    description:
      'Finalized intellectual outputs (e.g., articles, briefs, databases, software) stored in CGSpace and aligned with FAIR data principles.',
    id: 12,
  },
  {
    depth: 2,
    code: '4.1',
    name: 'Innovations',
    parentCode: '4',
    description: null,
    id: 13,
  },
  {
    depth: 2,
    code: '4.2',
    name: 'Outcome Impact Case Reports',
    parentCode: '4',
    description: null,
    id: 14,
  },
  {
    depth: 2,
    code: '4.3',
    name: 'Policy advocacy',
    parentCode: '4',
    description:
      'Research translated into actionable evidence and compelling narratives for policy engagement; partner with policymakers, investors, and practitioners to advance policy dialogues, shape investment decisions, and advocate for science-based systemic change at national, regional and global levels. (source: Narrative from Vanessa Riveros, October 2025)',
    id: 15,
  },
  {
    depth: 2,
    code: '4.4',
    name: 'Innovate for Impact SF and A4IP',
    parentCode: '4',
    description: null,
    id: 16,
  },
  {
    depth: 2,
    code: '4.5',
    name: 'Capacity Sharing for Development',
    parentCode: '4',
    description:
      'Activities that build knowledge, skills, and institutional capacity among individuals and partners through training, mentorship, and technical support.',
    id: 17,
  },
  {
    depth: 3,
    code: '1.1.1',
    name: 'Process efficiency',
    parentCode: '1.1',
    description:
      'Redesigned end-to-end processes, digitalized processes, improved processes with a resulting improvement in efficiency and decreasing administrative workload',
    id: 18,
  },
  {
    depth: 3,
    code: '1.1.2',
    name: 'Service delivery',
    parentCode: '1.1',
    description:
      'Service delivery time, compliance with Service Level Agreements, staff satisfaction with service delivery',
    id: 19,
  },
  {
    depth: 3,
    code: '1.2.1',
    name: 'Revenue Strength',
    parentCode: '1.2',
    description:
      'Ability of the organization to secure, diversify, and sustain funding from donors and other sources to support its mission and strategic priorities.',
    id: 20,
  },
  {
    depth: 3,
    code: '1.2.2',
    name: 'Stability & Resilience',
    parentCode: '1.2',
    description:
      "Financial stability is the organization's ability to maintain a sound and predictable financial position over time, ensuring that it can consistently meet its operational obligations, strategic commitments, and funding requirements without significant financial disruption (example indicators: Positive operating results over multiple years; Sufficient unrestricted reserves; Strong liquidity ratios; Balanced budgets and effective financial planning). Financial resilience is the organization's ability to absorb, adapt to, and recover from financial shocks, uncertainties, or changes in its operating environment while continuing to fulfill its mission and strategic objectives (example indicators: Ability to maintain operations despite a major donor withdrawal; Adequate reserve levels to cover unforeseen events: Diversified donor and funding portfolio; Established financial risk management mechanisms). (Source: co-pilot)",
    id: 21,
  },
  {
    depth: 3,
    code: '1.2.3',
    name: 'Execution & Control',
    parentCode: '1.2',
    description:
      'The degree to which the organization effectively converts financial resources into planned outcomes through disciplined budget management, strong internal controls, accurate forecasting, and timely performance monitoring, ensuring financial sustainability and accountability (example indicator: Budget Execution Rate; Operating Surplus/Deficit Performance; Forecast Accuracy; Cost Recovery Performance; Internal Control Effectiveness; Timeliness of Financial Reporting).',
    id: 22,
  },
  {
    depth: 3,
    code: '1.2.4',
    name: 'Cost Efficiency',
    parentCode: '1.2',
    description: null,
    id: 23,
  },
  {
    depth: 3,
    code: '1.3.1',
    name: 'Strategic Visibility and Influence',
    parentCode: '1.3',
    description: null,
    id: 24,
  },
  {
    depth: 3,
    code: '1.3.2',
    name: 'Strength of Institutional Partnerships',
    parentCode: '1.3',
    description: null,
    id: 25,
  },
  {
    depth: 3,
    code: '1.4.1',
    name: 'Data governance',
    parentCode: '1.4',
    description: null,
    id: 26,
  },
  {
    depth: 3,
    code: '1.4.2',
    name: 'Digital Ecosystem',
    parentCode: '1.4',
    description: null,
    id: 27,
  },
  {
    depth: 3,
    code: '1.5.1',
    name: 'Decision-Making & Effectiveness',
    parentCode: '1.5',
    description:
      'Measures the consistency with which leadership uses standardized financial datasets and reporting to drive evidence-based strategic and operational decisions.',
    id: 28,
  },
  {
    depth: 3,
    code: '1.5.2',
    name: 'Governance System',
    parentCode: '1.5',
    description:
      'An appropriate and up-to-date set of policies, procedures, and guidance documents that define roles, decision rights, minimum standards, and controls—enabling consistent implementation of the institutional strategy and delivery of objectives across the organization (Source: ODS).',
    id: 29,
  },
  {
    depth: 3,
    code: '1.5.3',
    name: 'Organizational performance and agility',
    parentCode: '1.5',
    description:
      'Continuously adapt structures and staffing models to align with evolving research portfolios, regional strategies, and donor landscapes, ensuring that operational agility directly supports scientific delivery.',
    id: 30,
  },
  {
    depth: 3,
    code: '1.5.4',
    name: 'Transparency and Sustainability',
    parentCode: '1.5',
    description:
      'Integrate ESG principles — sustainable procurement, reduced carbon footprint, and circular resource use — into all business and research operations, fostering environmentally and socially responsible science.',
    id: 31,
  },
  {
    depth: 3,
    code: '1.6.1',
    name: 'Audit & Oversight',
    parentCode: '1.6',
    description:
      'It is the organization’s responsiveness to internal and external reviews by tracking the timely closure of audit findings, ownership of corrective actions, and the prevention of repeat issues.',
    id: 32,
  },
  {
    depth: 3,
    code: '1.6.2',
    name: 'Compliance',
    parentCode: '1.6',
    description:
      'An adherence to internal financial controls, host-country labor and tax laws, and regional research reporting mandates to minimize legal and operational liabilities.',
    id: 33,
  },
  {
    depth: 3,
    code: '1.6.3',
    name: 'Risk Management',
    parentCode: '1.6',
    description:
      'Sound financial management and a strong internal control environment that ensure funds are used as intended, risks are managed, and decisions are transparent—thereby strengthening donor and stakeholder confidence (Source: ODS)',
    id: 34,
  },
  {
    depth: 3,
    code: '1.6.4',
    name: 'Ethics & Integrity',
    parentCode: '1.6',
    description:
      'Staff engagement with organizational values, the health of reporting channels against industry benchmarks, and the responsiveness of internal investigations to ensure a culture of transparency and accountability.',
    id: 35,
  },
  {
    depth: 3,
    code: '2.1.1',
    name: 'Cross-Cutting Collaboration',
    parentCode: '2.1',
    description:
      'Cross-Cutting Collaboration  to solve systemic organizational challenges.',
    id: 36,
  },
  {
    depth: 3,
    code: '2.1.2',
    name: 'Inclusive Leadership Development',
    parentCode: '2.1',
    description:
      'Train managers in role-modelling, unconscious bias, change leadership, and values-based recognition.',
    id: 37,
  },
  {
    depth: 3,
    code: '2.1.3',
    name: 'Trust & Psychological Safety',
    parentCode: '2.1',
    description:
      'Foster open communication, “speak-up” culture, and transparent internal dialogue mechanisms to counter change fatigue.',
    id: 38,
  },
  {
    depth: 3,
    code: '3.1.1',
    name: 'Research Synthesis and Visibility',
    parentCode: '3.1',
    description:
      'Measures the production of flagship research reports that synthesize scientific evidence and increase the visibility and accessibility of the Alliance’s research.',
    id: 39,
  },
  {
    depth: 3,
    code: '3.1.2',
    name: 'Scientific Output and Quality',
    parentCode: '3.1',
    description:
      'Measures the volume, collaboration, accessibility, and quality management of scientific outputs, including peer-reviewed publications and research datasets.',
    id: 40,
  },
  {
    depth: 3,
    code: '3.1.3',
    name: 'Scientific Relevance',
    parentCode: '3.1',
    description:
      'Measures the extent to which research projects maintain timely and effective technical delivery, as reflected in technical reporting being on track.',
    id: 41,
  },
  {
    depth: 3,
    code: '4.1.1',
    name: 'Innovation development and uptake',
    parentCode: '4.1',
    description: null,
    id: 42,
  },
  {
    depth: 3,
    code: '4.2.1',
    name: 'Demonstrated research impact',
    parentCode: '4.2',
    description:
      'Measures documented broader effects of research on policies, investments, innovations, systems, or other societal, environmental, or economic outcomes',
    id: 43,
  },
  {
    depth: 3,
    code: '4.2.2',
    name: 'Documented outcome and behavioral change',
    parentCode: '4.2',
    description:
      'Measures documented changes in the behaviors, practices, decisions, or actions of stakeholders that can be linked to the use of research, evidence, or innovations.',
    id: 44,
  },
  {
    depth: 3,
    code: '4.3.1',
    name: 'Contribution to science-based policy change',
    parentCode: '4.3',
    description: null,
    id: 45,
  },
  {
    depth: 3,
    code: '4.4.1',
    name: 'Strategic partnerships for innovation scaling',
    parentCode: '4.4',
    description:
      'Partnering for the co-creation of demand-driven, science-based innovations and enabling the scaling of solutions through tools and collaborations, thereby translating research into tangible change and reflecting the implementation of the Alliance strategy across regions where we are present.',
    id: 46,
  },
  {
    depth: 3,
    code: '4.4.2',
    name: 'Transition of innovations to market',
    parentCode: '4.4',
    description: null,
    id: 47,
  },
  {
    depth: 3,
    code: '4.5.1',
    name: 'Individuals who participated in capacity-sharing activities',
    parentCode: '4.5',
    description: null,
    id: 48,
  },
];

export const SEED_OBJECTIVES: readonly StrategyFrameworkSeedObjective[] = [
  {
    id: 1,
    code: 'IOB-1',
    statement:
      'Optimize core processes through digital redesign, systems integration, and standardized workflows that support robust planning and delivery of research projects, strengthen workforce and financial resource management, reduce operational bottlenecks, ensure data integrity, and enable agile, evidence‑based decision‑making across the organization.',
  },
  {
    id: 2,
    code: 'IOB-2',
    statement:
      'Deliver high-quality, user-centered services through rigorous performance standards and continuous improvement to ensure responsive support, timely resolution, and a reliable service experience across the organization.',
  },
  {
    id: 3,
    code: 'IOB-3',
    statement:
      'Develop and consolidate a harmonized global insurance framework that integrates regions and establishes regionally tailored structures across Africa, Asia, and Europe, enabling optimized risk transfer, enhanced service delivery to operations, cost efficiency, and informed strategic decision-making at the organizational level.',
  },
  {
    id: 4,
    code: 'IOB-4',
    statement:
      'Develop a robust and well‑governed research project pipeline, design and deliver high‑quality competitive proposals, and diversify sustainable funding streams that expand the Alliance’s research, innovation, and policy engagement impact.',
  },
  {
    id: 5,
    code: 'IOB-5',
    statement:
      'Collaboratively secure and diversify sustainable funding streams that expand the Alliance’s research, innovation, and policy engagement footprint.',
  },
  {
    id: 6,
    code: 'IOB-6',
    statement:
      'Strengthen indirect cost recovery, forecasting reliability, to optimize workforce and financial resources use and evidence-based management of financial reserves.',
  },
  {
    id: 7,
    code: 'IOB-7',
    statement:
      'Position the Alliance as a globally, regionally, and nationally influential thought leader shaping food systems, climate, biodiversity, and agricultural policy. ',
  },
  {
    id: 8,
    code: 'IOB-8',
    statement:
      'Strengthen institutional trust in data by promoting fit-for-purpose governance, quality standards, and stewardship practices that improve the consistency, accuracy, usability, and value of organizational data for decision-making.',
  },
  {
    id: 9,
    code: 'IOB-9',
    statement:
      'Enable a coherent and proactive digital and data ecosystem that delivers high‑quality, accurate, and accessible data for institutional decision‑making, while ensuring early and proactive technology engagement to support scalable and sustainable digital solutions across research and operations.',
  },
  {
    id: 10,
    code: 'IOB-10',
    statement:
      'Strengthen financial data quality, consistency, and accessibility by delivering standardized financial views and dashboards that support institutional-level decision-making.',
  },
  {
    id: 11,
    code: 'IOB-11',
    statement:
      'Strengthen the institutional policy framework by identifying, prioritizing, and addressing policy gaps that may affect governance, accountability, and consistent decision-making.',
  },
  {
    id: 12,
    code: 'IOB-12',
    statement:
      "Ensure that Alliance's Host Country Agreements (HCA) are up-to-date and effectively implemented across jurisdictions, enabling the organization to operate in full legal compliance while minimizing regulatory risk and safeguarding institutional privileges and immunities.",
  },
  {
    id: 13,
    code: 'IOB-13',
    statement:
      'Support the integration of research and various organizational functions to enhance the efficiency, effectiveness, and impact of our work in the regions.',
  },
  {
    id: 14,
    code: 'IOB-14',
    statement:
      'Provide legal oversight and strategic guidance for the organization’s Sustainability Policy and ESG Plan, ensuring full alignment with applicable regulatory frameworks, strengthening governance and accountability, and enabling the effective implementation and accurate ESG report to the Board of Trustees.',
  },
  {
    id: 15,
    code: 'IOB-15',
    statement:
      'Strengthen governance, accountability, and donor confidence through the timely implementation of internal, external, and donor audit recommendations related to BOF responsibilities.',
  },
  {
    id: 16,
    code: 'IOB-16',
    statement:
      'Enhance institutional governance and control by strengthening financial policy compliance, delegation of authority discipline, and timely closure of financial commitments.',
  },
  {
    id: 17,
    code: 'IOB-17',
    statement:
      'Ensure that the organization’s operations are fully compliant with applicable local laws and regulations across all jurisdictions, through timely and strategic legal guidance to leadership to support informed decision-making and strengthen relationships with governmental authorities',
  },
  {
    id: 18,
    code: 'IOB-18',
    statement:
      'Strengthen risk management practices by assessing strategic level and high-valued projects.',
  },
  {
    id: 19,
    code: 'IOB-19',
    statement:
      'Strengthen the organization’s ethical risk management by promoting staff awareness and adherence to standards of conduct and ethics policies, ensuring timely identification and reporting of ethical concerns, and enabling prompt and appropriate corrective actions to mitigate potential reputational and operational risks.',
  },
  {
    id: 20,
    code: 'IOB-20',
    statement:
      'Advance cross‑cutting collaboration across the Alliance by improving stakeholder alignment in processes and services, reinforcing a cohesive institutional identity through evidence‑based communication, and co‑creating digital initiatives across research, regional, and support functions to drive integration, shared ownership, and organizational impact.',
  },
  {
    id: 21,
    code: 'IOB-21',
    statement:
      'Contributing to internal cross-team collaboration by strengthening knowledge exchange, peer learning, and collaboration across Research Areas, enabling scientists and teams to share expertise, co-develop ideas, and deliver more integrated and impactful research outcomes across the Alliance.',
  },
  {
    id: 22,
    code: 'IOB-22',
    statement:
      'Design and implement a comprehensive and inclusive leadership development framework that embeds the Alliance’s cultural values and cultivates purpose-driven, collaborative, and adaptable leaders, equipped with the competencies and mindset to navigate complexity, lead with integrity, foster inclusion, empower people, and drive sustainable organizational performance and long-term impact.',
  },
  {
    id: 23,
    code: 'IOB-23',
    statement:
      'Enhancing staff well-being and effectiveness, and promoting occupational health and safety culture within the organization.',
  },
  {
    id: 24,
    code: 'IOB-24',
    statement:
      'Ensuring the Alliance’s scientific excellence by delivering high-quality research and accessible data, fostering impactful innovations, strengthening and sharing capacity with partners, and synthesizing achievements for learning and to demonstrate contributions to sustainable and inclusive food and land systems transformation.',
  },
  {
    id: 25,
    code: 'IOB-25',
    statement:
      'Steward a world-class network of strategic partnerships at both global and regional levels to deliver co-created solutions that foster trust and long-term impact.',
  },
  {
    id: 26,
    code: 'IOB-26',
    statement:
      'Contributing to food and land systems change by collaborating with partners for the cocreation of demand-driven, science based, innovations; informing policy through science-based evidence; and enabling the scaling of solutions through financial tools, partnerships, and institutional arrangements, thereby translating research into tangible changes in policies, practices, knowledge and investments.',
  },
  {
    id: 27,
    code: 'IOB-27',
    statement:
      'Position the Alliance as a globally, regionally, and nationally influential thought leader shaping food systems, climate, biodiversity, and agricultural policy. ',
  },
  {
    id: 28,
    code: 'IOB-28',
    statement:
      'Implement regional roadmaps for the implementation of the Alliance Strategy in the regions.',
  },
];

export const SEED_LINKS: readonly StrategyFrameworkSeedLink[] = [
  {
    id: 1,
    objectiveCode: 'IOB-1',
    elementCode: '1.1.1',
    sourceLabel: '1.1.1 Process efficiency',
  },
  {
    id: 2,
    objectiveCode: 'IOB-2',
    elementCode: '1.1.2',
    sourceLabel: '1.1.2 Service delivery',
  },
  {
    id: 3,
    objectiveCode: 'IOB-3',
    elementCode: '1.1.2',
    sourceLabel: '1.1.2 Service delivery',
  },
  {
    id: 4,
    objectiveCode: 'IOB-4',
    elementCode: '1.2.1',
    sourceLabel: '1.2.1 Revenue Strength',
  },
  {
    id: 5,
    objectiveCode: 'IOB-5',
    elementCode: '1.2.1',
    sourceLabel: '1.2.1 Revenue Strength',
  },
  {
    id: 6,
    objectiveCode: 'IOB-6',
    elementCode: '1.2.2',
    sourceLabel: '1.2.2 Stability & Resilience',
  },
  {
    id: 7,
    objectiveCode: 'IOB-6',
    elementCode: '1.2.3',
    sourceLabel: '1.2.3 Execution & Control',
  },
  {
    id: 8,
    objectiveCode: 'IOB-6',
    elementCode: '1.2.4',
    sourceLabel: '1.2.4 Cost Efficiency',
  },
  {
    id: 9,
    objectiveCode: 'IOB-7',
    elementCode: '1.3.1',
    sourceLabel: '1.3.1 Strategic Visibility and Influence',
  },
  {
    id: 10,
    objectiveCode: 'IOB-8',
    elementCode: '1.4.1',
    sourceLabel: '1.4.1 Data governance',
  },
  {
    id: 11,
    objectiveCode: 'IOB-9',
    elementCode: '1.4.2',
    sourceLabel: '1.4.2 Digital Ecosystem',
  },
  {
    id: 12,
    objectiveCode: 'IOB-10',
    elementCode: '1.5.1',
    sourceLabel: '1.5.1 Decision-Making & Effectiveness',
  },
  {
    id: 13,
    objectiveCode: 'IOB-11',
    elementCode: '1.5.2',
    sourceLabel: '1.5.2 Governance System',
  },
  {
    id: 14,
    objectiveCode: 'IOB-12',
    elementCode: '1.5.2',
    sourceLabel: '1.5.2 Governance System',
  },
  {
    id: 15,
    objectiveCode: 'IOB-13',
    elementCode: '1.5.3',
    sourceLabel: '1.5.3 Organizational performance and agility',
  },
  {
    id: 16,
    objectiveCode: 'IOB-14',
    elementCode: '1.5.4',
    sourceLabel: '1.5.4 Transparency and Sustainability',
  },
  {
    id: 17,
    objectiveCode: 'IOB-15',
    elementCode: '1.6.1',
    sourceLabel: '1.6.1 Audit & Oversight',
  },
  {
    id: 18,
    objectiveCode: 'IOB-16',
    elementCode: '1.6.2',
    sourceLabel: '1.6.2 Compliance',
  },
  {
    id: 19,
    objectiveCode: 'IOB-17',
    elementCode: '1.6.2',
    sourceLabel: '1.6.2 Compliance',
  },
  {
    id: 20,
    objectiveCode: 'IOB-18',
    elementCode: '1.6.3',
    sourceLabel: '1.6.3 Risk Management',
  },
  {
    id: 21,
    objectiveCode: 'IOB-19',
    elementCode: '1.6.4',
    sourceLabel: '1.6.4 Ethics & Integrity',
  },
  {
    id: 22,
    objectiveCode: 'IOB-20',
    elementCode: '2.1.1',
    sourceLabel: '2.1.1 Cross-Cutting Collaboration',
  },
  {
    id: 23,
    objectiveCode: 'IOB-21',
    elementCode: '2.1.1',
    sourceLabel: '2.1.1 Cross-Cutting Collaboration',
  },
  {
    id: 24,
    objectiveCode: 'IOB-22',
    elementCode: '2.1.2',
    sourceLabel: '2.1.2 Inclusive Leadership Development',
  },
  {
    id: 25,
    objectiveCode: 'IOB-23',
    elementCode: '2.1.3',
    sourceLabel: '2.1.3 Trust & Psychological Safety',
  },
  {
    id: 26,
    objectiveCode: 'IOB-24',
    elementCode: '3.1.1',
    sourceLabel: '3.1.1 Research Synthesis and Visibility',
  },
  {
    id: 27,
    objectiveCode: 'IOB-24',
    elementCode: '3.1.2',
    sourceLabel: '3.1.2 Scientific Output and Quality',
  },
  {
    id: 28,
    objectiveCode: 'IOB-24',
    elementCode: '3.1.3',
    sourceLabel: '3.1.3 Scientific Relevance',
  },
  {
    id: 29,
    objectiveCode: 'IOB-24',
    elementCode: '4.1.1',
    sourceLabel: '3.2.1 Innovation development',
  },
  {
    id: 30,
    objectiveCode: 'IOB-25',
    elementCode: '4.1.1',
    sourceLabel: '4.1.1 Uptake of innovations for system change',
  },
  {
    id: 31,
    objectiveCode: 'IOB-26',
    elementCode: '4.2.1',
    sourceLabel: '4.2.1 Demonstrated research impact',
  },
  {
    id: 32,
    objectiveCode: 'IOB-26',
    elementCode: '4.2.2',
    sourceLabel: '4.2.2 Documented outcome and behavioral change',
  },
  {
    id: 33,
    objectiveCode: 'IOB-27',
    elementCode: '4.3.1',
    sourceLabel: '4.3.1 Contribution to science-based policy change',
  },
  {
    id: 34,
    objectiveCode: 'IOB-28',
    elementCode: '4.4.1',
    sourceLabel: '4.4.1 Strategic partnerships for innovation scaling',
  },
  {
    id: 35,
    objectiveCode: 'IOB-28',
    elementCode: '4.4.2',
    sourceLabel: '4.4.2 Transition of innovations to market',
  },
  {
    id: 36,
    objectiveCode: 'IOB-24',
    elementCode: '4.5.1',
    sourceLabel:
      '4.5.1 Individuals who participated in capacity-sharing activities',
  },
];

export const SEED_RESPONSIBLES: readonly StrategyFrameworkSeedResponsible[] = [
  {
    elementCode: '2.1.1',
    name: 'Ana Marta Carrillo',
    email: 'a.carrillo@cgiar.org',
    position: 1,
  },
  {
    elementCode: '2.1.1',
    name: 'Ivana Cortesini',
    email: 'I.Cortesini@cgiar.org',
    position: 2,
  },
  {
    elementCode: '2.1.2',
    name: 'Ana Marta Carrillo',
    email: 'a.carrillo@cgiar.org',
    position: 1,
  },
  {
    elementCode: '2.1.3',
    name: 'David Ongesa',
    email: 'D.Ongesa@cgiar.org',
    position: 1,
  },
  {
    elementCode: '1.6.1',
    name: 'Alexander Ibarguen',
    email: 'E.Ibarguen@cgiar.org',
    position: 1,
  },
  {
    elementCode: '1.6.2',
    name: 'Alexander Ibarguen',
    email: 'E.Ibarguen@cgiar.org',
    position: 1,
  },
  {
    elementCode: '1.6.2',
    name: 'Mauricio Munoz',
    email: 'E.Munoz@cgiar.org',
    position: 2,
  },
  {
    elementCode: '1.6.4',
    name: 'Franck Noukam',
    email: 'F.Noukam@cgiar.org',
    position: 1,
  },
  {
    elementCode: '1.6.3',
    name: 'Carlos Paredes',
    email: 'c.e.paredes@cgiar.org',
    position: 1,
  },
  {
    elementCode: '1.4.1',
    name: 'Idris Jones',
    email: 'I.Jones@CGIAR.ORG',
    position: 1,
  },
  {
    elementCode: '1.4.2',
    name: 'Idris Jones',
    email: 'I.Jones@CGIAR.ORG',
    position: 1,
  },
  {
    elementCode: '1.2.4',
    name: 'Victor Guardia',
    email: 'V.Guardia@cgiar.org',
    position: 1,
  },
  {
    elementCode: '1.2.3',
    name: 'Victor Guardia',
    email: 'V.Guardia@cgiar.org',
    position: 1,
  },
  {
    elementCode: '1.2.1',
    name: 'Enrico Baccioni',
    email: 'E.Baccioni@cgiar.org',
    position: 1,
  },
  {
    elementCode: '1.2.2',
    name: 'Enrico Baccioni',
    email: 'E.Baccioni@cgiar.org',
    position: 1,
  },
  {
    elementCode: '1.5.1',
    name: 'Vanessa Riveros',
    email: 'V.Riveros@cgiar.org',
    position: 1,
  },
  {
    elementCode: '1.5.2',
    name: 'Vanessa Riveros',
    email: 'V.Riveros@cgiar.org',
    position: 1,
  },
  {
    elementCode: '1.5.3',
    name: 'Vanessa Riveros',
    email: 'V.Riveros@cgiar.org',
    position: 1,
  },
  {
    elementCode: '1.5.4',
    name: 'Mauricio Munoz',
    email: 'E.Munoz@cgiar.org',
    position: 1,
  },
  {
    elementCode: '1.1.1',
    name: 'Idris Jones',
    email: 'I.Jones@CGIAR.ORG',
    position: 1,
  },
  {
    elementCode: '1.1.1',
    name: 'Philippe Attey',
    email: 'P.Attey@cgiar.org',
    position: 2,
  },
  {
    elementCode: '1.1.2',
    name: 'Idris Jones',
    email: 'I.Jones@CGIAR.ORG',
    position: 1,
  },
  {
    elementCode: '1.1.2',
    name: 'Philippe Attey',
    email: 'P.Attey@cgiar.org',
    position: 2,
  },
  {
    elementCode: '1.3.1',
    name: 'Enrico Baccioni',
    email: 'E.Baccioni@cgiar.org',
    position: 1,
  },
  {
    elementCode: '1.3.2',
    name: 'Enrico Baccioni',
    email: 'E.Baccioni@cgiar.org',
    position: 1,
  },
  {
    elementCode: '4.5.1',
    name: 'Elisabetta Gotor',
    email: 'e.gotor@cgiar.org',
    position: 1,
  },
  {
    elementCode: '4.4.1',
    name: 'Enrico Baccioni',
    email: 'E.Baccioni@cgiar.org',
    position: 1,
  },
  {
    elementCode: '4.4.2',
    name: 'Enrico Baccioni',
    email: 'E.Baccioni@cgiar.org',
    position: 1,
  },
  {
    elementCode: '4.1.1',
    name: 'Elisabetta Gotor',
    email: 'e.gotor@cgiar.org',
    position: 1,
  },
  {
    elementCode: '4.2.1',
    name: 'Elisabetta Gotor',
    email: 'e.gotor@cgiar.org',
    position: 1,
  },
  {
    elementCode: '4.2.2',
    name: 'Elisabetta Gotor',
    email: 'e.gotor@cgiar.org',
    position: 1,
  },
  {
    elementCode: '4.3.1',
    name: 'Elisabetta Gotor',
    email: 'e.gotor@cgiar.org',
    position: 1,
  },
  {
    elementCode: '3.1.1',
    name: 'Elisabetta Gotor',
    email: 'e.gotor@cgiar.org',
    position: 1,
  },
  {
    elementCode: '3.1.2',
    name: 'Elisabetta Gotor',
    email: 'e.gotor@cgiar.org',
    position: 1,
  },
  {
    elementCode: '3.1.3',
    name: 'Elisabetta Gotor',
    email: 'e.gotor@cgiar.org',
    position: 1,
  },
];
