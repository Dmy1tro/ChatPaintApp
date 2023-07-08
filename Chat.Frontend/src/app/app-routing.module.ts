import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoomComponent } from './room/room.component';
import { RoomsComponent } from './rooms/rooms.component';

const routes: Routes = [
  {
    path: '',
    component: RoomsComponent
  },
  {
    path: 'room',
    component: RoomComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
