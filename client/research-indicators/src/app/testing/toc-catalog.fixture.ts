// Shared ToC catalog fixtures for the bilateral ToC mapping v2 flow.
// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 (T-BIL-TM2-01)
//
// Shapes mirror the FROZEN FE wire contract in
// `docs/specs/bilateral-module/toc-mapping-v2/backend-handoff.md` §4 — the
// reshaped ARI envelope (`BilateralTocCatalogResponse`), NOT the raw lambda-toc
// payload. Built from the real SP01 live snapshot (lambda-toc
// `/toc/results/category/{OUTPUT|OUTCOME|EOI}/initiative/SP01`, 2026-06-09):
// 22 OUTPUT results, 10 OUTCOME results, 2 EOI results (`aow_code: null`).
// Backend transform applied: `wp_short_name` -> `aow_code`,
// `unit_messurament` -> `unit_of_measurement`, `targets[]` resolved to the
// single 2026 entry -> `target_value` + `target_year: 2026`.
//
// These fixtures are the single canonical source for T-BIL-TM2-02/-03/-04
// specs — no per-file re-mocks (tasks.md §5).

import { BilateralTocCatalogResponse, SavedTocAlignment, TocCatalogResult } from '@interfaces/bilateral/pool-funding-alignment.interface';

/**
 * SP01 OUTPUT-level catalog results (full live snapshot, 22 results), including
 * the 5-indicator `HLO1.AOW1.IO1 Steer to impact` (toc_result_id 5187).
 */
