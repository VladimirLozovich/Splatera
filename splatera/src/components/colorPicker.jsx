import { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingFocusManager,
} from '@floating-ui/react';
import Input from './input';
import './colorPicker.css';

export default function ColorPicker({ color, onChange }) {
  const[isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(color);

  useEffect(() => {
    setHexInput(color);
  }, [color]);

  const handleHexInput = (e) => {
    let val = e.target.value;

    // Автоподставляем # если его нет
    if (val && !val.startsWith('#')) {
      val = '#' + val;
    }
  
    setHexInput(val);
  
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      onChange(val);
    }
  };

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'bottom-end',
    whileElementsMounted: autoUpdate, 
    middleware:[
      offset(10), 
      flip(),
      shift({ padding: 10 }),
    ],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  return (
    <>
      <div
        ref={refs.setReference}
        {...getReferenceProps()}
        className="color-picker-trigger"
        style={{ backgroundColor: color }}
      />
      {isOpen && (
        <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
          <div ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()} className="color-picker-popover">
            <div className="picker-label">Filter by Color</div>
            
            <Input 
              value={hexInput}
              onChange={handleHexInput} 
              placeholder="#HEX..."
            />
            
            <HexColorPicker color={color} onChange={onChange} />
          </div>
        </FloatingFocusManager>
      )}
    </>
  );
}