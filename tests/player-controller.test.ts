import { describe, it, expect, vi } from 'vitest';
import { PlayerController } from '../src/lib/courses/player-controller';
import { getRouteBySlug } from '../src/lib/courses/catalog';

describe('Player Controller', () => {
  const route = getRouteBySlug('ciberseguridad-whatsapp')!;

  it('initializes with default or specified capsule and completed set', () => {
    const controller = new PlayerController({
      route,
      initialCompletedSlugs: ['configurar-celular-vista'],
      initialCapsuleIndex: 1, // second capsule
    });

    const current = controller.getCurrentCapsule();
    expect(current.slug).toBe('notas-voz-fotos-whatsapp');
    expect(controller.isCurrentCapsuleCompleted()).toBe(false);
    expect(controller.getCompletedSlugs()).toContain('configurar-celular-vista');
    expect(controller.getProgressPercentage()).toBe(25);
  });

  it('navigates to next and previous capsules with boundary checks', () => {
    const onCapsuleChange = vi.fn();
    const controller = new PlayerController({
      route,
      initialCapsuleIndex: 0,
      onCapsuleChange,
    });

    // Next
    const next = controller.nextCapsule();
    expect(next?.slug).toBe('notas-voz-fotos-whatsapp');
    expect(controller.getCurrentIndex()).toBe(1);
    expect(onCapsuleChange).toHaveBeenCalledWith(next, 1, false);

    // Prev
    const prev = controller.prevCapsule();
    expect(prev?.slug).toBe('configurar-celular-vista');
    expect(controller.getCurrentIndex()).toBe(0);

    // Prev at 0 returns null (doesn't go negative)
    expect(controller.prevCapsule()).toBeNull();
    expect(controller.getCurrentIndex()).toBe(0);

    // Go to last
    controller.goToCapsule(3);
    expect(controller.getCurrentIndex()).toBe(3);
    // Next at end returns null
    expect(controller.nextCapsule()).toBeNull();
  });

  it('handlePlayerEnded automatically saves progress and updates state', async () => {
    const saveProgressFn = vi.fn().mockResolvedValue({ success: true });
    const onProgressUpdate = vi.fn();

    const controller = new PlayerController({
      route,
      initialCapsuleIndex: 0,
      saveProgressFn,
      onProgressUpdate,
    });

    // Simulate YouTube onEnded event
    await controller.handlePlayerEnded();

    expect(saveProgressFn).toHaveBeenCalledWith('configurar-celular-vista', true);
    expect(controller.isCurrentCapsuleCompleted()).toBe(true);
    expect(controller.getProgressPercentage()).toBe(25);
    expect(onProgressUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        porcentaje: 25,
        completadas: 1,
        total: 4,
        isCompleted: true,
      })
    );
  });

  it('toggleComplete toggles completion state and invokes saveProgressFn', async () => {
    const saveProgressFn = vi.fn().mockResolvedValue({ success: true });
    const onProgressUpdate = vi.fn();

    const controller = new PlayerController({
      route,
      initialCapsuleIndex: 0,
      saveProgressFn,
      onProgressUpdate,
    });

    // Mark complete
    const newState1 = await controller.toggleComplete();
    expect(newState1).toBe(true);
    expect(saveProgressFn).toHaveBeenCalledWith('configurar-celular-vista', true);
    expect(controller.isCurrentCapsuleCompleted()).toBe(true);
    expect(controller.getProgressPercentage()).toBe(25);

    // Unmark
    const newState2 = await controller.toggleComplete();
    expect(newState2).toBe(false);
    expect(saveProgressFn).toHaveBeenCalledWith('configurar-celular-vista', false);
    expect(controller.isCurrentCapsuleCompleted()).toBe(false);
    expect(controller.getProgressPercentage()).toBe(0);
  });

  it('fires onAllCompleted when completing the final capsule', async () => {
    const onAllCompleted = vi.fn();
    const saveProgressFn = vi.fn().mockResolvedValue({ success: true });

    const controller = new PlayerController({
      route,
      initialCompletedSlugs: [
        'configurar-celular-vista',
        'notas-voz-fotos-whatsapp',
        'identificar-estafas-whatsapp',
      ],
      initialCapsuleIndex: 3, // last capsule
      saveProgressFn,
      onAllCompleted,
    });

    await controller.handlePlayerEnded();
    expect(controller.getProgressPercentage()).toBe(100);
    expect(onAllCompleted).toHaveBeenCalled();
  });
});
