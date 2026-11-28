import { Routes } from '@angular/router';
import { AgentRoomListComponent } from './components/agent-room-list/agent-room-list';
import { AgentRoomFormComponent } from './components/agent-room-form/agent-room-form';
import { Register } from './pages/register/register';
import { Login } from './pages/login/login';
import { Home } from './pages/home/home';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
    {
        path: 'register',
        component: Register
    },
    {
        path: 'login',
        component: Login
    },
    {
        path: 'home',
        component: Home,
        canActivate: [authGuard]
    },
    {
        path: 'agent/rooms',
        component: AgentRoomListComponent
    },
    {
        path: 'agent/rooms/new',
        component: AgentRoomFormComponent
    },
    {
        path: 'agent/rooms/edit/:id',
        component: AgentRoomFormComponent
    },
    {
        path: 'reservations',
        canActivate: [authGuard],
        loadChildren: () => import('./pages/reservations/reservations.routes').then(m => m.RESERVATION_ROUTES)
    },
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: '**',
        redirectTo: 'login'
    }
];