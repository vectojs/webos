/** Horizontal rule divider shared by app layouts. */

import { Rect } from '@vectojs/core';

export class HRule extends Rect {
  constructor(color = '#cbd5e1') {
    super({ width: 100, height: 1, fill: color });
  }
}
