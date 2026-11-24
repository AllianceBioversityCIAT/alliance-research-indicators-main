import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router, Routes, TitleStrategy } from '@angular/router';
import { APP_TITLE, PageTitleStrategy } from './page-title.strategy';

@Component({ selector: 'app-dummy', template: '', standalone: true })
class DummyComponent {}

const routes: Routes = [
  { path: 'login', component: DummyComponent },
  {
    path: '',
    component: DummyComponent,
    children: [
      { path: 'results-center', component: DummyComponent, data: { title: 'Results Center' } },
      {
        path: 'result/:id',
        component: DummyComponent,
        data: { showSectionHeaderActions: true },
        children: [
          {
            path: 'alliance-alignment',
            component: DummyComponent,
            data: { title: 'Result Information', pageTitle: 'Alliance alignment' }
          }
        ]
      }
    ]
  }
];

describe('PageTitleStrategy', () => {
  let router: Router;
  let title: Title;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: TitleStrategy, useClass: PageTitleStrategy }]
    });
    router = TestBed.inject(Router);
    title = TestBed.inject(Title);
  });

  it('names the tab after the current page', async () => {
    await router.navigateByUrl('/results-center?status=draft');
    expect(title.getTitle()).toBe(`Results Center | ${APP_TITLE}`);
  });

  it('shows the result code and section on result pages, not the shared header title', async () => {
    await router.navigateByUrl('/result/STAR-3/alliance-alignment');
    expect(title.getTitle()).toBe(`STAR-3 – Alliance alignment | ${APP_TITLE}`);
  });

  it('falls back to the app name when the route declares no title', async () => {
    await router.navigateByUrl('/results-center');
    await router.navigateByUrl('/login');
    expect(title.getTitle()).toBe(APP_TITLE);
  });
});
