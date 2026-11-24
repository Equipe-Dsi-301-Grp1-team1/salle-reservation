import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AgentRoomFormComponent } from './agent-room-form';
import { AgentRoomService } from '../../services/agent-room';

describe('AgentRoomFormComponent', () => {
  let component: AgentRoomFormComponent;
  let fixture: ComponentFixture<AgentRoomFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentRoomFormComponent],
      providers: [
        provideRouter([]),
        {
          provide: AgentRoomService,
          useValue: {
            getAllowedEquipments: () => of([]),
            getRoomById: () => of(null),
            createRoom: () => of({ message: '', room: {} }),
            updateRoom: () => of({ message: '', room: {} }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AgentRoomFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
