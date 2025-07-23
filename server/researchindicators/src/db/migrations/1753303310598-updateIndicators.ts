import { MigrationInterface, QueryRunner } from 'typeorm';
import { IndicatorsEnum } from '../../domain/entities/indicators/enum/indicators.enum';
import { IndicatorTypeEnum } from '../../domain/entities/indicator-types/enum/indicator-type.enum';

export class UpdateIndicators1753303310598 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`long_description\` = '<div class="content">
  <div class="indicator-title">GENERAL DESCRIPTION</div>
  <div class="indicator-description">
    Activities that develop the know-how and capacity to design, test, validate and use innovations.
    <br />
    <br />
    Examples: training-of-trainers programs at the farmer level; providing guidance on RBM and MEL; training programs with public and private sector
    partners; educating PhD and MSc students; ongoing institutional support to national partners, particularly NARES; and strengthening government
    policy analysis.
    <br />
    <br />
    Through this indicator, we aim to capture the number of people trained by Alliance staff with the aim of leading to changes in knowledge,
    attitude, skills and practice, i.e. behavior.
  </div>
</div>'  WHERE \`indicator_id\` = ${IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`long_description\` = '<div class="content">
  <div class="indicator-title">GENERAL DESCRIPTION</div>
  <div class="indicator-description">
    A new, improved or adapted outputs or groups of outputs such as products, technologies, services, organizational and institutional arrangements
    with high potential to contribute to positive impacts when used at scale.
    <br />
    <br />
    Examples: innovations can be of technological or non-technological nature and can include varieties/breeds or groups of varieties/breeds; crop or
    animal management practices; digital extension/decision support tools; partnership or business models; policies or other types of institutional
    arrangements; subsidy or certification schemes; capacity development programs; disease detection/ early warning systems; pro-poor credit
    arrangements.
    <br />
    <br />
    Innovations development refers to the process of developing innovations from an idea to a proven product, technology, service or arrangement that
    is validated for its ability to contribute to positive impacts when used at scale. The process often includes basic research, innovation design,
    and improving innovations based on testing under (semi-)controlled and uncontrolled conditions. Progress in innovation development is measured in
    an evidence-based way along the 0-9 levels of innovation readiness.
  </div>
</div>'  WHERE \`indicator_id\` = ${IndicatorsEnum.INNOVATION_DEV}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`long_description\` = '<div class="content">
  <div class="indicator-title">GENERAL DESCRIPTION</div>
  <div class="indicator-description">
    A metric used to assess the extent to which an innovation is already being used, by which type of users and under which conditions, with a scale
    ranging from no use (lowest level) to common use (highest level). Innovation use is a key metric in the
    <a href="http://www.scalingreadiness.org/" target="_blank">Scaling Readiness approach.</a>
    <br />
    <br />
    An innovation that is only used by the project, design or intervention team or its direct partners will score low in innovation use. Innovations
    that are commonly used by anticipated end-users will score high in innovation use. Users that are directly incentivized by a project or
    intervention to use an innovation are considered project team or direct partners which will score as low innovation use.
  </div>
</div>'  WHERE \`indicator_id\` = ${IndicatorsEnum.INNOVATION_USE}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`long_description\` = '<div class="content">
  <div class="indicator-title">GENERAL DESCRIPTION</div>
  <div class="indicator-description">
    Knowledge products are intellectual assets generated from research and development activities such as articles, briefs, reports, extension and
    training content, databases, software, and multimedia elements that contribute to behavioral changes in particular actors.
    <br />
    <br />
    A knowledge product is defined by the
    <a href="https://hdl.handle.net/10568/113623" target="_blank">CGIAR Open and FAIR Data Assets Policy</a> using the term "data asset". Indicative
    types of data assets include peer-reviewed journal articles; non-reviewed articles, reports, briefs, extension and training and other materials;
    books and book chapters; data and databases; data collection and analysis tools (e.g. models and survey tools); video, audio and images; computer
    software (e.g. models, APIs); web tools (e.g. data portals, dashboards).
    <br />
    <br />
    To be eligible for reporting, a knowledge product should be a finalized product. Drafts (e.g., a draft brief) or preprints are not suitable. Other
    "data assets" (e.g., videos) as defined in the policy or any digital product (e.g., internal reports) illustrating an output or outcome should not
    be reported under this indicator and should instead be used as evidence for the relevant output or outcome.
    <br />
    <br />
    If a knowledge product aligns with the above criteria and adheres to the policy, it should be stored in CGSpace, following a typology set by the
    CGSpace community, as outlined in the <a href="https://agriculturalsemantics.github.io/cg-core/IPtypes.html" target="_blank">CGCore</a> and
    international standards.
  </div>
</div>'  WHERE \`indicator_id\` = ${IndicatorsEnum.KNOWLEDGE_PRODUCT}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`long_description\` = '<div class="content">
  <div class="indicator-title">GENERAL DESCRIPTION</div>
  <div class="indicator-description">
    An evidence-based report detailing any outcome or impact that has resulted from the work of one or more CGIAR programs, initiatives, or centers.
    Outcome impact case reports must cite robust evidence to demonstrate the contribution of the CGIAR entity''s research findings or innovations to
    the outcome or impact. They are used to demonstrate results to funders.
    <br />
    <br />
    An outcome consists in a change in knowledge, attitudes, skills, and/or relationships (KASR), which manifests as a change in behavior in
    particular external actors, to which Alliance research outputs and related activities have contributed. An impact consists in a durable change in
    the condition of people and their environment brought by a chain of events or changes to which Alliance research, innovations and related
    activities have contributed. It may be positive or negative, direct or indirect, intended or unintended.
    <br />
    <br />
    Outcome Impact Case Report can have 3 different stages of maturity:
    <br />
    <br />
    Level 1: (sphere of influence) CGIAR research (and related activities) has contributed to changed discourse and/or behavior among next users
    (related to the theory of change).
    <br />
    Level 2: (sphere of influence) CGIAR research (and related activities) has contributed to documented policy change and/or a change in practice by
    end users. This may include changes such as income, nutrient intake etc. in the sphere of influence - usually this will be a development project
    involved in ''delivery''/scaling up of an innovation.
    <br />
    Level 3: (sphere of interest) Policy and/or practice changes influenced by CGIAR research (and related activities) has led to adoption or impacts
    at scale or beyond the direct CGIAR sphere of influence (i.e. not in a development project).
  </div>
</div>'  WHERE \`indicator_id\` = ${IndicatorsEnum.OICR}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`long_description\` = '<div class="content">
  <div class="indicator-title">GENERAL DESCRIPTION</div>
  <div class="indicator-description">
    Policies, and strategies; legal instruments; programs, budgets, or investments at different scales (local to global) that have been modified in
    design or implementation, with evidence that the change was informed by Alliance research.
  </div>
  <br />
  <br />
  <div class="indicator-title">Program, budget or investment</div>
  <div class="indicator-description">
    These are implementing mechanisms that often follow from a strategy, policy or law. There is typically a well-defined set of actions outlined over
    a specific period of time and with a specific budgetary amount attached. National Agricultural Investment Plans is an example, the budget within a
    ministry is another, investments from the private sector fit here, as well as programs launched by public, private and NGO sectors.
  </div>
  <br />
  <br />
  <div class="indicator-title">Legal instrument</div>
  <div class="indicator-description">
    Legal instruments include laws, which are defined as Bills passed into law by the highest elected body (a parliament, congress or equivalent); or
    regulations, which are defined as rules or norms adopted by a government. These laws and regulations dictate very specifically actions and
    behaviors that are to be followed or prohibited and often include language on implications of non-compliance.
  </div>
  <br />
  <br />
  <div class="indicator-title">Policy or strategy</div>
  <div class="indicator-description">
    Policies or strategies include written decisions on, or commitments to, a particular course of action by an institution (policy); or a
    (government, NGO, private sector) high-level plan outlining how a particular course of action will be carried out (strategy). These documents show
    the intent of an organization or entity. Examples are country growth strategies, country agricultural policies, organization strategic plans or
    road maps. This could also be observed as information campaigns (e.g., for improved diets). These documents set the goalposts but then require
    other instruments for implementation. <br />
    <br />
    3 different stages are available to describe this indicator: <br />
    <br />
    Stage 1 - Research taken up by next user, policy change not yet enacted; <br />

    Stage 2 - Policy enacted; <br />

    Stage 3 - Evidence of impact of policy. <br />

    Evidence is required to validate the specific claims made regarding the relationship between Alliance''s research and any reported policy outcome
    for all stages (i.e. the contribution of the Alliance).
  </div>
</div>'  WHERE \`indicator_id\` = ${IndicatorsEnum.POLICY_CHANGE}`,
    );

    await queryRunner.query(
      `UPDATE \`indicator_types\` SET \`long_description\` = ? WHERE \`indicator_type_id\` = ?`,
      [
        `<div class="content">
  <div class="indicator-title">What is intended for Output?</div>
  <br />
  <div class="indicator-description">
    Tangible products or services such as knowledge, technical or institutional advancement that result directly from Alliance research, engagement
    and/or capacity development activities. They involve a change in knowledge or tools within the research process itself, produced under the control
    of the research team.
    <br />
    <br />
    Examples include new research methods, policy analyses, gene maps, new crop varieties and breeds, institutional innovations or other products of
    research work, partnerships because of a signed memorandum of understanding.
  </div>
  <br />
  <br />
  <div class="indicators-description">What are the indicators associated to the Output results category?</div>
</div>`,
        IndicatorTypeEnum.OUTPUT,
      ],
    );

    await queryRunner.query(
      `UPDATE \`indicator_types\` SET \`long_description\` = ? WHERE \`indicator_type_id\` = ?`,
      [
        `<div class="content">
  <div class="indicator-title">What is intended for Outcome?</div>
  <br />
  <div class="indicator-description">
    A change in knowledge, attitudes, skills, and/or relationships (KASR) of external actors. An outcome is a change in behavior that happens outside
    the research team, in people or organizations who interact with the research outputs. While the research influences these changes, the researchers
    cannot directly control them.
    <br />
    <br />
    Examples include the use of a new technology (including outputs like a seed variety) by farmers; policy actors using research-based knowledge to
    inform policy decisions; participants in an Alliance-supported process agree to a new germplasm conservation and exchange protocols; researchers
    use Alliance generated methods and/or databases.
  </div>
  <br />
  <br />
  <div class="indicators-description">What are the indicators associated with the Outcome results category?</div>
</div>`,
        IndicatorTypeEnum.OUTCOME,
      ],
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

    await queryRunner.query(
      `UPDATE \`indicator_types\` SET \`long_description\` = '<p style="margin-top:0pt; margin-bottom:8pt; text-align:justify;">Knowledge, technical or institutional advancement produced by Alliance research, engagement and/or capacity development activities.</p>
    <p style="margin-top:0pt; margin-bottom:8pt; text-align:justify;">Examples: new research methods, policy analyses, gene maps, new crop varieties and breeds, institutional innovations or other products of research work, partnerships because of a signed memorandum of understanding.</p>
    <p style="margin-top:0pt; margin-bottom:8pt;">Reference - <a href="https://drive.google.com/file/d/1v0O5wt4z3bgs_wCYa7H2FifTVSAXAVjl/view" style="text-decoration:none;"><u><span style="color:#467886;">One CGIAR PRMF Glossary</span></u></a></p>' WHERE \`indicator_type_id\` = ${IndicatorTypeEnum.OUTPUT}`,
    );

    await queryRunner.query(
      `UPDATE \`indicator_types\` SET \`long_description\` = '<p style="margin-top:0pt; margin-bottom:8pt; text-align:justify;">A change in knowledge, skills, attitudes and/or relationships, which manifests as a change in behavior in particular actors, to which research outputs and related activities have contributed.</p>
    <p style="margin-top:0pt; margin-bottom:8pt; text-align:justify;"><em>Examples: use of a new technology (including outputs like a seed variety) by farmers; policy actors using research-based knowledge to inform policy decisions; participants in a CGIAR-supported process agree to a new germplasm conservation and exchange protocols; researchers use CGIAR generated methods and/or databases.</em></p>
    <p style="margin-top:0pt; margin-bottom:8pt;">Reference - <a href="https://drive.google.com/file/d/1v0O5wt4z3bgs_wCYa7H2FifTVSAXAVjl/view" style="text-decoration:none;"><u><span style="color:#467886;">One CGIAR PRMF Glossary</span></u></a></p>' WHERE \`indicator_type_id\` = ${IndicatorTypeEnum.OUTCOME}`,
    );
  }
}
