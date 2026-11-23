import { Routes } from '@angular/router';
import { AgentRoomListComponent } from './components/agent-room-list/agent-room-list';
import { AgentRoomFormComponent } from './components/agent-room-form/agent-room-form';


export const routes: Routes = [
  { path: '', redirectTo: 'agent/rooms', pathMatch: 'full' },
  { path: 'agent/rooms', component: AgentRoomListComponent },
  { path: 'agent/rooms/new', component: AgentRoomFormComponent },
  { path: 'agent/rooms/edit/:id', component: AgentRoomFormComponent },
];