import './Input.css';

export default function Input({ icon: Icon, ...props }) {
  return (
    <div className="splatera-input-wrapper">
      <input className="splatera-input" {...props} />
      {Icon && <Icon size={16} className="input-icon" />}
    </div>
  );
}