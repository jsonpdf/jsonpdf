import { useState } from 'react';
import { useEditorStore } from '../../store';
import type { TreeNode } from './OutlineTree';
import styles from './Outline.module.css';

interface OutlineNodeProps {
  node: TreeNode;
  depth: number;
}

export function OutlineNode({ node, depth }: OutlineNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = useEditorStore((s) => {
    if (node.kind === 'element') return s.selectedElementId === node.id;
    if (node.kind === 'band') return s.selectedBandId === node.id && s.selectedElementId === null;
    return (
      s.selectedSectionId === node.id && s.selectedBandId === null && s.selectedElementId === null
    );
  });
  const setSelection = useEditorStore((s) => s.setSelection);

  const hasChildren = node.children.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.frameOwnerId) {
      // Inside a frame — select the frame element using its parent band
      setSelection(node.frameOwnerId, node.frameOwnerBandId ?? null, node.sectionId);
    } else if (node.kind === 'element') {
      setSelection(node.id, node.bandId ?? null, node.sectionId);
    } else if (node.kind === 'band') {
      setSelection(null, node.id, node.sectionId);
    } else {
      setSelection(null, null, node.id);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div>
      <div
        className={`${styles.node} ${isSelected ? styles.nodeSelected : ''}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={handleClick}
        role="treeitem"
        aria-expanded={hasChildren ? expanded : undefined}
        aria-selected={isSelected}
      >
        {hasChildren ? (
          <span
            className={expanded ? styles.chevronOpen : styles.chevron}
            onClick={handleToggle}
            data-testid={`toggle-${node.id}`}
          >
            &#9654;
          </span>
        ) : (
          <span className={styles.chevronSpacer} />
        )}
        <span className={styles.nodeLabel}>{node.label}</span>
        <span className={styles.nodeType}>{node.typeLabel}</span>
      </div>
      {hasChildren && expanded && (
        <div role="group">
          {node.children.map((child) => (
            <OutlineNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
