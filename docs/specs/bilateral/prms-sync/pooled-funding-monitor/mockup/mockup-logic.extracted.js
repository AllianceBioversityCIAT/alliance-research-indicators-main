
// Official portfolio list (code + name + group), in portfolio order
const SP_LIST = [
  { code: "SP01", name: "Breeding for Tomorrow", group: "Science programs", colors: ["#fdeceb", "#b4443a"] },
  { code: "SP02", name: "Sustainable Farming", group: "Science programs", colors: ["#e6f2ea", "#1d6b3e"] },
  { code: "SP03", name: "Sustainable Animal and Aquatic Foods", group: "Science programs", colors: ["#fdf0e6", "#a04f16"] },
  { code: "SP04", name: "Multifunctional Landscapes", group: "Science programs", colors: ["#eaf1e4", "#4a6a1f"] },
  { code: "SP05", name: "Better Diets and Nutrition", group: "Science programs", colors: ["#f2ece4", "#7a5c33"] },
  { code: "SP06", name: "Climate Action", group: "Science programs", colors: ["#e7eefa", "#0f4c9a"] },
  { code: "SP07", name: "Policy Innovations", group: "Science programs", colors: ["#fbeee0", "#a8650a"] },
  { code: "SP08", name: "Food Frontiers and Security", group: "Science programs", colors: ["#e3f0f4", "#146273"] },
  { code: "SP09", name: "Scaling for Impact", group: "Scaling programs", colors: ["#efe9f7", "#5b3d96"] },
  { code: "SP10", name: "Gender Equality and Inclusion", group: "Accelerators", colors: ["#fdeceb", "#b4443a"] },
  { code: "SP11", name: "Capacity Sharing", group: "Accelerators", colors: ["#e9e9f6", "#3b3f8f"] },
  { code: "SP12", name: "Digital Transformation", group: "Accelerators", colors: ["#f9e9f3", "#94266e"] },
  { code: "SP13", name: "Genebank", group: "Accelerators", colors: ["#e6f2ea", "#3f7a34"] },
  { code: "SGP-02", name: "AVISA", group: "Other projects", colors: ["#fbeee0", "#a8650a"] }
];
// Portfolio-wide totals for the 2026 cycle (197 projects contributing to Pool funding)
const TOTALS = { projects: 197, withResults: 142, sending: 118, silent: 55,
  created: 3864, flagged: 1240, awaitingPi: 272, approved: 968, ready: 327, sent: 641, accepted: 512, underQa: 96, rejected: 33, drift: 41 };
const SP_GROUP_ORDER = ["Science programs", "Scaling programs", "Accelerators", "Other projects"];
// Result types transferred to PRMS. Impact Case Reports (OICRs) stay in STAR and are not synced.
const RESULT_TYPES = ["Knowledge Product", "Innovation Development", "Innovation Use", "Capacity Sharing for Development", "Policy Change"];
const SP_COLORS = {}, SP_CODES = {};
SP_LIST.forEach(s => { SP_COLORS[s.name] = s.colors; SP_CODES[s.name] = s.code; });
const badge = (bg, fg, extra) => `display:inline-flex;align-items:center;padding:3px 9px;border-radius:6px;font:500 12px 'IBM Plex Sans';background:${bg};color:${fg};${extra || ""}`;
const STAR_COLORS = {
  "Approved": ["#e6f2ea", "#1d6b3e"],
  "Submitted": ["#e7eefa", "#0f4c9a"],
  "Under review": ["#efe9f7", "#5b3d96"],
  "Draft": ["#eef1f5", "#6b7a89"],
  "Returned": ["#fdeceb", "#b4443a"]
};
const PRMS_COLORS = {
  "Not sent": ["transparent", "#a8b4c0"],
  "Pending Review": ["#fdf0d5", "#8a5a08"],
  "Approved": ["#c9f2dc", "#146b41"],
  "Rejected": ["#fde8ea", "#b02b3a"]
};
const MAPPING_COLORS = {
  "Complete": ["#e6f2ea", "#1d6b3e"],
  "Incomplete": ["#fbeee0", "#a8650a"],
  "Not started": ["#eef1f5", "#6b7a89"],
  "No SP contribution": ["#e6f2ea", "#1d6b3e"]
};
const outOfScope = (r) => (r.mapping || "") === "No SP contribution";
const mapOf = (r) => r.mapping || (r.star === "Approved" ? "Complete" : "Not started");
const mapNoteOf = (r) => r.mappingNote || (r.star === "Approved" ? "Pool funding split recorded" : "Starts after PI approval");
const PRMS_PILL = (s) => {
  const c = PRMS_COLORS[s] || PRMS_COLORS["Not sent"];
  return `display:inline-flex;align-items:center;padding:4px 12px;border-radius:20px;font:500 12px 'IBM Plex Sans';background:${c[0]};color:${c[1]}`;
};

