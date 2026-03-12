import { Import } from 'lucide-react';
import './dropOverlay.css';

export default function DropOverlay() {
  return (
    <div className="drop-overlay">
      <div className="drop-box">
        <Import className="drop-icon" size={48} />
        <div className="drop-text">
          <div className="drop-title">Drop off your stuff here.</div>
          <div className="drop-subtitle">Magic shall clear the rest</div>
        </div>
      </div>
    </div>
  );
}