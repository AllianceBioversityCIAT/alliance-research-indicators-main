import { MigrationInterface, QueryRunner } from 'typeorm';
import { IndicatorsEnum } from '../../domain/entities/indicators/enum/indicators.enum';

export class UpdateDetailIndicators1730502070300 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE \`indicators\` SET \`long_description\` = '<div class="content">
  <div class="indicator-title">Capacity Sharing for Development (individual and group activities) and engagement</div>
  <div class="indicator-description">
    <br />Number of individuals trained or engaged by Alliance staff, aiming to lead to behavioral changes in knowledge, attitude, skills, and practice among CGIAR and non-CGIAR personnel <br /><br />
    Reference - <a href="https://drive.google.com/file/d/1543weLW5YqyUFLHWOGRIOSqowtdWrBcb/view" target="_blank">CGIAR Standard Indicator Description Sheet, 2023</a>
  </div>
</div>' WHERE \`indicator_id\` = ${IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT}`);
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`long_description\` = '<div class="content">
  <div class="indicator-title">General description</div>
  <div class="indicator-description">
    <br />A new, improved, or adapted output or groups of outputs such as technologies, products and services, policies, and other organizational and institutional arrangements with high potential to contribute to positive impacts when used at scale.<br /><br />
    Examples: Innovations can be of technological or non-technological nature and can include varieties/ breeds or groups of varieties/ breeds; Crop or animal management practices; Digital extension/ decision support tools; Partnership or business models; Policies or other types of institutional arrangements; Subsidy or certification schemes; Capacity development programs; Disease detection/ early warning systems; Pro-poor credit arrangements.<br /><br />
    Reference - <a href="https://drive.google.com/file/d/1543weLW5YqyUFLHWOGRIOSqowtdWrBcb/view" target="_blank">CGIAR Standard Indicator Description Sheet, 2023</a><br /><br />
    Another available definition - <a href="https://marlo.cgiar.org/glossary.do" target="_blank">Marlo CGIAR Glossary</a>
  </div>
</div>
' WHERE \`indicator_id\` = ${IndicatorsEnum.INNOVATION_DEV}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`long_description\` = '<div class="content">
  <div class="indicator-title">General description</div>
  <div class="indicator-description">
    <br />Defined by the CGIAR Open and FAIR Data Assets Policy using the term data asset. For reporting, users should only consider knowledge products that are integral to the Initiative/Project’s Theory of Change (ToC). To be eligible for reporting, a knowledge product should be a finalized product. Other data assets illustrating an output or outcome should not be reported under this indicator and should instead be used as evidence for the relevant output or outcome.<br /><br />
    Reference - <a href="https://drive.google.com/file/d/1543weLW5YqyUFLHWOGRIOSqowtdWrBcb/view" target="_blank">CGIAR Standard Indicator Description Sheet, 2023</a><br /><br />
    For a non-exhaustive list of data asset refer to <a href="https://cgspace.cgiar.org/server/api/core/bitstreams/3c39bf16-b35d-4faa-b509-b29d045a9144/content" target="_blank">CGIAR Open and FAIR Data Assets Policy</a>
  </div>
</div>' WHERE \`indicator_id\` = ${IndicatorsEnum.KNOWLEDGE_PRODUCT}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`long_description\` = '<div class="content">
  <div class="indicator-title">General description</div>
  <div class="indicator-description">
    <br />Policies, strategies, legal instruments, programs, budgets, or investments at different scales (local to global) that have been modified in design or implementation, with evidence that the change was informed by Alliance research.<br /><br />
    Reference - <a href="https://docs.google.com/document/d/186V6nSxNy80Ne2O9fR6Hga4KXVXK5hMQ/edit" target="_blank">CGIAR Standard Indicator Description Sheet, 2023</a><br /><br /><br />
  </div>
  <div class="indicator-title">Policy or strategy</div>
  <div class="indicator-description"><br />Policies or strategies include written decisions on, or commitments to, a particular course of action by an institution (policy); or a (government, NGO, private sector) high-level plan outlining how a particular course of action will be carried out (strategy). These documents show the intent of an organization or entity. Examples are country growth strategies, country agricultural policies, organization strategic plans or road maps. This could also be observed as information campaigns (e.g., for improved diets). These documents set the goalposts but then require other instruments for implementation.<br /><br /><br /></div>
  <div class="indicator-title">Legal instrument</div>
  <div class="indicator-description"><br />Legal instruments include laws, which are defined as Bills passed into law by the highest elected body (a parliament, congress or equivalent); or regulations, which are defined as rules or norms adopted by a government. These laws and regulations dictate very specifically actions and behaviors that are to be followed or prohibited and often include language on implications of non-compliance.<br /><br /><br /></div>
  <div class="indicator-title">Program, budget or investment</div>
  <div class="indicator-description"><br />These are implementing mechanisms that often follow from a strategy, policy or law. There is typically a well-defined set of actions outlined over a specific period of time and with a specific budgetary amount attached. National Agricultural Investment Plans is an example, the budget within a ministry is another, investments from the private sector fit here, as well as programs launched by public, private and NGO sectors.</div>
</div>
' WHERE \`indicator_id\` = ${IndicatorsEnum.POLICY_CHANGE}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`long_description\` = '<div class="content">
  <div class="indicator-title">Outcome Impact Case Report</div>
  <div class="indicator-description">
    <br />An evidence-based report detailing any outcome or impact that has resulted from the work of one or more CGIAR programs, initiatives, or centers. Outcome impact case reports must cite robust evidence to demonstrate the contribution of the CGIAR entity’s research findings or innovations to the outcome or impact. They are used to demonstrate results to funders.<br /><br />
    Reference - <a href="https://drive.google.com/file/d/1v0O5wt4z3bgs_wCYa7H2FifTVSAXAVjl/view" target="_blank">One CGIAR PRMF Glossary</a><br /><br />
  </div>
  <div class="indicator-description">
    Maturity refers to the stage of an Outcome Impact Case Report (OICR).<br /><br />
    Level 1: (sphere of influence) CGIAR research (and related activities) has contributed to changed discourse and/or behavior among next users (related to the theory of change). Examples of evidence: outcome mapping study, media analysis, e-mail correspondence.<br /><br />
    Level 2: (sphere of influence) CGIAR research (and related activities) has contributed to documented policy change and/or a change in practice by end users. This may include changes such as income, nutrient intake etc. in the sphere of influence - usually this will be a development project involved in ‘delivery’/scaling up of an innovation. Example of evidence: a study of adoption and effects, commissioned at project level.<br /><br />
    Level 3: (sphere of interest) Policy and/or practice changes influenced by CGIAR research (and related activities) has led to adoption or impacts at scale or beyond the direct CGIAR sphere of influence (i.e. not in a development project). Example of evidence: at scale Adoption Study or ex-post Impact Assessment.
  </div>
</div>
' WHERE \`indicator_id\` = ${IndicatorsEnum.OICR}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`long_description\` = '<div class="content">
  <div class="indicator-title">General description</div>
  <div class="indicator-description">
    <br />A metric used to assess the extent to which an innovation is already being used, by which type of users and under which conditions, with a scale ranging from no use (lowest level) to common use (highest level).<br /><br />
    Examples: Innovation Use is a key metric in the <a href="https://doi.org/10.1016/j.agsy.2020.102874" target="_blank">Scaling Readiness approach</a>. An innovation that is only used by the project, design or intervention team or its direct partners will score low in innovation use. Innovations that are commonly used by anticipated end-users will score high in innovation use. Users that are directly incentivized by a project or intervention to use an innovation are considered project team or direct partners which will score as low innovation use.<br /><br />
    Reference - <a href="https://drive.google.com/file/d/1v0O5wt4z3bgs_wCYa7H2FifTVSAXAVjl/view" target="_blank">One CGIAR PRMF Glossary</a><br /><br />
    Other available definitions – <a href="https://www.scalingreadiness.org/calculator-use/" target="_blank">Scaling Readiness</a>, <a href="https://www.sciencedirect.com/science/article/pii/S0308521X19314477?via%3Dihub" target="_blank">Scaling Readiness: Science and practice of an approach to enhance impact of research for development</a>, <a href="https://docs.google.com/document/d/186V6nSxNy80Ne2O9fR6Hga4KXVXK5hMQ/edit" target="_blank">CGIAR Standard Indicator Description Sheet, 2023</a>
  </div>
</div>' WHERE \`indicator_id\` = ${IndicatorsEnum.INNOVATION_USE}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE \`indicators\` SET \`long_description\` = '<p style="margin-top:0pt; margin-bottom:8pt; text-align:justify;">Number of individuals trained or engaged by Alliance staff, aiming to lead to behavioral changes in knowledge, attitude, skills, and practice among CGIAR and non-CGIAR personnel</p>
      <p style="margin-top:0pt; margin-bottom:8pt;">Reference - <a href="https://drive.google.com/file/d/1543weLW5YqyUFLHWOGRIOSqowtdWrBcb/view" style="text-decoration:none;"><u><span style="color:#467886;">CGIAR</span></u><u><span style="color:#467886;">&nbsp;</span></u><u><span style="color:#467886;">Standard</span></u><u><span style="color:#467886;">&nbsp;</span></u><u><span style="color:#467886;">Indicator</span></u><u><span style="color:#467886;">&nbsp;</span></u><u><span style="color:#467886;">Description Sheet, 2023</span></u></a></p>' WHERE \`indicator_id\` = ${IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT}`);
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`long_description\` = '<p style="margin-top:0pt; margin-bottom:8pt; text-align:justify;">A new, improved, or adapted output or groups of outputs such as technologies, products and services, policies, and other organizational and institutional arrangements with high potential to contribute to positive impacts when used at scale.</p>
      <p style="margin-top:0pt; margin-bottom:8pt; text-align:justify;"><em>Examples: Innovations can be of technological or non-technological nature and can include varieties/ breeds or groups of varieties/ breeds; Crop or animal management practices; Digital extension/ decision support tools; Partnership or business models; Policies or other types of institutional arrangements; Subsidy or certification schemes; Capacity development programs; Disease detection/ early warning systems; Pro-poor credit arrangements.</em></p>
      <p style="margin-top:0pt; margin-bottom:8pt;">Reference - <a href="https://drive.google.com/file/d/1543weLW5YqyUFLHWOGRIOSqowtdWrBcb/view" style="text-decoration:none;"><u><span style="color:#467886;">CGIAR</span></u><u><span style="color:#467886;">&nbsp;</span></u><u><span style="color:#467886;">Standard</span></u><u><span style="color:#467886;">&nbsp;</span></u><u><span style="color:#467886;">Indicator</span></u><u><span style="color:#467886;">&nbsp;</span></u><u><span style="color:#467886;">Description Sheet, 2023</span></u></a></p>
      <p style="margin-top:0pt; margin-bottom:8pt;">Another available definition <a href="https://marlo.cgiar.org/glossary.do" style="text-decoration:none;"><u><span style="color:#467886;">Marlo CGIAR Glossary</span></u></a></p>' WHERE \`indicator_id\` = ${IndicatorsEnum.INNOVATION_DEV}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`long_description\` = '<p style="margin-top:0pt; margin-bottom:8pt; text-align:justify;">A metric used to assess the extent to which an innovation is already being used, by which type of users and under which conditions, with a scale ranging from no use (lowest level) to common use (highest level).</p>
      <p style="margin-top:0pt; margin-bottom:8pt; text-align:justify;"><em>Examples: Innovation Use is a key metric in the&nbsp;</em><a href="https://doi.org/10.1016/j.agsy.2020.102874" style="text-decoration:none;"><em><u><span style="color:#467886;">Scaling Readiness approach</span></u></em></a><em>. An innovation that is only used by the project, design or intervention team or its direct partners will score low in innovation use. Innovations that are commonly used by anticipated end-users will score high in innovation use. Users that are directly incentivized by a project or intervention to use an innovation are considered project team or direct partners which will score as low innovation use.</em></p>
      <p style="margin-top:0pt; margin-bottom:8pt;">Reference - <a href="https://drive.google.com/file/d/1v0O5wt4z3bgs_wCYa7H2FifTVSAXAVjl/view" style="text-decoration:none;"><u><span style="color:#467886;">One CGIAR PRMF Glossary</span></u></a></p>
      <p style="margin-top:0pt; margin-bottom:8pt;">Other available definitions &ndash; <a href="https://www.scalingreadiness.org/calculator-use/" style="text-decoration:none;"><u><span style="color:#467886;">Scaling Readiness</span></u></a> , <a href="https://www.sciencedirect.com/science/article/pii/S0308521X19314477?via%3Dihub" style="text-decoration:none;"><u><span style="color:#467886;">Scaling Readiness: Science and practice of an approach to enhance impact of research for development</span></u></a> , <a href="https://docs.google.com/document/d/186V6nSxNy80Ne2O9fR6Hga4KXVXK5hMQ/edit" style="text-decoration:none;"><u><span style="color:#467886;">CGIAR</span></u><u><span style="color:#467886;">&nbsp;</span></u><u><span style="color:#467886;">Standard</span></u><u><span style="color:#467886;">&nbsp;</span></u><u><span style="color:#467886;">Indicator</span></u><u><span style="color:#467886;">&nbsp;</span></u><u><span style="color:#467886;">Description Sheet, 2023</span></u></a></p>' WHERE \`indicator_id\` = ${IndicatorsEnum.INNOVATION_USE}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`long_description\` = '<p style="margin-top:0pt; margin-bottom:8pt; text-align:justify;">Defined by the CGIAR Open and FAIR Data Assets Policy using the term <em>data asset</em>. For reporting, users should only consider knowledge products that are integral to the Initiative/Project&rsquo;s Theory of Change (ToC). To be eligible for reporting, a knowledge product should be a finalized product. Other <em>data assets</em> illustrating an output or outcome should not be reported under this indicator and should instead be used as evidence for the relevant output or outcome.</p>
      <p style="margin-top:0pt; margin-bottom:8pt;">Reference - <a href="https://drive.google.com/file/d/1543weLW5YqyUFLHWOGRIOSqowtdWrBcb/view" style="text-decoration:none;"><u><span style="color:#467886;">CGIAR</span></u><u><span style="color:#467886;">&nbsp;</span></u><u><span style="color:#467886;">Standard</span></u><u><span style="color:#467886;">&nbsp;</span></u><u><span style="color:#467886;">Indicator</span></u><u><span style="color:#467886;">&nbsp;</span></u><u><span style="color:#467886;">Description Sheet, 2023</span></u></a></p>
      <p style="margin-top:0pt; margin-bottom:8pt;">For a non-exhaustive list of <em>data asset&nbsp;</em>refer to <a href="https://cgspace.cgiar.org/server/api/core/bitstreams/3c39bf16-b35d-4faa-b509-b29d045a9144/content" style="text-decoration:none;"><u><span style="color:#467886;">CGIAR Open and FAIR Data Assets Policy</span></u></a> &nbsp;&nbsp;</p>' WHERE \`indicator_id\` = ${IndicatorsEnum.KNOWLEDGE_PRODUCT}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`long_description\` = '<p style="margin-top:0pt; margin-bottom:8pt; text-align:justify;">An evidence-based report detailing any outcome or impact that has resulted from the work of one or more CGIAR programs, initiatives, or centers. Outcome impact case reports must cite robust evidence to demonstrate the contribution of the CGIAR entity&rsquo;s research findings or innovations to the outcome or impact. They are used to demonstrate results to funders.</p>
      <p style="margin-top:0pt; margin-bottom:8pt;">Reference - <a href="https://drive.google.com/file/d/1v0O5wt4z3bgs_wCYa7H2FifTVSAXAVjl/view" style="text-decoration:none;"><u><span style="color:#467886;">One CGIAR PRMF Glossary</span></u></a></p>
      <p style="margin-top:0pt; margin-bottom:8pt; text-align:justify;">&nbsp;</p>
      <p style="margin-top:0pt; margin-bottom:8pt; text-align:justify;"><em><span style="color:#0070c0;">Maturity</span></em><em>&nbsp;refers to the stage of an Outcome Impact Case Report (OICR).&nbsp;</em></p>
      <p style="margin-top:0pt; margin-bottom:8pt; text-align:justify;"><em>Level 1: (sphere of influence) CGIAR research (and related activities) has contributed to changed discourse and/or behavior among next users (related to the theory of change). Examples of evidence: outcome mapping study, media analysis, e-mail correspondence</em></p>
      <p style="margin-top:0pt; margin-bottom:8pt; text-align:justify;"><em>Level 2: (sphere of influence) CGIAR research (and related activities) has contributed to documented policy change and/or a change in practice by end users. This may include changes such as income, nutrient intake etc. in the sphere of influence - usually this will be a development project involved in &lsquo;delivery&rsquo;/scaling up of an innovation. Example of evidence: a study of adoption and effects, commissioned at project level.</em></p>
      <p style="margin-top:0pt; margin-bottom:8pt; text-align:justify;"><em>Level 3: (sphere of interest) Policy and/or practice changes influenced by CGIAR research (and related activities) has led to adoption or impacts at scale or beyond the direct CGIAR sphere of influence (i.e. not in a development project). Example of evidence: at scale Adoption Study or ex-post Impact Assessment</em>.</p>' WHERE \`indicator_id\` = ${IndicatorsEnum.OICR}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`long_description\` = '<p style="margin-top:0pt; margin-bottom:8pt; text-align:justify;">Policies, strategies, legal instruments, programs, budgets, or investments at different scales (local to global) that have been modified in design or implementation, with evidence that the change was informed by Alliance research.</p>
      <p style="margin-top:0pt; margin-bottom:8pt;">Reference - <a href="https://docs.google.com/document/d/186V6nSxNy80Ne2O9fR6Hga4KXVXK5hMQ/edit" style="text-decoration:none;"><u><span style="color:#467886;">CGIAR</span></u><u><span style="color:#467886;">&nbsp;</span></u><u><span style="color:#467886;">Standard</span></u><u><span style="color:#467886;">&nbsp;</span></u><u><span style="color:#467886;">Indicator</span></u><u><span style="color:#467886;">&nbsp;</span></u><u><span style="color:#467886;">Description Sheet, 2023</span></u></a></p>
      <p style="margin-top:0pt; margin-bottom:8pt; text-align:justify;"><span style="color:#0070c0;">Policy or strategy</span>: Policies or strategies include written decisions on, or commitments to, a particular course of action by an institution (policy); or a (government, NGO, private sector) high-level plan outlining how a particular course of action will be carried out (strategy). These documents show the intent of an organization or entity. Examples are country growth strategies, country agricultural policies, organization strategic plans or road maps. This could also be observed as information campaigns (e.g., for improved diets). These documents set the goalposts but then require other instruments for implementation.</p>
      <p style="margin-top:0pt; margin-bottom:8pt; text-align:justify;"><span style="color:#0070c0;">Legal instrument</span>: Legal instruments include laws, which are defined as Bills passed into law by the highest elected body (a parliament, congress or equivalent); or regulations, which are defined as rules or norms adopted by a government. These laws and regulations dictate very specifically actions and behaviors that are to be followed or prohibited and often include language on implications of non-compliance.</p>
      <p style="margin-top:0pt; margin-bottom:8pt; text-align:justify;"><span style="color:#0070c0;">Program, budget or investment</span>: These are implementing mechanisms that often follow from a strategy, policy or law. There is typically a well-defined set of actions outlined over a specific period of time and with a specific budgetary amount attached. National Agricultural Investment Plans is an example, the budget within a ministry is another, investments from the private sector fit here, as well as programs launched by public, private and NGO sectors.</p>' WHERE \`indicator_id\` = ${IndicatorsEnum.POLICY_CHANGE}`,
    );
  }
}
