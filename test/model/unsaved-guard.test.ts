import { describe, expect, it } from 'bun:test';
import { dialogChoiceForKey, UnsavedGuard } from '../../src/model/unsaved-guard';

describe('UnsavedGuard', () => {
  it('starts clean at the baseline it was given', () => {
    const guard = new UnsavedGuard('boot text');
    expect(guard.isDirty('boot text')).toBe(false);
    expect(guard.baseline).toBe('boot text');
  });

  it('dirties on any divergence from the baseline', () => {
    const guard = new UnsavedGuard('saved');
    expect(guard.isDirty('saved')).toBe(false);
    expect(guard.isDirty('saved!')).toBe(true);
    expect(guard.isDirty('')).toBe(true); // even a wipe is divergence
  });

  it('re-baselines after a successful save', () => {
    const guard = new UnsavedGuard('');
    guard.commit('draft one');
    expect(guard.isDirty('draft one')).toBe(false);
    expect(guard.isDirty('draft two')).toBe(true);
  });

  it('re-baselines when disk content replaces the editor wholesale', () => {
    const guard = new UnsavedGuard('local edits');
    guard.commit('disk content');
    expect(guard.baseline).toBe('disk content');
    expect(guard.isDirty('disk content')).toBe(false);
  });

  it('treats the empty string as a valid committed baseline', () => {
    const guard = new UnsavedGuard();
    guard.commit('');
    expect(guard.isDirty('')).toBe(false);
    expect(guard.isDirty('x')).toBe(true);
  });
});

describe('dialogChoiceForKey', () => {
  it('binds Enter to the safe confirm action', () => {
    expect(dialogChoiceForKey('Enter')).toBe('confirm');
  });

  it('binds Escape to Cancel (keep editing), never to Discard', () => {
    expect(dialogChoiceForKey('Escape')).toBe('cancel');
  });

  it('leaves every other key unbound, including Tab (focus cycling)', () => {
    expect(dialogChoiceForKey('Tab')).toBeNull();
    expect(dialogChoiceForKey('d')).toBeNull();
    expect(dialogChoiceForKey(' ')).toBeNull();
  });
});