const DATA = [
  { id: 1, code: "STAR-2025-0431", title: "Drought-tolerant maize hybrid CIM-DT7 released for semi-arid Kenya", project: "Accelerating Seed Systems East Africa", projectCode: "BIL-KE-2231 · BMGF", type: "Innovation Development", year: "2025",
    primarySP: "Breeding for Tomorrow", contrib: "Sustainable Farming · Scaling for Impact", star: "Approved", prms: "Not sent", pi: "Dr. A. Wanjiru", piNote: "Approved 18 Jul 2026", updated: "20 Jul, 08:45", drift: false, starVer: 4, prmsVer: null, prmsRef: "—", mine: true },
  { id: 2, code: "STAR-2025-0428", title: "National fertilizer subsidy guideline revised using STAR evidence brief", project: "Soil Health Policy Dialogue Ethiopia", projectCode: "BIL-ET-1907 · NORAD", type: "Policy Change", year: "2025",
    primarySP: "Policy Innovations", contrib: "Sustainable Farming", star: "Approved", prms: "Not sent", pi: "Dr. T. Bekele", piNote: "Approved 17 Jul 2026", updated: "19 Jul, 14:15", drift: false, starVer: 2, prmsVer: null, prmsRef: "—", mine: true },
  { id: 3, code: "STAR-2025-0402", title: "Aquaculture pond management package adopted by 4,200 smallholders in Bangladesh", project: "Sustainable Aquafood Systems", projectCode: "BIL-BD-2044 · FCDO", type: "Innovation Use", year: "2025",
    primarySP: "Food Frontiers and Security", contrib: "Better Diets and Nutrition", star: "Approved", prms: "Approved", pi: "Dr. S. Haque", piNote: "Approved 02 Jul 2026", updated: "18 Jul, 11:02", drift: true, starVer: 6, prmsVer: 5, prmsRef: "PRMS-RES-88410", mine: true },
  { id: 4, code: "STAR-2025-0399", title: "Climate-smart village monitoring dataset for the Sahel, 2019–2025", project: "Sahel Resilience Observatory", projectCode: "BIL-ML-1788 · EU-DEVCO", type: "Knowledge Product", year: "2025",
    primarySP: "Climate Action", contrib: "Multifunctional Landscapes · Policy Innovations", star: "Submitted", prms: "Not sent", pi: "Dr. F. Traoré", piNote: "Awaiting PI sign-off", updated: "17 Jul, 09:30", drift: false, starVer: 3, prmsVer: null, prmsRef: "—", mine: true },
  { id: 5, code: "STAR-2025-0388", title: "Capacity sharing on gender-responsive breeding for 118 national partners", project: "Inclusive Breeding Partnerships", projectCode: "BIL-IN-1650 · SDC", type: "Capacity Sharing for Development", year: "2025",
    primarySP: "Breeding for Tomorrow", contrib: "Scaling for Impact", star: "Approved", prms: "Pending Review", pi: "Dr. P. Nair", piNote: "Approved 26 Jun 2026", updated: "16 Jul, 16:20", drift: false, starVer: 3, prmsVer: 3, prmsRef: "PRMS-RES-88295", mine: true },
  { id: 8, code: "STAR-2025-0344", title: "Digital advisory platform reaching 61,000 farmers in Punjab", project: "Digital Agri Advisory Scale-up", projectCode: "BIL-IN-1503 · BMGF", type: "Innovation Use", year: "2024",
    primarySP: "Scaling for Impact", contrib: "Sustainable Farming · Policy Innovations", star: "Approved", prms: "Rejected", pi: "Dr. R. Singh", piNote: "Approved 03 Jun 2026", updated: "13 Jul, 15:50", drift: true, starVer: 5, prmsVer: 4, prmsRef: "PRMS-RES-87990", mine: true },
  { id: 9, code: "STAR-2025-0330", title: "Conservation agriculture practice guide for maize–legume rotations", project: "Sustainable Intensification Zambia", projectCode: "BIL-ZM-1442 · SIDA", type: "Knowledge Product", year: "2024",
    primarySP: "Sustainable Farming", contrib: "Multifunctional Landscapes", star: "Approved", prms: "Pending Review", pi: "Dr. M. Phiri", piNote: "Approved 28 May 2026", updated: "12 Jul, 09:12", drift: false, starVer: 2, prmsVer: 2, prmsRef: "PRMS-RES-87744", mine: true },
  { id: 10, code: "STAR-2025-0318", title: "Heat-stress early warning protocol piloted with 9 provincial services", project: "Climate Services Vietnam", projectCode: "BIL-VN-1380 · DFAT", type: "Innovation Development", year: "2024",
    primarySP: "Climate Action", contrib: "Food Frontiers and Security", star: "Draft", prms: "Not sent", pi: "Dr. N. Pham", piNote: "Not yet submitted in STAR", updated: "11 Jul, 17:40", drift: false, starVer: 1, prmsVer: null, prmsRef: "—", mine: true },
  { id: 11, code: "STAR-2025-0309", title: "Drought insurance index piloted with 14,000 pastoralist households", project: "Livestock Risk Finance Sahel", projectCode: "BIL-NE-2118 · AFD", type: "Innovation Use", year: "2025",
    primarySP: "Climate Action", contrib: "Policy Innovations", star: "Approved", prms: "Not sent", pi: "Dr. H. Idrissa", piNote: "Approved 15 Jul 2026", updated: "20 Jul, 07:10", drift: false, starVer: 2, prmsVer: null, prmsRef: "—", mine: false },
  { id: 12, code: "STAR-2025-0304", title: "Biofortified bean varieties added to Rwanda school feeding menus", project: "Nutrition-Sensitive Value Chains", projectCode: "BIL-RW-1590 · IFAD", type: "Innovation Use", year: "2025",
    primarySP: "Better Diets and Nutrition", contrib: "Breeding for Tomorrow", star: "Approved", prms: "Approved", pi: "Dr. C. Uwase", piNote: "Approved 09 Jul 2026", updated: "19 Jul, 16:40", drift: false, starVer: 3, prmsVer: 3, prmsRef: "PRMS-RES-88512", mine: false },
  { id: 13, code: "STAR-2025-0298", title: "Rangeland restoration plan adopted across 3,100 ha in Oromia", project: "Landscape Restoration Compact", projectCode: "BIL-ET-1712 · GIZ", type: "Policy Change", year: "2025",
    primarySP: "Multifunctional Landscapes", contrib: "Climate Action", star: "Submitted", prms: "Not sent", pi: "Dr. L. Girma", piNote: "Awaiting PI sign-off", updated: "19 Jul, 10:05", drift: false, starVer: 2, prmsVer: null, prmsRef: "—", mine: true,
    mapping: "Not started", mappingNote: "Starts after PI approval" },
  { id: 130, code: "STAR-2025-0297", title: "Communal grazing land tenure brief drafted with Oromia Bureau of Agriculture", project: "Landscape Restoration Compact", projectCode: "BIL-ET-1712 · GIZ", type: "Knowledge Product", year: "2025",
    primarySP: "Multifunctional Landscapes", contrib: "Policy Innovations", star: "Draft", prms: "Not sent", pi: "Dr. L. Girma", piNote: "Not yet submitted in STAR", updated: "20 Jul, 08:10", drift: false, starVer: 1, prmsVer: null, prmsRef: "—", mine: true,
    mapping: "Not started", mappingNote: "Starts after PI approval" },
  { id: 131, code: "STAR-2025-0296", title: "Participatory rangeland monitoring handbook for 14 woredas", project: "Landscape Restoration Compact", projectCode: "BIL-ET-1712 · GIZ", type: "Knowledge Product", year: "2025",
    primarySP: "Multifunctional Landscapes", contrib: "Climate Action", star: "Approved", prms: "Not sent", pi: "Dr. L. Girma", piNote: "Approved 14 Jul 2026", updated: "19 Jul, 15:35", drift: false, starVer: 2, prmsVer: null, prmsRef: "—", mine: true,
    mapping: "Incomplete", mappingNote: "2 of 3 contributing projects · budget share missing" },
  { id: 136, code: "STAR-2025-0291", title: "Field logistics protocol for seasonal rangeland surveys", project: "Landscape Restoration Compact", projectCode: "BIL-ET-1712 · GIZ", type: "Knowledge Product", year: "2025",
    primarySP: "Multifunctional Landscapes", contrib: "—", star: "Approved", prms: "Not sent", pi: "Dr. L. Girma", piNote: "Approved 09 Jun 2026", updated: "14 Jul, 11:15", drift: false, starVer: 1, prmsVer: null, prmsRef: "—", mine: true,
    mapping: "No SP contribution", mappingNote: "PI declared no Science Program contribution · out of PRMS scope" },
  { id: 132, code: "STAR-2025-0295", title: "Gully rehabilitation design package validated in Guji zone", project: "Landscape Restoration Compact", projectCode: "BIL-ET-1712 · GIZ", type: "Innovation Development", year: "2025",
    primarySP: "Multifunctional Landscapes", contrib: "Climate Action · Scaling for Impact", star: "Approved", prms: "Not sent", pi: "Dr. L. Girma", piNote: "Approved 11 Jul 2026", updated: "19 Jul, 12:20", drift: false, starVer: 3, prmsVer: null, prmsRef: "—", mine: true,
    mapping: "Complete", mappingNote: "3 contributing projects mapped · ready" },
  { id: 133, code: "STAR-2025-0294", title: "Fodder bank establishment training delivered to 380 pastoralist leaders", project: "Landscape Restoration Compact", projectCode: "BIL-ET-1712 · GIZ", type: "Capacity Sharing for Development", year: "2025",
    primarySP: "Multifunctional Landscapes", contrib: "Scaling for Impact", star: "Approved", prms: "Pending Review", pi: "Dr. L. Girma", piNote: "Approved 04 Jul 2026", updated: "18 Jul, 09:48", drift: false, starVer: 2, prmsVer: 2, prmsRef: "PRMS-RES-88520", mine: true,
    mapping: "Complete", mappingNote: "2 contributing projects mapped" },
  { id: 134, code: "STAR-2025-0293", title: "Watershed management bylaws applied by 27 kebele committees", project: "Landscape Restoration Compact", projectCode: "BIL-ET-1712 · GIZ", type: "Innovation Use", year: "2025",
    primarySP: "Multifunctional Landscapes", contrib: "Policy Innovations", star: "Approved", prms: "Approved", pi: "Dr. L. Girma", piNote: "Approved 20 Jun 2026", updated: "16 Jul, 07:30", drift: false, starVer: 4, prmsVer: 4, prmsRef: "PRMS-RES-88338", mine: true,
    mapping: "Complete", mappingNote: "3 contributing projects mapped" },
  { id: 135, code: "STAR-2025-0292", title: "Soil carbon baseline dataset for restored rangelands, 2021–2025", project: "Landscape Restoration Compact", projectCode: "BIL-ET-1712 · GIZ", type: "Knowledge Product", year: "2025",
    primarySP: "Multifunctional Landscapes", contrib: "Climate Action", star: "Approved", prms: "Rejected", pi: "Dr. L. Girma", piNote: "Approved 12 Jun 2026", updated: "15 Jul, 14:05", drift: false, starVer: 3, prmsVer: 3, prmsRef: "PRMS-RES-88201", mine: true,
    mapping: "Complete", mappingNote: "3 contributing projects mapped", prmsNote: "PRMS QA: evidence of rangeland coverage insufficient" },
  { id: 14, code: "STAR-2025-0291", title: "Low-emission rice water management guideline issued by MARD", project: "Climate Services Vietnam", projectCode: "BIL-VN-1380 · DFAT", type: "Policy Change", year: "2025",
    primarySP: "Climate Action", contrib: "Sustainable Farming", star: "Approved", prms: "Pending Review", pi: "Dr. N. Pham", piNote: "Approved 05 Jul 2026", updated: "18 Jul, 14:22", drift: false, starVer: 4, prmsVer: 4, prmsRef: "PRMS-RES-88477", mine: false },
  { id: 15, code: "STAR-2025-0287", title: "Seed policy harmonisation note endorsed by ECOWAS ministers", project: "Regional Seed Policy Facility", projectCode: "BIL-NG-2276 · USAID", type: "Policy Change", year: "2025",
    primarySP: "Policy Innovations", contrib: "Breeding for Tomorrow", star: "Approved", prms: "Approved", pi: "Dr. O. Adeyemi", piNote: "Approved 01 Jul 2026", updated: "18 Jul, 09:15", drift: false, starVer: 3, prmsVer: 3, prmsRef: "PRMS-RES-88401", mine: false },
  { id: 16, code: "STAR-2025-0282", title: "Cassava disease surveillance dashboard deployed in 6 districts", project: "Root Crops Health Initiative", projectCode: "BIL-TZ-1998 · SIDA", type: "Innovation Development", year: "2025",
    primarySP: "Breeding for Tomorrow", contrib: "Scaling for Impact", star: "Under review", prms: "Not sent", pi: "Dr. J. Mwakalinga", piNote: "In QA by Program team", updated: "17 Jul, 15:48", drift: false, starVer: 2, prmsVer: null, prmsRef: "—", mine: false },
  { id: 17, code: "STAR-2025-0275", title: "Agroforestry extension curriculum taught to 640 frontline officers", project: "Green Innovation Centres", projectCode: "BIL-GH-1840 · GIZ", type: "Capacity Sharing for Development", year: "2025",
    primarySP: "Multifunctional Landscapes", contrib: "Scaling for Impact", star: "Approved", prms: "Not sent", pi: "Dr. E. Mensah", piNote: "Approved 28 Jun 2026", updated: "17 Jul, 11:30", drift: false, starVer: 1, prmsVer: null, prmsRef: "—", mine: false },
  { id: 18, code: "STAR-2025-0268", title: "Solar irrigation service model reaching 8,400 smallholders", project: "Digital Agri Advisory Scale-up", projectCode: "BIL-IN-1503 · BMGF", type: "Innovation Use", year: "2025",
    primarySP: "Scaling for Impact", contrib: "Climate Action", star: "Approved", prms: "Pending Review", pi: "Dr. R. Singh", piNote: "Approved 24 Jun 2026", updated: "16 Jul, 13:02", drift: false, starVer: 2, prmsVer: 2, prmsRef: "PRMS-RES-88310", mine: false },
  { id: 19, code: "STAR-2025-0259", title: "Aflatoxin control protocol adopted by national maize board", project: "Food Safety Partnership Kenya", projectCode: "BIL-KE-2059 · FCDO", type: "Policy Change", year: "2024",
    primarySP: "Food Frontiers and Security", contrib: "Better Diets and Nutrition", star: "Approved", prms: "Rejected", pi: "Dr. A. Wanjiru", piNote: "Approved 20 Jun 2026", updated: "16 Jul, 08:55", drift: false, starVer: 4, prmsVer: 3, prmsRef: "PRMS-RES-88190", mine: false },
  { id: 20, code: "STAR-2025-0251", title: "Participatory varietal selection trials completed in 32 communities", project: "Inclusive Breeding Partnerships", projectCode: "BIL-IN-1650 · SDC", type: "Knowledge Product", year: "2024",
    primarySP: "Breeding for Tomorrow", contrib: "Better Diets and Nutrition", star: "Draft", prms: "Not sent", pi: "Dr. P. Nair", piNote: "Not yet submitted in STAR", updated: "15 Jul, 17:20", drift: false, starVer: 1, prmsVer: null, prmsRef: "—", mine: false },
  { id: 21, code: "STAR-2025-0244", title: "Fish feed cost model adopted by 210 commercial hatcheries", project: "Sustainable Aquafood Systems", projectCode: "BIL-BD-2044 · FCDO", type: "Innovation Use", year: "2024",
    primarySP: "Food Frontiers and Security", contrib: "Scaling for Impact", star: "Approved", prms: "Approved", pi: "Dr. S. Haque", piNote: "Approved 18 Jun 2026", updated: "15 Jul, 09:40", drift: false, starVer: 3, prmsVer: 3, prmsRef: "PRMS-RES-88044", mine: false },
  { id: 22, code: "STAR-2025-0236", title: "Soil fertility decision tool released for extension services", project: "Soil Health Policy Dialogue Ethiopia", projectCode: "BIL-ET-1907 · NORAD", type: "Innovation Development", year: "2024",
    primarySP: "Sustainable Farming", contrib: "Policy Innovations", star: "Approved", prms: "Pending Review", pi: "Dr. T. Bekele", piNote: "Approved 12 Jun 2026", updated: "14 Jul, 15:15", drift: false, starVer: 2, prmsVer: 2, prmsRef: "PRMS-RES-87905", mine: false },
  { id: 23, code: "STAR-2025-0229", title: "Water-user association bylaws revised in 11 irrigation schemes", project: "Irrigation Governance Programme", projectCode: "BIL-PK-1725 · AFD", type: "Policy Change", year: "2024",
    primarySP: "Policy Innovations", contrib: "Multifunctional Landscapes", star: "Submitted", prms: "Not sent", pi: "Dr. S. Ahmed", piNote: "Awaiting PI sign-off", updated: "14 Jul, 11:05", drift: false, starVer: 2, prmsVer: null, prmsRef: "—", mine: false },
  { id: 24, code: "STAR-2025-0221", title: "Postharvest loss reduction kit scaled to 5,800 farmer groups", project: "Postharvest Innovation Facility", projectCode: "BIL-UG-1611 · IFAD", type: "Innovation Use", year: "2024",
    primarySP: "Scaling for Impact", contrib: "Food Frontiers and Security", star: "Approved", prms: "Approved", pi: "Dr. B. Okello", piNote: "Approved 06 Jun 2026", updated: "13 Jul, 16:35", drift: false, starVer: 5, prmsVer: 5, prmsRef: "PRMS-RES-87820", mine: false },
  { id: 25, code: "STAR-2025-0214", title: "Dietary diversity survey instrument adopted by national statistics office", project: "Nutrition Data Partnership", projectCode: "BIL-ID-1902 · DFAT", type: "Knowledge Product", year: "2024",
    primarySP: "Better Diets and Nutrition", contrib: "Policy Innovations", star: "Approved", prms: "Not sent", pi: "Dr. W. Santoso", piNote: "Approved 02 Jun 2026", updated: "13 Jul, 10:12", drift: false, starVer: 2, prmsVer: null, prmsRef: "—", mine: false },
  { id: 26, code: "STAR-2025-0207", title: "Carbon accounting method validated for mixed crop–livestock farms", project: "Low-Emission Livestock Platform", projectCode: "BIL-CO-2201 · BMGF", type: "Innovation Development", year: "2024",
    primarySP: "Climate Action", contrib: "Sustainable Farming", star: "Approved", prms: "Pending Review", pi: "Dr. J. Arango", piNote: "Approved 29 May 2026", updated: "12 Jul, 14:50", drift: false, starVer: 3, prmsVer: 3, prmsRef: "PRMS-RES-87701", mine: false },
  { id: 27, code: "STAR-2025-0198", title: "Gender-responsive advisory protocol rolled out with 90 cooperatives", project: "Inclusive Advisory Services", projectCode: "BIL-ML-1533 · SDC", type: "Capacity Sharing for Development", year: "2024",
    primarySP: "Scaling for Impact", contrib: "Better Diets and Nutrition", star: "Under review", prms: "Not sent", pi: "Dr. F. Traoré", piNote: "In QA by Program team", updated: "12 Jul, 08:25", drift: false, starVer: 1, prmsVer: null, prmsRef: "—", mine: false },
  { id: 28, code: "STAR-2025-0190", title: "Wheat rust resistance lines shared with 7 national programmes", project: "Cereal Rust Response Network", projectCode: "BIL-ET-1455 · USAID", type: "Innovation Development", year: "2024",
    primarySP: "Breeding for Tomorrow", contrib: "Food Frontiers and Security", star: "Approved", prms: "Approved", pi: "Dr. Y. Kidane", piNote: "Approved 21 May 2026", updated: "11 Jul, 12:40", drift: false, starVer: 4, prmsVer: 4, prmsRef: "PRMS-RES-87566", mine: false }
];

