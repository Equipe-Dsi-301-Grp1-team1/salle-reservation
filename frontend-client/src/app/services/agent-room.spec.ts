import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { AgentRoomService } from './agent-room';

describe('AgentRoomService', () => {
  let service: AgentRoomService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(AgentRoomService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
