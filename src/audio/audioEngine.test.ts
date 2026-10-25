import { COLORS } from '../game/colors';
import { createAudioEngine, TONE_HZ } from './audioEngine';

function fakeContext(resumeResult: 'running' | 'suspended' | 'throw') {
  const oscillators: { frequency: { value: number }; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
  class FakeCtx {
    state = resumeResult === 'running' ? 'suspended' : 'suspended';
    currentTime = 0;
    destination = {};
    resume = vi.fn(async () => {
      if (resumeResult === 'throw') throw new Error('blocked');
      this.state = resumeResult;
    });
    createOscillator() {
      const node = {
        type: 'sine',
        frequency: { value: 0 },
        start: vi.fn(),
        stop: vi.fn(),
        connect: (n: unknown) => n,
        disconnect: vi.fn(),
        onended: null as null | (() => void),
      };
      oscillators.push(node);
      return node;
    }
    createGain() {
      return {
        gain: {
          value: 0,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          cancelScheduledValues: vi.fn(),
        },
        connect: (n: unknown) => n,
        disconnect: vi.fn(),
      };
    }
  }
  vi.stubGlobal('AudioContext', FakeCtx);
  return oscillators;
}

afterEach(() => vi.unstubAllGlobals());

describe('audioEngine', () => {
  it('unlock מצליח כש-resume מצליח', async () => {
    fakeContext('running');
    expect(await createAudioEngine().unlock()).toBe(true);
  });

  it('unlock נכשל כש-resume נדחה או שהמצב אינו running', async () => {
    fakeContext('throw');
    expect(await createAudioEngine().unlock()).toBe(false);
    fakeContext('suspended');
    expect(await createAudioEngine().unlock()).toBe(false);
  });

  it('unlock נכשל כשאין AudioContext', async () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(await createAudioEngine().unlock()).toBe(false);
  });

  it('לארבעת הצבעים גבהי צליל שונים', async () => {
    const oscs = fakeContext('running');
    const engine = createAudioEngine();
    await engine.unlock();
    COLORS.forEach((c) => engine.startTone(c.id));
    const freqs = oscs.map((o) => o.frequency.value);
    expect(new Set(freqs).size).toBe(4);
    expect(freqs).toEqual(COLORS.map((c) => TONE_HZ[c.id]));
  });

  it('stopAll עוצר את כל הצלילים הפעילים', async () => {
    const oscs = fakeContext('running');
    const engine = createAudioEngine();
    await engine.unlock();
    engine.startTone('red');
    engine.startTone('blue');
    engine.playWin();
    engine.stopAll();
    expect(oscs.every((o) => o.stop.mock.calls.length > 0)).toBe(true);
  });

  it('startTone לפני unlock אינו קורס', () => {
    expect(() => createAudioEngine().startTone('red')()).not.toThrow();
  });
});
