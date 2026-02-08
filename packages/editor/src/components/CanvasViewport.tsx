import { TemplateCanvas } from '../canvas/TemplateCanvas';
import styles from './CanvasViewport.module.css';

export function CanvasViewport() {
  return (
    <div className={styles.viewport}>
      <TemplateCanvas />
    </div>
  );
}
