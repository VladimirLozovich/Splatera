// src/components/SortMenu.jsx
import { useState } from 'react';
import { ArrowUpDown, SortAsc, SortDesc, Clock } from 'lucide-react'; // Иконки для сортировки
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

import Button from './Button';
import './SortMenu.css';

export default function SortMenu({ sortOrder, setSortOrder }) {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'bottom-end',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(10),
      flip(),
      shift({ padding: 12 }),
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

  // Функция для смены сортировки
  const handleSortSelect = (sortType) => {
    setSortOrder(sortType);
    setIsOpen(false);
  };

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()}>
        <Button icon={ArrowUpDown} text="Sort" />
      </div>

      {isOpen && (
        <FloatingFocusManager context={context} modal={false}>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="sort-popover"
          >
            <div className="sort-section-title">Sort by</div>

            {/* Опция 1: Дата (Новые сначала) */}
            <Button 
              icon={Clock} 
              text="Newest first" 
              className={`sort-option-btn ${sortOrder === 'date_desc' ? 'active' : ''}`}
              onClick={() => handleSortSelect('date_desc')}
            />

            {/* Опция 2: Имя А-Я */}
            <Button 
              icon={SortAsc} 
              text="Name (A - Z)" 
              className={`sort-option-btn ${sortOrder === 'name_asc'  ? 'active' : ''}`}
              onClick={() => handleSortSelect('name_asc')}
            />

            {/* Опция 3: Имя Я-А */}
            <Button 
              icon={SortDesc} 
              text="Name (Z - A)" 
              className={`sort-option-btn ${sortOrder === 'name_desc' ? 'active' : ''}`}
              onClick={() => handleSortSelect('name_desc')}
            />
            
          </div>
        </FloatingFocusManager>
      )}
    </>
  );
}