import { Routes } from '@angular/router';
import { Home } from './home/home';
import { AuthPanel } from './auth/auth-panel';
import { roleGuard } from './auth/auth.guard';
import { Patients } from './patients/patients';
import { Doctors } from './doctors/doctors';
import { Visits } from './visits/visits';
import { Audit } from './audit/audit';

export const routes: Routes = [
    { path: '', component: Home, title: 'Strona główna', data: { icon: 'home' } },
    
    { path: 'patients', component: Patients, title: 'Pacjenci', canMatch: [roleGuard], data: { roles: [0, 1, 2], icon: 'people' } },
    { path: 'visits', component: Visits, title: 'Wizyty', canMatch: [roleGuard], data: { roles: [0, 1, 2], icon: 'event' } },
    { path: 'doctors', component: Doctors, title: 'Lekarze', canMatch: [roleGuard], data: { roles: [0, 1], icon: 'medical_services' } },
    { path: 'audit', component: Audit, title: 'Audyt', canMatch: [roleGuard], data: { roles: [0], icon: 'history' } },
    { path: '**', redirectTo: '' }
];