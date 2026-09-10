import Counter from '../src/models/Counter.js';

describe('Counter (atomic sale numbering)', () => {
  it('increments sequentially', async () => {
    const a = await Counter.next('saleNumber');
    const b = await Counter.next('saleNumber');
    expect(b).toBe(a + 1);
  });

  it('is race-free under parallel load', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => Counter.next('race-test'))
    );
    const sorted = [...new Set(results)].sort((x, y) => x - y);
    expect(sorted.length).toBe(20);          // all unique
    expect(sorted[sorted.length - 1] - sorted[0]).toBe(19); // contiguous
  });
});
