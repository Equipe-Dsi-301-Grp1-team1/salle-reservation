import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgentRoomForm } from './agent-room-form';

describe('AgentRoomForm', () => {
  let component: AgentRoomForm;
  let fixture: ComponentFixture<AgentRoomForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentRoomForm],
    }).compileComponents();

    fixture = TestBed.createComponent(AgentRoomForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