export const SP01_OUTPUT_TOC_RESULTS_FIXTURE: TocCatalogResult[] = [
  {
    toc_result_id: 5187,
    title: 'HLO1.AOW1.IO1 Steer to impact',
    description: 'Market intelligence is packaged into decision-support tools to guide investment decisions in breeding and other science programs',
    aow_code: 'AOW01',
    indicators: [
      {
        indicator_id: 5972,
        indicator_description: 'Number of new market intelligence briefs',
        unit_of_measurement: 'Number',
        type_value: 'Number of knowledge products',
        target_value: '10',
        target_year: 2026
      },
      {
        indicator_id: 5973,
        indicator_description: 'Number of events where Market Intelligence (market research findings) were shared',
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: '5',
        target_year: 2026
      },
      {
        indicator_id: 5974,
        indicator_description: 'Number of crop-based open access data platforms',
        unit_of_measurement: 'Number',
        type_value: 'Number of innovations (innovation development)',
        target_value: '1',
        target_year: 2026
      },
      {
        indicator_id: 5975,
        indicator_description: 'Number of GloMIP tools with Market Intelligence data/information',
        unit_of_measurement: 'Number',
        type_value: 'Number of innovations (innovation development)',
        target_value: '1',
        target_year: 2026
      },
      {
        indicator_id: 5976,
        indicator_description: 'Number of reports documenting new market Segments and TPPs presented in GloMIP',
        unit_of_measurement: 'Number',
        type_value: 'Number of knowledge products',
        target_value: '1',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5172,
    title: 'HLO2.AOW1.IO1 Target markets',
    description: 'Market intelligence is gathered to evidence demand-led and foresight opportunities for impact',
    aow_code: 'AOW01',
    indicators: [
      {
        indicator_id: 5939,
        indicator_description: 'Number of knowledge products featuring new demand led market segments updates',
        unit_of_measurement: 'Number',
        type_value: 'Number of knowledge products',
        target_value: '10',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5173,
    title: 'HLO3.AOW1.IO1 Design concepts',
    description:
      'New product concepts are designed for demand-led and foresight opportunities, that can be used by breeders to meet the Product Design Standard.',
    aow_code: 'AOW01',
    indicators: [
      {
        indicator_id: 5940,
        indicator_description: 'Number of reports documenting the development, implementation and periodic assessment of the Product Design Standard',
        unit_of_measurement: 'Number',
        type_value: 'Number of knowledge products',
        target_value: '1',
        target_year: 2026
      },
      {
        indicator_id: 5941,
        indicator_description: 'Number of knowledge products featuring new product concepts',
        unit_of_measurement: 'Number',
        type_value: 'Number of knowledge products',
        target_value: '10',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5180,
    title: 'HLO4.AOW1.IO1 Foster motivations',
    description:
      'Intelligence gathered on motivations (social, economic, behavioral) for change across the supply chain, consumers and smallholder farmers ',
    aow_code: 'AOW01',
    indicators: [
      {
        indicator_id: 5955,
        indicator_description:
          'Number of knowledge products that present findings on what incentivizes farmers, markets and consumers to replace current varieties ',
        unit_of_measurement: 'Number',
        type_value: 'Number of knowledge products',
        target_value: '2',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5196,
    title: 'HLO5.AOW1.IO3 Investment cases',
    description: 'Investment case studies are developed to inform investments for maximized impact (change in targeted SDGs)',
    aow_code: 'AOW01',
    indicators: [
      {
        indicator_id: 5989,
        indicator_description: 'Number of case studies that inform investments for maximized impact developed',
        unit_of_measurement: 'Number',
        type_value: 'Number of knowledge products',
        target_value: '3',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5178,
    title: 'HLO10.AOW2.IO2 Create products',
    description: 'Breeding networks collaborate on the development of targeted products.',
    aow_code: 'AOW02',
    indicators: [
      {
        indicator_id: 5953,
        indicator_description: 'Number of varieties released to partners for scaling',
        unit_of_measurement: 'Number',
        type_value: 'Number of innovations (innovation development)',
        target_value: '150',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5179,
    title: 'HLO6.AOW2.IO1 Refocus to markets',
    description: 'Feasible breeding pipelines are aligned to market segments and opportunities, as guided by product concepts. ',
    aow_code: 'AOW02',
    indicators: [
      {
        indicator_id: 5954,
        indicator_description:
          'Number of breeding pipelines developed. (Note this could be a perverse indicator as a large number of breeding pipelines may not be advantageous or a better result)',
        unit_of_measurement: 'Number',
        type_value: 'Number of innovations (innovation development)',
        target_value: '75',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5195,
    title: 'HLO7.AOW2.IO2 Accelerating genetic gain',
    description: 'Design of optimized breeding schemes and pipelines that maximize the potential for genetic gain.',
    aow_code: 'AOW02',
    indicators: [
      {
        indicator_id: 5988,
        indicator_description: ' Number of breeding schemes and pipelines designed with optimized breeding cycle time as compared to 2025',
        unit_of_measurement: 'Percent',
        type_value: 'Number of innovations (innovation development)',
        target_value: '98',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5190,
    title: 'HLO8.AOW2.IO2 Discover genetic potential',
    description:
      'Discovery and development of foundational genetic resources such as traits, high-value haplotypes and elite lines that can deliver on targeted product profiles',
    aow_code: 'AOW02',
    indicators: [
      {
        indicator_id: 5981,
        indicator_description: 'Average stage of trait discovery and deployment efforts across the portfolio',
        unit_of_measurement: 'Average',
        type_value: 'Number of innovations (innovation development)',
        target_value: '1',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5690,
    title: 'HLO9.AOW2.IO2 Transform collaboration',
    description: 'Partners are embedded in decision-making for optimized breeding schemes. \n',
    aow_code: 'AOW02',
    indicators: [
      {
        indicator_id: 6724,
        indicator_description: 'Number of Level 1 and Level 2 partners involved in breeding decisions',
        unit_of_measurement: 'Number',
        type_value: 'Number of knowledge products',
        target_value: '25',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5188,
    title: 'HLO11.AOW3.IO4 Position for demand',
    description:
      'Strategies to position quality seed and increase scaling partner demand for new varieties, encouraging variety replacement and Product Lifecycle Management.',
    aow_code: 'AOW03',
    indicators: [
      {
        indicator_id: 5977,
        indicator_description: 'Number of new products per segments validated or introduced ',
        unit_of_measurement: 'Number',
        type_value: 'Number of innovations (innovation development)',
        target_value: '30',
        target_year: 2026
      },
      {
        indicator_id: 5978,
        indicator_description: 'Number of CG-collaborative varieties newly scaled',
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: '10',
        target_year: 2026
      },
      {
        indicator_id: 5979,
        indicator_description: 'Number of scaling partners involved in CG-collaborative variety registrations',
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: '20',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5177,
    title: 'HLO12.AOW3.IO5 Deploy seed',
    description: 'Technologies and strategies to encourage scaling partners to increase production and equitable supply of new varieties.',
    aow_code: 'AOW03',
    indicators: [
      {
        indicator_id: 5952,
        indicator_description: 'Number of strategies that increase production and supply of new varieties by scaling partners ',
        unit_of_measurement: 'Number',
        type_value: 'Number of knowledge products',
        target_value: '3',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5198,
    title: 'HLO13.AOW3.IO5 Power seed scaling',
    description:
      'Technologies, strategies and regulatory solutions to encourage scaling partners to accelerate delivery of new varieties to smallholders.',
    aow_code: 'AOW03',
    indicators: [
      {
        indicator_id: 5991,
        indicator_description:
          'Number of technologies, strategies, or regulatory solutions developed to encourage scaling partners to accelerate equity in the delivery of new varieties and quality seed to smallholders',
        unit_of_measurement: 'Number',
        type_value: 'Number of knowledge products',
        target_value: '2',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5174,
    title: 'HLO14.AOW3.IO5 TRACK adoption',
    description: 'Methods and tools to track variety adoption and turnover at scale ',
    aow_code: 'AOW03',
    indicators: [
      {
        indicator_id: 5942,
        indicator_description: ' No. of stakeholder feedback sessions conducted \n',
        unit_of_measurement: '1. Number  ',
        type_value: 'custom',
        target_value: '20',
        target_year: 2026
      },
      {
        indicator_id: 5943,
        indicator_description: 'Number of tools (to track variety adoption/scale turnover) available',
        unit_of_measurement: 'Number',
        type_value: 'Number of knowledge products',
        target_value: '1',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5184,
    title: 'HLO15.AOW4.IO2 Hub & spoke scaling',
    description:
      'Interoperable tools and services are scaled to match the varied capacities of partners across the breeding network. High-capacity partners are supported to act as central hubs, providing in breeding network support to less resourced partners.',
    aow_code: 'AOW04',
    indicators: [
      {
        indicator_id: 5966,
        indicator_description:
          'Number of High-capacity partners acting as central hub, providing breeding network support services to less resourced partners',
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: '2',
        target_year: 2026
      },
      {
        indicator_id: 5967,
        indicator_description: 'Number of institutional users in Service Portal',
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: '50',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5194,
    title: 'HLO16.AOW4.IO3 Shared services',
    description:
      'A portfolio of connected tools and services that collectively meet current and emerging needs for modernized breeding is made available to breeding networks',
    aow_code: 'AOW04',
    indicators: [
      {
        indicator_id: 5987,
        indicator_description: 'Number of tools and services used',
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: '1',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5197,
    title: 'HLO17.AOW4.IO3 FAIR principles',
    description: 'All breeding programs are supported to maximize alignment with FAIR principles',
    aow_code: 'AOW04',
    indicators: [
      {
        indicator_id: 5990,
        indicator_description: 'Number of Centers that make EBS data API accessible',
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: '2',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5193,
    title: 'HLO18.AOW5.IO2 Partnered networks',
    description: 'Strategic planning of crop x region breeding networks that enables collaboration on common challenges and opportunities.',
    aow_code: 'AOW05',
    indicators: [
      {
        indicator_id: 5985,
        indicator_description: 'Number of Crops with Level 1 & Level 2 partner countries characterized',
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: '4',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5186,
    title: 'HLO19.AOW5.IO2 Share capacity',
    description:
      'Coordinated capacity-sharing strategies for the breeding networks, enabling a dynamic future workforce with appropriate infrastructure and resources in CGIAR and NARES breeding partners.',
    aow_code: 'AOW05',
    indicators: [
      {
        indicator_id: 5971,
        indicator_description: 'Number of individuals from research or scaling partner organizations who attended CGIAR trainings\n ',
        unit_of_measurement: 'Number',
        type_value: 'Number of people trained (capacity sharing for development)',
        target_value: '200',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5192,
    title: 'HLO20.AOW5.IO3 Assess performance',
    description:
      'Evaluation and assessment of performance data gathered by AOWS and any additional data gathering required to address gaps in the MELIA framework',
    aow_code: 'AOW05',
    indicators: [
      {
        indicator_id: 5984,
        indicator_description:
          'Number of AoWs, with MELIA performance reports completed, addressing identified data gaps. Availability of MELIA Report on AoWs (performance data)',
        unit_of_measurement: 'Number',
        type_value: 'Number of knowledge products',
        target_value: '5',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5189,
    title: 'HLO21.AOW5.IO3 Improve management',
    description:
      'Learnings and organizational bottlenecks identified in the HLO Assess performance are addressed, enabling maximum impact from (return on) investment ',
    aow_code: 'AOW05',
    indicators: [
      {
        indicator_id: 5980,
        indicator_description: 'Number of identified learning and organizational bottlenecks addressed to enhance performance and ROI',
        unit_of_measurement: 'Number',
        type_value: 'Number of knowledge products',
        target_value: '2',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5183,
    title: 'HLO22.AOW5.IO5 Exchange genetic resources',
    description: 'Recommendations and guidance on genetic resources policies and practices relating to the use and exchange of genetic resources',
    aow_code: 'AOW05',
    indicators: [
      {
        indicator_id: 5964,
        indicator_description: 'Number of users of genetic products',
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: '0',
        target_year: 2026
      },
      {
        indicator_id: 5965,
        indicator_description: ' Number of recommendation and guidance developed on genetic resources policies and practices',
        unit_of_measurement: 'Number',
        type_value: 'Number of knowledge products',
        target_value: '1',
        target_year: 2026
      }
    ]
  }
];

/** SP01 OUTCOME-level catalog results (full live snapshot, 10 results). */
export const SP01_OUTCOME_TOC_RESULTS_FIXTURE: TocCatalogResult[] = [
  {
    toc_result_id: 5185,
    title: 'IOC1 Prioritization of products ',
    description: 'CGIAR-NARES prioritization of transdisciplinary designed high-impact products encourages more targeted breeding by networks',
    aow_code: 'AOW01',
    indicators: [
      {
        indicator_id: 5968,
        indicator_description:
          'Number of CGIAR-NARES regional crop breeding networks that have revised their regional MS and TPPs based on formal input (national MS and TPPs defined by PDTs) from their Level 1 and 2 network member countries',
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: '2',
        target_year: 2026
      },
      {
        indicator_id: 5969,
        indicator_description: 'Number of partners (institution) using market intelligence products and tools',
        unit_of_measurement: 'Number',
        type_value: 'Innovation Use',
        target_value: '10',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5176,
    title: 'IOC3 Cost-effective product development by Breeding Networks. ',
    description: 'CGIAR-NARES breeding networks cost-effectively develop prioritized products, in the shortest possible time',
    aow_code: 'AOW01',
    indicators: [
      {
        indicator_id: 5951,
        indicator_description:
          'Number of national research institutions and analytical units in the Global South using new or improved datasets from CGIAR.',
        unit_of_measurement: 'Annual',
        type_value: 'Innovation Use',
        target_value: '0',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5691,
    title: 'IOC1 Prioritization of products ',
    description: 'CGIAR-NARES prioritization of transdisciplinary designed high-impact products encourages more targeted breeding by networks',
    aow_code: 'AOW02',
    indicators: [
      {
        indicator_id: 6873,
        indicator_description: 'Number of transdisciplinary high designed-impact products used for targeted breeding by breeding networks ',
        unit_of_measurement: 'Number',
        type_value: 'Innovation Use',
        target_value: '5',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5182,
    title: 'IOC2 - Active collaboration to develop products',
    description: 'CGIAR Centers, AOWs and NARES actively collaborate on successful product development',
    aow_code: 'AOW02',
    indicators: [
      {
        indicator_id: 5960,
        indicator_description: 'Number of Breeding networks that collaborate to develop products',
        unit_of_measurement: 'Number',
        type_value: '_n_Number of research partners from the Global South that collaborate with CGIAR.',
        target_value: '0',
        target_year: 2026
      },
      {
        indicator_id: 5961,
        indicator_description:
          'Number of products (with targeted levels of genetic gains and traits) jointly developed through collaboration between CGIAR Centers, AOWs, and NARES.',
        unit_of_measurement: 'Number',
        type_value:
          '_n_Proportion of new released varieties developed in alignment with market intelligence-informed target product profiles and tailored to market segments in the Global South.',
        target_value: '0',
        target_year: 2026
      },
      {
        indicator_id: 5962,
        indicator_description: 'Partners aligned to common TPPs in product development decisions, ',
        unit_of_measurement: 'Proportion',
        type_value:
          '_n_Proportion of CGIAR-NARS-SME breeding pipelines within CGIAR-NARS-SME network using market segments, target product profiles to guide selection decisions for all advancement steps.',
        target_value: '0',
        target_year: 2026
      },
      {
        indicator_id: 5963,
        indicator_description:
          'Number of CGIAR-NARES regional crop breeding networks that have defined roles and responsibilities of network members and allocated resources commensurate to role',
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: '10',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5191,
    title: 'IOC4 Scaling partners increase uptake',
    description: 'NARES and SME scaling partners increase uptake of varieties with step-change benefits',
    aow_code: 'AOW03',
    indicators: [
      {
        indicator_id: 5982,
        indicator_description: 'NARES and SME scaling partners increase uptake of varieties with step-change benefits',
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: '5',
        target_year: 2026
      },
      {
        indicator_id: 5983,
        indicator_description:
          " Number of regional product advancements conducted where country teams have ownership for variety selection based on their country's needs",
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: '5',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5175,
    title: 'IOC5 Equitable access to improved varieties',
    description: 'NARES and SMEs promote equitable access to improved varieties for marginalized groups',
    aow_code: 'AOW03',
    indicators: [
      {
        indicator_id: 5944,
        indicator_description: 'Projected area under adoption or market share',
        unit_of_measurement: 'Acres/ha',
        type_value: 'Innovation Use',
        target_value: '1000000',
        target_year: 2026
      },
      {
        indicator_id: 5945,
        indicator_description: ' Number of recommendations and guidance related to use exchange of genetic resources by partners',
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: '1',
        target_year: 2026
      },
      {
        indicator_id: 5948,
        indicator_description: 'Number of NARES supported to license varieties to SMEs with support from ENABLE Exchange innovations',
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: '5',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5688,
    title: 'IOC3 Cost-effective product development by Breeding Networks. ',
    description: 'CGIAR-NARES breeding networks cost-effectively develop prioritized products, in the shortest possible time',
    aow_code: 'AOW04',
    indicators: [
      {
        indicator_id: 6719,
        indicator_description:
          'Number of CGIAR-NARES regional crop breeding networks that have fully costed out operations and are using costing result to determine network members functions (Breeding network use of shared tools and services via Breeding Resources, and organizational changes developed by Enable)',
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: null,
        target_year: 2026
      },
      {
        indicator_id: 6720,
        indicator_description: 'Cost-effective, prioritized products co-developed with the partners in the shortest possible time. ',
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: '4',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5692,
    title: 'IOC2 - Active collaboration to develop products',
    description: 'CGIAR Centers, AOWs and NARES actively collaborate on successful product development',
    aow_code: 'AOW05',
    indicators: [
      {
        indicator_id: 6871,
        indicator_description:
          'Number of CGIAR-NARES regional crop breeding networks that have defined roles and responsibilities of network members and allocated resources commensurate to role',
        unit_of_measurement: 'number',
        type_value: 'custom',
        target_value: '50',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5687,
    title: 'IOC3 Cost-effective product development by Breeding Networks. ',
    description: 'CGIAR-NARES breeding networks cost-effectively develop prioritized products, in the shortest possible time',
    aow_code: 'AOW05',
    indicators: [
      {
        indicator_id: 6872,
        indicator_description:
          'Number of CGIAR-NARES regional crop breeding networks that have fully costed out operations and are using costing result to determine network members functions (Breeding network use of shared tools and services via Breeding Resources, and organizational changes developed by Enable)',
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: '5',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5689,
    title: 'IOC5 Equitable access to improved varieties',
    description: 'NARES and SMEs promote equitable access to improved varieties for marginalized groups',
    aow_code: 'AOW05',
    indicators: [
      {
        indicator_id: 6722,
        indicator_description: 'NARES and SMEs promote equitable access to improved varieties for marginalized groups',
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: '10',
        target_year: 2026
      },
      {
        indicator_id: 6723,
        indicator_description: 'Number of improved varieties used by marginalized groups',
        unit_of_measurement: 'Number',
        type_value: 'Innovation Use',
        target_value: '0',
        target_year: 2026
      }
    ]
  }
];

/** SP01 EOI-level catalog results (2 results; `aow_code` is null at this level). */
export const SP01_EOI_TOC_RESULTS_FIXTURE: TocCatalogResult[] = [
  {
    toc_result_id: 5181,
    title: '2030-OC1. Widespread use of significantly improved products by farmers',
    description:
      'Farmers widespread use of significantly improved products, results in a transformative scale of benefits for farmers, consumers and society in the Global South',
    aow_code: null,
    indicators: [
      {
        indicator_id: 5956,
        indicator_description: 'Indication of scale of adoption',
        unit_of_measurement: 'Number',
        type_value: '_n_Weighted average age of varieties in farmers’ fields for a prioritized set of representative crops and countries.',
        target_value: '0',
        target_year: 2026
      },
      {
        indicator_id: 5957,
        indicator_description: 'Realized genetic gains in farmer-relevant conditions',
        unit_of_measurement: 'Number',
        type_value: '_n_Realized genetic gains in farmer-relevant conditions.',
        target_value: '0',
        target_year: 2026
      },
      {
        indicator_id: 5958,
        indicator_description: 'Number of smallholder farmers using improved varieties',
        unit_of_measurement: 'Number',
        type_value: null,
        target_value: '0',
        target_year: 2026
      },
      {
        indicator_id: 5959,
        indicator_description:
          'Farmers widespread use of significantly improved products, results in a transformative scale of benefits for farmers, consumers and society in the Global South',
        unit_of_measurement: 'Number',
        type_value: 'Innovation Use',
        target_value: '0',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 5199,
    title: '2030-OC2. Marginalized groups are empowered',
    description:
      'Women, youth and other marginalized groups in food, land and water systems are empowered by and benefit from improved products in the Global South',
    aow_code: null,
    indicators: [
      {
        indicator_id: 5992,
        indicator_description: 'Number of food producers using CGIAR innovations, disaggregated by gender',
        unit_of_measurement: 'Number',
        type_value: null,
        target_value: '0',
        target_year: 2026
      },
      {
        indicator_id: 5993,
        indicator_description: 'Number of Women, youth and other marginalized groups that benefit from improved products in the Global South',
        unit_of_measurement: 'Number',
        type_value: 'Innovation Use',
        target_value: '0',
        target_year: 2026
      }
    ]
  }
];

/**
 * SP03 OUTPUT-level subset: the first two SP01 OUTPUT results with ids offset
 * by +900000 so two-SP fixtures never share toc_result/indicator ids.
 */
export const SP03_OUTPUT_TOC_RESULTS_FIXTURE: TocCatalogResult[] = [
  {
    toc_result_id: 905187,
    title: 'HLO1.AOW1.IO1 Steer to impact',
    description: 'Market intelligence is packaged into decision-support tools to guide investment decisions in breeding and other science programs',
    aow_code: 'AOW01',
    indicators: [
      {
        indicator_id: 905972,
        indicator_description: 'Number of new market intelligence briefs',
        unit_of_measurement: 'Number',
        type_value: 'Number of knowledge products',
        target_value: '10',
        target_year: 2026
      },
      {
        indicator_id: 905973,
        indicator_description: 'Number of events where Market Intelligence (market research findings) were shared',
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: '5',
        target_year: 2026
      },
      {
        indicator_id: 905974,
        indicator_description: 'Number of crop-based open access data platforms',
        unit_of_measurement: 'Number',
        type_value: 'Number of innovations (innovation development)',
        target_value: '1',
        target_year: 2026
      },
      {
        indicator_id: 905975,
        indicator_description: 'Number of GloMIP tools with Market Intelligence data/information',
        unit_of_measurement: 'Number',
        type_value: 'Number of innovations (innovation development)',
        target_value: '1',
        target_year: 2026
      },
      {
        indicator_id: 905976,
        indicator_description: 'Number of reports documenting new market Segments and TPPs presented in GloMIP',
        unit_of_measurement: 'Number',
        type_value: 'Number of knowledge products',
        target_value: '1',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 905172,
    title: 'HLO2.AOW1.IO1 Target markets',
    description: 'Market intelligence is gathered to evidence demand-led and foresight opportunities for impact',
    aow_code: 'AOW01',
    indicators: [
      {
        indicator_id: 905939,
        indicator_description: 'Number of knowledge products featuring new demand led market segments updates',
        unit_of_measurement: 'Number',
        type_value: 'Number of knowledge products',
        target_value: '10',
        target_year: 2026
      }
    ]
  }
];

/**
 * Canonical CapSharing catalog: single allowed level (OUTPUT), single SP (SP01),
 * version unlocked. Exercises the one-level cascade (REQ-BIL-TM2-04).
 */
export const TOC_CATALOG_CAPSHARING_FIXTURE: BilateralTocCatalogResponse = {
  result_code: 'STAR-5238',
  mapping_status: 'mapped',
  clarisa_project: { id: 123, short_name: 'EMBRAPA - Test project' },
  result_type: 'capacity_sharing',
  allowed_levels: ['OUTPUT'],
  version_locked: false,
  catalogs: [
    {
      sp_code: 'SP01',
      levels: [{ level: 'OUTPUT', toc_results: SP01_OUTPUT_TOC_RESULTS_FIXTURE }]
    }
  ]
};

/**
 * Policy-change catalog: two allowed levels (OUTCOME + EOI) on SP01. The EOI
 * group carries `aow_code: null` results (title-only labels, REQ-BIL-TM2-05).
 */
export const TOC_CATALOG_POLICY_FIXTURE: BilateralTocCatalogResponse = {
  result_code: 'STAR-5238',
  mapping_status: 'mapped',
  clarisa_project: { id: 123, short_name: 'EMBRAPA - Test project' },
  result_type: 'policy_change',
  allowed_levels: ['OUTCOME', 'EOI'],
  version_locked: false,
  catalogs: [
    {
      sp_code: 'SP01',
      levels: [
        { level: 'OUTCOME', toc_results: SP01_OUTCOME_TOC_RESULTS_FIXTURE },
        { level: 'EOI', toc_results: SP01_EOI_TOC_RESULTS_FIXTURE }
      ]
    }
  ]
};

/**
 * Two-SP catalog (SP01 + SP03) for block-independence scenarios (the SP01/SP03
 * 10/25 case). SP03 reuses a small SP01 subset with distinct ids.
 */
export const TOC_CATALOG_TWO_SP_FIXTURE: BilateralTocCatalogResponse = {
  result_code: 'STAR-5238',
  mapping_status: 'mapped',
  clarisa_project: { id: 123, short_name: 'EMBRAPA - Test project' },
  result_type: 'capacity_sharing',
  allowed_levels: ['OUTPUT'],
  version_locked: false,
  catalogs: [
    {
      sp_code: 'SP01',
      levels: [{ level: 'OUTPUT', toc_results: SP01_OUTPUT_TOC_RESULTS_FIXTURE }]
    },
    {
      sp_code: 'SP03',
      levels: [{ level: 'OUTPUT', toc_results: SP03_OUTPUT_TOC_RESULTS_FIXTURE }]
    }
  ]
};

/** Version-locked catalog (live ToC version differs from 2026) — REQ-BIL-TM2-09. */
export const TOC_CATALOG_VERSION_LOCKED_FIXTURE: BilateralTocCatalogResponse = {
  result_code: 'STAR-5238',
  mapping_status: 'mapped',
  clarisa_project: { id: 123, short_name: 'EMBRAPA - Test project' },
  result_type: 'capacity_sharing',
  allowed_levels: ['OUTPUT'],
  version_locked: true,
  catalogs: [
    {
      sp_code: 'SP01',
      levels: [{ level: 'OUTPUT', toc_results: SP01_OUTPUT_TOC_RESULTS_FIXTURE }]
    }
  ]
};

/**
 * Result type with no ToC alignment question: `allowed_levels: []` ⇒ the FE
 * hides the cascade entirely (REQ-BIL-TM2-04 AC-04.3).
 */
export const TOC_CATALOG_EMPTY_LEVELS_FIXTURE: BilateralTocCatalogResponse = {
  result_code: 'STAR-5238',
  mapping_status: 'mapped',
  clarisa_project: { id: 123, short_name: 'EMBRAPA - Test project' },
  result_type: 'oicr',
  allowed_levels: [],
  version_locked: false,
  catalogs: []
};

/**
 * Saved alignments read-back (rides `AlignmentResponse.toc_alignments`). FLAT
 * shape matching the backend `TocAlignmentReadbackResponse` (decision D-10): the
 * display fields are denormalized onto the row itself — NO `snapshot` wrapper, NO
 * `aow_code`, NO `is_stale`. SP01 is fully aligned to toc_result 5187 / indicator
 * 5973 (`target_value` '5' for 2026); SP03 answers No, so the backend sends every
 * cascade/display field as explicit `null`.
 */
export const SAVED_TOC_ALIGNMENTS_FIXTURE: SavedTocAlignment[] = [
  {
    sp_code: 'SP01',
    aligns_with_toc: true,
    level: 'OUTPUT',
    toc_result_id: 5187,
    indicator_id: 5973,
    quantitative_contribution: 3,
    toc_result_title: 'HLO1.AOW1.IO1 Steer to impact',
    indicator_description: 'Number of events where Market Intelligence (market research findings) were shared',
    unit_of_measurement: 'Number',
    target_value: '5',
    target_year: 2026
  },
  {
    sp_code: 'SP03',
    aligns_with_toc: false,
    level: null,
    toc_result_id: null,
    indicator_id: null,
    quantitative_contribution: null,
    toc_result_title: null,
    indicator_description: null,
    unit_of_measurement: null,
    target_value: null,
    target_year: null
  }
];

// ---------------------------------------------------------------------------
// @sdd-spec docs/specs/bilateral-module/toc-indicator-type-guidance (T-BIL-ITG-02) — classification coverage: type-match / wildcard / other / unclassified states
//
// APPEND-ONLY extension: everything above stays byte-identical (consumers
// assert exact counts/ids on it, e.g. "22 HLOs for SP01 OUTPUT", "5 indicators
// on 5187"). The guidance suites (T-BIL-ITG-03..05) use the exports below.
// ---------------------------------------------------------------------------

/**
 * Extra SP01 OUTPUT-level HLOs covering the classification states the live
 * snapshot lacks at this level (`classifyIndicator` matrix, D-ITG-6):
 * - 7201 is MIXED for `capacity_sharing`: a trained-people type-match (7301)
 *   next to an `other` canonical type (7302) and a `custom` wildcard (7303).
 * - 7202 has ZERO type-matches for `capacity_sharing`: only unclassified
 *   indicators — a `null` `type_value` (7304) and an `_n_*` free-text one (7305).
 * Ids (72xx / 73xx) collide with nothing above.
 */
export const SP01_OUTPUT_GUIDANCE_TOC_RESULTS_FIXTURE: TocCatalogResult[] = [
  {
    toc_result_id: 7201,
    title: 'HLO23.AOW5.IO2 Grow shared skills',
    description: 'Capacity-sharing curricula and materials are co-developed and delivered with breeding network partners',
    aow_code: 'AOW05',
    indicators: [
      {
        indicator_id: 7301,
        indicator_description: 'Number of partner staff trained through co-developed capacity-sharing curricula',
        unit_of_measurement: 'Number',
        type_value: 'Number of people trained (capacity sharing for development)',
        target_value: '120',
        target_year: 2026
      },
      {
        indicator_id: 7302,
        indicator_description: 'Number of training manuals and curricula published for breeding network partners',
        unit_of_measurement: 'Number',
        type_value: 'Number of knowledge products',
        target_value: '4',
        target_year: 2026
      },
      {
        indicator_id: 7303,
        indicator_description: 'Number of partner institutions hosting co-delivered training events',
        unit_of_measurement: 'Number',
        type_value: 'custom',
        target_value: '8',
        target_year: 2026
      }
    ]
  },
  {
    toc_result_id: 7202,
    title: 'HLO24.AOW5.IO3 Track partner engagement',
    description: 'Engagement of Global South research partners in breeding network governance is monitored and reported',
    aow_code: 'AOW05',
    indicators: [
      {
        indicator_id: 7304,
        indicator_description: 'Number of partner engagement monitoring reports produced',
        unit_of_measurement: 'Number',
        type_value: null,
        target_value: '2',
        target_year: 2026
      },
      {
        indicator_id: 7305,
        indicator_description: 'Number of Global South research partners engaged in network governance',
        unit_of_measurement: 'Number',
        type_value: '_n_Number of research partners from the Global South that collaborate with CGIAR.',
        target_value: '15',
        target_year: 2026
      }
    ]
  }
];

/**
 * CapSharing guidance catalog (`result_type: 'capacity_sharing'`, OUTPUT only)
 * composed WITHOUT mutating the frozen arrays above. Classification states:
 * - (a) MIXED HLO — SP01/OUTPUT/7201 (type-match 7301 + other 7302 + wildcard 7303).
 *   SP01/OUTPUT/5186 stays the pure single-type-match HLO (indicator 5971).
 * - (b) ZERO-type-match HLO — SP01/OUTPUT/7202 (unclassified only: null 7304,
 *   `_n_*` 7305); SP01/OUTPUT/5172 is the other-canonical-only variant.
 * - (c) Anywhere-empty level (AC-04.4) — SP03/OUTPUT: no trained-people
 *   type-match in ANY of its HLOs (only knowledge-product / innovation /
 *   custom types).
 */
export const TOC_CATALOG_CAPSHARING_GUIDANCE_FIXTURE: BilateralTocCatalogResponse = {
  result_code: 'STAR-5238',
  mapping_status: 'mapped',
  clarisa_project: { id: 123, short_name: 'EMBRAPA - Test project' },
  result_type: 'capacity_sharing',
  allowed_levels: ['OUTPUT'],
  version_locked: false,
  catalogs: [
    {
      sp_code: 'SP01',
      levels: [{ level: 'OUTPUT', toc_results: [...SP01_OUTPUT_TOC_RESULTS_FIXTURE, ...SP01_OUTPUT_GUIDANCE_TOC_RESULTS_FIXTURE] }]
    },
    {
      sp_code: 'SP03',
      levels: [{ level: 'OUTPUT', toc_results: SP03_OUTPUT_TOC_RESULTS_FIXTURE }]
    }
  ]
};
