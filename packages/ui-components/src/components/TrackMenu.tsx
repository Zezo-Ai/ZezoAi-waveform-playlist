import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import type { RenderMode } from '@waveform-playlist/core';
import { DotsIcon } from './TrackControls/DotsIcon';

export interface TrackMenuProps {
  renderMode: RenderMode;
  onRenderModeChange: (mode: RenderMode) => void;
  onOpenSpectrogramSettings: () => void;
}

const MenuContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const MenuButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }
`;

const Dropdown = styled.div<{ $top: number; $left: number }>`
  position: fixed;
  top: ${p => p.$top}px;
  left: ${p => p.$left}px;
  z-index: 10000;
  background: ${p => p.theme.timescaleBackgroundColor ?? '#222'};
  color: ${p => p.theme.textColor ?? 'inherit'};
  border: 1px solid rgba(128, 128, 128, 0.4);
  border-radius: 6px;
  padding: 0.5rem 0;
  min-width: 180px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

const DropdownSection = styled.div`
  padding: 0.25rem 0.75rem;
`;

const SectionLabel = styled.div`
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.5;
  margin-bottom: 0.25rem;
`;

const RadioLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0;
  font-size: 0.8rem;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(128, 128, 128, 0.3);
  margin: 0.35rem 0;
`;

const SettingsButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.35rem 0.75rem;
  width: 100%;
  text-align: left;

  &:hover {
    background: rgba(128, 128, 128, 0.15);
  }
`;

const RENDER_MODES: { value: RenderMode; label: string }[] = [
  { value: 'waveform', label: 'Waveform' },
  { value: 'spectrogram', label: 'Spectrogram' },
  { value: 'both', label: 'Both' },
];

export const TrackMenu: React.FC<TrackMenuProps> = ({
  renderMode,
  onRenderModeChange,
  onOpenSpectrogramSettings,
}) => {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Position dropdown below the button when opening
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 2,
        left: Math.max(0, rect.right - 180), // align right edge with button
      });
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleModeChange = useCallback((mode: RenderMode) => {
    onRenderModeChange(mode);
    setOpen(false);
  }, [onRenderModeChange]);

  return (
    <MenuContainer>
      <MenuButton
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(prev => !prev);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        title="Track display options"
        aria-label="Track display options"
      >
        <DotsIcon size={16} />
      </MenuButton>
      {open && typeof document !== 'undefined' && createPortal(
        <Dropdown
          ref={dropdownRef}
          $top={dropdownPos.top}
          $left={dropdownPos.left}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <DropdownSection>
            <SectionLabel>Display</SectionLabel>
            {RENDER_MODES.map(({ value, label }) => (
              <RadioLabel key={value}>
                <input
                  type="radio"
                  name="render-mode"
                  checked={renderMode === value}
                  onChange={() => handleModeChange(value)}
                />
                {label}
              </RadioLabel>
            ))}
          </DropdownSection>
          <Divider />
          <SettingsButton
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onOpenSpectrogramSettings();
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            Spectrogram Settings...
          </SettingsButton>
        </Dropdown>,
        document.body
      )}
    </MenuContainer>
  );
};
