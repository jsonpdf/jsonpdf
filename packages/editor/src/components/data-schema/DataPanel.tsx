import { useEditorStore } from '../../store';
import { SchemaPropertyList } from './SchemaPropertyList';
import { SchemaPropertyEditor } from './SchemaPropertyEditor';

export function DataPanel() {
  const selectedSchemaPath = useEditorStore((s) => s.selectedSchemaPath);

  if (selectedSchemaPath) {
    return <SchemaPropertyEditor key={selectedSchemaPath} path={selectedSchemaPath} />;
  }

  return <SchemaPropertyList />;
}
