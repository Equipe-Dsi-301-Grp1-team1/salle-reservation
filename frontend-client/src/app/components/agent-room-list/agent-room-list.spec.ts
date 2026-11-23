import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgentRoomList } from './agent-room-list';

describe('AgentRoomList', () => {
  let component: AgentRoomList;
  let fixture: ComponentFixture<AgentRoomList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentRoomList],
    }).compileComponents();

    fixture = TestBed.createComponent(AgentRoomList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
