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
];
