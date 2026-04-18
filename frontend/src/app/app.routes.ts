import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Persons } from './persons/persons';
import { Projects } from './projects/projects';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'persons', component: Persons },
  { path: 'projects', component: Projects },
];
