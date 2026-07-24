export function getContractStatusClasses(status: string): string {
  const normalizedStatus = status?.toUpperCase() ?? '';
  const styles: Record<string, string> = {
    SUSPENDED: 'text-[#F58220] border border-[#F58220]',
    DISCONTINUED: 'text-[#777c83] border border-[#777c83]',
    ONGOING: 'text-[#153C71] border border-[#7C9CB9]',
    DEFAULT: 'text-[#235B2D] border border-[#7CB580]'
  };
  return styles[normalizedStatus] || styles['DEFAULT'];
}
