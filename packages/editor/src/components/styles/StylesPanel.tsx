import { useEditorStore } from '../../store';
import { StyleList } from './StyleList';
import { StyleEditor } from './StyleEditor';

export function StylesPanel() {
  const selectedStyleName = useEditorStore((s) => s.selectedStyleName);

  if (selectedStyleName) {
    return <StyleEditor key={selectedStyleName} styleName={selectedStyleName} />;
  }

  return <StyleList />;
}
