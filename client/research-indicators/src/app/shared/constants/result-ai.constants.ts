type DetailValue = 'total_participants' | 'non_binary_participants' | 'female_participants' | 'male_participants';

interface ExpandedItemDetail {
  title: string;
  value: DetailValue;
}

interface IndicatorTypeIcon {
  icon: string;
  type: string;
  class: string;
}

interface IndicatorIconResult {
  class?: string;
  icon?: string;
}

export const EXPANDED_ITEM_DETAILS: ExpandedItemDetail[] = [
  { title: 'Total participants', value: 'total_participants' },
  { title: 'Non-binary', value: 'non_binary_participants' },
  { title: 'Female', value: 'female_participants' },
  { title: 'Male', value: 'male_participants' }
];

export const INDICATOR_TYPE_ICONS: IndicatorTypeIcon[] = [
  { icon: 'group', type: 'Capacity Sharing for Development', class: 'output-icon' },
  { icon: 'flag', type: 'Innovation Development', class: 'output-icon' },
  { icon: 'lightbulb', type: 'Knowledge Product', class: 'output-icon' },
  { icon: 'wb_sunny', type: 'Innovation Use', class: 'outcome-icon' },
  { icon: 'pie_chart', type: 'Research Output', class: 'outcome-icon' },
  { icon: 'folder_open', type: 'Policy Change', class: 'outcome-icon' }
];

export const getIndicatorTypeIcon = (type: string): IndicatorIconResult => {
  const icon = INDICATOR_TYPE_ICONS.find(icon => icon.type === type);
  return {
    class: icon?.class,
    icon: icon?.icon
  };
};

export const PROMPT_OICR_DETAILS =
`Summarize the following text in the same language as the input. 
Your output must follow this format and must not exceed 80 words in total: 

OVERVIEW: 
Write one short and highly concise sentence (maximum 20 words) capturing the core context, purpose, main stakeholders, and significance of the work. Do not include detailed results here, and do not repeat information that will appear in the highlights. 

HIGHLIGHTS: 
Provide 3–5 very brief bullet points, each no more than 10 words, with non-repetitive information. Each bullet must be a simple outcome statement without subtitles, labels, or category headers. Do not begin bullets with thematic headings. Focus only on concrete results such as quantitative outcomes, institutional uptake, innovations, capacity building, geographic reach, or environmental/social effects. Use numbers and names only when essential. 

Return only the summary in no more than 80 words.`;
