import { Routes } from '@angular/router';
import { Home } from './home/home';
import { roleGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Strona główna',
    component: Home,
    data: { roles: null, icon: 'dashboard' },
  },
  {
    path: 'stats',
    title: 'Statystyki',
    loadComponent: () => import('./stats/stats').then(m => m.Stats),
    data: { roles: null, icon: 'poll' },
  },
  {
    path: 'persons',
    title: 'Osoby',
    canMatch: [roleGuard],
    loadComponent: () => import('./persons/persons').then(m => m.Persons),
    data: { roles: [0, 1], icon: 'people' },
  },
  {
    path: 'projects',
    title: 'Projekty',
    canMatch: [roleGuard],
    loadComponent: () => import('./projects/projects').then(m => m.Projects),
    data: { roles: [0, 1], icon: 'work' },
  },
  {
    path: 'settings',
    title: 'Ustawienia',
    canMatch: [roleGuard],
    loadComponent: () => import('./settings/settings').then(m => m.Settings),
    data: { roles: [0], icon: 'settings' },
  }
];
