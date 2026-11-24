import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AgentRoomListComponent } from './agent-room-list';
import { AgentRoomService } from '../../services/agent-room';

describe('AgentRoomListComponent', () => {
  let component: AgentRoomListComponent;
  let fixture: ComponentFixture<AgentRoomListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentRoomListComponent],
      providers: [
        provideRouter([]),
        {
          provide: AgentRoomService,
          useValue: {
            getMyRooms: () => of([]),
            deleteRoom: () => of({ message: '' }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AgentRoomListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
