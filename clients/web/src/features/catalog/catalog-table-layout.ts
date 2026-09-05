import { TableLayout, type Rect } from 'react-aria-components/Virtualizer'

export class CatalogTableLayout<T> extends TableLayout<T> {
  override getVisibleLayoutInfos(rect: Rect) {
    const infos = super.getVisibleLayoutInfos(rect)
    for (const info of infos) {
      if (info.type === 'header' || info.type === 'row' || info.type === 'rowgroup')
        info.allowOverflow = true
    }
    return infos
  }
  protected override isStickyColumn(node: { index: number }): boolean {
    return (this.virtualizer?.visibleRect.width ?? 0) >= 900 && node.index < 3
  }
}
