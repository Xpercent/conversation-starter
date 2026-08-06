import type { ModeId } from '../data/topics';

export type Phase = 'idle' | 'research' | 'ready' | 'speech' | 'done';

export type PhaseAction =
  | { type: 'start'; mode: ModeId }
  | { type: 'researchComplete' }
  | { type: 'startSpeech' }
  | { type: 'speechComplete' }
  | { type: 'reset' };

/**
 * Illegal transitions are no-ops rather than errors, so a stray event (a timer
 * firing after the overlay closed, say) can never wedge the UI in a bad phase.
 */
export function phaseReducer(phase: Phase, action: PhaseAction): Phase {
  switch (action.type) {
    case 'start':
      if (phase !== 'idle') return phase;
      return action.mode === 'deep-research' ? 'research' : 'speech';
    case 'researchComplete':
      return phase === 'research' ? 'ready' : phase;
    case 'startSpeech':
      return phase === 'ready' || phase === 'idle' ? 'speech' : phase;
    case 'speechComplete':
      return phase === 'speech' ? 'done' : phase;
    case 'reset':
      return 'idle';
    default:
      return phase;
  }
}
