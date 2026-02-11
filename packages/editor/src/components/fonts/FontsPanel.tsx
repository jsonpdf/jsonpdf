import { useState } from 'react';
import { FontList } from './FontList';
import { FontAddForm } from './FontAddForm';

interface PendingFont {
  fileName: string;
  data: string;
}

export function FontsPanel() {
  const [pendingFont, setPendingFont] = useState<PendingFont | null>(null);

  if (pendingFont) {
    return (
      <FontAddForm
        fileName={pendingFont.fileName}
        data={pendingFont.data}
        onDone={() => {
          setPendingFont(null);
        }}
      />
    );
  }

  return <FontList onFileSelected={setPendingFont} />;
}
