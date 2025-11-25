export const queryPrincipalInvestigator = (
  user: string = '?',
  result: string = '?',
) => `select r.result_id, 
			if(su.sec_user_id is null, false, true) as is_principal
		from results r
			inner join result_contracts rc on r.result_id = rc.result_id 
											and rc.is_primary = true
			inner join agresso_contracts ac on ac.agreement_id = rc.contract_id 
			left join sec_users su ON su.sec_user_id = ${user}
									and ac.project_lead_description like  CONCAT('%', su.first_name, '%') 
									and ac.project_lead_description like  CONCAT('%', su.last_name , '%')
		where r.result_id = ${result}
		limit 1;`;
