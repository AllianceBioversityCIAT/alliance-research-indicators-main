import { Component } from '@angular/core';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';

interface Indicator {
  icon: string;
  name: string;
  type: string;
  subtitle: string;
  url: string;
  description: string;
}

@Component({
  selector: 'app-discover-hero',
  imports: [S3ImageUrlPipe],
  templateUrl: './discover-hero.component.html',
  styleUrl: './discover-hero.component.scss'
})
export class DiscoverHeroComponent {
  indicators: Indicator[] = [
    {
      icon: 'pi-flag',
      name: 'Innovation Development',
      type: 'output-icon',
      subtitle: 'OUTPUT',
      url: 'https://www.cgiar.org/indicators',
      description:
        'A new, improved or adapted outputs or groups of outputs such as products, technologies, services, organizational and institutional arrangements with high potential to contribute to positive impacts when used at scale.'
    },
    {
      icon: 'pi-sun',
      name: 'Innovation Use',
      type: 'outcome-icon',
      subtitle: 'OUTCOME',
      url: 'https://www.cgiar.org/indicators',
      description:
        'A metric used to assess the extent to which an innovation is already being used, by which type of users and under which conditions, with a scale ranging from no use (lowest level) to common use (highest level).'
    },
    {
      icon: 'pi-users',
      name: 'Capacity Sharing',
      type: 'output-icon',
      subtitle: 'OUTPUT',
      url: 'https://www.cgiar.org/indicators',
      description: 'Activities that develop the know-how and capacity to design, test, validate and use innovations.'
    },
    {
      icon: 'pi-chart-pie',
      name: 'OICRs',
      type: 'outcome-icon',
      subtitle: 'OUTCOME',
      url: 'https://www.cgiar.org/indicators',
      description:
        'An evidence-based report detailing any outcome or impact that has resulted from the work of one or more CGIAR programs, initiatives, or centers. Outcome impact case reports must cite robust evidence to demonstrate the contribution of the CGIAR entity’s research findings or innovations to the outcome or impact'
    },
    {
      icon: 'pi-lightbulb',
      name: 'Knowledge Product',
      type: 'output-icon',
      subtitle: 'OUTPUT',
      url: 'https://www.cgiar.org/indicators',
      description:
        'Knowledge products are intellectual assets generated from research and development activities such as articles, briefs, reports, extension and training content, databases, software, and multimedia elements that contribute to behavioral changes in particular actors.'
    },
    {
      icon: 'pi-folder-open',
      name: 'Policy Change',
      type: 'outcome-icon',
      subtitle: 'OUTCOME',
      url: 'https://www.cgiar.org/indicators',
      description:
        'Policies, and strategies; legal instruments; programs, budgets, or investments at different scales (local to global) that have been modified in design or implementation, with evidence that the change was informed by Alliance research.'
    }
  ];
}
