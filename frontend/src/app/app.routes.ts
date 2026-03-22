import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Persons } from './persons/persons';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'persons', component: Persons },
];
