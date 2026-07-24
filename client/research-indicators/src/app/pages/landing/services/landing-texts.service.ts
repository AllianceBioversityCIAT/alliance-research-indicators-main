import { Injectable, signal } from '@angular/core';
import { Faq } from '../interfaces/landing.interface';

@Injectable({
  providedIn: 'root'
})
export class LandingTextsService {
  faqList = signal<Faq[]>([
    {
      question: 'WHAT IS THE PURPOSE OF STAR?',
      answer: `
        <span class="text-[#777C83] text-[18px]">
        The platform is designed to address the following key functionalities:<br />
        <br />
        <span class="font-[600]">1. Data-In: </span> STAR will offer a structured reporting space for specific results indicators within
        Alliance non-pool-funded projects. Users will report on capacity sharing for development activities, innovations, policies &
        investments. The requested information to report is aligned with One CGIAR standards and the Integration Framework Agreement signed by
        the Alliance.<br />
        1.1 Outcome Impact Case Reports (OICRs): Regardless of the funding context, STAR will provide a dedicated space for reporting OICRs,
        ensuring that impactful outcomes are systematically documented and analyzed.<br /><br />

        <span class="font-[600]">2.Data-Out: </span> STAR will serve as a centralized hub for information searching, consultation, and export.
        It will consolidate data from various reporting platforms, enabling users to access and utilize comprehensive project results
        efficiently.<br />By integrating these functionalities, STAR aims to enhance the visibility and understanding of how bilateral projects
        contribute to the Alliance's impact pathways, while also providing a streamlined and efficient reporting process.
        </span>
      `
    },
    {
      question: 'What is the added value of STAR for Alliance staff?',
      answer: `
        <span class="text-[#777C83] text-[18px]">
        The STAR platform will offer several significant benefits and added value to Alliance staff:<br />
        <br />
        <span class="font-[600]">1. One-Stop-Shop: </span> STAR will provide a comprehensive overview of all results submitted across various reporting applications within the Alliance, such as PRMS, TIP, 
        AICCRA-MARLO. This centralized approach ensures that data is easily accessible and consolidated, enhancing the efficiency of results consultation.
        <br /><br />

        <span class="font-[600]">2. Data Migration: </span> STAR ensures that any data entered in existing Alliance-led reporting systems is seamlessly migrated and not lost. This guarantees continuity and integrity of information.
        <br /><br />

        <span class="font-[600]">3. User-Centric Design: </span> The platform is designed with the end-user in mind, tailoring its functionalities to meet their specific needs. This user-centric approach ensures that the tool is intuitive, efficient, and responsive to the requirements of its users.
        <br /><br />

        <span class="font-[600]">4. Interoperability: </span>  STAR will promote interoperability between other Alliance reporting applications through the embedding of external modules.
        <br /><br />

        <span class="font-[600]">5. AI-Integrated Functionalities: </span> STAR will incorporate AI-driven features for both reporting and data summarization.
        <br /><br />

        <span class="font-[600]">6. Data Exporting Functionalities: </span> STAR will empower users with full control over their inputted data by offering robust data exporting functionalities. This allows users to leverage the information for various purposes, such as external reports, evidence requests, and proposal drafting, thereby maximizing the value of the data.
        <br />

        By integrating these features, STAR not only meets organizational needs but also provides a powerful tool for users to utilize and benefit from the information entered.
        </span>
      `
    },
    {
      question: 'What is the STAR audience and how will it impact them?',
      answer: `
        <span class="text-[#777C83] text-[18px]">
        The STAR platform is designed to offer tailored benefits to different types of key users within the Alliance:<br />
        <br />
        <span class="font-[600]">1. Senior Management:</span> STAR will provide senior management with a comprehensive understanding of how results from the entire portfolio of Alliance-led projects are shaping impact pathways. This thorough insight will enable them to confidently present the Alliance’s achievements to stakeholders and potential partners, showcasing the organization's contributions and strategic impact.
        <br /><br />

        <span class="font-[600]">2. Principal investigators and research personnel associated with bilateral projects: </span> for principal investigators and other resources involved in bilateral projects, STAR will ensure the visibility of their results. This recognition is crucial for validating their efforts and demonstrating the tangible outcomes of their work, thereby enhancing their project's credibility and support.
        <br /><br />

        <span class="font-[600]">3. Other Staff: </span> STAR will offer a robust data consultation space for other staff members, allowing them to extrapolate meaningful insights from the results of all Alliance projects. This functionality supports informed decision-making, strategic planning, and evidence-based reporting, empowering staff to leverage comprehensive data for various organizational needs.
        </span>
      `
    },
    {
      question: 'Who will be the focal points for providing additional support or information on STAR?',
      answer: `
        <span class="text-[#777C83] text-[18px]">
        For additional support or information on STAR, there will be two main channels with respective teams acting as the focal point:<br />
        <br />
        <span class="font-[600]">1. Technical Support:</span> The TI team will provide technical support. They will handle any technical issues or questions related to the platform's functionality and performance.
        <br /><br />

        <span class="font-[600]">2. Knowledge Support: </span> The SPRM team will offer knowledge support. They will assist with understanding the platform's features and how to effectively use them. To ensure comprehensive assistance, there will be dedicated training sessions delivered systematically or on an ad-hoc basis
        <br /><br />

        Additionally, in-platform guidance materials, such as short informative videos and frequently asked questions (FAQs), will be available. A ticketing system will also be in place to manage and resolve user queries efficiently.
        </span>
    `
    }
  ]);

}