const DIFFS = {
  3: [
    { field: "Title", star: "Aquaculture pond management package adopted by 4,200 smallholders in Bangladesh", prms: "Aquaculture pond management package adopted by 3,600 smallholders in Bangladesh", changed: true },
    { field: "Geographic scope", star: "Bangladesh — Khulna, Barisal, Rangpur", prms: "Bangladesh — Khulna, Barisal", changed: true },
    { field: "Contributing SPs", star: "Better Diets and Nutrition", prms: "Better Diets and Nutrition", changed: false },
    { field: "Evidence link", star: "3 files (added annex 12 Jul)", prms: "2 files", changed: true },
    { field: "Partners", star: "DoF Bangladesh; WorldFish; BRAC", prms: "DoF Bangladesh; WorldFish; BRAC", changed: false }
  ],
  8: [
    { field: "Title", star: "Digital advisory platform reaching 61,000 farmers in Punjab", prms: "Digital advisory platform reaching 52,000 farmers in Punjab", changed: true },
    { field: "Innovation readiness", star: "Level 8 — uptake by users", prms: "Level 7 — proven in target environment", changed: true },
    { field: "Primary Science Program", star: "Scaling for Impact", prms: "Scaling for Impact", changed: false },
    { field: "Reporting year", star: "2024", prms: "2024", changed: false }
  ]
};

