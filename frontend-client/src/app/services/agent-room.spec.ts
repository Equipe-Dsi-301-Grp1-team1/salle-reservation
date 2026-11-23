import { TestBed } from '@angular/core/testing';
import { AgentRoom } from './agent-room';

describe('AgentRoom', () => {
  let service: AgentRoom;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AgentRoom);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
