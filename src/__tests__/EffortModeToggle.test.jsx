import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EffortModeToggle from '../components/EffortModeToggle';

describe('EffortModeToggle', () => {
  const defaultProps = {
    effortMode: 'rpe',
    onModeChange: vi.fn(),
    workoutColor: 'a',
  };

  it('renders RPE and RIR buttons', () => {
    render(<EffortModeToggle {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'RPE' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RIR' })).toBeInTheDocument();
  });

  it('renders INPUT label', () => {
    render(<EffortModeToggle {...defaultProps} />);
    expect(screen.getByText('INPUT')).toBeInTheDocument();
  });

  it('applies active styles to the selected mode button', () => {
    render(<EffortModeToggle {...defaultProps} effortMode="rpe" />);
    const rpeBtn = screen.getByRole('button', { name: 'RPE' });
    expect(rpeBtn.className).toMatch(/font-bold/);
  });

  it('does not apply active styles to the inactive mode button', () => {
    render(<EffortModeToggle {...defaultProps} effortMode="rpe" />);
    const rirBtn = screen.getByRole('button', { name: 'RIR' });
    expect(rirBtn.className).not.toMatch(/font-bold/);
  });

  it('calls onModeChange with "rir" when RIR is clicked', async () => {
    const onModeChange = vi.fn();
    render(<EffortModeToggle {...defaultProps} onModeChange={onModeChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'RIR' }));
    expect(onModeChange).toHaveBeenCalledWith('rir');
  });

  it('calls onModeChange with "rpe" when RPE is clicked', async () => {
    const onModeChange = vi.fn();
    render(<EffortModeToggle {...defaultProps} effortMode="rir" onModeChange={onModeChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'RPE' }));
    expect(onModeChange).toHaveBeenCalledWith('rpe');
  });

  it('sets CSS accent vars based on workoutColor prop', () => {
    const { container } = render(<EffortModeToggle {...defaultProps} workoutColor="b" />);
    const wrapper = container.firstChild;
    expect(wrapper.style.getPropertyValue('--accent')).toBe('var(--accent-b)');
    expect(wrapper.style.getPropertyValue('--accent-dim')).toBe('var(--accent-b-dim)');
  });
});