const TOC = [
  { code: "STAR-2025-0402", title: "Aquaculture pond management package adopted by 4,200 smallholders", sp: "Food Frontiers and Security", node: "WP2 — Resilient aquatic food systems", level: "End-of-Initiative outcome", mapping: "Confirmed", received: "18 Jul, 06:10" },
  { code: "STAR-2025-0388", title: "Capacity sharing on gender-responsive breeding", sp: "Breeding for Tomorrow", node: "WP4 — Inclusive breeding capacity", level: "Output → Outcome", mapping: "Confirmed", received: "16 Jul, 06:10" },
  { code: "STAR-2025-0330", title: "Conservation agriculture practice guide", sp: "Sustainable Farming", node: "WP1 — Practice adoption pathways", level: "Output", mapping: "Proposed", received: "14 Jul, 06:10" },
  { code: "STAR-2025-0344", title: "Digital advisory platform reaching 61,000 farmers in Punjab", sp: "Scaling for Impact", node: "Unmapped — returned for revision", level: "QA comment: verify reach evidence", mapping: "Rejected", received: "13 Jul, 06:10" },
  { code: "STAR-2025-0311", title: "Seed policy harmonisation note, ECOWAS", sp: "Policy Innovations", node: "WP3 — Enabling policy environments", level: "End-of-Initiative outcome", mapping: "Changed in PRMS", received: "11 Jul, 06:10" }
];

const LOG = [
  { when: "20 Jul, 09:30", title: "Scheduled sync completed", tag: "Sync", kind: "ok", detail: "418 records reconciled · 12 version conflicts flagged · 27 TOC mappings received." },
  { when: "19 Jul, 16:04", title: "PRMS rejected STAR-2025-0344", tag: "PRMS", kind: "bad", detail: "QA comment: reach figure not supported by attached evidence. Result returned to STAR as editable." },
  { when: "18 Jul, 11:02", title: "Version conflict detected on STAR-2025-0402", tag: "Conflict", kind: "warn", detail: "STAR v6 differs from PRMS v5 in 3 fields. Syncing is available as a version push." },
  { when: "17 Jul, 09:30", title: "PI approval requested for STAR-2025-0399", tag: "Workflow", kind: "info", detail: "Reminder sent to Dr. F. Traoré by M. Rahman. Sync to PRMS stays blocked until approval." },
  { when: "16 Jul, 16:22", title: "STAR-2025-0388 accepted into PRMS QA", tag: "PRMS", kind: "info", detail: "PRMS-RES-88295 created · status Pending Review · assigned to Program QA officer." },
  { when: "15 Jul, 08:00", title: "Scheduled sync completed", tag: "Sync", kind: "ok", detail: "396 records reconciled · no conflicts · 9 TOC mappings received." }
];

class Component extends DCLogic {
  state = { tab: "portfolio", f: { project: "All projects", sp: "All Science Programs", status: "All statuses", type: "All types", year: "All years" }, chip: null, sent: {}, nudged: {}, pgOpen: {}, open: null, dtab: "overview", toast: null };

  say(msg) { clearTimeout(this._t); this.setState({ toast: msg }); this._t = setTimeout(() => this.setState({ toast: null }), 2600); }
  setF(k, v) { this.setState(s => ({ f: Object.assign({}, s.f, { [k]: v }), chip: null })); }

  rowState(r) {
    const s = this.state.sent[r.id];
    return { star: r.star, prms: s ? s.prms : r.prms, drift: s ? false : r.drift, prmsVer: s ? r.starVer : r.prmsVer, prmsRef: s ? (r.prmsRef === "—" ? "PRMS-RES-89" + (100 + r.id) : r.prmsRef) : r.prmsRef };
  }
  eligible(r) { const st = this.rowState(r); return r.star === "Approved" && !outOfScope(r) && mapOf(r) === "Complete" && (st.prms === "Not sent" || st.drift); }
  openMapping(r) { this.say("Opening Pool funding mapping for " + r.code + " · complete the project split to unblock syncing"); }

  send(r) {
    this.setState(s => ({ sent: Object.assign({}, s.sent, { [r.id]: { prms: "Pending Review" } }) }));
    this.say("Synced to PRMS · " + r.code + " (STAR v" + r.starVer + ") — awaiting QA");
  }
  nudge(r) {
    this.setState(s => ({ nudged: Object.assign({}, s.nudged, { [r.id]: true }) }));
    this.say("Approval request sent to " + r.pi + " · syncing stays blocked until they approve");
  }

