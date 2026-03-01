import './button.css';

export default function Button({ icon: Icon, text, onClick, className = '' }) {
  const modeClass = text ? 'with-text' : 'icon-only';

  return (
    <button 
      className={`splatera-btn ${modeClass} ${className}`} 
      onClick={onClick}
    >
      {Icon && <Icon size={15} strokeWidth={2} />}
      
      {text && <span>{text}</span>}
    </button>
  );
}