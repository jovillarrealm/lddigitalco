import type { RutaAprendizaje, Microcapsula } from './types';
import { calculateRouteProgress } from './catalog';

export interface ProgressUpdatePayload {
  porcentaje: number;
  completadas: number;
  total: number;
  completedSlugs: string[];
  isCompleted: boolean;
}

export interface PlayerControllerOptions {
  route: RutaAprendizaje;
  initialCompletedSlugs?: string[];
  initialCapsuleIndex?: number;
  onProgressUpdate?: (summary: ProgressUpdatePayload) => void;
  onCapsuleChange?: (capsule: Microcapsula, index: number, isCompleted: boolean) => void;
  onAllCompleted?: () => void;
  saveProgressFn?: (capsuleSlug: string, completed: boolean) => Promise<any>;
}

export class PlayerController {
  private route: RutaAprendizaje;
  private currentIndex: number;
  private completedSlugs: Set<string>;
  private onProgressUpdate?: (summary: ProgressUpdatePayload) => void;
  private onCapsuleChange?: (capsule: Microcapsula, index: number, isCompleted: boolean) => void;
  private onAllCompleted?: () => void;
  private saveProgressFn?: (capsuleSlug: string, completed: boolean) => Promise<any>;

  constructor(options: PlayerControllerOptions) {
    this.route = options.route;
    this.currentIndex = Math.max(
      0,
      Math.min(
        options.initialCapsuleIndex ?? 0,
        Math.max(0, options.route.microcapsulas.length - 1)
      )
    );
    this.completedSlugs = new Set(options.initialCompletedSlugs || []);
    this.onProgressUpdate = options.onProgressUpdate;
    this.onCapsuleChange = options.onCapsuleChange;
    this.onAllCompleted = options.onAllCompleted;
    this.saveProgressFn = options.saveProgressFn;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getCurrentCapsule(): Microcapsula {
    return this.route.microcapsulas[this.currentIndex];
  }

  isCurrentCapsuleCompleted(): boolean {
    const current = this.getCurrentCapsule();
    return current ? this.completedSlugs.has(current.slug) : false;
  }

  getCompletedSlugs(): string[] {
    return Array.from(this.completedSlugs);
  }

  getProgressPercentage(): number {
    const stats = calculateRouteProgress(this.getCompletedSlugs(), this.route);
    return stats.porcentaje;
  }

  nextCapsule(): Microcapsula | null {
    if (this.currentIndex < this.route.microcapsulas.length - 1) {
      this.currentIndex++;
      const current = this.getCurrentCapsule();
      this.notifyCapsuleChange();
      return current;
    }
    return null;
  }

  prevCapsule(): Microcapsula | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const current = this.getCurrentCapsule();
      this.notifyCapsuleChange();
      return current;
    }
    return null;
  }

  goToCapsule(index: number): Microcapsula | null {
    if (index >= 0 && index < this.route.microcapsulas.length) {
      this.currentIndex = index;
      const current = this.getCurrentCapsule();
      this.notifyCapsuleChange();
      return current;
    }
    return null;
  }

  async toggleComplete(): Promise<boolean> {
    const current = this.getCurrentCapsule();
    if (!current) return false;

    const currentlyCompleted = this.completedSlugs.has(current.slug);
    const willBeCompleted = !currentlyCompleted;

    if (willBeCompleted) {
      this.completedSlugs.add(current.slug);
    } else {
      this.completedSlugs.delete(current.slug);
    }

    if (this.saveProgressFn) {
      await this.saveProgressFn(current.slug, willBeCompleted);
    }

    this.notifyProgressUpdate(willBeCompleted);
    return willBeCompleted;
  }

  async handlePlayerEnded(): Promise<void> {
    const current = this.getCurrentCapsule();
    if (!current) return;

    if (!this.completedSlugs.has(current.slug)) {
      this.completedSlugs.add(current.slug);

      if (this.saveProgressFn) {
        await this.saveProgressFn(current.slug, true);
      }

      this.notifyProgressUpdate(true);
    }
  }

  syncWithServer(summary: { completedSlugs: string[] }): void {
    this.completedSlugs = new Set(summary.completedSlugs);
    this.notifyProgressUpdate(this.isCurrentCapsuleCompleted());
  }

  private notifyCapsuleChange(): void {
    const current = this.getCurrentCapsule();
    if (current && this.onCapsuleChange) {
      this.onCapsuleChange(current, this.currentIndex, this.isCurrentCapsuleCompleted());
    }
  }

  private notifyProgressUpdate(isCurrentCompleted: boolean): void {
    const stats = calculateRouteProgress(this.getCompletedSlugs(), this.route);
    const payload: ProgressUpdatePayload = {
      porcentaje: stats.porcentaje,
      completadas: stats.completadas,
      total: stats.total,
      completedSlugs: this.getCompletedSlugs(),
      isCompleted: isCurrentCompleted,
    };

    if (this.onProgressUpdate) {
      this.onProgressUpdate(payload);
    }

    if (stats.porcentaje === 100 && this.onAllCompleted) {
      this.onAllCompleted();
    }
  }
}
