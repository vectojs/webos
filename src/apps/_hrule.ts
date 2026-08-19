/** Horizontal rule divider shared by app layouts. */

import { Rect, type IRenderer } from '@vectojs/core';
import { appTheme } from '../model/app-theme';

export class HRule extends Rect {
  constructor() {
    super({ width: 100, height: 1, fill: appTheme().border });
  }

  public override render(renderer: IRenderer): void {
    this.fill = appTheme().border;
    super.render(renderer);
  }
}
