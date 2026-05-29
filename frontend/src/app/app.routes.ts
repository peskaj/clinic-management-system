import { Routes } from '@angular/router';
import { Home } from './home/home';
import { AuthPanel } from './auth/auth-panel';
import { Settings } from './settings/settings';
import { Stats } from './stats/stats';
import { roleGuard } from './auth/auth.guard';

export const routes: Routes = [
    { path: '', component: Home },
    { path: 'auth', component: AuthPanel },
    { path: 'settings', component: Settings, canMatch: [roleGuard] },
    { path: 'stats', component: Stats, canMatch: [roleGuard] },
    { path: '**', redirectTo: '' }
];