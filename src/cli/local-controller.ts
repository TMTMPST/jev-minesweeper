import type { Page } from '@playwright/test';
import { LocalDemoAdapter } from '../browser/local-demo-adapter';
import { GameController } from '../controller/game-controller';
import type { DecisionClient } from '../decision/decision-client';
import { HttpJevDecisionClient } from '../decision/http-jev-client';
import { MockDecisionClient } from '../decision/mock-decision-client';

export function createLocalController(page: Page, client: DecisionClient = process.env.JEV_MODE === 'jev' ? new HttpJevDecisionClient() : new MockDecisionClient()): GameController {
  return new GameController(new LocalDemoAdapter(page), client);
}
