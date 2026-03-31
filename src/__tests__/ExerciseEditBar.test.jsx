import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExerciseEditBar from '../components/ExerciseEditBar';

const makeExercise = (overrides = {}) => ({
  id: 'ex_1',
  name: 'Bench Press',
  sets: 3,
  ...overrides,
});

const defaultProps = { onRemove: vi.fn(), onUpdateSets: vi.fn(), onMove: vi.fn(), isFirst: false, isLast: false };

describe('ExerciseEditBar', () => {
  it('renders exercise name', () => {
    render(<ExerciseEditBar exercise={makeExercise()} {...defaultProps} />);
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
  });

  it('renders sets count', () => {
    render(<ExerciseEditBar exercise={makeExercise({ sets: 4 })} {...defaultProps} />);
    expect(screen.getByText('4 sets')).toBeInTheDocument();
  });

  it('calls onUpdateSets with +1 when + is clicked', async () => {
    const onUpdateSets = vi.fn();
    render(<ExerciseEditBar exercise={makeExercise()} {...defaultProps} onUpdateSets={onUpdateSets} />);
    await userEvent.click(screen.getByRole('button', { name: '+' }));
    expect(onUpdateSets).toHaveBeenCalledWith('ex_1', 1);
  });

  it('calls onUpdateSets with -1 when − is clicked', async () => {
    const onUpdateSets = vi.fn();
    render(<ExerciseEditBar exercise={makeExercise({ sets: 3 })} {...defaultProps} onUpdateSets={onUpdateSets} />);
    await userEvent.click(screen.getByRole('button', { name: '−' }));
    expect(onUpdateSets).toHaveBeenCalledWith('ex_1', -1);
  });

  it('disables − button when sets is 1', () => {
    render(<ExerciseEditBar exercise={makeExercise({ sets: 1 })} {...defaultProps} />);
    expect(screen.getByRole('button', { name: '−' })).toBeDisabled();
  });

  it('enables − button when sets is above 1', () => {
    render(<ExerciseEditBar exercise={makeExercise({ sets: 2 })} {...defaultProps} />);
    expect(screen.getByRole('button', { name: '−' })).not.toBeDisabled();
  });

  it('disables + button when sets is 10', () => {
    render(<ExerciseEditBar exercise={makeExercise({ sets: 10 })} {...defaultProps} />);
    expect(screen.getByRole('button', { name: '+' })).toBeDisabled();
  });

  it('enables + button when sets is below 10', () => {
    render(<ExerciseEditBar exercise={makeExercise({ sets: 9 })} {...defaultProps} />);
    expect(screen.getByRole('button', { name: '+' })).not.toBeDisabled();
  });

  it('calls onRemove with exercise id when ✕ is clicked', async () => {
    const onRemove = vi.fn();
    render(<ExerciseEditBar exercise={makeExercise()} {...defaultProps} onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(onRemove).toHaveBeenCalledWith('ex_1');
  });

  it('disables ▲ button when isFirst is true', () => {
    render(<ExerciseEditBar exercise={makeExercise()} {...defaultProps} isFirst={true} />);
    expect(screen.getByRole('button', { name: '▲' })).toBeDisabled();
  });

  it('disables ▼ button when isLast is true', () => {
    render(<ExerciseEditBar exercise={makeExercise()} {...defaultProps} isLast={true} />);
    expect(screen.getByRole('button', { name: '▼' })).toBeDisabled();
  });

  it('calls onMove with up when ▲ is clicked', async () => {
    const onMove = vi.fn();
    render(<ExerciseEditBar exercise={makeExercise()} {...defaultProps} onMove={onMove} isFirst={false} />);
    await userEvent.click(screen.getByRole('button', { name: '▲' }));
    expect(onMove).toHaveBeenCalledWith('ex_1', 'up');
  });

  it('calls onMove with down when ▼ is clicked', async () => {
    const onMove = vi.fn();
    render(<ExerciseEditBar exercise={makeExercise()} {...defaultProps} onMove={onMove} isLast={false} />);
    await userEvent.click(screen.getByRole('button', { name: '▼' }));
    expect(onMove).toHaveBeenCalledWith('ex_1', 'down');
  });
});
