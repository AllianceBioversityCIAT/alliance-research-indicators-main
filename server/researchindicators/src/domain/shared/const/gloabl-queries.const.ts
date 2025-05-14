export const queryPrincipalInvestigator = (
  user: string = '?',
  result: string = '?',
) => `select r.result_id, 
			ifnull(su.sec_user_id = ${user}, false) as is_principal
		from results r
			inner join result_contracts rc on r.result_id = rc.result_id 
											and rc.is_primary = true
			inner join agresso_contracts ac on ac.agreement_id = rc.contract_id 
			left join sec_users su on su.first_name like concat('%',trim(SUBSTRING_INDEX(ac.project_lead_description , ',', -1)),'%')
									and su.last_name  like concat('%',trim(SUBSTRING_INDEX(ac.project_lead_description , ',', 1)),'%')
		where r.result_id = ${result}
		limit 1;`;
