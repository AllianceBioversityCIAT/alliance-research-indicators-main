import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReleaseNoteCardComponent } from './release-note-card.component';
import { WhatsNewService } from '../../../../services/whats-new.service';

describe('ReleaseNoteCardComponent', () => {
  let fixture: ComponentFixture<ReleaseNoteCardComponent>;
  let whatsNewService: {
    isReleaseNoteNew: jest.Mock;
    getDisplayDate: jest.Mock;
    getColor: jest.Mock;
  };

  const item = {
    id: 'page-1',
    created_time: '2026-05-06T00:00:00.000Z',
    cover: { type: 'external', external: { url: 'https://cover.png' } },
    properties: {
      Name: { title: [{ plain_text: 'Release title' }] },
      Tags: { select: { name: 'Development', color: 'blue' } },
      Projects: { multi_select: [{ name: 'STAR', color: 'purple' }] }
    }
  };

  beforeEach(async () => {
    whatsNewService = {
      isReleaseNoteNew: jest.fn().mockReturnValue(true),
      getDisplayDate: jest.fn().mockReturnValue('2026-05-06T00:00:00.000Z'),
      getColor: jest.fn().mockReturnValue('#2F5168')
    };

    await TestBed.configureTestingModule({
      imports: [ReleaseNoteCardComponent, RouterTestingModule],
      providers: [{ provide: WhatsNewService, useValue: whatsNewService }]
    }).compileComponents();

    fixture = TestBed.createComponent(ReleaseNoteCardComponent);
    fixture.componentRef.setInput('item', item);
  });

  it('should render card content and tags', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Release title');
    expect(fixture.nativeElement.textContent).toContain('Development');
    expect(fixture.nativeElement.textContent).toContain('STAR');
    expect(fixture.nativeElement.querySelector('a')?.getAttribute('href')).toContain('/whats-new/details/page-1');
  });

  it('should render file cover and placeholder', () => {
    fixture.componentRef.setInput('item', {
      ...item,
      cover: { type: 'file', file: { url: 'https://cover-file.png' } }
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeTruthy();

    fixture.componentRef.setInput('item', { ...item, cover: undefined });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No image');
  });

  it('should render contributor avatars when Developers are present', () => {
    fixture.componentRef.setInput('item', {
      ...item,
      properties: {
        ...item.properties,
        Developers: {
          people: [
            { id: 'dev-1', name: 'Alice', avatar_url: 'https://alice.png' },
            { id: 'dev-2', name: 'Bob', avatar_url: 'https://bob.png' }
          ]
        }
      }
    });
    fixture.detectChanges();

    const images = fixture.nativeElement.querySelectorAll('img');
    const avatarImages = Array.from(images).filter((img: HTMLImageElement) => img.className.includes('rounded-full'));
    expect(avatarImages).toHaveLength(2);
    expect((avatarImages[0] as HTMLImageElement).src).toContain('alice.png');
  });
});