  renderVals() {
    const st = this.state, f = st.f;
    const scope = st.scope || "mine";
    const segStyle = (on) => `padding:9px 18px;border:0;border-radius:20px;background:${on ? "#0f4c9a" : "transparent"};color:${on ? "#fff" : "#5a6b7d"};font:600 13px 'IBM Plex Sans';cursor:pointer;box-shadow:${on ? "0 1px 3px rgba(13,43,78,.25)" : "none"}`;
    const pct = (a, b) => Math.round(a / b * 1000) / 10 + "%";
    const rpct = (a, b) => Math.round(a / b * 100) + "%";
    const mineRows = DATA.filter(r => r.mine).map(r => Object.assign({}, r, this.rowState(r)));
    const mineScoped = mineRows.filter(r => !outOfScope(r));
    const cnt = (fn) => mineScoped.filter(fn).length;
    const mineProjects = Array.from(new Set(mineRows.map(r => r.project)));
    // Demo volumes for the PI scope: 89 results eligible for mapping, 87 of them in PRMS scope.
    const mStats = { flagged: 87, underQa: 22, accepted: 18, rejected: 6, sent: 46, eligible: 89, attention: 41, withResults: mineProjects.length };
    const PC = {
      all: { projects: 197, withResults: 142, sending: 118, zero: 55, created: "3,864", flagged: "1,240", sent: 641, accepted: 512, underQa: 96, rejected: 33,
        fApproved: 131, fAccepted: 104, drafting: 24, avg: "5.4", months: [26, 42, 60, 77, 98, 95],
        projectsNote: "active in STAR", createdNote: "across all projects contributing to Pool funding",
        f1Label: "Projects contributing to Pool funding",
        scopeNote: "197 contributing projects · all Science Programs",
        funnelSub: "How far the 197 contributing projects have moved this reporting cycle",
        donutSub: "Share of the 197 projects by reporting behaviour",
        funnelFoot: "79 projects have not synced anything yet, and 327 PI-approved results across the portfolio are waiting on a single push.",
        monthFoot: "641 results synced in 2026 · 158 in June, the cycle high" },
      mine: Object.assign({
        projects: mineProjects.length, zero: 0, created: mStats.flagged,
        sending: Math.max(1, mineProjects.length - 2),
        fApproved: mineProjects.length - 1, fAccepted: Math.max(1, mineProjects.length - 3),
        drafting: 2,
        avg: (mStats.sent / Math.max(1, mineProjects.length - 2)).toFixed(1),
        months: [14, 30, 44, 62, 88, 74],
        projectsNote: "where you are PI", createdNote: "across your projects contributing to Pool funding",
        f1Label: "Projects contributing to Pool funding where you are PI",
        scopeNote: mineProjects.length + " projects where D. Zapata is Principal Investigator",
        funnelSub: "How far your " + mineProjects.length + " contributing projects have moved this reporting cycle",
        donutSub: "Share of your " + mineProjects.length + " projects by reporting behaviour",
        funnelFoot: "2 of your projects have not synced anything yet, and 23 of your PI-approved results are waiting on a single push.",
        monthFoot: mStats.sent + " of your results synced in 2026"
      }, mStats)
    };
    const p = PC[scope];
    const pcVals = Object.assign({}, p, {
      wWithResults: pct(p.withResults, p.projects), wSending: pct(p.sending, p.projects), wZero: pct(p.zero, p.projects),
      wApproved: pct(p.fApproved, p.projects), wFAccepted: pct(p.fAccepted, p.projects),
      wFlagged: pct(p.flagged.toString().replace(",", ""), p.created.toString().replace(",", "")),
      pendingSync: (Number(p.flagged.toString().replace(",", "")) - p.sent).toLocaleString("en-US"),
      pendingSyncNote: rpct(Number(p.flagged.toString().replace(",", "")) - p.sent, p.flagged.toString().replace(",", "")) + " incl. draft, mapping or sync pending",
      underQaNote: rpct(p.underQa, p.flagged.toString().replace(",", "")) + " awaiting QA",
      rejectedNote: rpct(p.rejected, p.flagged.toString().replace(",", "")) + " returned by QA",
      wPendingSync: pct(Number(p.flagged.toString().replace(",", "")) - p.sent, p.flagged.toString().replace(",", "")),
      wUnderQa: pct(p.underQa, p.flagged.toString().replace(",", "")),
      wRejected: pct(p.rejected, p.flagged.toString().replace(",", "")),
      wSent: pct(p.sent, p.flagged.toString().replace(",", "")), wAccepted: pct(p.accepted, p.flagged.toString().replace(",", "")),
      withResultsNote: rpct(p.withResults, p.projects) + " of the portfolio",
      sendingNote: rpct(p.sending, p.projects) + " of the portfolio",
      flaggedNote: rpct(p.flagged.toString().replace(",", ""), p.created.toString().replace(",", "")) + " of created results",
      sentNote: rpct(p.sent, p.flagged.toString().replace(",", "")) + " of flagged results",
      acceptedNote: rpct(p.accepted, p.flagged.toString().replace(",", "")) + " of results in scope",
      donutGradient: "conic-gradient(#0f4c9a 0 " + pct(p.sending, p.projects) + ",#d78a1a " + pct(p.sending, p.projects) + " " + pct(p.withResults, p.projects) + ",#e4eaf0 " + pct(p.withResults, p.projects) + " 100%)",
      reportingPct: rpct(p.withResults, p.projects),
      monthSub: "Results pushed to PRMS over the 2026 reporting cycle",
      legSending: p.sending + " projects syncing", legSendingNote: p.avg + " results synced on average",
      legDrafting: p.drafting + " projects drafting", legSilent: p.zero + " projects silent",
      m1: p.months[0] + "px", m2: p.months[1] + "px", m3: p.months[2] + "px", m4: p.months[3] + "px", m5: p.months[4] + "px", m6: p.months[5] + "px"
    });
    const SP_PORTFOLIO = [
      ["SP01 — Breeding for Tomorrow", 22, 34], ["SP02 — Sustainable Farming", 19, 29],
      ["SP03 — Sustainable Animal and Aquatic Foods", 11, 18], ["SP04 — Multifunctional Landscapes", 13, 22],
      ["SP05 — Better Diets and Nutrition", 9, 16], ["SP06 — Climate Action", 17, 27],
      ["SP07 — Policy Innovations", 8, 14], ["SP08 — Food Frontiers and Security", 7, 12],
      ["SP09 — Scaling for Impact", 6, 11], ["SP10–SP13 · Accelerators & other", 6, 14]
    ];
    let spRaw;
    if (scope === "all") {
      spRaw = SP_PORTFOLIO.map(x => ({ label: x[0], sync: x[1], total: x[2] }));
    } else {
      const bySp = {};
      mineScoped.forEach(r => {
        const key = (SP_CODES[r.primarySP] ? SP_CODES[r.primarySP] + " — " : "") + r.primarySP;
        if (!bySp[key]) bySp[key] = { label: key, sync: 0, total: 0 };
        bySp[key].total++;
        if (r.prms !== "Not sent") bySp[key].sync++;
      });
      spRaw = Object.keys(bySp).sort().map(k => bySp[k]);
      // Scale the row-derived shape up to the demo volumes so every card on this screen agrees.
      const scaleTo = (arr, key, target) => {
        const sum = arr.reduce((a, x) => a + x[key], 0) || 1;
        const exact = arr.map(x => x[key] / sum * target);
        const base = exact.map(Math.floor);
        let left = target - base.reduce((a, b) => a + b, 0);
        exact.map((v, i) => ({ i: i, frac: v - base[i] })).sort((a, b) => b.frac - a.frac)
          .forEach(o => { if (left > 0) { base[o.i]++; left--; } });
        arr.forEach((x, i) => { x[key] = base[i]; });
      };
      scaleTo(spRaw, "total", mStats.flagged);
      scaleTo(spRaw, "sync", mStats.sent);
      let spill = 0;
      spRaw.forEach(x => { if (x.sync > x.total) { spill += x.sync - x.total; x.sync = x.total; } });
      while (spill > 0) {
        const room = spRaw.filter(x => x.total - x.sync > 0);
        if (!room.length) break;
        room.sort((a, b) => (b.total - b.sync) - (a.total - a.sync));
        room[0].sync++; spill--;
      }
    }
    const spMax = Math.max.apply(null, spRaw.map(x => x.total).concat([1]));
    const spCoverage = spRaw.map(x => ({
      label: x.label, count: x.sync + " / " + x.total,
      wTotal: Math.round(x.total / spMax * 1000) / 10 + "%",
      wSync: Math.round(x.sync / Math.max(1, x.total) * 1000) / 10 + "%"
    }));
    const MF = scope === "all"
      ? { notStarted: 310, incomplete: 180, complete: 750, noSp: 28 }
      : { notStarted: 12, incomplete: 9, complete: 66, noSp: 2 };
    const mfTotal = MF.notStarted + MF.incomplete + MF.complete + MF.noSp;
    const MF_STEPS = [
      { key: "notStarted", label: "Mapping not started", color: "#c9d3de", ink: "#5a6b7d", note: "Waiting on PI approval or on the team to begin" },
      { key: "incomplete", label: "Mapping incomplete", color: "#d78a1a", ink: "#a8650a", note: "Projects or budget shares still missing" },
      { key: "complete", label: "Mapping complete", color: "#3f9e5c", ink: "#1d6b3e", note: "Eligible to sync to PRMS" },
      { key: "noSp", label: "No SP contribution", color: "#2f7cc4", ink: "#1a5fa8", note: "Declared out of PRMS scope by the PI" }
    ];
    const mf = {
      total: mfTotal.toLocaleString("en-US"),
      segments: MF_STEPS.filter(x => MF[x.key] > 0).map(x => ({ style: "flex:" + MF[x.key] + ";background:" + x.color, title: MF[x.key] + " " + x.label.toLowerCase() })),
      steps: MF_STEPS.map(x => ({
        label: x.label, note: x.note, value: MF[x.key].toLocaleString("en-US"),
        share: Math.round(MF[x.key] / mfTotal * 100) + "%",
        numStyle: "font:600 20px 'IBM Plex Mono';color:" + x.ink,
        dot: "width:10px;height:10px;border-radius:3px;flex:none;margin-top:7px;background:" + x.color
      }))
    };
    // Merged pipeline: mapping stages (STAR side) + PRMS stages, one continuous flow.
    const flaggedN = Number(p.flagged.toString().replace(",", ""));
    const readyToSync = Math.max(0, MF.complete - p.sent);
    const PL_A = [
      { label: "Mapping not started", value: MF.notStarted, color: "#c9d3de", ink: "#5a6b7d", note: "Waiting on PI approval or on the team to begin" },
      { label: "Mapping incomplete", value: MF.incomplete, color: "#e0b35c", ink: "#a8650a", note: "Projects or budget shares still missing" },
      { label: "Ready to sync", value: readyToSync, color: "#7db0dd", ink: "#0f4c9a", note: "Mapping complete, waiting on a push to PRMS" }
    ];
    const PL_B = [
      { label: "Pending review in PRMS", value: p.underQa, color: "#d78a1a", ink: "#a8650a", note: "With the PRMS QA team" },
      { label: "Approved in PRMS", value: p.accepted, color: "#3f9e5c", ink: "#1d6b3e", note: "Counted in the reporting cycle" },
      { label: "Rejected in PRMS", value: p.rejected, color: "#b4443a", ink: "#b4443a", note: "Returned by QA, needs a fix and resync" }
    ];
    const PL_C = [
      { label: "No SP contribution", value: MF.noSp, color: "#2f7cc4", ink: "#1a5fa8", note: "Declared out of PRMS scope by the PI — no action needed" }
    ];
    const plTotal = flaggedN + MF.noSp;
    const stage = (x) => ({
      label: x.label, note: x.note, group: x.group || "", value: x.value.toLocaleString("en-US"),
      share: Math.round(x.value / plTotal * 100) + "%",
      numStyle: "font:600 21px 'IBM Plex Mono';color:" + x.ink,
      dot: "width:10px;height:10px;border-radius:3px;flex:none;margin-top:8px;background:" + x.color
    });
    const pl = {
      total: plTotal.toLocaleString("en-US"),
      inScope: flaggedN.toLocaleString("en-US"),
      notSynced: (flaggedN - p.sent).toLocaleString("en-US"),
      notSyncedShare: Math.round((flaggedN - p.sent) / flaggedN * 100) + "%",
      inPrms: p.sent.toLocaleString("en-US"),
      notSyncedShare: Math.round((flaggedN - p.sent) / plTotal * 100) + "%",
      inPrmsShare: Math.round(p.sent / plTotal * 100) + "%",
      noSpShare: Math.round(MF.noSp / plTotal * 100) + "%",
      wNotSynced: pct(flaggedN - p.sent, plTotal),
      wInPrms: pct(p.sent, plTotal),
      wNoSp: pct(MF.noSp, plTotal),
      noSp: MF.noSp.toLocaleString("en-US"),
      segments: PL_A.concat(PL_B).concat(PL_C).filter(x => x.value > 0)
        .map(x => ({ style: "flex:" + x.value + ";background:" + x.color, title: x.value + " " + x.label.toLowerCase() })),
      stagesA: PL_A.map(stage), stagesB: PL_B.map(stage), stagesC: PL_C.map(stage),
      stages: PL_A.map(x => stage(Object.assign({ group: "In STAR" }, x)))
        .concat(PL_B.map(x => stage(Object.assign({ group: "In PRMS" }, x))))
        .concat(PL_C.map(x => stage(Object.assign({ group: "Out of scope" }, x))))
    };
    const tabStyle = (on) => `padding:0 0 12px;border:0;background:none;font:${on ? 600 : 500} 14px 'IBM Plex Sans';color:${on ? "#0d2b4e" : "#6b7a89"};border-bottom:2px solid ${on ? "#0f4c9a" : "transparent"};cursor:pointer;margin-bottom:-1px`;
    const chipStyle = (on) => `padding:6px 12px;border:1px solid ${on ? "#0f4c9a" : "#dfe5ec"};background:${on ? "#e7eefa" : "#fff"};color:${on ? "#0f4c9a" : "#5a6b7d"};border-radius:20px;font:500 12.5px 'IBM Plex Sans';cursor:pointer`;

    const all = DATA.filter(r => scope === "all" || r.mine).map(r => Object.assign({}, r, this.rowState(r)));
    let rows = all.filter(r =>
      (f.project === "All projects" || r.project === f.project) &&
      (f.sp === "All Science Programs" || r.primarySP === f.sp || r.contrib.indexOf(f.sp) > -1) &&
      (f.type === "All types" || r.type === f.type) &&
      (f.year === "All years" || r.year === f.year) &&
      (f.status === "All statuses" ||
        (f.status === "Ready to sync" && this.eligible(r) && r.prms === "Not sent") ||
        (f.status === "Pool funding mapping pending" && r.star === "Approved" && mapOf(r) !== "Complete") ||
        (f.status === "Synced to PRMS" && r.prms !== "Not sent") ||
        (f.status === "Awaiting PI approval" && r.star === "Submitted") ||
        (f.status === "Under review in STAR" && r.star === "Under review") ||
        (f.status === "Draft" && r.star === "Draft"))
    );

    const sp = (name) => { const c = SP_COLORS[name] || ["#eef1f5", "#5a6b7d"]; return badge(c[0], c[1]); };

    // Attention = still on the STAR/mapping/sync path: draft or awaiting PI, mapping pending, or approved but not yet synced.
    const needsAttention = (r) => !outOfScope(r) && r.prms === "Not sent";
    const matchChip = (r, key) => {
      if (!key) return true;
      if (key === "attention") return needsAttention(r);
      if (key === "ready") return r.star === "Approved" && mapOf(r) === "Complete" && r.prms === "Not sent";
      if (key === "mapping") return r.star === "Approved" && !outOfScope(r) && mapOf(r) !== "Complete";
      if (key === "pending") return r.star !== "Approved";
      if (key === "prms") return r.prms === "Rejected";
      if (key === "synced") return r.prms !== "Not sent" && r.prms !== "Rejected";
      return true;
    };
    const chipCount = (key) => rows.filter(r => matchChip(r, key)).length;
    const groupBy = (list) => {
      const map = {};
      list.forEach(r => {
        const code = (r.projectCode || "").split(" · ")[0];
        const donor = (r.projectCode || "").split(" · ")[1] || "";
        if (!map[code]) map[code] = { code: code, name: r.project, donor: donor, pi: r.pi, results: [] };
        map[code].results.push(r);
      });
      return Object.keys(map).map(k => {
        const p = map[k];
        p.counts = {
          approved: p.results.filter(r => r.prms === "Approved").length,
          pending: p.results.filter(r => r.prms === "Pending Review").length,
          rejected: p.results.filter(r => r.prms === "Rejected").length,
          notSent: p.results.filter(r => r.prms === "Not sent" && !outOfScope(r)).length,
          outOfScope: p.results.filter(outOfScope).length
        };
        p.attention = p.results.filter(needsAttention).length;
        const rank = (r) => needsAttention(r) ? 0 : outOfScope(r) ? 1 : r.prms === "Pending Review" ? 2 : r.prms === "Approved" ? 3 : 4;
        p.results = p.results.slice().sort((a, b) => rank(a) - rank(b));
        return p;
      }).sort((a, b) => b.attention - a.attention || a.code.localeCompare(b.code));
    };
    const pgAll = groupBy(rows);
    const pgFiltered = groupBy(rows.filter(r => matchChip(r, st.chip)));

    const actionFor = (r) => {
      const elig = this.eligible(r);
      if (r.prms === "Rejected") return { label: "Re-sync", disabled: false, hint: "Rejected in PRMS — re-sync the current STAR version", style: `padding:7px 12px;border:1px solid #b4443a;background:#fff;border-radius:6px;font:600 12.5px 'IBM Plex Sans';color:#b4443a;cursor:pointer;min-width:104px` };
      if (r.prms !== "Not sent") return { label: "Synced", disabled: true, hint: "Already in PRMS", style: `padding:7px 12px;border:1px dashed #dfe5ec;background:#fff;border-radius:6px;font:500 12.5px 'IBM Plex Sans';color:#9aa6b3;cursor:default;min-width:104px` };
      if (outOfScope(r)) return { label: "", disabled: true, hint: "Out of PRMS scope — no Science Program contribution", style: "display:none" };
      if (r.star === "Approved" && mapOf(r) !== "Complete") return { label: "Complete mapping", disabled: false, hint: "Blocked: Pool funding mapping is incomplete", style: `padding:7px 10px;border:1px solid #d9a94a;background:#fdf7ec;border-radius:6px;font:600 12.5px 'IBM Plex Sans';color:#8a5a08;cursor:pointer;min-width:104px` };
      if (elig) return { label: "Sync to PRMS", disabled: false, hint: "Eligible", style: `padding:7px 12px;border:0;background:#0f4c9a;color:#fff;border-radius:6px;font:600 12.5px 'IBM Plex Sans';cursor:pointer;min-width:104px` };
      if (r.star === "Draft") return { label: "", disabled: true, hint: "Draft — nothing to do yet", style: `display:none` };
      return { label: st.nudged[r.id] ? "Requested" : "Request approval", disabled: !!st.nudged[r.id], hint: "Blocked: PI approval required before syncing", style: `padding:7px 10px;border:1px solid #dfe5ec;background:#fff;border-radius:6px;font:500 12.5px 'IBM Plex Sans';color:${st.nudged[r.id] ? "#9aa6b3" : "#5a6b7d"};cursor:${st.nudged[r.id] ? "default" : "pointer"};min-width:104px` };
    };

    const d0 = st.open ? all.find(r => r.id === st.open) : null;
    let d = null;
    if (d0) {
      const a = actionFor(d0);
      const elig = this.eligible(d0);
      const submitted = d0.star !== "Draft";
      const approved = d0.star === "Approved";
      const ok = (b) => b ? badge("#e6f2ea", "#1d6b3e", "width:20px;height:20px;justify-content:center;border-radius:50%;padding:0;font-weight:600") : badge("#fbeee0", "#a8650a", "width:20px;height:20px;justify-content:center;border-radius:50%;padding:0;font-weight:600");
      const diffs = (DIFFS[d0.id] || []).map(x => ({
        field: x.field,
        star: x.star, prms: x.prms,
        starStyle: `font:400 12.5px/1.5 'IBM Plex Sans';color:#14212e;${x.changed ? "background:#e6f2ea;border-radius:5px;padding:4px 7px" : ""}`,
        prmsStyle: `font:400 12.5px/1.5 'IBM Plex Sans';color:${x.changed ? "#b4443a" : "#14212e"};${x.changed ? "background:#fdeceb;border-radius:5px;padding:4px 7px;text-decoration:line-through;text-decoration-color:rgba(180,68,58,.45)" : ""}`
      }));
      d = {
        code: d0.code, title: d0.title, project: d0.project, type: d0.type, year: d0.year,
        primarySP: (SP_CODES[d0.primarySP] ? SP_CODES[d0.primarySP] + " — " + d0.primarySP : d0.primarySP), contrib: d0.contrib, pi: d0.pi, piLine: d0.piNote, prmsRef: d0.prmsRef,
        spStyle: sp(d0.primarySP),
        driftStyle: d0.drift ? badge("#fdeceb", "#b4443a", "font-size:11px") : "display:none",
        starVer: d0.starVer, prmsVer: d0.prmsVer || "—",
        checks: [
          { icon: submitted ? "✓" : "!", iconStyle: ok(submitted), label: "Submitted in STAR", detail: submitted ? "Internal submission completed · v" + d0.starVer : "Still a draft — the team must submit it in STAR first" },
          { icon: approved ? "✓" : "!", iconStyle: ok(approved), label: "Approved by the Principal Investigator", detail: approved ? d0.pi + " · " + d0.piNote : d0.pi + " has not approved. Administrators cannot bypass this gate." },
          { icon: "✓", iconStyle: ok(true), label: "Primary Science Program assigned", detail: d0.primarySP + " (primary) · " + d0.contrib },
          { icon: mapOf(d0) === "Complete" ? "✓" : "!", iconStyle: ok(mapOf(d0) === "Complete"), label: "Pool funding mapping complete", detail: mapOf(d0) === "Complete" ? "Contributing projects and budget shares recorded · " + mapNoteOf(d0) : "Pool funding mapping " + mapOf(d0).toLowerCase() + " · " + mapNoteOf(d0) },
          { icon: d0.drift ? "!" : "✓", iconStyle: ok(!d0.drift), label: "Version consistency with PRMS", detail: d0.drift ? "STAR v" + d0.starVer + " is ahead of PRMS v" + d0.prmsVer + " in " + (DIFFS[d0.id] || []).filter(x => x.changed).length + " fields" : (d0.prms === "Not sent" ? "No PRMS record yet — first sync" : "STAR and PRMS both at v" + d0.starVer) }
        ],
        gateBg: elig ? "#f4f8fb" : "#fdf7ef",
        gateFg: elig ? "#1c3a5c" : "#a8650a",
        gateText: outOfScope(d0) ? "This result is out of PRMS scope: in Pool funding mapping the PI declared it does not contribute to any Science Program. No sync is required." : elig ? "All checks passed. Syncing pushes the current STAR version to PRMS and does not alter the STAR workflow state." : (approved && mapOf(d0) !== "Complete" ? "Sync to PRMS is blocked until the Pool funding mapping is complete. Finish the project split and budget shares in Pool funding mapping." : (approved ? "Nothing to send — this result is already synchronised with PRMS." : "Sync to PRMS is blocked until the Principal Investigator approves. Send a reminder instead.")),
        action: () => { if (d0.drift || elig) this.send(d0); },
        actionDisabled: a.disabled || (!elig && !d0.drift),
        actionLabel: (elig || d0.drift) ? (d0.drift ? "Push STAR v" + d0.starVer + " to PRMS" : "Sync to PRMS") : "Sync to PRMS",
        actionStyleLg: (elig || d0.drift)
          ? "padding:10px 18px;border:0;background:#0f4c9a;color:#fff;border-radius:7px;font:600 13px 'IBM Plex Sans';cursor:pointer"
          : "padding:10px 18px;border:1px solid #e4e0d6;background:#f4f2ed;color:#b0a999;border-radius:7px;font:600 13px 'IBM Plex Sans';cursor:not-allowed",
        showNudge: !approved,
        showMap: approved && !outOfScope(d0) && mapOf(d0) !== "Complete",
        goMapping: () => this.openMapping(d0),
        nudge: () => this.nudge(d0),
        diffs: diffs.length ? diffs : [{ field: "—", star: "No PRMS record yet", prms: "This result has not been dispatched", starStyle: "font:400 12.5px 'IBM Plex Sans';color:#8a97a5", prmsStyle: "font:400 12.5px 'IBM Plex Sans';color:#8a97a5" }],
        diffIntro: d0.drift ? "Fields edited in STAR after the last dispatch. PRMS still holds the earlier version." : "STAR and PRMS agree on every synchronised field.",
        canResend: d0.drift,
        resend: () => this.send(d0),
        activity: [
          { when: d0.updated, title: "Last edit in STAR", detail: "Version " + d0.starVer + " saved by the reporting team." },
          { when: "18 Jul, 06:10", title: d0.prms === "Not sent" ? "No PRMS activity" : "PRMS status: " + d0.prms, detail: d0.prms === "Not sent" ? "This result has never been synced to PRMS." : "Record " + d0.prmsRef + " · returned by the nightly sync." + (d0.prmsNote ? " " + d0.prmsNote + "." : "") },
          { when: "17 Jul, 09:30", title: d0.star === "Approved" ? "PI approval recorded" : "Awaiting PI approval", detail: d0.pi + " · " + d0.piNote },
          { when: "14 Jul, 15:20", title: "Submitted in STAR", detail: "Internal submission completed by the project reporting focal point." },
          { when: "02 Jul, 10:05", title: "Result created", detail: "Created under " + d0.project + " (" + d0.projectCode + ")." }
        ]
      };
    }

    const dotFor = (k) => `width:9px;height:9px;border-radius:50%;background:${k === "ok" ? "#3f9e5c" : k === "bad" ? "#b4443a" : k === "warn" ? "#d78a1a" : "#0f4c9a"};flex:none`;
    const MAP_COLORS = { "Confirmed": ["#e6f2ea", "#1d6b3e"], "Proposed": ["#fbeee0", "#a8650a"], "Rejected": ["#fdeceb", "#b4443a"], "Changed in PRMS": ["#e7eefa", "#0f4c9a"] };

    return {
      kpiReady: TOTALS.ready, kpiSent: TOTALS.sent, kpiPending: TOTALS.awaitingPi, kpiDrift: TOTALS.drift,

      scopeAll: () => this.setState({ scope: "all" }),
      scopeMine: () => this.setState({ scope: "mine" }),
      scopeAllStyle: segStyle(scope === "all"),
      scopeMineStyle: segStyle(scope === "mine"),
      pc: pcVals,
      isAllScope: scope === "all",
      spCoverageSub: scope === "all" ? "Projects mapped to each program, and how many of them are already syncing" : "Your results mapped to each program, and how many are already synced to PRMS",
      spCoverageLegend: scope === "all" ? "Syncing to PRMS" : "Synced to PRMS",
      spCoverageLegend2: scope === "all" ? "Not syncing" : "Not synced",
      spCoverage: spCoverage,
      mf: mf, pl: pl,

      isPortfolio: st.tab === "portfolio", isResults: st.tab === "results", isToc: false, isLog: false,
      goPortfolio: () => this.setState({ tab: "portfolio" }), goResults: () => this.setState({ tab: "results" }), goToc: () => this.setState({ tab: "toc" }), goLog: () => this.setState({ tab: "log" }),
      tabPortfolioStyle: tabStyle(st.tab === "portfolio"), tabResultsStyle: tabStyle(st.tab === "results"), tabTocStyle: tabStyle(st.tab === "toc"), tabLogStyle: tabStyle(st.tab === "log"),
      remind: () => this.say("Reminder sent to the Principal Investigator and the project reporting focal point"),

      projectOpts: ["All projects"].concat(DATA.map(r => r.project).filter((v, i, a) => a.indexOf(v) === i)),
      spGroups: SP_GROUP_ORDER.map(g => ({
        label: g,
        options: SP_LIST.filter(s => s.group === g).map(s => ({ value: s.name, label: s.code + " — " + s.name }))
      })),
      statusOpts: ["All statuses", "Ready to sync", "Pool funding mapping pending", "Synced to PRMS", "Awaiting PI approval", "Under review in STAR", "Draft"],
      typeOpts: ["All types"].concat(RESULT_TYPES),
      yearOpts: ["All years", "2025", "2024"],
      fProject: f.project, fSp: f.sp, fStatus: f.status, fType: f.type, fYear: f.year,
      setProject: e => this.setF("project", e.target.value), setSp: e => this.setF("sp", e.target.value),
      setStatus: e => this.setF("status", e.target.value), setType: e => this.setF("type", e.target.value), setYear: e => this.setF("year", e.target.value),
      resetFilters: () => this.setState({ f: { project: "All projects", sp: "All Science Programs", status: "All statuses", type: "All types", year: "All years" }, chip: null }),

      quickChips: [
        { key: null, label: "All results" },
        { key: "attention", label: "Need attention" },
        { key: "mapping", label: "Mapping incomplete" },
        { key: "ready", label: "Ready to sync" },
        { key: "pending", label: "Awaiting PI" },
        { key: "prms", label: "Rejected by PRMS" },
        { key: "synced", label: "Synced with PRMS" }
      ].map(c => {
        const on = st.chip === c.key;
        return {
          label: c.label, count: chipCount(c.key),
          style: chipStyle(on) + ";display:inline-flex;align-items:center;gap:7px",
          countStyle: `display:inline-flex;align-items:center;justify-content:center;min-width:19px;height:19px;padding:0 5px;border-radius:10px;background:${on ? "#0f4c9a" : "#eef1f5"};color:${on ? "#fff" : "#6b7a89"};font:600 11px 'IBM Plex Mono'`,
          onClick: () => this.setState({ chip: c.key })
        };
      }),

      rqCards: (scope === "all" ? [
        { label: "Projects contributing to Pool funding", value: TOTALS.withResults, of: "of " + TOTALS.projects + " in portfolio", accent: "#0f4c9a" },
        { label: "Results eligible for Pool funding mapping", value: (TOTALS.flagged + 28).toLocaleString("en-US"), of: "can be mapped and synced", accent: "#0d2b4e" },
        { label: "Need attention", value: (TOTALS.flagged - TOTALS.sent).toLocaleString("en-US"), of: "draft, pending mapping or pending sync", accent: "#d78a1a", ink: "#a8650a" },
        { label: "Synced with PRMS", value: TOTALS.sent, of: "of " + TOTALS.flagged.toLocaleString("en-US") + " results", accent: "#3f9e5c", ink: "#1d6b3e" }
      ] : [
        { label: "Projects contributing to Pool funding", value: mineProjects.length, of: "where you are PI", accent: "#0f4c9a" },
        { label: "Results eligible for Pool funding mapping", value: mStats.eligible, of: "can be mapped and synced", accent: "#0d2b4e" },
        { label: "Need attention", value: mStats.attention, of: "draft, pending mapping or pending sync", accent: "#d78a1a", ink: "#a8650a" },
        { label: "Synced with PRMS", value: mStats.sent, of: "of " + mStats.flagged + " in PRMS scope", accent: "#3f9e5c", ink: "#1d6b3e" }
      ]).map(c => ({
        label: c.label, value: c.value, of: c.of,
        cardStyle: `background:#fff;border:1px solid ${c.accent === "#d78a1a" ? "#e9cf9e" : "#dfe5ec"};border-left:3px solid ${c.accent};border-radius:10px;padding:15px 18px`,
        numStyle: `font:600 28px 'IBM Plex Mono';color:${c.ink || c.accent}`
      })),

      projectGroups: pgFiltered.map(p => {
        const open = !!st.pgOpen[p.code];
        const seg = [
          { n: p.counts.approved, color: "#3f9e5c", title: p.counts.approved + " approved in PRMS" },
          { n: p.counts.pending, color: "#e0a92c", title: p.counts.pending + " pending review" },
          { n: p.counts.rejected, color: "#b4443a", title: p.counts.rejected + " rejected" },
          { n: p.counts.outOfScope, color: "#2f7cc4", title: p.counts.outOfScope + " no SP contribution · out of PRMS scope" },
          { n: p.counts.notSent, color: "#c9d3de", title: p.counts.notSent + " not synced yet" }
        ].filter(s => s.n > 0);
        return {
          code: p.code, name: p.name, pi: p.pi, donor: p.donor,
          countLabel: p.results.length + (p.results.length === 1 ? " result" : " results"),
          segments: seg.map(s => ({ style: `flex:${s.n};background:${s.color}`, title: s.title })),
          flagLabel: p.attention ? p.attention + (p.attention === 1 ? " needs attention" : " need attention") : "All clear",
          flagStyle: p.attention
            ? "display:inline-flex;align-items:center;padding:4px 11px;border-radius:20px;border:1px solid #e9cf9e;background:#fdf4e3;font:600 12px 'IBM Plex Sans';color:#8a5a08;white-space:nowrap"
            : "display:inline-flex;align-items:center;padding:4px 11px;border-radius:20px;border:1px solid #bfe3cd;background:#eef8f1;font:600 12px 'IBM Plex Sans';color:#1d6b3e;white-space:nowrap",
          caret: open ? "▾" : "▸",
          open: open,
          toggle: () => this.setState(s => ({ pgOpen: Object.assign({}, s.pgOpen, { [p.code]: !s.pgOpen[p.code] }) })),
          results: p.results.map(r => {
            const a = actionFor(r);
            return {
              code: r.code, title: r.title, type: r.type,
              primarySP: r.primarySP, spCodeLine: (SP_CODES[r.primarySP] || "—") + " · PRIMARY", contrib: r.contrib,
              starStatus: r.star, prmsStatus: r.prms === "Not sent" ? "—" : r.prms, updated: r.updated, piLine: r.piNote,
              spStyle: sp(r.primarySP),
              starStyle: badge.apply(null, STAR_COLORS[r.star]),
              prmsStyle: PRMS_PILL(r.prms),
              mapping: mapOf(r), mappingNote: mapNoteOf(r), mappingStyle: badge.apply(null, MAPPING_COLORS[mapOf(r)]),
              prmsHint: r.prmsNote || (r.prms === "Not sent" ? "Not synced to PRMS yet" : "PRMS: " + r.prms),
              spLine: (mapOf(r) === "Not started" || outOfScope(r)) ? (outOfScope(r) ? "Not reported to PRMS" : "") : (SP_CODES[r.primarySP] || "—") + " " + r.primarySP + " (primary) · " + r.contrib,
              showView: outOfScope(r) || !(r.star === "Approved" && mapOf(r) !== "Complete"),
              actionLabel: a.label, actionDisabled: a.disabled, actionHint: a.hint, actionStyle: a.style,
              action: () => { if (a.disabled) return; if (this.eligible(r)) this.send(r); else if (r.star === "Approved" && mapOf(r) !== "Complete") this.openMapping(r); else this.nudge(r); },
              open: (e) => { if (e && e.preventDefault) e.preventDefault(); this.setState({ open: r.id, dtab: "overview" }); }
            };
          })
        };
      }),

      rows: rows.map(r => {
        const a = actionFor(r);
        return {
          code: r.code, title: r.title, type: r.type, project: r.project, projectCode: r.projectCode,
          primarySP: r.primarySP, spCodeLine: (SP_CODES[r.primarySP] || "—") + " · PRIMARY", contrib: r.contrib, starStatus: r.star, prmsStatus: r.prms === "Not sent" ? "—" : r.prms, updated: r.updated, piLine: r.piNote,
          spStyle: sp(r.primarySP),
          starStyle: badge.apply(null, STAR_COLORS[r.star]),
          prmsStyle: PRMS_PILL(r.prms),
          driftStyle: "display:none",
          actionLabel: a.label, actionDisabled: a.disabled, actionHint: a.hint, actionStyle: a.style,
          action: () => { if (a.disabled) return; if (this.eligible(r)) this.send(r); else if (r.star === "Approved" && mapOf(r) !== "Complete") this.openMapping(r); else this.nudge(r); },
          open: (e) => { if (e && e.preventDefault) e.preventDefault(); this.setState({ open: r.id, dtab: "overview" }); }
        };
      }),
      countLine: "Showing " + pgFiltered.reduce((n, p) => n + p.results.length, 0) + " results across " + pgFiltered.length + (pgFiltered.length === 1 ? " project" : " projects") + (scope === "all" ? " · " + TOTALS.flagged.toLocaleString("en-US") + " flagged portfolio-wide" : " where you are PI"),

      tocRows: TOC.map(t => ({ code: t.code, title: t.title, sp: (SP_CODES[t.sp] ? SP_CODES[t.sp] + " — " + t.sp : t.sp), node: t.node, level: t.level, mapping: t.mapping, received: t.received, spStyle: sp(t.sp), mapStyle: badge.apply(null, MAP_COLORS[t.mapping]) })),
      logRows: LOG.map(l => ({ when: l.when, title: l.title, detail: l.detail, tag: l.tag, dot: dotFor(l.kind), tagStyle: badge("#f2f4f7", "#6b7a89", "font-size:10.5px;padding:2px 7px") })),

      hasDrawer: !!d, d: d || {},
      closeDrawer: () => this.setState({ open: null }),
      dIsOverview: st.dtab === "overview", dIsDiff: st.dtab === "diff", dIsActivity: st.dtab === "activity",
      dTabOverview: () => this.setState({ dtab: "overview" }), dTabDiff: () => this.setState({ dtab: "diff" }), dTabActivity: () => this.setState({ dtab: "activity" }),
      dTabOverviewStyle: tabStyle(st.dtab === "overview"), dTabDiffStyle: tabStyle(st.dtab === "diff"), dTabActivityStyle: tabStyle(st.dtab === "activity"),

      resync: () => this.say("Sync started · reconciling STAR and PRMS records"),
      toast: st.toast
    };
  }
}
